import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import HotelsPage from '../pages/public/HotelsPage';
import { tourismService } from '../features/tourism/tourismService';

const mockHotels = [
  {
    id: 'hotel-001',
    name: 'Buska Hotel',
    locationText: 'Turmi Center, near Keske River',
    priceFrom: 2500,
    currency: 'ETB',
    amenities: 'Free WiFi, Restaurant, Bar, AC, Cultural craft shop',
    contactPhone: '+251911223344',
    contactEmail: 'info@buskahotel.et',
    active: true,
  },
  {
    id: 'hotel-002',
    name: 'Green Resort',
    locationText: 'Jinka Foothills, South Omo',
    priceFrom: 1800,
    currency: 'ETB',
    amenities: 'Swimming Pool, Organic Garden Restaurant, 24/7 Security',
    contactPhone: '+251911334455',
    contactEmail: 'stay@greenresort.et',
    active: true,
  },
  {
    id: 'hotel-003',
    name: 'Paradise Lodge',
    locationText: 'Lake Chamo Ridge, Arba Minch',
    priceFrom: 3200,
    currency: 'ETB',
    amenities: 'Panoramic Lake View, Luxury Spa, Fine Dining, Conference Facilities',
    contactPhone: '+251911445566',
    contactEmail: 'booking@paradiselodge.et',
    active: true,
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

describe('Hotels and Resorts (F-305)', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.restoreAllMocks();
    queryClient = createTestQueryClient();
  });

  it('renders all hotels: Buska Hotel, Green Resort, Paradise Lodge with locations and starting rates', async () => {
    vi.spyOn(tourismService, 'getHotels').mockResolvedValue(mockHotels);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/hotels']}>
          <HotelsPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Hotel 1: Buska Hotel
    expect(await screen.findByText('Buska Hotel')).toBeInTheDocument();
    expect(screen.getByText('Turmi Center, near Keske River')).toBeInTheDocument();
    expect(screen.getByText('2,500.00 ETB')).toBeInTheDocument();
    expect(screen.getByText('+251911223344')).toBeInTheDocument();

    // Hotel 2: Green Resort
    expect(screen.getByText('Green Resort')).toBeInTheDocument();
    expect(screen.getByText('Jinka Foothills, South Omo')).toBeInTheDocument();
    expect(screen.getByText('1,800.00 ETB')).toBeInTheDocument();

    // Hotel 3: Paradise Lodge
    expect(screen.getByText('Paradise Lodge')).toBeInTheDocument();
    expect(screen.getByText('Lake Chamo Ridge, Arba Minch')).toBeInTheDocument();
    expect(screen.getByText('3,200.00 ETB')).toBeInTheDocument();
  });

  it('filters hotels by search keywords', async () => {
    vi.spyOn(tourismService, 'getHotels').mockResolvedValue(mockHotels);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/hotels']}>
          <HotelsPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(await screen.findByText('Buska Hotel')).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText(/search hotels, towns, amenities/i);
    fireEvent.change(searchInput, { target: { value: 'jinka' } });

    expect(screen.getByText('Green Resort')).toBeInTheDocument();
    expect(screen.queryByText('Buska Hotel')).not.toBeInTheDocument();
    expect(screen.queryByText('Paradise Lodge')).not.toBeInTheDocument();
  });

  it('opens hotel detail modal with map component, contact details, and amenities', async () => {
    vi.spyOn(tourismService, 'getHotels').mockResolvedValue(mockHotels);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/hotels']}>
          <HotelsPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(await screen.findByText('Buska Hotel')).toBeInTheDocument();

    const viewButton = screen.getByTestId('view-hotel-button-hotel-001');
    fireEvent.click(viewButton);

    const modal = await screen.findByTestId('hotel-detail-modal');
    expect(modal).toBeInTheDocument();
    expect(screen.getAllByText('info@buskahotel.et').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Cultural craft shop')).toBeInTheDocument();
    expect(screen.getByTestId('map-component')).toBeInTheDocument();
  });

  it('displays empty state and resets search when no match is found', async () => {
    vi.spyOn(tourismService, 'getHotels').mockResolvedValue(mockHotels);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/hotels']}>
          <HotelsPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(await screen.findByText('Buska Hotel')).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText(/search hotels, towns, amenities/i);
    fireEvent.change(searchInput, { target: { value: 'NonexistentHotel999' } });

    expect(screen.getByText('No accommodations found')).toBeInTheDocument();

    const resetBtn = screen.getByRole('button', { name: /reset search/i });
    fireEvent.click(resetBtn);

    expect(screen.getByText('Buska Hotel')).toBeInTheDocument();
  });

  it('displays error state with retry button when query fails', async () => {
    vi.spyOn(tourismService, 'getHotels').mockRejectedValue(new Error('Backend 500 error'));

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/hotels']}>
          <HotelsPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Could Not Load Hotel Listings')).toBeInTheDocument();
      expect(screen.getByText('Backend 500 error')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry loading/i })).toBeInTheDocument();
    });
  });
});
