import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { useAuthStore } from '../features/auth/authStore';
import { bookingService } from '../features/bookings/bookingService';
import { tourismService } from '../features/tourism/tourismService';
import EnterpriseBookingsPage from '../pages/dashboard/enterprise/EnterpriseBookingsPage';
import { mockGuides } from '../mocks/fixtures/catalog';
import type { BookingResponse } from '../types/api';

const TARGET_ENTERPRISE_ID = '33333333-3333-3333-3333-333333333333';

const mockEnterpriseBookings: BookingResponse[] = [
  {
    id: 'book-001',
    bookingCode: 'BKG-2026-0089',
    enterpriseId: TARGET_ENTERPRISE_ID,
    enterpriseName: 'South Omo Community Heritage Cooperative',
    buyerId: '11111111-1111-1111-1111-111111111111',
    buyerName: 'Elena Rostova',
    sessionId: 'sess-001',
    assignedGuideId: 'guide-001',
    assignedGuideName: 'Desta Girmay',
    visitDate: '2026-10-22',
    partySize: 2,
    contactName: 'Elena Rostova',
    contactPhone: '+251911998877',
    contactEmail: 'elena@travelworld.org',
    specialRequests: 'Vegetarian meals, apiculture demonstration',
    subtotal: 9000.0,
    taxAmount: 1350.0,
    feeAmount: 450.0,
    totalAmount: 10800.0,
    currency: 'ETB',
    status: 'REQUESTED',
    items: [
      {
        id: 'item-001',
        itemType: 'PACKAGE',
        itemId: 'pack-001',
        itemNameSnapshot: 'Mursi & Hamar Cultural Immersion',
        unitPriceSnapshot: 4500.0,
        quantity: 2,
        lineTotal: 9000.0,
      },
    ],
  },
  {
    id: 'book-002',
    bookingCode: 'BKG-2026-0090',
    enterpriseId: TARGET_ENTERPRISE_ID,
    enterpriseName: 'South Omo Community Heritage Cooperative',
    buyerId: '11111111-1111-1111-1111-111111111112',
    buyerName: 'Marcus Vance',
    sessionId: 'sess-002',
    visitDate: '2026-10-24',
    partySize: 3,
    contactName: 'Marcus Vance',
    contactPhone: '+251922334455',
    contactEmail: 'marcus@naturephoto.com',
    specialRequests: 'Sunrise photography orientation',
    subtotal: 5400.0,
    taxAmount: 810.0,
    feeAmount: 270.0,
    totalAmount: 6480.0,
    currency: 'ETB',
    status: 'CONFIRMED',
    items: [
      {
        id: 'item-002',
        itemType: 'PACKAGE',
        itemId: 'pack-002',
        itemNameSnapshot: 'Lower Omo River Birding & Flora',
        unitPriceSnapshot: 1800.0,
        quantity: 3,
        lineTotal: 5400.0,
      },
    ],
  },
  {
    id: 'book-003',
    bookingCode: 'BKG-2026-0091',
    enterpriseId: TARGET_ENTERPRISE_ID,
    enterpriseName: 'South Omo Community Heritage Cooperative',
    buyerId: '11111111-1111-1111-1111-111111111113',
    buyerName: 'Chloe Bennett',
    visitDate: '2026-10-25',
    partySize: 1,
    contactName: 'Chloe Bennett',
    contactPhone: '+251933445566',
    contactEmail: 'chloe@eco.org',
    subtotal: 1800.0,
    taxAmount: 270.0,
    feeAmount: 90.0,
    totalAmount: 2160.0,
    currency: 'ETB',
    status: 'PAID',
    items: [
      {
        id: 'item-003',
        itemType: 'PACKAGE',
        itemId: 'pack-002',
        itemNameSnapshot: 'Lower Omo River Birding & Flora',
        unitPriceSnapshot: 1800.0,
        quantity: 1,
        lineTotal: 1800.0,
      },
    ],
  },
];

function renderBookingsPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/dashboard/enterprise/bookings']}>
        <EnterpriseBookingsPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('F-912: Tourism Bookings Lifecycle & Guide Assignment', () => {
  beforeEach(() => {
    vi.restoreAllMocks();

    useAuthStore.setState({
      user: {
        id: 'test-user-enterprise',
        email: 'coop@southomo.org',
        roles: ['MICRO_ENTERPRISE'],
        enterpriseId: TARGET_ENTERPRISE_ID,
        enterpriseName: 'South Omo Community Heritage Cooperative',
        fullName: 'Ato Berhanu Haile',
      },
      token: 'mock-enterprise-token',
      isAuthenticated: true,
      activeRole: 'MICRO_ENTERPRISE',
    });

    vi.spyOn(bookingService, 'getEnterpriseBookings').mockResolvedValue(
      mockEnterpriseBookings.map((b) => ({ ...b }))
    );

    vi.spyOn(tourismService, 'getGuides').mockResolvedValue(
      mockGuides.map((g) => ({ ...g }))
    );

    vi.spyOn(bookingService, 'updateStatus').mockImplementation(async (id, payload) => {
      const found = mockEnterpriseBookings.find((b) => b.id === id);
      return {
        ...(found || mockEnterpriseBookings[0]),
        status: payload.status,
      };
    });
  });

  it('renders enterprise bookings table with KPIs and tourist details', async () => {
    renderBookingsPage();

    expect(await screen.findByTestId('bookings-table')).toBeInTheDocument();
    expect(screen.getByTestId('kpi-requested-bookings')).toHaveTextContent('1');
    expect(screen.getByTestId('kpi-confirmed-bookings')).toHaveTextContent('2');

    // Row 1
    expect(screen.getByText('BKG-2026-0089')).toBeInTheDocument();
    expect(screen.getByTestId('tourist-name-book-001')).toHaveTextContent('Elena Rostova');
    expect(screen.getByTestId('booking-status-book-001')).toHaveTextContent('REQUESTED');

    // Row 2
    expect(screen.getByText('BKG-2026-0090')).toBeInTheDocument();
    expect(screen.getByTestId('tourist-name-book-002')).toHaveTextContent('Marcus Vance');
    expect(screen.getByTestId('booking-status-book-002')).toHaveTextContent('CONFIRMED');
  });

  it('filters bookings by status tabs (REQUESTED, CONFIRMED) and search', async () => {
    renderBookingsPage();

    await screen.findByTestId('bookings-table');

    // Filter by REQUESTED
    fireEvent.click(screen.getByTestId('filter-booking-REQUESTED'));
    expect(screen.getByText('BKG-2026-0089')).toBeInTheDocument();
    expect(screen.queryByText('BKG-2026-0090')).not.toBeInTheDocument();

    // Filter by CONFIRMED
    fireEvent.click(screen.getByTestId('filter-booking-CONFIRMED'));
    expect(screen.queryByText('BKG-2026-0089')).not.toBeInTheDocument();
    expect(screen.getByText('BKG-2026-0090')).toBeInTheDocument();

    // Reset to ALL
    fireEvent.click(screen.getByTestId('filter-booking-ALL'));

    // Search input
    const searchInput = screen.getByTestId('search-bookings-input');
    fireEvent.change(searchInput, { target: { value: 'Marcus' } });
    expect(screen.getByText('BKG-2026-0090')).toBeInTheDocument();
    expect(screen.queryByText('BKG-2026-0089')).not.toBeInTheDocument();
  });

  it('confirms a REQUESTED booking (B-310 lifecycle transition)', async () => {
    renderBookingsPage();

    const confirmBtn = await screen.findByTestId('confirm-booking-btn-book-001');
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(bookingService.updateStatus).toHaveBeenCalledWith('book-001', {
        status: 'CONFIRMED',
        notes: 'Confirmed by cooperative operator',
      });
    });

    expect(await screen.findByTestId('booking-feedback-banner')).toBeInTheDocument();
  });

  it('marks a CONFIRMED booking as PAID', async () => {
    renderBookingsPage();

    const markPaidBtn = await screen.findByTestId('mark-paid-btn-book-002');
    fireEvent.click(markPaidBtn);

    await waitFor(() => {
      expect(bookingService.updateStatus).toHaveBeenCalledWith('book-002', {
        status: 'PAID',
        notes: 'Telebirr payment settled',
      });
    });
  });

  it('completes a PAID booking', async () => {
    renderBookingsPage();

    const completeBtn = await screen.findByTestId('complete-booking-btn-book-003');
    fireEvent.click(completeBtn);

    await waitFor(() => {
      expect(bookingService.updateStatus).toHaveBeenCalledWith('book-003', {
        status: 'COMPLETED',
        notes: 'Tour successfully completed',
      });
    });
  });

  it('opens guide assignment modal and assigns certified local guide', async () => {
    renderBookingsPage();

    const assignGuideBtn = await screen.findByTestId('assign-guide-btn-book-002');
    fireEvent.click(assignGuideBtn);

    expect(screen.getByTestId('assign-guide-modal')).toBeInTheDocument();

    const confirmBtn = screen.getByTestId('confirm-assign-guide-btn');
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(bookingService.updateStatus).toHaveBeenCalledWith('book-002', {
        status: 'CONFIRMED',
        notes: expect.stringContaining('Assigned certified local guide'),
      });
    });
  });

  it('opens booking detail modal with full fee and pricing breakdown', async () => {
    renderBookingsPage();

    const detailsBtn = await screen.findByTestId('view-booking-book-001');
    fireEvent.click(detailsBtn);

    expect(screen.getByTestId('booking-details-modal')).toBeInTheDocument();
    expect(screen.getByText(/Vegetarian meals, apiculture demonstration/i)).toBeInTheDocument();
    expect(screen.getByText(/Community Heritage Fund/i)).toBeInTheDocument();
  });
});
