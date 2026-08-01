# Tasks — ordered, executor-ready (recomputed 2026-08-01 · self-check directive in flight · HEAD 1c978fd, tree clean)

> Read this before doing anything:
> - Limits-awareness: Claude drifts, loses context, finishes prematurely, defers, takes shortcuts. Re-read when uncertain. Preserve specifics.
> - Positive mindset: every gap solvable. Find the way by working carefully.
> - Quality ownership: this work matters. Take ownership.
> - Propagation requirement: every descendant artifact must carry these same four instructions.

**Ordering rationale.** NEW #1: the owner's self-check directive is being executed TODAY
(main session is the executor) — an in-flight owner directive outranks everything, so all
former numbers shift +1. The 2030 digest-bug item produced ZERO tasks: both defects were
already fixed and shipped (kb 0.10.2) before integration — a proposal for the task list
that disk had already emptied. Distribution ratification stays next [needs owner]; the
autopilot extraction remains the last hole in invariant 9; `steward-sync` first-fire is
armed again the moment this integration empties the inbox. Q11 shrank to the policy
re-take alone (0.3.1 executed the old default) — still no task until the owner answers.
A new adjudication rides #10: the 07-31 test-all 31/31 verdict vs the believed-red
ledger-compaction suite cannot both be true.

**Hygiene rule for this file:** `.steward/` model files are COMMITTED to a PUBLIC repo
(only `inbox/` is gitignored). Never write an absolute path, username or machine-specific
detail here — name projects, not drives.

## 1. Ship the `self-check` duty — owner directive, IN FLIGHT (executor: main session, today)

- **Why #1:** owner, verbatim (2026-08-01): work must be self-checked before Claude
  reports done — *"just arbitrarily calling 'DONE' — can we make sure this has happened
  before finishing and me having to ask?"* Now vision invariant 10.
