# Specification: 007 - Quartz Execution History Tracking & Live Log Stream

## 1. Context & Motivation
Currently, Quartz triggers fire tasks through RabbitMQ to background workers where `TaskExecutionService` logs actions via SLF4J. However, execution logs and historical results (start time, duration, execution status, and textual output) are not persisted in the database. Consequently, users cannot inspect past executions or monitor live task runs from the web dashboard.

An example reference implementation was provided in the temporary `example/` directory demonstrating:
1. An execution drawer showing quartz executions with status, output logs, duration, and fire time.
2. Auto-polling / live refresh stream.
3. Row-level action buttons on scheduled jobs to inspect executions for a specific schedule, and a global view to inspect all execution events.

This specification defines the production implementation adapted to the project's domain architecture (UUID IDs, `Scheduling` entity, `TaskType`, `ApiResponse<T>`, 3-tier layering, and React UI design system), covered with comprehensive unit/integration tests, followed by the safe removal of the temporary `example/` directory.

---

## 2. Architectural Boundaries & Dependencies
- **Layering & Standards:** Adheres to ADR-001 (Java 25, Spring Boot 4.1.2, JPA/Hibernate 7, MySQL 8.4, 3-tier architecture with Java records for DTOs, `ApiResponse<T>` envelope).
- **Messaging Integration:** Persists execution records within `TaskExecutionService` when the worker node processes the `TaskExecutionMessage`.
- **Dependencies:**
  - `000-system-architecture.md` (System topology and baseline)
  - `001-backend-core-scheduling.md` (Core domain and database setup)
  - `002-rabbitmq-role-separation.md` (RabbitMQ execution flow and worker)
  - `003-frontend-scheduling-dashboard.md` (Frontend dashboard layout & theme)
  - `005-frontend-testing-suite.md` (Vitest & React Testing Library standards)

---

## 3. Backend Specification

### 3.1 Domain Entity: `TaskExecution`
Create `com.shanin.scheduler.entity.TaskExecution` persisted in `task_executions` table:
```java
@Entity
@Table(name = "task_executions", indexes = {
    @Index(name = "idx_task_executions_scheduling_id", columnList = "scheduling_id"),
    @Index(name = "idx_task_executions_fire_time", columnList = "fire_time")
})
@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class TaskExecution {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "scheduling_id")
    private UUID schedulingId;

    @Column(name = "task_name", nullable = false)
    private String taskName;

    @Enumerated(EnumType.STRING)
    @Column(name = "task_type", nullable = false, length = 64)
    private TaskType taskType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private ExecutionStatus status;

    @Column(columnDefinition = "TEXT")
    private String output;

    @Column(name = "duration_ms", nullable = false)
    private Long durationMs;

    @Column(name = "fire_time", nullable = false)
    private Instant fireTime;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
```

### 3.2 Enum: `ExecutionStatus`
```java
package com.shanin.scheduler.entity;

public enum ExecutionStatus {
    SUCCESS,
    FAILED
}
```

### 3.3 DTO Contract: `TaskExecutionResponse`
```java
package com.shanin.scheduler.dto;

import com.shanin.scheduler.entity.ExecutionStatus;
import com.shanin.scheduler.entity.TaskExecution;
import com.shanin.scheduler.model.TaskType;

import java.time.Instant;
import java.util.UUID;

public record TaskExecutionResponse(
    UUID id,
    UUID schedulingId,
    String taskName,
    TaskType taskType,
    ExecutionStatus status,
    String output,
    Long durationMs,
    Instant fireTime,
    Instant createdAt
) {
    public static TaskExecutionResponse from(TaskExecution execution) {
        return new TaskExecutionResponse(
            execution.getId(),
            execution.getSchedulingId(),
            execution.getTaskName(),
            execution.getTaskType(),
            execution.getStatus(),
            execution.getOutput(),
            execution.getDurationMs(),
            execution.getFireTime(),
            execution.getCreatedAt()
        );
    }
}
```

