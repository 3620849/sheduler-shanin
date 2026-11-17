# Spec 001: Core Backend Service & Quartz Scheduling Engine

## 1. Overview & Objectives
Implements Stage 1 of the Distributed Task Scheduling Platform:
- Baseline Spring Boot 4.1.2 application setup with Java 25.
- Read-only predefined task catalog (`LOG_TASK`, `EMAIL_TASK`, `DB_QUERY_TASK`) with parameter schema engine and validator.
- Database persistence for `Scheduling` entities backed by MySQL 8.4 and Quartz JDBC JobStore (`QRTZ_*`).
- Quartz Scheduler Service capable of translating `Scheduling` configurations into clustered Quartz `JobDetail` and `Trigger` instances (`SimpleTrigger` & `CronTrigger`).
- Execution job simulating task execution and updating scheduling status.
- Standardized REST APIs for task inspection (`GET /api/tasks`) and schedule CRUD (`/api/schedulings`).

---

## 2. Predefined Tasks & Schema Specification

### 2.1 Task Catalog
Each task is statically defined with an immutable parameter schema:
1. `LOG_TASK`:
   - Description: "Logs formatted messages to the standard log stream"
   - Schema:
     - `message` (type: `STRING`, required: `true`, minLength: 1)
2. `EMAIL_TASK`:
   - Description: "Simulates sending an email notification"
   - Schema:
     - `to` (type: `STRING`, required: `true`, format: `email`)
     - `subject` (type: `STRING`, required: `true`, minLength: 1)
     - `body` (type: `STRING`, required: `false`)
3. `DB_QUERY_TASK`:
   - Description: "Simulates database diagnostic query execution"
   - Schema:
     - `query` (type: `STRING`, required: `true`, minLength: 1)
     - `timeoutSeconds` (type: `NUMBER`, required: `false`, defaultValue: 30, min: 1, max: 300)

### 2.2 Schema Data Structures
```json
{
  "taskType": "EMAIL_TASK",
  "displayName": "Email Dispatch Task",
  "description": "Simulates sending an email notification",
  "parameters": [
    {
      "name": "to",
      "type": "STRING",
      "required": true,
      "format": "email",
      "description": "Recipient email address"
    },
    {
      "name": "subject",
      "type": "STRING",
      "required": true,
      "description": "Email subject"
    },
    {
      "name": "body",
      "type": "STRING",
      "required": false,
      "description": "Email body content"
    }
  ]
}
```

### 2.3 Parameter Validator Rules
- Verifies all `required: true` fields exist and are non-blank.
- Verifies data types: `STRING` must be string type; `NUMBER` must be integer/double.
- Performs format/pattern validations (e.g. RFC 5322 regex for `email`).
- Throws validation exception with structured field-level error messages if invalid.

---

## 3. Domain Model & Database Schema

### 3.1 Entity: `Scheduling` (`schedulings` table)
| Column | Type | Nullable | Description |
|:---|:---|:---|:---|
| `id` | `VARCHAR(36)` / `UUID` | No | Primary Key |
| `name` | `VARCHAR(255)` | No | User-friendly schedule name |
| `task_type` | `VARCHAR(64)` | No | `LOG_TASK`, `EMAIL_TASK`, `DB_QUERY_TASK` |
| `task_parameters` | `JSON` | No | Serialized Map of parameter values |
| `schedule_type` | `VARCHAR(32)` | No | `ONE_TIME`, `INTERVAL`, `WEEKLY`, `CRON` |
| `schedule_config` | `JSON` | No | Timing configurations |
| `status` | `VARCHAR(32)` | No | `ACTIVE`, `PAUSED`, `COMPLETED` |
| `next_run_at` | `DATETIME(6)` | Yes | Calculated timestamp of the next execution |
| `created_at` | `DATETIME(6)` | No | Creation timestamp (auto) |
| `updated_at` | `DATETIME(6)` | No | Last update timestamp (auto) |
| `version` | `BIGINT` | No | Optimistic locking counter |

### 3.2 Schedule Configurations
- **`ONE_TIME`**:
  - `startAt` (ISO-8601 string): Scheduled future trigger instant.
- **`INTERVAL`**:
  - `intervalSeconds` (positive integer): Execution interval.
  - `startAt` (optional ISO-8601 string, default now).
  - `repeatCount` (optional integer; -1 or omitted for indefinite).
