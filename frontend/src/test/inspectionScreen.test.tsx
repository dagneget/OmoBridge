import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import InspectionPage from '../pages/dashboard/enterprise/InspectionPage';
import { useAuthStore } from '../features/auth/authStore';
import { enterpriseService } from '../features/enterprise/enterpriseService';
import { mockUsers } from '../mocks/fixtures/users';
import { mockDeliveries } from '../mocks/fixtures/enterprise';

const TARGET_ENTERPRISE_ID = '33333333-3333-3333-3333-333333333333';

describe('Quality Inspection & Grading Screen (F-805)', () => {
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
    vi.spyOn(enterpriseService, 'inspectDelivery').mockImplementation(async (deliveryId, req) => {
      const delivery = mockDeliveries.find((d) => d.id === deliveryId);
      if (!delivery) throw new Error('Delivery not found');

      // Backend sum validation simulation
      for (const it of req.items) {
        const originalItem = delivery.items?.find((di) => di.id === it.deliveryItemId);
        if (originalItem && it.acceptedQty + it.rejectedQty !== (originalItem.deliveredQty || 0)) {
          const err: any = new Error('Sum of accepted and rejected quantities must equal delivered quantity');
          err.response = {
            data: { message: 'Sum of accepted and rejected quantities must equal delivered quantity' },
          };
          throw err;
        }
      }

      return {
        ...delivery,
        status: 'INSPECTED',
        items: delivery.items?.map((item) => {
          const matching = req.items.find((i) => i.deliveryItemId === item.id);
          if (matching) {
            return {
              ...item,
              acceptedQty: matching.acceptedQty,
              rejectedQty: matching.rejectedQty,
              rejectionReason: matching.rejectionReason,
              lineTotal: matching.acceptedQty * (item.unitPriceSnapshot || 0),
            };
          }
          return item;
        }),
      };
    });
  });

  const renderComponent = (initialEntries = ['/dashboard/enterprise/inspection']) =>
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={initialEntries}>
          <InspectionPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

  it('renders pending deliveries in inspection queue and auto-selects first RECORDED delivery', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('quality-inspection-page')).toBeInTheDocument();
      expect(screen.getByText('Intake Queue (1)')).toBeInTheDocument();
    });

    // DEL-2026-0001 is RECORDED, DEL-2026-0002 is already INSPECTED so not in pending queue
    expect(screen.getByTestId('select-delivery-del-001')).toBeInTheDocument();
    expect(screen.queryByTestId('select-delivery-del-002')).not.toBeInTheDocument();

    // Details for active delivery are displayed
    await waitFor(() => {
      expect(screen.getAllByText('Alemayehu Haile').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('DEL-2026-0001').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('South Omo White Forest Honey')).toBeInTheDocument();
    });
  });

  it('displays live error and disables submit when accepted + rejected != delivered sum', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('accepted-qty-input-0')).toBeInTheDocument();
    });

    const acceptedInput = screen.getByTestId('accepted-qty-input-0');
    const rejectedInput = screen.getByTestId('rejected-qty-input-0');

    // Deliberately set mismatch: delivered is 50, set accepted to 30 and rejected to 10 (sum 40)
    fireEvent.change(acceptedInput, { target: { value: '30' } });
    fireEvent.change(rejectedInput, { target: { value: '10' } });

    // Warning text should be visible
    expect(screen.getByTestId('sum-mismatch-warning-0')).toBeInTheDocument();
    expect(screen.getByText(/Sum mismatch: 40 KG entered. Must equal delivered 50 KG/i)).toBeInTheDocument();

    // Submit button must be disabled
    const submitBtn = screen.getByTestId('submit-inspection-button');
    expect(submitBtn).toBeDisabled();
  });

  it('requires rejection reason when rejected quantity is greater than zero', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('accepted-qty-input-0')).toBeInTheDocument();
    });

    const acceptedInput = screen.getByTestId('accepted-qty-input-0');
    // Change accepted to 40, rejected will auto-balance to 10
    fireEvent.change(acceptedInput, { target: { value: '40' } });

    // Rejection reason input must now appear
    await waitFor(() => {
      expect(screen.getByTestId('rejection-reason-select-0')).toBeInTheDocument();
      expect(screen.getByTestId('rejection-reason-input-0')).toBeInTheDocument();
    });

    // When rejection reason is empty, submit button should be disabled
    const submitBtn = screen.getByTestId('submit-inspection-button');
    expect(submitBtn).toBeDisabled();

    // Fill rejection reason
    const reasonSelect = screen.getByTestId('rejection-reason-select-0');
    fireEvent.change(reasonSelect, {
      target: { value: 'Moisture content exceeded acceptable limit (>20%)' },
    });

    // Now valid!
    expect(submitBtn).not.toBeDisabled();
  });

  it('updates live projected farmer payable dynamically', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('accepted-qty-input-0')).toBeInTheDocument();
    });

    // Delivered is 50 KG @ 350 ETB = 17,500 ETB initial payable
    expect(screen.getByText('17,500.00 ETB')).toBeInTheDocument();

    // Set accepted to 45 KG (45 * 350 = 15,750 ETB) and rejected to 5
    const acceptedInput = screen.getByTestId('accepted-qty-input-0');
    fireEvent.change(acceptedInput, { target: { value: '45' } });

    expect(screen.getByText('15,750.00 ETB')).toBeInTheDocument();
  });

  it('submits inspection successfully and displays generated payable & lots confirmation', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('accepted-qty-input-0')).toBeInTheDocument();
    });

    // Set 45 accepted, 5 rejected with reason
    fireEvent.change(screen.getByTestId('accepted-qty-input-0'), { target: { value: '45' } });
    fireEvent.change(screen.getByTestId('rejection-reason-select-0'), {
      target: { value: 'Impurities and foreign particulates present' },
    });

    const submitBtn = screen.getByTestId('submit-inspection-button');
    expect(submitBtn).not.toBeDisabled();
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(enterpriseService.inspectDelivery).toHaveBeenCalledWith('del-001', {
        items: [
          {
            deliveryItemId: 'item-001',
            acceptedQty: 45,
            rejectedQty: 5,
            rejectionReason: 'Impurities and foreign particulates present',
          },
        ],
      });
    });

    // Verify success banner with postings
    await waitFor(() => {
      expect(screen.getByTestId('inspection-success-banner')).toBeInTheDocument();
      expect(screen.getByText(/Inspection Successfully Completed & Sealed!/i)).toBeInTheDocument();
      expect(screen.getByTestId('generated-payable-amount')).toHaveTextContent('15,750.00 ETB');
    });
  });

  it('displays backend error message if inspection fails on server', async () => {
    vi.spyOn(enterpriseService, 'inspectDelivery').mockRejectedValue({
      response: {
        data: { message: 'Capacity full in raw honey containment lot' },
      },
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('accepted-qty-input-0')).toBeInTheDocument();
    });

    const submitBtn = screen.getByTestId('submit-inspection-button');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByTestId('inspection-form-error')).toHaveTextContent(
        'Capacity full in raw honey containment lot'
      );
    });
  });

  it('displays empty queue state when no deliveries await inspection', async () => {
    // Only inspected deliveries
    vi.spyOn(enterpriseService, 'getEnterpriseDeliveries').mockResolvedValue([mockDeliveries[1]]);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('empty-inspection-queue')).toBeInTheDocument();
      expect(screen.getByText(/All intake deliveries inspected!/i)).toBeInTheDocument();
    });
  });
});
