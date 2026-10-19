# Build Stage
FROM docker.io/library/eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /app

COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
# Resolve application dependencies without prefetching every reporting/plugin
# dependency inherited from Spring Boot (which greatly slows cold builds).
RUN chmod +x ./mvnw && ./mvnw dependency:resolve -B -ntp

COPY src/ src/
RUN ./mvnw clean package -DskipTests -B -ntp

# Runtime Stage
FROM docker.io/library/eclipse-temurin:21-jre-alpine AS runner
WORKDIR /app

# Create unprivileged user for security
RUN addgroup -S omogroup && adduser -S omouser -G omogroup
USER omouser

COPY --from=builder /app/target/*.jar app.jar

EXPOSE 8080
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75.0 -XX:+ExitOnOutOfMemoryError"
HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=3 \
  CMD wget -q -O /dev/null "http://127.0.0.1:${SERVER_PORT:-8080}/actuator/health" || exit 1
ENTRYPOINT ["java", "-Djava.security.egd=file:/dev/./urandom", "-jar", "app.jar"]
