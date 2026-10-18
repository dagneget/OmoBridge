import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  AxiosError,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';

import ProviderJobDetailPage from '../pages/dashboard/delivery/ProviderJobDetailPage';
import { useAuthStore } from '../features/auth/authStore';
import { createMemoryLocationQueue } from '../features/delivery/locationQueue';
import { syncJobLocations } from '../features/delivery/locationSync';
import { deliveryService } from '../features/delivery';
import { httpClient } from '../services/httpClient';
import type { DeliveryJobResponse, LocationIngestionRequest } from '../types/api';

const PROVIDER_ID = '77777777-7777-7777-7777-777777777777';
const JOB_ID = 'aaaaaaaa-0000-0000-0000-0000000000c1';

const job: DeliveryJobResponse = {
  jobId: JOB_ID,
  jobNo: 'DEL-2026-3001',
  providerId: PROVIDER_ID,
  providerName: 'Beko Transport',
  status: 'ASSIGNED',
  pickupAddress: 'Dimeka market',
  dropoffAddress: 'Turmi village centre',
  fee: 450,
  currency: 'ETB',
  orderIds: ['bbbbbbbb-0000-0000-0000-00000000000b'],
  createdAt: '2026-10-18T06:00:00Z',
};

/**
 * Captured request bodies for `POST .../locations`, in the order the client sent them.
 * Read from the real axios config, so this asserts what would actually reach the server.
 */
let receivedBatches: LocationIngestionRequest[] = [];
let storedCountFor: (points: LocationIngestionRequest[]) => number | 'error' = (points) =>
  points.length;

