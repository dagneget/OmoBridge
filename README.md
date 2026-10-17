# OmoBridge

> Digital platform connecting rural producers and tourism services in South Omo, Ethiopia.

## Quick Start

### Prerequisites
- Java 21+
- Node.js 20+ and npm/pnpm
- Docker and Docker Compose

### Starting the System
1. **Check Environment**:
   ```bash
   ./scripts/check-environment.sh
   ```

2. **Start Database**:
   ```bash
   make db-up
   ```

3. **Run All Services**:
   ```bash
   make dev
   ```
   Or run backend and frontend independently:
   ```bash
   make backend   # Starts Spring Boot on http://localhost:8080
   make frontend  # Starts Vite frontend on http://localhost:5173
   ```

## Folder Overview

```
omobridge/
├── frontend/                          # React + TypeScript + Vite (PWA)
│   ├── public/locales/                # Localization (en, am)
│   └── src/                           # Components, pages, features, routing
├── backend/                           # Java 21 + Spring Boot 3
│   └── src/main/java/com/omobridge/   # Modular architecture by domain & integrations
├── tools/
│   └── ussd-simulator/                # Standalone test runner for USSD workflows
├── infrastructure/
│   ├── compose.yaml                   # PostgreSQL service definition
│   ├── gateway/                       # USSD/SMS provider sandbox configuration
│   └── database/                      # Database init and seed scripts
├── docs/                              # Architecture, API, roles, and setup guides
└── scripts/                           # Dev startup, environment checks, USSD simulation
```