### 3.4 Repository Layer: `TaskExecutionRepository`
```java
package com.shanin.scheduler.repository;

import com.shanin.scheduler.entity.TaskExecution;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TaskExecutionRepository extends JpaRepository<TaskExecution, UUID> {
    List<TaskExecution> findBySchedulingIdOrderByFireTimeDesc(UUID schedulingId);
    List<TaskExecution> findTop50ByOrderByFireTimeDesc();
}
```

### 3.5 Worker Execution Recording: `TaskExecutionService`
Update `TaskExecutionService.execute(TaskExecutionMessage message)`:
- Execute action and capture human-readable output summary (e.g. `[LOG_TASK] Executed: <message>`).
- Measure duration in milliseconds.
- On success: persist `TaskExecution` with `ExecutionStatus.SUCCESS`.
- On exception: persist `TaskExecution` with `ExecutionStatus.FAILED` and the error message as output, then rethrow.

### 3.6 Query Service & REST Controller
Create `ExecutionService` and `ExecutionController`:
- Endpoint: `GET /api/executions`
- Query parameter: `@RequestParam(required = false) UUID schedulingId`
- If `schedulingId != null`: return executions for that schedule ordered by `fireTime` DESC.
- If `schedulingId == null`: return recent executions (top 50) ordered by `fireTime` DESC.
- Response wrapper: `ApiResponse<List<TaskExecutionResponse>>`.

---

## 4. Frontend Specification

### 4.1 Data Types (`frontend/src/types/execution.ts`)
```typescript
export type ExecutionStatus = 'SUCCESS' | 'FAILED';

export interface TaskExecution {
  id: string;
  schedulingId: string | null;
  taskName: string;
  taskType: string;
  status: ExecutionStatus;
  output: string;
  durationMs: number;
  fireTime: string;
  createdAt: string;
}
```

### 4.2 API Client (`frontend/src/api/executionsApi.ts`)
```typescript
export const executionsApi = {
  getExecutions: async (schedulingId?: string): Promise<TaskExecution[]> => {
    const url = schedulingId ? `/api/executions?schedulingId=${schedulingId}` : '/api/executions';
    const response = await apiClient.get<ApiResponse<TaskExecution[]>>(url);
    return response.data.data;
  }
};
```

### 4.3 Component: `ExecutionsDrawer` (`frontend/src/components/dashboard/ExecutionsDrawer.tsx`)
- Props:
  - `isOpen: boolean`
  - `onClose: () => void`
  - `selectedScheduling: SchedulingResponse | null`
- Features:
  - Slide-out drawer on the right with dark glass styling consistent with design system.
  - Dynamic header: "Executions: {selectedScheduling.name}" or "Live Execution Stream".
  - Auto-refresh toggle with polling interval (3 seconds) and visual pulse indicator.
  - Manual refresh button with spinning state on loading.
  - List of execution cards:
    - Status icon (`CheckCircle2` for SUCCESS, `XCircle` for FAILED)
    - Task name and scheduling ID badge
    - Status pill (`badge-success` or `badge-danger`)
    - Output block styled in monospace pre-wrap
    - Fired timestamp and duration in ms
  - Empty state with informative icon and instructions when no executions exist.

### 4.4 Dashboard Integration
- Row action button in `SchedulingsTable.tsx`: "View executions" with `FileText` icon.
- Header / Stats action in `App.tsx` / `Header.tsx`: "Live Execution Stream" button to open drawer for all executions.

---

## 5. Testing & Validation Plan
1. **Backend Tests:**
   - `TaskExecutionRepositoryTest`: verify saving and querying by `schedulingId` and ordering by `fireTime`.
   - `TaskExecutionServiceTest`: verify successful and failed executions are correctly recorded in the repository.
   - `ExecutionControllerTest`: verify `GET /api/executions` with and without `schedulingId`.
2. **Frontend Tests:**
   - `ExecutionsDrawer.test.tsx`: test rendering, execution list display, empty state, auto-refresh toggle, and manual refresh.
   - `SchedulingsTable.test.tsx`: verify "View executions" button triggers callback with schedule details.
3. **Cleanup:**
   - Delete `example/` directory once all tests pass.
