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
route; product detail implementation remains F-502.

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
