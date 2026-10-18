# OmoBridge REST & Realtime API Specification

## 1. Base URL & Interactive Documentation
- API Base URL: `http://localhost:8080/api/v1`
- Swagger UI: `http://localhost:8080/swagger-ui/index.html`
- OpenAPI Specification JSON: `http://localhost:8080/v3/api-docs`

## 2. Authentication & Authorization
- **Mechanism**: Bearer JWT in `Authorization` header (`Authorization: Bearer <jwt-token>`).
- **Standard Roles**:
  - `ROLE_BUYER_VISITOR`
  - `ROLE_PRODUCER_FARMER`
  - `ROLE_MICRO_ENTERPRISE`
  - `ROLE_DELIVERY_PROVIDER`
  - `ROLE_TOUR_GUIDE`
  - `ROLE_TOURISM_AUTHORITY`
  - `ROLE_SYSTEM_ADMIN`

## 3. Standard Envelope & Error Contracts

### Successful Response Format (`ApiResponse<T>`)
```json
{
  "success": true,
  "message": "Resource created successfully",
  "data": { ... },
  "timestamp": "2026-10-18T01:25:00Z"
}
```

### Pagination Response Format (`PageResponse<T>`)
```json
{
  "content": [ ... ],
  "pageNumber": 0,
  "pageSize": 20,
  "totalElements": 150,
  "totalPages": 8,
  "isFirst": true,
  "isLast": false
}
```

### Error Response Format (`ErrorResponse`)
```json
{
  "timestamp": "2026-10-18T01:25:00Z",
  "status": 400,
  "error": "Bad Request",
  "code": "VALIDATION_FAILED",
  "message": "Invalid input parameters",
  "path": "/api/v1/orders",
  "fieldErrors": [
    {
      "field": "quantity",
      "message": "must be greater than 0",
      "rejectedValue": -1
    }
  ]
}
```

---

## 4. Endpoint Specifications by Module

### A. Authentication & User Onboarding (`/api/v1/auth/**`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/v1/auth/register/buyer` | Public | Register a buyer/visitor account |
| `POST` | `/api/v1/auth/register/producer` | Public | Register a smallholder farmer (status PENDING, generates `farmer_code`) |
| `POST` | `/api/v1/auth/register/enterprise` | Public | Register a cooperative/micro-enterprise (status PENDING) |
| `POST` | `/api/v1/auth/register/delivery-provider` | Public | Register a delivery vehicle/driver (status PENDING) |
| `POST` | `/api/v1/auth/register/guide` | Public | Register a cultural tour guide (status PENDING) |
| `POST` | `/api/v1/auth/login` | Public | Authenticate with phone/email + password; returns JWT with roles |
| `GET` | `/api/v1/auth/me` | Authenticated | Retrieve current user profile and linked entity records |

### B. Enterprise Farmer Management & Approvals (`/api/v1/enterprises/{id}/farmers/**`, `/api/v1/admin/**`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/v1/enterprises/{id}/farmers` | `MICRO_ENTERPRISE`, `SYSTEM_ADMIN` | List affiliated farmers |
| `PATCH` | `/api/v1/enterprises/{id}/farmers/{farmerId}/approve` | `MICRO_ENTERPRISE` | Approve & verify farmer |
| `PATCH` | `/api/v1/enterprises/{id}/farmers/{farmerId}/reject` | `MICRO_ENTERPRISE` | Reject farmer registration |
| `PATCH` | `/api/v1/admin/delivery-providers/{id}/approve` | `SYSTEM_ADMIN` | Approve delivery driver |
| `PATCH` | `/api/v1/admin/guides/{id}/approve` | `SYSTEM_ADMIN`, `TOURISM_AUTHORITY` | Accredit tour guide |
| `PATCH` | `/api/v1/admin/enterprises/{id}/approve` | `SYSTEM_ADMIN` | Approve community enterprise |

