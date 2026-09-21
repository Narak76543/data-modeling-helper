# Agentic Workflow — Data Modeling Helper

How AI agents (Antigravity, etc.) should operate in this repo, beyond just the coding rules in `project-rules.md`.

## The loop: Plan → Execute → Check → Fix → Repeat

1. **Plan** — Before writing code, state a short plan: what will change, which files, which requirement (from `docs/requirements.md`) this satisfies. For anything non-trivial, this plan should be reviewable before execution starts (Antigravity's Planning Mode/Artifacts).
2. **Execute** — Implement the plan. Keep changes scoped to what was planned; if something outside scope becomes necessary, stop and flag it rather than expanding silently.
3. **Check** — Run relevant tests (see `project-rules.md` testing section). For UI work, verify visually against `docs/ui-style-guide.md`. For validation rules, verify against the specific rule in `docs/requirements.md`.
4. **Fix** — If checks fail, fix and re-check before presenting as done. Don't hand back a failing state as "done, needs review."
5. **Repeat** — Move to the next planned step. Log anything learned (see Memory section below).

## Human-in-the-loop checkpoints

The agent should pause and ask for human input — not just proceed — at these points:

- **Schema/migration changes** — any change to the PostgreSQL schema or Alembic migrations.
- **New library or pattern** — anything not already in `docs/tech-stack.md`.
- **Scope changes** — a request or discovered need that isn't in `docs/requirements.md`.
- **Validation rule changes** — the rules in `docs/requirements.md` are the thesis's evaluable core; changing them needs team sign-off, not just agent judgment.
- **Before deployment** — any deploy/release action.

Everything else (routine implementation within an approved plan) can proceed without a checkpoint.

## Tool use

Prefer real tool use over guessing:

- **Terminal** — run tests, migrations, linters directly rather than describing what should be run.
- **Browser** — for frontend work, actually open and click through the canvas UI to verify behavior (Antigravity supports this natively) rather than assuming the code is correct.
- **Google Stitch (MCP)** — the team's chosen tool for UI design. Use Stitch-generated designs as the source of visual reference when implementing screens, but `docs/ui-style-guide.md` remains the source of truth for tokens (color, type, spacing) — if a Stitch design conflicts with the style guide, the style guide wins unless the team explicitly updates it.
- **Figma (MCP)** — connected but not part of the active workflow. Do not pull from Figma unless explicitly asked to; Stitch is the primary design tool for this project.
- **GitHub MCP** *(if connected)* — use it for PR creation/review context instead of asking the human to paste PR details.
- **Database MCP / direct DB access** *(if connected)* — inspect the actual PostgreSQL schema state rather than assuming migrations applied cleanly.

## Memory

- `AGENTS.md` and the `tech-stack.md` decisions log are the persistent, static memory every session starts from.
- When a session discovers something worth remembering long-term (a gotcha, a rejected approach and why, a non-obvious constraint), add it to a **Learnings** section below rather than letting it disappear at session end.

### Learnings log

| Date | Learning |
|---|---|
| | |