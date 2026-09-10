# Overlap Finder

A shareable timezone overlap finder. Drag a selection window across a 24-hour timeline, see availability for every timezone simultaneously, copy the result.

**Live:** _deploy URL goes here after first Vercel deploy_

## Structure

```
src/
  App.tsx                   — root: URL params, copy, share
  components/
    Controls.tsx            — work-hours TimeField + date picker
    Timeline.tsx            — DnD rows, Rnd slot overlay, Add Region popover
    RegionRow.tsx           — single timezone row (grip, label, times, cells, delete)
    TrackCells.tsx          — 48-cell color strip
  lib/
    tz.ts                   — all time math (offset, wrap, format, instantLevel)
    params.ts               — nuqs URL state schema
  index.css                 — Tailwind v4, custom variants, palette tokens
```

## Stack

| Layer | Tool |
|-------|------|
| Framework | React 19 + Vite |
| Styling | Tailwind v4 + JetBrains Mono Variable |
| State | nuqs (URL) — zero backend |
| Drag / resize | @dnd-kit (rows) + react-rnd (slot) |
| UI primitives | Base UI + shadcn/ui |
| Runtime | Bun |
| Deploy | Vercel (auto on push to `main`) |

## Commands

```bash
bun install          # install
bun run dev          # dev server → http://localhost:5173
bun run build        # production build → dist/
bun run lint         # oxlint
```

## Key Design Decisions

- **URL = state.** Every timezone, date, slot, and duration is encoded in the URL. Sharing a link gives the recipient the exact same view.
- **Dark-only.** The app is intentionally dark-only. No light theme.
- **JetBrains Mono everywhere.** Single font, no exceptions — structural labels, time values, region names, all of it.
- **Signal colors own their meaning.** Teal/amber/red (ok/mild/heavy) are reserved for work-hours overlap quality. They appear nowhere else.
- **The map is the one card.** Only the timeline container gets a bordered card treatment.

## Design System

- Palette tokens: `--color-app-bg`, `--color-app-card`, `--color-app-border`, `--color-app-muted`, `--color-app-fg`, `--color-app-elevated` (see `src/index.css`)
- Signal palette: `--color-green`, `--color-amber`, `--color-red` + pastel variants (alpha-based)
- Responsive: `mobile-ls` (`max-height:500px` landscape) and `mobile-pt` (`max-width:500px` portrait) custom Tailwind variants

## Deployment

| Platform | Trigger |
|----------|---------|
| Vercel | Auto on push to `main` |

`vercel.json` at repo root configures the Vite build. No env vars required — the app is fully client-side.

## Principles

- Never justify cutting corners by citing project size, user count, or "it's just a small tool."
- All CSS lengths in `rem` (not `px`) so the interface scales with browser font size.
- Magic numbers belong in named constants, not inline in logic.
- The app must never show a horizontal scrollbar on desktop.
