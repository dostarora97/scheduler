# Infinite-Scroll Timeline — Exhaustive Implementation Plan

Status: NOT YET STARTED  
Author: planning session  
Pick up from: this document after any context compaction.

---

## 1. Feature Summary

Transform the 24-hour track strip in each region row into a horizontally scrollable
infinite timeline. The 24-hour day pattern tiles seamlessly left and right. The user
can pan to see adjacent days. Dragging or clicking the slot on a different day copy
advances/retreats `dateBasis` by the corresponding number of days.

Key constraint: scrolling must feel native and zero-JS-lag. All row tracks scroll
together (one shared scroll container). The left column (grip + name + tz + times)
and right column (remove button) are visually fixed / sticky at all times.

---

## 2. Layout Architecture

### 2.1 Three-column split per row

```
[FIXED LEFT]         [SCROLLABLE TRACK]          [FIXED RIGHT]
grip + name +        N × 48 cells                remove button
tz + times           Rnd overlay inside           (sticky right-0)
(sticky left-0)      Now line inside
```

### 2.2 Implementation approach — single shared scroll container

NOT: each row has its own `overflow-x: scroll` (requires JS sync between rows).

YES: one shared scroll container wraps only the MIDDLE track portion for ALL rows.

```
<div class="flex">                              <!-- outer flex row -->
  <div class="flex-none" style="width:LABEL_W"> <!-- FIXED LEFT COL -->
    <!-- For each region row: grip + name + tz + times -->
    <!-- Rendered as a vertical stack matching the track's row heights -->
  </div>

  <div ref="scrollContainerRef"                <!-- SHARED SCROLLABLE -->
       class="flex-1 overflow-x-scroll scrollbar-hidden relative">
    <div style="width: COPIES * singleDayWidth">  <!-- WIDE INNER -->
      <!-- Per-region stacked track rows -->
      <!-- Rnd overlay (absolute, full height, positioned at slot UTC) -->
      <!-- Now line (absolute, full height, positioned at current UTC) -->
      <!-- Row separators (border-t between rows) -->
    </div>
  </div>

  <div class="flex-none" style="width:REMOVE_W"> <!-- FIXED RIGHT COL -->
    <!-- For each region row: remove button -->
  </div>
</div>
```

### 2.3 Why NOT sticky-column-inside-scroll

Sticky-inside-overflow works but creates visual layering complexity with the Rnd
overlay (absolute-positioned relative to scroll-content, not viewport). Splitting
into three separate columns makes coordinate math unambiguous.

### 2.4 Height synchronisation

Left-column rows, track rows, and right-column rows must have identical heights.
They are NOT inside the same flex row — they're in separate containers.

Fix: all track rows have a fixed height (`h-12` = 48px cells + `py-1.5` padding =
~60px per row). Left-column and right-column divs use the same explicit height.

Constant: `ROW_HEIGHT = 60px` (py-1.5 = 6px × 2 + h-12 = 48px = 60px total).
Also add `ROW_BORDER = 1px` for `border-t` on rows 2+.

Left column row `n` height: `n === 0 ? ROW_HEIGHT : ROW_HEIGHT + ROW_BORDER`.

If row heights ever change, update this constant. Keep the three columns in sync
by using the SAME height value everywhere.

### 2.5 RegionRow refactor

`RegionRow.tsx` currently renders the whole row. It must be split or adapted to
render separately in three locations. Two options:

**Option A (preferred):** Keep `RegionRow` as-is but export sub-components:
```tsx
export function RegionRowLeft(props) { /* grip, name, tz, times */ }
export function RegionRowTrack(props) { /* just the track cells */ }
export function RegionRowRight(props) { /* remove button */ }
```

DnD `useSortable` lives in the parent `Timeline.tsx` and the sort IDs are the
region IDs. `setNodeRef` goes on a wrapper div that spans all three columns using
CSS Grid or absolute layout. DragOverlay still renders a full-row clone.

**Option B:** RegionRow becomes a horizontal grid
with `grid-template-columns: LABEL_W 1fr REMOVE_W` where the middle cell has
`overflow: visible` and is positioned to align with the shared scroll container.

Option A is cleaner and less disruptive to DnD.

---

## 3. Infinite Scroll — Tiling and Teleport

### 3.1 Number of copies

`COPIES = 5` (indices 0–4; today = index `CENTER_COPY = 2`).

Rationale: user can scroll up to 2 days in either direction before the teleport
fires. More than 2 days is unlikely in normal use. If needed, expand to 7.

