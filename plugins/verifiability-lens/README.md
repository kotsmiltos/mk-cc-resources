# verifiability-lens

An automatic helper that reads over Claude's shoulder. Every time work is planned, claimed, or
produced, it sorts each piece into:

- **A — verifiable:** a real check exists (a test, the code path, a deterministic diff). Provable.
- **B — unverifiable:** a guess — an opinion, a prediction, "looks right", a claim resting on
  context nobody loaded. Where work quietly goes wrong and agents spin.
- **U — can't tell yet:** you can't even say whether a check exists. Must resolve to A or B —
  **never** allowed to pass as A (a U dressed as A is the false-clean failure).

Then it decides what's worth your time. It does **not** dump the classes on you. It triages:

- **suppress** — tiny / low-impact → logged, never shown.
- **auto-resolve** — it can settle it → takes a sensible default, **logs it**, tells you in one line.
- **escalate** — important *and* you genuinely need to decide → shows you, in plain words: what it
  is, why it matters, and a recommended answer you can just accept — with everything needed to
  decide bundled in. **Never a decision you'd have to go study for.**

The goal: pick up your slack. Catch the mistakes, fix or default the small stuff, and tap you only
for the handful of real decisions, pre-chewed.

## Why

Hard-to-verify work (class B/U) is where iterative agents stall — they can't tell if a loop got
closer to right, so they spin, and unverifiable claims slip through as if checked. Making the
verifiable/unverifiable split a first-class, *surfaced* signal stops that. The marketplace already
encoded this axis ~8 times under different names (agency levels, `manual` verdicts, confidence
tiers, `verified` flags); this names it once and acts on it.

## Pieces

| piece | what it is |
|-------|-----------|
| `agents/verifiability-lens.md` | the read-only classifier + triager (the substance) |
| `references/rubric.md` | the canon: A/B/U definitions + the surfacing triage + recipient profile (cite, don't copy) |
| `defaults/recipient-profile.yaml` | the dials — who it serves (default: time-poor, only-important, aggressive auto-resolve) |
| `commands/verifiability.md` | `/verifiability [target]` — manual trigger |
| `hooks/` (Stop hook) | fires it **automatically** every classify-worthy turn — blocks the turn, runs the lens in-session, surfaces the triaged result before yielding. **Opt-in, OFF by default.** Fire-exactly-once loop guard, fail-open. |

## Usage

`/verifiability` — classify the most recent plan/claim/result and surface only what needs you.
`/verifiability <plan or claim or file>` — classify a specific target.

**Automatic mode (opt-in):** add `.claude/verifiability-lens.json` with `{"enabled": true}` to a
project (or set env `VERIFIABILITY_LENS_ENABLED=1`). Then the Stop hook fires on every
classify-worthy turn — it blocks, runs the lens over what was just produced, and surfaces the
triaged result before the turn ends. OFF by default; nothing fires until you enable it. You wait a
moment per classify-worthy turn for the in-session classification — the deliberate cost of catching
the slack before you act on it.

## Status

v0.2 ships the lens + manual trigger + rubric + profile + the automatic Stop hook (opt-in).
Verified: 13/13 guard unit tests + a process-level smoke (block → release → no-loop). Design doc:
`design/verifiability-awareness.md`.

**Deferred (own gates):** in-band pipeline-gate dispatch; PostToolUse fire points; extending
essense-flow's librarian surfacing protocol with the triage; the schema deepening.

Carries a hook → install separately from the `mk-cc-all` bundle.
