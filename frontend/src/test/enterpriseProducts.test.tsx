import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { useAuthStore } from '../features/auth/authStore';
import { enterpriseService } from '../features/enterprise/enterpriseService';
import EnterpriseProductsPage from '../pages/dashboard/enterprise/EnterpriseProductsPage';
import {
  mockEnterpriseProducts,
  mockProductionBatches,
} from '../mocks/fixtures/enterprise';

const TARGET_ENTERPRISE_ID = '33333333-3333-3333-3333-333333333333';

function renderProductsPage(initialUrl: string = '/dashboard/enterprise/products') {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialUrl]}>
        <EnterpriseProductsPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('F-907 & F-908: Enterprise Product Creation from Output & Transparent Pricing', () => {
  beforeEach(() => {
    vi.restoreAllMocks();

    useAuthStore.setState({
      user: {
        id: 'test-user-enterprise',
        email: 'coop@southomo.org',
        roles: ['MICRO_ENTERPRISE'],
        enterpriseId: TARGET_ENTERPRISE_ID,
        enterpriseName: 'South Omo Community Heritage Cooperative',
        fullName: 'Ato Berhanu Haile',
      },
      token: 'mock-enterprise-token',
      isAuthenticated: true,
      activeRole: 'MICRO_ENTERPRISE',
    });

    vi.spyOn(enterpriseService, 'getEnterpriseProducts').mockResolvedValue(
      mockEnterpriseProducts.map((p) => ({ ...p }))
    );

    vi.spyOn(enterpriseService, 'getProductionBatches').mockResolvedValue(
      mockProductionBatches.map((b) => ({ ...b }))
    );

    vi.spyOn(enterpriseService, 'createProductFromOutput').mockImplementation(async (_eid, req) => {
      return {
        id: 'prod-new-001',
        enterpriseId: TARGET_ENTERPRISE_ID,
        sku: req.sku,
        name: req.name,
        category: req.category,
        packSize: req.packSize,
        unitPrice: 485.0,
        currency: 'ETB',
        stockOnHand: req.initialStock,
        stockReserved: 0,
        availableStock: req.initialStock,
        published: req.publishImmediately ?? true,
        traceToken: 'TRC-OMO-NEW-001',
        priceBreakdown: {
          purchaseCost: 280.0,
          processingCost: 35.0,
          packagingCost: 25.0,
          laborCost: 20.0,
          transportCost: req.transportCost || 15.0,
          enterpriseMargin: 55.0,
          communityFund: 15.0,
          platformFee: 10.0,
          taxAmount: 30.0,
          totalPrice: 485.0,
        },
      };
    });

    vi.spyOn(enterpriseService, 'publishProduct').mockImplementation(async (_eid, productId, publish) => {
      const found = mockEnterpriseProducts.find((p) => p.id === productId);
      return {
        ...(found || mockEnterpriseProducts[0]),
        published: publish,
      };
    });

    vi.spyOn(enterpriseService, 'adjustProductStock').mockImplementation(async (_eid, productId, req) => {
      return {
        id: 'smov-test-01',
        productId,
        movementType: req.quantity >= 0 ? 'RESTOCK' : 'ADJUSTMENT',
        quantity: req.quantity,
        stockAfter: 67,
        reason: req.reason,
        createdAt: new Date().toISOString(),
      };
    });
  });

  it('renders enterprise products page with header, KPIs, and products table', async () => {
    renderProductsPage();

    expect(await screen.findByTestId('products-table')).toBeInTheDocument();
    expect(screen.getByTestId('kpi-total-products')).toHaveTextContent('2');
    expect(screen.getByTestId('kpi-published-products')).toHaveTextContent('1');

    // Verify row for prod-001
    expect(screen.getByText('Pure Wild South Omo White Honey (500g)')).toBeInTheDocument();
    expect(screen.getByText('OMO-HNY-500G')).toBeInTheDocument();
    expect(screen.getByTestId('product-status-prod-001')).toHaveTextContent('Published');

    // Verify row for prod-002
    expect(screen.getByText('Hand-dipped Beeswax Candles (Box of 4)')).toBeInTheDocument();
    expect(screen.getByTestId('product-status-prod-002')).toHaveTextContent('Draft');
  });

  it('filters products by status tabs (Published, Drafts) and search', async () => {
    renderProductsPage();

    await screen.findByTestId('products-table');

    // Filter by PUBLISHED
    fireEvent.click(screen.getByTestId('filter-status-PUBLISHED'));
    expect(screen.getByText('Pure Wild South Omo White Honey (500g)')).toBeInTheDocument();
    expect(screen.queryByText('Hand-dipped Beeswax Candles (Box of 4)')).not.toBeInTheDocument();

    // Filter by UNPUBLISHED (Drafts)
    fireEvent.click(screen.getByTestId('filter-status-UNPUBLISHED'));
    expect(screen.queryByText('Pure Wild South Omo White Honey (500g)')).not.toBeInTheDocument();
    expect(screen.getByText('Hand-dipped Beeswax Candles (Box of 4)')).toBeInTheDocument();

    // Reset to ALL
    fireEvent.click(screen.getByTestId('filter-status-ALL'));

    // Search query
    const searchInput = screen.getByTestId('search-products-input');
    fireEvent.change(searchInput, { target: { value: 'Honey' } });
    expect(screen.getByText('Pure Wild South Omo White Honey (500g)')).toBeInTheDocument();
    expect(screen.queryByText('Hand-dipped Beeswax Candles (Box of 4)')).not.toBeInTheDocument();
  });

  it('opens fair-trade price breakdown modal with exact transparent lines (B-402)', async () => {
    renderProductsPage();

    const viewBreakdownBtn = await screen.findByTestId('view-breakdown-prod-001');
    fireEvent.click(viewBreakdownBtn);

    expect(screen.getByTestId('breakdown-modal')).toBeInTheDocument();
    expect(screen.getByText(/Fair-Trade Price Breakdown/i)).toBeInTheDocument();

    // Check farmgate cost line
    expect(screen.getByTestId('breakdown-purchase-val')).toHaveTextContent(/280/);

    // Check community fund and total retail price
    expect(screen.getByText(/South Omo Community Fund \(3%\):/i)).toBeInTheDocument();
    expect(screen.getByTestId('breakdown-total-val')).toHaveTextContent(/420/);
  });

  it('opens product creation modal with live price calculation and creates product', async () => {
    renderProductsPage();

    const createBtn = await screen.findByTestId('create-product-btn');
    fireEvent.click(createBtn);

    expect(screen.getByTestId('create-product-modal')).toBeInTheDocument();
    expect(screen.getByTestId('pricing-preview-card')).toBeInTheDocument();

    // Enter SKU and product name
    const skuInput = screen.getByTestId('product-sku-input');
    fireEvent.change(skuInput, { target: { value: 'OMO-HNY-PREMIUM' } });

    const nameInput = screen.getByTestId('product-name-input');
    fireEvent.change(nameInput, { target: { value: 'Mago Valley Reserve Honey' } });

    // Submit form
    const submitBtn = screen.getByTestId('submit-create-product-btn');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(enterpriseService.createProductFromOutput).toHaveBeenCalledWith(
        TARGET_ENTERPRISE_ID,
        expect.objectContaining({
          sku: 'OMO-HNY-PREMIUM',
          name: 'Mago Valley Reserve Honey',
        })
      );
    });

    expect(await screen.findByTestId('product-feedback-banner')).toBeInTheDocument();
  });

  it('toggles product publishing status to public storefront', async () => {
    renderProductsPage();

    const toggleBtn = await screen.findByTestId('toggle-publish-btn-prod-001');
    expect(toggleBtn).toHaveTextContent(/Unpublish/i);

    fireEvent.click(toggleBtn);

    await waitFor(() => {
      expect(enterpriseService.publishProduct).toHaveBeenCalledWith(
        TARGET_ENTERPRISE_ID,
        'prod-001',
        false
      );
    });
  });

  it('opens stock adjustment modal and adjusts inventory stock', async () => {
    renderProductsPage();

    const adjustBtn = await screen.findByTestId('adjust-stock-btn-prod-001');
    fireEvent.click(adjustBtn);

    expect(screen.getByTestId('stock-adjust-modal')).toBeInTheDocument();

    const deltaInput = screen.getByTestId('stock-delta-input');
    fireEvent.change(deltaInput, { target: { value: '25' } });

    const reasonInput = screen.getByTestId('stock-reason-input');
    fireEvent.change(reasonInput, { target: { value: 'Packaging batch bottling complete' } });

    const confirmBtn = screen.getByTestId('confirm-stock-adjust-btn');
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(enterpriseService.adjustProductStock).toHaveBeenCalledWith(
        TARGET_ENTERPRISE_ID,
        'prod-001',
        {
          quantity: 25,
          reason: 'Packaging batch bottling complete',
        }
      );
    });

    expect(await screen.findByTestId('product-feedback-banner')).toBeInTheDocument();
  });
});
