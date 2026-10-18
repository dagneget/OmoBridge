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

### QR Display & Print
- `features/traceability/TraceQrCode.tsx` exports **`TraceQrCode`** (the image) and **`TraceQrLabel`** (the printable card). These are the agreed surface for F-906 — enterprise trace management should import them rather than build a second QR/print implementation.
- **The client displays the server's PNG and never draws its own code.** `PublicTraceController.getQrCode` encodes `app.traceability.base-url + publicToken` (default `https://omobridge.et/trace/{token}`), which is exactly the frontend's `/trace/:token` route. Reproducing the code with a client-side library would risk printing something that resolves somewhere other than where the server intended, so "the printed QR scans to the trace page" is guaranteed by not redrawing it.
- **No blob, no object URL.** The `<img>` points straight at the endpoint, so the browser's HTTP cache handles reuse under the server's `Cache-Control: max-age=86400`. Wrapping bytes in an object URL would need an effect to create and revoke the handle, would bypass that cache, and would duplicate a cache the browser already has.
- Error handling is an `onError` → retry, and the retry carries a `retry=N` param so it is not answered from a cached failure.
- **Printing** uses Tailwind's `print:` variant, so no global stylesheet change was needed (those are shared files). Everything the shopper reads is inside `print:hidden`; only `TraceQrLabel` survives. The label is ~59 mm at 96 dpi — below roughly 20 mm a printed code stops scanning reliably — and it prints black on white with the trace URL in plain text so a damaged label can still be typed in.

### QR Scanner
- `features/traceability/qrScan.ts` (pure) + `QrScanner.tsx`, both exported from the barrel. The component takes an `onResolved(token)` callback and never decides where a token goes, so any screen can place it. It currently lives on the trace page under "trace another product" — **no route was added**, because `routes/index.tsx` is a shared file.
- **The camera uses the native `BarcodeDetector`, so there is no bundled decoder.** That API exists only in Chromium and Android Chrome. No fallback library is installed (`jsqr`, `@zxing/browser`, `html5-qrcode`, `react-qr-reader` are all absent) and package files are Codex-owned — logged as gap F-702-E1.
- **Where `BarcodeDetector` is missing the camera option is not offered at all**, rather than shown and failing on click. Typing the code is always available and is a first-class path, not an error state: it needs no camera, no permission and no decoder.
- `resolveTraceTarget` is a pure function, deliberately outside React, because jsdom has neither `mediaDevices` nor `BarcodeDetector` and a real scan cannot be driven from a test. It accepts the three shapes a scanner can produce — the absolute URL a code encodes, the `/trace/{token}` path, and a bare token — and rejects everything else, so a Wi-Fi or vCard QR never becomes an API request. The bare-token branch requires the character set `ProductionBatchService` actually mints (`UUID.randomUUID()` with dashes stripped plus `Long.toHexString`), which is what excludes the colon and semicolon that mark a structured payload.
- Camera failures are classified from the specified `error.name` values (`NotAllowedError`, `NotFoundError`, …) and never from message text; each one names typing the code as the way forward.
- `requestAnimationFrame` is not assumed — jsdom only provides it with `pretendToBeVisual`, and the shared Vite config does not ask for that — so the detect loop falls back to a timer.
- The stream is stopped when the scanner unmounts, or once a code is read; a live camera would keep the indicator lit and drain the battery.

### Public Trace Page
- `/trace/:token` → `pages/trace/PublicTracePage.tsx`, backed by `features/traceability` (`publicTraceService`, `traceState`). It was a stub that printed the token with a hard-coded `TRACE-HONEY-001` fallback; it is now wired to `GET /api/v1/trace/{publicToken}`.
- **Farmer names are shown only when the API sends one.** `TraceabilityService` fills `farmerName` in only when both `TraceRecord.showFarmerNames` and `Farmer.consentPublicName` are true, and sends `null` otherwise. The page never derives a person's name from the group or the village — a name shown here is someone who consented. The village and group are always shown, because withholding a name is not withholding the origin; when nothing consented, a short notice says so.
- **The query is pinned to a single fetch** (`staleTime`/`gcTime: Infinity`, no refetch on focus or reconnect). `getPublicTrace` writes a `TraceScan` row on *every* request and `scanCount` is the running total, so a focus-refetch would inflate a producer's scan count with no human behind it. Caching for the session also satisfies "cached for offline after one visit" on top of the service worker's HTTP cache.
- A 404 is not retried — an unregistered code will not become registered by asking again.
- An origin heading falls back village → `originLabel` → enterprise name, because "which village" is the question a shopper has; an entirely unnamed batch says so rather than showing a hole.
- `features/traceability/traceState.ts` holds the presentation rules (name visibility, group label, output quantity, dedupe) so the consent rule is testable outside React.

### Live Tracking (Public)
- `/track/:token` → `pages/tracking/LiveTrackingPage.tsx`, backed by `features/tracking` (`trackingService`, `trackingState`). It was a stub that printed the token and never called the API; it is now wired to `GET /api/v1/delivery/track/{trackingToken}`.
- **Polling, not SSE.** F-604 asked for an SSE stream with a polling fallback, but the backend has no SSE endpoint, no `SseEmitter` and no WebSocket anywhere, so a stream would have meant inventing a contract. The page polls every **15 s** and stops as soon as the job reaches a terminal status. Gap logged as F-604-E1.
- The token is the only credential — there is no login — so the screen shows only what the tracking response contains: a job number, a status, a position and a trail. No names, no phone numbers, no addresses. A privacy note says anyone with the link can see it.
- **"Last updated" and the stale warning answer different questions.** The former is when the *device* produced its last fix (`lastRecordedAt`); polling can be perfectly fresh while the vehicle has not moved for an hour. A fix older than **5 minutes** raises the stale warning; "no fix yet" and "the timestamp cannot be parsed" are separate states, not staleness.
- **The trail is sorted by `recordedAt`, not arrival order.** Late points keep the timestamp they were captured with, so a point queued offline and uploaded an hour later lands in the right place in the breadcrumb rather than at the end of it. Entries without usable coordinates are dropped rather than plotted at 0,0.
- A 404 is the server saying "no such token" and is **not retried** — the common cause is an expired or mistyped link, which needs an explanation rather than a spinner.
- `MapComponent`/`LeafletMapInner` gained an optional `trail` prop (a polyline under the marker). Existing callers pass nothing and get exactly the single-marker map they had.
- **This is the one place F-604's spec could not be met as written**; everything else — route, Leaflet map, timeline, last-updated, stale warning, late points — is implemented.

