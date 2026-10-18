import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import FarmerPayablesPage from '../pages/dashboard/enterprise/FarmerPayablesPage';
import { useAuthStore } from '../features/auth/authStore';
import { enterpriseService } from '../features/enterprise/enterpriseService';
import { mockUsers } from '../mocks/fixtures/users';
import {
  mockEnterpriseFarmers,
  mockFarmerBalanceSummary,
  mockFarmerPayables,
  mockFarmerPayments,
  mockDeliveries,
} from '../mocks/fixtures/enterprise';

const TARGET_ENTERPRISE_ID = '33333333-3333-3333-3333-333333333333';

describe('Farmer Payables, Balances & Payout Disbursements (F-806, F-807, F-808)', () => {
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
    vi.spyOn(enterpriseService, 'getFarmerPayables').mockResolvedValue(mockFarmerPayables);
    vi.spyOn(enterpriseService, 'getEnterpriseFarmerPayments').mockResolvedValue(mockFarmerPayments);
    vi.spyOn(enterpriseService, 'getEnterpriseDeliveries').mockResolvedValue(mockDeliveries);
    vi.spyOn(enterpriseService, 'createFarmerPayment').mockImplementation(async (req) => {
      return {
        id: 'pmt-new-777',
        paymentNo: 'PMT-2026-0099',
        enterpriseId: req.enterpriseId,
        farmerId: req.farmerId,
        amount: req.amount,
        paymentMethod: req.paymentMethod,
        status: 'SUCCESS',
        gatewayReference: req.paymentMethod === 'TELEBIRR' ? 'TEL-REF-554433' : 'CASH-REF-1122',
        paidAt: new Date().toISOString(),
      };
    });
    vi.spyOn(enterpriseService, 'cancelDelivery').mockImplementation(async (id, reason) => {
      const del = mockDeliveries.find((d) => d.id === id);
      return {
        ...del,
        status: 'CANCELLED',
        notes: reason || 'Cancelled by enterprise',
      };
    });
  });

  const renderComponent = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <FarmerPayablesPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

  it('renders farmer balance statement strictly matching backend API numbers (F-806)', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('total-delivered-value')).toHaveTextContent('45,000.00 ETB');
      expect(screen.getByTestId('total-settled')).toHaveTextContent('38,000.00 ETB');
      expect(screen.getByTestId('pending-payout')).toHaveTextContent('7,000.00 ETB');
      expect(screen.getByTestId('open-payables-count')).toHaveTextContent('2');
    });
  });

  it('renders open payables list with commodity names and remaining amounts', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('payables-table')).toBeInTheDocument();
      expect(screen.getByText('PAY-2026-0012')).toBeInTheDocument();
    });

    expect(screen.getByText('South Omo White Forest Honey')).toBeInTheDocument();
    expect(screen.getAllByText('7,000.00 ETB').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByTestId('payable-row-pay-001')).toHaveTextContent('OPEN');
  });

  it('filters payables by status tab and search input', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('PAY-2026-0012')).toBeInTheDocument();
    });

    // Filter by SETTLED: PAY-2026-0012 is OPEN, so should disappear
    const settledFilterBtn = screen.getByRole('button', { name: 'SETTLED' });
    fireEvent.click(settledFilterBtn);

    expect(screen.queryByText('PAY-2026-0012')).not.toBeInTheDocument();
    expect(screen.getByTestId('empty-payables')).toBeInTheDocument();

    // Reset to ALL
    fireEvent.click(screen.getByRole('button', { name: 'ALL' }));
    expect(screen.getByText('PAY-2026-0012')).toBeInTheDocument();

    // Search query
    const searchInput = screen.getByTestId('payables-search-input');
    fireEvent.change(searchInput, { target: { value: 'Honey' } });
    expect(screen.getByText('PAY-2026-0012')).toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: 'Sesame' } });
    expect(screen.queryByText('PAY-2026-0012')).not.toBeInTheDocument();
  });

  it('opens payout disbursement modal with beneficiary details and default full balance (F-807)', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('open-pay-farmer-button')).not.toBeDisabled();
    });

    fireEvent.click(screen.getByTestId('open-pay-farmer-button'));

    expect(screen.getByTestId('pay-farmer-modal')).toBeInTheDocument();
    expect(screen.getByText(/Farmer Payout Disbursement/i)).toBeInTheDocument();
    expect(screen.getByTestId('modal-max-eligible-payout')).toHaveTextContent('7,000.00 ETB');

    // Amount input defaults to full pending payout
    const amountInput = screen.getByTestId('payout-amount-input') as HTMLInputElement;
    expect(amountInput.value).toBe('7000');
  });

  it('prevents overpayment when amount exceeds outstanding balance', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('open-pay-farmer-button')).not.toBeDisabled();
    });

    fireEvent.click(screen.getByTestId('open-pay-farmer-button'));

    await waitFor(() => {
      expect(screen.getByTestId('pay-farmer-modal')).toBeInTheDocument();
    });

    const amountInput = screen.getByTestId('payout-amount-input');
    // Enter 12,000 when only 7,000 is eligible
    fireEvent.change(amountInput, { target: { value: '12000' } });

    const disburseBtn = screen.getByTestId('confirm-disburse-button');
    fireEvent.click(disburseBtn);

    expect(screen.getByTestId('pay-modal-error')).toHaveTextContent(
      /Disbursement amount \(12000\.00 ETB\) cannot exceed outstanding balance of 7000\.00 ETB/i
    );
    expect(enterpriseService.createFarmerPayment).not.toHaveBeenCalled();
  });

  it('disburses payment successfully via Telebirr and displays success banner', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('open-pay-farmer-button')).not.toBeDisabled();
    });

    fireEvent.click(screen.getByTestId('open-pay-farmer-button'));

    await waitFor(() => {
      expect(screen.getByTestId('pay-farmer-modal')).toBeInTheDocument();
    });

    // Select Telebirr method and confirm amount
    fireEvent.click(screen.getByTestId('pay-method-telebirr'));

    const amountInput = screen.getByTestId('payout-amount-input');
    fireEvent.change(amountInput, { target: { value: '5000' } }); // partial payout

    const disburseBtn = screen.getByTestId('confirm-disburse-button');
    fireEvent.click(disburseBtn);

    await waitFor(() => {
      expect(enterpriseService.createFarmerPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          enterpriseId: TARGET_ENTERPRISE_ID,
          farmerId: '22222222-2222-2222-2222-222222222222',
          amount: 5000,
          paymentMethod: 'TELEBIRR',
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('payment-success-notification')).toBeInTheDocument();
      expect(screen.getByText(/Payment PMT-2026-0099 Disbursed Successfully!/i)).toBeInTheDocument();
    });
  });

  it('cancels unpaid recorded delivery with reason and keeps log (F-808)', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('tab-deliveries')).toBeInTheDocument();
    });

    // Switch to deliveries tab
    fireEvent.click(screen.getByTestId('tab-deliveries'));

    await waitFor(() => {
      expect(screen.getByTestId('cancel-delivery-btn-del-001')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('cancel-delivery-btn-del-001'));

    expect(screen.getByTestId('cancel-delivery-modal')).toBeInTheDocument();
    const reasonInput = screen.getByTestId('cancel-reason-input');
    fireEvent.change(reasonInput, {
      target: { value: 'Producer recalled batch before moisture inspection' },
    });

    const confirmCancelBtn = screen.getByTestId('confirm-cancel-delivery-btn');
    fireEvent.click(confirmCancelBtn);

    await waitFor(() => {
      expect(enterpriseService.cancelDelivery).toHaveBeenCalledWith(
        'del-001',
        'Producer recalled batch before moisture inspection'
      );
    });
  });
});
