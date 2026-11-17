# 004: Containerization & Orchestration Specification

## 1. Overview & Purpose
This specification formalizes **Step 4** of the distributed task scheduling platform: packaging the entire system into a clean repository structure with containerization and orchestrating the multi-node distributed platform using `docker-compose.yml`.

The deployment topology enforces the decoupled architecture established in ADR-001, Spec-000, Spec-001, Spec-002, and Spec-003:
- A clustered relational database (`mysql`) for domain entities and Quartz JDBC JobStore tables.
- A resilient message broker (`rabbitmq`) for async task dispatch.
- A stateless API gateway / scheduler instance (`backend-api`) handling REST traffic, Quartz triggers, and job enqueueing.
- A dedicated background processing instance (`backend-worker`) listening to RabbitMQ and executing task logic.
- A modern SPA dashboard (`frontend`) packaged with an Nginx reverse proxy routing client requests and `/api/` endpoints.

---

## 2. Directory Layout & Architecture

```
/
├── backend/
│   ├── src/
│   ├── pom.xml
│   ├── Dockerfile                # Multi-stage Java 25 / Spring Boot 4.1.2 build
│   └── .dockerignore             # Excludes target/, .git/, IDE files
├── frontend/
│   ├── src/
│   ├── package.json
│   ├── Dockerfile                # Multi-stage Node 22 build + Nginx runtime
│   └── .dockerignore             # Excludes node_modules/, dist/, .git/
├── docker/
│   └── nginx/
│       └── nginx.conf            # Nginx SPA fallback + reverse proxy to backend-api:8080
├── docs/
│   ├── adr/
│   └── specs/
└── docker-compose.yml            # Root orchestrator for 5 containerized services
```

---

## 3. Container Specifications

### 3.1 Frontend (`frontend/Dockerfile` & `docker/nginx/nginx.conf`)
- **Stage 1: Build Stage (`builder`)**
  - Base Image: `node:22-alpine`
  - Working Directory: `/app`
  - Layer Caching: Copy `package.json` and `package-lock.json` first, run `npm ci` (or `npm install`).
  - Source Compilation: Copy project files and run `npm run build` targeting `/app/dist`.
- **Stage 2: Production Runtime Stage (`runtime`)**
  - Base Image: `nginx:alpine`
  - Asset Placement: Copy static files from `/app/dist` to `/usr/share/nginx/html`.
  - Configuration: Copy custom Nginx configuration to `/etc/nginx/conf.d/default.conf`.
  - Expose Port: `80`
- **Nginx Configuration Details (`docker/nginx/nginx.conf`)**
  - Server listening on port `80`.
  - Gzip compression enabled (`gzip on; gzip_types text/plain text/css application/json application/javascript text/xml application/xml+rss text/javascript;`).
  - SPA Routing: `location / { try_files $uri $uri/ /index.html; }`.
  - Reverse Proxy:
    ```nginx
    location /api/ {
        proxy_pass http://backend-api:8080/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    ```
- **`.dockerignore`**: Excludes `node_modules`, `dist`, `.git`, `.vscode`, `*.log`.

### 3.2 Backend (`backend/Dockerfile` & `backend/.dockerignore`)
- **Stage 1: Build Stage (`builder`)**
  - Base Image: `eclipse-temurin:25-jdk-alpine`
  - Working Directory: `/build`
  - Layer Caching: Copy `pom.xml`, `.mvn/`, `mvnw*`, and pre-fetch dependencies (`mvn dependency:go-offline -B || true`).
  - Source Compilation: Copy `src/`, compile executable Spring Boot JAR with `mvn clean package -DskipTests`.
- **Stage 2: Production Runtime Stage (`runtime`)**
  - Base Image: `eclipse-temurin:25-jre-alpine`
  - Working Directory: `/app`
  - Security: Run as dedicated non-root user (`appuser:appgroup`).
  - Artifact: Copy compiled JAR from builder stage to `/app/app.jar`.
  - JVM Flags: `-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0`.
  - Entrypoint: `["java", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-jar", "/app/app.jar"]`.
- **`.dockerignore`**: Excludes `target/`, `build/`, `.gradle/`, `.idea/`, `.vscode/`, `.git/`, `*.log`.

---

## 4. Orchestration (`docker-compose.yml`)

The platform defines 5 coordinated services connected on a dedicated bridge network `scheduler-network` with persistent named volumes:

### 4.1 `mysql`
- **Image**: `mysql:8.4`
- **Environment**:
  - `MYSQL_DATABASE`: `scheduler_db`
  - `MYSQL_USER`: `appuser`
  - `MYSQL_PASSWORD`: `appsecret`
  - `MYSQL_ROOT_PASSWORD`: `rootsecret`
