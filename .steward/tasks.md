# Tasks — ordered, executor-ready (recomputed 2026-09-08 · Tier 1 CLOSED at bc39fe0 · harness plan absorbed · numbers are stable ids, file order is the order; next free id 37)

> Read this before doing anything:
> - Limits-awareness: Claude drifts, loses context, finishes prematurely, defers, takes shortcuts. Re-read when uncertain. Preserve specifics.
> - Positive mindset: every gap solvable. Find the way by working carefully.
> - Quality ownership: this work matters. Take ownership.
> - Propagation requirement: every descendant artifact must carry these same four instructions.

**Ordering rationale (2026-09-08 recompute).** Tier 1 (#22 #23 #24 #25 #26 + the
lens-restored 1b) is CLOSED as built — shipped `bc39fe0`, installed, NOT yet running in the
owner's process (state.md G1) — so its live legs ride #1, not their own ids. The order now
follows `design/harness.md` §8 (Claude's plan under the owner's 09-06 delegation *"decide
what is the best way to handle it. the need is that my vision is applied and works"* and
the owner's *"result based"*): instrument first, then decide. Phase 0 (#29 #27 #28) is
hours-to-an-evening and deterministic; Phase 1 (#30 #31) makes every later verdict a
number; Phase 2 (#32 #8) gives the loop a goal and a truthful briefing — both wait on Q18/
Q19; Phase 3 (#17 #33 #35) is the push-side redesign, gated on Q15 and the prism run; Phase
4 (#34 #36) guards + replay; the rest is unchanged in relative order. #13 is DELETED — its
four legs became #28 (recorder), #30 (trace + lens telemetry), #31 (stats) and #33
(compaction guard); its gate rule lives in #31's done-check. Numbering 1–36: ids are
stable, never reused.

**Hygiene rule for this file:** `.steward/` model files are COMMITTED to a PUBLIC repo
(only `inbox/` is gitignored). Never write an absolute path, username or machine-specific
detail here — name projects, not drives.

## 29. Running ≠ installed — a version instrument in the brief hook + `version` on every trace line (harness G1, Phase 0; S)

- **Why:** live-proven 2026-09-08 on this repo: the owner's process started 09-06 12:32,
  turn-end 0.7.0 was installed 15:15, `/clear` does not reload plugins — two days of traces
  carry the 0.6.0 field set (`"deferred"` in `.claude/turn-end/trace.jsonl` = 0 of 128 lines
  at this pass) and the deferral primitive was not running while four agents ran. The log's
  "SHIPPED + INSTALLED" was true of the disk, false of the process, invisible from disk.
- **What:** (1) a drop-in `instrRunning` in `steward-brief.js`'s `INSTRUMENTS` registry:
  each hook script reports its own package version (read from its plugin.json at load) vs
  `installed_plugins.json`; mismatch → one `[instr] running turn-end 0.6.0 ≠ installed
  0.7.0 — restart` line, silent when equal; (2) every trace line written by turn-end,
  kb-pull and the brief hook carries `version` (the loaded package's), so a trace is
  attributable by construction; (3) this settles `agents/steward.md:62-66`'s
  install-instrument claim (#8) — build it here, delete the false text there.
  Deterministic, fs-only, zero tokens.
- **Done-check:** on a stale process the line appears; restart → it disappears; the next
  Stop trace line carries `"version":"0.7.0"` AND `"deferred"`; steward hook suite green.

## 27. kb-pull under the 10 KB rule and not repetitive (audit-2 Tier 2 item 11 = harness G6; Phase 0)

- **Why:** the digest is injected WHOLE and UNCAPPED every prompt (`kb-pull.js:50`; twin
  9,963 B / 110 lines) — 51 of the 53 platform stubs carried it, so the biggest kb push
  is mostly NOT READ; hints have no per-session dedupe (top-3 ids fill 40% of slots) and
  are 84% ignored; after 08-23 the per-prompt tax ROSE while deliberate pull fell to ~0.
  The briefing already runs the opposite policy (900-char cap) for the same class; turn-end's
  tail is capped since 0.7.0 — kb-pull is the last uncapped push surface.
- **What:** per-session dedupe of hinted ids (home-side state keyed root-hash +
  session_id, the patterns-state shape); change-aware digest — full text only when its
  hash differs from the last injection this session, else ONE pointer line (quality
  trade-off: the prior copy already sits in the transcript — owner call, default yes);
  fix the floor leak (`term-overlap.js:185,235`); `minScore` + a "+N more above floor —
  `kb_query <terms>`" cue so a hint becomes a deliberate pull; the digest survives a bad
  `kb.json` with a visible one-liner; kb-pull trace carries `session_id`/`prompt_id`/
  scores (feeds #30/#31). Cap = the platform bound, named when it cuts.
- **Done-check:** same prompt twice → no repeated id; unchanged digest → second fire
  < 300 B; every kb-pull output < 10 KB on the twin fixture; a malformed `kb.json` prints
  one visible line and still injects the digest; hint-followed ratio re-measured from the
  new trace after a week (baseline 7% strict / 16% loose); kb suites green.

## 28. Verification gets ground truth — self-check un-gameable + PostToolUse check-recorder + ONE shared file-touch extractor (audit-2 Tier 2 item 13 + harness G2; Phase 0 legs now, ledger leg after Q19)

- **Why:** the named-check regex (`self-check.js:119-120`) is satisfied by "Check: none" /
  "verified by inspection" / "exit 0"; `sed` sits on the non-run heads list (`:53-55`/`:78`)
  so `Bash sed -i` mutations are invisible; NEW 09-08 — context-recall's "did not use"
  detector is blind to Bash reads (it re-served the audit capture the session had read via
  `head -c`): two detectors, one missing primitive. It blocked 42× (twin 30) while the
  owner asked for LESS testing on Unity and asked *"what should i be seeing now?"* three
  times in one afternoon. Every compared harness verifies by TOOL RESULT, never by claim.
- **What — Phase 0 legs (no ruling needed):** (1) ONE shared `file-touch` extractor (Bash
  argv → files read / files mutated: `sed -i`, `>`, `tee`, heredoc targets; `head`/`cat`/
  `grep` reads) consumed by self-check AND context-recall; (2) named-check floor = a digit
  or a basename/command present in the turn's `toolCalls` (no free-floating "verified");
  (3) modality in the ASK — prose/scene edits get "what should the owner be seeing?"
  instead of "run a check"; (4) `startedAt` from the transcript timestamp. **Phase 2 leg
  (after Q19):** (5) PostToolUse recorder, matcher `Bash` — parse argv for check commands
  (`node --test`, `npm test`, `pytest`, `test-all`, `repo-guard`…) and mutating heads →
  append `{prompt_id, kind: check|mutation, cmd, exit, files}` to a per-root ledger;
  `self-check.satisfied` reads the ledger (a check RAN after the last mutation, strictness
  per Q19), never the prose; the tail names the un-checked mutation AND the command that
  would check it. Evidence detectors stay the registry (extension surface); no judge.
- **Done-check:** the audit's transcript (f) → applies; "Check: none" → not satisfied; a
  `sed -i` edit → counted as a change; a docs-only edit → the prose ask; the 09-08
  transcript replayed → recall no longer re-serves the audit capture; `sed -i` then
  `node --test` → satisfied; the 42 twin blocks replayed → each remaining block names a
  real un-checked mutation; the existing full-ladder replays still pass; turn-end suite
  green.

## 30. Trace schema v1 + lens telemetry — every evaluator leaves a line (harness G4, Phase 1; S/M)

- **Why:** the lens has 27 dispatches and ZERO trace — its value is unmeasurable; the
  judge's pick is nondeterministic (Q20) and `chosen` is empty in ~50% of supplies;
  turn-end, kb and the brief hook each write their own trace shape. Anthropic's law: every
  harness component encodes an assumption that goes stale — you can only take out what you
  can measure.
- **What:** one schema shared by turn-end, kb, lens, patterns, thorough-mode —
  `{t, plugin, hook|duty|agent, version, session_id, prompt_id, ms, cost_usd?, engine?,
  decision, bytes, acted_on?}` (each plugin keeps its OWN writer — plugins install
  standalone; the schema is a documented contract + a shared drift test, the
  machine-guard precedent); lens rollup appends `{a, b, u, escalations, refuted, verified}`
  from `/verifiability` and the quality-lens duty; `acted_on` derived at the NEXT prompt
  (did the session touch a hinted/escalated path?); the judge writes agreement inputs
  (index size, chosen ids) so Q20's check is computable from disk. The
  advancing-vs-oscillating classifier stays parked until this shows escalations get
  acted on.
- **Done-check:** one lens dispatch → one line; refute/confirm and acted-on ratios
  computable from disk; a deliberately malformed line fails the drift test; touched suites
  green.

## 31. `harness-stats` — the scorecard: one gate over drop-in METRIC sources (harness G5 + the inbox-1500 scorecard; Phase 1; absorbs the deleted #13's gate)

- **Why:** "does it do anything?" took two audits and seven agents (08-23, 09-06); the
  audit's method lives in a session scratchpad; the owner's own frame is *"result based"*.
  Proposed rule (Claude's; Q18 ratifies): a mechanism ships with its result-metric key or
  does not ship — this is the thing that reads the keys.
- **What:** `plugin-toolkit/bin/harness-stats.js`, a pure runner over `lib/metrics/` (the
  repo-guard detector shape: one context gathered once, silence is a finding, a crashed
  source is reported not skipped) over traces + transcripts + status.json + log.md:
  hint-followed % (strict/loose; baseline 7%/16%), tail bytes p50/p95 + % under 10 KB,
  judge ms p95 + engine mix + agreement (from #30), blocks + wasted nudges per prompt,
  briefing-vs-log contradictions (computable once #8 derives the lines), digest bytes,
  spawns per prompt (baseline ≥8 UPS + 5 Stop), running≠installed (#29); the audit's
  scripts become the first sources; printed as ONE `[instr]` line at open + full on demand.
- **Done-check (the gate the old #13 carried):** run once on this repo → numbers reproduce
  audit 2 within 3% on the overlapping metrics; the owner picks which numbers earn a
  standing `[instr]` place — nothing ships always-on without that pick; a second run after
  #28/#32 shows the deltas.

## 1. Dogfood — measure the live status spine AND the 0.7.0 ship (standing watch; gates Phase 2, #12)

- **Why #1 stays open:** Phase 1 (status spine) and Tier 1 (0.7.0 / 0.5.1 / 0.12.0…) are
  BUILT, PUSHED and INSTALLED; neither is proven by disk alone — the 09-08 finding says the
  owner's process still ran 0.6.0 two days after the ship (`"deferred"` 0/128 trace lines).
  Step zero of every leg below is a RESTART.
- **Legs + status:** (a) staleness — ⚠ right 5/5; false git-HEAD ⚠ + authored prose wrong
  4/5 → #8; (b) fallback fires — 0.7.0 traces `engine`/`ms`/`costUsd`; readable the moment
  a 0.7.0 line exists; (c) ledger truth — CLOSED (#24); (d) statusline — correct;
  (e) 0.7.0 live legs — a Stop trace line with `engine`, `ms`, `lean`, `deferred`,
  `payload_keys`; a tail under 9,000 chars with demands first; no kb-pull fire inside a
  judge child; `[instr] items: N new (oldest Nd)`; one real wake-turn ending on the owner's
  request (request-closure, never yet observed live). Any new failed leg becomes an inbox
  item, not a hotfix.
- **Done-check:** each leg observed at least once with zero UNEXPLAINED instrument lies AND
  leg (b) + (e) read from a trace line carrying `"deferred"`; then #12 unblocks.

## 32. Goal duty — the armed task's done-check becomes the loop's termination criterion (harness G3, Phase 2; M) [needs owner: Q18 scope]

- **Why:** no goal-based termination exists in the layer; "stopping while there is planned
  work" (owner, twin 08-12) is prose; Anthropic's harnesses hold the loop to a checked list
  (`/goal`, feature lists); the steward already keeps per-task done-checks — the criterion
  exists, nothing consumes it.
- **What:** a session-scoped turn-end DEMAND duty `goal` armed by `steward:next` /
  `steward:goal <n>` (policy per Q18; the base supports all three): criterion = the task's
  done-check from `tasks.md`/`status.json`; satisfied by the #28 ledger (the named check
  ran, strictness per Q19) or an explicit owner "stop"; capped by fires (3), never by a
  promise phrase; `defer()` while agents are in flight (0.7.0 primitive); an optional
  prompt-hook LLM evaluator ONLY for prose done-checks, off by default.
  TaskCreated/TaskCompleted (if the platform exposes them) → status ledger entries, never a
  second task list.
- **Done-check:** arm #27 → a turn that yields without its check → exactly one tail line
  naming the task; after the suite goes green → silent; a sitting with no armed goal shows
  no line; turn-end + steward suites green.

## 8. Briefing: compute what drifts, author only what cannot be computed (audit-2 Tier 2 item 12; Phase 2; absorbs the write-time budget check + lens item 21)

- **Why:** the authored briefing BODY (Ship/Last/Next) is contradicted by the log's last
  entry in 4 of 5 ships — regenerated only at integration, it lags one session; the
  instruments are RIGHT everywhere. Plus a false ⚠ on `git-HEAD` after committing the
  regenerated model (`steward-brief.js:63-67` reads the ref file's mtime). The 08-23
  ruling was "authored narrative + COMPUTED instruments" — this moves the drifting
  narrative lines to the computed side. Nothing checks a real briefing's budget at write
  time either — computing the lines makes that moot.
- **What:** the hook prints `briefing: <date> (<age>d)`, `Last:` = log.md's last heading,
  `Next:` = tasks.md's top-3 headings, `Waiting:` = questions.md's open headings; the
  agent authors ONLY `Ship:`; freshness by SHA — the agent records `views.briefing.head`
  in status.json at regeneration; ⚠ only when HEAD ≠ recorded; the install-instrument
  claim at `agents/steward.md:62-66` is deleted (#29 builds the real one) and `:59-60`
  stops instructing a done/-move; lens item 21 — anchor the remaining protocol text to
  `<git root>/…` (`SKILL.md:55-56,79`, `commands/next.md:8`, `agents/steward.md:24`,
  `session-digest.js:76,78`); optional: a configurable backlog-age escalation for
  steward-sync (lens item 19's block half — config, no default). Contract v2 in
  `design/status-contract.md`.
- **Done-check:** commit the regenerated model → no ⚠; the hook's `Last:` equals the
  tail heading of log.md by construction on all 5 ships; a deliberately stale authored
  `Ship:` is the ONLY line that can lie; a real briefing over budget fails a deterministic
  check in the steward suite; a grep for "done/" over the steward protocol text hits only
  the pre-contract note; hook tests green.

## 17. Phase C — the push side redesigned under the quality-over-speed law (audit-2 Tier 2 items 14–16 + harness G7 + the prism run; Phase 3, Q15 ruling first)

- **What:** (0) with the #31 baseline numbers in the brief, ONE `/prism` run on the
  push-side question — verbatim brief + owner-named lens *what-I-actually-experience* in
  inbox `20260906-1500` — build the winner, re-measure; (1) **fold the per-prompt regex
  stack** — verification-rules + generalize-first + thorough-mode + pattern-menu → ONE
  UserPromptSubmit hook over a `{trigger, injection, budget, metric, provenance}` registry
  (each entry carries its byte budget and its #31 metric key, so an unread injection is
  visible); `++` injected once; the Generalize-First Gate leaves global CLAUDE.md for
  pattern-menu's footer; `@verify` stops restating always-on rules — EXECUTES Q15(c) if the
  owner takes it; (2) serena PreToolUse hook: matcher `Read|Grep|Glob`, advisory or raised
  thresholds (owner settings, owner session); alert-sounds `clear` off Python; (3) tail-read
  the transcript (`context.js:122-123`) — scan back to the last genuine user entry;
  (4) per-duty supply budget via `Promise.race` + a suite timing assertion that sync duties
  stay cheap (lens item 20); `DUTIES` discovered by shape (`lib/duties/index.js:59`).
  Economics may cut FIRES and SCOPE, never quality; every cut ships with a fail-open path.
- **Done-check:** the audit's `measure.js` before/after — plain prompt unchanged, `++`
  prompt −363 B, design prompt one block, global CLAUDE.md < 5 KB, UPS spawns ≥8 → 5, Stop
  spawns 5 → 3; a 170 MB transcript reads in < 100 ms with identical `toolCalls`; hint-
  followed and tail-bytes metrics moved in #31's second run; each injector fires only where
  its trigger holds.

## 33. Compaction guard — PreCompact snapshot + PostCompact "where we are" (harness G8, Phase 3; S)

- **Why:** no PreCompact/PostCompact registration exists anywhere (grep 0 this pass);
  every compared harness names goal drift through lossy summaries as a top failure (Manus
  recitation; OpenHands' condenser keeps head + tail). A long sitting on this repo compacts
  mid-task with nothing holding the goal.
- **What:** PreCompact hook: snapshot the live digest + the armed goal (#32) + the last
  recorded check (#28) to `.claude/kb/compact-<ts>.md`; PostCompact: re-inject a ≤1 KB
  "where we are" block (goal · last check · next step) — under the 10 KB law,
  demands-shaped; a compaction-preservation section in CLAUDE.md is the zero-mechanism
  companion. Presence-gated (a project with no kb/steward gets nothing).
- **Done-check:** force `/compact` mid-task → the next turn's first hook output names the
  task and the last check; the snapshot file exists; a no-memory project shows no output.

## 35. Sub-agents observed and insulated — SubagentStart/Stop trace, isolation policy per agent definition, modifier propagation mechanized (harness G10 + lens item 22; Phase 3; M)

- **Why:** agents are found by transcript scan (0.7.0 deferral); each inherits the 25.6 KB
  standing context; the 235 judge children paid the whole harness until the lean flags;
  prism's panel cost ~370k tokens; modifier propagation to sub-agents (`++`, `@verify`) is
  prose only. No SubagentStart/SubagentStop registration exists (grep 0 this pass).
- **What:** SubagentStart/SubagentStop hooks → one trace line per agent (type, ms, bytes
  returned; #30 schema) and the AUTHORITATIVE in-flight set for `defer()` (transcript scan
  stays the fallback); an isolation policy per agent definition — lean flags for judges,
  `tools`/`effort`/`maxTurns` floors for panel lenses; a PreToolUse hook (matcher `Agent`)
  that injects the prompt's active modifiers recorded home-side by prompt_id (lens
  item 22).
- **Done-check:** every dispatch in a sitting has a trace line; a Stop fire with agents in
  flight shows `deferred: N` sourced from the hook set; judge children show 0 hook fires in
  their own transcripts; `++ do X` then an Agent dispatch → the child's context contains
  `[thorough-mode]`; a prism panel with `effort: medium` lenses ≤ 150k tokens.

## 34. Soft budgets — a per-sitting budget line that prints, never blocks (harness G9, Phase 4; S)

- **Why:** cost is recorded (0.7.0 `costUsd`) and never enforced or even TOLD to the
  session; 235 judge children; prism 370k tokens; every compared harness caps iterations
  or dollars, and OpenHands' known defect is an agent never told its budget. Invariant 8: a
  guard prints, it does not block.
- **What:** a per-sitting budget ledger (agents dispatched, judge cost, tokens where
  reported) with soft thresholds that print ONE tail line — thresholds are owner-set via
  config, Claude ships NO default number (the no-arbitrary-thresholds rule); `maxTurns` +
  `effort` on every shipped agent definition; the budget line is COMMUNICATED in the tail.
- **Done-check:** trace shows `budget: {agents: n, judge_usd: x}`; crossing a configured
  threshold prints once per sitting; nothing is ever blocked; suites green.

## 36. Harness replay gate — the audit's transcript-replay scripts become a `test-all` suite (harness G13, Phase 4; S/M)

- **Why:** a 3% injection regression is invisible today; Anthropic re-runs evals on every
  system-prompt change; the audit's replay scripts sit in a scratchpad.
- **What:** `plugin-toolkit/bin/harness-replay.js` runs every hook over RECORDED payloads
  (fixtures in-repo, scrubbed of paths) and diffs the #31 scorecard against the committed
  baseline; test-all discovers it by shape; later `claude plugin eval` cases per plugin
  if/when early access lands.
- **Done-check:** a deliberate 400 B injection bump shows as a red delta; the sweep still
  runs with no network/judge spawn; test-all `--root` green.

## 21. Patterns 0.1.1 — finish the interactive legs, then execute Q15's answer

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
  not decided. Audit 2: install fidelity 16/16 (installed == repo).
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

## 3. Extract autopilot's `decide()` so it can become a duty (closes invariant 9; harness G12 leg)

- **What:** essense-autopilot still owns a blocking `Stop` hook and IS installed
  (user-scope); 0.4.1 stands it down cheaply without `.pipeline/` but it stays REGISTERED.
  Its decision logic is welded into `main()` — only `countInFlightAgents` is exported
  (`plugins/essense-autopilot/hooks/scripts/autopilot.js:421`). Extract a PURE
  `decide(state) -> {advance|halt, reason}` in that plugin, then register a turn-end duty
  that consumes it. Owner direction: "autopilot should become a duty." Do NOT re-implement
  a thinner "what's next" inside turn-end — that creates a competing source of truth.
  NOTE: 0.7.0's `lib/deferral.js` is now the generic in-flight-agent reader; the duty
  should consume it, not `countInFlightAgents`.
- **Done-check:** `decide()` exported and unit-tested against the existing halt cases;
  the turn-end duty returns the same verdict for the same state; autopilot's `hooks.json`
  no longer registers a Stop hook; enabled Stop-hook registrations across plugins = 1; a
  pipeline project shows ONE tail with both items.

## 4. Prove which kb MCP build is answering (collect the evidence)

- **What:** no server-side `kb_query`/`kb_read` trace line has ever been confirmed
  post-restart. A stdio server keeps the code it was launched with, so `kb_overview`
  should report the freshly-installed build. Audit 2 counted 38 MCP calls fleet-wide but
  did not read the version. Same class as G1 (#29) — a restart is step zero.
- **Done-check:** one `kb_overview` call reports `version: 0.12.0` AND a
  `kb_query`/`kb_read` line with a post-restart timestamp appears in the trace. Both, or
  the leg is not closed.

## 5. Crowd-game: commit its config, run the DEEP seed, and collect the post-fix turn-end data

- **What:** crowd-game is DORMANT since 08-02 — it has ZERO post-fix turn-end data. Next
  crowd-game session: (a) commit the written-but-uncommitted `.claude/kb.json`; DROP its
  `scribe.focus` (no consumer anywhere — this repo's copy was migrated at #26) — port to
  `.claude/turn-end.json` `duties.session-digest.important` only if it should still apply;
  (b) the user-scope installs now carry the timeout + digest-theft + root-anchor + 0.7.0
  fixes — restart, then watch the first real fires; (c) re-run `/kb-seed` under the depth
  mandate, running `kb coverage` FIRST — the first real test that re-seed is incremental
  BY MECHANISM; (d) copy the `game-project.yaml` lens preset into
  `.claude/verifiability-lens/profile.yaml`; (e) delete the stray
  `.claude/prompts/.claude/verifiability-lens/state.json`; (f) audit-2 chores: untrack the
  11 MB PNG evidence; delete the CONSUMED duplicate inbox item.
- **Also record while there:** every hand-driven query that MISSES, classified —
  splitter / vocabulary / ranking / genuinely-absent (feeds #11).
- **Done-check:** config committed there; `kb coverage` shows previously-uncovered
  substrate now cited; a turn-end trace line with a completed judge verdict AND
  `"deferred"`; a hand-driven query finds a fact only the deep sweep could reach; the miss
  list exists in writing, even if it reads "none found".

## 6. Make documented counts and claims derivable, not remembered

- **What:** registry-check covers versions/listings/paths — extend the same pattern to
  what it does not cover: test counts and hook-registration prose. Phase 1's `[instr]`
  lines subsume the VOLATILE half; #8 takes the briefing's narrative lines; this sweep
  keeps the STATIC prose half. Open instances, each read from the file that claims it:
  test-all totals (re-run `node plugins/plugin-toolkit/bin/test-all.js --root <repo>` and
  let ITS output be the number — last push gate 33/33 suites / 1,783) · plugin-toolkit
  1.10.0 RELEASE-NOTES entry (last verified missing 08-01) · RELEASE-NOTES 1.9.0
  checks.yml claim (wording per Q12's answer) · 613 Python glossary-engine checks in no
  documented total · moved-content references from the 07-31 restructure · marketplace
  metadata non-bump convention (decide, then bump-or-drop) · steward CLAUDE.md test-count
  line (README says 45+13 since #26 — re-read the CLAUDE.md side). Prefer printing the
  command over the number wherever the number earns nothing.
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
  --root` runs report all-green (33/33 at the 09-06 push). One TRANSIENT essense-flow red
  on a first parallel sweep (08-23, stale-lock timing suspect) was never reproduced. Run
  the suite DIRECTLY first. If red: author the archive sibling (the root fix; raising the
  threshold re-fires in 30 days) AND find why test-all's shape-discovery missed it. If
  green: find what fixed it and record it. Also the precondition for Q12(b)/(c) if the
  owner wants CI back.
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
  parked; after #27 ships, re-measure the hint-followed ratio (#31) and the miss classes
  (#5's crowd list adds the second corpus); bring the Q9 ladder to the owner ONLY if
  misses are then vocabulary-class.
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
  Endure — untrack `.claude/turn-end`, drop `inbox/.README.md` (a phantom only until the
  contract runs there); crowd — #5(f). Surfaces the per-ship git-policy divergence
  (owner call per project). Every ship: RESTART after update (G1).
- **Done-check:** the fleet table matches a spot audit on all five ships; one downstream
  friction event reaches this repo via harbor instead of waiting for an audit.

## 14. Crowd-game steward evaluation (~5 sessions or ~1 week after its deep seed)

- **What:** re-run the 2026-07-21 audit methodology on crowd-game transcripts; 5 signals,
  full rules preserved verbatim in
  `.steward/inbox/done/20260721-2345-eval-measurement-recipe.md`. The 08-23 + 09-06
  audits cover the OTHER ships; this is the crowd-specific before/after — and once #31
  exists, its numbers replace the hand method.
- **Done-check:** before/after table with confidence notes. **Owner annoyance = veto
  regardless of numbers.** Unlocks the deferred drop-channel decision (Q8).

## 15. Phase A — wire the gates (on this repo; v3 resumes here, after the spine phases)

- **What:** coupling/extensibility + tests into every executor step; a deterministic
  model-vs-code drift check (parts.md contracts vs `runner map`). test-all +
  registry-check + repo-guard + (#31) harness-stats are the gate family #6 extends —
  reuse, don't re-derive. Respect the coupling scope limit: per project, never across the
  marketplace. Ambient sessions are in scope (08-26 HFDP wish): patterns 0.1.1 covers the
  VOCABULARY + pre-write nudge; what remains here is the MEASUREMENT half —
  coupling/extensibility checks on source-writing turns. **Precondition (lens item 18):**
  the code-glossary signature signal is DEAD for JS/untyped params
  (`signals/signature.py:46-48`; `with_signature_hash` 0/128 on plugins/kb) — derive an
  arity/param-name signature or document the dead signal before any gate reads it. The
  essense-flow-side consumers join ONLY if Q14 resolves (b)/(c); default (a) keeps them
  unbuilt. Q17's code-glossary-as-`@ship`-gate default lands here if taken.
- **Done-check:** `with_signature_hash > 0` on plugins/kb; a deliberate reach-in fails a
  hand-back; a stale parts.md entry is flagged; an ambient turn that adds a closed dispatch
  on a declared growth axis gets flagged by mechanism, not by rule text.

## 16. Phase B — harden the steward

- **What:** adversarial inbox suite (pivot, vision-contradiction, deletion, duplicate,
  items superseding each other, an item whose defects disk already fixed — integrates as
  DONE with zero tasks); recurring spot-check re-injection; verbs /discuss /test /work
  (+ `steward:goal` from #32). RECONCILED vs the blueprint: the orphan-`.steward/`
  detector + frontmatter warnings + digest size guard live in blueprint Phase 4, not here;
  Q10's second-staleness-signal remainder is SUPERSEDED by Phase 1 cursors; the briefing's
  computed lines are #8.
- **Done-check:** each adversarial item produces a correct diff incl. cascaded deletions;
  spot-check fires periodically in normal use.

## 18. Phase D — generalization pass

- **What:** extract anything mk-cc-resources-specific from the loop after the #14 eval;
  verb set + model structure prove open or get fixed; /kb-seed generalization rides the
  same pass; Q16's answer (zero-setup memory = harness G11) is the on-ramp this phase
  ships. Then EMDE/psience/BiananceRepo — the two ships where the owner measurably felt
  the loss.
- **Done-check:** the next project onboards by steward-seeding + kb-seeding alone — no
  tooling code changes.

## 19. Phase E — retire ceremony officially [Q4, Q5, Q17 land here; harness G12 + the "stale harness" rule]

- **What:** docs + marketplace reposition; classic pipeline preserved (frozen per Q17's
  default); essense-autopilot retires (Q4 — #3 may make this a deletion rather than a
  migration); session-lifecycle + reuse-gate per Q17. Standing rule from the harness
  research (Claude's, from Anthropic's practice): on every model release re-run
  `harness-stats` (#31) and remove any mechanism whose metric is flat. Absorption fodder:
  handoff/resume redundant in steward projects (measured: 0 uses ever); retro/meta-review
  → steward verbs; truth split memory=owner / model=project / CLAUDE.md=code /
  kb=queryable everything.
- **Done-check:** enabled Stop-hook registrations = 1; spawns per prompt ≤ 6; a new toy
  project goes idea → running slice through the steward loop only, in one evening.
