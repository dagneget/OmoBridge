# OmoBridge Local Development Setup

## Prerequisites
- Java 21 JDK
- Maven 3.9+
- Node.js 20+ & npm or pnpm
- Docker & Docker Compose

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
3. **Start Backend**:
   ```bash
   make backend
   ```
4. **Start Frontend**:
   ```bash
   make frontend
   ```

## TODO
- [ ] Configure local USSD simulator instructions
- [ ] Add test runner and test coverage instructions
