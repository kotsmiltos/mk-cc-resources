# State — current truth (2026-09-06 · audit 2 integrated; prism 0.1.0 SHIPPED + INSTALLED · HEAD 2ffa2d0 at pass start)

> Read this before doing anything:
> - Limits-awareness: Claude drifts, loses context, finishes prematurely, defers, takes shortcuts. Re-read when uncertain. Preserve specifics.
> - Positive mindset: every gap solvable. Find the way by working carefully.
> - Quality ownership: this work matters. Take ownership.
> - Propagation requirement: every descendant artifact must carry these same four instructions.

## Ship position

**local main @ `2ffa2d0`** (ref read this pass) — the 09-04 push entry records origin ==
local at that sha (pushed `463baa4..2ffa2d0`, owner "@ship it"). `2ffa2d0` = prism 0.1.0 +
the steward model recompute (25 files). Post-push install first FAILED — a settings-level
defect: the github marketplace declaration carried an ABSOLUTE local `path` field (residue
of the owner's 07-27 file→github migration; a CC update began rejecting the combo). Fixed
same sitting (field removed, settings re-validated, prism installed from the remote cache).
Gates at `2ffa2d0`: registry-check 0 · repo-guard 0 (root, direct exit read) · test-all
`--root` 34/34 suites / 1795 (prism correctly NAMED as a no-suite unit, informational).
**2026-09-06 sitting = audit 2 only:** no plugin code changed, nothing pushed; working tree
at snapshot carries only `.steward/log.md` (the session's audit entry) plus this pass.

## Versions on disk

Moved this arc (read this pass): **prism 0.1.0 (NEW — bundled: skill-only, zero code)** ·
**marketplace metadata 2.47.2** · **mk-cc-all bundle 2.27.0**. Unchanged from 08-27, not
re-read (no item touched them): patterns 0.1.0 · plugin-toolkit 1.10.1 · steward 0.5.0 ·
kb 0.11.0 · statusline 0.2.0 · turn-end 0.6.0 · thorough-mode 1.11.1 · verifiability-lens
0.5.0 · session-lifecycle 1.3.1 · essense-flow 0.26.1 · essense-autopilot 0.4.0 ·
schema-scout 1.2.1 · project-note-tracker 1.8.0 · alert-sounds 1.1.1 · reuse-gate 0.1.0.
Audit 2 measured install fidelity 16/16 — installed == repo, hook scripts byte-identical,
so repo measurements ARE live behaviour.

## LIVE — the status spine (dogfood week, tasks #1 — audit 2 read every leg)

- **(a) staleness accuracy:** the ⚠ freshness line is RIGHT in all 5 ships; `[instr]
  items: 4 new` matched status.json exactly. Two lies filed + root-caused: a FALSE ⚠ on
  `git-HEAD` after committing the regenerated model (the hook reads the ref FILE's mtime,
  `steward-brief.js:63-67` → compare ~`:107`; read this pass) and the authored BODY
  (Ship/Last/Next) contradicted by the log's last entry in 4 of 5 ships (twin, crowd,
  Endure, aithseis ×3) — the prose is regenerated only at integration and lags one
  session. The class the instruments were built to kill SURVIVES in the authored half → #8.
- **(b) fallback fire count:** BLOCKED from disk — `engine` is set at
  `context-recall.js:287` but the hook's `writeTrace` (`hooks/scripts/turn-end.js:161`)
  carries no such field (grep 0 this pass). Transcripts show 12 ETIMEDOUT dead recalls +
  3 fallback-ranker dumps (8.9 KB each) across three ships — the fallback demonstrably
  fires; recall quality is unmeasured → #23 traces it, then (b) can close.
- **(c) ledger truth:** two inbox counters DISAGREE in ONE injection — the raw `.md`
  filter (`steward-brief.js:256`, no dot/ledger check) vs the ledger-derived `[instr]`;
  turn-end's `steward-sync` counts raw files too (`steward-sync.js:45`, no status.json
  read) and re-reports every integrated item forever on a contract ship (measured 08-27:
  all 4 listed after integration); Endure shows a permanent phantom from an
  `inbox/.README.md`; fleet dedupe is case-sensitive. Filed + root-caused → #24. Status
  contract adopted in 1/5 ships (this one) → #12 stays gated.
- **(d) statusline:** 110 B / 50 ms, correct.
- **Verdict so far:** every instrument lie filed + root-caused (the #1 done-check's
  "or" branch); leg (b) cannot close until #23. Phase 2 (#12) stays gated.

## Audit verdicts (2026-09-06 — audit 2, five projects; the 08-23 verdicts still hold)

- **Evidence base:** 269 session files → 235 headless `claude -p` recall judges + 34
  human sessions / 212 human prompts (twin-game 68 · psience 61 · mk-cc-resources 45 ·
  aithseis 28 · BiananceRepo 8; psience + BiananceRepo have NO kb/steward).
