# State — current truth (2026-08-01 · self-check directive + digest-bug items integrated · HEAD 1c978fd, pushed, tree clean)

> Read this before doing anything:
> - Limits-awareness: Claude drifts, loses context, finishes prematurely, defers, takes shortcuts. Re-read when uncertain. Preserve specifics.
> - Positive mindset: every gap solvable. Find the way by working carefully.
> - Quality ownership: this work matters. Take ownership.
> - Propagation requirement: every descendant artifact must carry these same four instructions.

## Ship position

**local main == origin/main == `1c978fd` — PUSHED** (refs read this pass from
`.git/refs/heads/main` and `.git/refs/remotes/origin/main`; identical). Three commits
landed 2026-07-31 evening since the last recompute: `5fb74b7` (the /doctor docs
restructure — COMMITTED, closing the last pass's uncommitted-restructure concern),
`1946341` (turn-end 0.3.1) and `1c978fd` (kb 0.10.2). The tree is clean except this
integration's `.steward/` recompute + two INTEGRATED inbox stubs awaiting session
deletion.

## Versions on disk

Moved this arc: **turn-end 0.3.1 · kb 0.10.2** (plugin.json + marketplace rows read this
pass, matching). Marketplace metadata stayed **2.47.0**, 15 rows, while those two rows
moved — historically the metadata bumped per ship; not a machine-checked claim
(Claude-observed, low stakes). Unchanged: plugin-toolkit 1.10.0 · thorough-mode 1.11.1 ·
verifiability-lens 0.5.0 · session-lifecycle 1.3.1 · steward 0.2.1 · essense-flow 0.26.1 ·
essense-autopilot 0.4.0 · schema-scout 1.2.1 · project-note-tracker 1.8.0 · alert-sounds
1.1.1 · reuse-gate 0.1.0 · statusline 0.1.0 · mk-cc-all bundle 2.26.0.

## IN FLIGHT — the owner's self-check directive (2026-08-01, executing today)

Owner, verbatim: work must be self-checked BEFORE Claude reports done (*"just arbitrarily
calling 'DONE' — can we make sure this has happened before finishing and me having to
ask?"*). Now vision invariant 10. Execution this session: a default-ON `self-check`
DEMAND duty in turn-end — deterministic evidence detectors (a check actually RUN, or the
check + result NAMED, in the work's own medium), NO judge; quality-lens stays the opt-in
deep tier. **Not on disk yet** (`lib/duties/` globbed this pass: four duties, no
self-check). Tasks #1.

## LIVE — installed set (installed-plugins registry read this pass)

- **turn-end 0.3.1 + kb 0.10.2 installed @ `1c978fd`** (user scope, updated 07-31T18:27Z)
  — both measured-defect fixes travel. Hooks load at session start: a sitting launched
  before the update still runs the old code until restart.
- **plugin-toolkit install now LAGS: 1.10.0 @ `8d5cab6`** (07-31T16:49Z — before the last
  three commits; its cache lacks its own per-plugin CLAUDE.md). The previous zero-lag
  claim is deleted. No gate has yet been RUN from another project (tasks #2).
- **mk-cc-all bundle DISABLED** (07-31 read, not re-read) — the picker-duplication
  objection stays voided only while it stays off; the stale `ab1ba82` cache stays
  dormant, not fixed.
- Rest unchanged: steward 0.2.1 · thorough-mode 1.11.1 · verifiability-lens 0.5.0 ·
  session-lifecycle 1.3.1 · essense-flow 0.26.1 · essense-autopilot 0.4.0 · alert-sounds
  1.1.1 · reuse-gate 0.1.0 · statusline not installed (by design).
- **`steward-sync` still never observed firing** — this integration empties the inbox
  again; the next staged item is the probe (tasks #4).
- **kb MCP leg still open** — only a restart proves which build answers; expect
  `version: 0.10.2` now (tasks #6).

## What exists and works

- **turn-end 0.3.1** — the timeout defect is FIXED: `hooks.json` now `"timeout": 90`
  (read this pass), restoring the invariant **the hook budget must exceed the judge
  budget** (the judge carries its own 60s execFile timeout + a NAMED degradation, and
  that budget can only govern if the platform doesn't kill the runner first). Fix-notes
  scan: 39/52 in-window fires died at 30s across 4 projects, crowd-game 0 completions.
  Measured pass after: real fire, judge ran, 40.6s, exit 0. Tests 110/110.
- **kb 0.10.2** — the mid-sitting digest theft is FIXED, BOTH defects of the 2030 inbox
  item (shipped the same evening the item was written; verified in source +
  RELEASE-NOTES this pass): (1) the sitting marker records on EVERY fire (gate =
  `.claude/kb/` presence — self-repairs, tested); (2) spawned sessions stand down — a
  digest touched <45 min is the live sitting's heartbeat and never rotates (window is
  Claude's default, not owner-set), and a child carrying `MK_TURN_END_DEPTH` does
  nothing. kb-session suite 62 → 78, incl. e2e replays of the measured triple loss +
  negative control. **NEW cross-plugin env contract:** kb reads `MK_TURN_END_DEPTH`,
  which turn-end publishes — the capture flagged this as an owner call; it shipped in the
  /doctor sitting (approval not separately recorded; parts.md carries the contract).
- **Gates run 2026-07-31 (session-reported, not re-run):** repo-guard 0 · registry-check
  0 · test-all **31/31 (1681)**. TENSION: 31/31 green while ledger-compaction is believed
  red — either the drift got fixed or test-all's discovery misses essense-flow's `tests/`
  dir. Adjudicate at the next run (tasks #10).
- **plugin-toolkit THREE gates** — unchanged; standing findings hold (613 undocumented
  Python checks · cross-plugin duplication CORRECT, never extract · `runner coupling`
  scope limit, vision inv. 7).

## Known-broken / known-gaps

- **Self-check duty in flight, not landed** — tasks #1 (section above).
- **Invariant 9 hole:** essense-autopilot still owns a blocking Stop hook and IS
  installed; `decide()` welded into `main()` (`hooks/scripts/autopilot.js:421`). Tasks #3.
- **`steward-sync` first fire** — tasks #4.
- **Q11 is now ONLY the policy re-take:** the config contradiction is FIXED (0.3.1
  executed the previously-recommended default, with a measured pass). Remaining:
  every-turn 46s judge vs cheaper / rarer / overlapped / visibly-gated — the owner's
  call, no task until answered.
- **Absolute-path debt:** unchanged — repo-guard's allowlist entry
  (`plugins/essense-flow/test/`) is the honest ledger.
- **Counts and claims in prose:** CLOSED this pass — **root README turn-end row now names
  all four duties @ 0.3.1** (read this pass; was the last standing README drift). Still
  standing: test-all totals adjudication, now with THREE numbers (docs 30/~1600 · 0130
  capture 31/1663 · 07-31 run 31/1681 — run it and let the output be the number) ·
  **plugin-toolkit 1.10.0 still has no RELEASE-NOTES entry** (re-verified this pass) ·
  RELEASE-NOTES 1.9.0 claims checks.yml exists (re-read this pass, false on disk, Q12) ·
  bundle description drift (dormant while the bundle is off) · 613 Python checks in no
  documented total · moved-content references sweep (restructure side-effect, tasks #7) ·
  the marketplace-metadata non-bump (light, above).
- **essense-flow `tests/ledger-compaction.test.js` status now UNCERTAIN** (the gates
  tension above). Tasks #10.
- **CI: zero workflows on disk, provenance of the revert unknown** — Q12.
- **steward briefing: no WRITE-time gate** — unchanged (tasks #9).
- **kb ambient-availability unproven, instrumented** — T13 stands. Tasks #13.
- **Crowd-game:** the 0.3.1/0.10.2 fixes reach it at its next session start (user-scope
  installs); its "0 turn-end completions" datum was the 30s timeout, now fixed. Deep
  re-seed + config commit still pending (tasks #5).
- **Diploma residual:** corrupt-state DEGRADED banner observable only IN Diploma (#11).
- **Gates reachable everywhere, still RUN in zero other projects** — tasks #2/#16.
- **essense-flow slash-command adoption:** unchanged (Q4/Q5 hold).

## Working tree

Clean except `.steward/` — this recompute plus the session's log append — and two
INTEGRATED inbox stubs awaiting session deletion (undeleted stubs lie to the brief hook's
counter AND to the steward-sync duty).

## Outside-repo (log-only context)

- Installed set as in LIVE above (registry read this pass). From the 07-31 /doctor
  approvals, not re-read: mk-cc-all disabled · blender MCP off for this project ·
  `defaultMode=auto` · 12 stale user-scope essense-flow agent copies removed · CC 2.1.220.
- Marketplace registry GitHub-sourced, `autoUpdate: true`.
- `~/.claude/kb/cued.json`, `~/.claude/steward/fleet.json` — real HOME-scope artifacts.
- External hygiene debt unchanged: Diploma corrupt `state.yaml`; psience missing root
  CLAUDE.md + deploy queue (parked, Q8); crowd-game stray lens state file to delete
  during tasks #5.
