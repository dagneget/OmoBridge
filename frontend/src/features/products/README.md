# Public product catalog (F-501)

`ProductCatalog` is rendered by the existing `/products` route through the thin
`ProductsPage`. Import the feature through its `index.ts`.

`productService.getProducts(signal)` calls `GET /api/v1/public/products` and uses
the generated `ProductResponse` type. The backend returns an array. Category,
search and pagination are applied to that received array; no server pagination
parameters or response metadata are invented. Twelve products appear per page.
A backend pagination contract is still needed for a large catalog.

Only records explicitly marked `published: true` with an ID are displayed. This
is a presentation safeguard; the public backend remains responsible for
publication rules and inventory authorization. Search matches names, descriptions,
and enterprise names. Category options come from the published records.

Prices use server unitPrice/currency and stock status uses availableStock. Missing
values remain unknown. No cart totals, stock reservations, cart mutation, or
checkout calculations are implemented. Detail links use the existing product
route, now implemented by ProductDetail (F-502).

The screen handles loading, empty, error/retry, cached offline data and cold
offline visits. Public product GETs are included in the existing PWA public API
cache rule; private endpoints keep their network-only rules. In-memory cached
results do not guarantee that an offline navigation survives a browser restart.
Real service worker/browser validation remains pending.

English and Amharic resources are registered in the isolated `products` namespace,
using selected language → Amharic → English fallback. Shared locale files,
tourism features, routes and layouts are untouched.

For standalone mock mode, integrate the earlier shared mock correction commit
`519b08f` (`fix/frontend-mock-contracts`) as well. The old shared handler serves
`/api/v1/products`, which differs from the backend's public catalog path. This
feature deliberately does not duplicate or replace that separate mock fix.

Tests cover publication filtering, search/category combinations, pagination,
retry, both offline states, unknown fields, generated-type service boundaries,
and automated semantic accessibility. Real-browser 360 px, keyboard navigation,
contrast and offline-after-visit checks remain required before marking F-501 done.

## Product detail (F-502)

`ProductDetailsPage` reads the route ID and delegates to `ProductDetail`.
`productService.getProduct(id, signal)` calls the public detail endpoint, forwards
cancellation, and rejects failed or malformed envelopes. The route accepts UUIDs;
unpublished, unverified or mismatched records are hidden. This is UX only: the
backend controls publication and access. 401/403 are handled without displaying
server diagnostics. Public detail requires no role guard.

The screen renders server descriptions/story as plain text, stock with up to
three decimal places, unit price/currency, and the existing PriceBreakdown.
Producer purchase cost is a server amount; no producer percentage is inferred.
Missing/invalid money and stock remain unknown; explicit zero is preserved.
The trace token is encoded as one path segment. A missing token produces an
unavailable message rather than a fabricated link. The destination screen itself
belongs to FP7. Cart actions follow in F-503/F-504.

The component-local `productDetail` namespace includes English and Amharic with
selected language → Amharic → English fallback. Data states include loading,
unavailable, error/retry, cold offline and cached offline. Cached offline content
can be stale and is labelled. This does not claim browser-restart persistence.

Verification on 2026-10-18: Node 22 typecheck, lint, build and all 202 tests in 32
files pass (22 targeted product-detail/service tests, including the existing
three catalog-service tests). Live OpenAPI and public catalog returned HTTP 200;
the catalog was empty and an unknown product returned 404. Populated UI used MSW
fixtures derived from the generated response contract.

Headless Firefox checked an exact 360×800 CSS-pixel same-origin frame because
Firefox enforces a wider minimum top-level window. No detail overflow; axe found
no detail violations including contrast. Tab/Enter reached and opened the trace
link. Cached offline content and unavailable-product states were checked in the
browser. Automated tests additionally cover loading, retry, access errors,
unpublished records, malformed/mismatched IDs, missing/zero/nonfinite fields,
three-decimal stock, safe text/token rendering and language fallback. These are
browser viewport checks, not physical-device verification. Screenshots and browser
results are in `/tmp/omobridge-product-detail-360.png` and
`/tmp/omobridge-detail-browser-results.json` for this session.
