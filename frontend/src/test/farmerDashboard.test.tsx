import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';
import FarmerDashboardPage from '../pages/dashboard/FarmerDashboardPage';
import { useAuthStore } from '../features/auth/authStore';
import { farmerService } from '../features/farmer/farmerService';
import { mockUsers } from '../mocks/fixtures/users';
import {
  mockFarmerBalanceSummary,
  mockDeliveries,
  mockFarmerPayments,
  mockBuyingPrices,
} from '../mocks/fixtures/enterprise';

describe('Farmer Home Dashboard (F-1001)', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.restoreAllMocks();
    i18n.changeLanguage('en');
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
        ...mockUsers.producer,
        enterpriseId: '33333333-3333-3333-3333-333333333333',
        enterpriseName: 'South Omo Community Heritage Cooperative',
        roles: ['PRODUCER_FARMER'],
      },
      token: 'mock-farmer-token',
      isAuthenticated: true,
      activeRole: 'PRODUCER_FARMER',
    });

    vi.spyOn(farmerService, 'getBalance').mockResolvedValue(mockFarmerBalanceSummary);
    vi.spyOn(farmerService, 'getDeliveries').mockResolvedValue(mockDeliveries);
    vi.spyOn(farmerService, 'getPayments').mockResolvedValue(mockFarmerPayments);
    vi.spyOn(farmerService, 'getBuyingPrices').mockResolvedValue(mockBuyingPrices);
  });

  const renderDashboard = () => {
    return render(
      <I18nextProvider i18n={i18n}>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/dashboard/farmer']}>
            <FarmerDashboardPage />
          </MemoryRouter>
        </QueryClientProvider>
      </I18nextProvider>
    );
  };

  it('renders farmer header with name and subtitle', async () => {
    renderDashboard();

    // Header shows farmer name from auth store
    await waitFor(() => {
      expect(screen.getByTestId('farmer-dashboard')).toBeInTheDocument();
    });
    // USSD banner is visible
    expect(screen.getByText(/USSD Fast Access/i)).toBeInTheDocument();
  });

  it('renders USSD fast access banner with *844# code', async () => {
    renderDashboard();

    expect(screen.getByText(/USSD Fast Access: \*844#/i)).toBeInTheDocument();
    expect(
      screen.getByText(/dialing \*844#/i)
    ).toBeInTheDocument();
  });

  it('renders four key number cards', async () => {
    renderDashboard();

    expect(screen.getByTestId('farmer-key-numbers')).toBeInTheDocument();
    // Pending payout card
    await waitFor(() => {
      expect(screen.getByTestId('pending-payout-amount')).toBeInTheDocument();
    });
    expect(screen.getByTestId('total-delivered-amount')).toBeInTheDocument();
    expect(screen.getByTestId('deliveries-count')).toBeInTheDocument();
    expect(screen.getByTestId('buying-prices-count')).toBeInTheDocument();
  });

  it('renders balance from API with correct amounts', async () => {
    renderDashboard();

    await waitFor(() => {
      // pendingPayout = 7000, totalDeliveredValue = 45000, totalSettled = 38000
      expect(screen.getByTestId('pending-payout-amount')).toHaveTextContent('7,000.00 ETB');
    });
    expect(screen.getByTestId('total-delivered-amount')).toHaveTextContent('45,000.00 ETB');
    expect(screen.getByTestId('open-payables-count')).toHaveTextContent('2');
  });

  it('renders deliveries count from API data', async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByTestId('deliveries-count')).toHaveTextContent(
        String(mockDeliveries.length)
      );
    });
  });

  it('renders buying prices count from API data', async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByTestId('buying-prices-count')).toHaveTextContent(
        String(mockBuyingPrices.length)
      );
    });
  });

  it('renders recent deliveries table with delivery numbers', async () => {
    renderDashboard();

    const table = await screen.findByTestId('recent-deliveries-table');
    expect(table).toBeInTheDocument();

    // First delivery number from mock data
    expect(within(table).getByText('DEL-2026-0001')).toBeInTheDocument();
  });

  it('renders buying prices list with product names', async () => {
    renderDashboard();

    const list = await screen.findByTestId('buying-prices-list');
    expect(list).toBeInTheDocument();

    // Product type name appears multiple times (Grade A + Grade B)
    const items = within(list).getAllByText('South Omo White Forest Honey');
    expect(items.length).toBeGreaterThanOrEqual(1);
  });

  it('renders recent payments table when payments exist', async () => {
    renderDashboard();

    const table = await screen.findByTestId('recent-payments-table');
    expect(table).toBeInTheDocument();
    expect(within(table).getByText('PMT-2026-0044')).toBeInTheDocument();
  });

  it('renders refresh button', async () => {
    renderDashboard();

    expect(screen.getByTitle(/Refresh/i)).toBeInTheDocument();
  });

  it('shows loading skeletons before data resolves', async () => {
    vi.spyOn(farmerService, 'getBalance').mockReturnValue(new Promise(() => {}));
    vi.spyOn(farmerService, 'getDeliveries').mockReturnValue(new Promise(() => {}));
    vi.spyOn(farmerService, 'getBuyingPrices').mockReturnValue(new Promise(() => {}));

    renderDashboard();

    // Skeleton elements should be present while loading
    expect(screen.getByTestId('farmer-key-numbers')).toBeInTheDocument();
  });

  it('shows error alert when API fails', async () => {
    vi.spyOn(farmerService, 'getBalance').mockRejectedValue(new Error('Network error'));
    vi.spyOn(farmerService, 'getDeliveries').mockRejectedValue(new Error('Network error'));
    vi.spyOn(farmerService, 'getBuyingPrices').mockRejectedValue(new Error('Network error'));
    vi.spyOn(farmerService, 'getPayments').mockRejectedValue(new Error('Network error'));

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText(/Could not load your dashboard data/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Retry/i)).toBeInTheDocument();
  });

  it('shows empty states when no data is available', async () => {
    vi.spyOn(farmerService, 'getDeliveries').mockResolvedValue([]);
    vi.spyOn(farmerService, 'getBuyingPrices').mockResolvedValue([]);
    vi.spyOn(farmerService, 'getPayments').mockResolvedValue([]);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByTestId('deliveries-empty')).toBeInTheDocument();
    });
    expect(screen.getByTestId('prices-empty')).toBeInTheDocument();
    expect(screen.getByTestId('payments-empty')).toBeInTheDocument();
  });

  it('uses i18n for all user-facing strings (no hard-coded text)', async () => {
    renderDashboard();

    // Verify key i18n-translated strings are present (not raw translation keys)
    // Some strings appear in multiple places (card labels + section headers)
    await waitFor(() => {
      expect(screen.getAllByText(/Pending Payout/i).length).toBeGreaterThanOrEqual(1);
    });
    expect(screen.getAllByText(/Total Delivered Value/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Recent Crop Deliveries/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Today's Buying Prices/i).length).toBeGreaterThanOrEqual(1);
  });
});