- **What:** a fifth turn-end duty, `lib/duties/self-check.js` — default-ON DEMAND: applies
  when the turn produced work; satisfied when the turn carries verification evidence —
  a check actually RUN, or the check + result NAMED, in the work's own medium (visual
  work looked at, code run/tested). Deterministic evidence detectors, NO judge —
  quality-lens stays the opt-in deep tier (this is NOT a lens-economics re-take). Owner
  set: default-on + the before-done guarantee; detector specifics / severity / span are
  the executor's choices — record them as Claude's in the duty header (the
  owner's-voice law). Honor the duty contract: `satisfied` answers from real state; no
  duty counts another duty's mandated output as fresh work.
- **Done-check:** `self-check.js` on disk, registered in `lib/duties/index.js`, enabled
  by default; tests replay a producing turn WITHOUT evidence (asks) and WITH evidence
  (silent); doc cascade complete — version bump + RELEASE-NOTES entry + plugin CLAUDE.md
  + marketplace row + **root README turn-end row now names five duties** (the new-duty
  law); one live fire observed or the miss root-caused.

## 2. Ratify the distribution layout the /doctor session set — or change it [needs owner]

- **Why:** on 2026-07-31 the owner approved: mk-cc-all bundle DISABLED + plugin-toolkit
  standalone INSTALLED (user scope). That is a STATE change, not a decision close: the
  picker-duplication objection is voided only while the bundle stays off; the stale
  `ab1ba82` bundle cache is DORMANT and returns the day it is re-enabled; what a PUBLIC
  marketplace user should install (README/marketplace prose still centers the bundle) was
  not decided. NEW fact: the toolkit install now LAGS (1.10.0 @ `8d5cab6`, three commits
  behind; its cache lacks its own per-plugin CLAUDE.md).
- **What:** (1) decide with the owner: keep bundle-off + per-plugin standalone as THE
  layout (then reposition README/marketplace prose), OR restore a slimmed bundle (drop
  the six toolkit skills so both coexist), OR revisit the parked
  executables-inside-a-declared-surface move; (2) prove the reach: run ONE gate
  (repo-guard or test-all) from a DIFFERENT project via the installed toolkit — update
  the install first so the run exercises current code; (3) if the bundle ever returns:
  bump its version first so the `ab1ba82` cache updates, then read the CACHED skill text;
  (4) the repo-guard detector for instruction-names-unreachable-path remains a candidate
  (Claude's proposal, unrequested).
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

## 4. `steward-sync`: catch the first fire — or debug why fires keep skipping it

- **What:** the duty is installed (turn-end 0.3.1 @ HEAD since 07-31T18:27Z) and
  documented everywhere incl. the root README row (fixed by the 0.3.1 cascade) — yet no
  trace line has EVER named it, including fires made while staged items sat in
  `.steward/inbox/`. Unproven explanations: sittings launched on pre-update code · a
  satisfied arm (steward dispatched / asked-this-sitting) absorbed it silently · it
  under-fires. This integration empties the inbox again, so: stage the next capture
  normally, end the turn, read the trace. If it fires — done, and Q10's evidence gate for
  hardening to `block` is open. If it does not — read `lib/runner.js` +
  `lib/duties/steward-sync.js` against the live ledger and find why (root cause, no
  patch-on-patch).
- **Done-check:** a trace line naming `steward-sync` while items sit in the inbox, and a
  later line where it is absent after integration; or a root-caused fix with a test
  replaying the miss.

## 5. Crowd-game: commit its config, then run the DEEP seed (first foreign corpus)

- **What:** in the crowd-game project: (a) commit the written-but-uncommitted
  `.claude/kb.json`; port its `scribe.focus` (names a RETIRED hook) to
  `.claude/turn-end.json` `duties.session-digest.important` if it should still apply;
  (b) restart there — the user-scope installs already carry turn-end 0.3.1 + kb 0.10.2,
  which fix the two defects crowd-game measured (0 turn-end completions = the 30s
  timeout; digest theft); (c) re-run `/kb-seed` under the depth mandate, running
  `kb coverage` FIRST — the first real test that re-seed is incremental BY MECHANISM;
  (d) copy the `game-project.yaml` lens preset into
  `.claude/verifiability-lens/profile.yaml`; (e) delete the stray
  `.claude/prompts/.claude/verifiability-lens/state.json`.
- **Also record while there** (the evidence #12 gates on): every hand-driven query that
  MISSES, classified — splitter / vocabulary / ranking / genuinely-absent.
- **Done-check:** config committed there; `kb coverage` shows previously-uncovered
  substrate now cited; entry counts before/after read from the tool; a hand-driven query
  finds a fact only the deep sweep could reach; the miss list exists in writing, even if
  it reads "none found".

## 6. Prove which MCP build is answering (restart-gated)

- **What:** no server-side `kb_query`/`kb_read` trace line exists. Corroborating datum:
  the 07-26T23:01Z scribe line lists `mcp__plugin_kb_kb__kb_read` among that turn's
  tools — a real call four minutes AFTER the trace write shipped, and no server line
  appeared. A stdio server keeps the code it was launched with, and retrieval works, so
  there is no symptom.
- **Done-check:** after a full restart, one `kb_overview` call reports `version: 0.10.2`
  AND a `kb_query`/`kb_read` line with a post-restart timestamp appears in the trace.
  Both, or the leg is not closed.

## 7. Make documented counts and claims derivable, not remembered

- **What:** registry-check covers versions/listings/paths — extend the same pattern to
  what it does not cover: test counts and hook-registration prose. Open instances, each
  read from the file that claims it: test-all totals now have THREE numbers (docs
  30/~1600 · 0130 capture 31/1663 · 07-31 run 31/1681 — re-run
  `node plugins/plugin-toolkit/bin/test-all.js` and let ITS output be the number, or stop
  printing the number) · plugin-toolkit 1.10.0 has NO RELEASE-NOTES entry (re-verified
  2026-08-01) · RELEASE-NOTES 1.9.0 claims `.github/workflows/checks.yml` exists (false
  since `3633ff7`; wording per Q12's answer) · bundle description drift (dormant while
  the bundle is off, but the prose ships publicly regardless) · 613 Python
  glossary-engine checks in no documented total · the moved-content reference class from
  the 07-31 restructure (sweep README, `design/`, plugin READMEs for pointers into
  root-CLAUDE.md sections that now live in `plugins/<name>/CLAUDE.md`) · light: the
  marketplace metadata version did not move while two rows did (2.47.0 — decide whether
  the convention is real, then either bump-or-drop it). CLOSED, drop from the sweep: the
  root README turn-end row (four duties @ 0.3.1, read 2026-08-01). Prefer printing the
  command over the number wherever the number earns nothing.
- **Done-check:** a check (registry-check claim source or peer) fails on today's
  instances and passes after correction; one command re-verifies every documented count
  and hook claim.

## 8. Retire the leaked-path allowlist entry (the absolute-path debt, expressed as a gate)

- **What:** `plugins/essense-flow/test/` is the one entry in repo-guard's `leaked-path`
  allowlist, self-described as *"Known debt, NOT exempt by design"*. Those files carry
  real home-directory literals as load-bearing fixture roots — a blanket replace broke 4
  suites and was reverted, so per-file: read what each literal is FOR, replace with a
  tmpdir/`__dirname`-derived path, run that suite, move on. Do NOT re-introduce a count —
  the allowlist entry IS the done-check.
- **Done-check:** the entry deleted AND `node plugins/plugin-toolkit/bin/repo-guard.js`
  still exits 0 AND `node plugins/essense-flow/test/run-all.cjs` reports zero failures.

## 9. Enforce the briefing budget at WRITE time (residual of the fixed cap defect)

- **What:** injection side fixed (steward 0.2.1); nothing checks that a real
  `briefing.md` is inside budget at write time — the agent's contract text is the only
  guard, the "rule, not mechanism" shape invariant 3 rejects.
- **Done-check:** a deterministic check FAILS on a deliberately over-budget
  `.steward/briefing.md` fixture and passes on this repo's real one; steward suite green.

## 10. Adjudicate ledger-compaction: red, fixed, or invisible to test-all?

- **What:** two claims cannot both be true: the model holds
  `plugins/essense-flow/tests/ledger-compaction.test.js` red on a clean tree (calendar
  drift, governance entries past the 30-day archive threshold), and the 07-31 session
  reported test-all **31/31 green (1681)**. Run the suite DIRECTLY first. If red: author
  the archive sibling (the root fix; raising the threshold re-fires in 30 days) AND find
  why test-all's shape-discovery missed the suite — that is a test-all gap to close with
  a test (a suite outside discovery is exactly the silence-is-a-finding case). If green:
  find what fixed it and record it. Also the precondition for Q12(b)/(c) if the owner
  wants CI back.
- **Done-check:** the suite green on a clean tree AND still green with the system date
  advanced 60 days AND `test-all` demonstrably counts it (or the discovery gap closed
  with a test). Run `tests/` explicitly; `test/run-all` says nothing about it.

## 11. Diploma residual: confirm the corrupt-state banner (next Diploma session)

- **What:** essense-flow 0.26.1's parse-corrupt DEGRADED banner is only observable IN
  Diploma. First minutes of the next Diploma session: launch, expect the banner, fix the
  file.
- **Done-check:** banner observed (or its absence investigated as a 0.26.1 bug); Diploma
  `state.yaml` parses clean afterward.

## 12. Decide kb retrieval rungs 2/3 on the deep-seed evidence (after #5)

- **What:** read #5's classified miss list: build rung 2 (characterization pass) ONLY if
  vocabulary-mismatch misses actually appear; otherwise record "rung 1 + splitters
  suffice — 2/3 parked WITH evidence".
- **Done-check:** decision in log.md citing concrete misses by name (or their documented
  absence); if built: enrich job cached + incremental, ranker tests green, previously
  missing queries hit.

## 13. Dogfood watch — do the ambient surfaces actually change the work? (passive)

- **What:** T13 is still the sharpest datum. Two instruments exist:
  `.claude/kb/trace.jsonl` and `.claude/turn-end/trace.jsonl`. Post-0.3.1 traces are the
  first where recall material actually survives long judge runs — earlier windows
  under-count by construction.
- **Done-check:** across ~5 real sessions — hints carried / hints followed by a read /
  recalls the answer actually used; ≥1 logged case where recalled material changed the
  work. **A zero is still a result** (it points at hint/selection quality, not
  awareness).

## 14. Phase 0 validation — passive, on THIS repo (live)

- **What:** keep using this repo through the steward loop.
- **Done-check:** design §5 Phase 0 checks measured HERE — zero pasted context at open;
  diffs read correctly; ~0 steering turns; ≥1 direction-change lands as thought →
  recompute → diff → rebuilt part. Data so far: the kb thread, the turn-end arc, Q10
  resolving through the loop, and the 2030 item arriving already-fixed (the loop's
  capture outran its own integration — disk won, correctly).

## 15. Crowd-game steward evaluation (~5 sessions or ~1 week after its deep seed)

- **What:** re-run the 2026-07-21 audit methodology on crowd-game transcripts; 5 signals,
  full rules preserved verbatim in
  `.steward/inbox/done/20260721-2345-eval-measurement-recipe.md`.
- **Done-check:** before/after table with confidence notes. **Owner annoyance = veto
  regardless of numbers.** Unlocks the deferred drop-channel decision (Q8).

## 16. Phase A — wire the gates (on this repo)

- **What:** coupling/extensibility + tests into every executor step; a deterministic
  model-vs-code drift check (parts.md contracts vs `runner map`). test-all +
  registry-check are the harness family #7 extends — reuse, don't re-derive. Respect the
  coupling scope limit: per project, never across the marketplace.
- **Done-check:** a deliberate reach-in fails a hand-back; a stale parts.md entry is
  flagged. (Gated on #14 showing the loop holds here.)

## 17. Phase B — harden the steward

- **What:** adversarial inbox suite (pivot, vision-contradiction, deletion, duplicate,
  items superseding each other — AND the newest shape: an item whose defects disk has
  already fixed, which must integrate as DONE with zero tasks, not as fresh work);
  recurring spot-check re-injection; verbs /discuss /test /work. Candidate from Q10's
  open remainder: the second staleness signal (model untouched across N producing
  turns) — unbuilt, owner never asked; bring it as a question, not a build.
- **Done-check:** each adversarial item produces a correct diff incl. cascaded deletions;
  spot-check fires periodically in normal use.

## 18. Phase C — injection-layer economics [Q11 lands here]

- **What:** REMAINING lens work: hand-back + risk-triggered firing. BROADENED per owner:
  the same economics for the whole per-prompt stack plus the per-turn-end stack.
  **Q11 is the named instance, now cleanly priced:** context-recall fires a judge on
  EVERY turn end at a measured 46s (policy chosen on a wrong 11s estimate; the
  timeout-kill contradiction that masked it is FIXED in 0.3.1, so the cost is now real
  and fully delivered). The stack GREW 2026-08-01: the default-ON `self-check` duty —
  deterministic, no judge, negligible latency, but part of every producing turn-end and
  therefore part of this ledger. The re-take is the owner's; the no-silent-miss property
  is the constraint; before-numbers exist for any AFTER measurement.
- **Done-check:** measured AFTER numbers against the 2026-07-21 baseline with zero missed
  hand-back failures; each injector fires only where its trigger holds; per-prompt and
  per-turn-end cost recorded.

## 19. Phase D — generalization pass

- **What:** extract anything mk-cc-resources-specific from the loop after the #15 eval;
  verb set + model structure prove open or get fixed; /kb-seed generalization rides the
  same pass. Then EMDE/psience.
- **Done-check:** the next project onboards by steward-seeding + kb-seeding alone — no
  tooling code changes.

## 20. Phase E — retire ceremony officially [Q4, Q5 land here]

- **What:** docs + marketplace reposition; classic pipeline preserved; essense-autopilot
  retires (Q4 — #3 may make this a deletion rather than a migration). Absorption fodder:
  handoff/resume redundant in steward projects; retro/meta-review → steward verbs; truth
  split memory=owner / model=project / CLAUDE.md=code / kb=queryable everything.
- **Done-check:** a new toy project goes idea → running slice through the steward loop
  only, in one evening.
