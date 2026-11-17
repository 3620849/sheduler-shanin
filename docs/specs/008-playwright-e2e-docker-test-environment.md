# 008: Playwright E2E Testing Suite with Dockerized Test Environment

## 1. Overview & Objectives
This specification defines the implementation of a comprehensive End-to-End (E2E) testing framework using **Playwright** running against an isolated, containerized test environment powered by **Docker Compose** with a dedicated test database.

The objectives are:
1. **Isolated Test Environment**: Provide a dedicated Docker Compose configuration (`docker-compose.test.yml`) defining isolated services (`mysql-test`, `rabbitmq-test`, `backend-api-test`, `backend-worker-test`, and `frontend-test`) with non-colliding host port mappings and an independent test database (`scheduler_test_db`).
2. **Deterministic State & Data Hygiene**: Ensure E2E tests run without affecting local development data or production volumes, with automated database schema provisioning via Spring Boot / Quartz initialization.
3. **Comprehensive User-Journey Coverage**: Validate core platform workflows in real browser sessions:
   - Dashboard rendering, navigation, and live statistics.
   - Predefined task catalog consumption and dynamic form rendering (`LOG_TASK`, `EMAIL_TASK`, `DB_QUERY_TASK`).
   - Dynamic schedule creation across timing modes (One-time, Interval, Weekly, Cron).
   - Lifecycle mutations: Pause, Resume, Edit, and Delete (with confirmation modal).
   - Execution tracking: Validating task dispatch through RabbitMQ, worker execution, and real-time execution drawer streaming.
   - Server-side pagination controls and data table navigation.
4. **Developer Experience & CI Readiness**: Provide intuitive NPM scripts (`test:e2e`, `test:e2e:ui`, `test:e2e:docker`) supporting headless execution in CI as well as headed/interactive debugging on local workstations.

---

## 2. Architectural Boundaries & Dependencies

- **Frameworks & Tools:**
  - **E2E Test Engine:** `@playwright/test` (v1.50+).
  - **Browser Runtimes:** Chromium (default), Firefox, WebKit.
  - **Container Runtime:** Docker Engine + Docker Compose v2.
- **Related Specifications:**
  - `docs/specs/000-system-architecture.md` (System baseline)
  - `docs/specs/001-backend-core-scheduling.md` (Core domain and database schema)
  - `docs/specs/002-rabbitmq-role-separation.md` (Async dispatch and worker execution)
  - `docs/specs/003-frontend-scheduling-dashboard.md` (UI dashboard and dynamic forms)
  - `docs/specs/004-containerization-orchestration.md` (Multi-stage Dockerfiles and Nginx reverse proxy)
  - `docs/specs/006-schedulings-pagination.md` (Pagination API & UI controls)
  - `docs/specs/007-execution-history-tracking.md` (Executions API & slide-out drawer)
- **ADR Alignment:** ADR-001 (Tech stack, MySQL 8.4, RabbitMQ 4.x, Spring Boot 4.1.2, Java 25, React Vite SPA).

---

## 3. Docker Test Environment Architecture (`docker-compose.test.yml`)

To prevent port and volume collisions with active local services or default development compose instances:

| Service | Container Name | Image / Build Context | Internal Port | Host Port Mapping | Environment Highlights |
|:---|:---|:---|:---|:---|:---|
| `mysql-test` | `scheduler-mysql-test` | `mysql:8.4` | `3306` | `3307:3306` | `MYSQL_DATABASE: scheduler_test_db`<br>`MYSQL_USER: appuser`<br>`MYSQL_PASSWORD: appsecret`<br>Ephemeral volume or dedicated test volume `mysql-test-data` |
| `rabbitmq-test` | `scheduler-rabbitmq-test` | `rabbitmq:4-management-alpine` | `5672`, `15672` | `5673:5672`, `15673:15672` | `RABBITMQ_DEFAULT_USER: guest`<br>`RABBITMQ_DEFAULT_PASS: guest` |
| `backend-api-test` | `scheduler-backend-api-test` | `backend/Dockerfile` | `8080` | `8081:8080` | `SPRING_DATASOURCE_URL: jdbc:mysql://mysql-test:3306/scheduler_test_db?...`<br>`SCHEDULER_ENABLED: true`<br>`WORKER_ENABLED: false` |
| `backend-worker-test` | `scheduler-backend-worker-test` | `backend/Dockerfile` | N/A | None | `SPRING_DATASOURCE_URL: jdbc:mysql://mysql-test:3306/scheduler_test_db?...`<br>`SCHEDULER_ENABLED: false`<br>`WORKER_ENABLED: true` |
| `frontend-test` | `scheduler-frontend-test` | `frontend/Dockerfile` | `80` | `8082:80` | Nginx reverse proxy routing `/api/` to `http://backend-api-test:8080/api/` |

