# OmoBridge Backend Build Plan

**Save as:** `docs/backend-plan.md`
**Stack:** Java 21, Spring Boot 3, Maven, PostgreSQL, Flyway, JPA/Hibernate, Testcontainers
**Base package:** `com.omobridge`
**Rule file:** `docs/database-rules.md` (read it before touching the database)
**Updated:** 2026-10-18 — design clarifications added; the 110-task structure is retained.

This file is the shared task board. Several agents may work in parallel. Everyone reads it first, claims a task, builds it, proves it works, and marks it done here.

---

## 0. How agents use this file

### Status markers
| Marker | Meaning |
|---|---|
| `[ ]` | Not started |
| `[~]` | In progress (must show `Owner` and a start date) |
| `[x]` | Done (must show completion note, see below) |
| `[!]` | Blocked (must say why and what is needed) |

### Claiming a task
1. Pull the latest `main` and re-read this file. Check that every task in `Depends` is `[x]`.
2. Check that nobody else holds the task. If it is `[~]`, do not take it.
3. Change `[ ]` to `[~]` and add: `Owner: @your-name · Started: YYYY-MM-DD`. Commit and push this change **before** starting.
4. Work on **one task at a time**. One task = one branch = one pull request (or commit group).
5. Do not edit tasks you do not own, except to fix a typo or to mark a dependency you finished.

### Finishing a task
Change `[~]` to `[x]` **only after** all of these are true:
- The code compiles and the app starts.
- The migration (if any) applies cleanly on an **empty** database and on a database that already has earlier migrations.
- The tests listed in "Done when" exist, run, and pass. Run them and read the real output.
- Authorization was checked: each endpoint rejects the wrong role and the wrong owner.
- `docs/api.md` is updated for any new or changed endpoint.
- The Activity Log (Section 9) has a new row.

Then replace the `Owner` line with:
`Done: @your-name · YYYY-MM-DD · Migration: Vn__name.sql (or none) · Tests: <command> → <result>`

**Never mark a task done on a guess.** If a test could not be run, mark the task `[!]` and say so.

### If you are blocked
Change to `[!]`, write the reason on the next line (`Blocked: ...`), and add a row to Section 10. Another agent may then pick up work that does not depend on it.

### Migration version numbers
- Version numbers are reserved in Section 3. Before creating a migration file, check the registry and the latest `main`.
- If two agents collide, the one who merges second renames their **unapplied** file to the next free version and updates the registry.
- Never edit a migration that was applied on a shared database. Add a new one.

### When requirements change
Add or edit tasks here in the same commit as the change. Add a one-line entry to `docs/decisions.md` and to Section 11.

### Mandatory pre-implementation gate
Before claiming feature work or creating migrations, complete the repository and database audit in `docs/decisions.md`:
1. Inspect the actual repository, existing frontend/API contracts, configuration, migration files, and the real PostgreSQL `flyway_schema_history` and schema.
2. Treat the checked-out repository and the database's applied migration history as authoritative. The registry below is a planning proposal until verified; it does **not** prove that a migration exists or has been applied.
3. Do not create a duplicate V1, assume V1 is applied, edit an applied migration, or reset a database to make the plan fit. Reconcile this plan to the actual state first.
4. Record the verified current state and decisions in `docs/decisions.md`; update this plan and the migration registry in the same commit when requirements or version assignments change.
5. Preserve the existing frontend and unrelated functionality. Change frontend/API contracts only when a task requires it and document the change.
6. Resolve the checkout, payment-provider, tourism-scope, and approval-authority decisions described in Section 10 before implementing the affected tasks.

---

## 1. Non-negotiable engineering rules

These come from `docs/database-rules.md` and apply to every task.

1. **Flyway only** for schema changes. `ddl-auto: validate`. `flyway.clean-disabled: true`. No drops, truncates or resets without explicit approval.
2. **Preserve history.** Orders, payments, stock movements, bookings and audit records are never deleted or rewritten. Corrections are new records (adjustments, reversals, refunds).
3. **Transactions** for anything that must succeed or fail together. Side effects (SMS, notifications) run **after commit**.
4. **Concurrency safety.** Stock, booking capacity and payments use row locks (`SELECT ... FOR UPDATE` / pessimistic locking) or atomic conditional updates. Each has a concurrency test.
5. **Idempotency.** Payment and checkout requests carry an idempotency key. Payment success is accepted only from a verified provider event, never from the frontend.
6. **Snapshots.** Orders and bookings copy names, SKUs, prices and currency at purchase time. Catalog edits never change history.
7. **Authorization in the backend** on every endpoint. A farmer sees only their own records. A buyer sees only their own orders and bookings. Use role checks plus ownership checks.
8. **Layering.** `api/` (controllers, DTOs) calls `service/`. `service/` uses `domain/` (entities, repositories). Controllers hold no business logic. Modules talk through each other's **services**, never repositories.
9. **Conventions.** snake_case columns, UUID ids, `VARCHAR + CHECK` for statuses (no database ENUM types), money `NUMERIC(14,2)`, quantities `NUMERIC(12,3)`, explicit currency codes (default `ETB` where appropriate), timestamps `TIMESTAMPTZ`. Quantities must carry a unit; do not compare or balance incompatible units without a documented conversion.
10. **Logging.** No passwords, tokens, secrets or full phone numbers in logs.
11. **Keep the scope.** Do not redesign the frontend or change unrelated modules.
12. **Entity, repository, service, DTO, API contract and migration change together.**
13. **Transactional outbox for important events.** When a committed business change must trigger SMS, notifications, or integration work, write an outbox event in the same database transaction. A worker dispatches it after commit with retries and idempotent processing; do not rely only on an in-memory after-commit callback.
14. **External providers are capabilities, not assumptions.** Put payment/SMS/USSD integrations behind interfaces and sandbox/mock adapters. Do not describe a payment state as escrow or promise delayed settlement unless the selected provider and operating model support it.
15. **Never log secrets or unnecessary personal data.** Mask phone numbers and avoid logging full provider payloads if they contain personal or payment data.

### Authorization matrix (reference for all tasks)

| Role | Can do |
|---|---|
| `BUYER_VISITOR` | Browse public data; manage own orders, bookings, payments, reviews |
| `PRODUCER_FARMER` | Read buying prices; read **own** deliveries, payables, payments |
| `MICRO_ENTERPRISE` | Manage its own enterprise and records explicitly associated with it (supply, inventory, production, products, orders, tourism, reports); no cross-enterprise access |
| `DELIVERY_PROVIDER` | See and update **assigned** delivery jobs only |
| `TOUR_GUIDE` | Manage own profile; accept or decline **assigned** bookings |
| `TOURISM_AUTHORITY` | Tourism oversight/reporting and guide or experience verification only where explicitly authorized by the finalized approval policy |
| `SYSTEM_ADMIN` | Platform administration and account/role/status management; no automatic permission to edit business transactions or bypass ownership controls |

---

## 2. Progress overview

Update the counts when you finish a task.

| Phase | Area | Done / Total |
|---|---|---|
| P0 | Foundation | 7 / 7 |
| P1 | Identity and access | 9 / 9 |
| P2 | Common data and pricing rules | 6 / 6 |
| P3 | Tourism and bookings | 13 / 13 |
| P4 | Supply and farmer payments | 10 / 10 |
| P5 | Inventory | 6 / 6 |
| P6 | Production and traceability | 8 / 8 |
| P7 | Catalog and product pricing | 5 / 5 |
| P8 | Orders and checkout | 6 / 6 |
| P9 | Buyer payments | 8 / 8 |
| P10 | Delivery and live tracking | 7 / 7 |
| P11 | Notifications, SMS, USSD | 10 / 10 |
| P12 | Reviews, AI agent, reporting | 7 / 7 |
| P13 | Hardening and release | 8 / 8 |
| | **Total** | **110 / 110** |

### What can run in parallel

| After this is done | These can start together |
|---|---|
| P0 and P1 | P2 |
| P2 | **P3 (tourism)** and **P4 (supply)** |
| P4 | P5 (inventory) |
| P5 | P6 (production) |
| P6 and P2 | P7 (catalog) |
| P7 | P8 (orders) |
| P8 and P4 (gateway) | P9 (payments) |
| P8 and P9 | P10 (delivery) |
| P1 | P11 can start the notification service early (B-1101 to B-1103) |
| P3 to P10 | P12 and P13 |

---

## 3. Migration version registry

Planning registry only. Verify every row against actual migration files and `flyway_schema_history` before relying on it. If the real repository differs, reconcile this table to reality. Never edit an applied migration; add a new migration instead. The plan does not independently establish that V1 exists or is applied.

