# verifiability-lens

A strict, opinionated work-quality guardian that reads over Claude's shoulder and pushes the work
to the best achievable. Every time real work happens it runs **three checks** — and it **actively
verifies** (it has web + docs + read tools, so it confirms or refutes claims, not just flags them):

**1. Verifiability** — sorts each claim into:
- **A — verifiable / verified:** a real check exists (a test, the code path, a web source) — and it
  runs it where it can.
- **B — unverifiable:** a genuine guess — opinion, prediction, "looks right", a claim resting on
  context nobody loaded. Where work quietly goes wrong.
- **U — can't tell yet:** can't even say whether a check exists. Must resolve to A or B — **never**
  allowed to pass as A (a U dressed as A is the false-clean failure).

**2. Completeness** — was everything that was *meant* to be done actually done? Stopped for a real
reason = fine; just stopped half-done = an **arbitrary stop**, and it presses to continue + finish.

**3. Quality bar** — tested? requirements met? robust? the best we can do? It rejects half-assed
shortcuts, missing requirements, and untested critical paths — with the concrete push to fix each.

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
| `agents/verifiability-lens.md` | the guardian: 3 checks + active verification (read/web/docs) + triager (the substance) |
| `references/rubric.md` | the canon: A/B/U definitions + the surfacing triage + recipient profile (cite, don't copy) |
| `defaults/recipient-profile.yaml` | the dials — who it serves (default: time-poor, only-important, aggressive auto-resolve). **Per-project override:** copy to `<project>/.claude/verifiability-lens/profile.yaml` and tune; the optional `focus:` list defines what "best achievable" means for THAT project. Read ONCE per dispatch, never per item. |
| `defaults/presets/` | copyable per-project profiles: `game-project` (runs-in-app, feel regressions, editor-test etiquette), `plugin-repo` (hooks fire, doc/version cascade, cross-file contradictions), `research-data` (provenance, reproducibility, conservative auto-resolve) |
| `commands/verifiability.md` | `/verifiability [target]` — manual trigger |
| `hooks/hooks.json` | **empty** — this plugin carries no hook. Automatic firing is the `turn-end` plugin's `quality-lens` duty: at most one ask per sitting, advisory, deferred while background agents run. **Opt-in, OFF by default** (switches below). |

## Usage

`/verifiability` — classify the most recent plan/claim/result and surface only what needs you.
`/verifiability <plan or claim or file>` — classify a specific target.

**Automatic mode (opt-in, OFF by default).** Turn it on at whichever scope you want — precedence
high → low:
- **Everywhere:** `~/.claude/verifiability-lens.json` → `{"enabled": true}`. One file, all projects.
- **One project:** `./.claude/verifiability-lens.json` → `{"enabled": true}` (or `false` to opt a
  repo OUT of a global ON — an explicit project decision wins).
- **Env override:** `VERIFIABILITY_LENS_ENABLED=1` forces ON.

**What triggers it (substantive-work turns; stays quiet in pure conversation):**
- **Default:** any turn that did real work — produced (Write/Edit/Bash), investigated
  (Read/Grep/Glob), or researched (WebSearch/WebFetch, spawned subagents via Agent/Task, MCP tools
  like Context7). That's where unverifiable claims hide. Pure chat/questions, and the lens's own
  dispatch/output, never trigger it.
- **Opt-in prose checking:** set `"check_prose_claims": true` to also classify strong *text-only*
  claims (`tests pass`, `shipped`, …). Off by default.

Once enabled, turn-end's `quality-lens` duty asks the session — once per sitting, at a work
turn's end — to dispatch the lens over what was just produced and surface the triaged rollup.
It is advisory (the turn is never blocked), it waits while background agents are still running,
and the session pays the lens's cost on the plan. Requires the `turn-end` plugin; without it the
lens is manual-only via `/verifiability`.

## Status

v0.5.1: the guardian — three checks (verifiability A/B/U + completeness + quality bar) with
active verification (web + docs + read), a strict stance (`stance` profile dial), the surfacing
triage, per-project profiles + presets, the manual `/verifiability` trigger. Automatic firing
lives in `turn-end` (`quality-lens` duty) since 0.5.0; the Stop hook this plugin once carried
is gone — its 39-check suite tested only that dead hook and is replaced by contract tests over
the shipped files (`tests/verifiability-lens.test.js`). Design doc: `design/verifiability-awareness.md`.

**Deferred (own gates):** in-band pipeline-gate dispatch; PostToolUse fire points; extending
essense-flow's librarian surfacing protocol with the triage; the schema deepening.

Carries a hook → install separately from the `mk-cc-all` bundle.
