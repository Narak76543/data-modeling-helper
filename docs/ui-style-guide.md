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
- **Relationships:** orthogonal (right-angle) lines with circular anchor ports (dot endpoints) precisely terminating at the connected field rows. Line colors are systematically assigned by source entity using a fixed palette of 5 muted hues (Slate Blue `#1E3A5F`/`#6FA0C9`, Steel Teal `#2E6F68`/`#6AB8AF`, Muted Violet `#5C4D82`/`#9D8BC9`, Muted Ochre `#8C6527`/`#C7A263`, Muted Rust `#8E4B3E`/`#C97E72`), ensuring all relations originating from the same table share a hue without visual noise. 1.5px weight, no decorative arrowheads.
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
toggle in Settings. Dark mode should feel calm and low-strain at 
night — never pure black background with near-white text, which 
produces *higher* effective contrast than light mode, not lower.

| Token | Light | Dark |
|---|---|---|
| `--color-bg` | `#F7F8F7` | `#1A1D1F` |
| `--color-surface` | `#FFFFFF` | `#232629` |
| `--color-ink` | `#14181B` | `#D4D7D6` |
| `--color-ink-muted` | `#8A9195` | `#8F969A` |
| `--color-accent` | `#1E3A5F` | `#6FA0C9` |
| `--color-error` | `#C0392B` | `#D97A70` |
| `--color-success` | `#3F7D58` | `#6FB187` |
| `--color-grid` | `#DADDD9` | `#26292C` |

Rules for dark mode specifically:

- **No pure black, no pure white.** `--color-bg` is a soft dark gray, 
  never `#000000`. `--color-ink` sits around 85% perceived brightness, 
  never `#FFFFFF` — full white on dark background is the single 
  biggest cause of night-time eye strain in dark themes.
- **Lower saturation across the board.** Dark-mode accent/error/success 
  are desaturated and lightened versions of their light-mode 
  counterparts (not just brightened) — a saturated blue or red that 
  looks fine in daylight becomes visually loud against a dark surface.
- **Borders use opacity, not solid color.** Entity card borders in 
  dark mode use `--color-ink-muted` at ~30–40% opacity rather than a 
  solid hairline — a full-strength border against a dark surface reads 
  as a harsh outline. Same applies to the grid dot pattern 
  (`--color-grid` is intentionally close to `--color-bg`, barely 
  visible, just enough to signal "workspace").
- **Surface separation stays subtle.** `--color-surface` (entity cards, 
  modals) is only slightly lighter than `--color-bg` — enough to read 
  as "raised," not a stark light-box-on-dark-background effect like 
  the current screenshot shows.
- Still meets WCAG AA contrast for text against its background — 
  "softer" means calmer, not illegible.

## Field row layout (entity cards)

Fields render in a fixed-column grid, not stacked badges:

[icon] [field name] [type] [active constraints as chips] [+]

- **Icon column**: key icon for PK, link icon for FK, empty otherwise. 
  Icons carry meaning — text badges must not duplicate what an icon 
  already communicates.
- **Constraint chips**: show only *active* constraints, single-letter 
  (P, F, N, U), never all four slots regardless of state. An 
  unconstrained field shows no chips.
- **Add/edit constraints**: a single quiet `+` per row opens a popover 
  to toggle constraints — this replaces always-visible inactive badges. 
  Progressive disclosure over static clutter, per the Minimalism rules.
- **FK target**: when FK is active, the target picker appears inline 
  and indented under that specific row (not as a full-width second row 
  with its own card-width border) — visually subordinate to the row it 
  belongs to.
- All rows align to the same column grid regardless of whether a row 
  has an icon or chips — column position never shifts based on content.
## Semantic text coloring (field rows)

Inspired by code-editor syntax highlighting (e.g. One Dark Pro) — 
different kinds of information get their own consistent color, so the 
eye can jump to what it's scanning for (types, references, defaults) 
without reading every character. Colors stay muted/desaturated to fit 
the existing minimal palette — this is about differentiation, not 
decoration.

| Token | Light | Dark | Used for |
|---|---|---|---|
| `--color-ink` | `#14181B` | `#D4D7D6` | Field names, entity names (unchanged — the "identifier" default) |
| `--color-type` | `#8A5FBF` | `#B18FDB` | Data types (INTEGER, VARCHAR, etc.) — like a type/class color in code |
| `--color-reference` | `#1E3A5F` | `#6FA0C9` | FK target references ("→ users.id") — same as existing --color-accent, reused deliberately since it's already the "relationship" color |
| `--color-literal` | `#3F7D58` | `#6FB187` | Default values — same hue family as --color-success, since a default is a "known good" value |
| `--color-ink-muted` | `#8A9195` | `#8F969A` | Labels, helper text (unchanged) |

Rules:

- Only field rows get semantic coloring — entity names, sidebar text, 
  and UI chrome stay in plain `--color-ink`/`--color-ink-muted`. This 
  keeps the effect targeted at the thing that actually needs scanning 
  (dense field lists), not applied everywhere until it becomes noise.
- Each color is used consistently for its category everywhere in the 
  app — a data type is always `--color-type`, never contextually 
  different. Consistency is what makes this scannable; an inconsistent 
  scheme is worse than no color at all.
- Constraint chips (PK/FK/NN/UQ) keep their existing fill-based 
  treatment — they're not part of this text-coloring system, they're 
  already a distinct visual language (filled badges, not colored text).
- Maximum 4 semantic text colors total, plus the existing ink/muted 
  pair. Do not add more categories without revisiting this table — 
  more than ~4-5 distinct hues stops being scannable and starts being 
  visual noise, defeating the purpose.