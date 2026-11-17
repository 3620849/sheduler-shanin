# 005: Frontend Testing Suite (Vitest + React Testing Library)

## 1. Overview
This specification defines the comprehensive automated testing suite for the React frontend (`frontend/`), addressing Requirement 6 of the core requirements. It establishes testing infrastructure utilizing **Vitest**, **React Testing Library**, **jest-dom**, and **jsdom** to provide unit and component integration coverage across the dashboard UI, dynamic parameter forms, timing selectors, and CRUD modals.

---

## 2. Architectural Alignment & Dependencies
- **Parent Specifications:**
  - `docs/specs/000-system-architecture.md` (System Baseline)
  - `docs/specs/003-frontend-scheduling-dashboard.md` (Frontend Architecture)
- **Framework & Libraries:**
  - **Test Runner:** `vitest` (fast, native Vite integration, sharing `vite.config.ts`).
  - **DOM Environment:** `jsdom`.
  - **Component Testing:** `@testing-library/react` and `@testing-library/dom`.
  - **DOM Matchers:** `@testing-library/jest-dom`.
- **Test Scripts (`frontend/package.json`):**
  - `"test": "vitest run"` (CI/single-run mode)
  - `"test:watch": "vitest"` (interactive watch mode)

---

## 3. Test Architecture & Structure

```
frontend/
├── src/
│   ├── test/
│   │   ├── setup.ts                      # Global test setup (jest-dom matchers, window mocks)
│   │   └── mocks/
│   │       ├── mockTasks.ts              # Predefined task fixtures (LOG_TASK, EMAIL_TASK, DB_QUERY_TASK)
│   │       └── mockSchedulings.ts        # Scheduling response fixtures (active, paused, completed)
│   ├── api/
│   │   └── client.test.ts                # Unit tests for API client & error extractor
│   ├── components/
│   │   ├── common/
│   │   │   └── Badge.test.tsx            # Status, Task, and ScheduleType badge rendering
│   │   ├── dashboard/
│   │   │   └── SchedulingsTable.test.tsx # Table rendering, empty state, action clicks, delete confirmation
│   │   └── modal/
│   │       ├── DynamicParameterForm.test.tsx # Dynamic schema rendering, required flags, type handling
│   │       ├── ScheduleTimingSelector.test.tsx # Timing mode switching, intervals, weekly, cron
│   │       └── SchedulingModal.test.tsx  # Form validation, step interactions, submission payload
│   └── hooks/
│       ├── useTasks.test.ts              # Hook state lifecycle, loading, error, reload
│       └── useSchedulings.test.ts        # Hook CRUD state lifecycle, optimistic updates, reload
├── vite.config.ts                        # Updated with test environment configuration
└── package.json                          # Updated with test dependencies and scripts
```

---

## 4. Test Specifications

### 4.1. Unit & Utility Testing
- **`api/client.test.ts`**:
  - Verifies `extractErrorMessage` correctly extracts error messages from:
    - Structured `ApiError` envelopes (`response.data.error.message`).
    - Standard error payloads (`response.data.message`).
    - Raw Axios errors or standard JavaScript `Error` objects.
    - Fallback default message when unknown errors occur.

### 4.2. Component Unit & Integration Testing
- **`components/dashboard/SchedulingsTable.test.tsx`**:
  - Renders empty state message and "Create First Scheduling" button when `schedulings = []`.
  - Renders table headers and rows accurately when schedulings are present.
  - Displays correct badges for status (`ACTIVE`, `PAUSED`, `COMPLETED`), task types, and schedule timing.
  - Triggers `onToggleStatus` callback when Pause / Resume button is clicked.
  - Triggers `onEdit` callback with the selected scheduling when Edit button is clicked.
  - Opens `ConfirmDialog` upon clicking Delete and invokes `onDelete` only after user confirmation.
- **`components/modal/DynamicParameterForm.test.tsx`**:
  - Renders task selection dropdown with all tasks from `tasks` prop.
  - Dynamically renders parameter input fields based on the selected task schema:
    - `LOG_TASK`: text input for `message`.
    - `EMAIL_TASK`: email input for `to`, text for `subject`, textarea for `body`.
    - `DB_QUERY_TASK`: textarea for `query`, number input for `timeoutSeconds`.
  - Displays red required asterisk (`*`) for required parameters.
  - Calls `onParameterChange` with string or parsed numeric value on input change.
  - Displays field-level validation errors passed via `errors` prop.
- **`components/modal/ScheduleTimingSelector.test.tsx`**:
  - Switches between `ONE_TIME`, `INTERVAL`, `WEEKLY`, and `CRON` modes.
  - Computes and displays interval amount and unit (seconds, minutes, hours).
  - Toggles days of the week in `WEEKLY` mode and binds `timeOfDay`.
  - Applies preset cron expressions on click.
  - Renders timing validation error messages.
- **`components/modal/SchedulingModal.test.tsx`**:
  - Validates required schedule name (shows error on empty submit).
  - Validates required task parameters before submitting.
  - Validates schedule timing rules (e.g. interval > 0, at least one day selected for weekly, 6-7 cron fields).
  - Assembles correct `CreateSchedulingRequest` or `UpdateSchedulingRequest` payload and calls `onSubmit`.

### 4.3. Custom Hook Testing
- **`hooks/useTasks.test.ts`**:
  - Sets `loading: true` initially and loads task definitions into state.
  - Handles API failures gracefully by setting `error` state.
- **`hooks/useSchedulings.test.ts`**:
  - Verifies CRUD action lifecycle methods (`createScheduling`, `updateScheduling`, `toggleStatus`, `deleteScheduling`).

---

## 5. Verification & Acceptance Criteria
1. All dependencies installed cleanly without breaking existing build configurations.
2. `npm run test` executes in `frontend/` and passes 100% of test suites with zero failures.
3. Production build `npm run build` continues to build cleanly with zero type errors.
