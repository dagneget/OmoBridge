import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import BookingConfirmationPage from '../pages/public/BookingConfirmationPage';
import { TelebirrPaymentModal } from '../features/payments/components/TelebirrPaymentModal';
import { bookingService } from '../features/bookings/bookingService';
import { paymentService } from '../features/payments/paymentService';
import type { BookingResponse, PaymentAttemptResponse } from '../types/api';

const confirmedBooking: BookingResponse = {
  id: 'b888-pay-test',
  bookingCode: 'BK-2026-888',
  enterpriseId: 'ent-1',
  enterpriseName: 'Key Afer Cultural Center',
  visitDate: '2026-11-20',
  partySize: 2,
  contactName: 'Almaz Wolde',
  contactPhone: '+251911334455',
  contactEmail: 'almaz@example.com',
  subtotal: 5000,
  taxAmount: 750,
  feeAmount: 100,
  totalAmount: 5850,
  currency: 'ETB',
  status: 'CONFIRMED',
  items: [
    {
      id: 'item-1',
      itemType: 'PACKAGE',
      itemId: 'pkg-1',
      itemNameSnapshot: 'Banna Village Market Experience',
      unitPriceSnapshot: 2500,
      quantity: 2,
      lineTotal: 5000,
    },
  ],
};

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

