import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import axe from 'axe-core';
import ProductDetailsPage from '../pages/public/ProductDetailsPage';
import { productService } from '../features/products';
import { NormalizedApiError } from '../services/apiError';
import { queryKeys } from '../services/queryKeys';
import type { ProductResponse } from '../types/api';
import i18n from '../i18n';

const id = 'ffffffff-ffff-4fff-8fff-000000000001';
const product: ProductResponse = {
  id, name: 'Forest honey', enterpriseName: 'Honey cooperative',
  published: true, description: 'Wild honey from South Omo.', story: 'Harvested by local beekeepers.',
  availableStock: 12.375, unit: 'kg', unitPrice: 420, currency: 'ETB',
  priceBreakdown: { purchaseCost: 100, platformFee: 0, totalPrice: 999.99 },
  traceToken: 'TRACE-HONEY-001',
};
let client: QueryClient;
function show(cached?: ProductResponse, routeId = id) {
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  if (cached) client.setQueryData(queryKeys.products.detail(routeId), cached);
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/products/${routeId}`]}>
        <Routes><Route path="/products/:id" element={<ProductDetailsPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}
beforeEach(async () => {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
  await i18n.changeLanguage('en');
});
afterEach(async () => {
  cleanup(); client?.clear(); vi.restoreAllMocks(); await i18n.changeLanguage('en');
});

describe('Product detail F-502', () => {
  it('renders server story, price, producer cost, stock precision and trace navigation', async () => {
    const get = vi.spyOn(productService, 'getProduct').mockResolvedValue(product);
    const { container } = show();
    expect(await screen.findByRole('heading', { name: 'Forest honey' })).toBeInTheDocument();
    expect(screen.getByText(product.story!)).toBeInTheDocument();
    expect(screen.getByText(product.description!)).toBeInTheDocument();
    expect(screen.getByText('420.00 ETB')).toBeInTheDocument();
    expect(screen.getByText('999.99 ETB')).toBeInTheDocument();
    expect(screen.getByText('100.00 ETB')).toBeInTheDocument();
    expect(screen.getByText('0.00 ETB')).toBeInTheDocument();
    expect(screen.getByText('12.375')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View product trace' })).toHaveAttribute('href', '/trace/TRACE-HONEY-001');
    expect(get).toHaveBeenCalledWith(id, expect.any(AbortSignal));
    expect(screen.getByRole('link', { name: 'Back to products' })).toHaveAttribute('href', '/products');
    const result = await axe.run(container, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
    expect(result.violations).toEqual([]);
  });
  it('shows loading and then unavailable for a server 404', async () => {
    let reject!: (reason: Error) => void;
    vi.spyOn(productService, 'getProduct').mockImplementation(() => new Promise((_, fail) => { reject = fail; }));
    show();
    expect(screen.getByText('Loading product…')).toHaveAttribute('aria-busy', 'true');
    await act(async () => reject(new NormalizedApiError({ status: 404, message: 'missing' })));
    expect(await screen.findByText(/no longer published/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
  });
  it.each([
    { ...product, published: false },
    { ...product, published: undefined },
    { ...product, id: 'ffffffff-ffff-4fff-8fff-000000000002' },
  ])('hides unpublished, unverified or mismatched responses', async (data) => {
    vi.spyOn(productService, 'getProduct').mockResolvedValue(data);
    show();
    expect(await screen.findByText(/no longer published/)).toBeInTheDocument();
    expect(screen.queryByText(product.story!)).not.toBeInTheDocument();
  });
  it('rejects malformed route identifiers without sending a request', () => {
    const get = vi.spyOn(productService, 'getProduct'); show(undefined, 'not-a-uuid');
    expect(screen.getByText(/no longer published/)).toBeInTheDocument();
    expect(get).not.toHaveBeenCalled();
  });
  it('retries an API failure and recovers', async () => {
    const get = vi.spyOn(productService, 'getProduct').mockRejectedValueOnce(new Error('failure')).mockResolvedValue(product);
    show();
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load this product');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { name: product.name })).toBeInTheDocument();
    expect(get).toHaveBeenCalledTimes(2);
  });
  it.each([401, 403])('handles access errors without exposing response messages (%s)', async (status) => {
    vi.spyOn(productService, 'getProduct').mockRejectedValue(new NormalizedApiError({ status, message: 'private diagnostic' }));
    show(); expect(await screen.findByRole('alert')).toHaveTextContent('You cannot access this product.');
    expect(screen.queryByText('private diagnostic')).not.toBeInTheDocument();
  });
  it('shows offline cold-load and retained-data states', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    vi.spyOn(productService, 'getProduct').mockResolvedValue(product);
    show(); expect(screen.getByText('Connect to the internet to load this product.')).toBeInTheDocument();
    cleanup(); client.clear();
    show(product);
    expect(screen.getByRole('heading', { name: product.name })).toBeInTheDocument();
    expect(screen.getByText(/Saved product details may be out of date/)).toBeInTheDocument();
  });
  it('preserves zero stock and price, and does not invent missing fields or trace links', async () => {
    vi.spyOn(productService, 'getProduct').mockResolvedValue({ id, published: true, unitPrice: 0, currency: 'ETB', availableStock: 0 });
    show(); expect(await screen.findByRole('heading', { name: 'Product' })).toBeInTheDocument();
    expect(screen.getByText('Out of stock')).toBeInTheDocument();
    expect(screen.getByText('0.00 ETB')).toBeInTheDocument();
    expect(screen.getByText('No description is available yet.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'View product trace' })).not.toBeInTheDocument();
  });
  it('keeps missing or invalid stock and prices unknown', async () => {
    vi.spyOn(productService, 'getProduct').mockResolvedValue({ id, published: true, unitPrice: Number.NaN, availableStock: Number.NaN });
    show(); expect(await screen.findByText('Price unavailable')).toBeInTheDocument();
    expect(screen.getByText('Stock information unavailable')).toBeInTheDocument();
    expect(screen.queryByText('In stock')).not.toBeInTheDocument();
  });
  it('encodes trace tokens and renders server text as plain text', async () => {
    vi.spyOn(productService, 'getProduct').mockResolvedValue({ ...product, story: '<script>unsafe()</script>', traceToken: '../token?x=1#part' });
    const { container } = show();
    expect(await screen.findByText('<script>unsafe()</script>')).toBeInTheDocument();
    expect(container.querySelector('script')).toBeNull();
    expect(screen.getByRole('link', { name: 'View product trace' })).toHaveAttribute('href', '/trace/..%2Ftoken%3Fx%3D1%23part');
  });
  it('uses Amharic fallback for an unavailable selected language', async () => {
    await i18n.changeLanguage('zz'); vi.spyOn(productService, 'getProduct').mockResolvedValue(product); show();
    await waitFor(() => expect(screen.getByRole('link', { name: 'ወደ ምርቶች ተመለስ' })).toBeInTheDocument());
  });
});
