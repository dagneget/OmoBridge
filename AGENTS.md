# OmoBridge — Agent Guide

Digital platform connecting rural producers, micro-enterprises, tourists, and service
providers in South Omo, Ethiopia. Dual-channel: a React PWA for smartphone users, and
USSD (`*990#`) / SMS for feature phones.

## Repo Layout

```
backend/   Java 21 + Spring Boot 3.4.3 modular monolith, PostgreSQL 16 + Flyway
frontend/  React 19 + Vite 8 + Tailwind v4 PWA  ← the product web app
tools/     ussd-simulator
infrastructure/ compose.yaml + database init/seed SQL
scripts/   dev startup, environment checks, USSD simulation
docs/      plans, ADRs, API reference, roles, agent assignments
```

There is exactly one web app: `frontend/`. A Figma Make scaffold that once sat at the repo
root has been removed; do not reintroduce one.

## Toolchain

Java 21 · Maven 3.9+ via `backend/mvnw` · Node 22 (`.mise.toml`) · PostgreSQL 16-alpine (Docker).

`.editorconfig` is the formatting source of truth: **2-space indent, LF**, except `*.java`
is **4-space** and `Makefile` uses tabs.

## Commands

```bash
./scripts/check-environment.sh   # verify java/maven/node/docker
make db-up                       # start PostgreSQL on 5432
make dev                         # db + backend (8080) + frontend (5173); Ctrl-C stops all
make test                        # backend tests + frontend build (Docker required)

cd backend  && ./mvnw spring-boot:run   # :8080, Swagger at /swagger-ui
cd backend  && ./mvnw test              # Testcontainers postgres
cd frontend && npm run dev              # :5173
cd frontend && npm run typecheck && npm run lint && npm test
cd frontend && npm run api:generate     # regenerate src/types/api.generated.ts from /v3/api-docs

./scripts/ussd-simulate.sh        # drive the USSD state machine over HTTP
./scripts/dev-reset-seed.sh       # drop schema, re-migrate, seed (localhost only)
```

`npm test` requires a prior `npm run build` (`pwaConfig.test.ts` reads `frontend/dist/`).

### Environment

Root `.env.example` is the union. Backend reads `SERVER_PORT`, `DB_URL`, `DB_USERNAME`,
`DB_PASSWORD`, `JWT_SECRET`, `JWT_EXPIRATION_MS`, `SPRING_PROFILES_ACTIVE`. Frontend reads
`VITE_API_BASE_URL` and `VITE_USSD_SHORT_CODE`.

**`JWT_SECRET` has a committed working default in `backend/src/main/resources/application.yml`.
Always override it outside local dev** — with the default, anyone with repo access can mint
valid tokens for any role.

`SPRING_PROFILES_ACTIVE=dev` activates `config/DevDataSeeder`.

## Backend

17 domain modules under `com.omobridge`, each layered `api → api/dto → service → domain`:
`identity`, `supply`, `inventory`, `traceability`, `products`, `orders`, `payments`,
`delivery`, `tourism`, `bookings`, `ai`, `reviews`, `notifications`, `integrations`,
`pricing`, `common`, `config`.

**Business spine:** farmer delivery → inspection → payable → farmer payment; then lot →
production batch → product SKU → buyer checkout → payment → consolidated delivery. Each batch
emits a `TraceRecord` with a public QR (`GET /api/v1/trace/{token}/qr`).

Conventions:

- DTOs are Java **records**; entities extend `BaseEntity` (UUID, auditing, `@Version`).
  **No soft deletes** — use status enums.
- Schema is Flyway-owned (`V2..V14`; `V1__init.sql` is an empty comment baseline); Hibernate
  runs `ddl-auto: validate`. **Add a migration, never edit an applied one.** Money is
  `NUMERIC(15,2)`, quantities scale 3, timestamps are `TIMESTAMPTZ`.
- Responses wrap in `ApiResponse<T>`. Errors map through `GlobalExceptionHandler` to codes
  `RESOURCE_NOT_FOUND`, `BUSINESS_RULE_VIOLATION`, `RESOURCE_CONFLICT`, `UNAUTHORIZED`,
  `ACCESS_DENIED`, `VALIDATION_FAILED`.
- Security: stateless JWT + `@PreAuthorize`, with resource-scoped checks via the
  `OwnershipService` bean (`@ownershipService.isEnterpriseMember(authentication, #enterpriseId)`).
- Roles (`RoleName`): `BUYER_VISITOR`, `PRODUCER_FARMER`, `MICRO_ENTERPRISE`,
  `DELIVERY_PROVIDER`, `TOUR_GUIDE`, `TOURISM_AUTHORITY`, `SYSTEM_ADMIN`.
  **There is no `ADMIN` role.**
- Never log raw PII — use `LogMaskingUtil` / `PhoneNumberUtil`; `AuditService` auto-redacts.
- **Every external provider is mocked**: `MockSmsGateway`, `TelebirrPaymentGateway` (log
  only), `VoiceGateway` (no impl), `ClaudeAiClient` (canned strings). The USSD flow is the one
  real stateful integration (DB-backed `UssdSession`, 3-minute TTL). Do not mistake mock
  output for a real integration.

