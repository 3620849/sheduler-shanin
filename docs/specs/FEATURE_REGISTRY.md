# Feature Specification Registry

This registry tracks all technical and functional specifications adhering to the Spec-Driven Development (SDD) protocol. Specifications define architectural boundaries, API contracts, database schemas, and workflows prior to implementation.

## Registered Specifications

| ID | Specification | Status | Target File | Dependencies | Description |
|:---|:---|:---|:---|:---|:---|
| **000** | [Distributed Task Scheduling Platform Architecture](000-system-architecture.md) | `Approved` | `docs/specs/000-system-architecture.md` | *None (Baseline)* | System topology, Quartz clustering, predefined tasks (`LOG_TASK`, `EMAIL_TASK`, `DB_QUERY_TASK`), REST APIs, RabbitMQ dispatch, and multi-stage delivery roadmap. |
| **001** | [Core Backend Service & Quartz Scheduling Engine](001-backend-core-scheduling.md) | `Implemented` | `docs/specs/001-backend-core-scheduling.md` | `000` | Stage 1 implementation: Spring Boot 4.1.2 setup, Predefined task schema engine, Scheduling entity, Quartz JDBC JobStore & triggers, and CRUD REST APIs. |
| **002** | [Asynchronous Execution Topology & Role Separation via RabbitMQ](002-rabbitmq-role-separation.md) | `Implemented` | `docs/specs/002-rabbitmq-role-separation.md` | `000`, `001` | Stage 2 implementation: RabbitMQ messaging infrastructure, role toggles (SCHEDULER_ENABLED, WORKER_ENABLED), async task dispatch flow, multi-stage Dockerfile, and role-activation integration tests. |
| **003** | [Frontend Scheduling Dashboard](003-frontend-scheduling-dashboard.md) | `Implemented` | `docs/specs/003-frontend-scheduling-dashboard.md` | `000`, `001` | Stage 3 implementation: React (Vite + TypeScript) dashboard with schedulings table, dynamic parameter forms from backend task schema, timing selector, pause/resume/edit/delete actions, and API client. |
| **004** | [Containerization & Orchestration](004-containerization-orchestration.md) | `Implemented` | `docs/specs/004-containerization-orchestration.md` | `000`, `001`, `002`, `003` | Stage 4 implementation: Multi-stage Dockerfiles (`backend/Dockerfile`, `frontend/Dockerfile`), Nginx reverse proxy, and root orchestration via `docker-compose.yml`. |
| **005** | [Frontend Testing Suite](005-frontend-testing-suite.md) | `Implemented` | `docs/specs/005-frontend-testing-suite.md` | `000`, `003` | Stage 5 implementation: Vitest, React Testing Library, and jest-dom test suite for table views, dynamic forms, timing selectors, modals, and API client. |
| **006** | [Delivery Documentation & README](006-delivery-documentation-readme.md) | `Implemented` | `docs/specs/006-delivery-documentation-readme.md` | `000`, `001`, `002`, `003`, `004`, `005` | Stage 6 implementation: Root README.md detailing system architecture, startup instructions, design decisions, assumptions, and test verification. |
| **006** | [Schedulings Pagination & Data Navigation](006-schedulings-pagination.md) | `Implemented` | `docs/specs/006-schedulings-pagination.md` | `000`, `001`, `003`, `005` | Stage 6 implementation: Server-side pagination on `GET /api/schedulings` with `PageResponse<T>`, frontend pagination controls, table integration, and full test suite. |
| **007** | [Quartz Execution History Tracking & Live Log Stream](007-execution-history-tracking.md) | `Implemented` | `docs/specs/007-execution-history-tracking.md` | `000`, `001`, `002`, `003`, `005` | Stage 7 implementation: Persistence of task executions from worker nodes, REST API `/api/executions`, frontend slide-out executions drawer with live polling stream, table row action, and test suite. |
| **008** | [Playwright E2E Testing Suite with Dockerized Test Environment](008-playwright-e2e-docker-test-environment.md) | `Implemented` | `docs/specs/008-playwright-e2e-docker-test-environment.md` | `000`, `001`, `002`, `003`, `004`, `005`, `006`, `007` | Comprehensive Playwright E2E testing framework running against an isolated containerized test environment (`docker-compose.test.yml`) with a dedicated MySQL test database (`scheduler_test_db`), including multi-schedule suspension isolation tests. |

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

