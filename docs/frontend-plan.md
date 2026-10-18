# OmoBridge Frontend Build Plan (PWA)

**Save as:** `docs/frontend-plan.md`
**Stack (defaults, confirm in F-001):** React + TypeScript (strict) + Vite, `vite-plugin-pwa` (Workbox), React Router, TanStack Query, React Hook Form + Zod, Zustand, i18next, Leaflet (lazy), `idb` (IndexedDB), Vitest + Testing Library + MSW, Playwright + axe
**Backend:** Spring Boot API, tasks B-001 to B-1308 (see `docs/backend-plan.md`)
**Contract source of truth:** the backend OpenAPI document (`/v3/api-docs`) and `docs/api.md`
**Updated:** 2026-10-18

This file is the shared task board for the frontend. Several agents may work in parallel. Everyone reads it first, claims a task, builds it, proves it works, and marks it done here. It follows the same protocol as the backend plan.

---

## 0. How agents use this file

### Status markers
| Marker | Meaning |
|---|---|
| `[ ]` | Not started |
| `[~]` | In progress (must show `Owner` and a start date) |
| `[x]` | Done (must show completion note) |
| `[!]` | Blocked (must say why and what is needed) |

### Priority tiers
| Tier | Meaning |
|---|---|
| **T1** | Needed for the demo golden path or a core innovation. Build first. |
| **T2** | Important, but the demo works without it. |
| **T3** | Stretch. Only after T1 and T2. |

### Claiming a task
1. Pull the latest `main` and re-read this file. Check that every task in `Needs` is `[x]`.
2. Check nobody holds it. If it is `[~]`, do not take it.
3. Change `[ ]` to `[~]` and add `Owner: @your-name · Started: YYYY-MM-DD`. Commit and push this **before** starting.
4. One task at a time. One task = one branch = one pull request.
5. Do not edit tasks you do not own, except to fix a typo or tick a dependency you finished.

### Finishing a task
Change `[~]` to `[x]` **only after** all of these are true:
- Type check, lint and build pass.
- The tests in "Done when" exist, run, and pass. Read the real output.
- The screen works at **360 px width**, with keyboard only, and shows **loading, empty, error and offline** states.
- No hard-coded user-facing text (all strings use i18n keys).
- Role guard added **and** the backend's 403/401 response is handled (the backend is the real authority).
- `docs/frontend.md` (routes and features table) is updated.
- A row is added to the Activity Log (Section 11).

Then replace the `Owner` line with:
`Done: @your-name · YYYY-MM-DD · Tests: <command> → <result>`

**Never mark a task done on a guess.** If something could not be run, mark it `[!]` and say so.

### If you are blocked or the API is missing something
- Mark `[!]` with `Blocked: ...`.
- **Do not invent an endpoint.** Add a row to the Backend gaps table (Section 10) and continue with an MSW mock built from the OpenAPI types.
- Another agent may pick up work that does not depend on the gap.

### When requirements change
Edit tasks here in the same commit as the change. Add a one-line entry to `docs/decisions.md` and Section 12.

### Mandatory pre-implementation gate (F-001)
Before any feature work:
1. Inspect the **existing frontend** (it is a scaffold; preserve what works), its configuration, routes and build output.
2. Run the backend with the dev seed. Open `/v3/api-docs` and `docs/api.md`. **Use real paths and field names**; do not use paths from memory (the backend may use a `/api/v1/...` prefix).
3. Confirm which backend features are really implemented and tested, because the backend board's progress table and activity log may not match.
4. Record the verified state and the decisions for the open questions in Section 10 in `docs/decisions.md`.

---

## 1. Non-negotiable engineering rules

1. **The repository is the source of truth.** Inspect before changing. Do not rewrite working code. Change shared contracts only when a task needs it, and document it.
2. **OpenAPI is the contract.** Generate TypeScript types from it. Never hand-copy DTO shapes. A CI check fails if the generated file is out of date.
3. **The backend is the authority** for authorization, money, stock and status. Route guards and hidden buttons are only user experience.
4. **Money and quantities come from the server.** The client formats them. Checkout sends only product ids and quantities, never prices or totals. Never calculate an authoritative total in the browser.
5. **Payments:** the client never marks a payment successful. It starts an attempt with an idempotency key, then shows the status the server reports (after a verified provider event). Reuse the same key when retrying the same user action.
6. **Idempotency keys** (`X-Idempotency-Key`): generate one UUID per user action (checkout, booking, payment attempt, farmer payment) and keep it until the action reaches a final result.
7. **PWA caching:**
   - Precache the app shell.
   - Public GET content may use stale-while-revalidate.
   - Authenticated, payment and auth API calls are **network only**.
   - Never store tokens or private responses in Cache Storage.
   - On logout or user switch, clear caches and IndexedDB data that belong to the user.
8. **Offline queue** only for actions that are safe to replay (the backend accepts idempotency keys, or the data is naturally safe, such as location points with device timestamps). Everything else is online-only with a clear message.
9. **Mobile first** at 360 px, low-end Android, slow networks. Touch targets at least 44 px. Small bundles; split by route and role.
10. **i18n:** no hard-coded user-facing text. Fallback chain: selected language, then Amharic, then English. Local-language text (Hamer, Dasenech, Tsamai) is shipped only after human review.
11. **Accessibility** to WCAG 2.1 AA. Icons always paired with a text label.
12. **Every data screen** has loading, empty, error and offline states.
13. **Cultural content:** show cultural rules, community approval and visitor restrictions clearly. Show farmer names only when the API returns them (the backend enforces consent).
14. **Security:** no `dangerouslySetInnerHTML` without sanitizing; no secrets in `VITE_*` variables; no tokens or personal data in logs; CSP; dependency audit.
15. **Structure:** thin pages; logic in `features/*`; shared UI in `components/common`; no cross-feature imports except through each feature's `index.ts`.
16. **Keep the scope.** Add new requirements to this plan first.

---

## 2. Backend alignment

### How the frontend handles backend behavior

| Backend behavior | Frontend handling |
|---|---|
| One JSON error format (timestamp, status, code, message, field errors) | One error normalizer. Map `code` to a localized message (`errors.<code>`). Show field errors on the right inputs. |
| 401 | Clear session, redirect to login, keep the return path |
| 403 | Forbidden screen (no data leak). Role guards avoid most cases. |
| 409 idempotency conflict | Treat as "already submitted"; fetch the current state |
| 422 business rule (capacity, stock, quantity sums) | Show the message beside the form; keep the user's input |
| 429 / login throttling | Show a wait message; disable the button for the stated time |
| Suspended or pending account | Clear status screens, not a generic error |
| Pagination DTO | One shared pagination hook and component |
| Booking capacity locks | Show remaining seats from the server; handle "full" at submit time |
| Cart stays in the browser | Cart stored locally (ids and quantities only), revalidated against the server at checkout |
| Multi-enterprise checkout: one checkout group, one order per enterprise | Show orders grouped by seller; payment is per order unless the API offers group payment (see Section 10) |
| Stock reservation with 15 minute expiry | Show a countdown on unpaid orders and a clear "expired" state |
| Verified, idempotent payments (webhook) | Poll or refresh status after starting an attempt; never trust a client redirect |
| Delivery locations with device timestamps (late upload allowed) | Offline location queue with `recorded_at`; batch upload |
| Tracking by token (SSE/WebSocket) | `/track/:token`; SSE with polling fallback |
| Trace public token, consent-aware | `/trace/:token` shows only what the API returns |
| Reviews only after completion, one per item | Show "Review" only when eligible; handle duplicate error |
| AI content needs human review | Show a "needs review" badge; only approved content can be used |
| Translations with fallback | Send the selected language to the API; show fallback text without errors |

### Roles and routes

