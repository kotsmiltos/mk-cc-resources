# Tasks — ordered, executor-ready (recomputed 2026-08-27 · patterns landing reconciled · numbers are stable ids, file order is the order)

> Read this before doing anything:
> - Limits-awareness: Claude drifts, loses context, finishes prematurely, defers, takes shortcuts. Re-read when uncertain. Preserve specifics.
> - Positive mindset: every gap solvable. Find the way by working carefully.
> - Quality ownership: this work matters. Take ownership.
> - Propagation requirement: every descendant artifact must carry these same four instructions.

**Ordering rationale.** The Phase 1 status-spine pilot (old #1) is BUILT, PUSHED
(`303c00c`) and INSTALLED-verified — its slot is now the dogfood week its own done-check
demanded: the build is done, the TRUTH of the instruments is not yet measured. #1 gates
Phase 2 (#12); Phase 3 (#13) follows; the v3 phases resume AFTER them on the honest
substrate. Blueprint Phase 4 stays a parking lot (evidence-gated), not a task.
**2026-08-27 recompute:** #20 is CLOSED as BUILT — the owner's 08-26 steer superseded its
essense-flow placement BEFORE build, and the sitting shipped it as the standalone ambient
`patterns` plugin 0.1.0 (log 2026-08-27 holds the record). Its live leg becomes NEW #21,
slotted second because it is blocked only on the owner's Q15 push call and everything
after it is minutes. NEW #22 (turn-end plan-mode defect, measured this sitting) slots
third — small, executor-ready, and it burns nudge cycles in every plan-mode span until
fixed. Numbering 1–22: numbers are stable ids, never reused.

**Hygiene rule for this file:** `.steward/` model files are COMMITTED to a PUBLIC repo
(only `inbox/` is gitignored). Never write an absolute path, username or machine-specific
detail here — name projects, not drives.

## 1. Dogfood week — measure the live status spine (gates Phase 2, #12)

- **Why #1:** Phase 1 is BUILT, PUSHED (`303c00c`) and INSTALLED — verified live (the
  `[instr]` line fired in a real briefing injection). Its done-check was never the build:
  it was one week of real sittings proving the spine tells the TRUTH. The suites-green
  and backfill-idempotence legs already passed at ship (test-all `--root` 33/33 / 1758;
  absent-only seeder); the accuracy legs need live days, not work.
- **What (collect during normal sittings — a watch, not a build):** (a) **staleness
  accuracy** — the brief hook's FRESH/⚠ + cursor verdict vs reality at each open;
  (b) **fallback fire count** — turn-end trace `engine` field: how often the ranker
  answered for a dead judge, and whether the recalled material held up; (c) **ledger
  truth** — no false integrated/install claims; "new" derivation correct (a fresh inbox
  drop counts, an integrated id stops counting); (d) **statusline correctness** — ⚓N✱ ▲M
  matches status.json at a glance. Any failed leg becomes an inbox item, not a hotfix.
- **Done-check:** a week of sittings with each leg observed at least once and zero
  unexplained instrument lies (or every lie filed + root-caused); then #12 unblocks.
- **Progress:** day 1 (08-23 first post-install open) — legs a/c/d observed PASS, zero
  lies; leg (b) fallback fires outstanding, needs a live turn-end trace.

## 21. Patterns 0.1.0 go-live — commit + push [needs owner, Q15], then prove it live

- **Why:** built ≠ shipped — the marketplace install source is the GitHub remote
  (measured 2026-08-27), the tree past `902eb2b` is uncommitted, and vision says
  reachability is part of "shipped." Gates were green at build (suite 35/35 · test-all
  `--root` 34/34 / 1793 · registry-check 0 · repo-guard 0); what remains is owner word
  plus minutes of proof.
- **What:** (1) owner Q15 call → commit + push (re-run test-all `--root` +
  registry-check at push per house rule); (2) install patterns + restart; live smoke:
  one design-shaped prompt shows the tier-1 menu, the first source write of a session
  gets ONE gate line, state file appears home-side not in-repo; (3) execute Q15's
  injection answer (slim the global generalize-first hook, or keep both — only AFTER
  the live fire); (4) small follow-through: essense-flow `generativity-protocol.md` +
  `code-conventions.md` gain a one-line citation of the patterns catalog (pipeline
  points at ambient — the documented drop-in; no ownership move).
- **Done-check:** a fresh install resolves patterns 0.1.0 from the remote; both hooks
  observed firing live once each; Q15's injection decision recorded in log.md with its
  reason; citation lines present or explicitly declined.

## 22. turn-end — make write-demanding duties plan-mode-aware (measured defect 2026-08-27)

- **Why:** measured this sitting — the `session-digest` duty demanded a digest write
  while plan mode's lock permits only the plan file; 8+ wasted nudge cycles in one
  request span (background wakes re-arm it). A satisfaction check that demands the
  impossible is a WRONG check; invariant 9 says the fire budget is only the backstop
  for exactly this case.
- **What:** substrate-verify FIRST — read where permission mode actually rides in the
  Stop-hook payload/context before coding anything. Then, generic for ANY duty whose
  satisfaction needs a project-file write (never a session-digest special case): either
  defer silently while the mode holds (queue until it exits, session span), or accept
  the plan file as that span's digest surface. Non-writing DEMAND duties
  (request-closure) stayed satisfiable — leave untouched. Owner ratifies the direction
  (defer vs plan-file-counts) — it changes what a plan-mode sitting leaves behind.
- **Done-check:** a replay test of the measured 8-cycle plan-mode span yields zero
  wasted nudges (or one, satisfied by the plan file); turn-end suite green; the trace
  shows the deferral/satisfaction NAMED, never silent.

## 2. Ratify the distribution layout the /doctor session set — or change it [needs owner]

- **Why:** on 2026-07-31 the owner approved: mk-cc-all bundle DISABLED + plugin-toolkit
  standalone INSTALLED (user scope). That is a STATE change, not a decision close: the
  picker-duplication objection is voided only while the bundle stays off; the stale
  `ab1ba82` bundle cache is DORMANT and returns the day it is re-enabled; what a PUBLIC
  marketplace user should install (README/marketplace prose still centers the bundle) was
  not decided. The toolkit install LAGGED HEAD when last read (08-01).
- **What:** (1) decide with the owner: keep bundle-off + per-plugin standalone as THE
  layout (then reposition README/marketplace prose), OR restore a slimmed bundle (drop
  the six toolkit skills so both coexist), OR revisit the parked
  executables-inside-a-declared-surface move; (2) prove the reach: run ONE gate
  (repo-guard or test-all `--root`) from a DIFFERENT project via the installed toolkit —
  update the install first; (3) if the bundle ever returns: bump its version first so the
  `ab1ba82` cache updates, then read the CACHED skill text; (4) the repo-guard detector
  for instruction-names-unreachable-path remains a candidate (Claude's proposal,
  unrequested).
- **Done-check:** (1) decision recorded in log.md with its reason; (2) one gate run
  recorded from a different project (command + exit code); (3) README + marketplace
  prose match the chosen layout.

## 3. Extract autopilot's `decide()` so it can become a duty (closes invariant 9)

- **What:** essense-autopilot still owns a blocking `Stop` hook and IS installed
  (user-scope). Its decision logic is welded into `main()` — only `countInFlightAgents`
  is exported (`plugins/essense-autopilot/hooks/scripts/autopilot.js:421`). Extract a
  PURE `decide(state) -> {advance|halt, reason}` in that plugin, then register a turn-end
  duty that consumes it. Owner direction: "autopilot should become a duty." Do NOT
  re-implement a thinner "what's next" inside turn-end — that creates a competing source
  of truth.
- **Done-check:** `decide()` exported and unit-tested against the existing halt cases;
  the turn-end duty returns the same verdict for the same state; autopilot's `hooks.json`
  no longer registers a Stop hook; a pipeline project shows ONE tail with both items.

## 4. Prove which kb MCP build is answering (restart happened — collect the evidence)

- **What:** no server-side `kb_query`/`kb_read` trace line has ever been confirmed
  post-restart. Today's plugin update + restart means the answer is now collectable:
  a stdio server keeps the code it was launched with, so `kb_overview` should report
  the freshly-installed build.
- **Done-check:** one `kb_overview` call reports `version: 0.11.0` (the 18:36 install +
  restart supersedes the earlier 0.10.3 expectation) AND a `kb_query`/`kb_read` line with
  a post-restart timestamp appears in the trace. Both, or the leg is not closed.

## 5. Crowd-game: commit its config, run the DEEP seed, and collect the post-fix turn-end data

- **What:** crowd-game is DORMANT since 08-02 — it has ZERO post-fix turn-end data (the
  "did the judge start completing there" watch is unprovable until it wakes). Next
  crowd-game session: (a) commit the written-but-uncommitted `.claude/kb.json`; port its
  `scribe.focus` (names a RETIRED hook) to `.claude/turn-end.json`
  `duties.session-digest.important` if it should still apply; (b) the user-scope installs
  now carry the timeout + digest-theft + root-anchor fixes — watch the first real fires;
  (c) re-run `/kb-seed` under the depth mandate, running `kb coverage` FIRST — the first
  real test that re-seed is incremental BY MECHANISM; (d) copy the `game-project.yaml`
  lens preset into `.claude/verifiability-lens/profile.yaml`; (e) delete the stray
  `.claude/prompts/.claude/verifiability-lens/state.json`.
- **Also record while there:** every hand-driven query that MISSES, classified —
  splitter / vocabulary / ranking / genuinely-absent (feeds #11).
- **Done-check:** config committed there; `kb coverage` shows previously-uncovered
  substrate now cited; a turn-end trace line with a completed judge verdict; a
  hand-driven query finds a fact only the deep sweep could reach; the miss list exists
  in writing, even if it reads "none found".

## 6. Make documented counts and claims derivable, not remembered

- **What:** registry-check covers versions/listings/paths — extend the same pattern to
  what it does not cover: test counts and hook-registration prose. NOTE: Phase 1's
  `[instr]` lines subsume the VOLATILE half of this class (installs, git position,
  counts computed at read); this sweep keeps the STATIC prose half. Open instances, each
  read from the file that claims it: test-all totals (re-run
  `node plugins/plugin-toolkit/bin/test-all.js --root <repo>` and let ITS output be the
  number — today's truth is 33 suites / 1758 checks; historical "764" records were
  toolkit-scoped) · plugin-toolkit 1.10.0 RELEASE-NOTES entry (last verified missing
  08-01) · RELEASE-NOTES 1.9.0 checks.yml claim (wording per Q12's answer) · bundle
  description drift · 613 Python glossary-engine checks in no documented total ·
  moved-content references from the 07-31 restructure · marketplace metadata non-bump
  convention (decide, then bump-or-drop) · steward CLAUDE.md test-count line (re-derive
  against the current 0.5.0 suite before touching). Prefer printing the command over the
  number wherever the number earns nothing.
- **Done-check:** a check (registry-check claim source or peer) fails on today's
  instances and passes after correction; one command re-verifies every documented count
  and hook claim.

## 7. Retire the leaked-path allowlist entry (the absolute-path debt, expressed as a gate)

- **What:** `plugins/essense-flow/test/` is the one entry in repo-guard's `leaked-path`
  allowlist, self-described as *"Known debt, NOT exempt by design"*. Those files carry
  real home-directory literals as load-bearing fixture roots — a blanket replace broke 4
  suites and was reverted, so per-file: read what each literal is FOR, replace with a
  tmpdir/`__dirname`-derived path, run that suite, move on. Do NOT re-introduce a count —
  the allowlist entry IS the done-check.
- **Done-check:** the entry deleted AND `node plugins/plugin-toolkit/bin/repo-guard.js`
  still exits 0 AND `node plugins/essense-flow/test/run-all.cjs` reports zero failures.

## 8. Enforce the briefing budget at WRITE time (small standalone; Phase 1 did NOT land it)

- **What:** injection side fixed (steward 0.2.1); nothing checks that a real
  `briefing.md` is inside budget at write time — the agent's contract text is the only
  guard, the "rule, not mechanism" shape invariant 3 rejects. The Phase 1 brief-hook
  rebuild shipped WITHOUT this check, so it no longer rides another pass — it is its own
  small task (a deterministic check in the steward suite, or a repo-guard-style gate).
- **Done-check:** a deterministic check FAILS on a deliberately over-budget
  `.steward/briefing.md` fixture and passes on this repo's real one; steward suite green.

## 9. Adjudicate ledger-compaction: red, fixed, or invisible to test-all?

- **What:** two claims cannot both be true: the model holds
  `plugins/essense-flow/tests/ledger-compaction.test.js` red on a clean tree (calendar
  drift, governance entries past the 30-day archive threshold), yet repo-wide `test-all
  --root` runs report all-green (08-23: 31 suites / 1723 checks). NEW datum 08-23: one
  TRANSIENT essense-flow red on the first parallel sweep (stale-lock timing suspect),
  not reproduced across two re-runs + a direct run. Run the suite DIRECTLY first. If
  red: author the archive sibling (the root fix; raising the threshold re-fires in 30
  days) AND find why test-all's shape-discovery missed it. If green: find what fixed it
  and record it. Also the precondition for Q12(b)/(c) if the owner wants CI back.
- **Done-check:** the suite green on a clean tree AND still green with the system date
  advanced 60 days AND `test-all --root` demonstrably counts it (or the discovery gap
  closed with a test). Run `tests/` explicitly; `test/run-all` says nothing about it.

## 10. Diploma residual: confirm the corrupt-state banner (next Diploma session)

- **What:** essense-flow 0.26.1's parse-corrupt DEGRADED banner is only observable IN
  Diploma. First minutes of the next Diploma session: launch, expect the banner, fix the
  file.
- **Done-check:** banner observed (or its absence investigated as a 0.26.1 bug); Diploma
  `state.yaml` parses clean afterward.

## 11. Decide kb retrieval rung 2 — the evidence gate is now MET [needs owner]

- **What:** the aithseis kb-probe capture satisfied the rung-2 evidence gate (the first
  real vocabulary-class datum after the splitter-class false alarm). Per blueprint
  Phase 4 this is parked BEHIND the owner's call, not auto-built. Bring the evidence +
  the Q9 ladder to the owner; #5's crowd-game miss list adds the second corpus either
  way. Build the characterization pass ONLY on a yes.
- **Done-check:** decision in log.md citing the concrete misses by name; if built:
  enrich job cached + incremental, ranker tests green, previously missing queries hit.

## 12. Phase 2 — fleet rollout of the status spine (~1 evening, after #1's dogfood week)

- **What:** backfill twin-game / crowd-game / aithseis (the aithseis 10-item backlog and
  its 12-day-frozen model are the first customers); done/-moves retired fleet-wide;
  harbor: `~/.claude/kb/fleet/` fleet-caste source (+ `~` expansion + the
  missing-dir-is-silently-empty loudness fix from T5); fleet table — `steward fleet`
  reads status.json + instruments, SESSION-ONLY per the Q3 ruling. Surfaces the
  per-ship git-policy divergence (aithseis commits nothing — owner call per project).
- **Done-check:** the fleet table matches a spot audit on all four ships; one downstream
  friction event reaches this repo via harbor instead of waiting for an audit.

## 13. Phase 3 — Stack B instruments, behind ONE measured gate (~2 evenings)

- **What:** `stats` command over traces + transcripts (duty fire/satisfy rates,
  hint-follow rate — T4's 3/3, 5/6, 3/3, 0/0 is the baseline; staleness distribution;
  recall quality judge-vs-fallback + chosen-files-actually-used); PostToolUse evidence
  recorder; PreCompact digest guard. The old dogfood-watch question ("does ambient
  surface change the work?") lives here as a computed number instead of a vigil —
  T4 already answered the hint half YES; the self-initiated-query gap is what stats
  tracks next.
- **Done-check (the gate):** run stats ONCE over real data; the owner picks which
  numbers earn a standing place. Nothing ships as always-on without that pick.

## 14. Crowd-game steward evaluation (~5 sessions or ~1 week after its deep seed)

- **What:** re-run the 2026-07-21 audit methodology on crowd-game transcripts; 5 signals,
  full rules preserved verbatim in
  `.steward/inbox/done/20260721-2345-eval-measurement-recipe.md`. The 08-23 four-project
  audit covers the OTHER ships; this is the crowd-specific before/after.
- **Done-check:** before/after table with confidence notes. **Owner annoyance = veto
  regardless of numbers.** Unlocks the deferred drop-channel decision (Q8).

## 15. Phase A — wire the gates (on this repo; v3 resumes here, after the spine phases)

- **What:** coupling/extensibility + tests into every executor step; a deterministic
  model-vs-code drift check (parts.md contracts vs `runner map`). test-all +
  registry-check are the harness family #6 extends — reuse, don't re-derive. Respect the
  coupling scope limit: per project, never across the marketplace. Phase 0 validation is
  CLOSED (the audit); the remaining precondition is #1's honest substrate.
- **EXPANDED by the 2026-08-26 HFDP wish:** ambient (non-pipeline) sessions are in scope —
  the extensibility/coupling measures as a conditional check on turns that WRITE source,
  not only executor steps. **Partially delivered 2026-08-27:** patterns 0.1.0 covers the
  ambient VOCABULARY + pre-write nudge as hooks (mechanism, not rule text); what remains
  here is the MEASUREMENT half — the actual coupling/extensibility checks on
  source-writing turns. The essense-flow-side consumers (glossary EXTENSIBILITY.yaml,
  review extensibility lens, verify items, C sweeps — pure wiring on the existing engine)
  join this task ONLY if Q14 resolves (b)/(c); default (a) keeps them unbuilt.
- **Done-check:** a deliberate reach-in fails a hand-back; a stale parts.md entry is
  flagged; an ambient turn that adds a closed dispatch on a declared growth axis gets
  flagged by mechanism, not by rule text.

## 16. Phase B — harden the steward

- **What:** adversarial inbox suite (pivot, vision-contradiction, deletion, duplicate,
  items superseding each other, an item whose defects disk already fixed — integrates as
  DONE with zero tasks); recurring spot-check re-injection; verbs /discuss /test /work.
  RECONCILED vs the blueprint: the orphan-`.steward/` detector + frontmatter warnings +
  digest size guard live in blueprint Phase 4, not here; Q10's second-staleness-signal
  remainder is SUPERSEDED by Phase 1 cursors.
- **Done-check:** each adversarial item produces a correct diff incl. cascaded deletions;
  spot-check fires periodically in normal use.

## 17. Phase C — injection-layer economics, under the quality-over-speed law

- **What:** REMAINING lens work: hand-back + risk-triggered firing, broadened to the
  whole per-prompt + per-turn-end stack. REFRAMED by the Q11 resolution + vision
  invariant 11: economics work may cut FIRES and SCOPE (fire conditionally, fold, push
  to cheaper substrate), never quality — latency alone never motivates a change, and
  any cut ships with a fail-open path. Executed cuts so far: per-prompt lens → at most
  one ask per request (turn-end scoping); steward injection halved (0.3.1); ONE
  background pass per sitting (0.3.0). Ledger keeps per-prompt and per-turn-end cost
  records; recall-quality numbers arrive from #13.
- **Done-check:** measured AFTER numbers against the 2026-07-21 baseline with zero missed
  hand-back failures; each injector fires only where its trigger holds.

## 18. Phase D — generalization pass

- **What:** extract anything mk-cc-resources-specific from the loop after the #14 eval;
  verb set + model structure prove open or get fixed; /kb-seed generalization rides the
  same pass. Then EMDE/psience.
- **Done-check:** the next project onboards by steward-seeding + kb-seeding alone — no
  tooling code changes.

## 19. Phase E — retire ceremony officially [Q4, Q5 land here]

- **What:** docs + marketplace reposition; classic pipeline preserved; essense-autopilot
  retires (Q4 — #3 may make this a deletion rather than a migration). Absorption fodder:
  handoff/resume redundant in steward projects; retro/meta-review → steward verbs; truth
  split memory=owner / model=project / CLAUDE.md=code / kb=queryable everything.
- **Done-check:** a new toy project goes idea → running slice through the steward loop
  only, in one evening.
