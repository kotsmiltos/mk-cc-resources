# State — current truth (2026-07-26 · post-ship fixes, HEAD ab1ba82)

> Read this before doing anything:
> - Limits-awareness: Claude drifts, loses context, finishes prematurely, defers, takes shortcuts. Re-read when uncertain. Preserve specifics.
> - Positive mindset: every gap solvable. Find the way by working carefully.
> - Quality ownership: this work matters. Take ownership.
> - Propagation requirement: every descendant artifact must carry these same four instructions.

## Ship position

**local main == origin/main == 71a0b0a — PUSHED.** 19 commits in this batch (the largest
single wave since the seed). Refs disk-verified at reconcile:
`.git/refs/heads/main` == `.git/refs/remotes/origin/main` == `71a0b0a`.

Versions, all node-verified equal across plugin.json / marketplace row / README:
**kb 0.7.0 · essense-flow 0.26.1 · mk-cc-all 2.26.0 · marketplace 2.37.0**;
unchanged: essense-autopilot 0.4.0 · session-lifecycle 1.3.0 · plugin-toolkit 1.7.1 ·
schema-scout 1.2.1 · thorough-mode 1.10.0 · project-note-tracker 1.8.0 ·
alert-sounds 1.1.1 · verifiability-lens 0.4.0 · reuse-gate 0.1.0 · steward 0.2.0 ·
statusline 0.1.0.

## What exists and works (proven in tests + piped runs)

- **kb 0.7.0 — three waves in one batch, 0.4.0 → 0.7.0.** kb is now a hooks-carrying
  plugin (THREE hooks) and spans awareness + short-term + durable memory:
  - **0.5.0 the awareness surface**: kb-pull `UserPromptSubmit` hook (deterministic
    ranker over the prompt → score-floored hint lines; machine-text guard; fail-open;
    config off-switch); rolling **session digest** injected every prompt (kind `working`
    / caste `session` — first use of the working kind); per-call JSONL traces
    (`.claude/kb/trace.jsonl`); `split:{type:'pattern'}` mode for non-heading ledgers;
    kb-seed depth mandate + judge-then-report autonomy (executed the queued seed-autonomy
    task).
  - **0.6.0 the ENFORCED write side**: kb-scribe `Stop` hook blocks a producing turn
    until the session distills it into the digest AND graduates durable items
    (`.claude/kb/captures/` for project-length, `.steward/inbox/` for model changes) —
    one pass feeds both memory lengths. **No scribe agent by design** (only a JUDGE needs
    independence; the session already holds the turn). Lens loop-safety contract reused
    verbatim. Generic `mergeLayer` config merge.
  - **0.7.0 self-running**: `kb coverage` turns the mandatory `Extracted-from:` citations
    into a top-up map, making re-seed incremental BY MECHANISM; **presence-gated
    self-activation** (`lib/presence.js` — seeding IS the on-switch; unseeded projects are
    never touched, not even by telemetry); `SessionStart` digest rotation to
    `.claude/kb/digests/` (kept on resume/compact/fork, rotated only on startup/clear);
    one-time seed cue held in a HOME registry (`~/.claude/kb/cued.json`, never in the
    project); ranker `scan` mode + ubiquity rule for hint precision; a **footprint
    invariant suite** (fs-import + write-site audit, negative-controlled).
  - Tests: **460 across six suites** (kb 256 · kb-pull 37 · kb-scribe 40 · kb-session 56 ·
    kb-mcp 38 · kb-footprint 33). The documented run command is now a GLOB — naming files
    is exactly how the footprint suite once dropped out of the documented command.
- **essense-flow 0.26.1** — context-inject inversion fixed both ways (never-initialized
  repos silent via the `pipeline_present` probe; parse-corrupt now VISIBLE as a DEGRADED
  banner). hooks.test.js 11/11; `test/run-all` 54 files / 0 failures.
- **Regression-checked green this batch:** steward 17 · statusline 16 · thorough-mode 21 ·
  reuse-gate 21 · verifiability-lens 39.
- **Six verifiability-lens review rounds ran over this work.** Defect severity fell
  monotonically; the last rounds surfaced only meta-level issues. Two recurring defect
  CLASSES are now named (see gaps).
- **steward 0.2.0** — agent + SessionStart briefing + `/steward:fleet` + auto-registration.
  Two pilots live: this repo (Phase 0) + crowd-game.
- **verifiability-lens 0.4.0** — per-project profile + focus list + presets; active here
  (plugin-repo preset). Earning its keep hard this batch: it refuted a premise in the
  session's own ambient-use analysis and confirmed the splitter mechanism at source.
