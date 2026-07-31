# State — current truth (2026-07-31 · /doctor item integrated · HEAD 8d5cab6, tree NOT clean)

> Read this before doing anything:
> - Limits-awareness: Claude drifts, loses context, finishes prematurely, defers, takes shortcuts. Re-read when uncertain. Preserve specifics.
> - Positive mindset: every gap solvable. Find the way by working carefully.
> - Quality ownership: this work matters. Take ownership.
> - Propagation requirement: every descendant artifact must carry these same four instructions.

## Ship position

**local main == origin/main == `8d5cab6` — PUSHED** (refs read this pass from
`.git/refs/heads/main` and `.git/refs/remotes/origin/main`; identical). **But the working
tree is NOT clean:** the owner-approved /doctor session (2026-07-31, per-group
AskUserQuestion approvals) restructured root CLAUDE.md **50,247 → 11,491 chars** — deep
per-plugin annotations moved VERBATIM to `plugins/<name>/CLAUDE.md` (five NEW files
verified on disk this pass: turn-end, plugin-toolkit, essense-flow, steward, statusline;
kb + verifiability-lens CLAUDE.md patched — kb now reads two-hooks/scribe-RETIRED, lens
carries the 0.5.0 no-hook entry, both grep-verified). Root is orientation-only with a
"deep notes live in `plugins/<name>/CLAUDE.md`" pointer and a NEW cross-reference row for
the pattern. **All of it UNCOMMITTED** — HEAD unchanged while the files exist, so the next
commit must carry the restructure AND this integration's `.steward/` rewrites together.
registry-check exit 0 after the restructure (reported by the doctor item, not re-run here).

## Versions on disk

No version moved this pass: **turn-end 0.3.0 · plugin-toolkit 1.10.0** · marketplace
metadata **2.47.0**, 15 rows. Unchanged: kb 0.10.1 · thorough-mode 1.11.1 ·
verifiability-lens 0.5.0 · session-lifecycle 1.3.1 · steward 0.2.1 · essense-flow 0.26.1 ·
essense-autopilot 0.4.0 · schema-scout 1.2.1 · project-note-tracker 1.8.0 · alert-sounds
1.1.1 · reuse-gate 0.1.0 · statusline 0.1.0 · mk-cc-all bundle 2.26.0.

## LIVE — distribution moved under the owner's hand (2026-07-31)

