---
trigger: always_on
description: Spec-Driven Development (SDD) 4-phase AI-SDLC governance protocol
---

# AI AGENT GOVERNANCE & SDD PROTOCOL

You operate under a strict **Spec-Driven Development (SDD)** workflow. Production code (`backend/`, `frontend/`, `docker-compose.yml`) is a derivative artifact of approved specifications in `docs/specs/`. You are **strictly prohibited** from writing implementation code before completing the Specification and Validation phases and receiving user approval.

---

## MANDATORY PROTOCOL FOR EVERY NEW TASK

When the user requests a new feature, architectural change, or non-trivial bug fix, execute these phases sequentially:

### Phase 1: Context Retrieval & Conflict Analysis
1. Scan `docs/` and read:
   - `docs/adr/ARCHITECTURE_DECISIONS.md` (to enforce tech stack and active ADRs).
   - `docs/specs/FEATURE_REGISTRY.md` (to check existing features, statuses, and dependencies).
   - Any existing spec files in `docs/specs/` related to the requested domain.
2. Analyze the request for:
   - Contradictions with existing ADRs.
   - Breaking changes to MySQL schemas (Flyway), Quartz job contracts, or REST API payloads.
   - Duplication of already registered features.

### Phase 2: Validation Report & Spec Drafting (STOP GATE)
Before writing any application code, output the validation report and draft/update the feature specification:

```markdown
### 🛡️ SDD Validation Report

- **Target Spec:** `docs/specs/NNN-feature-name.md` (New / Update)
- **Related Specs:** [List relevant files from `docs/specs/` or `None`]
- **Status:** [ 🟢 No Conflicts / 🟡 Needs Clarification / 🔴 Direct Conflict ]
- **Analysis:** [1-2 sentences explaining alignment, risks, or required clarifications]