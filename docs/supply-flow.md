# OmoBridge Rural Supply Lifecycle & Value Chain Flow

## Overview
End-to-end operational flow from rural farmer intake to product listing and final consumer traceability in South Omo.

## Lifecycle Stages
1. **Intake & Grading**:
   - Rural producer records supply via USSD (`*990#`) or delivers produce to local enterprise hub (e.g., Dimeka, Turmi).
   - Enterprise quality assessment (moisture level, purity grade, physical weight).
   - Digital intake receipt generated and SMS receipt confirmation dispatched to producer.
2. **Farmer Payout**:
   - Fair-trade baseline price calculated using real-time market rates and quality tier.
   - Payout scheduled or directly credited via Telebirr mobile wallet.
   - Payout history recorded for transparent cooperative accounting.
3. **Processing & Lot Transformation**:
   - Raw supply lots aggregated into processing batches (e.g., honey filtration, jar bottling, coffee sorting).
   - Batch numbers generated and linked to contributing farmers/lots.
   - Inventory levels automatically updated in `inventory/finished_stock`.
4. **Marketplace Listing**:
   - Packaged goods listed in enterprise product catalog.
   - Price breakdown calculated including aggregation costs, delivery buffer, and cooperative margins.
   - Digital QR traceability code linked to batch and made available on packaging.

## TODO
- [ ] Define REST API endpoints for intake receipt generation
- [ ] Map USSD supply prompt choices to backend intake queues
- [ ] Implement batch QR code generator linking batch IDs to farmer collective metadata
