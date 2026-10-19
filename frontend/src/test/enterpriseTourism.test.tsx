import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { useAuthStore } from '../features/auth/authStore';
import { tourismService } from '../features/tourism/tourismService';
import EnterpriseTourismPage from '../pages/dashboard/enterprise/EnterpriseTourismPage';
import { mockTourPackages } from '../mocks/fixtures/catalog';

const TARGET_ENTERPRISE_ID = '33333333-3333-3333-3333-333333333333';

function renderTourismPage() {
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
      <MemoryRouter initialEntries={['/dashboard/enterprise/tourism']}>
        <EnterpriseTourismPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('F-911: Cultural Tourism Experiences & Package Management', () => {
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

    vi.spyOn(tourismService, 'getEnterprisePackages').mockResolvedValue([
      { ...mockTourPackages[0], id: 'pack-001' },
      { ...mockTourPackages[1], id: 'pack-002' },
    ]);

    vi.spyOn(tourismService, 'createPackage').mockImplementation(async (_eid, req) => {
      return {
        id: 'pack-new-999',
        enterpriseId: TARGET_ENTERPRISE_ID,
        enterpriseName: 'South Omo Community Heritage Cooperative',
        name: req.name,
        category: req.category,
        overview: req.overview,
        story: req.story || '',
        locationText: req.locationText,
        durationHours: req.durationHours,
        maxGroupSize: req.maxGroupSize,
        priceAmount: req.priceAmount,
        priceUnit: req.priceUnit || 'PER_PERSON',
        currency: 'ETB',
        culturalRules: req.culturalRules || '',
        safetyNotes: req.safetyNotes || '',
        communityApprovalRef: req.communityApprovalRef || 'ELDERS-REF-01',
        isActive: req.isActive ?? true,
      };
    });

    vi.spyOn(tourismService, 'updatePackage').mockImplementation(async (_eid, id, req) => {
      const existing = mockTourPackages.find((p) => p.id === id);
      return {
        ...(existing || mockTourPackages[0]),
        ...req,
        id,
      };
    });

    vi.spyOn(tourismService, 'deletePackage').mockResolvedValue(undefined);
  });

  it('renders enterprise tourism page with active experiences and community approval badges', async () => {
    renderTourismPage();

    expect(await screen.findByTestId('packages-grid')).toBeInTheDocument();
    expect(screen.getByText('Mursi & Hamar Cultural Immersion')).toBeInTheDocument();
    expect(screen.getByText('Lower Omo River Birding & Flora')).toBeInTheDocument();
    expect(screen.getByTestId('kpi-total-packages')).toHaveTextContent('2');
  });

  it('filters packages by category tabs and search input', async () => {
    renderTourismPage();

    await screen.findByTestId('packages-grid');

    // Filter by ECO_TOUR
    fireEvent.click(screen.getByTestId('filter-cat-ECO_TOUR'));
    expect(screen.getByText('Lower Omo River Birding & Flora')).toBeInTheDocument();
    expect(screen.queryByText('Mursi & Hamar Cultural Immersion')).not.toBeInTheDocument();

    // Reset to ALL
    fireEvent.click(screen.getByTestId('filter-cat-ALL'));

    // Search query
    const searchInput = screen.getByTestId('search-packages-input');
    fireEvent.change(searchInput, { target: { value: 'Birding' } });
    expect(screen.getByText('Lower Omo River Birding & Flora')).toBeInTheDocument();
    expect(screen.queryByText('Mursi & Hamar Cultural Immersion')).not.toBeInTheDocument();
  });

  it('opens creation modal with cultural guidelines and submits new experience (B-303)', async () => {
    renderTourismPage();

    const createBtn = await screen.findByTestId('create-package-btn');
    fireEvent.click(createBtn);

    expect(screen.getByTestId('package-modal')).toBeInTheDocument();

    // Enter name & details
    const nameInput = screen.getByTestId('pkg-name-input');
    fireEvent.change(nameInput, { target: { value: 'Turmi Traditional Pottery Experience' } });

    const rulesInput = screen.getByTestId('pkg-rules-input');
    expect(rulesInput).toBeInTheDocument();
    fireEvent.change(rulesInput, {
      target: { value: 'Ask permission before photographing pottery masters; respectful attire required.' },
    });

    const submitBtn = screen.getByTestId('submit-pkg-btn');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(tourismService.createPackage).toHaveBeenCalledWith(
        TARGET_ENTERPRISE_ID,
        expect.objectContaining({
          name: 'Turmi Traditional Pottery Experience',
          culturalRules: 'Ask permission before photographing pottery masters; respectful attire required.',
        })
      );
    });

    expect(await screen.findByTestId('tourism-feedback-banner')).toBeInTheDocument();
  });

  it('opens edit modal and updates experience tariff and parameters', async () => {
    renderTourismPage();

    const editBtn = await screen.findByTestId('edit-pkg-pack-001');
    fireEvent.click(editBtn);

    expect(screen.getByTestId('package-modal')).toBeInTheDocument();

    const priceInput = screen.getByTestId('pkg-price-input');
    fireEvent.change(priceInput, { target: { value: '5200' } });

    const submitBtn = screen.getByTestId('submit-pkg-btn');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(tourismService.updatePackage).toHaveBeenCalledWith(
        TARGET_ENTERPRISE_ID,
        'pack-001',
        expect.objectContaining({
          priceAmount: 5200,
        })
      );
    });
  });

  it('deletes an experience package upon clicking delete button', async () => {
    renderTourismPage();

    const deleteBtn = await screen.findByTestId('delete-pkg-pack-002');
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(tourismService.deletePackage).toHaveBeenCalledWith(
        TARGET_ENTERPRISE_ID,
        'pack-002'
      );
    });
  });
});
