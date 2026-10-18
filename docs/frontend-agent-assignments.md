# Frontend assignments for four agents

Allocation snapshot: 2026-10-18. Source: individual task entries in [frontend-plan.md](frontend-plan.md), checked against the current checkout and existing worktrees. This is a delivery allocation, not a bulk task claim. The shared board remains the execution record.

There are **134 feature tasks: 54 marked done and 80 unfinished**. The unfinished set contains 76 not started, three blocked (F-305, F-506, F-508), and one active (F-809). “Done” on an isolated branch does not mean integrated into the product branch. Physical-device and other outstanding verification notes still apply.

| Agent | Unfinished tasks | Main responsibility | First action |
|---|---:|---|---|
| Antigravity | 17 | Enterprise supply, inventory, production, operations, tourism management and reporting | Preserve/finish the existing F-809 claim; then F-810 and F-901 |
| Codex | 17 | Integration, buyer orders/payments/reviews, contract/security gaps and release coordination | Consolidate existing tested branches; then F-601, reusing the shared payment flow |
| OpenCode | 23 | Delivery provider, public tracking/traceability, offline/PWA and USSD simulator | F-1101; F-604 and F-701 are independent ready tasks afterward |
| Kiro | 23 | Farmer, guide, admin/authority, languages, accessibility and performance | F-1001; audit existing F-311 work before implementing F-1601 |

Counts are not equal estimates of effort: the commerce/integration and enterprise tasks include larger workflows. T1 work and the golden path take precedence over task count. Antigravity is the intended owner of the existing enterprise lane; the current board uses `@claude-agent`. **Do not silently rename or steal that claim**: its current agent finishes F-809, or explicitly hands it over. F-305 is an intended Kiro follow-up after a handoff from its recorded owner.

## Start with integration and blockers

Codex owns a common integration baseline. Bring the committed enterprise/tourism work and tested Codex implementations together in an isolated integration worktree, preserving each agent's changes. Publish the resulting commit hash and combined verification results; all four agents use/rebase onto that baseline. Uncommitted F-809 work remains with its current owner until its task commit is ready. While the baseline is assembled, other agents can inspect APIs and prepare their first task in separate worktrees; merge no feature with unmet dependencies.

Existing Codex work to preserve includes the catalog, pricing/install support, product detail/cart and these latest dependent branches:

| Existing work | Delivery reference |
|---|---|
| Shared support integration | `integration/frontend-support` / `209f32f` |
| Product detail | `feat/product-detail` / `1cfcb73` |
| Cart state | `feat/cart-store` / `6ad5b33` |
| Cart screen | `feat/cart-page` / `731dc57` |
| Checkout | `feat/checkout` / `484d71a` |
| Checkout result | `feat/checkout-result` / `1162266` |
| My orders | `feat/my-orders` / `caed304` |

These branches form a dependent history; inspect ancestry and merge/cherry-pick deliberately rather than applying overlapping work twice. The latest My orders branch contains the earlier Codex feature history, but lacks newer primary-branch enterprise/booking changes. Its 379-test result is not a combined-branch test result.

Codex also coordinates the existing backend gaps needed by its lane. Any backend fix is a separately claimed task/branch/PR using the project backend skills; frontend assignments do not turn API gaps into invented client contracts.

| Blocker | Owner / handoff |
|---|---|
| Checkout replay lacks buyer/payload ownership checks (F-505-I1) | Codex coordinates backend fix and security tests |
| No authoritative reservation deadline (F-506-E1) | Codex coordinates backend contract, regenerates types, then wires F-506 |
| Payment lookup lacks ownership enforcement (F-508-P1) | Codex coordinates backend authorization fix before calling the flow secure |
| No buyer-visible order-to-tracking reference (F-508-T1) | Codex coordinates contract; OpenCode consumes the resulting public tracking token |
| Hotel backend failure recorded under F-305 | Kiro verifies current behavior, coordinates the backend fix if still present, and completes the existing screen rather than rebuilding it |
| Three delivery-test cleanup errors and one PostgreSQL container startup error in recent full backend runs | Codex verifies current failures and integrates/reviews existing cleanup work as appropriate; do not hide failures or assume every run has identical results |

## Dependency handoffs

