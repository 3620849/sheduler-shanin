# Feature Specification: Quartz Restart Recovery and Schema Preservation

- **ID:** 010
- **Title:** Quartz Restart Recovery and Schema Preservation
- **Status:** Implemented
- **Author:** Antigravity Agent
- **Date:** 2026-11-17
- **Target Spec:** `docs/specs/010-quartz-restart-recovery-and-schema-preservation.md`
- **Related Specs:**
  - `docs/specs/000-system-architecture.md`
  - `docs/specs/001-backend-core-scheduling.md`
  - `docs/specs/002-rabbitmq-role-separation.md`
  - `docs/specs/004-containerization-orchestration.md`

---

## 1. Context & Problem Statement

When the system is deployed or restarted via `docker compose restart` (or container reboot), active schedules that were previously running do not trigger anymore. They only start firing if the user manually creates a new schedule or updates an existing schedule.

### Root Cause Analysis:
1. **Destructive Default Schema Initialization:** In `backend/src/main/resources/application.yaml`, `spring.quartz.jdbc.initialize-schema` is set to `always`. By default, Spring Boot resolves the vendor script `org/quartz/impl/jdbcjobstore/tables_mysql.sql` from the Quartz library. This script explicitly executes `DROP TABLE IF EXISTS QRTZ_*;` on every single boot. Consequently, every restart completely destroys all `QRTZ_TRIGGERS`, `QRTZ_JOB_DETAILS`, and scheduler state in MySQL.
2. **Absence of Startup Reconciliation:** While the MySQL `schedulings` table is preserved across restarts (managed by Hibernate `ddl-auto: update`), the backend contains zero startup logic (`ApplicationReadyEvent` / `ApplicationRunner`) to reconcile existing `ACTIVE` records in `schedulings` with the Quartz Scheduler engine. As a result, Quartz starts with 0 jobs and 0 triggers after restart.
3. **Redundant Schema Initialization on Worker Nodes:** In `docker-compose.yml`, `backend-worker` runs with `WORKER_ENABLED=true` and `SCHEDULER_ENABLED=false`, but inherited `initialize-schema: always`, risking race-condition table drops against `backend-api`.

---

## 2. Requirements & Goals

### Functional Requirements:
1. **Preserve Quartz State Across Restarts:** The Quartz JDBC JobStore tables must NEVER be dropped or wiped upon container or application restart.
2. **Automatic Startup Reconciliation:** Upon `backend-api` startup (`SCHEDULER_ENABLED=true`), the system must automatically inspect all persistent `Scheduling` entities:
   - For every `ScheduleStatus.ACTIVE` scheduling, verify if its Quartz trigger exists in the scheduler. If missing, automatically schedule it and update its `nextRunAt`.
   - If the trigger exists in Quartz, ensure its pause/resume state matches the entity status.
   - For `ScheduleStatus.PAUSED`, ensure the Quartz trigger is paused.
   - For `ScheduleStatus.COMPLETED`, ensure no active trigger remains in Quartz.
3. **Zero Required Manual Action:** After `docker compose restart`, all active schedules must resume firing according to their schedule configuration without requiring the user to create or edit any schedule.

### Non-Functional Requirements:
1. **Idempotence & Safety:** The custom schema initialization script must use `CREATE TABLE IF NOT EXISTS` and `INSERT IGNORE` so it can be executed safely at any time on fresh or existing databases without data loss.
2. **Clustering & Role Isolation:** Only the scheduler node (`SCHEDULER_ENABLED=true`) should execute startup reconciliation. Worker nodes (`SCHEDULER_ENABLED=false`) must disable Quartz schema initialization (`SPRING_QUARTZ_JDBC_INITIALIZE_SCHEMA=never`).

---

## 3. Technical Design

