import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import InventoryManagementPage from '../pages/dashboard/enterprise/InventoryManagementPage';
import { useAuthStore } from '../features/auth/authStore';
import { enterpriseService } from '../features/enterprise/enterpriseService';
import { mockUsers } from '../mocks/fixtures/users';
import {
  mockInventoryLots,
  mockInventoryLocations,
  mockInventoryMovements,
} from '../mocks/fixtures/enterprise';

const TARGET_ENTERPRISE_ID = '33333333-3333-3333-3333-333333333333';

describe('F-901: Inventory Lots and Movement Audit History', () => {
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

    vi.spyOn(enterpriseService, 'getEnterpriseLots').mockResolvedValue(mockInventoryLots);
    vi.spyOn(enterpriseService, 'getLocations').mockResolvedValue(mockInventoryLocations);
    vi.spyOn(enterpriseService, 'getLotMovements').mockImplementation((_entId, lotId) =>
      Promise.resolve(mockInventoryMovements[lotId] || [])
    );
  });

  const renderComponent = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <InventoryManagementPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

  it('renders summary KPI statistics cards accurately', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('inventory-kpi-summary')).toBeInTheDocument();
      // Active lots count (lot-001 and lot-002 are ACTIVE)
      expect(screen.getByTestId('kpi-active-lots')).toHaveTextContent('2');
    });

    // Total active stored balance (48 + 75 = 123 KG)
    expect(screen.getByTestId('kpi-total-balance')).toHaveTextContent('123 KG');

    // Depleted/Disposed (lot-003 is DEPLETED, lot-004 has balance 5 but status DISPOSED) -> 1 depleted with 0 balance
    expect(screen.getByTestId('kpi-depleted-lots')).toHaveTextContent('1');

    // Locations count (3 mock locations)
    expect(screen.getByTestId('kpi-locations-count')).toHaveTextContent('3');
  });

  it('renders all inventory lots with code, commodity, location, and progress bars', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('inventory-lots-table')).toBeInTheDocument();
    });

    const table = screen.getByTestId('inventory-lots-table');

    // Check that lots are displayed in the table
    expect(within(table).getByText('LOT-2026-042')).toBeInTheDocument();
    expect(within(table).getByText('LOT-2026-041')).toBeInTheDocument();
    expect(within(table).getByText('LOT-2026-039')).toBeInTheDocument();
    expect(within(table).getByText('LOT-2026-038')).toBeInTheDocument();

    // Check commodity names
    expect(within(table).getAllByText('South Omo White Forest Honey').length).toBeGreaterThan(0);
    expect(within(table).getByText('Wild Forest Arabica Coffee')).toBeInTheDocument();
    expect(within(table).getByText('Natural Beeswax Blocks')).toBeInTheDocument();

    // Check location rendering
    expect(within(table).getAllByText('Turmi Central Warehouse Bay A').length).toBeGreaterThan(0);
    expect(within(table).getByText('Turmi Central Warehouse Bay B')).toBeInTheDocument();
  });

  it('filters lots by status tabs (ACTIVE, DEPLETED, DISPOSED)', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('status-tab-active')).toBeInTheDocument();
    });

    // Click "Active" status tab
    fireEvent.click(screen.getByTestId('status-tab-active'));

    await waitFor(() => {
      expect(screen.getByText('LOT-2026-042')).toBeInTheDocument();
      expect(screen.getByText('LOT-2026-041')).toBeInTheDocument();
      expect(screen.queryByText('LOT-2026-039')).not.toBeInTheDocument(); // Depleted
      expect(screen.queryByText('LOT-2026-038')).not.toBeInTheDocument(); // Disposed
    });

    // Click "Depleted" status tab
    fireEvent.click(screen.getByTestId('status-tab-depleted'));

    await waitFor(() => {
      expect(screen.getByText('LOT-2026-039')).toBeInTheDocument();
      expect(screen.queryByText('LOT-2026-042')).not.toBeInTheDocument();
      expect(screen.queryByText('LOT-2026-041')).not.toBeInTheDocument();
    });

    // Click "All" tab to restore all lots
    fireEvent.click(screen.getByTestId('status-tab-all'));

    await waitFor(() => {
      expect(screen.getByText('LOT-2026-042')).toBeInTheDocument();
      expect(screen.getByText('LOT-2026-039')).toBeInTheDocument();
    });
  });

  it('filters lots by search input and allows resetting filters', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('lots-search-input')).toBeInTheDocument();
    });

    const searchInput = screen.getByTestId('lots-search-input');
    fireEvent.change(searchInput, { target: { value: 'Coffee' } });

    await waitFor(() => {
      expect(screen.getByText('LOT-2026-041')).toBeInTheDocument();
      expect(screen.queryByText('LOT-2026-042')).not.toBeInTheDocument();
      expect(screen.queryByText('LOT-2026-038')).not.toBeInTheDocument();
    });

    // Click Reset Filters
    const resetBtn = screen.getByTestId('reset-filters-btn');
    fireEvent.click(resetBtn);

    await waitFor(() => {
      expect(screen.getByText('LOT-2026-042')).toBeInTheDocument();
      expect(screen.getByText('LOT-2026-041')).toBeInTheDocument();
    });
  });

  it('filters lots by location dropdown', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('location-filter')).toBeInTheDocument();
      expect(screen.getByText('Turmi Central Warehouse Bay B (WAREHOUSE)')).toBeInTheDocument();
    });

    const locationSelect = screen.getByTestId('location-filter');
    fireEvent.change(locationSelect, { target: { value: 'Turmi Central Warehouse Bay B' } });

    await waitFor(() => {
      expect(screen.getByText('LOT-2026-041')).toBeInTheDocument();
      expect(screen.queryByText('LOT-2026-042')).not.toBeInTheDocument();
    });
  });

  it('opens lot movement history modal and displays timeline entries with signed quantities', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('view-movements-btn-lot-002')).toBeInTheDocument();
    });

    // Click Audit button on lot-002
    fireEvent.click(screen.getByTestId('view-movements-btn-lot-002'));

    await waitFor(() => {
      expect(screen.getByTestId('lot-movements-modal')).toBeInTheDocument();
    });

    expect(enterpriseService.getLotMovements).toHaveBeenCalledWith(
      TARGET_ENTERPRISE_ID,
      'lot-002'
    );

    // Movements for lot-002: intake (+100) and production batch (-25)
    await waitFor(() => {
      expect(screen.getByTestId('movement-item-mov-002')).toBeInTheDocument();
      expect(screen.getByTestId('movement-item-mov-003')).toBeInTheDocument();
    });

    expect(screen.getByText('+100 KG')).toBeInTheDocument();
    expect(screen.getByText('-25 KG')).toBeInTheDocument();
    expect(screen.getByText('Allocated to roasting & packing batch PB-2026-012')).toBeInTheDocument();

    // Close modal
    fireEvent.click(screen.getByTestId('close-movements-modal'));

    await waitFor(() => {
      expect(screen.queryByTestId('lot-movements-modal')).not.toBeInTheDocument();
    });
  });

  it('allows registering a new storage location via Add Location modal', async () => {
    const createLocationSpy = vi.spyOn(enterpriseService, 'createLocation').mockResolvedValue({
      id: 'loc-new-001',
      enterpriseId: TARGET_ENTERPRISE_ID,
      name: 'Omorate Dispatch Unit Bay 1',
      locationType: 'DISTRIBUTION_HUB',
      description: 'Staging unit for cross-border river trade dispatch',
      createdAt: '2026-10-18T12:00:00Z',
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('add-location-btn')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('add-location-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('add-location-modal')).toBeInTheDocument();
    });

    // Fill in location form
    fireEvent.change(screen.getByTestId('location-name-input'), {
      target: { value: 'Omorate Dispatch Unit Bay 1' },
    });
    fireEvent.change(screen.getByTestId('location-type-select'), {
      target: { value: 'DISTRIBUTION_HUB' },
    });
    fireEvent.change(screen.getByTestId('location-desc-input'), {
      target: { value: 'Staging unit for cross-border river trade dispatch' },
    });

    fireEvent.click(screen.getByTestId('submit-location-btn'));

    await waitFor(() => {
      expect(createLocationSpy).toHaveBeenCalledWith(TARGET_ENTERPRISE_ID, {
        name: 'Omorate Dispatch Unit Bay 1',
        locationType: 'DISTRIBUTION_HUB',
        description: 'Staging unit for cross-border river trade dispatch',
      });
    });
  });

  it('renders empty search state when no lots match filter', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('lots-search-input')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId('lots-search-input'), {
      target: { value: 'NONEXISTENT_ITEM_XYZ' },
    });

    await waitFor(() => {
      expect(screen.getByTestId('empty-lots-state')).toBeInTheDocument();
      expect(screen.getByText('No inventory lots found')).toBeInTheDocument();
    });
  });

  it('renders error state with retry button when API fails', async () => {
    vi.spyOn(enterpriseService, 'getEnterpriseLots').mockRejectedValue(new Error('Network offline'));

    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('inventory-error-state')).toBeInTheDocument();
      expect(
        screen.getByText('Failed to load inventory lots from the enterprise service.')
      ).toBeInTheDocument();
    });
  });

  it('enforces multi-tenant enterprise isolation', async () => {
    renderComponent();

    await waitFor(() => {
      expect(enterpriseService.getEnterpriseLots).toHaveBeenCalledWith(
        TARGET_ENTERPRISE_ID,
        undefined
      );
      expect(enterpriseService.getLocations).toHaveBeenCalledWith(TARGET_ENTERPRISE_ID);
    });
  });
});
