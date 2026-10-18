import { StrictMode } from 'react';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TelebirrPaymentModal from '../features/payments/components/TelebirrPaymentModal';
import { paymentService } from '../features/payments/paymentService';
import { bookingService } from '../features/bookings/bookingService';
import { orderService } from '../features/orders/orderService';
import { useAuthStore } from '../features/auth';
import type { BookingResponse, PaymentAttemptResponse } from '../types/api';

const booking: BookingResponse = { id: 'booking-1', status: 'CONFIRMED' };
const attempt: PaymentAttemptResponse = {
  attemptId: 'attempt-1',
  paymentId: 'payment-1',
  status: 'SUCCESS',
};
const props = {
  isOpen: true,
  onClose: vi.fn(),
  bookingId: 'booking-1',
  amount: 100,
};
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
function pay() {
  fireEvent.click(screen.getByTestId('confirm-telebirr-pay-btn'));
}
beforeEach(() => {
  sessionStorage.clear();
  useAuthStore.setState({ user: { id: 'buyer-1' }, token: 'token-1' });
  vi.spyOn(paymentService, 'createAttempt').mockResolvedValue(attempt);
  vi.spyOn(bookingService, 'getBookingById').mockResolvedValue(booking);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  history.replaceState({}, '', '/');
  useAuthStore.setState({ user: null, token: null });
});

