import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import axe from 'axe-core';

import DeliveryDashboardPage from '../pages/dashboard/DeliveryDashboardPage';
import { useAuthStore } from '../features/auth/authStore';
import { deliveryService } from '../features/delivery';
import { NormalizedApiError } from '../services/httpClient';
import type { DeliveryJobResponse } from '../types/api';

const PROVIDER_ID = '77777777-7777-7777-7777-777777777777';
const USER_ID = '11111111-1111-1111-1111-111111111111';

const makeJob = (overrides: Partial<DeliveryJobResponse> = {}): DeliveryJobResponse => ({
  jobId: 'aaaaaaaa-0000-0000-0000-000000000001',
  jobNo: 'DEL-2026-1001',
  providerId: PROVIDER_ID,
  providerName: 'Beko Transport',
  status: 'ASSIGNED',
  pickupAddress: 'Dimeka market, Jinka road',
  dropoffAddress: 'Turmi village centre',
  fee: 450,
  currency: 'ETB',
  trackingToken: 'TRK-1001',
  orderIds: ['bbbbbbbb-0000-0000-0000-00000000000a'],
  pickedUpAt: undefined,
  deliveredAt: undefined,
  createdAt: '2026-10-18T06:00:00Z',
  ...overrides,
});

const jobs: DeliveryJobResponse[] = [
  makeJob(),
  makeJob({
    jobId: 'aaaaaaaa-0000-0000-0000-000000000002',
    jobNo: 'DEL-2026-1002',
    status: 'IN_TRANSIT',
    pickupAddress: 'Banna co-op store',
    dropoffAddress: 'Arba Minch bus station',
    orderIds: ['bbbbbbbb-0000-0000-0000-00000000000b', 'bbbbbbbb-0000-0000-0000-00000000000c'],
  }),
  makeJob({
    jobId: 'aaaaaaaa-0000-0000-0000-000000000003',
    jobNo: 'DEL-2026-1003',
    status: 'DELIVERED',
    deliveredAt: '2026-10-17T15:00:00Z',
  }),
];

/**
 * `null` means "the backend did not send a provider id" (gap F-1101-E1).
 * A default parameter would treat an explicit `undefined` as "use the default", which
 * would silently defeat the gap case, so this takes an explicit `string | null`.
 */
const signedInProvider = (deliveryProviderId: string | null) =>
  ({
    id: USER_ID,
    phoneNumber: '+251911000004',
    fullName: 'Beko Transport',
    status: 'ACTIVE',
    preferredLanguage: 'en',
    roles: ['DELIVERY_PROVIDER'],
    ...(deliveryProviderId ? { deliveryProviderId } : {}),
  }) as never;

