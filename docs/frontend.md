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
