# State — current truth (2026-09-09 · Phase 0 SHIPPED `68ce999` + INSTALLED, NOT YET RUNNING in the live process · four rulings law · HEAD 68ce999 at pass start)

> Read this before doing anything:
> - Limits-awareness: Claude drifts, loses context, finishes prematurely, defers, takes shortcuts. Re-read when uncertain. Preserve specifics.
> - Positive mindset: every gap solvable. Find the way by working carefully.
> - Quality ownership: this work matters. Take ownership.
> - Propagation requirement: every descendant artifact must carry these same four instructions.

## Ship position

**local main @ `68ce999`** (ref file read this pass) = the Phase 0 ship — four commits
(turn-end / kb / steward / docs+model) pushed `bc39fe0..68ce999` on 2026-09-09 (owner: "Yes,
ship it"). Gates at ship per the log entry: test-all `--root` 33/33 suites / 1,849 checks ·
registry-check 0 · repo-guard 0 (incl. the five new files once tracked). `claude plugin
marketplace update` + `claude plugin update` after the push → **`installed_plugins.json`
read this pass: turn-end 0.8.0, kb 0.13.0, steward 0.5.2, each `gitCommitSha` = `68ce999…`,
`lastUpdated` 2026-09-08T23:47Z** (installed == HEAD for the three). Working tree at
snapshot: `.steward/log.md` + the session digest only (per the session); the tree did not
move mid-pass. The 09-08→09 sitting: research + plan, four rulings, owner law, Q15 slim,
#29 → #27 → #28, ship — one sitting, owner present throughout.

## Versions on disk (all 16 plugin.json grep-read this pass)

Moved at `68ce999`: **turn-end 0.8.0 · kb 0.13.0 · steward 0.5.2** (marketplace rows +
descriptions, README rows, RELEASE-NOTES, plugin + root CLAUDE.md per the build entries).
Unchanged: plugin-toolkit 1.11.0 · thorough-mode 1.11.2 · verifiability-lens 0.5.1 ·
patterns 0.1.1 · essense-flow 0.26.2 · essense-autopilot 0.4.1 · prism 0.1.0 · statusline
0.2.0 · session-lifecycle 1.3.1 · schema-scout 1.2.1 · project-note-tracker 1.8.0 ·
alert-sounds 1.1.1 · reuse-gate 0.1.0. Marketplace metadata / bundle versions not re-read
this pass (no item touched them; registry-check exit 0 at ship is the evidence).

## INSTALLED ≠ RUNNING — now INSTRUMENTED (#29), still TRUE of this process

Measured this pass: `.claude/turn-end/trace.jsonl` = 138 lines; lines carrying `"version"`
or `"stale"` = **0**; `.claude/turn-end/samples/` absent → no turn-end fire since 0.7.1 has
happened in this repo, i.e. the process this pass runs under predates the 09-09 update
(0.7.0's `"deferred"` legs from Tier 1 are likewise still unproven — one restart proves
both ships). Since 0.7.1 / 0.5.2 the fact is PRINTED instead of inferred: a stale process
gets `[instr] running steward 0.5.2 ≠ installed … — restart Claude Code to load it` in the
briefing and one prefixed first line on turn-end's tail; equal → silent (both shapes probed
live against the real ledger at build; pre-bump the same probe traced `stale:false`). **The
live check for the first sitting after a restart (log ship entry):** a Stop trace line with
`"version":"0.8.0"` and no stale prefix; the first Bash call writes
`.claude/turn-end/samples/PostToolUse.json` (the recorder's real fixture); a kb-pull fire
≤ 8,192 B with `digest: cut|pointer`. → tasks #1 leg (f).

## Phase 0 — what `68ce999` closed (three 2026-09-09 build entries; suites at build)

- **#29 (turn-end 0.7.1 + steward 0.5.2):** `plugins/turn-end/lib/installed.js` (fail-soft;
  running = manifest beside the executing script, installed = `installed_plugins.json`
  entry for the same name, user scope preferred, newest wins); `version` + `stale` on every
  trace line; a stale process PREPENDS one line to the tail it already emits; steward
  `instrRunning` — third `INSTRUMENTS` entry, own copy (cross-plugin duplication
  deliberate). turn-end 175/175 (+5), steward-brief 50/50 (+5), status 13/13.
