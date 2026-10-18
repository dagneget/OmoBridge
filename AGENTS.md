# OmoBridge — Agent Guide

OmoBridge connects rural producers, micro-enterprises, tourists and service providers in South Omo, Ethiopia. The product combines a React PWA with backend USSD/SMS support.

## One frontend

The product frontend is **`frontend/`**, using React 19, Vite 8, Tailwind v4 and TypeScript. The former root Figma Make scaffold was removed. Do not recreate a root web application, assume a preview server is already running, or use the old root `src/` paths.

Read `docs/frontend-plan.md`, `docs/frontend.md` and `docs/api.md` before feature work. `docs/frontend-agent-assignments.md` allocates the remaining work to Antigravity, Codex, OpenCode and Kiro; it does not claim tasks automatically. Check its integration-baseline handoff before creating a branch.

## Toolchain and verification

Use Java 21, Node 22, the backend Maven wrapper and PostgreSQL 16. `.editorconfig` governs formatting: two spaces except four for Java and tabs for Makefiles.

```bash
./scripts/check-environment.sh
make db-up
make dev

cd frontend
npm run typecheck
npm run lint
npm run build
npm test
npm run api:generate
npm run api:check

cd ../backend
./mvnw test
```

Frontend tests that inspect the generated service worker require a build first. Testcontainers needs Docker access; some backend integration tests also use the local database. Read actual results and report unavailable checks/failures; do not turn an environment failure into a passing check. `make test` does not replace the frontend Vitest run.

## Frontend rules

- OpenAPI is the contract. Use aliases of `src/types/api.generated.ts`; regenerate it from the real backend rather than editing generated DTO shapes.
- Keep pages thin, feature logic in `features/*`, shared UI in `components/common`. Cross-feature imports go through the feature's `index.ts`.
- Backend authorization, money, quantities, stock and status are authoritative. Route guards and hidden buttons are UX controls. Never calculate an authoritative checkout total in the browser; send product IDs and quantities.
- Use one idempotency key per user action, reused across retries. Preserve ambiguous outcomes; never fabricate successful orders or payments.
- Private/auth/order/payment API responses are network-only in the PWA. Never put tokens or private responses in Cache Storage. Clear user-scoped queries, queues and storage on logout/account changes.
- Use i18n keys for every UI string, with selected language → Amharic → English fallback. Local-language content requires human review before final publication.
- Every data screen needs loading, empty, error and offline states. Design for 360 px, keyboard navigation, WCAG 2.1 AA and touch targets of at least 44 px. Pair icons with text labels.
- Use canonical roles from `features/auth/roleHelpers.ts`: `BUYER_VISITOR`, `PRODUCER_FARMER`, `MICRO_ENTERPRISE`, `DELIVERY_PROVIDER`, `TOUR_GUIDE`, `TOURISM_AUTHORITY`, `SYSTEM_ADMIN`. There is no canonical `ADMIN` role; use normalization helpers rather than legacy string comparisons.
- Do not invent API endpoints or add unsupported fields to DTOs. Record a backend gap in the board and use MSW fixtures derived from generated types for supported contracts. Label integration blockers honestly.
- Existing payment, booking, language-switcher, price-breakdown and other feature work may already implement part of a task. Inspect and reuse it instead of rebuilding parallel components.

## Backend rules

The backend is a Java 21 / Spring Boot 3.4 modular monolith under `backend/src/main/java/com/omobridge/`. Keep domains layered `api → api/dto → service → domain`. DTOs are records, entities extend `BaseEntity`, and Hibernate validates the Flyway-owned schema.

- Read the applicable local skill before touching Spring Boot controllers, JPA/Hibernate queries or Flyway migrations: `.agents/skills/spring-boot-skill/SKILL.md`, `jpa-query-reviewer/SKILL.md`, `flyway-safe-migration/SKILL.md`.
- Project conventions and explicit user instructions take precedence over generic skill examples: retain the existing domain layout, YAML configuration, `ApiResponse<T>` envelopes and resource-scoped `@PreAuthorize` checks.
- Validate resource ownership on the backend, using existing ownership/service checks. Authenticated access alone is not resource authorization.
- Add Flyway migrations; never edit an applied migration. Read `docs/database-rules.md` and `docs/decisions.md` before schema work. Money has scale two; quantities have scale three. Use timezone-aware timestamps.
- Use status enums rather than soft deletes, and retain optimistic locking and append-only ledgers.
- Do not log raw phone numbers, tokens, payment payloads or other PII. Use the project's masking/audit helpers.
- External SMS/Telebirr/voice/AI providers are mocked or incomplete. Mock output is not a live integration. Do not create fake production data paths to hide missing behavior.
- Override the committed development JWT secret outside local development.

## Task and collaboration protocol

1. Read the current task entry and dependencies. Preserve every existing `[~]` claim. Allocation to a lane is not permission to steal another agent's active task.
2. Work in a separate worktree. Claim one ready task (`[ ]` → `[~]`, owner and date), commit the claim, then implement it. One task/branch/PR; integration milestones are tracked separately from the 134 feature tasks.
3. Verify the current source and live OpenAPI. Summary counters and old issue lists can lag the implementation.
4. Mark `[x]` only after the required tests, typecheck, lint, build, role handling and 360 px/keyboard/four-state checks pass, with evidence and updated frontend documentation/activity log. Keep `[!]` for unresolved API/integration or verification blockers.
5. Preserve other agents' files and tests. Never discard or commit their active uncommitted feature changes to make an integration easier. Reconcile board entries rather than replacing them from an old branch.
6. Codex integrates shared routes, layouts, exports, HTTP/auth/query infrastructure, generated types, package/lock files and global style/build changes. Domain agents provide narrow shared-file patches with their feature handoff; coordinate overlapping changes serially.
7. The board's backend-gap rows identify checkout idempotency/expiry, payment ownership and order-tracking contracts needing work. Inspect their current state before changing code or claiming they are resolved.
