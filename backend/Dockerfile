# Build Stage
FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /app

COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN chmod +x ./mvnw && ./mvnw dependency:go-offline -B

COPY src/ src/
RUN ./mvnw clean package -DskipTests -B

# Runtime Stage
FROM eclipse-temurin:21-jre-alpine AS runner
WORKDIR /app

# Create unprivileged user for security
RUN addgroup -S omogroup && adduser -S omouser -G omogroup
USER omouser

COPY --from=builder /app/target/*.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-Djava.security.egd=file:/dev/./urandom", "-jar", "app.jar"]
