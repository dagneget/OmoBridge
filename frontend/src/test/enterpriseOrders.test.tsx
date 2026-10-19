import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { useAuthStore } from '../features/auth/authStore';
import { enterpriseService } from '../features/enterprise/enterpriseService';
import EnterpriseOrdersPage from '../pages/dashboard/enterprise/EnterpriseOrdersPage';
import type { OrderSummaryResponse, OrderDetailResponse } from '../types/api';

const TARGET_ENTERPRISE_ID = '33333333-3333-3333-3333-333333333333';

const mockOrdersList: OrderSummaryResponse[] = [
  {
    orderId: 'ord-001',
    orderNo: 'ORD-2026-0089',
    enterpriseId: TARGET_ENTERPRISE_ID,
    enterpriseName: 'South Omo Community Heritage Cooperative',
    status: 'PAID',
    subtotal: 2400.0,
    tax: 0,
    platformFee: 50.0,
    deliveryFee: 150.0,
    totalAmount: 2600.0,
    currency: 'ETB',
    itemCount: 2,
    createdAt: '2026-10-18T10:00:00Z',
  },
  {
    orderId: 'ord-002',
    orderNo: 'ORD-2026-0090',
    enterpriseId: TARGET_ENTERPRISE_ID,
    enterpriseName: 'South Omo Community Heritage Cooperative',
    status: 'PLACED',
    subtotal: 1800.0,
    tax: 0,
    platformFee: 40.0,
    deliveryFee: 150.0,
    totalAmount: 1990.0,
    currency: 'ETB',
    itemCount: 1,
    createdAt: '2026-10-18T11:30:00Z',
  },
  {
    orderId: 'ord-003',
    orderNo: 'ORD-2026-0087',
    enterpriseId: TARGET_ENTERPRISE_ID,
    enterpriseName: 'South Omo Community Heritage Cooperative',
    status: 'PACKED',
    subtotal: 4200.0,
    tax: 0,
    platformFee: 80.0,
    deliveryFee: 150.0,
    totalAmount: 4430.0,
    currency: 'ETB',
    itemCount: 3,
    createdAt: '2026-10-17T15:20:00Z',
  },
  {
    orderId: 'ord-004',
    orderNo: 'ORD-2026-0085',
    enterpriseId: TARGET_ENTERPRISE_ID,
    enterpriseName: 'South Omo Community Heritage Cooperative',
    status: 'IN_TRANSIT',
    subtotal: 1250.0,
    tax: 0,
    platformFee: 25.0,
    deliveryFee: 150.0,
    totalAmount: 1425.0,
    currency: 'ETB',
    itemCount: 1,
    createdAt: '2026-10-17T09:15:00Z',
  },
  {
    orderId: 'ord-005',
    orderNo: 'ORD-2026-0081',
    enterpriseId: TARGET_ENTERPRISE_ID,
    enterpriseName: 'South Omo Community Heritage Cooperative',
    status: 'DELIVERED',
    subtotal: 3100.0,
    tax: 0,
    platformFee: 60.0,
    deliveryFee: 150.0,
    totalAmount: 3310.0,
    currency: 'ETB',
    itemCount: 2,
    createdAt: '2026-10-16T14:00:00Z',
  },
];

const mockDetailOrd001: OrderDetailResponse = {
  orderId: 'ord-001',
  orderNo: 'ORD-2026-0089',
  enterpriseId: TARGET_ENTERPRISE_ID,
  enterpriseName: 'South Omo Community Heritage Cooperative',
  buyerId: '11111111-1111-1111-1111-111111111111',
  buyerName: 'Elena Rostova',
  buyerPhone: '+251911998877',
  status: 'PAID',
  subtotal: 2400.0,
  tax: 0,
  platformFee: 50.0,
  deliveryFee: 150.0,
  totalAmount: 2600.0,
  currency: 'ETB',
  deliveryAddress: 'Turmi Lodge Reception, Front Desk',
  deliveryPhone: '+251911998877',
  notes: 'Please pack in secure bubble insulated box for export transit',
  items: [
    {
      id: 'item-001',
      productId: 'prod-001',
      productName: 'Pure Wild South Omo White Honey (500g)',
      productSku: 'OMO-HNY-500G',
      unitPrice: 420.0,
      quantity: 5,
      lineTotal: 2100.0,
    },
    {
      id: 'item-002',
      productId: 'prod-002',
      productName: 'Hand-dipped Beeswax Candles (Box of 4)',
      productSku: 'OMO-CNDL-04',
      unitPrice: 250.0,
      quantity: 1,
      lineTotal: 250.0,
    },
  ],
  statusHistories: [
    {
      id: 'hist-001',
      fromStatus: 'PLACED',
      toStatus: 'PAID',
      changedBy: 'Telebirr Webhook',
      reason: 'Payment confirmed via Telebirr gateway reference TEL-998877',
      createdAt: '2026-10-18T10:05:00Z',
    },
  ],
  createdAt: '2026-10-18T10:00:00Z',
};

