import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import ProviderJobDetailPage from '../pages/dashboard/delivery/ProviderJobDetailPage';
import { useAuthStore } from '../features/auth/authStore';
import { deliveryService } from '../features/delivery';
import { NormalizedApiError } from '../services/httpClient';
import type { DeliveryJobResponse } from '../types/api';

const PROVIDER_ID = '77777777-7777-7777-7777-777777777777';
const ACTIVE_JOB_ID = 'aaaaaaaa-0000-0000-0000-000000000010';
const CLOSED_JOB_ID = 'aaaaaaaa-0000-0000-0000-000000000011';

const makeJob = (overrides: Partial<DeliveryJobResponse> = {}): DeliveryJobResponse => ({
  jobId: ACTIVE_JOB_ID,
  jobNo: 'DEL-2026-2001',
  providerId: PROVIDER_ID,
  providerName: 'Beko Transport',
  status: 'ASSIGNED',
  pickupAddress: 'Dimeka market',
  dropoffAddress: 'Turmi village centre',
  fee: 450,
  currency: 'ETB',
  orderIds: ['bbbbbbbb-0000-0000-0000-00000000000b'],
  createdAt: '2026-10-18T06:00:00Z',
  ...overrides,
});

interface FakeGeo {
  emit: (lat: number, lon: number, timestamp: number, speed?: number) => void;
  fail: (code: number, message: string) => void;
  isWatching: () => boolean;
  watchCount: () => number;
  clearCount: () => number;
}

function installFakeGeolocation(): FakeGeo {
  let id = 0;
  let success: ((p: unknown) => void) | null = null;
  let failure: ((e: { code: number; message: string }) => void) | null = null;
  let watches = 0;
  let clears = 0;

  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: {
      watchPosition(ok: (p: unknown) => void, err?: (e: { code: number; message: string }) => void) {
        id += 1;
        watches += 1;
        success = ok;
        failure = err ?? null;
        return id;
      },
      clearWatch() {
        clears += 1;
        success = null;
      },
    },
  });

  return {
    emit(lat, lon, timestamp, speed) {
      success?.({ coords: { latitude: lat, longitude: lon, speed }, timestamp });
    },
    fail(code, message) {
      failure?.({ code, message });
    },
    isWatching: () => success !== null,
    watchCount: () => watches,
    clearCount: () => clears,
  };
}

function removeGeolocation() {
  // @ts-expect-error -- restoring jsdom's default (absent) geolocation.
  delete navigator.geolocation;
}

