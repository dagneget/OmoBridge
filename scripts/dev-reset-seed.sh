#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$DIR"

# Ensure Java 21
if [ -z "$JAVA_HOME" ] && [ -d "/usr/lib/jvm/java-1.21.0-openjdk-amd64" ]; then
    export JAVA_HOME="/usr/lib/jvm/java-1.21.0-openjdk-amd64"
    export PATH="$JAVA_HOME/bin:$PATH"
fi

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USERNAME:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-postgres}"
DB_NAME="${DB_NAME:-omobridge}"

echo "=========================================================="
echo "      OmoBridge Local Development Database Reset & Seed    "
echo "=========================================================="

# Safety check: Prevent running against non-localhost or production DBs
if [[ "$DB_HOST" != "localhost" && "$DB_HOST" != "127.0.0.1" ]]; then
    echo "ERROR: Refusing to reset database at non-local host: $DB_HOST"
    echo "This script is strictly intended for local development environments."
    exit 1
fi

echo "Connecting to $DB_HOST:$DB_PORT/$DB_NAME..."

# 1. Reset database tables safely
export PGPASSWORD="$DB_PASSWORD"
if command -v psql &> /dev/null; then
    echo "Resetting schema 'public' on $DB_NAME..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;"
else
    echo "psql not found locally; running reset through docker compose if available..."
    docker compose -f infrastructure/compose.yaml exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -c "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;" || true
fi

# 2. Run Flyway Migrations via backend Maven
echo "Running Flyway migrations via Spring Boot..."
(cd backend && (./mvnw compile flyway:migrate -Dflyway.url="jdbc:postgresql://${DB_HOST}:${DB_PORT}/${DB_NAME}" -Dflyway.user="${DB_USER}" -Dflyway.password="${DB_PASSWORD}" || (export JAVA_HOME=/usr/lib/jvm/java-1.21.0-openjdk-amd64 && ./mvnw compile flyway:migrate -Dflyway.url="jdbc:postgresql://${DB_HOST}:${DB_PORT}/${DB_NAME}" -Dflyway.user="${DB_USER}" -Dflyway.password="${DB_PASSWORD}")))

# 3. Apply Demo Seed Data
echo "Applying demo seed data..."
if command -v psql &> /dev/null; then
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f infrastructure/database/seed/demo_seed.sql
else
    docker compose -f infrastructure/compose.yaml exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" < infrastructure/database/seed/demo_seed.sql || true
fi

echo "=========================================================="
echo " Database successfully reset, migrated to V14, and seeded!"
echo " Demo user: admin@omobridge.et / Secret@123"
echo " Demo farmer: Bono Gedo (FARM-BONO-01)"
echo " Demo coop: Dimeka Agro Cooperative Union"
echo "=========================================================="
