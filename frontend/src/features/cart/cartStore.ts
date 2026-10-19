import { createStore } from 'zustand/vanilla';
import type { CheckoutItemRequest, ProductResponse } from '../../types/api';
import { normalizeApiError } from '../../services/apiError';

export const CART_STORAGE_KEY = 'omobridge_cart_v1';
export type CartLine = Pick<CheckoutItemRequest, 'productId' | 'quantity'>;
export type CartCheck = {
  status: 'available' | 'unavailable' | 'insufficient-stock' | 'error';
  product?: ProductResponse;
  priceChanged: boolean;
};
export interface CartState {
  items: CartLine[];
  checks: Record<string, CartCheck>;
  phase: 'idle' | 'checking' | 'checked';
  storageAvailable: boolean;
  add: (productId: string, quantity: number) => boolean;
  setQuantity: (productId: string, quantity: number) => boolean;
  remove: (productId: string) => void;
  clear: () => void;
  reload: () => void;
  revalidate: () => Promise<boolean>;
  acknowledgePriceChange: (productId: string) => void;
  getCheckoutItems: () => CartLine[] | null;
}

type StorageAccess = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
type Options = {
  storage?: () => StorageAccess | undefined;
  fetchProduct?: (id: string) => Promise<ProductResponse>;
};
const validId = (id: unknown): id is string => typeof id === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
const validQuantity = (value: unknown): value is number => typeof value === 'number' &&
  Number.isFinite(value) && value > 0 && Number.isSafeInteger(Math.round(value * 1000)) &&
  Number(value.toFixed(3)) === value;
const canonicalId = (id: string) => id.toLowerCase();

