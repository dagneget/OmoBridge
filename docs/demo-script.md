# OmoBridge End-to-End Demo Script

## Demo Scenario: "From Honey Hunter to Visitor Table"

### Phase 1: Producer registers harvest via USSD
1. Producer dials `*990#` using the USSD simulator.
2. Selects Amharic language.
3. Submits 15 kg of pure forest honey for pickup in Dimeka.

### Phase 2: Enterprise Aggregation & Traceability QR
1. Local cooperative logs into Enterprise Dashboard.
2. Approves honey batch and assigns batch ID `HB-2026-001`.
3. System generates digital traceability QR code with origin metadata.

### Phase 3: Tourist Experience & Marketplace Order
1. Visitor browses tourism experiences and local artisanal products.
2. Places order for honey jar + books a 1-day guided tour in Turmi.
3. Pays via Telebirr (simulated).

### Phase 4: Delivery Dispatch & Live Tracking
1. Delivery provider accepts transit task from Jinka to Turmi.
2. Real-time updates pushed to visitor's tracking page.
3. Visitor scans QR code to verify honey origin and community contribution.

## TODO
- [ ] Add screenshots and seed data references
- [ ] Document backup plan for offline demo presentation
