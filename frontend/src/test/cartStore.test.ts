import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createCartStore, CART_STORAGE_KEY, selectCartGroups, selectCartReady } from '../features/cart/cartStore';
import type { ProductResponse } from '../types/api';
import { NormalizedApiError } from '../services/apiError';

const a = 'ffffffff-ffff-4fff-8fff-000000000001';
const b = 'ffffffff-ffff-4fff-8fff-000000000002';
const seller = '11111111-1111-4111-8111-000000000001';
const item = (id = a, extra: Partial<ProductResponse> = {}): ProductResponse => ({
  id, published: true, enterpriseId: seller, enterpriseName: 'Cooperative',
  currency: 'ETB', unitPrice: 420, availableStock: 10, ...extra,
});
const unavailable = () => new NormalizedApiError({ status: 404, message: 'not found' });
beforeEach(() => localStorage.clear());

describe('Persistent cart intent F-503', () => {
  it('adds, combines fractional quantities, changes and removes lines', () => {
    const store = createCartStore(); const state = store.getState;
    expect(state().add(a.toUpperCase(), .1)).toBe(true);
    expect(state().add(a, .2)).toBe(true);
    expect(state().items).toEqual([{ productId: a, quantity: .3 }]);
    expect(state().setQuantity(a, .125)).toBe(true);
    expect(state().add(b, 2)).toBe(true);
    state().remove(a.toUpperCase());
    expect(state().items).toEqual([{ productId: b, quantity: 2 }]);
    state().clear(); expect(state().items).toEqual([]);
    expect(localStorage.getItem(CART_STORAGE_KEY)).toBeNull();
  });
  it('reloads with IDs and quantities only; validation and prices never persist', async () => {
    const store = createCartStore({ fetchProduct: async () => item() });
    store.getState().add(a, 2); await store.getState().revalidate();
    expect(JSON.parse(localStorage.getItem(CART_STORAGE_KEY)!)).toEqual([{ productId: a, quantity: 2 }]);
    const reloaded = createCartStore();
    expect(reloaded.getState().items).toEqual([{ productId: a, quantity: 2 }]);
    expect(reloaded.getState().checks).toEqual({});
    expect(reloaded.getState().getCheckoutItems()).toBeNull();
  });
  it.each([0, -1, .0001, 1.0000000001, NaN, Infinity, Number.MAX_SAFE_INTEGER])('rejects invalid quantity %s', (quantity) => {
    const store = createCartStore(); expect(store.getState().add(a, quantity)).toBe(false);
    store.getState().add(a, 1); expect(store.getState().setQuantity(a, quantity)).toBe(false);
    expect(store.getState().items[0].quantity).toBe(1);
  });
  it('rejects invalid IDs and does not insert absent lines through setQuantity', () => {
    const store = createCartStore();
    expect(store.getState().add('../private', 1)).toBe(false);
    expect(store.getState().setQuantity(a, 1)).toBe(false);
    expect(store.getState().items).toEqual([]);
  });
  it.each(['{bad', '{}', '[{"productId":"bad","quantity":1}]', JSON.stringify([{ productId: a, quantity: 0 }]), JSON.stringify([{ productId: a, quantity: 1 }, { productId: a.toUpperCase(), quantity: 2 }])])('discards malformed or duplicated persisted data', (raw) => {
    localStorage.setItem(CART_STORAGE_KEY, raw);
    expect(createCartStore().getState().items).toEqual([]);
    expect(localStorage.getItem(CART_STORAGE_KEY)).toBeNull();
  });
  it('strips injected prices, seller metadata, tokens and totals during hydration', () => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify([{ productId: a, quantity: 1, price: 1, token: 'private', total: 1, enterpriseId: 'fake' }]));
    expect(createCartStore().getState().items).toEqual([{ productId: a, quantity: 1 }]);
    expect(JSON.parse(localStorage.getItem(CART_STORAGE_KEY)!)).toEqual([{ productId: a, quantity: 1 }]);
  });
  it('keeps working in memory when storage is blocked or quota is exhausted', () => {
    const store = createCartStore({ storage: () => { throw new Error('blocked'); } });
    expect(store.getState().add(a, 1)).toBe(true);
    expect(store.getState().storageAvailable).toBe(false);
    expect(store.getState().items).toHaveLength(1);
    const readOnly = createCartStore({ storage: () => ({ getItem: () => JSON.stringify([{ productId: a, quantity: 2 }]), setItem: () => { throw new Error('quota'); }, removeItem: vi.fn() }) });
    expect(readOnly.getState().items).toHaveLength(1);
    expect(readOnly.getState().storageAvailable).toBe(false);
  });
});