---

### 003: Frontend Scheduling Dashboard
- **Spec File:** [`docs/specs/003-frontend-scheduling-dashboard.md`](003-frontend-scheduling-dashboard.md)
- **Status:** Implemented
- **Scope:**
  - React + Vite + TypeScript single-page application under `frontend/`.
  - Type-safe API client and hooks for `/api/tasks` and `/api/schedulings`.
  - Schedulings data table with real-time status badges, next run timestamps, and action handlers (Pause/Resume, Edit, Delete with modal confirmation).
  - Create & Edit Scheduling modal featuring:
    - Step 1: General Info (name and optional description).
    - Step 2: Predefined task selector with dynamic schema form generating inputs based on `ParameterDefinition` (text, email, number with validation).
    - Step 3: Schedule timing selector (One-Time datetime picker, Interval duration + unit, Weekly days of week + time, Cron expression input with presets & guidance).
  - Client-side validation, error banners/toast notifications, and responsive modern layout.
  - Verification via clean `npm run build` bundle compilation.

---

### 004: Containerization & Orchestration
- **Spec File:** [`docs/specs/004-containerization-orchestration.md`](004-containerization-orchestration.md)
- **Status:** Implemented
- **Scope:**
  - Multi-stage `frontend/Dockerfile` (`node:22-alpine` builder, `nginx:alpine` runtime).
  - Frontend `.dockerignore`.
  - Nginx configuration (`docker/nginx/nginx.conf`) with SPA routing and `/api/` reverse proxy to `http://backend-api:8080/api/`.
  - Multi-stage `backend/Dockerfile` (`eclipse-temurin:25-jdk-alpine` builder, `eclipse-temurin:25-jre-alpine` runtime) and `.dockerignore`.
  - Root `docker-compose.yml` orchestrating 5 services (`mysql`, `rabbitmq`, `backend-api`, `backend-worker`, `frontend`), networks, and persistent volumes.
  - Integration validation via clean `docker compose config` and container build readiness.

---

### 005: Frontend Testing Suite
- **Spec File:** [`docs/specs/005-frontend-testing-suite.md`](005-frontend-testing-suite.md)
- **Status:** Implemented
- **Scope:**
  - Vitest + React Testing Library + jest-dom + jsdom setup.
  - Test suites for API error extraction, badge components, schedulings table, dynamic parameter forms, timing selectors, and scheduling CRUD modals.
  - Verification via `npm run test` and `npm run build`.

---

### 006: Delivery Documentation & README
- **Spec File:** [`docs/specs/006-delivery-documentation-readme.md`](006-delivery-documentation-readme.md)
- **Status:** Implemented
- **Scope:**
  - Root `README.md` satisfying all Requirement 7 delivery criteria.
  - Architecture overview, Docker Compose startup, local development instructions, design decisions, assumptions, and testing instructions.


---

### 006: Schedulings Pagination & Data Navigation
- **Spec File:** [`docs/specs/006-schedulings-pagination.md`](006-schedulings-pagination.md)
- **Status:** Implemented
- **Scope:**
  - Backend `PageResponse<T>` DTO adhering to REST conventions.
  - Spring Data `Pageable` in `SchedulingController` and `SchedulingService`.
  - Frontend `PageResponse<T>` interface and paginated `schedulingsApi.getAll(page, size)`.
  - Frontend `useSchedulings` pagination state (`page`, `pageSize`, `totalElements`, `totalPages`).
  - `Pagination` UI controls in `SchedulingsTable`.
  - Backend controller tests for paginated responses and frontend Vitest unit/component tests for pagination controls.