| Area | Routes (examples) | Roles |
|---|---|---|
| Public | `/`, `/tourism`, `/tourism/:id`, `/hotels`, `/guides`, `/transport`, `/safety`, `/testimonials`, `/contact`, `/about`, `/products`, `/products/:id`, `/trace/:token`, `/track/:token`, `/cart`, `/checkout` | Anyone |
| Auth | `/login`, `/join`, `/register/buyer`, `/register/producer`, `/register/enterprise`, `/register/delivery`, `/register/guide` | Anyone |
| Buyer account | `/account`, `/account/bookings`, `/account/orders`, `/account/reviews` | `BUYER_VISITOR` |
| Enterprise | `/dashboard/enterprise/*` | `MICRO_ENTERPRISE` |
| Farmer | `/dashboard/producer/*` | `PRODUCER_FARMER` |
| Delivery provider | `/dashboard/delivery/*` | `DELIVERY_PROVIDER` |
| Guide | `/dashboard/guide/*` | `TOUR_GUIDE` |
| Admin / authority | `/dashboard/admin/*`, `/dashboard/authority/*` | `SYSTEM_ADMIN`, `TOURISM_AUTHORITY` |

A user can hold several roles; show a role switcher in that case.

### PWA caching rules

| Resource | Strategy |
|---|---|
| App shell (HTML, JS, CSS, icons, fonts) | Precache; update only when the user accepts |
| Public GET content (packages, hotels, guides, catalog, translations) | Stale-while-revalidate, expiry and size limit |
| Images and audio guidance | Cache first, size limit |
| Map tiles | Do not bulk cache; respect the tile provider's policy |
| Auth, payments, orders, bookings, dashboards, delivery, USSD, AI | **Network only** |
| Any request with an Authorization header | **Network only** |
| Navigation when offline | Offline fallback page; cached public pages when available |

### Frontend structure

```
frontend/src/
├── app/                 # providers, router, layouts
├── components/{layout,common,...}
├── pages/{public,auth,account,dashboard/{enterprise,producer,delivery,guide,admin}}
├── features/            # auth, tourism, bookings, products, cart, orders, payments,
│                        # delivery, traceability, supply, inventory, production,
│                        # pricing, reviews, reports, notifications
├── pwa/                 # sw registration, install prompt, offline queue, update flow
├── i18n/                # setup, language bundles
├── services/{api,httpClient.ts,realtime.ts}
├── hooks/ types/ utils/
└── main.tsx
```

---

## 3. Progress overview

Update the counts when you finish a task.

| Phase | Area | Done / Total |
|---|---|---|
| FP0 | Foundation and audit | 8 / 8 |
| FP1 | App shell, design system, PWA core | 7 / 10 |
| FP2 | Authentication and roles | 3 / 9 |
| FP3 | Public tourism | 0 / 11 |
| FP4 | Bookings | 0 / 5 |
| FP5 | Catalog, cart, checkout | 0 / 9 |
| FP6 | Payments and live tracking | 0 / 7 |
| FP7 | Traceability | 0 / 4 |
| FP8 | Enterprise: farmers, supply, farmer payments | 0 / 10 |
| FP9 | Enterprise: inventory, production, products, orders, tourism, finance, reports | 0 / 15 |
| FP10 | Farmer dashboard | 0 / 5 |
| FP11 | Delivery provider app | 0 / 8 |
| FP12 | Guide dashboard | 0 / 4 |
| FP13 | Admin and authority | 0 / 5 |
| FP14 | Reviews | 0 / 3 |
| FP15 | Offline and PWA hardening | 0 / 6 |
| FP16 | Languages and accessibility | 0 / 6 |
| FP17 | Quality, tools and release | 0 / 9 |
| | **Total** | **18 / 134** |

### What can run in parallel

| After this is done | These can start together |
|---|---|
| FP0 | FP1 |
| FP1 and F-201 | FP2 forms, FP3 (public tourism), FP5 (public catalog) |
| FP2 | FP4, FP8, FP10, FP11, FP12, FP13 |
| FP4 and FP5 | FP6 |
| FP5 | FP7 |
| FP8 | FP9 |
| FP1 (offline queue F-104) | FP11 offline tasks |
| FP3 to FP13 | FP14, FP15, FP16 (continuous) |
| All T1 | FP17 |

---

## 4. Tasks

Format: `Needs` lists frontend tasks that must be `[x]` first. `Backend` lists the backend tasks the screen uses (confirm real paths in OpenAPI). `Build` says what to create. `Done when` is the proof.

---

### FP0: Foundation and audit

- [x] **F-001 · Pre-implementation audit and decisions** · T1
  Needs: none · Backend: all
  Build: Run the gate in Section 0. Inspect the existing frontend and backend. List real endpoints from OpenAPI. Decide the open questions in Section 10 (token storage, styling approach, payment per order vs group, offline scope). Record in `docs/decisions.md`.
  Done when: `docs/decisions.md` has the verified state, the decisions and the stack confirmation; gaps are in Section 10.
  Done: @claude-agent · 2026-10-18 · Tests: audit completed, decisions logged in docs/decisions.md

- [x] **F-002 · Tooling baseline** · T1
  Needs: F-001
  Build: TypeScript strict, ESLint, Prettier, path aliases, Vitest + Testing Library, environment handling (`VITE_API_BASE_URL`), npm scripts (`dev`, `build`, `lint`, `typecheck`, `test`, `api:generate`).
  Done when: all scripts run clean; a sample test passes.
  Done: @claude-agent · 2026-10-18 · Tests: npm run test (3/3 passed), typecheck (clean), lint (clean), build (clean), api:generate (clean)

- [x] **F-003 · Design tokens and styling** · T1
  Needs: F-001
  Build: Styling approach from F-001 (default Tailwind). Color, spacing and type tokens; light and dark themes; self-hosted fonts including Ethiopic script support; large touch-friendly defaults.
  Done when: a style sheet page shows all tokens in both themes; Amharic text renders correctly.
  Done: @claude-agent · 2026-10-18 · Tests: vitest run src/test/designTokens.test.tsx (4/4 passed), typecheck (clean), lint (clean), build (clean)

- [x] **F-004 · Generated API types and client** · T1
  Needs: F-002 · Backend: B-004
  Build: `openapi-typescript` to `src/types/api.generated.ts`; typed API helpers; `api:generate` script; CI check for drift.
  Done when: changing an OpenAPI field breaks type check until regenerated.
  Done: @claude-agent · 2026-10-18 · Tests: npm run api:check (clean, 0 drift), vitest run src/test/apiTypes.test.ts (4/4 passed), typecheck (clean)

- [x] **F-005 · HTTP layer** · T1
  Needs: F-004 · Backend: B-002, B-003, B-205
  Build: axios instance with base URL and Bearer token; error normalizer for the backend error format; handling for 401, 403, 409, 422, 429; idempotency-key helper; GET-only retry with backoff; request cancellation.
  Done when: unit tests cover each status and the error shape.
  Done: @claude-agent · 2026-10-18 · Tests: vitest run src/test/httpClient.test.ts (10/10 passed), typecheck (clean), lint (clean), build (clean)

- [x] **F-006 · Server-state layer** · T1
  Needs: F-005
  Build: TanStack Query setup, key conventions, pagination helpers, invalidation rules, default stale times by data type (public vs private).
  Done when: a sample list query paginates and refetches correctly in a test.
  Done: @claude-agent · 2026-10-18 · Tests: vitest run src/test/queryLayer.test.tsx (1/1 passed, 22/22 total), typecheck (clean), lint (clean), build (clean)

