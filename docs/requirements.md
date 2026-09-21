# Requirements — Data Modeling Helper

Source of truth for what should and should not be built. If a requested feature isn't listed here, flag it before implementing (see `AGENTS.md`).

## Functional Requirements (MVP)

- [ ] FR-1: Create, edit, delete entities (tables) on a visual canvas
- [ ] FR-2: Define fields per entity — name, data type, constraints
- [ ] FR-3: Create relationships between entities with selectable cardinality (1:1, 1:many, many:many)
- [ ] FR-4: Real-time validation — flag missing PK, orphan FK, naming issues, normalization concerns
- [ ] FR-5: Auto-generate plain-language data dictionary from the model
- [ ] FR-6: Export ERD as image/PDF and documentation as a readable file (e.g. Markdown/PDF)

## Functional Requirements (Stretch — do not build before MVP is complete)

- [ ] FR-7: Export SQL DDL for a target database dialect
- [ ] FR-8: Comments/review workflow on entities and fields
- [ ] FR-9: Model versioning / history
- [ ] FR-10: In-app learning aids / tooltips explaining modeling concepts

## Non-Functional Requirements

- [ ] NFR-1: Usable without prior data modeling training
- [ ] NFR-2: Canvas interactions feel instant for models up to ~30 tables
- [ ] NFR-3: Works in current versions of major browsers
- [ ] NFR-4: Reasonable keyboard/screen-reader support for core actions (evaluate feasibility)

## Validation rules to implement (FR-4 detail)

- [ ] Every entity has at least one primary key
- [ ] Every foreign key references an existing entity/field
- [ ] No orphan foreign keys (pointing to nothing)
- [ ] Naming convention consistency (e.g. snake_case or camelCase, configurable)
- [ ] Warn on likely normalization issues (e.g. repeating groups) — best-effort, not exhaustive
## Functional Requirements (Stretch — AI-assisted modeling)

- [ ] FR-11: "Add Entity with AI" — user provides a short prompt describing 
      a single table (e.g. "address table"). System calls Gemini API and 
      returns one entity with field names, SQL types, and constraints 
      based on common real-world convention.
- [ ] FR-12: AI-suggested entity renders as a preview (visually distinct 
      from committed entities) before the user accepts it. User can edit 
      fields inline before accepting.
- [ ] FR-13: Accepted AI-suggested entities pass through the same 
      addField/validation pipeline as manually created ones — no bypass.
- [ ] FR-14: AI never generates relationships/foreign keys to other 
      entities — only the fields of the single requested table. 
      Relationships remain a manual user action.
## Functional Requirements (Stretch — AI-assisted modeling)

- [ ] FR-15: Settings screen where users can add, label, reorder, and 
      delete their own Gemini API keys.
- [ ] FR-16: Keys are stored encrypted at rest (never plaintext in the 
      database), masked in the UI after saving, and never logged or 
      returned in full via any API response.
- [ ] FR-17: When calling Gemini for AI entity suggestions (FR-11), the 
      system tries keys in priority order and falls back to the next 
      key on rate-limit/quota/invalid-key errors, surfacing an error to 
      the user only if all keys fail.
- [ ] FR-18: "Generate Project" — user describes a small project 
      (e.g. "school management system") in a text prompt. System 
      generates a full starting schema (multiple entities + 
      relationships) via a two-step Gemini generation process.
- [ ] FR-19: Generated schema is capped at ~8-10 entities and rendered 
      as a preview batch on the canvas (auto-arranged, visually 
      distinct per FR-12's treatment) — nothing committed until the 
      user accepts.
- [ ] FR-20: User can accept the full batch, accept individual entities, 
      edit any entity before accepting, or discard the whole batch.
- [ ] FR-21: The full validation engine (FR-4) runs across the entire 
      generated batch before preview is shown — cross-entity orphan-FK 
      checks included, not just per-entity checks.
- [ ] FR-22: UI clearly communicates this is a starting draft, not a 
      finished design — e.g. "Review and refine before use" messaging, 
      consistent with the tool's teaching-first positioning.
