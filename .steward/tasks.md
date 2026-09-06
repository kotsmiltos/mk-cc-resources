# Tasks — ordered, executor-ready (recomputed 2026-09-06 · audit 2 absorbed · numbers are stable ids, file order is the order; next free id 29)

> Read this before doing anything:
> - Limits-awareness: Claude drifts, loses context, finishes prematurely, defers, takes shortcuts. Re-read when uncertain. Preserve specifics.
> - Positive mindset: every gap solvable. Find the way by working carefully.
> - Quality ownership: this work matters. Take ownership.
> - Propagation requirement: every descendant artifact must carry these same four instructions.

**Ordering rationale (2026-09-06 recompute).** Audit 2 measured that the PUSH side is
where the cost is and the reading is not (kb capture `20260906-1340`); its ranked plan
(inbox `20260906-1345`) is Claude's proposal — the owner has decided nothing, and the
tasks below are the executor-ready form of it, not rulings. Tier 1 (#23 #22 #24 #25 #26)
leads: all deterministic, all small, all "stop paying for nothing", and #23 UNBLOCKS the
dogfood week's leg (b), which has been unmeasurable from disk since 0.6.0 shipped. #1
stays a standing watch, not a build. Tier 2 (#27 #8 #28) makes the push side worth
reading. #21 drops behind them: its interactive legs are minutes, but Q15 now has a
number and its answer executes inside #17's fold. Tier 3 became questions (Q16, Q17,
Q15(c)); #11 is RE-PARKED on evidence (repetition + size, not vocabulary). The phase
tasks (#12–#19) absorb the remaining plan items where they belong instead of growing new
ids. Numbering 1–28: numbers are stable ids, never reused.

**Hygiene rule for this file:** `.steward/` model files are COMMITTED to a PUBLIC repo
(only `inbox/` is gitignored). Never write an absolute path, username or machine-specific
detail here — name projects, not drives.

## 23. turn-end — cheap judge, readable tail, honest trace (audit-2 Tier 1 items 1, 4, 6, 8 + supply memory)

- **Why:** measured 2026-09-06 — the judge is slow from STARTUP (33.0 s wall / 3.8 s API;
  every one of 235 judge children paid the whole harness, ~3.75 MB of text on one-shot
  answers of `{"needed":[]}`); the tail puts SUPPLY before DEMANDS (`runner.js:98`) so an
  11,248 B tail was stubbed by the platform's 10 KB rule with its 4 demands at line 126 —
  a nudge wasted; `engine` is set (`context-recall.js:287`) but never reaches the trace
  (`hooks/scripts/turn-end.js:161` writes no such field) so dogfood #1 leg (b) cannot be
  read from disk; each agent-completion wake RE-SUPPLIES the same captures.
- **What (one plugin, one pass):** (1) spawn the judge with `--setting-sources ""`
  (`claude-p.js:112-113` passes only `-p`, `--model` today; optionally
  `--disable-slash-commands --strict-mcp-config`) — substrate-verify the flags against
  the installed CLI's `--help` first, NOT from memory; (2) DEMANDS first, then supply;
  supply stays verbatim while the whole tail is under the 10 KB bound and degrades to
  pointers (path + why + ≤3 lines) beyond it, NAMING the degradation — never a silent
  cut (Claude's re-derivation of the plan's "supply as pointers", per invariant 11:
  fail-open, name what answered); (3) a per-session "already supplied" memory in the
  ledger so a wake never re-hands material this sitting already received (one pointer
  line instead); (4) trace fields: `engine`, per-duty `ms` + `costUsd` (returned by
  `claude-p.js:126`, dropped at `context-recall.js:230`), self-check `satisfiedBy`;
  (5) errored duties VISIBLE — a throwing duty yields a tail line + `errored:[…]` in the
  trace (`runner.js:170`).
- **Done-check:** judge trace `ms` p95 < 10 s over a week and `ETIMEDOUT` count 0; a
  scratch project's fleet.json + kb trace untouched by a judge run; a 3-recall replay
  tail < 10 KB with `[turn-end] before yielding` within the first 3 lines; a wake replay
  re-supplies nothing already supplied; one fire → one trace line carrying `engine`,
  `ms`, `costUsd`; a throwing-duty replay shows the tail line + trace field; turn-end
  suite green. Then #1 leg (b) is computable from disk.

## 22. turn-end — the "wrong check" class: exhaustion, in-flight agents, plan mode (audit-2 Tier 1 items 2 + 3; measured 08-27 + 09-06)

- **Why:** three measured shapes of one defect — a satisfaction check that demands what
  cannot be met right now, re-armed by background wakes: (a) plan mode — session-digest
  demanded a write the plan-mode lock forbids, 8+ cycles (08-27); (b) exhaustion — the
  "giving up" note (`runner.js:190`) goes out as `additionalContext` on EVERY exhausted
  fire, which continues the turn, so `MAX_FIRES_PER_PROMPT = 3` never actually stops
  anything (2 prompts × 9 fires, ended only by the platform's 9-block override); (c)
  in-flight agents — request-closure + quality-lens + session-digest demanded closure
  with 5 background agents running (`context.js:218` captures `backgroundTasks`; no duty
  reads it). Invariant 9: the fire budget is only the backstop for exactly this case.
- **What (generic — never a per-duty special case):** (1) exhaustion → silent allow +
  trace only (`runner.js:180-197`): the budget line is written once to the trace, never
  re-emitted to the session; (2) a DEFERRAL primitive in the runner context: a duty may
  answer `applies=false` with a NAMED reason (`deferred: N agents in flight` /
  `deferred: plan mode`) that lands in the trace; closure-class duties (request-closure,
  quality-lens, session-digest) defer while `backgroundTasks.length > 0`; write-demanding
  duties defer while the mode forbids the write (substrate-verify where permission mode
  rides in the Stop payload BEFORE coding; if it does not, say so and defer on the
  measured symptom instead). Owner ratifies defer-vs-plan-file-counts for plan mode — it
  changes what a plan-mode sitting leaves behind.
- **Done-check:** replay of the 08-27 9-fire trace shape → exactly 3 emissions, then
  silence + one trace line; a payload with agents in flight → the three duties absent from
  the tail and named `deferred` in the trace; the plan-mode replay yields zero wasted
  nudges (or one, satisfied by the plan file); live trace never shows `fires > 3`;
  turn-end suite green.

## 24. One ledger, three readers — join every inbox counter on `status.derive` (audit-2 Tier 1 item 7; dogfood datum 08-27)

- **Why:** under the 0.5.0 contract files never move, so a counter that counts FILES
  re-reports every integrated item forever. Measured: turn-end `steward-sync` listed all 4
  files as unintegrated AFTER their integration (`steward-sync.js:45` raw `.md`, no
  status.json read); the steward brief hook prints two DIFFERENT counts in ONE injection
  (`steward-brief.js:256` raw filter vs the ledger-derived `[instr]`); Endure carries a
  permanent phantom from `inbox/.README.md`; `steward-fleet.js:43` is a third raw counter
  and its dedupe is case-sensitive (`:238`) — a lowercase-cwd probe added a duplicate
  ship this sitting. Instrument DISAGREEMENT is a dogfood leg (c) lie, root-caused here.
- **What:** ONE item model — "top-level, non-dot `.md`, id absent from `status.json
  items[]`" — exposed by steward's `lib/status.js` `derive` and used by all three
  readers. turn-end keeps its OWN copy of the derivation (cross-plugin duplication is
  correct — plugins install standalone), but the copy is a port of the same rule with the
  same tests, not a fourth opinion. Fleet dedupe via the existing `same()` helper,
  case-insensitive on Windows.
- **Done-check:** on this repo every reader (brief hook line, `[instr]`, steward-sync
  ask, fleet table, statusline) prints the SAME number; a dotfile in `inbox/` counts
  nowhere; a lowercase cwd adds no fleet entry; steward + turn-end suites green.

## 25. One canonical machine-text guard for every UserPromptSubmit hook + kb-pull stands down under the judge (audit-2 Tier 1 item 5)

- **Why:** four different guard lists exist (thorough-mode 6 / pattern-menu 6 / kb-pull 5
  / generalize-first 5 / verification-rules 0 / caveman 0), none knows `<system-reminder>`
  or `<task-notification>`; LIVE-PROVEN 09-06: an agent report containing `++` armed the
  thorough augment on a machine-woken prompt. A background-agent completion re-fires every
  UserPromptSubmit hook (62 prompts show 2–12× re-fires). kb-pull has no
  `MK_TURN_END_DEPTH` guard, so 40/78 judge children paid a kb-pull fire (pattern-menu
  already stands down on it).
- **What:** (1) REPO half — one guard definition (thorough-mode's 6 markers +
  `<system-reminder>` + `<task-notification>`), copied verbatim into each in-repo
  UserPromptSubmit hook (kb-pull, pattern-menu, thorough-mode) with a shared drift test
  that fails when any copy diverges; kb-pull adds the `MK_TURN_END_DEPTH` stand-down;
  (2) HOME half — the owner's own hooks (verification-rules, generalize-first, the
  caveman tracker) take the same list in the owner's session, not a repo commit. The
  guard is data (a marker list), so a new machine marker is one entry, not a fifth list.
- **Done-check:** the audit's `measure.js` machine-text rows read 0 B for every hook; an
  agent-wake prompt carries no `[verification-rules]` and no thorough augment; a judge
  child's transcript shows no kb-pull fire; the drift test fails on a deliberately edited
  copy; every touched suite green.

## 26. Test hygiene + dead weight — suites never touch the real home; retired hooks actually leave (audit-2 Tier 1 items 9 + 10)

- **Why:** the kb session suite's `runHook(root, {})` falls back to the REAL homedir
  (the cue file held 84 entries, 79 temp test roots); fleet auto-register leaked temp
  ships into the real fleet.json; thousands of `kb-*`/`steward-home-*` temp dirs; the
  turn-end suite spawns REAL judges (43 s, plan-billed) and asserts a real binary
  (`tests/turn-end.test.js:912-919`). Meanwhile two RETIRED hooks still ship three
  releases later — `kb-scribe-stop.js` + tests, lens `verifiability-stop.{js,sh}` + its
  39-check suite (which tests only the dead hook) — and the lens docs still describe the
  hook as live (audit claim; the parts.md "CLOSED" record is re-opened until this
  executor reads them).
- **What:** (1) every kb / steward / turn-end suite pins HOME + TEMP to fixtures (the
  existing `PATTERNS_STATE_DIR`-style seam is the model), E2E fixtures disable
  context-recall, exe-resolved tests SKIP (named) without a binary; (2) delete
  `kb-scribe-stop.js` + tests, the lens Stop-hook scripts + suite — replace with a
  contract test of agent/rubric/profile; relic `scribe-state.json` / lens `state.json`
  files; `kb.json scribe.focus` (no consumer); (3) fix lens docs (CLAUDE.md, agent.md,
  plugin.json, README) + the "110 checks" / "9 checks" / "≤10-line" drift; the home-side
  unreferenced April `thorough-mode.js` copy is an owner-session chore.
- **Done-check:** hash the home cue file, fleet.json and the temp dir before/after
  `test-all --root` → unchanged; the full sweep runs with no network/judge spawn and
  under ~2 s for the touched suites; registry-check 0; a grep for "Stop hook" over the
  lens plugin's markdown hits only RELEASE-NOTES; test-all `--root` green.

## 1. Dogfood week — measure the live status spine (standing watch; gates Phase 2, #12)

- **Why #1 stays open:** Phase 1 is BUILT, PUSHED and INSTALLED; its done-check was one
  week of real sittings proving the spine tells the TRUTH. Audit 2 read every leg.
- **Legs + status:** (a) staleness — ⚠ line right in 5/5 ships; two lies filed +
  root-caused (false git-HEAD ⚠ after a model commit; authored prose wrong 4/5) → #8;
  (b) fallback fires — BLOCKED from disk (`engine` never traced) → unblocks with #23;
  transcripts show 12 dead recalls + 3 fallback dumps, quality unmeasured; (c) ledger
  truth — counters disagree → #24; (d) statusline — correct (110 B / 50 ms). Any new
  failed leg becomes an inbox item, not a hotfix.
- **Done-check:** each leg observed at least once with zero UNEXPLAINED instrument lies
  (every lie filed + root-caused — the state today) AND leg (b) read from the trace after
  #23; then #12 unblocks.

## 27. kb-pull under the 10 KB rule and not repetitive (audit-2 Tier 2 item 11)

- **Why:** the digest is injected WHOLE and UNCAPPED every prompt (`kb-pull.js:50`; twin
  9,963 B / 110 lines) — 51 of the 53 platform stubs carried it, so the biggest kb push
  is mostly NOT READ; hints have no per-session dedupe (top-3 ids fill 40% of slots) and
  are 84% ignored; after 08-23 the per-prompt tax ROSE while deliberate pull fell to ~0.
  The briefing already runs the opposite policy (900-char cap) for the same class.
- **What:** per-session dedupe of hinted ids (home-side state keyed root-hash +
  session_id, the patterns-state shape); change-aware digest — full text only when its
  hash differs from the last injection this session, else ONE pointer line (quality
  trade-off: the prior copy already sits in the transcript — owner call, default yes);
  fix the floor leak (`term-overlap.js:185,235`); `minScore` + a "+N more above floor —
  `kb_query <terms>`" cue so a hint becomes a deliberate pull; the digest survives a bad
  `kb.json` with a visible one-liner; kb-pull trace carries `session_id`/`prompt_id`/
  scores (feeds #13). Cap = the platform bound, named when it cuts.
- **Done-check:** same prompt twice → no repeated id; unchanged digest → second fire
  < 300 B; every kb-pull output < 10 KB on the twin fixture; a malformed `kb.json` prints
  one visible line and still injects the digest; hint-followed ratio re-measured from the
  new trace after a week (baseline 7% strict / 16% loose); kb suites green.

## 8. Briefing: compute what drifts, author only what cannot be computed (audit-2 Tier 2 item 12; absorbs the write-time budget check)

- **Why:** the authored briefing BODY (Ship/Last/Next) is contradicted by the log's last
  entry in 4 of 5 ships — regenerated only at integration, it lags one session; the
  instruments are RIGHT everywhere. Plus a false ⚠ on `git-HEAD` after committing the
  regenerated model (`steward-brief.js:63-67` reads the ref file's mtime). The 08-23
  ruling was "authored narrative + COMPUTED instruments" — this moves the drifting
  narrative lines to the computed side. Nothing checks a real briefing's budget at write
  time either (the old #8) — computing the lines makes that moot.
- **What:** the hook prints `briefing: <date> (<age>d)`, `Last:` = log.md's last heading,
  `Next:` = tasks.md's top-3 headings, `Waiting:` = questions.md's open headings; the
  agent authors ONLY `Ship:`; freshness by SHA — the agent records `views.briefing.head`
  in status.json at regeneration; ⚠ only when HEAD ≠ recorded; an install instrument
  reading the installed-plugins file restores the claim `agents/steward.md:62-66` already
  makes (or that claim is deleted); `agents/steward.md:59-60` stops instructing a
  done/-move the tools cannot do. Contract v2 in `design/status-contract.md`.
- **Done-check:** commit the regenerated model → no ⚠; the hook's `Last:` equals the
  tail heading of log.md by construction on all 5 ships; a deliberately stale authored
  `Ship:` is the ONLY line that can lie; a real briefing over budget fails a deterministic
  check in the steward suite; hook tests green.

## 28. self-check honest to modality and un-gameable (audit-2 Tier 2 item 13; invariant 10's mechanism is hollow in part)

- **Why:** measured — the named-check regex (`self-check.js:109-120`) is satisfied by
  "Check: none" / "verified by inspection" / "exit 0"; `sed` sits on the non-run heads
  list (`:78`) so `Bash sed -i` mutations are invisible to the changed-files detector —
  the very edit mode the owner's harness prescribes; it blocked 42× (twin 30) while the
  owner asked for LESS testing on Unity, and the owner asked *"what should i be seeing
  now?"* three times in one afternoon — a scene edit needs a LOOK, not a test run.
- **What:** Bash-mutation detector (`sed -i`, `>`, `tee`, heredoc targets); named-check
  floor = a digit or a basename/command present in the turn's `toolCalls` (no
  free-floating "verified"); modality in the ASK — prose/scene edits get "what should the
  owner be seeing?" instead of "run a check"; `startedAt` from the transcript timestamp.
  Evidence detectors stay the registry (extension surface); no judge.
- **Done-check:** the audit's transcript (f) → applies; "Check: none" → not satisfied; a
  docs-only edit → the prose ask; a `sed -i` edit → counted as a change; the existing
  full-ladder replays still pass; turn-end suite green.

## 21. Patterns 0.1.0 — finish the interactive legs, then execute Q15's answer

- **Why:** pushed + installed 08-27, menu hook live in a scratch session; `/patterns` was
  never invoked in any real session since (audit 2) — the interactive legs are still
  owner-session work. Q15 now has a number (five surfaces, 1,645 B per design prompt,
  1,788 B standing) and a third option (fold to ONE hook, #17).
- **What:** (1) `/patterns` try-out + one real gate fire in the owner's interactive
  session; (2) Q15's answer [needs owner] — executed inside #17's fold if (c); (3) the
  one-line catalog citation in essense-flow `generativity-protocol.md` +
  `code-conventions.md` (pipeline points at ambient; no ownership move).
- **Done-check:** both hooks observed in the owner's session once each; Q15's decision
  in log.md with its reason; citation lines present or explicitly declined.

## 2. Ratify the distribution layout the /doctor session set — or change it [needs owner]

- **Why:** on 2026-07-31 the owner approved: mk-cc-all bundle DISABLED + plugin-toolkit
  standalone INSTALLED (user scope). That is a STATE change, not a decision close: the
  picker-duplication objection is voided only while the bundle stays off; the stale
  `ab1ba82` bundle cache is DORMANT and returns the day it is re-enabled; what a PUBLIC
  marketplace user should install (README/marketplace prose still centers the bundle) was
  not decided. Audit 2: install fidelity 16/16 today (installed == repo).
- **What:** (1) decide with the owner: keep bundle-off + per-plugin standalone as THE
  layout (then reposition README/marketplace prose), OR restore a slimmed bundle (drop
  the six toolkit skills so both coexist), OR revisit the parked
  executables-inside-a-declared-surface move; (2) prove the reach: run ONE gate
  (repo-guard or test-all `--root`) from a DIFFERENT project via the installed toolkit;
  (3) if the bundle ever returns: bump its version first so the `ab1ba82` cache updates,
  then read the CACHED skill text; (4) the repo-guard detector for
  instruction-names-unreachable-path remains a candidate (Claude's proposal, unrequested).
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
  of truth. NOTE: `countInFlightAgents` is the one in-flight-agent reader in the toolkit
  — #22's deferral primitive is the generic home for that idea.
- **Done-check:** `decide()` exported and unit-tested against the existing halt cases;
  the turn-end duty returns the same verdict for the same state; autopilot's `hooks.json`
  no longer registers a Stop hook; a pipeline project shows ONE tail with both items.

## 4. Prove which kb MCP build is answering (collect the evidence)

- **What:** no server-side `kb_query`/`kb_read` trace line has ever been confirmed
  post-restart. A stdio server keeps the code it was launched with, so `kb_overview`
  should report the freshly-installed build. Audit 2 counted 38 MCP calls fleet-wide but
  did not read the version.
- **Done-check:** one `kb_overview` call reports `version: 0.11.0` AND a
  `kb_query`/`kb_read` line with a post-restart timestamp appears in the trace. Both, or
  the leg is not closed.

## 5. Crowd-game: commit its config, run the DEEP seed, and collect the post-fix turn-end data

- **What:** crowd-game is DORMANT since 08-02 — it has ZERO post-fix turn-end data. Next
  crowd-game session: (a) commit the written-but-uncommitted `.claude/kb.json`; DROP its
  `scribe.focus` (audit 2: no consumer anywhere) — port to `.claude/turn-end.json`
  `duties.session-digest.important` only if it should still apply; (b) the user-scope
  installs now carry the timeout + digest-theft + root-anchor fixes — watch the first real
  fires; (c) re-run `/kb-seed` under the depth mandate, running `kb coverage` FIRST — the
  first real test that re-seed is incremental BY MECHANISM; (d) copy the
  `game-project.yaml` lens preset into `.claude/verifiability-lens/profile.yaml`; (e)
  delete the stray `.claude/prompts/.claude/verifiability-lens/state.json`; (f) audit-2
  chores: untrack the 11 MB PNG evidence; delete the CONSUMED duplicate inbox item.
- **Also record while there:** every hand-driven query that MISSES, classified —
  splitter / vocabulary / ranking / genuinely-absent (feeds #11).
- **Done-check:** config committed there; `kb coverage` shows previously-uncovered
  substrate now cited; a turn-end trace line with a completed judge verdict; a
  hand-driven query finds a fact only the deep sweep could reach; the miss list exists
  in writing, even if it reads "none found".

## 6. Make documented counts and claims derivable, not remembered

- **What:** registry-check covers versions/listings/paths — extend the same pattern to
  what it does not cover: test counts and hook-registration prose. Phase 1's `[instr]`
  lines subsume the VOLATILE half (installs, git position, counts computed at read); #8
  now takes the briefing's narrative lines too; this sweep keeps the STATIC prose half.
  Open instances, each read from the file that claims it: test-all totals (re-run
  `node plugins/plugin-toolkit/bin/test-all.js --root <repo>` and let ITS output be the
  number — last push gate 34/34 suites / 1795) · plugin-toolkit 1.10.0 RELEASE-NOTES
  entry (last verified missing 08-01) · RELEASE-NOTES 1.9.0 checks.yml claim (wording
  per Q12's answer) · 613 Python glossary-engine checks in no documented total ·
  moved-content references from the 07-31 restructure · marketplace metadata non-bump
  convention (decide, then bump-or-drop) · steward CLAUDE.md test-count line · the lens
  "110 checks" / "9 checks" / "≤10-line" drift (audit 2 — lands with #26 if that runs
  first). Prefer printing the command over the number wherever the number earns nothing.
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
  (root cwd, direct exit read) still exits 0 AND `node plugins/essense-flow/test/run-all.cjs`
  reports zero failures.

## 9. Adjudicate ledger-compaction: red, fixed, or invisible to test-all?

- **What:** two claims cannot both be true: the model holds
  `plugins/essense-flow/tests/ledger-compaction.test.js` red on a clean tree (calendar
  drift, governance entries past the 30-day archive threshold), yet repo-wide `test-all
  --root` runs report all-green. One TRANSIENT essense-flow red on a first parallel sweep
  (08-23, stale-lock timing suspect) was never reproduced. Run the suite DIRECTLY first.
  If red: author the archive sibling (the root fix; raising the threshold re-fires in 30
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

## 11. kb retrieval rung 2 — RE-PARKED on evidence; re-measure after #27 [needs owner only if #27's numbers still say vocabulary]

- **What:** the aithseis kb-probe capture met the rung-2 evidence gate on 08-23, but
  audit 2 says the hints are ignored for REPETITION + SIZE (84% ignored, top-3 ids in 40%
  of slots, the digest stubbed by the platform) — not for vocabulary; an LLM
  characterization pass is the wrong lever before the push side is readable. Keep
  parked; after #27 ships, re-measure the hint-followed ratio and the miss classes (#5's
  crowd list adds the second corpus); bring the Q9 ladder to the owner ONLY if misses are
  then vocabulary-class.
- **Done-check:** a post-#27 measurement recorded in log.md naming the miss classes; if
  the owner says build: enrich job cached + incremental, ranker tests green, previously
  missing queries hit.

## 12. Phase 2 — fleet rollout of the status spine (~1 evening, after #1 + the per-ship chores)

- **What:** backfill twin-game / crowd-game / aithseis / Endure (status contract adopted
  in 1/5 ships today); done/-moves retired fleet-wide; harbor: fleet-caste source (+ `~`
  expansion + the missing-dir-is-silently-empty loudness fix); fleet table — `steward
  fleet` reads status.json + instruments, SESSION-ONLY per the Q3 ruling. **Per-ship
  chores first, in THEIR sessions (audit 2):** twin-game — remove the hardcoded aithseis
  drop path from its model + CLAUDE.md, untrack its nested `.claude/turn-end`, digest 110
  lines → pointer file; aithseis — repair the mangled inbox filename (merge the newer
  body), commit 43 days of model + KB changes, investigate the 09-03/04 hook silence;
  Endure — untrack `.claude/turn-end`, drop `inbox/.README.md` (phantom counter); crowd —
  #5(f). Surfaces the per-ship git-policy divergence (owner call per project).
- **Done-check:** the fleet table matches a spot audit on all five ships; one downstream
  friction event reaches this repo via harbor instead of waiting for an audit.

## 13. Phase 3 — Stack B instruments, behind ONE measured gate (~2 evenings)

- **What:** `stats` command over traces + transcripts (duty fire/satisfy/defer rates,
  hint-follow rate — audit 2 baseline 7% strict / 16% loose; staleness distribution;
  recall quality judge-vs-fallback + chosen-files-actually-used, readable once #23 traces
  `engine`); PostToolUse evidence recorder; PreCompact digest guard; **lens telemetry
  BEFORE any classifier** (audit 2: 27 dispatches, zero trace) — `/verifiability` +
  quality-lens append `{prompt_id, counts{a,b,u}, escalations, refuted, verified, tokens}`;
  the advancing-vs-oscillating classifier stays parked until this shows escalations get
  acted on. The old dogfood-watch question lives here as computed numbers.
- **Done-check (the gate):** run stats ONCE over real data; the owner picks which
  numbers earn a standing place. Nothing ships as always-on without that pick.

## 14. Crowd-game steward evaluation (~5 sessions or ~1 week after its deep seed)

- **What:** re-run the 2026-07-21 audit methodology on crowd-game transcripts; 5 signals,
  full rules preserved verbatim in
  `.steward/inbox/done/20260721-2345-eval-measurement-recipe.md`. The 08-23 + 09-06
  audits cover the OTHER ships; this is the crowd-specific before/after.
- **Done-check:** before/after table with confidence notes. **Owner annoyance = veto
  regardless of numbers.** Unlocks the deferred drop-channel decision (Q8).

## 15. Phase A — wire the gates (on this repo; v3 resumes here, after the spine phases)

- **What:** coupling/extensibility + tests into every executor step; a deterministic
  model-vs-code drift check (parts.md contracts vs `runner map`). test-all +
  registry-check are the harness family #6 extends — reuse, don't re-derive. Respect the
  coupling scope limit: per project, never across the marketplace. Ambient sessions are
  in scope (08-26 HFDP wish): patterns 0.1.0 covers the VOCABULARY + pre-write nudge; what
  remains here is the MEASUREMENT half — coupling/extensibility checks on source-writing
  turns. The essense-flow-side consumers join ONLY if Q14 resolves (b)/(c); default (a)
  keeps them unbuilt. Q17's code-glossary-as-`@ship`-gate default lands here if taken.
- **Done-check:** a deliberate reach-in fails a hand-back; a stale parts.md entry is
  flagged; an ambient turn that adds a closed dispatch on a declared growth axis gets
  flagged by mechanism, not by rule text.

## 16. Phase B — harden the steward

- **What:** adversarial inbox suite (pivot, vision-contradiction, deletion, duplicate,
  items superseding each other, an item whose defects disk already fixed — integrates as
  DONE with zero tasks); recurring spot-check re-injection; verbs /discuss /test /work.
  RECONCILED vs the blueprint: the orphan-`.steward/` detector + frontmatter warnings +
  digest size guard live in blueprint Phase 4, not here; Q10's second-staleness-signal
  remainder is SUPERSEDED by Phase 1 cursors; the briefing's computed lines are #8.
- **Done-check:** each adversarial item produces a correct diff incl. cascaded deletions;
  spot-check fires periodically in normal use.

## 17. Phase C — injection-layer economics, under the quality-over-speed law (audit-2 Tier 2 items 14, 15, 16 land here)

- **What:** economics work may cut FIRES and SCOPE (fire conditionally, fold, push to
  cheaper substrate), never quality — latency alone never motivates, every cut ships with
  a fail-open path. Concrete cuts queued by audit 2: (1) **fold the per-prompt regex
  stack** — verification-rules + generalize-first + thorough-mode + pattern-menu → ONE
  UserPromptSubmit hook over a `{trigger, injection}` registry; `++` injected once; the
  Generalize-First Gate leaves global CLAUDE.md for pattern-menu's footer; `@verify` stops
  restating always-on rules — this EXECUTES Q15(c) if the owner takes it; (2) serena
  PreToolUse hook: matcher `Read|Grep|Glob`, advisory or raised thresholds (owner
  settings, owner session); alert-sounds `clear` off Python; (3) tail-read the transcript
  (`context.js:122-123`) — scan back to the last genuine user entry. Executed cuts so far:
  lens → one ask per request; steward injection halved; one background pass per sitting.
- **Done-check:** the audit's `measure.js` before/after — plain prompt unchanged, `++`
  prompt −363 B, design prompt one block, global CLAUDE.md < 5 KB, spawns 9 → 6; a 170 MB
  transcript reads in < 100 ms with identical `toolCalls`; hand-back failures 0 against the
  2026-07-21 baseline; each injector fires only where its trigger holds.

## 18. Phase D — generalization pass

- **What:** extract anything mk-cc-resources-specific from the loop after the #14 eval;
  verb set + model structure prove open or get fixed; /kb-seed generalization rides the
  same pass; Q16's answer (zero-setup memory) is the on-ramp this phase ships. Then
  EMDE/psience/BiananceRepo — the two ships where the owner measurably felt the loss.
- **Done-check:** the next project onboards by steward-seeding + kb-seeding alone — no
  tooling code changes.

## 19. Phase E — retire ceremony officially [Q4, Q5, Q17 land here]

- **What:** docs + marketplace reposition; classic pipeline preserved (frozen per Q17's
  default); essense-autopilot retires (Q4 — #3 may make this a deletion rather than a
  migration); session-lifecycle + reuse-gate per Q17. Absorption fodder: handoff/resume
  redundant in steward projects (measured: 0 uses ever); retro/meta-review → steward
  verbs; truth split memory=owner / model=project / CLAUDE.md=code / kb=queryable
  everything.
- **Done-check:** a new toy project goes idea → running slice through the steward loop
  only, in one evening.
