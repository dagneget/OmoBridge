import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import EnterpriseDashboardPage from '../pages/dashboard/EnterpriseDashboardPage';
import { useAuthStore } from '../features/auth/authStore';
import { enterpriseService } from '../features/enterprise/enterpriseService';
import { mockUsers } from '../mocks/fixtures/users';
import {
  mockImpactMetrics,
  mockEnterpriseFarmers,
  mockDeliveries,
  mockEnterpriseOrders,
  mockInventoryLots,
} from '../mocks/fixtures/enterprise';

describe('Enterprise Dashboard Shell and Home (F-801)', () => {
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
        enterpriseId: '33333333-3333-3333-3333-333333333333',
        enterpriseName: 'South Omo Community Heritage Cooperative',
        roles: ['MICRO_ENTERPRISE'],
      },
      token: 'mock-enterprise-token',
      isAuthenticated: true,
      activeRole: 'MICRO_ENTERPRISE',
    });

    vi.spyOn(enterpriseService, 'getImpactMetrics').mockResolvedValue(mockImpactMetrics);
    vi.spyOn(enterpriseService, 'getEnterpriseFarmers').mockResolvedValue(mockEnterpriseFarmers);
    vi.spyOn(enterpriseService, 'getEnterpriseDeliveries').mockResolvedValue(mockDeliveries);
    vi.spyOn(enterpriseService, 'getEnterpriseOrders').mockResolvedValue(mockEnterpriseOrders);
    vi.spyOn(enterpriseService, 'getEnterpriseLots').mockResolvedValue(mockInventoryLots);
  });

  const renderDashboard = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/dashboard/enterprise']}>
          <EnterpriseDashboardPage />
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  it('renders enterprise header with cooperative name and verified badge', async () => {
    renderDashboard();

    expect(await screen.findByText(/South Omo Community Heritage Cooperative/i)).toBeInTheDocument();
    expect(screen.getByText(/Verified Enterprise/i)).toBeInTheDocument();
    expect(screen.getByText(/Turmi & Dimeka Woredas/i)).toBeInTheDocument();
  });

  it('renders all enterprise module navigation tabs', async () => {
    renderDashboard();

    const nav = await screen.findByRole('navigation', { name: /Enterprise Modules/i });
    expect(within(nav).getByText(/Overview & Key Metrics/i)).toBeInTheDocument();
    expect(within(nav).getByText(/^Farmers$/i)).toBeInTheDocument();
    expect(within(nav).getByText(/Buying Prices/i)).toBeInTheDocument();
    expect(within(nav).getByText(/Supply Intake/i)).toBeInTheDocument();
    expect(within(nav).getByText(/Disbursements/i)).toBeInTheDocument();
    expect(within(nav).getByText(/Inventory Lots/i)).toBeInTheDocument();
    expect(within(nav).getByText(/AI Reports/i)).toBeInTheDocument();
  });

  it('renders key numbers for enterprise operations', async () => {
    renderDashboard();

    expect(await screen.findByTestId('enterprise-key-numbers')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('registered-farmers-count')).toHaveTextContent('48');
      expect(screen.getByTestId('pending-deliveries-count')).toHaveTextContent('1');
      expect(screen.getByTestId('active-lots-count')).toHaveTextContent('2');
      expect(screen.getByTestId('open-orders-count')).toHaveTextContent('2');
    });
  });

  it('displays pending farmer approvals and delivery alerts', async () => {
    renderDashboard();

    expect(await screen.findByTestId('pending-farmers-alert')).toBeInTheDocument();
    expect(screen.getByText(/Farmer Approval Pending/i)).toBeInTheDocument();

    expect(screen.getByTestId('pending-deliveries-alert')).toBeInTheDocument();
    expect(screen.getByText(/Delivery Awaiting Grading/i)).toBeInTheDocument();
  });

  it('renders recent supply deliveries and open orders tables', async () => {
    renderDashboard();

    expect(await screen.findByTestId('recent-deliveries-table')).toBeInTheDocument();
    expect(screen.getByText(/DEL-2026-0001/i)).toBeInTheDocument();
    expect(screen.getByText(/Alemayehu Haile/i)).toBeInTheDocument();
    expect(screen.getByText(/RECORDED/i)).toBeInTheDocument();

    expect(screen.getByTestId('open-orders-table')).toBeInTheDocument();
    expect(screen.getByText(/ORD-2026-0089/i)).toBeInTheDocument();
  });

  it('allows clicking the refresh button to trigger queries refetch', async () => {
    renderDashboard();

    const refreshButton = await screen.findByTitle(/Refresh dashboard metrics/i);
    fireEvent.click(refreshButton);

    expect(await screen.findByTestId('enterprise-dashboard')).toBeInTheDocument();
    expect(enterpriseService.getImpactMetrics).toHaveBeenCalled();
  });

  it('handles error state gracefully with retry capability', async () => {
    vi.spyOn(enterpriseService, 'getImpactMetrics').mockRejectedValue(new Error('Network error'));
    renderDashboard();

    expect(await screen.findByText(/Some enterprise metrics could not be loaded/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
  });
});
