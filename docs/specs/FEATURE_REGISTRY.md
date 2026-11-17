# Feature Specification Registry

This registry tracks all technical and functional specifications adhering to the Spec-Driven Development (SDD) protocol. Specifications define architectural boundaries, API contracts, database schemas, and workflows prior to implementation.

## Registered Specifications

| ID | Specification | Status | Target File | Dependencies | Description |
|:---|:---|:---|:---|:---|:---|
| **000** | [Distributed Task Scheduling Platform Architecture](000-system-architecture.md) | `Approved` | `docs/specs/000-system-architecture.md` | *None (Baseline)* | System topology, Quartz clustering, predefined tasks (`LOG_TASK`, `EMAIL_TASK`, `DB_QUERY_TASK`), REST APIs, RabbitMQ dispatch, and multi-stage delivery roadmap. |
| **001** | [Core Backend Service & Quartz Scheduling Engine](001-backend-core-scheduling.md) | `Implemented` | `docs/specs/001-backend-core-scheduling.md` | `000` | Stage 1 implementation: Spring Boot 4.1.2 setup, Predefined task schema engine, Scheduling entity, Quartz JDBC JobStore & triggers, and CRUD REST APIs. |

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