1. **Payments:** Codex audits/reuses primary's F-405 `TelebirrPaymentModal`/`paymentService` (`fc16594`). F-601 supplies a real single-order payment entry point; once the expiry contract is available, finish F-506. F-602 then adds group/per-order orchestration. This avoids waiting for F-602 to create a route that F-506 needs first.
2. **Tracking:** OpenCode builds F-604 independently against the existing public token endpoint. Once the backend exposes an authorized token, Codex wires the owned order detail in F-508. OpenCode owns F-605's tracking handoff and integration test; it does not edit Codex's order files concurrently. F-607 follows payment/tracking integration.
3. **Traceability:** OpenCode owns the public trace and QR components (F-701/F-703). Antigravity consumes their public exports for F-906; agree on props before duplicating QR/print UI.
4. **Offline:** OpenCode owns the GPS queue in F-1104, then F-1501/F-1505. F-104 is the existing formatting task, not an offline-queue implementation despite stale prose elsewhere in the board. Do not assume a queue already exists. F-1105 queues status only if backend replay/conflict semantics support it.
5. **Languages/accessibility:** each agent translates and checks accessibility for its own feature before handing it off. Kiro owns shared i18n contracts, cross-feature audits and final passes after features are merged. No cross-agent string-extraction edits while a feature is actively being changed.
6. **Golden path:** Antigravity's F-904/F-907/F-910, Codex's payments, and OpenCode's delivery/tracking/trace must all land before Codex runs F-1703. Domain owners supply their fixtures and test accounts; Codex owns the combined test and demo script.

## Work boundaries and shared files

Every agent uses a separate worktree and one branch/PR per task. Claim only the next ready task (`[ ]` → `[~]`, owner/date, claim commit), not an entire allocation. Preserve all existing `[~]` claims. `[!]` stays blocked until its recorded gap and verification are resolved; no checkbox promotion based on unit tests alone.

| Agent | Own implementation areas |
|---|---|
| Antigravity | Enterprise supply/inventory/production/catalog/operations feature folders and `pages/dashboard/enterprise/*`; enterprise shell integration |
| Codex | Products/cart/checkout/orders/payments/reviews feature folders, buyer account order/review pages, integration branch and release/contract/security tests |
| OpenCode | Delivery/traceability/PWA/queue feature folders, provider dashboard, public trace/tracking pages, offline tests and `tools/ussd-simulator/` |
| Kiro | Farmer/guide/admin/authority feature folders and pages, shared locale architecture, accessibility/performance audits, existing hotel-screen follow-up |

Codex is the merge owner for shared `routes/index.tsx`, global layouts, `components/common/index.ts`, `App.tsx`, shared HTTP/auth/query infrastructure, generated API types, package/lock files and global styling/build configuration. This does not prevent domain work: agents submit the minimum route/nav/export/config changes with their PR or a handoff patch; Codex applies/reconciles them serially. Kiro proposes shared i18n/style changes; OpenCode proposes service-worker/cache/auth-cleanup changes. Do not edit these shared files simultaneously in one checkout.

Keep mocks/fixtures and translation namespaces local to a feature where possible. Shared `mocks/handlers.ts` registration changes are small, reviewed integration patches. Each agent updates only its task entry in the shared board in its own branch; Codex reconciles board/progress changes during integration. Avoid replacing whole copies of `frontend-plan.md` or `frontend.md` from an old branch.

A handoff contains: task ID, branch and commit, changed areas, generated-type API endpoints used, test commands/results, 360 px/keyboard/four-state evidence, backend gaps, and any required shared-file patch. Do not discard another agent's failing tests or uncommitted work.

## Complete task allocation

Existing statuses below are a snapshot, not new claims. The `Needs` column is preserved from the task board. Re-read it at claim time. Finish required T2 foundations (for example F-1301 before F-1302); defer T3 while T1 remains.

### Antigravity — 17 tasks