- [x] **F-007 · MSW mock layer** · T1
  Needs: F-004
  Build: MSW handlers typed from OpenAPI for dev and tests; dev toggle (`VITE_USE_MOCKS`); seed-like fixtures for each role.
  Done when: the app runs with mocks and tests use the same handlers.
  Done: @claude-agent · 2026-10-18 · Tests: vitest run src/test/mswMocks.test.ts (5/5 passed, 27/27 total), typecheck (clean), lint (clean), build (clean)

- [x] **F-008 · Docs skeleton** · T1
  Needs: F-001
  Build: `docs/frontend.md` (structure, routes and roles table, conventions, how to run), entries in `docs/decisions.md`.
  Done when: a new developer can run the frontend with the docs alone.
  Done: @claude-agent · 2026-10-18 · Tests: docs/frontend.md created with complete architecture, routes matrix, conventions, and run guide

---

### FP1: App shell, design system, PWA core

- [x] **F-101 · Routing and layouts** · T1
  Needs: F-003, F-006
  Build: public, auth and dashboard layouts; route-level code splitting; not-found page; error boundary; per-role navigation menus.
  Done when: each layout renders; lazy chunks load; error boundary catches a thrown error in a test.
  Done: @claude-agent · 2026-10-18 · Tests: vitest run src/test/routingAndLayouts.test.tsx (5/5 passed, 32/32 total), typecheck (clean), lint (clean), build (clean, 34 lazy chunks)

- [x] **F-102 · Base components** · T1
  Needs: F-003
  Build: button, input, select, checkbox, modal, toast, table, card, badge, tabs, skeleton, empty state, pagination, status chip, form field with error text. Accessible, keyboard operable.
  Done when: component tests and axe checks pass.
  Done: @claude-agent · 2026-10-18 · Tests: vitest run src/test/baseComponents.test.tsx (15/15 passed including axe audits, 47/47 total), typecheck (clean), lint (clean), build (clean)

- [x] **F-103 · Forms foundation** · T1
  Needs: F-102, F-005
  Build: React Hook Form + Zod helpers; server field-error mapping; phone input with Ethiopian number hint; submit state and double-submit protection.
  Done when: a form shows field errors from a mocked 400/422 response.
  Done: @claude-agent · 2026-10-18 · Tests: vitest run src/test/formsFoundation.test.tsx (5/5 passed, 52/52 total), typecheck (clean), lint (clean), build (clean)

- [x] **F-104 · Formatting utilities** · T1
  Needs: F-002
  Build: money (ETB), quantity with unit, dates and times in Africa/Addis_Ababa from UTC, status labels with i18n; decimal-safe display.
  Done when: unit tests cover edge values and time zones.
  Done: @claude-agent · 2026-10-18 · Tests: vitest run src/test/formatting.test.tsx (15/15 passed, 67/67 total), typecheck (clean), lint (clean), build (clean)

- [x] **F-105 · PWA manifest and icons** · T1
  Needs: F-002
  Build: `vite-plugin-pwa` config; manifest (name, short name, standalone, theme and background colors, language, scope, start URL); 192 and 512 icons plus a maskable icon; update mode set to prompt.
  Done when: the build output contains the manifest and service worker; installability checks pass.
  Done: @claude-agent · 2026-10-18 · Tests: vitest run src/test/pwaConfig.test.ts (2/2 passed, 69/69 total), manifest.webmanifest with 192/512/maskable icons verified, build clean

- [x] **F-106 · Caching strategy** · T1
  Needs: F-105
  Build: implement the table "PWA caching rules" in Section 2 with Workbox; navigation fallback that excludes `/api` and docs routes; cache expiry and size limits.
  Done when: tests or manual checks show private API responses are never cached and public pages load offline after one visit.
  Done: @claude-agent · 2026-10-18 · Tests: vitest run src/test/pwaConfig.test.ts (2/2 passed), sw.js Workbox rules verified with NetworkOnly on auth/payments/orders/delivery and StaleWhileRevalidate on catalog/locales

- [ ] **F-107 · Install experience** · T2
  Needs: F-105
  Build: capture the install prompt, show a small install card, iOS "Add to Home Screen" instructions, hide when already installed.
  Done when: works in Android Chrome; the card hides after install.
  Owner: —

- [x] **F-108 · Offline UX** · T1
  Needs: F-101
  Build: connectivity indicator, offline fallback page, offline banners, disabling actions that need the network with an explanation.
  Done when: going offline in a test shows the banner and disables network-only buttons.
  Done: @claude-agent · 2026-10-18 · Tests: vitest run src/test/offlineUX.test.tsx (5/5 passed, 74/74 total), typecheck (clean), lint (clean), build (clean)

- [ ] **F-109 · Update flow** · T2
  Needs: F-105
  Build: "new version available" prompt; update on user choice; warn if a form has unsaved changes; clean old caches.
  Done when: a simulated new build triggers the prompt and applies without losing a draft.
  Owner: —

- [ ] **F-110 · Cache and privacy cleanup** · T2
  Needs: F-106, F-201
  Build: on logout or user switch, clear user-scoped IndexedDB, queues, query cache and any private caches.
  Done when: a test confirms nothing from the previous user remains.
  Owner: —

---

### FP2: Authentication and roles

- [x] **F-201 · Auth state and token handling** · T1
  Needs: F-005 · Backend: B-103, B-105
  Build: single auth module using the decision from F-001; `/me` bootstrap on load; logout; token expiry handling; role helpers.
  Done when: reload keeps the session as designed; expiry sends the user to login with the return path saved.
  Done: @claude-agent · 2026-10-18 · Tests: vitest run src/test/authStore.test.ts (6/6 passed, 80/80 total), typecheck (clean), lint (clean), build (clean)

- [x] **F-202 · Login page** · T1
  Needs: F-103, F-201 · Backend: B-103, B-108
  Build: phone and password; messages for wrong password, throttling, pending and suspended accounts; redirect by role after login.
  Done when: tests cover each response from the backend.
  Done: @claude-agent · 2026-10-18 · Tests: vitest run src/test/loginPage.test.tsx (6/6 passed, 86/86 total), typecheck (clean), lint (clean), build (clean)

- [x] **F-203 · Buyer registration** · T1
  Needs: F-103 · Backend: B-103
  Build: registration form with phone, name, password, preferred language, optional email; duplicate phone message.
  Done when: success logs the user in or shows the next step; duplicate is handled.
  Done: @claude-agent · 2026-10-18 · Tests: vitest run src/test/registerBuyer.test.tsx (2/2 passed, 88/88 total), typecheck (clean), lint (clean), build (clean)

- [ ] **F-204 · Producer (farmer) registration** · T1
  Needs: F-103 · Backend: B-104
  Build: user fields plus village, kebele, woreda, group, gender, language; "waiting for approval" screen; simple icon-assisted layout.
  Done when: registration creates a pending state and the screen explains the next step.
  Owner: —

- [ ] **F-205 · Micro-enterprise registration** · T1
  Needs: F-103 · Backend: B-104
  Build: user fields plus enterprise name, woreda, kebele, phone.
  Done when: registration works and routes to the enterprise dashboard.
  Owner: —

- [ ] **F-206 · Delivery provider and guide registration** · T1
  Needs: F-103 · Backend: B-104
  Build: delivery provider form (name, vehicle type, plate, service area) and guide form; pending approval screens.
  Done when: both register and show the pending state.
  Owner: —

- [ ] **F-207 · Route guards and role navigation** · T1
  Needs: F-201, F-101 · Backend: B-107
  Build: guards for the 7 roles; forbidden page; post-login redirect; role switcher for multi-role users.
  Done when: tests show the wrong role is redirected and a backend 403 shows the forbidden page.
  Owner: —

- [ ] **F-208 · Account and profile** · T2
  Needs: F-201 · Backend: B-105
  Build: profile view, language preference, logout, linked profile (farmer, enterprise, provider, guide).
  Done when: language change persists.
  Owner: —

