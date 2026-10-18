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
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import axe from 'axe-core';
import OrdersPage from '../pages/account/OrdersPage';
import OrderDetailPage from '../pages/account/OrderDetailPage';
import { orderService } from '../features/orders/orderService';
import { useAuthStore } from '../features/auth';
import { NormalizedApiError } from '../services/apiError';
import type {
  OrderDetailResponse,
  OrderSummaryResponse,
  PaymentResponse,
} from '../types/api';
import i18n from '../i18n';
const id = '11111111-1111-4111-8111-000000000001';
const buyer = '22222222-2222-4222-8222-000000000001';
const seller = '33333333-3333-4333-8333-000000000001';
const summary: OrderSummaryResponse = {
  orderId: id,
  orderNo: 'ORD-001',
  enterpriseId: seller,
  enterpriseName: 'Honey cooperative',
  status: 'PLACED',
  totalAmount: 470,
  currency: 'ETB',
  createdAt: '2026-10-18T10:00:00Z',
};
const detail: OrderDetailResponse = {
  ...summary,
  buyerId: buyer,
  deliveryAddress: 'Jinka market',
  deliveryPhone: '+251911000001',
  notes: 'Call on arrival',
  subtotal: 420,
  tax: 15,
  platformFee: 35,
  deliveryFee: 0,
  items: [
    {
      id: '44444444-4444-4444-8444-000000000001',
      productName: 'Honey snapshot name',
      productSku: 'OLD-SKU',
      unitPrice: 420,
      quantity: 0.125,
      lineTotal: 52.5,
    },
  ],
  statusHistories: [
    {
      toStatus: 'PAID',
      createdAt: '2026-10-18T10:05:00Z',
      reason: 'Payment received',
    },
    {
      toStatus: 'PLACED',
      createdAt: '2026-10-18T10:00:00Z',
      reason: 'Order created',
    },
  ],
};
const payment: PaymentResponse = {
  paymentId: '55555555-5555-4555-8555-000000000001',
  paymentNo: 'PAY-001',
  orderId: id,
  amount: 470,
  currency: 'ETB',
  status: 'HELD',
};
const originalBootstrap = useAuthStore.getState().bootstrap;
let client: QueryClient;
function show(path = '/account/orders') {
  return render(
    <main>
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/account/orders" element={<OrdersPage />} />
            <Route path="/account/orders/:id" element={<OrderDetailPage />} />
            <Route path="/login" element={<p>Sign in screen</p>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </main>,
  );
}
beforeEach(async () => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  useAuthStore.setState({
    user: { id: buyer, roles: ['BUYER_VISITOR'] },
    token: 'token-a',
    isAuthenticated: true,
    isLoading: false,
    bootstrap: originalBootstrap,
  });
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
  vi.spyOn(orderService, 'list').mockResolvedValue([summary]);
  vi.spyOn(orderService, 'detail').mockResolvedValue(detail);
  vi.spyOn(orderService, 'payment').mockResolvedValue(payment);
  await i18n.changeLanguage('en');
});
afterEach(async () => {
  cleanup();
  client.clear();
  vi.restoreAllMocks();
  await i18n.changeLanguage('en');
});
describe('My orders F-508', () => {
  it('requires authentication on list and detail routes', () => {
    useAuthStore.setState({ user: null, token: null, isAuthenticated: false });
    show(`/account/orders/${id}`);
    expect(screen.getByText('Sign in screen')).toBeInTheDocument();
    expect(orderService.list).not.toHaveBeenCalled();
    expect(orderService.detail).not.toHaveBeenCalled();
    expect(orderService.payment).not.toHaveBeenCalled();
  });
  it('verifies a stored session before fetching private orders', async () => {
    const bootstrap = vi.fn(async () => {
      useAuthStore.setState({ isLoading: false });
    });
    useAuthStore.setState({ isLoading: true, bootstrap });
    show();
    await screen.findByText('Order ORD-001');
    expect(bootstrap).toHaveBeenCalledOnce();
  });
  it('supports any authenticated backend role rather than legacy role strings', async () => {
    useAuthStore.setState({ user: { id: buyer, roles: ['TOUR_GUIDE'] } });
    show();
    expect(await screen.findByText('Order ORD-001')).toBeInTheDocument();
  });
  it('renders loading and an empty list without claiming a network error', async () => {
    let resolve!: (value: OrderSummaryResponse[]) => void;
    vi.mocked(orderService.list).mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    show();
    expect(screen.getByText('Loading your orders…')).toBeInTheDocument();
    await act(async () => resolve([]));
    expect(
      await screen.findByText('You have not placed any orders yet.'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Browse products' }),
    ).toHaveAttribute('href', '/products');
  });
  it('lists server amounts and navigates to the owned detail with snapshots', async () => {
    show();
    fireEvent.click(
      await screen.findByRole('link', { name: 'View order ORD-001' }),
    );
    expect(
      await screen.findByRole('heading', { name: 'Honey snapshot name' }),
    ).toBeInTheDocument();
    expect(screen.getByText('OLD-SKU')).toBeInTheDocument();
    expect(screen.getAllByText('52.50 ETB').length).toBeGreaterThan(0);
    expect(screen.getByText('0.125')).toBeInTheDocument();
    expect(await screen.findByText('Held in escrow')).toBeInTheDocument();
    expect(orderService.detail).toHaveBeenCalledWith(
      id,
      buyer,
      expect.any(AbortSignal),
    );
    expect(orderService.payment).toHaveBeenCalledWith(
      detail,
      buyer,
      expect.any(AbortSignal),
    );
  });
  it('renders chronological server events and delivery details', async () => {
    show(`/account/orders/${id}`);
    await screen.findByRole('heading', { name: 'Honey snapshot name' });
    const events = within(
      screen.getByRole('region', { name: 'Status timeline' }),
    ).getAllByRole('listitem');
    expect(events[0]).toHaveTextContent('Order created');
    expect(events[1]).toHaveTextContent('Payment received');
    expect(screen.getByText('Jinka market')).toBeInTheDocument();
    expect(screen.getByText('+251911000001')).toBeInTheDocument();
    expect(screen.getByText('Call on arrival')).toBeInTheDocument();
  });
  it('does not request current product names or invent a delivery tracking token', async () => {
    show(`/account/orders/${id}`);
    await screen.findByRole('heading', { name: 'Honey snapshot name' });
    expect(
      screen.getByText('A tracking link is not available for this order yet.'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /Track/ }),
    ).not.toBeInTheDocument();
  });
  it('fails closed on a foreign buyer response and never looks up its payment', async () => {
    vi.mocked(orderService.detail).mockResolvedValue({
      ...detail,
      buyerId: 'another-buyer',
      deliveryAddress: 'PRIVATE OTHER ADDRESS',
      items: [{ productName: 'PRIVATE OTHER ITEM' }],
    });
    show(`/account/orders/${id}`);
    expect(
      await screen.findByText(
        'This order is unavailable or does not belong to this account.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText('PRIVATE OTHER ADDRESS')).not.toBeInTheDocument();
    expect(screen.queryByText('PRIVATE OTHER ITEM')).not.toBeInTheDocument();
    expect(orderService.payment).not.toHaveBeenCalled();
  });
  it.each([403, 404])(
    'does not render an inaccessible order (%s) or call payment',
    async (status) => {
      vi.mocked(orderService.detail).mockRejectedValue(
        new NormalizedApiError({ status, message: 'denied' }),
      );
      show(`/account/orders/${id}`);
      expect(
        await screen.findByText(
          'This order is unavailable or does not belong to this account.',
        ),
      ).toBeInTheDocument();
      expect(screen.queryByText('Jinka market')).not.toBeInTheDocument();
      expect(orderService.payment).not.toHaveBeenCalled();
    },
  );
  it('does not fetch malformed route IDs', () => {
    show('/account/orders/not-a-uuid');
    expect(
      screen.getByText(
        'This order is unavailable or does not belong to this account.',
      ),
    ).toBeInTheDocument();
    expect(orderService.detail).not.toHaveBeenCalled();
    expect(orderService.payment).not.toHaveBeenCalled();
  });
  it('recovers from a list error with refresh', async () => {
    vi.mocked(orderService.list)
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce([summary]);
    show();
    await screen.findByText('Orders could not be loaded. Please try again.');
    fireEvent.click(screen.getByRole('button', { name: 'Refresh orders' }));
    expect(await screen.findByText('Order ORD-001')).toBeInTheDocument();
  });
  it('recovers from a detail error with refresh', async () => {
    vi.mocked(orderService.detail)
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(detail);
    show(`/account/orders/${id}`);
    await screen.findByText(
      'This order could not be loaded. Please try again.',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Refresh order' }));
    expect(
      await screen.findByRole('heading', { name: 'Honey snapshot name' }),
    ).toBeInTheDocument();
  });
  it('handles absent payment without calling the order unpaid', async () => {
    vi.mocked(orderService.payment).mockRejectedValue(
      new NormalizedApiError({ status: 404, message: 'none' }),
    );
    show(`/account/orders/${id}`);
    expect(
      await screen.findByText('No payment record was found for this order.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Unpaid')).not.toBeInTheDocument();
  });
  it('keeps the owned order visible when its payment lookup fails and can retry', async () => {
    vi.mocked(orderService.payment)
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(payment);
    show(`/account/orders/${id}`);
    await screen.findByText('Payment status could not be checked.');
    expect(
      screen.getByRole('heading', { name: 'Honey snapshot name' }),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: 'Refresh payment status' }),
    );
    expect(await screen.findByText('Held in escrow')).toBeInTheDocument();
  });
  it('ignores forged payment success in the URL', async () => {
    vi.mocked(orderService.payment).mockResolvedValue({
      ...payment,
      status: 'FAILED',
    });
    show(`/account/orders/${id}?payment=SUCCESS&status=PAID`);
    expect(await screen.findByText('Failed')).toBeInTheDocument();
    expect(screen.queryByText('Held in escrow')).not.toBeInTheDocument();
    expect(screen.getAllByText('Placed').length).toBeGreaterThan(0);
  });
  it('shows snapshot/history empty states', async () => {
    vi.mocked(orderService.detail).mockResolvedValue({
      ...detail,
      items: [],
      statusHistories: [],
    });
    show(`/account/orders/${id}`);
    expect(
      await screen.findByText('No item snapshots are available.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('No status updates are available.'),
    ).toBeInTheDocument();
  });
  it('keeps cached detail offline and disables all refresh actions', async () => {
    show(`/account/orders/${id}`);
    await screen.findByText('Held in escrow');
    act(() => {
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
      window.dispatchEvent(new Event('offline'));
    });
    expect(
      screen.getByText(/These are the last loaded details/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Honey snapshot name' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Refresh order' }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Refresh payment status' }),
    ).toBeDisabled();
    act(() => {
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
      window.dispatchEvent(new Event('online'));
    });
    await waitFor(() => expect(orderService.detail).toHaveBeenCalledTimes(2));
  });
  it.each(['/account/orders', `/account/orders/${id}`])(
    'renders a cold offline page without fetching (%s)',
    (path) => {
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
      show(path);
      expect(
        screen.getByText('You are offline. Reconnect to load your orders.'),
      ).toBeInTheDocument();
      expect(orderService.list).not.toHaveBeenCalled();
      expect(orderService.detail).not.toHaveBeenCalled();
      expect(orderService.payment).not.toHaveBeenCalled();
    },
  );
  it('clears private cached queries on logout and ignores an old in-flight response', async () => {
    let resolve!: (value: OrderDetailResponse) => void;
    vi.mocked(orderService.detail).mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    show(`/account/orders/${id}`);
    await waitFor(() => expect(orderService.detail).toHaveBeenCalledOnce());
    act(() => useAuthStore.getState().logout());
    await act(async () => resolve(detail));
    expect(screen.getByText('Sign in screen')).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Honey snapshot name' }),
    ).not.toBeInTheDocument();
    expect(orderService.payment).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(client.getQueryCache().getAll()).toHaveLength(0),
    );
  });
  it('does not display cached private data after changing accounts', async () => {
    show(`/account/orders/${id}`);
    await screen.findByRole('heading', { name: 'Honey snapshot name' });
    vi.mocked(orderService.detail).mockRejectedValue(
      new NormalizedApiError({ status: 404, message: 'not yours' }),
    );
    act(() =>
      useAuthStore.setState({
        token: 'token-b',
        user: { id: 'other-buyer', roles: ['BUYER_VISITOR'] },
      }),
    );
    expect(
      await screen.findByText(
        'This order is unavailable or does not belong to this account.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Honey snapshot name' }),
    ).not.toBeInTheDocument();
  });
  it('refreshes safely when the token changes for the same buyer', async () => {
    show(`/account/orders/${id}`);
    await screen.findByText('Held in escrow');
    vi.mocked(orderService.detail).mockResolvedValue({
      ...detail,
      orderNo: 'ORD-REFRESHED',
    });
    act(() => useAuthStore.setState({ token: 'replacement-token' }));
    expect(
      await screen.findByRole('heading', { name: 'Order ORD-REFRESHED' }),
    ).toBeInTheDocument();
    expect(orderService.detail).toHaveBeenCalledTimes(2);
  });
  it('has accessible labels and selected-language fallback', async () => {
    const { container } = show(`/account/orders/${id}`);
    await screen.findByText('Held in escrow');
    const report = await axe.run(container, {
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(report.violations).toEqual([]);
    await act(async () => {
      await i18n.changeLanguage('om');
    });
    expect(
      screen.getByRole('link', { name: 'ወደ ትዕዛዞቼ ተመለስ' }),
    ).toBeInTheDocument();
  });
});
