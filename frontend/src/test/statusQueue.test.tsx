import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AxiosError, type AxiosRequestConfig, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';

import ProviderJobDetailPage from '../pages/dashboard/delivery/ProviderJobDetailPage';
import { useAuthStore } from '../features/auth/authStore';
import { createMemoryStatusQueue, sortStatusChanges } from '../features/delivery/statusQueue';
import { syncJobStatuses, syncAllJobStatuses } from '../features/delivery/statusSync';
import { httpClient } from '../services/httpClient';
import type { DeliveryJobResponse } from '../types/api';

const PROVIDER_ID = '77777777-7777-7777-7777-777777777777';
const JOB_ID = 'aaaaaaaa-0000-0000-0000-0000000000d1';

let serverStatus: DeliveryJobResponse['status'] = 'ASSIGNED';
/** Status transitions the client requested, in order. */
let requestedStatuses: string[] = [];

function installAdapterStub(behaviour: (next: string) => 'ok' | 'reject' | 'offline') {
  httpClient.defaults.adapter = async (
    config: AxiosRequestConfig
  ): Promise<AxiosResponse> => {
    const internal = config as InternalAxiosRequestConfig;
    const url = config.url ?? '';
    const method = (config.method ?? 'get').toLowerCase();

    if (method === 'get' && url.includes('/api/v1/delivery/providers/')) {
      const job: DeliveryJobResponse = {
        jobId: JOB_ID,
        jobNo: 'DEL-2026-4001',
        providerId: PROVIDER_ID,
        providerName: 'Beko Transport',
        status: serverStatus,
        pickupAddress: 'Dimeka market',
        dropoffAddress: 'Turmi village centre',
        fee: 450,
        currency: 'ETB',
        orderIds: [],
        createdAt: '2026-10-18T06:00:00Z',
      };
      return {
        data: { success: true, data: [job] },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: internal,
      };
    }

    if (method === 'patch' && url.includes('/status')) {
      const body = JSON.parse(String(config.data)) as { newStatus: string };
      requestedStatuses.push(body.newStatus);
      const outcome = behaviour(body.newStatus);

      if (outcome === 'offline') {
        throw new AxiosError('Network Error', 'ERR_NETWORK', internal, undefined, undefined);
      }
      if (outcome === 'reject') {
        throw new AxiosError('Request failed with status code 422', 'ERR_BAD_REQUEST', internal, undefined, {
          data: {
            success: false,
            code: 'BUSINESS_RULE_VIOLATION',
            message: `Cannot move a job from ${serverStatus} to ${body.newStatus}`,
          },
          status: 422,
          statusText: 'Unprocessable Entity',
          headers: {},
          config: internal,
        });
      }

      serverStatus = body.newStatus as DeliveryJobResponse['status'];
      return {
        data: { success: true, data: { jobId: JOB_ID, status: serverStatus } },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: internal,
      };
    }

    return {
      data: { success: false, code: 'NOT_FOUND', message: `unhandled ${method} ${url}` },
      status: 404,
      statusText: 'Not Found',
      headers: {},
      config: internal,
    };
  };
}