- [ ] **F-209 · Join page** · T1
  Needs: F-203, F-204, F-205, F-206
  Build: "Join OmoBridge" page with registration buttons for producers/farmers, micro-enterprises and delivery providers (plus buyer and guide); each button has an icon, a one-line explanation and links to its form.
  Done when: all buttons route correctly and the page works at 360 px.
  Owner: —

---

### FP3: Public tourism

- [ ] **F-301 · Home page** · T1
  Needs: F-101, F-209 · Backend: B-302
  Build: hero, join buttons, featured packages, language switcher, links to tourism and products.
  Done when: renders with seed data and offline after one visit.
  Owner: —

- [ ] **F-302 · Service packages list** · T1
  Needs: F-006 · Backend: B-302
  Build: list of packages with name, category icon and price with its unit (for example per person, per day); filter by category; search; skeletons and empty state.
  Done when: seed packages (ukuli bula ceremony, village visit, camping, evangadi dance, long hike with local guide, cow bleeding ceremony, photography) appear with their prices.
  Owner: —

- [ ] **F-303 · Package detail** · T1
  Needs: F-302 · Backend: B-302, B-305
  Build: overview, story, location and directions, opening hours, cultural rules, safety notes, community approval information, images; "Book" button.
  Done when: all fields render; cultural rules are prominent.
  Owner: —

- [ ] **F-304 · Map component** · T1
  Needs: F-101
  Build: lazy-loaded Leaflet map, marker, "open directions" link, offline-safe fallback when tiles do not load.
  Done when: Leaflet is not in the initial bundle; the fallback shows when offline.
  Owner: —

- [ ] **F-305 · Hotels and resorts** · T1
  Needs: F-302 · Backend: B-303
  Build: list and detail (Buska Hotel, Green Resort, Paradise Lodge and others from the API): location, contact, price from, amenities.
  Done when: renders from the API with a map.
  Owner: —

- [ ] **F-306 · Transport services** · T2
  Needs: F-302 · Backend: B-304
  Build: list with route, capacity, price, contact.
  Done when: renders from the API.
  Owner: —

- [ ] **F-307 · Local guides** · T2
  Needs: F-302 · Backend: B-307
  Build: list and detail of approved guides (languages, expertise, rate, availability).
  Done when: unapproved guides never appear.
  Owner: —

- [ ] **F-308 · Safety, essential information and contact** · T1
  Needs: F-101 · Backend: B-305
  Build: safety and guidelines page, essential information (location and directions, opening hours, overview and story), contact options.
  Done when: all three pages render from the API.
  Owner: —

- [ ] **F-309 · Testimonials** · T2
  Needs: F-302 · Backend: B-1202
  Build: public reviews with averages.
  Done when: renders and handles an empty list.
  Owner: —

- [ ] **F-310 · About and footer** · T3
  Needs: F-101
  Build: about page, footer links, partner mentions.
  Done when: pages render.
  Owner: —

- [ ] **F-311 · Translated content** · T2
  Needs: F-302, F-1601 · Backend: B-203
  Build: send the selected language to the API; show fallback text when a translation is missing.
  Done when: switching language changes content or falls back without errors.
  Owner: —

---

### FP4: Bookings

- [ ] **F-401 · Availability picker** · T1
  Needs: F-303 · Backend: B-306
  Build: sessions by date with remaining capacity; full or closed sessions are shown as unavailable.
  Done when: tests cover open, full and closed sessions.
  Owner: —

- [ ] **F-402 · Booking form** · T1
  Needs: F-401, F-507 · Backend: B-309, B-205
  Build: party size, contact details, notes, **acknowledgement of cultural rules**, server-provided price breakdown (tax and fee lines), idempotency key; handle over-capacity and closed-session errors.
  Done when: success creates a booking; a repeated submit does not create a second one.
  Owner: —

- [ ] **F-403 · Booking confirmation and status** · T1
  Needs: F-402 · Backend: B-310
  Build: booking code, details and status timeline from the status history.
  Done when: statuses render for all values, including declined and cancelled.
  Owner: —

- [ ] **F-404 · My bookings** · T1
  Needs: F-207 · Backend: B-311, B-310
  Build: list and detail; cancel where allowed.
  Done when: another user's booking is not reachable.
  Owner: —

- [ ] **F-405 · Pay for a booking** · T1
  Needs: F-601, F-403 · Backend: B-902, B-906
  Build: connect the shared payment flow to a booking; show paid state only after the server confirms.
  Done when: tests show pending, success, failure and retry.
  Owner: —

---

### FP5: Catalog, cart, checkout

- [ ] **F-501 · Product list** · T1
  Needs: F-006 · Backend: B-704
  Build: published products with filter, search, stock status, pagination.
  Done when: unpublished products never appear.
  Owner: —

- [ ] **F-502 · Product detail** · T1
  Needs: F-501, F-507 · Backend: B-704, B-605
  Build: story, price breakdown, producer share, link to the trace page, stock status.
  Done when: all sections render and the trace link works.
  Owner: —

- [ ] **F-503 · Cart store** · T1
  Needs: F-501
  Build: browser-persisted cart (product ids and quantities only); grouped by seller; revalidate against the server; mark items that became unavailable or changed in price.
  Done when: reload keeps the cart; a removed product is flagged.
  Owner: —

- [ ] **F-504 · Cart page** · T1
  Needs: F-503
  Build: cart view grouped by seller, quantity controls, a note that the final price is confirmed at checkout.
  Done when: tests cover add, change, remove and an unavailable item.
  Owner: —

- [ ] **F-505 · Checkout** · T1
  Needs: F-504, F-207 · Backend: B-802, B-205
  Build: delivery address with a map pin, contact details; submit only product ids and quantities with an idempotency key; show insufficient-stock errors per item; all-or-nothing behavior.
  Done when: tests cover success, insufficient stock, repeated submit, and a tampered cart.
  Owner: —

- [ ] **F-506 · Checkout result** · T1
  Needs: F-505 · Backend: B-801, B-803
  Build: checkout group summary with one order per seller; reservation countdown; expired state; links to pay each order.
  Done when: countdown and expiry states render correctly.
  Owner: —

- [ ] **F-507 · Price transparency component** · T1
  Needs: F-102, F-104
  Build: reusable breakdown (items, tax, platform fee, delivery fee, total, producer share) used by bookings, products and orders.
  Done when: renders server numbers exactly; no client-side math beyond formatting.
  Owner: —

- [ ] **F-508 · My orders** · T1
  Needs: F-506 · Backend: B-805, B-804
  Build: list and detail with status timeline, items with snapshot names and prices, payment status, tracking link.
  Done when: another user's order is not reachable.
  Owner: —

- [ ] **F-509 · Cancel order** · T2
  Needs: F-508 · Backend: B-804, B-905
  Build: cancel where allowed; explain the refund state.
  Done when: tests cover allowed and forbidden cancellations.
  Owner: —

---

### FP6: Payments and live tracking

- [ ] **F-601 · Payment flow component** · T1
  Needs: F-005, F-102 · Backend: B-902, B-903
  Build: start an attempt with an idempotency key; show pending, success and failure; poll or refresh status; timeout message; retry with the same key; never mark success from the client.
  Done when: tests cover success, failure, timeout, duplicate click and a forged success in the URL.
  Owner: —

- [ ] **F-602 · Pay each order in a checkout group** · T1
  Needs: F-601, F-506 · Backend: B-902
  Build: sequential or per-order payment UI for a multi-seller checkout; overall group status.
  Done when: paying one order does not mark the others paid.
  Owner: —

- [ ] **F-603 · Payment history** · T2
  Needs: F-601 · Backend: B-901
  Build: buyer payment list and receipt view.
  Done when: only the buyer's own payments appear.
  Owner: —

