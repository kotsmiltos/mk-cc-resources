# Tasks — ordered, executor-ready (recomputed 2026-09-11 · Phase 1 PUSHED + INSTALLED and LIVE · one UNCOMMITTED phase on disk · plugin-toolkit uninstalled → Q24 · numbers are stable ids, file order is the order; next free id 39)

> Read this before doing anything:
> - Limits-awareness: Claude drifts, loses context, finishes prematurely, defers, takes shortcuts. Re-read when uncertain. Preserve specifics.
> - Positive mindset: every gap solvable. Find the way by working carefully.
> - Quality ownership: this work matters. Take ownership.
> - Propagation requirement: every descendant artifact must carry these same four instructions.

**Ordering rationale (2026-09-11 recompute — a CORRECTION pass).** Phase 1 (#30 trace schema v1
→ turn-end 0.9.0 / kb 0.14.0 / lens 0.6.0; #31 `harness-stats` → plugin-toolkit 1.12.0) is not
merely built: it was PUSHED 09-10, three of its four plugins are INSTALLED, and its writers are
OBSERVED live (state.md — 13 turn-end lines / 2 kb / 1 lens). **#1 therefore SHRINKS:** its
diagnosis leg is DELETED as unrunnable (the 09-09 silence cannot be reproduced — the process is
gone and `.claude/` state is per-checkout), and what remains is two disk reads, one ship, and a
standing watch; it stays at the top only because #12 and the Phase 2 proofs hang off it. **#32
loses its blocker** — a duty inside a Stop hook that never runs nudges nobody, and the hook now
runs. **NEW: `plugin-toolkit` is not installed**, so every gate named in a done-check below is a
CHECKOUT command → Q24, which #2 now waits on. Phase 2 (#32 #8) follows, UNBLOCKED by the 09-09
rulings; #32 also inherits #31's "second run shows the deltas" leg; #8 unblocks a
registered-but-null key (`briefing.contradictions`). Phase 3 (#17 prism run — the baseline
numbers now exist; #33; #35 — its SubagentStop substrate is measured AND installed). Phase 4
(#34 #36). Phase 4b (#37 #38): preconditions #28 + #30 + #31 are all built; either may be pulled
forward by an owner pick. Under invariant 12 every task below that ships a mechanism names its
METRIC KEY in its done-check, and since 1.12.0 the key must be REGISTERED in
`plugins/plugin-toolkit/lib/metrics/index.js` (a key absent from a run is named) — no key, not
done. The rest keeps its relative order. #13 stays deleted; ids 1–38 stable, never reused.

**Hygiene rule for this file:** `.steward/` model files are COMMITTED to a PUBLIC repo
(only `inbox/` is gitignored). Never write an absolute path, username or machine-specific
detail here — name projects, not drives. Under invariant 13, a task's done-check is what the
executor RUNS; the owner reads the outcome in the session, never this file.

## 1. Dogfood — Phase 1 is LIVE: read the last legs off disk, ship today's phase, keep the hook-liveness WATCH (standing; gates Phase 2, #12)

- **Where it stands (measured 2026-09-11):** Phase 1 was pushed 09-10 and turn-end 0.9.0 /
  kb 0.14.0 / lens 0.6.0 are INSTALLED (ledger, `gitCommitSha` 7e2bcd5); in this checkout the
  Stop hook WRITES — 13 trace lines, all `"version":"0.9.0"`, incl. 4 `duty:"context-recall"`
  and 2 `duty:"acted-on"` — plus 2 kb lines and 1 lens `agent:` line. Legs (b) (f) (g) moved
  from "impossible" to mostly closed. The 09-09 Stop-hook SILENCE was never explained and can
  no longer be diagnosed (that process ended; `.claude/` state is per-checkout), so the old
  leg 0 is DELETED as unrunnable and replaced by leg C.
- **Leg A — finish (g) from disk, two reads:** (1) read one `duty:"context-recall"` line and
  confirm `judge_chosen` + `ranker_top` are actually present (Q20's input; this pass confirmed
  the lines, not the fields); (2) `node plugins/plugin-toolkit/bin/harness-stats.js --root .`
  from the checkout (the plugin is uninstalled — Q24) and record `trace.lines_per_dispatch`,
  `acted_on.spans`, `judge.agreement_n` / `agreement_pct`, `running.installed_vs_checkout`
  (non-empty by construction while today's four bumps are uncommitted).
- **Leg B — ship today's phase:** commit + push the uncommitted work (turn-end 0.10.0 · lens
  0.7.0 · toolkit 1.13.0 · steward 0.6.0 · marketplace metadata 2.49.0 — the session counted 62
  files), then `claude plugin update` + RESTART; the briefing's `[instr] running` line and
  `running.installed_vs_checkout` say whether both happened. Push needs the owner's word
  (invariant 1).
- **Leg C — the hook-liveness WATCH (replaces leg 0):** trigger = a sitting where `trace.jsonl`
  gains NO Stop line while `checks.jsonl` grows. If it fires, capture IN THAT SITTING (it is
  unreproducible afterwards): the transcript's per-turn hook summaries (status + duration) and
  a TIMED hand-run of the installed hook over that transcript. Per this task's rule the finding
  is an inbox item, never a hotfix.
- **Still-open legs:** (a) staleness — ⚠ right 5/5, false git-HEAD ⚠ + authored prose wrong
  4/5 → #8; (e) 0.7.0 legs — no kb-pull fire inside a judge child, `[instr] items: N new
  (oldest Nd)`, one real wake-turn ending on the owner's request; (f) a self-check nudge naming
  a real un-checked mutation, a silent allow on a named check, `digest: pointer` + the
  `kb_query` cue. (b) readable now · (c) CLOSED (#24) · (d) correct.
- **Done-check:** leg A's numbers recorded in log.md with the command that printed them; after
  leg B, `[instr] running` empty and `running.installed_vs_checkout` empty; each remaining leg
  observed at least once with zero UNEXPLAINED instrument lies; then #12 unblocks. **Metric
  keys:** `running.*` · `acted_on.spans` · `judge.agreement_n`; the watch reads
  `spawns.stop_hooks_per_fire` (transcript) against `turn_end.prompts` (trace).

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
- **Done-check:** arm a task (#8 is the next mechanism) → a turn that yields without its
  check → exactly one tail line naming the task and the check; after the suite goes green
  (recorded in `checks.jsonl`) → silent; a sitting with no armed goal shows no line; turn-end
  + steward suites green; **the second `harness-stats` run** (the leg #31 carried) shows the
  deltas against `defaults/harness-baselines.json` with the new keys present. **Precondition
  SATISFIED 2026-09-11** — the Stop hook demonstrably runs (13 v1 lines), so a new duty can
  actually nudge. **Metric key:**
  `goal.met_before_yield` (sittings whose armed task's check ran before the last yield /
  armed sittings) + `goal.nudge_heeded`, registered in `lib/metrics/`.

## 8. Briefing: compute what drifts, author only what cannot be computed (audit-2 Tier 2 item 12; Phase 2; absorbs the write-time budget check + lens item 21)

- **Why:** the authored briefing BODY (Ship/Last/Next) is contradicted by the log's last
  entry in 4 of 5 ships — regenerated only at integration, it lags one session; the
  instruments are RIGHT everywhere (three of them since 0.5.2). Plus a false ⚠ on
  `git-HEAD` after committing the regenerated model (`steward-brief.js:63-67` reads the
  ref file's mtime). The 08-23 ruling was "authored narrative + COMPUTED instruments" —
  this moves the drifting narrative lines to the computed side. Nothing checks a real
  briefing's budget at write time either — computing the lines makes that moot. Invariant
  13 sharpens the target: the briefing is the owner's READING, so every line must be true
  at the moment it is read. **Unblocks a registered key:** `briefing.contradictions`
  (1.12.0 `briefing-vs-log` source) is `null` by construction until these lines are
  computed — the scorecard names it as absent on every run until then.
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

- **What:** (0) `harness-stats` EXISTS (1.12.0) — put its current numbers (`hook_bytes.*`,
  `hints.*`, `spawns.*`, `tail.*`, `kb_pull.*`) in the brief, then ONE `/prism` run on the
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
  (`++`, `@verify`) is prose only. **Substrate now MEASURED (09-09, capture
  `20260909-0355`):** SubagentStop carries `agent_id, agent_type, prompt_id,
  agent_transcript_path, last_assistant_message, stop_hook_active, background_tasks,
  session_crons`; SubagentStart carries `agent_id, agent_type, prompt_id` and NO
  `agent_transcript_path` (docs drift) — `agent_id` is the Start↔Stop join key; a plugin
  agent's type is plugin-scoped (`verifiability-lens:verifiability-lens`), so matchers are
  regexes; the ONE registration today is lens 0.6.0's recorder (matcher
  `verifiability-lens$`, checkout only) — the generic hook must not duplicate its line.
- **What:** SubagentStart/SubagentStop hooks (turn-end, empty matcher = every agent) → one
  trace-schema-v1 line per agent (`agent: <type>`, ms Start→Stop by `agent_id`, bytes of
  `last_assistant_message`, model/tokens from the agent transcript) and the AUTHORITATIVE
  in-flight set for `defer()` (Start without Stop = in flight; transcript scan stays the
  fallback; `background_tasks` now arrives on Stop payloads too — state.md invariant 2); an
  isolation policy per agent definition — lean flags for judges,
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
  (fixtures in-repo, scrubbed of paths — the `samples/` shape; the lens's
  `SubagentStop.sample.json` and turn-end's `samples/` are the first two) and diffs the
  `harness-stats` scorecard against `defaults/harness-baselines.json`; test-all discovers it by shape; later `claude plugin
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
  touched; `harness-stats` (1.12.0) reads the key the moment it is registered.
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
  the 0.9.0 `acted_on` trace + the 1.12.0 `acted_on.*` keys give the usage measure (built;
  live pending #1).
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

## 2. Ratify the distribution layout — and it is no longer the one the /doctor session set [needs owner → Q24]

- **Why:** on 2026-07-31 the owner approved: mk-cc-all bundle DISABLED + plugin-toolkit
  standalone INSTALLED (user scope). **Measured 2026-09-11: the reverse is true** — the install
  ledger has NO plugin-toolkit entry, while mk-cc-all 2.27.0 IS installed, so the four gates
  reach a checkout only (state.md, parts.md). The unratified state drifted on its own, which is
  exactly what an unclosed decision does. What a PUBLIC marketplace user should install
  (README/marketplace prose still centers the bundle) was never decided either.
- **What:** (1) the owner's one-keystroke pick is **Q24** (reinstall standalone / standalone +
  slim the bundle / declare it checkout-only / wrapper) — then reposition README + marketplace
  prose to the chosen layout; (2) prove the reach: run ONE gate
  (repo-guard or test-all `--root`) from a DIFFERENT project via the installed toolkit —
  possible only under Q24 (a)/(b); under (c) the leg becomes "run it from a checkout and say
  so in the docs"; (3) the bundle is installed at 2.27.0 (`bc39fe0`, ledger-read 09-11) — any
  bundle change needs its version bumped first so the cache updates, then read the CACHED
  skill text; (4) the repo-guard detector for
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
- **Done-check:** one `kb_overview` call reports the INSTALLED version — **0.14.0 since
  2026-09-10, so this is runnable today** — AND a `tool: kb_query|kb_read` line (0.14.0 shape;
  `tool: kb-pull-hook` was the old key) with a post-restart timestamp appears in the trace
  (2 kb hook lines already exist in this checkout; the MCP-side line is the missing half).
  Both, or the leg is not closed.

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
  let ITS output be the number — last gate 35/35 suites / 2,023 at the #31 build) · plugin-toolkit
  1.10.0 RELEASE-NOTES entry (last verified missing 08-01) · RELEASE-NOTES 1.9.0
  checks.yml claim (wording per Q12's answer) · 613 Python glossary-engine checks in no
  documented total · moved-content references from the 07-31 restructure · marketplace
  metadata non-bump convention (decide, then bump-or-drop) · steward CLAUDE.md test-count
  line (50 + 13 since 0.5.2 — re-read the CLAUDE.md side) · the hook-event table in root
  CLAUDE.md now that turn-end registers PostToolUse and lens 0.6.0 SubagentStop · **root
  `CLAUDE.md:196` "three repo-level gates" while `:33` and a gate-table row already name
  harness-stats — four (grep 09-09).** Prefer printing the command over the number wherever
  the number earns nothing; `harness-stats` now prints the VOLATILE numbers, so any of them
  hand-written in prose is a defect by construction.
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
  --root` runs report all-green (33/33 at the 09-09 ship; 35/35 at the #31 build). (2) NEW
  09-09: `test/run-all.cjs` reported exit 1 under test-all on 3 of 7 sweeps in one day (2/5
  in the evening, the #30 sweep 33/34, the #31 sweep green) while the same suite run
  directly passed 54/0 — intermittent under the parallel sweep, untouched by any of the work
  (the 08-23 transient, stale-lock timing suspect, was never reproduced until now). Run each
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
  (kb 0.13.0: bounded, deduped, cued); now re-measure the hint-followed ratio — `node
  plugins/plugin-toolkit/bin/harness-stats.js --root . --since <the 0.13.0 install stamp>` →
  `hints.strict_pct` / `hints.loose_pct` (whole-life at the #31 run: 9.7% strict; the
  post-0.13.0 window is the number that matters) — and the miss classes (#5's crowd list adds the second corpus); bring the Q9 ladder to the owner
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
  audits cover the OTHER ships; this is the crowd-specific before/after — `harness-stats
  --root <crowd checkout>` (1.12.0) replaces the hand method.
- **Done-check:** before/after table with confidence notes. **Owner annoyance = veto
  regardless of numbers.** Unlocks the deferred drop-channel decision (Q8).

## 15. Phase A — wire the gates (on this repo; v3 resumes here, after the spine phases)

- **What:** coupling/extensibility + tests into every executor step; a deterministic
  model-vs-code drift check (parts.md contracts vs `runner map`). test-all +
  registry-check + repo-guard + harness-stats (1.12.0) + (#37) the `@ship` design gate are
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
  12: on every model release re-run `harness-stats` (1.12.0) and remove any mechanism whose
  metric is flat. Absorption fodder: handoff/resume redundant in steward projects
  (measured: 0 uses ever); retro/meta-review → steward verbs; truth split memory=owner /
  model=project / CLAUDE.md=code / kb=queryable everything.
- **Done-check:** BLOCKING Stop-hook registrations = 1; spawns per prompt ≤ 6; a new toy
  project goes idea → running slice through the steward loop only, in one evening.
