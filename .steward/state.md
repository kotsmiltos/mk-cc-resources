# State — current truth (2026-07-25, post "do them all" batch)

> Read this before doing anything:
> - Limits-awareness: Claude drifts, loses context, finishes prematurely, defers, takes shortcuts. Re-read when uncertain. Preserve specifics.
> - Positive mindset: every gap solvable. Find the way by working carefully.
> - Quality ownership: this work matters. Take ownership.
> - Propagation requirement: every descendant artifact must carry these same four instructions.

## What exists and works

- **Marketplace 2.34.0** — 13 active plugins + mk-cc-all bundle 2.23.0 (row + root
  plugin.json CONSISTENT — the 2.21.1/2.22.0 drift fixed and shipped in 1159497);
  7 benched plugins on `archive/benched-plugins`.
- **Ship position: local main == d830d62, UNPUSHED; origin/main == 1159497**
  (refs-stated 2026-07-25). 1159497 = arrival-check patch (marketplace row fix),
  pushed on owner word. d830d62 = the "do them all" batch (kb 0.4.0 + essense-flow
  0.26.1 + cascade) — push awaits owner word (tasks #1).
- **kb 0.4.0 — pull surface LIVE, retrieval rung 1 shipped** (2026-07-25):
  - Arrival check PASSED: /mcp shows kb connected, kb_overview in-session, suites
    green. The 0.3.0 alwaysLoad B-class is CLOSED — observed live.
  - Rung 1 (deterministic ranker upgrades, answered-Q9 ladder): stemming +
    edit-distance-1 typo tier + config alias groups + `skipThinPreamble` (corpus
    75→71 here, boilerplate preambles gone). Tests 166→198 + MCP 32/32.
  - First /kb-seed ran on THIS repo: 6 cited entries → `.claude/kb/extracted/`
    (gitignored, local); lens caught one false universal in the test-convention
    entry, amended in place.
- **essense-flow 0.26.1 — context-inject inversion FIXED both ways**:
  never-initialized repos silent (`pipeline_present` probe in lib/state.js, both
  hooks); parse-corrupt VISIBLE (ShapeValidationError caught → DEGRADED banner;
  was stderr-only). hooks.test.js 7→11 green. Companion fix outside repo: the
  generalize-first over-trigger root-caused (jq absent → raw-payload matching) and
  fixed in `~/.claude/hooks/generalize-first.sh` (node .prompt extraction, no
  raw-payload fallback, machine-text guard).
- **steward 0.2.0** — agent + SessionStart briefing + /steward:fleet +
  auto-registration. Tests 17/17. TWO pilots live: this repo (Phase 0) + crowd-game
  (seeded 2026-07-21, eval terms pinned in inbox/done/).
- **thorough-mode 1.10.0** — machine-text guard + steward-aware @prompt. Tests 21/21.
- **verifiability-lens 0.4.0** — per-project profile + focus list + 3 presets +
  read-once rule. Tests 39/39. Active HERE (plugin-repo preset); crowd-game half
  pending. Earning its keep: caught the seed false-universal + task-#3's foreign-repo
  residual this session.
- **statusline 0.1.0** — wired in user settings; 12/12 tests.
- **Plugin versions:** essense-flow 0.26.1 · essense-autopilot 0.4.0 ·
  session-lifecycle 1.3.0 · plugin-toolkit 1.7.1 · schema-scout 1.2.1 ·
  thorough-mode 1.10.0 · project-note-tracker 1.8.0 · alert-sounds 1.1.1 ·
  verifiability-lens 0.4.0 · reuse-gate 0.1.0 · steward 0.2.0 · statusline 0.1.0 ·
  kb 0.4.0 · mk-cc-all 2.23.0. README + RELEASE-NOTES + both CLAUDE.mds synced in
  d830d62.
- **Recent arc:** kb 0.1.0→0.3.0 pull surface (94a3b17) → arrival check + row fix
  (1159497, pushed) → "do them all" batch: first seed + Q9-answered rung 1 (kb 0.4.0)
  + inversion fix (essense-flow 0.26.1) — d830d62, unpushed.
- **Measurement machinery exists:** `runner coupling` (2.4.0), `runner extensibility`
  (2.5.0, C#-only), MAP.md, drift diff.

## Known-broken / known-gaps

- **Pre-existing red: essense-flow `tests/ledger-compaction.test.js` T-ENF-3** —
  governance-ledger entries >30d unarchived; calendar drift, fails on a clean tree
  too. Small chore (tasks #3).
- **Task-#3 foreign-repo residual (lens-flagged, must not vanish):** the done-check
  clause "Diploma launch surfaces its corruption instead of silence" is only
  observable IN Diploma — next Diploma session: confirm the corrupt-state DEGRADED
  banner appears (tasks #7).
- **kb ambient-availability signal not yet observed:** 6 kb_query calls this session,
  ALL protocol-driven (seed dupe checks), zero unprompted. Watch continues (tasks #4);
  zero after ~5 sessions is itself a finding.
- **kb named gaps** (from 0.1.0, still true): `working` kind unwritten; `session`
  caste thin; kind x caste being the right index UNPROVEN — dogfood + foreign-corpus
  eval decide.
- **kb-seed confirm gate = owner-flagged friction:** mandatory confirm-every-time
  contradicts owner direction "it should be able to see on its own" — relax queued
  (tasks #2), preferably before the crowd-game seed.
- **Coupling/extensibility gates run in ZERO projects.** Phase A closes this.
- **verifiability-lens firing economics still open:** per-turn where enabled
  (baseline 24–30 fires/long session, ~25–55k tok/dispatch). Phase C = hand-back +
  risk-triggered; kb-pull part of the answer.
- **essense-flow slash-command adoption:** all 14 commands abandoned after week 1;
  owner-as-engine pattern. The steward loop is the fix, not an in-place patch.
- **essense-autopilot slated to retire** (Phase E, Q4); doc repositioning holds
  until Phase D/E (Q5).

## Working tree

d830d62 committed; `.steward/` model files modified by this reconcile (commit as the
chore batch). `inbox/` gitignored (raw captures local; two DELETE-ME stubs await
session deletion).

## Outside-repo (log-only context)

- `~/.claude/hooks/generalize-first.sh` fixed this session (see above) — user-space,
  not in this repo.
- Serena read-nag wrapper active (doc/data reads skip nag, code reads keep it).
- BinanceRepo key scare RESOLVED 2026-07-22 (verified never committed/pushed).
- External hygiene debt: Diploma corrupt state.yaml — fix SHIPPED here (0.26.1),
  banner confirm pending a Diploma session (tasks #7); psience missing root
  CLAUDE.md + deploy queue (parked, Q8).