### 3.1 Network & Volume Isolation
- Network: `scheduler-test-network` (isolated bridge network).
- Volumes:
  - `mysql-test-data`: Independent volume destroyed on `down -v` to ensure pristine resets.
  - `rabbitmq-test-data`: Independent volume for test broker queues.

---

## 4. Playwright Test Suite Architecture (`frontend/`)

The E2E suite will reside in `frontend/e2e/`, sharing TypeScript configuration and project context while keeping E2E concerns decoupled from Vitest unit tests:

```
frontend/
├── e2e/
│   ├── fixtures/
│   │   ├── test-data.ts             # Generators for unique schedule names and payload fixtures
│   │   └── api-helpers.ts           # Direct REST helpers for setup/teardown & assert verification
│   ├── tests/
│   │   ├── 01-dashboard-view.spec.ts     # Initial load, task catalog fetch, metrics cards, table view
│   │   ├── 02-create-scheduling.spec.ts  # Modal interactions: LOG_TASK, EMAIL_TASK, DB_QUERY_TASK
│   │   ├── 03-schedule-lifecycle.spec.ts # Pause, Resume, Edit parameter update, Delete with modal
│   │   ├── 04-concurrent-suspension.spec.ts # Multi-schedule isolation: suspending one while others keep firing
│   │   ├── 05-execution-history.spec.ts  # Execution drawer trigger, live stream, status verification
│   │   └── 06-pagination.spec.ts         # Navigation across pages, page size changes, edge states
│   └── page-objects/
│       ├── DashboardPage.ts         # Page object model covering table, status badges, metrics, drawer
│       └── SchedulingModalPage.ts   # Page object model covering 3-step modal, dynamic forms, validation
├── playwright.config.ts             # Playwright configuration (baseURL, browsers, trace/video/screenshot)
└── package.json                     # Updated with @playwright/test & test scripts
```

### 4.1 Playwright Configuration (`frontend/playwright.config.ts`)
- **Base URL:** Parameterized via `process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:8082'`.
- **Target Browsers:** Chromium (primary), with Firefox and WebKit enabled or configured.
- **Reporting:** HTML report generated in `playwright-report/` and list reporter in console.
- **Artifacts on Failure:** Screenshots captured on failure (`screenshot: 'only-on-failure'`), traces retained on first retry (`trace: 'retain-on-failure'`).
- **Timeouts:** Action timeout: 15s; Navigation timeout: 30s; Expect timeout: 10s.

---

## 5. E2E Test Scenarios & Specifications

### 5.1 Dashboard & Navigation (`01-dashboard-view.spec.ts`)
- Verify page title `Distributed Task Scheduler` and branding elements.
- Verify that summary statistics cards (Total, Active, Paused, Completed) render with valid numerical counts.
- Verify task type definitions loaded from `GET /api/tasks` are reflected in the UI.

### 5.2 Dynamic Scheduling Creation (`02-create-scheduling.spec.ts`)
- **Scenario A (LOG_TASK Interval):**
  1. Click "Create Scheduling" button.
  2. Verify modal Step 1 (General Info): enter unique schedule name and description. Click Next.
  3. Step 2 (Task Config): Select `LOG_TASK`. Verify dynamic form renders required text input `message`. Enter `"Automated E2E Log"`. Click Next.
  4. Step 3 (Timing Config): Select `INTERVAL`, specify interval duration `10 SECONDS`.
  5. Click "Create Schedule".
  6. Assert modal closes, notification appears, and table shows the new row with `ACTIVE` badge.
- **Scenario B (EMAIL_TASK Validation & Submission):**
  1. Open modal, choose `EMAIL_TASK`.
  2. Attempt submission without required email address, assert validation message.
  3. Fill valid email (`test@example.com`), subject, and body.
  4. Select `CRON` timing, apply standard preset (`* * * * * ?`).
  5. Submit and verify presence in table.

### 5.3 Schedule Lifecycle Actions (`03-schedule-lifecycle.spec.ts`)
- **Pause & Resume:**
  1. Locate target schedule row.
  2. Click Pause action button -> verify row badge transitions from `ACTIVE` to `PAUSED`.
  3. Click Resume action button -> verify row badge transitions back from `PAUSED` to `ACTIVE`.