- **`WEEKLY`**:
  - `daysOfWeek` (array of strings, e.g. `["MON", "WED", "FRI"]`).
  - `timeOfDay` (string `HH:mm:ss`, e.g. `09:30:00`).
- **`CRON`**:
  - `cronExpression` (string, valid Quartz 6-7 field cron expression, e.g. `0 0 12 ? * MON-FRI`).

---

## 4. Quartz Scheduler Service & Execution

### 4.1 Trigger Building
- **Group Key**: `"SCHEDULING_JOBS"`
- **Job Key**: `JobKey.jobKey(scheduling.getId().toString(), "SCHEDULING_JOBS")`
- **Trigger Key**: `TriggerKey.triggerKey(scheduling.getId().toString(), "SCHEDULING_TRIGGERS")`
- **JobDetail DataMap**:
  - `schedulingId`: UUID string
  - `taskType`: String
  - `taskParameters`: JSON serialized string

### 4.2 Job Execution (`TaskExecutionJob`)
- Implements `org.quartz.Job`.
- Deserializes parameters from `JobExecutionContext`.
- Dispatches execution simulation:
  - `LOG_TASK`: Logs `"[LOG_TASK] {message}"`.
  - `EMAIL_TASK`: Logs `"[EMAIL_TASK] Sending email to: {to}, Subject: {subject}"`.
  - `DB_QUERY_TASK`: Logs `"[DB_QUERY_TASK] Executing query: {query} with timeout: {timeoutSeconds}s"`.
- Updates `Scheduling` record:
  - Updates `nextRunAt` based on trigger's `getNextFireTime()`.
  - For `ONE_TIME` triggers or triggers without future fire times, updates `status` to `COMPLETED`.

### 4.3 Lifecycle Operations
- `schedule(Scheduling s)`: Builds JobDetail + Trigger, adds to Quartz Scheduler.
- `reschedule(Scheduling s)`: Updates existing Trigger in Quartz using `rescheduleJob(triggerKey, newTrigger)`.
- `pause(UUID id)`: Pauses Quartz trigger (`pauseTrigger(triggerKey)`).
- `resume(UUID id)`: Resumes Quartz trigger (`resumeTrigger(triggerKey)`).
- `unschedule(UUID id)`: Deletes Job and unschedules Trigger (`deleteJob(jobKey)`).

---

## 5. REST API Specifications

### 5.1 Endpoints
- `GET /api/tasks`: Returns list of available task schemas wrapped in `ApiResponse<List<TaskDefinitionResponse>>`.
- `GET /api/schedulings`: Returns list of all schedulings wrapped in `ApiResponse<List<SchedulingResponse>>`.
- `GET /api/schedulings/{id}`: Returns single scheduling details wrapped in `ApiResponse<SchedulingResponse>`.
- `POST /api/schedulings`: Validates request, creates `Scheduling`, schedules Quartz job, returns 201 Created with `ApiResponse<SchedulingResponse>`.
- `PUT /api/schedulings/{id}`: Updates scheduling config/parameters/status, updates Quartz trigger, returns `ApiResponse<SchedulingResponse>`.
- `DELETE /api/schedulings/{id}`: Unschedules Quartz trigger, deletes entity, returns 204 No Content.

### 5.2 Response Envelope
```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "timestamp": "2026-11-17T12:00:00Z"
}
```

### 5.3 Error Envelope
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Invalid task parameters",
    "details": [
      {
        "field": "to",
        "message": "Must be a valid email address"
      }
    ]
  },
  "timestamp": "2026-11-17T12:00:00Z"
}
```

---

## 6. Testing & Quality Assurance
- **Unit Tests**:
  - `TaskParameterValidatorTest`: Unit tests for `LOG_TASK`, `EMAIL_TASK`, `DB_QUERY_TASK` schema validation (valid and invalid inputs).
  - `QuartzTriggerBuilderTest`: Unit tests verifying correct trigger creation for ONE_TIME, INTERVAL, WEEKLY, and CRON schedule types.
- **Slice Tests**:
  - `@WebMvcTest(TaskController.class)`: Verifies `GET /api/tasks` response shape and status.
  - `@WebMvcTest(SchedulingController.class)`: Verifies validation, mock service orchestration, and response codes.
  - `@DataJpaTest`: Verifies `SchedulingRepository` persistence and custom JSON column mapping.
