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
import { CheckoutResult } from '../features/checkout';
import { orderConfirmationService } from '../features/checkout/orderConfirmationService';
import { orderService } from '../features/orders/orderService';
import { paymentService } from '../features/payments/paymentService';
import { useAuthStore } from '../features/auth';
import type {
  CheckoutResponse,
  OrderDetailResponse,
  PaymentAttemptResponse,
} from '../types/api';
import i18n from '../i18n';

const group = '11111111-1111-4111-8111-000000000001';
const first = '22222222-2222-4222-8222-000000000001';
const second = '22222222-2222-4222-8222-000000000002';
const buyer = '44444444-4444-4444-8444-000000000001';
const makeOrder = (id: string, index: number): OrderDetailResponse => ({
  orderId: id,
  orderNo: `ORD-${index}`,
  checkoutGroupId: group,
  buyerId: buyer,
  enterpriseId: `33333333-3333-4333-8333-00000000000${index}`,
  enterpriseName: `Seller ${index}`,
  status: 'PLACED',
  totalAmount: index * 100,
  currency: 'ETB',
  statusHistories: [],
});
let records: Map<string, OrderDetailResponse>;
let result: CheckoutResponse;
let client: QueryClient;
const button = (index: number) =>
  screen.getByRole('button', { name: `Pay order ORD-${index}` });
const card = (index: number) =>
  within(screen.getByRole('article', { name: `Seller ${index}` }));
async function show() {
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <CheckoutResult result={result} onNewCheckout={vi.fn()} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  await waitFor(() => expect(button(2)).toBeEnabled());
}
function pay(index: number) {
  fireEvent.click(button(index));
  fireEvent.click(screen.getByTestId('confirm-telebirr-pay-btn'));
}
beforeEach(async () => {
  sessionStorage.clear();
  useAuthStore.setState({
    isAuthenticated: true,
    isLoading: false,
    token: 'buyer-token',
    user: { id: buyer, roles: ['BUYER_VISITOR'] },
  });
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
  records = new Map([
    [first, makeOrder(first, 1)],
    [second, makeOrder(second, 2)],
  ]);
  result = {
    checkoutGroupId: group,
    groupNo: 'CHK-001',
    totalAmount: 300,
    currency: 'ETB',
    orders: Array.from(records.values()).map((order) => ({ ...order })),
  };
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  vi.spyOn(orderConfirmationService, 'get').mockImplementation(async (id) => ({
    ...records.get(id)!,
  }));
  vi.spyOn(orderService, 'detail').mockImplementation(async (id, buyerId) => {
    const order = records.get(id)!;
    if (order.buyerId !== buyerId) throw new Error('Order unavailable');
    return { ...order };
  });
  vi.spyOn(paymentService, 'createAttempt').mockImplementation(
    async (payload): Promise<PaymentAttemptResponse> => ({
      attemptId: `attempt-${payload.orderId}`,
      paymentId: `payment-${payload.orderId}`,
      idempotencyKey: payload.idempotencyKey,
      status: 'SUCCESS',
    }),
  );
  vi.spyOn(orderService, 'payment').mockImplementation(async (order) => {
    records.set(order.orderId!, {
      ...records.get(order.orderId!)!,
      status: 'PAID',
    });
    return { orderId: order.orderId, status: 'RELEASED' };
  });
  await i18n.changeLanguage('en');
});
afterEach(() => {
  cleanup();
  client.clear();
  vi.restoreAllMocks();
  sessionStorage.clear();
  useAuthStore.setState({ user: null, token: null, isAuthenticated: false });
});

