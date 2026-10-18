# Cart store (F-503)

Import `cartStore`, `useCartStore`, `selectCartGroups` and `selectCartReady` through
this feature's `index.ts`. App startup imports the feature once so account cleanup
works even if no cart page has been visited. The product API module is lazy-loaded
only when revalidation needs it. No backend cart endpoint is invented.

```tsx
const items = useCartStore((state) => state.items);
const add = useCartStore((state) => state.add);
add(productId, 1);
await cartStore.getState().revalidate();
const groups = selectCartGroups(cartStore.getState());
const intent = cartStore.getState().getCheckoutItems(); // null until eligible
```

Only generated CheckoutItemRequest productId/quantity fields are persisted under
`omobridge_cart_v1`. Quantities must be positive, finite and have at most three
decimal places (the backend uses BigDecimal quantities). IDs must be UUIDs and
are canonicalized. Repeated additions combine quantities without floating-point
drift. setQuantity never inserts an absent item; remove/clear are explicit.
Mutations return false for invalid input. Storage denial/quota errors leave an
in-memory cart usable, with storageAvailable false for a future UI warning.
Malformed/duplicate persisted data is discarded. Injected metadata is stripped.

Product names, seller IDs/names, stock, prices, currency, check results and price
baselines remain in memory. Grouping uses server enterprise IDs, never a stored
seller claim. Unresolved products are grouped without an invented seller name.
No totals, stock reservations or authoritative prices are computed.

Revalidate before checkout. Cart reads use the existing HTTP client adapter with
Cache-Control: no-cache; the built Workbox rule routes those public product reads
to NetworkOnly before the normal public cache rule. Browser HTTP caches must
revalidate them too. Ordinary browsing can still use the public cache. Fresh reads retain the existing browser adapter and its shared-client timeout;
this path passes the Firefox smoke check.

Revalidation requests are sequential to bound concurrency on metered connections.
Known offline status fails closed without requests. Missing/unpublished/mismatched
products are unavailable; inadequate stock is flagged; missing seller/price/stock
fields and network/access errors fail validation. Cart intent is retained so users
can fix it. A generation counter discards requests superseded by edits, clear,
reload or a newer validation. Every quantity edit requires another validation.

A changed price or currency is flagged against the first in-memory server snapshot
and remains flagged until acknowledgePriceChange(productId). No price is saved
across reloads, so the first successful read after reload establishes a new
baseline; it cannot report a historical price change that was never persisted.
getCheckoutItems returns detached IDs/quantities only, and null for unchecked,
empty, unavailable, insufficient, changed-price or failed carts. Eligibility is
only UX: F-505 must revalidate immediately before submitting; the backend still
confirms stock and money atomically. Nothing in this store proves an order exists.

Logout, account switches and token replacement clear cart intent and validation.
Guest intent is preserved on first sign-in. Other-tab cart storage events reload
intent and invalidate check results. Changes are limited to this cart's own key;
other auth/cache cleanup remains F-110.

Tests cover persistence, tampering, quantities, optional storage, seller grouping,
removed products, price/currency changes, stock, offline failures, account/tab
boundaries, overlapping requests and production service-worker route priority.
Firefox smoke verification confirms real reload persistence, fresh validation,
404-product flagging and logout clearing with contract-derived MSW fixtures.
The F-503 store itself has no screen. F-504 now adds the UI described below.

## Cart screen and add controls (F-504)

`CartPage` delegates to `CartView`; product details render `AddToCart`. Import both
through the feature index. The store/session singleton moved to cartState.ts so
feature UI can use it without importing its own public barrel. No route, layout,
generated API type or backend endpoint is changed. The cart is public local intent,
so it requires no role guard. Checkout authorization remains F-505.

The cart groups server seller IDs, displays server unit prices without totals,
and allows fractional quantity edits, removal and clearing. It checks on entry,
on reconnect and after saved edits. Refresh explicitly repeats network validation.
Missing products, inadequate stock, failed reads and changed price/currency block
checkout navigation. Price changes require acknowledgement. Unsaved quantity drafts
also block checkout and survive regrouping/refresh. Removing an item or clearing
the cart returns keyboard focus to the heading and announces the change.

Offline users can edit local intent but cannot refresh, accept prices or continue
to checkout. Previously checked product details are labelled potentially stale;
cold offline visits retain IDs/quantities with unresolved product/seller labels.
Storage failure gets an explicit warning. Empty/loading/error/recovery states are
covered. English/Amharic live in the isolated cart namespace with the required
selected language → Amharic → English fallback.

Verification: Node 22 typecheck/lint/build pass; all 267 tests across 36 files pass,
including 21 cart UI tests. Live OpenAPI detail contract rechecked (HTTP 200).
Populated UI uses generated-contract MSW fixtures. Headless Firefox in an exact
360×800 CSS-pixel same-origin frame: two seller groups, no overflow, no axe
violations including contrast; keyboard add/view-cart/edit .125/remove/clear work;
focus returns to the heading. Unsaved drafts and offline state block checkout.
Loading, empty, network error and recovery were exercised in the actual UI.
Physical-device testing is separate from this viewport check.

Session artifacts: /tmp/omobridge-cart-page-360.png and
/tmp/omobridge-cart-page-browser-results.json. The existing /checkout destination
is still implemented under F-505; this task does not create an order or charge.