- **Q15 slim (the owner's global CLAUDE.md — an owner-side file, not this repo):**
  Generalize-First Gate 1,788 B → ~640 B (the five steps live in the `generalize-first`
  hook; one-line summary + anti-signals stay), the `++` augment restatement dropped
  (hook-injected twice already); 6,528 → 5,228 B; hooks untouched per the ruling; backup
  `CLAUDE.md.pre-slim-20260909.md` beside it.
- **#27 (kb 0.13.0):** kb-pull's WHOLE output within `PLATFORM_INLINE_BOUND_BYTES = 8192`
  (measured: the smallest output the platform ever stubbed was 9.9 KB, three times; 10 KB
  once); digest cut on a line boundary with a marker naming the platform; per-session hint
  dedupe + `(+N more above the floor (k already hinted this session) — kb_query "<terms>")`
  cue; unchanged digest → ONE pointer line; malformed `.claude/kb.json` → one visible line,
  digest still injected; `lib/pull-state.js` (home-side `~/.claude/kb/pull-state/<root-hash>
  .json`, session-scoped, presence-gated, `KB_PULL_STATE_DIR` test seam); kb-session-start
  clears the digest hash every fire (compaction throws the transcript copy away); the
  body-repeat bonus routed to the body side (the `term-overlap.js` floor leak). kb 276/276,
  kb-pull 88/88 (+37), footprint 31/31 (the new writer audited with its why). **Live probe
  on this repo's REAL 11,353 B digest, same prompt ×3:** fire 1 = 8,110 B (`digest: cut`,
  3 hints), fires 2–3 = 324 B (`digest: pointer`, `held: 3`, cue present) — the sitting's
  own digest had been past the bound all evening, stubbed unread.
- **#28 (turn-end 0.8.0):** `lib/file-touch.js` — ONE extractor (tool targets + Bash/
  PowerShell argv → mutations `sed -i`/`>`/`>>`/`tee`/heredoc/`cp`-`mv` dest/`touch`; reads
  `cat`/`head`/`tail`/`sed -n`/`grep FILE`; pure, conservative — flags/vars/globs/devices
  never files; sed's script arg and a bare `>>` were the two parser bugs the suite caught).
  self-check: mutations via file-touch (Bash edits count); named-check FLOOR
  (`namedCheckAnchored`: a ratio, a touched basename, or a command head the turn ran —
  "Check: none" is a confession); `MODALITIES` registry (prose re-read / scene look / code
  run); `requireGreen` knob reads the recorder ledger, default OFF (= Q19 ran-and-observed).
  context-recall: `dropAlreadyRead` drops notes at paths the turn opened (Read OR Bash), the
  judge prompt lists "FILES THIS TURN OPENED", trace carries `alreadyRead`. NEW hook pair
  PostToolUse + PostToolUseFailure on `Bash|PowerShell` → `hooks/scripts/tool-record.js` →
  `.claude/turn-end/checks.jsonl` + one real payload per event under `samples/` (fixtures
  first, the lens's escalation 4; Bash `tool_response` is undocumented — keys recorded,
  exit parsed best-effort, null never guessed); footprint only where turn-end keeps state;
  silent in judge children. Item 4 (`startedAt` from the transcript) was already live since
  0.7.0 — not rebuilt. 189/189 (+14). **Live through the real hook** (temp project, `sed -i`
  edit in the transcript): "Check: none" → nudged; "verified by inspection" → nudged;
  "Check: node tests/parser.test.js → 12/12" → silent allow; "Check: re-read parser.js
  against the ask; result: matches" → silent allow.

## Rulings that became law this sitting (inbox 20260909-0015; verbatim in questions.md)

Q19 "done" = a check RAN after the last change AND observed, not required green,
per-project override · Q18 the goal duty arms EVERY task the owner starts, advise; the
metric rule RATIFIED → invariant 12 · Q16 KEEP THE CUE (no auto-seed, no one-keystroke
seed; owner chose against both proposals) · Q15 SLIM ONLY (no registry fold; #17's fold leg
OFF). Owner law (inbox 20260909-0010): never point the owner to files, everything digestible
in-environment, do as much as possible alone, least clicks → invariant 13.

## The judge finding (2026-09-06 — SUPERSEDES the "slow from startup" reading; Q20 open)

Measured on one real 8.8 KB recall prompt (haiku, 28-entry index; inbox `20260906-1700`):
`api_ms ≈ wall` — the time is INFERENCE; the child DELIBERATES 2.1–8.9k output tokens for a
~600-char JSON verdict and the amount varies 4× on identical input (`--effort low` 25.8 s →
56.9 s on two identical runs; `--effort medium` 95.8 s, past the judge's own 60 s budget —
the mechanism behind the 12 ETIMEDOUTs audit 2 counted). Same configuration twice →
DIFFERENT picks in every pairing tried; 10-turn replay: identical verdict sets 3/10, lean
avg 28.4 s vs plain 32.7 s, $0.026 vs $0.040. Lean buys no-boot + −36% cost + no state
pollution, NOT speed. The judge's verdict is a distribution, not a fact → Q20 (five
options, each with its check; #30 writes the agreement inputs).

## LIVE — the status spine AND the two ships (dogfood, tasks #1)

- (a) staleness: ⚠ line right 5/5 ships; false git-HEAD ⚠ after a model commit + authored
  prose wrong 4/5 → #8 (unchanged).
