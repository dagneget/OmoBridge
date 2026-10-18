# OmoBridge Frontend Architecture & Developer Guide

OmoBridge frontend is a Progressive Web Application (PWA) built with **React 19**, **TypeScript 5.7+**, **Vite 8**, and **Tailwind CSS v4**. It connects rural agricultural producers, tourism enterprises, guides, delivery providers, and domestic/international buyers in South Omo, Ethiopia.

---

## 1. Tech Stack & Dependencies

- **Runtime & UI**: React 19 (`react`, `react-dom`), React Router v7 (`react-router-dom`)
- **Server State & Caching**: TanStack Query v5 (`@tanstack/react-query`)
- **HTTP Client**: Axios (`axios`) with custom error normalization, idempotency keys, and GET retry
- **Form Management & Validation**: React Hook Form (`react-hook-form`), Zod (`zod`), `@hookform/resolvers`
- **Styling**: Tailwind CSS v4 (`tailwindcss`, `@tailwindcss/vite`) with Ethiopic script support
- **PWA**: `vite-plugin-pwa` with Workbox service worker precaching and offline support
- **Mocking & Testing**: MSW v3 (`msw`), Vitest (`vitest`), Testing Library (`@testing-library/react`), jsdom
- **API Typing**: `openapi-typescript` generated from backend Spring Boot OpenAPI 3.1.0 specification
- **Mapping & QR**: Leaflet (`leaflet`, `react-leaflet`), `qrcode.react`
- **Icons**: Lucide React (`lucide-react`)

---

## 2. Directory Structure

```
frontend/
├── public/                 # Static assets, PWA icons, manifest
├── src/
│   ├── assets/             # Images, logos, brand vectors
│   ├── components/         # Reusable UI components
│   │   ├── common/         # Buttons, inputs, modals, cards, badges
│   │   ├── layout/         # Header, footer, navbars, drawer, bottom-nav
│   │   ├── booking/        # Tour booking forms & selectors
│   │   ├── pricing/        # Price breakdowns, fee calculators
│   │   ├── products/       # Product cards, grids, filters
│   │   ├── tourism/        # Package cards, hotel cards, guide cards
│   │   ├── traceability/   # Public origin timeline, consent chips
│   │   └── tracking/       # Live delivery GPS map & timeline
│   ├── features/           # Feature slices & domain business logic
│   │   ├── auth/           # Auth store, login/register forms, guards
│   │   ├── bookings/       # Booking state and actions
│   │   ├── cart/           # Multi-seller cart state
│   │   ├── delivery/       # Location queue, GPS tracker, status updates
│   │   ├── payments/       # Telebirr/CBE payment attempts & polling
│   │   ├── products/       # Product list and catalog queries
│   │   ├── supply/         # Supply deliveries, inspections, payables
│   │   ├── tourism/        # Tourism queries and session selectors
│   │   └── traceability/   # Batch outputs, inputs, QR generation
│   ├── i18n/               # i18next config, English & Amharic translations
│   ├── mocks/              # MSW mock layer (handlers, fixtures, browser, server)
│   ├── pages/              # Routed page components
│   │   ├── public/         # Public catalog, packages, hotels, cart, about
│   │   ├── auth/           # Login, producer register, enterprise register
│   │   ├── dashboard/      # Role-specific dashboard layouts and views
│   │   ├── trace/          # Public QR traceability view
│   │   └── tracking/       # Public live delivery tracking view
│   ├── routes/             # AppRoutes, ProtectedRoute, RoleGuard
│   ├── services/           # HTTP client, QueryClient, QueryKeys, API error normalizer
│   ├── test/               # Vitest suites and testing-library setups
│   ├── types/              # OpenAPI generated types (`api.generated.ts`) and helpers
│   ├── utils/              # Idempotency keys, currency/date formatters, phone validation
│   ├── App.tsx             # Root app component with providers
│   ├── index.css           # Tailwind v4 import, theme CSS variables, font rules
│   └── main.tsx            # Bootstrap entry point with MSW toggle
├── .env.example            # Environment variables template
├── package.json            # Scripts and dependencies
├── tsconfig.app.json       # Strict TypeScript configuration
└── vite.config.ts          # Vite plugins (React, Tailwind v4, PWA, aliases)
```

---