- **Used deliberately:** steward inbox captures 97 (twin 62) · integrate dispatches 28
  (≈1.3/session on seeded ships) · session-digest edits 108 · `@prompt` 11 / `@ship` 5 /
  `++ @verify` 1 · **/prism invoked unprompted in psience 09-04 — its acceptance
  criterion MET** · kb MCP 38 calls (query 17 / read 17 / overview 4).
- **Used in NO real session:** /handoff /resume /retro /claude-md-sync (0 handoffs dirs
  anywhere), /kb, kb-capture, steward:brief/next/fleet, /patterns, /verifiability,
  code-glossary (engine sound: 2.1 s over plugins/kb, 8 real clusters), every essense-flow
  skill/agent (0 since 08-10), reuse-gate (dormant since 07-07, 0 projects configured).
- **Cost:** hook text per real prompt avg 6.3 KB / p50 4.5 / p95 20.5 / max 31.7 KB
  (1.3 MB total); families: turn-end recall SUPPLY 373 KB (largest), kb-hints 339 KB seen
  of 920 KB produced, verification-rules 156 KB (fires on machine wakes too), caveman
  44 KB. **kb-hints 84% ignored** (89 hinted prompts → 6 strict / 14 loose / 75 nothing;
  top-3 ids fill 40% of slots — no per-session dedupe). After 08-23 the per-prompt tax
  ROSE (twin 9.4 → 15.8 KB, mk-cc 7.8 → 10.3 KB) while pull fell to ~0 (twin kb calls
  20 → 1; steward dispatches fleet-wide 27 → 1 in September). ~101 min wall-clock inside
  turn-end across three ships; judge p95 57–60 s. Standing context 25.6 KB per session
  AND per sub-agent (global CLAUDE.md 6.5 KB — 27% is the Generalize-First Gate).
- **Every one of the 235 judge children paid the whole harness** (~3.75 MB of text on
  one-shot judges whose usual answer is `{"needed":[]}`); kb-pull has no
  `MK_TURN_END_DEPTH` guard (40/78 judge Stop records preceded by a kb-pull fire).
- **THE JUDGE IS SLOW FROM STARTUP, NOT INFERENCE** (session probe, scratch project):
  default `claude -p` 33.0 s wall / 3.8 s API, hooks fire · `--setting-sources ""` 3.9 s,
  NO hooks fire, OAuth intact (plan-billed) · + `--disable-slash-commands
  --strict-mcp-config` 3.5 s. `claude-p.js:112-113` passes only `-p`, `--model` (read
  this pass). `--bare` stays out (needs an API key = a second bill). Q11's speed
  framing is now moot by measurement: the judge stays default AND cheap.
- **Where the owner felt the loss: the two projects with NO kb/steward** (psience 09-01
  *"i said it in the previous session why is it not saved?"*). The `/kb-seed` cue fired
  there and was never acted on → Q16.
- **Works (evidence):** steward recompute + model quality (unchanged; twin integrated 44
  items same-day 09-05) · root anchoring (brief hook from two subdir shells briefed the
  ROOT model; wrong-root paths in transcripts: 0) · turn-end 0 `errored` across ~380
  fires; recall surfaced the right file on twin 09-05 · kb frontmatter 174/174 extracted,
  44/45 captures · prism adopted unprompted · statusline · patterns catalog 41 valid,
  gate once per prompt_id verified.

## PLATFORM INVARIANTS (measured 2026-09-06 — design against them)

