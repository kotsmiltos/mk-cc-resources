# State — current truth (2026-08-27 · patterns 0.1.0 PUSHED + INSTALLED, menu hook live-verified · HEAD 463baa4 at pass start)

> Read this before doing anything:
> - Limits-awareness: Claude drifts, loses context, finishes prematurely, defers, takes shortcuts. Re-read when uncertain. Preserve specifics.
> - Positive mindset: every gap solvable. Find the way by working carefully.
> - Quality ownership: this work matters. Take ownership.
> - Propagation requirement: every descendant artifact must carry these same four instructions.

## Ship position

**local main @ `463baa4` = origin @ `463baa4`** (both refs read this pass). Owner "push
it" → patterns 0.1.0 PUSHED (`e8b9199`), INSTALLED (`claude plugin install patterns`
resolved 0.1.0 from the remote cache) and PARTIALLY LIVE-VERIFIED: a fresh scratch-dir
session replied with the menu's first line (the registered UserPromptSubmit hook fired
live); both installed hook scripts piped clean (965-char menu · correct
additionalContext JSON, state home-side only). Remaining #21 legs: /patterns try-out +
a gate fire in the owner's own interactive session after their next restart, then the
Q15 injection call + citation lines. `463baa4` = repo-guard ROOT-SCOPE catch-up: the
pre-push root-scoped run surfaced that repo-guard had NEVER scanned the whole repo (the
documented toolkit-cwd invocation scans only plugin-toolkit — test-all's `--root`
class) AND that this sitting's earlier "repo-guard exit 0" records were $?-after-a-pipe
MISMEASURES; 8 pre-existing findings + 2 in the patterns suite → 5 dated allowlist
entries, **plugin-toolkit 1.10.1** (version read this pass), root CLAUDE.md now
mandates root cwd + direct exit read. Gates at push: repo-guard 0 (root, direct) ·
registry-check 0 · test-all `--root` 34/34 suites / 1795 · patterns suite 37/37 (post
lens fixes). Tree CLEAN at pass snapshot. Phase 1 dogfood week still running (day 1
legs a/c/d PASS; leg b outstanding).

## Versions on disk

Moved this arc (read this pass): **patterns 0.1.0 (NEW)** · **marketplace metadata
2.47.1** · **mk-cc-all bundle 2.26.1** (description-drift fix; patterns is NOT bundled —
hook-carrying, standalone by the load-bearing skills-only contract) · **plugin-toolkit
1.10.1** (`463baa4` root-scope catch-up; plugin.json read this pass). From the 08-23
arc, unchanged: steward 0.5.0 · kb 0.11.0 · statusline 0.2.0 · turn-end 0.6.0.
Unchanged, not re-read (no item touched them): thorough-mode 1.11.1 ·
verifiability-lens 0.5.0 · session-lifecycle 1.3.1 · essense-flow 0.26.1 ·
essense-autopilot 0.4.0 · schema-scout 1.2.1 · project-note-tracker 1.8.0 ·
alert-sounds 1.1.1 · reuse-gate 0.1.0.

## LIVE — the status spine (dogfood week RUNNING, tasks #1)

Pilot seeded: `status.json` holds 29 backfilled items, both view cursors at
`20260823-1520`. Live smoke at build: brief hook FRESH verdict + `[instr] git: main @
e6760ad` + calm statusline ⚓; post-install proof THIS session: the `[instr]` line fired in
the real injection. Gates at push: `test-all --root` **33/33 suites / 1758 checks** ·
registry-check exit 0 · repo-guard exit 0 (July revert-chains informational) · leak grep
clean. Earlier same-day live proofs stand: freshness ⚠ · `steward-sync` first fire ·
self-check block · request-closure fire. **Day 1 (08-23 first post-install open): legs
a/c/d PASS, zero instrument lies** — staleness FRESH verdict honest vs disk · ledger 29
ids match `done/` 1:1, derived new = 0 · statusline calm ⚓ matches. Leg (b) fallback
fires still needs a live turn-end trace during the week.

## Audit verdicts (measured 2026-08-23 — four projects, three Explore agents + local read)

- **steward: SUCCESS in all four** — recompute mechanically proven (twin git numstat model
  churn vs log +N/−0; crowd T25/T27 deleted; aithseis grep-verified deletions + a
  self-caught false check retracted in the permanent log).
- **kb: entry quality uniformly high; deliberate pull rare** (auto:manual — twin 89:15,
  aithseis 76:5, crowd 122:0). Push→pull funnel WORKS: reads-following-hints 3/3, 5/6,
  3/3, 0/0 (T4); the gap is self-INITIATED querying → a Phase 3 stats metric.
- **turn-end: live-proven post-fix** (twin, entire post-08-10 life: 83 records, 25 real
  blocks, 0 errors). Crowd has ZERO post-fix data (dormant since 08-02) — a no-data
  result, not a failure; rides the crowd tasks.

## Known-broken / known-gaps

