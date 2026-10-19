# My orders (F-508)

The authenticated `/account/orders` and `/account/orders/:id` routes render thin account pages backed by `features/orders`. Entry links are available on Account and the checkout result. All authenticated backend roles are accepted; the backend scopes records to the current buyer. Cancel controls remain F-509, and payment initiation remains the shared payment integration.

The service uses generated OpenAPI aliases and only the existing endpoints:

- `GET /api/v1/orders`: current-buyer array, without invented pagination/filter parameters.
- `GET /api/v1/orders/{id}`: detail must match the requested UUID and authenticated buyer before any private fields render.
- `GET /api/v1/payments/order/{id}`: queried only after the parent order has passed ownership verification. The returned payment must match that order and use a generated-contract status. A missing payment record is not called unpaid, and URL query parameters cannot claim success.

The detail renders server item snapshots, SKU, unit price, fractional quantity and line total, the existing price breakdown, chronological server status events, delivery address/phone/notes and a separate payment state. It never loads current catalog names or calculates totals. Text is English/Amharic with selected language → Amharic → English fallback. Routes focus the page heading; controls are at least 44 px. List/detail each have loading, empty/error and offline output. Payment failure does not hide a verified order.

Private queries use buyer ID plus an in-memory session revision, `gcTime: 0`, and abort signals. Account/token changes move to a new scope; cleanup removes only old scopes so it cannot cancel a newly opened account's request. Responses from a previous token/user cannot publish into the new session. Logout clears private queries. Private API responses stay NetworkOnly under the existing built service-worker rules; no order or payment data is persisted to storage. Offline output is limited to a mounted view's last loaded data; reopening a private page offline may require reconnecting.

## Integration blockers

1. Neither the live order DTO nor a buyer-visible mapping endpoint exposes the delivery tracking token. The delivery-job API is for enterprise/provider workflows and must not be scanned from the buyer screen. The page reports that tracking is unavailable; no token, endpoint or link is invented. Backend should expose a buyer-authorized tracking reference, regenerate types, then wire the existing `/track/:token` route.
2. Resolved by F-603 (`0f8ce5f`) on `integration/four-agent-baseline`: backend order-payment lookup now requires both the authenticated payer and matching order buyer. Direct foreign access returns 404, including an inconsistent payment owned by another payer. Adopt that commit before claiming this authorization fix in another branch. Payment-attempt authorization/idempotency remains a separate follow-up.

F-508 remains `[!]` pending buyer tracking integration; backend payment-read authorization is resolved by F-603. The seven existing `OrderAndCheckoutIntegrationTest` cases include a real cross-buyer order-detail 404 assertion. The frontend adds ownership, account-switch, token-replacement, offline, malformed-response and forged-success tests. MSW lists the supported demo checkout only for the account that created it, uses generated item/history snapshots, and returns payment 404 because checkout alone does not create a payment record.

This work is on isolated branch `feat/my-orders`. During integration, preserve the other agent's additions in the route table and Account page; only the two order routes and navigation links need adding there.


## F-509 buyer cancellation

Delivery: `c45cf04` on `integration/four-agent-baseline`. `CancelOrder` is mounted in verified owned order detail, keyed by auth-session revision and order ID. The existing `POST /api/v1/orders/{id}/cancel` accepts no request body; its generated response contract is reused. The current backend permits PLACED, PAID, PACKED and IN_TRANSIT cancellation; DELIVERED and CANCELLED are terminal. The UI follows this policy without inventing extra rules. Tracking is independent of cancellation.

The buyer opens a confirmation panel and explicitly confirms, or keeps the order. Focus moves to confirmation and returns to the initial action when keeping it. Synchronous request locking blocks duplicate clicks. Offline, unverified and foreign views cannot submit. The POST is never queued or automatically retried. After a failed/uncertain response, a successful explicit GET refresh is required before another confirmation. Aborting a local request discards its response; it does not prove the server rolled back the cancellation.

Only a successful envelope with the requested order ID, current buyer, valid detail fields and CANCELLED status can update the exact order-detail cache. Existing in-flight detail reads are cancelled before that update, preventing an older PLACED response from overwriting cancellation. Buyer-list and current-order payment data are invalidated; other orders are never marked cancelled. Session/token changes and unmounts discard late responses.

Cancellation and refunds remain separate. The UI preserves server payment/refund statuses and explains that cancellation does not confirm a money return. F-606 shows recorded refund amounts where available; missing payment/refund reads remain unknown. Backend tests verify held-stock release and that cancelling a paid order does not automatically change its RELEASED payment or create a refund. No backend production code or API schema changed in F-509.

Verification: 638 frontend tests across 73 files; typecheck/lint/build pass. The focused cancellation/contract/order regression run has 48 cases included in that suite. All 15 PostgreSQL order tests pass, including eight new cancellation cases. Firefox at 360 px covers keyboard confirmation/keep, restored focus, offline blocking, server-backed cancellation, unchanged partial refund, server refresh, no overflow and zero order-section axe violations. The fixed MSW example is a past paid order, separate from the unpaid checkout demo. Tests do not perform live customer cancellation or real financial transactions. Existing inspection/bundle warnings remain.