### 3.2 Initial scroll position

On first render (or whenever `dateBasis` changes):
```
scrollContainerRef.current.scrollLeft = CENTER_COPY * singleDayWidth
```

This must fire after `singleDayWidth` is known (after ResizeObserver fires).

### 3.3 Teleport trick (seamless infinite scroll)

On the `onScroll` handler of the scroll container:
```
if (scrollLeft < singleDayWidth * 0.5) {
  el.scrollLeft += singleDayWidth * 2   // jump 2 copies rightward
}
if (scrollLeft > singleDayWidth * (COPIES - 1.5)) {
  el.scrollLeft -= singleDayWidth * 2   // jump 2 copies leftward
}
```

This fires when the user has scrolled past 0.5 copies from the left edge or
within 0.5 copies from the right edge. The jump is ±2 copies (same visual
content, different scroll position). User never notices.

**Critical:** wrap the `scrollLeft` mutation in `requestAnimationFrame` to avoid
jank from synchronous scroll event handling. Use `{ behavior: 'instant' }` (no
animation on the teleport).

### 3.4 Day offset calculation

At any given `scrollLeft`, the currently-centered day offset from `dateBasis`:
```
centeredDayOffset = Math.round(scrollLeft / singleDayWidth) - CENTER_COPY
```

This is used to update `dateBasis` when the user COMMITS a slot position
(drag stop, resize stop, or cell click). It is NOT used to update dateBasis
on every scroll tick (that would cause constant re-renders).

---

## 4. Date-Aware Cell Colors (DST-correct per copy)

### 4.1 Why it matters

Timezone offsets change on DST boundaries. A region at UTC+5:30 is always
UTC+5:30 (no DST), but a region in New York might be UTC-4 on one day and
UTC-5 the next. Cell colors depend on the offset, so copies for adjacent days
may show slightly different patterns.

### 4.2 Per-copy offset computation

For each copy index `i` (0–4):
```
copyDate = addDays(dateBasis, i - CENTER_COPY)
copyOffsets = computeOffsets(regions, copyDate)
```

`computeOffsets` is called once per copy, not per cell. 5 copies × n regions =
5n calls. With memoization (`useMemo`) keyed on `[regions, dateBasis, i]`, this
is cheap.

### 4.3 Passing offsets to track rows

`RegionRowTrack` receives `offset: number` (pre-computed for its day).
The parent `RegionScrollContent` (inside the scroll container) renders each
copy's row for each region, passing the correct offset.

---

## 5. Midnight Line (Day Boundary Marker)

### 5.1 Position

The midnight line appears at the **left edge of copy index 1, 2, 3** (i.e., at
the boundary between each pair of adjacent copies). It does NOT appear at the
very left edge (copy 0) or the very right edge (copy 4) to avoid edge artifacts.

Wait — it should appear at the START of every copy EXCEPT copy 0. Copy `i`'s
midnight line is at pixel position `i * singleDayWidth` within the scroll
container.

### 5.2 Design — zero layout drift

**CRITICAL CONSTRAINT:** The midnight line must NOT add pixels to the layout
(no `width` or `border-width` increase). This ensures it cannot cause rows to
drift out of alignment, no matter how thick it visually appears.

**Implementation:** Use `box-shadow` on the first cell of each copy (index = 0
within the copy). Box-shadow does not affect layout dimensions.

```tsx
// In TrackCells, for the first cell of each copy (i === 0 within copy):
style={{
  background: bg,
  boxShadow: isFirstCellOfCopy ? 'inset 2px 0 0 rgba(255,255,255,0.18)' : undefined,
  borderLeft: i === 0 ? 'none' : (i % 2 === 0 ? HOUR_GRIDLINE : HALF_HOUR_GRIDLINE),
}}
```

`inset 2px 0 0 rgba(255,255,255,0.18)`: draws a 2px inner shadow on the LEFT
edge of the cell. This visually widens the left border of the first cell of
each copy by 2px but adds ZERO layout pixels.

Brightness: `rgba(255,255,255,0.18)` — visible but subtle. Not the full white
of the Rnd slot border. Adjust opacity if needed (0.15–0.25 is the target range).

**Why not `border-left: 2px`?** That would add 2px to the cell width in a
flex layout unless using `box-sizing: border-box` AND the parent has a
width that compensates. With `flex-1` cells in an `overflow-hidden` container,
the extra border-left is absorbed by the flex algorithm — but only if every
other cell compensates. This is fragile. `box-shadow` is the correct tool.

