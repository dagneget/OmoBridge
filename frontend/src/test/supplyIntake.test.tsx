import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
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

describe('Raw Harvest Supply Intake & Receipt Generation (F-804)', () => {
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
    vi.spyOn(enterpriseService, 'recordDelivery').mockImplementation(async (req) => {
      const farmer = mockEnterpriseFarmers.find((f) => f.id === req.farmerId);
      if (farmer && farmer.verificationStatus !== 'VERIFIED') {
        const error: any = new Error('Farmer account is not active');
        error.response = { data: { message: 'Farmer account is not active' } };
        throw error;
      }

      return {
        id: 'del-new-999',
        deliveryNo: 'DEL-2026-0099',
        enterpriseId: req.enterpriseId,
        enterpriseName: 'South Omo Community Heritage Cooperative',
        farmerId: req.farmerId,
        farmerName: farmer ? farmer.fullName : 'Test Farmer',
        farmerCode: farmer ? farmer.farmerCode : 'FRM-NEW',
        deliveredAt: new Date().toISOString(),
        status: 'RECORDED',
        notes: req.notes || 'Warehouse intake',
        totalDeliveredValue: 10500.0,
        items: req.items.map((it, idx) => ({
          id: `item-${idx}`,
          productTypeId: it.productTypeId,
          productTypeCode: 'HONEY-WHITE',
          productTypeName: 'South Omo White Forest Honey',
          unit: 'KG',
          grade: it.grade,
          deliveredQty: it.deliveredQty,
          acceptedQty: 0,
          rejectedQty: 0,
          unitPriceSnapshot: 350.0,
          lineTotal: it.deliveredQty * 350.0,
        })),
      };
    });
  });

  const renderComponent = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <SupplyIntakePage />
        </MemoryRouter>
      </QueryClientProvider>
    );

  it('renders intake deliveries list with delivery numbers and statuses', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('DEL-2026-0001')).toBeInTheDocument();
      expect(screen.getByText('DEL-2026-0002')).toBeInTheDocument();
    });

    expect(screen.getByText('Alemayehu Haile')).toBeInTheDocument();
    expect(screen.getByText('Boko Shada')).toBeInTheDocument();
    expect(screen.getByText('RECORDED')).toBeInTheDocument();
    expect(screen.getByText('INSPECTED')).toBeInTheDocument();
  });

  it('filters deliveries by status tab', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('DEL-2026-0001')).toBeInTheDocument();
    });

    const recordedTab = screen.getByRole('button', { name: /Awaiting Inspection/i });
    fireEvent.click(recordedTab);

    expect(screen.getByText('DEL-2026-0001')).toBeInTheDocument();
    expect(screen.queryByText('DEL-2026-0002')).not.toBeInTheDocument();

    const inspectedTab = screen.getByRole('button', { name: /Inspected \(/i });
    fireEvent.click(inspectedTab);

    expect(screen.getByText('DEL-2026-0002')).toBeInTheDocument();
    expect(screen.queryByText('DEL-2026-0001')).not.toBeInTheDocument();
  });

  it('searches deliveries by farmer name and delivery number', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('DEL-2026-0001')).toBeInTheDocument();
    });

    const searchInput = screen.getByTestId('deliveries-search-input');
    fireEvent.change(searchInput, { target: { value: 'Boko' } });

    expect(screen.queryByText('DEL-2026-0001')).not.toBeInTheDocument();
    expect(screen.getByText('DEL-2026-0002')).toBeInTheDocument();
  });

  it('opens record delivery modal with large inputs and farmer select', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('DEL-2026-0001')).toBeInTheDocument();
    });

    const newBtn = screen.getByTestId('open-record-delivery-button');
    fireEvent.click(newBtn);

    expect(screen.getByText('Record Incoming Harvest Delivery')).toBeInTheDocument();
    expect(screen.getByTestId('farmer-select')).toBeInTheDocument();
    expect(screen.getByTestId('item-type-select-0')).toBeInTheDocument();
    expect(screen.getByTestId('item-grade-input-0')).toBeInTheDocument();
    expect(screen.getByTestId('item-qty-input-0')).toBeInTheDocument();
  });

  it('records delivery successfully and displays official receipt modal', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('DEL-2026-0001')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('open-record-delivery-button'));

    // Select verified farmer
    const farmerSelect = screen.getByTestId('farmer-select');
    fireEvent.change(farmerSelect, {
      target: { value: '22222222-2222-2222-2222-222222222222' },
    });

    // Select commodity
    const productSelect = screen.getByTestId('item-type-select-0');
    fireEvent.change(productSelect, { target: { value: 'pt-honey-001' } });

    // Enter scale weight
    const weightInput = screen.getByTestId('item-qty-input-0');
    fireEvent.change(weightInput, { target: { value: '30' } });

    // Submit form
    const submitBtn = screen.getByTestId('submit-delivery-button');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(enterpriseService.recordDelivery).toHaveBeenCalledWith(
        expect.objectContaining({
          enterpriseId: TARGET_ENTERPRISE_ID,
          farmerId: '22222222-2222-2222-2222-222222222222',
          items: [
            expect.objectContaining({
              productTypeId: 'pt-honey-001',
              grade: 'Grade A',
              deliveredQty: 30,
            }),
          ],
        })
      );
    });

    // Verify official receipt is shown
    await waitFor(() => {
      expect(screen.getByTestId('delivery-receipt-modal')).toBeInTheDocument();
      expect(screen.getByTestId('receipt-number')).toHaveTextContent('DEL-2026-0099');
      expect(screen.getByTestId('print-receipt-button')).toBeInTheDocument();
    });
  });

  it('displays error if farmer account is not active/verified', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('DEL-2026-0001')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('open-record-delivery-button'));

    // Select unverified/pending farmer Wale Guyo
    const farmerSelect = screen.getByTestId('farmer-select');
    fireEvent.change(farmerSelect, {
      target: { value: 'farmer-uuid-002' },
    });

    const productSelect = screen.getByTestId('item-type-select-0');
    fireEvent.change(productSelect, { target: { value: 'pt-honey-001' } });

    const weightInput = screen.getByTestId('item-qty-input-0');
    fireEvent.change(weightInput, { target: { value: '25' } });

    const submitBtn = screen.getByTestId('submit-delivery-button');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByTestId('delivery-form-error')).toHaveTextContent(/Farmer account is not active/i);
    });
  });

  it('opens receipt from existing delivery row and triggers window.print', async () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('DEL-2026-0001')).toBeInTheDocument();
    });

    const viewReceiptBtn = screen.getByTestId('view-receipt-del-001');
    fireEvent.click(viewReceiptBtn);

    await waitFor(() => {
      expect(screen.getByTestId('delivery-receipt-modal')).toBeInTheDocument();
      expect(screen.getByTestId('receipt-number')).toHaveTextContent('DEL-2026-0001');
    });

    const printBtn = screen.getByTestId('print-receipt-button');
    fireEvent.click(printBtn);
    expect(printSpy).toHaveBeenCalled();
  });
});
