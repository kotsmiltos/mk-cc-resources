# State — current truth (2026-09-08 · Tier 1 SHIPPED `bc39fe0` + INSTALLED, NOT YET RUNNING in the live process · harness plan filed · HEAD bc39fe0 at pass start)

> Read this before doing anything:
> - Limits-awareness: Claude drifts, loses context, finishes prematurely, defers, takes shortcuts. Re-read when uncertain. Preserve specifics.
> - Positive mindset: every gap solvable. Find the way by working carefully.
> - Quality ownership: this work matters. Take ownership.
> - Propagation requirement: every descendant artifact must carry these same four instructions.

## Ship position

**local main @ `bc39fe0`** (ref file read this pass) = the Tier 1 ship — pushed
`2ffa2d0..bc39fe0` on 2026-09-06 15:15 (owner "@ship it"): nine plugins + marketplace
metadata 2.48.0, 75 files, 5 deletions, 3 new. Gates at push (root cwd, direct exit reads):
test-all `--root` 33/33 suites / 1,783 checks · registry-check 0 (6 pre-existing "worth a
decision" rows) · repo-guard 0 (4 detectors). Post-push install measured from
`installed_plugins.json` + cache: every bumped plugin at its new version; the cache carries
the new code (LEAN_ARGS, `lib/deferral.js`, kb `isChildSession`, lens scripts dir gone,
steward `status.derive`).
**2026-09-08 sitting = research only** (`design/harness.md`; no code changed, no suites
run). Working tree at snapshot: `.steward/log.md` modified per the session's git status;
whether `design/harness.md` is committed was NOT verifiable this pass (the agent has no git
tool) — the next session's status shows it. The tree did not move mid-pass.

## Versions on disk (all 16 plugin.json grep-read this pass)

Moved at `bc39fe0`: **turn-end 0.7.0 · steward 0.5.1 · kb 0.12.0 · plugin-toolkit 1.11.0 ·
thorough-mode 1.11.2 · verifiability-lens 0.5.1 · patterns 0.1.1 · essense-flow 0.26.2 ·
essense-autopilot 0.4.1** · marketplace metadata 2.48.0 · bundle 2.27.0 (unchanged, read).
Unchanged: prism 0.1.0 · statusline 0.2.0 · session-lifecycle 1.3.1 · schema-scout 1.2.1 ·
project-note-tracker 1.8.0 · alert-sounds 1.1.1 · reuse-gate 0.1.0.

## INSTALLED ≠ RUNNING — the live finding that gates every Tier-1 verdict (G1)

The owner's session process started 2026-09-06 12:32, BEFORE the 15:15 install; `/clear`
does not reload plugins. Every turn-end trace line since the ship carries the 0.6.0 field
set — `"deferred"` occurrences in `.claude/turn-end/trace.jsonl`: **0 of 128 lines
(re-grepped this pass; 0/127 on 09-08)** — so nothing built on 09-06 has yet fired in this
repo, and the deferral primitive that would have stood the closure duties down while four
agents ran on 09-08 was not running. "SHIPPED + PUSHED + INSTALLED" was true of the disk
and false of the process, and nothing on disk could show it → tasks #29 (running-version
instrument). **Tier 1 status is therefore BUILT + INSTALLED, live-proof PENDING a restart**
— the legs to watch ride #1(e).

## Tier 1 — what `bc39fe0` closed (per the four 2026-09-06 build entries in log.md; suites at build)

