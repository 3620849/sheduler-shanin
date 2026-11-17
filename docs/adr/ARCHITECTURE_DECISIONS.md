# Architecture Decision Records (ADR)

## ADR-001: Distributed Task Scheduling Platform Tech Stack & Domain Foundations

- **Status:** Approved
- **Date:** 2026-11-17
- **Context:**
  The platform requires a reliable, scalable distributed task scheduling architecture capable of recurrent execution across clustered nodes, with strict separation between API submission and worker execution.
- **Decisions:**
  1. **Runtime & Framework:** Java 25 with Spring Boot 4.1.2.
  2. **Persistence & Database:** MySQL 8.4 storing domain models (`schedulings`) and Quartz clustering metadata (`QRTZ_*` tables).
  3. **Job Scheduler:** Quartz Scheduler using JDBC JobStore (`org.quartz.impl.jdbcjobstore.StdJDBCDelegate`) in clustered mode (`isClustered=true`) with automatic schema initialization.
  4. **Task Definitions:** Read-only predefined task catalogs (`LOG_TASK`, `EMAIL_TASK`, `DB_QUERY_TASK`) with JSON parameter schemas for dynamic form generation and backend validation.
  5. **API Conventions:** Standardized REST endpoints returning `ApiResponse<T>` envelopes and RFC 9457 compliant error handling.
  6. **Architecture & Layering:** Strict 3-tier layered architecture (Controller -> Service -> Repository), utilizing Java records for DTOs and immutable data contracts.
- **Consequences:**
  - Guarantees schema consistency across clustered nodes.
  - Decouples task declaration from execution logic.
  - Facilitates horizontal scaling and future message broker integration (Stage 2 RabbitMQ split).
