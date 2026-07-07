# reuse-gate

A reuse-first reminder at the exact moment code is written.

Writing new code is the last resort — not the first move. Before you build,
the capability may already exist: elsewhere in the codebase, or in a package you
could adopt. An instruction that says so drifts out of context over a long
session; a hook does not. `reuse-gate` fires a deterministic nudge on the first
source-code write after each user message.

## What it does

A `PreToolUse` hook on `Write` / `Edit` (also `MultiEdit`, `NotebookEdit`).
The **first** write to a **source-code file** after a user message surfaces the
reuse-first checklist:

1. **Already implemented here?** Search the codebase / functionality glossary
   (`MAP.md`) — reuse or extend, don't duplicate.
2. **Served by a package/library?** For well-solved problems, adopt a maintained
   dependency (pinned, wrapped behind your own contract) over hand-rolling.

Only write new when neither fits. What you do write: modular, decoupled,
reusable.

## Mechanism — inject once per user message, never block

`hookSpecificOutput.additionalContext`. The first source write returns:

```json
{ "hookSpecificOutput": { "hookEventName": "PreToolUse", "additionalContext": "…reminder…" } }
```

and exits 0. Per the Claude Code hooks reference, `additionalContext` is injected
into Claude's context *before* the tool executes — so the reminder is seen and
the write proceeds. Dedupe is keyed on `prompt_id` (the hooks reference's UUID for
the user prompt being processed), so it fires **once per user message** — on the
first source write of that turn, not on every one, and again on the next message.

**No block, no permission side effect.** It does *not* return
`permissionDecision: "allow"` (which would skip your write-permission prompt) and
it does *not* use exit-2 (which would block the call). It emits no permission
decision at all — the write flows through the normal permission path untouched.
Because it never blocks, even a failed state write degrades only to "the reminder
repeats next write", never to an obstructed write — genuinely fail-open.

Docs, config, and data files (`.md`, `.json`, `.yaml`, `.txt`, `.lock`, …) never
trigger it — reuse-first is a code concern.

## Enable (OFF by default)

Precedence high→low:

1. `REUSE_GATE_ENABLED=1` (env — forces on)
2. project `./.claude/reuse-gate.json` → `{ "enabled": true }` (a repo can opt
   OUT of a global ON with `false`)
3. global `~/.claude/reuse-gate.json` → `{ "enabled": true }` (everywhere)

**Fail-open:** any error, missing field, or ambiguity → exit 0 (the write
proceeds). A missed reminder is cheaper than a spurious block.

## Runtime state

`.claude/reuse-gate/state.json` — the last-reminded-prompt marker
(`{ "last_prompt": <id> }`). Safe to delete; it only controls the
once-per-message dedupe.

## Requires

Claude Code **v2.1.196+** — the dedupe keys on the `prompt_id` field, added in
that version. On older versions `prompt_id` is absent, so the hook is inert
(fail-open: never fires, never blocks) rather than reminding on every write.

## Test

```
node tests/reuse-gate.test.js
```

## Relation to the rest of the ecosystem

The always-on companion to the reuse-first instructions elsewhere:
essense-flow's `code-conventions.md` ("Before you build: reuse what exists"),
the global `~/.claude/CLAUDE.md` Code Quality rule, and thorough-mode's `@build`
REVIEW gate. Those instruct; this one fires whether or not the instruction was
loaded. Carries a hook — install separately from the `mk-cc-all` bundle (like
`verifiability-lens`, `thorough-mode`, `essense-autopilot`, `alert-sounds`).
