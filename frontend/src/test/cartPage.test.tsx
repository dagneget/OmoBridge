import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import axe from 'axe-core';
import CartPage from '../pages/public/CartPage';
import { AddToCart, cartStore } from '../features/cart';
import { productService } from '../features/products';
import { NormalizedApiError } from '../services/apiError';
import type { ProductResponse } from '../types/api';
import i18n from '../i18n';

const a = 'ffffffff-ffff-4fff-8fff-000000000001';
const b = 'ffffffff-ffff-4fff-8fff-000000000002';
const seller = '11111111-1111-4111-8111-000000000001';
const honey: ProductResponse = { id: a, name: 'Honey', unitPrice: 420, currency: 'ETB', unit: 'kg', published: true, availableStock: 10, enterpriseId: seller, enterpriseName: 'Honey cooperative' };
const basket: ProductResponse = { ...honey, id: b, name: 'Basket', enterpriseId: '11111111-1111-4111-8111-000000000002', enterpriseName: 'Artisans', unitPrice: 380, unit: 'piece' };
let products: Map<string, ProductResponse>;
function show(start = '/cart') {
  return render(<main><MemoryRouter initialEntries={[start]}><Routes>
    <Route path="/cart" element={<CartPage />} />
    <Route path="/product" element={<AddToCart product={honey} />} />
  </Routes></MemoryRouter></main>);
}
const row = (name = 'Honey') => within(screen.getByRole('article', { name }));
beforeEach(async () => {
  localStorage.clear(); cartStore.getState().clear();
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
  products = new Map([[a, honey], [b, basket]]);
  vi.spyOn(productService, 'getProduct').mockImplementation(async (id) => {
    const product = products.get(id);
    if (!product) throw new NormalizedApiError({ status: 404, message: 'missing' });
    return product;
  });
  await i18n.changeLanguage('en');
});
afterEach(async () => {
  cleanup(); vi.restoreAllMocks(); cartStore.getState().clear(); localStorage.clear(); await i18n.changeLanguage('en');
});

