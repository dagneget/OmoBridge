import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MyBookingsPage from '../pages/account/MyBookingsPage';
import { bookingService } from '../features/bookings/bookingService';
import type { BookingResponse } from '../types/api';

const mockBookings: BookingResponse[] = [
  {
    id: 'b-001',
    bookingCode: 'BK-2026-001',
    enterpriseId: 'ent-1',
    enterpriseName: 'Dimeka Agro Cooperative Union',
    visitDate: '2026-11-20',
    partySize: 2,
    subtotal: 5000,
    totalAmount: 5000,
    currency: 'ETB',
    status: 'CONFIRMED',
    items: [
      {
        id: 'item-1',
        itemNameSnapshot: 'Ukuli Bula Ceremony',
        unitPriceSnapshot: 2500,
        quantity: 2,
        lineTotal: 5000,
      },
    ],
  },
  {
    id: 'b-002',
    bookingCode: 'BK-2026-002',
    enterpriseId: 'ent-2',
    enterpriseName: 'Turmi Eco Lodge Co.',
    visitDate: '2026-10-10',
    partySize: 4,
    subtotal: 8000,
    totalAmount: 8000,
    currency: 'ETB',
    status: 'COMPLETED',
    items: [
      {
        id: 'item-2',
        itemNameSnapshot: 'Omo Valley River Crossing',
        unitPriceSnapshot: 2000,
        quantity: 4,
        lineTotal: 8000,
      },
    ],
  },
  {
    id: 'b-003',
    bookingCode: 'BK-2026-003',
    enterpriseId: 'ent-1',
    enterpriseName: 'Dimeka Agro Cooperative Union',
    visitDate: '2026-09-01',
    partySize: 1,
    subtotal: 1500,
    totalAmount: 1500,
    currency: 'ETB',
    status: 'CANCELLED',
    items: [
      {
        id: 'item-3',
        itemNameSnapshot: 'Traditional Pottery Workshop',
        unitPriceSnapshot: 1500,
        quantity: 1,
        lineTotal: 1500,
      },
    ],
  },
];

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

function renderMyBookingsPage() {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/account/bookings']}>
        <Routes>
          <Route path="/account/bookings" element={<MyBookingsPage />} />
          <Route path="/checkout" element={<div>Checkout Screen</div>} />
          <Route path="/booking/confirmation/:id" element={<div>Voucher Screen</div>} />
          <Route path="/tourism" element={<div>Tourism Catalog</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('My Bookings Page (F-404)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders list of user bookings with details, status chips, and formatted ETB totals', async () => {
    vi.spyOn(bookingService, 'getMyBookings').mockResolvedValue(mockBookings);

    renderMyBookingsPage();

    await waitFor(() => {
      expect(screen.getByText('BK-2026-001')).toBeInTheDocument();
      expect(screen.getByText('Ukuli Bula Ceremony')).toBeInTheDocument();
      expect(screen.getByText('5,000.00 ETB')).toBeInTheDocument();
      expect(screen.getByText('BK-2026-002')).toBeInTheDocument();
      expect(screen.getByText('Omo Valley River Crossing')).toBeInTheDocument();
      expect(screen.getByText('BK-2026-003')).toBeInTheDocument();
      expect(screen.getByText('Traditional Pottery Workshop')).toBeInTheDocument();
    });
  });

  it('filters bookings correctly across status tabs', async () => {
    vi.spyOn(bookingService, 'getMyBookings').mockResolvedValue(mockBookings);

    renderMyBookingsPage();

    await waitFor(() => {
      expect(screen.getByText('BK-2026-001')).toBeInTheDocument();
    });

    // Click 'Completed' tab
    fireEvent.click(screen.getByTestId('filter-tab-COMPLETED'));
    expect(screen.getByText('BK-2026-002')).toBeInTheDocument();
    expect(screen.queryByText('BK-2026-001')).not.toBeInTheDocument();
    expect(screen.queryByText('BK-2026-003')).not.toBeInTheDocument();

    // Click 'Cancelled / Declined' tab
    fireEvent.click(screen.getByTestId('filter-tab-CANCELLED'));
    expect(screen.getByText('BK-2026-003')).toBeInTheDocument();
    expect(screen.queryByText('BK-2026-001')).not.toBeInTheDocument();
    expect(screen.queryByText('BK-2026-002')).not.toBeInTheDocument();

    // Click 'Active & Upcoming' tab
    fireEvent.click(screen.getByTestId('filter-tab-UPCOMING'));
    expect(screen.getByText('BK-2026-001')).toBeInTheDocument();
    expect(screen.queryByText('BK-2026-002')).not.toBeInTheDocument();
  });

  it('permits cancelling an active booking with reason modal and updates query', async () => {
    vi.spyOn(bookingService, 'getMyBookings').mockResolvedValue(mockBookings);
    const updateSpy = vi.spyOn(bookingService, 'updateStatus').mockResolvedValue({
      ...mockBookings[0],
      status: 'CANCELLED',
    });

    renderMyBookingsPage();

    await waitFor(() => {
      expect(screen.getByTestId('cancel-btn-b-001')).toBeInTheDocument();
    });

    // Click cancel on BK-2026-001
    fireEvent.click(screen.getByTestId('cancel-btn-b-001'));

    expect(screen.getByText(/cancel experience booking\?/i)).toBeInTheDocument();

    // Enter optional reason
    fireEvent.change(screen.getByLabelText(/reason for cancellation/i), {
      target: { value: 'Schedule conflicts' },
    });

    // Submit cancellation modal
    fireEvent.click(screen.getByTestId('confirm-cancel-my-booking-btn'));

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith('b-001', {
        status: 'CANCELLED',
        notes: 'Schedule conflicts',
      });
    });
  });

  it('renders empty state when no bookings exist with explore experiences CTA', async () => {
    vi.spyOn(bookingService, 'getMyBookings').mockResolvedValue([]);

    renderMyBookingsPage();

    await waitFor(() => {
      expect(screen.getByText('No Bookings Found')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /explore experiences/i })).toBeInTheDocument();
    });
  });
});
