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
import RefundDetails from '../features/payments/RefundDetails';
import {
  refundService,
  type RefundSummary,
} from '../features/payments/refundService';
import { paymentHistoryService } from '../features/payments/paymentHistoryService';
import { useAuthStore } from '../features/auth';
import { NormalizedApiError } from '../services/apiError';
import OrderDetailPage from '../pages/account/OrderDetailPage';
import BookingConfirmationPage from '../pages/public/BookingConfirmationPage';
import { orderService } from '../features/orders/orderService';
import { bookingService } from '../features/bookings/bookingService';
import i18n from '../i18n';
const paymentId = '11111111-1111-4111-8111-000000000001';
const target = '22222222-2222-4222-8222-000000000001';
const refundId = '33333333-3333-4333-8333-000000000001';
const buyer = '44444444-4444-4444-8444-000000000001';
const partial: RefundSummary = {
  paymentId,
  paymentAmount: 500,
  currency: 'ETB',
  completedRefundAmount: 100,
  notRefundedAmount: 400,
  coverage: 'PARTIAL',
  refunds: {
    content: [
      {
        refundId,
        refundNo: 'REF-001',
        paymentId,
        amount: 100,
        currency: 'ETB',
        status: 'COMPLETED',
        reason: 'Returned item',
        createdAt: '2026-10-18T10:00:00Z',
      },
    ],
    pageNumber: 0,
    pageSize: 20,
    totalElements: 1,
    totalPages: 1,
    isFirst: true,
    isLast: true,
  },
};
let client: QueryClient;
function show(
  props: { paymentId?: string; bookingId?: string; enabled?: boolean } = {
    paymentId,
  },
) {
  return render(
    <QueryClientProvider client={client}>
      <RefundDetails {...props} />
    </QueryClientProvider>,
  );
}
beforeEach(async () => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  useAuthStore.setState({
    token: 'buyer-token',
    user: { id: buyer, roles: ['BUYER_VISITOR'] },
    isAuthenticated: true,
    isLoading: false,
  });
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
  vi.spyOn(refundService, 'get').mockResolvedValue(partial);
  vi.spyOn(paymentHistoryService, 'booking').mockResolvedValue({
    paymentId,
    bookingId: target,
    amount: 500,
    currency: 'ETB',
    status: 'RELEASED',
  });
  await i18n.changeLanguage('en');
});
afterEach(() => {
  cleanup();
  client.clear();
  vi.restoreAllMocks();
  useAuthStore.setState({ token: null, user: null, isAuthenticated: false });
});
describe('F-606 refund details', () => {
  it('renders a partial refund with server totals, reference, reason, and status', async () => {
    show();
    await screen.findByText('Partially refunded');
    expect(
      screen.getByText('Completed refunds').nextElementSibling,
    ).toHaveTextContent('100.00 ETB');
    expect(screen.getByText('400.00 ETB')).toBeInTheDocument();
    expect(screen.getByText('REF-001')).toBeInTheDocument();
    expect(screen.getByText('Returned item')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });
  it('renders a full refund without treating the amount not refunded as a debt', async () => {
    vi.mocked(refundService.get).mockResolvedValue({
      ...partial,
      coverage: 'FULL',
      completedRefundAmount: 500,
      notRefundedAmount: 0,
    });
    show();
    await screen.findByText('Fully refunded');
    expect(screen.getByText('0.00 ETB')).toBeInTheDocument();
    expect(screen.getByText('Amount not refunded')).toBeInTheDocument();
    expect(screen.queryByText(/Amount due/)).not.toBeInTheDocument();
  });
  it('does not sum the visible page or infer coverage from refund attempts', async () => {
    vi.mocked(refundService.get).mockResolvedValue({
      ...partial,
      completedRefundAmount: 123.45,
      notRefundedAmount: 376.55,
      refunds: {
        ...partial.refunds,
        content: [
          { ...partial.refunds!.content![0], amount: 900, status: 'PENDING' },
          {
            ...partial.refunds!.content![0],
            refundId: target,
            amount: 700,
            status: 'FAILED',
          },
        ],
      },
    });
    show();
    await screen.findByText('123.45 ETB');
    expect(screen.getByText('376.55 ETB')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(screen.queryByText('1600.00 ETB')).not.toBeInTheDocument();
  });
  it('renders NONE only from a successful server response', async () => {
    vi.mocked(refundService.get).mockResolvedValue({
      ...partial,
      coverage: 'NONE',
      completedRefundAmount: 0,
      notRefundedAmount: 500,
      refunds: {
        ...partial.refunds,
        content: [],
        totalElements: 0,
        totalPages: 0,
      },
    });
    show();
    await screen.findByText('No completed refunds');
    expect(
      screen.getByText('No refund records on this page.'),
    ).toBeInTheDocument();
  });
  it('looks up the owned booking payment before requesting refunds', async () => {
    show({ bookingId: target });
    await screen.findByText('Partially refunded');
    expect(paymentHistoryService.booking).toHaveBeenCalledWith(
      target,
      expect.any(AbortSignal),
    );
    expect(refundService.get).toHaveBeenCalledWith(
      paymentId,
      0,
      expect.any(AbortSignal),
    );
  });
  it('does not request refund details when the booking payment is unavailable', async () => {
    vi.mocked(paymentHistoryService.booking).mockRejectedValue(
      new NormalizedApiError({ status: 404, message: 'Unavailable' }),
    );
    show({ bookingId: target });
    await screen.findByText(/This does not confirm that no refunds exist/);
    expect(refundService.get).not.toHaveBeenCalled();
    expect(screen.queryByText('No completed refunds')).not.toBeInTheDocument();
  });
  it.each([401, 403, 404])(
    'keeps unavailable refund reads with status %s unknown instead of zero',
    async (status) => {
      vi.mocked(refundService.get).mockRejectedValue(
        new NormalizedApiError({ status, message: 'Unavailable' }),
      );
      show();
      await screen.findByText(/Refund information is unavailable/);
      expect(
        screen.queryByText('No completed refunds'),
      ).not.toBeInTheDocument();
      expect(screen.queryByText('0.00 ETB')).not.toBeInTheDocument();
    },
  );
  it('refreshes after a failed read', async () => {
    vi.mocked(refundService.get)
      .mockRejectedValueOnce(new Error('Network'))
      .mockResolvedValue(partial);
    show();
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: 'Refresh refunds' }));
    await screen.findByText('Partially refunded');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
  it('supports paginated records while keeping the server totals', async () => {
    vi.mocked(refundService.get)
      .mockResolvedValueOnce({
        ...partial,
        refunds: {
          ...partial.refunds,
          totalPages: 2,
          totalElements: 21,
          isLast: false,
        },
      })
      .mockResolvedValue({
        ...partial,
        refunds: {
          ...partial.refunds,
          pageNumber: 1,
          isFirst: false,
          content: [{ ...partial.refunds!.content![0], refundNo: 'REF-NEXT' }],
        },
      });
    show();
    await screen.findByText('REF-001');
    fireEvent.click(screen.getByRole('button', { name: 'Next refunds' }));
    await screen.findByText('REF-NEXT');
    expect(refundService.get).toHaveBeenLastCalledWith(
      paymentId,
      1,
      expect.any(AbortSignal),
    );
    expect(screen.getByText('400.00 ETB')).toBeInTheDocument();
  });
  it('retains last-confirmed details offline and refreshes after reconnect', async () => {
    show();
    await screen.findByText('Partially refunded');
    act(() => {
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
      window.dispatchEvent(new Event('offline'));
    });
    expect(
      screen.getByText(/last server-confirmed refund records/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Refresh refunds' }),
    ).toBeDisabled();
    act(() => {
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
      window.dispatchEvent(new Event('online'));
    });
    await waitFor(() => expect(refundService.get).toHaveBeenCalledTimes(2));
  });
  it('does not query on a cold offline visit or when the parent is unverified', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    show({ paymentId, enabled: false });
    expect(refundService.get).not.toHaveBeenCalled();
  });
  it('aborts and purges late refund details from a previous buyer session', async () => {
    let resolve!: (value: RefundSummary) => void;
    vi.mocked(refundService.get)
      .mockReturnValueOnce(
        new Promise((done) => {
          resolve = done;
        }),
      )
      .mockRejectedValue(
        new NormalizedApiError({ status: 404, message: 'Unavailable' }),
      );
    show();
    await waitFor(() => expect(refundService.get).toHaveBeenCalledOnce());
    const signal = vi.mocked(refundService.get).mock.calls[0][2];
    act(() =>
      useAuthStore.setState({
        user: { id: 'other-buyer' },
        token: 'other-token',
      }),
    );
    await act(async () => resolve(partial));
    await screen.findByText(/Refund information is unavailable/);
    expect(signal?.aborted).toBe(true);
    expect(screen.queryByText('REF-001')).not.toBeInTheDocument();
    expect(
      client
        .getQueryCache()
        .getAll()
        .filter((query) => query.queryKey[1] === buyer),
    ).toHaveLength(0);
  });
  it('renders refunds on an owned order detail after its payment is verified', async () => {
    vi.spyOn(orderService, 'detail').mockResolvedValue({
      orderId: target,
      buyerId: buyer,
      status: 'PAID',
      currency: 'ETB',
      totalAmount: 500,
      items: [],
      statusHistories: [],
    });
    vi.spyOn(orderService, 'payment').mockResolvedValue({
      paymentId,
      orderId: target,
      status: 'RELEASED',
      amount: 500,
      currency: 'ETB',
    });
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[`/account/orders/${target}`]}>
          <Routes>
            <Route path="/account/orders/:id" element={<OrderDetailPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await screen.findByText('Partially refunded');
    expect(refundService.get).toHaveBeenCalledWith(
      paymentId,
      0,
      expect.any(AbortSignal),
    );
  });
  it('renders refunds on booking confirmation without mutating booking payment state', async () => {
    vi.spyOn(bookingService, 'getBookingById').mockResolvedValue({
      id: target,
      bookingCode: 'BK-REFUND',
      status: 'PAID',
      currency: 'ETB',
      totalAmount: 500,
    });
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[`/booking/confirmation/${target}`]}>
          <Routes>
            <Route
              path="/booking/confirmation/:id"
              element={<BookingConfirmationPage />}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await screen.findByText('Partially refunded');
    expect(screen.getByTestId('booking-status-chip')).toHaveTextContent('Paid');
  });
});