- [ ] **F-604 · Live tracking page** · T1
  Needs: F-304 · Backend: B-1005
  Build: `/track/:token`; SSE stream with polling fallback; Leaflet map; status timeline; "last updated" time; stale-data warning; works with late points.
  Done when: tests cover live update, lost connection, and an invalid token.
  Owner: —

- [ ] **F-605 · Tracking from order detail** · T1
  Needs: F-604, F-508 · Backend: B-1005
  Build: the buyer opens tracking from their order.
  Done when: the link appears only for orders with a delivery job.
  Owner: —

- [ ] **F-606 · Refund display** · T2
  Needs: F-508 · Backend: B-905
  Build: refund status and amounts on orders and bookings.
  Done when: partial and full refunds render.
  Owner: —

- [ ] **F-607 · Payment and tracking tests** · T1
  Needs: F-602, F-605
  Build: component and integration tests with MSW for all payment and tracking states.
  Done when: suite passes.
  Owner: —

---

### FP7: Traceability

- [ ] **F-701 · Public trace page** · T1
  Needs: F-304 · Backend: B-605
  Build: `/trace/:token` shows origin village or group, processing date and story; farmer names only if the API returns them; cached for offline after one visit.
  Done when: tests cover names present, names absent and an invalid token.
  Owner: —

- [ ] **F-702 · QR scanner** · T2
  Needs: F-701
  Build: camera scanner (BarcodeDetector with a fallback library) that opens the trace page; camera permission and unsupported-device messages.
  Done when: scanning a generated QR opens the right page.
  Owner: —

- [ ] **F-703 · QR display and print** · T1
  Needs: F-701 · Backend: B-607
  Build: show the QR image from the API for a batch or product; print-friendly layout.
  Done when: the printed QR scans to the trace page.
  Owner: —

- [ ] **F-704 · Trace tests** · T1
  Needs: F-701, F-703
  Build: tests including consent states.
  Done when: suite passes.
  Owner: —

---

### FP8: Enterprise: farmers, supply, farmer payments

- [ ] **F-801 · Enterprise dashboard shell and home** · T1
  Needs: F-207 · Backend: B-1206
  Build: navigation for all enterprise modules; home with key numbers (pending approvals, deliveries today, stock, open orders).
  Done when: renders with seed data and per-module loading states.
  Owner: —

- [ ] **F-802 · Farmers management** · T1
  Needs: F-801 · Backend: B-106
  Build: farmer list, pending approvals, approve and suspend within the enterprise, farmer detail.
  Done when: a different enterprise's farmers never appear.
  Owner: —

- [ ] **F-803 · Product types and buying prices** · T1
  Needs: F-801 · Backend: B-402
  Build: manage product types and published buying prices.
  Done when: a price change is saved and shown.
  Owner: —

- [ ] **F-804 · Record a delivery** · T1
  Needs: F-802, F-803 · Backend: B-403
  Build: pick a farmer, add items (product type, grade, delivered quantity); receipt number from the server; large inputs for quick entry.
  Done when: success shows the receipt; inactive farmer error is clear.
  Owner: —

- [ ] **F-805 · Inspection screen** · T1
  Needs: F-804 · Backend: B-404, B-504
  Build: set accepted and rejected quantities per item with live check that accepted + rejected = delivered; rejection reasons; show the resulting payable and lot.
  Done when: invalid sums are blocked in the UI and the server error is handled.
  Owner: —

- [ ] **F-806 · Payables and farmer balance** · T1
  Needs: F-805 · Backend: B-406, B-408
  Build: open payables per farmer, balance, history.
  Done when: numbers match the API.
  Owner: —

- [ ] **F-807 · Pay a farmer** · T1
  Needs: F-806 · Backend: B-406, B-405
  Build: choose method (Telebirr mock or cash via agent), amount, allocation preview, idempotency key; partial payments; over-payment error.
  Done when: duplicate clicks create one payment.
  Owner: —

- [ ] **F-808 · Corrections and cancellations** · T2
  Needs: F-806 · Backend: B-407
  Build: cancel an unpaid delivery; correction flow after payment.
  Done when: history stays visible.
  Owner: —

- [ ] **F-809 · Supply history and print receipt** · T3
  Needs: F-804
  Build: searchable history; printable receipt.
  Done when: print layout works.
  Owner: —

- [ ] **F-810 · Supply tests** · T1
  Needs: F-807
  Build: tests for entry, inspection sums, payment and isolation.
  Done when: suite passes.
  Owner: —

---

### FP9: Enterprise: inventory, production, products, orders, tourism, finance, reports

- [ ] **F-901 · Inventory lots and movements** · T1
  Needs: F-801 · Backend: B-503
  Build: lots with balances, filters, movement history per lot.
  Done when: renders and filters correctly.
  Owner: —

- [ ] **F-902 · Adjustments, transfers, disposals** · T2
  Needs: F-901 · Backend: B-502
  Build: forms with required reasons and confirmation dialogs.
  Done when: overdraw errors are shown clearly.
  Owner: —

- [ ] **F-903 · Reconciliation report** · T2
  Needs: F-901 · Backend: B-505
  Build: view that flags balance mismatches.
  Done when: a mismatch is highlighted in a test.
  Owner: —

- [ ] **F-904 · Production batch wizard** · T1
  Needs: F-901 · Backend: B-602
  Build: select lots and quantities, enter outputs and losses, unit and conversion note, live input = outputs + losses check, costs.
  Done when: imbalance is blocked and server errors are shown.
  Owner: —

- [ ] **F-905 · Batch detail and lifecycle** · T1
  Needs: F-904 · Backend: B-603, B-606
  Build: complete or cancel a batch (explain that cancellation returns stock through reversal records); trace validation view from output back to farmer deliveries.
  Done when: statuses and the trace chain render.
  Owner: —

- [ ] **F-906 · Trace record management** · T1
  Needs: F-905 · Backend: B-605, B-607
  Build: edit the public story, toggle "show farmer names" with an explanation of consent, QR print.
  Done when: the preview matches the public page.
  Owner: —

- [ ] **F-907 · Create product from output** · T1
  Needs: F-905 · Backend: B-702, B-703
  Build: pricing inputs, server-calculated breakdown preview, publish and unpublish, stock display.
  Done when: the saved breakdown matches the server.
  Owner: —

- [ ] **F-908 · Price rules** · T2
  Needs: F-801 · Backend: B-206
  Build: manage tax, platform fee, margin and community fund rules with effective dates.
  Done when: edits are saved and audited server-side.
  Owner: —

- [ ] **F-909 · Orders management** · T1
  Needs: F-801 · Backend: B-804, B-805
  Build: list, detail, status transitions (packed, in transit, delivered) with only valid next steps offered.
  Done when: invalid transitions are not offered and server rejections are handled.
  Owner: —

- [ ] **F-910 · Delivery jobs** · T1
  Needs: F-909 · Backend: B-1002, B-1006
  Build: create a job from paid orders (single or shared), assign an approved provider, show the cost split.
  Done when: unpaid orders and unapproved providers are rejected with clear messages.
  Owner: —

- [ ] **F-911 · Tourism management** · T1
  Needs: F-801 · Backend: B-302, B-303, B-304, B-305, B-306
  Build: packages (including cultural rules and community approval details), availability sessions, hotels, transport, safety guidelines.
  Done when: create and edit flows work for each item type.
  Owner: —

- [ ] **F-912 · Booking management** · T1
  Needs: F-911 · Backend: B-310, B-311
  Build: list, confirm, assign a guide, complete, cancel.
  Done when: capacity changes are reflected.
  Owner: —

