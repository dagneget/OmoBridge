import { create } from 'zustand';
import { cartStore } from '../cart';
import { useAuthStore } from '../auth';
import { generateIdempotencyKey } from '../../utils/idempotency';
import { normalizeApiError } from '../../services/apiError';
import type { CheckoutRequest, CheckoutResponse } from '../../types/api';
import { checkoutService } from './checkoutService';

type Delivery = Omit<CheckoutRequest, 'items' | 'idempotencyKey'>;
interface CheckoutState {
  phase: 'idle' | 'checking' | 'submitting' | 'retry' | 'rejected' | 'success';
  payload?: CheckoutRequest;
  result?: CheckoutResponse;
  enterpriseIds?: string[];
  place: (delivery: Delivery) => Promise<void>;
  reset: () => void;
}
let generation = 0;
export const useCheckoutStore = create<CheckoutState>((set, get) => ({
  phase: 'idle',
  reset() {
    generation++;
    set({
      phase: 'idle',
      payload: undefined,
      result: undefined,
      enterpriseIds: undefined,
    });
  },
  async place(delivery) {
    if (
      ['checking', 'submitting', 'success'].includes(get().phase) ||
      !navigator.onLine
    )
      return;
    const auth = useAuthStore.getState();
    if (
      !auth.isAuthenticated ||
      auth.isLoading ||
      !auth.user?.id ||
      !auth.token
    )
      return;
    const run = ++generation;
    const current = () =>
      run === generation &&
      useAuthStore.getState().token === auth.token &&
      useAuthStore.getState().user?.id === auth.user?.id;
    let payload = get().payload;
    if (!payload) {
      set({ phase: 'checking' });
      const ready = await cartStore.getState().revalidate();
      if (!current()) return;
      const items = cartStore.getState().getCheckoutItems();
      if (!ready || !items) {
        set({ phase: 'rejected' });
        return;
      }
      payload = {
        ...delivery,
        items,
        idempotencyKey: generateIdempotencyKey(),
      };
      set({
        enterpriseIds: [
          ...new Set(
            items.map(
              (item) =>
                cartStore.getState().checks[item.productId].product!
                  .enterpriseId!,
            ),
          ),
        ],
      });
    }
    if (!current() || !navigator.onLine) {
      set({ phase: payload ? 'retry' : 'idle', payload });
      return;
    }
    set({ phase: 'submitting', payload });
    try {
      const result = await checkoutService.submit(payload);
      if (!current()) return;
      const expected = get().enterpriseIds ?? [];
      const orders = result.orders ?? [];
      if (
        !expected.length ||
        orders.length !== expected.length ||
        new Set(orders.map((order) => order.orderId)).size !== orders.length ||
        new Set(orders.map((order) => order.enterpriseId)).size !==
          expected.length ||
        orders.some((order) => !expected.includes(order.enterpriseId!))
      ) {
        throw new Error('Incomplete seller orders');
      }
      // Clear only the submitted intent; preserve edits made in another tab while awaiting the server.
      if (
        JSON.stringify(cartStore.getState().items) ===
        JSON.stringify(payload.items)
      )
        cartStore.getState().clear();
      set({ phase: 'success', result, payload: undefined });
    } catch (error) {
      if (!current()) return;
      const { status } = normalizeApiError(error);
      if ([400, 403, 404, 422].includes(status)) {
        set({ phase: 'rejected', payload: undefined });
        await cartStore.getState().revalidate();
      } else {
        // Timeout/5xx/unknown response may have committed. Never create a replacement key.
        set({ phase: 'retry' });
      }
    }
  },
}));
const unsubscribe = useAuthStore.subscribe((next, previous) => {
  if (
    next.token !== previous.token ||
    next.user?.id !== previous.user?.id ||
    !next.isAuthenticated
  ) {
    useCheckoutStore.getState().reset();
  }
});
if (import.meta.hot) import.meta.hot.dispose(unsubscribe);
