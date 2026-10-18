import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import axe from 'axe-core';
import ProductsPage from '../pages/public/ProductsPage';
import { productService } from '../features/products';
import type { ProductResponse } from '../types/api';
import { queryKeys } from '../services/queryKeys';
import i18n from '../i18n';

const products: ProductResponse[] = [
  {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-000000000001',
    name: 'Honey',
    category: 'Food',
    unitPrice: 1234.56,
    currency: 'ETB',
    availableStock: 3,
    published: true,
  },
  {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-000000000002',
    name: 'Basket',
    category: 'Crafts',
    unitPrice: 200,
    currency: 'ETB',
    availableStock: 0,
    published: true,
  },
  {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-000000000003',
    name: 'Private product',
    category: 'Secret',
    published: false,
  },
  { id: 'aaaaaaaa-aaaa-4aaa-8aaa-000000000004', name: 'Unverified product' },
];
let client: QueryClient;
function show(data?: ProductResponse[]) {
  client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  if (data) client.setQueryData(queryKeys.products.list(), data);
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <ProductsPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
});
afterEach(async () => {
  cleanup();
  client?.clear();
  vi.restoreAllMocks();
  await i18n.changeLanguage('en');
});

describe('Product catalog F-501', () => {
  it('renders published products and server price/availability only', async () => {
    vi.spyOn(productService, 'getProducts').mockResolvedValue(products);
    show();
    expect(await screen.findByRole('heading', { name: 'Honey' })).toBeInTheDocument();
    expect(screen.getByText('1,234.56 ETB')).toBeInTheDocument();
    expect(screen.getByText('In stock')).toBeInTheDocument();
    expect(screen.getByText('Out of stock')).toBeInTheDocument();
    expect(screen.queryByText('Private product')).not.toBeInTheDocument();
    expect(screen.queryByText('Unverified product')).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Secret' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View details for Honey' })).toHaveAttribute(
      'href',
      `/products/${products[0].id}`
    );
  });
  it('combines search and category filters and handles no matches', async () => {
    show(products);
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'Crafts' } });
    expect(screen.queryByRole('heading', { name: 'Honey' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Basket' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Search products'), { target: { value: 'honey' } });
    expect(screen.getByText(/No products found/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: '' } });
    expect(screen.getByRole('heading', { name: 'Honey' })).toBeInTheDocument();
  });
  it('paginates the received list and resets pagination when filters change', () => {
    show(
      Array.from({ length: 13 }, (_, index) => ({
        ...products[0],
        id: String(index),
        name: `Product ${index}`,
      }))
    );
    expect(screen.getAllByRole('article')).toHaveLength(12);
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getAllByRole('article')).toHaveLength(1);
    expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Search products'), { target: { value: 'Product 0' } });
    expect(screen.getByRole('heading', { name: 'Product 0' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Product pages' })).not.toBeInTheDocument();
  });
  it('shows loading and a retryable error, then recovers', async () => {
    vi.spyOn(productService, 'getProducts')
      .mockRejectedValueOnce(new Error('API failure'))
      .mockResolvedValue(products);
    show();
    expect(screen.getByText('Loading products')).toBeInTheDocument();
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load products.');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { name: 'Honey' })).toBeInTheDocument();
  });
  it('shows an empty catalog without pagination', () => {
    show([]);
    expect(screen.getByText(/No products found/)).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Product pages' })).not.toBeInTheDocument();
  });
  it('labels cached results offline and explains a cold offline visit', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    vi.spyOn(productService, 'getProducts').mockImplementation(() => new Promise(() => {}));
    const view = show(products);
    expect(screen.getByText(/Displayed prices and stock/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Honey' })).toBeInTheDocument();
    view.unmount();
    show();
    expect(
      screen.getByText('Connect to the internet to load the product catalog.')
    ).toBeInTheDocument();
    expect(screen.queryByText('Loading products')).not.toBeInTheDocument();
  });
  it('does not invent a zero price or stock value when fields are missing', () => {
    show([{ id: products[0].id, name: 'Unknown', published: true }]);
    expect(screen.getByText('Price not provided')).toBeInTheDocument();
    expect(screen.getByText('Availability not provided')).toBeInTheDocument();
    expect(screen.queryByText('0.00 ETB')).not.toBeInTheDocument();
  });
  it('supports Amharic fallback and semantic accessibility', async () => {
    await i18n.changeLanguage('fr');
    const { container } = show(products);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('የደቡብ ኦሞ ምርቶች');
    const results = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
    await waitFor(() => expect(results.violations).toEqual([]));
  });
});