describe('Offline status queue (F-1105)', () => {
  let onlineSpy: { value: boolean };

  const setOffline = () => {
    onlineSpy.value = false;
    window.dispatchEvent(new Event('offline'));
  };
  const setOnline = () => {
    onlineSpy.value = true;
    window.dispatchEvent(new Event('online'));
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    serverStatus = 'ASSIGNED';
    requestedStatuses = [];
    onlineSpy = { value: true };
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      get: () => onlineSpy.value,
    });

    useAuthStore.setState({
      user: {
        id: 'u1',
        fullName: 'Beko Transport',
        roles: ['DELIVERY_PROVIDER'],
        status: 'ACTIVE',
        preferredLanguage: 'en',
        deliveryProviderId: PROVIDER_ID,
      } as never,
      token: 'provider-token',
      isAuthenticated: true,
      isLoading: false,
      activeRole: 'DELIVERY_PROVIDER',
    });
  });

  afterEach(() => {
    window.dispatchEvent(new Event('online'));
    onlineSpy.value = true;
  });

  describe('queue ordering', () => {
    it('replays changes in the order the provider made them', async () => {
      const queue = createMemoryStatusQueue();
      installAdapterStub(() => 'ok');

      // Control the device clock so the ordering rule is exercised on time, not insertion.
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-10-18T09:00:00Z'));
      await queue.enqueue(JOB_ID, 'DELIVERED');
      vi.setSystemTime(new Date('2026-10-18T09:01:00Z'));
      await queue.enqueue(JOB_ID, 'IN_TRANSIT');
      vi.useRealTimers();

      const pending = await queue.listForJob(JOB_ID);
      expect(pending.map((c) => c.newStatus)).toEqual(['DELIVERED', 'IN_TRANSIT']);
      expect(pending.map((c) => c.queuedAt)).toEqual([
        '2026-10-18T09:00:00.000Z',
        '2026-10-18T09:01:00.000Z',
      ]);

      const result = await syncJobStatuses({
        queue,
        jobId: JOB_ID,
        apply: async (_jobId, status) => {
          serverStatus = status;
        },
      });

      expect(result.applied.map((a) => (a.kind === 'applied' ? a.newStatus : ''))).toEqual([
        'DELIVERED',
        'IN_TRANSIT',
      ]);
      expect(result.conflicts).toHaveLength(0);
      expect(result.remaining).toBe(0);
      expect(await queue.count(JOB_ID)).toBe(0);
    });

    it('falls back to insertion order when the clock did not advance', async () => {
      const queue = createMemoryStatusQueue();
      await queue.enqueue(JOB_ID, 'DELIVERED');
      await queue.enqueue(JOB_ID, 'IN_TRANSIT');

      const pending = await queue.listForJob(JOB_ID);
      expect(pending[0].queuedAt).toBe(pending[1].queuedAt);
      expect(pending.map((c) => c.newStatus)).toEqual(['DELIVERED', 'IN_TRANSIT']);
    });

    it('breaks timestamp ties by insertion order', () => {
      const sorted = sortStatusChanges([
        { id: 3, jobId: JOB_ID, newStatus: 'DELIVERED', queuedAt: '2026-10-18T09:00:00.000Z' },
        { id: 1, jobId: JOB_ID, newStatus: 'PICKED_UP', queuedAt: '2026-10-18T09:00:00.000Z' },
        { id: 2, jobId: JOB_ID, newStatus: 'IN_TRANSIT', queuedAt: '2026-10-18T09:00:00.000Z' },
      ]);
      expect(sorted.map((c) => c.newStatus)).toEqual(['PICKED_UP', 'IN_TRANSIT', 'DELIVERED']);
    });
  });

  describe('conflicts', () => {
    it('removes a rejected change, reports it, and keeps replaying later ones', async () => {
      const queue = createMemoryStatusQueue();
      serverStatus = 'ASSIGNED';
      // The server refuses IN_TRANSIT but accepts the rest.
      installAdapterStub((next) => (next === 'IN_TRANSIT' ? 'reject' : 'ok'));

      await queue.enqueue(JOB_ID, 'PICKED_UP');
      await queue.enqueue(JOB_ID, 'IN_TRANSIT');
      await queue.enqueue(JOB_ID, 'DELIVERED');

      const result = await syncJobStatuses({
        queue,
        jobId: JOB_ID,
        apply: async (jobId, status, reason) => {
          await httpClient
            .patch(`/api/v1/delivery/jobs/${jobId}/status`, { newStatus: status, reason })
            .then(() => undefined);
        },
      });

      expect(requestedStatuses).toEqual(['PICKED_UP', 'IN_TRANSIT', 'DELIVERED']);
      expect(result.applied.map((a) => (a.kind === 'applied' ? a.newStatus : ''))).toEqual([
        'PICKED_UP',
        'DELIVERED',
      ]);
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0]).toMatchObject({
        kind: 'conflict',
        attempted: 'IN_TRANSIT',
      });
      // The server's own words reach the provider, naming the state it actually held.
      expect(
        result.conflicts[0]?.kind === 'conflict' ? result.conflicts[0].serverMessage : ''
      ).toContain('Cannot move a job from PICKED_UP to IN_TRANSIT');
      // The rejected change is dropped, not retried, so it cannot block the ones after it.
      expect(result.remaining).toBe(0);
      expect(await queue.count(JOB_ID)).toBe(0);
    });

    it('does not retry a refused change on the next sync', async () => {
      const queue = createMemoryStatusQueue();
      installAdapterStub(() => 'reject');
      await queue.enqueue(JOB_ID, 'DELIVERED');

      await syncJobStatuses({
        queue,
        jobId: JOB_ID,
        apply: async (jobId, status) => {
          await httpClient.patch(`/api/v1/delivery/jobs/${jobId}/status`, { newStatus: status });
        },
      });
      const firstCount = requestedStatuses.length;

      await syncJobStatuses({
        queue,
        jobId: JOB_ID,
        apply: async (jobId, status) => {
          await httpClient.patch(`/api/v1/delivery/jobs/${jobId}/status`, { newStatus: status });
        },
      });

      expect(requestedStatuses.length).toBe(firstCount);
    });

    it('re-reads the job after a conflict so the provider sees the real state', async () => {
      const queue = createMemoryStatusQueue();
      // A dispatcher finished the job while this device was offline.
      serverStatus = 'DELIVERED';
      installAdapterStub(() => 'reject');
      await queue.enqueue(JOB_ID, 'IN_TRANSIT');

      let refreshed = false;
      await syncJobStatuses({
        queue,
        jobId: JOB_ID,
        apply: async (jobId, status) => {
          await httpClient.patch(`/api/v1/delivery/jobs/${jobId}/status`, { newStatus: status });
        },
        refreshJob: async () => {
          refreshed = true;
        },
      });

      expect(refreshed).toBe(true);
    });
  });

  describe('transport failure', () => {
    it('keeps the change queued when the request never reaches the server', async () => {
      const queue = createMemoryStatusQueue();
      installAdapterStub(() => 'offline');
      await queue.enqueue(JOB_ID, 'DELIVERED');

      const result = await syncJobStatuses({
        queue,
        jobId: JOB_ID,
        apply: async (jobId, status) => {
          await httpClient.patch(`/api/v1/delivery/jobs/${jobId}/status`, { newStatus: status });
        },
      });

      // No response means no opinion, so the change must survive for the next attempt.
      expect(result.conflicts).toHaveLength(0);
      expect(result.remaining).toBe(1);
      expect(await queue.count(JOB_ID)).toBe(1);
    });
  });

  describe('on the provider screen', () => {
    const renderDetail = () => {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
      });
      return render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={[`/dashboard/delivery/jobs/${JOB_ID}`]}>
            <Routes>
              <Route path="/dashboard/delivery/jobs/:jobId" element={<ProviderJobDetailPage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      );
    };

    it('queues a status tapped while offline instead of losing it', async () => {
      installAdapterStub(() => 'ok');
      renderDetail();
      await waitFor(() => expect(screen.getByTestId('status-action-picked_up')).toBeInTheDocument());

      setOffline();
      // The screen keeps the cached job so the driver can still act.
      await waitFor(() => expect(screen.getByTestId('offline-notice')).toBeInTheDocument());

      fireEvent.click(screen.getByTestId('status-action-picked_up'));

      expect(await screen.findByTestId('status-updated-notice')).toHaveTextContent(
        'It will be sent when the connection returns'
      );
      await waitFor(() =>
        expect(screen.getByTestId('status-pending-notice')).toHaveTextContent(
          '1 change is waiting to be sent'
        )
      );
      // Nothing was sent while offline.
      expect(requestedStatuses).toHaveLength(0);
    });

    it('shows a rejected queued change to the provider after reconnecting', async () => {
      installAdapterStub((next) => (next === 'PICKED_UP' ? 'reject' : 'ok'));
      renderDetail();
      await waitFor(() => expect(screen.getByTestId('status-action-picked_up')).toBeInTheDocument());

      setOffline();
      await waitFor(() => expect(screen.getByTestId('offline-notice')).toBeInTheDocument());
      fireEvent.click(screen.getByTestId('status-action-picked_up'));
      await waitFor(() => expect(screen.getByTestId('status-pending-notice')).toBeInTheDocument());

      // A dispatcher moved the job while the device was offline.
      serverStatus = 'DELIVERED';
      setOnline();

      const conflict = await screen.findByTestId('status-conflict-notice');
      expect(conflict).toHaveAttribute('role', 'alert');
      expect(conflict).toHaveTextContent('Some saved changes could not be applied');
      expect(conflict).toHaveTextContent(/Cannot move a job from/i);
      // The queue drains rather than retrying forever.
      await waitFor(() => expect(screen.queryByTestId('status-pending-notice')).not.toBeInTheDocument());
    });
  });

  it('drains every queued job', async () => {
    const queue = createMemoryStatusQueue();
    installAdapterStub(() => 'ok');
    await queue.enqueue(JOB_ID, 'PICKED_UP');
    await queue.enqueue('other-job', 'PICKED_UP');

    const results = await syncAllJobStatuses(queue, async () => undefined);
    expect(Object.keys(results).sort()).toEqual([JOB_ID, 'other-job'].sort());
    expect(await queue.count()).toBe(0);
  });
});