---
name: Overlap Finder
description: A shareable timezone overlap finder with a visual 24-hour timeline.
colors:
  page-void: "#14171c"
  surface-deep: "#1b1f27"
  surface-elevated: "#1e2330"
  border-subtle: "#2a2f3a"
  text-secondary: "#8b92a0"
  text-primary: "#e8e6e1"
  signal-ok: "#4fa98c"
  signal-ok-pastel: "color-mix(in srgb, #4fa98c, white 30%)"
  signal-mild: "#d9a052"
  signal-mild-pastel: "color-mix(in srgb, #d9a052, white 30%)"
  signal-heavy: "#c4573f"
  signal-heavy-pastel: "color-mix(in srgb, #c4573f, white 30%)"
  status-ok-label: "#4ade80"
  status-mild-label: "#fbbf24"
  status-heavy-label: "#f87171"
typography:
  display:
    fontFamily: "'JetBrains Mono Variable', 'JetBrains Mono', monospace"
    fontSize: "1.125rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "normal"
  headline:
    fontFamily: "'JetBrains Mono Variable', 'JetBrains Mono', monospace"
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "normal"
  body:
    fontFamily: "'JetBrains Mono Variable', 'JetBrains Mono', monospace"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "'JetBrains Mono Variable', 'JetBrains Mono', monospace"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "normal"
  micro:
    fontFamily: "'JetBrains Mono Variable', 'JetBrains Mono', monospace"
    fontSize: "0.6875rem"
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: "normal"
rounded:
  xs: "2px"
  sm: "6px"
  md: "8px"
  lg: "10px"
spacing:
  1: "4px"
  1.5: "6px"
  2: "8px"
  4: "16px"
  8: "32px"
components:
  btn-icon-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.md}"
    size: "1.75rem"
  btn-icon-ghost-hover:
    backgroundColor: "rgba(255,255,255,0.05)"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    size: "1.75rem"
  input-time:
    backgroundColor: "transparent"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "0 10px"
    height: "1.75rem"
    width: "8rem"
  timeline-card:
    backgroundColor: "{colors.surface-deep}"
    rounded: "{rounded.lg}"
    padding: "16px"
---

# Design System: Overlap Finder

## Overview

**Creative North Star: "The Flight Deck"**

Overlap Finder is a precision instrument, not a dashboard. Every element earns its place. The dark field isn't atmospheric decoration — it's operational context, the same reason flight decks and control rooms go dark: ambient distraction falls away and signal becomes the only thing that matters. The interface does not announce itself; it disappears when you're working.

The visual grammar is monospace throughout, applied globally from root rather than selectively to "data" elements. This is a deliberate commitment: treating every glyph as a character in a fixed grid gives the layout mechanical regularity. Columns align by construction. Time strings are the same width everywhere, always. The font is JetBrains Mono Variable — chosen for legibility at small sizes and for the quiet authority of a tool designed for developers and schedulers who prefer precision over polish.

Color means exactly one thing in this system: status. The teal, amber, and red palette communicates work-hours overlap quality and nothing else. There are no accent colors for hover states, no brand-colored CTAs, no decorative gradients. When you see a color, it is telling you something about time.

**Key Characteristics:**
- Void & Signal — the background recedes; all color is semantic payload
- Single monospace font throughout, zero exceptions
- One card in the entire interface (the timeline map); everything else is unboxed content
- No visible page title or heading — the tool needs no label
- Density is controlled, not avoided: rows are compact but not cramped

## Colors

The palette is organized around the principle that darkness is neutral ground and every color is signal. Three status hues (teal, amber, red) are the only chromatic elements in the interface; the structural palette is achromatic.

### Primary
- **Void Black** (`#14171c`): The outermost page background. Slightly blue-shifted from pure black — not neutral-grey, not warm. The "floor" the entire interface sits on.
- **Surface Deep** (`#1b1f27`): The timeline card background. One visible step lighter than the page, creating the card boundary without a harsh contrast transition.
- **Surface Elevated** (`#1e2330`): Used only for the drag-clone overlay during row reordering. The elevation is subtle — exactly two steps above the page floor — to signal "this row is lifted" without visual shock.

