import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import axe from 'axe-core';

import ProviderJobDetailPage from '../pages/dashboard/delivery/ProviderJobDetailPage';
import { useAuthStore } from '../features/auth/authStore';
import { deliveryService } from '../features/delivery';
import { nextStatuses } from '../features/delivery/deliveryStatus';
import { NormalizedApiError } from '../services/httpClient';
import type { DeliveryJobResponse } from '../types/api';

const PROVIDER_ID = '77777777-7777-7777-7777-777777777777';
const JOB_ID = 'aaaaaaaa-0000-0000-0000-000000000002';
const OTHER_JOB_ID = 'aaaaaaaa-0000-0000-0000-000000000099';

const makeJob = (overrides: Partial<DeliveryJobResponse> = {}): DeliveryJobResponse => ({
  jobId: JOB_ID,
  jobNo: 'DEL-2026-1002',
  providerId: PROVIDER_ID,
  providerName: 'Beko Transport',
  status: 'ASSIGNED',
  pickupAddress: 'Banna co-op store',
  dropoffAddress: 'Arba Minch bus station',
  fee: 600,
  currency: 'ETB',
  orderIds: ['bbbbbbbb-0000-0000-0000-00000000000b'],
  createdAt: '2026-10-18T06:00:00Z',
  ...overrides,
});

