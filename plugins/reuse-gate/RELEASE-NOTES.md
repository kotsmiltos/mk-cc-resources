# reuse-gate release notes

## v0.1.0

Initial release — reuse-first reminder at the moment code is written.

- `PreToolUse` hook on `Write` / `Edit` / `MultiEdit` / `NotebookEdit`.
- Fires **once per user message** (dedupe keyed on `prompt_id`) on the first
  **source-code** file write of that turn, via `hookSpecificOutput.additionalContext`
  (injected before the tool runs; the write proceeds — **never blocks**). No
  `permissionDecision` and no exit-2 — writes keep their normal permission path, no
  auto-approve and no block side effect.
- Source-only: docs/config/data files (`.md`, `.json`, `.yaml`, …) never trigger.
- Opt-in **OFF** by default (env `REUSE_GATE_ENABLED=1` / project or global
  `.claude/reuse-gate.json`). Project decision overrides global. Fail-open on any
  error.
- Last-reminded-prompt marker at `.claude/reuse-gate/state.json` (`{ "last_prompt": <id> }`).
- 21 pure-logic unit tests + end-to-end stdin smoke test.
- Requires Claude Code **v2.1.196+** (the `prompt_id` field the dedupe keys on).
  On older versions `prompt_id` is absent, so the hook is inert (fail-open —
  never fires, never blocks).

Companion to the reuse-first *instructions* (essense-flow `code-conventions.md`,
global `CLAUDE.md` Code Quality, thorough-mode `@build`) — those instruct, this
fires deterministically regardless of context drift. Standalone hook plugin —
install separately from the `mk-cc-all` bundle.
