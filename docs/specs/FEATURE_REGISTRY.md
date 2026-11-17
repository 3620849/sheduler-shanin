# Feature Specification Registry

This registry tracks all technical and functional specifications adhering to the Spec-Driven Development (SDD) protocol. Specifications define architectural boundaries, API contracts, database schemas, and workflows prior to implementation.

## Registered Specifications

| ID | Specification | Status | Target File | Dependencies | Description |
|:---|:---|:---|:---|:---|:---|
| **000** | [Distributed Task Scheduling Platform Architecture](000-system-architecture.md) | `Approved` | `docs/specs/000-system-architecture.md` | *None (Baseline)* | System topology, Quartz clustering, predefined tasks (`LOG_TASK`, `EMAIL_TASK`, `DB_QUERY_TASK`), REST APIs, RabbitMQ dispatch, and multi-stage delivery roadmap. |
| **001** | [Core Backend Service & Quartz Scheduling Engine](001-backend-core-scheduling.md) | `Implemented` | `docs/specs/001-backend-core-scheduling.md` | `000` | Stage 1 implementation: Spring Boot 4.1.2 setup, Predefined task schema engine, Scheduling entity, Quartz JDBC JobStore & triggers, and CRUD REST APIs. |
| **002** | [Asynchronous Execution Topology & Role Separation via RabbitMQ](002-rabbitmq-role-separation.md) | `Implemented` | `docs/specs/002-rabbitmq-role-separation.md` | `000`, `001` | Stage 2 implementation: RabbitMQ messaging infrastructure, role toggles (SCHEDULER_ENABLED, WORKER_ENABLED), async task dispatch flow, multi-stage Dockerfile, and role-activation integration tests. |

---

## Detailed Specifications Breakdown

### 000: Distributed Task Scheduling Platform Architecture
- **Spec File:** [`docs/specs/000-system-architecture.md`](000-system-architecture.md)
- **Status:** Approved / Active Baseline
- **Tech Stack Baseline:** Java 25, Spring Boot 4.1.2, Quartz Scheduler, MySQL 8.4, RabbitMQ 4.x, React (Vite), Docker Compose, Nginx.
- **Topology Services:**
  - `mysql`: Relational store & Quartz JDBC JobStore (`QRTZ_*`).
  - `rabbitmq`: Message broker for dispatching execution tasks from the API layer to background workers.
  - `backend-api`: Client-facing REST API (port 8080) for schedule CRUD, task metadata delivery, and dispatch publishing (`SCHEDULER_ENABLED=true`, `WORKER_ENABLED=false`).
  - `backend-worker`: Background worker executing Quartz jobs and task logic, consuming events from RabbitMQ (`SCHEDULER_ENABLED=false`, `WORKER_ENABLED=true`).
  - `frontend`: Single-page React application served by Nginx on port 80 (with reverse proxy for `/api/` to `backend-api`).
- **Predefined Tasks:**
  - `LOG_TASK`: Execution logging with required `message`.
  - `EMAIL_TASK`: Simulated email dispatch (`to`, `subject`, `body`).
  - `DB_QUERY_TASK`: Simulated database query check (`query`, `timeoutSeconds`).
- **Core API Contracts:**
  - `GET /api/tasks` — List task definitions and schemas.
  - `GET /api/schedulings` — List schedulings, status, and stats.
  - `POST /api/schedulings` — Create schedule with parameter validation.
  - `PUT /api/schedulings/{id}` — Update schedule timing/status/params.
  - `DELETE /api/schedulings/{id}` — Delete schedule and unschedule Quartz triggers.
- **Delivery Roadmap:**
  - **Stage 1:** Backend Core, Task Metadata, and Quartz Integration.
  - **Stage 2:** RabbitMQ Integration and Two-Node Split (`backend-api` & `backend-worker`).
  - **Stage 3:** React UI Dashboard with Dynamic Schema Forms.
  - **Stage 4:** Multi-stage Dockerfiles, Nginx Reverse Proxy & `compose.yaml`.

---

### 001: Core Backend Service & Quartz Scheduling Engine
- **Spec File:** [`docs/specs/001-backend-core-scheduling.md`](001-backend-core-scheduling.md)
- **Status:** Implemented
- **Scope:**
  - Spring Boot 4.1.2 project setup (Java 25, Web, JPA, Quartz, MySQL, Validation, Lombok).
  - Predefined task engine (`LOG_TASK`, `EMAIL_TASK`, `DB_QUERY_TASK`) with parameter schemas & validator.
  - Scheduling domain entity with JSON attributes for parameters and schedule configs.
  - Quartz JDBC JobStore integration and trigger conversion service.
  - REST endpoints: `GET /api/tasks`, `GET /api/schedulings`, `POST /api/schedulings`, `PUT /api/schedulings/{id}`, `DELETE /api/schedulings/{id}`.
  - Unit and slice testing suite (Parameter validator, Trigger builder, Controllers, Repositories).

---

### 002: Asynchronous Execution Topology & Role Separation via RabbitMQ
- **Spec File:** [`docs/specs/002-rabbitmq-role-separation.md`](002-rabbitmq-role-separation.md)
- **Status:** Implemented
- **Scope:**
  - RabbitMQ messaging configuration: direct exchange `scheduler.tasks`, durable queue `scheduler.tasks.execute`, routing key `task.execute`, Jackson JSON converter.
  - Role separation via feature toggles `SCHEDULER_ENABLED` and `WORKER_ENABLED` in `application.yaml` (defaulting to true).
  - Conditional activation: REST controllers, schedule creation, and task dispatch on `SCHEDULER_ENABLED=true`; RabbitMQ consumers and task handlers on `WORKER_ENABLED=true`.
  - Asynchronous task dispatch flow from Quartz trigger on scheduler node to RabbitMQ, and consumption & execution on worker node.
  - Multi-stage `Dockerfile` (`eclipse-temurin:25-jdk-alpine` builder, `eclipse-temurin:25-jre-alpine` runtime with non-root user and container JVM flags) and `.dockerignore`.
  - Integration testing suite verifying role-based activation and message dispatch flow.

