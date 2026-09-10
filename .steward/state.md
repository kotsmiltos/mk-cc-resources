# State — current truth (2026-09-09 · Phase 1 BUILT (#30 #31) at local `fde02fe`, 2 commits UNPUSHED · Phase 0 installed and its recorder RUNS, but turn-end's Stop hook has been SILENT all sitting · HEAD fde02fe at pass start)

> Read this before doing anything:
> - Limits-awareness: Claude drifts, loses context, finishes prematurely, defers, takes shortcuts. Re-read when uncertain. Preserve specifics.
> - Positive mindset: every gap solvable. Find the way by working carefully.
> - Quality ownership: this work matters. Take ownership.
> - Propagation requirement: every descendant artifact must carry these same four instructions.

## Ship position

**local main @ `fde02fe`** (ref file read this pass) = TWO commits past **origin `68ce999`**
(remote ref read): `8e0dba4` *feat(trace-schema): v1 across turn-end 0.9.0 / kb 0.14.0 /
lens 0.6.0 + toolkit drift suite + acted-on (task #30, harness G4)* and `fde02fe`
*feat(plugin-toolkit): 1.12.0 — harness-stats, the scorecard gate over drop-in metric sources
(task #31, harness G5)* (both subjects read from the reflog). **NOT pushed, NOT installed.**
Gates at the #31 build (log entry): test-all `--root` 35/35 suites / 2,023 checks (the
harness-stats suite is the 35th) · registry-check 0 · repo-guard 0 after ONE real finding fixed
in source (three regex fragments in the lens parser read as drive paths — the file was untracked
during the #30 run, so unscanned). The #30 sweep before it: 33/34 — `essense-flow
test/run-all.cjs` red under the sweep, green direct (#9). The tree did not move mid-pass.

## Versions on disk (all 16 plugin.json grep-read this pass) vs installed (`installed_plugins.json` read)

Moved at `8e0dba4`: **turn-end 0.9.0 · kb 0.14.0 · verifiability-lens 0.6.0**; at `fde02fe`:
**plugin-toolkit 1.12.0**. Unchanged: steward 0.5.2 · thorough-mode 1.11.2 · patterns 0.1.1 ·
essense-flow 0.26.2 · essense-autopilot 0.4.1 · prism 0.1.0 · statusline 0.2.0 ·
session-lifecycle 1.3.1 · schema-scout 1.2.1 · project-note-tracker 1.8.0 · alert-sounds 1.1.1 ·
reuse-gate 0.1.0. **Installed:** turn-end 0.8.0 · kb 0.13.0 · steward 0.5.2 (each
`gitCommitSha` 68ce999…, 2026-09-08T23:47Z) · verifiability-lens 0.5.1 · plugin-toolkit 1.11.0
(both at bc39fe0…, 09-06). Four plugins now sit AHEAD of their install — the
`running.installed_vs_checkout` key (1.12.0) reports exactly that. Marketplace metadata / bundle
not re-read (registry-check 0 at build is the evidence).

## THIS PROCESS — Phase 0 IS running, and its Stop hook is SILENT (measured this pass; the arrival check's legs 1 + 5 are not "unobserved", they FAILED)

Session `2da1777e` (arrival entry). **Alive and 0.8.0:** `.claude/turn-end/checks.jsonl` carries
116 lines with this session id; `samples/PostToolUse.json` + `samples/PostToolUseFailure.json`
exist (glob) — the recorder pair is a 0.8.0-only registration, so the running cache IS 0.8.0;
the briefing's `[instr] running` line was absent at open (= steward 0.5.2 equal). **Silent:**
`.claude/turn-end/trace.jsonl` = 141 lines, last `t` 2026-09-09T00:25:49Z (the PREVIOUS
session's last Stop), `2da1777e` = 0 matches, `"version"` = 0 matches in the whole file;
`ledger.json` names only `5e8e08b4` (the previous session). So across a sitting that built #30
and #31, turn-end's Stop hook wrote neither a ledger entry nor a trace line ONCE — the single
blocking tail (self-check, context-recall, session-digest, steward-sync, request-closure,
quality-lens) was ABSENT the whole time, while a sibling hook from the same cache fired 116×.
**Cause unknown from disk.** Candidates (Claude's, unproven): a platform kill at the 90 s hook
timeout on this sitting's long transcript (the judge alone measured 48–54 s on the previous
session's last three lines, and 0.8.0 adds transcript passes for file-touch + `dropAlreadyRead`);
a crash before the ledger write; a registration that did not take. A killed or crashed hook
leaves NO line — that is why 0.7.1's `version`/`stale` instrument could not see this: it only
prints when the hook runs. Diagnosis is #1's FIRST leg and, per #1's own rule, an inbox item
for the session — not a hotfix. Everything the sitting reported as "checked" was checked by the
session itself; no duty nudged it.

**Datum from the previous session's last lines (139–141, 0.7.0 code):** Stop `payload_keys`
now include `background_tasks`, `session_crons`, `effort`, `scratchpad_dir` → platform
invariant 2 below is amended (the field ARRIVES; whether 0.7.0's deferral read it or the
transcript scan is not distinguishable from the line — `agents_in_flight: 1` either way).

## Phase 1 — what `fde02fe` built (two 2026-09-09 build entries; suites at build; NONE of it live)

- **#30 (turn-end 0.9.0 · kb 0.14.0 · lens 0.6.0 · toolkit drift suite):** contract
  `plugins/plugin-toolkit/references/trace-schema-v1.md` (read: required `t / plugin / version /
  session_id / prompt_id / ms / decision / bytes`, exactly one of `hook | duty | agent | tool`,
  optional `cost_usd / engine / acted_on`; legacy = no `plugin` key, never malformed) +
  validator `lib/metrics/trace-schema.js`; each plugin keeps its OWN pure `lib/trace-line.js`
  with `examples()` (turn-end, kb, lens — all three present, glob) and
  `tests/trace-schema.test.js` discovers every sibling writer by shape (74/74, negative: minus
  `decision` fails). turn-end 0.9.0: v1 keys on the hook line; one `duty:<id>` line per supply
  duty (engine / ms / cost_usd / surfaced / index_size / judge_chosen / ranker_top — the ranker
  now runs on EVERY recall fire, so Q20's agreement is computable from disk); `duty: acted-on`
  once per closed owner span at the next genuine prompt (`lib/acted-on.js`, ledger
  `actedOnUpTo`). kb 0.14.0: kb-pull / kb-session-start / MCP lines through its writer (kb-pull
  keyed `hook: kb-pull`, was `tool: kb-pull-hook`; MCP lines null ids by construction). lens
  0.6.0: `hooks/hooks.json` registers ONE SubagentStop recorder (read: matcher
  `verifiability-lens$`, `hooks/scripts/lens-record.js`, timeout 10) → one line per dispatch
  from `last_assistant_message` + the agent transcript; NOT a Stop hook. SubagentStop payload
  MEASURED live (capture `20260909-0355`, read): keys `session_id, transcript_path, cwd,
  prompt_id, permission_mode, agent_id, agent_type, hook_event_name, stop_hook_active,
  agent_transcript_path, last_assistant_message, background_tasks, session_crons`;
  SubagentStart carries NO `agent_transcript_path` (docs drift); plugin agents are
  plugin-scoped (`verifiability-lens:verifiability-lens`, 81 transcripts). Suites: turn-end
  195/195 (+6) · kb 89/79/45/31/276 · lens 58/58 (+18).
- **#31 (plugin-toolkit 1.12.0 — `harness-stats`, the fourth gate):** `bin/harness-stats.js`
  (never writes) over the pure `lib/harness-stats.js` + registry `lib/metrics/index.js`
  (read: 13 sources, contract `{id, title, surface, keys[], run}`, duplicate/undeclared/silent
  keys are findings): hook-bytes · hint-followed · turn-end-fires · stop-durations · judge ·
  tail-bytes · kb-pull · acted-on · lens · checks · spawns · running-vs-installed ·
  briefing-vs-log. `lib/metrics/transcripts.js` = audit 2's scanner in-repo, every event
  timestamped and WINDOWED (the first run drifted +8..+47% on six numbers because the audit
  had scanned mid-span; `--until` the audit output's mtime reproduces everything).
  `defaults/harness-baselines.json` with provenance. **Reproduction:** `--until
  2026-09-06T09:52:54.368Z` → 25/25 baselined keys at +0.0% (bar was 3%). **Live numbers on
  this repo at the #31 run (whole life, 46 prompts):** hook bytes avg 8,930 / p50 7,358 / p95
  29,519; hints 31 → 3 strict (9.7%) / 5 loose; nudges 20 / blocks 13 / give-ups 12; judge 85
  fires, chosen empty 49.4%, ms/cost unknown (pre-0.7.0 lines); tail 0/121 fires carry bytes;
  kb-pull 275 fires, 2.69 hints/fire; lens 6 dispatches / 0 lines; acted-on 0 spans; checks 4
  lines; installed ≠ checkout for turn-end / kb / lens. Suite 66/66. **The pick is PENDING:**
  `.claude/harness-stats.json` does not exist (Read → absent), so `--line` prints nothing and
  nothing ships always-on → Q23. `briefing.contradictions` is registered and `null` until #8
  derives the briefing lines — the concrete reason #8 matters.

## Phase 0 — what `68ce999` closed (installed 09-08T23:47Z; detail in parts.md)

#29 running ≠ installed printed (turn-end 0.7.1 `lib/installed.js`, steward 0.5.2
`instrRunning`) · #27 kb-pull bounded at 8,192 B with dedupe + cue + pointer mode (live probe
on this repo's real 11,353 B digest: 8,110 B cut → 324 B pointer ×2) · #28 ground truth
(`lib/file-touch.js`, named-check floor, `MODALITIES`, `requireGreen` off = Q19, recorder
pair). The recorder's real fixtures LANDED this sitting (arrival entry): Bash `tool_response`
= `{stdout, stderr, interrupted, isImage, noOutputExpected}` — NO exit field, so `exit: null,
ok: true` on success is the platform's truth; PostToolUseFailure has `error` + `is_interrupt`
+ `duration_ms` and no `tool_response`; a forced `process.exit(3)` parsed as `exit: 3`. kb-pull
on the first prompt: hints + digest inline, digest in `cut` mode (the 14 KB session digest
was compressed by the session the same sitting). Q15 slim of the owner's global CLAUDE.md
(1,788 → ~640 B gate; 6,528 → 5,228 B) applied.

## Rulings that became law (2026-09-09, inbox 20260909-0015 / -0010; verbatim in questions.md)

Q19 "done" = ran AND observed, not required green (`requireGreen` per project) · Q18 the goal
duty arms EVERY task the owner starts, advise; the metric rule RATIFIED → invariant 12 · Q16
KEEP THE CUE · Q15 SLIM ONLY. Owner law → invariant 13: no pointers, in-environment, least
clicks.

## The judge finding (2026-09-06; Q20 open — its inputs are now WRITTEN by 0.9.0, unproven live)

On one real 8.8 KB recall prompt (haiku, 28-entry index): `api_ms ≈ wall` — the child
DELIBERATES 2.1–8.9k output tokens for a ~600-char verdict, 4× variance on identical input
(`--effort low` 25.8 → 56.9 s; `--effort medium` 95.8 s > the 60 s budget — the ETIMEDOUT
mechanism); same configuration twice → DIFFERENT picks in every pairing; 10-turn replay
identical 3/10. Lean buys no-boot + −36% cost + no state pollution, NOT speed. Since 0.9.0
every recall fire writes judge_chosen + ranker_top → `judge.agreement_pct` / `judge.agreement_n`
(1.12.0 keys) — Q20's one check is a scorecard run once 0.9.0 lines exist.

## LIVE — the status spine AND the ships (dogfood, tasks #1)

- (a) staleness: ⚠ line right 5/5 ships; false git-HEAD ⚠ after a model commit + authored prose
  wrong 4/5 → #8 (unchanged).
- (b) fallback fires: readable the moment a 0.7.0+ trace line exists — none exists on this
  repo (above: 0 `"version"` lines, and the Stop hook is silent in this process).
- (c) ledger truth: CLOSED by #24. (d) statusline: correct (110 B / 50 ms).
- (e) 0.7.0 live legs: `engine` / `ms` / `lean` / `deferred` / `payload_keys` — PRESENT on the
  previous session's lines 139–141 (0.7.0 was running there); tail under 9,000 chars
  (`emitted_chars` 515–6,244 on those lines); no kb-pull fire inside a judge child; `[instr]
  items: N new (oldest Nd)`; one real wake-turn ending on the owner's request — the last three
  still unobserved.
- (f) Phase 0 live legs: **FAILED on the first** — no Stop line at all this session (above);
  recorder fixtures REAL (arrival entry); kb-pull inline + `cut` (arrival entry); `[instr]
  running` absent = equal; a self-check nudge naming a real un-checked mutation — impossible
  while the Stop hook is silent.
- (g) Phase 1 live legs (after push + install + restart): first Stop line `"version":"0.9.0"`;
  a `duty:<id>` line per recall fire with `judge_chosen` + `ranker_top`; a `duty: acted-on`
  line at the next genuine prompt; kb lines keyed `hook: kb-pull`; after one lens dispatch,
  `.claude/verifiability-lens/trace.jsonl` with one `agent: verifiability-lens` line;
  `harness-stats` then shows `trace.lines_per_dispatch` ≥ 1 and `acted_on.spans` > 0.

## Audit verdicts (2026-09-06 — still the evidence base; re-measuring is now `harness-stats`, not an agent)

- **Evidence:** 269 session files → 235 headless recall judges + 33 real sessions + 1
  unknown-kind / 212 human prompts (twin-game 68 · psience 61 · mk-cc-resources 45 · aithseis
  28 · BiananceRepo 8; psience + BiananceRepo have NO kb/steward).
- **Used deliberately:** steward captures 97 · integrate dispatches 28 · session-digest edits
  108 · `@prompt` 11 / `@ship` 5 / `++ @verify` 1 · /prism unprompted in psience · kb MCP 38.
- **Used in NO real session:** /handoff /resume /retro /claude-md-sync, /kb, kb-capture,
  steward:brief/next/fleet, /patterns, /verifiability, code-glossary, every essense-flow
  skill/agent (0 since 08-10), reuse-gate (dormant since 07-07).
- **Cost:** hook text per real prompt avg 6,361 B / p50 4.5 / p95 20.5 / max 31.7 KB
  (1,316.8 KB total); recall supply 382.6 KB (largest), kb-hints 339 KB seen of 920 KB produced
  (bounded since 0.13.0), verification-rules 378 × 424 B (guarded since #25), caveman 44 KB.
  kb-hints 84% ignored, top-3 ids in 40% of slots (dedupe since 0.13.0; first re-measure = the
  #31 run above: strict 9.7% over the whole life — the post-0.13.0 window is not separable
  until 0.14.0 lines exist). Spawns per prompt: ≥8 UserPromptSubmit + 5 Stop; standing context
  25.6 KB per session AND per sub-agent (global CLAUDE.md 6.5 → 5.2 KB after the Q15 slim).
  Every judge child paid the whole harness (~3.75 MB) — CLOSED by the lean flags, pending live
  proof.
- **Where the owner felt the loss:** the two projects with NO kb/steward (psience 09-01 *"i said
  it in the previous session why is it not saved?"*) → Q16 RULED keep the cue.
- **Works (evidence):** steward recompute + model quality · root anchoring · turn-end 0
  `errored` across ~380 fires · kb frontmatter 174/174 · prism adopted unprompted · statusline ·
  patterns catalog 41 valid, gate once per prompt_id.

## PLATFORM INVARIANTS (measured — design against them)

1. **>~10 KB hook output → a 2 KB preview stub** (53× kb-pull, 2× recall tails in real
   sessions; 77× in judge sessions; smallest stubbed output 9.9 KB). Turn-end's tail capped at
   9,000 chars (0.7.0); kb-pull's whole output at 8,192 B (0.13.0).
2. **A background-agent completion wakes a NEW prompt span and re-fires every
   UserPromptSubmit hook** (62 prompts show 2–12× re-fires). **AMENDED 09-09:** the Stop
   payload NOW carries `background_tasks` (+ `session_crons`, `effort`, `scratchpad_dir`) —
   read from `payload_keys` on trace lines 139–141; 0.7.0 honours it when present, the
   transcript scan stays the fallback.
3. **`additionalContext` on a Stop hook continues the turn** — 0.7.0 emits the give-up note
   once, then silence.
4. **`/clear` does not reload plugins; a process keeps the hook code it started with** (G1).
   Since 0.7.1 / 0.5.2 the mismatch is PRINTED — but ONLY by a hook that runs (5/6 below).
5. **Hooks register at process start** — a NEW hook event fires nowhere until the process
   restarts (the 0.8.0 recorder pair fired first in THIS session, 116 lines).
6. **A Stop hook that dies leaves NO line** — from disk, "killed at the timeout" and "no Stop
   yet" read identically. Only a sibling ledger proves the process was alive (09-09: 116
   recorder lines vs 0 Stop lines). Every live check must pair the Stop trace with
   `checks.jsonl` or the transcript's hook summaries.

## Hook-event coverage (`plugins/*/hooks/hooks.json`)

Registered on disk: SessionStart 3 · UserPromptSubmit 5 · PreToolUse 2 · Stop 4 · Notification
1 · PostToolUse 1 + PostToolUseFailure 1 (turn-end 0.8.0, installed) · **SubagentStop 1
(verifiability-lens 0.6.0, read this pass — checkout only; the installed 0.5.1 registers
`{}`)**. Still ZERO: PreCompact, PostCompact, SubagentStart, SessionEnd — #33 (compaction
guard) and #35 (every agent traced; SubagentStart's `agent_id` is the join key).

## Known-broken / known-gaps (parts.md carries the file:line gap maps)

- **NEW — turn-end's Stop hook silent for a whole sitting in this process** (above): cause
  unknown; the tail's six duties absent; the 0.7.1 instrument blind to a hook that never runs.
  → #1 first leg (diagnose from the transcript's hook summaries + a timed run of the installed
  0.8.0 hook over this sitting's transcript), an inbox item per #1's rule.
- **Evaluators unmeasured (G4): CLOSED at 0.9.0 / 0.14.0 / 0.6.0 — built, not live** → #1(g).
- **No scorecard (G5): CLOSED at 1.12.0** — the standing `[instr]` pick pending → Q23; the
  "second run after #32 shows the deltas" leg → #32's done-check.
- **Verification ground truth (G2): CLOSED at 0.8.0;** fixtures real (arrival). Residual:
  `requireGreen` per project (Q19).
- **No goal-based termination (G3):** → #32, UNBLOCKED (Q18/Q19). `/goal` excluded by default
  under invariant 1 (harness §9.5, not ruled).
- **Briefing staleness — NOT dead:** authored prose wrong 4/5; false git-HEAD ⚠;
  `briefing.contradictions` registered and null → #8 unblocks the key.
- **kb (0.14.0 on disk):** cap / dedupe / pointer / malformed-config / floor-leak CLOSED at
  0.13.0. RESIDUAL (audit): `source` facet unfilterable; stamp-titled archived digests → noise;
  8-digit runs in h2 titles read as timestamps; a BOM defeats frontmatter → #38.
- **turn-end (0.9.0 on disk):** `DUTIES` hard-coded (`lib/duties/index.js:59`); whole transcript
  re-read every Stop (`context.js:122-123`, 170 MB → 1.4 s — and now a silent-hook suspect) →
  #17; no per-duty supply budget → #17; no compaction guard → #33; sub-agents observed only by
  transcript scan → #35 (the SubagentStop payload is measured; lens 0.6.0 is the first
  consumer); cost recorded, never told → #34.
- **steward (0.5.2):** `agents/steward.md:59-60` still instructs a done/-move → #8; protocol
  text not anchored to `<git root>/…` everywhere (`SKILL.md:55-56,79`, `commands/next.md:8`,
  `agents/steward.md:24`, `session-digest.js:76,78`) → #8; wrong-root drops in aithseis from
  twin-game's MODEL text → #12.
- **Docs (counts-class):** root `CLAUDE.md:196` still says "three repo-level gates" while
  `:33` and a gate-table row already name harness-stats (grep this pass) → #6.
- **harness / hooks:** `++` injected TWO ways (both hooks; CLAUDE.md restatement dropped
  09-09); five design-open surfaces kept BY RULING (Q15); `@prompt`'s steward check uses cwd;
  modifier propagation to sub-agents is prose only → #35.
- **Generativity under-delivery (owner 08-26, re-stated 09-08):** vocabulary + nudge shipped
  (patterns); the MEASURED half → #37 with #15's executor-step wiring; `/patterns` never
  invoked; outcome change now measurable by `harness-stats` once a `design.*` key exists.
- **Knowledge accretes (owner 09-08):** standing 25.6 KB per session + sub-agent; log now
  ~95 KB, parts ~52 KB; no lifecycle on kb entries → #38, Q21 (`acted_on.*` is the usage
  measure, built 0.9.0).
- **code-glossary:** signature signal DEAD for JS/untyped params (`signals/signature.py:46-48`,
  `with_signature_hash` 0/128 on plugins/kb) → #15 (precondition for #37's signals).
- **Test sweep datum:** essense-flow `test/run-all.cjs` red under test-all in 3 of 7 sweeps on
  09-09 (2/5 in the evening, the #30 sweep, not the #31 sweep) while green run direct →
  INTERMITTENT under the parallel sweep, untouched by any of the work → #9.
- **Git hygiene across ships:** unchanged (aithseis uncommitted 43 days; volatile
  `.claude/turn-end/` committed in Endure + twin; lens state committed in psience + aithseis;
  11 MB PNG in crowd; this repo gitignores `.claude/*`) → #12 / #5.
- Standing, unchanged: invariant-9 hole (#3) · Q12 CI · Q13 sonnet · absolute-path debt (#7) ·
  counts-in-prose (#6) · crowd deep-seed (#5) · Diploma banner (#10) · #21 patterns
  interactive legs · kb MCP version-proof (#4, expects the installed version — 0.13.0 today,
  0.14.0 after the push + update).

## Outside-repo (log-only context)

Five ships: mk-cc-resources, twin-game, crowd-game, aithseis, Endure. Status contract adopted
in 1/5 (this one) → #12. Marketplace: github source, `autoUpdate: true`; a push is required
before any install sees a change, a RESTART before the running process does — and a hook that
runs then says which of the two it is in; a hook that does not run says nothing (invariant 6).
