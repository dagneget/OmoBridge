#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$DIR"

# Ensure Java 21 is preferred if available
if [ -z "$JAVA_HOME" ] && [ -d "/usr/lib/jvm/java-1.21.0-openjdk-amd64" ]; then
    export JAVA_HOME="/usr/lib/jvm/java-1.21.0-openjdk-amd64"
    export PATH="$JAVA_HOME/bin:$PATH"
fi

echo "=== Starting OmoBridge Local Environment ==="

# 1. Start Database
echo "Starting PostgreSQL container..."
docker compose -f infrastructure/compose.yaml up -d

# Wait for DB to be healthy/available
echo "Waiting for database port 5432..."
until nc -z localhost 5432 2>/dev/null || (echo > /dev/tcp/localhost/5432) 2>/dev/null; do
    sleep 1
done
echo "Database is ready."

# Trap cleanup to stop child processes on Ctrl+C
cleanup() {
    echo ""
    echo "Shutting down OmoBridge services..."
    kill $(jobs -p) 2>/dev/null || true
    exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# 2. Start Backend
echo "Starting Spring Boot backend..."
(cd backend && (./mvnw spring-boot:run 2>/dev/null || mvn spring-boot:run)) &

# 3. Start Frontend
echo "Starting Vite frontend..."
(cd frontend && npm run dev) &

# Wait for all background jobs
wait
