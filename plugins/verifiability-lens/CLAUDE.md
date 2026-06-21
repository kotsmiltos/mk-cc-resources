# verifiability-lens — plugin notes

Two pillars that work as a pair:
- **Detection** — the `verifiability-lens` agent sorts work into A (verifiable) / B (unverifiable)
  / U (can't-tell). Class is capability-relative; a U dressed as A (false-clean) is the failure it
  catches.
- **Delivery** — a surfacing triage (auto-resolve | escalate | suppress) tuned by a recipient
  profile hands the user only the important, actionable, fully-contextualized decisions and
  absorbs the rest. Hard rule: never a context-less decision; auto-resolutions always logged.

## Layout

```
.claude-plugin/plugin.json       # metadata (v0.2.0)
agents/verifiability-lens.md     # the read-only classifier + triager
references/rubric.md             # CANON — A/B/U + surfacing triage + recipient profile (cite, don't copy)
defaults/recipient-profile.yaml  # the dials (who it serves) — config, never hardcoded
commands/verifiability.md        # /verifiability [target] — manual trigger
hooks/hooks.json                 # Stop hook registration
hooks/scripts/verifiability-stop.{sh,js}  # the auto-trigger (opt-in OFF) + fire-once loop guard
tests/verifiability-stop.test.js # 13 guard unit tests
README.md / RELEASE-NOTES.md
```

Tests: `node tests/verifiability-stop.test.js` (no framework). Enable auto-mode (default OFF),
precedence high→low: env `VERIFIABILITY_LENS_ENABLED=1` → project `./.claude/verifiability-lens.json`
`{"enabled": true|false}` (explicit repo decision wins; `false` opts out of a global ON) → global
`~/.claude/verifiability-lens.json` `{"enabled": true}` (everywhere switch). Resolved by the pure
`resolveEnabled`. Optional `"check_prose_claims": true` in the same config also classifies strong
written claims (default OFF — without it, only artifact-producing turns trigger). Runtime state:
`.claude/verifiability-lens/state.json` (gitignored).

## Conventions

- **`references/rubric.md` is the single source of truth.** The agent, the command, and the future
  hook all cite it — none re-prose the A/B/U or triage definitions.
- **Recipient profile is config, not code.** Tune the dials in `defaults/recipient-profile.yaml`;
  the rubric never changes. No personal setup baked into logic.
- **Read-only agent.** The lens classifies and triages; it never writes, edits, or runs. It names
  the check; it does not execute it.
- **Carries a hook (next version) → standalone.** Not in the `mk-cc-all` bundle (hook-carrying
  plugins install separately, like thorough-mode / alert-sounds / essense-autopilot).

## Roadmap (see design/verifiability-awareness.md §11–12)

- ✅ v0.1: lens agent + /verifiability + rubric + profile. Isolation-tested.
- ✅ v0.2: the Stop hook (P1 — blocks the turn, runs the lens in-session, surfaces before
  yielding), opt-in OFF by default, fire-exactly-once loop guard (force-release after a block +
  content-hash skip), fail-open. Mirrors essense-autopilot's Stop-hook block mechanism.
- ✅ v0.2.2: pre-filter precision fix. Stopped firing on conversation; prose-claim checking opt-in
  via `check_prose_claims`; hard-skip questions + the lens's own surfaced output (meta-loop guard).
- ✅ v0.2.3: default trigger broadened to all substantive-work turns — produce (Write/Edit/Bash),
  investigate (Read/Grep/Glob), research (Agent/Task, WebSearch/WebFetch, `mcp__*`). Guards
  reordered: meta-loop skip first (even Agent-tool dispatch turns), then work fires, then
  question/prose guards apply to text-only turns.
- ✅ v0.2.4: **critical fix** — `extractTurn` reads the WHOLE turn (all assistant messages since the
  last genuine user prompt), not just the last message. Turns end with a text-only summary, so
  last-message-only never saw the turn's tools → the hook silently never fired. Verified on a real
  transcript. 37/37 tests.
- later (own gates): in-band pipeline-gate dispatch; PostToolUse fire points; extend librarian.md's
  surfacing protocol with the triage; the schema deepening.

## Relation to existing pieces

- Generalizes essense-flow's `unknowns[]` (input-side "can't answer") to the output-side
  "produced X but can't check it." Extends librarian.md's surface-at-gate protocol with the
  importance × actionability triage and the never-context-less rule.
- The Stop-hook mechanism is the same one essense-autopilot proves
  (`{decision:"block"}` + fail-open).
