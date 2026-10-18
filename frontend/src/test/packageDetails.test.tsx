import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ExperienceDetailsPage from '../pages/public/ExperienceDetailsPage';
import { tourismService } from '../features/tourism/tourismService';

const mockUkuliPackage = {
  id: '4f975073-0c71-450f-8a37-0a44d7f48d10',
  enterpriseId: 'c0000000-0000-0000-0000-000000000001',
  enterpriseName: 'Dimeka Agro Cooperative Union',
  name: 'Ukuli Bula Ceremony (Bull Jumping)',
  category: 'CULTURAL_EVENT',
  overview: 'Authentic rite-of-passage ceremony celebrating young men transitioning to adulthood with community blessings.',
  story: 'The Ukuli Bula ceremony is an ancient tradition of the Hamer people representing courage and community initiation.',
  locationText: 'Dimeka Sacred Grounds, South Omo',
  latitude: 5.1234,
  longitude: 36.5678,
  directions: 'Take the main Turmi-Dimeka road north for 15km; meet at the central community shade tree.',
  openingHours: '08:00 - 18:00',
  durationHours: 4,
  maxGroupSize: 15,
  priceAmount: 2000,
  priceUnit: 'PER_PERSON',
  currency: 'ETB',
  culturalRules: 'Dress modestly; always ask permission before taking close-up portraits. Maintain respectful silence during rituals.',
  safetyNotes: 'Bring sun protection, adequate drinking water, and closed walking shoes.',
  communityApprovalRef: 'CONSENT-OMO-2024-COMMUNITY',
  communityApprovalDate: '2026-09-18',
  isActive: true,
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

describe('Tour Package Detail (F-303)', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.restoreAllMocks();
    queryClient = createTestQueryClient();
  });

  it('renders all package fields: title, enterprise, duration, group size, hours, and formatted price', async () => {
    vi.spyOn(tourismService, 'getPackageById').mockResolvedValue(mockUkuliPackage);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[`/experiences/${mockUkuliPackage.id}`]}>
          <Routes>
            <Route path="/experiences/:id" element={<ExperienceDetailsPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Title & Enterprise
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(
      'Ukuli Bula Ceremony (Bull Jumping)'
    );
    expect(screen.getByText(/offered by dimeka agro cooperative union/i)).toBeInTheDocument();

    // Location
    expect(screen.getAllByText('Dimeka Sacred Grounds, South Omo').length).toBeGreaterThanOrEqual(1);

    // Summary strip
    expect(screen.getByText('4 Hours')).toBeInTheDocument();
    expect(screen.getByText('Max 15 Guests')).toBeInTheDocument();
    expect(screen.getByText('08:00 - 18:00')).toBeInTheDocument();

    // Overview & Story
    expect(screen.getByText(/authentic rite-of-passage ceremony/i)).toBeInTheDocument();
    expect(screen.getByText(/ancient tradition of the hamer people/i)).toBeInTheDocument();

    // Price
    expect(screen.getByText('2,000.00 ETB')).toBeInTheDocument();
    expect(screen.getByText('/person')).toBeInTheDocument();
  });

  it('prominently renders mandatory cultural rules & protocol', async () => {
    vi.spyOn(tourismService, 'getPackageById').mockResolvedValue(mockUkuliPackage);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[`/experiences/${mockUkuliPackage.id}`]}>
          <Routes>
            <Route path="/experiences/:id" element={<ExperienceDetailsPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    const culturalSection = await screen.findByTestId('cultural-rules-section');
    expect(culturalSection).toBeInTheDocument();
    expect(screen.getByText('Mandatory Cultural Rules & Protocol')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Dress modestly; always ask permission before taking close-up portraits. Maintain respectful silence during rituals.'
      )
    ).toBeInTheDocument();
  });

  it('renders safety notes, directions, and community consent references', async () => {
    vi.spyOn(tourismService, 'getPackageById').mockResolvedValue(mockUkuliPackage);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[`/experiences/${mockUkuliPackage.id}`]}>
          <Routes>
            <Route path="/experiences/:id" element={<ExperienceDetailsPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Safety notes
    expect(await screen.findByTestId('safety-notes-section')).toBeInTheDocument();
    expect(
      screen.getByText('Bring sun protection, adequate drinking water, and closed walking shoes.')
    ).toBeInTheDocument();

    // Directions
    expect(screen.getByTestId('location-directions-section')).toBeInTheDocument();
    expect(
      screen.getByText('Take the main Turmi-Dimeka road north for 15km; meet at the central community shade tree.')
    ).toBeInTheDocument();

    // Community consent
    expect(screen.getByTestId('community-approval-section')).toBeInTheDocument();
    expect(screen.getByText('CONSENT-OMO-2024-COMMUNITY')).toBeInTheDocument();
  });

  it('provides a prominent Book Experience CTA with correct packageId link', async () => {
    vi.spyOn(tourismService, 'getPackageById').mockResolvedValue(mockUkuliPackage);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[`/experiences/${mockUkuliPackage.id}`]}>
          <Routes>
            <Route path="/experiences/:id" element={<ExperienceDetailsPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    const bookLink = await screen.findByTestId('book-experience-button');
    expect(bookLink).toHaveAttribute('href', `/booking?packageId=${mockUkuliPackage.id}`);
    expect(screen.getByRole('button', { name: /book experience/i })).toBeInTheDocument();
  });

  it('renders error state with retry when package fetch fails', async () => {
    vi.spyOn(tourismService, 'getPackageById').mockRejectedValue(new Error('Package not found'));

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/experiences/non-existent-id']}>
          <Routes>
            <Route path="/experiences/:id" element={<ExperienceDetailsPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Experience Not Found')).toBeInTheDocument();
      expect(screen.getByText('Package not found')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /back to experiences/i })).toBeInTheDocument();
    });
  });
});
