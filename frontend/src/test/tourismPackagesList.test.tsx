import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TourismPage from '../pages/public/TourismPage';
import { tourismService } from '../features/tourism/tourismService';

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
    maxGroupSize: 15,
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
    maxGroupSize: 10,
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
    maxGroupSize: 8,
    isActive: true,
  },
  {
    id: 'pkg-4',
    name: 'Evangadi Dance Ceremony',
    category: 'DANCE_MUSIC',
    overview: 'Evening moonlight dance celebrating unity and traditional social bonds.',
    locationText: 'Turmi Cultural Grounds',
    priceAmount: 100,
    priceUnit: 'PER_PERSON',
    currency: 'ETB',
    durationHours: 4,
    maxGroupSize: 30,
    isActive: true,
  },
  {
    id: 'pkg-5',
    name: 'Long Hike with Local Guide',
    category: 'TREKKING',
    overview: 'Scenic trekking excursion across South Omo river valleys.',
    locationText: 'South Omo Trails',
    priceAmount: 2000,
    priceUnit: 'PER_PERSON',
    currency: 'ETB',
    durationHours: 6,
    maxGroupSize: 6,
    isActive: true,
  },
  {
    id: 'pkg-6',
    name: 'Cow Bleeding Ceremony',
    category: 'CULTURAL_EVENT',
    overview: 'Traditional pastoralist demonstration of non-lethal blood harvesting.',
    locationText: 'Karo Rangelands',
    priceAmount: 1000,
    priceUnit: 'PER_PERSON',
    currency: 'ETB',
    durationHours: 3,
    maxGroupSize: 10,
    isActive: true,
  },
  {
    id: 'pkg-7',
    name: 'Cultural Photography Experience',
    category: 'PHOTOGRAPHY',
    overview: 'Ethical photography session respecting community dignity.',
    locationText: 'Lower Omo Corridor',
    priceAmount: 1500,
    priceUnit: 'PER_PERSON',
    currency: 'ETB',
    durationHours: 4,
    maxGroupSize: 5,
    isActive: true,
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

describe('Tourism Service Packages List (F-302)', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.restoreAllMocks();
    queryClient = createTestQueryClient();
  });

  it('renders all 7 seed packages with name, category, and formatted price with unit', async () => {
    vi.spyOn(tourismService, 'getPackages').mockResolvedValue(mockSeedPackages);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/tourism']}>
          <TourismPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(await screen.findByText('Ukuli Bula Ceremony (Bull Jumping)')).toBeInTheDocument();
    expect(screen.getAllByText(/2,000.00 etb/i).length).toBeGreaterThanOrEqual(1);

    // 2. Traditional Village Visit
    expect(screen.getByText('Traditional Village Visit')).toBeInTheDocument();
    expect(screen.getByText(/^500\.00 etb/i)).toBeInTheDocument();

    // 3. Village Camping
    expect(screen.getByText('Village Camping')).toBeInTheDocument();
    expect(screen.getByText(/^800\.00 etb/i)).toBeInTheDocument();

    // 4. Evangadi Dance
    expect(screen.getByText('Evangadi Dance Ceremony')).toBeInTheDocument();
    expect(screen.getByText(/^100\.00 etb/i)).toBeInTheDocument();

    // 5. Long Hike with Local Guide
    expect(screen.getByText('Long Hike with Local Guide')).toBeInTheDocument();

    // 6. Cow Bleeding Ceremony
    expect(screen.getByText('Cow Bleeding Ceremony')).toBeInTheDocument();
    expect(screen.getByText(/^1,000\.00 etb/i)).toBeInTheDocument();

    // 7. Cultural Photography
    expect(screen.getByText('Cultural Photography Experience')).toBeInTheDocument();
    expect(screen.getByText(/^1,500\.00 etb/i)).toBeInTheDocument();
  });

  it('filters packages when clicking category tabs', async () => {
    vi.spyOn(tourismService, 'getPackages').mockResolvedValue(mockSeedPackages);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/tourism']}>
          <TourismPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Ukuli Bula Ceremony (Bull Jumping)')).toBeInTheDocument();
    });

    // Click Eco-Camping tab
    const campingTab = screen.getByRole('tab', { name: /eco-camping/i });
    fireEvent.click(campingTab);

    // Camping package visible, others hidden
    expect(screen.getByText('Village Camping')).toBeInTheDocument();
    expect(screen.queryByText('Ukuli Bula Ceremony (Bull Jumping)')).not.toBeInTheDocument();
    expect(screen.queryByText('Traditional Village Visit')).not.toBeInTheDocument();

    // Click Trekking tab
    const trekkingTab = screen.getByRole('tab', { name: /trekking & hiking/i });
    fireEvent.click(trekkingTab);

    expect(screen.getByText('Long Hike with Local Guide')).toBeInTheDocument();
    expect(screen.queryByText('Village Camping')).not.toBeInTheDocument();
  });

  it('filters packages using search bar', async () => {
    vi.spyOn(tourismService, 'getPackages').mockResolvedValue(mockSeedPackages);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/tourism']}>
          <TourismPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Ukuli Bula Ceremony (Bull Jumping)')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search ceremonies, hikes, villages/i);
    fireEvent.change(searchInput, { target: { value: 'evangadi' } });

    expect(screen.getByText('Evangadi Dance Ceremony')).toBeInTheDocument();
    expect(screen.queryByText('Ukuli Bula Ceremony (Bull Jumping)')).not.toBeInTheDocument();
  });

  it('displays empty state and resets filters when no match found', async () => {
    vi.spyOn(tourismService, 'getPackages').mockResolvedValue(mockSeedPackages);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/tourism']}>
          <TourismPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Ukuli Bula Ceremony (Bull Jumping)')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search ceremonies, hikes, villages/i);
    fireEvent.change(searchInput, { target: { value: 'NonexistentSearchQuery123' } });

    expect(screen.getByText(/no packages match your search/i)).toBeInTheDocument();

    const resetBtn = screen.getByRole('button', { name: /reset filters/i });
    fireEvent.click(resetBtn);

    expect(screen.getByText('Ukuli Bula Ceremony (Bull Jumping)')).toBeInTheDocument();
  });

  it('displays error alert with retry button when API fails', async () => {
    vi.spyOn(tourismService, 'getPackages').mockRejectedValue(new Error('Failed to load packages'));

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/tourism']}>
          <TourismPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/could not load tour packages/i)).toBeInTheDocument();
      expect(screen.getByText(/failed to load packages/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry loading/i })).toBeInTheDocument();
    });
  });
});
