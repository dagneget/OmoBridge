export JAVA_HOME ?= $(shell [ -d /usr/lib/jvm/java-1.21.0-openjdk-amd64 ] && echo /usr/lib/jvm/java-1.21.0-openjdk-amd64 || echo $$JAVA_HOME)
export PATH := $(JAVA_HOME)/bin:$(PATH)

.PHONY: dev backend frontend db-up db-down test

dev:
	./scripts/dev.sh

backend:
	cd backend && (./mvnw spring-boot:run 2>/dev/null || mvn spring-boot:run)

frontend:
	cd frontend && npm run dev

db-up:
	docker compose -f infrastructure/compose.yaml up -d

db-down:
	docker compose -f infrastructure/compose.yaml down

test:
	cd backend && (./mvnw test 2>/dev/null || mvn test)
	cd frontend && npm run build
