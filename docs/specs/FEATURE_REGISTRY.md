# Feature Specification Registry

This registry tracks all technical and functional specifications adhering to the Spec-Driven Development (SDD) protocol. Specifications define architectural boundaries, API contracts, database schemas, and workflows prior to implementation.

## Registered Specifications

| ID | Specification | Status | Target File | Dependencies | Description |
|:---|:---|:---|:---|:---|:---|
| **000** | [Distributed Task Scheduling Platform Architecture](000-system-architecture.md) | `Approved` | `docs/specs/000-system-architecture.md` | *None (Baseline)* | System topology, Quartz clustering, predefined tasks (`LOG_TASK`, `EMAIL_TASK`, `DB_QUERY_TASK`), REST APIs, RabbitMQ dispatch, and multi-stage delivery roadmap. |

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
