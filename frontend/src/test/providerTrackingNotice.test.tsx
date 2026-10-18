import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import axe from 'axe-core';

import ProviderJobDetailPage from '../pages/dashboard/delivery/ProviderJobDetailPage';
import { TrackingLimitNotice } from '../features/delivery/TrackingLimitNotice';
import { useAuthStore } from '../features/auth/authStore';
import { deliveryService } from '../features/delivery';
import type { DeliveryJobResponse } from '../types/api';

const PROVIDER_ID = '77777777-7777-7777-7777-777777777777';
const ACTIVE_JOB_ID = 'aaaaaaaa-0000-0000-0000-000000000012';
const CLOSED_JOB_ID = 'aaaaaaaa-0000-0000-0000-000000000013';

const makeJob = (overrides: Partial<DeliveryJobResponse> = {}): DeliveryJobResponse => ({
  jobId: ACTIVE_JOB_ID,
  jobNo: 'DEL-2026-3001',
  providerId: PROVIDER_ID,
  providerName: 'Beko Transport',
  status: 'ASSIGNED',
  pickupAddress: 'Dimeka market',
  dropoffAddress: 'Turmi village centre',
  fee: 450,
  currency: 'ETB',
  orderIds: [],
  createdAt: '2026-10-18T06:00:00Z',
  ...overrides,
});

describe('Background tracking limitation notice (F-1108)', () => {
  const renderDetail = (jobId: string) => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[`/dashboard/delivery/jobs/${jobId}`]}>
          <Routes>
            <Route path="/dashboard/delivery/jobs/:jobId" element={<ProviderJobDetailPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
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
  });

  it('states the platform limit in plain words', async () => {
    vi.spyOn(deliveryService, 'getProviderJobs').mockResolvedValue([makeJob()]);

    renderDetail(ACTIVE_JOB_ID);

    const notice = await screen.findByTestId('tracking-limit-notice');
    expect(notice).toHaveTextContent('Tracking stops when you leave this app');
    // The three states that stop collection, named rather than implied.
    expect(notice).toHaveTextContent(/Locking the phone, switching apps, or closing the browser/i);
  });

  it('points at the SMS checkpoint with the provider’s own job number', async () => {
    vi.spyOn(deliveryService, 'getProviderJobs').mockResolvedValue([makeJob()]);

    renderDetail(ACTIVE_JOB_ID);

    await screen.findByTestId('tracking-limit-notice');
    // The example is the real job number, so it can be sent as-is.
    expect(screen.getByTestId('tracking-sms-example')).toHaveTextContent('DEL-2026-3001');
    // It must come from the registered phone, which is what InboundSmsService checks.
    expect(screen.getByTestId('tracking-limit-notice')).toHaveTextContent(
      /phone number registered to your account/i
    );
    // The words the backend actually matches on.
    expect(screen.getByTestId('tracking-limit-notice')).toHaveTextContent(
      /PICKED or COLLECTED, LEFT or TRANSIT, ARRIVED or DELIVERED/i
    );
  });

  it('appears next to the location controls on an active job', async () => {
    vi.spyOn(deliveryService, 'getProviderJobs').mockResolvedValue([makeJob()]);

    renderDetail(ACTIVE_JOB_ID);

    // Both live on the same card, so the warning is read where the switch is flipped.
    await waitFor(() => {
      expect(screen.getByTestId('tracking-limit-notice')).toBeInTheDocument();
      expect(screen.getByTestId('location-capture')).toBeInTheDocument();
    });
    expect(screen.getByTestId('tracking-limit-notice')).toBeInTheDocument();
  });

  it('is absent once the job is finished, where it would only cause confusion', async () => {
    vi.spyOn(deliveryService, 'getProviderJobs').mockResolvedValue([
      makeJob({ jobId: CLOSED_JOB_ID, status: 'DELIVERED' }),
    ]);

    renderDetail(CLOSED_JOB_ID);

    // The location card itself is gated on the job being active, and the notice rides on it.
    await waitFor(() => expect(screen.getByTestId('delivery-job-detail')).toBeInTheDocument());
    expect(screen.queryByTestId('tracking-limit-notice')).not.toBeInTheDocument();
    expect(screen.queryByTestId('location-capture')).not.toBeInTheDocument();
  });

  it('passes an axe accessibility audit', async () => {
    const { container } = render(<TrackingLimitNotice jobNo="DEL-2026-3001" />);

    const results = await axe.run(container, {
      // The page-level rules need a full document; this audits the component itself.
      rules: { region: { enabled: false } },
    });

    expect(results.violations).toEqual([]);
  });
});
