# State — current truth (2026-08-03 · four items integrated, all pre-executed · local 83cea6e AHEAD of origin f796962)

> Read this before doing anything:
> - Limits-awareness: Claude drifts, loses context, finishes prematurely, defers, takes shortcuts. Re-read when uncertain. Preserve specifics.
> - Positive mindset: every gap solvable. Find the way by working carefully.
> - Quality ownership: this work matters. Take ownership.
> - Propagation requirement: every descendant artifact must carry these same four instructions.

## Ship position

**local main `83cea6e` is AHEAD of origin/main `f796962`** (both refs read this pass).
The 08-02 sitting shipped and PUSHED `dfe1686` (turn-end 0.4.0), `b79fc1c` (steward
0.3.0) and `f796962`; the 0.4.1 + 0.3.1 work is COMMITTED locally, not pushed — versions
on disk read 0.4.1/0.3.1 while the tracked tree is clean except `.steward/`, so the local
commit carries them. **Push awaits the owner's word.** The marketplace installs from
GitHub, so no install anywhere sees 0.4.1/0.3.1 until the push (tasks #1).

## Versions on disk

Moved this arc: **turn-end 0.4.1 · steward 0.3.1** (both plugin.json read this pass).
Unchanged, not re-read (no item touched them): kb 0.10.2 · plugin-toolkit 1.10.0 ·
thorough-mode 1.11.1 · verifiability-lens 0.5.0 · session-lifecycle 1.3.1 · essense-flow
0.26.1 · essense-autopilot 0.4.0 · schema-scout 1.2.1 · project-note-tracker 1.8.0 ·
alert-sounds 1.1.1 · reuse-gate 0.1.0 · statusline 0.1.0 · mk-cc-all bundle 2.26.0.

## SHIPPED this arc (2026-08-02/03) — all four inbox items arrived already executed

- **turn-end 0.4.0 — `self-check`**, the no-arbitrary-DONE duty (vision invariant 10;
  first default-ON `severity:block`). Owner pass 2 amended it pre-release: evidence =
  OBSERVED + COMPARED vs the ask + probed to BREAK (`ran-and-looked`, result-tense named
  checks). Lens verify pass fixed two build defects pre-release (block-feedback boundary
  erasure; planning-prose hole). Zero tokens, no judge.
- **turn-end 0.4.1 — state anchored to project root** (`resolveProjectRoot`: nearest
  `.git` ancestor, never HOME or above). Kills the measured cwd-follow defect: stray
  `plugins/*/.claude/` trees + split ledger buckets (quality-lens re-asked from one).
  Tests **131/131** (was 110 at 0.3.1). Also trims the steward-sync ask.
- **steward 0.3.0 — the loop budgeted** (owner: "fires too often and for too long"; the
  measured 12.5-min/137k-token pass is the substrate): ONE background pass per sitting +
  the agent Economy section. Tests 27/27.
- **steward 0.3.1 — the injection diet** (owner: "unbearable, make it lighter"):
  standing session-open text halved — protocol 4 lines, briefing spec ≤6 / cap 900
  (constants read this pass: 8/900 with slack), one-line inbox note, diff ≤10.

## LIVE — installed set

- The 08-03 `/reload-plugins` picked up **steward 0.3.0 + turn-end 0.4.0** (per the 2142
  capture). **0.3.1 / 0.4.1 are installed NOWHERE until push + update + restart** — the
  diet and the cwd fix are on disk only.
- **`steward-sync` still never observed firing** — but it now has its first credible
  root-cause candidate: the 0.4.1 cwd-follow defect (a subdir-cwd fire read the wrong
  `.steward/`). Clean probe rides #1's restart (tasks #4).
- **kb MCP leg still open** — restart proves which build answers; expect `version:
  0.10.2` (tasks #6). plugin-toolkit install still LAGS (1.10.0 @ `8d5cab6`, 07-31 read,
  not re-read). mk-cc-all bundle still DISABLED (07-31 read).

## Known-broken / known-gaps

- **Self-check + 0.4.1 + diet unproven LIVE** — the batch's one fresh task (#1: push
  [owner word] → update → restart → full-ladder fire + litter check + diet check).
- **Invariant 9 hole:** essense-autopilot still owns a blocking Stop hook, installed;
  `decide()` welded into `main()`. Tasks #3.
- **Q11 unchanged** (policy re-take, owner's) · **Q12 unchanged** (CI revert) · **Q13
  NEW:** steward integrates on sonnet — recommended default: try it.
- **Absolute-path debt:** unchanged — repo-guard's allowlist entry is the ledger (#8).
- **Counts and claims in prose — NEW instance:** steward's plugin CLAUDE.md says tests
  "25 checks"; the measured run is 27 (log 2026-08-02). Folds into #7's sweep alongside
  the standing instances (plugin-toolkit 1.10.0 RELEASE-NOTES entry missing · 1.9.0
  checks.yml claim (Q12) · bundle description drift · 613 Python checks undocumented ·
  moved-content references · marketplace metadata non-bump · test-all totals
  adjudication).
- **ledger-compaction status UNCERTAIN** (31/31 green vs believed-red) — tasks #10.
- **steward briefing: no WRITE-time gate** — unchanged; budget now 8/900 (tasks #9).
- **kb ambient-availability unproven, instrumented** — T13 stands (tasks #13).
- **Crowd-game** deep re-seed + config commit pending (#5) · **Diploma** banner check
  (#11) · **gates still RUN in zero other projects** (#2/#16) · essense-flow
  slash-command adoption unchanged (Q4/Q5).

## Working tree

Clean except `.steward/` — this recompute, the session's log append, and four INTEGRATED
inbox stubs awaiting session deletion (undeleted stubs lie to the brief hook's counter
AND to the steward-sync duty).

## Outside-repo (log-only context)

Unchanged from the 08-01 pass, not re-read: marketplace registry GitHub-sourced with
`autoUpdate: true` · `~/.claude/kb/cued.json`, `~/.claude/steward/fleet.json` real ·
external hygiene debt (Diploma corrupt state.yaml; psience parked Q8; crowd-game stray
lens state file → #5).
