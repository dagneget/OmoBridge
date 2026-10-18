import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import HomePage from '../pages/public/HomePage';
import { tourismService } from '../features/tourism/tourismService';
import { queryKeys } from '../services/queryKeys';
import { LANGUAGE_STORAGE_KEY } from '../pages/account/AccountPage';

const mockSeedPackages = [
  {
    id: 'pkg-1',
    name: 'Ukuli Bula Ceremony (Bull Jumping)',
    category: 'CULTURAL_EVENT',
    overview: 'Authentic rite-of-passage ceremony celebrating young men transitioning to adulthood.',
    locationText: 'Dimeka Sacred Grounds',
    priceAmount: 2000,
    priceUnit: 'PER_PERSON',
    currency: 'ETB',
    durationHours: 4,
    isActive: true,
  },
  {
    id: 'pkg-2',
    name: 'Traditional Village Visit',
    category: 'VILLAGE_EXPERIENCE',
    overview: 'Immersive walking tour through a traditional Hamer village.',
    locationText: 'Turmi Vicinity',
    priceAmount: 500,
    priceUnit: 'PER_PERSON',
    currency: 'ETB',
    durationHours: 4,
    isActive: true,
  },
  {
    id: 'pkg-3',
    name: 'Village Camping',
    category: 'CAMPING',
    overview: 'Traditional eco-camping under the southern stars.',
    locationText: 'Keske River Camp',
    priceAmount: 800,
    priceUnit: 'PER_PERSON',
    currency: 'ETB',
    durationHours: 4,
    isActive: true,
  },
];

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: Infinity,
      },
    },
  });
}

describe('Home Page (F-301)', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    queryClient = createTestQueryClient();
  });

  it('renders hero, seed packages from API, and role registration cards', async () => {
    vi.spyOn(tourismService, 'getPackages').mockResolvedValue(mockSeedPackages);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/']}>
          <HomePage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Hero title & subtitle
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      /connecting rural producers & ethical travelers in south omo/i
    );
    expect(screen.getByText(/\*844#/i)).toBeInTheDocument();

    // Featured packages
    await waitFor(() => {
      expect(screen.getByText('Ukuli Bula Ceremony (Bull Jumping)')).toBeInTheDocument();
      expect(screen.getByText('Traditional Village Visit')).toBeInTheDocument();
      expect(screen.getByText('Village Camping')).toBeInTheDocument();
      expect(screen.getByText(/2,000.00 etb/i)).toBeInTheDocument();
    });

    // Links to tourism and products
    expect(screen.getByRole('link', { name: /explore tourism experiences/i })).toHaveAttribute(
      'href',
      '/tourism'
    );
    expect(screen.getByRole('link', { name: /shop agricultural goods/i })).toHaveAttribute(
      'href',
      '/products'
    );

    // Role links
    expect(screen.getByRole('link', { name: /join omobridge/i })).toHaveAttribute('href', '/join');
    expect(screen.getByText('Producers & Farmers')).toBeInTheDocument();
    expect(screen.getByText('Micro-Enterprises')).toBeInTheDocument();
    expect(screen.getByText('Delivery Couriers')).toBeInTheDocument();
    expect(screen.getByText('Certified Tour Guides')).toBeInTheDocument();
  });

  it('switches and persists language preference', async () => {
    vi.spyOn(tourismService, 'getPackages').mockResolvedValue(mockSeedPackages);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/']}>
          <HomePage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    const amharicBtn = screen.getByRole('button', { name: /አማርኛ/i });
    fireEvent.click(amharicBtn);

    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('am');
  });

  it('renders seed data from cache when network is offline after one visit', async () => {
    // Populate cache as if visited once
    queryClient.setQueryData(queryKeys.tourism.packages.list(), mockSeedPackages);

    // Simulate network offline/failure on subsequent call
    vi.spyOn(tourismService, 'getPackages').mockRejectedValue(new Error('Network error'));

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/']}>
          <HomePage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Should immediately display cached seed packages
    expect(screen.getByText('Ukuli Bula Ceremony (Bull Jumping)')).toBeInTheDocument();
    expect(screen.getByText('Traditional Village Visit')).toBeInTheDocument();
  });
});