- **plugin-toolkit 1.10.0 IS NOW INSTALLED** — user scope, installed 07-31T16:49Z **@
  `8d5cab6`, current HEAD, zero lag** (read this pass from the installed-plugins registry)
  and ENABLED in user settings. A standalone install carries `lib/`, `bin/`, `defaults/`
  (capability-reach's own informational note), so **all THREE gates travel outside this
  checkout for the first time.** No gate has yet been RUN from another project — reachable
  ≠ exercised (tasks #1 done-check).
- **mk-cc-all bundle DISABLED** (`enabledPlugins: false`, read this pass from user
  settings). The picker-duplication objection to a standalone toolkit is VOIDED — but only
  while the bundle stays off; both on at once would double-list six skills again. The
  bundle's stale `ab1ba82` cache (pre-fix `ls -d plugins/*/` skill text, gitignored
  scratch inside) is now DORMANT, not fixed: it returns the day the bundle is re-enabled.
- Rest of the installed set unchanged: turn-end 0.3.0 @ `71d661f` (07-27T17:31Z) · kb
  0.10.1 @ `74da81d` · steward 0.2.1 · thorough-mode 1.11.1 · verifiability-lens 0.5.0 ·
  session-lifecycle 1.3.1 · essense-flow 0.26.1 · essense-autopilot 0.4.0 · alert-sounds
  1.1.1 · reuse-gate 0.1.0. **statusline still not installed — by design** (settings-level
  wiring, not a plugin).
- **`steward-sync` still never observed firing** — unchanged watch; this integration
  empties the inbox again, so the next staged item is the probe (tasks #3).
- **kb MCP leg still open** — unchanged; only a restart proves which build answers
  (tasks #5).

## What exists and works

- **turn-end 0.3.0** — four duties, 110 checks; proven live (escalation ladder,
  context-recall supplying real notes). **NEW MEASURED DEFECT — the hook kills its own
  judge:** `plugins/turn-end/hooks/hooks.json:12` sets `"timeout": 30` (read this pass)
  while the context-recall judge measures 46s. Transcript scan (50 sessions,
  07-27→07-31): **162 Stop fires, 36 hit the timeout** (`hook_cancelled`,
  `timedOut:true`, ~31–32s); p50 182ms, so the fast path is fine — the kill lands exactly
  on the fires where the judge runs, and the recall material is LOST on those turns. The
  config is self-contradictory, not lagging (running hook matches disk). Direct Q11
  evidence; capture `20260731-1950-turn-end-stop-timeout-kills-its-own-judge.md`.
- **plugin-toolkit 1.9.0/1.10.0 — THREE gates**, each a pure runner over a drop-in
  registry (contracts in parts.md) — and now INSTALLED (see LIVE). Standing findings
  unchanged: 613 undocumented Python checks · cross-plugin duplication is CORRECT
  (never extract) · `runner coupling` scope limit (vision inv. 7).
- kb 0.10.1, verifiability-lens 0.5.0 (no hook), steward 0.2.1, thorough-mode 1.11.1,
  essense-flow 0.26.1 — all unchanged this arc.

## Known-broken / known-gaps

- **Invariant 9 hole:** essense-autopilot still owns a blocking Stop hook and IS
  installed; `decide()` welded into `main()` (`hooks/scripts/autopilot.js:421`). Tasks #2.
- **`steward-sync` first fire** — tasks #3.
- **Q11 now has its second measured number** — the timeout kill above: the current policy
  is not "unconditional recall at 46s", it is a ~31s dead stall on ~22% of turn-ends with
  the material lost on exactly those. Owner's re-take, questions.md.
- **Absolute-path debt:** unchanged — repo-guard's allowlist entry
  (`plugins/essense-flow/test/`) is the honest ledger.
- **Counts and claims in prose — the list SHRANK this pass** (the /doctor session fixed
  instances at the source): kb + lens CLAUDE.md retired-hook drift **FIXED**
  (grep-verified both); the root-vs-kb per-file test-count disagreement **DISSOLVED**
  (root CLAUDE.md no longer states per-file counts at all). Still standing: **root README
  turn-end row lists three duties** (re-read this pass, omits `steward-sync` — #3 carries
  it) · test-all totals un-adjudicated (0130 capture 31/1663 vs docs 30/~1600) ·
  **plugin-toolkit 1.10.0 has no RELEASE-NOTES entry** · RELEASE-NOTES 1.9.0 claims
  checks.yml exists (false on disk, Q12) · bundle description drift (not re-verified;
  stakes lowered while the bundle is disabled) · 613 Python checks in no documented total.
  NEW class instance to sweep: **references that pointed at root CLAUDE.md deep content
  now point at moved text** (restructure side-effect, un-swept — folds into tasks #6).
- **Tests that lie — standing** (1.10.0 closed the skipped-as-passing instance at the tool).
- **essense-flow `tests/ledger-compaction.test.js` still red** (not re-run). Tasks #9.
- **CI: zero workflows on disk, provenance of the revert unknown** — Q12.
- **steward briefing: no WRITE-time gate** — unchanged (tasks #8).
- **kb ambient-availability unproven, instrumented** — T13 stands. Tasks #12.
- **Crowd-game:** unchanged (uncommitted kb.json there, deep re-seed pending). Tasks #4.
- **Diploma residual:** corrupt-state DEGRADED banner observable only IN Diploma.
- **Coupling/extensibility gates now REACHABLE everywhere, still RUN in zero other
  projects** — the install exists; the evidence of a run elsewhere does not. Tasks #1/#15.
- **essense-flow slash-command adoption:** unchanged (Q4/Q5 hold).

## Working tree

**NOT clean:** carries the uncommitted /doctor restructure (root CLAUDE.md + five new
per-plugin CLAUDE.md + kb/lens patches) plus this integration's `.steward/` rewrites —
one commit should land both. One INTEGRATED stub awaits session deletion (undeleted stubs
lie to the brief hook's counter AND to the steward-sync duty).

## Outside-repo (log-only context; owner-approved via /doctor, 2026-07-31)

- **mk-cc-all disabled + plugin-toolkit enabled** at user scope (the LIVE section facts).
- **blender MCP disabled for this project** · **`defaultMode=auto`** at user scope ·
  **12 stale user-scope `essense-flow-*` agent copies REMOVED** (were shadow-risk for
  bare-name dispatch) · Claude Code 2.1.220 verified current.
- Marketplace registry GitHub-sourced, `autoUpdate: true`.
- `~/.claude/kb/cued.json`, `~/.claude/steward/fleet.json` — real HOME-scope artifacts.
- External hygiene debt unchanged: Diploma corrupt `state.yaml`; psience missing root
  CLAUDE.md + deploy queue (parked, Q8); crowd-game stray lens state file to delete
  during tasks #4.