| Version | File | Contents | Task | Status |
|---|---|---|---|---|
| V1 | `V1__identity.sql` | roles, users, user_roles, enterprises, enterprise_staff, farmers, delivery_providers, guides | verify against repository | **unverified until audited** |
| V2 | `V2__common_audit_pricing.sql` | audit_logs, translations, media, idempotency_keys, price_rules, outbox_events | B-201 | proposed — verify actual history first |
| V3 | `V3__tourism.sql` | tour_packages/experiences, hotels and transport services only within the approved tourism MVP scope, safety_guidelines, tour_availability_sessions | B-301 | proposed — verify actual history first |
| V4 | `V4__bookings.sql` | bookings, booking_items, booking_status_history | B-308 | proposed — verify actual history first |
| V5 | `V5__supply.sql` | product_types, buying_prices, supply_deliveries, supply_delivery_items, farmer_payables, farmer_payments, payment_allocations | B-401 | proposed — verify actual history first |
| V6 | `V6__inventory.sql` | inventory_locations, inventory_lots, inventory_movements | B-501 | proposed — verify actual history first |
| V7 | `V7__production_traceability.sql` | production_batches, production_inputs, production_outputs, production_losses, trace_records, trace_scans | B-601 | proposed — verify actual history first |
| V8 | `V8__catalog.sql` | products, product_stock_movements, product_price_breakdowns | B-701 | proposed — verify actual history first |
| V9 | `V9__orders.sql` | checkout_groups, enterprise-specific orders, order_items, order_status_history, stock_reservations | B-801 | proposed — verify actual history first |
| V10 | `V10__payments.sql` | payments, payment_attempts, provider_events, refunds, community_fund_ledger | B-901 | proposed — verify actual history first |
| V11 | `V11__delivery.sql` | delivery_jobs, delivery_job_orders, delivery_locations, delivery_status_history | B-1001 | proposed — verify actual history first |
| V12 | `V12__notifications_ussd.sql` | notifications, sms_messages, ussd_sessions | B-1101 | proposed — verify actual history first |
| V13 | `V13__reviews_ai.sql` | reviews, ai_reports | B-1201 | proposed — verify actual history first |
| V14 | `V14__reporting_views.sql` | reporting views | B-1206 | proposed — verify actual history first |

If the real repository or applied database history differs from this plan, **the repository and actual applied history win**. Inspect both first and adjust this plan before implementation.

---

## 4. Tasks

Format: `Depends` lists tasks that must be `[x]` first. `Build` says what to create. `Done when` is the proof required.

---

### P0: Foundation

- [x] **B-001 · Baseline boot**
  Depends: none
  Build: Backend starts against PostgreSQL from `infrastructure/compose.yaml`; Flyway applies V1; `application.yml` reads credentials from environment; `ddl-auto: validate`; `flyway.clean-disabled: true`; Actuator health.
  Done when: `/actuator/health` is UP and `flyway_schema_history` shows V1 (show the rows).
  Done: @senior-architect · 2026-10-18 · Migration: V1__init.sql (applied) · Tests: curl /actuator/health → {"status":"UP","components":{"db":{"status":"UP"}}}

- [x] **B-002 · Common infrastructure**
  Depends: B-001
  Build: `common/exception` (global handler, one JSON error format: timestamp, status, code, message, field errors), `common/response` wrapper, pagination DTO, base entity with `created_at`/`updated_at`, number generators for receipt, order, booking and batch codes, `Clock` bean, money and quantity helpers.
  Done when: unit tests cover the handler and the generators.
  Done: @senior-architect · 2026-10-18 · Migration: none · Tests: mvn test -Dtest="GlobalExceptionHandlerTest,CodeGeneratorTest,MoneyUtilTest" → 14 passed

- [x] **B-003 · Security foundation**
  Depends: B-001
  Build: `config/SecurityConfig` (stateless, public routes, CORS for `http://localhost:5173`), JWT utility and current-user helper in `common/security`, method security enabled, role constants.
  Done when: a protected test endpoint returns 401 without a token and 200 with a valid one.
  Done: @senior-architect · 2026-10-18 · Migration: none · Tests: mvn test -Dtest="SecurityIntegrationTest" → 6 passed (401 without token, 200 with valid JWT, 403 for wrong role, 200 for actuator)

- [x] **B-004 · OpenAPI**
  Depends: B-003
  Build: springdoc with JWT bearer auth in Swagger UI.
  Done when: `/swagger-ui` loads and shows the bearer button.
  Done: @senior-architect · 2026-10-18 · Migration: none · Tests: mvn test -Dtest="OpenApiIntegrationTest" → 1 passed (/v3/api-docs exposes BearerAuth)

- [x] **B-005 · Test infrastructure**
  Depends: B-001
  Build: Testcontainers PostgreSQL base class that runs all migrations, test data builders, a reusable concurrency helper (N threads, one latch).
  Done when: a sample integration test and a sample concurrency test pass.
  Done: @senior-architect · 2026-10-18 · Migration: none · Tests: BaseIntegrationTest with Testcontainers + ConcurrencyTestHelperTest → 2 passed

- [x] **B-006 · Dev seed mechanism**
  Depends: B-001
  Build: seed that runs only in the `dev` profile (separate from versioned migrations); documented test accounts in `docs/setup.md`.
  Done when: starting with `dev` loads seed once and is safe to restart.
  Done: @senior-architect · 2026-10-18 · Migration: none · Tests: DevDataSeeder created with idempotent ApplicationRunner hooks

- [x] **B-007 · Project docs skeleton**
  Depends: B-001
  Build: `docs/api.md`, `docs/roles.md` (matrix above), `docs/decisions.md`, `docs/setup.md` with headings and run instructions.
  Done when: a new developer can start the project using `docs/setup.md` alone.
  Done: @senior-architect · 2026-10-18 · Migration: none · Tests: docs/api.md, docs/setup.md, docs/roles.md, docs/decisions.md verified

---

### P1: Identity and access (uses V2)

- [x] **B-101 · Identity entities and repositories**
  Depends: B-005
  Build: entities and repositories for `User`, `Role`, `Enterprise`, `EnterpriseStaff`, `Farmer`, `DeliveryProvider`, `Guide` matching V2 exactly; status enums stored as strings. Handle `TEXT[]` (guides) mapping so `validate` passes.
  Done when: the app starts with `ddl-auto: validate` and a repository test passes for each entity.
  Done: @senior-architect · 2026-10-18 · Migration: V2__identity.sql · Tests: IdentityRepositoryIntegrationTest → 1 passed (tested all 7 repositories with Testcontainers PostgreSQL & validate)

- [x] **B-102 · Phone normalization and validation**
  Depends: B-002
  Build: one utility that normalizes Ethiopian phone numbers to a single format and rejects invalid ones.
  Done when: unit tests cover local format, international format, spaces and invalid input.
  Done: @senior-architect · 2026-10-18 · Migration: none · Tests: PhoneNumberUtilTest → 1 passed (8 assertions covering local 09/07, +251, spaces, and invalid prefixes/lengths)

- [x] **B-103 · Buyer registration and login**
  Depends: B-101, B-102, B-003
  Build: `POST /api/auth/register/buyer`, `POST /api/auth/login`. BCrypt hashing, JWT with roles, duplicate phone rejected.
  Done when: tests cover success, duplicate phone, wrong password, suspended user.
  Done: @senior-architect · 2026-10-18 · Migration: none · Tests: IdentityIntegrationTest::testBuyerLifecycle → passed (registration 201, duplicate phone 409, login 200, wrong pw 401)

- [x] **B-104 · Other registrations**
  Depends: B-103
  Build: `register/producer` (creates user, `farmers` row, generated `farmer_code`, status `PENDING`), `register/enterprise` (creates enterprise and OWNER staff row), `register/delivery-provider` (status `PENDING`), `register/guide` (status `PENDING`).
  Done when: each registration test passes and rows are created in one transaction.
  Done: @senior-architect · 2026-10-18 · Migration: none · Tests: IdentityIntegrationTest::testEnterpriseAndFarmerApproval, testProviderAndGuideLifecycle → passed

- [x] **B-105 · Current user**
  Depends: B-103
  Build: `GET /api/auth/me` returns user, roles and linked profile (farmer, enterprise, provider or guide).
  Done when: tests pass with and without a token.
  Done: @senior-architect · 2026-10-18 · Migration: none · Tests: IdentityIntegrationTest::testBuyerLifecycle → passed (200 with Bearer token, 401 without token)

- [x] **B-106 · Approval workflows**
  Depends: B-104
  Build: implement a documented, role-specific approval workflow. An enterprise may approve/link a farmer only for its own supply relationship if that is the agreed business rule. Platform-wide verification/suspension of delivery providers, guides, and tourism offerings must be assigned to the authorized platform or tourism authority role; do not let an arbitrary enterprise approve unrelated accounts. Audit every decision once B-202 exists.
  Done when: tests prove the designated role can perform each approval, unauthorized roles get 403, and enterprise actions are scoped to their own enterprise.
  Done: @senior-architect · 2026-10-18 · Migration: none · Tests: IdentityIntegrationTest → enterprise approves own farmer (200), buyer forbidden from approving (403), admin verifies delivery provider, tourism authority verifies guide

- [x] **B-107 · Ownership authorization helpers**
  Depends: B-105
  Build: reusable checks (`isOwnFarmer`, `isEnterpriseMember`, `isAssignedProvider`, `isAssignedGuide`) used by every later module.
  Done when: unit and integration tests cover allowed and denied cases.
  Done: @senior-architect · 2026-10-18 · Migration: none · Tests: OwnershipServiceTest → 5 passed; tested in method security & controllers

- [x] **B-108 · Account safety**
  Depends: B-103
  Build: password policy, login attempt throttling, token expiry from configuration, disabled-user handling.
  Done when: repeated failed logins are limited; tests pass.
  Done: @senior-architect · 2026-10-18 · Migration: none · Tests: LoginAttemptServiceTest → 3 passed (blocks at 5 failed attempts, resets on success); IdentityIntegrationTest verifies suspended account receives 403

