# Release notes — essense-autopilot

## 0.4.0 — Flat state schema support + gates derived from the state machine

The autopilot was silently broken against every current essense-flow project: it read `state.pipeline.phase`, but essense-flow's state schema has been flat (top-level `phase`/`sprint`/`wave`) since 0.9 — every Stop-hook fire halted with "no pipeline block". It also keyed blockers on `blocked_on`, a field the live schema replaced with `halt_reason`.

- **Both state shapes accepted** — flat preferred, the legacy `pipeline:` block still tolerated for old projects.
- **Blocker detection** — `blocked_on` (legacy) or `halt_reason` (live schema).
- **`human_gates` + `terminal` derive from essense-flow's `references/transitions.yaml`** when the plugin is installed as a sibling — the state machine owns those lists; the autopilot can no longer drift from it. Hardcoded defaults remain the fail-soft fallback, and per-project `config.yaml` still overrides both.

Verified: 44/44 tests (3 new flat-schema cases pin the advance, `halt_reason`, and human-gate paths; all legacy fixtures still pass); live sandbox run against a flat-schema project emits the `/architect` advance decision.

(Versions before 0.4.0 predate this file; history lives in git.)
