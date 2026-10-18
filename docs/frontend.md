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
│   │   ├── delivery/       # Provider job queries, GPS tracker, offline location queue, status updates
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
| `/dashboard/delivery/jobs/:jobId` | `ProviderJobDetailPage` | `DELIVERY_PROVIDER`, `SYSTEM_ADMIN` | Job detail with only the legal next statuses; server-authoritative status updates (F-1102) |
| `/dashboard/delivery/*` | `DeliveryDashboardPage` | `DELIVERY_PROVIDER`, `SYSTEM_ADMIN` | Assigned jobs with status, pickup and drop-off, fee and order count (F-1101); the detail screen drives status updates, GPS capture and both offline queues (F-1102–F-1105) |
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
- Checkout sends only item UUIDs and integer quantities: `[{ productId, quantity }]`. The client never calculates authoritative totals.
- Payments initiate with `POST /api/v1/payments/attempt` supplying an `idempotencyKey`. The UI polls or awaits server-reported payment status.

### Delivery Provider Identity
- `GET /api/v1/delivery/providers/{providerId}/jobs` is keyed by `DeliveryProvider.id`, **not** `User.id`.
- The signed-in provider's own id is read from an optional `deliveryProviderId` on the auth profile (`resolveProviderId` in `features/delivery/providerIdentity.ts`).
- **Known backend gap F-1101-E1:** `/api/v1/auth/me` returns `UserProfileResponse`, which has no provider field, and there is no `GET /api/v1/delivery/providers/me` route (guides do have `GET /api/v1/tourism/guides/me`). Until the backend supplies it, the provider home shows an explicit "provider profile is not ready" state and makes **no** request. It deliberately does not fall back to the user id, which would 404 and mask the missing contract.
- Job ownership is enforced server-side (`DeliveryService.getProviderJobs` rejects actors who do not own the provider record). The client never accepts a provider id from the URL or from user input.

### Delivery Status Authority
- Legal transitions are decided by the backend (`DeliveryStatus.canTransitionTo`). The provider UI mirrors that table in `features/delivery/deliveryStatus.ts` because the server does not publish the legal set, and offers only those actions.
- `PATCH /api/v1/delivery/jobs/{jobId}/status` returns the job as the server now sees it. The screen renders that response, never the status it asked for, and re-reads the job after a rejection so the displayed state cannot drift from the server.
- Rejections are surfaced with the server's message, and read-only screens that depend on the provider id stay blocked behind gap F-1101-E1 until the backend supplies it.

### Location Capture
- `features/delivery/locationCapture.ts` wraps `navigator.geolocation.watchPosition` behind a small interface, so the engine is testable with a mocked geolocation and carries no React dependency.
- `watchPosition` has no interval argument, so accepted fixes are throttled to **one per 30 s** with `enableHighAccuracy: false` and a non-zero `maximumAge`. A GPS chip left in high-accuracy mode drains the battery on the low-end handsets this app targets.
- Each point carries `recordedAt` from the **device clock**, not the receive time. The backend sorts replayed batches on `recordedAt` (`DeliveryService.ingestLocations`), so this is what keeps an offline upload chronological.
- Points are validated before they leave the device: non-finite or out-of-range coordinates are dropped, a repeated fix is ignored, and a fix implying more than ~200 km/h since the last accepted one is treated as a GPS jump.
- Capture is offered **only while the job is active**, and the watch is torn down as soon as the status becomes terminal — that is how "stop after delivery" is implemented.
- Screen wake lock and permission state are best-effort and never block capture. The background-tracking limitation notice is F-1108.
- Persistence and upload are **not** part of this layer: points are buffered in memory only. The IndexedDB queue and batched upload belong to F-1104.

### Offline Location Queue
- `features/delivery/locationQueue.ts` defines a `LocationQueue` interface with two adapters: IndexedDB (default) and in-memory. The in-memory one is both the test double and the runtime fallback when `indexedDB` is unavailable (private browsing, non-secure contexts).
- Points are read through a compound `(jobId, recordedAt)` index, so a job's points come back already ordered by device timestamp. A late upload therefore cannot reorder the breadcrumb.
- `syncJobLocations` sends batches of at most **50**, removing a batch only after the server confirms it. A failed request leaves its points queued; a failure part-way through keeps only the un-sent batches.
- The backend has **no rate limiter and no size cap** (`@NotEmpty` is the only constraint), so the 50-point cap is enforced client-side.
- **"Job already delivered" is a 200 with a stored count of `0`, not an error.** `DeliveryService.ingestLocations` never dedupes, so a non-empty batch that yields `0` can only mean the job is terminal server-side. Those points are dropped and the job is marked finished, otherwise the queue retries forever and never drains. The server's answer wins over the locally known status, because a job can be finished by a dispatcher or the SMS checkpoint fallback while the device is offline.
- The provider home and the F-1501 sync centre reuse `syncAllJobs`; nothing here is specific to the detail screen.

### Offline Status Queue
- `features/delivery/statusQueue.ts` and `statusSync.ts` give status changes the same treatment as location points, but the rules differ because a status is an *intent* rather than a measurement.
- **Status buttons stay enabled offline** (F-1105 changed what F-1102 originally built). A driver who has just dropped the goods is the most likely person to have no signal, and a queued `DELIVERED` is far better than a lost one. The offline notice explains that nothing was sent yet.
- Changes are replayed **oldest first**, ordered by `queuedAt` (device clock), with insertion order breaking ties. The backend only accepts a transition legal from the job's *current* state, so an out-of-order replay would reject changes that were valid when made.
- **A rejection is removed, not retried; a transport failure is kept.** A 4xx means the server understood and refused, and a refused transition can never become valid later — the job only moves forward. Keeping it would block every change queued behind it. A network error means the server never had an opinion, so the change survives for the next attempt and replay stops there.
- Every conflict is shown to the provider using **the server's message and current state** (`role="alert"`), and the job is re-fetched so the screen adopts whatever the job actually became. A dispatcher or the SMS checkpoint fallback moving the job while the device was offline is the common cause.
- Both queues share one IndexedDB database (`features/delivery/deliveryDb.ts`). They must: IndexedDB refuses to open a database at a lower version than it is already at, so two modules each owning a version would break as soon as one added a store.

### Background Tracking Limit
- `features/delivery/TrackingLimitNotice.tsx` states the platform limit plainly on the location card of an **active** job: a browser reads geolocation only while the page is open, in the foreground, and the screen is on. Locking, switching apps, or closing the browser records nothing further. This is not a bug we can work around, so the provider is told before the gap shows up in the breadcrumb rather than after.
- The notice points at the **SMS checkpoint**, which is real: `InboundSmsService` reads a `DEL-…` job number plus a checkpoint word from an inbound message and applies the transition, if it is legal and the sender is the assigned provider's phone. The example is prefilled with the provider's own job number.
- **The checkpoint keywords are not translation keys.** The backend matches them with `body.contains("DELIVERED")`, so translating them would silently break the checkpoint for every Amharic reader. Only the sentence around them is localised.
- The notice deliberately does not name a destination number: none is configured in the backend and no endpoint exposes one (gap F-1108-E1).
- It is hidden once the job is terminal, where it would only cause confusion — the location card is already gated on the job being active.

### Offline & Queue Scopes
- Service worker precaches app shell and fonts.
- Public GET endpoints use network-first with stale-while-revalidate.
- Offline mutations are strictly scoped to:
  1. Driver GPS location point collection (`recorded_at` device timestamp).
  2. Delivery status updates — queued and replayed, with conflicts surfaced (F-1105).
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