### Secondary
- **Signal OK — Muted Teal** (`#4fa98c`): The solid-fill color for timeline cells where the slot falls within work hours. Warm-cool balance; readable against the dark surface without dominating.
- **Signal OK — Pastel Teal** (`color-mix(in srgb, #4fa98c, white 30%)`): The background-fill for unselected cells in the "ok" zone. Distinctly visible but clearly secondary to the solid selection state.
- **Signal Mild — Muted Amber** (`#d9a052`): Cells within 60 minutes of the work-hours boundary. Warmer and slightly lower chroma than typical UI "warning" ambers — more informational than alarming.
- **Signal Mild — Pastel Amber** (`color-mix(in srgb, #d9a052, white 30%)`): Unselected mild cells.
- **Signal Heavy — Muted Red** (`#c4573f`): Cells more than 60 minutes outside work hours. Earthy, desaturated red — a statement, not a panic signal.
- **Signal Heavy — Pastel Red** (`color-mix(in srgb, #c4573f, white 30%)`): Unselected heavy cells.

### Tertiary
- **Status OK Label** (`#4ade80`, Tailwind `green-400`): The time-text color when a meeting endpoint falls within work hours. Brighter than the cell signal color for legibility at the smaller type size (18px).
- **Status Mild Label** (`#fbbf24`, Tailwind `amber-400`): Time-text color at a mild endpoint.
- **Status Heavy Label** (`#f87171`, Tailwind `red-400`): Time-text color at a heavy endpoint.

### Neutral
- **Border Subtle** (`#2a2f3a`): Row dividers, the timeline card border, and dashed affordances. Low contrast — structural, not decorative.
- **Text Secondary** (`#8b92a0`): Timezone abbreviations, control labels ("Work hours", "Date"), header UTC line, grip icons. Clearly readable but receding — content metadata.
- **Text Primary** (`#e8e6e1`): Region names, time values, primary foreground text. Warm off-white — not pure `#ffffff`, intentionally tinted to reduce harshness against the dark field.

### Named Rules

**The Signal-Only Rule.** The three signal hues (teal, amber, red) are owned by the work-hours overlap system. They must not be reused for hover states, brand emphasis, UI chrome, or any purpose unrelated to temporal status. Their meaning depends entirely on not appearing elsewhere.

**The No-Heading Rule.** The application name "Overlap Finder" lives only in the document `<title>`. It is never rendered as visible text on the page. A tool that works needs no label to announce what it does.

**The One Card Rule.** The timeline map is the only bordered, background-filled container in the interface. Controls and metadata are plain, unboxed content. Any additional card treatment is a violation of this invariant.

## Typography

**Font:** JetBrains Mono Variable (with `'JetBrains Mono', monospace` fallback)

The system uses a single typeface throughout with no exceptions — no secondary sans-serif for "non-numeric" elements, no display face for headings. Monospace as a design choice, not a code indicator. The fixed character grid makes time-string alignment structural rather than coincidental: `02:00 AM` and `12:00 PM` are always the same pixel width.

### Hierarchy

- **Display** (500 weight, 1.125rem / 18px, line-height 1.4): The time values in each region row — start and end times. These are the primary data and the largest text on the page. Not bold — medium weight carries authority without shouting.
- **Headline** (600 weight, 0.8125rem / 13px, line-height 1.4): Region names (editable); the UTC range header line. Semibold distinguishes editable fields from static labels.
- **Body** (400 weight, 0.8125rem / 13px, line-height 1.5): General controls copy, secondary labels. The same size as Headline but lighter weight — readable at density.
- **Label** (400 weight, 0.75rem / 12px): Control group labels ("Work hours", "Date"), "Add region" affordance text. Clearly secondary to the timeline content.
- **Micro** (400 weight, 0.6875rem / 11px, normal): Timezone abbreviations (PDT, GMT+2, GMT+5:30). Supplemental to the region name; not needed for primary task completion.

### Named Rules

**The One Voice Rule.** JetBrains Mono Variable is the only typeface. Never mix in a sans-serif, serif, or different monospace. The visual system depends on uniform character width across every element.

**The Zero-Padding Rule.** Time strings are always zero-padded to two digits: `02:00 AM`, never `2:00 AM`. This guarantees pixel-identical string widths in monospace, which keeps the time columns aligned by construction rather than by luck.

## Layout

The layout model is a single-page tool. One vertical column, full width at 90% of the viewport (`max-width: 93.75rem` / `max-w-375`), centered.

**Page rhythm:**
- Controls row (work hours + date): unboxed, plain flex, `py-2` vertical spacing
- UTC header line (date · range · duration) + copy button: `mt-4` below controls
- Timeline card: `mt-2.5` below the header line; `rounded-[10px]` with `p-4` internal padding

