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
  mockReconciliationReports,
} from '../mocks/fixtures/enterprise';

const TARGET_ENTERPRISE_ID = '33333333-3333-3333-3333-333333333333';

describe('F-903: Inventory Reconciliation & Discrepancy Auditing', () => {
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
    vi.spyOn(enterpriseService, 'reconcileEnterpriseLots').mockResolvedValue(mockReconciliationReports);
  });

  const renderComponent = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <InventoryManagementPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

  it('switches to Reconciliation & Audit tab and renders summary KPIs', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('view-tab-reconciliation')).toBeInTheDocument();
    });

    // Discrepancy badge in tab header after data loads
    await waitFor(() => {
      expect(screen.getByTestId('badge-discrepancy-count')).toHaveTextContent('1 Alert');
    });

    // Click reconciliation view tab
    fireEvent.click(screen.getByTestId('view-tab-reconciliation'));

    await waitFor(() => {
      expect(screen.getByTestId('reconciliation-view')).toBeInTheDocument();
      expect(screen.getByTestId('reconciliation-kpis')).toBeInTheDocument();
    });

    // 4 audited lots in mock fixture
    expect(screen.getByTestId('kpi-audited-lots')).toHaveTextContent('4');
    // 3 perfectly balanced lots (lot-001, lot-002, lot-003)
    expect(screen.getByTestId('kpi-balanced-lots')).toHaveTextContent('3');
    // 1 discrepancy lot (lot-004 has stored 5 vs movement 10 -> variance -5)
    expect(screen.getByTestId('kpi-mismatches-count')).toHaveTextContent('1');
    expect(screen.getByTestId('kpi-net-variance')).toHaveTextContent('-5 KG');
  });

  it('displays the prominent discrepancy alert banner when a lot has balance variance', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('view-tab-reconciliation')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('view-tab-reconciliation'));

    await waitFor(() => {
      expect(screen.getByTestId('discrepancy-alert-banner')).toBeInTheDocument();
    });

    expect(
      screen.getByText(/1 inventory lot has a balance discrepancy between the recorded database stored balance/i)
    ).toBeInTheDocument();
  });

  it('flags balance mismatch with variance delta and status in the audit table', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('view-tab-reconciliation')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('view-tab-reconciliation'));

    await waitFor(() => {
      expect(screen.getByTestId('reconciliation-table')).toBeInTheDocument();
    });

    const table = screen.getByTestId('reconciliation-table');

    // Reconciled lots have "0 KG (Match)" and "Reconciled" status
    expect(within(table).getByText('LOT-2026-042')).toBeInTheDocument();
    expect(within(table).getAllByText('0 KG (Match)').length).toBeGreaterThan(0);

    // Mismatched lot-004 (LOT-2026-038)
    const mismatchedRow = screen.getByTestId('reconciliation-row-lot-004');
    expect(within(mismatchedRow).getByText('LOT-2026-038')).toBeInTheDocument();
    expect(within(mismatchedRow).getByText('5 KG')).toBeInTheDocument(); // Stored
    expect(within(mismatchedRow).getByText('10 KG')).toBeInTheDocument(); // Movement sum

    // Check discrepancy variance badge and status
    expect(screen.getByTestId('variance-alert-lot-004')).toHaveTextContent('-5 KG');
    expect(within(mismatchedRow).getByTestId('status-mismatch')).toHaveTextContent(
      'Discrepancy Detected'
    );
  });

  it('filters table to only show discrepancies when toggle is checked', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('view-tab-reconciliation')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('view-tab-reconciliation'));

    await waitFor(() => {
      expect(screen.getByTestId('filter-mismatches-only')).toBeInTheDocument();
    });

    // Check "Only Show Discrepancies"
    fireEvent.click(screen.getByTestId('filter-mismatches-only'));

    await waitFor(() => {
      // Discrepant lot is visible
      expect(screen.getByText('LOT-2026-038')).toBeInTheDocument();
      // Reconciled lots are hidden
      expect(screen.queryByText('LOT-2026-042')).not.toBeInTheDocument();
      expect(screen.queryByText('LOT-2026-041')).not.toBeInTheDocument();
    });
  });

  it('allows searching reconciliation reports by lot code or note', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('view-tab-reconciliation')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('view-tab-reconciliation'));

    await waitFor(() => {
      expect(screen.getByTestId('reconciliation-search-input')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId('reconciliation-search-input'), {
      target: { value: 'LOT-2026-041' },
    });

    await waitFor(() => {
      expect(screen.getByText('LOT-2026-041')).toBeInTheDocument();
      expect(screen.queryByText('LOT-2026-042')).not.toBeInTheDocument();
      expect(screen.queryByText('LOT-2026-038')).not.toBeInTheDocument();
    });
  });

  it('opens quick adjustment modal with discrepancy amount for mismatched lot', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('view-tab-reconciliation')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('view-tab-reconciliation'));

    await waitFor(() => {
      expect(screen.getByTestId('reconcile-adjust-btn-lot-004')).toBeInTheDocument();
    });

    // Click "Adjust" button on the discrepant lot row
    fireEvent.click(screen.getByTestId('reconcile-adjust-btn-lot-004'));

    await waitFor(() => {
      expect(screen.getByTestId('adjust-lot-modal')).toBeInTheDocument();
    });

    // Prefilled adjustment quantity is 5 (absolute delta)
    expect(screen.getByTestId('adjust-quantity-input')).toHaveValue(5);
    // Prefilled reason contains discrepancy note
    expect(screen.getByTestId('adjust-reason-input')).toHaveValue(
      'Reconciliation variance correction: discrepancy of -5 KG'
    );
  });

  it('opens movement audit modal from reconciliation row', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('view-tab-reconciliation')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('view-tab-reconciliation'));

    await waitFor(() => {
      expect(screen.getByTestId('audit-movements-btn-lot-001')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('audit-movements-btn-lot-001'));

    await waitFor(() => {
      expect(screen.getByTestId('lot-movements-modal')).toBeInTheDocument();
    });

    expect(enterpriseService.getLotMovements).toHaveBeenCalledWith(
      TARGET_ENTERPRISE_ID,
      'lot-001'
    );
  });

  it('renders error state when reconciliation API fails', async () => {
    vi.spyOn(enterpriseService, 'reconcileEnterpriseLots').mockRejectedValue(
      new Error('Reconciliation service unavailable')
    );

    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('view-tab-reconciliation')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('view-tab-reconciliation'));

    await waitFor(() => {
      expect(screen.getByTestId('reconciliation-error')).toBeInTheDocument();
      expect(screen.getByText('Failed to load reconciliation audit report.')).toBeInTheDocument();
    });
  });
});
