# Tasks — ordered, executor-ready (recomputed 2026-07-31 · /doctor item integrated · HEAD 8d5cab6, tree not clean)

> Read this before doing anything:
> - Limits-awareness: Claude drifts, loses context, finishes prematurely, defers, takes shortcuts. Re-read when uncertain. Preserve specifics.
> - Positive mindset: every gap solvable. Find the way by working carefully.
> - Quality ownership: this work matters. Take ownership.
> - Propagation requirement: every descendant artifact must carry these same four instructions.

**Ordering rationale.** Distribution stays #1 but CHANGED SHAPE under the /doctor session:
the owner approved bundle-off + plugin-toolkit standalone (installed @ current HEAD), which
voids the picker-duplication objection *only while the bundle stays off* — so #1 is now a
ratification + a prove-the-reach step, not a blocked structural fork. The uncommitted
restructure rides with THIS integration's commit (state.md), not as a task. #2 is still the
last hole in the one-blocking-tail invariant. #3 unchanged: `steward-sync` first fire is
verify-or-debug, and this integration empties the inbox again. Q11 gained its second
measured number (the hook's own timeout kills the judge) — still the owner's re-take, no
task until answered; Q12's default action folds into #6. Everything measurement-shaped
still waits behind the crowd-game seed (#4).

**Hygiene rule for this file:** `.steward/` model files are COMMITTED to a PUBLIC repo
(only `inbox/` is gitignored). Never write an absolute path, username or machine-specific
detail here — name projects, not drives.

## 1. Ratify the distribution layout the /doctor session set — or change it [needs owner]

- **Why now:** on 2026-07-31 the owner approved (per-group AskUserQuestion): mk-cc-all
  bundle DISABLED + plugin-toolkit standalone INSTALLED (user scope, 1.10.0 @ current
  HEAD). That is a STATE change, not a decision close: the picker-duplication objection is
  voided only while the bundle stays off; the stale `ab1ba82` bundle cache is DORMANT and
  returns the day it is re-enabled; and what a PUBLIC marketplace user should install
  (README/marketplace prose still centers the bundle) was not decided.
- **What:** (1) decide with the owner: keep bundle-off + per-plugin standalone as THE
  layout (then reposition README/marketplace rows that present the bundle as the default
  path), OR restore a slimmed bundle (drop the six toolkit skills so both can coexist),
  OR revisit the parked executables-inside-a-declared-surface move (the way code-glossary
  ships its engine under `skills/`); (2) prove the reach that now exists: run ONE gate
  (repo-guard or test-all) from a DIFFERENT project via the installed toolkit; (3) if the
  bundle ever returns: bump its version first so the `ab1ba82` cache updates, then read
  the CACHED skill text to prove the portability fix reached what gets invoked; (4) the
  repo-guard detector for instruction-names-unreachable-path remains a candidate
  (Claude's proposal, unrequested).
- **Done-check:** (1) decision recorded in log.md with its reason; (2) one gate run
  recorded from a different project (command + exit code); (3) README + marketplace
  prose match the chosen layout.

## 2. Extract autopilot's `decide()` so it can become a duty (closes invariant 9)

- **What:** essense-autopilot still owns a blocking `Stop` hook and IS installed
  (user-scope). Its decision logic is welded into `main()` — only `countInFlightAgents` is
  exported (`plugins/essense-autopilot/hooks/scripts/autopilot.js:421`). Extract a PURE
  `decide(state) -> {advance|halt, reason}` in that plugin, then register a turn-end duty
  that consumes it. Owner direction: "autopilot should become a duty." Do NOT re-implement
  a thinner "what's next" inside turn-end — that creates a competing source of truth.
- **Done-check:** `decide()` exported and unit-tested against the existing halt cases; the
  turn-end duty returns the same verdict for the same state; autopilot's `hooks.json` no
  longer registers a Stop hook; a pipeline project shows ONE tail with both items.

## 3. `steward-sync`: catch the first fire — or debug why three fires skipped it

- **What:** the duty is installed (turn-end 0.3.0 @ `71d661f`, updated 07-27T17:31Z) and
  documented (plugin README/RELEASE-NOTES/marketplace row/root CLAUDE.md) — yet the trace
  through 07-28T17:47Z has ZERO `steward-sync` mentions, including three fires made while
  four staged items sat in `.steward/inbox/`. Unproven explanations: sittings launched on
  pre-update code · a satisfied arm (steward dispatched / asked-this-sitting) absorbed it
  silently · it under-fires. This integration empties the inbox, so: stage the next
  capture normally, end the turn, read the trace. If it fires — done, and Q10's evidence
  gate for hardening to `block` is open. If it does not — read `lib/runner.js` +
  `lib/duties/steward-sync.js` against the live ledger and find why (root cause, no
  patch-on-patch). Also: add the duty to the root README's turn-end ROW (only place still
  listing three duties).
- **Done-check:** a trace line naming `steward-sync` while items sit in the inbox, and a
  later line where it is absent after integration; or a root-caused fix with a test
  replaying the miss. README row lists four duties.

## 4. Crowd-game: commit its config, then run the DEEP seed (first foreign corpus)

- **What:** in the crowd-game project: (a) commit the written-but-uncommitted
  `.claude/kb.json`; port its `scribe.focus` (names a RETIRED hook) to
  `.claude/turn-end.json` `duties.session-digest.important` if it should still apply;
  (b) update kb + turn-end there and restart; (c) re-run `/kb-seed` under the depth
  mandate, running `kb coverage` FIRST — the first real test that re-seed is incremental
  BY MECHANISM; (d) copy the `game-project.yaml` lens preset into
  `.claude/verifiability-lens/profile.yaml`; (e) delete the stray
  `.claude/prompts/.claude/verifiability-lens/state.json`.
- **Also record while there** (the evidence #11 gates on): every hand-driven query that
  MISSES, classified — splitter / vocabulary / ranking / genuinely-absent.
- **Done-check:** config committed there; `kb coverage` shows previously-uncovered
  substrate now cited; entry counts before/after read from the tool; a hand-driven query
  finds a fact only the deep sweep could reach; the miss list exists in writing, even if
  it reads "none found".

## 5. Prove which MCP build is answering (restart-gated)

- **What:** no server-side `kb_query`/`kb_read` trace line exists. Corroborating datum
  found this pass: the 07-26T23:01Z scribe line lists `mcp__plugin_kb_kb__kb_read` among
  that turn's tools — a real call four minutes AFTER the trace write shipped (`7657f00`,
  22:57Z), and no server line appeared. So the attached server predates the trace path;
  a stdio server keeps the code it was launched with, and retrieval works, so there is no
  symptom.
- **Done-check:** after a full restart, one `kb_overview` call reports `version: 0.10.1`
  AND a `kb_query`/`kb_read` line with a post-restart timestamp appears in the trace.
  Both, or the leg is not closed.

## 6. Make documented counts and claims derivable, not remembered

- **What:** registry-check (1.9.0) now covers versions/listings/paths — extend the same
  pattern to what it does not cover: test counts and hook-registration prose. Open
  instances, each read from the file that claims it: test-all totals disagree (0130
  capture: 31 suites/1663 checks · RELEASE-NOTES 1.9.0 + root CLAUDE.md: 30/~1600 —
  re-run `node plugins/plugin-toolkit/bin/test-all.js` and let ITS output be the number,
  or stop printing the number) · plugin-toolkit 1.10.0 has NO RELEASE-NOTES entry ·
  RELEASE-NOTES 1.9.0 claims `.github/workflows/checks.yml` exists (false since
  `3633ff7`; wording per Q12's answer) · root README turn-end row omits `steward-sync`
  (#3 carries it) · bundle description drift (not re-verified; stakes lowered while the
  bundle is disabled, but the prose ships publicly regardless) · 613 Python
  glossary-engine checks in no documented total. CLOSED by the 07-31 restructure, drop
  from the sweep: kb + lens CLAUDE.md retired-hook drift (patched, grep-verified) and the
  root-vs-kb per-file counts (root no longer states them). NEW instance class from the
  same restructure: **references written against the old monolithic root CLAUDE.md may
  point at moved content** — sweep README, `design/`, plugin READMEs for pointers into
  root-CLAUDE.md sections that now live in `plugins/<name>/CLAUDE.md`. Prefer printing
  the command over the number wherever the number earns nothing.
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

## 8. Enforce the briefing budget at WRITE time (residual of the fixed cap defect)

- **What:** injection side fixed (steward 0.2.1); nothing checks that a real
  `briefing.md` is inside budget at write time — the agent's contract text is the only
  guard, the "rule, not mechanism" shape invariant 3 rejects.
- **Done-check:** a deterministic check FAILS on a deliberately over-budget
  `.steward/briefing.md` fixture and passes on this repo's real one; steward suite green.

## 9. Chore: fix ledger-compaction calendar drift (essense-flow)

- **What:** `plugins/essense-flow/tests/ledger-compaction.test.js` fails on a clean
  tree — governance entries past the 30-day archive threshold. Author the archive sibling
  (the root fix; raising the threshold re-fires in 30 days). Also the precondition for
  Q12(b)/(c) if the owner wants CI back.
- **Done-check:** green on a clean tree AND still green with the system date advanced 60
  days. Run `tests/` explicitly; `test/run-all` says nothing about it.

## 10. Diploma residual: confirm the corrupt-state banner (next Diploma session)

- **What:** essense-flow 0.26.1's parse-corrupt DEGRADED banner is only observable IN
  Diploma. First minutes of the next Diploma session: launch, expect the banner, fix the
  file.
- **Done-check:** banner observed (or its absence investigated as a 0.26.1 bug); Diploma
  `state.yaml` parses clean afterward.

## 11. Decide kb retrieval rungs 2/3 on the deep-seed evidence (after #4)

- **What:** read #4's classified miss list: build rung 2 (characterization pass) ONLY if
  vocabulary-mismatch misses actually appear; otherwise record "rung 1 + splitters
  suffice — 2/3 parked WITH evidence".
- **Done-check:** decision in log.md citing concrete misses by name (or their documented
  absence); if built: enrich job cached + incremental, ranker tests green, previously
  missing queries hit.

## 12. Dogfood watch — do the ambient surfaces actually change the work? (passive)

- **What:** T13 is still the sharpest datum. Two instruments exist:
  `.claude/kb/trace.jsonl` and `.claude/turn-end/trace.jsonl`.
- **Done-check:** across ~5 real sessions — hints carried / hints followed by a read /
  recalls the answer actually used; ≥1 logged case where recalled material changed the
  work. **A zero is still a result** (it points at hint/selection quality, not
  awareness).

## 13. Phase 0 validation — passive, on THIS repo (live)

- **What:** keep using this repo through the steward loop.
- **Done-check:** design §5 Phase 0 checks measured HERE — zero pasted context at open;
  diffs read correctly; ~0 steering turns; ≥1 direction-change lands as thought →
  recompute → diff → rebuilt part. Data so far: the kb thread, the turn-end arc (three
  captures → one plugin → two retirements), and Q10 resolving through the loop itself.

## 14. Crowd-game steward evaluation (~5 sessions or ~1 week after its deep seed)

- **What:** re-run the 2026-07-21 audit methodology on crowd-game transcripts; 5 signals,
  full rules preserved verbatim in
  `.steward/inbox/done/20260721-2345-eval-measurement-recipe.md`.
- **Done-check:** before/after table with confidence notes. **Owner annoyance = veto
  regardless of numbers.** Unlocks the deferred drop-channel decision (Q8).

## 15. Phase A — wire the gates (on this repo)

- **What:** coupling/extensibility + tests into every executor step; a deterministic
  model-vs-code drift check (parts.md contracts vs `runner map`). test-all +
  registry-check are the harness family #6 extends — reuse, don't re-derive. Respect the
  coupling scope limit: per project, never across the marketplace.
- **Done-check:** a deliberate reach-in fails a hand-back; a stale parts.md entry is
  flagged. (Gated on #13 showing the loop holds here.)

## 16. Phase B — harden the steward

- **What:** adversarial inbox suite (pivot, vision-contradiction, deletion, duplicate,
  items superseding each other — this integration had that shape AGAIN: the 2030 item
  corrected the 2029 item's world, and disk corrected both); recurring spot-check
  re-injection; verbs /discuss /test /work. Candidate from Q10's open remainder: the
  second staleness signal (model untouched across N producing turns) — unbuilt, owner
  never asked; bring it as a question, not a build.
- **Done-check:** each adversarial item produces a correct diff incl. cascaded deletions;
  spot-check fires periodically in normal use.

## 17. Phase C — injection-layer economics [Q11 lands here]

- **What:** REMAINING lens work: hand-back + risk-triggered firing. BROADENED per owner:
  the same economics for the whole per-prompt stack plus the per-turn-end stack —
  **Q11 is the named instance, now with TWO measured numbers:** context-recall fires a
  judge on EVERY turn end at a MEASURED 46s (policy chosen from a wrong 11s estimate),
  and the hook's own `timeout: 30` kills that judge on 36/162 measured fires — recall
  lost exactly where it runs. The re-take is the owner's, the no-silent-miss property is
  the constraint, and the before-numbers for any AFTER measurement now exist.
- **Done-check:** measured AFTER numbers against the 2026-07-21 baseline with zero missed
  hand-back failures; each injector fires only where its trigger holds; per-prompt and
  per-turn-end cost recorded.

## 18. Phase D — generalization pass

- **What:** extract anything mk-cc-resources-specific from the loop after the #14 eval;
  verb set + model structure prove open or get fixed; /kb-seed generalization rides the
  same pass. Then EMDE/psience.
- **Done-check:** the next project onboards by steward-seeding + kb-seeding alone — no
  tooling code changes.

## 19. Phase E — retire ceremony officially [Q4, Q5 land here]

- **What:** docs + marketplace reposition; classic pipeline preserved; essense-autopilot
  retires (Q4 — #2 may make this a deletion rather than a migration). Absorption fodder:
  handoff/resume redundant in steward projects; retro/meta-review → steward verbs; truth
  split memory=owner / model=project / CLAUDE.md=code / kb=queryable everything.
- **Done-check:** a new toy project goes idea → running slice through the steward loop
  only, in one evening.