function installAdapterStub() {
  httpClient.defaults.adapter = async (
    config: AxiosRequestConfig
  ): Promise<AxiosResponse> => {
    const internal = config as InternalAxiosRequestConfig;
    const url = config.url ?? '';
    const method = (config.method ?? 'get').toLowerCase();

    if (method === 'get' && url.includes('/api/v1/delivery/providers/')) {
      return {
        data: { success: true, data: [job] },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: internal,
      };
    }

    if (method === 'post' && url.includes('/api/v1/delivery/jobs/') && url.endsWith('/locations')) {
      const body = JSON.parse(String(config.data)) as { locations: LocationIngestionRequest[] };
      receivedBatches.push(...body.locations);

      const outcome = storedCountFor(body.locations);
      if (outcome === 'error') {
        // axios built-in adapters call `settle` themselves and reject on 5xx; a custom
        // adapter must do the same. Throwing here exercises the keep-the-points path.
        throw new AxiosError('Request failed with status code 500', 'ERR_BAD_RESPONSE', internal, undefined, {
          data: { success: false, code: 'INTERNAL_ERROR', message: 'boom' },
          status: 500,
          statusText: 'Internal Server Error',
          headers: {},
          config: internal,
        });
      }

      return {
        data: { success: true, data: outcome },
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

function installFakeGeolocation() {
  let id = 0;
  let success: ((p: unknown) => void) | null = null;

  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: {
      watchPosition(ok: (p: unknown) => void) {
        id += 1;
        success = ok;
        return id;
      },
      clearWatch() {
        success = null;
      },
    },
  });

  return {
    emit(latitude: number, longitude: number, timestamp: number) {
      success?.({ coords: { latitude, longitude }, timestamp });
    },
    isWatching: () => success !== null,
  };
}

/**
 * F-1107's scenario: location capture and upload across an offline/online boundary.
 *
 * The task asks for a Playwright offline scenario. `@playwright/test` is not installed in this
 * repository, so the browser-level spec is provided in `e2e/provider-offline.spec.ts` and cannot
 * be executed here (see `docs/handoffs/F-1107.md`). This suite runs the same path now through
 * the real component, the real queue and the real service, reading the actual axios request
 * bodies via the adapter stub that `httpClient.test.ts` already uses in this repo.
 */
describe('Provider offline capture and upload (F-1107)', () => {
  let onlineSpy: { value: boolean };
  let geo: ReturnType<typeof installFakeGeolocation>;

  beforeEach(() => {
    vi.restoreAllMocks();
    receivedBatches = [];
    storedCountFor = (points) => points.length;
    onlineSpy = { value: true };
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      get: () => onlineSpy.value,
    });
    geo = installFakeGeolocation();
    installAdapterStub();

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
    // React Query's onlineManager is global; a leftover `offline` pauses every later query.
    window.dispatchEvent(new Event('online'));
    onlineSpy.value = true;
    // @ts-expect-error -- restoring jsdom's default (absent) geolocation.
    delete navigator.geolocation;
  });

  const setOffline = () => {
    onlineSpy.value = false;
    window.dispatchEvent(new Event('offline'));
  };

  const setOnline = () => {
    onlineSpy.value = true;
    window.dispatchEvent(new Event('online'));
  };

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

  it('uploads points recorded offline in device-timestamp order once reconnected', async () => {
    const queue = createMemoryLocationQueue();
    const base = Date.UTC(2026, 9, 18, 9, 0, 0);

    // Captured while offline, arriving out of order.
    await queue.enqueue(JOB_ID, [
      { latitude: 5.86, longitude: 36.42, recordedAt: new Date(base + 120_000).toISOString() },
      { latitude: 5.85, longitude: 36.4, recordedAt: new Date(base).toISOString() },
      { latitude: 5.855, longitude: 36.41, recordedAt: new Date(base + 60_000).toISOString() },
    ]);
    expect(await queue.count(JOB_ID)).toBe(3);

    setOffline();
    setOnline();

    const result = await syncJobLocations({
      queue,
      jobId: JOB_ID,
      upload: (targetJobId, points) => deliveryService.ingestLocations(targetJobId, points),
    });

    expect(result).toMatchObject({ uploaded: 3, dropped: 0, remaining: 0 });
    expect(receivedBatches.map((p) => p.recordedAt)).toEqual([
      new Date(base).toISOString(),
      new Date(base + 60_000).toISOString(),
      new Date(base + 120_000).toISOString(),
    ]);
    expect(await queue.count(JOB_ID)).toBe(0);
  });

  it('sends a large offline backlog in capped batches, still in order', async () => {
    const queue = createMemoryLocationQueue();
    const base = Date.UTC(2026, 9, 18, 6, 0, 0);

    const batchSizes: number[] = [];
    const originals: LocationIngestionRequest[] = [];
    storedCountFor = (points) => {
      batchSizes.push(points.length);
      originals.push(...points);
      return points.length;
    };

    await queue.enqueue(
      JOB_ID,
      Array.from({ length: 120 }, (_, i) => ({
        latitude: 5.85 + i * 0.0001,
        longitude: 36.4,
        recordedAt: new Date(base + i * 30_000).toISOString(),
      }))
    );

    const result = await syncJobLocations({
      queue,
      jobId: JOB_ID,
      upload: (targetJobId, points) => deliveryService.ingestLocations(targetJobId, points),
    });

    expect(batchSizes).toEqual([50, 50, 20]);
    expect(result.uploaded).toBe(120);
    expect(originals).toHaveLength(120);
    // The server receives the whole backlog in chronological order, batch boundaries aside.
    expect(originals.map((p) => p.recordedAt)).toEqual(
      [...originals].map((p) => p.recordedAt).sort()
    );
    expect(await queue.count(JOB_ID)).toBe(0);
  });

  it('sends nothing to the server while offline', async () => {
    setOffline();

    renderDetail();

    // Never claims the job is missing, and never reaches for it.
    expect(await screen.findByTestId('offline-unavailable')).toBeInTheDocument();
    expect(receivedBatches).toHaveLength(0);
    expect(geo.isWatching()).toBe(false);
  });

  it('discards queued points when the server reports the job already finished', async () => {
    const queue = createMemoryLocationQueue();
    await queue.enqueue(JOB_ID, [
      { latitude: 5.85, longitude: 36.4, recordedAt: '2026-10-18T09:00:00.000Z' },
    ]);

    // DeliveryService returns 0 with HTTP 200 for a DELIVERED/CANCELLED job.
    storedCountFor = () => 0;

    const result = await syncJobLocations({
      queue,
      jobId: JOB_ID,
      upload: (targetJobId, points) => deliveryService.ingestLocations(targetJobId, points),
    });

    expect(result.jobFinishedOnServer).toBe(true);
    expect(result.dropped).toBe(1);
    expect(result.remaining).toBe(0);
    expect(await queue.count(JOB_ID)).toBe(0);

    // Not retried.
    await syncJobLocations({
      queue,
      jobId: JOB_ID,
      upload: (targetJobId, points) => deliveryService.ingestLocations(targetJobId, points),
    });
    expect(receivedBatches).toHaveLength(1);
  });

  it('keeps points queued after a failed upload and retries them next time', async () => {
    const queue = createMemoryLocationQueue();
    await queue.enqueue(JOB_ID, [
      { latitude: 5.85, longitude: 36.4, recordedAt: '2026-10-18T09:00:00.000Z' },
    ]);

    let attempts = 0;
    storedCountFor = (points) => {
      attempts += 1;
      return attempts === 1 ? 'error' : points.length;
    };

    const first = await syncJobLocations({
      queue,
      jobId: JOB_ID,
      upload: (targetJobId, points) => deliveryService.ingestLocations(targetJobId, points),
    });
    expect(first.uploaded).toBe(0);
    expect(await queue.count(JOB_ID)).toBe(1);

    const second = await syncJobLocations({
      queue,
      jobId: JOB_ID,
      upload: (targetJobId, points) => deliveryService.ingestLocations(targetJobId, points),
    });
    expect(second.uploaded).toBe(1);
    expect(await queue.count(JOB_ID)).toBe(0);
    // The point survived the failure and was replayed unchanged.
    expect(receivedBatches).toHaveLength(2);
    expect(receivedBatches[0]).toEqual(receivedBatches[1]);
  });

  it('queues captured points on the screen and reports them as waiting to upload', async () => {
    setOffline();
    renderDetail();
    expect(await screen.findByTestId('offline-unavailable')).toBeInTheDocument();

    setOnline();
    await waitFor(() => expect(screen.getByTestId('location-start')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('location-start'));
    await waitFor(() => expect(geo.isWatching()).toBe(true));

    geo.emit(5.85, 36.4, Date.UTC(2026, 9, 18, 9, 0, 0));

    await waitFor(() =>
      expect(screen.getByTestId('location-point-count')).toHaveTextContent(
        '1 point waiting to upload'
      )
    );
  });
});