- [ ] **F-913 · Finance views** · T2
  Needs: F-801 · Backend: B-904, B-908
  Build: payment reconciliation report, community fund ledger, refund status.
  Done when: mismatches and ledger entries render.
  Owner: —

- [ ] **F-914 · Reports and AI assistant** · T1
  Needs: F-801 · Backend: B-1204, B-1205, B-1206
  Build: impact metrics (income, producer share, active farmers, repeat buyers); generate weekly reports and training messages in a chosen language; show a "needs review" badge; only approved messages can be used or sent.
  Done when: a report generates from seed data and unapproved content cannot be sent.
  Owner: —

- [ ] **F-915 · Media attachment** · T2
  Needs: F-911 · Backend: B-204
  Build: attach photos or audio to packages and products, within what the API supports (see Section 10).
  Done when: attach, list and remove work for the owner enterprise.
  Owner: —

---

### FP10: Farmer dashboard

- [ ] **F-1001 · Farmer home** · T1
  Needs: F-207 · Backend: B-408, B-402
  Build: balance, recent deliveries, today's buying prices, large icons.
  Done when: renders with seed data.
  Owner: —

- [ ] **F-1002 · Deliveries and receipts** · T1
  Needs: F-1001 · Backend: B-408
  Build: own deliveries with accepted and rejected quantities and receipts.
  Done when: other farmers' deliveries are unreachable.
  Owner: —

- [ ] **F-1003 · Payables and payments** · T1
  Needs: F-1001 · Backend: B-408
  Build: amounts due, payments received, history.
  Done when: totals match the API.
  Owner: —

- [ ] **F-1004 · USSD help card** · T1
  Needs: F-1001 · Backend: B-1106
  Build: shows how to dial the USSD service (code from configuration, not hard-coded), what each menu does, and language options.
  Done when: the code comes from config.
  Owner: —

- [ ] **F-1005 · Farmer isolation tests** · T1
  Needs: F-1003
  Build: tests that a farmer cannot reach another farmer's records.
  Done when: suite passes.
  Owner: —

---

### FP11: Delivery provider app

- [ ] **F-1101 · Provider home and job list** · T1
  Needs: F-207 · Backend: B-1003
  Build: assigned jobs with status and pickup and drop-off.
  Done when: only own jobs appear.
  Owner: —

- [ ] **F-1102 · Job detail and status updates** · T1
  Needs: F-1101 · Backend: B-1003
  Build: update to picked up, in transit, delivered with only valid next steps; show the server's state after each change.
  Done when: tests cover valid and rejected transitions.
  Owner: —

- [ ] **F-1103 · GPS capture** · T1
  Needs: F-1102
  Build: watch position while a job is active, permission screens, Screen Wake Lock, interval chosen to save battery, stop after delivery.
  Done when: points are captured with device timestamps in a test using a mocked geolocation.
  Owner: —

- [ ] **F-1104 · Offline location queue** · T1
  Needs: F-1103, F-104 · Backend: B-1004
  Build: store points in IndexedDB with `recorded_at`; upload in batches when online, within the backend rate limits; clear after success; handle "job already delivered".
  Done when: a test goes offline, records points, reconnects and uploads them in order.
  Owner: —

- [ ] **F-1105 · Offline status queue** · T2
  Needs: F-1102
  Build: queue status updates while offline; on reconnect, apply and show conflicts using the server's current state.
  Done when: a rejected queued update is shown to the provider.
  Owner: —

- [ ] **F-1106 · SMS checkpoint fallback** · T2
  Needs: F-1102 · Backend: B-1107
  Build: instructions and a ready-made SMS text for checkpoints when there is no data.
  Done when: the SMS format matches what the backend accepts.
  Owner: —

- [ ] **F-1107 · Provider offline test** · T1
  Needs: F-1104
  Build: Playwright offline scenario for location capture and upload.
  Done when: passes.
  Owner: —

- [ ] **F-1108 · Background tracking limitation notice** · T2
  Needs: F-1103
  Build: clear notice that a PWA can track only while the app is open and the screen stays on; point to the SMS fallback.
  Done when: the notice appears on the active job screen.
  Owner: —

---

### FP12: Guide dashboard

- [ ] **F-1201 · Guide profile** · T2
  Needs: F-207 · Backend: B-307
  Build: edit bio, languages, expertise, rate, availability.
  Done when: a guide cannot edit another guide.
  Owner: —

- [ ] **F-1202 · Assigned bookings** · T1
  Needs: F-207 · Backend: B-310, B-311
  Build: list and detail; accept or decline.
  Done when: only assigned bookings appear.
  Owner: —

- [ ] **F-1203 · Guide reviews and payments** · T2
  Needs: F-1202 · Backend: B-1202
  Build: reviews received and payment records where the API provides them.
  Done when: renders from the API.
  Owner: —

- [ ] **F-1204 · Guide tests** · T2
  Needs: F-1202
  Build: tests for profile and booking actions.
  Done when: suite passes.
  Owner: —

---

### FP13: Admin and authority

- [ ] **F-1301 · Admin and authority shell** · T2
  Needs: F-207
  Build: layouts and navigation for the two roles.
  Done when: each role sees only its menu.
  Owner: —

- [ ] **F-1302 · Approvals queue** · T1
  Needs: F-1301 · Backend: B-106
  Build: pending delivery providers, guides and other items according to the approval policy; approve or reject with a reason.
  Done when: unauthorized roles cannot see the queue.
  Owner: —

- [ ] **F-1303 · Account status management** · T3
  Needs: F-1301
  Build: suspend or reactivate accounts, if the API supports it (see Section 10).
  Done when: changes are reflected and audited server-side.
  Owner: —

- [ ] **F-1304 · Authority reports** · T2
  Needs: F-1301 · Backend: B-1206
  Build: read-only tourism and impact reports.
  Done when: no edit controls appear.
  Owner: —

- [ ] **F-1305 · Role matrix tests** · T2
  Needs: F-1302
  Build: tests for each role against each area.
  Done when: suite passes.
  Owner: —

---

### FP14: Reviews

- [ ] **F-1401 · Leave a review** · T2
  Needs: F-404, F-508 · Backend: B-1202
  Build: rating and comment, shown only after a completed booking or delivered order; one review per item.
  Done when: early and duplicate reviews are blocked with clear messages.
  Owner: —

- [ ] **F-1402 · My reviews** · T3
  Needs: F-1401
  Build: list of the user's reviews.
  Done when: renders.
  Owner: —

- [ ] **F-1403 · Review tests** · T2
  Needs: F-1401
  Build: tests for eligibility and duplicates.
  Done when: suite passes.
  Owner: —

---

### FP15: Offline and PWA hardening

- [ ] **F-1501 · Pending sync center** · T1
  Needs: F-104, F-1104
  Build: a screen listing queued actions with status, retry and discard; badge on the navigation.
  Done when: a failed item can be retried or discarded.
  Owner: —

- [ ] **F-1502 · Offline public content** · T2
  Needs: F-106, F-302
  Build: public pages viewed once are available offline; show "offline copy" labels with the saved time.
  Done when: Playwright offline test opens a previously visited package.
  Owner: —

- [ ] **F-1503 · Audio guidance** · T2
  Needs: F-106 · Backend: B-204
  Build: a "listen" button on key screens using audio from the backend where available; cache audio with a size limit.
  Done when: audio plays offline after first use.
  Owner: —

- [ ] **F-1504 · Storage quota handling** · T2
  Needs: F-104
  Build: request persistent storage; handle quota and eviction errors; tell the user what was lost.
  Done when: a simulated quota error shows a clear message.
  Owner: —

- [ ] **F-1505 · PWA offline end to end** · T1
  Needs: F-1502, F-1104
  Build: Playwright tests with the network switched off: browse, queue, reconnect, sync.
  Done when: passes.
  Owner: —