**Timeline map columns (fixed left-to-right):**
1. Grip handle: `w-5` (20px), shrink-0
2. Label column: `w-82` (20.5rem / 328px) desktop; `w-54` (13.5rem / 216px) mobile landscape
   - Name + timezone: `flex-1`, min-w `20` (5rem)
   - Start time: `w-28` (7rem / 112px)
   - End time: `w-28` (7rem / 112px), hidden on mobile landscape
3. Track strip: `flex-1`, fills remaining space — the only column that grows/shrinks
4. Remove button: `w-11` (2.75rem / 44px), 44px touch target

**Row height:** `h-12` (48px / 3rem) desktop track cells; `h-9` (36px) mobile landscape. Row overall height is determined by the track cell height plus `py-1.5` (6px top/bottom padding).

**Responsive:**
- **Mobile landscape** (`max-height: 500px` + orientation:landscape): compact mode — reduced padding (`py-3`), smaller row height, end-time column hidden, label column narrower, minimum container width 540px with horizontal overflow allowed
- **Mobile portrait** (`max-width: 500px` + portrait): full-screen rotate prompt; the tool requires landscape on phones

## Elevation & Depth

The system uses tonal layering rather than ambient shadows for structural depth. The three dark surface levels (`#14171c` → `#1b1f27` → `#1e2330`) create hierarchy through value steps, not blur.

Shadows appear only for two interactive states and are always meaningful:

### Shadow Vocabulary
- **Slot window** (`0 2px 10px rgba(0,0,0,0.5)` + `2px solid rgba(232,230,225,0.82)` border): The meeting-time selection overlay. The shadow is structural — it lifts the window above the cell grid and makes it clearly interactive. The semi-transparent border at high opacity is the primary "this is selected" indicator.
- **Drag clone** (`0 16px 48px rgba(0,0,0,0.65), 0 0 0 1px rgba(232,230,225,0.08)`): The floating row clone during drag-to-reorder. Deep shadow at high opacity communicates genuine physical lift. The 1px inset ring at 8% opacity gives a faint edge definition without a visible border.

### Named Rules

**The Flat-By-Default Rule.** Surfaces are tonally distinct but cast no shadow at rest. Shadows are reserved for genuinely interactive elevated states — the slot window and the drag clone — and are never decorative. A new element that appears without shadow is at rest; a new element that needs to feel interactive earns a shadow by earning a shadow.

## Shapes

The form language is restrained and functional. Corners are gently rounded across the system but never pill-shaped.

- **Timeline card**: 10px radius (`rounded-[0.625rem]`) — the largest radius in the system, matching the card's role as the primary container
- **Track cells**: 2px radius (`rounded-sm`) on the container strip, none on individual cells — the strip reads as one cohesive band
- **Buttons**: 8px radius (`rounded-lg`) — standard, unremarkable; buttons should not command attention through shape
- **Add-region row**: 6px radius (`rounded-md`) with dashed border — slightly softer than standard buttons to signal affordance rather than action
- **Time/date inputs**: 8px radius, matching button shape

No pill shapes. No circles (except the 6-dot grip icon circles, which are functional not decorative). No hard square `border-radius: 0` treatments.

**The Grip dots.** The drag handle uses six SVG circles (`r=1.5`, 16×16 viewBox) arranged in a 2×3 grid — the Material Symbols `drag_indicator` pattern. Stroke-based grip icons are not used; the filled-dot pattern reads more clearly at this scale.

## Components

### Buttons
*Functional, self-effacing — the button serves the action, never the design.*

- **Ghost Icon Button** (copy, keyboard shortcuts): transparent background, `text-secondary` icon, `size-7` (28px) square, `rounded-lg` (8px). On hover: faint `rgba(255,255,255,0.05)` background tint, icon shifts to `text-primary`. Focus: `ring-2 ring-ring/50` from the button system.
- **Remove Row Button**: `h-full w-11` (stretches to full row height ~50px, 44px wide) — meets WCAG 2.5.5 touch target minimum. Ghost variant. Hidden until row hover via `opacity-0 group-hover:opacity-100`. Always in layout (`visibility: hidden`, not `display: none`) when only one region remains, to prevent row-width shift.
- **Outline Date Button**: bordered variant, `h-7` (28px), `text-xs` monospace. Shows the date string as its label.

### Region Row
*The primary data display unit of the interface.*

Each row is a `flex items-stretch` container spanning the full map width. From left to right: grip (20px), label block (fixed width), track strip (flexible), remove button (44px). Vertical padding `py-1.5` (6px). Rows are separated by `border-t border-subtle` (1px `#2a2f3a`); no border above the first row, no border below the last — `first:border-t-0` enforces this.