// Local intent is persisted; server product responses and price baselines never are.
export function createCartStore(options: Options = {}) {
  const storage = options.storage ?? (() => typeof window === 'undefined' ? undefined : window.localStorage);
  const fetchProduct = options.fetchProduct ?? (async (id: string) => {
    const { productService } = await import('../products');
    return productService.getProduct(id, undefined, { fresh: true });
  });
  let generation = 0;
  const prices = new Map<string, { amount: number; currency: string }>();

  function read(): { items: CartLine[]; storageAvailable: boolean } {
    try {
      const target = storage();
      if (!target) return { items: [], storageAvailable: false };
      const raw = target.getItem(CART_STORAGE_KEY);
      if (!raw) return { items: [], storageAvailable: true };
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) throw new Error('Invalid cart');
      const seen = new Set<string>();
      const items: CartLine[] = [];
      for (const value of parsed) {
        if (!value || typeof value !== 'object') throw new Error('Invalid cart');
        const candidate = value as Record<string, unknown>;
        if (!validId(candidate.productId) || !validQuantity(candidate.quantity)) throw new Error('Invalid cart');
        const productId = canonicalId(candidate.productId);
        if (seen.has(productId)) throw new Error('Duplicate cart item');
        seen.add(productId);
        items.push({ productId, quantity: candidate.quantity });
      }
      // Strip any injected metadata or old price fields while reading.
      try {
        target.setItem(CART_STORAGE_KEY, JSON.stringify(items));
        return { items, storageAvailable: true };
      } catch { return { items, storageAvailable: false }; }
    } catch {
      try { storage()?.removeItem(CART_STORAGE_KEY); } catch { /* Storage is optional. */ }
      return { items: [], storageAvailable: false };
    }
  }

  function persist(items: CartLine[]): boolean {
    try {
      const target = storage();
      if (!target) return false;
      if (items.length === 0) target.removeItem(CART_STORAGE_KEY);
      else target.setItem(CART_STORAGE_KEY, JSON.stringify(items.map(({ productId, quantity }) => ({ productId, quantity }))));
      return true;
    } catch { return false; }
  }

  const initial = read();
  return createStore<CartState>((set, get) => {
    function update(items: CartLine[]) {
      generation += 1; // In-flight results must never validate a different cart.
      const active = new Set(items.map((line) => line.productId));
      const checks = Object.fromEntries(Object.entries(get().checks).filter(([id]) => active.has(id)));
      for (const id of prices.keys()) if (!active.has(id)) prices.delete(id);
      set({ items, checks, phase: 'idle', storageAvailable: persist(items) });
    }
    return {
      ...initial, checks: {}, phase: 'idle',
      add(productId, quantity) {
        if (!validId(productId) || !validQuantity(quantity)) return false;
        const id = canonicalId(productId);
        const previous = get().items.find((line) => line.productId === id);
        const combined = (Math.round((previous?.quantity ?? 0) * 1000) + Math.round(quantity * 1000)) / 1000;
        if (!validQuantity(combined)) return false;
        update(previous ? get().items.map((line) => line.productId === id ? { productId: id, quantity: combined } : line)
          : [...get().items, { productId: id, quantity }]);
        return true;
      },
      setQuantity(productId, quantity) {
        if (!validId(productId) || !validQuantity(quantity)) return false;
        const id = canonicalId(productId);
        if (!get().items.some((line) => line.productId === id)) return false;
        update(get().items.map((line) => line.productId === id ? { productId: id, quantity } : line));
        return true;
      },
      remove(productId) { update(get().items.filter((line) => line.productId !== canonicalId(productId))); },
      clear() { prices.clear(); update([]); },
      reload() {
        generation += 1; prices.clear();
        set({ ...read(), checks: {}, phase: 'idle' });
      },
      async revalidate() {
        const run = ++generation;
        const snapshot = get().items.map((line) => ({ ...line }));
        set({ phase: 'checking' });
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          set({ checks: Object.fromEntries(snapshot.map(({ productId }) => [productId, { status: 'error' as const, priceChanged: false }])), phase: 'checked' });
          return false;
        }
        // Bound concurrent requests on metered connections.
        const checks: Record<string, CartCheck> = {};
        for (const line of snapshot) {
          if (run !== generation) return false;
          try {
            const product = await fetchProduct(line.productId);
            if (run !== generation) return false;
            if (product.published !== true || product.id?.toLowerCase() !== line.productId) {
              checks[line.productId] = { status: 'unavailable', priceChanged: false };
              continue;
            }
            const validPrice = typeof product.unitPrice === 'number' && Number.isFinite(product.unitPrice) && product.unitPrice >= 0 && !!product.currency?.trim();
            const validStock = typeof product.availableStock === 'number' && Number.isFinite(product.availableStock) && product.availableStock >= 0;
            const baseline = prices.get(line.productId);
            const priceChanged = !!baseline && (baseline.amount !== product.unitPrice || baseline.currency !== product.currency);
            if (validPrice && !baseline) prices.set(line.productId, { amount: product.unitPrice!, currency: product.currency! });
            checks[line.productId] = {
              product,
              status: !validPrice || !validStock || !validId(product.enterpriseId) ? 'error'
                : product.availableStock! < line.quantity ? 'insufficient-stock' : 'available',
              priceChanged,
            };
          } catch (error) {
            if (run !== generation) return false;
            checks[line.productId] = {
              status: normalizeApiError(error).status === 404 ? 'unavailable' : 'error',
              priceChanged: false,
            };
          }
        }
        if (run !== generation) return false;
        set({ checks, phase: 'checked' });
        return selectCartReady(get());
      },
      acknowledgePriceChange(productId) {
        const id = canonicalId(productId);
        const check = get().checks[id];
        const product = check?.product;
        if (!check?.priceChanged || !product || typeof product.unitPrice !== 'number' || !Number.isFinite(product.unitPrice) || !product.currency?.trim()) return;
        prices.set(id, { amount: product.unitPrice, currency: product.currency });
        set({ checks: { ...get().checks, [id]: { ...check, priceChanged: false } } });
      },
      getCheckoutItems() {
        return selectCartReady(get()) ? get().items.map(({ productId, quantity }) => ({ productId, quantity })) : null;
      },
    };
  });
}

export function selectCartReady(state: CartState): boolean {
  return state.phase === 'checked' && state.items.length > 0 && new Set(state.items.map(({ productId }) => productId)).size === state.items.length &&
    state.items.every(({ productId, quantity }) => validId(productId) && validQuantity(quantity) &&
      state.checks[productId]?.status === 'available' && !state.checks[productId].priceChanged &&
      typeof state.checks[productId].product?.availableStock === 'number' &&
      state.checks[productId].product!.availableStock! >= quantity);
}

export function selectCartGroups(state: CartState) {
  const groups = new Map<string | undefined, { enterpriseId?: string; enterpriseName?: string; items: { line: CartLine; check?: CartCheck }[] }>();
  for (const line of state.items) {
    const check = state.checks[line.productId];
    const enterpriseId = check?.product?.enterpriseId;
    let group = groups.get(enterpriseId);
    if (!group) {
      group = { enterpriseId, enterpriseName: check?.product?.enterpriseName, items: [] };
      groups.set(enterpriseId, group);
    }
    group.items.push({ line, check });
  }
  return [...groups.values()];
}