### C. Farmer Supply Intake & Payouts (`/api/v1/enterprises/{id}/supply/**`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/v1/enterprises/{id}/supply/deliveries` | `MICRO_ENTERPRISE` | Record farmer crop intake |
| `POST` | `/api/v1/enterprises/{id}/supply/deliveries/{deliveryId}/inspect` | `MICRO_ENTERPRISE` | Inspect delivery, set accepted/rejected qty, create payable and lot |
| `GET` | `/api/v1/enterprises/{id}/supply/deliveries` | `MICRO_ENTERPRISE` | List intake deliveries with status filter |
| `GET` | `/api/v1/enterprises/{id}/supply/payables` | `MICRO_ENTERPRISE` | List farmer payables |
| `POST` | `/api/v1/enterprises/{id}/supply/payments/farmer` | `MICRO_ENTERPRISE` | Disburse mobile money payment (Telebirr) to farmer |
| `GET` | `/api/v1/supply/farmer/deliveries` | `PRODUCER_FARMER` | Farmer self-service delivery history |
| `GET` | `/api/v1/supply/farmer/balance` | `PRODUCER_FARMER` | Farmer self-service outstanding balance |

### D. Raw & Processed Inventory (`/api/v1/enterprises/{id}/inventory/**`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/v1/enterprises/{id}/inventory/lots` | `MICRO_ENTERPRISE` | List active lots with balance |
| `POST` | `/api/v1/enterprises/{id}/inventory/lots/{lotId}/adjust` | `MICRO_ENTERPRISE` | Adjust lot balance for shrinkage/spoilage/audit |
| `POST` | `/api/v1/enterprises/{id}/inventory/lots/{lotId}/transfer` | `MICRO_ENTERPRISE` | Transfer lot between warehouse storage locations |
| `GET` | `/api/v1/enterprises/{id}/inventory/reconciliation` | `MICRO_ENTERPRISE` | Reconciliation report across received, consumed, and balance |

### E. Production Batches & Consumer Provenance (`/api/v1/enterprises/{id}/production/**`, `/api/v1/trace/**`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/v1/enterprises/{id}/production/batches` | `MICRO_ENTERPRISE` | Create batch, validate mass balance, consume lots |
| `POST` | `/api/v1/enterprises/{id}/production/batches/{batchId}/complete` | `MICRO_ENTERPRISE` | Finalize batch and generate QR token |
| `GET` | `/api/v1/trace/{publicToken}` | Public | Consumer QR scan: batch story, smallholder farmer origins, audit trail |
| `GET` | `/api/v1/trace/{publicToken}/qr.png` | Public | Generates dynamic 300x300 PNG QR code |
| `POST` | `/api/v1/trace/validate` | Public | Validates authenticity of package QR code |

### F. Product Catalog & Transparent Pricing (`/api/v1/products/**`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/v1/products` | Public | Filtered catalog with search, category, enterprise, and pagination |
| `GET` | `/api/v1/products/{id}` | Public | Detailed product view with full cost/margin breakdown |
| `POST` | `/api/v1/enterprises/{id}/products` | `MICRO_ENTERPRISE` | Create new retail product SKU |
| `PUT` | `/api/v1/enterprises/{id}/products/{productId}` | `MICRO_ENTERPRISE` | Update product attributes, price, stock |

### G. Checkout & Orders (`/api/v1/checkout/**`, `/api/v1/orders/**`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/v1/checkout` | `BUYER_VISITOR`, `SYSTEM_ADMIN` | Multi-vendor atomic checkout, stock reservation (15m TTL), idempotency |
| `GET` | `/api/v1/orders/{orderId}` | Authenticated | Order detail and status lifecycle |
| `GET` | `/api/v1/orders/buyer` | `BUYER_VISITOR` | Buyer purchase history |
| `GET` | `/api/v1/enterprises/{id}/orders` | `MICRO_ENTERPRISE` | Enterprise fulfillment order list |
| `PATCH` | `/api/v1/enterprises/{id}/orders/{orderId}/status` | `MICRO_ENTERPRISE` | Transition order status (PACKED, IN_TRANSIT, DELIVERED) |