- (b) fallback fires: 0.7.0 WRITES `engine`/`ms`/`costUsd` — readable the moment a 0.7.0+
  trace line exists (none yet, above).
- (c) ledger truth: CLOSED by #24.
- (d) statusline: correct (110 B / 50 ms).
- (e) 0.7.0 live legs: `engine`/`ms`/`lean`/`deferred`/`payload_keys` on a Stop line; tail
  under 9,000 chars, demands first; no kb-pull fire inside a judge child; `[instr] items:
  N new (oldest Nd)`; one real wake-turn ending on the owner's request.
- (f) NEW — 0.8.0 / 0.13.0 / 0.5.2 live legs: `"version":"0.8.0"` with no stale prefix;
  `[instr] running` line ABSENT after the restart; `samples/PostToolUse.json` after the
  first Bash call; `checks.jsonl` growing; kb-pull ≤ 8,192 B, `digest: cut` then `pointer`,
  no repeated hint id in one session; a self-check nudge naming a real un-checked mutation.

## Audit verdicts (2026-09-06 — still the evidence base; numbers per the lens errata)

- **Evidence:** 269 session files → 235 headless recall judges + 33 real sessions + 1
  unknown-kind / 212 human prompts (twin-game 68 · psience 61 · mk-cc-resources 45 ·
  aithseis 28 · BiananceRepo 8; psience + BiananceRepo have NO kb/steward).
- **Used deliberately:** steward captures 97 · integrate dispatches 28 · session-digest
  edits 108 · `@prompt` 11 / `@ship` 5 / `++ @verify` 1 · /prism unprompted in psience ·
  kb MCP 38 calls.
- **Used in NO real session:** /handoff /resume /retro /claude-md-sync, /kb, kb-capture,
  steward:brief/next/fleet, /patterns, /verifiability, code-glossary, every essense-flow
  skill/agent (0 since 08-10), reuse-gate (dormant since 07-07).
