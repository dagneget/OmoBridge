# OmoBridge Role & Permission Matrix

This document defines the Role-Based Access Control (RBAC) architecture and endpoint permission matrix for OmoBridge.

---

## 1. System Roles

| Role | Spring Security Identifier | Scope & Intent |
|---|---|---|
| **Buyer / Visitor** | `ROLE_BUYER_VISITOR` | Consumers, tourists, restaurants, and wholesale buyers who purchase agricultural products, book community tourism experiences, pay online, track deliveries, and write verified reviews. |
| **Producer / Farmer** | `ROLE_PRODUCER_FARMER` | Smallholder farmers in South Omo villages (Hamer, Banna, Ari, Dassanech, Karo, Nyangatom) delivering raw harvest to community micro-enterprises and tracking payments via USSD/SMS or portal. |
| **Micro-Enterprise** | `ROLE_MICRO_ENTERPRISE` | Community cooperatives and processing centers managing farmer intake, quality inspection, inventory lots, production batches, retail product catalog, price breakdowns, and order fulfillment. |
| **Delivery Provider** | `ROLE_DELIVERY_PROVIDER` | Local drivers, motorcyclists, and transport cooperatives accepting delivery assignments and dispatching real-time SMS/web GPS checkpoints. |
| **Tour Guide** | `ROLE_TOUR_GUIDE` | Certified local cultural guides receiving tourism booking assignments and hosting eco/cultural tours. |
| **Tourism Authority** | `ROLE_TOURISM_AUTHORITY` | South Omo zonal tourism officials overseeing certified experiences, guide accreditations, and community tourism levies. |
| **System Admin** | `ROLE_SYSTEM_ADMIN` | Platform administrators managing platform fees, enterprise verification, global audit trails, system health, and reconciliation. |

---

## 2. Endpoint Authorization Matrix

### A. Authentication & User Profile
| Endpoint | Method | Permitted Roles | Notes |
|---|---|---|---|
| `/api/v1/auth/register` | POST | Public | Self-registration |
| `/api/v1/auth/login` | POST | Public | JWT issuance |
| `/api/v1/auth/refresh` | POST | Authenticated | Token rotation |
| `/api/v1/users/me` | GET | Authenticated | Current user profile |
| `/api/v1/users/me` | PUT | Authenticated | Profile updates |
| `/api/v1/admin/users/**` | ANY | `SYSTEM_ADMIN` | User administration & status |

### B. Farmer Supply & Intake
| Endpoint | Method | Permitted Roles | Notes |
|---|---|---|---|
| `/api/v1/supply/deliveries` | POST | `MICRO_ENTERPRISE`, `SYSTEM_ADMIN` | Record new farmer harvest delivery |
| `/api/v1/supply/deliveries/{id}/inspect` | POST | `MICRO_ENTERPRISE`, `SYSTEM_ADMIN` | Inspect, accept/reject, generate payable & lot |
| `/api/v1/supply/payables` | GET | `MICRO_ENTERPRISE`, `SYSTEM_ADMIN` | View enterprise payables |
| `/api/v1/supply/payments/farmer` | POST | `MICRO_ENTERPRISE`, `SYSTEM_ADMIN` | Disburse payment to farmer |
| `/api/v1/supply/farmer/deliveries` | GET | `PRODUCER_FARMER` | Farmer self-service delivery log |
| `/api/v1/supply/farmer/balance` | GET | `PRODUCER_FARMER` | Farmer self-service payable balance |

### C. Inventory & Warehousing
| Endpoint | Method | Permitted Roles | Notes |
|---|---|---|---|
| `/api/v1/inventory/lots` | GET | `MICRO_ENTERPRISE`, `SYSTEM_ADMIN` | Filtered by enterprise ownership |
| `/api/v1/inventory/lots/{id}/adjust` | POST | `MICRO_ENTERPRISE`, `SYSTEM_ADMIN` | Wastage/gain adjustments |
| `/api/v1/inventory/lots/{id}/transfer` | POST | `MICRO_ENTERPRISE`, `SYSTEM_ADMIN` | Location movement |
| `/api/v1/inventory/reconciliation` | GET | `MICRO_ENTERPRISE`, `SYSTEM_ADMIN` | Stock balance reconciliation report |

### D. Production Batches & Traceability
| Endpoint | Method | Permitted Roles | Notes |
|---|---|---|---|
| `/api/v1/batches` | POST | `MICRO_ENTERPRISE`, `SYSTEM_ADMIN` | Create batch & consume inventory |
| `/api/v1/batches/{id}/complete` | POST | `MICRO_ENTERPRISE`, `SYSTEM_ADMIN` | Mark batch complete |
| `/api/v1/trace/{publicToken}` | GET | Public | Consumer QR scan and provenance story |
| `/api/v1/trace/validate` | POST | Public | Cryptographic QR code verification |