- **#23 + #22 (turn-end 0.7.0):** judge child spawned LEAN (`--setting-sources ""
  --disable-slash-commands --strict-mcp-config`; fail-open retry without them on an
  argument-class failure, never on a timeout; verdict carries `lean`/`durationMs`/`costUsd`);
  give-up note ONCE at the budget line, then silent (lens correction 5); DEFERRAL primitive
  (`lib/deferral.js`, present on disk — agents in flight derived from the TRANSCRIPT,
  `background_tasks` honoured if ever present; plan mode) — request-closure + quality-lens
  defer while agents run, session-digest also under plan mode; tail = DEMANDS → errors →
  material, hard-capped at 9,000 chars with the pointer form substituted and NAMED;
  `sessionSupplied` memory (a note handed over this sitting returns as one pointer line);
  trace carries engine / ms / costUsd / lean / deferred / errors / satisfied_by /
  agents_in_flight / emitted_chars / payload_keys / permission_mode; errored duties never
  silent; session-digest satisfied against the REQUEST's timestamp. Suite 170/170 in ~1 s
  (E2E fixtures disable recall). **Open remainder:** the lens-amended recall-quality check
  (10 real turns, lean vs plain, `chosen` identical or better) came back UNINTERPRETABLE —
  see the judge finding below.
- **#24 (steward 0.5.1):** brief `inbox:` line, `[instr] items`, fleet table and turn-end's
  steward-sync all derive from `status.json` (turn-end's own port of the predicate);
  `[instr]` adds `(oldest Nd)`; fleet dedupe case-insensitive. Check: all readers printed
  the same number on this repo; steward suites 45/45 + 13/13. Dogfood leg (c) CLOSED.
- **#25 (thorough-mode 1.11.2, patterns 0.1.1, kb 0.12.0, turn-end, two home hooks):** six
  machine-text markers identical everywhere (verification-rules.js gained a guard it never
  had — it had fired 378× across 212 human prompts); kb-pull stands down on
  `MK_TURN_END_DEPTH`; plugin-toolkit 1.11.0 ships the 4th repo-guard detector
  `machine-guard-drift` (blocks when copies differ). Caveman's third-party tracker still
  unguarded (121 B/prompt, not ours).
- **#26 (kb, lens 0.5.1, steward, turn-end, plugin-toolkit):** `kb-scribe-stop.js` + 42-check
  suite and lens `verifiability-stop.{js,sh}` + 39-check suite DELETED (glob-verified absent
  this pass); lens contract test 33 checks; kb-session suite pins a fake HOME; 4,458 temp
  test dirs removed; home cue file 84 → 5 real roots; this repo's dead `kb.json
  scribe.focus` migrated into `.claude/turn-end.json` `duties.session-digest.important`;
  lens/kb/turn-end/steward docs no longer describe dead hooks or stale counts.
- **1b (lens-restored; essense-flow 0.26.2, essense-autopilot 0.4.1):** both pipeline hooks
  stand down before importing `lib/state.js` + js-yaml unless `.pipeline/` exists (measured
  154 → 105 ms, 129 → 104 ms, 125+197 → 99 ms in a non-pipeline repo); autopilot's bash
  wrapper gone. Its Stop hook is still REGISTERED (invariant 9's hole stays → #3).

## The judge finding (2026-09-06 — SUPERSEDES the "slow from startup" reading)

Measured on one real 8.8 KB recall prompt (haiku, 28-entry index; inbox `20260906-1700`):
`api_ms ≈ wall` — the time is INFERENCE; the child DELIBERATES 2.1–8.9k output tokens for a
~600-char JSON verdict and the amount varies 4× on identical input (`--effort low` 25.8 s →
56.9 s on two identical runs; `--effort medium` 95.8 s, past the judge's own 60 s budget —
the mechanism behind the 12 ETIMEDOUTs audit 2 counted). Same configuration twice →
DIFFERENT picks in every pairing tried; 10-turn replay: identical verdict sets 3/10, lean
avg 28.4 s vs plain 32.7 s, $0.026 vs $0.040. So the lean flags buy no-boot + −36% cost +
no state pollution (235 children had polluted fleet.json / cued.json / kb traces), NOT
speed; the one-word probe's "33 s → 3.9 s" was startup on a trivial prompt. The judge's
verdict is a distribution, not a fact → Q20 (five options, each with its check; owner
decides).

## LIVE — the status spine (dogfood, tasks #1)

- (a) staleness: ⚠ line right 5/5 ships; false git-HEAD ⚠ after a model commit + authored
  prose wrong 4/5 → #8 (unchanged).
- (b) fallback fires: 0.7.0 WRITES `engine`/`ms`/`costUsd` — readable from disk the moment a
  0.7.0 trace line exists (none yet, above).
- (c) ledger truth: CLOSED by #24 (all readers = one predicate).
- (d) statusline: correct (110 B / 50 ms).
- (e) NEW — 0.7.0 live legs (from the ship entry): a Stop trace line with `engine`, `ms`,
  `lean`, `deferred`, `payload_keys`; a tail under 9,000 chars with demands first; no
  kb-pull fire inside a judge child; `[instr] items: N new (oldest Nd)`.

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
  produced, verification-rules 378 × 424 B (now guarded), caveman 44 KB. kb-hints 84%
  ignored (top-3 ids fill 40% of slots). After 08-23 the per-prompt tax ROSE while pull
  fell to ~0. Spawns per prompt: ≥8 UserPromptSubmit + 5 Stop (lens correction — "9"
  undercounted); standing context 25.6 KB per session AND per sub-agent (global CLAUDE.md
  6.5 KB, 27% the Generalize-First Gate). Every judge child paid the whole harness
  (~3.75 MB) — CLOSED by the lean flags, pending live proof.
- **Where the owner felt the loss:** the two projects with NO kb/steward (psience 09-01
  *"i said it in the previous session why is it not saved?"*) → Q16.
- **Works (evidence):** steward recompute + model quality · root anchoring · turn-end 0
  `errored` across ~380 fires · kb frontmatter 174/174 · prism adopted unprompted ·
  statusline · patterns catalog 41 valid, gate once per prompt_id.

## PLATFORM INVARIANTS (measured — design against them)

1. **>~10 KB hook output → a 2 KB preview stub** (53× kb-pull, 2× recall tails in real
   sessions; 77× in judge sessions). An injection over 10 KB is NOT READ. Turn-end's tail
   is now hard-capped at 9,000 chars (0.7.0); kb-pull's digest is NOT yet (#27).
2. **A background-agent completion wakes a NEW prompt span and re-fires every
   UserPromptSubmit hook** (62 prompts show 2–12× re-fires). The Stop payload does NOT
   carry `background_tasks` (hooks reference: session_id, prompt_id, transcript_path, cwd,
   permission_mode, effort, hook_event_name, last_assistant_message) — 0.7.0 derives
   agents in flight from the transcript; `payload_keys` in the trace will show if it ever
   arrives.
3. **`additionalContext` on a Stop hook continues the turn** — 0.7.0 emits the give-up
   note once, then silence.
4. **`/clear` does not reload plugins; a process keeps the hook code it started with**
   (G1, 2026-09-08). Until #29 lands, "installed" is a disk fact only.

## Hook-event coverage (grep over `plugins/*/hooks/hooks.json` this pass)

Registered: SessionStart 3 · UserPromptSubmit 5 · PreToolUse 2 · Stop 4 · Notification 1
(per the 09-08 log check). **Zero** registrations of PostToolUse, PreCompact, PostCompact,
SubagentStart, SubagentStop or SessionEnd (grep = 0 matches this pass) — the events the
harness plan's G2 (check-recorder, #28), G8 (compaction guard, #33) and G10 (sub-agent
trace, #35) need.

## Known-broken / known-gaps (parts.md carries the file:line gap maps)

- **Verification has no ground truth (G2):** self-check's named-check regex accepts
  "Check: none" / "verified by inspection" / "exit 0" (`self-check.js:119-120`); `sed` sits
  on the non-run heads list (`:53-55`/`:78`) so `Bash sed -i` mutations are invisible; NEW
  09-08 — context-recall's "did not use" detector is blind to Bash reads (re-served the
  audit capture the session had read via `head -c`). → #28 (absorbs G2's PostToolUse
  recorder + shared file-touch extractor; strictness = Q19).
- **No goal-based termination (G3):** "stopping while there is planned work" (owner, twin
  08-12) has no mechanism; briefing Next: wrong 4/5 ships. → #32 (scope = Q18).
- **Evaluators unmeasured (G4):** lens 27 dispatches / 0 trace; judge nondeterministic
  (above), `chosen` empty ~50% of supplies. → #30.
- **No scorecard (G5):** "does it do anything?" took two audits + seven agents; the audit's
  method lives in a scratchpad. → #31.
- **Briefing staleness — NOT dead:** authored prose wrong 4/5; false git-HEAD ⚠ → #8.
- **kb (0.12.0):** digest injected WHOLE and UNCAPPED every prompt (twin 9,963 B); no
  per-session hint dedupe; floor leak (`term-overlap.js:185,235`); malformed `kb.json`
  silently drops the digest; `source` facet unfilterable. → #27. (Dead weight + home
  pollution: CLOSED at #26.)
- **turn-end (0.7.0):** `DUTIES` hard-coded array (`lib/duties/index.js:59`); whole
  transcript re-read every Stop (`context.js:122-123`, 170 MB → 1.4 s) → #17; no per-duty
  supply budget (lens item 20) → #17; no compaction guard → #33; sub-agents observed only
  by transcript scan, each inheriting 25.6 KB → #35; no budgets → #34.
- **steward (0.5.1):** `agents/steward.md:59-60` still instructs a done/-move; `:62-66`
  claims an install instrument the hook lacks (#29 builds a running-version one); protocol
  text not yet anchored to `<git root>/…` everywhere (lens item 21: `SKILL.md:55-56,79`,
  `commands/next.md:8`, `agents/steward.md:24`, `session-digest.js:76,78`) → #8;
  wrong-root drops in aithseis from twin-game's MODEL text → #12.
- **harness / hooks:** `++` injected THREE ways; the design-open concern has FIVE surfaces
  (1,645 B per design prompt, 1,788 B standing); `@prompt`'s steward check uses cwd;
  modifier propagation to sub-agents is prose only (lens item 22 → #35). → #17 / Q15.
  Guard lists: CLOSED (#25).
- **Generativity under-delivery (owner 08-26):** vocabulary + nudge shipped (patterns);
  the measurement half → #15; `/patterns` never invoked; outcome change unmeasured (the
  scorecard, #31, is how it gets measured).
- **code-glossary:** signature signal DEAD for JS/untyped params (`signals/signature.py:
  46-48`, `with_signature_hash` 0/128 on plugins/kb; lens item 18) → #15.
- **Git hygiene across ships:** unchanged (aithseis uncommitted 43 days; volatile
  `.claude/turn-end/` committed in Endure + twin; lens state committed in psience +
  aithseis; 11 MB PNG in crowd; this repo gitignores `.claude/*`) → #12 / #5.
- Standing, unchanged: invariant-9 hole (#3) · Q12 CI · Q13 sonnet · absolute-path debt
  (#7) · counts-in-prose (#6) · ledger-compaction UNCERTAIN (#9) · crowd deep-seed (#5) ·
  Diploma banner (#10) · #21 patterns interactive legs · kb MCP version-proof (#4).

## Outside-repo (log-only context)

Five ships: mk-cc-resources, twin-game, crowd-game, aithseis, Endure. Status contract
adopted in 1/5 (this one) → #12. Marketplace: github source, `autoUpdate: true`; a push is
required before any install sees a change, and a RESTART before the running process does.
