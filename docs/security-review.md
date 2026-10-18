# OmoBridge Security & Hardening Review

## 1. Executive Summary
This document records the security architecture, audit findings, and hardening configurations implemented across the OmoBridge platform (Phases P0–P13).

---

## 2. Authentication & Credential Security
- **Password Storage**: Passwords are saved exclusively as salted hashes using `BCryptPasswordEncoder` (work factor 10). Plaintext passwords are never logged or stored.
- **Session Model**: Fully stateless via signed HMAC-SHA256 JWT tokens. No session state or cookies are stored on the server.
- **Brute Force Protection**: Implemented `LoginAttemptService` tracking consecutive failed logins per IP/identifier with exponential backoff and temporary lockouts.
- **Role-Based Access Control**: All controllers leverage Spring Security `@PreAuthorize("hasRole(...)")` or explicit role/ownership checks in services.

---

## 3. Data Protection & Privacy (PII)
- **Phone Number Masking**: Implemented `LogMaskingUtil` and `NotificationService.maskPhone()` to prevent customer/farmer phone numbers from appearing in plain text in logs (`+2519****20`).
- **Traceability Data Privacy**: In `ProductionBatch` and `TraceRecord`, smallholder farmer names can be pseudonymized or hidden via the `showFarmerNames` toggle to protect rural community members.

---

## 4. API & Integration Security
- **Payment Webhook Verification**: In `PaymentService` and `PaymentWebhookController`, incoming callbacks (Telebirr, CBE Birr) are rejected with `HTTP 422 Unprocessable Entity` if the cryptographic HMAC signature (`X-Signature`) does not match the shared secret.
- **Inbound SMS Anti-Spoofing**: In `InboundSmsService`, incoming SMS messages are validated against the webhook secret AND the sender's phone number is verified to match the assigned delivery provider's registered phone before updating any delivery job status.
- **Idempotency Defense**: In both checkout and payment attempt endpoints, unique idempotency keys (`X-Idempotency-Key` / `idempotencyKey`) prevent duplicate order creation and multiple payment gateway charges.
- **Capacity & Stock Concurrency**: Pessimistic database locking (`@Lock(LockModeType.PESSIMISTIC_WRITE)`) on `ExperienceSession` and `Product` prevents overselling and race conditions under heavy concurrent bookings/orders.

---

## 5. Network & Infrastructure
- **CORS Configuration**: Restricts origin to known client domains (e.g. `http://localhost:5173` in development) with explicit allowed methods and headers.
- **CSRF**: Disabled on REST endpoints because the architecture is stateless Bearer token authenticated and does not use ambient cookie credentials.
- **Database Security**: All queries are parameterized via Spring Data JPA and Hibernate, preventing SQL injection vulnerabilities. `ddl-auto: validate` is strictly enforced with zero automatic schema alteration at runtime.

---

## 6. Pre-Production Checklist
1. Replace default JWT secret in environment variables with a 256-bit high-entropy secret.
2. Configure external SMS gateway TLS certificates and rotating webhook secrets.
3. Enable HTTPS / TLS 1.3 termination at reverse proxy / load balancer.
4. Establish separate database users with restricted DDL permissions for runtime execution vs migration deployment.