describe('Provider GPS capture (F-1103)', () => {
  let queryClient: QueryClient;
  let geo: FakeGeo;
  let onlineSpy: { value: boolean };

  const renderDetail = (jobId = ACTIVE_JOB_ID) =>
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[`/dashboard/delivery/jobs/${jobId}`]}>
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
    geo = installFakeGeolocation();

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

    vi.spyOn(deliveryService, 'getProviderJobs').mockResolvedValue([makeJob()]);
    vi.spyOn(deliveryService, 'updateJobStatus').mockImplementation(async (_id, status) =>
      makeJob({ status })
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.dispatchEvent(new Event('online'));
    onlineSpy.value = true;
    removeGeolocation();
  });

  it('captures points with device timestamps once sharing is started', async () => {
    renderDetail();
    await waitFor(() => expect(screen.getByTestId('location-start')).toBeInTheDocument());

    // Nothing is recorded before the provider opts in.
    expect(geo.watchCount()).toBe(0);
    expect(screen.getByTestId('location-point-count')).toHaveTextContent('0 points waiting to upload');

    fireEvent.click(screen.getByTestId('location-start'));

    await waitFor(() => expect(screen.getByTestId('location-tracking-badge')).toBeInTheDocument());
    expect(geo.isWatching()).toBe(true);

    const deviceTime = Date.UTC(2026, 9, 18, 9, 0, 0);
    geo.emit(5.85, 36.4, deviceTime);

    await waitFor(() =>
      expect(screen.getByTestId('location-point-count')).toHaveTextContent('1 point waiting to upload')
    );

    // A second fix 30 s later is a second recorded point.
    geo.emit(5.851, 36.4, deviceTime + 30_000);
    await waitFor(() =>
      expect(screen.getByTestId('location-point-count')).toHaveTextContent('2 points waiting to upload')
    );
  });

  it('does not start capturing until the provider explicitly opts in', async () => {
    renderDetail();
    await waitFor(() => expect(screen.getByTestId('location-start')).toBeInTheDocument());

    expect(geo.watchCount()).toBe(0);
    expect(screen.queryByTestId('location-tracking-badge')).not.toBeInTheDocument();
  });

  it('stops the watch when the provider stops sharing', async () => {
    renderDetail();
    await waitFor(() => expect(screen.getByTestId('location-start')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('location-start'));
    await waitFor(() => expect(geo.isWatching()).toBe(true));

    fireEvent.click(screen.getByTestId('location-stop'));

    await waitFor(() => expect(geo.isWatching()).toBe(false));
    expect(screen.getByTestId('location-start')).toBeInTheDocument();
  });

  it('stops capturing once the job reaches a terminal status', async () => {
    renderDetail();
    await waitFor(() => expect(screen.getByTestId('location-start')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('location-start'));
    await waitFor(() => expect(geo.isWatching()).toBe(true));

    // Walk the job to a terminal status using only the server's returned states.
    await waitFor(() => expect(screen.getByTestId('status-action-picked_up')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('status-action-picked_up'));
    await waitFor(() => expect(screen.getByTestId('status-action-in_transit')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('status-action-in_transit'));
    await waitFor(() => expect(screen.getByTestId('status-action-delivered')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('status-action-delivered'));

    await waitFor(() => expect(screen.getByTestId('no-next-steps')).toBeInTheDocument());
    // "Stop after delivery" is the whole point: no watch is left running.
    await waitFor(() => expect(geo.isWatching()).toBe(false));
    expect(geo.clearCount()).toBeGreaterThan(0);
  });

  it('never offers location sharing for an already closed job', async () => {
    vi.spyOn(deliveryService, 'getProviderJobs').mockResolvedValue([
      makeJob({ jobId: CLOSED_JOB_ID, status: 'DELIVERED' }),
    ]);

    renderDetail(CLOSED_JOB_ID);

    expect(await screen.findByTestId('no-next-steps')).toBeInTheDocument();
    expect(screen.queryByTestId('location-capture')).not.toBeInTheDocument();
    expect(geo.watchCount()).toBe(0);
  });

  it('explains a denied permission instead of silently failing', async () => {
    renderDetail();
    await waitFor(() => expect(screen.getByTestId('location-start')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('location-start'));
    await waitFor(() => expect(geo.isWatching()).toBe(true));

    geo.fail(1, 'User denied Geolocation');

    const alert = await screen.findByTestId('location-permission-denied');
    expect(alert).toHaveAttribute('role', 'alert');
    expect(alert).toHaveTextContent('Location access was blocked');
    // The watch is torn down rather than left retrying against a refusal.
    await waitFor(() => expect(geo.isWatching()).toBe(false));
  });

  it('reports an unavailable GPS fix distinctly from a permission problem', async () => {
    renderDetail();
    await waitFor(() => expect(screen.getByTestId('location-start')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('location-start'));
    await waitFor(() => expect(geo.isWatching()).toBe(true));

    geo.fail(2, 'Position unavailable');

    const alert = await screen.findByTestId('location-unavailable');
    expect(alert).toHaveAttribute('role', 'alert');
    expect(alert).toHaveTextContent('could not provide a location fix');
  });

  it('will not start sharing while offline', async () => {
    onlineSpy.value = false;
    vi.spyOn(deliveryService, 'getProviderJobs').mockResolvedValue([makeJob()]);

    renderDetail();

    expect(await screen.findByTestId('offline-unavailable')).toBeInTheDocument();
    // The cached job is not available offline yet, so no capture control is shown at all.
    expect(geo.watchCount()).toBe(0);
  });

  it('surfaces a rejected status change without discarding capture state', async () => {
    renderDetail();
    await waitFor(() => expect(screen.getByTestId('location-start')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('location-start'));
    await waitFor(() => expect(geo.isWatching()).toBe(true));

    geo.emit(5.85, 36.4, Date.UTC(2026, 9, 18, 9, 0, 0));
    await waitFor(() =>
      expect(screen.getByTestId('location-point-count')).toHaveTextContent('1 point waiting to upload')
    );

    vi.spyOn(deliveryService, 'updateJobStatus').mockRejectedValue(
      new NormalizedApiError({ message: 'Cannot move a job from ASSIGNED to IN_TRANSIT', status: 422 })
    );
    fireEvent.click(screen.getByTestId('status-action-picked_up'));

    expect(await screen.findByTestId('status-rejected-notice')).toHaveAttribute('role', 'alert');
    // The job did not move, so capture continues untouched.
    expect(geo.isWatching()).toBe(true);
  });
});