describe('Delivery provider home and job list (F-1101)', () => {
  let queryClient: QueryClient;
  let onlineSpy: { value: boolean };

  const setOnline = (value: boolean) => {
    onlineSpy.value = value;
    window.dispatchEvent(new Event(value ? 'online' : 'offline'));
  };

  it('refetches automatically when the connection comes back', async () => {
    onlineSpy.value = false;
    const spy = vi.spyOn(deliveryService, 'getProviderJobs').mockResolvedValue(jobs);

    renderPage();
    expect(await screen.findByTestId('offline-notice')).toBeInTheDocument();
    expect(spy).not.toHaveBeenCalled();

    setOnline(true);

    await waitFor(() => expect(screen.queryByTestId('offline-notice')).not.toBeInTheDocument());
    await waitFor(() => expect(spy).toHaveBeenCalledWith(PROVIDER_ID));
  });

  const renderPage = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/dashboard/delivery']}>
          <DeliveryDashboardPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

  beforeEach(() => {
    vi.restoreAllMocks();
    onlineSpy = { value: true };
    // jsdom reports navigator.onLine === true; make it settable for the offline state.
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      get: () => onlineSpy.value,
    });

    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });

    useAuthStore.setState({
      user: signedInProvider(PROVIDER_ID),
      token: 'provider-token',
      isAuthenticated: true,
      isLoading: false,
      activeRole: 'DELIVERY_PROVIDER',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows the loading state while the job list is in flight', async () => {
    let resolveJobs: (value: DeliveryJobResponse[]) => void = () => {};
    vi.spyOn(deliveryService, 'getProviderJobs').mockImplementation(
      () => new Promise<DeliveryJobResponse[]>((resolve) => { resolveJobs = resolve; })
    );

    renderPage();

    expect(await screen.findByTestId('delivery-loading')).toBeInTheDocument();

    resolveJobs(jobs);
    await waitFor(() => expect(screen.queryByTestId('delivery-loading')).not.toBeInTheDocument());
  });

  it('lists assigned jobs with status, pickup and drop-off, and fee from the server', async () => {
    vi.spyOn(deliveryService, 'getProviderJobs').mockResolvedValue(jobs);

    renderPage();

    await waitFor(() => expect(screen.getByTestId('delivery-job-list')).toBeInTheDocument());

    const cards = screen.getAllByTestId('delivery-job-card');
    expect(cards).toHaveLength(3);

    // Pickup and drop-off come straight from the server response.
    expect(within(cards[0]).getByText('Dimeka market, Jinka road')).toBeInTheDocument();
    expect(within(cards[0]).getByText('Turmi village centre')).toBeInTheDocument();

    // Job number and status are surfaced.
    expect(within(cards[0]).getByText('DEL-2026-1001')).toBeInTheDocument();
    expect(within(cards[0]).getByText('Assigned')).toBeInTheDocument();
    expect(within(cards[1]).getByText('In transit')).toBeInTheDocument();
    expect(within(cards[2]).getByText('Delivered')).toBeInTheDocument();

    // Fee is displayed exactly as returned, not recomputed.
    expect(within(cards[0]).getByText(/450\.00 ETB/)).toBeInTheDocument();

    // Order count reflects the server's orderIds length.
    expect(within(cards[0]).getByText('1 order')).toBeInTheDocument();
    expect(within(cards[1]).getByText('2 orders')).toBeInTheDocument();
  });

  it('requests the job list for the signed-in provider id only', async () => {
    const spy = vi.spyOn(deliveryService, 'getProviderJobs').mockResolvedValue(jobs);

    renderPage();

    await waitFor(() => expect(spy).toHaveBeenCalledWith(PROVIDER_ID));
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('shows an empty state when the provider has no jobs', async () => {
    vi.spyOn(deliveryService, 'getProviderJobs').mockResolvedValue([]);

    renderPage();

    expect(await screen.findByTestId('delivery-empty')).toBeInTheDocument();
    expect(screen.getByText('No jobs assigned yet')).toBeInTheDocument();
  });

  it('shows an error state with a retry control when the request fails', async () => {
    const getJobs = vi
      .spyOn(deliveryService, 'getProviderJobs')
      .mockRejectedValueOnce(new NormalizedApiError({ message: 'boom', status: 500 }))
      .mockResolvedValueOnce(jobs);

    renderPage();

    const errorBox = await screen.findByTestId('delivery-error');
    expect(within(errorBox).getByRole('alert')).toBeInTheDocument();
    expect(within(errorBox).getByText('We could not load your jobs')).toBeInTheDocument();

    fireEvent.click(within(errorBox).getByRole('button', { name: /try again/i }));

    await waitFor(() => expect(screen.getByTestId('delivery-job-list')).toBeInTheDocument());
    expect(getJobs).toHaveBeenCalledTimes(2);
  });

  it('reports a 403 as a permissions message rather than a generic failure', async () => {
    vi.spyOn(deliveryService, 'getProviderJobs').mockRejectedValue(
      new NormalizedApiError({ message: 'forbidden', status: 403 })
    );

    renderPage();

    const errorBox = await screen.findByTestId('delivery-error');
    expect(within(errorBox).getByText('You are not allowed to view these jobs.')).toBeInTheDocument();
  });

  it('shows an offline notice and does not request jobs while offline', async () => {
    onlineSpy.value = false;
    const spy = vi.spyOn(deliveryService, 'getProviderJobs').mockResolvedValue(jobs);

    renderPage();

    expect(await screen.findByTestId('offline-notice')).toBeInTheDocument();
    expect(screen.getByText(/You are offline/)).toBeInTheDocument();
    expect(spy).not.toHaveBeenCalled();
  });

  it('filters the list to in-progress and closed jobs', async () => {
    vi.spyOn(deliveryService, 'getProviderJobs').mockResolvedValue(jobs);

    renderPage();
    await waitFor(() => expect(screen.getByTestId('delivery-job-list')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('filter-active'));
    await waitFor(() => expect(screen.getAllByTestId('delivery-job-card')).toHaveLength(2));

    fireEvent.click(screen.getByTestId('filter-closed'));
    await waitFor(() => expect(screen.getAllByTestId('delivery-job-card')).toHaveLength(1));
    expect(screen.getByText('DEL-2026-1003')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('filter-all'));
    await waitFor(() => expect(screen.getAllByTestId('delivery-job-card')).toHaveLength(3));
  });

  it('marks the active filter with aria-pressed for keyboard and screen-reader users', async () => {
    vi.spyOn(deliveryService, 'getProviderJobs').mockResolvedValue(jobs);

    renderPage();
    await waitFor(() => expect(screen.getByTestId('delivery-job-list')).toBeInTheDocument());

    expect(screen.getByTestId('filter-all')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('filter-active')).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(screen.getByTestId('filter-active'));

    expect(screen.getByTestId('filter-active')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('filter-all')).toHaveAttribute('aria-pressed', 'false');
  });

  it('explains the missing provider id instead of calling the wrong endpoint (gap F-1101-E1)', async () => {
    useAuthStore.setState({ user: signedInProvider(null) });
    const spy = vi.spyOn(deliveryService, 'getProviderJobs').mockResolvedValue(jobs);

    renderPage();

    expect(await screen.findByTestId('provider-gap-state')).toBeInTheDocument();
    expect(screen.getByText('Provider profile is not ready')).toBeInTheDocument();
    // Critically: it must NOT fall back to the user id, which would 404.
    expect(spy).not.toHaveBeenCalled();
  });

  it('renders English text with real translations, not raw keys', async () => {
    vi.spyOn(deliveryService, 'getProviderJobs').mockResolvedValue(jobs);

    renderPage();
    await waitFor(() => expect(screen.getByTestId('delivery-job-list')).toBeInTheDocument());

    expect(screen.getByText('Delivery Provider Workspace')).toBeInTheDocument();
    expect(screen.getByText('Your jobs')).toBeInTheDocument();
    // A leaked key would render as "delivery.jobsHeading".
    expect(screen.queryByText(/delivery\./)).not.toBeInTheDocument();
  });

  it('passes an axe accessibility audit on the populated screen', async () => {
    vi.spyOn(deliveryService, 'getProviderJobs').mockResolvedValue(jobs);

    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/dashboard/delivery']}>
          <DeliveryDashboardPage />
        </MemoryRouter>
      </QueryClientProvider>
    );
    await waitFor(() => expect(screen.getByTestId('delivery-job-list')).toBeInTheDocument());

    const results = await axe.run(container);
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });

  it('lays out without fixed widths or forced non-wrapping, so 360px holds', async () => {
    vi.spyOn(deliveryService, 'getProviderJobs').mockResolvedValue(jobs);

    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/dashboard/delivery']}>
          <DeliveryDashboardPage />
        </MemoryRouter>
      </QueryClientProvider>
    );
    await waitFor(() => expect(screen.getByTestId('delivery-job-list')).toBeInTheDocument());

    const html = container.innerHTML;
    expect(html).not.toMatch(/w-\[\d{3,}px\]/);
    expect(html).not.toMatch(/min-w-\[\d{3,}px\]/);
    expect(html).not.toMatch(/whitespace-nowrap/);
    expect(html).not.toMatch(/overflow-x-auto/);
  });

  it('exposes every filter control as a keyboard-reachable button', async () => {
    vi.spyOn(deliveryService, 'getProviderJobs').mockResolvedValue(jobs);

    renderPage();
    await waitFor(() => expect(screen.getByTestId('delivery-job-list')).toBeInTheDocument());

    for (const option of ['all', 'active', 'closed']) {
      const button = screen.getByTestId(`filter-${option}`);
      expect(button.tagName).toBe('BUTTON');
      expect(button).toHaveAttribute('type', 'button');
      // Accessible name comes from the visible label, not an icon alone.
      expect(button.textContent?.trim().length ?? 0).toBeGreaterThan(0);
    }
  });
});