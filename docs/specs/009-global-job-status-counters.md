# Specification: 009 - Global Job Status Counters

## 1. Context & Motivation
Following the introduction of server-side pagination in Specification `006`, the frontend `App.tsx` derives statistics cards using:
```typescript
const totalCount = totalElements;
const activeCount = schedulings.filter((s) => s.status === 'ACTIVE').length;
const pausedCount = schedulings.filter((s) => s.status === 'PAUSED').length;
```
Because `schedulings` contains only the items for the currently displayed page (default 10 items), `Active Jobs` and `Suspended Jobs` counters reflect only the counts for the current page slice rather than system-wide global totals. When navigating between pages or when the system has more than one page of jobs, these numbers do not reflect the actual number of active or suspended schedules in the platform.

The goal of this specification is to provide global job status statistics via a dedicated backend endpoint and update the frontend state to display true platform-wide totals across all pages.

---

## 2. Architectural Boundaries & Alignment
- **Architecture:** Adheres to the established 3-tier architecture (Controller -> Service -> Repository) and REST API conventions defined in `docs/adr/ARCHITECTURE_DECISIONS.md` and `docs/specs/000-system-architecture.md`.
- **Envelope Standard:** Complies with `ApiResponse<T>` envelope standards.
- **Backward Compatibility:** Zero breaking changes to `GET /api/schedulings` or `PageResponse<T>`.
- **Dependencies:**
  - `000-system-architecture.md` (REST API conventions)
  - `001-backend-core-scheduling.md` (Scheduling domain and repository)
  - `003-frontend-scheduling-dashboard.md` (Frontend dashboard & components)
  - `006-schedulings-pagination.md` (Pagination model)

---

## 3. Backend Specification

### 3.1 DTO Contract
Create `com.shanin.scheduler.dto.SchedulingStatsResponse`:
```java
package com.shanin.scheduler.dto;

public record SchedulingStatsResponse(
    long totalCount,
    long activeCount,
    long pausedCount
) {}
```

### 3.2 Repository Layer (`SchedulingRepository`)
Add status count query method to `com.shanin.scheduler.repository.SchedulingRepository`:
```java
long countByStatus(ScheduleStatus status);
```

### 3.3 Service Layer (`SchedulingService`)
Add `getStats()` to `com.shanin.scheduler.service.SchedulingService`:
```java
@Transactional(readOnly = true)
public SchedulingStatsResponse getStats() {
    long totalCount = schedulingRepository.count();
    long activeCount = schedulingRepository.countByStatus(ScheduleStatus.ACTIVE);
    long pausedCount = schedulingRepository.countByStatus(ScheduleStatus.PAUSED);
    return new SchedulingStatsResponse(totalCount, activeCount, pausedCount);
}
```

### 3.4 Controller Layer (`SchedulingController`)
Add `GET /api/schedulings/stats` to `com.shanin.scheduler.controller.SchedulingController`:
```java
@GetMapping("/stats")
public ResponseEntity<ApiResponse<SchedulingStatsResponse>> getStats() {
    SchedulingStatsResponse stats = schedulingService.getStats();
    return ResponseEntity.ok(ApiResponse.ok(stats));
}
```

---

## 4. Frontend Specification

### 4.1 Type Definitions (`frontend/src/types/scheduling.ts`)
Add `SchedulingStatsResponse`:
```typescript
export interface SchedulingStatsResponse {
  totalCount: number;
  activeCount: number;
  pausedCount: number;
}
```

### 4.2 API Client (`frontend/src/api/schedulingsApi.ts`)
Add `getStats()`:
```typescript
async getStats(): Promise<SchedulingStatsResponse> {
  const response = await apiClient.get<ApiResponse<SchedulingStatsResponse>>('/schedulings/stats');
  return response.data.data;
}
```

### 4.3 Hook (`frontend/src/hooks/useSchedulings.ts`)
Maintain `stats` state:
- Initialize `stats` with `{ totalCount: 0, activeCount: 0, pausedCount: 0 }`.
- In `fetchSchedulings`, fetch both paginated schedulings and global stats concurrently:
  ```typescript
  const [data, statsData] = await Promise.all([
    schedulingsApi.getAll(page, pageSize),
    schedulingsApi.getStats(),
  ]);
  setSchedulings(data.content);
  setTotalElements(data.totalElements);
  setTotalPages(data.totalPages);
  setStats(statsData);
  ```
- In `toggleStatus`, update the status and immediately refresh `stats` via `schedulingsApi.getStats()`.
- Return `stats` from `useSchedulings()`.

### 4.4 Dashboard View (`frontend/src/App.tsx`)
Bind dashboard stats cards to the global stats returned by `useSchedulings()`:
```typescript
const {
  schedulings,
  stats,
  ...
} = useSchedulings();

const totalCount = stats.totalCount;
const activeCount = stats.activeCount;
const pausedCount = stats.pausedCount;
```

---

## 5. Verification & Acceptance Criteria

### 5.1 Backend Tests
1. **Repository Test (`SchedulingRepositoryTest`):**
   - Verify `countByStatus(ScheduleStatus.ACTIVE)` and `countByStatus(ScheduleStatus.PAUSED)` return accurate counts against test database.
2. **Service Test (`SchedulingServiceTest`):**
   - Verify `getStats()` delegates to `schedulingRepository.count()` and `schedulingRepository.countByStatus(...)` and returns a valid `SchedulingStatsResponse`.
3. **Controller Test (`SchedulingControllerTest`):**
   - Verify `GET /api/schedulings/stats` returns HTTP 200 with `ApiResponse<SchedulingStatsResponse>` payload.

### 5.2 Frontend Tests
1. **API Client Test (`schedulingsApi.test.ts`):**
   - Verify `schedulingsApi.getStats()` dispatches `GET /schedulings/stats` and unwraps the response.
2. **Hook Test (`useSchedulings.test.ts`):**
   - Verify `useSchedulings` populates `stats` with global counts regardless of page or page size.
   - Verify toggling status updates `stats`.
3. **App Build (`npm run build`):**
   - Ensure clean compilation without TypeScript errors.
