# Project Rules — Data Modeling Helper

Engineering and workflow rules for this repo. AI agents (Antigravity, etc.) must follow these; humans should too.

## Code structure

- Backend follows the standard FastAPI layout defined in `docs/tech-stack.md` — routers, models, schemas, services, db, core. Do not put business logic in routers; routers call services.
- Frontend follows standard Next.js `app/` directory conventions. Keep UI components presentational; put logic (validation calls, data transforms) in hooks or lib functions, not inline in components.
- One responsibility per file. If a file is doing two unrelated things, split it.
- No commented-out code left in commits. Delete it — git history keeps it if needed.

## Naming

- Python: `snake_case` for files, functions, variables; `PascalCase` for classes.
- TypeScript/React: `camelCase` for functions/variables, `PascalCase` for components and types.
- Database tables/columns: `snake_case`, singular table names avoided in favor of plural (e.g. `entities`, `fields`) unless the team decides otherwise — note the decision in `docs/tech-stack.md` if changed.
- Branch names: `phase-<n>/<short-description>` (e.g. `phase-2/entity-canvas`).
- Commits: imperative mood, present tense — `Add entity validation for missing primary key`, not `Added` or `Adding`.

## API conventions

- REST endpoints under `/api/v1/...`; version the API from day one even if v2 never happens.
- Request/response bodies validated with Pydantic schemas — no raw dicts crossing the API boundary.
- Errors return a consistent shape: `{ "error": { "code": "...", "message": "..." } }`. Never leak raw stack traces to the client.

## Validation engine rules

- Every validation rule (see `docs/requirements.md`) must be independently testable — no rule should require the full UI to verify.
- Validation runs server-side as the source of truth. Client-side validation is a UX convenience (instant feedback) but must mirror, not replace, server-side checks.

## Testing

- New backend logic (especially validation rules and doc generation) needs at least one test per rule/behavior before it's considered done.
- Don't aim for 100% coverage for its own sake — prioritize the validation engine and export logic, since those are the thesis's evaluable core.

## Git workflow

- No direct commits to `main`. Work in feature branches, open a PR, at least one other team member reviews before merge.
- Keep PRs scoped to one feature or fix. If a PR touches unrelated areas, split it.
- Squash-merge to keep `main` history readable.

## Documentation

- Any new feature that changes what's in `docs/requirements.md` needs that file updated in the same PR.
- Any new architectural decision (library choice, pattern choice) gets logged in the decisions log table in `docs/tech-stack.md`.
- Public-facing functions/endpoints get a short docstring explaining *why*, not just *what* — the *what* should be obvious from the code.

## Working with the AI agent

- Before implementing a feature, the agent should confirm it against `docs/requirements.md`. If it's not listed, flag it rather than building it silently.
- The agent should not introduce a new library or architectural pattern without noting it in the `tech-stack.md` decisions log and flagging it to the team.
- Prefer the simplest solution that satisfies the requirement — this is a thesis project on a timeline, not a production SaaS. Avoid over-engineering (e.g. no need for microservices, no premature caching layers).
- When uncertain about intent or scope, ask rather than guessing.

## API key handling (Gemini keys)

- Keys are encrypted at rest in PostgreSQL (e.g. using a server-side 
  encryption key from an environment variable, never hardcoded).
- The database column storing keys is never returned in any API 
  response body, including the user's own GET /settings/keys — return 
  only the masked display value (e.g. last 4 characters) and a key ID.
- Keys are never logged, including in error logs or stack traces — 
  scrub them explicitly in any exception handling around the Gemini 
  API call.
- Only the backend calls Gemini directly — the frontend never holds a 
  raw key in browser memory/state longer than the single form 
  submission, and never sends it anywhere except the one save endpoint.
- .env / .env.example must never contain a real key committed to git — 
  confirmed already true for DB credentials in Phase 1, same rule 
  applies here.