describe('F-601 verified payment flow', () => {
  it('does not trust a forged URL or a successful gateway attempt as settlement', async () => {
    history.replaceState({}, '', '/?payment=success&status=PAID');
    const success = vi.fn();
    render(<TelebirrPaymentModal {...props} onPaymentSuccess={success} />);
    expect(
      screen.queryByTestId('payment-success-state'),
    ).not.toBeInTheDocument();
    pay();
    await waitFor(() =>
      expect(bookingService.getBookingById).toHaveBeenCalled(),
    );
    expect(screen.getByTestId('payment-pending-state')).toBeInTheDocument();
    expect(success).not.toHaveBeenCalled();
    expect(
      screen.queryByTestId('payment-failed-state'),
    ).not.toBeInTheDocument();
  });
  it('confirms only after a refreshed server booking is PAID', async () => {
    const success = vi.fn();
    render(<TelebirrPaymentModal {...props} onPaymentSuccess={success} />);
    pay();
    await waitFor(() =>
      expect(bookingService.getBookingById).toHaveBeenCalledTimes(1),
    );
    vi.mocked(bookingService.getBookingById).mockResolvedValue({
      ...booking,
      status: 'PAID',
    });
    fireEvent.click(screen.getByTestId('refresh-payment-status-btn'));
    await screen.findByTestId('payment-success-state');
    expect(success).toHaveBeenCalledExactlyOnceWith(attempt);
    expect(paymentService.createAttempt).toHaveBeenCalledTimes(1);
  });
  it('polls settlement without creating another charge', async () => {
    vi.useFakeTimers();
    vi.mocked(bookingService.getBookingById)
      .mockResolvedValueOnce(booking)
      .mockResolvedValue({ ...booking, status: 'PAID' });
    render(<TelebirrPaymentModal {...props} />);
    await act(async () => {
      pay();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(screen.getByTestId('payment-success-state')).toBeInTheDocument();
    expect(paymentService.createAttempt).toHaveBeenCalledTimes(1);
  });
  it('deduplicates repeated clicks under StrictMode', async () => {
    const pending = deferred<PaymentAttemptResponse>();
    vi.mocked(paymentService.createAttempt).mockReturnValue(pending.promise);
    render(
      <StrictMode>
        <TelebirrPaymentModal {...props} />
      </StrictMode>,
    );
    const button = screen.getByTestId('confirm-telebirr-pay-btn');
    fireEvent.click(button);
    fireEvent.click(button);
    expect(paymentService.createAttempt).toHaveBeenCalledTimes(1);
  });
  it('preserves the same key when a request fails and is retried', async () => {
    vi.mocked(paymentService.createAttempt)
      .mockRejectedValueOnce(new Error('Connection lost'))
      .mockResolvedValue(attempt);
    render(<TelebirrPaymentModal {...props} />);
    pay();
    await screen.findByTestId('payment-failed-state');
    fireEvent.click(screen.getByTestId('retry-payment-btn'));
    await waitFor(() =>
      expect(paymentService.createAttempt).toHaveBeenCalledTimes(2),
    );
    const calls = vi.mocked(paymentService.createAttempt).mock.calls;
    expect(calls[0][0].idempotencyKey).toBeTruthy();
    expect(calls[1][0].idempotencyKey).toBe(calls[0][0].idempotencyKey);
  });
  it('times out, aborts the old request, and ignores a late response after retry', async () => {
    vi.useFakeTimers();
    const old = deferred<PaymentAttemptResponse>();
    vi.mocked(paymentService.createAttempt)
      .mockReturnValueOnce(old.promise)
      .mockResolvedValue({ ...attempt, status: 'FAILED' });
    const success = vi.fn();
    render(<TelebirrPaymentModal {...props} onPaymentSuccess={success} />);
    pay();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(25_000);
    });
    expect(screen.getByTestId('payment-timeout-state')).toBeInTheDocument();
    expect(
      vi.mocked(paymentService.createAttempt).mock.calls[0][1]?.aborted,
    ).toBe(true);
    await act(async () => {
      fireEvent.click(screen.getByTestId('timeout-retry-btn'));
    });
    await act(async () => old.resolve(attempt));
    expect(screen.getByTestId('payment-failed-state')).toBeInTheDocument();
    expect(success).not.toHaveBeenCalled();
    const calls = vi.mocked(paymentService.createAttempt).mock.calls;
    expect(calls[0][0].idempotencyKey).toBe(calls[1][0].idempotencyKey);
  });
  it('keeps INITIATED attempts pending and supports a manual server refresh', async () => {
    vi.mocked(paymentService.createAttempt).mockResolvedValue({
      ...attempt,
      status: 'INITIATED',
    });
    render(<TelebirrPaymentModal {...props} />);
    pay();
    await waitFor(() =>
      expect(bookingService.getBookingById).toHaveBeenCalled(),
    );
    expect(screen.getByTestId('payment-pending-state')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('refresh-payment-status-btn'));
    await waitFor(() =>
      expect(bookingService.getBookingById).toHaveBeenCalledTimes(2),
    );
  });
  it('does not report success when verification is unavailable', async () => {
    vi.mocked(bookingService.getBookingById).mockRejectedValue(
      new Error('Status unavailable'),
    );
    render(<TelebirrPaymentModal {...props} />);
    pay();
    await screen.findByText('Status unavailable');
    expect(
      screen.queryByTestId('payment-success-state'),
    ).not.toBeInTheDocument();
  });
  it('does not accept a response for another booking', async () => {
    vi.mocked(bookingService.getBookingById).mockResolvedValue({
      id: 'other',
      status: 'PAID',
    });
    render(<TelebirrPaymentModal {...props} />);
    pay();
    await screen.findByText('Unexpected booking returned by the server.');
    expect(
      screen.queryByTestId('payment-success-state'),
    ).not.toBeInTheDocument();
  });
  it('reuses a key after closing and reopening but scopes it to the target', async () => {
    vi.mocked(paymentService.createAttempt).mockResolvedValue({
      ...attempt,
      status: 'FAILED',
    });
    const view = render(<TelebirrPaymentModal {...props} />);
    pay();
    await screen.findByTestId('payment-failed-state');
    view.rerender(<TelebirrPaymentModal {...props} isOpen={false} />);
    view.rerender(<TelebirrPaymentModal {...props} />);
    pay();
    await screen.findByTestId('payment-failed-state');
    view.rerender(<TelebirrPaymentModal {...props} bookingId="booking-2" />);
    pay();
    await screen.findByTestId('payment-failed-state');
    const calls = vi.mocked(paymentService.createAttempt).mock.calls;
    expect(calls[0][0].idempotencyKey).toBe(calls[1][0].idempotencyKey);
    expect(calls[2][0].idempotencyKey).not.toBe(calls[0][0].idempotencyKey);
  });
  it('discards requests from a closed modal or a previous session', async () => {
    const pending = deferred<PaymentAttemptResponse>();
    vi.mocked(paymentService.createAttempt).mockReturnValue(pending.promise);
    const success = vi.fn();
    const view = render(
      <TelebirrPaymentModal {...props} onPaymentSuccess={success} />,
    );
    pay();
    act(() =>
      useAuthStore.setState({ user: { id: 'buyer-2' }, token: 'token-2' }),
    );
    await act(async () => pending.resolve(attempt));
    expect(success).not.toHaveBeenCalled();
    expect(screen.getByTestId('confirm-telebirr-pay-btn')).toBeInTheDocument();
    view.rerender(<TelebirrPaymentModal {...props} isOpen={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  it('fails safely when both targets are supplied', async () => {
    render(<TelebirrPaymentModal {...props} orderId="order-1" />);
    pay();
    await screen.findByTestId('payment-failed-state');
    expect(paymentService.createAttempt).not.toHaveBeenCalled();
  });
  it('verifies the owned order before reading its settled payment', async () => {
    vi.spyOn(orderService, 'detail').mockResolvedValue({
      orderId: 'order-1',
      buyerId: 'buyer-1',
      status: 'PLACED',
    });
    vi.spyOn(orderService, 'payment').mockResolvedValue({
      orderId: 'order-1',
      status: 'RELEASED',
    });
    render(
      <TelebirrPaymentModal
        {...props}
        bookingId={undefined}
        orderId="order-1"
      />,
    );
    pay();
    await screen.findByTestId('payment-success-state');
    expect(orderService.detail).toHaveBeenCalledWith(
      'order-1',
      'buyer-1',
      expect.any(AbortSignal),
    );
    expect(orderService.payment).toHaveBeenCalledWith(
      expect.objectContaining({ buyerId: 'buyer-1' }),
      'buyer-1',
      expect.any(AbortSignal),
    );
  });
  it('does not read payment when order ownership verification fails', async () => {
    vi.spyOn(orderService, 'detail').mockRejectedValue(
      new Error('Order unavailable'),
    );
    const payment = vi.spyOn(orderService, 'payment');
    render(
      <TelebirrPaymentModal
        {...props}
        bookingId={undefined}
        orderId="order-1"
      />,
    );
    pay();
    await screen.findByText('Order unavailable');
    expect(payment).not.toHaveBeenCalled();
    expect(paymentService.createAttempt).not.toHaveBeenCalled();
    expect(
      screen.queryByTestId('payment-success-state'),
    ).not.toBeInTheDocument();
  });
  it('shows a cancelled booking as failed instead of waiting for settlement', async () => {
    vi.mocked(bookingService.getBookingById).mockResolvedValue({
      ...booking,
      status: 'CANCELLED',
    });
    render(<TelebirrPaymentModal {...props} />);
    pay();
    await screen.findByTestId('payment-failed-state');
    expect(
      screen.getByText('This booking has been cancelled.'),
    ).toBeInTheDocument();
  });
  it('rejects an attempt response with a different idempotency key', async () => {
    vi.mocked(paymentService.createAttempt).mockResolvedValue({
      ...attempt,
      idempotencyKey: 'another-key',
    });
    render(<TelebirrPaymentModal {...props} />);
    pay();
    await screen.findByTestId('payment-failed-state');
    expect(bookingService.getBookingById).not.toHaveBeenCalled();
  });
  it.each(['PENDING', 'REFUNDED', 'FAILED'] as const)(
    'does not mark a %s order payment successful',
    async (status) => {
      vi.spyOn(orderService, 'detail').mockResolvedValue({
        orderId: 'order-1',
        buyerId: 'buyer-1',
        status: 'PLACED',
      });
      vi.spyOn(orderService, 'payment').mockResolvedValue({
        orderId: 'order-1',
        status,
      });
      const success = vi.fn();
      render(
        <TelebirrPaymentModal
          {...props}
          bookingId={undefined}
          orderId="order-1"
          onPaymentSuccess={success}
        />,
      );
      pay();
      await waitFor(() => expect(orderService.payment).toHaveBeenCalled());
      expect(success).not.toHaveBeenCalled();
      expect(
        screen.queryByTestId('payment-success-state'),
      ).not.toBeInTheDocument();
      if (status !== 'PENDING')
        expect(screen.getByTestId('payment-failed-state')).toBeInTheDocument();
    },
  );
});