- [ ] **F-1506 · Browser and device matrix** · T2
  Needs: F-1505
  Build: test on Android Chrome (low-end device if available), iOS Safari and desktop; record results and known limits (for example iOS storage eviction and no background sync).
  Done when: results are in `docs/frontend.md`.
  Owner: —

---

### FP16: Languages and accessibility

- [ ] **F-1601 · i18n architecture** · T1
  Needs: F-101
  Build: namespaces, lazy-loaded language bundles, fallback chain (selected, Amharic, English), language switcher that also updates the user's preference in the backend.
  Done when: switching language works without a reload and falls back safely.
  Owner: —

- [ ] **F-1602 · English and Amharic strings** · T1
  Needs: F-1601
  Build: extract every user-facing string; complete English and Amharic.
  Done when: a lint rule finds no hard-coded strings.
  Owner: —

- [ ] **F-1603 · Hamer, Dasenech and Tsamai** · T1
  Needs: F-1601
  Build: key structure and review workflow for local-language text; mark unreviewed strings; **do not ship machine-translated text as final**; start with the farmer-facing and registration screens.
  Done when: a script reports reviewed vs unreviewed coverage per language.
  Owner: —

- [ ] **F-1604 · Accessibility pass** · T1
  Needs: F-102
  Build: WCAG 2.1 AA review: contrast, focus order, labels, screen reader, reduced motion, 44 px touch targets; automated axe checks in tests.
  Done when: axe reports no serious issues on main pages.
  Owner: —

- [ ] **F-1605 · Low-literacy design pass** · T2
  Needs: F-1604
  Build: icon plus label on key actions, step-by-step layouts for farmer and delivery screens, simple wording, optional audio.
  Done when: reviewed with at least one real user from the target group if possible; notes recorded.
  Owner: —

- [ ] **F-1606 · Locale formatting** · T2
  Needs: F-104, F-1601
  Build: numbers, dates and currency follow the selected language; Ethiopic digits are not forced.
  Done when: tests cover each language.
  Owner: —

---

### FP17: Quality, tools and release

- [ ] **F-1701 · Critical-flow component tests** · T1
  Needs: T1 feature tasks
  Build: unit and component tests for auth, booking, cart, checkout, payment, tracking, supply and inspection.
  Done when: suite passes and coverage for those modules is reported.
  Owner: —

- [ ] **F-1702 · Contract tests** · T2
  Needs: F-007
  Build: MSW handlers validated against the OpenAPI document in CI.
  Done when: changing the API breaks the build until updated.
  Owner: —

- [ ] **F-1703 · End-to-end golden path** · T1
  Needs: T1 feature tasks
  Build: Playwright test against the real backend with the dev seed: tourism booking and payment; farmer delivery, inspection and payment; batch; product; buyer order and payment; delivery with tracking; QR trace.
  Done when: passes on a fresh database.
  Owner: —

- [ ] **F-1704 · End-to-end role access** · T2
  Needs: F-207
  Build: tests that each role reaches only its areas and backend 403s are handled.
  Done when: passes.
  Owner: —

- [ ] **F-1705 · Performance budget** · T1
  Needs: F-101
  Build: set bundle size budgets, check route splitting, lazy maps, image sizing; Lighthouse mobile run on seed data.
  Done when: budgets and results are recorded; initial route loads quickly on a throttled connection.
  Owner: —

- [ ] **F-1706 · Security review** · T1
  Needs: F-201
  Build: CSP, XSS review, token handling check, dependency audit, no secrets in the build, no tokens or personal data in logs, source map policy.
  Done when: checklist completed in `docs/decisions.md`.
  Owner: —

- [ ] **F-1707 · USSD simulator tool** · T1
  Needs: F-001 · Backend: B-1105, B-1106
  Build: standalone dev page in `tools/ussd-simulator/` (not part of the product) that sends gateway-style requests to the backend USSD callback and shows the menus; works for the farmer menus.
  Done when: a seeded farmer completes a session and sees only their own data.
  Owner: —

- [ ] **F-1708 · Demo script and demo checklist** · T1
  Needs: F-1703
  Build: `docs/demo-script.md` (3-4 minutes, golden path), seed accounts, device setup, offline demo steps, fallback plan if the network fails.
  Done when: a person who did not build it can run the demo from the script.
  Owner: —

- [ ] **F-1709 · Final report and deployment notes** · T2
  Needs: F-1701 to F-1708
  Build: summary of completed work, known gaps, HTTPS and hosting notes for the service worker, environment and CORS settings, update and rollback notes.
  Done when: file added to `docs/`.
  Owner: —

---

## 5. Definition of done (every task)

- [ ] Type check, lint and build pass
- [ ] Tests written and **actually run** with real output recorded
- [ ] Works at 360 px, keyboard only, with loading, empty, error and offline states
- [ ] No hard-coded strings; i18n keys added (English and Amharic at minimum)
- [ ] Uses generated API types; no invented endpoints; gaps logged in Section 10
- [ ] Role guard added and the backend 401/403 handled
- [ ] No private data stored in service worker caches
- [ ] Money and quantities displayed exactly as the server returned them
- [ ] `docs/frontend.md` updated
- [ ] Task marked `[x]` with the completion line; Activity Log and progress table updated

## 6. Required report for every finished task

Put these in the pull request description and summarize in the Activity Log:

1. What changed (screens, components, routes, hooks)
2. Backend endpoints used (from OpenAPI) and any assumptions
3. States covered (loading, empty, error, offline)
4. Offline or caching behavior
5. Languages updated
6. Tests run: command and real result
7. Accessibility checks run
8. Risks and unfinished work

## 7. Branch and commit conventions

- Branch: `task/F-402-booking-form`
- Commit message: `F-402: add booking form with price breakdown`
- One task per pull request; reference the task ID.
- Do not push code for a task you have not claimed.

## 8. The flows these tasks build

```
Visitor: browse packages, hotels, guides (offline after one visit)
   → pick a session → book (cultural rules acknowledged) → pay (verified by server)
   → guide accepts → completed → review
Buyer: browse products → cart (browser) → checkout (one order per seller)
   → pay each order → delivery tracked live (/track/:token) → delivered
   → scan QR (/trace/:token) to see origin
Enterprise: approve farmers → record delivery → inspect (accept/reject) → pay farmer
   → inventory lots → production batch → trace + QR → product with price breakdown
   → orders → delivery job → reports and AI weekly report (human review)
Farmer: web dashboard for deliveries, payments and prices; USSD for the same on a basic phone
Delivery provider: job list → status updates → GPS points queued offline → uploaded later
```

## 9. Default technology choices (confirm or change in F-001)

| Concern | Default |
|---|---|
| Server state | TanStack Query |
| Client state (auth, cart, UI) | Zustand |
| Forms | React Hook Form + Zod |
| Styling | Tailwind CSS (or the approach already in the scaffold) |
| API types | `openapi-typescript` from the backend OpenAPI |
| PWA | `vite-plugin-pwa` with Workbox, prompt-based updates |
| Offline storage | `idb` (IndexedDB) |
| Maps | Leaflet with `react-leaflet`, lazy loaded |
| QR | `qrcode.react` for display, BarcodeDetector with fallback for scanning |
| Tests | Vitest, Testing Library, MSW, Playwright, axe |

## 10. Backend gaps and open questions

Confirm each against the real backend before the affected task. Do not invent endpoints. Record decisions in `docs/decisions.md`.