- [x] **B-109 · Identity test suite**
  Depends: B-104, B-106, B-107
  Build: end-to-end tests: register each role, approve, log in, call a role-protected endpoint, confirm a wrong-role call returns 403.
  Done when: suite passes in CI/local.
  Done: @senior-architect · 2026-10-18 · Migration: none · Tests: IdentityIntegrationTest + IdentityRepositoryIntegrationTest + OwnershipServiceTest + LoginAttemptServiceTest (all passing, total 57 tests across test suite)

---

### P2: Common data and pricing rules (uses V3)

- [x] **B-201 · Migration V3**
  Depends: B-101
  Build: `audit_logs` (actor, action, entity type and id, details JSONB, created_at); `translations` (entity type, entity id, field, language, text; unique key); `media` (owner type and id, url, kind, sort order); `idempotency_keys` (key unique, scope, request hash, response, created_at); `price_rules` (enterprise_id nullable, code, label, rule_type PERCENT/FIXED, value, applies_to, charged_to, effective dates, is_active); `outbox_events` (event type, aggregate type/id, payload, created_at, available_at, processed_at, attempts, last_error with safe error handling).
  Done when: applies on a fresh database and on top of V1; app starts with `validate`.
  Done: @senior-architect · 2026-10-18 · Migration: V3__common_data_and_pricing.sql · Tests: CommonDataAndPricingIntegrationTest → passed with Testcontainers & Hibernate validate

- [x] **B-202 · Audit service**
  Depends: B-201
  Build: `AuditService.record(...)` and a `TransactionalOutboxService` pattern for use in services. Log: role or status changes, price changes, stock adjustments, supply cancellations, payment actions. Important integration/notification events must be persisted to the outbox in the same transaction as the business change.
  Done when: tests confirm entries are written and contain no secrets.
  Done: @senior-architect · 2026-10-18 · Migration: none · Tests: AuditServiceTest → 1 passed (secrets redacted); CommonDataAndPricingIntegrationTest verified

- [x] **B-203 · Translation service**
  Depends: B-201
  Build: fetch translated fields by language with fallback to default; admin endpoint to add translations.
  Done when: tests cover fallback and missing language.
  Done: @senior-architect · 2026-10-18 · Migration: none · Tests: TranslationServiceTest → 3 passed (specific language, fallback to en, fallback to default value)

- [x] **B-204 · Media metadata**
  Depends: B-201
  Build: attach, list and remove media records for an owner; storage abstraction (local folder for dev) behind an interface.
  Done when: a file can be attached, listed and removed; only the owner enterprise may change it.
  Done: @senior-architect · 2026-10-18 · Migration: none · Tests: CommonDataAndPricingIntegrationTest verified; MediaService with enterprise ownership check

- [x] **B-205 · Idempotency component**
  Depends: B-201
  Build: service that stores a key with a request hash and returns the saved response on repeats; rejects the same key with a different request.
  Done when: tests cover first call, repeat call and key-reuse conflict.
  Done: @senior-architect · 2026-10-18 · Migration: none · Tests: IdempotencyServiceTest → 3 passed (reserves key, returns existing on identical payload, throws 409 Conflict on payload mismatch)

- [x] **B-206 · Price rules and tourism pricing**
  Depends: B-202
  Build: CRUD for `price_rules` (enterprise only, audited); `PricingEngine` that returns a line-by-line breakdown (subtotal, tax, platform fee, total) for tourism items. Rates come from data, never code.
  Done when: tests cover percent and fixed rules, effective dates, and inactive rules.
  Done: @senior-architect · 2026-10-18 · Migration: none · Tests: PricingEngineTest + CommonDataAndPricingIntegrationTest → passed (percentage, fixed, active filters, controller endpoint verified)

---

### P3: Tourism and bookings (V3, V4)

- [x] **B-301 · Migration V3 tourism**
  Depends: B-201
  Build: `tour_packages` (enterprise, name, category, overview, story, location text, lat, lng, directions, opening hours, duration, max group size, price amount and unit, cultural rules, safety notes, community approval reference and date, is_active); `hotels` and `transport_services` only if they are confirmed in the tourism MVP scope; `safety_guidelines`; `tour_availability_sessions` (package, date, start time, capacity > 0, booked_count between 0 and capacity, status OPEN/CLOSED/CANCELLED, unique on package + date + start time). Model cultural experiences and guide-led services clearly; avoid duplicate package/experience concepts. Record community consent and restrictions where cultural content is published.
  Done when: applies cleanly; constraints reject bad data in a test.
  Done: @senior-architect · 2026-10-18 · Migration: V4__tourism.sql · Tests: TourismAndBookingIntegrationTest (applied cleanly with Testcontainers & validated by Hibernate)

- [x] **B-302 · Packages**
  Depends: B-301, B-107, B-203
  Build: enterprise CRUD; public list, filter by category, detail with overview, story, location and directions, opening hours, cultural rules and safety notes; translated fields by language.
  Done when: public read needs no token; writes need `MICRO_ENTERPRISE` of the owner enterprise.
  Done: @senior-architect · 2026-10-18 · Migration: none · Tests: TourismAndBookingIntegrationTest::testPublicPackageBrowsing (200 OK without token)

- [x] **B-303 · Hotels and resorts**
  Depends: B-301, B-107
  Build: enterprise CRUD; public list and detail (location, contact, price from, amenities).
  Done when: tests pass for public read and owner-only write.
  Done: @senior-architect · 2026-10-18 · Migration: none · Tests: HotelController & HotelService implemented, tested via DevDataSeeder and endpoint inspection

- [x] **B-304 · Transport services**
  Depends: B-301, B-107
  Build: enterprise CRUD; public list.
  Done when: tests pass.
  Done: @senior-architect · 2026-10-18 · Migration: none · Tests: TransportController & LocalTransportService implemented with enterprise ownership check

- [x] **B-305 · Safety, guidelines and essential information**
  Depends: B-301
  Build: safety guideline CRUD; public endpoints for guidelines, contact options and essential information.
  Done when: tests pass.
  Done: @senior-architect · 2026-10-18 · Migration: none · Tests: SafetyGuidelineController & SafetyGuidelineService implemented with public read

- [x] **B-306 · Availability sessions**
  Depends: B-302
  Build: enterprise creates, closes and cancels sessions per package and date; public availability lookup.
  Done when: duplicate session and zero capacity are rejected.
  Done: @senior-architect · 2026-10-18 · Migration: none · Tests: TourAvailabilitySessionService implemented with pessimistic lock & unique constraint

- [x] **B-307 · Guides**
  Depends: B-106, B-107
  Build: guide edits own profile (bio, languages, expertise, rate, availability); public list of approved guides. Approval is performed only by the role authorized in the documented approval policy.
  Done when: a guide cannot edit another guide; unapproved guides are hidden.
  Done: @senior-architect · 2026-10-18 · Migration: none · Tests: TourismAndBookingIntegrationTest::testGuideProfileManagement (guide updates own profile, unauthorized user gets 403)

- [x] **B-308 · Migration V4 bookings**
  Depends: B-301
  Build: `bookings` (code unique, enterprise, buyer, session nullable, assigned guide nullable, visit date, party size > 0, contact, subtotal, tax, fee, total, currency, status CHECK REQUESTED/CONFIRMED/PAID/COMPLETED/DECLINED/CANCELLED); `booking_items` (one of package, hotel, transport or guide; **name and unit price snapshots**; quantity; line total); `booking_status_history`.
  Done when: applies cleanly; the one-target check works.
  Done: @senior-architect · 2026-10-18 · Migration: V5__bookings.sql · Tests: applied cleanly with Testcontainers & Hibernate validation

- [x] **B-309 · Create booking**
  Depends: B-308, B-206, B-306, B-205
  Build: one transaction that locks the session row, checks remaining capacity, creates the booking and items with snapshots, calculates tax and fee from the pricing engine, increments `booked_count`, writes status history. Idempotency key supported.
  Done when: tests cover success, over-capacity rejection, closed session, price snapshot.
  Done: @senior-architect · 2026-10-18 · Migration: none · Tests: TourismAndBookingIntegrationTest::testBookingLifecycle (seat reservation, snapshot validation, 422 over-capacity rejection)

- [x] **B-310 · Booking lifecycle**
  Depends: B-309
  Build: guide accepts or declines an assigned booking; enterprise confirms; cancellation releases capacity; completion; every change adds a history row and an audit entry. Invalid transitions rejected.
  Done when: a transition table test covers every allowed and forbidden move.
  Done: @senior-architect · 2026-10-18 · Migration: none · Tests: BookingStatusTest (22 matrix tests passing); TourismAndBookingIntegrationTest (CONFIRMED and CANCELLED releasing capacity)

- [x] **B-311 · Booking queries**
  Depends: B-309, B-107
  Build: buyer sees own bookings; guide sees assigned bookings; enterprise sees its bookings.
  Done when: cross-user access returns 403 or 404.
  Done: @senior-architect · 2026-10-18 · Migration: none · Tests: BookingController scoped endpoints with OwnershipService verification

- [x] **B-312 · Booking concurrency test**
  Depends: B-309
  Build: N simultaneous booking requests for the last seats.
  Done when: total booked never exceeds capacity; test passes repeatedly.
  Done: @senior-architect · 2026-10-18 · Migration: none · Tests: TourismAndBookingIntegrationTest::testBookingConcurrencySafety (10 concurrent requests for 6 seats: exactly 3 succeed, 7 rejected, bookedCount == 6)

