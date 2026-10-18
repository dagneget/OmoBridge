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
import PaymentsPage from '../pages/account/PaymentsPage';
import PaymentRecordPage from '../pages/account/PaymentRecordPage';
import {
  paymentHistoryService,
  type PaymentPage,
} from '../features/payments/paymentHistoryService';
import { useAuthStore } from '../features/auth';
import { NormalizedApiError } from '../services/apiError';
import type { PaymentResponse } from '../types/api';
import i18n from '../i18n';
const id = '11111111-1111-4111-8111-000000000001';
const order = '22222222-2222-4222-8222-000000000001';
const payment: PaymentResponse = {
  paymentId: id,
  paymentNo: 'PAY-OWN-001',
  orderId: order,
  orderNo: 'ORD-OWN-001',
  status: 'RELEASED',
  amount: 470,
  currency: 'ETB',
  createdAt: '2026-10-18T10:15:00Z',
};
const page: PaymentPage = {
  content: [payment],
  pageNumber: 0,
  pageSize: 20,
  totalElements: 1,
  totalPages: 1,
  isFirst: true,
  isLast: true,
};
let client: QueryClient;
function show(path = '/account/payments') {
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/account/payments" element={<PaymentsPage />} />
          <Route path="/account/payments/:id" element={<PaymentRecordPage />} />
          <Route path="/login" element={<h1>Sign in</h1>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
beforeEach(async () => {
  useAuthStore.setState({
    token: 'buyer-token',
    user: { id: 'buyer-1', roles: ['BUYER_VISITOR'] },
    isAuthenticated: true,
    isLoading: false,
  });
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
  vi.spyOn(paymentHistoryService, 'list').mockResolvedValue(page);
  vi.spyOn(paymentHistoryService, 'get').mockResolvedValue(payment);
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await i18n.changeLanguage('en');
});
afterEach(() => {
  cleanup();
  client.clear();
  vi.restoreAllMocks();
  useAuthStore.setState({ user: null, token: null, isAuthenticated: false });
});
describe('F-603 buyer payment history and receipts', () => {
  it('opens a server-valued receipt from the payment list', async () => {
    show();
    await screen.findByText('PAY-OWN-001');
    expect(screen.getByText('470.00 ETB')).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('link', { name: 'View payment PAY-OWN-001' }),
    );
    await screen.findByRole('heading', { name: 'Payment receipt' });
    expect(paymentHistoryService.get).toHaveBeenCalledWith(
      id,
      expect.any(AbortSignal),
    );
    expect(
      screen.getByRole('link', { name: 'Order ORD-OWN-001' }),
    ).toHaveAttribute('href', `/account/orders/${order}`);
    expect(screen.getByRole('button', { name: 'Print receipt' })).toBeEnabled();
  });
  it('prints only after server-confirmed settlement', async () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    show(`/account/payments/${id}`);
    await screen.findByRole('heading', { name: 'Payment receipt' });
    fireEvent.click(screen.getByRole('button', { name: 'Print receipt' }));
    expect(print).toHaveBeenCalledOnce();
  });
  it.each(['PENDING', 'FAILED', 'REFUNDED'] as const)(
    'does not call %s a settled receipt, even with a forged success URL',
    async (status) => {
      vi.mocked(paymentHistoryService.get).mockResolvedValue({
        ...payment,
        status,
      });
      show(`/account/payments/${id}?status=SUCCESS&payment=paid`);
      await screen.findByText(
        'This record is not a settled payment receipt. Its current status is shown below.',
      );
      expect(
        screen.queryByRole('heading', { name: 'Payment receipt' }),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Print receipt' }),
      ).toBeDisabled();
    },
  );
  it('links a booking payment to its own booking', async () => {
    vi.mocked(paymentHistoryService.get).mockResolvedValue({
      ...payment,
      orderId: undefined,
      orderNo: undefined,
      bookingId: order,
      bookingCode: 'BK-OWN',
    });
    show(`/account/payments/${id}`);
    expect(
      await screen.findByRole('link', { name: 'Booking BK-OWN' }),
    ).toHaveAttribute('href', `/booking/confirmation/${order}`);
    expect(
      screen.queryByRole('link', { name: /Order ORD/ }),
    ).not.toBeInTheDocument();
  });
  it('shows an empty history', async () => {
    vi.mocked(paymentHistoryService.list).mockResolvedValue({
      ...page,
      content: [],
      totalElements: 0,
      totalPages: 0,
    });
    show();
    await screen.findByText('No payments were found for this account.');
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
  });
  it('paginates with a fresh scoped request without retaining the previous page', async () => {
    vi.mocked(paymentHistoryService.list).mockImplementation(async (index) =>
      index === 0
        ? { ...page, totalPages: 2, totalElements: 21, isLast: false }
        : {
            ...page,
            pageNumber: 1,
            isFirst: false,
            content: [{ ...payment, paymentNo: 'PAY-NEXT' }],
          },
    );
    show();
    await screen.findByText('PAY-OWN-001');
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    await screen.findByText('PAY-NEXT');
    expect(screen.queryByText('PAY-OWN-001')).not.toBeInTheDocument();
    expect(paymentHistoryService.list).toHaveBeenLastCalledWith(
      1,
      expect.any(AbortSignal),
    );
  });
  it.each([401, 403, 404])(
    'hides unavailable receipts with status %s',
    async (status) => {
      vi.mocked(paymentHistoryService.get).mockRejectedValue(
        new NormalizedApiError({ status, message: 'Unavailable' }),
      );
      show(`/account/payments/${id}`);
      await screen.findByText('This payment is unavailable to this account.');
      expect(screen.queryByText('PAY-OWN-001')).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Print receipt' }),
      ).not.toBeInTheDocument();
    },
  );
  it('recovers a failed request on refresh', async () => {
    vi.mocked(paymentHistoryService.list)
      .mockRejectedValueOnce(new Error('Network'))
      .mockResolvedValue(page);
    show();
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: 'Refresh payments' }));
    await screen.findByText('PAY-OWN-001');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
  it('disables printing offline and refreshes after reconnect', async () => {
    show(`/account/payments/${id}`);
    await screen.findByRole('heading', { name: 'Payment receipt' });
    act(() => {
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
      window.dispatchEvent(new Event('offline'));
    });
    expect(screen.getByText(/You are offline/)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Print receipt' }),
    ).toBeDisabled();
    act(() => {
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
      window.dispatchEvent(new Event('online'));
    });
    await waitFor(() =>
      expect(paymentHistoryService.get).toHaveBeenCalledTimes(2),
    );
  });
  it('does not fetch private records on a cold offline visit', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    show();
    expect(paymentHistoryService.list).not.toHaveBeenCalled();
    expect(screen.getByText(/You are offline/)).toBeInTheDocument();
  });
  it('does not fetch for an invalid receipt identifier', async () => {
    show('/account/payments/not-a-uuid');
    await screen.findByText('This payment is unavailable to this account.');
    expect(paymentHistoryService.get).not.toHaveBeenCalled();
  });
  it('requires login before reading payment history', async () => {
    useAuthStore.setState({ user: null, token: null, isAuthenticated: false });
    show();
    await screen.findByRole('heading', { name: 'Sign in' });
    expect(paymentHistoryService.list).not.toHaveBeenCalled();
  });
  it('discards late history from the previous buyer session and purges its cache', async () => {
    let resolve!: (value: PaymentPage) => void;
    vi.mocked(paymentHistoryService.list)
      .mockReturnValueOnce(
        new Promise((done) => {
          resolve = done;
        }),
      )
      .mockResolvedValue({ ...page, content: [] });
    show();
    await waitFor(() =>
      expect(paymentHistoryService.list).toHaveBeenCalledOnce(),
    );
    const signal = vi.mocked(paymentHistoryService.list).mock.calls[0][1];
    act(() =>
      useAuthStore.setState({
        token: 'buyer-2-token',
        user: { id: 'buyer-2', roles: ['BUYER_VISITOR'] },
      }),
    );
    await act(async () => resolve(page));
    await screen.findByText('No payments were found for this account.');
    expect(signal?.aborted).toBe(true);
    expect(screen.queryByText('PAY-OWN-001')).not.toBeInTheDocument();
    expect(
      client
        .getQueryCache()
        .getAll()
        .filter((query) => query.queryKey[1] === 'buyer-1'),
    ).toHaveLength(0);
  });
  it('removes receipt data after navigating away', async () => {
    const view = show(`/account/payments/${id}`);
    await screen.findByRole('heading', { name: 'Payment receipt' });
    view.unmount();
    await waitFor(() =>
      expect(client.getQueryCache().getAll()).toHaveLength(0),
    );
  });
});
