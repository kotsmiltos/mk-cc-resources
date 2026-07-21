# verifiability-lens — plugin notes

A strict, opinionated work-quality guardian. Two pillars:
- **Detection — three checks, actively verified.** The `verifiability-lens` agent (tools: Read,
  Grep, Glob, WebSearch, WebFetch, context7, Serena semantic trio — find_symbol /
  find_referencing_symbols / get_symbols_overview / search_for_pattern, fall back to Read/Grep where
  Serena isn't onboarded) runs: (1) **verifiability** A/B/U (verifies via
  read/web/docs, not just labels; capability-relative; never let a U pass as A — the false-clean);
  (2) **completeness** — was everything meant to be done done, or an arbitrary stop (presses to
  continue); (3) **quality bar** — tested, requirements met, robust, best achievable; rejects
  half-assed/missing-requirement/untested work.
- **Delivery** — a surfacing triage (auto-resolve | escalate | suppress) tuned by a recipient
  profile (incl. `stance`, default `strict`) hands the user only the important, actionable,
  fully-contextualized pushes. **Strict judgment, disciplined surfacing** — high bar in what it
  finds, only important+actionable in what it surfaces. Hard rule: never a context-less decision;
  auto-resolutions always logged.

## Layout

```
.claude-plugin/plugin.json       # metadata (v0.4.0)
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
- ✅ v0.3.0: guardian upgrade — agent gains web + docs tools (actively confirms/refutes, not just
  flags); two new checks (completeness / no-arbitrary-stop; quality bar); strict `stance` dial.
  Hook BLOCK_REASON passes `intended_scope` + drives the 3 checks + says continue-not-stop on an
  arbitrary-stop flag. Trigger code unchanged (37/37 hook tests still pass).
- ✅ v0.3.1: Serena read-only semantic tools (find_symbol / find_referencing_symbols /
  get_symbols_overview / search_for_pattern) — trace code paths + callers, not just grep; falls
  back to Read/Grep where Serena isn't onboarded. Bash/Write deliberately excluded (judge, don't
  run/fix).
- ✅ v0.3.2: test hardening (the lens caught these judging its own build) — BLOCK_REASON contract
  tests (intended_scope/completeness/continue + dispatch + no-raw-dump) so a hook-contract
  regression fails; test harness gains a failure counter + denominator + `process.exit` (no silent
  partial). 39/39 pass.
- ✅ v0.4.0: per-project recipient profiles — standard override `<project>/.claude/verifiability-lens/profile.yaml`
  (named in hook BLOCK_REASON + agent def); optional `focus:` list = what "best achievable" means
  for THIS project (quality-bar weighting); copyable presets in `defaults/presets/`
  (game-project / plugin-repo / research-data); read-ONCE-per-dispatch profile rule (kills the
  measured 90×-reads waste). Hook contract tests 39/39.
- later (own gates): firing economics (hand-back + risk-triggered, not per-turn — Phase C of
  design/continuous-transformation.md); in-band pipeline-gate dispatch; PostToolUse fire points;
  extend librarian.md's surfacing protocol with the triage; the schema deepening.

## Relation to existing pieces

- Generalizes essense-flow's `unknowns[]` (input-side "can't answer") to the output-side
  "produced X but can't check it." Extends librarian.md's surface-at-gate protocol with the
  importance × actionability triage and the never-context-less rule.
- The Stop-hook mechanism is the same one essense-autopilot proves
  (`{decision:"block"}` + fail-open).
