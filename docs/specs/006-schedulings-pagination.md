# Specification: 006 - Schedulings Pagination & Data Navigation

## 1. Context & Motivation
Currently, `GET /api/schedulings` returns an unbounded array of all `Scheduling` records (`ApiResponse<List<SchedulingResponse>>`). As the number of registered scheduled jobs increases, this causes unnecessary payload overhead, memory pressure on the client and server, and degrades UI usability.

The goal of this specification is to introduce server-side pagination for the schedulings list on both backend and frontend, conforming to the project's established REST API conventions (`rest-api-conventions`), Spring Data standards, and React UI design system.

---

## 2. Architectural Boundaries & Dependencies
- **Layering:** Follows `docs/adr/ARCHITECTURE_DECISIONS.md` 3-tier architecture (Controller -> Service -> Repository).
- **Standards:** Complies with RFC 9457 / ApiResponse envelope guidelines and Spring Boot 4 Data Web pagination conventions.
- **Dependencies:**
  - `000-system-architecture.md` (REST API standards)
  - `001-backend-core-scheduling.md` (Core scheduling service and repository)
  - `003-frontend-scheduling-dashboard.md` (React table UI and hooks)
  - `005-frontend-testing-suite.md` (Vitest & React Testing Library specifications)

---

## 3. Backend Specification

### 3.1 DTO Contracts
Create a standardized generic pagination response record in `com.shanin.scheduler.dto`:

```java
package com.shanin.scheduler.dto;

import org.springframework.data.domain.Page;
import java.util.List;

public record PageResponse<T>(
    List<T> content,
    int page,
    int size,
    long totalElements,
    int totalPages,
    boolean last
) {
    public PageResponse {
        content = (content == null) ? List.of() : List.copyOf(content);
    }

    public static <T> PageResponse<T> from(Page<T> source) {
        return new PageResponse<>(
            source.getContent(),
            source.getNumber(),
            source.getSize(),
            source.getTotalElements(),
            source.getTotalPages(),
            source.isLast()
        );
    }
}
```

### 3.2 Service Layer (`SchedulingService`)
Add paginated query method:
```java
@Transactional(readOnly = true)
public PageResponse<SchedulingResponse> getSchedulings(Pageable pageable) {
    Page<Scheduling> page = schedulingRepository.findAll(pageable);
    return PageResponse.from(page.map(SchedulingResponse::from));
}
```

### 3.3 Controller Layer (`SchedulingController`)
Update `GET /api/schedulings`:
```java
@GetMapping
public ResponseEntity<ApiResponse<PageResponse<SchedulingResponse>>> getSchedulings(
    @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
) {
    PageResponse<SchedulingResponse> response = schedulingService.getSchedulings(pageable);
    return ResponseEntity.ok(ApiResponse.ok(response));
}
```

### 3.4 Configuration
In `application.yaml`, clamp maximum allowable page size to prevent denial-of-service memory pressure:
```yaml
spring:
  data:
    web:
      pageable:
        default-page-size: 10
        max-page-size: 100
```

---

## 4. Frontend Specification

### 4.1 Type Definitions (`frontend/src/types/api.ts`)
Add generic page response interface:
```typescript
export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}
```

### 4.2 API Client (`frontend/src/api/schedulingsApi.ts`)
Update `getAll` to support query pagination parameters (`page`, `size`):
```typescript
async getAll(page: number = 0, size: number = 10): Promise<PageResponse<SchedulingResponse>> {
  const response = await apiClient.get<ApiResponse<PageResponse<SchedulingResponse>>>('/schedulings', {
    params: { page, size, sort: 'createdAt,desc' },
  });
  return response.data.data;
}
```

### 4.3 Custom Hook (`frontend/src/hooks/useSchedulings.ts`)
Manage pagination state:
- `page`: Current zero-indexed page number (default: 0).
- `pageSize`: Number of items per page (default: 10).
- `totalElements`: Total items across all pages.
- `totalPages`: Total page count.
- `setPage(page: number)`: Updates page and triggers reload.
- `setPageSize(size: number)`: Updates page size and resets to page 0.
- Automatic refresh on mutations (create, update, toggleStatus, delete).

### 4.4 Dashboard Components
- **`Pagination.tsx`**: Reusable navigation control:
  - Page indicator (e.g., "Page 1 of 5 (42 items)").
  - Previous (`<`) and Next (`>`) buttons with boundary disabling.
  - Page size selector (`[5, 10, 20, 50]`).
- **`SchedulingsTable.tsx`**:
  - Displays paginated rows from `content`.
  - Integrates `Pagination` in the table card footer.
- **`App.tsx`**:
  - Connects pagination parameters between `useSchedulings` and `SchedulingsTable`.
  - Stats card displays `totalElements`.

---

## 5. Testing & Verification Plan

### 5.1 Backend Automated Tests
- **`SchedulingControllerTest`**:
  - Verify `GET /api/schedulings?page=0&size=10` returns `200 OK` with `ApiResponse<PageResponse<SchedulingResponse>>`.
  - Validate response payload structure (`content`, `page`, `size`, `totalElements`, `totalPages`, `last`).
- **`SchedulingServiceTest`** or integration slice:
  - Verify Spring Data `Pageable` mapping and sorting.

### 5.2 Frontend Automated Tests
- **`SchedulingsTable.test.tsx`**:
  - Test rendering of pagination footer with item count and total pages.
  - Test "Previous" button is disabled on page 0.
  - Test "Next" button click triggers `onPageChange(1)`.
  - Test page size selector triggers `onPageSizeChange(newSize)`.
- **`schedulingsApi.test.ts` / `useSchedulings.test.ts`**:
  - Test API invocation with query parameters `page` and `size`.

---

## 6. Rollback & Compatibility
- Clean backward compatibility on the backend: defaults to `page=0, size=10` when omitted.
- Clamped maximum page size safeguards database load.
- No schema or Flyway migrations required.
