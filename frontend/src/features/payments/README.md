# Shared payment flow · F-601

Delivery: `integration/four-agent-baseline` / `d0f8ac7`. Reuses the F-405 `TelebirrPaymentModal`; no separate payment dialog or invented endpoint.

Pass exactly one `bookingId` or `orderId`, the server-provided amount/currency, `isOpen`, `onClose`, and optionally `onPaymentSuccess`. Order flows require the authenticated buyer. The callback runs only after a server booking reads PAID/COMPLETED or the owned order payment reads HELD/RELEASED. Its attempt argument can be absent when a manual refresh confirms settlement after an uncertain request. Do not infer settlement from URL parameters or an attempt's SUCCESS response.

A key in sessionStorage is scoped to buyer and target and survives reopening/remounting in that tab. Retry replays the same key; a definitively failed attempt can therefore replay the same failure. No automatic new charge key is generated. A future new-attempt action needs an explicit backend policy. If sessionStorage is unavailable, the in-memory key survives retries only while the modal remains mounted.

Requests abort on timeout, close, resource switch, or auth-session switch. A ref blocks duplicate submission before React rerenders. Polling uses existing status reads every three seconds for up to 25 seconds; manual refresh restarts verification without a new charge. A timeout means the outcome is uncertain and may still settle. Late responses cannot change the active flow.

Order initiation and status lookup first verify buyer ownership through order detail. This frontend guard does not secure direct API requests: F-508-P1 and payment-attempt ownership/idempotency authorization still need backend enforcement. Reservation expiry (F-506-E1) and buyer tracking (F-508-T1) remain separate blockers. F-602 (`ed05fa1`) now connects per-order checkout payment actions; see [checkout result handoff](../checkout/RESULT_HANDOFF.md).

Verification: 531 frontend tests, typecheck, lint and build pass. Focused payment coverage has 29 tests. Firefox fixture at 360 px checks keyboard focus wrap, pending attempt success, forged URL rejection, manual settlement refresh, one create-attempt call, no overflow, and zero axe violations on the success dialog. Browser evidence uses service fixtures; it does not validate real provider delivery or settlement. The existing backend baseline was 140 passing tests; no backend code changed in F-601.