### E. Products & Catalog
| Endpoint | Method | Permitted Roles | Notes |
|---|---|---|---|
| `/api/v1/products` | GET | Public | Filtered to published products |
| `/api/v1/products/{id}` | GET | Public | Product details & price breakdown |
| `/api/v1/products` | POST | `MICRO_ENTERPRISE`, `SYSTEM_ADMIN` | Enterprise catalog management |
| `/api/v1/products/{id}` | PUT | `MICRO_ENTERPRISE`, `SYSTEM_ADMIN` | Updates checked for ownership |

### F. Orders & Checkout
| Endpoint | Method | Permitted Roles | Notes |
|---|---|---|---|
| `/api/v1/checkout` | POST | `BUYER_VISITOR`, `SYSTEM_ADMIN` | Multi-vendor checkout & stock reservation |
| `/api/v1/orders/{id}` | GET | Authenticated | Buyer (own order), Enterprise (own order), Admin |
| `/api/v1/orders/buyer` | GET | `BUYER_VISITOR` | Buyer order history |
| `/api/v1/orders/enterprise` | GET | `MICRO_ENTERPRISE` | Enterprise order fulfillment queue |

### G. Tourism Experiences & Bookings
| Endpoint | Method | Permitted Roles | Notes |
|---|---|---|---|
| `/api/v1/experiences` | GET | Public | Active experiences |
| `/api/v1/experiences` | POST | `MICRO_ENTERPRISE`, `TOURISM_AUTHORITY`, `SYSTEM_ADMIN` | Manage experience listings |
| `/api/v1/bookings` | POST | `BUYER_VISITOR`, `SYSTEM_ADMIN` | Book cultural tour / experience |
| `/api/v1/bookings/my` | GET | `BUYER_VISITOR` | Buyer booking history |
| `/api/v1/bookings/{id}/assign` | POST | `MICRO_ENTERPRISE`, `SYSTEM_ADMIN` | Assign certified tour guide |
| `/api/v1/bookings/guide` | GET | `TOUR_GUIDE` | Guide booking schedule |

### H. Payments & Gateway Integrations
| Endpoint | Method | Permitted Roles | Notes |
|---|---|---|---|
| `/api/v1/payments/attempt` | POST | `BUYER_VISITOR`, `SYSTEM_ADMIN` | Initiate Telebirr/CBE Birr payment |
| `/api/v1/integrations/payments/{provider}/webhook` | POST | Public (Webhook Auth) | HMAC signature verified |
| `/api/v1/payments/enterprise/ledger` | GET | `MICRO_ENTERPRISE`, `SYSTEM_ADMIN` | Settlement and community fund ledger |

### I. Delivery & Tracking
| Endpoint | Method | Permitted Roles | Notes |
|---|---|---|---|
| `/api/v1/delivery/jobs` | POST | `MICRO_ENTERPRISE`, `SYSTEM_ADMIN` | Create and assign delivery job |
| `/api/v1/delivery/provider/jobs` | GET | `DELIVERY_PROVIDER` | Driver job list |
| `/api/v1/delivery/provider/jobs/{id}/status` | PUT | `DELIVERY_PROVIDER` | Update status (PICKED_UP, DELIVERED) |
| `/api/v1/delivery/provider/jobs/{id}/location` | POST | `DELIVERY_PROVIDER` | Driver GPS coordinate ping |
| `/api/v1/tracking/{token}` | GET | Public | Real-time map & status timeline |

### J. Offline Integrations (SMS & USSD)
| Endpoint | Method | Permitted Roles | Notes |
|---|---|---|---|
| `/api/v1/integrations/sms/inbound` | POST | Public (Shared Secret) | SMS driver checkpoints & farmer balance |
| `/api/v1/integrations/ussd` | POST | Public (Gateway Auth) | Interactive USSD menu (*844#) |

### K. Reviews & Feedback
| Endpoint | Method | Permitted Roles | Notes |
|---|---|---|---|
| `/api/v1/reviews` | POST | `BUYER_VISITOR` | Only verified delivered orders / completed bookings |
| `/api/v1/reviews/target` | GET | Public | Public ratings and verified buyer reviews |

### L. AI & Impact Reporting
| Endpoint | Method | Permitted Roles | Notes |
|---|---|---|---|
| `/api/v1/enterprise/reports/impact` | GET | `MICRO_ENTERPRISE`, `SYSTEM_ADMIN` | Smallholder farmer impact metrics |
| `/api/v1/enterprise/reports/ai-narrative` | POST | `MICRO_ENTERPRISE`, `SYSTEM_ADMIN` | AI ESG impact narrative report generation |

---

## 3. Enterprise Ownership Filtering Policy

For all enterprise-scoped endpoints (`/api/v1/supply/**`, `/api/v1/inventory/**`, `/api/v1/batches/**`, `/api/v1/enterprise/reports/**`):
1. The authenticated user must possess `ROLE_MICRO_ENTERPRISE` or `ROLE_SYSTEM_ADMIN`.
2. Services verify that the target `enterprise_id` matches the enterprise owned by the authenticated user, or that the user is an active staff member of that enterprise.
3. Access to another enterprise's records raises `ForbiddenException (HTTP 403)`.
