# 006: Delivery Documentation & README

## 1. Overview
This specification defines the delivery documentation for the Distributed Task Scheduling Platform, satisfying Requirement 7 of the core project requirements. It mandates the creation of a comprehensive, production-grade root `README.md` that guides operators and evaluators through running the full containerized stack, understanding design decisions, reviewing technical assumptions, and running the automated test suites.

---

## 2. Architectural Alignment & Dependencies
- **Parent Specifications:**
  - `docs/specs/000-system-architecture.md` (System Architecture Baseline)
  - `docs/specs/001-backend-core-scheduling.md` (Spring Boot & Quartz Engine)
  - `docs/specs/002-rabbitmq-role-separation.md` (Asynchronous Worker Topology)
  - `docs/specs/003-frontend-scheduling-dashboard.md` (React Dashboard)
  - `docs/specs/004-containerization-orchestration.md` (Docker & Compose Orchestration)
  - `docs/specs/005-frontend-testing-suite.md` (Frontend Testing Suite)
- **Target Artifact:** `README.md` at project root (`/README.md`).

---

## 3. Specification Scope & Content Breakdown

The root `README.md` must encompass the following sections:

### 3.1. Project Overview & Architecture
- Summary of the distributed platform, its goals, and key components.
- ASCII / Mermaid architecture topology diagram:
  - `frontend` (React + Nginx reverse proxy on port 80).
  - `backend-api` (Spring Boot API & Quartz scheduler node on port 8080).
  - `backend-worker` (Spring Boot worker node consuming execution events from RabbitMQ).
  - `rabbitmq` (Message broker on ports 5672 & 15672).
  - `mysql` (Relational store on port 3306 for `schedulings` and `QRTZ_*` clustered metadata).

### 3.2. Core Capabilities
- **Scheduling Options:** One-Time, Recurring Intervals, Weekly Schedules, and Quartz Cron expressions.
- **Predefined Tasks (Read-Only):**
  - `LOG_TASK`: Application logging with configurable message parameter.
  - `EMAIL_TASK`: Simulated email dispatch with recipient, subject, and body parameters.
  - `DB_QUERY_TASK`: Simulated database diagnostic query check with SQL text and timeout.
- **Dynamic Parameter Schema & Validation:** Dynamic UI forms driven by backend schema metadata with client & server-side validation.

### 3.3. How to Run the System
- **Quickstart via Docker Compose:**
  - Prerequisites (Docker Engine 24+, Docker Compose v2+).
  - Single startup command: `docker compose up --build`.
  - Service URLs & port bindings table (`frontend` at `http://localhost:80`, `backend-api` at `http://localhost:8080/api`, `rabbitmq` at `http://localhost:15672`).
  - Graceful shutdown command: `docker compose down -v`.
- **Local Development Setup:**
  - Step-by-step instructions for running Backend (`./mvnw spring-boot:run` or `./mvnw test` with JDK 25).
  - Step-by-step instructions for running Frontend (`npm install`, `npm run dev`, `npm run test`, `npm run build` with Node 22+).

### 3.4. Key Design Decisions
- **Clustered Quartz with JDBC JobStore:** Ensures multi-node synchronization, high availability, and persistent triggers across application restarts without split-brain issues.
- **Role Separation via Feature Toggles (`SCHEDULER_ENABLED` vs `WORKER_ENABLED`):** Decouples REST submission/triggering from actual execution, allowing independent horizontal scaling of API nodes and background worker nodes.
- **RabbitMQ Task Queue Dispatch:** Decouples Quartz job execution threads from workload execution, preventing trigger misfires under heavy task execution loads.
- **Dynamic Schema-Driven Form Generation:** Decouples UI form fields from backend task implementations; frontend fetches `/api/tasks` and dynamically renders types (`STRING`, `NUMBER`, `EMAIL`) with validation.
- **Unified Multi-Stage Containerization & Reverse Proxy:** Frontend Nginx container proxies `/api/*` to `backend-api:8080` to prevent CORS issues in production.

### 3.5. System Assumptions
- Predefined tasks are immutable code-defined blueprints; user scheduling entities reference them.
- Timezone handling: Stored in UTC (`Instant`); displayed in browser local time.
- Fresh database startup: Starts with zero scheduled instances; operators can create new schedules via the UI.
- Quartz clustered table prefix `QRTZ_` initialized automatically by Spring Boot Quartz starter.

### 3.6. Verification & Automated Testing
- Instructions to run backend unit, slice, and integration tests (29 passing tests).
- Instructions to run frontend Vitest component and hook tests (38 passing tests).

---

## 4. Acceptance Criteria
1. `README.md` is created at the repository root.
2. Directly answers all parts of Requirement 7: "How to run the system", "Design decisions", and "Any assumptions made".
3. Accurate paths, ports, credentials, and CLI commands.
