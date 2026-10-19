import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import FarmersManagementPage from '../pages/dashboard/enterprise/FarmersManagementPage';
import { useAuthStore } from '../features/auth/authStore';
import { enterpriseService } from '../features/enterprise/enterpriseService';
import { mockUsers } from '../mocks/fixtures/users';
import {
  mockEnterpriseFarmers,
  mockFarmerBalanceSummary,
} from '../mocks/fixtures/enterprise';
import type { FarmerResponse } from '../types/api';

const TARGET_ENTERPRISE_ID = '33333333-3333-3333-3333-333333333333';
const OTHER_ENTERPRISE_ID = '99999999-9999-9999-9999-999999999999';

describe('Farmers Management & Enterprise Isolation (F-802)', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.restoreAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
      },
    });

    useAuthStore.setState({
      user: {
        ...mockUsers.enterprise,
        enterpriseId: TARGET_ENTERPRISE_ID,
        enterpriseName: 'South Omo Community Heritage Cooperative',
        roles: ['MICRO_ENTERPRISE'],
      },
      token: 'mock-enterprise-token',
      isAuthenticated: true,
      activeRole: 'MICRO_ENTERPRISE',
    });

    vi.spyOn(enterpriseService, 'getEnterpriseFarmers').mockResolvedValue(mockEnterpriseFarmers);
    vi.spyOn(enterpriseService, 'getFarmerBalance').mockResolvedValue(mockFarmerBalanceSummary);
    vi.spyOn(enterpriseService, 'approveFarmer').mockImplementation(async (_, farmerId) => {
      const match = mockEnterpriseFarmers.find((f) => f.id === farmerId) || mockEnterpriseFarmers[0];
      return { ...match, verificationStatus: 'VERIFIED' };
    });
    vi.spyOn(enterpriseService, 'rejectFarmer').mockImplementation(async (_, farmerId) => {
      const match = mockEnterpriseFarmers.find((f) => f.id === farmerId) || mockEnterpriseFarmers[0];
      return { ...match, verificationStatus: 'REJECTED' };
    });
    vi.spyOn(enterpriseService, 'linkFarmer').mockImplementation(async (_, farmerId) => {
      return {
        id: farmerId,
        enterpriseId: TARGET_ENTERPRISE_ID,
        fullName: 'Newly Linked Smallholder',
        farmerCode: 'FRM-NEW-099',
        verificationStatus: 'VERIFIED',
      };
    });
  });

  const renderPage = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/dashboard/enterprise/farmers']}>
          <FarmersManagementPage />
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  it('renders enterprise header with scoped name and breadcrumb link', async () => {
    renderPage();

    expect(await screen.findByText(/Affiliated Farmers/i)).toBeInTheDocument();
    expect(screen.getByText(/South Omo Community Heritage Cooperative/i)).toBeInTheDocument();
    expect(screen.getByText(/Enterprise Hub/i)).toBeInTheDocument();
  });

  it('renders farmer roster with member codes, locations, and verification status', async () => {
    renderPage();

    expect(await screen.findByTestId('farmers-table')).toBeInTheDocument();
    expect(screen.getByText(/Alemayehu Haile/i)).toBeInTheDocument();
    expect(screen.getByText(/FRM-OMO-001/i)).toBeInTheDocument();
    expect(screen.getByText(/Keske Village/i)).toBeInTheDocument();
    expect(screen.getByText(/Wale Guyo/i)).toBeInTheDocument();
  });

  it('strictly isolates farmers and NEVER renders farmers belonging to a different enterprise', async () => {
    const mixedFarmers: FarmerResponse[] = [
      ...mockEnterpriseFarmers,
      {
        id: 'foreign-farmer-999',
        enterpriseId: OTHER_ENTERPRISE_ID,
        fullName: 'Intruder Foreign Farmer',
        farmerCode: 'FRM-FOREIGN-999',
        verificationStatus: 'VERIFIED',
      },
    ];

    vi.spyOn(enterpriseService, 'getEnterpriseFarmers').mockResolvedValue(mixedFarmers);

    renderPage();

    expect(await screen.findByText(/Alemayehu Haile/i)).toBeInTheDocument();
    // Foreign farmer must NOT appear in the UI
    expect(screen.queryByText(/Intruder Foreign Farmer/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/FRM-FOREIGN-999/i)).not.toBeInTheDocument();
  });

  it('filters farmers by search query (name, code, village)', async () => {
    renderPage();

    expect(await screen.findByText(/Alemayehu Haile/i)).toBeInTheDocument();
    expect(screen.getByText(/Wale Guyo/i)).toBeInTheDocument();

    const searchInput = screen.getByTestId('farmer-search-input');
    fireEvent.change(searchInput, { target: { value: 'FRM-OMO-001' } });

    expect(screen.getByText(/Alemayehu Haile/i)).toBeInTheDocument();
    expect(screen.queryByText(/Wale Guyo/i)).not.toBeInTheDocument();
  });

  it('filters by status tabs (e.g. Pending Approvals)', async () => {
    renderPage();

    expect(await screen.findByText(/Alemayehu Haile/i)).toBeInTheDocument();

    const pendingTab = screen.getByRole('button', { name: /Pending \(1\)/i });
    fireEvent.click(pendingTab);

    // Wale Guyo is PENDING
    expect(screen.getByText(/Wale Guyo/i)).toBeInTheDocument();
    // Alemayehu Haile is VERIFIED so should not be in the pending list
    expect(screen.queryByText(/Alemayehu Haile/i)).not.toBeInTheDocument();
  });

  it('allows approving a pending farmer', async () => {
    renderPage();

    // Wale Guyo has ID 'farmer-uuid-002' and status PENDING
    const approveBtn = await screen.findByTestId('approve-farmer-farmer-uuid-002');
    fireEvent.click(approveBtn);

    await waitFor(() => {
      expect(enterpriseService.approveFarmer).toHaveBeenCalledWith(
        TARGET_ENTERPRISE_ID,
        'farmer-uuid-002'
      );
    });

    expect(await screen.findByText(/approved successfully/i)).toBeInTheDocument();
  });

  it('allows rejecting a pending farmer', async () => {
    renderPage();

    const rejectBtn = await screen.findByTestId('reject-farmer-farmer-uuid-002');
    fireEvent.click(rejectBtn);

    await waitFor(() => {
      expect(enterpriseService.rejectFarmer).toHaveBeenCalledWith(
        TARGET_ENTERPRISE_ID,
        'farmer-uuid-002'
      );
    });

    expect(await screen.findByText(/rejected\/suspended/i)).toBeInTheDocument();
  });

  it('opens farmer details modal and shows balance summary numbers', async () => {
    renderPage();

    const detailsBtn = await screen.findByTestId('view-farmer-22222222-2222-2222-2222-222222222222');
    fireEvent.click(detailsBtn);

    expect(await screen.findByTestId('farmer-detail-modal')).toBeInTheDocument();
    expect(enterpriseService.getFarmerBalance).toHaveBeenCalledWith('22222222-2222-2222-2222-222222222222');

    // Financial balance figures should be visible
    expect(await screen.findByText(/45,000.00 ETB/i)).toBeInTheDocument();
    expect(screen.getByText(/38,000.00 ETB/i)).toBeInTheDocument();
    expect(screen.getByText(/7,000.00 ETB/i)).toBeInTheDocument();
  });

  it('opens link modal and submits link mutation', async () => {
    renderPage();

    const openLinkBtn = await screen.findByTestId('link-farmer-button');
    fireEvent.click(openLinkBtn);

    expect(await screen.findByTestId('link-farmer-modal')).toBeInTheDocument();

    const input = screen.getByTestId('link-farmer-input');
    fireEvent.change(input, { target: { value: 'farmer-external-123' } });

    const submitBtn = screen.getByTestId('confirm-link-button');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(enterpriseService.linkFarmer).toHaveBeenCalledWith(
        TARGET_ENTERPRISE_ID,
        'farmer-external-123'
      );
    });

    expect(await screen.findByText(/linked successfully/i)).toBeInTheDocument();
  });

  it('handles query error and displays retry button', async () => {
    vi.spyOn(enterpriseService, 'getEnterpriseFarmers').mockRejectedValue(new Error('Network error'));
    renderPage();

    expect(await screen.findByText(/Unable to load farmers roster/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
  });
});