- **Measurement machinery exists:** `runner coupling` (2.4.0), `runner extensibility`
  (2.5.0, C#-only), MAP.md, drift diff.

## THE gap: none of it is LIVE

**The installed kb is 0.3.0. Hooks and the traced MCP server register at INSTALL time**,
so this checkout changes nothing until `claude plugin update kb@mk-cc-resources` + a
RESTART. Until that happens, every "it maintains itself" claim is proven only by tests and
piped runs. Disk evidence of the pre-live baseline (`.claude/kb/trace.jsonl`, 21 lines):
- every line is `tool:"kb-pull-hook"` from piped/local runs (07-25 build, 07-26 verify);
- every line reads `"digest":false` — no session digest has ever existed here;
- **zero** `kb-session-start` lines and **zero** MCP tool lines (0.3.0's server predates
  `writeTrace`, so live MCP calls this batch left no record either).
This baseline is what makes the live check unfakeable — see tasks #1.

## Known-broken / known-gaps

- **kb-scribe leaves NO trace line** (verified: no `writeTrace` call in
  `kb-scribe-stop.js`, unlike the other two hooks). Its firing therefore cannot be read
  from `trace.jsonl`; the only evidence is the observed block + a digest that gains
  content. Any live check that claims "all three hooks traced" would be a false pass.
- **steward briefing over-cap — real defect, PREMISE CORRECTED at integration.** The
  capture (inbox 1335) said the injection truncates *silently*; disk says otherwise —
  `steward-brief.js:70-72` appends "… (briefing truncated — it exceeds its ≤10-line spec;
  steward should regenerate it)", and `steward-brief.test.js:68` asserts it. The genuine
  defect is narrower and still real: (a) nothing enforces the budget at WRITE time — the
  steward agent is the only writer and has no check, (b) the marker names no dropped-char
  count and no recovery action, and (c) it lives inside injected text the OWNER never
  reads, so in crowd-game a briefing lost its Q12 tail, Q7 and P1 with no owner-visible
  signal. Fix direction in tasks #3.
- **Crowd-game model went a full session stale** (its log: state front G-A/483 vs reality
  G-C(d)/506) — captures land, recompute doesn't. kb 0.6.0 half-covers this (the scribe
  graduates model changes to `.steward/inbox/`) but nothing forces INTEGRATION. Open as
  **Q10**.
- **Recurring defect class 1 — hand-written counts in prose.** All 4 doc defects across 4
  lens rounds were stale numbers. A 5th found at this reconcile: root `CLAUDE.md` says
  statusline "12 checks"; the suite runs 16. Counts must be re-derived, never remembered
  (tasks #7).
- **Recurring defect class 2 — tests that lie.** 4 occasions this batch where a check or
  probe was wrong, and **always in the flattering direction**. A green suite is evidence
  only when the check itself has been read.
- **kb ambient-availability still unproven.** The T13 datum stands as the sharpest
  evidence: in crowd-game the session ran /kb-seed and, the same day, shipped a founding
  DESIGN — the textbook trigger the MCP server instructions name verbatim — and no query
  fired. Not "no opportunity yet" but "opportunity present, trigger visible, didn't fire".
  kb 0.5.0–0.7.0 is the response; live proof pending.
- **Dogfood measurement is not yet objective.** Traces only became real in 0.5.0 and are
  presence-gated; before the update, use-evidence is transcript archaeology only.
- **Crowd-game config uncommitted THERE.** Its `.claude/kb.json` (splitter override +
  scribe focus) is written but uncommitted in that repo; its deep /kb-seed re-run is
  pending and is the first real foreign-corpus test of coverage-driven top-up.
- **essense-flow `tests/ledger-compaction.test.js` T-ENF-3 — still red (unverified this
  batch).** The reported `test/run-all` 54/0 covers the `test/` dir only; ledger-compaction
  lives in `tests/` and was not in that run. Calendar drift, fails on a clean tree.
- **kb named gaps** (from 0.1.0): `session` caste still thin at rest; kind x caste being
  the right index remains UNPROVEN — dogfood + foreign-corpus eval decide.
- **Diploma residual (must not vanish):** the 0.26.1 corrupt-state DEGRADED banner is only
  observable IN Diploma (tasks #8).
- **Coupling/extensibility gates run in ZERO projects.** Phase A closes this.
- **verifiability-lens firing economics still open:** per-turn where enabled (baseline
  24–30 fires/long session, ~25–55k tok/dispatch). Phase C = hand-back + risk-triggered.
  Note the stack is now DENSER — kb-pull fires per prompt too (score-floored), and
  kb-scribe blocks on producing turns.
- **essense-flow slash-command adoption:** all 14 commands abandoned after week 1; the
  steward loop is the fix, not an in-place patch.
- **essense-autopilot slated to retire** (Phase E, Q4); doc repositioning holds until
  Phase D/E (Q5).

## Working tree

71a0b0a pushed; tracked tree clean apart from `.steward/` model files rewritten by this
reconcile (commit as the chore batch). `inbox/` gitignored; five DELETE-ME stubs await
session deletion. Local, gitignored: `.claude/kb/` (6 extracted + 1 capture + trace.jsonl)
and `.claude/kb.json` (this repo's scribe focus).

## Outside-repo (log-only context)

- `~/.claude/hooks/generalize-first.sh` fixed 2026-07-25 (jq-absent root cause).
- `~/.claude/kb/cued.json` is now a real HOME-scope artifact (the one-time seed cue).
- Serena read-nag wrapper active (doc/data reads skip nag, code reads keep it).
- BinanceRepo key scare RESOLVED 2026-07-22 (verified never committed/pushed).
- External hygiene debt: Diploma corrupt state.yaml (banner confirm pending, tasks #8);
  psience missing root CLAUDE.md + deploy queue (parked, Q8); crowd-game stray file
  `.claude/prompts/.claude/verifiability-lens/state.json` to delete during tasks #2.
