# Four-agent integration baseline

Branch: `integration/four-agent-baseline`. Verified source commit: `d388615`. Date: 2026-10-18. This integrates committed primary work through `37dc470` (F-810), Codex feature history through `caed304`, and the existing guide authorization/delivery fixture cleanup branches. Later F-901, farmer, and provider work remains owned by its agents and is outside this cutoff.

The combined app includes catalog, pricing/install support, product detail, persistent cart, checkout, checkout results, buyer order history, tourism/bookings, and enterprise supply. Shared startup now verifies stored sessions once; stale profile responses and authorization errors cannot invalidate a newer login.

Verification:

- Frontend: 507 tests in 64 files pass; typecheck, lint and production build pass. Two existing InspectionPage effect warnings and the bundle-size warning remain.
- Firefox: 360 px keyboard journey through product/cart/checkout/order history/detail passes; buyer axe checks report zero violations. Enterprise direct dashboard startup, supply history, and wrong-role blocking pass without horizontal overflow. These checks use MSW, not live financial transactions or a physical device.
- Backend: all 140 tests pass with Java 21 and an isolated PostgreSQL database (`DB_URL=jdbc:postgresql://localhost:55439/omobridge`). Without that prerequisite, the earlier run had eight context startup errors and zero assertion failures. No test exclusions were used.

Adoption: create a separate worktree from this branch, or merge/rebase it into your task branch after saving your own changes. Do not switch the shared active checkout or overwrite another agent's uncommitted files. Codex owns shared integration conflicts.

Open blockers remain: F-505-I1 buyer/payload-scoped checkout idempotency, F-506-E1 reservation expiry, F-508-T1 buyer tracking token, and F-508-P1 payment ownership enforcement. F-506 and F-508 remain blocked. Next Codex feature is F-601 using the existing F-405 payment flow.
