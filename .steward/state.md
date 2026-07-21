# State — current truth (2026-07-21)

> Read this before doing anything:
> - Limits-awareness: Claude drifts, loses context, finishes prematurely, defers, takes shortcuts. Re-read when uncertain. Preserve specifics.
> - Positive mindset: every gap solvable. Find the way by working carefully.
> - Quality ownership: this work matters. Take ownership.
> - Propagation requirement: every descendant artifact must carry these same four instructions.

## What exists and works

- **Marketplace 2.29.0** — 11 active plugins on `main`; 7 benched plugins preserved on
  `archive/benched-plugins`.
- **steward 0.1.0 SHIPPED** (2026-07-21, commit 3791b7f) — Phase 0 of the continuous-
  transformation plan (§5). Agent (integrate/brief/seed) + SessionStart briefing hook
  (deterministic, silent without `.steward/`, fail-open, 2000-char guard, deliberately
  no Stop hook) + 4 optional alias commands + 9-check test suite.
- **Phase 0 pilot is LIVE — and it is THIS repo** (owner call, 2026-07-21).
  mk-cc-resources seeded its own `.steward/` same day; validation is passive during
  normal use here. Crowd-game seeding graduates to Phase D (first external project).
  Model committed to the public repo; `inbox/` gitignored (`!.gitkeep` kept).
- **Plugin versions:** essense-flow 0.26.0 · essense-autopilot 0.4.0 · session-lifecycle
  1.3.0 · plugin-toolkit 1.7.1 · schema-scout 1.2.1 · thorough-mode 1.9.1 ·
  project-note-tracker 1.8.0 · alert-sounds 1.1.1 · verifiability-lens 0.3.2 ·
  reuse-gate 0.1.0 · steward 0.1.0 · mk-cc-all bundle 2.21.1.
- **Recent arc** (git log): generativity protocol (essense-flow 0.25.0) → thorough-mode
  protocol-shaped injections (1.8.x→1.9.1) → verifiability-lens follow-through + handoff
  quality gate → reuse-first ship (reuse-gate 0.1.0) → steward 0.1.0.
- **Measurement machinery exists:** `runner coupling` (engine 2.4.0), `runner
  extensibility` (engine 2.5.0, C#-only), MAP.md functionality map, drift diff.

## Known-broken / known-gaps

- **Coupling/extensibility gates run in ZERO projects.** The v3 design's own audit
  finding — gates exist, nothing wires them into executor steps. Phase A closes this.
- **verifiability-lens Stop-hook economics:** fires per turn where enabled — rough
  2026-07-21 baseline: 24–30 fires/long session, ~25–55k tokens/dispatch. Owner call:
  keep current enablement AS-IS until Phase C re-economics (hand-back +
  risk-triggered); these rough measurements ARE the Phase C baseline.
- **thorough-mode modifier misfire class** — @prompt regex matched inside notification
  text twice on 2026-07-21 (triggers match non-user text). Owner call: fix as a
  one-pass audit of all 8 modifiers, anchored to user-authored text.
- **CLAUDE.md architecture snapshot is stale:** does not list the steward plugin
  (shipped same day) — unintentional lag, sync task queued.
- **essense-flow slash-command adoption:** per the v3 audit, all 14 commands abandoned
  in practice after week 1; owner-as-engine pattern (20–93 steering turns/session).
  This is the problem the steward loop exists to fix, not a bug to patch in place.
- **essense-autopilot is slated to retire** (v3 §2 — closest thing to refuted
  TIME-autonomy). Still shipped and documented as active. Owner call: retires with
  Phase E; essense-flow doc repositioning also holds until Phase D/E.

## Working tree

Scratch files (`apolymansi_notice.pdf`, `make_notice.py`, `oh/`, `tree.json`,
`plugins/essense-flow/.claude/`) — confirmed scratch by owner; .gitignore entries
appended by the session; files stay on disk, ignored. RESOLVED. `.steward/` model +
.gitignore changes await commit (tasks.md #2).
