# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Anyone scheduling a meeting across multiple timezones — a remote worker coordinating with distributed teammates, a freelancer agreeing on a call with an international client, a team lead proposing times to a globally scattered group. They reach for it when the question is "when does this actually work for everyone?"

## Product Purpose

Overlap Finder is a shareable web utility for finding the best meeting time across multiple timezones. A user adds their regions, sets working hours, and the tool automatically selects the optimal overlap window on a visual 24-hour timeline. The result is either shared as a URL (which preserves the full configuration) or copied as formatted text to paste into a message.

## Positioning

The combination of three things no single competing tool offers together: the entire setup lives in the URL so sharing a link gives the other person the exact same view; the meeting slot is placed visually on a drag-and-drop timeline rather than filled in through forms; and the tool automatically finds the best overlap rather than requiring the user to hunt for it manually.

## Operating Context

Typical flow: add timezones for each participant, set working hours, let the auto-slot pick the best window or drag it manually, verify the per-region local times and any pain indicators, then either share the URL or copy the formatted time string to send in a message or calendar invite. No account, no backend, no persistence beyond the URL.

## Capabilities and Constraints

- Single-page React 19 app, client-side only, no backend or authentication
- Full app state (regions, timezones, working hours, meeting slot, duration, date) encoded in the URL via nuqs; every link is a shareable snapshot
- 24-hour timeline with drag-and-drop region rows (dnd-kit) and a draggable/resizable meeting slot
- Auto best-slot algorithm finds the window with the least overlap pain across all regions
- Per-region pain scoring based on deviation from working hours (shown in the copy output)
- Copy button outputs a formatted plain-text summary of the meeting time in each participant's local time
- Dark-themed, monospace (Geist), tool-aesthetic UI

## Evidence on Hand

- Source code and UI are the authoritative record of current features
- No testimonials, case studies, press, or analytics data on hand; do not fabricate

## Product Principles

1. **State belongs in the URL.** Every configuration is instantly shareable; nothing is lost between sessions.
2. **Show, don't ask.** The visual timeline communicates overlap and pain directly; users understand the situation at a glance.
3. **Automate the tedious part.** Finding the optimal slot should be instant; manual placement is for refinement, not discovery.
4. **Zero friction.** No sign-up, no install, no backend. Open the link and it works.
5. **Honest about discomfort.** Pain scoring and date-crossing labels surface real tradeoffs rather than hiding them.
