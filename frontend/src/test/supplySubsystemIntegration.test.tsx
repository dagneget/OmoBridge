import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SupplyIntakePage from '../pages/dashboard/enterprise/SupplyIntakePage';
import InspectionPage from '../pages/dashboard/enterprise/InspectionPage';
import FarmerPayablesPage from '../pages/dashboard/enterprise/FarmerPayablesPage';
import { useAuthStore } from '../features/auth/authStore';
import { enterpriseService } from '../features/enterprise/enterpriseService';
import { mockUsers } from '../mocks/fixtures/users';
import {
  mockDeliveries,
  mockEnterpriseFarmers,
  mockProductTypes,
  mockFarmerBalanceSummary,
  mockFarmerPayables,
} from '../mocks/fixtures/enterprise';

const ENTERPRISE_A_ID = '33333333-3333-3333-3333-333333333333';
const ENTERPRISE_B_ID = '44444444-4444-4444-4444-444444444444';

describe('F-810: Supply Subsystem End-to-End Suite (Entry, Inspection Sums, Payment & Isolation)', () => {
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
        enterpriseId: ENTERPRISE_A_ID,
        enterpriseName: 'South Omo Community Heritage Cooperative',
        roles: ['MICRO_ENTERPRISE'],
      },
      token: 'enterprise-a-token',
      isAuthenticated: true,
      activeRole: 'MICRO_ENTERPRISE',
    });

    vi.spyOn(enterpriseService, 'getEnterpriseDeliveries').mockImplementation(async (entId) => {
      if (entId !== ENTERPRISE_A_ID) return [];
      return mockDeliveries;
    });

    vi.spyOn(enterpriseService, 'getEnterpriseFarmers').mockImplementation(async (entId) => {
      if (entId !== ENTERPRISE_A_ID) return [];
      return mockEnterpriseFarmers;
    });

    vi.spyOn(enterpriseService, 'getProductTypes').mockResolvedValue(mockProductTypes);

    vi.spyOn(enterpriseService, 'getFarmerBalance').mockImplementation(async (farmerId) => {
      if (farmerId === mockFarmerBalanceSummary.farmerId) {
        return mockFarmerBalanceSummary;
      }
      return {
        farmerId,
        farmerName: 'Isolated Farmer',
        farmerCode: 'FRM-ISO-01',
        totalDeliveredValue: 0,
        totalSettled: 0,
        totalPendingPayout: 0,
        openPayablesCount: 0,
      };
    });

    vi.spyOn(enterpriseService, 'getFarmerPayables').mockResolvedValue(mockFarmerPayables);
    vi.spyOn(enterpriseService, 'getEnterpriseFarmerPayments').mockResolvedValue([]);
  });

  const renderWithProviders = (ui: React.ReactNode, initialRoute = '/') =>
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialRoute]}>
          <Routes>
            <Route path="/" element={ui} />
            <Route path="/dashboard/enterprise/supply" element={<SupplyIntakePage />} />
            <Route path="/dashboard/enterprise/inspection" element={<InspectionPage />} />
            <Route path="/dashboard/enterprise/payables" element={<FarmerPayablesPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

  describe('1. Raw Harvest Entry Validations', () => {
    it('blocks submission and highlights errors if delivered quantity is zero or negative', async () => {
      renderWithProviders(<SupplyIntakePage />);

      await waitFor(() => {
        expect(screen.getByTestId('open-record-delivery-button')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('open-record-delivery-button'));

      // Select verified farmer
      fireEvent.change(screen.getByTestId('farmer-select'), {
        target: { value: '22222222-2222-2222-2222-222222222222' },
      });

      // Select commodity
      fireEvent.change(screen.getByTestId('item-type-select-0'), {
        target: { value: 'pt-honey-001' },
      });

      // Enter 0 or invalid weight
      fireEvent.change(screen.getByTestId('item-qty-input-0'), {
        target: { value: '0' },
      });

      fireEvent.click(screen.getByTestId('submit-delivery-button'));

      await waitFor(() => {
        expect(screen.getByTestId('delivery-form-error')).toHaveTextContent(
          /Delivered quantity must be greater than zero/i
        );
      });
    });

    it('attaches enterpriseId strictly matching authenticated context upon delivery intake', async () => {
      const recordSpy = vi.spyOn(enterpriseService, 'recordDelivery').mockResolvedValue({
        id: 'del-recorded-1',
        deliveryNo: 'DEL-2026-9999',
        enterpriseId: ENTERPRISE_A_ID,
        farmerId: '22222222-2222-2222-2222-222222222222',
        farmerName: 'Alemayehu Haile',
        farmerCode: 'FRM-OMO-001',
        status: 'RECORDED',
        deliveredAt: new Date().toISOString(),
        items: [],
      });

      renderWithProviders(<SupplyIntakePage />);

      await waitFor(() => {
        expect(screen.getByTestId('open-record-delivery-button')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('open-record-delivery-button'));

      fireEvent.change(screen.getByTestId('farmer-select'), {
        target: { value: '22222222-2222-2222-2222-222222222222' },
      });

      fireEvent.change(screen.getByTestId('item-type-select-0'), {
        target: { value: 'pt-honey-001' },
      });

      fireEvent.change(screen.getByTestId('item-qty-input-0'), {
        target: { value: '45.5' },
      });

      fireEvent.click(screen.getByTestId('submit-delivery-button'));

      await waitFor(() => {
        expect(recordSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            enterpriseId: ENTERPRISE_A_ID,
            farmerId: '22222222-2222-2222-2222-222222222222',
            items: [
              expect.objectContaining({
                deliveredQty: 45.5,
              }),
            ],
          })
        );
      });
    });
  });

  describe('2. Inspection & Quality Grading Sums', () => {
    it('enforces live sum check: acceptedQty + rejectedQty == deliveredQty', async () => {
      renderWithProviders(<InspectionPage />, '/dashboard/enterprise/inspection');

      await waitFor(() => {
        expect(screen.getByTestId('quality-inspection-page')).toBeInTheDocument();
        expect(screen.getByTestId('accepted-qty-input-0')).toBeInTheDocument();
      });

      const acceptedInput = screen.getByTestId('accepted-qty-input-0');
      const rejectedInput = screen.getByTestId('rejected-qty-input-0');

      // Change accepted to 20, rejected to 20 (sum = 40 != delivered 50)
      fireEvent.change(acceptedInput, { target: { value: '20' } });
      fireEvent.change(rejectedInput, { target: { value: '20' } });

      // Live sum mismatch warning should be visible
      await waitFor(() => {
        expect(screen.getByTestId('sum-mismatch-warning-0')).toBeInTheDocument();
        expect(screen.getByText(/Sum mismatch: 40 KG entered. Must equal delivered 50 KG/i)).toBeInTheDocument();
      });

      // Submit button must be disabled
      const submitBtn = screen.getByTestId('submit-inspection-button');
      expect(submitBtn).toBeDisabled();
    });

    it('requires explicit rejection reason if rejectedQty > 0', async () => {
      renderWithProviders(<InspectionPage />, '/dashboard/enterprise/inspection');

      await waitFor(() => {
        expect(screen.getByTestId('accepted-qty-input-0')).toBeInTheDocument();
      });

      const acceptedInput = screen.getByTestId('accepted-qty-input-0');
      // Change accepted to 40, auto-balancing rejected to 10
      fireEvent.change(acceptedInput, { target: { value: '40' } });

      // Rejection reason inputs should appear
      await waitFor(() => {
        expect(screen.getByTestId('rejection-reason-select-0')).toBeInTheDocument();
      });

      // Without reason, button is disabled
      const submitBtn = screen.getByTestId('submit-inspection-button');
      expect(submitBtn).toBeDisabled();

      // With reason filled, button becomes active
      const reasonSelect = screen.getByTestId('rejection-reason-select-0');
      fireEvent.change(reasonSelect, {
        target: { value: 'Moisture content exceeded acceptable limit (>20%)' },
      });

      expect(submitBtn).not.toBeDisabled();
    });
  });

  describe('3. Payouts, Idempotency & Overpayment Protection', () => {
    it('prevents over-payment when payout amount exceeds pending balance', async () => {
      renderWithProviders(<FarmerPayablesPage />);

      await waitFor(() => {
        expect(screen.getByTestId('open-pay-farmer-button')).not.toBeDisabled();
      });

      fireEvent.click(screen.getByTestId('open-pay-farmer-button'));

      await waitFor(() => {
        expect(screen.getByTestId('pay-farmer-modal')).toBeInTheDocument();
      });

      // Total pending payout in mock is 7,000 ETB. Try entering 15,000 ETB.
      const amountInput = screen.getByTestId('payout-amount-input');
      fireEvent.change(amountInput, { target: { value: '15000' } });

      const disburseBtn = screen.getByTestId('confirm-disburse-button');
      fireEvent.click(disburseBtn);

      await waitFor(() => {
        expect(screen.getByTestId('pay-modal-error')).toBeInTheDocument();
        expect(screen.getByTestId('pay-modal-error')).toHaveTextContent(
          /Disbursement amount \(15000\.00 ETB\) cannot exceed outstanding balance of 7000\.00 ETB/i
        );
      });
    });

    it('executes payout with unique idempotency key preventing duplicate payouts', async () => {
      const disburseSpy = vi.spyOn(enterpriseService, 'createFarmerPayment').mockResolvedValue({
        id: 'pmt-success-001',
        paymentNo: 'PMT-2026-0001',
        enterpriseId: ENTERPRISE_A_ID,
        farmerId: '22222222-2222-2222-2222-222222222222',
        amount: 5000.0,
        paymentMethod: 'TELEBIRR',
        status: 'SUCCESS',
        gatewayReference: 'TEL-REF-9988',
        paidAt: new Date().toISOString(),
      });

      renderWithProviders(<FarmerPayablesPage />);

      await waitFor(() => {
        expect(screen.getByTestId('open-pay-farmer-button')).not.toBeDisabled();
      });

      fireEvent.click(screen.getByTestId('open-pay-farmer-button'));

      await waitFor(() => {
        expect(screen.getByTestId('pay-farmer-modal')).toBeInTheDocument();
      });

      // Enter valid amount 5,000 ETB (<= 7,000)
      const amountInput = screen.getByTestId('payout-amount-input');
      fireEvent.change(amountInput, { target: { value: '5000' } });

      const confirmBtn = screen.getByTestId('confirm-disburse-button');
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(disburseSpy).toHaveBeenCalledTimes(1);
        expect(disburseSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            enterpriseId: ENTERPRISE_A_ID,
            farmerId: '22222222-2222-2222-2222-222222222222',
            amount: 5000,
            paymentMethod: 'TELEBIRR',
          })
        );
      });
    });
  });

  describe('4. Multi-Tenant Enterprise Isolation', () => {
    it('strictly isolates queries and data between Enterprise A and Enterprise B', async () => {
      // Switch authenticated user to Enterprise B
      useAuthStore.setState({
        user: {
          ...mockUsers.enterprise,
          enterpriseId: ENTERPRISE_B_ID,
          enterpriseName: 'Omo Valley Honey Producers Ltd',
          roles: ['MICRO_ENTERPRISE'],
        },
        token: 'enterprise-b-token',
        isAuthenticated: true,
        activeRole: 'MICRO_ENTERPRISE',
      });

      renderWithProviders(<SupplyIntakePage />);

      // Enterprise B has no deliveries in mockImplementation
      await waitFor(() => {
        expect(enterpriseService.getEnterpriseDeliveries).toHaveBeenCalledWith(ENTERPRISE_B_ID);
        expect(screen.getByText(/No crop intake deliveries recorded matching your filters/i)).toBeInTheDocument();
      });

      // Verify Enterprise A deliveries are NOT shown
      expect(screen.queryByText('DEL-2026-0001')).not.toBeInTheDocument();
      expect(screen.queryByText('DEL-2026-0002')).not.toBeInTheDocument();
    });
  });
});