describe('Server revalidation F-503', () => {
  it('groups by server seller IDs and only returns IDs/quantities for checkout', async () => {
    const fetchProduct = vi.fn(async (id: string) => item(id));
    const store = createCartStore({ fetchProduct });
    store.getState().add(a, 2); store.getState().add(b, .125);
    expect(store.getState().getCheckoutItems()).toBeNull();
    expect(await store.getState().revalidate()).toBe(true);
    expect(fetchProduct).toHaveBeenCalledTimes(2);
    expect(selectCartGroups(store.getState())[0].items).toHaveLength(2);
    expect(selectCartGroups(store.getState())[0].enterpriseId).toBe(seller);
    expect(store.getState().getCheckoutItems()).toEqual([{ productId: a, quantity: 2 }, { productId: b, quantity: .125 }]);
  });
  it('keeps sellers with the same display name separate and unresolved items grouped safely', async () => {
    const store = createCartStore({ fetchProduct: async (id) => item(id, { enterpriseId: id }) });
    store.getState().add(a, 1); store.getState().add(b, 1);
    expect(selectCartGroups(store.getState())[0].enterpriseId).toBeUndefined();
    await store.getState().revalidate(); expect(selectCartGroups(store.getState())).toHaveLength(2);
  });
  it('flags a removed product without dropping its intended quantity', async () => {
    const store = createCartStore({ fetchProduct: async () => { throw unavailable(); } });
    store.getState().add(a, 2); expect(await store.getState().revalidate()).toBe(false);
    expect(store.getState().checks[a].status).toBe('unavailable');
    expect(store.getState().items[0].quantity).toBe(2);
    expect(store.getState().getCheckoutItems()).toBeNull();
  });
  it.each([{ published: false }, { published: undefined }, { id: b }])('rejects unpublished or mismatched responses', async (extra) => {
    const store = createCartStore({ fetchProduct: async () => item(a, extra) });
    store.getState().add(a, 1); await store.getState().revalidate();
    expect(store.getState().checks[a]).toEqual({ status: 'unavailable', priceChanged: false });
  });
  it('flags insufficient stock and zero stock, and accepts exactly available stock', async () => {
    const get = vi.fn().mockResolvedValue(item(a, { availableStock: .125 }));
    const store = createCartStore({ fetchProduct: get });
    store.getState().add(a, .25); await store.getState().revalidate();
    expect(store.getState().checks[a].status).toBe('insufficient-stock');
    store.getState().setQuantity(a, .125); expect(selectCartReady(store.getState())).toBe(false);
    expect(await store.getState().revalidate()).toBe(true);
    get.mockResolvedValue(item(a, { availableStock: 0 }));
    expect(await store.getState().revalidate()).toBe(false);
  });
  it.each([{ unitPrice: NaN }, { unitPrice: undefined }, { unitPrice: -1 }, { currency: '' }, { availableStock: NaN }, { availableStock: undefined }, { enterpriseId: undefined }])('blocks unverifiable product fields %j', async (extra) => {
    const store = createCartStore({ fetchProduct: async () => item(a, extra) });
    store.getState().add(a, 1); expect(await store.getState().revalidate()).toBe(false);
    expect(store.getState().checks[a].status).toBe('error');
  });
  it('retains price changes until acknowledged and detects currency changes', async () => {
    const get = vi.fn().mockResolvedValue(item());
    const store = createCartStore({ fetchProduct: get });
    store.getState().add(a, 1); await store.getState().revalidate();
    get.mockResolvedValue(item(a, { unitPrice: 425 }));
    expect(await store.getState().revalidate()).toBe(false);
    expect(store.getState().checks[a].priceChanged).toBe(true);
    expect(await store.getState().revalidate()).toBe(false);
    store.getState().acknowledgePriceChange(a); expect(selectCartReady(store.getState())).toBe(true);
    get.mockResolvedValue(item(a, { unitPrice: 425, currency: 'USD' }));
    await store.getState().revalidate(); expect(store.getState().checks[a].priceChanged).toBe(true);
    store.getState().clear(); store.getState().add(a, 1);
    expect(await store.getState().revalidate()).toBe(true);
  });
  it('never fabricates a prior price after a reload', async () => {
    const first = createCartStore({ fetchProduct: async () => item() });
    first.getState().add(a, 1); await first.getState().revalidate();
    const next = createCartStore({ fetchProduct: async () => item(a, { unitPrice: 999 }) });
    expect(await next.getState().revalidate()).toBe(true);
    expect(next.getState().checks[a].priceChanged).toBe(false);
  });
  it('flags network/access errors and can recover without losing items', async () => {
    const get = vi.fn().mockRejectedValue(new Error('offline'));
    const store = createCartStore({ fetchProduct: get }); store.getState().add(a, 1);
    expect(await store.getState().revalidate()).toBe(false);
    expect(store.getState().checks[a].status).toBe('error');
    get.mockResolvedValue(item(a, { unitPrice: 0 }));
    expect(await store.getState().revalidate()).toBe(true);
  });
  it('discards stale results after edits, removal, clear and reload', async () => {
    for (const action of ['edit', 'remove', 'clear', 'reload']) {
      let resolve!: (value: ProductResponse) => void;
      const store = createCartStore({ fetchProduct: () => new Promise((done) => { resolve = done; }) });
      store.getState().add(a, 1); const run = store.getState().revalidate();
      expect(store.getState().phase).toBe('checking');
      if (action === 'edit') store.getState().setQuantity(a, 2);
      if (action === 'remove') store.getState().remove(a);
      if (action === 'clear') store.getState().clear();
      if (action === 'reload') store.getState().reload();
      resolve(item()); expect(await run).toBe(false);
      expect(store.getState().phase).toBe('idle');
      expect(store.getState().getCheckoutItems()).toBeNull();
    }
  });
  it('lets the newest overlapping validation win', async () => {
    const resolvers: ((value: ProductResponse) => void)[] = [];
    const store = createCartStore({ fetchProduct: () => new Promise((resolve) => resolvers.push(resolve)) });
    store.getState().add(a, 1);
    const first = store.getState().revalidate(); const second = store.getState().revalidate();
    resolvers[1](item(a, { availableStock: 0 })); await second;
    resolvers[0](item()); expect(await first).toBe(false);
    expect(store.getState().checks[a].status).toBe('insufficient-stock');
  });
  it('never marks an empty cart ready', async () => {
    const store = createCartStore(); expect(await store.getState().revalidate()).toBe(false);
    expect(store.getState().getCheckoutItems()).toBeNull();
  });
});

it('uses fresh product reads by default and returns a detached checkout payload', async () => {
  const { productService } = await import('../features/products');
  const get = vi.spyOn(productService, 'getProduct').mockResolvedValue(item());
  try {
    const store = createCartStore(); store.getState().add(a, 1);
    await store.getState().revalidate();
    expect(get).toHaveBeenCalledWith(a, undefined, { fresh: true });
    const payload = store.getState().getCheckoutItems()!; payload[0].quantity = 99;
    expect(store.getState().items[0].quantity).toBe(1);
    store.setState({ items: [{ productId: a, quantity: 99 }] });
    expect(store.getState().getCheckoutItems()).toBeNull();
  } finally { get.mockRestore(); }
});
it('fails closed offline without issuing pointless requests', async () => {
  const online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
  try {
    const fetchProduct = vi.fn(); const store = createCartStore({ fetchProduct });
    store.getState().add(a, 1); expect(await store.getState().revalidate()).toBe(false);
    expect(fetchProduct).not.toHaveBeenCalled();
    expect(store.getState().checks[a].status).toBe('error');
  } finally { online.mockRestore(); }
});
