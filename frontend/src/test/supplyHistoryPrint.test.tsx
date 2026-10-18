import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SupplyIntakePage from '../pages/dashboard/enterprise/SupplyIntakePage';
import { useAuthStore } from '../features/auth/authStore';
import { enterpriseService } from '../features/enterprise/enterpriseService';
import { mockUsers } from '../mocks/fixtures/users';
import {
  mockDeliveries,
  mockEnterpriseFarmers,
  mockProductTypes,
} from '../mocks/fixtures/enterprise';

const TARGET_ENTERPRISE_ID = '33333333-3333-3333-3333-333333333333';

describe('F-809: Searchable Supply History & Printable Intake Receipt', () => {
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

    vi.spyOn(enterpriseService, 'getEnterpriseDeliveries').mockResolvedValue(mockDeliveries);
    vi.spyOn(enterpriseService, 'getEnterpriseFarmers').mockResolvedValue(mockEnterpriseFarmers);
    vi.spyOn(enterpriseService, 'getProductTypes').mockResolvedValue(mockProductTypes);
  });

  const renderComponent = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <SupplyIntakePage />
        </MemoryRouter>
      </QueryClientProvider>
    );

  it('renders summary statistics tiles for filtered supply deliveries', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('supply-stats-summary')).toBeInTheDocument();
      expect(screen.getByTestId('stats-total-deliveries')).toHaveTextContent(String(mockDeliveries.length));
    });

    expect(screen.getByTestId('stats-total-weight')).toBeInTheDocument();
    expect(screen.getByTestId('stats-awaiting-count')).toBeInTheDocument();
    expect(screen.getByTestId('stats-inspected-count')).toBeInTheDocument();
  });

  it('filters supply history by commodity type dropdown', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('DEL-2026-0001')).toBeInTheDocument();
      expect(screen.getByText('DEL-2026-0002')).toBeInTheDocument();
    });

    const commoditySelect = screen.getByTestId('filter-commodity');
    // Filter by honey product type
    fireEvent.change(commoditySelect, { target: { value: 'pt-honey-001' } });

    // DEL-2026-0001 has Honey
    expect(screen.getByText('DEL-2026-0001')).toBeInTheDocument();

    // Check reset filters button appears
    expect(screen.getByTestId('reset-filters-btn')).toBeInTheDocument();
  });

  it('filters supply history by farmer supplier dropdown', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('DEL-2026-0001')).toBeInTheDocument();
      expect(screen.getByText('DEL-2026-0002')).toBeInTheDocument();
    });

    const farmerSelect = screen.getByTestId('filter-farmer');
    // Filter by Alemayehu Haile
    fireEvent.change(farmerSelect, {
      target: { value: '22222222-2222-2222-2222-222222222222' },
    });

    expect(screen.getByText('DEL-2026-0001')).toBeInTheDocument();
    expect(screen.queryByText('DEL-2026-0002')).not.toBeInTheDocument();
  });

  it('resets all filters when clicking Reset Filters button', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('DEL-2026-0001')).toBeInTheDocument();
    });

    const searchInput = screen.getByTestId('deliveries-search-input');
    fireEvent.change(searchInput, { target: { value: 'Boko' } });

    expect(screen.queryByText('DEL-2026-0001')).not.toBeInTheDocument();
    expect(screen.getByText('DEL-2026-0002')).toBeInTheDocument();

    const resetBtn = screen.getByTestId('reset-filters-btn');
    fireEvent.click(resetBtn);

    await waitFor(() => {
      expect(screen.getByText('DEL-2026-0001')).toBeInTheDocument();
      expect(screen.getByText('DEL-2026-0002')).toBeInTheDocument();
    });
  });

  it('opens printable receipt layout with official letterhead, signatures, and triggers window.print', async () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('DEL-2026-0001')).toBeInTheDocument();
    });

    // Click direct print slip button on row
    const printSlipBtn = screen.getByTestId('print-slip-btn-del-001');
    fireEvent.click(printSlipBtn);

    // Verify printable slip elements
    await waitFor(() => {
      const modal = screen.getByTestId('delivery-receipt-modal');
      expect(modal).toBeInTheDocument();
      expect(within(modal).getByText('Official Harvest Intake Receipt')).toBeInTheDocument();
      expect(within(modal).getByTestId('receipt-number')).toHaveTextContent('DEL-2026-0001');
      expect(within(modal).getByRole('heading', { level: 3, name: /South Omo Community Heritage Cooperative/i })).toBeInTheDocument();
      expect(within(modal).getByText(/Intake Officer \/ Scale Clerk/i)).toBeInTheDocument();
      expect(within(modal).getByText(/Farmer Supplier \/ Deliverer/i)).toBeInTheDocument();
      expect(within(modal).getByText(/Authorized Signature & Official Stamp/i)).toBeInTheDocument();
      expect(within(modal).getByText(/Signature \/ Right Thumbprint/i)).toBeInTheDocument();
    });

    // Trigger Print
    const printBtn = screen.getByTestId('print-receipt-button');
    fireEvent.click(printBtn);
    expect(printSpy).toHaveBeenCalled();
  });
});
