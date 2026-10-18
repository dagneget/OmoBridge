import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import GuidesPage from '../pages/public/GuidesPage';
import { tourismService } from '../features/tourism/tourismService';
import type { GuideResponse } from '../types/api';

const mockGuides: GuideResponse[] = [
  {
    id: 'guide-1',
    userId: 'user-1',
    fullName: 'Arsho Kula',
    phoneNumber: '+251911223344',
    licenseNumber: 'GUIDE-OMO-2024-001',
    bio: 'Born in Turmi with 10 years of guiding cultural ceremonies and bull jumping rites.',
    languages: ['English', 'Amharic', 'Hamer-Banna'],
    specialties: 'Bull jumping ceremonies, Hamar village homestays',
    dailyRate: 2000,
    currency: 'ETB',
    verificationStatus: 'VERIFIED',
    isAvailable: true,
  },
  {
    id: 'guide-2',
    userId: 'user-2',
    fullName: 'Ginfa Basha',
    phoneNumber: '+251922334455',
    licenseNumber: 'GUIDE-OMO-2024-002',
    bio: 'Karo river specialist expert in body painting art and Omo river crossings.',
    languages: ['English', 'Karo', 'Amharic'],
    specialties: 'Body painting traditions, landscape photography',
    dailyRate: 2500,
    currency: 'ETB',
    verificationStatus: 'VERIFIED',
    isAvailable: false,
  },
  {
    id: 'guide-unapproved-pending',
    userId: 'user-3',
    fullName: 'Unapproved Pending Guide',
    phoneNumber: '+251933445566',
    licenseNumber: 'GUIDE-PENDING-999',
    languages: ['English'],
    dailyRate: 1500,
    verificationStatus: 'PENDING',
    isAvailable: true,
  },
  {
    id: 'guide-unapproved-rejected',
    userId: 'user-4',
    fullName: 'Rejected Guide Applicant',
    phoneNumber: '+251944556677',
    licenseNumber: 'GUIDE-REJ-000',
    languages: ['English'],
    dailyRate: 1000,
    verificationStatus: 'REJECTED',
    isAvailable: true,
  },
  {
    id: 'guide-unapproved-suspended',
    userId: 'user-5',
    fullName: 'Suspended Guide Account',
    phoneNumber: '+251955667788',
    licenseNumber: 'GUIDE-SUSP-111',
    languages: ['English'],
    dailyRate: 1800,
    verificationStatus: 'SUSPENDED',
    isAvailable: true,
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

function renderGuidesPage() {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <GuidesPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('Local guides (F-307)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('strictly filters out all unapproved guides (PENDING, REJECTED, SUSPENDED)', async () => {
    vi.spyOn(tourismService, 'getGuides').mockResolvedValue(mockGuides);

    renderGuidesPage();

    await waitFor(() => {
      expect(screen.getByText('Arsho Kula')).toBeInTheDocument();
      expect(screen.getByText('Ginfa Basha')).toBeInTheDocument();
    });

    // Verify unapproved guides NEVER appear
    expect(screen.queryByText('Unapproved Pending Guide')).not.toBeInTheDocument();
    expect(screen.queryByText('Rejected Guide Applicant')).not.toBeInTheDocument();
    expect(screen.queryByText('Suspended Guide Account')).not.toBeInTheDocument();
  });

  it('renders verified guides with language pills, license, rate, and availability', async () => {
    vi.spyOn(tourismService, 'getGuides').mockResolvedValue(mockGuides);

    renderGuidesPage();

    await waitFor(() => {
      expect(screen.getByText('Arsho Kula')).toBeInTheDocument();
    });

    expect(screen.getByText('License: GUIDE-OMO-2024-001')).toBeInTheDocument();
    expect(screen.getAllByText('Hamer-Banna').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByTestId('daily-rate-guide-1')).toHaveTextContent('2,000.00 ETB');
    expect(screen.getByText('Available')).toBeInTheDocument();
    expect(screen.getByText('On Tour')).toBeInTheDocument();
  });

  it('filters guides by language chip', async () => {
    vi.spyOn(tourismService, 'getGuides').mockResolvedValue(mockGuides);

    renderGuidesPage();

    await waitFor(() => {
      expect(screen.getByText('Arsho Kula')).toBeInTheDocument();
      expect(screen.getByText('Ginfa Basha')).toBeInTheDocument();
    });

    // Filter by Karo language
    fireEvent.click(screen.getByTestId('filter-language-karo'));

    expect(screen.getByText('Ginfa Basha')).toBeInTheDocument();
    expect(screen.queryByText('Arsho Kula')).not.toBeInTheDocument();

    // Filter by Hamer-Banna
    fireEvent.click(screen.getByTestId('filter-language-hamer-banna'));

    expect(screen.getByText('Arsho Kula')).toBeInTheDocument();
    expect(screen.queryByText('Ginfa Basha')).not.toBeInTheDocument();
  });

  it('filters guides by availability toggle', async () => {
    vi.spyOn(tourismService, 'getGuides').mockResolvedValue(mockGuides);

    renderGuidesPage();

    await waitFor(() => {
      expect(screen.getByText('Arsho Kula')).toBeInTheDocument();
      expect(screen.getByText('Ginfa Basha')).toBeInTheDocument();
    });

    // Toggle only available
    fireEvent.click(screen.getByTestId('toggle-availability'));

    expect(screen.getByText('Arsho Kula')).toBeInTheDocument();
    expect(screen.queryByText('Ginfa Basha')).not.toBeInTheDocument();
  });

  it('filters guides by search keyword', async () => {
    vi.spyOn(tourismService, 'getGuides').mockResolvedValue(mockGuides);

    renderGuidesPage();

    await waitFor(() => {
      expect(screen.getByText('Arsho Kula')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search guides by name/i);
    fireEvent.change(searchInput, { target: { value: 'photography' } });

    expect(screen.getByText('Ginfa Basha')).toBeInTheDocument();
    expect(screen.queryByText('Arsho Kula')).not.toBeInTheDocument();
  });

  it('renders loading skeleton when fetching', () => {
    vi.spyOn(tourismService, 'getGuides').mockReturnValue(new Promise(() => {}));

    renderGuidesPage();

    expect(screen.getByTestId('guides-loading')).toBeInTheDocument();
  });

  it('renders error state and permits retry', async () => {
    const errorSpy = vi
      .spyOn(tourismService, 'getGuides')
      .mockRejectedValueOnce(new Error('Failed to load certified guides'))
      .mockResolvedValueOnce(mockGuides);

    renderGuidesPage();

    await waitFor(() => {
      expect(screen.getByTestId('guides-error')).toBeInTheDocument();
      expect(screen.getByText(/Failed to load certified guides/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Retry Loading/i));

    await waitFor(() => {
      expect(screen.getByText('Arsho Kula')).toBeInTheDocument();
    });

    expect(errorSpy).toHaveBeenCalledTimes(2);
  });

  it('renders empty state when no verified guides match search and resets filters', async () => {
    vi.spyOn(tourismService, 'getGuides').mockResolvedValue(mockGuides);

    renderGuidesPage();

    await waitFor(() => {
      expect(screen.getByText('Arsho Kula')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search guides by name/i);
    fireEvent.change(searchInput, { target: { value: 'NonexistentGuideXYZ' } });

    expect(screen.getByTestId('guides-empty')).toBeInTheDocument();
    expect(screen.getByText(/No verified guides match your current search/i)).toBeInTheDocument();

    // Reset filters
    fireEvent.click(screen.getByTestId('reset-guides-filters'));

    expect(screen.getByText('Arsho Kula')).toBeInTheDocument();
  });

  it('opens guide profile modal with bio, accreditation, and direct dispatch', async () => {
    vi.spyOn(tourismService, 'getGuides').mockResolvedValue(mockGuides);

    renderGuidesPage();

    await waitFor(() => {
      expect(screen.getByTestId('view-guide-btn-guide-1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('view-guide-btn-guide-1'));

    expect(screen.getByTestId('guide-detail-modal')).toBeInTheDocument();
    expect(
      screen.getByText(/Born in Turmi with 10 years of guiding cultural ceremonies/i)
    ).toBeInTheDocument();
    expect(screen.getByText('GUIDE-OMO-2024-001')).toBeInTheDocument();
    expect(screen.getByText(/Call Guide/i)).toBeInTheDocument();
  });
});
