# UI Style Guide — Data Modeling Helper

Design direction: **clean, minimal, technical blueprint.** The subject matter (entities, keys, relationships) is already visually dense once a model grows — the UI's job is to stay out of the way and let the model itself be the only complex thing on screen. When in doubt, remove an element rather than add one.

Avoid: rounded-corner card grids, soft drop shadows, gradient washes, tracked-out ALL-CAPS labels, icon-only buttons without labels, decorative dividers, and any UI chrome that doesn't map to a real action or piece of data.

## Minimalism rules (apply before anything else below)

- **One primary action per screen.** Everything else is secondary — visually quieter (outline/ghost style, not a filled button).
- **No decoration without function.** Every line, border, icon, and color must communicate something (a boundary, a state, a relationship) — never used to "make it look nicer."
- **Whitespace is a component.** Default to more space around elements than feels necessary on a first pass, then remove space only where it hurts scanability. Dense ≠ efficient for a beginner user.
- **Progressive disclosure.** Show only what's needed for the current step. Advanced options (constraints beyond PK/FK, export settings) live behind a secondary click, not on the main canvas by default.
- **Maximum 2 levels of visual hierarchy per screen** (e.g. entity name vs. field list) — don't stack more than 2 weights/sizes on one card or panel.

## Color

Keep the palette small — 3 core colors plus 2 status colors, nothing else.

| Token | Hex | Use |
|---|---|---|
| `--color-bg` | `#F7F8F7` | App background |
| `--color-surface` | `#FFFFFF` | Entity cards, panels |
| `--color-ink` | `#14181B` | All text and lines by default |
| `--color-ink-muted` | `#8A9195` | Secondary/helper text only |
| `--color-accent` | `#1E3A5F` | Primary action, active state, relationship lines |
| `--color-error` | `#C0392B` | Validation errors only |
| `--color-success` | `#3F7D58` | Valid state only |

Rule: `--color-ink` and `--color-accent` do almost all the visual work. Error/success appear only when there's something to report — never as passive UI decoration.

## Typography

- **UI text:** IBM Plex Sans.
- **Field names, data types, schema content:** IBM Plex Mono (genuinely functional — aligns columns in the data dictionary).
- No third typeface, no italics for emphasis, no all-caps labels.

| Role | Size | Weight |
|---|---|---|
| Page title | 20px | 600 |
| Section heading | 15px | 600 |
| Body / UI text | 14px | 400 |
| Field/type labels (mono) | 13px | 400 |
| Caption / helper text | 12px | 400 |

## Layout

- **Canvas is the only "loud" surface.** Sidebar, toolbar, and panels stay quiet — thin borders, no shadows, minimal iconography with text labels.
- **Sidebar** (~220px, collapsible): entity list + validation summary only. Nothing else lives here.
- **No persistent top navbar** beyond a thin header with the project name and one primary action (e.g. "Export"). Don't fill header space with icons that aren't needed yet.
- **Entities:** flat white cards, 1px hairline border in `--color-ink`, 2px max border radius. Name + field list, single hairline divider between them. No shadow.
- **Relationships:** orthogonal (right-angle) lines in `--color-accent`, 1px weight. No arrowheads unless direction is ambiguous.
- **Validation feedback:** inline, next to the exact field — one short line, no icons unless the icon replaces text rather than duplicating it.

Minimal layout concept:
┌──────────┬───────────────────────────────────────┐
│ Entities │ │
│ users │ ┌──────────┐ ┌──────────┐ │
│ orders │ │ users │ │ orders │ │
│ │ │──────────│─────▶│──────────│ │
│ Valid ✓ │ │ id PK │ │ id PK │ │
│ │ │ email │ │ user_id │ │
│ │ └──────────┘ └──────────┘ │
└──────────┴───────────────────────────────────────┘

## Motion

- Only on state change: a relationship line drawing itself when connected, a field briefly highlighting when a validation error clears.
- No hover-lift, no fade-ins, no loading skeletons for anything that loads instantly. If it's fast, just show it.

## Voice & microcopy

- Short, plain, active voice: "Add a primary key," not "Primary key is required."
- One line per validation message — what's wrong and how to fix it, nothing more.
- Empty states: one line of instruction, no illustration, no extra copy ("Add your first entity to get started").

## Accessibility baseline

- Visible keyboard focus on every interactive element.
- Never rely on color alone for state — pair `--color-error`/`--color-success` with text.
- Respect `prefers-reduced-motion`.

## Dark mode

Respects `prefers-color-scheme` by default; user can override via a 
toggle in Settings. Same blueprint identity — dark mode is not just 
inverted colors, it keeps the same structural logic (ink lines on a 
quiet surface, accent used only for meaning).

| Token | Light | Dark |
|---|---|---|
| `--color-bg` | `#F7F8F7` | `#14181B` |
| `--color-surface` | `#FFFFFF` | `#1D2226` |
| `--color-ink` | `#14181B` | `#E8EAEA` |
| `--color-ink-muted` | `#8A9195` | `#8A9195` |
| `--color-accent` | `#1E3A5F` | `#5B8DBF` |
| `--color-error` | `#C0392B` | `#E0665A` |
| `--color-success` | `#3F7D58` | `#5FAE7C` |
| `--color-grid` | `#DADDD9` | `#262B2F` |

Rule: dark-mode accent/error/success are lightened versions of their 
light-mode counterparts, not different hues — same meaning, adjusted 
for contrast on a dark surface (WCAG AA minimum against `--color-bg`).
Entity card borders in dark mode use `--color-ink-muted` at reduced 
opacity rather than full `--color-ink`, since a full-contrast hairline 
border reads as too harsh on a dark background.