| Route Path | Page Component | Access / Roles | Description |
|---|---|---|---|
| `/` | `HomePage` | Public | Hero, featured tourism, catalog highlights, value prop |
| `/join`, `/register` | `JoinPage` | Public | Role selector cards (Farmer, Enterprise, Courier, Guide, Buyer) |
| `/login`, `/auth/login` | `LoginPage` | Public | Sign in with phone and password, throttling countdown |
| `/register/buyer` | `RegisterBuyerPage` | Public | Buyer & eco-tourist instant registration |
| `/register/producer` | `RegisterProducerPage` | Public | Rural producer / farmer registration with USSD guidance |
| `/register/enterprise` | `RegisterEnterprisePage` | Public | Micro-enterprise cooperative onboarding |
| `/register/delivery` | `RegisterDeliveryPage` | Public | Delivery courier onboarding with vehicle and route corridor |
| `/register/guide` | `RegisterGuidePage` | Public | Certified tour guide registration with languages and rate |
| `/account` | `AccountPage` | Authenticated | Profile details, language preference persistence, linked profiles |
| `/forbidden` | `ForbiddenPage` | Public / Authenticated | 403 Forbidden screen, role switcher, back to dashboard |
| `/tourism` | `TourismPage` | Public | Tourism experiences, packages, culture guide |
| `/experiences/:id` | `ExperienceDetailsPage` | Public | Tour package detail, story, price breakdown, sessions |
| `/hotels` | `HotelsPage` | Public | Verified lodge and hotel listings in South Omo |
| `/guides` | `GuidesPage` | Public | Licensed local tour guides and language specialties |
| `/transport` | `TransportPage` | Public | 4WD vehicles and inter-town transport routes |
| `/safety-guidelines`| `SafetyGuidelinesPage` | Public | Cultural rules, photography ethics, health notices |
| `/products` | `ProductsPage` | Public | Honey, grains, spices, handicrafts catalog |
| `/products/:id` | `ProductDetailsPage` | Public | Product details, producer origins, fair-price breakdown |
| `/cart` | `CartPage` | Public | Shopping cart grouped by seller enterprise |
| `/checkout` | `CheckoutPage` | Public / Buyer | Order creation with delivery phone and address |
| `/booking` | `BookingPage` | Public / Buyer | Tour booking date/session reservation |
| `/track/:token` | `LiveTrackingPage` | Public | Live GPS route tracking with polling fallback |
| `/trace/:token` | `PublicTracePage` | Public | QR batch origin story, farmer consent, lab purity |
| `/design-tokens` | `DesignTokensPage` | Public | Design tokens showcase, themes, Amharic rendering |
| `/offline` | `OfflinePage` | Public | Offline fallback screen when uncached route requested |
| `/dashboard` | `DashboardIndexRedirect`| Authenticated | Redirects to default dashboard for active role |
| `/dashboard/farmer/*` | `FarmerDashboardPage` | `PRODUCER_FARMER`, `SYSTEM_ADMIN` | Delivered crops, balance statement, USSD guide |
| `/dashboard/enterprise` | `EnterpriseDashboardPage` | `MICRO_ENTERPRISE`, `SYSTEM_ADMIN` | Operations metrics, attention alerts, module hub |
| `/dashboard/enterprise/farmers` | `FarmersManagementPage` | `MICRO_ENTERPRISE`, `SYSTEM_ADMIN` | Scoped farmer list, verification approvals, balances |
| `/dashboard/enterprise/pricing` | `PricingManagementPage` | `MICRO_ENTERPRISE`, `SYSTEM_ADMIN` | Raw buying prices, USSD sync notice, product types |
| `/dashboard/enterprise/supply` | `SupplyIntakePage` | `MICRO_ENTERPRISE`, `SYSTEM_ADMIN` | Raw harvest intake registry, receipt generation |
| `/dashboard/enterprise/inspection` | `InspectionPage` | `MICRO_ENTERPRISE`, `SYSTEM_ADMIN` | Quality inspection, grading, live sum validation, payable posting |
| `/dashboard/enterprise/payables` | `FarmerPayablesPage` | `MICRO_ENTERPRISE`, `SYSTEM_ADMIN` | Farmer payables ledger, balance statements, payout disbursements |
| `/dashboard/enterprise/*` | `EnterpriseDashboardPage` | `MICRO_ENTERPRISE`, `SYSTEM_ADMIN` | Enterprise catch-all module router |
| `/dashboard/delivery/*` | `DeliveryDashboardPage` | `DELIVERY_PROVIDER`, `SYSTEM_ADMIN` | Assigned jobs, GPS checkpoint logging, offline sync |
| `/dashboard/guide/*` | `GuideDashboardPage` | `TOUR_GUIDE`, `SYSTEM_ADMIN` | Assigned tours, availability sessions, schedule |
| `/dashboard/admin/*` | `AdminDashboardPage` | `SYSTEM_ADMIN`, `TOURISM_AUTHORITY` | Account verification, approvals, platform oversight |

