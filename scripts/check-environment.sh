#!/usr/bin/env bash
set -e

if [ -z "$JAVA_HOME" ] && [ -d "/usr/lib/jvm/java-1.21.0-openjdk-amd64" ]; then
    export JAVA_HOME="/usr/lib/jvm/java-1.21.0-openjdk-amd64"
    export PATH="$JAVA_HOME/bin:$PATH"
fi

echo "=== OmoBridge Environment Verification ==="

echo -n "Checking Java: "
if command -v java >/dev/null 2>&1; then
    java -version 2>&1 | head -n 1
else
    echo "MISSING (Java 21+ required)"
fi

echo -n "Checking Maven: "
if command -v mvn >/dev/null 2>&1; then
    mvn -version | head -n 1
else
    echo "MISSING (Maven 3.9+ recommended)"
fi

echo -n "Checking Node.js: "
if command -v node >/dev/null 2>&1; then
    node -v
else
    echo "MISSING (Node.js 20+ required)"
fi

echo -n "Checking Docker / Podman: "
if command -v docker >/dev/null 2>&1; then
    docker --version
else
    echo "MISSING (Docker or Podman required)"
fi

echo -n "Checking Docker Compose: "
if docker compose version >/dev/null 2>&1; then
    docker compose version
else
    echo "MISSING (Docker compose required)"
fi

echo "=== Environment Check Finished ==="
