# Shared payment flow · F-601

Delivery: `integration/four-agent-baseline` / `d0f8ac7`. Reuses the F-405 `TelebirrPaymentModal`; no separate payment dialog or invented endpoint.

Pass exactly one `bookingId` or `orderId`, the server-provided amount/currency, `isOpen`, `onClose`, and optionally `onPaymentSuccess`. Order flows require the authenticated buyer. The callback runs only after a server booking reads PAID/COMPLETED or the owned order payment reads HELD/RELEASED. Its attempt argument can be absent when a manual refresh confirms settlement after an uncertain request. Do not infer settlement from URL parameters or an attempt's SUCCESS response.

A key in sessionStorage is scoped to buyer and target and survives reopening/remounting in that tab. Retry replays the same key; a definitively failed attempt can therefore replay the same failure. No automatic new charge key is generated. A future new-attempt action needs an explicit backend policy. If sessionStorage is unavailable, the in-memory key survives retries only while the modal remains mounted.

Requests abort on timeout, close, resource switch, or auth-session switch. A ref blocks duplicate submission before React rerenders. Polling uses existing status reads every three seconds for up to 25 seconds; manual refresh restarts verification without a new charge. A timeout means the outcome is uncertain and may still settle. Late responses cannot change the active flow.

Order initiation and status lookup first verify buyer ownership through order detail. F-603 (`0f8ce5f`) now enforces payer/order ownership on backend payment reads, resolving F-508-P1 on this branch. Payment-attempt ownership/idempotency authorization remains a separate backend review item. Reservation expiry (F-506-E1) and buyer tracking (F-508-T1) remain separate blockers. F-602 (`ed05fa1`) now connects per-order checkout payment actions; see [checkout result handoff](../checkout/RESULT_HANDOFF.md).

Verification: 531 frontend tests, typecheck, lint and build pass. Focused payment coverage has 29 tests. Firefox fixture at 360 px checks keyboard focus wrap, pending attempt success, forged URL rejection, manual settlement refresh, one create-attempt call, no overflow, and zero axe violations on the success dialog. Browser evidence uses service fixtures; it does not validate real provider delivery or settlement. The existing backend baseline was 140 passing tests; no backend code changed in F-601.


## F-603 own-payment history and receipts

Delivery: `0f8ce5f` on `integration/four-agent-baseline`. Account navigation links to `/account/payments`; each record opens `/account/payments/:id`. The list uses `GET /api/v1/payments?page=0&size=20`, a real bounded `PageResponse<PaymentResponse>` filtered by authenticated payer. Default ordering is newest timestamp then ID; size is capped at 100, and only createdAt/id sorting is accepted. Receipt reads use `GET /api/v1/payments/{paymentId}` with the same payer predicate. Existing `GET /payments/order/{orderId}` now requires both matching payer and order buyer, resolving F-508-P1 on this branch. Foreign/unavailable receipts return 404. No payer filter is accepted from the client.

Types are generated from the isolated backend OpenAPI document. No migration or manual generated-type edit was required. Repository history/receipt fetch plans include only to-one order/booking relations; the mixed-target PostgreSQL pagination test proves at most two service SQL statements. This budget excludes controller authentication lookup. The existing payer index is retained; no production-scale latency claim is made.

Only HELD/RELEASED records are presented as settled receipts. Pending, failed and refunded states remain payment records, with printing disabled; query parameters cannot change this. The view displays server amount/currency/reference/time and the matching order or booking link, without inventing gateway references, tax invoices, or refund amounts. The print action also requires a fresh online result. English/Amharic strings are feature-scoped.

Private query keys use buyer/session revision; account/token changes abort and purge prior requests, and records are removed after unmount (`gcTime: 0`). No payment history is persisted to storage; existing payment API NetworkOnly worker rules still apply. The fixed MSW history is demonstration data and does not simulate provider settlement.

Verification: 583 frontend tests, typecheck/lint/build; 156 backend tests and final 20 focused payment checks; Firefox at 360 px covers account/history/receipt keyboard navigation, print eligibility, offline/reconnect, foreign receipt rejection, no overflow and zero receipt-section axe violations. No physical-device or real financial transaction verification. Existing inspection and bundle warnings remain. F-606 owns refund amounts/status detail; F-506 expiry, buyer tracking, and payment-attempt authorization/idempotency remain separate follow-ups.
