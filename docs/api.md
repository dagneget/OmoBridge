# OmoBridge REST & Realtime API Specification

## Base URL
- Local: `http://localhost:8080/api/v1`

## Authentication & Authorization
- Token-based authentication (Bearer JWT)
- Role-based access control across the 7 platform actors

## Core Endpoints Overview
- `/auth/**` - Authentication, registration, token refresh
- `/products/**` - Agricultural & handicraft listings, inventory
- `/tourism/**` - Tourism packages, hotel listings, guide profiles
- `/bookings/**` - Experience and accommodation bookings
- `/orders/**` - Purchase orders, fulfillment, lifecycle
- `/delivery/**` - Dispatch, real-time tracking, driver location
- `/traceability/**` - Batch QR codes, origin verification
- `/pricing/**` - Dynamic price calculator, fees, logistics costs
- `/integrations/ussd` - Telecom USSD gateway callback webhook

## TODO
- [ ] Document OpenAPI / Swagger integration (`/swagger-ui.html`)
- [ ] Define request/response payload schemas for USSD webhook
- [ ] Define WebSocket STOMP topic hierarchy for live delivery tracking