| Task | Status | Priority | Work | Needs |
|---|---|---|---|---|
| F-809 | In progress | T3 | Supply history and print receipt | F-804 |
| F-810 | Not started | T1 | Supply tests | F-807 |
| F-901 | Not started | T1 | Inventory lots and movements | F-801 |
| F-902 | Not started | T2 | Adjustments, transfers, disposals | F-901 |
| F-903 | Not started | T2 | Reconciliation report | F-901 |
| F-904 | Not started | T1 | Production batch wizard | F-901 |
| F-905 | Not started | T1 | Batch detail and lifecycle | F-904 |
| F-906 | Not started | T1 | Trace record management | F-905 |
| F-907 | Not started | T1 | Create product from output | F-905 |
| F-908 | Not started | T2 | Price rules | F-801 |
| F-909 | Not started | T1 | Orders management | F-801 |
| F-910 | Not started | T1 | Delivery jobs | F-909 |
| F-911 | Not started | T1 | Tourism management | F-801 |
| F-912 | Not started | T1 | Booking management | F-911 |
| F-913 | Not started | T2 | Finance views | F-801 |
| F-914 | Not started | T1 | Reports and AI assistant | F-801 |
| F-915 | Not started | T2 | Media attachment | F-911 |

### Codex — 17 tasks

| Task | Status | Priority | Work | Needs |
|---|---|---|---|---|
| F-506 | Blocked | T1 | Checkout result | F-505 |
| F-508 | Blocked | T1 | My orders | F-506 |
| F-509 | Not started | T2 | Cancel order | F-508 |
| F-601 | Not started | T1 | Payment flow component | F-005, F-102 |
| F-602 | Not started | T1 | Pay each order in a checkout group | F-601, F-506 |
| F-603 | Not started | T2 | Payment history | F-601 |
| F-606 | Not started | T2 | Refund display | F-508 |
| F-607 | Not started | T1 | Payment and tracking tests | F-602, F-605 |
| F-1401 | Not started | T2 | Leave a review | F-404, F-508 |
| F-1402 | Not started | T3 | My reviews | F-1401 |
| F-1403 | Not started | T2 | Review tests | F-1401 |
| F-1701 | Not started | T1 | Critical-flow component tests | T1 feature tasks |
| F-1702 | Not started | T2 | Contract tests | F-007 |
| F-1703 | Not started | T1 | End-to-end golden path | T1 feature tasks |
| F-1706 | Not started | T1 | Security review | F-201 |
| F-1708 | Not started | T1 | Demo script and demo checklist | F-1703 |
| F-1709 | Not started | T2 | Final report and deployment notes | F-1701 to F-1708 |

### OpenCode — 23 tasks

| Task | Status | Priority | Work | Needs |
|---|---|---|---|---|
| F-109 | Not started | T2 | Update flow | F-105 |
| F-110 | Not started | T2 | Cache and privacy cleanup | F-106, F-201 |
| F-604 | Not started | T1 | Live tracking page | F-304 |
| F-605 | Not started | T1 | Tracking from order detail | F-604, F-508 |
| F-701 | Not started | T1 | Public trace page | F-304 |
| F-702 | Not started | T2 | QR scanner | F-701 |
| F-703 | Not started | T1 | QR display and print | F-701 |
| F-704 | Not started | T1 | Trace tests | F-701, F-703 |
| F-1101 | Not started | T1 | Provider home and job list | F-207 |
| F-1102 | Not started | T1 | Job detail and status updates | F-1101 |
| F-1103 | Not started | T1 | GPS capture | F-1102 |
| F-1104 | Not started | T1 | Offline location queue | F-1103, F-104 |
| F-1105 | Not started | T2 | Offline status queue | F-1102 |
| F-1106 | Not started | T2 | SMS checkpoint fallback | F-1102 |
| F-1107 | Not started | T1 | Provider offline test | F-1104 |
| F-1108 | Not started | T2 | Background tracking limitation notice | F-1103 |
| F-1501 | Not started | T1 | Pending sync center | F-104, F-1104 |
| F-1502 | Not started | T2 | Offline public content | F-106, F-302 |
| F-1503 | Not started | T2 | Audio guidance | F-106 |
| F-1504 | Not started | T2 | Storage quota handling | F-104 |
| F-1505 | Not started | T1 | PWA offline end to end | F-1502, F-1104 |
| F-1506 | Not started | T2 | Browser and device matrix | F-1505 |
| F-1707 | Not started | T1 | USSD simulator tool | F-001 |

### Kiro — 23 tasks