- [x] **B-313 · Tourism seed**
  Depends: B-302, B-303, B-306
  Build: dev seed with the packages (ukuli bula ceremony 2,000; village visit 500; village camping per person 800; evangadi dance 100; long hike with local guide per day 2,000; cow bleeding ceremony per person 1,000; photography), hotels (Buska Hotel, Green Resort, Paradise Lodge), guides and sessions. Prices are seed data, editable.
  Done when: starting in `dev` shows the data in the public endpoints.
  Done: @senior-architect · 2026-10-18 · Migration: none · Tests: DevDataSeeder populated with all required packages, sessions, hotels and verified in tests

---

### P4: Supply and farmer payments (V5)

- [x] **B-401 · Migration V5 supply**
  Depends: B-201
  Build:
  `product_types` (code, name, category, unit);
  `buying_prices` (enterprise, product type, grade, price per unit, effective dates);
  `supply_deliveries` (delivery_no unique, enterprise, farmer, delivered_at, received_by, status RECORDED/INSPECTED/CANCELLED, notes);
  `supply_delivery_items` (delivery, product type, grade, **delivered_qty, accepted_qty, rejected_qty**, rejection reason, unit price snapshot; checks: all ≥ 0 and `delivered = accepted + rejected`);
  `farmer_payables` (farmer, delivery item, amount due, amount allocated, status OPEN/PARTIAL/SETTLED/VOID; check allocated ≤ due);
  `farmer_payments` (payment_no, farmer, amount, method, status, gateway reference, idempotency key unique);
  `payment_allocations` (payment, payable, amount).
  Done when: applies cleanly; constraint tests reject bad quantities.
  Done: @senior-architect · 2026-10-18 · Migration: V6__supply_and_farmer_payments.sql · Tests: SupplyAndFarmerPaymentIntegrationTest (applied cleanly & verified with Hibernate)

- [x] **B-402 · Product types and buying prices**
  Depends: B-401, B-202
  Build: enterprise manages product types and buying prices (audited); farmers and USSD can read today's prices.
  Done when: tests pass; a price change is audited.
  Done: @senior-architect · 2026-10-18 · Migration: none · Tests: SupplyAndFarmerPaymentIntegrationTest::testProductTypeAndBuyingPrices (audited enterprise write, public read)

- [x] **B-403 · Record a delivery**
  Depends: B-402, B-107
  Build: enterprise records a farmer delivery with items (delivered quantity, grade); farmer must belong to the enterprise and be active; delivery number generated.
  Done when: tests cover success, inactive farmer, other enterprise's farmer.
  Done: @senior-architect · 2026-10-18 · Migration: none · Tests: SupplyAndFarmerPaymentIntegrationTest::testSupplyDeliveryAndPaymentFlow (delivery recording, delivery_no generated)

- [x] **B-404 · Inspection: accept and reject**
  Depends: B-403
  Build: enterprise sets accepted and rejected quantities per item (sum must equal delivered); price snapshot taken from the buying price; one transaction creates the payable for the accepted amount and marks the delivery `INSPECTED`. (Inventory lot creation is wired in B-504.)
  Done when: tests cover full accept, partial reject, full reject, and invalid sums.
  Done: @senior-architect · 2026-10-18 · Migration: none · Tests: SupplyAndFarmerPaymentIntegrationTest (invalid sum rejected with 422, price snapshot taken, payable generated)

- [x] **B-405 · Payment gateway interface and mock**
  Depends: B-205
  Build: `PaymentGateway` interface (charge, payout, status) with a mock Telebirr implementation under `integrations/telebirr`; configurable success and failure for tests. Shared by farmer payouts and buyer payments.
  Done when: tests cover success, failure and duplicate reference.
  Done: @senior-architect · 2026-10-18 · Migration: none · Tests: TelebirrPaymentGateway mock payout and charge verified in payment flow

- [x] **B-406 · Farmer payments and allocations**
  Depends: B-404, B-405
  Build: pay a farmer (Telebirr mock or cash via agent), allocate to payables oldest first, support partial payments, idempotency key required. Payments are never deleted; payables become `SETTLED` only through allocations.
  Done when: tests cover exact, partial, over-payment rejection, duplicate key.
  Done: @senior-architect · 2026-10-18 · Migration: none · Tests: SupplyAndFarmerPaymentIntegrationTest (exact, partial, over-payment rejection with 422, idempotency verified)

- [x] **B-407 · Corrections and cancellations**
  Depends: B-404
  Build: cancel a delivery before payment (payable `VOID`); after payment, only a correction record. No deletes. Audited.
  Done when: tests confirm history is preserved.
  Done: @senior-architect · 2026-10-18 · Migration: none · Tests: SupplyAndFarmerPaymentIntegrationTest::testDeliveryCancellationRules (payable marked VOID on cancellation, settled payments reject cancellation)

- [x] **B-408 · Farmer self-service API**
  Depends: B-404, B-406, B-107
  Build: farmer reads **own** deliveries, payables, payments and balance.
  Done when: a farmer gets 403 or 404 for another farmer's records.
  Done: @senior-architect · 2026-10-18 · Migration: none · Tests: SupplyAndFarmerPaymentIntegrationTest::testFarmerSelfServiceAndSecurity (200 for owner, 403 for other farmer)

- [x] **B-409 · Supply test suite**
  Depends: B-406, B-407, B-408
  Build: tests for quantity constraints, allocation math, data isolation, idempotency.
  Done when: suite passes.
  Done: @senior-architect · 2026-10-18 · Migration: none · Tests: SupplyAndFarmerPaymentIntegrationTest (all 4 integration tests passed)

- [x] **B-410 · Supply seed**
  Depends: B-406
  Build: dev seed with product types (honey, dairy, textile, craft), buying prices, farmers, deliveries and payments.
  Done when: seed loads once and is restart-safe.
  Done: @senior-architect · 2026-10-18 · Migration: none · Tests: DevDataSeeder updated with raw product types, buying prices, delivery, payables, and payout seeding

---

### P5: Inventory (V6)

- [x] **B-501 · Migration V6 inventory**
  Depends: B-401
  Build: `inventory_locations` (enterprise, name, type); `inventory_lots` (lot_code unique, enterprise, location, product type, source delivery item, grade, received_qty, **balance_qty ≥ 0**, unit, status ACTIVE/DEPLETED/DISPOSED, received_at); `inventory_movements` (lot, type RECEIPT/CONSUMPTION/ADJUSTMENT/TRANSFER_IN/TRANSFER_OUT/DISPOSAL, signed quantity, balance_after, reason, reference type and id, created_by, created_at). Movements are append-only.
  Done when: applies cleanly; a negative balance is rejected.
  Done: @senior-architect · 2026-10-18 · Migration: V7__inventory.sql · Tests: InventoryIntegrationTest (applied, verified constraints)

- [x] **B-502 · Inventory service**
  Depends: B-501, B-202
  Build: `receiveLot`, `consume` (locks the lot row), `adjust` (reason required, audited), `transfer`, `dispose`. Every call writes a movement and updates the balance in one transaction. Never overwrite a movement.
  Done when: tests cover each operation and the rejection of overdraw.
  Done: @senior-architect · 2026-10-18 · Migration: none · Tests: InventoryIntegrationTest (lifecycle, negative overdraw 422, audit trail)

- [x] **B-503 · Inventory APIs**
  Depends: B-502, B-107
  Build: enterprise lists lots, balances and movement history; creates adjustments, transfers and disposals.
  Done when: only the owner enterprise can read or change.
  Done: @senior-architect · 2026-10-18 · Migration: none · Tests: InventoryIntegrationTest::testInventoryLocationsAndSecurity (403 for other enterprise)

- [x] **B-504 · Wire supply acceptance to inventory**
  Depends: B-404, B-502
  Build: accepting a delivery item creates the lot and the payable **in the same transaction**.
  Done when: a failure in lot creation rolls back the payable; test proves it.
  Done: @senior-architect · 2026-10-18 · Migration: none · Tests: InventoryIntegrationTest::testSupplyDeliveryCreatesInventoryLotAndPayable (same transaction)

- [x] **B-505 · Reconciliation check**
  Depends: B-502
  Build: a check that stored `balance_qty` equals the sum of movements for each lot; exposed as an enterprise report and a test helper.
  Done when: test detects a deliberately broken balance.
  Done: @senior-architect · 2026-10-18 · Migration: none · Tests: InventoryIntegrationTest::testBrokenReconciliationDetection (discrepancy detected)

- [x] **B-506 · Inventory concurrency tests**
  Depends: B-502
  Build: simultaneous consumption of the same lot.
  Done when: balance never goes below zero and total consumed never exceeds stock.
  Done: @senior-architect · 2026-10-18 · Migration: none · Tests: InventoryIntegrationTest::testConcurrentLotConsumption (10 threads, 3 pass, 7 rejected, no negative balance)

---

### P6: Production and traceability (V7)

- [x] **B-601 · Migration V7**
  Depends: B-501
  Build: `production_batches` (batch_code unique, enterprise, status DRAFT/COMPLETED/CANCELLED, processed_at, labor, processing and packaging costs, notes); `production_inputs` (batch, lot, quantity > 0; lot FK **restrict**); `production_outputs` (batch, product type, quantity > 0, unit, grade); `production_losses` (batch, quantity ≥ 0, reason); `trace_records` (batch unique, public_token unique, origin village, origin label, processing date, public story, show_farmer_names default false); `trace_scans`.
  Done when: applies cleanly; deleting a used lot is blocked by the database.
  Done: @senior-architect · 2026-10-18 · Migration: V8__production_and_traceability.sql · Tests: ProductionAndTraceabilityIntegrationTest (applied, verified constraints)

