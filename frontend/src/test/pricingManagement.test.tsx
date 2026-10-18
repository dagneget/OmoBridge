import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PricingManagementPage from '../pages/dashboard/enterprise/PricingManagementPage';
import { useAuthStore } from '../features/auth/authStore';
import { enterpriseService } from '../features/enterprise/enterpriseService';
import { mockUsers } from '../mocks/fixtures/users';
import {
  mockBuyingPrices,
  mockProductTypes,
} from '../mocks/fixtures/enterprise';

const TARGET_ENTERPRISE_ID = '33333333-3333-3333-3333-333333333333';

describe('Product Types and Published Buying Prices (F-803)', () => {
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

    vi.spyOn(enterpriseService, 'getBuyingPrices').mockResolvedValue(mockBuyingPrices);
    vi.spyOn(enterpriseService, 'getProductTypes').mockResolvedValue(mockProductTypes);
    vi.spyOn(enterpriseService, 'createBuyingPrice').mockImplementation(async (req) => {
      return {
        id: 'bp-new-123',
        enterpriseId: req.enterpriseId,
        productTypeId: req.productTypeId,
        productTypeName: 'South Omo White Forest Honey',
        grade: req.grade,
        pricePerUnit: req.pricePerUnit,
        effectiveFrom: new Date().toISOString(),
        isActive: true,
      };
    });
    vi.spyOn(enterpriseService, 'createProductType').mockImplementation(async (req) => {
      return {
        id: 'pt-new-456',
        code: req.code,
        name: req.name,
        category: req.category,
        unit: req.unit,
        description: req.description,
      };
    });
  });

  const renderPage = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/dashboard/enterprise/pricing']}>
          <PricingManagementPage />
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  it('renders header, USSD broadcast notice, and active buying rates table', async () => {
    renderPage();

    expect(await screen.findByText(/Buying Prices & Product Types/i)).toBeInTheDocument();
    expect(screen.getByText(/Live USSD Broadcast \(\*844#\)/i)).toBeInTheDocument();
    expect(await screen.findByTestId('buying-prices-table')).toBeInTheDocument();

    // Honey Grade A price check
    expect(screen.getByText(/Grade A/i)).toBeInTheDocument();
    expect(screen.getByText(/350.00 ETB/i)).toBeInTheDocument();
  });

  it('filters buying prices by search query', async () => {
    renderPage();

    expect(await screen.findByTestId('buying-prices-table')).toBeInTheDocument();
    expect(screen.getByText(/Wild Forest Arabica Coffee/i)).toBeInTheDocument();
    expect(screen.getAllByText(/South Omo White Forest Honey/i).length).toBeGreaterThanOrEqual(1);

    const searchInput = screen.getByTestId('pricing-search-input');
    fireEvent.change(searchInput, { target: { value: 'Coffee' } });

    expect(screen.getByText(/Wild Forest Arabica Coffee/i)).toBeInTheDocument();
    expect(screen.queryByText(/South Omo White Forest Honey/i)).not.toBeInTheDocument();
  });

  it('switches between Buying Rates tab and Commodity Types catalog tab', async () => {
    renderPage();

    expect(await screen.findByTestId('buying-prices-table')).toBeInTheDocument();

    const typesTab = screen.getByTestId('tab-product-types');
    fireEvent.click(typesTab);

    expect(await screen.findByTestId('product-types-table')).toBeInTheDocument();
    expect(screen.getByText(/HONEY-WHITE/i)).toBeInTheDocument();
    expect(screen.getByText(/COFFEE-ARABICA/i)).toBeInTheDocument();
    expect(screen.getByText(/Organic White Humera Sesame/i)).toBeInTheDocument();
  });

  it('opens publish buying price modal, selects commodity, and saves new rate', async () => {
    renderPage();

    const openBtn = await screen.findByTestId('publish-buying-price-button');
    fireEvent.click(openBtn);

    expect(await screen.findByTestId('publish-price-modal')).toBeInTheDocument();

    // Select commodity product type
    const select = screen.getByTestId('price-product-type-select');
    fireEvent.change(select, { target: { value: 'pt-honey-001' } });

    // Enter grade
    const gradeInput = screen.getByTestId('price-grade-input');
    fireEvent.change(gradeInput, { target: { value: 'Premium Grade A+' } });

    // Enter price per unit
    const priceInput = screen.getByTestId('price-amount-input');
    fireEvent.change(priceInput, { target: { value: '380.50' } });

    const submitBtn = screen.getByTestId('submit-price-button');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(enterpriseService.createBuyingPrice).toHaveBeenCalledWith({
        enterpriseId: TARGET_ENTERPRISE_ID,
        productTypeId: 'pt-honey-001',
        grade: 'Premium Grade A+',
        pricePerUnit: 380.5,
      });
    });

    expect(await screen.findByTestId('notification-banner')).toBeInTheDocument();
    expect(screen.getByText(/Buying rate of 380.50 ETB published/i)).toBeInTheDocument();
  });

  it('opens add commodity type modal and saves a new product type', async () => {
    renderPage();

    const openBtn = await screen.findByTestId('add-commodity-type-button');
    fireEvent.click(openBtn);

    expect(await screen.findByTestId('add-type-modal')).toBeInTheDocument();

    fireEvent.change(screen.getByTestId('type-code-input'), { target: { value: 'MORINGA-LEAF' } });
    fireEvent.change(screen.getByTestId('type-name-input'), { target: { value: 'Organic Dried Moringa Leaf' } });
    fireEvent.change(screen.getByTestId('type-category-select'), { target: { value: 'SPICE' } });
    fireEvent.change(screen.getByTestId('type-unit-input'), { target: { value: 'KG' } });

    const submitBtn = screen.getByTestId('submit-type-button');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(enterpriseService.createProductType).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'MORINGA-LEAF',
          name: 'Organic Dried Moringa Leaf',
          category: 'SPICE',
          unit: 'KG',
        })
      );
    });

    expect(await screen.findByTestId('notification-banner')).toBeInTheDocument();
    expect(screen.getByText(/New commodity type "Organic Dried Moringa Leaf" added/i)).toBeInTheDocument();
  });

  it('handles query error and provides retry capability', async () => {
    vi.spyOn(enterpriseService, 'getBuyingPrices').mockRejectedValue(new Error('Network error'));
    renderPage();

    expect(await screen.findByText(/Unable to load enterprise buying prices/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
  });
});
