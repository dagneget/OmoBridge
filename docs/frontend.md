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
- Checkout sends only item UUIDs and integer quantities: `[{ productId, quantity }]`. The client never calculates authoritative totals.
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


### F-1401 and F-1403 buyer reviews

Delivered order details and completed booking confirmations now offer a rating/comment form for each distinct purchased product, package or guide. Submission uses the existing authenticated review endpoint, checks the server confirmation, handles duplicate/ineligible/account errors, and supports explicit retry after uncertain responses. English/Amharic text, native keyboard controls, confirmation focus, account/target-scoped drafts, abort/timeout handling and online-only submission are included. Backend eligibility fixes are in `b431e6b`; frontend implementation and tests are in `354d0db`.

Validation: 682 frontend tests (75 files), typecheck/build and lint pass, with only existing inspection and bundle warnings. The 44 new frontend cases and 14 focused backend cases cover eligibility, duplicates and contract/session boundaries. Firefox 360 px checks both routes, keyboard submission, offline blocking, confirmation focus, duplicate rejection, no overflow and zero review-form axe violations. See [review handoff](frontend-reviews-handoff.md). F-1402 remains pending its authenticated reviewer-list contract; F-508 tracking remains independently blocked.


### F-1402 My reviews

On `integration/four-agent-baseline` / `b8035a1`, `/account/reviews` is linked from Account and guarded by session verification. It lists the authenticated user’s own reviews, including non-public reviews, through `GET /api/v1/reviews/my`. The new endpoint enforces reviewer scope, a capped page size and stable ordering; its generated types come from the running backend. Ratings, comments, submission dates and product/experience links are displayed with English/Amharic text and empty/loading/error/offline states. Private queries are scoped to authentication revision and cleared on account changes, with no persistence.

Verification: 714 frontend tests (77 files), 22 focused backend checks and typecheck/lint/build pass; only existing inspection and bundle warnings remain. PostgreSQL history mapping/count uses at most two queries. Firefox at 360 px verifies keyboard account navigation, pagination and refresh, offline handling, another account’s empty list, no overflow and zero review-page axe violations. FP14 is complete. See [review handoff](frontend-reviews-handoff.md).


### F-1706 security review

Delivered on `integration/four-agent-baseline` / `f741a09`: production CSP and hosting headers, lazy mock loading that excludes demo credentials from default release bundles, redacted React error callbacks and fallback, explicit disabled source maps, and `npm run security:check`. Verification: 730 frontend tests (79 files), typecheck/lint/build and artifact checks pass; dependency audit reports zero known vulnerabilities. Browser checks verify script/connection CSP enforcement and literal rendering of review HTML payloads. See [security review](frontend-security-review.md) and ADR-005.

The review is complete; release is blocked by SEC-01, confirmed booking details remaining after logout. The handoff stays with OpenCode F-110. LocalStorage bearer-token risk and real-host HTTPS/CORS/header verification remain explicit in the review. No active source files in other agents’ worktrees were changed.


### Dashboard responsiveness follow-up

User-requested shared responsive fixes are delivered in `21da3c4` on `integration/four-agent-baseline` and applied to the active checkout after checking file hashes. The shell, sidebar drawer, role switcher, tables, tabs, pagination and dialog sizing now support phone, tablet and desktop layouts. Existing feature forms and data logic were preserved, including active enterprise/farmer work.

Verification: 20 authenticated role/route views × five widths (320/360/768/1024/1440) pass all 100 checks, with no page-level overflow or compressed navigation labels. Drawer keyboard/focus/scroll locking, a multi-role header and a short-screen dialog pass. The integration branch passes 735 tests plus typecheck/build/lint/security artifact checks; active-checkout navigation tests pass 5/5, and the latest-feature snapshot typechecks. See [responsive review](dashboard-responsive-review.md). This follow-up does not complete or reassign any of the 134 planned feature tasks.