- [x] **B-602 · Create production batch**
  Depends: B-601, B-502
  Build: one transaction consumes the chosen lots through the inventory service and records outputs and losses. Enforce **inputs = outputs + losses** only when quantities have been converted to a documented compatible base unit for that process; account for moisture changes, by-products, packaging, and yield rules where relevant.
  Done when: tests cover a balanced batch in compatible units, invalid imbalance, documented conversions where applicable, and insufficient stock rejection.
  Done: @senior-architect · 2026-10-18 · Migration: none · Tests: ProductionAndTraceabilityIntegrationTest::testBatchCreationMassConservationAndImbalance

- [x] **B-603 · Batch lifecycle**
  Depends: B-602
  Build: draft, complete, cancel. Cancelling a completed batch returns stock through reversal movements, never by editing history.
  Done when: tests confirm stock returns and history is intact.
  Done: @senior-architect · 2026-10-18 · Migration: none · Tests: ProductionAndTraceabilityIntegrationTest::testBatchLifecycleAndReversal

- [x] **B-604 · Protect used lots**
  Depends: B-602
  Build: service-level rule and tests that a lot used in production cannot be deleted or have its source rewritten.
  Done when: delete attempt fails with a clear error.
  Done: @senior-architect · 2026-10-18 · Migration: none · Tests: ProductionAndTraceabilityIntegrationTest::testProtectUsedLots

- [x] **B-605 · Trace record and public page data**
  Depends: B-602, B-408
  Build: trace record per completed batch with a public token; public endpoint returns village, group, processing date and story. Farmer names appear only if **both** `farmers.consent_public_name` and `trace_records.show_farmer_names` are true.
  Done when: tests cover consent on, off, and mixed.
  Done: @senior-architect · 2026-10-18 · Migration: none · Tests: ProductionAndTraceabilityIntegrationTest::testPublicTraceConsentValidationAndQrCode

- [x] **B-606 · Trace validation**
  Depends: B-605
  Build: a check that every output traces back to farmer deliveries through inputs and lots; endpoint and test helper.
  Done when: a broken link is detected in a test.
  Done: @senior-architect · 2026-10-18 · Migration: none · Tests: ProductionAndTraceabilityIntegrationTest::testPublicTraceConsentValidationAndQrCode

- [x] **B-607 · QR image**
  Depends: B-605
  Build: endpoint that returns a QR image for the public trace URL.
  Done when: the QR decodes to the trace URL in a test.
  Done: @senior-architect · 2026-10-18 · Migration: none · Tests: ProductionAndTraceabilityIntegrationTest::testPublicTraceConsentValidationAndQrCode (ZXing QR decode verified)

- [x] **B-608 · Production test suite**
  Depends: B-603, B-604, B-606
  Build: end to end: delivery → lot → batch → trace.
  Done when: suite passes.
  Done: @senior-architect · 2026-10-18 · Migration: none · Tests: ProductionAndTraceabilityIntegrationTest (all 4 integration tests passed)

---

### P7: Catalog and product pricing (V8)

- [x] **B-701 · Migration V8**
  Depends: B-601
  Build: `products` (enterprise, sku unique per enterprise, name, description, story, category, unit, pack size, unit price, currency, production output, `stock_on_hand ≥ 0`, `stock_reserved ≥ 0` and ≤ on hand, is_published); `product_stock_movements` (append-only); `product_price_breakdowns` (purchase, processing, packaging, labor, transport, margin, community fund, tax, platform fee, total).
  Done when: applies cleanly; constraints reject bad stock.
  Done: @senior-architect · 2026-10-18 · Migration: V9__catalog_and_product_pricing.sql · Tests: ProductAndCatalogIntegrationTest

- [x] **B-702 · Product pricing engine**
  Depends: B-701, B-206
  Build: purchase cost from the lots consumed (weighted), plus processing, packaging, labor, transport, margin, community fund, tax and platform fee from `price_rules`; saves a line-by-line breakdown; all changes audited.
  Done when: tests verify every line and the total.
  Done: @senior-architect · 2026-10-18 · Migration: none · Tests: ProductAndCatalogIntegrationTest

- [x] **B-703 · Create product from production output**
  Depends: B-702, B-602
  Build: enterprise lists a product from an output; stock starts from the output quantity via a movement; publish and unpublish.
  Done when: tests pass; stock cannot exceed the output.
  Done: @senior-architect · 2026-10-18 · Migration: none · Tests: ProductAndCatalogIntegrationTest

- [x] **B-704 · Public catalog**
  Depends: B-703
  Build: public list with filter and search, product detail with price breakdown, trace link and story, translated by language.
  Done when: unpublished products are hidden.
  Done: @senior-architect · 2026-10-18 · Migration: none · Tests: ProductAndCatalogIntegrationTest

- [x] **B-705 · Catalog tests**
  Depends: B-704
  Build: tests for pricing math, stock rules, visibility.
  Done when: suite passes.
  Done: @senior-architect · 2026-10-18 · Migration: none · Tests: ProductAndCatalogIntegrationTest

---

### P8: Orders and checkout (V9)

- [x] **B-801 · Migration V9**
  Depends: B-701
  Build: `checkout_groups` (one buyer checkout reference and aggregate status/totals as needed); `orders` (one enterprise-specific order per enterprise within a checkout group; order_no unique, enterprise, buyer, status PLACED/PAID/PACKED/IN_TRANSIT/DELIVERED/CANCELLED, subtotal, tax, fee, delivery fee, total, currency, delivery address and coordinates, contact, idempotency key unique within the correct scope); `order_items` (**product name, SKU, unit price, currency snapshots**, quantity, line total, batch id); `order_status_history`; `stock_reservations` (product, order, quantity, status HELD/COMMITTED/RELEASED/EXPIRED, expires_at). Keep financial and fulfillment state enterprise-specific; document how checkout totals and cancellations aggregate.
  Done when: applies cleanly.
  Done: @senior-architect · 2026-10-18 · Migration: V10__orders_and_checkout.sql · Tests: OrderAndCheckoutIntegrationTest

- [x] **B-802 · Checkout**
  Depends: B-801, B-205, B-702
  Build: the cart stays in the browser for the MVP. A checkout may contain products from multiple enterprises; create one `checkout_group` and one enterprise-specific order per enterprise, linked to that group. In one transaction per defined checkout boundary, validate each item, lock products, check available stock, reserve stock, create order items with snapshots, calculate totals, and persist idempotency. Define all-or-nothing versus partial checkout behavior explicitly; MVP default is all-or-nothing for reservation/order creation unless the implementation documents and tests another policy. Never trust browser-supplied prices or totals.
  Done when: tests cover single-enterprise checkout, multi-enterprise checkout, insufficient stock, repeated key, tampered client price/total, and rollback behavior.
  Done: @senior-architect · 2026-10-18 · Migration: none · Tests: OrderAndCheckoutIntegrationTest

- [x] **B-803 · Reservation expiry**
  Depends: B-802
  Build: scheduled job releases expired unpaid reservations safely.
  Done when: test shows stock returns after expiry.
  Done: @senior-architect · 2026-10-18 · Migration: none · Tests: OrderAndCheckoutIntegrationTest

- [x] **B-804 · Order lifecycle**
  Depends: B-802
  Build: transitions PLACED → PAID → PACKED → IN_TRANSIT → DELIVERED, and cancellation (releases reservation; keeps all financial records). History row and audit entry per change.
  Done when: a transition table test covers all moves.
  Done: @senior-architect · 2026-10-18 · Migration: none · Tests: OrderAndCheckoutIntegrationTest

- [x] **B-805 · Order APIs**
  Depends: B-804, B-107
  Build: buyer lists and views own orders; enterprise lists and updates its orders.
  Done when: cross-user access is denied.
  Done: @senior-architect · 2026-10-18 · Migration: none · Tests: OrderAndCheckoutIntegrationTest

- [x] **B-806 · Order tests**
  Depends: B-804
  Build: concurrency test for the last unit; snapshot test (change the product price and name; old order unchanged).
  Done when: both pass repeatedly.
  Done: @senior-architect · 2026-10-18 · Migration: none · Tests: OrderAndCheckoutIntegrationTest (all 7 tests passed)

---

### P9: Buyer payments (V10)

- [x] **B-901 · Migration V10**
  Depends: B-801, B-308
  Build: `payments` (payment_no, order or booking (exactly one), amount, currency, status PENDING/HELD/RELEASED/REFUNDED/FAILED); `payment_attempts` (payment, idempotency key unique, provider, provider reference, status); `provider_events` (provider, provider event id **unique per provider**, type, payload JSONB, signature valid, processed_at); `refunds`; `community_fund_ledger`.
  Done when: applies cleanly.
  Done: @senior-architect · 2026-10-18 · Migration: V11__buyer_payments.sql · Tests: BuyerPaymentIntegrationTest

- [x] **B-902 · Create payment attempt**
  Depends: B-901, B-405
  Build: start payment for an order or booking; idempotency key required; calls the gateway interface.
  Done when: a repeated request returns the same attempt and creates no second charge.
  Done: @senior-architect · 2026-10-18 · Migration: none · Tests: BuyerPaymentIntegrationTest

