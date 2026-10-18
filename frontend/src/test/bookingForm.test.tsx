import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import BookingPage from '../pages/public/BookingPage';
import { tourismService } from '../features/tourism/tourismService';
import { bookingService } from '../features/bookings/bookingService';
import type { TourPackageResponse, SessionResponse, BookingResponse } from '../types/api';

const mockPackage: TourPackageResponse = {
  id: 'pkg-bula-1',
  enterpriseId: 'ent-dimeka-1',
  enterpriseName: 'Dimeka Agro Cooperative Union',
  name: 'Ukuli Bula Ceremony',
  category: 'CULTURAL_EVENT',
  priceAmount: 2500,
  currency: 'ETB',
  priceUnit: 'PER_PERSON',
  durationHours: 4,
  maxGroupSize: 10,
  culturalRules: 'Maintain respectful silence during ritual invocations; obtain guide permission before taking photos.',
  communityApprovalRef: 'CONSENT-OMO-COMMUNITY-2024',
  isActive: true,
};

const mockOpenSession: SessionResponse = {
  id: 'sess-101',
  packageId: 'pkg-bula-1',
  sessionDate: '2026-11-10',
  startTime: { hour: 9, minute: 0 },
  capacity: 10,
  bookedCount: 2,
  availableCapacity: 8,
  status: 'OPEN',
};

const mockCreatedBooking: BookingResponse = {
  id: 'book-777',
  bookingCode: 'BK-2026-777',
  enterpriseId: 'ent-dimeka-1',
  sessionId: 'sess-101',
  visitDate: '2026-11-10',
  partySize: 2,
  contactName: 'Almaz Bekele',
  contactPhone: '+251911223344',
  subtotal: 5000,
  taxAmount: 0,
  feeAmount: 0,
  totalAmount: 5000,
  currency: 'ETB',
  status: 'REQUESTED',
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

function renderBookingPage(searchQuery = '?packageId=pkg-bula-1') {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/booking${searchQuery}`]}>
        <Routes>
          <Route path="/booking" element={<BookingPage />} />
          <Route path="/booking/confirmation/:id" element={<div>Booking Confirmation Screen</div>} />
          <Route path="/tourism" element={<div>Tourism Catalog Screen</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('Booking Form (F-402)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(tourismService, 'getPackageById').mockResolvedValue(mockPackage);
    vi.spyOn(bookingService, 'getSessions').mockResolvedValue([mockOpenSession]);
    vi.spyOn(bookingService, 'calculatePricing').mockResolvedValue({
      subtotal: 2500,
      breakdown: [],
      total: 2500,
      currency: 'ETB',
    });
  });

  it('renders package details, price breakdown, and availability picker', async () => {
    renderBookingPage();

    await waitFor(() => {
      expect(screen.getAllByText('Ukuli Bula Ceremony')[0]).toBeInTheDocument();
      expect(screen.getByText('Dimeka Agro Cooperative Union')).toBeInTheDocument();
      expect(screen.getByTestId('availability-picker')).toBeInTheDocument();
      expect(screen.getByTestId('total-price-display')).toBeInTheDocument();
    });
  });

  it('requires mandatory cultural rules acknowledgement before booking', async () => {
    renderBookingPage();

    await waitFor(() => {
      expect(screen.getAllByText('Ukuli Bula Ceremony')[0]).toBeInTheDocument();
    });

    // Select session
    const sessionBtn = await screen.findByTestId('session-option-sess-101');
    fireEvent.click(sessionBtn);

    // Fill contact details
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Almaz Bekele' } });
    fireEvent.change(screen.getByLabelText(/ethiopian phone number/i), {
      target: { value: '0911223344' },
    });

    // Submit without checking cultural rules checkbox
    const submitBtn = screen.getByTestId('submit-booking-btn');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/you must acknowledge and agree to the cultural rules/i)
      ).toBeInTheDocument();
    });
  });

  it('successfully creates booking with idempotency key and navigates to confirmation', async () => {
    const createSpy = vi
      .spyOn(bookingService, 'createBooking')
      .mockResolvedValue(mockCreatedBooking);

    renderBookingPage();

    await waitFor(() => {
      expect(screen.getAllByText('Ukuli Bula Ceremony')[0]).toBeInTheDocument();
    });

    // Select session
    const sessionBtn = await screen.findByTestId('session-option-sess-101');
    fireEvent.click(sessionBtn);

    // Fill contact details
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Almaz Bekele' } });
    fireEvent.change(screen.getByLabelText(/ethiopian phone number/i), {
      target: { value: '0911223344' },
    });

    // Check cultural rules
    const rulesCheckbox = screen.getByTestId('cultural-rules-checkbox');
    fireEvent.click(rulesCheckbox);

    // Submit booking
    const submitBtn = screen.getByTestId('submit-booking-btn');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledTimes(1);
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          enterpriseId: 'ent-dimeka-1',
          sessionId: 'sess-101',
          contactName: 'Almaz Bekele',
          contactPhone: '+251911223344',
          partySize: 1,
          items: [
            {
              itemType: 'PACKAGE',
              itemId: 'pkg-bula-1',
              quantity: 1,
            },
          ],
        }),
        expect.any(String) // idempotency key string
      );
      expect(screen.getByText('Booking Confirmation Screen')).toBeInTheDocument();
    });
  });

  it('prevents duplicate submissions on repeated rapid clicks', async () => {
    let resolvePromise: (value: BookingResponse) => void;
    const pendingPromise = new Promise<BookingResponse>((resolve) => {
      resolvePromise = resolve;
    });

    const createSpy = vi
      .spyOn(bookingService, 'createBooking')
      .mockReturnValue(pendingPromise);

    renderBookingPage();

    await waitFor(() => {
      expect(screen.getAllByText('Ukuli Bula Ceremony')[0]).toBeInTheDocument();
    });

    // Select session & fill form
    const sessionBtn = await screen.findByTestId('session-option-sess-101');
    fireEvent.click(sessionBtn);
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Almaz Bekele' } });
    fireEvent.change(screen.getByLabelText(/ethiopian phone number/i), {
      target: { value: '0911223344' },
    });
    fireEvent.click(screen.getByTestId('cultural-rules-checkbox'));

    const submitBtn = screen.getByTestId('submit-booking-btn');
    // Rapid clicks
    fireEvent.click(submitBtn);
    fireEvent.click(submitBtn);
    fireEvent.click(submitBtn);

    expect(createSpy).toHaveBeenCalledTimes(1);

    // Resolve promise
    resolvePromise!(mockCreatedBooking);

    await waitFor(() => {
      expect(screen.getByText('Booking Confirmation Screen')).toBeInTheDocument();
    });
  });

  it('displays server error banner if booking creation fails', async () => {
    vi.spyOn(bookingService, 'createBooking').mockRejectedValue(
      new Error('Session has already reached maximum capacity')
    );

    renderBookingPage();

    await waitFor(() => {
      expect(screen.getAllByText('Ukuli Bula Ceremony')[0]).toBeInTheDocument();
    });

    const sessionBtn = await screen.findByTestId('session-option-sess-101');
    fireEvent.click(sessionBtn);
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Almaz Bekele' } });
    fireEvent.change(screen.getByLabelText(/ethiopian phone number/i), {
      target: { value: '0911223344' },
    });
    fireEvent.click(screen.getByTestId('cultural-rules-checkbox'));

    const submitBtn = screen.getByTestId('submit-booking-btn');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByTestId('booking-error-banner')).toBeInTheDocument();
      expect(
        screen.getByText('Session has already reached maximum capacity')
      ).toBeInTheDocument();
    });
  });
});
