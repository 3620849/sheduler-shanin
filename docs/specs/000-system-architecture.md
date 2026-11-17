# Distributed Task Scheduling Platform — Architecture Specification

## 1. Overview
A distributed, containerized task scheduling system capable of scheduling and executing recurrent tasks using Quartz Scheduler, Spring Boot 4.1.2 (Java 25), MySQL 8.4, RabbitMQ 4.x, and a React (Vite) frontend served via Nginx.

## 2. System Topology
The platform consists of 5 containerized services coordinated via Docker Compose:
- `mysql`: Relational store for task definitions, schedules, and Quartz JDBC JobStore (`QRTZ_*`).
- `rabbitmq`: Message broker for dispatching execution tasks from the API layer to background workers.
- `backend-api`: Client-facing REST API (port 8080) for schedule CRUD, task metadata delivery, and dispatch publishing (`SCHEDULER_ENABLED=true`, `WORKER_ENABLED=false`).
- `backend-worker`: Background worker executing Quartz jobs and task logic, consuming events from RabbitMQ (`SCHEDULER_ENABLED=false`, `WORKER_ENABLED=true`).
- `frontend`: Single-page React application compiled to static files and served by Nginx on port 80 (with reverse proxy for `/api/` to `backend-api`).

## 3. Predefined Tasks & Schema Specification
Tasks are read-only and hardcoded. Each task exposes a parameter schema used for dynamic UI rendering and backend validation:
1. `LOG_TASK`:
   - Schema: `message` (string, required).
   - Execution: Writes the payload message into the application log.
2. `EMAIL_TASK`:
   - Schema: `to` (string, required, email regex), `subject` (string, required), `body` (string, optional).
   - Execution: Simulates email sending with structured log output.
3. `DB_QUERY_TASK`:
   - Schema: `query` (string, required), `timeoutSeconds` (number, optional, default: 30).
   - Execution: Simulates a query check with execution time logging.

## 4. Scheduling Engine & Quartz Triggers
Supported timing options:
- **One-Time**: Scheduled for a specific future instant (Quartz `SimpleTrigger`, repeat count = 0).
- **Interval**: Repeating at fixed duration intervals (e.g., every 30 seconds, 15 minutes, 2 hours).
- **Weekly**: Repeating on specific days of the week (e.g., MON, WED, FRI at 09:00).
- **Cron**: Custom Quartz cron expression (e.g., `0 0 12 ? * MON-FRI`).

Database persistence: Quartz JDBC JobStore configured with MySQL dialect and clustering enabled (`isClustered=true`).

## 5. API Endpoints Contract
- `GET /api/tasks` — List predefined task definitions and their parameter schemas.
- `GET /api/schedulings` — List all schedulings with status, next run time, and execution statistics.
- `POST /api/schedulings` — Create a new schedule (validating parameters against selected task schema).
- `PUT /api/schedulings/{id}` — Update schedule timing, status, or parameters.
- `DELETE /api/schedulings/{id}` — Delete schedule and unschedule Quartz triggers.

## 6. Implementation Stages
1. **Stage 1**: Backend Core, Task Metadata, and Quartz Integration.
2. **Stage 2**: RabbitMQ Integration and Two-Node Split (`backend-api` & `backend-worker`).
3. **Stage 3**: React UI Dashboard with Dynamic Schema Forms.
4. **Stage 4**: Multi-stage Dockerfiles, Nginx Reverse Proxy & `compose.yaml`.