### H. Tourism Experiences & Bookings (`/api/v1/tourism/**`, `/api/v1/bookings/**`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/v1/tourism/experiences` | Public | Search cultural & eco tours |
| `GET` | `/api/v1/tourism/experiences/{id}` | Public | Experience detail, schedule, pricing |
| `POST` | `/api/v1/bookings` | `BUYER_VISITOR` | Book experience session with capacity concurrency lock |
| `GET` | `/api/v1/bookings/my` | `BUYER_VISITOR` | Buyer booking history |
| `POST` | `/api/v1/bookings/{id}/assign-guide` | `MICRO_ENTERPRISE`, `SYSTEM_ADMIN` | Assign certified local guide |
| `GET` | `/api/v1/bookings/guide` | `TOUR_GUIDE` | Assigned tours for authenticated guide |

### I. Digital Payments & Gateways (`/api/v1/payments/**`, `/api/v1/integrations/payments/**`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/v1/payments/attempt` | `BUYER_VISITOR`, `SYSTEM_ADMIN` | Create idempotent payment attempt (Telebirr/CBE Birr) |
| `POST` | `/api/v1/integrations/payments/{provider}/webhook` | Public (Signature Auth) | Ingest verified HMAC payment gateway callback |
| `POST` | `/api/v1/enterprises/{id}/payments/{paymentId}/refund` | `MICRO_ENTERPRISE`, `SYSTEM_ADMIN` | Issue partial or full refund |
| `GET` | `/api/v1/enterprises/{id}/payments/reconciliation` | `MICRO_ENTERPRISE`, `SYSTEM_ADMIN` | Settlement and community fund ledger report |

### J. Dispatch & Real-Time Delivery (`/api/v1/delivery/**`, `/api/v1/tracking/**`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/v1/delivery/jobs` | `MICRO_ENTERPRISE`, `SYSTEM_ADMIN` | Create delivery job and assign to verified driver |
| `GET` | `/api/v1/delivery/provider/jobs` | `DELIVERY_PROVIDER` | Driver active and completed jobs |
| `PUT` | `/api/v1/delivery/provider/jobs/{id}/status` | `DELIVERY_PROVIDER` | Update job checkpoint (PICKED_UP, DELIVERED) |
| `POST` | `/api/v1/delivery/provider/jobs/{id}/location` | `DELIVERY_PROVIDER` | Driver GPS ping (lat, lon, speed, heading) |
| `GET` | `/api/v1/tracking/{token}` | Public | Real-time map coordinates and status timeline |

### K. Notifications & Offline Gateways (SMS & USSD) (`/api/v1/integrations/**`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/v1/integrations/sms/inbound` | Public (Secret Auth) | Inbound SMS driver checkpoints & farmer balance |
| `POST` | `/api/v1/integrations/ussd` | Public (Gateway Auth) | Interactive USSD menu (*844#) in Amharic & English |
| `GET` | `/api/v1/notifications/my` | Authenticated | In-app user notifications |
| `PATCH` | `/api/v1/notifications/{id}/read` | Authenticated | Mark notification read |

### L. Customer Reviews (`/api/v1/reviews/**`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/v1/reviews` | `BUYER_VISITOR` | Submit verified review (requires DELIVERED order or COMPLETED booking) |
| `GET` | `/api/v1/reviews/target` | Public | List reviews and average ratings for product or experience |

### M. AI & Smallholder Impact Reporting (`/api/v1/enterprise/reports/**`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/v1/enterprise/reports/impact` | `MICRO_ENTERPRISE`, `SYSTEM_ADMIN` | Impact metrics: active farmers, disbursed ETB, order volume |
| `POST` | `/api/v1/enterprise/reports/ai-narrative` | `MICRO_ENTERPRISE`, `SYSTEM_ADMIN` | AI ESG impact narrative generated by Claude AI client |
