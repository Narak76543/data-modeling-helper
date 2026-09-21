# Business Requirements Document — Data Modeling Helper

## 1. Background & Problem Statement

Teams that design data models before handing them to backend developers often struggle with miscommunication: wrong data types, missing constraints, unclear relationships, and no shared source of truth between designer and implementer. This problem is especially acute for **junior developers and students**, who are still building data modeling skills and frequently produce models with structural mistakes (missing primary/foreign keys, incorrect cardinality, poor naming, normalization issues).

Existing tools do not serve this audience well:
- **Code-first tools** (dbdiagram.io, QuickDBD) are fast for experienced developers but have a learning curve that's unfriendly to beginners.
- **Canvas-first tools** (DrawSQL) are more approachable but don't validate models against best practices.
- **Enterprise tools** (Redgate Data Modeler, SqlDBM) are powerful but built for professional teams, not learners, and carry cost/complexity overhead.

No existing tool combines a beginner-friendly visual builder with built-in validation and auto-generated, backend-ready documentation.

## 2. Objectives

- Reduce structural errors in data models produced by junior developers/students.
- Reduce the time and back-and-forth needed to hand off a model to a backend developer.
- Produce documentation clear enough that a backend developer can implement from it without needing to ask clarifying questions.
- Deliver a working, evaluable tool as the core artifact of a 10-month thesis project.

## 3. Target Users

**Primary:** Junior developers and students designing a relational data model, often for the first time or without extensive experience.

**Secondary (handoff recipient):** Backend developers who receive the exported ERD + documentation and implement the schema.

## 4. Scope

### In scope (MVP — Phase 2)
- Visual, drag-and-drop entity/table builder
- Relationship mapping (1:1, 1:many, many:many) with visual cardinality
- Data type and constraint picker (primary key, foreign key, unique, not null, default values)
- Real-time validation / best-practice checker (flags missing PK, orphan FK, naming issues, normalization concerns)
- Auto-generated documentation export: plain-language data dictionary + ERD image/PDF

### Stretch goals (Phase 3+, time permitting)
- Team collaboration features (comments, review workflow)
- SQL DDL export
- Model versioning / history
- In-app learning aids (tooltips explaining modeling concepts)

### Out of scope
- Direct database connection / live schema sync
- Multi-database-engine code generation beyond a single target dialect (unless time allows)
- Enterprise-scale features (roles/permissions, SSO, audit logs)

## 5. Functional Requirements

| ID | Requirement |
|---|---|
| FR-1 | User can create, edit, and delete entities (tables) on a visual canvas |
| FR-2 | User can define fields per entity with name, data type, and constraints |
| FR-3 | User can create relationships between entities with selectable cardinality |
| FR-4 | System validates the model in real time and flags common structural errors |
| FR-5 | System generates a plain-language data dictionary from the model |
| FR-6 | User can export the ERD as an image/PDF and the documentation as a readable file |
| FR-7 | (Stretch) User can export SQL DDL for a target database dialect |
| FR-8 | (Stretch) Team members can comment on specific entities/fields |

## 6. Non-Functional Requirements

- **Usability:** Must be usable by someone with limited data modeling background without external training.
- **Performance:** Canvas interactions (add/edit entity, draw relationship) should feel instant (no noticeable lag) for models up to ~30 tables.
- **Compatibility:** Web-based, works in current versions of major browsers.
- **Accessibility:** Reasonable keyboard/screen-reader support for core actions (stretch, evaluate feasibility in Phase 2).

## 7. Assumptions & Constraints

- Team size: 3 members, working across a 10-month thesis timeline.
- Phase 1 (Month 1–2) is preparation/research only — no production build expected yet.
- Tech stack to be finalized by end of Phase 1 (see `tech-stack.md`).
- Tool targets relational/SQL-style data modeling only (not NoSQL/document modeling) unless scope is revisited.

## 8. Evaluation Plan

To be finalized with the team's advisor, but proposed approach:
- **Error-reduction study:** compare data models produced with vs. without the tool (structural error count, e.g., missing keys, cardinality mistakes).
- **Time-to-handoff:** measure time from "model design start" to "backend developer confirms model is clear enough to implement."
- **Usability feedback:** qualitative feedback from junior dev/student test users on clarity and learning value.

## 9. Success Criteria

- MVP feature set (Section 4) implemented and functional by end of Phase 3.
- Evaluation study completed with measurable results by end of Phase 4.
- Thesis defense materials completed by end of Phase 5.