## Frontend

`frontend/src`: `routes/index.tsx` (all routes, pages lazy-loaded) · `features/<domain>/`
(service + `index.ts` barrel) · `services/` (`httpClient`, `queryClient`, `queryKeys`,
`apiError`) · `components/{layout,common}` · `pages/` · `types/api.generated.ts` (generated —
never hand-edit) · `mocks/` (MSW).

The full rule set is `docs/frontend-plan.md` §1. The load-bearing ones:

1. **OpenAPI is the contract.** Types come from `api:generate`. Never hand-write a DTO shape.
2. **The backend is the authority** for authz, money, stock, and status. Route guards and
   hidden buttons are UX only.
3. **Never compute an authoritative total in the browser.**
4. **One idempotency key per user action**, reused across retries.
5. **Auth/payment/order API calls are network-only** in the PWA. Never cache tokens or private
   responses. Clear caches on logout.
6. **No hard-coded user-facing text** — use i18n keys. Fallback: language → Amharic → English.
7. Every data screen needs **loading, empty, error, and offline** states.
8. Mobile-first at 360 px, touch targets ≥ 44 px, WCAG 2.1 AA, icons paired with text labels.
9. Thin `pages/`, logic in `features/*`, shared UI in `components/common`. No cross-feature
   imports except through a feature's `index.ts`.

## Multi-Agent Working Agreement

Work is split across four agents (`docs/frontend-agent-assignments.md`). Rules:

- **One task per branch per worktree.** Claim a task by marking `[ ]` → `[~]` in
  `docs/frontend-plan.md` with `Owner: @you · Started: YYYY-MM-DD`, and commit that claim
  before starting. Never take a task that is already `[~]`.
- **Preserve other agents' `[~]` claims and uncommitted work.**
- Mark `[x]` only after: typecheck, lint, build, and the task's tests all pass; the screen
  works at 360 px, keyboard-only, with all four states; `docs/frontend.md` is updated.
  Replace the Owner line with
  `Done: @you · YYYY-MM-DD · Tests: <command> → <result>`.
  **If something could not be run, mark `[!]` and say what blocked you. Never mark done on a guess.**
- **If the API is missing an endpoint, do not invent one.** Add a row to the Backend gaps
  table (`docs/frontend-plan.md` §10) and build against an OpenAPI-typed MSW mock.
- **Shared files are reconciled serially, not edited concurrently:** `routes/index.tsx`,
  global layouts, `components/common/index.ts`, `App.tsx`, shared HTTP/auth/query infra,
  generated API types, package/lock files, global styling/build config. Submit the minimum
  change as a handoff patch instead of editing these.
- Handoffs record: task ID, branch + commit, changed areas, endpoints used, test
  commands/results, 360 px + keyboard + four-state evidence, and any shared-file patch.

ADRs in `docs/decisions.md` explain decisions that look odd. Read before "fixing" something
that looks wrong.

## Known Issues — Not Caused by Your Change

- **13 `@PreAuthorize` expressions use `hasRole('ADMIN')`**, which never matches because the
  role is `SYSTEM_ADMIN`. Those branches are dead and non-restrictive.
- **`@EnableScheduling` is missing**, so `orders/service/ReservationExpiryService` never runs.
- **Tailwind semantic tokens are undefined.** `components/common/*` uses `bg-card`,
  `text-foreground`, `bg-primary`, etc., but `index.css` `@theme` only defines `brand-*` and
  `status-*`, so those utilities are not generated.
- **i18n is barely wired.** `i18next` is initialised in `main.tsx` only; locale files hold ~11
  keys and almost no page calls `useTranslation`, so most screens hard-code English. Because
  i18n is not initialised in tests, components that translate should follow
  `LanguageSwitcher`'s pattern of importing the instance from `src/i18n` as a fallback.
- **`LoginAttemptService` is in-memory**, so throttling resets on restart and is per-instance.
- **Three integration tests need a live DB** (`SecurityIntegrationTest`,
  `OpenApiIntegrationTest`, `OmoBridgeApplicationTests`).
- **Dispatching `window` `offline` events in tests poisons the rest of the run.** React
  Query's `onlineManager` is a process-wide singleton that listens for those events. After a
  test dispatches `offline`, every later query is silently paused (`fetchStatus: 'paused'`
  while `enabled` is still `true`) and no request is sent — which looks exactly like a broken
  component. Always `window.dispatchEvent(new Event('online'))` in `afterEach` after an
  offline test. Symptom if you hit it: `enabled === true`, `isLoading === false`,
  `isError === false`, `data === undefined`, and the spy was never called.
- **A delivery provider cannot discover their own `providerId`.** The job list endpoint is
  `GET /api/v1/delivery/providers/{providerId}/jobs`, but `/api/v1/auth/me` returns
  `UserProfileResponse`, which has no provider id, and there is no `/providers/me` equivalent
  (guides *do* have `GET /api/v1/tourism/guides/me`). Tracked as a gap in
  `docs/frontend-plan.md` §10.
- Docs drift from code in places: `docs/frontend.md` and `docs/roles.md` list endpoints and
  components that do not exist. **Treat the running backend and OpenAPI output as ground truth.**