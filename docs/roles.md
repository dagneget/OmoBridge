# OmoBridge Platform Roles & Permissions

The system defines 7 core actors:

1. **Producer / Farmer**:
   - Rural producers (honey, coffee, spices, crafts).
   - Primary channel: USSD (*990#), SMS, and simplified PWA.
   - Permissions: Register inventory, view market prices, record sales, accept collection requests.

2. **Micro-enterprise**:
   - Local aggregators, cooperatives, and small businesses in towns (Jinka, Turmi).
   - Permissions: Bulk purchasing, inventory packaging, QR batch tagging, order fulfillment, enterprise dashboard.

3. **Delivery Provider**:
   - Local transporters, motorcycle couriers, truck logistics.
   - Permissions: Accept delivery jobs, update transit status, broadcast live GPS location.

4. **Buyer / Visitor**:
   - Tourists, travelers, domestic and international retail buyers.
   - Permissions: Browse products/experiences, cart & checkout, booking, order tracking, traceability inspection.

5. **Tour Guide**:
   - Certified local community guides.
   - Permissions: Profile management, experience listings, availability calendar, accept booking requests.

6. **Tourism Office / Authority**:
   - Regional tourism boards and cultural preservation offices.
   - Permissions: Verify guides/hotels, view regional tourism analytics, cultural compliance auditing.

7. **System Administrator**:
   - Technical administrators.
   - Permissions: System configuration, user management, audit logs, service health monitoring.

## TODO
- [ ] Define Spring Security role names (e.g. `ROLE_PRODUCER`, `ROLE_ENTERPRISE`, etc.)
- [ ] Map fine-grained permission matrix to API endpoints and frontend route guards
