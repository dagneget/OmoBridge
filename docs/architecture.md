# OmoBridge System Architecture

## Overview
OmoBridge is a dual-channel digital platform connecting rural producers, micro-enterprises, tourists, and service providers in South Omo, Ethiopia.

## Architectural Components
- **Client Tier**:
  - React + TypeScript Progressive Web App (PWA) with multilingual support (Amharic, English, etc.)
  - Feature phone interface via USSD (*990#) and SMS
- **API & Backend Tier**:
  - Spring Boot 3 modular monolith (modularized by domain)
  - REST API & WebSocket gateways
- **Integration Tier**:
  - Telecom Aggregator (USSD / SMS / IVR)
  - Payment Gateways (Telebirr mock/adapter)
- **Data Tier**:
  - PostgreSQL with Flyway database migrations

## TODO
- [ ] Document domain module boundaries and internal communication events
- [ ] Detail offline sync strategy for the PWA in rural areas
- [ ] Detail USSD session state machine and caching strategy
