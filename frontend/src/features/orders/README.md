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
2. The inspected backend `BuyerPaymentController.getPaymentByOrderId` checks only `isAuthenticated()`, and `PaymentService.getPaymentByOrderId` loads payment by order UUID without verifying its owner. The frontend's preceding order-ownership check limits this page's requests but does not secure direct API access. Backend must enforce payer/order ownership. This is recorded as a security gap; no Java files were changed.

F-508 remains `[!]` pending tracking integration and backend payment authorization. The seven existing `OrderAndCheckoutIntegrationTest` cases include a real cross-buyer order-detail 404 assertion. The frontend adds ownership, account-switch, token-replacement, offline, malformed-response and forged-success tests. MSW lists the supported demo checkout only for the account that created it, uses generated item/history snapshots, and returns payment 404 because checkout alone does not create a payment record.

This work is on isolated branch `feat/my-orders`. During integration, preserve the other agent's additions in the route table and Account page; only the two order routes and navigation links need adding there.