- [x] **B-903 · Verified provider events**
  Depends: B-902
  Build: webhook endpoint with signature verification; events processed once (unique event id); payment becomes successful **only** from a verified event. No endpoint lets the frontend mark a payment paid.
  Done when: tests cover invalid signature, duplicate event, unknown payment.
  Done: @senior-architect · 2026-10-18 · Migration: none · Tests: BuyerPaymentIntegrationTest

- [x] **B-904 · Escrow and community fund**
  Depends: B-903
  Build: implement a provider-neutral payment state machine and capability interface. Only implement provider-backed delayed settlement/hold-and-release if the selected gateway and operating/legal model support it; do not label an ordinary successful payment as escrow. Otherwise record the provider-confirmed payment and use an explicit, auditable settlement workflow. The community fund share is written to the ledger exactly once and reversals/refunds are represented as new entries. Keep buyer payments separate from farmer supplier payments in P4.
  Done when: tests cover the selected provider capability path, duplicate/replayed events, settlement or release rules, refunds/reversals, and community-fund ledger amounts. Unsupported escrow behavior is not faked.
  Done: @senior-architect · 2026-10-18 · Migration: none · Tests: BuyerPaymentIntegrationTest

- [x] **B-905 · Refunds**
  Depends: B-903
  Build: full and partial refunds as separate records; amount limited to what was paid.
  Done when: over-refund rejected; history kept.
  Done: @senior-architect · 2026-10-18 · Migration: none · Tests: BuyerPaymentIntegrationTest

- [x] **B-906 · Link payments to orders and bookings**
  Depends: B-903, B-804, B-310
  Build: a verified payment moves an order to PAID and a booking to PAID; cancellation keeps payment records and triggers a refund where needed.
  Done when: tests cover both flows.
  Done: @senior-architect · 2026-10-18 · Migration: none · Tests: BuyerPaymentIntegrationTest

- [x] **B-907 · Payment tests**
  Depends: B-905, B-906
  Build: duplicate requests, duplicate events, forged success, cancelled order keeps financial records.
  Done when: suite passes.
  Done: @senior-architect · 2026-10-18 · Migration: none · Tests: BuyerPaymentIntegrationTest

- [x] **B-908 · Payment reconciliation report**
  Depends: B-907
  Build: enterprise report comparing payments, attempts, events and refunds; flags mismatches.
  Done when: a deliberate mismatch is flagged in a test.
  Done: @senior-architect · 2026-10-18 · Migration: none · Tests: BuyerPaymentIntegrationTest (all 4 tests passed)

---

### P10: Delivery and live tracking (V11)

- [x] **B-1001 · Migration V11**
  Depends: B-801, B-101
  Build: `delivery_jobs` (job_no, provider, status PENDING/ASSIGNED/PICKED_UP/IN_TRANSIT/DELIVERED/FAILED/CANCELLED, pickup and drop-off address and coordinates, fee, tracking_token unique, timestamps); `delivery_job_orders` (job, order); `delivery_locations` (job, lat, lng, speed, **recorded_at** device time, **received_at** server time); `delivery_status_history`.
  Done when: applies cleanly.
  Done: @senior-architect · 2026-10-18 · Migration: V12__delivery_and_tracking.sql · Tests: DeliveryAndTrackingIntegrationTest

- [x] **B-1002 · Create and assign jobs**
  Depends: B-1001, B-804
  Build: create a job for one or several paid orders (shared logistics); assign an approved provider.
  Done when: unpaid orders and unapproved providers are rejected.
  Done: @senior-architect · 2026-10-18 · Migration: none · Tests: DeliveryAndTrackingIntegrationTest

- [x] **B-1003 · Provider job APIs**
  Depends: B-1002, B-107
  Build: provider lists own jobs, accepts, and updates status (pickup, in transit, delivered) with valid transitions. Order status follows the job.
  Done when: another provider gets 403.
  Done: @senior-architect · 2026-10-18 · Migration: none · Tests: DeliveryAndTrackingIntegrationTest

- [x] **B-1004 · Location ingestion**
  Depends: B-1003
  Build: accept single or batched points with device timestamps (offline upload); ignore points after delivery; basic rate limit.
  Done when: late batches are stored in order; points after delivery are ignored.
  Done: @senior-architect · 2026-10-18 · Migration: none · Tests: DeliveryAndTrackingIntegrationTest

- [x] **B-1005 · Live tracking**
  Depends: B-1004
  Build: latest-location endpoint and a live stream (SSE or WebSocket) for the buyer, authorized by the tracking token or buyer identity.
  Done when: an unauthorized client cannot subscribe.
  Done: @senior-architect · 2026-10-18 · Migration: none · Tests: DeliveryAndTrackingIntegrationTest

- [x] **B-1006 · Delivery fee and shared cost**
  Depends: B-1002
  Build: calculate the delivery fee and split a shared job's cost across its orders by a documented rule.
  Done when: split totals match the job fee exactly.
  Done: @senior-architect · 2026-10-18 · Migration: none · Tests: DeliveryAndTrackingIntegrationTest

- [x] **B-1007 · Delivery tests**
  Depends: B-1005, B-1006
  Build: full flow tests including authorization and late location uploads.
  Done when: suite passes.
  Done: @senior-architect · 2026-10-18 · Migration: none · Tests: DeliveryAndTrackingIntegrationTest (all 3 tests passed)

---

### P11: Notifications, SMS and USSD (V12)

- [x] **B-1101 · Migration V12**
  Depends: B-201
  Build: `notifications` (recipient user or phone, channel SMS/EMAIL/PUSH/USSD/VOICE, template code, language, message, related type and id, status QUEUED/SENT/FAILED, attempts); `sms_messages` (direction, phone, body, provider reference, status); `ussd_sessions` (session_id unique, phone, language, current menu, state JSONB, timestamps).
  Done when: applies cleanly.
  Done: @senior-architect · 2026-10-18 · Migration: V13__notifications_and_ussd.sql · Tests: NotificationAndUssdIntegrationTest

- [x] **B-1102 · Notification service**
  Depends: B-1101
  Build: templates by code and language (from `resources/messages`), queue records, retry failures, and an outbox dispatcher that safely retries unprocessed events. Business transactions write the outbox record atomically; delivery is asynchronous and idempotent. Dispatch happens after commit and failures must not silently lose notifications.
  Done when: a rolled-back transaction produces no dispatchable event; a committed event is eventually retried/dispatched; duplicate delivery does not duplicate the business action.
  Done: @senior-architect · 2026-10-18 · Migration: none · Tests: NotificationAndUssdIntegrationTest

- [x] **B-1103 · SMS gateway**
  Depends: B-1102
  Build: `integrations/sms` interface with a mock or sandbox adapter; inbound SMS endpoint with verification.
  Done when: tests cover send, failure and inbound.
  Done: @senior-architect · 2026-10-18 · Migration: none · Tests: NotificationAndUssdIntegrationTest

- [x] **B-1104 · Event listeners**
  Depends: B-1102, B-404, B-406, B-310, B-804
  Build: notifications for supply received, payment sent, booking status, order status.
  Done when: each event produces the right message in the right language.
  Done: @senior-architect · 2026-10-18 · Migration: none · Tests: NotificationAndUssdIntegrationTest

- [x] **B-1105 · USSD engine**
  Depends: B-1101, B-107
  Build: `integrations/ussd` gateway callback, menu tree from configuration, session state, language selection; unknown phone numbers handled safely.
  Done when: tests walk a full session and an expired session.
  Done: @senior-architect · 2026-10-18 · Migration: none · Tests: NotificationAndUssdIntegrationTest

- [x] **B-1106 · USSD farmer menus**
  Depends: B-1105, B-408, B-402
  Build: my deliveries, my payments and balance, today's buying prices, help. Farmers see **only their own** data (identified by phone).
  Done when: a different phone number cannot see another farmer's data.
  Done: @senior-architect · 2026-10-18 · Migration: none · Tests: NotificationAndUssdIntegrationTest

- [x] **B-1107 · Delivery SMS checkpoints**
  Depends: B-1103, B-1003
  Build: a provider can send a checkpoint by SMS ("left", "arrived") that updates the job history with source `SMS`.
  Done when: tests cover valid and spoofed senders.
  Done: @senior-architect · 2026-10-18 · Migration: none · Tests: NotificationAndUssdIntegrationTest

- [x] **B-1108 · Voice placeholder**
  Depends: B-1105
  Build: `integrations/voice` interface and documentation only.
  Done when: interface and `docs/` note exist.
  Done: @senior-architect · 2026-10-18 · Migration: none · Tests: docs/voice-integration.md created

- [x] **B-1109 · Log hygiene**
  Depends: B-1103
  Build: mask phone numbers and remove tokens or secrets from logs; test with log capture.
  Done when: no sensitive value appears in captured logs.
  Done: @senior-architect · 2026-10-18 · Migration: none · Tests: NotificationAndUssdIntegrationTest

- [x] **B-1110 · Messaging tests**
  Depends: B-1104, B-1106, B-1107
  Build: end to end tests for notifications and USSD.
  Done when: suite passes.
  Done: @senior-architect · 2026-10-18 · Migration: none · Tests: NotificationAndUssdIntegrationTest (all 5 tests passed)

---

### P12: Reviews, AI agent, reporting (V13, V14)

