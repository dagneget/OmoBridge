import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import BookingConfirmationPage from '../pages/public/BookingConfirmationPage';
import { bookingService } from '../features/bookings/bookingService';
import type { BookingResponse } from '../types/api';

const baseBooking: BookingResponse = {
  id: 'b777-test',
  bookingCode: 'BK-2026-777',
  enterpriseId: 'ent-1',
  enterpriseName: 'Dimeka Agro Cooperative Union',
  visitDate: '2026-11-15',
  partySize: 3,
  contactName: 'Tariku Mengistu',
  contactPhone: '+251911223344',
  contactEmail: 'tariku@example.com',
  specialRequests: 'Elderly guest requires seated observation',
  subtotal: 7500,
  taxAmount: 1125,
  feeAmount: 150,
  totalAmount: 8775,
  currency: 'ETB',
  items: [
    {
      id: 'item-1',
      itemType: 'PACKAGE',
      itemId: 'pkg-1',
      itemNameSnapshot: 'Ukuli Bula Ceremony',
      unitPriceSnapshot: 2500,
      quantity: 3,
      lineTotal: 7500,
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

function renderConfirmationPage(bookingId = 'b777-test') {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/booking/confirmation/${bookingId}`]}>
        <Routes>
          <Route path="/booking/confirmation/:id" element={<BookingConfirmationPage />} />
          <Route path="/checkout" element={<div>Checkout Screen</div>} />
          <Route path="/tourism" element={<div>Tourism Screen</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('Booking Confirmation and Status (F-403)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders REQUESTED status with booking reference and timeline step 1', async () => {
    vi.spyOn(bookingService, 'getBookingById').mockResolvedValue({
      ...baseBooking,
      status: 'REQUESTED',
    });

    renderConfirmationPage();

    await waitFor(() => {
      expect(screen.getByText('BK-2026-777')).toBeInTheDocument();
    });
    expect(screen.getByTestId('booking-status-chip')).toHaveTextContent(/requested/i);
    expect(screen.getByTestId('timeline-step-REQUESTED')).toHaveTextContent(/requested/i);
    expect(screen.getByText('Tariku Mengistu')).toBeInTheDocument();
    expect(screen.getByTestId('booking-total-price')).toHaveTextContent('8,775.00 ETB');
    expect(screen.getByTestId('cancel-booking-btn')).toBeInTheDocument();
  });

  it('renders CONFIRMED status with payment CTA button', async () => {
    vi.spyOn(bookingService, 'getBookingById').mockResolvedValue({
      ...baseBooking,
      status: 'CONFIRMED',
    });

    renderConfirmationPage();

    await waitFor(() => {
      expect(screen.getByText('BK-2026-777')).toBeInTheDocument();
      expect(screen.getByTestId('booking-status-chip')).toHaveTextContent(/confirmed/i);
      expect(screen.getByTestId('pay-booking-cta')).toBeInTheDocument();
    });
  });

  it('renders PAID status with paid confirmation notice', async () => {
    vi.spyOn(bookingService, 'getBookingById').mockResolvedValue({
      ...baseBooking,
      status: 'PAID',
    });

    renderConfirmationPage();

    await waitFor(() => {
      expect(screen.getByText('BK-2026-777')).toBeInTheDocument();
      expect(screen.getByTestId('booking-status-chip')).toHaveTextContent(/paid/i);
      expect(screen.getByText(/payment confirmed/i)).toBeInTheDocument();
    });
  });

  it('renders COMPLETED status when experience has concluded', async () => {
    vi.spyOn(bookingService, 'getBookingById').mockResolvedValue({
      ...baseBooking,
      status: 'COMPLETED',
    });

    renderConfirmationPage();

    await waitFor(() => {
      expect(screen.getByText('BK-2026-777')).toBeInTheDocument();
      expect(screen.getByTestId('booking-status-chip')).toHaveTextContent(/completed/i);
      expect(screen.getByText(/this experience has been completed/i)).toBeInTheDocument();
    });
  });

  it('renders DECLINED status with host declined explanation', async () => {
    vi.spyOn(bookingService, 'getBookingById').mockResolvedValue({
      ...baseBooking,
      status: 'DECLINED',
    });

    renderConfirmationPage();

    await waitFor(() => {
      expect(screen.getByText('BK-2026-777')).toBeInTheDocument();
      expect(screen.getByTestId('booking-status-chip')).toHaveTextContent(/declined/i);
      expect(screen.getByText('Booking Declined by Host')).toBeInTheDocument();
      expect(screen.queryByTestId('pay-booking-cta')).not.toBeInTheDocument();
    });
  });

  it('renders CANCELLED status with cancelled notice', async () => {
    vi.spyOn(bookingService, 'getBookingById').mockResolvedValue({
      ...baseBooking,
      status: 'CANCELLED',
    });

    renderConfirmationPage();

    await waitFor(() => {
      expect(screen.getByText('BK-2026-777')).toBeInTheDocument();
      expect(screen.getByTestId('booking-status-chip')).toHaveTextContent(/cancelled/i);
      expect(screen.getByText('Booking Cancelled')).toBeInTheDocument();
      expect(screen.queryByTestId('pay-booking-cta')).not.toBeInTheDocument();
    });
  });

  it('permits guest to cancel an active booking via modal', async () => {
    vi.spyOn(bookingService, 'getBookingById').mockResolvedValue({
      ...baseBooking,
      status: 'CONFIRMED',
    });
    const updateSpy = vi.spyOn(bookingService, 'updateStatus').mockResolvedValue({
      ...baseBooking,
      status: 'CANCELLED',
    });

    renderConfirmationPage();

    await waitFor(() => {
      expect(screen.getByTestId('cancel-booking-btn')).toBeInTheDocument();
    });

    // Click Cancel Reservation to open modal
    fireEvent.click(screen.getByTestId('cancel-booking-btn'));

    expect(screen.getByText(/cancel this booking\?/i)).toBeInTheDocument();

    // Confirm Cancellation in modal
    fireEvent.click(screen.getByTestId('confirm-cancel-btn'));

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith('b777-test', {
        status: 'CANCELLED',
        notes: 'Cancelled by guest',
      });
      expect(screen.getByText('Booking Cancelled')).toBeInTheDocument();
    });
  });
});