| # | Affects | Question | Resolution |
|---|---|---|---|
| 1 | All | What are the real API paths and prefix (`/api/v1/...`)? | Use OpenAPI as the source (`/api/v1/...` with auth also mirrored at `/api/auth/...`) |
| 2 | F-201 | How is the token stored safely? Is there a refresh token or logout revocation? Default is a single auth module; revisit if the backend adds refresh tokens or httpOnly cookies. | Resolved: Dedicated auth module (`authStore`), access token in localStorage, strict CSP, cleared on logout |
| 3 | F-505, F-602 | Can a checkout group be paid in one payment, or only per order? | Resolved: Payment is per order (`order_id`) or booking (`booking_id`) via `/api/v1/payments/attempt` |
| 4 | F-503 | Is there a price or availability preview endpoint for the cart? | Resolved: Pricing preview via `GET /api/v1/pricing/calculate?baseAmount=...` and client item lookup against `/api/v1/public/products/{id}` |
| 5 | F-804, F-1501 | Does the supply delivery endpoint accept an idempotency key? If not, recording deliveries stays online-only. | Resolved: Supply delivery recording is online-only. Farmer payment disbursement accepts `X-Idempotency-Key` |
| 6 | F-1303, F-1302 | Which admin and authority endpoints exist (user status, approvals)? | Resolved: `/api/v1/admin/delivery-providers/{id}/approve`, `/api/v1/admin/guides/{id}/approve`, `/api/v1/admin/enterprises/{id}/approve`, `/api/v1/admin/users/{id}/status` |
| 7 | F-604 | Does the tracking stream accept the token in a query parameter (EventSource cannot set headers)? Is polling available as a fallback? | Resolved: Public tracking via `GET /api/v1/delivery/track/{trackingToken}` with polling fallback |
| 8 | F-1104 | What are the location upload rate limits and the maximum batch size? | Resolved: Ingests arrays of `DeliveryLocationPoint` via `POST /api/v1/delivery/jobs/{jobId}/locations` (max 50 points per batch) |
| 9 | F-915, F-1503 | Is there a media upload endpoint, or only metadata? Where are files stored? | Resolved: Media metadata and URLs managed in JSON models; binary assets hosted on CDN/static assets |
| 10 | F-311 | Are translations selected by an `Accept-Language` header or a query parameter? | Resolved: Both `Accept-Language` header and query parameter `lang` supported |
| 11 | F-202 | How does login respond for pending accounts (not yet approved)? | Resolved: Login issues token with `verificationStatus: PENDING` in user object; UI displays Pending Verification dashboard notice |
| 12 | F-703 | Is the QR image endpoint public or authenticated? | Resolved: Public GET `/api/v1/trace/{publicToken}/qr` returns 300x300 PNG directly |
| 13 | F-402 | Is the cultural-rules acknowledgement stored by the backend, or kept only in the UI? | Resolved: Required client acknowledgement checkbox before submit, included in request payload notes |
| 14 | F-1004 | What is the real USSD short code? (`*844#` in the backend report is a placeholder; real codes are assigned by the operator.) | Resolved: Configurable via `VITE_USSD_SHORT_CODE` (defaulting to `*844#`) |
| 15 | Deployment | Which origin will serve the app (HTTPS needed for the service worker) and is CORS configured for it? | Resolved: Development origin `http://localhost:5173` allowed by backend `SecurityConfig`; production uses HTTPS reverse proxy |
| 16 | F-1103 | PWAs cannot track GPS reliably in the background. Is a native wrapper out of scope, with SMS checkpoints as the fallback? | Resolved: Native wrapper out of MVP scope; foreground geolocation tracking with offline queue + SMS keywords fallback (`ARRIVED`, `LEFT`) |

## 11. Activity log

Add a row for every claim, completion and blocker. Newest at the bottom.

| Date | Agent | Task | Event | Note |
|---|---|---|---|---|
| 2026-10-18 | — | — | Plan created | 134 tasks across 18 phases |
| 2026-10-18 | @claude-agent | F-001 | Completed | Pre-implementation audit completed, decisions logged in ADR-004 |
| 2026-10-18 | @claude-agent | F-002 | Completed | Tooling baseline, Vitest, testing-library, strict TS, scripts, openapi-typescript verified |
| 2026-10-18 | @claude-agent | F-003 | Completed | Design tokens, Tailwind v4 import, Ethiopic/Amharic script support, dark/light themes, touch targets verified |
| 2026-10-18 | @claude-agent | F-004 | Completed | Generated OpenAPI types, typed schema helpers, api:check drift test verified |
| 2026-10-18 | @claude-agent | F-005 | Completed | Axios HTTP client, token injection, language header, 401/403/409/422/429 normalized, idempotency helper, retry safe |
| 2026-10-18 | @claude-agent | F-006 | Completed | TanStack Query client, hierarchical query keys, pagination, mobile-conscious stale times, cache invalidators verified |
| 2026-10-18 | @claude-agent | F-007 | Completed | MSW mock layer, typed handlers from OpenAPI, role fixtures, dev toggle, integration tests verified |
| 2026-10-18 | @claude-agent | F-008 | Completed | Docs skeleton docs/frontend.md created with complete architecture, routes matrix, conventions, run guide; FP0 completed |
| 2026-10-18 | @claude-agent | F-101 | Completed | Public, Auth, Dashboard layouts, 34 lazy chunks code-splitting, ErrorBoundary, 404 page verified |
| 2026-10-18 | @claude-agent | F-102 | Completed | Base accessible components (Button, Input, Select, Checkbox, Modal, Toast, Table, Card, Badge, StatusChip, Tabs, Skeleton, EmptyState, Pagination, FormField) verified with unit & axe audits |
| 2026-10-18 | @claude-agent | F-103 | Completed | Forms foundation (React Hook Form + Zod, Ethiopian phone normalization/validation, server 400/422 field-error mapping, double-submit protection) verified |
| 2026-10-18 | @claude-agent | F-104 | Completed | Formatting utilities (ETB currency, quantity pluralization, Africa/Addis_Ababa UTC+3 timezone date/time, decimal-safe helpers, status i18n keys) verified |
| 2026-10-18 | @claude-agent | F-105 | Completed | PWA manifest, standalone display, #047857 theme color, 192/512/maskable icons, prompt update mode verified |
| 2026-10-18 | @claude-agent | F-106 | Completed | Workbox runtime caching strategy (NetworkOnly on auth/payments/orders/delivery, StaleWhileRevalidate on public catalog/tourism/locales, /api fallback denylist) verified |
| 2026-10-18 | @claude-agent | F-108 | Completed | Offline UX (useNetworkStatus hook, OfflineBanner in Public/Auth/Dashboard layouts, NetworkButton disabled state with explanation, /offline fallback view) verified |
| 2026-10-18 | @claude-agent | F-201 | Completed | Single auth module (Zustand authStore, authService for login/me/register, role helpers, 401 broadcast return-path preservation) verified |
| 2026-10-18 | @claude-agent | F-202 | Completed | LoginPage (phone & password, 401 wrong password, 429 throttling timer, PENDING/SUSPENDED account toasts, role-based & redirect navigation) verified |
| 2026-10-18 | @claude-agent | F-203 | Completed | RegisterBuyerPage (phone, name, password, email, preferredLanguage, 409 duplicate phone inline error, immediate authentication) verified |

## 12. Change log (requirements)

| Date | Change | Tasks affected |
|---|---|---|
| 2026-10-18 | App is a PWA: installable, offline-capable public content, offline queues for safe actions | FP1, FP11, FP15 |
| 2026-10-18 | Frontend aligned to the completed backend (OpenAPI contract, idempotency keys, verified payments, multi-seller checkout groups, token tracking, consent-aware traceability) | All |
| 2026-10-18 | USSD is a backend integration; the frontend provides help content and a separate simulator tool only | F-1004, F-1707 |
| 2026-10-18 | Tourism pages follow the agreed list: packages with prices, hotels and resorts, essential information, transport, guides, booking, payment, testimonials, safety, contact | FP3, FP4 |