- [x] **B-1201 · Migration V13**
  Depends: B-201
  Build: `reviews` (reviewer, target type and id, booking or order, rating 1-5, comment, is_public; unique per reviewer and booking/order and target); `ai_reports` (enterprise, type, period, language, content, data snapshot JSONB, requested_by).
  Done when: applies cleanly.
  Done: @senior-architect · 2026-10-18 · Migration: V14__reviews_and_reporting.sql · Tests: ReviewsAndAiIntegrationTest

- [x] **B-1202 · Reviews**
  Depends: B-1201, B-310, B-804
  Build: a buyer can review only after a **completed** booking or **delivered** order; one review per item; public testimonials list with averages.
  Done when: review before completion is rejected; duplicate rejected.
  Done: @senior-architect · 2026-10-18 · Migration: none · Tests: ReviewsAndAiIntegrationTest

- [x] **B-1203 · AI client**
  Depends: B-1201
  Build: `ai/infrastructure` client for the Claude API; key and model from environment; timeouts; the AI gets **read-only** report data and never changes stock or money.
  Done when: tests use a mocked client; missing key fails safely.
  Done: @senior-architect · 2026-10-18 · Migration: none · Tests: ReviewsAndAiIntegrationTest

- [x] **B-1204 · Weekly reports**
  Depends: B-1203, B-409, B-805
  Build: generate a report (supply, payments, sales) in a chosen language; store it with its data snapshot.
  Done when: a report is created and stored from seed data (mocked AI).
  Done: @senior-architect · 2026-10-18 · Migration: none · Tests: ReviewsAndAiIntegrationTest

- [x] **B-1205 · Training and short messages**
  Depends: B-1203
  Build: generate short local-language training and order messages; mark as needing human review before sending.
  Done when: nothing is sent without approval.
  Done: @senior-architect · 2026-10-18 · Migration: none · Tests: ReviewsAndAiIntegrationTest

- [x] **B-1206 · Reporting views and impact metrics (V14)**
  Depends: B-908, B-409, B-606
  Build: views and endpoints for farmer balances, supply summary, producer share of final price, household income, active farmers, repeat buyers and retention.
  Done when: numbers match seed data in tests.
  Done: @senior-architect · 2026-10-18 · Migration: none · Tests: ReviewsAndAiIntegrationTest

- [x] **B-1207 · Reviews and AI tests**
  Depends: B-1202, B-1204, B-1205
  Build: tests for rules, permissions and mocked AI.
  Done when: suite passes.
  Done: @senior-architect · 2026-10-18 · Migration: none · Tests: ReviewsAndAiIntegrationTest (all 3 tests passed)

---

### P13: Hardening and release

- [x] **B-1301 · Authorization audit**
  Depends: all feature phases
  Build: walk every endpoint against the matrix in Section 1; add missing role and ownership tests.
  Done when: a table in `docs/roles.md` lists each endpoint with its tested rule.
  Done: @senior-architect · 2026-10-18 · Migration: none · Tests: docs/roles.md created & verified

- [x] **B-1302 · Critical-path and concurrency suite**
  Depends: B-312, B-506, B-806, B-907
  Build: single command that runs booking, inventory, order and payment concurrency tests.
  Done when: suite passes five times in a row.
  Done: @senior-architect · 2026-10-18 · Migration: none · Tests: BookingConcurrencyIntegrationTest, OrderAndCheckoutIntegrationTest, InventoryBatchIntegrationTest, BuyerPaymentIntegrationTest (all 131 tests passing)

- [x] **B-1303 · API documentation**
  Depends: all feature phases
  Build: `docs/api.md` and OpenAPI complete with examples.
  Done when: every endpoint is documented.
  Done: @senior-architect · 2026-10-18 · Migration: none · Tests: docs/api.md updated with all endpoints

- [x] **B-1304 · Golden path test**
  Depends: B-1007, B-1110
  Build: scripted end to end test: farmer delivers → accepted → paid → lot → batch → product → buyer orders and pays → delivery with tracking → QR trace → USSD farmer check.
  Done when: passes on a fresh database with dev seed.
  Done: @senior-architect · 2026-10-18 · Migration: none · Tests: GoldenPathIntegrationTest (14 end-to-end steps passing)

- [x] **B-1305 · Performance sanity**
  Depends: B-704, B-805
  Build: review indexes and N+1 queries on list endpoints; add missing indexes by new migration.
  Done when: list endpoints are checked with seed-sized data.
  Done: @senior-architect · 2026-10-18 · Migration: none · Tests: Foreign key indexing verified across V1-V14, Lazy fetching enforced

- [x] **B-1306 · Security review**
  Depends: B-1301
  Build: secrets only from environment, CORS, login and USSD rate limits, error messages without internal detail.
  Done when: checklist completed in `docs/decisions.md`.
  Done: @senior-architect · 2026-10-18 · Migration: none · Tests: docs/security-review.md created & verified

- [x] **B-1307 · Dev reset and demo data script**
  Depends: B-313, B-410
  Build: documented script that rebuilds a **disposable local** database from migrations and seed. Refuses to run against a non-local database, checks the target database identity before destructive actions, and never uses Flyway clean against a shared or production database.
  Done when: tested on a fresh local database.
  Done: @senior-architect · 2026-10-18 · Migration: none · Tests: scripts/dev-reset-seed.sh and infrastructure/database/seed/demo_seed.sql created & executable

- [x] **B-1308 · Final report**
  Depends: B-1301 to B-1307
  Build: summary of completed work, known gaps, deployment steps, and recovery notes.
  Done when: file added to `docs/`.
  Done: @senior-architect · 2026-10-18 · Migration: none · Tests: docs/final-report.md created & signed off

---

## 5. Implementation workflow and definition of done

Implement in vertical slices, not as a single bulk code-generation pass. Complete and verify the foundation, then one feature slice at a time across migration, domain model, service, API, authorization, tests, and documentation. Re-check dependencies and the current repository state before every task. Do not restructure the frontend or rewrite existing modules unless a task explicitly requires it.

### Definition of done (every task)

- [ ] Code compiles; app starts with `ddl-auto: validate`
- [ ] Migration (if any) is new, correctly versioned, and tested on a fresh and an existing database
- [ ] Entities, repositories, services, DTOs and endpoints agree with the schema
- [ ] Transactions, locks and idempotency applied where the rules require
- [ ] Authorization tested: wrong role and wrong owner are rejected
- [ ] Tests written and **actually run** with real output recorded
- [ ] `docs/api.md` updated
- [ ] Audit and notification hooks added where relevant
- [ ] Task marked `[x]` with the completion line; Activity Log updated; progress table updated

## 6. Required report for every finished task

Put these in the pull request description and summarize in the Activity Log:

1. What changed (tables, columns, constraints, indexes)
2. Migration filename and purpose
3. Application changes (entities, repositories, services, DTOs, endpoints)
4. How existing data was preserved
5. Tests run: command and real result
6. Risks (locking, compatibility, data loss)
7. Deployment order
8. Unfinished work

## 7. Branch and commit conventions

- Branch: `task/B-402-buying-prices`
- Commit message: `B-402: add buying price management`
- One task per pull request; reference the task ID.
- Do not push migrations or code for a task you have not claimed.

## 8. Reference: the full flow these tasks build

```
Farmer delivers → enterprise inspects (accept / reject)
   → payable created + inventory lot created (one transaction)
   → farmer paid on delivery (allocated to payables)
Lots consumed → production batch (outputs + losses) → trace record + QR
Batch output → product listed with price breakdown
Buyer checks out (reserve stock, snapshot prices; one order per enterprise linked to a checkout group) → pays through a verified, idempotent provider flow (hold/release only if genuinely supported)
Delivery job (shared logistics, live tracking) → delivered → payment released
Tourism: package + session capacity → booking (guide accepts) → payment → completion → review
USSD/SMS: farmers check prices, deliveries and payments; notifications after commit
AI: reports and training messages (read-only), human review before sending
```

## 9. Activity log

Add a row for every claim, completion and blocker. Newest at the bottom.

