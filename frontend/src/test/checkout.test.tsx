import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { orderConfirmationService } from '../features/checkout/orderConfirmationService';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import axe from 'axe-core';
import CheckoutPage from '../pages/public/CheckoutPage';
import { cartStore } from '../features/cart';
import { useAuthStore } from '../features/auth';
import { productService } from '../features/products';
import { useCheckoutStore } from '../features/checkout/checkoutStore';
import { checkoutService } from '../features/checkout/checkoutService';
import { NormalizedApiError } from '../services/apiError';
import type { CheckoutResponse, ProductResponse } from '../types/api';
import i18n from '../i18n';
const originalBootstrap = useAuthStore.getState().bootstrap;
const id = 'ffffffff-ffff-4fff-8fff-000000000001';
const seller = '11111111-1111-4111-8111-000000000001';
const product: ProductResponse = {
  id,
  enterpriseId: seller,
  name: 'Honey',
  published: true,
  unitPrice: 420,
  currency: 'ETB',
  availableStock: 10,
};
const result: CheckoutResponse = {
  checkoutGroupId: '22222222-2222-4222-8222-000000000001',
  groupNo: 'CHK-001',
  status: 'CREATED',
  totalAmount: 999,
  currency: 'ETB',
  orders: [
    {
      orderId: '33333333-3333-4333-8333-000000000001',
      orderNo: 'ORD-001',
      enterpriseId: seller,
      enterpriseName: 'Cooperative',
      totalAmount: 999,
      currency: 'ETB',
    },
  ],
};
function show() {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <main>
        <MemoryRouter initialEntries={['/checkout']}>
          <Routes>
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/login" element={<p>Login screen</p>} />
          </Routes>
        </MemoryRouter>
      </main>
    </QueryClientProvider>,
  );
}
function fill() {
  fireEvent.change(screen.getByLabelText('Delivery address'), {
    target: { value: 'Jinka market' },
  });
  fireEvent.change(screen.getByLabelText('Delivery phone'), {
    target: { value: '0911000001' },
  });
}
function submit() {
  fireEvent.click(screen.getByRole('button', { name: 'Place order' }));
}
beforeEach(async () => {
  localStorage.clear();
  useAuthStore.setState({
    bootstrap: originalBootstrap,
    token: 'buyer-token',
    user: { id: 'buyer', roles: ['BUYER_VISITOR'] },
    isAuthenticated: true,
    isLoading: false,
  });
  useCheckoutStore.getState().reset();
  cartStore.getState().clear();
  cartStore.getState().add(id, 1);
  vi.spyOn(orderConfirmationService, 'get').mockResolvedValue({
    orderId: result.orders![0].orderId,
    checkoutGroupId: result.checkoutGroupId,
    enterpriseId: seller,
    buyerId: 'buyer',
    status: 'PLACED',
    totalAmount: 999,
    currency: 'ETB',
  });
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
  vi.spyOn(productService, 'getProduct').mockResolvedValue({ ...product });
  vi.spyOn(checkoutService, 'submit').mockResolvedValue(result);
  await i18n.changeLanguage('en');
});
afterEach(() => {
  cleanup();
  useCheckoutStore.getState().reset();
  cartStore.getState().clear();
  vi.restoreAllMocks();
});
describe('Checkout F-505', () => {
  it('guards anonymous users before showing delivery information', () => {
    useAuthStore.setState({ isAuthenticated: false, user: null, token: null });
    show();
    expect(screen.getByText('Login screen')).toBeInTheDocument();
    expect(checkoutService.submit).not.toHaveBeenCalled();
  });
  it('verifies a stored session on a direct checkout visit', async () => {
    const bootstrap = vi.fn(async () => {
      useAuthStore.setState({ isLoading: false });
    });
    useAuthStore.setState({ isLoading: true, bootstrap });
    show();
    await screen.findByLabelText('Delivery address');
    expect(bootstrap).toHaveBeenCalledTimes(1);
  });
  it('accepts other authenticated roles to match the actual backend policy', () => {
    useAuthStore.setState({ user: { id: 'guide', roles: ['TOUR_GUIDE'] } });
    show();
    expect(
      screen.getByRole('heading', { name: 'Checkout' }),
    ).toBeInTheDocument();
  });
  it('shows the empty state', () => {
    cartStore.getState().clear();
    show();
    expect(screen.getByText('Your cart is empty.')).toBeInTheDocument();
  });
  it('submits only validated intent plus delivery, uses the server total and clears the confirmed cart', async () => {
    show();
    fill();
    submit();
    expect(await screen.findByText('Order created')).toBeInTheDocument();
    expect(checkoutService.submit).toHaveBeenCalledTimes(1);
    expect(checkoutService.submit).toHaveBeenCalledWith({
      items: [{ productId: id, quantity: 1 }],
      deliveryAddress: 'Jinka market',
      deliveryPhone: '+251911000001',
      notes: undefined,
      idempotencyKey: expect.any(String),
    });
    expect(
      screen.getByText('Server-confirmed total: 999.00 ETB'),
    ).toBeInTheDocument();
    expect(cartStore.getState().items).toEqual([]);
  });
  it('checks fresh stock before submission and labels the affected item', async () => {
    vi.mocked(productService.getProduct).mockResolvedValue({
      ...product,
      availableStock: 0,
    });
    show();
    fill();
    submit();
    expect(
      await screen.findByText(
        'Not enough stock. Review this item in your cart.',
      ),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(useCheckoutStore.getState().phase).toBe('rejected'),
    );
    expect(checkoutService.submit).not.toHaveBeenCalled();
    expect(cartStore.getState().items).toHaveLength(1);
  });
  it('refreshes individual checks after a server stock race and preserves the whole cart', async () => {
    vi.mocked(checkoutService.submit).mockImplementation(async () => {
      vi.mocked(productService.getProduct).mockResolvedValue({
        ...product,
        availableStock: 0,
      });
      throw new NormalizedApiError({
        status: 400,
        message: 'Insufficient stock',
      });
    });
    show();
    fill();
    submit();
    expect(
      await screen.findByText(
        'Not enough stock. Review this item in your cart.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText('Order created')).not.toBeInTheDocument();
    expect(cartStore.getState().items).toHaveLength(1);
  });
  it('blocks duplicate submits while pending', async () => {
    let resolve!: (value: CheckoutResponse) => void;
    vi.mocked(checkoutService.submit).mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    show();
    fill();
    submit();
    await waitFor(() =>
      expect(checkoutService.submit).toHaveBeenCalledTimes(1),
    );
    expect(screen.getByRole('button', { name: 'Place order' })).toBeDisabled();
    fireEvent.submit(
      screen.getByRole('button', { name: 'Place order' }).closest('form')!,
    );
    expect(checkoutService.submit).toHaveBeenCalledTimes(1);
    await act(async () => resolve(result));
  });
  it('reuses the identical frozen key and payload after an ambiguous failure, including route remount', async () => {
    vi.mocked(checkoutService.submit)
      .mockRejectedValueOnce(
        new NormalizedApiError({ status: 503, message: 'timeout' }),
      )
      .mockResolvedValueOnce(result);
    const view = show();
    fill();
    submit();
    await screen.findByRole('button', { name: 'Retry same order' });
    const first = vi.mocked(checkoutService.submit).mock.calls[0][0];
    expect(screen.getByLabelText('Delivery address')).toBeDisabled();
    view.unmount();
    show();
    fireEvent.click(screen.getByRole('button', { name: 'Retry same order' }));
    await screen.findByText('Order created');
    expect(vi.mocked(checkoutService.submit).mock.calls[1][0]).toEqual(first);
  });
  it('retains the original action after an idempotency conflict', async () => {
    vi.mocked(checkoutService.submit)
      .mockRejectedValueOnce(
        new NormalizedApiError({ status: 409, message: 'Already submitted' }),
      )
      .mockResolvedValueOnce(result);
    show();
    fill();
    submit();
    await screen.findByRole('button', { name: 'Retry same order' });
    const first = vi.mocked(checkoutService.submit).mock.calls[0][0];
    fireEvent.click(screen.getByRole('button', { name: 'Retry same order' }));
    await screen.findByText('Order created');
    expect(vi.mocked(checkoutService.submit).mock.calls[1][0]).toEqual(first);
  });
  it('does not post a tampered persisted cart or trust injected price and seller fields', async () => {
    localStorage.setItem(
      'omobridge_cart_v1',
      JSON.stringify([
        { productId: id, quantity: -9, unitPrice: 0, enterpriseId: seller },
      ]),
    );
    cartStore.getState().reload();
    show();
    expect(screen.getByText('Your cart is empty.')).toBeInTheDocument();
    expect(checkoutService.submit).not.toHaveBeenCalled();
  });
  it('revalidates server publication rather than trusting persisted data', async () => {
    vi.mocked(productService.getProduct).mockResolvedValue({
      ...product,
      published: false,
    });
    show();
    fill();
    submit();
    expect(
      await screen.findByText('This item is unavailable.'),
    ).toBeInTheDocument();
    expect(checkoutService.submit).not.toHaveBeenCalled();
  });
  it.each([
    { lat: '91', lng: '36' },
    { lat: '5', lng: '' },
  ])('rejects invalid coordinate pairs %o', ({ lat, lng }) => {
    show();
    fill();
    fireEvent.change(screen.getByLabelText('Latitude (optional)'), {
      target: { value: lat },
    });
    fireEvent.change(screen.getByLabelText('Longitude (optional)'), {
      target: { value: lng },
    });
    submit();
    expect(screen.getByRole('alert')).toHaveTextContent('Enter an address');
    expect(checkoutService.submit).not.toHaveBeenCalled();
  });
  it('submits the keyboard-entered pin including zero coordinates', async () => {
    show();
    fill();
    fireEvent.change(screen.getByLabelText('Latitude (optional)'), {
      target: { value: '0' },
    });
    fireEvent.change(screen.getByLabelText('Longitude (optional)'), {
      target: { value: '36.57' },
    });
    submit();
    await screen.findByText('Order created');
    expect(checkoutService.submit).toHaveBeenCalledWith(
      expect.objectContaining({
        deliveryLatitude: 0,
        deliveryLongitude: 36.57,
      }),
    );
  });
  it('blocks invalid contact details', () => {
    show();
    submit();
    expect(screen.getByRole('alert')).toHaveTextContent('Enter an address');
    expect(checkoutService.submit).not.toHaveBeenCalled();
  });
  it('blocks offline submission and preserves delivery fields on reconnect', async () => {
    show();
    fill();
    act(() => {
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
      window.dispatchEvent(new Event('offline'));
    });
    expect(screen.getByRole('button', { name: 'Place order' })).toBeDisabled();
    expect(screen.getByText(/You are offline/)).toBeInTheDocument();
    act(() => {
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
      window.dispatchEvent(new Event('online'));
    });
    submit();
    await screen.findByText('Order created');
  });
  it('ignores an in-flight success after logout', async () => {
    let resolve!: (value: CheckoutResponse) => void;
    vi.mocked(checkoutService.submit).mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    show();
    fill();
    submit();
    await waitFor(() => expect(checkoutService.submit).toHaveBeenCalled());
    act(() => useAuthStore.getState().logout());
    await act(async () => resolve(result));
    expect(useCheckoutStore.getState().result).toBeUndefined();
    expect(screen.getByText('Login screen')).toBeInTheDocument();
  });
  it('keeps an incomplete multi-seller confirmation ambiguous and preserves every cart item', async () => {
    const secondId = 'ffffffff-ffff-4fff-8fff-000000000002';
    cartStore.getState().add(secondId, 1);
    vi.mocked(productService.getProduct).mockImplementation(
      async (productId) => ({
        ...product,
        id: productId,
        enterpriseId:
          productId === id ? seller : '11111111-1111-4111-8111-000000000002',
      }),
    );
    show();
    fill();
    submit();
    await screen.findByRole('button', { name: 'Retry same order' });
    expect(cartStore.getState().items).toHaveLength(2);
    expect(screen.queryByText('Order created')).not.toBeInTheDocument();
  });
  it('displays one confirmed order for each seller without calculating a total', async () => {
    const secondId = 'ffffffff-ffff-4fff-8fff-000000000002';
    const secondSeller = '11111111-1111-4111-8111-000000000002';
    cartStore.getState().add(secondId, 1);
    vi.mocked(productService.getProduct).mockImplementation(
      async (productId) => ({
        ...product,
        id: productId,
        enterpriseId: productId === id ? seller : secondSeller,
      }),
    );
    vi.mocked(checkoutService.submit).mockResolvedValue({
      ...result,
      totalAmount: 1234,
      orders: [
        ...result.orders!,
        {
          ...result.orders![0],
          orderId: secondId,
          enterpriseId: secondSeller,
          enterpriseName: 'Artisans',
          orderNo: 'ORD-002',
          totalAmount: 235,
        },
      ],
    });
    show();
    fill();
    submit();
    await screen.findByText('Order created');
    expect(
      screen.getByText('Server-confirmed total: 1234.00 ETB'),
    ).toBeInTheDocument();
    expect(screen.getByRole('article', { name: 'Artisans' })).toHaveTextContent(
      'ORD-002',
    );
  });
  it('creates a new key only after a definite rejection and a corrected action', async () => {
    vi.mocked(checkoutService.submit)
      .mockRejectedValueOnce(
        new NormalizedApiError({ status: 400, message: 'Rejected' }),
      )
      .mockResolvedValueOnce(result);
    show();
    fill();
    submit();
    await waitFor(() =>
      expect(useCheckoutStore.getState().phase).toBe('rejected'),
    );
    const first = vi.mocked(checkoutService.submit).mock.calls[0][0]
      .idempotencyKey;
    submit();
    await screen.findByText('Order created');
    expect(
      vi.mocked(checkoutService.submit).mock.calls[1][0].idempotencyKey,
    ).not.toBe(first);
  });
  it('starts a separate checkout explicitly after success', async () => {
    show();
    fill();
    submit();
    await screen.findByText('Order created');
    fireEvent.click(
      screen.getByRole('button', { name: 'Start another checkout' }),
    );
    expect(screen.getByText('Your cart is empty.')).toBeInTheDocument();
  });
  it('renders accessible form labels and Amharic fallback', async () => {
    const { container } = show();
    await screen.findByText('Honey');
    const report = await axe.run(container, {
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(report.violations).toEqual([]);
    await act(async () => {
      await i18n.changeLanguage('om');
    });
    expect(
      screen.getByRole('heading', { name: 'ትዕዛዝ ያረጋግጡ' }),
    ).toBeInTheDocument();
  });
});
