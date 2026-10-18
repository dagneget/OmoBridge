import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TransportPage from '../pages/public/TransportPage';
import { tourismService } from '../features/tourism/tourismService';
import type { TransportService } from '../types/api';

const mockTransports: TransportService[] = [
  {
    id: 'tr-1',
    serviceName: 'Jinka Airport to Turmi 4WD Express',
    vehicleType: '4WD Land Cruiser',
    routeDescription: 'Jinka Airport - Key Afer - Dimeka - Turmi',
    priceAmount: 4500,
    currency: 'ETB',
    contactPhone: '+251911445566',
    active: true,
    enterprise: {
      id: 'ent-1',
      name: 'South Omo Overland Transport Cooperative',
    },
  },
  {
    id: 'tr-2',
    serviceName: 'Key Afer Market Minibus Shuttle',
    vehicleType: 'Minibus',
    routeDescription: 'Jinka - Kakuta - Key Afer Market',
    priceAmount: 350,
    currency: 'ETB',
    contactPhone: '+251922334455',
    active: true,
    enterprise: {
      id: 'ent-2',
      name: 'Key Afer Community Transit',
    },
  },
  {
    id: 'tr-3',
    serviceName: 'Omo River Crossing Canoe & Motorboat',
    vehicleType: 'Boat',
    routeDescription: 'Murulle Riverbank - Dus Karo Village',
    priceAmount: 800,
    currency: 'ETB',
    contactPhone: '+251933556677',
    active: true,
    enterprise: {
      id: 'ent-3',
      name: 'Karo Community River Association',
    },
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

function renderTransportPage() {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <TransportPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('Transport services (F-306)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders transport options from the API with route, capacity, and price', async () => {
    vi.spyOn(tourismService, 'getTransportServices').mockResolvedValue(mockTransports);

    renderTransportPage();

    await waitFor(() => {
      expect(screen.getByText('Jinka Airport to Turmi 4WD Express')).toBeInTheDocument();
      expect(screen.getByText('Key Afer Market Minibus Shuttle')).toBeInTheDocument();
      expect(screen.getByText('Omo River Crossing Canoe & Motorboat')).toBeInTheDocument();
    });

    expect(screen.getByText(/Jinka Airport - Key Afer - Dimeka - Turmi/i)).toBeInTheDocument();
    expect(screen.getByText(/4 - 6 passengers/i)).toBeInTheDocument();
    expect(screen.getByTestId('price-tr-1')).toHaveTextContent('4,500.00 ETB');
    expect(screen.getByTestId('phone-link-tr-1')).toBeInTheDocument();
  });

  it('filters transport options by vehicle type chip', async () => {
    vi.spyOn(tourismService, 'getTransportServices').mockResolvedValue(mockTransports);

    renderTransportPage();

    await waitFor(() => {
      expect(screen.getByText('Jinka Airport to Turmi 4WD Express')).toBeInTheDocument();
    });

    // Click on 4WD filter
    fireEvent.click(screen.getByTestId('filter-vehicle-4wd'));

    expect(screen.getByText('Jinka Airport to Turmi 4WD Express')).toBeInTheDocument();
    expect(screen.queryByText('Key Afer Market Minibus Shuttle')).not.toBeInTheDocument();
    expect(screen.queryByText('Omo River Crossing Canoe & Motorboat')).not.toBeInTheDocument();

    // Click on Minibus filter
    fireEvent.click(screen.getByTestId('filter-vehicle-minibus'));

    expect(screen.queryByText('Jinka Airport to Turmi 4WD Express')).not.toBeInTheDocument();
    expect(screen.getByText('Key Afer Market Minibus Shuttle')).toBeInTheDocument();
  });

  it('filters transport services by route search keyword', async () => {
    vi.spyOn(tourismService, 'getTransportServices').mockResolvedValue(mockTransports);

    renderTransportPage();

    await waitFor(() => {
      expect(screen.getByText('Jinka Airport to Turmi 4WD Express')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search routes/i);
    fireEvent.change(searchInput, { target: { value: 'Murulle' } });

    expect(screen.getByText('Omo River Crossing Canoe & Motorboat')).toBeInTheDocument();
    expect(screen.queryByText('Jinka Airport to Turmi 4WD Express')).not.toBeInTheDocument();
  });

  it('renders loading skeleton when fetching', () => {
    vi.spyOn(tourismService, 'getTransportServices').mockReturnValue(new Promise(() => {}));

    renderTransportPage();

    expect(screen.getByTestId('transport-loading')).toBeInTheDocument();
  });

  it('renders error state and permits retry', async () => {
    const errorSpy = vi
      .spyOn(tourismService, 'getTransportServices')
      .mockRejectedValueOnce(new Error('Network connectivity lost'))
      .mockResolvedValueOnce(mockTransports);

    renderTransportPage();

    await waitFor(() => {
      expect(screen.getByTestId('transport-error')).toBeInTheDocument();
      expect(screen.getByText(/Network connectivity lost/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Retry Loading/i));

    await waitFor(() => {
      expect(screen.getByText('Jinka Airport to Turmi 4WD Express')).toBeInTheDocument();
    });

    expect(errorSpy).toHaveBeenCalledTimes(2);
  });

  it('renders empty state when no services match filter and resets', async () => {
    vi.spyOn(tourismService, 'getTransportServices').mockResolvedValue(mockTransports);

    renderTransportPage();

    await waitFor(() => {
      expect(screen.getByText('Jinka Airport to Turmi 4WD Express')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search routes/i);
    fireEvent.change(searchInput, { target: { value: 'NonexistentRouteXYZ' } });

    expect(screen.getByTestId('transport-empty')).toBeInTheDocument();
    expect(screen.getByText(/No transport options match your current route/i)).toBeInTheDocument();

    // Reset filters
    fireEvent.click(screen.getByTestId('reset-transport-filter'));

    expect(screen.getByText('Jinka Airport to Turmi 4WD Express')).toBeInTheDocument();
  });

  it('opens detail modal with operator contact and travel notes', async () => {
    vi.spyOn(tourismService, 'getTransportServices').mockResolvedValue(mockTransports);

    renderTransportPage();

    await waitFor(() => {
      expect(screen.getByTestId('view-transport-btn-tr-1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('view-transport-btn-tr-1'));

    expect(screen.getByTestId('transport-detail-modal')).toBeInTheDocument();
    expect(screen.getByText('South Omo Overland Transport Cooperative')).toBeInTheDocument();
    expect(screen.getByText(/Call Driver/i)).toBeInTheDocument();
    expect(screen.getByText(/South Omo Travel Advice/i)).toBeInTheDocument();
  });
});
