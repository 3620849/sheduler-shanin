# Stage 1: Build application JAR
FROM eclipse-temurin:25-jdk-alpine AS builder
WORKDIR /build

# Install build dependencies
RUN apk add --no-cache maven

# Copy build descriptors to leverage layer caching
COPY pom.xml .
COPY .mvn/ .mvn/
COPY mvnw* ./

# Download dependencies offline
RUN mvn dependency:go-offline -B || true

# Copy source code and build executable jar
COPY src/ ./src/
RUN mvn clean package -DskipTests

# Stage 2: Minimal runtime image
FROM eclipse-temurin:25-jre-alpine AS runtime
WORKDIR /app

# Run with an unprivileged non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy built artifact from builder stage
COPY --from=builder /build/target/*.jar /app/app.jar
RUN chown -R appuser:appgroup /app

USER appuser

EXPOSE 8080

ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-jar", "/app/app.jar"]