const renderWithProviders = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <EnterpriseOrdersPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('EnterpriseOrdersPage Component (F-909)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: {
        id: 'user-ent-1',
        phoneNumber: '+251911000003',
        fullName: 'Abebe Bikila',
        roles: ['MICRO_ENTERPRISE'],
        enterpriseId: TARGET_ENTERPRISE_ID,
        enterpriseName: 'South Omo Community Heritage Cooperative',
        verificationStatus: 'VERIFIED',
      },
      token: 'mock-enterprise-token',
      isAuthenticated: true,
    });

    vi.spyOn(enterpriseService, 'getEnterpriseOrders').mockResolvedValue(mockOrdersList);
    vi.spyOn(enterpriseService, 'getEnterpriseOrderDetail').mockResolvedValue(mockDetailOrd001);
    vi.spyOn(enterpriseService, 'updateOrderStatus').mockImplementation(async (_eid, oid, status, reason) => ({
      ...mockDetailOrd001,
      orderId: oid,
      status: status as any,
      statusHistories: [
        ...(mockDetailOrd001.statusHistories || []),
        {
          id: `hist-${Date.now()}`,
          previousStatus: mockDetailOrd001.status,
          newStatus: status as any,
          reason,
          createdAt: new Date().toISOString(),
        },
      ],
    }));
  });

  it('renders overview KPIs and orders table correctly', async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText('ORD-2026-0089')).toBeInTheDocument();
    });

    // Overview KPIs
    expect(screen.getByText('Total Orders')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument(); // 5 total orders
    expect(screen.getByText('Awaiting Dispatch')).toBeInTheDocument();
    expect(screen.getAllByText('In Transit').length).toBeGreaterThanOrEqual(1);

    // Table rows
    expect(screen.getByText('ORD-2026-0089')).toBeInTheDocument();
    expect(screen.getByText('ORD-2026-0090')).toBeInTheDocument();
    expect(screen.getByText('ORD-2026-0087')).toBeInTheDocument();
    expect(screen.getByText('ORD-2026-0085')).toBeInTheDocument();
    expect(screen.getByText('ORD-2026-0081')).toBeInTheDocument();
  });

  it('filters orders by status tabs', async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText('ORD-2026-0089')).toBeInTheDocument();
    });

    // Click PAID filter tab
    fireEvent.click(screen.getByTestId('tab-paid'));
    expect(screen.getByText('ORD-2026-0089')).toBeInTheDocument();
    expect(screen.queryByText('ORD-2026-0090')).not.toBeInTheDocument();
    expect(screen.queryByText('ORD-2026-0085')).not.toBeInTheDocument();

    // Click IN_TRANSIT tab
    fireEvent.click(screen.getByTestId('tab-in_transit'));
    expect(screen.getByText('ORD-2026-0085')).toBeInTheDocument();
    expect(screen.queryByText('ORD-2026-0089')).not.toBeInTheDocument();

    // Click ALL tab to restore
    fireEvent.click(screen.getByTestId('tab-all'));
    expect(screen.getByText('ORD-2026-0089')).toBeInTheDocument();
    expect(screen.getByText('ORD-2026-0090')).toBeInTheDocument();
  });

  it('searches orders by order number', async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText('ORD-2026-0089')).toBeInTheDocument();
    });

    const searchInput = screen.getByTestId('search-orders-input');
    fireEvent.change(searchInput, { target: { value: '0087' } });

    expect(screen.getByText('ORD-2026-0087')).toBeInTheDocument();
    expect(screen.queryByText('ORD-2026-0089')).not.toBeInTheDocument();
    expect(screen.queryByText('ORD-2026-0090')).not.toBeInTheDocument();
  });

  it('handles state transition: PLACED -> PAID', async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByTestId('order-row-ord-002')).toBeInTheDocument();
    });

    // ord-002 is PLACED, button should say 'Mark Paid'
    const transitionBtn = screen.getByTestId('btn-transition-ord-002');
    expect(transitionBtn).toHaveTextContent('Mark Paid');

    fireEvent.click(transitionBtn);

    await waitFor(() => {
      expect(enterpriseService.updateOrderStatus).toHaveBeenCalledWith(
        TARGET_ENTERPRISE_ID,
        'ord-002',
        'PAID',
        expect.any(String)
      );
    });
  });

  it('handles state transition: PAID -> PACKED', async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByTestId('order-row-ord-001')).toBeInTheDocument();
    });

    // ord-001 is PAID, button should say 'Mark Packed'
    const transitionBtn = screen.getByTestId('btn-transition-ord-001');
    expect(transitionBtn).toHaveTextContent('Mark Packed');

    fireEvent.click(transitionBtn);

    await waitFor(() => {
      expect(enterpriseService.updateOrderStatus).toHaveBeenCalledWith(
        TARGET_ENTERPRISE_ID,
        'ord-001',
        'PACKED',
        expect.any(String)
      );
    });
  });

  it('handles state transition: PACKED -> IN_TRANSIT', async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByTestId('order-row-ord-003')).toBeInTheDocument();
    });

    // ord-003 is PACKED, button should say 'Dispatch'
    const transitionBtn = screen.getByTestId('btn-transition-ord-003');
    expect(transitionBtn).toHaveTextContent('Dispatch');

    fireEvent.click(transitionBtn);

    await waitFor(() => {
      expect(enterpriseService.updateOrderStatus).toHaveBeenCalledWith(
        TARGET_ENTERPRISE_ID,
        'ord-003',
        'IN_TRANSIT',
        expect.any(String)
      );
    });
  });

  it('handles state transition: IN_TRANSIT -> DELIVERED', async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByTestId('order-row-ord-004')).toBeInTheDocument();
    });

    // ord-004 is IN_TRANSIT, button should say 'Confirm Delivered'
    const transitionBtn = screen.getByTestId('btn-transition-ord-004');
    expect(transitionBtn).toHaveTextContent('Confirm Delivered');

    fireEvent.click(transitionBtn);

    await waitFor(() => {
      expect(enterpriseService.updateOrderStatus).toHaveBeenCalledWith(
        TARGET_ENTERPRISE_ID,
        'ord-004',
        'DELIVERED',
        expect.any(String)
      );
    });
  });

  it('guards terminal states: DELIVERED orders have no transition button', async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByTestId('order-row-ord-005')).toBeInTheDocument();
    });

    // ord-005 is DELIVERED, should NOT have transition button or cancel button
    expect(screen.queryByTestId('btn-transition-ord-005')).not.toBeInTheDocument();
    expect(screen.queryByTestId('btn-cancel-ord-005')).not.toBeInTheDocument();
  });

  it('opens order details modal with line items and audit trail', async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByTestId('btn-view-ord-001')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('btn-view-ord-001'));

    await waitFor(() => {
      expect(screen.getByTestId('order-detail-modal')).toBeInTheDocument();
      expect(screen.getByText('Elena Rostova')).toBeInTheDocument();
    });

    expect(screen.getByText('Turmi Lodge Reception, Front Desk')).toBeInTheDocument();
    expect(screen.getByText('Pure Wild South Omo White Honey (500g)')).toBeInTheDocument();
    expect(screen.getByText('Hand-dipped Beeswax Candles (Box of 4)')).toBeInTheDocument();
    expect(screen.getByText(/Payment confirmed via Telebirr gateway/)).toBeInTheDocument();
  });

  it('opens printable packing slip with origin guarantee and items checklist', async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByTestId('btn-packing-slip-ord-001')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('btn-packing-slip-ord-001'));

    await waitFor(() => {
      expect(screen.getByTestId('packing-slip-modal')).toBeInTheDocument();
      expect(screen.getByTestId('printable-slip-content')).toBeInTheDocument();
    });

    expect(screen.getByText('Kinka Fair-Trade Network')).toBeInTheDocument();
    expect(screen.getByText('TRACE-QR')).toBeInTheDocument();
    expect(screen.getByTestId('btn-print-slip')).toBeInTheDocument();
  });

  it('allows cancelling an order with reason confirmation modal', async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByTestId('btn-cancel-ord-002')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('btn-cancel-ord-002'));

    await waitFor(() => {
      expect(screen.getByTestId('cancel-order-modal')).toBeInTheDocument();
    });

    const reasonInput = screen.getByTestId('cancel-reason-input');
    fireEvent.change(reasonInput, { target: { value: 'Customer requested cancellation due to travel rescheduling' } });

    fireEvent.click(screen.getByTestId('confirm-cancel-button'));

    await waitFor(() => {
      expect(enterpriseService.updateOrderStatus).toHaveBeenCalledWith(
        TARGET_ENTERPRISE_ID,
        'ord-002',
        'CANCELLED',
        'Customer requested cancellation due to travel rescheduling'
      );
    });
  });
});