1. **>~10 KB hook output → a 2 KB preview stub** ("Output too large … saved to
   tool-results"): 53× in real sessions for kb-pull (51 with the digest), 77× in judge
   sessions, 1× the turn-end tail (11,248 B; its 4 DEMAND items at line 126 → nudge
   wasted). An injection over 10 KB is NOT READ. (Now vision invariant 5's bound.)
2. **A background-agent completion wakes a NEW prompt span and re-fires every
   UserPromptSubmit hook** (62 prompts show 2–12× verification-rules + caveman + kb-pull
   re-fires). Known for Stop since 07-27; now measured for UserPromptSubmit. `context.js:218`
   captures `backgroundTasks`; NO duty consumes it (one match in `lib/`, read this pass) —
   request-closure + quality-lens demanded closure with 5 agents in flight.
3. **`additionalContext` on a Stop hook continues the turn:** `runner.js:190` emits the
   "giving up after N attempt(s)" note on EVERY exhausted fire → 2 prompts × 9 fires on
   08-27 (plan mode, digest unwritable), ended only by the platform's own 9-consecutive-
   block override.

## Known-broken / known-gaps (parts.md carries the file:line gap maps)

- **Generativity under-delivery (owner 08-26 HFDP wish):** patterns 0.1.0 covers the
  ambient VOCABULARY + pre-write nudge as hooks; the MEASUREMENT half stays #15; the
  essense-flow consumers stay unbuilt under Q14 default (a). Audit-2 datum: `/patterns`
  was never invoked in any real session; both hooks fire (gate once per prompt_id
  verified); whether they change outcomes is UNMEASURED — the owner's 09-04 doubt reads,
  by measurement, as "injecting is unread", not "the craft is wrong".
- **Briefing staleness — NOT dead:** instruments right, authored prose wrong in 4/5 ships;
  plus the false git-HEAD ⚠ after a model commit. Root fix = compute Last/Next/Waiting
  from log/tasks/questions headings, freshness by SHA, author only `Ship:` → #8
  (absorbs the write-time budget check).
- **turn-end (0.6.0):** tail buries its DEMANDS under recall SUPPLY (11,248 B → stubbed);
  closure duties fire mid-span with agents in flight; each wake RE-SUPPLIES the same
  captures (no per-session supplied memory); exhaustion re-arms to the platform cap;
  `self-check` is GAMEABLE — "Check: none" / "verified by inspection" / "exit 0" satisfy
  its named-check regex and `Bash sed -i` edits are invisible (`sed` sits on its non-run
  heads list `:78`) — it blocked 42× (twin 30) while the owner asked for LESS testing on
  Unity; crashed duties vanish (`runner.js:170`); `DUTIES` is a hard-coded array; the
  whole transcript is re-read every Stop (170 MB → 1.4 s / 673 MB RSS); `engine` never
  traced; `chosen` empty in ~50% of supplies. → #22 #23 #28.
- **steward (0.5.0):** counters (above); `agents/steward.md:59-60` still tells the agent
  to move files it cannot move, `:62-66` claims an install instrument the hook lacks
  (`INSTRUMENTS = [instrGit, instrItems]`, `:151` read this pass); wrong-root drops STILL
  land in the aithseis inbox because twin-game's MODEL hardcodes that path; one aithseis
  inbox file has a mangled name and an older body than its twin; fleet-caste content
  hijacked an aithseis session. → #8 #24 + cross-ship chores (#12).
- **kb (0.11.0):** digest injected whole and UNCAPPED every prompt (twin 9,963 B /
  110 lines — the opposite policy to the briefing's 900-char cap for the same class); no
  per-session hint dedupe; body-repeat bonus leaks into the subject floor; a malformed
  `.claude/kb.json` silently drops the digest; `source` facet advertised but
  unfilterable; retired `kb-scribe-stop.js` still shipped; `kb.json scribe.focus` has no
  consumer anywhere. → #27 #26.
- **harness / hooks:** the home `verification-rules.js` has NO machine-text guard —
  live-proven: an agent report containing `++` armed the thorough augment on a
  machine-woken prompt; four different guard lists exist and none knows
  `<system-reminder>`; `++` is injected THREE ways; the design-open concern has FIVE
  surfaces firing 1,645 B together on one prompt (global CLAUDE.md gate 1,788 B standing);
  thorough-mode's `++` regex fires on pasted `x ++ ;`; `@prompt`'s steward check uses cwd
  not the git root; modifier propagation to sub-agents is prose only. → #25, Q15, #17.
- **verifiability-lens (0.5.0):** ON everywhere via the user-global config; 27 dispatches;
  ZERO telemetry — its value is unmeasurable; all 39 of its tests test the RETIRED Stop
  hook; its docs still describe that hook as live (audit claim; re-opens the "CLOSED"
  drift instance — executor confirms at #26). → #26 (+ #13 telemetry).
- **Tests pollute the home:** kb cue file held 84 entries, 79 of them temp test roots;
  thousands of `kb-*`/`steward-home-*` temp leftovers; fleet.json carried a temp ship + a
  lowercase duplicate + a scratchpad dir (restored to the 5 real ships this sitting); the
  turn-end suite spawns REAL judges (43 s, plan-billed) and asserts a real binary. → #26.
- **Git hygiene across ships:** aithseis model uncommitted 43 days; volatile
  `.claude/turn-end/` committed in Endure + twin-game; lens `state.json` committed in
  psience + aithseis; 11 MB PNG evidence tracked in crowd; THIS repo gitignores
  `.claude/*`, so its own 42-file KB is single-machine. → per-ship chores under #12.
- Standing, unchanged: invariant-9 hole (autopilot, #3) · Q12 CI revert · Q13 sonnet ·
  absolute-path debt (#7) · counts-in-prose sweep (#6) · ledger-compaction UNCERTAIN
  (#9) · crowd deep-seed + config (#5) · Diploma banner (#10) · #21 patterns interactive
  legs · kb MCP version-proof (#4).

## Working tree

At snapshot: only `.steward/log.md` modified (the session's 09-06 audit entry, appended
BEFORE this pass) — this pass adds its own log entry + model writes. The contract keeps
all 9 top-level inbox files in place; after this pass every one of them has a ledger id
(derived-new = 0).

## Outside-repo (log-only context)

Five ships now: mk-cc-resources, twin-game, crowd-game, aithseis, Endure (fleet.json
restored to exactly these this sitting). Plugin-state git policy still diverges per ship
(owner call per project; Phase 2 backfill surfaces it). Marketplace registry: github
source, `autoUpdate: true` — the July→August install-behaviour flip was the OWNER'S
07-27 decision (file → github source), per the 09-04 CORRECTION entry; the invalid
`path` residue explained only the 09-04 "marketplace not found", now fixed.
