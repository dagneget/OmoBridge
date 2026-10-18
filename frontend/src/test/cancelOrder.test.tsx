import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CancelOrder from '../features/orders/CancelOrder';
import OrderDetailPage from '../pages/account/OrderDetailPage';
import { orderService } from '../features/orders/orderService';
import { refundService } from '../features/payments/refundService';
import { useAuthStore } from '../features/auth';
import type { OrderDetailResponse } from '../types/api';
import i18n from '../i18n';
const id = '11111111-1111-4111-8111-000000000001';
const buyer = '22222222-2222-4222-8222-000000000001';
const paymentId = '33333333-3333-4333-8333-000000000001';
const order: OrderDetailResponse = {
  orderId: id,
  buyerId: buyer,
  orderNo: 'ORD-CANCEL',
  status: 'PLACED',
  totalAmount: 470,
  currency: 'ETB',
  items: [],
  statusHistories: [],
};
const cancelled = { ...order, status: 'CANCELLED' as const };
let client: QueryClient;
function show(
  patch: Partial<OrderDetailResponse> = {},
  enabled = true,
  onRefresh = vi.fn(async () => true),
) {
  const onCancelled = vi.fn();
  const view = render(
    <CancelOrder
      order={{ ...order, ...patch }}
      enabled={enabled}
      onCancelled={onCancelled}
      onRefresh={onRefresh}
    />,
  );
  return { ...view, onCancelled, onRefresh };
}
function confirm() {
  fireEvent.click(screen.getByRole('button', { name: 'Cancel order' }));
  fireEvent.click(screen.getByRole('button', { name: 'Confirm cancellation' }));
}
beforeEach(async () => {
  useAuthStore.setState({
    token: 'buyer-token',
    user: { id: buyer, roles: ['BUYER_VISITOR'] },
    isAuthenticated: true,
    isLoading: false,
  });
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
  vi.spyOn(orderService, 'cancel').mockResolvedValue(cancelled);
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await i18n.changeLanguage('en');
});
afterEach(() => {
  cleanup();
  client.clear();
  vi.restoreAllMocks();
  useAuthStore.setState({ token: null, user: null, isAuthenticated: false });
});
describe('F-509 cancellation', () => {
  it('requires explicit confirmation and lets the buyer keep the order', () => {
    show();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel order' }));
    expect(screen.getByText('Cancel order ORD-CANCEL?')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Confirm cancellation' }),
    ).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: 'Keep order' }));
    expect(orderService.cancel).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Cancel order' })).toHaveFocus();
  });
  it.each(['PLACED', 'PAID', 'PACKED', 'IN_TRANSIT'] as const)(
    'allows the server-supported %s state and shows success only after its response',
    async (status) => {
      const { onCancelled } = show({ status });
      confirm();
      await screen.findByText(
        'The server confirmed this order is cancelled. Check the recorded refund status separately.',
      );
      expect(onCancelled).toHaveBeenCalledExactlyOnceWith(cancelled);
      expect(orderService.cancel).toHaveBeenCalledWith(
        id,
        buyer,
        expect.any(AbortSignal),
      );
    },
  );
  it.each(['DELIVERED', 'CANCELLED'] as const)(
    'does not offer cancellation for %s',
    (status) => {
      show({ status });
      expect(
        screen.getByText(
          'This order cannot be cancelled in its current state.',
        ),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Cancel order' }),
      ).not.toBeInTheDocument();
      expect(orderService.cancel).not.toHaveBeenCalled();
    },
  );
  it('disables cancellation until the parent order is verified online', () => {
    show({}, false);
    expect(screen.getByRole('button', { name: 'Cancel order' })).toBeDisabled();
    expect(
      screen.getByText(
        'Refresh the order status online before requesting cancellation.',
      ),
    ).toBeInTheDocument();
  });
  it('blocks rapid duplicate confirmation clicks', async () => {
    vi.mocked(orderService.cancel).mockReturnValue(new Promise(() => {}));
    show();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel order' }));
    const button = screen.getByRole('button', { name: 'Confirm cancellation' });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(orderService.cancel).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Requesting cancellation…')).toBeInTheDocument();
  });
  it('requires an explicit successful status refresh after an uncertain response', async () => {
    vi.mocked(orderService.cancel)
      .mockRejectedValueOnce(new Error('Network timeout'))
      .mockResolvedValue(cancelled);
    const refresh = vi.fn(async () => true);
    show({}, true, refresh);
    confirm();
    await screen.findByRole('alert');
    expect(
      screen.queryByRole('button', { name: 'Cancel order' }),
    ).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: 'Refresh before retrying' }),
    );
    await screen.findByRole('button', { name: 'Cancel order' });
    expect(refresh).toHaveBeenCalledOnce();
    expect(orderService.cancel).toHaveBeenCalledTimes(1);
    confirm();
    await screen.findByText(
      'The server confirmed this order is cancelled. Check the recorded refund status separately.',
    );
    expect(orderService.cancel).toHaveBeenCalledTimes(2);
  });
  it('keeps cancellation locked when re-verification fails', async () => {
    vi.mocked(orderService.cancel).mockRejectedValue(new Error('Network'));
    show(
      {},
      true,
      vi.fn(async () => false),
    );
    confirm();
    await screen.findByRole('alert');
    fireEvent.click(
      screen.getByRole('button', { name: 'Refresh before retrying' }),
    );
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Refresh before retrying' }),
      ).toBeEnabled(),
    );
    expect(
      screen.queryByRole('button', { name: 'Cancel order' }),
    ).not.toBeInTheDocument();
    expect(orderService.cancel).toHaveBeenCalledTimes(1);
  });
  it('discards a response after the account changes', async () => {
    let resolve!: (value: OrderDetailResponse) => void;
    vi.mocked(orderService.cancel).mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    const { onCancelled } = show();
    confirm();
    act(() =>
      useAuthStore.setState({
        token: 'other-token',
        user: { id: 'other-buyer' },
      }),
    );
    await act(async () => resolve(cancelled));
    expect(onCancelled).not.toHaveBeenCalled();
    expect(
      screen.queryByText(/server confirmed this order is cancelled/),
    ).not.toBeInTheDocument();
  });
  it('aborts the local request when the view is closed', () => {
    vi.mocked(orderService.cancel).mockReturnValue(new Promise(() => {}));
    const view = show();
    confirm();
    const signal = vi.mocked(orderService.cancel).mock.calls[0][2];
    view.unmount();
    expect(signal?.aborted).toBe(true);
  });
  it('does not offer cancellation for a different buyer', () => {
    show({ buyerId: 'foreign' });
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
  it('adopts only the returned order and keeps refund/payment status separate', async () => {
    vi.spyOn(orderService, 'detail').mockResolvedValue({
      ...order,
      status: 'PAID',
    });
    vi.spyOn(orderService, 'payment').mockResolvedValue({
      paymentId,
      orderId: id,
      status: 'RELEASED',
      amount: 470,
      currency: 'ETB',
    });
    vi.spyOn(refundService, 'get').mockResolvedValue({
      paymentId,
      paymentAmount: 470,
      currency: 'ETB',
      completedRefundAmount: 0,
      notRefundedAmount: 470,
      coverage: 'NONE',
      refunds: {
        content: [],
        pageNumber: 0,
        pageSize: 20,
        totalElements: 0,
        totalPages: 0,
        isFirst: true,
        isLast: true,
      },
    });
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[`/account/orders/${id}`]}>
          <Routes>
            <Route path="/account/orders/:id" element={<OrderDetailPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await screen.findByRole('button', { name: 'Cancel order' });
    confirm();
    await screen.findByText('Cancelled');
    await screen.findByText('No completed refunds');
    expect(screen.getByText('Released')).toBeInTheDocument();
    expect(screen.queryByText('Fully refunded')).not.toBeInTheDocument();
    const cached = client
      .getQueryCache()
      .getAll()
      .find((query) => query.queryKey.includes('detail'));
    expect(cached?.state.data).toMatchObject({
      orderId: id,
      status: 'CANCELLED',
    });
  });
  it('does not let a pre-cancellation refresh overwrite the confirmed server result', async () => {
    let finishCancel!: (value: OrderDetailResponse) => void;
    let finishRefresh!: (value: OrderDetailResponse) => void;
    vi.mocked(orderService.cancel).mockReturnValue(
      new Promise((done) => {
        finishCancel = done;
      }),
    );
    vi.spyOn(orderService, 'detail')
      .mockResolvedValueOnce(order)
      .mockReturnValue(
        new Promise((done) => {
          finishRefresh = done;
        }),
      );
    vi.spyOn(orderService, 'payment').mockRejectedValue(
      new Error('No payment'),
    );
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[`/account/orders/${id}`]}>
          <Routes>
            <Route path="/account/orders/:id" element={<OrderDetailPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await screen.findByRole('button', { name: 'Cancel order' });
    confirm();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh order' }));
    await waitFor(() => expect(orderService.detail).toHaveBeenCalledTimes(2));
    const signal = vi.mocked(orderService.detail).mock.calls[1][2];
    await act(async () => finishCancel(cancelled));
    await screen.findByText('Cancelled');
    expect(signal?.aborted).toBe(true);
    await act(async () => finishRefresh(order));
    expect(screen.getByText('Cancelled')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Cancel order' }),
    ).not.toBeInTheDocument();
  });
});