describe('Provider job detail and status updates (F-1102)', () => {
  let queryClient: QueryClient;
  let onlineSpy: { value: boolean };

  const renderDetail = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[`/dashboard/delivery/jobs/${JOB_ID}`]}>
          <Routes>
            <Route path="/dashboard/delivery/jobs/:jobId" element={<ProviderJobDetailPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

  beforeEach(() => {
    vi.restoreAllMocks();
    onlineSpy = { value: true };
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      get: () => onlineSpy.value,
    });

    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
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
    vi.restoreAllMocks();
    /*
     * React Query's `onlineManager` is a process-wide singleton that listens for
     * window online/offline events. An `offline` event dispatched by one test leaves it
     * offline, which silently PAUSES every later query in the run (`fetchStatus:
     * 'paused'`, `enabled` still true, no request ever sent). Restore it here so
     * offline tests cannot leak into the rest of the suite.
     */
    window.dispatchEvent(new Event('online'));
    onlineSpy.value = true;
  });

  describe('allowed next steps mirror the backend transition table', () => {
    it('offers only legal next statuses per current status', () => {
      // Mirrors DeliveryStatus.canTransitionTo on the backend.
      expect(nextStatuses('PENDING')).toEqual(['ASSIGNED', 'CANCELLED']);
      expect(nextStatuses('ASSIGNED')).toEqual(['PICKED_UP', 'FAILED', 'CANCELLED']);
      expect(nextStatuses('PICKED_UP')).toEqual(['IN_TRANSIT', 'FAILED', 'CANCELLED']);
      expect(nextStatuses('IN_TRANSIT')).toEqual(['DELIVERED', 'FAILED', 'CANCELLED']);
    });

    it('treats terminal statuses as having no next steps', () => {
      expect(nextStatuses('DELIVERED')).toEqual([]);
      expect(nextStatuses('FAILED')).toEqual([]);
      expect(nextStatuses('CANCELLED')).toEqual([]);
      expect(nextStatuses(undefined)).toEqual([]);
    });

    it('never offers a status the current one cannot reach', () => {
      const pairs: Array<[string, string]> = [
        ['ASSIGNED', 'IN_TRANSIT'],
        ['ASSIGNED', 'DELIVERED'],
        ['PICKED_UP', 'DELIVERED'],
        ['IN_TRANSIT', 'PICKED_UP'],
        ['DELIVERED', 'IN_TRANSIT'],
      ];
      for (const [from, to] of pairs) {
        expect(nextStatuses(from)).not.toContain(to);
      }
    });
  });

  describe('job detail', () => {
    it('shows a loading state, then the job from the assigned list', async () => {
      let resolveJobs: (value: DeliveryJobResponse[]) => void = () => {};
      vi.spyOn(deliveryService, 'getProviderJobs').mockImplementation(
        () => new Promise<DeliveryJobResponse[]>((resolve) => { resolveJobs = resolve; })
      );

      renderDetail();
      expect(await screen.findByTestId('delivery-job-loading')).toBeInTheDocument();

      resolveJobs([makeJob()]);
      await waitFor(() => expect(screen.queryByTestId('delivery-job-loading')).not.toBeInTheDocument());
      expect(screen.getByText('Banna co-op store')).toBeInTheDocument();
      expect(screen.getByText('Arba Minch bus station')).toBeInTheDocument();
      expect(screen.getByText(/600\.00 ETB/)).toBeInTheDocument();
    });

    it('offers exactly the legal next steps for an ASSIGNED job', async () => {
      vi.spyOn(deliveryService, 'getProviderJobs').mockResolvedValue([makeJob()]);

      renderDetail();
      await waitFor(() => expect(screen.getByTestId('status-actions')).toBeInTheDocument());

      expect(screen.getByTestId('status-action-picked_up')).toBeInTheDocument();
      expect(screen.getByTestId('status-action-failed')).toBeInTheDocument();
      expect(screen.getByTestId('status-action-cancelled')).toBeInTheDocument();

      // Not reachable from ASSIGNED.
      expect(screen.queryByTestId('status-action-in_transit')).not.toBeInTheDocument();
      expect(screen.queryByTestId('status-action-delivered')).not.toBeInTheDocument();
    });

    it('shows no status actions once the job is delivered', async () => {
      vi.spyOn(deliveryService, 'getProviderJobs').mockResolvedValue([
        makeJob({ status: 'DELIVERED' }),
      ]);

      renderDetail();
      await waitFor(() => expect(screen.getByTestId('no-next-steps')).toBeInTheDocument());
      expect(screen.queryByTestId('status-action-picked_up')).not.toBeInTheDocument();
    });

    it('reports a job that is not in the signed-in provider list as not found', async () => {
      const spy = vi.spyOn(deliveryService, 'getProviderJobs').mockResolvedValue([makeJob()]);

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={[`/dashboard/delivery/jobs/${OTHER_JOB_ID}`]}>
            <Routes>
              <Route path="/dashboard/delivery/jobs/:jobId" element={<ProviderJobDetailPage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      );

      expect(await screen.findByTestId('delivery-job-not-found')).toBeInTheDocument();
      // Resolved from the provider's own list only: no single-job fetch for another id.
      expect(spy).toHaveBeenCalledWith(PROVIDER_ID);
    });
  });

  describe('valid transitions', () => {
    it('sends the status and renders the server state after the change', async () => {
      vi.spyOn(deliveryService, 'getProviderJobs').mockResolvedValue([makeJob()]);
      const update = vi
        .spyOn(deliveryService, 'updateJobStatus')
        .mockResolvedValue(makeJob({ status: 'PICKED_UP' }));

      renderDetail();
      await waitFor(() => expect(screen.getByTestId('status-actions')).toBeInTheDocument());

      fireEvent.change(screen.getByTestId('status-reason'), { target: { value: 'Loaded at the co-op' } });
      fireEvent.click(screen.getByTestId('status-action-picked_up'));

      await waitFor(() => expect(update).toHaveBeenCalledWith(JOB_ID, 'PICKED_UP', 'Loaded at the co-op'));

      // The server's response drives the confirmation and the new status chip.
      expect(await screen.findByTestId('status-updated-notice')).toHaveTextContent(
        'Status updated to Picked up.'
      );
      await waitFor(() => expect(screen.getAllByText('Picked up').length).toBeGreaterThan(0));

      // The action set now reflects the server's new status.
      expect(await screen.findByTestId('status-action-in_transit')).toBeInTheDocument();
      expect(screen.queryByTestId('status-action-picked_up')).not.toBeInTheDocument();
    });

    it('sends no reason field when the provider leaves it blank', async () => {
      vi.spyOn(deliveryService, 'getProviderJobs').mockResolvedValue([makeJob()]);
      const update = vi
        .spyOn(deliveryService, 'updateJobStatus')
        .mockResolvedValue(makeJob({ status: 'PICKED_UP' }));

      renderDetail();
      await waitFor(() => expect(screen.getByTestId('status-actions')).toBeInTheDocument());

      fireEvent.click(screen.getByTestId('status-action-picked_up'));
      await waitFor(() => expect(update).toHaveBeenCalledWith(JOB_ID, 'PICKED_UP', undefined));
    });
  });

  describe('rejected transitions', () => {
    it('surfaces the rejection and re-syncs to the server state', async () => {
      const getJobs = vi
        .spyOn(deliveryService, 'getProviderJobs')
        .mockResolvedValue([makeJob({ status: 'PICKED_UP' })]);
      vi.spyOn(deliveryService, 'updateJobStatus').mockRejectedValue(
        new NormalizedApiError({
          message: 'Cannot move a job from PICKED_UP to IN_TRANSIT',
          status: 422,
          errorCode: 'BUSINESS_RULE_VIOLATION',
        })
      );

      renderDetail();
      await waitFor(() => expect(screen.getByTestId('status-actions')).toBeInTheDocument());

      const callsBefore = getJobs.mock.calls.length;
      fireEvent.click(screen.getByTestId('status-action-in_transit'));

      expect(await screen.findByTestId('status-rejected-notice')).toHaveAttribute('role', 'alert');
      // The screen re-reads the server so it shows where the job actually is.
      await waitFor(() => expect(getJobs.mock.calls.length).toBeGreaterThan(callsBefore));
      // Still PICKED_UP on screen: the client never adopts the requested status.
      expect(screen.getAllByText('Picked up').length).toBeGreaterThan(0);
      expect(screen.queryByTestId('status-updated-notice')).not.toBeInTheDocument();
    });

    it('reports a rejection using the server message when one is provided', async () => {
      vi.spyOn(deliveryService, 'getProviderJobs').mockResolvedValue([
        makeJob({ status: 'PICKED_UP' }),
      ]);
      vi.spyOn(deliveryService, 'updateJobStatus').mockRejectedValue(
        new NormalizedApiError({
          message: 'Cannot move a job from PICKED_UP to IN_TRANSIT',
          status: 422,
        })
      );

      renderDetail();
      await waitFor(() => expect(screen.getByTestId('status-actions')).toBeInTheDocument());

      fireEvent.click(screen.getByTestId('status-action-in_transit'));

      const notice = await screen.findByTestId('status-rejected-notice');
      expect(notice).toHaveTextContent('The server rejected this change');
      expect(notice).toHaveTextContent('Cannot move a job from PICKED_UP to IN_TRANSIT');
      // No success notice alongside a rejection.
      expect(screen.queryByTestId('status-updated-notice')).not.toBeInTheDocument();
    });

    it('falls back to the server-reported current status when no message is usable', async () => {
      vi.spyOn(deliveryService, 'getProviderJobs').mockResolvedValue([
        makeJob({ status: 'PICKED_UP' }),
      ]);
      vi.spyOn(deliveryService, 'updateJobStatus').mockRejectedValue(
        new NormalizedApiError({ message: '', status: 500 })
      );

      renderDetail();
      await waitFor(() => expect(screen.getByTestId('status-actions')).toBeInTheDocument());

      fireEvent.click(screen.getByTestId('status-action-in_transit'));

      const notice = await screen.findByTestId('status-rejected-notice');
      expect(notice).toHaveTextContent('The status could not be updated. The job is still Picked up.');
    });
  });

  describe('states and accessibility', () => {
    it('says it cannot load while offline, and never claims the job is missing', async () => {
      onlineSpy.value = false;
      const spy = vi.spyOn(deliveryService, 'getProviderJobs').mockResolvedValue([makeJob()]);

      renderDetail();

      // No cached job and no connection: this must not read as "job not found".
      expect(await screen.findByTestId('offline-unavailable')).toBeInTheDocument();
      expect(screen.queryByTestId('delivery-job-not-found')).not.toBeInTheDocument();
      expect(spy).not.toHaveBeenCalled();
    });

    it('keeps a cached job visible but blocks status changes while offline', async () => {
      vi.spyOn(deliveryService, 'getProviderJobs').mockResolvedValue([makeJob()]);

      renderDetail();
      await waitFor(() => expect(screen.getByTestId('status-action-picked_up')).toBeInTheDocument());

      onlineSpy.value = false;
      window.dispatchEvent(new Event('offline'));

      // The provider keeps context, is told why updates are blocked, and cannot act.
      expect(await screen.findByTestId('offline-notice')).toBeInTheDocument();
      expect(screen.getByText('Banna co-op store')).toBeInTheDocument();
      await waitFor(() =>
        expect(screen.getByTestId('status-action-picked_up')).toBeDisabled()
      );
      expect(screen.getByTestId('status-reason')).toBeDisabled();
    });

    it('explains the missing provider id rather than requesting a job (gap F-1101-E1)', async () => {
      useAuthStore.setState({
        user: { id: 'u1', roles: ['DELIVERY_PROVIDER'], status: 'ACTIVE' } as never,
      });
      const spy = vi.spyOn(deliveryService, 'getProviderJobs').mockResolvedValue([makeJob()]);

      renderDetail();

      expect(await screen.findByTestId('provider-gap-state')).toBeInTheDocument();
      expect(spy).not.toHaveBeenCalled();
    });

    it('passes an axe accessibility audit on the detail screen', async () => {
      vi.spyOn(deliveryService, 'getProviderJobs').mockResolvedValue([makeJob()]);

      const { container } = render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={[`/dashboard/delivery/jobs/${JOB_ID}`]}>
            <Routes>
              <Route path="/dashboard/delivery/jobs/:jobId" element={<ProviderJobDetailPage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      );
      await waitFor(() => expect(screen.getByTestId('status-actions')).toBeInTheDocument());

      const results = await axe.run(container);
      expect(results.violations.map((v) => v.id)).toEqual([]);
    });

    it('labels every status action with text, not an icon alone', async () => {
      vi.spyOn(deliveryService, 'getProviderJobs').mockResolvedValue([makeJob()]);

      renderDetail();
      await waitFor(() => expect(screen.getByTestId('status-actions')).toBeInTheDocument());

      const actions = within(screen.getByTestId('status-actions')).getAllByRole('button');
      expect(actions.length).toBeGreaterThan(0);
      for (const action of actions) {
        expect(action.textContent?.trim().length ?? 0).toBeGreaterThan(0);
      }
    });
  });
});