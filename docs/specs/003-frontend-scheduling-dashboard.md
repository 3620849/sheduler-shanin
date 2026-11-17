# 003: Frontend Scheduling Dashboard (React + Vite + TypeScript)

## 1. Overview
This specification details the frontend Single Page Application (SPA) built using **React, Vite, and TypeScript**. The application provides an administrative dashboard for managing distributed schedulings, visualizing next execution times, pausing/resuming jobs, and dynamically generating parameter input forms driven by backend task metadata (`/api/tasks`).

## 2. Architectural Alignment & Decisions
- **Framework & Build Tool:** React 19 / 18 with Vite and TypeScript.
- **API Base URL & Routing:** Base URL `/api`. In development, Vite dev server proxies `/api` to `http://localhost:8080`. In production, Nginx proxies `/api` to `backend-api:8080`.
- **Backend API Integration:**
  - `GET /api/tasks` — Fetches predefined task schemas (`LOG_TASK`, `EMAIL_TASK`, `DB_QUERY_TASK`).
  - `GET /api/schedulings` — Lists all scheduled jobs with status and next run times.
  - `POST /api/schedulings` — Submits new scheduling with validated task parameters and schedule configs.
  - `PUT /api/schedulings/{id}` — Updates schedule details or toggles status (`ACTIVE` / `PAUSED`).
  - `DELETE /api/schedulings/{id}` — Deletes schedule and unschedules Quartz triggers.
- **Contract Adherence:** Adheres to backend `ApiResponse<T>` envelope format (`success`, `data`, `error`, `timestamp`).

## 3. Component Architecture & State Management

```
frontend/
├── src/
│   ├── api/
│   │   ├── client.ts              # Axios / Fetch client configured with /api base URL
│   │   ├── tasksApi.ts            # getTasks(), getTaskByType()
│   │   └── schedulingsApi.ts      # getSchedulings(), createScheduling(), updateScheduling(), deleteScheduling()
│   ├── types/
│   │   ├── api.ts                 # ApiResponse<T>, ApiError
│   │   ├── task.ts                # TaskDefinition, ParameterDefinition, TaskType, ParameterType
│   │   └── scheduling.ts          # Scheduling, ScheduleType, ScheduleStatus, CreateSchedulingRequest, UpdateSchedulingRequest
│   ├── hooks/
│   │   ├── useTasks.ts            # Hook for fetching and caching predefined task schemas
│   │   └── useSchedulings.ts      # Hook for fetching, refreshing, creating, updating, toggling, deleting schedulings
│   ├── components/
│   │   ├── common/
│   │   │   ├── Badge.tsx          # Status and Task badges
│   │   │   ├── Button.tsx         # Standard button with loading states and variants
│   │   │   ├── Modal.tsx          # Accessible modal dialog with backdrop
│   │   │   ├── Toast.tsx          # Success / Error toast notifications
│   │   │   └── ConfirmDialog.tsx  # Confirmation dialog for destructive actions (Delete)
│   │   ├── dashboard/
│   │   │   ├── SchedulingsTable.tsx  # Responsive data table listing schedulings & actions
│   │   │   └── Header.tsx         # Dashboard header with Create button & Refresh button
│   │   └── modal/
│   │       ├── SchedulingModal.tsx       # Multi-step/section Create & Edit modal
│   │       ├── GeneralInfoStep.tsx      # Step 1: Name and optional description
│   │       ├── DynamicParameterForm.tsx # Step 2: Dynamic schema parameter input engine
│   │       └── ScheduleTimingSelector.tsx# Step 3: One-Time, Interval, Weekly, Cron selector
│   ├── App.tsx                    # Main dashboard container & notification state
│   ├── main.tsx                   # React root entry point
│   └── index.css                  # Modern UI styles & utilities
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.node.json
└── vite.config.ts                 # Configured with proxy to http://localhost:8080
```

## 4. Feature Specifications

