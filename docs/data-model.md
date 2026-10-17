# OmoBridge Domain Data Model

## Overview
Entity relationship design and core data schemas connecting rural producers, micro-enterprises, inventory lots, products, tourism packages, and orders across South Omo.

## Core Entities
1. **User & Identity**:
   - `User`, `Role` (PRODUCER, ENTERPRISE, DELIVERY, BUYER, GUIDE, TOURISM_OFFICE, ADMIN)
   - `UserProfile`, `Enterprise`
2. **Supply & Farmer Intake**:
   - `Farmer` (cooperative member, village, contact, payment account)
   - `SupplyRecord` (farmerId, commodityType, rawQuantity, grade, intakeDate, unitPrice, totalAmountPaid)
   - `IntakeReceipt` (receiptNumber, status, digitalSignature/SMS acknowledgment)
3. **Inventory & Processing**:
   - `RawLot` (originating supply records, storage location)
   - `ProcessingBatch` (processingDate, transformationLoss, outputQuantity, batchNumber)
   - `FinishedStock` (available units, packagingType, expirationDate)
4. **Products & Catalog**:
   - `Product` (title, description, batchId, price, photos, originMetadata)
   - `Category` (Honey, Coffee, Spices, Moringa, Handicrafts)
5. **Orders & Payments**:
   - `Order`, `OrderItem`, `DeliveryJob`
   - `PaymentTransaction` (Telebirr reference, escrow status, farmer payout record)
6. **Tourism & Experiences**:
   - `TourismPackage`, `Hotel`, `TourGuide`, `Booking`
7. **Traceability**:
   - `TraceabilityCode` (batch QR, origin village, harvest date, farmer collective)

## TODO
- [ ] Define JPA entity class annotations and relation mappings (`@Entity`, `@ManyToOne`, `@OneToMany`)
- [ ] Map PostgreSQL foreign key constraints and Flyway migration scripts
- [ ] Add Mermaid ER diagram illustrating Supply -> Inventory -> Product relationships