### SMS Checkpoint Fallback
- `features/delivery/smsCheckpoint.ts` mirrors `InboundSmsService` exactly, so the format cannot drift from what the server parses: the backend finds the job with `(DEL-[0-9A-Z-]+)` (case-insensitive), then picks a status from keywords checked **in this order** — DELIVERED, TRANSIT, PICKED.
- Each status gets one unambiguous keyword (`DELIVERED`, `TRANSIT`, `COLLECTED`). A message naming two statuses would be resolved by the parser's check order rather than the driver's intent, so the alternatives the backend also accepts are listed but never composed into a message.
- **Only three statuses are offered.** `FAILED` and `CANCELLED` have no keyword; an SMS for either would be recorded and then silently ignored — the worst outcome for a driver who thinks they have reported a problem. `SmsCheckpointFallback` filters against `supportsSmsCheckpoint`, not against every status the app can display, and renders nothing when no next status is sendable or the job has no number.
- The fallback is a `<details>` inside the status-actions card, collapsed by default so it does not compete with the buttons. Each entry is prefilled with the provider's real job number and shown in a read-only field **as well as** behind a copy button: clipboard access needs a secure context and is unreliable on some handsets, so long-press selection must always work. A clipboard failure is not surfaced as an error.
- It disappears on a terminal job, where a checkpoint would do nothing.

### Background Tracking Limit
- `features/delivery/TrackingLimitNotice.tsx` states the platform limit plainly on the location card of an **active** job: a browser reads geolocation only while the page is open, in the foreground, and the screen is on. Locking, switching apps, or closing the browser records nothing further. This is not a bug we can work around, so the provider is told before the gap shows up in the breadcrumb rather than after.
- The notice points at the **SMS checkpoint**, which is real: `InboundSmsService` reads a `DEL-…` job number plus a checkpoint word from an inbound message and applies the transition, if it is legal and the sender is the assigned provider's phone. The example is prefilled with the provider's own job number.
- **The checkpoint keywords are not translation keys.** The backend matches them with `body.contains("DELIVERED")`, so translating them would silently break the checkpoint for every Amharic reader. Only the sentence around them is localised.
- The notice deliberately does not name a destination number: none is configured in the backend and no endpoint exposes one (gap F-1108-E1).
- It is hidden once the job is terminal, where it would only cause confusion — the location card is already gated on the job being active.

### Pending Sync Center
- `features/delivery/syncCenter.ts` (rules) + `PendingSyncCenter.tsx` (screen) + `usePendingSyncCount.ts` (badge count), all exported from the `features/delivery` barrel. `pages/dashboard/delivery/PendingSyncPage.tsx` is the shell.
- **Not yet reachable by URL.** The route lives in `routes/index.tsx`, a shared file, so the wiring ships as a handoff patch in `docs/handoffs/F-1501.md`. `DashboardLayout.tsx` already lists `/dashboard/delivery/sync` ("Offline Sync Queue"), so until the patch lands that nav entry falls through to `/dashboard/delivery/*` and renders the job list.
- **Discarding a status change takes everything queued behind it, and says so first.** Queued changes replay oldest-first against the job's live server state, so dropping an early one makes every later one replay from a state it was never meant to follow; the backend refuses that transition and `syncJobStatuses` treats a refusal as final, removing the change. Discarding one would therefore silently discard the rest. They go together, in one confirmed step, with the count stated. `statusChangesDiscardedWith` is the rule and returns `[]` for an id not in the list, so a stale copy of the queue cannot discard anything by accident.
- **Location points do not cascade.** Each fix is independent, so a job's points are discarded as a whole without that warning and without touching its status chain.
- **Nothing is sent on mount.** Opening the screen with a large queue would otherwise fire requests the provider never asked for.
- **Sending while offline is refused up front**, not attempted and failed — a guaranteed failure carries no information, and it would erase the difference between "the server said no" and "there was no server". Offline is its own state.
- **A failed queue read is an error state, not an empty one.** Showing a clean slate when storage could not be read would tell the provider their queued work is gone.
- **A refusal surfaces the server's own words**, because it means the device has been acting on a stale view (a dispatcher or the SMS checkpoint moved the job while it was offline).
- `usePendingSyncCount` polls **only while the count is above zero** and stops the moment the queue drains; it is mounted in the dashboard layout for every screen a provider visits, so a permanent interval would be a background cost for a badge that would read zero either way. It returns `null` rather than throwing if storage is unavailable.

### Offline & Queue Scopes
- Service worker precaches app shell and fonts.
- Public GET endpoints use network-first with stale-while-revalidate.
- Offline mutations are strictly scoped to:
  1. Driver GPS location point collection (`recorded_at` device timestamp).
  2. Delivery status updates — queued and replayed, with conflicts surfaced (F-1105).
- Both provider queues are reviewed, retried and discarded from the pending sync center (F-1501).
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
