import { useStore } from 'zustand';
import { useAuthStore } from '../auth';
import { createCartStore, CART_STORAGE_KEY } from './cartStore';
import type { CartState } from './cartStore';

export { CART_STORAGE_KEY, createCartStore, selectCartGroups, selectCartReady } from './cartStore';
export type { CartState, CartLine, CartCheck } from './cartStore';

export const cartStore = createCartStore();
export function useCartStore<T>(selector: (state: CartState) => T): T {
  return useStore(cartStore, selector);
}

const unsubscribe = useAuthStore.subscribe((next, previous) => {
  if ((previous.isAuthenticated && !next.isAuthenticated) ||
      (previous.user?.id && next.user?.id !== previous.user.id) ||
      (previous.token && next.token && previous.token !== next.token)) {
    cartStore.getState().clear();
  }
});
const onStorage = (event: StorageEvent) => {
  if (event.key === CART_STORAGE_KEY || event.key === null) cartStore.getState().reload();
};
if (typeof window !== 'undefined') window.addEventListener('storage', onStorage);
if (import.meta.hot) import.meta.hot.dispose(() => {
  unsubscribe();
  window.removeEventListener('storage', onStorage);
});
