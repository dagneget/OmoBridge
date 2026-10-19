import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ChapaPaymentModal from '../features/payments/components/ChapaPaymentModal';
import { paymentService } from '../features/payments/paymentService';
import { bookingService } from '../features/bookings/bookingService';
import { useAuthStore } from '../features/auth';

describe('ChapaPaymentModal component', () => {
  beforeEach(() => {
    sessionStorage.clear();
    useAuthStore.setState({
      isAuthenticated: true,
      isLoading: false,
      token: 'test-token',
      user: { id: 'user-chapa-1', roles: ['BUYER_VISITOR'] },
    });
    vi.restoreAllMocks();
  });

  it('renders Chapa Payment modal with branding and details in IDLE state', () => {
    render(
      <ChapaPaymentModal
        isOpen={true}
        onClose={vi.fn()}
        bookingId="bk-chapa-1"
        amount={1250}
        currency="ETB"
        referenceCode="REF-CHAPA-100"
      />,
    );

    expect(screen.getByRole('dialog', { name: 'Chapa Payment' })).toBeInTheDocument();
    expect(screen.getByTestId('chapa-payment-modal')).toBeInTheDocument();
    expect(screen.getByTestId('payment-modal-amount')).toHaveTextContent('1,250.00 ETB');
    expect(screen.getByText('Ref: REF-CHAPA-100')).toBeInTheDocument();
    expect(screen.getByText('chapa')).toBeInTheDocument();
    expect(screen.getByTestId('confirm-chapa-pay-btn')).toBeInTheDocument();
    expect(screen.getByText('Pay with Chapa')).toBeInTheDocument();
  });

  it('transitions to pending and success state on authorization', async () => {
    vi.spyOn(paymentService, 'createAttempt').mockResolvedValue({
      attemptId: 'att-chapa-1',
      paymentId: 'pay-chapa-1',
      paymentNo: 'PAY-NO-1',
      provider: 'CHAPA',
      providerReference: 'CHAPA-TXN-12345678',
      status: 'SUCCESS',
    });

    vi.spyOn(bookingService, 'getBookingById').mockResolvedValue({
      id: 'bk-chapa-1',
      buyerId: 'user-chapa-1',
      status: 'PAID',
      bookingCode: 'REF-CHAPA-100',
      totalAmount: 1250,
      subtotal: 1250,
      currency: 'ETB',
      packageId: 'pkg-1',
      hostEnterpriseId: 'ent-1',
      contactName: 'Buyer',
      contactPhone: '+251911223344',
      contactEmail: 'buyer@example.com',
      experienceDate: '2026-11-01',
      adultCount: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as any);

    const onPaymentSuccess = vi.fn();
    render(
      <ChapaPaymentModal
        isOpen={true}
        onClose={vi.fn()}
        bookingId="bk-chapa-1"
        amount={1250}
        currency="ETB"
        referenceCode="REF-CHAPA-100"
        onPaymentSuccess={onPaymentSuccess}
      />,
    );

    fireEvent.click(screen.getByTestId('confirm-chapa-pay-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('payment-success-state')).toBeInTheDocument();
      expect(screen.getByText('Payment Verified!')).toBeInTheDocument();
      expect(screen.getByText(/CHAPA-TXN-12345678/)).toBeInTheDocument();
    });

    expect(onPaymentSuccess).toHaveBeenCalled();
  });
});