**Why not a separate div between copies?** A `<div class="midnight-separator">`
would need `width: 0; overflow: visible` or `position: absolute` to avoid
layout impact. Box-shadow on the first cell is simpler.

### 5.3 The "individual per-row" nature

The midnight line marks 00:00 in UTC, not in any local timezone. It therefore
appears at the same position across all rows (same UTC position = same x in
the track). This is correct and intentional. The user understands the 24h strip
is UTC, and the midnight mark is a UTC midnight, not a local midnight.

The comment in the design: "these 12am marks wouldn't always match with the
other time zones — they're individual." This refers to the DISPLAY of local
times (regions show different local times for the same UTC moment), not to the
position of the line itself. The line position is UTC-absolute and thus
consistent across rows.

---

## 6. Coordinate System Changes

### 6.1 New derived quantities

```
singleDayWidth = scrollContainerWidth / COPIES
pxPerMin = singleDayWidth / 1440
cellPx = singleDayWidth / 48
```

`scrollContainerWidth` comes from ResizeObserver on the scroll container inner div.

Previously `trackWidth` was the width of one day. Now `trackWidth` (the observable
from ResizeObserver) is the TOTAL scroll content width = `COPIES * singleDayWidth`.

Rename existing `trackWidth` to `scrollContentWidth`. Derive `singleDayWidth`.

### 6.2 Rnd overlay position

The Rnd lives inside the scroll container at absolute position:
```
x = CENTER_COPY * singleDayWidth + slotUTC * pxPerMin
y = 0
width = max(cellPx, dur * pxPerMin)
height = scrollContentHeight
```

The `bounds="parent"` constraint applies to the full scroll content width, which
means the Rnd can technically be dragged across all copies. This is desired.

On drag stop:
```
absoluteX = d.x   // position within scroll container content
copyIndex = Math.floor(absoluteX / singleDayWidth)
dayOffset = copyIndex - CENTER_COPY
newSlotUTC = snapToGrid((absoluteX % singleDayWidth) / pxPerMin, dur)
```

Update: `slotUTC = newSlotUTC`, and if `dayOffset !== 0`: `dateBasis += dayOffset`.
After updating dateBasis, reset `scrollLeft = CENTER_COPY * singleDayWidth` so the
view re-centers on the new "today."

### 6.3 Resize handlers

Same pattern as drag stop. `pos.x` is in scroll container content coordinates.

```
absoluteX = pos.x
copyIndex = Math.floor(absoluteX / singleDayWidth)
dayOffset = copyIndex - CENTER_COPY
```

For left-edge resize: day may change. For right-edge resize: duration may
span across copy boundaries (allowed — very long meetings can span days).

### 6.4 Cell click handler

```
absoluteCol = col (relative to the copy it's in)
copyIndex = whichCopy (0-4)
dayOffset = copyIndex - CENTER_COPY
newSlotUTC = snapToGrid(col * CELL_MINUTES, dur)
```

Timeline passes `copyIndex` to `RegionRowTrack` which passes it to
`TrackCells` which includes it in the `onCellClick(copyIndex, col)` callback.

### 6.5 Now line position

```
nowX = CENTER_COPY * singleDayWidth + (currentUTCMin / 1440) * singleDayWidth
```