### 3.1 Idempotent Quartz Schema Definition
Create `backend/src/main/resources/schema-quartz.sql` containing MySQL InnoDB definitions for all 11 `QRTZ_*` tables:
- Use `CREATE TABLE IF NOT EXISTS QRTZ_JOB_DETAILS ...`
- Use `CREATE TABLE IF NOT EXISTS QRTZ_TRIGGERS ...`
- Use `CREATE TABLE IF NOT EXISTS QRTZ_SIMPLE_TRIGGERS ...`
- Use `CREATE TABLE IF NOT EXISTS QRTZ_CRON_TRIGGERS ...`
- Use `CREATE TABLE IF NOT EXISTS QRTZ_SIMPROP_TRIGGERS ...`
- Use `CREATE TABLE IF NOT EXISTS QRTZ_BLOB_TRIGGERS ...`
- Use `CREATE TABLE IF NOT EXISTS QRTZ_CALENDARS ...`
- Use `CREATE TABLE IF NOT EXISTS QRTZ_PAUSED_TRIGGER_GRPS ...`
- Use `CREATE TABLE IF NOT EXISTS QRTZ_FIRED_TRIGGERS ...`
- Use `CREATE TABLE IF NOT EXISTS QRTZ_SCHEDULER_STATE ...`
- Use `CREATE TABLE IF NOT EXISTS QRTZ_LOCKS ...`
- Use `INSERT IGNORE INTO QRTZ_LOCKS VALUES (...)` for lock row seeding.
- **NO `DROP TABLE` STATEMENTS.**

Update `backend/src/main/resources/application.yaml`:
```yaml
spring:
  quartz:
    job-store-type: jdbc
    auto-startup: ${SCHEDULER_ENABLED:true}
    jdbc:
      initialize-schema: always
      schema: classpath:schema-quartz.sql
```

### 3.2 Role Separation Guard in Docker Compose
In `docker-compose.yml` (and `docker-compose.test.yml`), explicitly set for `backend-worker`:
```yaml
SPRING_QUARTZ_JDBC_INITIALIZE_SCHEMA: "never"
```

### 3.3 Startup Reconciliation Component (`QuartzStartupReconciler`)
Create `com.shanin.scheduler.quartz.QuartzStartupReconciler`:
- Annotations: `@Component`, `@RequiredArgsConstructor`, `@Slf4j`, `@ConditionalOnProperty(name = "SCHEDULER_ENABLED", havingValue = "true", matchIfMissing = true)`.
- Event Listener: `@EventListener(ApplicationReadyEvent.class)`.
- Logic:
  ```java
  @Transactional
  public void reconcile() {
      List<Scheduling> schedulings = schedulingRepository.findAll();
      for (Scheduling s : schedulings) {
          TriggerKey triggerKey = triggerBuilder.buildTriggerKey(s);
          boolean exists = scheduler.checkExists(triggerKey);
          
          if (s.getStatus() == ScheduleStatus.ACTIVE) {
              if (!exists) {
                  log.info("Reconciling active scheduling id={}: trigger missing in Quartz, scheduling now", s.getId());
                  Instant nextRunAt = quartzSchedulerService.schedule(s);
                  s.setNextRunAt(nextRunAt);
                  schedulingRepository.save(s);
              } else {
                  Trigger.TriggerState state = scheduler.getTriggerState(triggerKey);
                  if (state == Trigger.TriggerState.PAUSED) {
                      quartzSchedulerService.resume(s.getId());
                  }
                  Trigger trigger = scheduler.getTrigger(triggerKey);
                  if (trigger != null && trigger.getNextFireTime() != null) {
                      s.setNextRunAt(trigger.getNextFireTime().toInstant());
                      schedulingRepository.save(s);
                  }
              }
          } else if (s.getStatus() == ScheduleStatus.PAUSED && exists) {
              quartzSchedulerService.pause(s.getId());
          } else if (s.getStatus() == ScheduleStatus.COMPLETED && exists) {
              quartzSchedulerService.unschedule(s.getId());
          }
      }
  }
  ```

---

## 4. Verification Plan

1. **Unit & Integration Tests:**
   - Unit test `QuartzStartupReconcilerTest` verifying reconciliation when triggers are missing or out of sync.
   - Run full test suite: `mvn test` in `backend/`.
2. **Containerized Validation:**
   - Rebuild backend docker image.
   - Start or restart containers via `docker compose restart`.
   - Verify `QRTZ_TRIGGERS` contains all active schedules immediately on startup.
   - Confirm active schedules fire automatically and dispatch to RabbitMQ/workers without user intervention.
