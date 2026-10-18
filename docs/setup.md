# OmoBridge Local Development Setup

## Prerequisites
- **Java**: OpenJDK 21 LTS (`/usr/lib/jvm/java-1.21.0-openjdk-amd64`)
- **Maven**: 3.9+ (or use the included `./mvnw` wrapper)
- **Node.js**: v20+ & npm / pnpm
- **Containers**: Docker or Podman with compose provider

## Quick Setup Steps
1. **Clone & Environment Setup**:
   ```bash
   cp .env.example .env
   cp frontend/.env.example frontend/.env
   cp backend/.env.example backend/.env
   ```
2. **Start Database**:
   ```bash
   make db-up
   ```
3. **Verify Health**:
   ```bash
   curl -s http://localhost:8080/actuator/health
   # Expected response: {"status":"UP","components":{"db":{"status":"UP",...}}}
   ```
4. **Run Backend Tests**:
   ```bash
   make test
   # Runs Spring Boot integration tests, unit tests, and frontend build
   ```
5. **Start Services**:
   ```bash
   make dev
   # Or independently:
   make backend   # Starts Spring Boot on http://localhost:8080
   make frontend  # Starts Vite frontend on http://localhost:5173
   ```

## Development Tooling & Endpoints
- **API Documentation (Swagger UI)**: `http://localhost:8080/swagger-ui/index.html`
- **OpenAPI Schema**: `http://localhost:8080/v3/api-docs`
- **Actuator Health & Metrics**: `http://localhost:8080/actuator/health`

## Test Accounts & Roles
For local development, test accounts and tokens can be generated using `JwtService` or seed scripts:
- **System Admin**: Role `SYSTEM_ADMIN` (e.g. phone `+251900000001`)
- **Micro-enterprise Owner**: Role `MICRO_ENTERPRISE` (e.g. phone `+251911000002`)
- **Rural Producer**: Role `PRODUCER_FARMER` (e.g. phone `+251922000003`)
- **Buyer / Visitor**: Role `BUYER_VISITOR` (e.g. phone `+251933000004`)
- **Tour Guide**: Role `TOUR_GUIDE` (e.g. phone `+251944000005`)
- **Delivery Provider**: Role `DELIVERY_PROVIDER` (e.g. phone `+251955000006`)
- **Tourism Authority**: Role `TOURISM_AUTHORITY` (e.g. phone `+251966000007`)