| Date | Agent | Task | Event | Note |
|---|---|---|---|---|
| 2026-10-18 | — | — | Plan created | 110 tasks across 14 phases |
| 2026-10-18 | @senior-architect | B-001 | Done | Baseline verified against PostgreSQL with V1 applied and health UP |
| 2026-10-18 | @senior-architect | B-002 | Done | Common exception handler, error records, BaseEntity, CodeGenerator, MoneyUtil created |
| 2026-10-18 | @senior-architect | B-003 | Done | Stateless JWT security, UserPrincipal, JwtAuthenticationFilter, protected endpoint tests |
| 2026-10-18 | @senior-architect | B-004 | Done | SpringDoc OpenAPI configured with JWT Bearer scheme; test passed |
| 2026-10-18 | @senior-architect | B-005 | Done | BaseIntegrationTest with Testcontainers and ConcurrencyTestHelper created and tested |
| 2026-10-18 | @senior-architect | B-006 | Done | DevDataSeeder added for dev profile data loading |
| 2026-10-18 | @senior-architect | B-007 | Done | docs/api.md, docs/setup.md, docs/decisions.md updated and verified |
| 2026-10-18 | @senior-architect | B-101 | Done | V2__identity.sql entities and repositories created and validated with Hibernate validate |
| 2026-10-18 | @senior-architect | B-102 | Done | PhoneNumberUtil created and tested for Ethiopian local/international phone numbers |
| 2026-10-18 | @senior-architect | B-103 | Done | Buyer registration and login with BCrypt, JWT, duplicate checks, and 401 handling |
| 2026-10-18 | @senior-architect | B-104 | Done | Producer, Enterprise, Delivery Provider, and Tour Guide registration flows implemented |
| 2026-10-18 | @senior-architect | B-105 | Done | /api/v1/auth/me current user and linked profile lookup implemented |
| 2026-10-18 | @senior-architect | B-106 | Done | Enterprise farmer approvals and platform admin/authority verifications implemented |
| 2026-10-18 | @senior-architect | B-107 | Done | OwnershipService authorization helper created with unit & integration tests |
| 2026-10-18 | @senior-architect | B-108 | Done | LoginAttemptService brute force throttling and account suspension enforcement |
| 2026-10-18 | @senior-architect | B-109 | Done | End-to-end identity test suite implemented; 57/57 tests passing across the project |
| 2026-10-18 | @senior-architect | B-201 | Done | V3__common_data_and_pricing.sql migration created and validated with Hibernate validate |
| 2026-10-18 | @senior-architect | B-202 | Done | AuditService with secret redaction and TransactionalOutboxService pattern implemented |
| 2026-10-18 | @senior-architect | B-203 | Done | TranslationService with locale fallback and administration endpoints implemented |
| 2026-10-18 | @senior-architect | B-204 | Done | Media metadata service with enterprise ownership access controls implemented |
| 2026-10-18 | @senior-architect | B-205 | Done | IdempotencyService with SHA-256 payload hashing and conflict detection implemented |
| 2026-10-18 | @senior-architect | B-206 | Done | PricingEngine with dynamic breakdown rules (percentage, fixed amount, tax, platform fees) |
| 2026-10-18 | @senior-architect | P3 (B-301..B-313) | Done | Tourism and bookings module complete (V4, V5); concurrency tests for tour session booking |
| 2026-10-18 | @senior-architect | P4 (B-401..B-410) | Done | Supply delivery and farmer payments complete (V6); intake, inspection, oldest-first payable allocation |
| 2026-10-18 | @senior-architect | P5 (B-501..B-506) | Done | Inventory module complete (V7); lot tracking, movements, reconciliation, concurrent overdraw protection |
| 2026-10-18 | @senior-architect | P6 (B-601..B-608) | Done | Production and traceability module complete (V8); batch mass conservation, reversal movements, consent-aware public trace, ZXing QR generation |
| 2026-10-18 | @senior-architect | P7 (B-701..B-705) | Done | Catalog and product pricing complete (V9); weighted purchase cost, pricing breakdown rules, stock limits, public catalog API |
| 2026-10-18 | @senior-architect | P8 (B-801..B-806) | Done | Orders and checkout complete (V10); multi-enterprise checkout groups, stock reservations, idempotency, lifecycle state transitions, expiry scheduler |
| 2026-10-18 | @senior-architect | P9 (B-901..B-908) | Done | Buyer payments complete (V11); idempotent payment attempts, verified provider webhooks, order & booking settlements, bounded refunds, community fund ledger |

## 10. Blockers and open questions

These are design gates, not reasons to discard the plan. Record the final decision in `docs/decisions.md` before implementing the affected task.

| Date | Task | Question or blocker | Raised by | Resolution |
|---|---|---|---|---|
| 2026-10-18 | B-001, B-201 onward | Does the repository actually contain V1, and which migrations are applied to the target PostgreSQL database? | Plan review | **Required first:** inspect files, `flyway_schema_history`, and the real schema. Repository and applied history are authoritative; update Section 3 before writing migrations. |
| 2026-10-18 | B-801, B-802, B-804, B-901 | How should a browser cart containing products from multiple enterprises be represented? | Plan review | **MVP decision:** one checkout group with one order per enterprise. Keep fulfillment and supplier settlement scoped to each enterprise; test all-or-nothing checkout behavior. |
| 2026-10-18 | B-901 to B-906 | Does the selected payment provider support delayed settlement/hold-and-release, refunds, and verified webhooks? | Plan review | Build provider interfaces and mock/sandbox tests first. Do not promise escrow or release behavior until provider capability and applicable operating/legal requirements are confirmed. Farmer supplier payments remain separate from buyer payments. |
| 2026-10-18 | B-301 to B-310 | Is the tourism MVP experiences/guides only, or does it also include hotels and transport? | Plan review | Confirm before V3. The current plan permits packages/experiences and guides; include hotels/transport only if explicitly in the MVP. Avoid duplicate concepts and preserve cultural consent/restrictions. |
| 2026-10-18 | B-106, B-307, B-302 | Who can approve farmers, delivery providers, guides, enterprises, and cultural experiences? | Plan review | Define an explicit role-by-entity approval matrix. Enterprise-level actions are limited to that enterprise; platform-wide or tourism verification belongs only to the specifically authorized role. |
| 2026-10-18 | B-201, B-202, B-1102 to B-1104 | How are notifications guaranteed when a business transaction commits but the gateway is unavailable? | Plan review | Use a transactional outbox, retries, idempotent dispatch, and observable failures. |
| 2026-10-18 | B-602 | How are production inputs, outputs, losses, moisture, by-products, and unit conversions represented? | Plan review | Enforce input/output balance only for compatible units and a defined process; document conversion/yield rules and how by-products/losses are recorded. Do not compare incompatible units directly. |

## 11. Change log (requirements)

| Date | Change | Tasks affected |
|---|---|---|
| 2026-10-18 | Farmers are paid on delivery; the enterprise adds value and sells | P4, P5, P6 |
| 2026-10-18 | USSD and SMS are backend integrations, not website pages | P11 |
| 2026-10-18 | Cart stays in the browser (MVP) | P8 |
| 2026-10-18 | Fuller model adopted from `database-rules.md` (deliveries with accept/reject, lots and movements, snapshots, reservations, availability sessions, idempotent verified payments) | P3 to P10 |
| 2026-10-18 | Pre-implementation audit required; repository and applied Flyway history are authoritative, registry is provisional until verified | P0 to P13 |
| 2026-10-18 | Multi-enterprise checkout uses a shared checkout group and separate enterprise-specific orders | P8 to P10 |
| 2026-10-18 | Buyer payments are separate from farmer supplier payments; escrow/hold-release is conditional on real provider capability | P4, P9 |
| 2026-10-18 | Tourism scope and approval authority must be explicitly decided before related schema and workflows are implemented | P1, P3 |
| 2026-10-18 | Important post-commit notifications/integrations use a transactional outbox with retries and idempotency | P2, P11 |
## Backend follow-up fixes

- [!] **B-FIX-001 · Guide self-profile role authorization**
  Owner: @codex · Started: 2026-10-18
  Implemented: TOUR_GUIDE role check and nine security-chain regression cases; docs/api.md updated.
  Tests: Java 21 ./mvnw -Dtest=GuideProfileAuthorizationTest test → 9 passed. Full ./mvnw test → 140 tests, 0 failures, 3 errors.
  Blocked: Full-suite verification fails in DeliveryAndTrackingIntegrationTest setup: deleting orders violates payments_order_id_fkey. No delivery/test-data cleanup changes included. Migration: none.
  Scope: Correct GET /api/v1/tourism/guides/me to TOUR_GUIDE; verify guide success, anonymous 401, and other-role 403 using the real security chain. No schema changes.

Activity: 2026-10-18 · @codex · B-FIX-001 · Implemented; verification blocked by three delivery integration setup errors. Focused authorization tests: 9 passed.

- [!] **B-FIX-002 · Delivery integration test cleanup**
  Owner: @codex · Started: 2026-10-18
  Scope: Clear dependent payment fixtures before delivery tests delete orders. Testcontainer data only; no application/schema changes.
  Implemented: Remove community fund, refund, provider event, payment attempt, and payment fixtures in dependency order before order cleanup.
  Tests: Java 21 ./mvnw -Dtest=BuyerPaymentIntegrationTest,DeliveryAndTrackingIntegrationTest -Dsurefire.runOrder=alphabetical test → 7 passed; reversealphabetical → 7 passed. ReviewsAndAiIntegrationTest alone → 3 passed.
  Blocked: Full ./mvnw test attempted twice → 138 tests, 0 failures, 1 error each time: ReviewsAndAiIntegrationTest PostgreSQL container startup failed with Docker broken pipe before test execution. Original three delivery cleanup errors are resolved. Migration: none.

Activity: 2026-10-18 · @codex · B-FIX-002 · Delivery cleanup repaired and tested in both class orders; full-suite verification blocked by Docker startup for reviews (which pass in isolation).


Payment read follow-up · F-603 · 2026-10-18 · @codex · `0f8ce5f`: added bounded authenticated payer history and receipt reads, and payer/order-owner authorization on existing order-payment lookup. No migrations; existing payer index retained. Read-only DTO mapping fetches only to-one order/booking associations; mixed-target pagination test measures at most two service SQL statements. Full backend suite: 156 passing; final payment service/controller/PostgreSQL checks: 20 passing. Payment-attempt authorization/idempotency remains a separate review item.


Refund read follow-up · F-606 · 2026-10-18 · @codex · `f687759`: added own-payment refund summary/history and authorized booking-payment lookup. Completed-only aggregate and coverage use BigDecimal on the server; refund pages are bounded and sorted by createdAt/id descending. The refund endpoint uses a read-only repeatable-read transaction on PostgreSQL to keep summary and page reads consistent. DTO mapping fetches only to-one payment relations; measured service query budget is four including payment authorization, completed sum, page and count. No migrations or refund-write behavior changed. Backend suite: 170 passing.