describe('Cart page F-504', () => {
  it('shows an empty cart and catalog link without a checkout action', () => {
    show(); expect(screen.getByText('Your cart is empty.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Browse products' })).toHaveAttribute('href', '/products');
    expect(screen.queryByRole('link', { name: 'Continue to checkout' })).not.toBeInTheDocument();
  });
  it('adds from a product, navigates to cart, edits a fractional quantity and removes it', async () => {
    show('/product'); fireEvent.change(screen.getByLabelText('Quantity'), { target: { value: '.125' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add to cart' }));
    expect(screen.getByText(/Added to your cart/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: 'View cart' }));
    expect(await screen.findByRole('heading', { name: 'Honey cooperative' })).toBeInTheDocument();
    expect(row().getByLabelText('Quantity for Honey')).toHaveValue(.125);
    fireEvent.change(row().getByLabelText('Quantity for Honey'), { target: { value: '2.375' } });
    fireEvent.click(row().getByRole('button', { name: 'Update quantity' }));
    await waitFor(() => expect(cartStore.getState().getCheckoutItems()).toEqual([{ productId: a, quantity: 2.375 }]));
    fireEvent.click(row().getByRole('button', { name: 'Remove Honey' }));
    expect(screen.getByText('Your cart is empty.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Your cart' })).toHaveFocus();
  });
  it('groups sellers, shows unit prices only, and passes semantic accessibility', async () => {
    cartStore.getState().add(a, 2); cartStore.getState().add(b, 3);
    const { container } = show();
    expect(await screen.findByRole('heading', { name: 'Artisans' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Honey cooperative' })).toBeInTheDocument();
    expect(row().getByText('Unit price: 420.00 ETB')).toBeInTheDocument();
    expect(row('Basket').getByText('Unit price: 380.00 ETB')).toBeInTheDocument();
    expect(screen.queryByText(/1,980/)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Continue to checkout' })).toHaveAttribute('href', '/checkout');
    expect(screen.getByText(/Final prices and availability are confirmed by the server/)).toBeInTheDocument();
    const result = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
    expect(result.violations).toEqual([]);
  });
  it('shows loading while stock and prices are checked', async () => {
    let resolve!: (value: ProductResponse) => void;
    vi.mocked(productService.getProduct).mockImplementation(() => new Promise((done) => { resolve = done; }));
    cartStore.getState().add(a, 1); show();
    expect(screen.getByText('Checking stock and prices…')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('button', { name: 'Continue to checkout' })).toBeDisabled();
    await waitFor(() => expect(productService.getProduct).toHaveBeenCalled());
    await act(async () => resolve(honey));
    expect(await screen.findByRole('link', { name: 'Continue to checkout' })).toBeInTheDocument();
  });
  it('flags an unavailable product, blocks checkout, and permits removal', async () => {
    products.delete(a); cartStore.getState().add(a, 1); show();
    expect(await screen.findByText('This product is no longer available. Remove it to continue.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue to checkout' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /Remove Product/ }));
    expect(screen.getByText('Your cart is empty.')).toBeInTheDocument();
  });
  it('flags insufficient stock and recovers after reducing quantity', async () => {
    products.set(a, { ...honey, availableStock: .5 }); cartStore.getState().add(a, 2); show();
    expect(await screen.findByText('There is not enough stock for this quantity.')).toBeInTheDocument();
    expect(screen.getByText('Available quantity: 0.5')).toBeInTheDocument();
    fireEvent.change(row().getByLabelText('Quantity for Honey'), { target: { value: '.5' } });
    fireEvent.click(row().getByRole('button', { name: 'Update quantity' }));
    expect(await screen.findByRole('link', { name: 'Continue to checkout' })).toBeInTheDocument();
  });
  it('requires acknowledgement of a refreshed price or currency change', async () => {
    cartStore.getState().add(a, 1); show();
    await screen.findByRole('link', { name: 'Continue to checkout' });
    products.set(a, { ...honey, unitPrice: 500 });
    fireEvent.click(screen.getByRole('button', { name: 'Refresh items' }));
    expect(await screen.findByText(/The price or currency has changed/)).toBeInTheDocument();
    expect(screen.getByText('Unit price: 500.00 ETB')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue to checkout' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Accept current price' }));
    expect(screen.getByRole('link', { name: 'Continue to checkout' })).toBeInTheDocument();
  });
  it('shows request failures and recovers on explicit refresh', async () => {
    vi.mocked(productService.getProduct).mockRejectedValueOnce(new Error('failure'));
    cartStore.getState().add(a, 1); show();
    expect(await screen.findByText(/Could not verify this product/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh items' }));
    expect(await screen.findByRole('heading', { name: 'Honey cooperative' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Continue to checkout' })).toBeInTheDocument();
  });
  it.each(['', '0', '-1', '.0001'])('rejects invalid edited quantity %s without mutating intent', async (quantity) => {
    cartStore.getState().add(a, 1); show(); await screen.findByRole('heading', { name: 'Honey cooperative' });
    fireEvent.change(row().getByLabelText('Quantity for Honey'), { target: { value: quantity } });
    fireEvent.click(row().getByRole('button', { name: 'Update quantity' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a quantity greater than zero');
    expect(cartStore.getState().items[0].quantity).toBe(1);
  });
  it('blocks checkout for unsaved quantity drafts and preserves them through refresh', async () => {
    cartStore.getState().add(a, 1); show();
    await screen.findByRole('link', { name: 'Continue to checkout' });
    fireEvent.change(row().getByLabelText('Quantity for Honey'), { target: { value: '2' } });
    expect(screen.getByRole('button', { name: 'Continue to checkout' })).toBeDisabled();
    expect(screen.getByText('Save your quantity changes before continuing to checkout.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh items' }));
    await waitFor(() => expect(cartStore.getState().phase).toBe('checked'));
    expect(row().getByLabelText('Quantity for Honey')).toHaveValue(2);
    expect(cartStore.getState().items[0].quantity).toBe(1);
    fireEvent.click(row().getByRole('button', { name: 'Update quantity' }));
    expect(await screen.findByRole('link', { name: 'Continue to checkout' })).toBeInTheDocument();
    expect(cartStore.getState().items[0].quantity).toBe(2);
  });
  it('allows offline edits with cached details and rechecks on reconnect', async () => {
    cartStore.getState().add(a, 1); await cartStore.getState().revalidate();
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false); show();
    expect(screen.getByRole('heading', { name: 'Honey cooperative' })).toBeInTheDocument();
    expect(screen.getByText(/You are offline. Saved details/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh items' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Continue to checkout' })).toBeDisabled();
    fireEvent.change(row().getByLabelText('Quantity for Honey'), { target: { value: '.5' } });
    fireEvent.click(row().getByRole('button', { name: 'Update quantity' }));
    expect(cartStore.getState().items[0].quantity).toBe(.5);
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    act(() => { window.dispatchEvent(new Event('online')); });
    expect(await screen.findByRole('link', { name: 'Continue to checkout' })).toBeInTheDocument();
  });
  it('shows unresolved persisted items on a cold offline visit without requesting products', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false); cartStore.getState().add(a, 1); show();
    expect(screen.getByRole('heading', { name: 'Seller details pending' })).toBeInTheDocument();
    expect(screen.getByText(`Product ${a}`)).toBeInTheDocument();
    expect(productService.getProduct).not.toHaveBeenCalled();
  });
  it('clears all items and exposes optional-storage failures', async () => {
    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    cartStore.getState().add(a, 1); show();
    expect(screen.getByText(/changes may not survive a reload/)).toBeInTheDocument();
    await screen.findByRole('heading', { name: 'Honey cooperative' });
    fireEvent.click(screen.getByRole('button', { name: 'Clear cart' }));
    expect(screen.getByText('Your cart is empty.')).toBeInTheDocument();
    write.mockRestore();
  });
  it('uses Amharic fallback for unsupported selected languages', async () => {
    await i18n.changeLanguage('zz'); show();
    expect(screen.getByRole('heading', { name: 'የእርስዎ ጋሪ' })).toBeInTheDocument();
    expect(screen.getByText('ጋሪዎ ባዶ ነው።')).toBeInTheDocument();
  });
});

describe('Add-to-cart controls', () => {
  it.each([0, NaN, undefined])('disables adding when stock is unavailable (%s)', (availableStock) => {
    render(<MemoryRouter><AddToCart product={{ ...honey, availableStock }} /></MemoryRouter>);
    expect(screen.getByRole('button', { name: 'Add to cart' })).toBeDisabled();
    expect(cartStore.getState().items).toEqual([]);
  });
  it('rejects an invalid quantity and preserves the previous cart', () => {
    show('/product'); fireEvent.change(screen.getByLabelText('Quantity'), { target: { value: '.0001' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add to cart' }));
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(cartStore.getState().items).toEqual([]);
  });
});
