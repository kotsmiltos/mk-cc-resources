# State — current truth (2026-08-23 · Phase 1 status spine SHIPPED + LIVE · origin == local e6528e0)

> Read this before doing anything:
> - Limits-awareness: Claude drifts, loses context, finishes prematurely, defers, takes shortcuts. Re-read when uncertain. Preserve specifics.
> - Positive mindset: every gap solvable. Find the way by working carefully.
> - Quality ownership: this work matters. Take ownership.
> - Propagation requirement: every descendant artifact must carry these same four instructions.

## Ship position

**local main == origin/main == `e6528e0`** (session-start snapshot, clean tree). The 08-23
sitting shipped TWICE on owner "@ship it": **strike 1** (steward 0.4.0 + kb 0.10.3 —
`4ef7a37`/`2891859`/`e6760ad`), then **Phase 1 of blueprint §6b in full** — `303c00c`
(38 files, +1662/−418: four plugin bumps, contract page `design/status-contract.md`,
seeded pilot `status.json`, sync-pass model recompute) + `e6528e0` (log). **Installs
updated 18:36 + restart, VERIFIED live:** the `[instr]` computed line fired in the real
briefing injection this session.

## Versions on disk

Moved this arc (all four plugin.json read this pass): **steward 0.5.0** · **kb 0.11.0** ·
**statusline 0.2.0** · **turn-end 0.6.0**. Unchanged, not re-read (no item touched them):
plugin-toolkit 1.10.0 · thorough-mode 1.11.1 · verifiability-lens 0.5.0 · session-lifecycle
1.3.1 · essense-flow 0.26.1 · essense-autopilot 0.4.0 · schema-scout 1.2.1 ·
project-note-tracker 1.8.0 · alert-sounds 1.1.1 · reuse-gate 0.1.0 · mk-cc-all bundle 2.26.0.

## LIVE — the status spine (dogfood week RUNNING, tasks #1)

Pilot seeded: `status.json` holds 29 backfilled items, both view cursors at
`20260823-1520`. Live smoke at build: brief hook FRESH verdict + `[instr] git: main @
e6760ad` + calm statusline ⚓; post-install proof THIS session: the `[instr]` line fired in
the real injection. Gates at push: `test-all --root` **33/33 suites / 1758 checks** ·
registry-check exit 0 · repo-guard exit 0 (July revert-chains informational) · leak grep
clean. Earlier same-day live proofs stand: freshness ⚠ · `steward-sync` first fire ·
self-check block · request-closure fire.

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
- Standing, unchanged: invariant-9 hole (autopilot, #3) · Q12 CI revert · Q13 sonnet ·
  absolute-path debt (#7) · counts-in-prose sweep (#6) · ledger-compaction UNCERTAIN
  (#9) · briefing WRITE-time gate (#8 — did NOT land with Phase 1's brief-hook rebuild) ·
  crowd deep-seed + config (#5) · Diploma banner (#10).

## Working tree

Clean at pass start except `.steward/` — this recompute. The sync pass's integrated
stubs were deleted before the Phase 1 commit; no stub litter remains on this ship.

## Outside-repo (log-only context)

Plugin-state git policy diverges per ship (twin commits kb+steward as first-class source;
crowd partial; aithseis commits NOTHING — 29 days, 1,644 model lines untracked against its
own open task). Owner call per project; Phase 2 backfill is where it surfaces. Aithseis
model frozen 12 days with 10 pending inbox items. Marketplace registry GitHub-sourced with
`autoUpdate: true` — unchanged, not re-read.