### 4.1. API Client & Data Models
- **Standardized Client:** Uses Axios/Fetch with error interceptors extracting backend `ApiError` messages (`code`, `message`, `details`).
- **Data Models:** Strict TypeScript interfaces reflecting backend records:
  - `TaskType`: `'LOG_TASK' | 'EMAIL_TASK' | 'DB_QUERY_TASK'`
  - `ScheduleType`: `'ONE_TIME' | 'INTERVAL' | 'WEEKLY' | 'CRON'`
  - `ScheduleStatus`: `'ACTIVE' | 'PAUSED' | 'COMPLETED'`
  - `ParameterDefinition`: `name`, `type` (`STRING` | `NUMBER`), `required`, `description`, `defaultValue`, `format`, `min`, `max`.

### 4.2. Schedulings Table View
- **Table Columns:**
  1. **Name:** Scheduling name with optional description tooltip.
  2. **Task Type:** Badge displaying task type (e.g., `LOG_TASK`, `EMAIL_TASK`, `DB_QUERY_TASK`).
  3. **Schedule Type:** Badge showing `ONE_TIME`, `INTERVAL`, `WEEKLY`, or `CRON`, with summary info (e.g., "Every 30s", "Mon, Wed at 09:00", Cron expression).
  4. **Next Run Time:** Formatted local date/time, or "Completed" badge if null.
  5. **Status:** Color-coded status badge:
     - `ACTIVE`: Green
     - `PAUSED`: Amber / Yellow
     - `COMPLETED`: Slate / Gray
  6. **Actions:**
     - **Pause / Resume Toggle:** Toggle icon/button calling `updateScheduling(id, { status: newStatus })`.
     - **Edit Button:** Opens modal pre-filled with the scheduling's current configuration.
     - **Delete Button:** Opens confirmation prompt ("Are you sure you want to delete scheduling '...'?") before calling `deleteScheduling(id)`.
- **UX States:** Empty state placeholder with a "Create First Scheduling" CTA button, loading skeleton/spinner, and manual refresh button.

### 4.3. Create / Edit Scheduling Modal & Dynamic Schema Form
- **Section 1: General Info:**
  - Name: Required text input (max 255 chars).
  - Validation: Non-empty string.
- **Section 2: Task Selection & Dynamic Parameter Form:**
  - Task selector dropdown fetching definitions from `/api/tasks`.
  - Upon task selection, inspects `parameters`:
    - If `type === 'STRING'`:
      - If `format === 'email'`: Email input with email pattern validation.
      - If text: Text input or multiline textarea (for `body` or `query`).
    - If `type === 'NUMBER'`: Number input respecting `min`, `max`, and `defaultValue`.
    - Asterisk `*` marker and validation messages for `required === true`.
- **Section 3: Schedule Timing Selector:**
  - Tabbed or radio selection:
    1. **One-Time:** HTML5 `datetime-local` input, validating that the selected time is in the future. Maps to `scheduleConfig: { startAt: "<ISO-8601-string>" }`.
    2. **Interval:** Number input (amount) + unit dropdown (`Seconds`, `Minutes`, `Hours`). Converts to `scheduleConfig: { intervalSeconds: <computed_seconds> }`.
    3. **Weekly:** Day-of-week checkboxes/toggle chips (MON, TUE, WED, THU, FRI, SAT, SUN) + time picker (`timeOfDay: "HH:mm"`). Maps to `scheduleConfig: { daysOfWeek: ["MON", ...], timeOfDay: "HH:mm" }`.
    4. **Cron:** Quartz cron string input with syntax guidance explanation (6 fields: second, minute, hour, day-of-month, month, day-of-week) and quick helper preset buttons (e.g. "Every 5 minutes", "Hourly", "Daily at midnight"). Maps to `scheduleConfig: { cronExpression: "0 0 12 ? * MON-FRI" }`.

### 4.4. Validation, Notifications & UX
- Submit button is disabled or triggers comprehensive validation before dispatching API requests.
- Toast notifications appear on top-right:
  - Green toast for successful Create, Update, Delete, Pause, Resume.
  - Red toast for API failure with parsed backend error messages.
- Clean responsive layout compatible with mobile and desktop viewports.

## 5. Verification & Quality Gates
- `npm run build` succeeds with zero TypeScript (`tsc`) and bundling errors.
- Verification that all API payloads conform exactly to backend controller DTOs.
