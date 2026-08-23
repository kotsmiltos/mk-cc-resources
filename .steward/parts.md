# Parts — plugins + shared machinery

> Read this before doing anything:
> - Limits-awareness: Claude drifts, loses context, finishes prematurely, defers, takes shortcuts. Re-read when uncertain. Preserve specifics.
> - Positive mindset: every gap solvable. Find the way by working carefully.
> - Quality ownership: this work matters. Take ownership.
> - Propagation requirement: every descendant artifact must carry these same four instructions.

Root registry: `.claude-plugin/marketplace.json` (must list every plugin in `plugins/`).
Root bundle: `.claude-plugin/plugin.json` (mk-cc-all — `skills` paths into `plugins/` and
NOTHING else; hook-carrying plugins install standalone). **The bundle's `skills`-only shape
is a distribution CONTRACT, not a detail:** any `lib/`, `bin/` or `defaults/` a plugin needs
outside its own skills does not travel with the bundle. Since plugin-toolkit 1.9.0 the
registries' CLAIMS are machine-checked (`bin/registry-check.js`: versions row-vs-manifest,
plugin list both directions, doc-table versions, bundle paths, CI-referenced files,
capability reach) — it CHECKS, never generates.

## turn-end (0.5.0) — THE single blocking Stop hook

- **Exposes:** one `Stop` registration for the whole toolkit. Plugins ship DUTIES; the
  runner checks each applicable duty against real state and emits ONE consolidated message
  per user request (two duties = one tail with two items, never two tails). Escalation
  ladder: `hookSpecificOutput.additionalContext` first (continues the turn, labelled "Stop
  hook feedback", no hook error) → `decision:block` only for a `severity:'block'` duty
  still unmet after that nudge.
- **Duty contract (the extension surface — add one = one `require`, no runner change):**
  - DEMAND `{id, title, severity:'block'|'advise', priority, span:'prompt'|'session',
    applies(ctx), satisfied(ctx), ask(ctx)->string}`
  - SUPPLY `{kind:'supply', …, supply(ctx)->{material, chosen, error}}` — hands the session
    MATERIAL instead of an instruction. `supply()` is the ONLY impure step, so the pure
    runner just reports `supply-due` and the ADAPTER executes it: plan (pure) → execute
    (impure) → compose (pure). That is what keeps the whole policy testable without a
    session.
  - **`satisfied` must answer from a DISK fact** (the file exists / its mtime moved since
    `startedAt`), never from how the work was done — 0.2.4 fixed exactly that: the digest
    duty checked `toolTargets` for a `Write`/`Edit` `file_path`, so a digest written with
    `Bash` never satisfied it.
  - **`span:'session'` for any duty whose ask can cause the next prompt** (above all one
    that asks for a subagent): a backgrounded agent's completion wakes the session as a NEW
    `prompt_id`, so a prompt-span duty re-arms off its own output. Measured: seven
    `prompt_id`s in 24 minutes, owner typing nothing, six dispatches.
  - A duty MUST NOT count another duty's mandated output as fresh work.
- **Shipped duties** (`lib/duties/index.js`): `context-recall` (supply) · `session-digest`
  (block, from kb) · `steward-sync` (advise, from steward — the Q10 resolution; owner-set:
  advise, session span, silent on empty inbox; satisfied per its README when the inbox is
  empty OR the steward agent was dispatched OR it already asked this sitting; an item is a
  top-level non-dot `.md`, so `done/` and `.gitkeep` never inflate the count. Documented
  everywhere since the 0.3.x cascade — the root README's turn-end ROW now names all FOUR
  duties (read 2026-08-01; that drift instance is CLOSED). **Never yet observed firing — a
  LIVE check, see state.md**) · `quality-lens` (advise, from verifiability-lens; its
  meta-loop guard judges the ROLLUP'S SHAPE, not the plugin's NAME).
- **SHIPPED 0.4.0 (owner directive + pass 2, 2026-08-01/02): `self-check`** — the fifth
  duty, the first default-ON `severity:block` DEMAND: a turn that changed real files may
  not yield until ONE evidence detector passes — check-shaped command run AFTER the last
  change (needs the ordered `toolCalls` snapshot; absent → silent, never a demand) /
  `ran-and-looked` (exec of its own artifact + a Read after; git/cat/… heads never count
  as runs) / lens dispatched / check + observed result NAMED in the final message, result
  tense only — the escape hatch that makes block safe. The ask teaches run → LOOK →
  compare vs the ASK → try to BREAK it (owner pass 2: a run nobody observed is half a
  check; happy-path-only is not a check — semantic halves stay quality-lens's job). Zero
  tokens, NO judge; the EVIDENCE registry is the extension surface. Bookkeeping trees
  (`.claude/`, `.steward/`, `.pipeline/`, tmp) excluded per the re-arm rule. Lens verify
  pass fixed two build defects pre-release: machine-prefixed USER entries ("Stop hook
  feedback:") are no longer turn boundaries (a block reason ERASED the judged turn,
  silently dissolving the hard rung — real-shaped replay test), and the planning-prose
  regex hole. **LIVE PROOF STILL OPEN** — one full-ladder live fire after plugin update +
  restart (the push leg landed 2026-08-10; tasks #1).
- **SHIPPED 0.5.0 (owner symptom, 2026-08-10): `request-closure`** — the sixth duty. Owner
  verbatim: *"at the end i should get a neat message answering my first thing, not what
  the last agent did."* An agent completion wakes the session as a NEW prompt (kb capture
  20260727-0800), so on a wake turn the model answers the task-notification instead of the
  owner. Applies when the request span was woken or dispatched agents; the ask embeds the
  VERBATIM `ctx.turn.userRequest` + span agent activity — answer THAT first, then
  who-did-what per agent, machinery last. `advise`, PROMPT span DELIBERATE (Claude-chosen):
  every wake resets the asked bucket, so every wake-yield gets its own nudge — each is a
  user-visible resting state — and that is safe because the ask spawns nothing, so the
  session-span rule for agent-asking duties does not bind. **The capture's "third ledger
  bucket keyed on the request span" constraint DISSOLVED rather than being built:** it was
  needed only if per-wake re-asking were harmful; here it is the wanted behavior, so no
  new bucket exists. `context.js` gains `turn.wakeCount` (grep-verified this pass;
  `WAKE_MARKERS` is the open surface — a scheduled wake is a new marker, not new code; a
  user pasting one leads with their own text and never counts). Zero tokens, NO judge.
  **LIVE PROOF OPEN** — rides #1's restart: one real wake-turn observed ending on the
  owner's request (also finally measures the capture's claim 3, never yet seen in a
  transcript).
- **Sources** (`lib/sources/`) — WHERE recallable knowledge lives, the second extension
  surface. `{id,title,available,index,fetch}`, TWO-PHASE and the split is load-bearing:
  `index()` emits titles + ids and NEVER bodies, the judge picks ids, `fetch()` returns the
  files' own text. The judge CHOOSES, it never SUMMARISES. `markdown-dir` is the generic
  TYPE; `kb-captures`, `kb-extracted` and `steward-model` are config over it. A configured
  dir that does not exist is simply empty.
- **Judges** (`lib/judges/`) — `claude -p` adapter, plan-billed, with four measured
  constraints encoded (argv-not-stdin, never `shell:true`, a depth guard the platform does
  not provide, `--bare` unusable). Used by `context-recall` on every turn end by owner
  choice — no pre-filter, because a gate deciding when recall matters is itself a thing
  that can be wrong. The depth guard's env, `MK_TURN_END_DEPTH`, is since kb 0.10.2 ALSO
  a cross-plugin contract: kb-session-start stands down when it sees it, so a judge child
  can never rotate the live digest.
- **FIXED in 0.3.1 (2026-07-31) — the hook budget no longer kills its own judge:**
  `hooks/hooks.json` now sets `"timeout": 90` (read 2026-08-01). Invariant the old 30
  violated: **the hook budget must exceed the judge budget** — the judge carries its own
  60s execFile timeout and degrades to a NAMED no-verdict, and that budget can only
  govern if the platform doesn't kill the whole runner first (a platform kill loses EVERY
  duty's output, recorded only in the transcript). Measured before: 39/52 in-window fires
  died at ~31s across 4 projects, crowd-game 0 completions. Measured after: one real
  fire, judge ran, clean verdict, 40.6s, exit 0. Evidence: RELEASE-NOTES 0.3.1 + capture
  `20260731-1950-turn-end-stop-timeout-kills-its-own-judge.md`.
- **FIXED in 0.4.1 (2026-08-02/03) — runtime state no longer follows the shell's cwd:**
  ALL state (config / ledger / trace) anchors to `resolveProjectRoot` — nearest ancestor
  with `.git`, never HOME or above (home-boundary guard case-insensitive on Windows since
  `1318e9a`, checks 131 → 133); raw cwd only when none exists. `payload.cwd` follows
  the shell's last `cd` (measured twice in one sitting: stray `plugins/*/.claude/` trees
  after running tests/gates; the per-request ledger SPLIT across directories, so a
  session-span duty re-asked from the split bucket). Also trims the steward-sync ask
  (part of the 08-03 injection diet). This defect is the new best CANDIDATE for why
  `steward-sync` was never observed firing — unproven until a post-0.4.1 live probe
  (tasks #4).
- **Termination:** structural. `MAX_FIRES_PER_PROMPT = 3` (`lib/runner.js:37`) is only the
  backstop for a satisfaction check that is WRONG; it sits strictly under the platform's
  8-consecutive-block cap (`:38`) so exhaustion is REPORTED by us — a silent platform cut
  reads identical to success.
- **Consumes:** `.claude/kb/*` and `.steward/` as READ-ONLY sources; the transcript (framed
  to the judge as data, not instructions); config `.claude/turn-end.json` (per-duty
  `enabled`/`severity`, plus `duties.session-digest.important` to replace Claude's default
  definition of important outright).
- **Context primitive (0.3.0):** `ctx.disk.list(rel)` — the generic tree read, typed +
  sorted + deliberately UNFILTERED (duties disagree about which entries count);
  `hasFilesIn` derives from it, one readdir for both. Duties MODEL what counts as an item
  rather than enumerating names — that is what keeps `done/` and the next placeholder some
  tool drops in out of every count.
- **Files:** `plugins/turn-end/{lib/{runner,context,ledger}.js, lib/duties/,
  lib/sources/, lib/judges/, hooks/, defaults/config.json}` · **Tests:**
  `node plugins/turn-end/tests/turn-end.test.js` — 143 checks (measured 2026-08-10 per
  its log entry; was 131 at 0.4.1 — +2 the Windows case-guard fix, +10 the 0.5.0 arc).
  Replays of measured failures include: ten work turns do not oscillate, the lens is
  asked at most once per request, `done/` + `.gitkeep` are not inbox items, and
  self-check's full ladder end-to-end (nudge → comply → allow; ignore → block; a check
  BEFORE the last edit rejected; the block-feedback boundary replayed with the real
  transcript shape).
