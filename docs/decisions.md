# OmoBridge Architectural Decision Records (ADR) & Pre-Implementation Audit

## ADR-001: Flyway Migration History Reconciliation & Baseline Versioning

### Status
Accepted (2026-10-18)

### Context
- The build plan proposed `V1__identity.sql` as version 1.
- However, prior to backend implementation, the repository was initialized with `V1__init.sql` (checksum `432015117`), which was applied to the PostgreSQL database instance.
- According to `docs/database-rules.md` (Rule 1, Rule 2, Rule 3) and `docs/backend-plan.md` Section 3:
  - "Never modify a migration that has already been applied to a shared or production database."
  - "If the real repository or applied database history differs from this plan, the repository and actual applied history win."
  - "Never drop or recreate a database simply to resolve a schema mismatch."

### Decision
1. Retain `V1__init.sql` as the immutable baseline schema version 1.
2. The identity and access schema (roles, users, user_roles, enterprises, enterprise_staff, farmers, delivery_providers, guides) will be implemented as `V2__identity.sql`.
3. Subsequent migrations in the planning registry shift sequentially (`V3__common_audit_pricing.sql`, `V4__tourism.sql`, `V5__bookings.sql`, etc.), ensuring strict monotonic versioning and zero checksum conflicts across environments.

---

## ADR-002: Modular Monolith Package Structure & Layer Boundaries

### Status
Accepted (2026-10-18)

### Context
OmoBridge requires high cohesion within domain modules (identity, supply, inventory, production, catalog, orders, payments, delivery, tourism, bookings) with strict decoupling between modules.

### Decision
1. **Module Hierarchy**:
   - `com.omobridge.<module>.api`: Controllers, request/response DTOs, endpoint annotations.
   - `com.omobridge.<module>.service`: Service interfaces and implementations containing domain logic, transactional boundaries (`@Transactional`), and mappers.
   - `com.omobridge.<module>.domain`: JPA Entities, repositories, custom query methods, and domain enums.
   - `com.omobridge.<module>.infrastructure`: External integrations, adapters, and low-level streams (applicable to delivery, traceability, ai).
2. **Inter-Module Communication**:
   - Modules must communicate exclusively through other modules' **service interfaces**, never directly accessing other modules' repositories or entities.
3. **Common Cross-Cutting Concerns**:
   - `com.omobridge.common.exception`: Global error handling (`GlobalExceptionHandler`), domain exceptions (`ResourceNotFoundException`, `BusinessRuleException`).
   - `com.omobridge.common.response`: Standardized envelope (`ApiResponse`, `PageResponse`).
   - `com.omobridge.common.security`: Token handling (`JwtService`), `CurrentUser` provider, security constants.
   - `com.omobridge.common.util`: Code and number generators, quantity/money helpers.

---

## ADR-003: Concurrency Control, Idempotency & Financial Snapshots

### Status
Accepted (2026-10-18)

### Context
Rural supply chains, inventory allocation, and tour booking require strict transaction safety under concurrent requests.

### Decision
1. **Pessimistic Locking**: `SELECT ... FOR UPDATE` will be used on inventory lots and tour availability sessions during reservation and consumption.
2. **Idempotency Keys**: All financial operations (farmer payouts, buyer checkout, payment attempts) require a unique client idempotency key stored in `idempotency_keys` with SHA-256 request hashing.
3. **Historical Snapshots**: Order items and booking items must immutably copy commodity name, SKU, unit price, and currency at the moment of creation. Catalog edits will never mutate historical purchase records.

---

## ADR-004: Frontend Architecture, OpenAPI Source of Truth & PWA Technical Decisions

### Status
Accepted (2026-10-18)

### Context
Building the complete offline-first Progressive Web App (PWA) for OmoBridge requires clear baseline decisions matching the real backend implementation and operational constraints of South Omo.

### Decisions
1. **Source of Truth**: The running backend OpenAPI schema (`http://localhost:8080/v3/api-docs`) and actual controller routes (`/api/v1/...`) are authoritative. TypeScript types are generated directly via `openapi-typescript`.
2. **Token Storage & Security**: A single dedicated authentication module (`src/features/auth/authStore.ts`). JWT token stored in `localStorage` behind an accessor layer, cleared immediately on logout. Strict CSP, no third-party scripts. Future backend enhancement will evaluate httpOnly cookie rotation.
3. **Styling & Design System**: Retain Vite + Tailwind CSS v4 configured with `@tailwindcss/vite` in `src/index.css`. Semantic tokens for colors (Omo earthy ochre, acacia green, river blue, charcoal), spacing, and typography supporting Latin and Ethiopic scripts.
4. **Checkout & Payment**: The backend schema binds a `payment` to exactly one order (`order_id`) or booking (`booking_id`). Multi-seller checkouts produce individual orders under a `checkout_group`; payments are executed per order with unique idempotency keys (`X-Idempotency-Key`).
5. **Offline Scope & PWA Caching**:
   - Workbox service worker precaches app shell.
   - Public GET content (experiences, catalog, translations) cached with stale-while-revalidate.
   - Private, authenticated, and financial endpoints are strictly network-only.
   - Offline queue via IndexedDB (`idb`) is scoped exclusively to safe, idempotent actions: driver GPS location points with device timestamps (`recorded_at`) and delivery job status transitions. All other actions show clear online-only requirement indicators.
6. **Telephony & USSD Integration**: USSD code is dynamically read from configuration (defaulting to placeholder `*844#`). A standalone simulation utility (`tools/ussd-simulator/`) verifies the session callback against the real backend without cluttering production bundles.
7. **Multilingual Architecture**: Complete translation bundles for English (`en`) and Amharic (`am`). Fallback hierarchy: User language → Amharic → English. Local South Omo languages (Hamer, Dasenech, Tsamai) scaffolded with safe review flags and fallbacks.