- **Edit Scheduling:**
  1. Click Edit button on schedule row.
  2. Verify modal pre-populates existing name, task type, parameters, and timing configuration.
  3. Modify schedule name and update task parameter.
  4. Submit -> verify table row displays updated name.
- **Delete Confirmation:**
  1. Click Delete action button on schedule row.
  2. Verify confirmation dialog appears with warning text.
  3. Click "Cancel" -> verify row still exists.
  4. Click Delete action button again, click "Delete" confirm button.
  5. Verify schedule row is removed from table and total count decreases.

### 5.4 Concurrent Suspension & Execution Isolation (`04-concurrent-suspension.spec.ts`)
- **Isolation Verification Workflow:**
  1. Provision two independent schedules via UI or test helpers:
     - **Schedule Alpha**: `INTERVAL` of `3 SECONDS`, `LOG_TASK` (`message: "Alpha Execution"`).
     - **Schedule Beta**: `INTERVAL` of `3 SECONDS`, `LOG_TASK` (`message: "Beta Execution"`).
  2. Wait for initial trigger confirmation (at least 1 execution recorded in the system for each schedule).
  3. Suspend (Pause) **Schedule Alpha**:
     - Click Pause button on Schedule Alpha row.
     - Verify Schedule Alpha transitions to `PAUSED` badge in the UI.
     - Verify Schedule Beta remains in `ACTIVE` state.
  4. Sample execution counts at pause time $T_0$:
     - Record $Count(Alpha)_{T_0}$ and $Count(Beta)_{T_0}$.
  5. Wait across multiple execution cycles (e.g., 6–9 seconds):
     - Query executions (via REST API helper and UI execution drawer).
     - **Assert Active Isolation**: Schedule Beta continues to fire and execute ($Count(Beta)_{T_1} > Count(Beta)_{T_0}$).
     - **Assert Suspended Inactivity**: Schedule Alpha produces zero new executions ($Count(Alpha)_{T_1} == Count(Alpha)_{T_0}$).
  6. Resume **Schedule Alpha**:
     - Click Resume button on Schedule Alpha row.
     - Verify badge updates to `ACTIVE`.
     - Wait 1 interval cycle: assert that Schedule Alpha resumes firing ($Count(Alpha)_{T_2} > Count(Alpha)_{T_1}$) while Schedule Beta continues uninterrupted.

### 5.5 Execution History & Log Streaming (`05-execution-history.spec.ts`)
- Verify clicking "Executions" row action opens the slide-out history drawer.
- Verify drawer shows schedule metadata, execution status badges, duration, and output log stream.
- Verify drawer close button restores focus to dashboard.

### 5.6 Pagination Navigation (`06-pagination.spec.ts`)
- Verify pagination footer displays correct page count and element ranges.
- Navigate between pages using Next/Prev and direct page number buttons, validating table updates.

---

## 6. Execution Commands & Developer Workflow

```bash
# 1. Start the isolated test environment
docker compose -f docker-compose.test.yml up -d --wait --build

# 2. Run Playwright E2E tests (headless)
cd frontend
npm run test:e2e

# 3. Run Playwright with interactive UI mode
npm run test:e2e:ui

# 4. Stop and prune test environment and test database volume
docker compose -f docker-compose.test.yml down -v
```

A root-level orchestration helper script (e.g., `npm run test:e2e:docker` or PowerShell equivalent) will be configured to automate spin-up, test execution, and teardown in a single command.

---

## 7. Acceptance Criteria
- [ ] `docker-compose.test.yml` successfully provisions `mysql-test`, `rabbitmq-test`, `backend-api-test`, `backend-worker-test`, and `frontend-test` on dedicated ports with healthchecks passing.
- [ ] Database `scheduler_test_db` initializes schema tables (`schedulings`, `task_executions`, `QRTZ_*`) automatically without polluting dev database.
- [ ] `@playwright/test` and dependencies installed in `frontend/`.
- [ ] Comprehensive Page Object Models and 6 test suites implemented in `frontend/e2e/`.
- [ ] Multi-schedule isolation test (`04-concurrent-suspension.spec.ts`) verifies that suspending one schedule halts its executions while other active schedules continue firing unimpeded.
- [ ] All Playwright E2E tests pass reliably against `frontend-test` on `http://localhost:8082`.
- [ ] Clean teardown supported via `docker compose -f docker-compose.test.yml down -v`.