The label block stacks name (semibold, 13px, `text-primary`) over timezone abbreviation (11px, `text-secondary`). To the right: start time (18px medium, severity-colored) with a `+N`/`-N` superscript badge when the endpoint falls on a different calendar day than the anchor date. The badge is always rendered (invisible when unneeded) to prevent layout shift.

### Track Strip (Timeline Cells)
*48 cells per row, one per 30 minutes. Color is the only content.*

The strip is a `flex h-12` (48px desktop, `h-9` 36px mobile) bar spanning the full remaining width. Each cell is a `<button type="button" tabIndex={-1}>` so the interaction registers semantically, but cells are not in the tab order (the keyboard slot controls on the Rnd overlay handle keyboard access).

Two gridline strengths: darker `1px rgba(0,0,0,0.35)` at every hour (every 2nd cell), lighter `1px rgba(0,0,0,0.12)` at every half-hour — a two-tier reference grid visible against any background color.

Cell color states:
- Unselected: pastel (70% signal color + 30% white) — quiet, present, not distracting
- Selected (slot covers this cell): full-saturation signal color — the primary "where is the meeting" signal
- No opacity tricks — solid colors throughout (pastel is computed, not opacity-reduced)

### Selection Slot Overlay
*The meeting-time selection window, drawn once across all rows simultaneously.*

A semi-transparent fill (`rgba(232,230,225,0.06)`) with a high-opacity border (`2px solid rgba(232,230,225,0.82)`) and a drop shadow (`0 2px 10px rgba(0,0,0,0.5)`). Positioned absolutely over the track cells only (not over the label block or remove button). `border-radius: 5px` on the Rnd wrapper. The near-transparent fill is intentional: the "is this selected" signal comes from the underlying cells changing from pastel to solid, not from the window's fill.

### Add Region Row
*A dashed affordance that completes the list.*

Full-width dashed border (`border-dashed border-app-border`), `py-1.5`, `rounded-md` (6px). Centers a `+` icon and "Add region" label. A native `<select>` overlays the entire row with `opacity: 0` — the dashed row IS the select trigger. Hover state: border lifts to `text-secondary` color, faint `bg-white/5` tint. Hidden when all 16 available timezones are already in use.

### Controls
*Plain, unboxed — earns no card treatment.*

`flex-wrap gap-4` row. Two groups: work hours (clock icon + label + two time inputs + dash separator) and date (calendar icon + label + date picker trigger). A `h-4 w-px bg-border` divider separates the groups. Inputs are `h-7 w-32` (28px × 128px), `text-xs` (12px), monospace, with `aria-label` and `id`/`name` for accessibility. The calendar popover is Base UI's `Popover`, rendered inline below the trigger.

## Do's and Don'ts

### Do:
- **Do** use JetBrains Mono Variable for every text element — region names, time values, labels, copy. Zero exceptions, zero mixed-font sections.
- **Do** zero-pad time hours: `02:00 AM`, never `2:00 AM`. 8-character time strings are a structural requirement for column alignment.
- **Do** reserve teal / amber / red for work-hours status only. These colors communicate overlap quality; they are not available for hover states, CTAs, or any other purpose.
- **Do** always render the day badge `<span>` (the `+1` / `-1` superscript) even when it would be invisible. Use `visibility: hidden` not `display: none` to prevent layout shift when the badge appears or disappears.
- **Do** keep the remove button in layout even when only one region remains. Use `visibility: hidden` — not `display: none` — to prevent the row width from changing.
- **Do** apply `prefers-reduced-motion` suppression with `!important` on transition-duration and animation-duration. The signal colors change state frequently; users with reduced-motion preferences should see instant switches.

### Don't:
- **Don't** render a page-level heading, title, or "Overlap Finder" text anywhere visible on screen. The app name lives only in `<title>`. The tool identifies itself through function, not label.
- **Don't** add a second bordered card container. The timeline card is the sole card. Controls, headers, and metadata are plain content on the page background.
- **Don't** nest cards inside the timeline card. No region row should get its own background, border, or elevated container.
- **Don't** use direction-based color variants (e.g. red for "starts early", blue for "ends late"). Direction is conveyed as text only (tooltip, status label). Severity gets color; direction does not.
- **Don't** introduce a fourth signal color or use the three signal colors outside the cells and time labels. Their meaning depends entirely on not appearing elsewhere.
- **Don't** change the row layout to anything other than the fixed column order: grip → label block → track strip → remove button. This sequence is load-bearing for the overlay positioning system.
