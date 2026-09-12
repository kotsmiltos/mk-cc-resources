# State — current truth (2026-09-12, late · HEAD `c4d8093` == origin/main after this checkout was found TEN COMMITS STALE and fast-forwarded — Tracks 4 + 5 and three unplanned toolkit ships are PUSHED and NOTHING is installed, and the working tree now holds the model's FIRST built-but-uncommitted plugin, thorough-mode 1.12.0 `@fc`. The reach chain fetch → bump → push → install → restart is now broken at three links at once: commit, install, restart → Q24 + Q25)

> Read this before doing anything:
> - Limits-awareness: Claude drifts, loses context, finishes prematurely, defers, takes shortcuts. Re-read when uncertain. Preserve specifics.
> - Positive mindset: every gap solvable. Find the way by working carefully.
> - Quality ownership: this work matters. Take ownership.
> - Propagation requirement: every descendant artifact must carry these same four instructions.

## Ship position

**HEAD `c4d8093` == origin/main** (`.git/refs/heads/main` read this pass) — **the `a50fa75`
position recorded this morning is SUPERSEDED, and not because work landed here: this checkout was
TEN COMMITS behind (`acb736b`) and has been fast-forwarded to upstream `c4d8093`.** Any model
state computed on that base was replaced by upstream's; this pass recomputed against disk.
**0 unpushed commits, but the tree is NO LONGER CLEAN:** thorough-mode 1.12.0 (`@fc`) is built
and UNCOMMITTED (below) — the first time this model has had to distinguish "built" from "pushed".
The 019e007 position is SUPERSEDED too: since it, the same long sitting shipped Tracks 4
and 5 of the 09-11 plan (four commits, pushed as `acb736b..7cc3d3d` after a rebase — the branch
push was REJECTED first because another session had moved origin) plus three UNPLANNED
plugin-toolkit ships, and 29 `<plugin>@<version>` tags now exist on origin. The only untracked
path is still `.pipeline/`, the dead 2026-04-22 cache (below).
**NOTHING of any of it is INSTALLED.** `installed_plugins.json` (grep-read this pass, every
version/sha/lastUpdated field) is UNMOVED at the 2026-09-10T11:03:50Z generation — turn-end
0.9.0 / kb 0.14.0 / lens 0.6.0 at `7e2bcd5`, steward 0.5.2 at `68ce999`, essense-flow 0.26.2 /
autopilot 0.4.1 / thorough-mode 1.11.2 / patterns 0.1.1 / mk-cc-all 2.27.0 at `bc39fe0`. So the
hook code running in any session is still the 09-10 build, and the drift is now SIX behind-install
plugins (turn-end 0.9.0→**0.11.0** · lens 0.6.0→0.7.0 · steward 0.5.2→0.6.0 · essense-flow
0.26.2→**0.27.0** · autopilot 0.4.1→**0.5.0** · thorough-mode 1.11.2→**1.11.3 on origin, 1.12.0
in the working tree — an install can reach 1.11.3 at best, so `@fc` reaches nobody at all**) plus TWO with no
entry at all: plugin-toolkit (Q24) and the new **elicit 0.1.0**. Elicit rides the mk-cc-all
bundle (disk 2.28.0 carries `plugins/elicit/skills/`, read this pass) — but the INSTALLED bundle
is 2.27.0, so today neither the bundle path nor a standalone install reaches it.
**Every claim about this work is CHECKOUT evidence; none of it is field-validated.**
**THIS IS A SECOND CHECKOUT of the project** (reflog read 09-11 at 13:00: `pull --ff-only`
`6becb73` → `7e2bcd5`, 85 commits) — so every `.claude/` fact below is per-CHECKOUT, and the
09-09 evidence lives in a working copy this pass cannot read.
**Gates at HEAD** (run from the repo root by the session, exit codes read directly; the session's
records, not re-run here): repo-guard exit 0 (4 detectors) · registry-check exit 0 (**8** claim
sources — `plugin-docs` is the new one) · **test-all 32/35 suites / 1,476 checks / 1 skipped /
exit 1** on three named non-green: two pre-existing (essense-flow's CJS suite resolves fixtures
outside the repo; code-glossary's pytest deps absent) and the ledger-compaction SKIP, newly
visible.
**Gates RE-RUN at the `@fc` build (09-12 late; the session's records, exit codes read directly,
never after a pipe):** `thorough-mode/tests/thorough-mode.test.js` exit 0 **30/30** (21 upstream
baseline + 9 new) · repo-guard exit 0 (4 detectors) · registry-check exit 0 (8 claim sources) ·
**test-all run THREE times: exit 1 / 0 / 0, 2,100 checks** — the exit-1 run is the #9 flake, whose
MECHANISM is now named (below), not a fourth red. Baseline lesson riding along: "22 checks" was
reported before the fetch; the true upstream baseline is 21 — a count read on a stale base is as
wrong as a remembered one.
**CHECK-COUNT CORRECTION — every test-all total this model recorded before 1.14.0 is unsound.**
The sweep matched node:test's old `# pass N` marker, so on node 24 THIRTY of 35 suites counted
ZERO: the `019e007` record of "1,325 checks" was measured against a real 1,443, and the number
could not move when 16 tests were added or removed (both measured). Do not compare any pre-1.14.0
total with a post-1.14.0 one; the 33/35 · 1,325 and 35/35 · 2,023 figures are retired, not
baselines. The tree did not move mid-pass.

## Versions on disk vs installed (all 16 plugin.json + the install ledger grep-read at the 09-12 0110 pass; only thorough-mode's manifest was re-read this pass, and only it moved)

**On disk now (17 plugins — every plugin.json version grep-read this pass):** turn-end **0.11.0**
· plugin-toolkit **1.16.0** · essense-flow **0.27.0** · essense-autopilot **0.5.0** ·
thorough-mode **1.12.0 — UNCOMMITTED (origin: 1.11.3)** · **elicit 0.1.0 (NEW plugin)** · verifiability-lens 0.7.0 · steward
0.6.0 · kb 0.14.0 · patterns 0.1.1 · prism 0.1.0 · statusline 0.2.0 · session-lifecycle 1.3.1 ·
schema-scout 1.2.1 · project-note-tracker 1.8.0 · alert-sounds 1.1.1 · reuse-gate 0.1.0
(+ marketplace metadata **2.51.0** and the mk-cc-all bundle **2.28.0**, both read).
**Installed (user scope — the ledger's marketplace keys grep-read):** turn-end 0.9.0 ·
kb 0.14.0 · verifiability-lens 0.6.0 (all three `gitCommitSha` 7e2bcd5, 2026-09-10T11:03:50Z) ·
steward 0.5.2 (68ce999, 2026-09-09T09:57Z) · mk-cc-all bundle 2.27.0 · essense-flow 0.26.2 ·
essense-autopilot 0.4.1 · thorough-mode 1.11.2 · patterns 0.1.1 (those five at bc39fe0) ·
session-lifecycle 1.3.1 (8d5cab6) · reuse-gate 0.1.0 (6becb73) · statusline 0.2.0 (e6528e0) ·
alert-sounds 1.1.1. **kb is the one plugin that is current on both sides.**
**ABSENT from the ledger:** plugin-toolkit · elicit · prism · schema-scout ·
project-note-tracker. The last three are bundle-carried SKILLS, so their absence is expected;
elicit is bundle-carried too, but only from bundle 2.28.0, which is NOT the installed one.
**`plugin-toolkit` is the finding (unchanged by this ship):** its skills ride the bundle, but
`bin/` and `lib/` never do (registry-check's own `capability-reach` claim), so the four repo
gates (repo-guard · test-all · registry-check · harness-stats) reach a CHECKOUT only — and
`claude plugin update` will NOT close it, because there is no entry to update. This CONTRADICTS
the 07-31 "standalone at user scope" record in parts.md → **Q24** (owner decision) + #2.
**VERSION-PIN LAW, learned at this ship:** a plugin is pinned to its version STRING — a fix
without a bump deploys NOTHING. A staged "push just the js-yaml fix" plan was invalidated
mid-flight because essense-flow and essense-autopilot carried no bump, so that push would have
deployed zero. Any future "ship just this fix" decision reads the version of the plugin the fix
lives in first. (Law recorded in parts.md's cross-reference discipline.)

## What LANDED after `019e007` (five ships in one long sitting; all pushed, none installed — the session's own records + the model's targeted re-reads, never a re-audit)

- **Track 4 — the pipeline's false alarms are silenced (essense-flow 0.27.0 · autopilot 0.5.0).**
  535 identical `DEGRADED (corrupt)` banners → SessionStart ONLY (gated on
  `payload.hook_event_name`, no counter); next-step silent on a degraded state; autopilot's 305
  `no .pipeline/` halt diagnostics silent while every OTHER halt stays loud; both essense-flow
  hooks root-anchored through a new `lib/project-root.js`. Verified live against this repo's own
  dead `.pipeline/` (banner at SessionStart, nothing at UserPromptSubmit, 0 stderr bytes outside
  a pipeline, a subdir shell resolving to the root); suites 16/16 + 44/44. **#39 CLOSED.**
- **Track 4 — `plugins/elicit/` 0.1.0, a NEW plugin** (one SKILL.md, zero code, no hooks, no
  state, bundle-safe): essense-flow's gap-recursion engine RETARGETED at `.steward/vision.md` +
  `questions.md`, orienting from kb + the model before the first question, forking to prism, and
  writing exactly ONE thing — an inbox capture, so the steward agent stays the model's only
  writer. It answers the owner's 09-11 ask (*"a mode where I can brainstorm to complete my
  visions and be questioned in gaps I leave"*) and it is the first capability the pipeline's
  retirement has actually EXTRACTED rather than lost. The bench decision was routed to Q17, not
  self-answered.
- **Track 5 — the public half, first pass in months (#40 CLOSED).** README 382 lines/41 KB →
  149/7.6 KB with corrected `<name>@mk-cc-resources` install commands; all 18 marketplace rows
  ≤200 chars (longest 191, was 9,879) with the 7 recommended metadata fields (was 0/17); the 5
  missing plugin READMEs written (17/17); all 16 `RELEASE-NOTES.md` migrated to `CHANGELOG.md`
  (Keep a Changelog — recent 5 rewritten user-facing, older verbatim into
  `design/notes/<plugin>-history.md`), with `/version-bump`, `/plugin-scaffold`, `/docs-audit`
  and `@ship` retargeted (thorough-mode 1.11.3). Guarded so it cannot regress: registry-check's
  new `plugin-docs` claim (README present · CHANGELOG top version == shipped version ·
  description ≤200) and a broadened `doc-version`. 29 tags on origin.
- **UNPLANNED, and the most consequential: plugin-toolkit 1.14.0 — test-all could not count.**
  See the check-count correction above. The same blind spot had hidden
  `essense-flow:tests/ledger-compaction.test.js` RUNNING AND CHECKING NOTHING since the gate
  began — a third non-green that is newly VISIBLE, not newly broken (→ #9).
- **UNPLANNED: plugin-toolkit 1.15.0 `digest-uptake`** — answers "are session digests used?".
  Measured: **1 injection in 5 is CUT by the platform bound** (platform invariant 1, from the
  inside). `digest.live_used_pct` ships **NULL BY DESIGN**: scoring the live digest against the
  same session's answers is circular, because the duty writes it FROM those answers. A metric
  that cannot be honestly computed is declared null and SAID — the house rule the VINTAGE fix
  established, applied a second time.
- **UNPLANNED: plugin-toolkit 1.16.0 + turn-end 0.11.0 — the uptake scorer credited BOILERPLATE
  as use.** The four-instruction preamble this model's own propagation requirement puts in every
  `.steward/` file was scoring as "the answer used the note". Fixed with idf weighting; measured
  steward-model uptake **79% → 64%**. Also new: an `asset-value` source ranking knowledge per kb
  SOURCE and per ASSET with an `unused_assets` keep/cut list (feeds Q21 with real numbers —
  `.steward/log.md` scored 0/1 used across 5 surfacings), and `asset.origin_recorded` = FALSE:
  `.claude/kb/` is gitignored, so no entry carries a commit, author or history, and recording
  provenance needs a frontmatter field AT CAPTURE TIME (owner deferred → #38).
- **NOT a ship, and the distinction is the point: thorough-mode 1.12.0 `@fc` (2026-09-12, late).**
  A ninth prompt modifier (fewer clicks) encoding vision invariant 13 as an ON-DEMAND keyword,
  built as a drop-in entry in the existing `MODIFIERS`/`HINTS` registries — zero new machinery,
  `hooks.json` untouched, suite 30/30 (parts.md). It is BUILT, UNCOMMITTED and UNPUSHED by the
  owner's call, so unlike everything above it has not even reached the remote an install reads.
  Whether the law it encodes should stay opt-in is the open decision → **Q25**.
- What each mechanism does beyond these records is not claimed here; none of it has fired in the
  field, because none of it is installed. The doc pass did NOT close the counts-class defect:
  the root CLAUDE.md text injected at THIS session's open still says "three repo-level gates"
  while its own table lists four → #6 stands.

## THIS PROCESS — turn-end 0.9.0 RUNS and its Stop hook WRITES (measured 09-11 13:00 in THIS checkout; 0.9.0 is STILL what runs after this ship, until update + restart)

(Grown to **28 v1 lines by the evening** — see leg (g) below; the 13-line reading is the midday
snapshot.) `.claude/turn-end/trace.jsonl` = **13 lines, every one stamped 2026-09-11 and
`"version":"0.9.0"`** (grep, explicit file path — a directory grep silently skips the
gitignored `.claude/` tree, which is how a false "0 matches" is manufactured): among them 4
`"duty":"context-recall"` supply lines and 2 `"duty":"acted-on"` lines, and all 13 match the
v1-key grep. So the 09-10 install is what runs here, the single blocking tail fires, and
Phase 1's turn-end writer is LIVE (legs below). Sibling writers in this checkout:
`.claude/kb/trace.jsonl` 2 lines on the kb-pull / kb-session-start keys,
`.claude/verifiability-lens/trace.jsonl` 1 `"agent":"verifiability-lens"` line.

**The 09-09 SILENCE is a real datum, still UNEXPLAINED, and now UNREPRODUCIBLE.** Measured then
(session `2da1777e`, the other checkout): 0 Stop trace lines / 0 ledger entries for the session
vs 116 `checks.jsonl` recorder lines from the same 0.8.0 cache — the tail's six duties absent
across the sitting that built #30/#31. That process is gone and its `.claude/` tree is not this
one, which is exactly the evidence loss #1 leg 0 was written to prevent; the leg is re-cut as a
WATCH with a trigger, not kept as a diagnosis nobody can run. Candidates stand as recorded
(Claude's, unproven): a platform kill at the 90 s hook timeout on a long transcript, a crash
before the ledger write, a registration that did not take. What survives as MECHANISM is
platform invariant 6 below — a dead hook leaves NO line, so a live check pairs the Stop trace
with `checks.jsonl` before reading silence as "no Stop yet".

**Datum from the previous session's last lines (139–141, 0.7.0 code):** Stop `payload_keys`
now include `background_tasks`, `session_crons`, `effort`, `scratchpad_dir` → platform
invariant 2 below is amended (the field ARRIVES; whether 0.7.0's deferral read it or the
transcript scan is not distinguishable from the line — `agents_in_flight: 1` either way).

## Phase 1 — what `fde02fe` built (two 2026-09-09 build entries; suites at build; PUSHED + INSTALLED 09-10 · the turn-end + lens + kb writers now OBSERVED live, above)

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

## The judge finding (2026-09-06; Q20 open — its inputs are WRITTEN by 0.9.0 and 0.9.0 is now LIVE, so Q20's one check is runnable)

On one real 8.8 KB recall prompt (haiku, 28-entry index): `api_ms ≈ wall` — the child
DELIBERATES 2.1–8.9k output tokens for a ~600-char verdict, 4× variance on identical input
(`--effort low` 25.8 → 56.9 s; `--effort medium` 95.8 s > the 60 s budget — the ETIMEDOUT
mechanism); same configuration twice → DIFFERENT picks in every pairing; 10-turn replay
identical 3/10. Lean buys no-boot + −36% cost + no state pollution, NOT speed. Since 0.9.0
every recall fire writes judge_chosen + ranker_top → `judge.agreement_pct` / `judge.agreement_n`
(1.12.0 keys) — 0.9.0 lines now EXIST here (13), so Q20's one check is a scorecard run away.

## LIVE — the status spine AND the ships (dogfood, tasks #1)

- (a) staleness: ⚠ line right 5/5 ships; false git-HEAD ⚠ after a model commit + authored prose
  wrong 4/5 → #8 (unchanged).
- (b) fallback fires: now READABLE — 13 `"version":"0.9.0"` lines exist in this checkout; the
  `engine` field on the 4 recall lines was not read this pass, so the count stays open.
- (c) ledger truth: CLOSED by #24. (d) statusline: correct (110 B / 50 ms).
- (e) 0.7.0 live legs: `engine` / `ms` / `lean` / `deferred` / `payload_keys` — PRESENT on the
  previous session's lines 139–141 (0.7.0 was running there); tail under 9,000 chars
  (`emitted_chars` 515–6,244 on those lines); no kb-pull fire inside a judge child; `[instr]
  items: N new (oldest Nd)`; one real wake-turn ending on the owner's request — the last three
  still unobserved.
- (f) Phase 0 live legs: no longer failed — the Stop hook WRITES (above); recorder fixtures
  REAL + kb-pull inline/`cut` (arrival entry) stand. STILL OPEN here: a self-check nudge naming
  a real un-checked mutation, a silent allow on a named check, `digest: pointer` + the
  `kb_query` cue, and `[instr] running`. **CORRECTED 2026-09-11 (the 13:00 pass had this
  backwards):** `instrRunning` compares the manifest beside the EXECUTING script against the
  ledger, and the executing script IS the installed copy — so with steward 0.6.0 pushed but
  uninstalled the line is SILENT, not non-empty. It can only fire in a process that started
  BEFORE an update landed (the G1 class: update without restart). The checkout-vs-install drift
  this ship created is visible only to `running.installed_vs_checkout` (harness-stats, checkout
  only — Q24), which is why the briefing must AUTHOR "not installed": no instrument prints it.
- (g) **CLOSED 2026-09-11 evening** (session log entry, its own commands — a `node -e` over the
  trace and one `harness-stats --root .`, exit 0, 14 sources): the trace has grown to **28 v1
  lines, 9 of them `duty:"context-recall"`, and EVERY one carries `judge_chosen` + `ranker_top`**
  — Q20's missing input exists. Scorecard: `trace.lines_per_dispatch` 1 · `acted_on.spans` 6 ·
  `judge.agreement_n` 3 / `agreement_pct` 66.7 · ~~`uptake.used_pct` 100~~ **RETIRED — that
  number came from the pre-idf scorer that credited this model's own four-line preamble as
  "used" (1.16.0 above); it is not comparable to any later reading and is not a baseline** ·
  `tail.under_bound_pct` 100 · `running.stale_trace_lines` 0 · `briefing.contradictions` `n/a`
  (waits on #8) · **`running.installed_vs_checkout` NON-EMPTY for the five plugins behind at
  THAT run** (six now, plus two absent — the list above) — the ship position in this file,
  measured by the instrument rather than argued. Nothing here required an install; it is all
  checkout evidence, per Q24.
- (h) **#1 leg C — the hook-liveness WATCH FIRED, and it was a FALSE POSITIVE (2026-09-11 night,
  captured IN the sitting as the leg requires).** Both halves of the trigger held: 142
  `checks.jsonl` lines carrying this session's id against 0 Stop trace lines. Cause: the sitting
  had never YIELDED — 760 transcript lines, ONE `promptId`, 0 `stop_hook_summary` entries, and a
  Stop hook cannot write before a turn ends; `checks.jsonl` grew because PostToolUse fires per
  tool call, which is itself proof the plugin was loaded. A timed hand-run of the INSTALLED 0.9.0
  over that transcript: **exit 0, 38,436 ms, 2,334-byte tail ("3 duties are unmet"), +2 trace
  lines** — the hook works. Those two lines carry `prompt_id: "legC-handrun"` and must be
  EXCLUDED from any per-fire measurement. The predicate was missing its denominator and is
  re-cut in #1 leg C; the 38.4 s hand-run also sits uncomfortably close to the 90 s hook budget
  on a long transcript (a datum for #17's transcript tail-read, not a finding).
- (g, prior reading) Phase 1 live legs — mostly closed by observation 2026-09-11 midday: first
  Stop line `"version":"0.9.0"` ✓ (13 lines) · `duty:<id>` per recall fire ✓ (4) ·
  `duty: acted-on` ✓ (2) · kb lines on the kb-pull / kb-session-start keys ✓ (2; the two
  spellings not separated this pass) · one `agent: verifiability-lens` line after a dispatch ✓
  (1). OPEN: the `judge_chosen` / `ranker_top` FIELDS read off a recall line (Q20's input), and
  one `harness-stats --root .` run showing `trace.lines_per_dispatch` ≥ 1, `acted_on.spans` > 0,
  `judge.agreement_n` > 0 — runnable from a checkout only, since plugin-toolkit is uninstalled
  (Q24).

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
   `checks.jsonl` or the transcript's hook summaries. **AMENDED 2026-09-12 (leg C fired false):
   the pairing also needs a YIELD denominator.** A sitting that has not yielded once has no Stop
   line BY CONSTRUCTION — and a long single-turn sitting with hundreds of tool calls is this
   project's normal shape, so "checks grow, trace flat" is the signature of a HEALTHY first turn,
   not a dead hook. Read silence only after a `stop_hook_summary` exists (or ≥2 distinct
   `promptId`s).

## Hook-event coverage (`plugins/*/hooks/hooks.json`)

Registered on disk: SessionStart 3 · UserPromptSubmit 5 · PreToolUse 2 · Stop 4 · Notification
1 · PostToolUse 1 + PostToolUseFailure 1 (turn-end, installed 0.9.0) · **SubagentStop 1
(verifiability-lens — INSTALLED since 09-10 at 0.6.0, and one real `agent:` trace line exists
in this checkout)**. Still ZERO: PreCompact, PostCompact, SubagentStart, SessionEnd — #33 (compaction
guard) and #35 (every agent traced; SubagentStart's `agent_id` is the join key). **The 17th
plugin adds nothing here: `elicit` 0.1.0 ships zero hooks, zero code and zero state** — the
cheapest possible shape for a new capability, and the reason it costs no per-session tax.

## Known-broken / known-gaps (parts.md carries the file:line gap maps)

- **The 09-09 Stop-hook silence: UNEXPLAINED and now UNREPRODUCIBLE** (above) — the process and
  its `.claude/` tree are gone. Not closed, not diagnosable: re-cut as #1's WATCH leg (if a
  sitting ever again shows Stop lines absent while `checks.jsonl` grows, capture the
  transcript's hook summaries THAT sitting). The 0.7.1 instrument stays blind to a hook that
  never runs — that is why the pairing rule (platform invariant 6) is the mechanism.
- **Evaluators unmeasured (G4): CLOSED at 0.9.0 / 0.14.0 / 0.6.0 and LIVE since the 09-10
  install** — turn-end 13 lines / kb 2 / lens 1 read this pass; residual legs → #1(g).
- **No scorecard (G5): CLOSED at 1.12.0 and grown to 1.16.0 (16 metric sources; PUSHED, still
  uninstalled)** — plugin-toolkit remains UNINSTALLED, so the gate runs from a checkout only →
  Q24. The standing `[instr]` pick is NO LONGER open: the owner delegated it 09-10 ("you decide")
  and five keys ship in `plugins/plugin-toolkit/defaults/harness-stats.json`, re-picked 09-11 to
  lead with `uptake.used_pct` and carry no byte count (file read this pass) — Q23 CLOSED. The
  "second run shows the deltas" leg → #32's done-check.
- **Verification ground truth (G2): CLOSED at 0.8.0;** fixtures real (arrival). Residual:
  `requireGreen` per project (Q19).
- **NEW DEFECT, measured 2026-09-12 — the exec ledger manufactures FALSE NEGATIVES, the exact
  mirror of the false-clean it was built to catch.** `.claude/turn-end/checks.jsonl` records
  `cmd: command.slice(0, MAX_CMD_CHARS)` with `MAX_CMD_CHARS = 300`
  (`plugins/turn-end/hooks/scripts/tool-record.js:44,137`, read this pass), so a gate invoked at
  the TAIL of a long compound command is simply absent from the ledger text. Cost this session:
  the verifiability lens refuted TWO gate runs that had in fact run and passed. Two details the
  fix turns on, both from the source: (a) the cut is SILENT — the sibling sample truncator marks
  its own (`:90` appends `…[+N]`), this one does not, so a reader cannot distinguish "short
  command" from "cut command"; (b) `classify(command)` and `filesInCommand(command)` run on the
  FULL string (`:127,138`), so `kind: "check"` and `files` stay correct while the evidence text
  is gone — the ledger half that a reader trusts least is the half that survived. This poisons
  every consumer of "did a check run": self-check (invariant 10), Q19's ran-and-observed floor,
  the lens's refute/confirm, and #32's goal duty, whose satisfaction signal IS this file → #42.
- **No goal-based termination (G3):** → #32, UNBLOCKED (Q18/Q19). `/goal` excluded by default
  under invariant 1 (harness §9.5, not ruled).
- **Briefing staleness — NOT dead:** authored prose wrong 4/5; false git-HEAD ⚠;
  `briefing.contradictions` registered and null → #8 unblocks the key.
- **kb (0.14.0 on disk AND installed):** cap / dedupe / pointer / malformed-config / floor-leak CLOSED at
  0.13.0. RESIDUAL (audit): `source` facet unfilterable; stamp-titled archived digests → noise;
  8-digit runs in h2 titles read as timestamps; a BOM defeats frontmatter → #38.
- **turn-end (0.11.0 PUSHED + uninstalled · 0.9.0 installed and running):** `DUTIES` hard-coded (`lib/duties/index.js:59`); whole transcript
  re-read every Stop (`context.js:122-123`, 170 MB → 1.4 s — and now a silent-hook suspect) →
  #17; no per-duty supply budget → #17; no compaction guard → #33; sub-agents observed only by
  transcript scan → #35 (the SubagentStop payload is measured; lens 0.6.0 is the first
  consumer); cost recorded, never told → #34.
- **steward (0.6.0 PUSHED + uninstalled · 0.5.2 installed and running):** `agents/steward.md:59-60` still instructs a done/-move → #8; protocol
  text not anchored to `<git root>/…` everywhere (`SKILL.md:55-56,79`, `commands/next.md:8`,
  `agents/steward.md:24`, `session-digest.js:76,78`) → #8; wrong-root drops in aithseis from
  twin-game's MODEL text → #12.
- **Docs (counts-class): the public surface was rebuilt and GUARDED (Track 5), the counts class
  was not.** Root CLAUDE.md still says "three repo-level gates" while its own table lists four —
  visible in the text injected at THIS session's open, i.e. it survived both the 019e007 doc sync
  and the Track 5 pass → #6. What DID change: RELEASE-NOTES is retired repo-wide in favour of
  `CHANGELOG.md` + `design/notes/<plugin>-history.md`, so every model reference to a
  "RELEASE-NOTES entry" now means a CHANGELOG entry, and `plugin-docs` (registry-check) enforces
  README + top-version + ≤200-char description mechanically.
- **harness / hooks:** `++` injected TWO ways (both hooks; CLAUDE.md restatement dropped
  09-09); five design-open surfaces kept BY RULING (Q15); `@prompt`'s steward check uses cwd;
  modifier propagation to sub-agents is prose only → #35.
- **Generativity under-delivery (owner 08-26, re-stated 09-08):** vocabulary + nudge shipped
  (patterns); the MEASURED half → #37 with #15's executor-step wiring; `/patterns` never
  invoked; outcome change now measurable by `harness-stats` once a `design.*` key exists.
- **Knowledge accretes (owner 09-08) — now MEASURED per asset (1.16.0 `asset-value`):**
  `.steward/log.md` scored **0 of 1 used across 5 surfacings**, and an `unused_assets` keep/cut
  list exists; the digest is CUT by the platform bound in 1 injection of 5 (1.15.0); standing
  25.6 KB per session + sub-agent; log ~100 KB, parts ~55 KB; no lifecycle on kb entries. Q21 now
  has real input instead of an argument. **New defect the source found:** `asset.origin_recorded`
  is FALSE — `.claude/kb/` is gitignored, so no entry has a commit, author or history, and
  provenance can only be recorded by a frontmatter field at CAPTURE time (owner deferred) → #38.
- **code-glossary:** signature signal DEAD for JS/untyped params (`signals/signature.py:46-48`,
  `with_signature_hash` 0/128 on plugins/kb) → #15 (precondition for #37's signals).
- **Test sweep datum — FOUR distinct suspects now, and they must not be merged (#9):** (1) the
  09-09 intermittent (essense-flow `test/run-all.cjs` red in 3 of 7 sweeps, green run direct);
  (2) its fixtures resolving OUTSIDE the repo (the #7 leaked-path debt from the test side);
  (3) code-glossary's pytest deps absent in this checkout — a "not runnable here", which 1.10.0's
  own skip discipline says must report as SKIPPED, not red; (4) **NEW 09-11:
  `tests/ledger-compaction.test.js` was RUNNING AND CHECKING NOTHING since the gate began** — the
  model held it "red on a clean tree (calendar drift)", and the truth is it asserted nothing at
  all; only 1.14.0's counting fix made that visible. Suspect (4) also invalidates the old reading
  that "test-all's shape-discovery missed it".
  **Suspect (1)'s MECHANISM is NAMED 2026-09-12 — and it is a REPORTER defect, not a flake in
  essense-flow.** The signature is stable across 4 of 8 observed sweeps: `essense-flow:
  test/run-all.cjs — exit 1` under the sweep, green standalone. Why every investigation stalled:
  `bin/test-all.js:118` runs each child through `spawnSync(..., {encoding:'utf8'})` so stdout AND
  stderr ARE captured and passed to `classify` (`:122-123`), but the FAILED branch keeps only
  `note: exit <status>` (`lib/test-sweep.js:199`) and the renderer prints label + suite + note
  (`:257`) — **the evidence is DISCARDED at the reporter, never missing.** So the sweep can say a
  suite failed and can never say why, and four red sweeps produced zero diagnostic bytes. The
  first move is therefore plugin-toolkit's, not essense-flow's: surface the captured output on
  failure, THEN re-run and read what the child actually printed (→ #9).
- **Git hygiene across ships:** unchanged (aithseis uncommitted 43 days; volatile
  `.claude/turn-end/` committed in Endure + twin; lens state committed in psience + aithseis;
  11 MB PNG in crowd; this repo gitignores `.claude/*`) → #12 / #5. **This repo's own residue:**
  `.pipeline/` is untracked AND not gitignored — the dead 2026-04-22 cache. Track 4 cut its cost
  to ONE SessionStart banner (once installed), and `state-reconcile --apply` is the WRONG remedy
  here: it would assert `phase: architecture` on a repo that runs no pipeline. So the remaining
  choice is gitignore-or-delete, a one-minute chore parked under #12, not a defect.
- **Publishing order, learned the hard way 2026-09-12:** 18 tags were pushed BEFORE the branch,
  the branch push was then REJECTED (origin had moved), and the rebase orphaned six published
  tags — refs on origin pointing at commits unreachable from main. Caught by walking every tag
  with `git merge-base --is-ancestor <tag> main`, re-pointed and force-pushed; `ls-remote --tags`
  now matches local for all 29. Law: **push the branch first, tags only after it lands** (parts.md
  cross-reference discipline).
- **Base freshness, learned the same day and more expensively:** a whole feature (thorough-mode
  1.12.0) was built on a checkout TEN COMMITS stale, so its doc cascade landed on surfaces
  upstream had already retired and its suite baseline was read wrong (21 vs 22). `registry-check`
  exited 0 throughout — it validates the checkout against ITSELF and structurally cannot see a
  stale remote. Law: **`git fetch` is step 0 of any version bump**, making the reach chain
  fetch → bump → push → install → restart (parts.md cross-reference discipline) → #41 mechanizes
  it as a claim source, because invariant 3 says a rule kept as text is a rule that will break.
- Standing, unchanged: invariant-9 hole (#3) · Q12 CI · Q13 sonnet · absolute-path debt (#7) ·
  counts-in-prose (#6) · crowd deep-seed (#5) · Diploma banner (#10) · #21 patterns
  interactive legs · kb MCP version-proof (#4 — 0.14.0 is now the INSTALLED version, so the
  check is runnable today).

## Outside-repo (log-only context)

Five ships: mk-cc-resources, twin-game, crowd-game, aithseis, Endure. Status contract adopted
in 1/5 (this one) → #12. Marketplace: github source, `autoUpdate: true`; a push is required
before any install sees a change, a RESTART before the running process does — and a hook that
runs then says which of the two it is in; a hook that does not run says nothing (invariant 6).
**This ship sits exactly on that boundary:** pushed, so an install CAN see it; not installed, so
no process anywhere runs it — and the version-pin law above is the third condition (a bump is
what makes a fix deployable at all).
