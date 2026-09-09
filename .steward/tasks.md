# Tasks — ordered, executor-ready (recomputed 2026-09-09 · Phase 0 CLOSED at 68ce999 · Q15/Q16/Q18/Q19 law · numbers are stable ids, file order is the order; next free id 39)

> Read this before doing anything:
> - Limits-awareness: Claude drifts, loses context, finishes prematurely, defers, takes shortcuts. Re-read when uncertain. Preserve specifics.
> - Positive mindset: every gap solvable. Find the way by working carefully.
> - Quality ownership: this work matters. Take ownership.
> - Propagation requirement: every descendant artifact must carry these same four instructions.

**Ordering rationale (2026-09-09 recompute).** Phase 0 (#29 #27 #28) is CLOSED as built +
shipped `68ce999` + installed — NOT yet running in the owner's process, so its live legs ride
#1(f) beside Tier 1's (e): one restart proves both ships, and since 0.7.1 the ship itself
prints whether it is running. Phase 1 (#30 #31) is next and unblocked. Phase 2 (#32 #8) is
UNBLOCKED by the 09-09 rulings: #32 arms every task the owner starts, advise, satisfied by
the 0.8.0 exec ledger (ran-and-observed). Phase 3 shrinks — Q15 ruled SLIM ONLY, so #17
loses its registry-fold leg and keeps the prism run + the runtime cuts; #33 #35 unchanged.
Phase 4 (#34 #36). **Phase 4b — the owner's two-axes wish** (#37 code-design duty + `@ship`
design gate; #38 knowledge lifecycle + garden job): preconditions are #28 (built) and
#30/#31, so either may be pulled forward by an owner pick the moment Phase 1 lands. Under
invariant 12 (ratified 09-09) every task below that ships a mechanism names its METRIC KEY
in its done-check — no key, not done. The rest keeps its relative order. #13 stays deleted;
ids 1–38 are stable, never reused.

**Hygiene rule for this file:** `.steward/` model files are COMMITTED to a PUBLIC repo
(only `inbox/` is gitignored). Never write an absolute path, username or machine-specific
detail here — name projects, not drives. Under invariant 13, a task's done-check is what the
executor RUNS; the owner reads the outcome in the session, never this file.

## 30. Trace schema v1 + lens telemetry — every evaluator leaves a line (harness G4, Phase 1; S/M) — NEXT

- **Why:** the lens has 27 dispatches and ZERO trace — its value is unmeasurable; the
  judge's pick is nondeterministic (Q20) and `chosen` is empty in ~50% of supplies;
  turn-end (now with `version`/`stale`/`alreadyRead`), kb-pull (now with
  `session_id/prompt_id/held/scores/digest mode/bytes`) and the brief hook each write their
  own trace shape — three writers, no contract. Anthropic's law: every harness component
  encodes an assumption that goes stale — you can only take out what you can measure.
- **What:** one schema shared by turn-end, kb, lens, patterns, thorough-mode —
  `{t, plugin, hook|duty|agent, version, session_id, prompt_id, ms, cost_usd?, engine?,
  decision, bytes, acted_on?}` (each plugin keeps its OWN writer — plugins install
  standalone; the schema is a documented contract + a shared drift test, the
  machine-guard precedent; the 0.7.1 `version` field and 0.13.0 kb-pull fields are already
  v1-shaped — keep them); lens rollup appends `{a, b, u, escalations, refuted, verified}`
  from `/verifiability` and the quality-lens duty; `acted_on` derived at the NEXT prompt
  (did the session touch a hinted/escalated path? — the 0.8.0 file-touch extractor is the
  reader); the judge writes agreement inputs (index size, chosen ids, `alreadyRead`) so
  Q20's check is computable from disk. The advancing-vs-oscillating classifier stays parked
  until this shows escalations get acted on.
- **Done-check:** one lens dispatch → one line; refute/confirm and acted-on ratios
  computable from disk; a deliberately malformed line fails the drift test; touched suites
  green. **Metric key:** `trace.lines_per_dispatch` (lens ≥ 1) and `acted_on` computable.

## 31. `harness-stats` — the scorecard: one gate over drop-in METRIC sources (harness G5 + the inbox-1500 scorecard; Phase 1; absorbs the deleted #13's gate)

- **Why:** "does it do anything?" took two audits and seven agents (08-23, 09-06); the
  audit's method lives in a session scratchpad; the owner's own frame is *"result based"*;
  the metric rule is now LAW (invariant 12, Q18) — this is the thing that reads the keys,
  and without it no key means anything.
- **What:** `plugin-toolkit/bin/harness-stats.js`, a pure runner over `lib/metrics/` (the
  repo-guard detector shape: one context gathered once, silence is a finding, a crashed
  source is reported not skipped) over traces + `checks.jsonl` + transcripts + status.json +
  log.md: hint-followed % (strict/loose; baseline 7%/16% — first re-measure since 0.13.0's
  dedupe), tail bytes p50/p95 + % under the bound, kb-pull bytes + `cut|pointer` mix, judge
  ms p95 + engine mix + agreement (from #30), blocks + wasted nudges per prompt + self-check
  nudges that named a real mutation (0.8.0), briefing-vs-log contradictions (computable
  once #8 derives the lines), spawns per prompt (baseline ≥8 UPS + 5 Stop), running≠installed
  (#29's line count); the audit's scripts become the first sources; printed as ONE `[instr]`
  line at open + full on demand. **Under invariant 13 the full report renders IN the
  session** — never "see the file".
- **Done-check (the gate the old #13 carried):** run once on this repo → numbers reproduce
  audit 2 within 3% on the overlapping metrics; the owner picks (one keystroke, batched)
  which numbers earn a standing `[instr]` place — nothing ships always-on without that pick;
  a second run after #32 shows the deltas. **Metric key:** the scorecard IS the key registry;
  a plugin whose key is absent from a run is NAMED.

## 1. Dogfood — the live check after the restart: status spine + the 0.7.0 AND 0.8.0/0.13.0/0.5.2 ships (standing watch; gates Phase 2, #12)

- **Why #1 stays open:** two ships (Tier 1 at `bc39fe0`, Phase 0 at `68ce999`) are BUILT,
  PUSHED and INSTALLED; neither is proven by disk alone. Measured this pass: trace.jsonl
  138 lines, `"version"`/`"stale"` = 0, `samples/` absent — the owner's process still
  predates BOTH updates. Step zero of every leg is a RESTART; since 0.7.1 the briefing's
  `[instr] running …` line says whether it happened.
- **Legs + status:** (a) staleness — ⚠ right 5/5; false git-HEAD ⚠ + authored prose wrong
  4/5 → #8; (b) fallback fires — 0.7.0 traces `engine`/`ms`/`costUsd`; readable the moment
  a 0.7.0+ line exists; (c) ledger truth — CLOSED (#24); (d) statusline — correct;
  (e) 0.7.0 live legs — a Stop trace line with `engine`, `ms`, `lean`, `deferred`,
  `payload_keys`; a tail under 9,000 chars with demands first; no kb-pull fire inside a
  judge child; `[instr] items: N new (oldest Nd)`; one real wake-turn ending on the owner's
  request (request-closure, never yet observed live); **(f) Phase 0 live legs** — the
  first Stop line carries `"version":"0.8.0"` and NO stale prefix, the `[instr] running`
  line is ABSENT after the restart; the first Bash call writes `samples/PostToolUse.json`
  and `checks.jsonl` grows (the recorder's real fixtures — read them and fix the parser if
  the keys differ from the guess); kb-pull ≤ 8,192 B, `digest: cut` then `pointer`, no
  repeated hint id in one session, the `kb_query` cue seen; one self-check nudge naming a
  real un-checked mutation, one silent allow on a named check. Any new failed leg becomes
  an inbox item, not a hotfix.
- **Done-check:** each leg observed at least once with zero UNEXPLAINED instrument lies AND
  legs (b), (e), (f) read from trace lines carrying `"version"`; then #12 unblocks.

## 32. Goal duty — the armed task's done-check becomes the loop's termination criterion (harness G3, Phase 2; M) — UNBLOCKED by Q18/Q19

- **Why:** no goal-based termination exists in the layer; "stopping while there is planned
  work" (owner, twin 08-12) is prose; Anthropic's harnesses hold the loop to a checked list;
  the steward already keeps per-task done-checks — the criterion exists, nothing consumes
  it. **Owner ruling 09-09 (Q18):** the duty arms EVERY task the owner starts (`do it` /
  `steward:next`); one tail line if the session yields with the done-check unmet; advise,
  never block. The first mechanism built under invariant 12.
- **What:** a session-scoped turn-end DEMAND duty `goal`, `severity: advise`, armed by
  `steward:next` / an owner "do it" on a task (the base still supports explicit
  `steward:goal <n>` and machine-checkable-only as config, never default): criterion = the
  armed task's done-check from `tasks.md` / `status.json`; satisfied by the 0.8.0
  `checks.jsonl` (a check RAN after the last mutation and was observed — Q19; `requireGreen`
  per project) or an explicit owner "stop"; capped by fires (3), never by a promise phrase;
  `defer()` while agents are in flight (0.7.0 primitive). Prose done-checks go through a
  turn-end JUDGE inside the one tail (lens escalation 1 — never a second Stop hook), off by
  default. `/goal` itself EXCLUDED (harness §9.5 default, invariant 1): the goal lives in
  the one tail. TaskCreated/TaskCompleted (if the platform exposes them) → status ledger
  entries, never a second task list. The nudge text obeys invariant 13: it names the task
  and the check to run, in the tail, not a file.
- **Done-check:** arm #30 → a turn that yields without its check → exactly one tail line
  naming the task and the check; after the suite goes green (recorded in `checks.jsonl`) →
  silent; a sitting with no armed goal shows no line; turn-end + steward suites green.
  **Metric key:** `goal.met_before_yield` (sittings whose armed task's check ran before the
  last yield / armed sittings) + `goal.nudge_heeded`.

## 8. Briefing: compute what drifts, author only what cannot be computed (audit-2 Tier 2 item 12; Phase 2; absorbs the write-time budget check + lens item 21)

- **Why:** the authored briefing BODY (Ship/Last/Next) is contradicted by the log's last
  entry in 4 of 5 ships — regenerated only at integration, it lags one session; the
  instruments are RIGHT everywhere (three of them since 0.5.2). Plus a false ⚠ on
  `git-HEAD` after committing the regenerated model (`steward-brief.js:63-67` reads the
  ref file's mtime). The 08-23 ruling was "authored narrative + COMPUTED instruments" —
  this moves the drifting narrative lines to the computed side. Nothing checks a real
  briefing's budget at write time either — computing the lines makes that moot. Invariant
  13 sharpens the target: the briefing is the owner's READING, so every line must be true
  at the moment it is read.
- **What:** the hook prints `briefing: <date> (<age>d)`, `Last:` = log.md's last heading,
  `Next:` = tasks.md's top-3 headings, `Waiting:` = questions.md's open headings; the
  agent authors ONLY `Ship:`; freshness by SHA — the agent records `views.briefing.head`
  in status.json at regeneration; ⚠ only when HEAD ≠ recorded; `agents/steward.md:59-60`
  stops instructing a done/-move (the `:62-66` install-instrument claim is now TRUE — #29
  built it, nothing to delete); lens item 21 — anchor the remaining protocol text to
  `<git root>/…` (`SKILL.md:55-56,79`, `commands/next.md:8`, `agents/steward.md:24`,
  `session-digest.js:76,78`); optional: a configurable backlog-age escalation for
  steward-sync (lens item 19's block half — config, no default). Contract v2 in
  `design/status-contract.md`.
- **Done-check:** commit the regenerated model → no ⚠; the hook's `Last:` equals the
  tail heading of log.md by construction on all 5 ships; a deliberately stale authored
  `Ship:` is the ONLY line that can lie; a real briefing over budget fails a deterministic
  check in the steward suite; a grep for "done/" over the steward protocol text hits only
  the pre-contract note; hook tests green. **Metric key:** `briefing.contradictions`
  (briefing-vs-log, #31) = 0 by construction on computed lines.

## 17. Phase C — the push side re-economized under the quality-over-speed law (audit-2 Tier 2 items 15–16 + harness G7 + the prism run; Phase 3) — registry-fold leg OFF (Q15 SLIM ONLY, 09-09)

- **What:** (0) with the #31 baseline numbers in the brief, ONE `/prism` run on the
  push-side question — verbatim brief + owner-named lens *what-I-actually-experience* in
  inbox `20260906-1500` — build the winner, re-measure; (1) ~~fold the per-prompt regex
  stack into ONE registry hook~~ — REMOVED by the Q15 ruling: every hook stays as it is;
  the global CLAUDE.md slim is DONE (6,528 → 5,228 B); the text surfaces retire only as
  #37's measured duty proves itself; (2) serena PreToolUse hook: matcher `Read|Grep|Glob`,
  advisory or raised thresholds (owner settings, owner session); alert-sounds `clear` off
  Python (one of the ≥8 spawns); (3) tail-read the transcript (`context.js:122-123`) — scan
  back to the last genuine user entry; (4) per-duty supply budget via `Promise.race` + a
  suite timing assertion that sync duties stay cheap (lens item 20); `DUTIES` discovered by
  shape (`lib/duties/index.js:59`). Economics may cut FIRES and SCOPE, never quality; every
  cut ships with a fail-open path.
- **Done-check:** the audit's `measure.js` before/after — plain prompt unchanged, Stop
  spawns 5 → 3, one fewer UPS spawn; a 170 MB transcript reads in < 100 ms with identical
  `toolCalls`; hint-followed and tail-bytes metrics moved in #31's second run; each
  injector fires only where its trigger holds. **Metric key:** `push.bytes_per_prompt`
  p50/p95 + `push.spawns_per_prompt` (#31).

## 33. Compaction guard — PreCompact snapshot + PostCompact "where we are" (harness G8, Phase 3; S)

- **Why:** no PreCompact/PostCompact registration exists anywhere (grep 0 on 09-08);
  every compared harness names goal drift through lossy summaries as a top failure (Manus
  recitation; OpenHands' condenser keeps head + tail). A long sitting on this repo compacts
  mid-task with nothing holding the goal — and 0.13.0 already had to teach kb-session-start
  that compaction discards the transcript's digest copy.
- **What:** PreCompact hook: snapshot the live digest + the armed goal (#32) + the last
  recorded check (`checks.jsonl`, #28) to `.claude/kb/compact-<ts>.md`; PostCompact:
  re-inject a ≤1 KB "where we are" block (goal · last check · next step) — under the
  platform bound, demands-shaped; a compaction-preservation section in CLAUDE.md is the
  zero-mechanism companion. Presence-gated (a project with no kb/steward gets nothing).
- **Done-check:** force `/compact` mid-task → the next turn's first hook output names the
  task and the last check; the snapshot file exists; a no-memory project shows no output.
  **Metric key:** `compact.recovered` (post-compact turns whose first output named the
  armed task / compactions).

## 35. Sub-agents observed and insulated — SubagentStart/Stop trace, isolation policy per agent definition, modifier propagation mechanized (harness G10 + lens item 22; Phase 3; M)

- **Why:** agents are found by transcript scan (0.7.0 deferral); each inherits the 25.6 KB
  standing context (25.2 after the slim); the 235 judge children paid the whole harness
  until the lean flags; prism's panel cost ~370k tokens; modifier propagation to sub-agents
  (`++`, `@verify`) is prose only. No SubagentStart/SubagentStop registration exists.
- **What:** SubagentStart/SubagentStop hooks → one trace line per agent (type, ms, bytes
  returned; #30 schema) and the AUTHORITATIVE in-flight set for `defer()` (transcript scan
  stays the fallback); an isolation policy per agent definition — lean flags for judges,
  `tools`/`effort`/`maxTurns` floors for panel lenses; a PreToolUse hook (matcher `Agent`)
  that injects the prompt's active modifiers recorded home-side by prompt_id (lens
  item 22).
- **Done-check:** every dispatch in a sitting has a trace line; a Stop fire with agents in
  flight shows `deferred: N` sourced from the hook set; judge children show 0 hook fires in
  their own transcripts; `++ do X` then an Agent dispatch → the child's context contains
  `[thorough-mode]`; a prism panel with `effort: medium` lenses ≤ 150k tokens. **Metric
  key:** `agents.traced` (dispatches with a line / dispatches) + `agents.bytes_inherited`.

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
  threshold prints once per sitting; nothing is ever blocked; suites green. **Metric key:**
  `budget.crossings` per sitting + `budget.judge_usd`.

## 36. Harness replay gate — the audit's transcript-replay scripts become a `test-all` suite (harness G13, Phase 4; S/M)

- **Why:** a 3% injection regression is invisible today; Anthropic re-runs evals on every
  system-prompt change; the audit's replay scripts sit in a scratchpad; the 0.8.0
  recorder's `samples/` are the first REAL hook payload fixtures the repo will own.
- **What:** `plugin-toolkit/bin/harness-replay.js` runs every hook over RECORDED payloads
  (fixtures in-repo, scrubbed of paths — the `samples/` shape) and diffs the #31 scorecard
  against the committed baseline; test-all discovers it by shape; later `claude plugin
  eval` cases per plugin if/when early access lands.
- **Done-check:** a deliberate 400 B injection bump shows as a red delta; the sweep still
  runs with no network/judge spawn; test-all `--root` green. **Metric key:** the replay
  delta itself.

## 37. Code-design duty + `@ship` design gate — "better codebases as context enriches" measured, not texted (owner 2026-09-08; harness G14 / §7.7; Phase 4b; M) [severity: Q22]

- **Why:** owner, verbatim: *"as new things are added and context is enriched we need to be
  designing better code. code is cheap now so we need to be designing better codebases."*
  Today the concern has five TEXT surfaces (kept by Q15) and one advisory pre-code gate —
  the shape invariant 3 rejects; the measured substrate (code-glossary's extensibility
  measure, dispatch scanner, coupling, DRY clusters — 2.1 s on `plugins/kb`, 8 real
  clusters) never runs ambiently. Instance-shaped output is a failure invariant 7 cannot
  SEE. Preconditions now met: the 0.8.0 file-touch extractor names the files a turn
  touched; #31 gives the key a reader.
- **What:** (1) a turn-end DEMAND duty `design` (advise by default; Q22 may raise `@ship`
  to block) that computes the DELTA on the touched files, per project only (invariant 7's
  scope limit): new switch-on-subtype / hard-coded concrete target, coupling edges added, a
  duplicate cluster that gained a member, extensibility score down — fires ONLY on a
  regression, names file:line + the catalog seam that closes it ("second `switch` on
  `kind` in hooks/ → registry dispatch; see /patterns registry-dispatch"); a cluster
  reaching THREE members demands an extraction decision (extract / accept with reason),
  never silently; the duty SAYS which signals ran (the signature signal is dead for untyped
  params — #15's precondition, fix or declare); (2) the `@ship` gate: the same measures as
  blocking checks against a per-project baseline file, so a ship cannot lower the score
  (Q17's ★ for code-glossary, sharpened); (3) learning: every regression is a capture
  candidate with its pattern id; recurring ones become `patterns.json` examples (data);
  (4) the Q15-kept text surfaces retire as the duty's regressions-caught count goes
  non-zero over a week. Drop-in surfaces: measures (`code_glossary/` signals), catalog
  entries, per-project thresholds (owner-set, no Claude default).
- **Done-check:** seed a `switch (kind)` in a hook → the duty names file:line +
  `registry-dispatch`; a third member joining a cluster → an extraction demand; `@ship`
  with a lowered score → exit 1 with the measure named; an untyped-JS turn → the duty says
  which signals were blind; turn-end + toolkit suites green. **Metric key:**
  `design.regressions_caught` per sitting + `design.text_bytes_retired`.

## 38. Knowledge lifecycle + garden job — "store less, mark wrong things, keep learning" (owner 2026-09-08; harness G15 / §7.8; Phase 4b; M) [removal authority: Q21]

- **Why:** owner, verbatim: *"we are storing too many things. we should be able to clean up
  wrong things or things that are not necessary and also keep learning from what we are
  seeing."* Measured: standing 25.6 KB per session AND per sub-agent; log 82 KB, parts
  49 KB; 23 archived digests titled by stamp = noise hits; 84% of hints unread; no
  lifecycle on kb entries — the status contract has one for inbox items only. Precondition:
  #30's `acted_on` trace gives the usage measure.
- **What:** (1) extend the status contract's item types to kb entries — `live |
  superseded-by:<id> | refuted-by:<id> | archived` in `status.json` (steward = only writer),
  joined at collect (the 0.11.0 `status-join` shape, zero engine change); the engine holds
  non-live entries back by default and SAYS so ("2 superseded held back"); history stays;
  (2) deterministic measures — per entry: pulls, hint slots, acted-on over the last N
  sittings; per file: bytes injected standing (CLAUDE.md, MEMORY.md, briefing, digest);
  contradictions (briefing vs log; two captures with opposing claims — the lens flags);
  never-used-in-N + never-cited = archive candidate; the "would removing this cause a
  mistake?" test applied to every CLAUDE.md line; (3) the GARDEN job — a steward verb,
  background, one per sitting like `integrate`, proposing merges / supersessions /
  archives / CLAUDE.md cuts as ONE diff the owner ratifies in-session (Q21 sets what may be
  automatic; invariant 13: one keystroke per batch, never a file to read); log compaction
  (#9's archive sibling) is one of its motions; the lens's refute/confirm marks
  `refuted-by`; (4) sweep the residual kb defects on the way: `source` facet unfilterable,
  stamp-titled archived digests as noise, 8-digit runs read as timestamps, BOM defeating
  frontmatter. Drop-in surfaces: status types (data), measures, garden motions.
- **Done-check:** mark a capture `refuted-by` → it leaves the hints and `kb_query` says
  "1 refuted held back"; the garden diff proposes ≥1 CLAUDE.md cut WITH its measure; a
  stamp-titled digest no longer wins a hint slot; kb + steward suites green. **Metric key:**
  `knowledge.standing_bytes_per_session` (trend down across two sittings) +
  `knowledge.held_back` + `knowledge.never_acted_on`.

## 21. Patterns 0.1.1 — finish the interactive legs (Q15's answer is EXECUTED)

- **Why:** pushed + installed 08-27, menu hook live in a scratch session; `/patterns` was
  never invoked in any real session since (audit 2) — the interactive legs are still
  owner-session work. Q15 is RULED (slim only) and APPLIED 09-09 — step 2 CLOSED.
- **What:** (1) `/patterns` try-out + one real gate fire in the owner's interactive
  session; (2) ~~Q15's answer~~ DONE; (3) the one-line catalog citation in essense-flow
  `generativity-protocol.md` + `code-conventions.md` (pipeline points at ambient; no
  ownership move). #37 later makes the catalog the duty's remediation vocabulary.
- **Done-check:** both hooks observed in the owner's session once each; citation lines
  present or explicitly declined.

## 2. Ratify the distribution layout the /doctor session set — or change it [needs owner]

- **Why:** on 2026-07-31 the owner approved: mk-cc-all bundle DISABLED + plugin-toolkit
  standalone INSTALLED (user scope). That is a STATE change, not a decision close: the
  picker-duplication objection is voided only while the bundle stays off; the stale
  `ab1ba82` bundle cache is DORMANT and returns the day it is re-enabled; what a PUBLIC
  marketplace user should install (README/marketplace prose still centers the bundle) was
  not decided. Audit 2: install fidelity 16/16 (installed == repo); 09-09: the three
  updated plugins installed at `68ce999` == HEAD.
- **What:** (1) decide with the owner (one keystroke): keep bundle-off + per-plugin
  standalone as THE layout (then reposition README/marketplace prose), OR restore a slimmed
  bundle (drop the six toolkit skills so both coexist), OR revisit the parked
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
  no longer registers a Stop hook; BLOCKING Stop-hook registrations across enabled plugins
  = 1; a pipeline project shows ONE tail with both items.

## 4. Prove which kb MCP build is answering (collect the evidence)

- **What:** no server-side `kb_query`/`kb_read` trace line has ever been confirmed
  post-restart. A stdio server keeps the code it was launched with, so `kb_overview`
  should report the freshly-installed build. Audit 2 counted 38 MCP calls fleet-wide but
  did not read the version. Same class as G1 — turn-end/steward now print theirs (#29);
  the MCP server's `kb_overview` is the equivalent read. A restart is step zero.
- **Done-check:** one `kb_overview` call reports `version: 0.13.0` AND a
  `kb_query`/`kb_read` line with a post-restart timestamp appears in the trace. Both, or
  the leg is not closed.

## 5. Crowd-game: commit its config, run the DEEP seed, and collect the post-fix turn-end data

- **What:** crowd-game is DORMANT since 08-02 — it has ZERO post-fix turn-end data. Next
  crowd-game session: (a) commit the written-but-uncommitted `.claude/kb.json`; DROP its
  `scribe.focus` (no consumer anywhere — this repo's copy was migrated at #26) — port to
  `.claude/turn-end.json` `duties.session-digest.important` only if it should still apply;
  (b) the user-scope installs now carry the timeout + digest-theft + root-anchor + 0.8.0
  ground-truth + 0.13.0 bounded-pull fixes — restart (the `[instr] running` line confirms
  it), then watch the first real fires; (c) re-run `/kb-seed` under the depth mandate,
  running `kb coverage` FIRST — the first real test that re-seed is incremental BY
  MECHANISM; (d) copy the `game-project.yaml` lens preset into
  `.claude/verifiability-lens/profile.yaml`; (e) delete the stray
  `.claude/prompts/.claude/verifiability-lens/state.json`; (f) audit-2 chores: untrack the
  11 MB PNG evidence; delete the CONSUMED duplicate inbox item.
- **Also record while there:** every hand-driven query that MISSES, classified —
  splitter / vocabulary / ranking / genuinely-absent (feeds #11).
- **Done-check:** config committed there; `kb coverage` shows previously-uncovered
  substrate now cited; a turn-end trace line with a completed judge verdict AND
  `"version"`; a hand-driven query finds a fact only the deep sweep could reach; the miss
  list exists in writing, even if it reads "none found".

## 6. Make documented counts and claims derivable, not remembered

- **What:** registry-check covers versions/listings/paths — extend the same pattern to
  what it does not cover: test counts and hook-registration prose. Phase 1's `[instr]`
  lines subsume the VOLATILE half; #8 takes the briefing's narrative lines; this sweep
  keeps the STATIC prose half. Open instances, each read from the file that claims it:
  test-all totals (re-run `node plugins/plugin-toolkit/bin/test-all.js --root <repo>` and
  let ITS output be the number — last ship gate 33/33 suites / 1,849) · plugin-toolkit
  1.10.0 RELEASE-NOTES entry (last verified missing 08-01) · RELEASE-NOTES 1.9.0
  checks.yml claim (wording per Q12's answer) · 613 Python glossary-engine checks in no
  documented total · moved-content references from the 07-31 restructure · marketplace
  metadata non-bump convention (decide, then bump-or-drop) · steward CLAUDE.md test-count
  line (50 + 13 since 0.5.2 — re-read the CLAUDE.md side) · the hook-event table in root
  CLAUDE.md now that turn-end registers PostToolUse. Prefer printing the command over the
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
  (root cwd, direct exit read) still exits 0 AND `node plugins/essense-flow/test/run-all.cjs`
  reports zero failures.

## 9. Adjudicate the essense-flow reds: ledger-compaction (calendar) AND the run-all intermittent under the sweep

- **What:** two suspects now. (1) The model holds
  `plugins/essense-flow/tests/ledger-compaction.test.js` red on a clean tree (calendar
  drift, governance entries past the 30-day archive threshold), yet repo-wide `test-all
  --root` runs report all-green (33/33 at the 09-09 ship). (2) NEW 09-09: `test/run-all.cjs`
  reported exit 1 under test-all on 2 of 5 sweeps in one evening while the same suite run
  directly passed 54/0 — intermittent under the parallel sweep, untouched by the work (the
  08-23 transient, stale-lock timing suspect, was never reproduced until now). Run each
  suite DIRECTLY first, then under the sweep five times. If red: author the archive sibling
  (the root fix; raising the threshold re-fires in 30 days — #38's garden job wants the
  same motion) AND find why test-all's shape-discovery missed it; for the intermittent, find
  the shared resource (lock file / temp dir / cwd) two parallel suites contend for and make
  the sweep name a flaky suite as SUSPECT, never green. Also the precondition for Q12(b)/(c)
  if the owner wants CI back.
- **Done-check:** both suites green on a clean tree, ledger-compaction still green with the
  system date advanced 60 days, run-all green on 5 consecutive sweeps, AND `test-all
  --root` demonstrably counts them (or the discovery gap closed with a test). Run `tests/`
  explicitly; `test/run-all` says nothing about it.

## 10. Diploma residual: confirm the corrupt-state banner (next Diploma session)

- **What:** essense-flow 0.26.1's parse-corrupt DEGRADED banner is only observable IN
  Diploma. First minutes of the next Diploma session: launch, expect the banner, fix the
  file.
- **Done-check:** banner observed (or its absence investigated as a 0.26.1 bug); Diploma
  `state.yaml` parses clean afterward.

## 11. kb retrieval rung 2 — RE-PARKED on evidence; re-measure after 0.13.0 [needs owner only if #31's numbers still say vocabulary]

- **What:** the aithseis kb-probe capture met the rung-2 evidence gate on 08-23, but
  audit 2 says the hints are ignored for REPETITION + SIZE (84% ignored, top-3 ids in 40%
  of slots, the digest stubbed by the platform) — not for vocabulary; an LLM
  characterization pass is the wrong lever before the push side is readable. #27 SHIPPED
  (kb 0.13.0: bounded, deduped, cued); now re-measure the hint-followed ratio (#31) and the
  miss classes (#5's crowd list adds the second corpus); bring the Q9 ladder to the owner
  ONLY if misses are then vocabulary-class.
- **Done-check:** a post-0.13.0 measurement recorded in log.md naming the miss classes; if
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
  (owner call per project). Every ship: RESTART after update — the `[instr] running` line
  (0.5.2) now tells each ship whether it did.
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
  registry-check + repo-guard + (#31) harness-stats + (#37) the `@ship` design gate are
  the gate family #6 extends — reuse, don't re-derive. Respect the coupling scope limit:
  per project, never across the marketplace. Ambient sessions are #37's job (the 08-26 +
  09-08 wishes): patterns 0.1.1 covers the VOCABULARY + pre-write nudge, #37 the
  measurement; what remains HERE is the executor-step wiring + the drift check.
  **Precondition (lens item 18, shared with #37):** the code-glossary signature signal is
  DEAD for JS/untyped params (`signals/signature.py:46-48`; `with_signature_hash` 0/128 on
  plugins/kb) — derive an arity/param-name signature or document the dead signal before any
  gate reads it. The essense-flow-side consumers join ONLY if Q14 resolves (b)/(c); default
  (a) keeps them unbuilt.
- **Done-check:** `with_signature_hash > 0` on plugins/kb; a deliberate reach-in fails a
  hand-back; a stale parts.md entry is flagged; an executor step that adds a closed
  dispatch on a declared growth axis is flagged by mechanism, not by rule text.

## 16. Phase B — harden the steward

- **What:** adversarial inbox suite (pivot, vision-contradiction, deletion, duplicate,
  items superseding each other, an item whose defects disk already fixed — integrates as
  DONE with zero tasks); recurring spot-check re-injection; verbs /discuss /test /work
  (+ `garden` from #38). RECONCILED vs the blueprint: the orphan-`.steward/` detector +
  frontmatter warnings + digest size guard live in blueprint Phase 4, not here; Q10's
  second-staleness-signal remainder is SUPERSEDED by Phase 1 cursors; the briefing's
  computed lines are #8. Under invariant 13 every verb's output is in-session content, and
  the integrate DIFF is measured against the owner's reading, not the model's completeness.
- **Done-check:** each adversarial item produces a correct diff incl. cascaded deletions;
  spot-check fires periodically in normal use.

## 18. Phase D — generalization pass

- **What:** extract anything mk-cc-resources-specific from the loop after the #14 eval;
  verb set + model structure prove open or get fixed; /kb-seed generalization rides the
  same pass. The on-ramp is HAND-SEEDING behind the existing one-time cue — Q16 RULED keep
  the cue (no auto-seed, no one-keystroke seed), so this phase ships no seeding mechanism;
  what it ships is a seed that needs no tooling change per project. Then
  EMDE/psience/BiananceRepo — the two ships where the owner measurably felt the loss.
- **Done-check:** the next project onboards by steward-seeding + kb-seeding alone — no
  tooling code changes.

## 19. Phase E — retire ceremony officially [Q4, Q5, Q17 land here; harness G12 + the "stale harness" rule]

- **What:** docs + marketplace reposition; classic pipeline preserved (frozen per Q17's
  default); essense-autopilot retires (Q4 — #3 may make this a deletion rather than a
  migration); session-lifecycle + reuse-gate per Q17. Standing rule, now LAW via invariant
  12: on every model release re-run `harness-stats` (#31) and remove any mechanism whose
  metric is flat. Absorption fodder: handoff/resume redundant in steward projects
  (measured: 0 uses ever); retro/meta-review → steward verbs; truth split memory=owner /
  model=project / CLAUDE.md=code / kb=queryable everything.
- **Done-check:** BLOCKING Stop-hook registrations = 1; spawns per prompt ≤ 6; a new toy
  project goes idea → running slice through the steward loop only, in one evening.