---

## 4. Key Architectural Conventions

### Authorization & Tokens
- Access token stored in `localStorage` behind `authStore` (`omobridge_token`).
- Token automatically attached as `Bearer <token>` in `httpClient`.
- On `401 Unauthorized`, token is removed from storage and `omobridge:auth-unauthorized` is dispatched to redirect to `/login`.
- Tokens are never cached in Service Worker or IndexedDB.

### Pricing & Checkout Authority
- **The backend is the sole authority for money, prices, and stock.**
- Checkout sends only item UUIDs and positive quantities (up to three decimal places): `[{ productId, quantity }]`. The client never calculates authoritative totals.
- Payments initiate with `POST /api/v1/payments/attempt` supplying an `idempotencyKey`. The UI polls or awaits server-reported payment status.

### Offline & Queue Scopes
- Service worker precaches app shell and fonts.
- Public GET endpoints use network-first with stale-while-revalidate.
- Offline mutations are strictly scoped to:
  1. Driver GPS location point collection (`recorded_at` device timestamp).
  2. Delivery status updates (`PICKED_UP`, `DELIVERED`).
- Payments, bookings, orders, and registrations are **strictly online-only** with helpful offline notices.

### Styling & Typography
- Tailwind CSS v4 configured via `@tailwindcss/vite` in `vite.config.ts`.
- Mobile-first layout targeting minimum **360px width** viewports.
- Touch targets strictly conform to **WCAG 2.1 AA** (minimum **44px × 44px**).
- Typography stack prioritizes Ethiopic scripts (`Noto Sans Ethiopic`, `Nyala`, `Abyssinica SIL`) for Amharic readability.

---

## 5. Development & Running the App

### Prerequisites
- Node.js 20.x or higher
- Running backend on `http://localhost:8080` (or toggle mock mode)
- PostgreSQL running on `localhost:5432` with seeded demo accounts

### Environment Variables
Configure `.env` in `frontend/`:
```bash
# Backend REST API Base URL
VITE_API_BASE_URL=http://localhost:8080

# Toggle Mock Service Worker (true for pure frontend development without backend)
VITE_USE_MOCKS=false

# Assigned USSD short code placeholder
VITE_USSD_SHORT_CODE=*844#
```

### NPM Scripts
```bash
# Start development server on port 5173
npm run dev

# Run Vitest unit & component test suite
npm run test

# Run tests in interactive watch mode
npm run test:watch

# TypeScript strict type check without emit
npm run typecheck

# Run linter (oxlint)
npm run lint

# Check code formatting (prettier)
npm run format

# Auto-fix code formatting
npm run format:fix

# Generate TypeScript types from running backend OpenAPI
npm run api:generate

# Verify TypeScript types against OpenAPI for drift
npm run api:check

# Production build (typecheck + Vite build + PWA service worker)
npm run build

# Preview production build locally
npm run preview
```

### Running with Real Backend & Seed Accounts
1. Ensure Spring Boot backend is active:
   `curl http://localhost:8080/actuator/health` -> `{"status":"UP"}`
2. Ensure `frontend/.env` has `VITE_API_BASE_URL=http://localhost:8080` and `VITE_USE_MOCKS=false`.
3. Log in with any demo account:
   - Password for all seed accounts: `Secret@123`
   - Buyer: `+251911000001`
   - Farmer: `+251911000002`
   - Enterprise: `+251911000003`
   - Delivery Provider: `+251911000004`
   - Tour Guide: `+251911000005`
   - Administrator: `+251911000006`

### Running in Standalone Mock Mode (No Backend Needed)
Set `VITE_USE_MOCKS=true` in `frontend/.env` and start `npm run dev`. MSW intercepts all API calls in the browser with seed fixtures.


## Shared mock contract fixes (F-FIX-001)

The browser worker is committed at `frontend/public/mockServiceWorker.js`.
Set `VITE_USE_MOCKS=true` in `frontend/.env.local` and run Vite. This enables the
shared mock handlers; it does not start a backend or make payments real.

Use password `Password123!` with these **mock-only** accounts:

