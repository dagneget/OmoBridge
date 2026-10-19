import { afterEach, describe, expect, it } from 'vitest';
import { cartStore, CART_STORAGE_KEY } from '../features/cart';
import { useAuthStore } from '../features/auth';
const id = 'ffffffff-ffff-4fff-8fff-000000000001';
const initial = useAuthStore.getState();
afterEach(() => { useAuthStore.setState(initial); cartStore.getState().clear(); localStorage.clear(); });
describe('Cart account and tab boundaries', () => {
  it('clears persisted and in-memory cart on logout', () => {
    useAuthStore.setState({ token: 'a', isAuthenticated: true, user: { id: 'user-a' } });
    cartStore.getState().add(id, 1); useAuthStore.getState().logout();
    expect(cartStore.getState().items).toEqual([]);
    expect(localStorage.getItem(CART_STORAGE_KEY)).toBeNull();
  });
  it('clears on direct account switches and preserves guest intent on first sign-in', () => {
    useAuthStore.setState({ token: null, user: null, isAuthenticated: false });
    cartStore.getState().add(id, 1);
    useAuthStore.setState({ token: 'a', user: { id: 'user-a' }, isAuthenticated: true });
    expect(cartStore.getState().items).toHaveLength(1);
    useAuthStore.setState({ token: 'b', user: { id: 'user-b' }, isAuthenticated: true });
    expect(cartStore.getState().items).toEqual([]);
  });
  it('rehydrates other-tab changes without trusting their prices or validation', () => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify([{ productId: id, quantity: 2, unitPrice: 1 }]));
    window.dispatchEvent(new StorageEvent('storage', { key: CART_STORAGE_KEY }));
    expect(cartStore.getState().items).toEqual([{ productId: id, quantity: 2 }]);
    expect(cartStore.getState().getCheckoutItems()).toBeNull();
    localStorage.clear(); window.dispatchEvent(new StorageEvent('storage', { key: null }));
    expect(cartStore.getState().items).toEqual([]);
  });
});