- **Generativity under-delivery — owner-observed (2026-08-26 HFDP wish, authoritative):**
  *"we build code too specific for anything I ask."* Coverage map, verified against disk
  this pass: pipeline carries the rung-2 protocol + criteria 8/9 + the elicit
  Declared-growth-axes SPEC section (essense-flow 0.26.0 — the capture's original "gap A
  never executed" claim was REFUTED by RELEASE-NOTES + the lens amendment; the model never
  absorbed it); plugin-toolkit carries the `runner extensibility` engine. The gap map
  MOVED 2026-08-27: (1) NAMED trigger→shape vocabulary at the design moment — **LIVE**
  as patterns 0.1.0 (ambient home per owner steer; catalog 41 entries; pushed +
  installed, menu hook fired in a real session; interactive legs remain → #21); (3) ambient MECHANISM — **half closed**: the menu + the
  pre-write gate ARE hooks now, not rule text; the MEASUREMENT half (coupling/
  extensibility checks on source-writing turns) stays #15. Still genuinely absent:
  (2) the extensibility CONSUMERS — /glossary EXTENSIBILITY.yaml, review `extensibility`
  lens, verify compliance items, C correction sweeps — pure wiring on an engine that
  already accepts declared axes (→ Q14; owner words 2026-08-26 lean surviving-path).
- **Briefing staleness — THE systemic class:** root fix SHIPPED (Phase 1 instruments +
  cursors — volatile claims computed at read, never authored). Fixed-by-construction is
  the CLAIM; the dogfood week (#1) is what measures it — accuracy is not assumed.
- **Steward verify-scope hole:** contract line SHIPPED in `agents/steward.md` 0.5.0
  (every claim rewritten into briefing/state counts as "written", one read each). Dogfood
  watches for any false integrated/install claim.
- **Stub litter / can't-delete: RETIRED on this ship** — status.json owns lifecycle, files
  never move, "new" is derived. The three fleet ships are still pre-contract (old ritual
  + litter stand there) until Phase 2 backfill (#12); the T3 CONSUMED marker is moot on
  contract ships.
- **kb MCP version-proof leg still open:** post-restart `kb_overview` should now report
  `version: 0.11.0` + a post-restart trace line (tasks #4).
- **Recall judge fragility (three live ETIMEDOUTs measured):** fail-open ranker fallback
  SHIPPED (turn-end 0.6.0, engine NAMED in trace). Dogfood counts fallback fires from the
  trace `engine` field — fire count + recall quality, not latency.
- **Gate-record correction (measured):** `test-all` without `--root` sweeps ONLY
  plugin-toolkit — historical "764 green" records were toolkit-scoped; root CLAUDE.md
  mandates `--root`. Current repo-wide truth: 33 suites / 1758 checks (push gate run).
  One transient essense-flow red on a first parallel sweep, not reproduced (→ #9 datum).
- Format drift: frontmatter missing on 1/4 twin + 1/8 aithseis captures; aithseis digest
  17KB against its own pointer-file rule → blueprint Phase 4 guards.
- **turn-end `session-digest` duty is not plan-mode-aware (measured 2026-08-27, → #22):**
  during the patterns plan-mode pass it demanded a digest write that plan mode's lock
  forbids — 8+ wasted nudge cycles in one request span (background wakes re-arm it). A
  satisfaction check demanding the impossible is a wrong check (invariant 9's backstop
  case). DEMAND duties that write nothing stayed satisfiable.
- **Double design-moment injection (→ Q15):** once patterns installs, its menu hook fires
  on the same prompts as the user-global generalize-first hook (~420 tokens combined per
  fire, per the plugin notes) — slim/retire vs keep is the owner's post-live call.
- Standing, unchanged: invariant-9 hole (autopilot, #3) · Q12 CI revert · Q13 sonnet ·
  absolute-path debt (#7) · counts-in-prose sweep (#6) · ledger-compaction UNCERTAIN
  (#9) · briefing WRITE-time gate (#8 — did NOT land with Phase 1's brief-hook rebuild) ·
  crowd deep-seed + config (#5) · Diploma banner (#10).

## Working tree

CLEAN at pass snapshot — the entire patterns build plus the 08-27 steward writes are
committed AND pushed through `463baa4` (owner "push it", recorded in the log's push
entry, which the session appended MID-PASS — this recompute reconciled against it). No
stub litter; the contract keeps integrated inbox files in place — all 4 queued files
verified present with their ledger ids this pass, derived-new = 0.

## Outside-repo (log-only context)

Plugin-state git policy diverges per ship (twin commits kb+steward as first-class source;
crowd partial; aithseis commits NOTHING — 29 days, 1,644 model lines untracked against its
own open task). Owner call per project; Phase 2 backfill is where it surfaces. Aithseis
model frozen 12 days with 10 pending inbox items. Marketplace registry GitHub-sourced with
`autoUpdate: true` — now MEASURED, not just configured (2026-08-27: `claude plugin
marketplace list` shows the remote as source; the contrary July kb capture corrected on
disk at `20260827-1520` in kb captures).