- **Cost:** hook text per real prompt avg 6,361 B / p50 4.5 / p95 20.5 / max 31.7 KB
  (1,316.8 KB total); recall supply 382.6 KB (largest), kb-hints 339 KB seen of 920 KB
  produced (bounded since 0.13.0), verification-rules 378 × 424 B (guarded since #25),
  caveman 44 KB. kb-hints 84% ignored (top-3 ids fill 40% of slots — dedupe since 0.13.0;
  re-measure is #31). Spawns per prompt: ≥8 UserPromptSubmit + 5 Stop; standing context
  25.6 KB per session AND per sub-agent (global CLAUDE.md 6.5 → 5.2 KB after the Q15 slim).
  Every judge child paid the whole harness (~3.75 MB) — CLOSED by the lean flags, pending
  live proof.
- **Where the owner felt the loss:** the two projects with NO kb/steward (psience 09-01
  *"i said it in the previous session why is it not saved?"*) → Q16 RULED keep the cue.
- **Works (evidence):** steward recompute + model quality · root anchoring · turn-end 0
  `errored` across ~380 fires · kb frontmatter 174/174 · prism adopted unprompted ·
  statusline · patterns catalog 41 valid, gate once per prompt_id.

## PLATFORM INVARIANTS (measured — design against them)

1. **>~10 KB hook output → a 2 KB preview stub** (53× kb-pull, 2× recall tails in real
   sessions; 77× in judge sessions; the smallest stubbed output measured 9.9 KB). An
   injection over the bound is NOT READ. Turn-end's tail hard-capped at 9,000 chars
   (0.7.0); kb-pull's whole output at 8,192 B (0.13.0) — every push surface is now bounded
   and names its cut.
2. **A background-agent completion wakes a NEW prompt span and re-fires every
   UserPromptSubmit hook** (62 prompts show 2–12× re-fires). The Stop payload does NOT
   carry `background_tasks` — 0.7.0 derives agents in flight from the transcript;
   `payload_keys` in the trace will show if it ever arrives.
3. **`additionalContext` on a Stop hook continues the turn** — 0.7.0 emits the give-up
   note once, then silence.
4. **`/clear` does not reload plugins; a process keeps the hook code it started with**
   (G1, 2026-09-08). Since 0.7.1 / 0.5.2 the running-vs-installed mismatch is PRINTED
   (#29); "installed" is a disk fact, "running" is what the trace's `version` says.
5. **Hooks register at process start** — a NEW hook event (the 0.8.0 PostToolUse pair)
   fires nowhere until the process that installed it restarts; its real-payload fixtures
   therefore land only in the next sitting.

## Hook-event coverage (turn-end `hooks.json` grep-read this pass)

Registered: SessionStart 3 · UserPromptSubmit 5 · PreToolUse 2 · Stop 4 · Notification 1
(per the 09-08 count) · **PostToolUse 1 + PostToolUseFailure 1 (turn-end 0.8.0, NEW — the
recorder pair, informational)**. Still ZERO: PreCompact, PostCompact, SubagentStart,
SubagentStop, SessionEnd (0 on 09-08; no item touched them) — the events #33 (compaction
guard) and #35 (sub-agent trace) need.

## Known-broken / known-gaps (parts.md carries the file:line gap maps)

- **Verification ground truth (G2): CLOSED at 0.8.0**, live proof → #1(f). Residual: Bash
  `tool_response` is undocumented — the recorder records keys and parses exit best-effort
  until the real fixtures exist; `requireGreen` is the per-project knob (Q19).
- **No goal-based termination (G3):** → #32, UNBLOCKED (Q18 every task, advise; satisfied by
  the 0.8.0 `checks.jsonl`, ran-and-observed per Q19). `/goal` itself: excluded by default
  under invariant 1 (harness §9.5, not ruled).
- **Evaluators unmeasured (G4):** lens 27 dispatches / 0 trace; judge nondeterministic
  (above), `chosen` empty ~50% of supplies. → #30 — NEXT.
- **No scorecard (G5):** the audit's method lives in a scratchpad. → #31.
- **Briefing staleness — NOT dead:** authored prose wrong 4/5; false git-HEAD ⚠ → #8.
- **kb (0.13.0):** cap / dedupe / pointer / malformed-config / floor-leak CLOSED. RESIDUAL
  (audit citations, out of #27's scope): `source` facet advertised but unfilterable;
  archived digests titled by stamp → noise hits; 8-digit runs in h2 titles become
  timestamps; a BOM defeats frontmatter → swept under #38 (knowledge hygiene).
- **turn-end (0.8.0):** `DUTIES` hard-coded array (`lib/duties/index.js:59`); whole
  transcript re-read every Stop (`context.js:122-123`, 170 MB → 1.4 s) → #17; no per-duty
  supply budget → #17; no compaction guard → #33; sub-agents observed only by transcript
  scan → #35; cost recorded, never told → #34.
- **steward (0.5.2):** `agents/steward.md:59-60` still instructs a done/-move → #8; the
  `:62-66` install-instrument claim is now TRUE by construction (`instrRunning`); protocol
  text not yet anchored to `<git root>/…` everywhere (`SKILL.md:55-56,79`,
  `commands/next.md:8`, `agents/steward.md:24`, `session-digest.js:76,78`) → #8;
  wrong-root drops in aithseis from twin-game's MODEL text → #12.
- **harness / hooks:** `++` now injected TWO ways (both hooks; the CLAUDE.md restatement
  dropped 09-09); the design-open concern keeps its five surfaces BY RULING (Q15 slim only —
  text retires only as #37's measured duty proves itself); `@prompt`'s steward check uses
  cwd; modifier propagation to sub-agents is prose only → #35.
- **Generativity under-delivery (owner 08-26, re-stated 09-08):** vocabulary + nudge
  shipped (patterns); the MEASURED half → #37 (ambient duty + `@ship` gate) with #15's
  executor-step wiring; `/patterns` never invoked; outcome change unmeasured until #31.
- **Knowledge accretes (owner 09-08):** standing 25.6 KB per session + sub-agent; log 82 KB,
  parts 49 KB; no lifecycle on kb entries → #38, Q21.
- **code-glossary:** signature signal DEAD for JS/untyped params (`signals/signature.py:
  46-48`, `with_signature_hash` 0/128 on plugins/kb) → #15 (precondition for #37's signals).
- **Test sweep datum (2026-09-09):** essense-flow `test/run-all.cjs` reported exit 1 under
  test-all on 2 of 5 sweeps while the same suite run directly passed 54/0 — INTERMITTENT
  under the sweep, untouched by the work; a second suspect beside ledger-compaction → #9.
- **Git hygiene across ships:** unchanged (aithseis uncommitted 43 days; volatile
  `.claude/turn-end/` committed in Endure + twin; lens state committed in psience +
  aithseis; 11 MB PNG in crowd; this repo gitignores `.claude/*`) → #12 / #5.
- Standing, unchanged: invariant-9 hole (#3) · Q12 CI · Q13 sonnet · absolute-path debt
  (#7) · counts-in-prose (#6) · crowd deep-seed (#5) · Diploma banner (#10) · #21 patterns
  interactive legs · kb MCP version-proof (#4, now expects 0.13.0).

## Outside-repo (log-only context)

Five ships: mk-cc-resources, twin-game, crowd-game, aithseis, Endure. Status contract
adopted in 1/5 (this one) → #12. Marketplace: github source, `autoUpdate: true`; a push is
required before any install sees a change, and a RESTART before the running process does —
and since 0.7.1 / 0.5.2 the ship tells the owner which of the two it is in.