describe('F-602 per-order checkout payments', () => {
  it('pays just the selected seller and refetches only that confirmation', async () => {
    await show();
    pay(1);
    await screen.findByTestId('payment-success-state');
    await screen.findByText('Payment progress: 1 of 2 orders confirmed paid.');
    expect(card(1).getByText('Paid')).toBeInTheDocument();
    expect(card(2).getByText('Placed')).toBeInTheDocument();
    expect(button(1)).toBeDisabled();
    expect(button(2)).toBeEnabled();
    expect(paymentService.createAttempt).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ orderId: first, bookingId: undefined }),
      expect.any(AbortSignal),
    );
    const ids = vi
      .mocked(orderConfirmationService.get)
      .mock.calls.map(([id]) => id);
    expect(ids.filter((id) => id === first)).toHaveLength(2);
    expect(ids.filter((id) => id === second)).toHaveLength(1);
    expect(
      screen.getByText(
        'This checkout is partly paid. Check the remaining orders separately.',
      ),
    ).toBeInTheDocument();
  });
  it('pays the second order separately with its own amount and idempotency key', async () => {
    await show();
    pay(1);
    await screen.findByTestId('payment-success-state');
    await screen.findByText('Payment progress: 1 of 2 orders confirmed paid.');
    fireEvent.click(screen.getByTestId('payment-success-close-btn'));
    fireEvent.click(button(2));
    expect(screen.getByTestId('payment-modal-amount')).toHaveTextContent(
      '200.00 ETB',
    );
    expect(screen.getByText('Ref: ORD-2')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('confirm-telebirr-pay-btn'));
    await screen.findByText('Payment progress: 2 of 2 orders confirmed paid.');
    expect(
      screen.getByText('All orders have server-confirmed payment.'),
    ).toBeInTheDocument();
    const calls = vi.mocked(paymentService.createAttempt).mock.calls;
    expect(calls.map(([payload]) => payload.orderId)).toEqual([first, second]);
    expect(calls[0][0].idempotencyKey).not.toBe(calls[1][0].idempotencyKey);
    expect(button(1)).toBeDisabled();
    expect(button(2)).toBeDisabled();
  });
  it('does not mark either order paid when the selected attempt fails', async () => {
    vi.mocked(paymentService.createAttempt).mockResolvedValue({
      attemptId: 'failed',
      paymentId: 'failed',
      status: 'FAILED',
    });
    await show();
    pay(1);
    await screen.findByTestId('payment-failed-state');
    expect(
      screen.getByText('Payment progress: 0 of 2 orders confirmed paid.'),
    ).toBeInTheDocument();
    expect(card(1).getByText('Placed')).toBeInTheDocument();
    expect(card(2).getByText('Placed')).toBeInTheDocument();
    expect(orderService.payment).not.toHaveBeenCalled();
  });
  it('leaves both orders unpaid while settlement is uncertain', async () => {
    vi.mocked(orderService.payment).mockResolvedValue({
      orderId: first,
      status: 'PENDING',
    });
    await show();
    pay(1);
    await waitFor(() => expect(orderService.payment).toHaveBeenCalled());
    expect(screen.getByTestId('payment-pending-state')).toBeInTheDocument();
    expect(
      screen.getByText('Payment progress: 0 of 2 orders confirmed paid.'),
    ).toBeInTheDocument();
    expect(card(1).getByText('Placed')).toBeInTheDocument();
    expect(card(2).getByText('Placed')).toBeInTheDocument();
  });
  it('never optimistically updates order status from the settlement callback', async () => {
    vi.mocked(orderService.payment).mockResolvedValue({
      orderId: first,
      status: 'RELEASED',
    });
    await show();
    pay(1);
    await screen.findByTestId('payment-success-state');
    await waitFor(() =>
      expect(orderConfirmationService.get).toHaveBeenCalledTimes(3),
    );
    expect(card(1).getByText('Placed')).toBeInTheDocument();
    expect(card(2).getByText('Placed')).toBeInTheDocument();
    expect(
      screen.getByText('Payment progress: 0 of 2 orders confirmed paid.'),
    ).toBeInTheDocument();
  });
  it('keeps a failed status lookup separate from the other seller payment action', async () => {
    vi.mocked(orderConfirmationService.get).mockImplementation(async (id) => {
      if (id === first) throw new Error('Unavailable');
      return { ...records.get(id)! };
    });
    await show();
    expect(button(1)).toBeDisabled();
    expect(button(2)).toBeEnabled();
    expect(
      screen.getByText(/Some statuses are unverified/),
    ).toBeInTheDocument();
    pay(2);
    await screen.findByTestId('payment-success-state');
    await screen.findByText('Payment progress: 1 of 2 orders confirmed paid.');
    expect(
      screen.queryByText('All orders have server-confirmed payment.'),
    ).not.toBeInTheDocument();
  });
  it('uses the fresh server amount and currency for the selected order', async () => {
    records.set(first, {
      ...records.get(first)!,
      totalAmount: 125,
      currency: 'USD',
    });
    await show();
    fireEvent.click(button(1));
    expect(screen.getByTestId('payment-modal-amount')).toHaveTextContent(
      '125.00 USD',
    );
    expect(
      screen.getByText('Server-confirmed total: 300.00 ETB'),
    ).toBeInTheDocument();
  });
  it.each([undefined, -1, 0, NaN, Infinity])(
    'disables payment for an unusable server amount %s',
    async (totalAmount) => {
      records.set(first, { ...records.get(first)!, totalAmount });
      await show();
      expect(button(1)).toBeDisabled();
      expect(button(2)).toBeEnabled();
    },
  );
  it('disables payment when the server currency is missing', async () => {
    records.set(first, { ...records.get(first)!, currency: undefined });
    await show();
    expect(button(1)).toBeDisabled();
  });
  it('keeps cancelled orders unpayable without claiming the checkout is fully paid', async () => {
    records.set(first, { ...records.get(first)!, status: 'CANCELLED' });
    records.set(second, { ...records.get(second)!, status: 'PAID' });
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <CheckoutResult result={result} onNewCheckout={vi.fn()} />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await screen.findByText('Payment progress: 1 of 2 orders confirmed paid.');
    expect(button(1)).toBeDisabled();
    expect(button(2)).toBeDisabled();
    expect(
      screen.queryByText('All orders have server-confirmed payment.'),
    ).not.toBeInTheDocument();
  });
  it('does not trust paid checkout snapshots over fresh server status', async () => {
    result.orders = result.orders!.map((order) => ({
      ...order,
      status: 'PAID',
    }));
    await show();
    expect(
      screen.getByText('Payment progress: 0 of 2 orders confirmed paid.'),
    ).toBeInTheDocument();
    expect(button(1)).toBeEnabled();
    expect(button(2)).toBeEnabled();
  });
  it('closes and aborts payment when connectivity is lost without reopening on reconnect', async () => {
    vi.mocked(paymentService.createAttempt).mockReturnValue(
      new Promise(() => {}),
    );
    await show();
    pay(1);
    await waitFor(() =>
      expect(paymentService.createAttempt).toHaveBeenCalled(),
    );
    const signal = vi.mocked(paymentService.createAttempt).mock.calls[0][1];
    act(() => {
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
      window.dispatchEvent(new Event('offline'));
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(signal?.aborted).toBe(true);
    expect(button(1)).toBeDisabled();
    act(() => {
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
      window.dispatchEvent(new Event('online'));
    });
    await waitFor(() => expect(button(1)).toBeEnabled());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(paymentService.createAttempt).toHaveBeenCalledTimes(1);
  });
  it('discards a pending payment after a buyer-session change', async () => {
    let resolve!: (value: PaymentAttemptResponse) => void;
    vi.mocked(paymentService.createAttempt).mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    await show();
    pay(1);
    await waitFor(() =>
      expect(paymentService.createAttempt).toHaveBeenCalled(),
    );
    act(() =>
      useAuthStore.setState({
        token: 'other-token',
        user: { id: 'other-buyer' },
      }),
    );
    await act(async () =>
      resolve({ attemptId: 'late', paymentId: 'late', status: 'SUCCESS' }),
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(orderService.payment).not.toHaveBeenCalled();
    expect(
      screen.queryByText('All orders have server-confirmed payment.'),
    ).not.toBeInTheDocument();
  });
  it('shows uncertainty when confirmation refresh fails after settlement', async () => {
    await show();
    vi.mocked(orderConfirmationService.get).mockImplementation(async (id) => {
      if (id === first) throw new Error('Status unavailable');
      return { ...records.get(id)! };
    });
    pay(1);
    await screen.findByText(/current status could not be checked/);
    expect(card(2).getByText('Placed')).toBeInTheDocument();
    expect(
      screen.getByText(/Some statuses are unverified/),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('All orders have server-confirmed payment.'),
    ).not.toBeInTheDocument();
  });
});