function renderConfirmationPage(bookingId = 'b888-pay-test') {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/booking/confirmation/${bookingId}`]}>
        <Routes>
          <Route path="/booking/confirmation/:id" element={<BookingConfirmationPage />} />
          <Route path="/tourism" element={<div>Tourism Screen</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('Pay for a booking (F-405)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(bookingService, 'getBookingById').mockResolvedValue({ ...confirmedBooking, status: 'PAID' });
  });

  it('opens Telebirr payment modal with amount and booking reference', async () => {
    vi.spyOn(bookingService, 'getBookingById').mockResolvedValue(confirmedBooking);

    renderConfirmationPage();

    await waitFor(() => {
      expect(screen.getByTestId('pay-booking-cta')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('pay-booking-cta'));

    expect(
      screen.queryByTestId('chapa-payment-modal') ||
        screen.getByTestId('telebirr-payment-modal'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('payment-modal-amount')).toHaveTextContent('5,850.00 ETB');
    expect(screen.getByText(/Ref: BK-2026-888/i)).toBeInTheDocument();
    expect(
      screen.queryByTestId('confirm-chapa-pay-btn') ||
        screen.getByTestId('confirm-telebirr-pay-btn'),
    ).toBeInTheDocument();
  });

  it('displays pending spinner while payment is in-flight', async () => {
    let resolvePayment: (val: PaymentAttemptResponse) => void;
    const paymentPromise = new Promise<PaymentAttemptResponse>((resolve) => {
      resolvePayment = resolve;
    });

    vi.spyOn(paymentService, 'createAttempt').mockReturnValue(paymentPromise);

    render(
      <TelebirrPaymentModal
        isOpen={true}
        onClose={vi.fn()}
        bookingId="b888-pay-test"
        amount={5850}
        referenceCode="BK-2026-888"
      />
    );

    // Initial state
    expect(screen.getByTestId('confirm-telebirr-pay-btn')).toBeInTheDocument();

    // Click Authorize & Pay
    fireEvent.click(screen.getByTestId('confirm-telebirr-pay-btn'));

    // Should transition to pending state
    expect(screen.getByTestId('payment-pending-state')).toBeInTheDocument();
    expect(screen.getByText(/Waiting for Telebirr Confirmation\.\.\./i)).toBeInTheDocument();

    // Complete payment
    resolvePayment!({
      attemptId: 'att-1',
      paymentId: 'pay-1',
      paymentNo: 'PAY-888',
      providerReference: 'TB-998877',
      amount: 5850,
      currency: 'ETB',
      status: 'SUCCESS',
      createdAt: new Date().toISOString(),
    });

    await waitFor(() => {
      expect(screen.getByTestId('payment-success-state')).toBeInTheDocument();
    });
  });

  it('updates booking state only after server-confirmed payment', async () => {
    vi.spyOn(bookingService, 'getBookingById').mockResolvedValueOnce(confirmedBooking).mockResolvedValue({ ...confirmedBooking, status: 'PAID' });
    const attemptSpy = vi.spyOn(paymentService, 'createAttempt').mockResolvedValue({
      attemptId: 'att-1',
      paymentId: 'pay-1',
      paymentNo: 'PAY-888',
      providerReference: 'TB-998877',
      amount: 5850,
      currency: 'ETB',
      status: 'SUCCESS',
      createdAt: new Date().toISOString(),
    });

    renderConfirmationPage();

    await waitFor(() => {
      expect(screen.getByTestId('pay-booking-cta')).toBeInTheDocument();
    });

    // Open modal
    fireEvent.click(screen.getByTestId('pay-booking-cta'));

    // Click Authorize & Pay
    fireEvent.click(
      screen.queryByTestId('confirm-chapa-pay-btn') ||
        screen.getByTestId('confirm-telebirr-pay-btn'),
    );

    await waitFor(() => {
      expect(screen.getByTestId('payment-success-state')).toBeInTheDocument();
      expect(screen.getByText(/Payment Verified!/i)).toBeInTheDocument();
      expect(screen.getByText(/Txn ID: TB-998877/i)).toBeInTheDocument();
    });

    expect(attemptSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingId: 'b888-pay-test',
        provider: expect.stringMatching(/CHAPA|TELEBIRR/),
        idempotencyKey: expect.any(String),
      }),
      expect.any(AbortSignal)
    );

    // Close modal via Done button
    fireEvent.click(screen.getByTestId('payment-success-close-btn'));

    // Confirmation page should now reflect PAID
    await waitFor(() => {
      expect(screen.getByTestId('booking-status-chip')).toHaveTextContent(/paid/i);
      expect(screen.getByText(/Payment Confirmed\. Have a great experience!/i)).toBeInTheDocument();
    });
  });

  it('handles payment failure and allows retry reusing idempotency key', async () => {
    let callCount = 0;
    const capturedKeys: string[] = [];

    vi.spyOn(paymentService, 'createAttempt').mockImplementation(async (req) => {
      callCount++;
      capturedKeys.push(req.idempotencyKey);
      if (callCount === 1) {
        throw new Error('Insufficient Telebirr balance');
      }
      return {
        attemptId: 'att-2',
        paymentId: 'pay-2',
        paymentNo: 'PAY-889',
        providerReference: 'TB-223344',
        amount: 5850,
        currency: 'ETB',
        status: 'SUCCESS',
        createdAt: new Date().toISOString(),
      };
    });

    render(
      <TelebirrPaymentModal
        isOpen={true}
        onClose={vi.fn()}
        bookingId="b888-pay-test"
        amount={5850}
        referenceCode="BK-2026-888"
      />
    );

    // First attempt fails
    fireEvent.click(screen.getByTestId('confirm-telebirr-pay-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('payment-failed-state')).toBeInTheDocument();
      expect(screen.getByText(/Insufficient Telebirr balance/i)).toBeInTheDocument();
    });

    // Click retry
    fireEvent.click(screen.getByTestId('retry-payment-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('payment-success-state')).toBeInTheDocument();
    });

    // Verify idempotency key was preserved between the initial attempt and the retry
    expect(callCount).toBe(2);
    expect(capturedKeys[0]).toBeTruthy();
    expect(capturedKeys[1]).toBe(capturedKeys[0]);
  });

  it('handles gateway timeout and provides retry option', async () => {
    vi.useFakeTimers();

    // Mock a hanging payment attempt
    vi.spyOn(paymentService, 'createAttempt').mockReturnValue(new Promise(() => {}));

    render(
      <TelebirrPaymentModal
        isOpen={true}
        onClose={vi.fn()}
        bookingId="b888-pay-test"
        amount={5850}
      />
    );

    fireEvent.click(screen.getByTestId('confirm-telebirr-pay-btn'));
    expect(screen.getByTestId('payment-pending-state')).toBeInTheDocument();

    // Fast-forward past 25s safety timeout
    await act(async () => {
      await vi.advanceTimersByTimeAsync(26000);
    });

    expect(screen.getByTestId('payment-timeout-state')).toBeInTheDocument();
    expect(screen.getByText(/Confirmation Timed Out/i)).toBeInTheDocument();
    expect(screen.getByTestId('timeout-retry-btn')).toBeInTheDocument();

    vi.useRealTimers();
  });
});