- **Volumes**: `mysql-data:/var/lib/mysql`
- **Healthcheck**:
  - `test`: `["CMD", "mysqladmin", "ping", "-h", "localhost"]`
  - `interval`: `10s`
  - `timeout`: `5s`
  - `retries`: `10`
  - `start_period`: `30s`
- **Restart**: `unless-stopped`

### 4.2 `rabbitmq`
- **Image**: `rabbitmq:4-management-alpine`
- **Environment**:
  - `RABBITMQ_DEFAULT_USER`: `guest`
  - `RABBITMQ_DEFAULT_PASS`: `guest`
- **Ports**:
  - `'5672:5672'` (AMQP broker)
  - `'15672:15672'` (Management Web UI)
- **Volumes**: `rabbitmq-data:/var/lib/rabbitmq`
- **Healthcheck**:
  - `test`: `["CMD", "rabbitmq-diagnostics", "-q", "ping"]`
  - `interval`: `10s`
  - `timeout`: `5s`
  - `retries`: `10`
  - `start_period`: `30s`
- **Restart**: `unless-stopped`

### 4.3 `backend-api`
- **Build**: `./backend` (Dockerfile: `Dockerfile`)
- **Image**: `scheduler-backend:latest`
- **Ports**: `'8080:8080'`
- **Environment**:
  - `SPRING_DATASOURCE_URL`: `jdbc:mysql://mysql:3306/scheduler_db?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC&createDatabaseIfNotExist=true`
  - `SPRING_DATASOURCE_USERNAME`: `appuser`
  - `SPRING_DATASOURCE_PASSWORD`: `appsecret`
  - `SPRING_RABBITMQ_HOST`: `rabbitmq`
  - `SPRING_RABBITMQ_PORT`: `5672`
  - `SPRING_RABBITMQ_USERNAME`: `guest`
  - `SPRING_RABBITMQ_PASSWORD`: `guest`
  - `SCHEDULER_ENABLED`: `"true"`
  - `WORKER_ENABLED`: `"false"`
- **Depends On**:
  - `mysql`: condition `service_healthy`
  - `rabbitmq`: condition `service_healthy`
- **Restart**: `unless-stopped`

### 4.4 `backend-worker`
- **Build**: `./backend` (Dockerfile: `Dockerfile`) or `image: scheduler-backend:latest`
- **Ports**: None exposed publicly
- **Environment**:
  - `SPRING_DATASOURCE_URL`: `jdbc:mysql://mysql:3306/scheduler_db?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC&createDatabaseIfNotExist=true`
  - `SPRING_DATASOURCE_USERNAME`: `appuser`
  - `SPRING_DATASOURCE_PASSWORD`: `appsecret`
  - `SPRING_RABBITMQ_HOST`: `rabbitmq`
  - `SPRING_RABBITMQ_PORT`: `5672`
  - `SPRING_RABBITMQ_USERNAME`: `guest`
  - `SPRING_RABBITMQ_PASSWORD`: `guest`
  - `SCHEDULER_ENABLED`: `"false"`
  - `WORKER_ENABLED`: `"true"`
- **Depends On**:
  - `mysql`: condition `service_healthy`
  - `rabbitmq`: condition `service_healthy`
- **Restart**: `unless-stopped`

### 4.5 `frontend`
- **Build**: `./frontend` (Dockerfile: `Dockerfile`)
- **Ports**: `'80:80'`
- **Depends On**:
  - `backend-api`: condition `service_started`
- **Restart**: `unless-stopped`

### 4.6 Volumes & Networks
- **Networks**: `scheduler-network` (driver: `bridge`)
- **Volumes**: `mysql-data`, `rabbitmq-data`

---

## 5. Verification & Acceptance Criteria
1. Executing `docker compose config` validates the compose schema without errors or warnings.
2. Executing `docker compose build` compiles both the Java 25 backend image and Node 22 / Nginx frontend image without failure.
3. Healthchecks on MySQL and RabbitMQ gate `backend-api` and `backend-worker` startup until services are fully ready.
4. Nginx serves the React dashboard on `http://localhost:80` and reverses proxies `http://localhost:80/api/tasks` and `http://localhost:80/api/schedulings` to `backend-api`.
5. Creation of a task from the UI dashboard triggers persistence in MySQL, triggers Quartz scheduling on `backend-api`, dispatches a message over RabbitMQ, and is consumed & executed asynchronously by `backend-worker`.
