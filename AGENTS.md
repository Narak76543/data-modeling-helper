# AGENTS.md — Data Modeling Helper

This file is the persistent context for any AI coding agent (Google Antigravity, Gemini CLI, Claude Code, etc.) working in this repository. Read this in full before planning or writing any code.

## Project summary

**Data Modeling Helper** is a thesis project (10-month duration, 3-person team) building a lightweight tool that helps teams — primarily **junior developers and students** — design correct, well-structured data models *before* handing them to backend developers.

The core problem: junior devs/students often produce data models with missing primary/foreign keys, wrong cardinality, poor naming, or normalization issues. Backend developers then lose time reinterpreting or fixing these models. This tool closes that gap with guided modeling, validation, and auto-generated documentation.

**Primary users:** junior developers / students designing a data model for the first time or without much experience.
**Primary output:** visual ERD + auto-generated plain-language documentation (data dictionary), handed off to backend developers.

Full context lives in `docs/BRD.md`, `docs/requirements.md`, and `docs/roadmap.md` — read those before making architectural decisions.

## Current phase

We are in **Phase 1 — Preparation (Month 1–2)** of a 10-month thesis timeline. This phase is about requirements, planning, and early prototyping — not full production build. See `docs/roadmap.md` for the full phase breakdown.

## MVP scope (Phase 2 target)

1. Visual entity/table builder (drag-and-drop, not code-first — audience is non-expert)
2. Relationship mapping (1:1, 1:many, many:many) shown visually
3. Data type + constraint picker (PK, FK, unique, not null, defaults)
4. Real-time validation / best-practice checker (flags missing PK, orphan FK, naming issues)
5. Auto-generated documentation export (data dictionary + ERD image/PDF)

Out of scope for MVP (stretch goals, Phase 3+): team comments/review workflow, SQL DDL export, versioning/history.

## Competitive positioning

Existing tools (dbdiagram.io, DrawSQL, QuickDBD, Redgate Data Modeler, SqlDBM, Azimutt) target either code-first developers or professional/enterprise teams. None specifically target **junior devs/students with built-in validation and learning-friendly documentation**. That gap is this project's thesis contribution — keep it central when making feature trade-offs.

## Conventions

- [Fill in once decided: language/framework, e.g. "Frontend: React + TypeScript", "Backend: Node.js/Express", "DB: PostgreSQL"]
- [Fill in: folder/module naming conventions]
- [Fill in: commit message format, branch naming]

## Team

- [Member 1 — role, e.g. Frontend/UX]
- [Member 2 — role, e.g. Backend/validation engine]
- [Member 3 — role, e.g. Research/QA/Docs]

## Communication with the agent

- Be concise — skip explanations of basic concepts.
- When proposing a change, explain the *why*, not just the *what*.
- If scope creep is detected against the MVP list above, flag it rather than silently building it.
- When uncertain about intent, ask rather than guessing.
- Always check `docs/requirements.md` before implementing a feature not explicitly listed there.