| Task | Status | Priority | Work | Needs |
|---|---|---|---|---|
| F-305 | Blocked | T1 | Hotels and resorts | F-302 |
| F-1001 | Not started | T1 | Farmer home | F-207 |
| F-1002 | Not started | T1 | Deliveries and receipts | F-1001 |
| F-1003 | Not started | T1 | Payables and payments | F-1001 |
| F-1004 | Not started | T1 | USSD help card | F-1001 |
| F-1005 | Not started | T1 | Farmer isolation tests | F-1003 |
| F-1201 | Not started | T2 | Guide profile | F-207 |
| F-1202 | Not started | T1 | Assigned bookings | F-207 |
| F-1203 | Not started | T2 | Guide reviews and payments | F-1202 |
| F-1204 | Not started | T2 | Guide tests | F-1202 |
| F-1301 | Not started | T2 | Admin and authority shell | F-207 |
| F-1302 | Not started | T1 | Approvals queue | F-1301 |
| F-1303 | Not started | T3 | Account status management | F-1301 |
| F-1304 | Not started | T2 | Authority reports | F-1301 |
| F-1305 | Not started | T2 | Role matrix tests | F-1302 |
| F-1601 | Not started | T1 | i18n architecture | F-101 |
| F-1602 | Not started | T1 | English and Amharic strings | F-1601 |
| F-1603 | Not started | T1 | Hamer, Dasenech and Tsamai | F-1601 |
| F-1604 | Not started | T1 | Accessibility pass | F-102 |
| F-1605 | Not started | T2 | Low-literacy design pass | F-1604 |
| F-1606 | Not started | T2 | Locale formatting | F-104, F-1601 |
| F-1704 | Not started | T2 | End-to-end role access | F-207 |
| F-1705 | Not started | T1 | Performance budget | F-101 |

## Agent kickoff messages

Send each agent this document and the repository path. The common instructions are: read AGENTS.md and the current task board, inspect the real API, preserve active claims, use a separate worktree, build only your allocated next-ready task, and provide verification evidence. Do not rebuild already implemented components simply because the phase is unfinished.

- **Antigravity:** “Continue the enterprise lane in `docs/frontend-agent-assignments.md`. Preserve the current F-809 claim, then finish F-810 before starting inventory F-901. You own the remaining FP8/FP9 tasks. Reuse the trace/QR interface supplied by OpenCode and send shared-file changes to Codex for integration.”
- **Codex:** “Own integration and the allocated buyer commerce/review/release tasks. First consolidate existing tested branch work, preserve current enterprise changes, and publish a common baseline. Resolve/coordinate the documented API blockers, then complete payment integration using the existing F-405 flow.”
- **OpenCode:** “Own delivery/provider, public tracking/trace, offline/PWA and simulator tasks in the assignment document. Start F-1101 after claiming it. Keep queues and tracking in your feature areas, validate backend replay semantics, and provide Codex the F-604 route/token handoff.”
- **Kiro:** “Own farmer/guide/admin, languages/accessibility/performance and the existing hotels follow-up in the assignment document. Start F-1001 after claiming it. Reuse F-311 language-switcher work, preserve feature owners' active edits, and coordinate shared i18n/layout/config changes through Codex.”

Allocation check: **17 + 17 + 23 + 23 = 80 unfinished tasks, each assigned exactly once.** This document does not start any of the new agents or claim their tasks.


## Published integration baseline · 2026-10-18

Use `integration/four-agent-baseline` (verified source `d388615`); see [baseline handoff](frontend-integration-baseline.md). It includes primary through `37dc470`, Codex buyer flows, and shared session startup fixes. Frontend 507 tests and backend 140 tests pass; full verification details and prerequisites are in the handoff. Merge/rebase into a saved task branch from a separate worktree; do not switch the shared active checkout.

The allocation above is the original snapshot. At this baseline cutoff, 56/134 features are done, 75 not started and three blocked. F-809/F-810 are complete. Preserve later F-901/F-1001/F-1101 claims and commits; they are outside this baseline. Codex next owns F-601 and the documented payment/order contract blockers.


Codex delivery update · 2026-10-18: F-601 is complete on `integration/four-agent-baseline` / `d0f8ac7` (531 frontend tests; typecheck/lint/build and 360 px payment fixture pass). Next: F-602 checkout-group wiring using the shared payment component. Existing backend ownership/expiry/tracking blockers remain open. Preserve all other active claims.
