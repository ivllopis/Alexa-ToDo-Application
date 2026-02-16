---
name: document-creator
description: Skill to generate PRD, Design docs and plan creation.
---

# Document Creator

## Creation Decision Matrix

| Condition            | Required Documents                  |
|----------------------|-------------------------------------|
| New Feature Addition | PRD -> Design Document -> Work plan |
| Feature Modification | PRD -> Design Document -> Work plan |


## Document Definitions

### PRD (Product Requirements Document)

**Purpose**: Define business requirements and user value.

**Includes**:

- Business requirements and user value
- MoSCoW prioritization (Must/Should/Could/Won't)
- MVP and Future phase separation
- Scope boundary diagram (required)

**Excludes**:
- Technical implementation details (->Design Doc)
- **Implementation phases** (->Work Plan)
- **Task breakdown** (->Work Plan)

### Design Document

**Purpose**: Define technical implementation methods in detail.

**Includes**:

- **Existing codebase analysis** (required)
    - Implementation path mapping (both existing and new)
    - Integration point clarification (connection points with existing code even for new implementation)
- Technical implementation approach
- **Technical dependancies and implementation constraints** (required implementation order)
- Interface and type definitions
- Data flow and component design
- **E2E verification procedures aat integration points**
- Data contract clarification
- Why that technology was chosen

### Work Plan

**Purpose**: Implementation task management and progress tracking.

**Includes**:

- Task breakdown and dependancies


**Excludes**:
- Design details (->Design Doc)

## Storage Locations

| Document   | Path                | Naming Convention               | Template                  |
|------------|---------------------|---------------------------------|---------------------------|
| PRD        | `docs/prd/`         | `[feature-name]-prd.md`         | Not applicable (for now). |
| Design Doc | `docs/design/`      | `[feature-name]-design.md`      | Not applicable (for now). |
| Work Plan  | `docs/work_plans/`  | `[feature-name]-work-plan.md`   | Not applicable (for now). |


## Templates
Not applicable for now. Templates are available in the `references/` directory.