- **Ledger:** `.claude/turn-end/ledger.json` — per-`prompt_id` `asked`/`fires` plus a
  `sessionAsked` bucket that survives an agent-completion wake-up, and `startedAt` for the
  mtime comparison. Trace: `.claude/turn-end/trace.jsonl`.

## steward (0.3.1) — the active thrust

- **Exposes:** per-project `.steward/` living model; ambient loop (auto-brief on open,
  capture on talk, integrate at wrap-up/next-open); `/steward:seed|brief|sync|next`;
  `/steward:fleet` — cross-project briefing aggregation (`bin/steward-fleet.js`,
  deterministic) over `~/.claude/steward/fleet.json`, auto-registered at SessionStart.
- **BUDGETED 0.3.0 · LIGHTER 0.3.1 (owner, twice in two days: "fires too often and for
  too long" → "can we make the steward lighter? it is unbearable right now"):** at most
  ONE background integration pass per sitting — captures and task landings ACCUMULATE
  (`inbox/` + `log.md`) for the wrap-up sync or next open; an explicit owner "sync"
  always outranks. The agent's Economy section bounds the pass itself: verify only what
  it WRITES (one targeted read per claim, never a repo re-audit), snapshot HEAD once and
  never chase a moving tree, routine diff ≤10 lines, minutes not quarter-hours. 0.3.1
  halves the standing owner-visible injection (measured ~3.7k chars of steward material
  at session open): protocol block 9 bullets → 4 dense lines (full protocol stays in the
  skill, on demand), briefing spec ≤6 lines / cap 900 chars, one-line inbox note.
  Recompute discipline UNTOUCHED by design — cuts come from verification scope + prose,
  never skipped reconciliation (the complaint priced the loop, not the discipline).
- **Consumes:** project docs/code/history at seed; `design/continuous-transformation.md`
  v3 as design source; MAP.md/`runner map` for parts-vs-code honesty (planned, Phase A).
- **Files:** `plugins/steward/{agents/steward.md, hooks/scripts/steward-brief.js,
  bin/steward-fleet.js, skills/steward/, commands/}` · **Tests:**
  `node plugins/steward/tests/*.test.js` (27 checks — measured run 2026-08-02; the
  plugin's own CLAUDE.md still says 25, a counts-class instance → tasks #7).
- **Contract:** the steward agent is the ONLY writer of model files; the session writes
  `inbox/` captures and appends `log.md` outcomes only; **no Stop/per-turn hook of its own,
  by design — and that design SURVIVED the enforcement question.** Q10 is RESOLVED: the
  recompute is enforced by turn-end's `steward-sync` duty (owner terms: advise, session
  span, silent on empty), a data declaration in the one blocking tail — no exception carved
  into this contract.
  **Model files are COMMITTED to a public repo** (`.gitignore` ignores `.steward/inbox/*`,
  `done/` included) — so no absolute path, username, drive letter or machine-specific
  detail may enter vision/state/parts/questions/tasks/log/briefing. Name the project, not
  its checkout. Raw captures in `inbox/` are local and may carry anything; the recompute
  launders them.
  `.steward/` is consumed DOWNSTREAM by kb (read-only knowledge source) and by turn-end's
  `steward-model` recall source — both read, neither writes, so the writer rule holds.
  **Upstream feeder:** knowledge that CHANGES the model is routed to `.steward/inbox/` by
  the kb-capture skill (the kb-scribe hook that used to enforce this is retired; the
  enforcing half is now turn-end's `session-digest` duty).
- **Briefing budget (delivery channel, FIXED at injection):** `steward-brief.js` enforces
  `BRIEFING_MAX_LINES = 8` (spec is ≤6, two lines of slack) and
  `BRIEFING_MAX_CHARS = 900` (both read this pass — the 0.3.1 diet cut them from 12/2000),
  cuts on line boundaries, and the marker names
  `dropped N line(s) / M chars` plus the remedy. kb keeps its own copy of this logic
  (`lib/cap-block.js`) ON PURPOSE: plugins install standalone, so a shared module across
  plugin boundaries would make one plugin's install a dependency of another's.
  **Residual:** nothing checks at WRITE time that a real `briefing.md` is inside budget.
- **Known limitation (integration mechanics):** the steward agent's toolset
  (Read/Grep/Glob/Write/Edit) cannot delete or move files — "move to inbox/done/" is
  executed as verbatim COPY to `done/` + a one-line "INTEGRATED — DELETE ME" stub at the
  original path; the SESSION deletes the stubs after each integration. Undeleted stubs lie
  twice now: to the brief hook's inbox counter AND to turn-end's `steward-sync` duty.

## kb (0.10.2) — the memory organ: pull core + ambient push

- **Exposes:** queryable knowledge base on KIND (episodic/semantic/procedural/working —
  CoALA) x CASTE (session/thread/project/fleet/owner; caste is an ARGUMENT, not a second
  tool). One facade `lib/kb.js` (query/read/overview/coverage); five reach surfaces as
  peers over it, none holding retrieval logic:
  - MCP server (`mcp/kb-mcp-server.js` — stdio JSON-RPC, zero deps;
    kb_query/kb_read/kb_overview; `alwaysLoad` via `.mcp.json`; narrowing hints ride inside
    tool results — the SESSION is the ReAct loop, no second agent). Since 0.8.0
    `kb_overview` reports `{version, startedAt}` DERIVED from plugin.json, because a stdio
    server keeps the code it was launched with and nothing showed it;
  - `kb` skill (ask-before-re-derive), commands /kb /kb-seed /kb-capture, CLI `bin/kb.js`
    (+ `kb coverage`);
  - **kb-pull** (`UserPromptSubmit`) — score-floored hint lines + session-digest injection;
    machine-text guard, fail-open, `{"pull":{...}}` off-switch;
  - **kb-session-start** (`SessionStart`) — rotates the previous sitting's digest to
    `.claude/kb/digests/` (archive verified on disk BEFORE the live file is deleted).
    0.10.2 — the mid-sitting digest-theft fix, BOTH defects of the 2030 inbox item: the
    sitting marker records on EVERY fire (gate = `.claude/kb/` presence, so a stale
    marker self-repairs — the old gate needed the live digest, which rotation had just
    deleted); a digest touched <45 min is the live sitting's heartbeat and NEVER rotates
    (window is Claude's default, not owner-set); a child carrying `MK_TURN_END_DEPTH`
    (turn-end's judge env) does nothing at all. Unsure still defaults to DO-NOT-ROTATE.
    kb-session suite 62 → 78, incl. e2e replays of the measured triple loss + the
    negative control.
  Writable stores, all session-written markdown the engine merely indexes: `extracted/`
  (/kb-seed, cited + regenerable), `captures/` (/kb-capture, one at a time),
  `session-digest.md` + `digests/` (the working/session pair; UNCAPPED since 0.10.0).
- **RETIRED at 0.9.0: the kb-scribe `Stop` hook.** `hooks/hooks.json` registers TWO hooks.
  The enforced write side is now turn-end's `session-digest` duty — because two plugins
  each owning a blocking Stop hook re-armed each other (scribe's PRODUCE_TOOLS included
  `Agent`, so the lens's mandated dispatch read as fresh work). The script + its 42 tests
  were kept one release, marked RETIRED in the header.
- **Consumes:** the markdown a project already keeps — `.steward/` model+log+inbox,
  `.claude/handoffs/`, `.claude/prompts/`, CLAUDE.md — via the generic `markdown-dir`
  source type (`split: 'h2' | {type:'pattern'}`, `skipThinPreamble`, per-file frontmatter)
  + `term-overlap` ranker (stemming, edit-distance-1 typo tier, alias groups, `scan` mode +
  ubiquity rule); config via generic `mergeLayer`. Node stdlib only, zero deps.
- **Contract:** engine READ-ONLY permanently · **presence-gated footprint**
  (`lib/presence.js`; a project keeping no curated memory is never written into, *not even
  by telemetry* — `writeTrace` holds the gate for all callers; seeding IS the on-switch) ·
  **capture-routing rule** (model-changing knowledge → `.steward/inbox/`; point-knowledge →
  kb captures) · hooks + MCP register at INSTALL time, so a checkout changes nothing until
  plugin update + restart; the bundle carries the SKILLS only.
- **Files:** `plugins/kb/{lib/, mcp/, bin/, hooks/, skills/, commands/, .mcp.json}` ·
  **Tests: run them ALL by glob** — `for f in tests/*.test.js; do node "$f" || exit 1; done`
  (six suites; naming individual files is how the footprint suite once fell out of the
  documented command). The root-vs-kb per-file count disagreement DISSOLVED in the
  2026-07-31 restructure — root CLAUDE.md no longer states per-file counts at all; the
  counts-in-prose rule still applies to kb/CLAUDE.md's own numbers.
- **Retrieval roadmap (Q9 ANSWERED — 3-rung ladder, cheapest substrate first):** rung 1
  SHIPPED (0.4.0). Rungs 2 (characterization pass) and 3 (embeddings as a drop-in ranker)
  stay EVIDENCE-GATED; the first foreign datum did NOT gate them (the crowd-game miss was
  SPLITTER-class, closed by the pattern split mode). The deep re-seed is the next chance.
- **Parked (design decided, unbuilt):** `kb_capture` MCP write tool.

## verifiability-lens (0.5.0) — no hook

- **Exposes:** A/B/U classification + completeness + quality-bar checks; surfacing triage
  via recipient profile; per-project override (`.claude/verifiability-lens/profile.yaml`) +
  `focus:` list + 3 presets, read-once rule; `/verifiability`.
- **Carries NO hook:** `hooks/hooks.json` is `{"hooks": {}}`. The old Stop hook's
  fire-once guard bounded CONSECUTIVE blocks rather than total fires (a steady 50% duty
  cycle — 8 fires over ONE user request) and keyed on a hash of the turn's text, so every
  correction turn looked new. Its trigger is now turn-end's `quality-lens` duty, `advise`.
- **Files:** `plugins/verifiability-lens/` · design: `design/verifiability-awareness.md`.
  Its plugin CLAUDE.md now records the 0.5.0 retirement (patched in the 2026-07-31
  restructure, grep-verified) — that drift instance is CLOSED.
- **v3 role:** kept, re-economized at Phase C.

## plugin-toolkit (1.10.0) — dev/maintenance + measurement + THREE gates

- **Exposes:** /skill-heal, /plugin-scaffold, /version-bump, /docs-audit, /code-glossary
  (deterministic `code_glossary/` Python engine: glossary, MAP.md,
  `runner diff|coupling|extensibility`), /dry-refactor (preflight + dry-run, zero source
  writes), and three one-command gates, each a pure runner over a drop-in registry:
  - **repo-guard** (`bin/repo-guard.js`, 1.8.0) over `lib/detectors/` — ONE frozen
    context; exit 0 clean / 1 blocking / 2 cannot-run. Detector contract:
    `{id, title, surface:'files'|'history', severity:'block'|'warn', run(ctx, options) -> Finding[]}`,
    a Finding carrying where (openable) + evidence (verbatim) + why. Detectors MODEL
    their subject, never enumerate spellings.
  - **test-all** (`bin/test-all.js`, 1.9.0) over `lib/suite-runners/` — every suite in
    every plugin, ONE verdict. Discovery by SHAPE, never a filename list; a unit shipping
    NO suite is NAMED (today: alert-sounds, project-note-tracker, schema-scout,
    session-lifecycle); a suite exiting 0 while printing a failure is SUSPECT, never
    green; 1.10.0 — a SKIPPED test is no longer indistinguishable from a passing one.
    Policy is pure (`lib/test-sweep.js`), execution injected.
  - **registry-check** (`bin/registry-check.js`, 1.9.0) over `lib/registry-claims/` — the
    claims the marketplace/bundle/doc tables make, verified against disk both directions;
    MISMATCH fails, INFORMATIONAL reports (`capability-reach`: `lib|bin|defaults` do not
    travel in a bundle install — measured from the installed cache). Every claim source
    has a negative control in the suite.
- **`runner coupling` SCOPE LIMIT (measured 2026-07-28, first run over `plugins/`):**
  assumes one codebase; across independently-installed plugins it fabricates edges
  (5-module cycle, `alert-sounds → kb`) and clustering flags cross-plugin duplicates
  (`readPayload` ×6) whose extraction would be WRONG. Run per project. Documented in root
  CLAUDE.md.
- **Consumes:** Python ≥3.11 via uv (pyyaml, tree-sitter +ts +c-sharp) for the glossary
  engine; `git ls-files` + git history for repo-guard; config
  `.claude/repo-guard.json` merged BY DETECTOR ID over `defaults/repo-guard.json`
  (malformed config THROWS).
- **Tests:** `uv run pytest tests/` from the code-glossary skill folder (613 checks that
  appeared in no documented count until test-all found them);
  `node plugins/plugin-toolkit/tests/{repo-guard,test-sweep,registry-check}.test.js` —
  in-memory/synthetic fixtures only.
- **Doc gap (this pass):** 1.10.0 shipped with NO RELEASE-NOTES entry (plugin.json +
  marketplace row moved, the notes did not); RELEASE-NOTES 1.9.0 still claims
  `.github/workflows/checks.yml` exists — reverted in `3633ff7`, see Q12.
- **DISTRIBUTION — CHANGED 2026-07-31 (owner-approved via /doctor; see state.md):**
  installed STANDALONE at user scope (1.10.0 @ current HEAD) with the mk-cc-all bundle
  DISABLED. A standalone install carries `lib/`, `bin/`, `defaults/`, so the three gates
  travel for the first time. The picker-duplication objection is voided ONLY because the
  bundle is off — both enabled at once would double-list six skills again. Final layout
  (what a public user installs; whether the owner keeps bundle-off permanently; the
  parked executables-inside-a-declared-surface move) remains the owner's call — tasks #2
  is a ratification, not closed. NEW 2026-08-01: the install now LAGS HEAD by three
  commits (@ `8d5cab6`; its cache lacks its own per-plugin CLAUDE.md).
- **Skill shell blocks** now open with an explicit resolve-and-fallback —
  `ROOT="${CLAUDE_PROJECT_DIR}"; [ -d "$ROOT/plugins" ] || ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo .)"`
  — which needs no answer about whether Claude Code substitutes the variable inside a
  ` ```! ` block or what that block's cwd is. Both earlier forms bet on one of those
  unknowns. The installed bundle still carries the pre-fix text (state.md).
- **v3 role:** gates finally get WIRED into executor steps (Phase A).

## essense-flow (0.26.1) — classic pipeline (headline today; dissolves per v3 §2)

- **Exposes:** 11 phase skills + 14 commands; `.pipeline/` artifacts; state machine
  (artifacts-authoritative, `state-reconcile`); librarian unknowns[] protocol; generativity
  protocol; code-conventions (BUILD DECOUPLED). Context-inject economics CORRECT since
  0.26.1 (never-initialized repos silent, parse-corrupt loud).
- **Known red:** `tests/ledger-compaction.test.js` — calendar drift (>30d unarchived
  governance entries dated 2026-05-14..17), fails on a clean tree. NOTE the two test dirs:
  `test/` (54 `.cjs`, driven by `test/run-all.cjs`) and `tests/` (`.js` suites incl.
  ledger-compaction + hooks) — a green run-all says nothing about `tests/`.
- **Known debt:** `test/` carries the author's real home paths as load-bearing fixture
  literals; it is the one entry in repo-guard's `leaked-path` allowlist.
- **Consumes:** the plugin-toolkit code-glossary engine for /organize + /glossary (hard
  stop if absent); Node.js `lib/` (19 modules).
- **Files:** `plugins/essense-flow/` · references/schemas single-source artifact shapes.

## essense-autopilot (0.4.0) — the last competing blocking hook

- **Exposes:** Stop-hook auto-advance of essense-flow phases; halt conditions + stderr
  diagnostics. **Consumes:** `.pipeline/state.yaml` + config opt-in.
- **Files:** `plugins/essense-autopilot/hooks/scripts/autopilot.js` — decision logic is
  welded into `main()`; only `countInFlightAgents` is exported (`:421`). Extracting a pure
  `decide()` is the precondition for making it a turn-end duty (owner: "autopilot should
  become a duty").
- Slated to retire with Phase E (Q4) regardless.

## thorough-mode (1.11.1)

- **Exposes:** modifiers ++/@thorough @ship @present @debug @verify @fresh @prompt @build
  via UserPromptSubmit injection; protocol-shaped convention as extension surface;
  machine-text guard; steward-aware @prompt (kickoff rendered FROM the `.steward/` model).
  `@ship` now PROBES for repo-guard before naming it, and says so when absent — the rule
  that an instruction may not name a path an install cannot resolve.
- **Files:** `plugins/thorough-mode/hooks/thorough-mode.js`.
- **v3 role:** discipline folds into executor protocol; @prompt obsoleted by the model.

## session-lifecycle (1.3.1)

- **Exposes:** /handoff (append-only `.claude/handoffs/` + alias), /resume,
  /claude-md-sync, /retro, /meta-review. No dependencies.
- **v3 role:** handoff/resume obsoleted by the steward model; retro/meta-review become
  candidate steward verbs.

## reuse-gate (0.1.0)

- **Exposes:** PreToolUse once-per-message reuse-first reminder on first source write;
  opt-in OFF, fail-open. Dedupes on `prompt_id` and is safe there only because injecting a
  reminder spawns nothing. **v3 role:** folds into executor code-write discipline.

## Orthogonal (unaffected by v3)

- **schema-scout (1.2.1):** data-file schema CLI (`scout`), Python package.
- **project-note-tracker (1.8.0):** per-handler question tracker, Excel backend.
- **alert-sounds (1.1.1):** cross-platform event alerts, stdlib Python.
- **statusline (0.1.0):** segment-based statusline (model | task | dir | steward
  anchor+inbox | context counter); settings-level wiring, no hooks/skills, not a plugin
  install; extend = drop a function into SEGMENTS.

## Cross-reference discipline (from CLAUDE.md)

**NEW LAYOUT since the 2026-07-31 restructure: deep plugin notes live in
`plugins/<name>/CLAUDE.md`; root CLAUDE.md is orientation-only (~11.5k chars) and carries
a cross-reference row for the pattern.** A plugin behavior/shape change → edit the
plugin's OWN CLAUDE.md; the root gets one-liners. References written against the old
monolithic root may now point at moved content — an un-swept class (tasks #7).

Plugin format changes → check all plugin.json; **new plugin → marketplace.json + the root
bundle `.claude-plugin/plugin.json` DESCRIPTION + README + CLAUDE.md** (the bundle
description is the one that drifted for turn-end); SKILL.md convention shared; handoff
format → resume reads it; **a retired hook → the plugin's own CLAUDE.md and hooks.json
description** (drifted for kb and verifiability-lens; both CLAUDE.md sides FIXED in the
restructure); **a version bump → a RELEASE-NOTES entry** (1.10.0 shipped without one);
**a new duty → the root README's plugin-table row, not only the plugin's own docs** (the
turn-end row lagged at three duties through 0.3.0; fixed by the 0.3.1 cascade, re-read
2026-08-01 — the law stands, the instance is closed; `self-check` re-triggers it when it
lands).

**Counts are never remembered, only re-derived.** Every hand-written test count, entry
count or version in prose is a defect waiting to happen — the class has now produced
instances in three different files that no one re-ran. Any doc edit that states a number
must have just run the thing that produces it; where the number earns nothing, print the
command instead.