| Phone | Role |
|---|---|
| +251911000001 | BUYER_VISITOR |
| +251911000002 | PRODUCER_FARMER |
| +251911000003 | MICRO_ENTERPRISE |
| +251911000004 | DELIVERY_PROVIDER |
| +251911000005 | TOUR_GUIDE |
| +251911000006 | SYSTEM_ADMIN |
| +251911000007 | TOURISM_AUTHORITY |

Login and profile handlers serve `/api/v1/auth/login` and `/api/v1/auth/me`
(and the backend's `/api/auth` aliases). `/me` resolves the mock bearer token to
its own user rather than always returning the buyer. Incorrect credentials and
missing/unrecognized tokens return 401. These tokens are placeholders, not JWTs
accepted by the backend. Registration, throttling, token expiry, and account
mutation are outside this mock fix; use the backend or explicit test overrides
for those workflows.

Tourism uses `/api/v1/tourism/packages`, `/hotels`, `/guides`, `/transports`, and
`/guidelines`. Product catalog reads use `/api/v1/public/products`. Use IDs from
the fixture exports rather than old strings such as `pack-001`; catalog entity
IDs are UUIDs now. Unknown package/product detail IDs return structured 404s.
Package category and product category/search filters support empty-result states.
Package language requests currently return the English fixture fallback; this
does not demonstrate translation selection or the required Amharic fallback.

Session fixtures use `2026-11-01`, with one OPEN session (6 seats) and one CLOSED
session (0 seats) for the first package. Request
`/api/v1/tourism/packages/{packageId}/sessions?date=2026-11-01` to see them.
Other dates/packages return empty lists. Without `date`, only today's sessions
are returned, following the backend's date selection behavior. Session start
times are omitted pending verification of the generated LocalTime object
schema against actual JSON; don't use these fixtures to validate time rendering.

For loading/error/offline component tests, override the shared handlers using
`server.use(http.get(...))` and MSW's `delay`, a JSON response with an error
status, or `HttpResponse.error()`, respectively. Restore handlers after each
test. Existing checkout/booking/payment mock mutations are legacy placeholders;
this fix does not certify their response contracts or financial behavior.

Verification commands (Node 22): `npm run typecheck`, `npm run lint`,
`npm run build`, then `npm test`. Browser interaction and visual/accessibility
checks remain the responsibility of the screen tasks consuming these mocks.

## Price transparency component (F-507)

`frontend/src/components/pricing` exports `PriceBreakdown` and its props. It
accepts generated product breakdown, booking, and order responses; displays only
server amounts; and never sums costs or multiplies quantities. Component-local
English and Amharic strings avoid edits to shared page locales. See
[usage and integration details](../frontend/src/components/pricing/README.md).

Loading, empty, error, and offline-with-data states are covered by component
tests, along with server-total preservation and semantic accessibility. No route
or existing screen is changed. Browser layout/contrast and 360 px verification
remain pending because this environment has no browser runner installed.

## Product catalog (F-501)

The existing `/products` route now renders the product feature through a thin
page. It lists published products from `/api/v1/public/products`, displays server
unit prices and stock status, and provides combined search/category filters and
12-item display pagination. The server returns an array; server pagination is
still a backend gap. See [feature handoff](../frontend/src/features/products/README.md)
for states, mock-mode dependency, and pending browser checks. No tourism, map,
shared layout or route files are changed.

## PWA install card (F-107)

`InstallCard` is exported from `frontend/src/components/pwa`. It handles deferred
install offers, single-use prompts, installed/standalone hiding, tab-session
dismissal, and iPhone/iPad Safari instructions. English and Amharic strings live
in its own namespace. See [mounting and verification notes](../frontend/src/components/pwa/README.md).
The frontend owner must mount one instance in a persistent layout early in app
startup; this branch does not modify any existing page, route or layout. Real
Android Chrome/Safari and 360 px/contrast verification remain pending.

## Combined frontend integration (F-INT-001)

Branch `integration/frontend-support` combines the mock contract corrections, public
product catalog, reusable price breakdown and PWA install card with hotel commit
`9702020`. `App.tsx` now mounts exactly one install card across routes. A navigation
test confirms that a captured browser offer remains usable after changing routes.
Hotel fixture names, amenities, contact details and prices are retained with UUID IDs.

Node 22 typecheck, lint, production build and all 183 tests in 31 files pass.
Real-device installation and 360 px keyboard/contrast verification remain pending.
Merge into the active frontend branch after its shared task-board edits are committed.

## Product detail (F-502)

`/products/:id` now delegates to the products feature. It renders public product
story, description, stock and unit price, integrates the server-only price
breakdown, and links an encoded trace token to `/trace/:token`. It does not infer
producer percentages or checkout totals. Missing/unpublished records, loading,
errors/retry, access errors and both offline states are covered. Public access
needs no role guard; the backend remains the publication/access authority.

See [product feature verification and handoff](../frontend/src/features/products/README.md).
Node 22 typecheck, lint, build and all 202 frontend tests pass. Firefox at an exact
360 CSS-pixel viewport passes detail overflow/contrast checks, keyboard trace
navigation, cached-offline and unavailable states. Live OpenAPI verified; the
running catalog is empty, so populated detail used contract-based MSW fixtures.

## Cart state (F-503)

The cart feature exports a Zustand store/hook, seller grouping and checkout-intent
selectors. Only product UUIDs and positive quantities (up to three decimal places)
are persisted. Server product/price/stock metadata stays in memory. Fresh product
checks bypass the public service-worker cache, flag removed/unpublished items,
stock shortages, changed prices/currency and failed checks. No totals are computed.
Price-change comparison starts with the first server read after each reload.

App startup registers cart logout/account-switch and cross-tab cleanup even before
the cart screen is visited. Mutations invalidate prior checks; superseded requests
cannot restore stale eligibility. Checkout must still revalidate and rely on the
backend for stock and money. Cart controls and screen are now implemented in F-504.

[Cart API and integration guide](../frontend/src/features/cart/README.md).
Node 22 typecheck, lint, build and all 246 tests in 35 files pass. Real Firefox
reload, fresh validation, removed-product and logout smoke checks pass using MSW.

## Cart page and add controls (F-504)

`/cart` now renders a seller-grouped cart feature. Product details include quantity
and add-to-cart controls. Only local IDs/quantities are mutated; prices and stock
are revalidated on the server. Unit prices are shown without calculated totals.
Unsaved edits, price changes, unavailable products, stock shortages, failures and
offline status block checkout navigation. Drafts survive refresh; removal restores
keyboard focus. Public cart intent requires no role guard. The existing checkout
route is the next task, F-505.

English/Amharic and all data states are covered. All 267 tests in 36 files pass,
plus typecheck/lint/build. Firefox 360 px checks pass for overflow, contrast,
keyboard add/edit/remove/clear, loading, empty, error/recovery and offline behavior.
See [cart integration guide](../frontend/src/features/cart/README.md).

## F-505 checkout implementation (isolated branch)

`features/checkout` now supplies the authenticated `/checkout` form, address/phone/notes, optional map pin with keyboard coordinates, fresh cart validation, per-item availability errors and a server-confirmed multi-seller summary. Order requests use generated OpenAPI types and a body idempotency key. Ambiguous retries freeze the payload and reuse that key; account changes discard stale responses. Checkout GET/POST bypass service-worker caches. No client totals are authoritative.

The page starts stored-session verification locally where needed; shared startup/layout files were left untouched. See `frontend/src/features/checkout/README.md` for the fixed MSW demo scenario, in-memory retry lifetime and F-506 handoff. Backend idempotency ownership and structured stock-error gaps are recorded in the task board. This branch remains isolated pending integration with the other frontend agent's work.

F-505 verification: Node 22 typecheck, lint, build and all 300 Vitest tests (39 files) pass. Firefox at an exact 360 × 800 CSS viewport verifies keyboard delivery entry, coordinates, submit/retry, all data states, same-payload retry and confirmed cart cleanup; no feature overflow or axe violations including contrast. Backend suite: 129 tests, zero assertion failures, four errors (three delivery cleanup foreign-key errors and one PostgreSQL container startup error). No backend changes.

## F-506 checkout result (integration pending)

Successful checkout now renders one order card per seller with server totals, independent authenticated status lookups, refresh, and loading/empty/error/offline states. Responses must match order, group, seller and buyer. Payment actions remain disabled without a real payment destination and while offline or unverified; paying one seller never changes another seller's displayed status. Private query data expires on unmount.

The standalone reservation countdown and confirmed-expiry view are implemented. The live API exposes no deadline, so the current page reports it as unavailable; `createdAt + 30 minutes` is never presented as authoritative. F-506 stays `[!]` until the backend supplies a deadline and F-601/F-602 provide payment routes. See `frontend/src/features/checkout/RESULT_HANDOFF.md` for wiring and verification limits.

F-506 verification: Node 22 typecheck, lint, build and all 336 Vitest tests (42 files) pass. Firefox 360 × 800 CSS viewport passes keyboard submit/refresh/new-checkout, loading/error/offline, simulated server expiry, overflow and feature contrast checks. Backend verification repeats the same 129-test baseline with four errors (three delivery cleanup foreign-key errors and one PostgreSQL container startup error); no backend files changed.

## F-508 My orders (integration pending)

`/account/orders` and `/account/orders/:id` now provide a buyer-scoped order list and detail, snapshot item names/prices/quantities, server price breakdown, chronological status history, delivery details and independently refreshed payment status. Account and checkout results link to these pages. Order UUID and buyer ownership are validated before rendering or payment lookup; forged URL success is ignored. Session-scoped private queries are removed on account/token changes and unmount, with no browser persistence.

Tracking remains unavailable because the live buyer order contract supplies no tracking token or mapping. Backend payment lookup also lacks ownership enforcement; the UI verifies the order first but cannot secure direct API calls. F-508 remains `[!]` for those integrations. See `frontend/src/features/orders/README.md` for endpoints, query lifecycle and handoff details.

F-508 verification: Node 22 typecheck, lint, build and all 379 Vitest tests (44 files) pass. Firefox exact 360 × 800 CSS viewport verifies keyboard navigation, list/detail loading/empty/error/offline states, snapshots, history, refresh recovery and foreign-order rejection without a payment request; no feature overflow or axe violations including contrast. Seven backend order/checkout tests pass including cross-buyer 404. The complete backend suite still reports 129 tests with four existing errors (three delivery cleanup foreign-key errors and one PostgreSQL container startup failure).


### Integrated session startup

`App` and nested checkout/order guards share `useAuthBootstrap`, deduplicating stored-session verification under React StrictMode. Protected dashboard reloads now verify the stored token. Profile responses and HTTP authorization errors from an older token cannot overwrite or expire a newer login. Regression coverage lives in `authBootstrap.test.tsx` and `httpClient.test.ts`. See [integration baseline](frontend-integration-baseline.md) for combined verification and adoption instructions.


### F-601 shared payments

Delivered in `d0f8ac7`: the existing Telebirr modal now confirms settlement through server reads, with same-key retries, polling/manual refresh, timeout handling and stale-response protection. See [payment integration guide](../frontend/src/features/payments/README.md). F-602 owns checkout-group wiring; backend ownership/expiry/tracking gaps remain open.


### F-602 seller payments in checkout

Delivered in `ed05fa1`: checkout results now open F-601 for each verified seller order using its fresh amount/currency. Only the selected order is refreshed after settlement; group progress counts server-confirmed order statuses and reports incomplete verification. English/Amharic result strings are scoped to the checkout feature. All 549 frontend tests, typecheck/lint/build and the Firefox 360 px two-order keyboard/axe fixture pass. The F-506 deadline and backend authorization/tracking gaps remain open. See [checkout integration handoff](../frontend/src/features/checkout/RESULT_HANDOFF.md).


### F-603 private payment history

Delivered in `0f8ce5f`: Account now links to buyer payment history and receipt routes. New authenticated backend endpoints filter by payer; the existing order-payment read additionally checks order ownership. Generated types come from the real OpenAPI contract. Settled receipts support printing; pending/refunded/failed, offline and unverified records cannot enable the print action. Session changes abort and clear private queries. Verification: 583 frontend tests, 156 backend tests, final 20 payment checks and Firefox 360 px keyboard/receipt axe checks pass. See [payment guide](../frontend/src/features/payments/README.md).


### F-606 refunds on orders and bookings

Delivered in `f687759`: owned order and booking details share a refund section showing server-calculated partial/full coverage, amounts and paginated status/reference/reason/date records. Authorized booking-payment and refund-summary APIs enforce payer ownership; pending/failed refunds do not contribute to completed totals. Error and missing reads stay unknown, while offline details are labelled as last-confirmed. Verification: 614 frontend tests, 170 backend tests, typecheck/lint/build and Firefox 360 px partial-order/full-booking keyboard checks pass. See [payment/refund guide](../frontend/src/features/payments/README.md).


### F-509 cancel an owned order

Delivered in `c45cf04`: order detail now offers explicit confirmation for server-supported cancellable states, with offline/ownership guards, duplicate-submit protection and uncertain-result recovery. A validated server cancellation updates only that order after stopping stale detail reads; refund/payment states stay separate. English/Amharic text and keyboard focus support are feature-scoped. Verification: 638 frontend tests, 15 focused PostgreSQL order tests, typecheck/lint/build and Firefox 360 px keyboard/axe checks pass. See [order guide](../frontend/src/features/orders/README.md).
