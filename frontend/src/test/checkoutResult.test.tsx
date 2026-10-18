import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import axe from 'axe-core';
import { CheckoutResult } from '../features/checkout';
import { orderConfirmationService } from '../features/checkout/orderConfirmationService';
import { useAuthStore } from '../features/auth';
import { NormalizedApiError } from '../services/apiError';
import type { CheckoutResponse, OrderDetailResponse } from '../types/api';
import i18n from '../i18n';
const group = '11111111-1111-4111-8111-000000000001';
const orderA = '22222222-2222-4222-8222-000000000001';
const orderB = '22222222-2222-4222-8222-000000000002';
const sellerA = '33333333-3333-4333-8333-000000000001';
const sellerB = '33333333-3333-4333-8333-000000000002';
const buyer = '44444444-4444-4444-8444-000000000001';
const result: CheckoutResponse = {
  checkoutGroupId: group,
  groupNo: 'CHK-001',
  status: 'CREATED',
  totalAmount: 777,
  currency: 'ETB',
  orders: [
    {
      orderId: orderA,
      orderNo: 'ORD-A',
      enterpriseId: sellerA,
      enterpriseName: 'Honey cooperative',
      status: 'PLACED',
      totalAmount: 420,
      currency: 'ETB',
      createdAt: '2026-01-01T00:00:00Z',
    },
    {
      orderId: orderB,
      orderNo: 'ORD-B',
      enterpriseId: sellerB,
      enterpriseName: 'Artisans',
      status: 'PLACED',
      totalAmount: 380,
      currency: 'ETB',
    },
  ],
};
const detailA: OrderDetailResponse = {
  ...result.orders![0],
  checkoutGroupId: group,
  buyerId: buyer,
  statusHistories: [],
};
const detailB: OrderDetailResponse = {
  ...result.orders![1],
  checkoutGroupId: group,
  buyerId: buyer,
  statusHistories: [],
};
let client: QueryClient;
function show(data = result, paymentHref?: (id: string) => string | undefined) {
  const onNewCheckout = vi.fn();
  const view = render(
    <main>
      <MemoryRouter>
        <QueryClientProvider client={client}>
          <CheckoutResult
            result={data}
            onNewCheckout={onNewCheckout}
            paymentHref={paymentHref}
          />
        </QueryClientProvider>
      </MemoryRouter>
    </main>,
  );
  return { ...view, onNewCheckout };
}
const article = (name: string) => within(screen.getByRole('article', { name }));
beforeEach(async () => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  useAuthStore.setState({
    isAuthenticated: true,
    isLoading: false,
    token: 'test-token',
    user: { id: buyer, roles: ['BUYER_VISITOR'] },
  });
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
  vi.spyOn(orderConfirmationService, 'get').mockImplementation(async (id) => ({
    ...(id === orderA ? detailA : detailB),
  }));
  await i18n.changeLanguage('en');
});
afterEach(async () => {
  cleanup();
  client.clear();
  vi.restoreAllMocks();
  await i18n.changeLanguage('en');
});
describe('Checkout result F-506', () => {
  it('shows a server group total and distinct seller orders without adding totals in the browser', async () => {
    show();
    await waitFor(() =>
      expect(
        screen.queryByText('Checking your orders…'),
      ).not.toBeInTheDocument(),
    );
    expect(
      screen.getByText('Server-confirmed total: 777.00 ETB'),
    ).toBeInTheDocument();
    expect(
      article('Honey cooperative').getByText('420.00 ETB'),
    ).toBeInTheDocument();
    expect(article('Artisans').getByText('380.00 ETB')).toBeInTheDocument();
    expect(orderConfirmationService.get).toHaveBeenCalledTimes(2);
  });
  it('does not derive a deadline from createdAt or a client-side 30-minute rule', async () => {
    show();
    await waitFor(() =>
      expect(orderConfirmationService.get).toHaveBeenCalledTimes(2),
    );
    expect(
      screen.getAllByText(/Reservation deadline is unavailable/),
    ).toHaveLength(2);
    expect(screen.queryByRole('timer')).not.toBeInTheDocument();
    expect(screen.queryByText(/reservation expired/)).not.toBeInTheDocument();
  });
  it('renders loading and disables payment while checking current status', async () => {
    vi.mocked(orderConfirmationService.get).mockReturnValue(
      new Promise(() => {}),
    );
    show(result, (id) => `/pay/${id}`);
    expect(screen.getByText('Checking your orders…')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Pay order ORD-A' }),
    ).toBeDisabled();
  });
  it('renders an empty result without claiming order creation', () => {
    show({ orders: [] });
    expect(
      screen.getByText('No confirmed orders are available.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Order created')).not.toBeInTheDocument();
  });
  it('keeps missing payment routes disabled rather than linking to an unfinished page', async () => {
    show();
    await waitFor(() =>
      expect(
        screen.queryByText('Checking your orders…'),
      ).not.toBeInTheDocument(),
    );
    expect(
      screen.getByRole('button', { name: 'Pay order ORD-A' }),
    ).toBeDisabled();
    expect(
      screen.queryByRole('link', { name: 'Pay order ORD-A' }),
    ).not.toBeInTheDocument();
  });
  it('provides separate links when a real payment destination is supplied', async () => {
    show(result, (id) => `/pay/${id}`);
    expect(
      await screen.findByRole('link', { name: 'Pay order ORD-A' }),
    ).toHaveAttribute('href', `/pay/${orderA}`);
    expect(
      await screen.findByRole('link', { name: 'Pay order ORD-B' }),
    ).toHaveAttribute('href', `/pay/${orderB}`);
  });
  it('does not mark the other seller paid when one order is paid', async () => {
    vi.mocked(orderConfirmationService.get).mockImplementation(async (id) => ({
      ...(id === orderA ? { ...detailA, status: 'PAID' as const } : detailB),
    }));
    show(result, (id) => `/pay/${id}`);
    await screen.findByRole('link', { name: 'Pay order ORD-B' });
    expect(article('Honey cooperative').getByText('Paid')).toBeInTheDocument();
    expect(article('Artisans').getByText('Placed')).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Pay order ORD-A' }),
    ).not.toBeInTheDocument();
  });
  it('shows expiry only when cancellation history explicitly reports expired reservations', async () => {
    vi.mocked(orderConfirmationService.get).mockResolvedValue({
      ...detailA,
      status: 'CANCELLED',
      statusHistories: [
        {
          toStatus: 'CANCELLED',
          reason: 'Order cancelled due to expired stock reservations',
        },
      ],
    });
    show({ ...result, orders: [result.orders![0]] }, (id) => `/pay/${id}`);
    expect(
      await screen.findByText(/server reports that this reservation expired/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Pay order ORD-A' }),
    ).toBeDisabled();
  });
  it('does not call ordinary cancellation an expired reservation', async () => {
    vi.mocked(orderConfirmationService.get).mockResolvedValue({
      ...detailA,
      status: 'CANCELLED',
      statusHistories: [
        { toStatus: 'CANCELLED', reason: 'Cancelled by buyer' },
      ],
    });
    show({ ...result, orders: [result.orders![0]] });
    await screen.findByText('Cancelled');
    expect(screen.queryByText(/reservation expired/)).not.toBeInTheDocument();
  });
  it('refreshes a failed order without hiding the other seller', async () => {
    let failure = true;
    vi.mocked(orderConfirmationService.get).mockImplementation(async (id) => {
      if (id === orderA && failure) throw new Error('network');
      return id === orderA ? detailA : detailB;
    });
    show();
    await screen.findByText(/current status could not be checked/);
    expect(article('Artisans').getByText('Placed')).toBeInTheDocument();
    failure = false;
    fireEvent.click(
      screen.getByRole('button', { name: 'Refresh order status' }),
    );
    await waitFor(() =>
      expect(
        screen.queryByText(/current status could not be checked/),
      ).not.toBeInTheDocument(),
    );
  });
  it.each([
    { buyerId: 'other-buyer' },
    { checkoutGroupId: 'other-group' },
    { enterpriseId: 'other-seller' },
  ])('blocks mismatched group, seller or buyer responses %o', async (patch) => {
    vi.mocked(orderConfirmationService.get).mockResolvedValue({
      ...detailA,
      ...patch,
      totalAmount: 1,
      currency: 'USD',
    });
    show();
    expect(
      await screen.findAllByText(/current status could not be checked/),
    ).toHaveLength(2);
    expect(screen.queryByText('1.00 USD')).not.toBeInTheDocument();
  });
  it('handles forbidden order access and keeps payment disabled', async () => {
    vi.mocked(orderConfirmationService.get).mockRejectedValue(
      new NormalizedApiError({ status: 403, message: 'denied' }),
    );
    show(result, (id) => `/pay/${id}`);
    expect(
      await screen.findAllByText(
        'This order is no longer available to this account.',
      ),
    ).toHaveLength(2);
    expect(screen.queryAllByRole('link', { name: /^Pay order/ })).toHaveLength(
      0,
    );
  });
  it('preserves cached confirmation offline but disables links, and refreshes on reconnect', async () => {
    show(result, (id) => `/pay/${id}`);
    await screen.findByRole('link', { name: 'Pay order ORD-A' });
    act(() => {
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
      window.dispatchEvent(new Event('offline'));
    });
    expect(
      screen.getByText(/These are the last confirmed details/),
    ).toBeInTheDocument();
    expect(screen.queryAllByRole('link', { name: /^Pay order/ })).toHaveLength(
      0,
    );
    expect(
      screen.getByRole('button', { name: 'Refresh order status' }),
    ).toBeDisabled();
    act(() => {
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
      window.dispatchEvent(new Event('online'));
    });
    await screen.findByRole('link', { name: 'Pay order ORD-A' });
    expect(orderConfirmationService.get).toHaveBeenCalledTimes(4);
  });
  it('supports a cold offline result without fetching private data', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    show();
    expect(orderConfirmationService.get).not.toHaveBeenCalled();
    expect(screen.getByText(/You are offline/)).toBeInTheDocument();
  });
  it('does not combine an old amount with a newly returned currency', async () => {
    vi.mocked(orderConfirmationService.get).mockResolvedValue({
      ...detailA,
      totalAmount: undefined,
      currency: 'USD',
    });
    show({ ...result, orders: [result.orders![0]] });
    await waitFor(() =>
      expect(
        screen.queryByText('Checking your orders…'),
      ).not.toBeInTheDocument(),
    );
    expect(screen.queryByText('420.00 USD')).not.toBeInTheDocument();
    expect(
      article('Honey cooperative').getByText('Unavailable'),
    ).toBeInTheDocument();
  });
  it('removes private query data after leaving the result', async () => {
    const view = show();
    await waitFor(() =>
      expect(
        client
          .getQueryCache()
          .getAll()
          .filter((query) => query.state.status === 'success'),
      ).toHaveLength(2),
    );
    view.unmount();
    await waitFor(() =>
      expect(client.getQueryCache().getAll()).toHaveLength(0),
    );
  });
  it('calls the explicit new-checkout action', () => {
    const { onNewCheckout } = show();
    fireEvent.click(
      screen.getByRole('button', { name: 'Start another checkout' }),
    );
    expect(onNewCheckout).toHaveBeenCalledOnce();
  });
  it('has semantic labels and supports the Amharic fallback', async () => {
    const { container } = show();
    await waitFor(() =>
      expect(
        screen.queryByText('Checking your orders…'),
      ).not.toBeInTheDocument(),
    );
    expect(
      (
        await axe.run(container, {
          rules: { 'color-contrast': { enabled: false } },
        })
      ).violations,
    ).toEqual([]);
    await act(async () => {
      await i18n.changeLanguage('om');
    });
    expect(
      screen.getByRole('button', { name: 'የትዕዛዝ ሁኔታ ያድሱ' }),
    ).toBeInTheDocument();
  });
});