The now line is pinned to CENTER_COPY (today's copy). It does NOT adjust for
scroll offset because it's in content-space (absolute inside scroll container).
When the user scrolls away from today, the now line scrolls off-screen. This
is correct — the now line represents "now on today", not "now on whatever day
you're looking at."

rAF loop update:
```
nowX = CENTER_COPY * singleDayWidthRef.current + (utcMin / 1440) * singleDayWidthRef.current
nowLineRef.current.style.left = `${nowX}px`
```

---

## 7. DnD Row Reorder — Preserving Across Split Layout

### 7.1 Problem

Currently, `useSortable` is on the entire `RegionRow` div. With the three-column
split, there's no single wrapper that spans all three columns.

### 7.2 Solution

Keep `useSortable` in `Timeline.tsx` (not in RegionRow). Use a CSS Grid or
absolutely-positioned wrapper that invisibly spans all three columns for each
row. The `setNodeRef` goes on this invisible row wrapper, and the DnD library
animates the whole row together.

The three-column content (left, track, right) are visually inside this grid row.

Alternative: DnD only on the left column (the grip handle is there). The
`listeners` and `attributes` go on the grip button only. The DndKit `useSortable`
still gets `setNodeRef` on the left column wrapper. The DragOverlay renders a
full three-column clone.

When dragging, the left column opacity = 0 (as before with `isDragging`). The
track and right column also need opacity = 0 during drag. Coordinate via a
`isDragging` prop passed to all three sub-components for the same region.

### 7.3 DragOverlay clone

The DragOverlay renders a full-row clone (left + track + right side by side with
`DRAG_CLONE_STYLE`). This works as before — it uses the same sub-components
with dummy callbacks.

---

## 8. File-by-File Changes

### 8.1 `src/index.css`

Add utility:
```css
.scrollbar-hidden {
  scrollbar-width: none;
}
.scrollbar-hidden::-webkit-scrollbar {
  display: none;
}
```

Also add constant-free CSS for midnight line if using a CSS class approach.

### 8.2 `src/lib/params.ts`

No changes. `dateBasis` already exists and can change dynamically.

### 8.3 `src/App.tsx`

Add `onDateChange` prop to `<Timeline>`:
```tsx
onDateChange={(v) => setParams({ date: v })}
```

Also update `todayISO()` call in `params.ts` default — already correct.

### 8.4 `src/components/TrackCells.tsx`

New props:
```tsx
interface TrackCellsProps {
  // ... existing ...
  isFirstCopy?: boolean   // true for copy index > 0 (midnight line)
  copyIndex?: number      // 0-4, used to determine midnight line
}
```

Add midnight line box-shadow to the FIRST cell (`i === 0`) when `isFirstCopy` is
true:
```tsx
const isMidnightBoundary = isFirstCopy && i === 0;
style={{
  background: bg,
  boxShadow: isMidnightBoundary ? 'inset 2px 0 0 rgba(255,255,255,0.18)' : undefined,
  borderLeft: ...,
}}
```

Pass `isFirstCopy={copyIndex > 0}` from parent.

### 8.5 `src/components/RegionRow.tsx`

Split into:
- `RegionRowLeft` — `{grip} {name+tz+times}`, accepts all props needed to display
- `RegionRowTrack` — COPIES stacked horizontally, each `<TrackCells ... />`
- `RegionRowRight` — remove button

Or: export a refactored `RegionRow` that can be used in a grid layout.

Key: `useSortable` moves to Timeline. RegionRow(s) receive `isDragging` and
transform/transition from parent.

### 8.6 `src/components/Timeline.tsx`

Major changes:
1. Constants: `COPIES = 5`, `CENTER_COPY = 2`
2. State: rename `trackWidth` to `scrollContentWidth`. Derive `singleDayWidth`.
3. Refs: `scrollContainerRef` (the shared scroll container), `singleDayWidthRef`
4. ResizeObserver: observe the scroll container inner div
5. Effects:
   - Initial scroll centering (after singleDayWidth known)
   - rAF for now line (updated x formula)
   - Scroll teleport handler
6. Layout: three-column flex (left fixed, scroll middle, right fixed)
7. Inside scroll container: per-region track rows, Rnd overlay, now line
8. Rnd coordinate math: all updated per Section 6
9. Cell click: propagates `(copyIndex, col)` → `(dayOffset, slotUTC)` → callbacks
10. DnD: `useSortable` here, not in RegionRow
11. Add `onDateChange` prop and call it when dayOffset ≠ 0

### 8.7 `src/lib/tz.ts`

No changes. `computeOffsets(regions, dateBasis)` already accepts a date string.

---

## 9. Per-Copy Offset Computation

```tsx
// In Timeline.tsx, compute offsets for each copy
const allCopyOffsets = useMemo(() => {
  return Array.from({ length: COPIES }, (_, i) => {
    const dayOffset = i - CENTER_COPY;
    const copyDate = addDaysToISO(dateBasis, dayOffset);
    return computeOffsets(regions, copyDate);
  });
}, [regions, dateBasis]);
```

`addDaysToISO(isoString, n)` utility function — add to `tz.ts`:
```ts
export function addDaysToISO(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + n));
  return date.getUTCFullYear() + '-' +
    String(date.getUTCMonth() + 1).padStart(2, '0') + '-' +
    String(date.getUTCDate()).padStart(2, '0');
}
```

---

## 10. Scroll Container Dimensions

The ResizeObserver now observes the scroll container INNER DIV (the wide one):
```
scrollContentWidth = el.offsetWidth   // = COPIES * singleDayWidth
scrollContentHeight = el.offsetHeight // = sum of all row heights
```

The OUTER scroll container (overflow-x: scroll) has width = card width - labelW - removeW.

`singleDayWidth = scrollContentWidth / COPIES`

Rnd default height = `scrollContentHeight` (spans all rows). Same as before.

---

## 11. Keyboard Slot Controls (Arrow Keys)

Arrow left/right currently moves the slot by `CELL_MINUTES` (30 min) within
the same day. After this change, the slot can move into adjacent copies.

If moving left from `slotUTC = 0`, the slot should cross into the previous day:
```
newAbsoluteMin = (CENTER_COPY * 1440) + slotUTC ± CELL_MINUTES
newCopyIndex = Math.floor(newAbsoluteMin / 1440)
newSlotUTC = newAbsoluteMin % 1440
newDayOffset = newCopyIndex - CENTER_COPY
```

If `newDayOffset !== 0`: update `dateBasis` and reset scroll.

---

## 12. Mobile Landscape Considerations

On mobile landscape (`mobile-ls` variant), the compact layout still applies:
- Left column: `w-54` (13.5rem) — hidden end time
- Right column: same remove button
- Scroll container: `flex-1` (remaining space after left + right columns)
- COPIES stays at 5 — user can still scroll on mobile

The scroll gesture on mobile (swipe) works natively with `overflow-x: scroll`.
No additional touch handling needed.

---

## 13. Add Region Row

The "Add region" row is currently inside the `SortableContext` but OUTSIDE the
`position:relative` wrapper for the Rnd overlay. With the new layout, it stays
below the scroll container:
- Left part: empty space matching the fixed left column width
- Middle part: just the dashed "+" row spanning singleDayWidth (visible area)
- Right part: empty space matching the right column width

OR: the "Add region" row is outside the three-column split entirely (full width,
below everything) — simpler and matches current behavior.

---

## 14. Implementation Order (to minimise broken states)

1. Add `addDaysToISO` to `tz.ts` (no UI change)
2. Add `scrollbar-hidden` CSS utility (no UI change)
3. Refactor `RegionRow.tsx` into Left/Track/Right sub-components
4. Refactor `Timeline.tsx` layout to 3-column (but still 1 copy, COPIES=1)
   — verify nothing is broken at this stage
5. Expand to COPIES=5, update all coordinate math
6. Add infinite scroll teleport
7. Add per-copy offsets (DST-aware)
8. Add midnight line to `TrackCells.tsx`
9. Update keyboard arrow key handler for cross-day movement
10. Add `onDateChange` prop and wire dateBasis updates
11. Test: drag slot to different copy, verify dateBasis advances
12. Test: teleport is invisible, scrolling is smooth
13. Test: mobile landscape

---

## 15. Known Risks and Edge Cases

- **Teleport causes scroll jump on Safari**: Safari may fire a scroll event during
  the teleport assignment. Debounce the teleport logic with a 50ms cooldown.
  
- **Rnd key remount timing**: Currently `key=${slotUTC}-${dur}-${trackHeight}`.
  After this change, `trackHeight` becomes `scrollContentHeight`. The Rnd
  remounts whenever dateBasis changes (because the key includes a dateBasis-
  derived value — or should it?). Decide: remount Rnd when dateBasis changes so
  its default position resets to CENTER_COPY. Yes, include dateBasis in the key.

- **Copy 0 left edge**: The very left edge of copy 0 has no midnight line.
  The Rnd cannot be dragged further left than the start of copy 0. If needed,
  clamp: `Math.max(0, newAbsoluteX)`.

- **ResizeObserver fires before scroll centering**: On first render, the
  singleDayWidth is 0 until ResizeObserver fires. The initial scroll centering
  must happen inside a `useEffect` that depends on `singleDayWidth !== 0`.

- **DnD and horizontal scroll conflict**: DnD uses `PointerSensor` with
  `distance: 5`. If the user tries to horizontal-scroll by starting a pointer
  gesture that looks like a drag, DnD might intercept. The horizontal modifiers
  should not interfere since `restrictToVerticalAxis` is applied to row DnD.
  But test carefully. May need `horizontal-scroll` detection in DnD activationConstraint.

- **Scroll sync with DragOverlay**: During row-reorder drag, the DragOverlay
  shows a floating clone. The clone is outside the scroll container and shows
  the row at its current scroll position. This is fine — the visual is acceptable.
