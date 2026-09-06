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

## turn-end (0.6.0) — THE single blocking Stop hook

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
  duties (read 2026-08-01; that drift instance is CLOSED). **First fire OBSERVED live
  2026-08-23 — but it counts RAW files, see the gap map below**) · `quality-lens` (advise, from verifiability-lens; its
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
  can never rotate the live digest. **Fragility measured 2026-08-23: three live judge
  ETIMEDOUTs in one sitting.** Owner ruling (Q2, quality over speed): the judge STAYS
  default; a dead fire is a QUALITY failure. **SHIPPED 0.6.0 (Phase 1 item 6):** fail-open
  deterministic ranker FALLBACK — a judge death (ETIMEDOUT/spawn) means the own-ranker
  picks instead, recall never silently delivers nothing, and the trace `engine` field
  NAMES which engine chose (146/146 at ship). Recall improvement means QUALITY measurement
  (chosen-files-actually-used rate, Phase 3 stats), never latency; the dogfood week counts
  fallback fires.
- **KNOWN DEFECT (measured 2026-08-27, → tasks #22): write-demanding duties are not
  plan-mode-aware.** During a plan-mode span the `session-digest` duty demanded a write to
  the digest file while plan mode's lock permits editing only the plan file — the
  satisfaction check (digest mtime vs activity) cannot see the mode, so it demanded the
  impossible through 8+ nudge cycles in one request span (background-agent wakes re-arm
  it). Fix direction (Claude's, owner to ratify): mode detection in the runner context,
  then defer-until-mode-exits or count the plan file as that span's digest surface —
  generic for any duty whose satisfaction needs a project-file write. Non-writing DEMAND
  duties (request-closure) stayed satisfiable and are unaffected.
- **GAP MAP — audit 2 (measured 2026-09-06; ✓ = file:line re-read by the steward pass,
  otherwise the audit capture's citation):**
  - **Tail ORDER + SIZE:** `runner.js:98` ✓ puts material first ("it can change what the
    answer SAYS"); a 3-recall tail measured 11,248 B with `[turn-end] before yielding` at
    line 126 → the platform stubbed it to a 2 KB preview → the 4 demands were never read
    → one nudge cycle wasted by ordering, not disobedience. → #23.
  - **Closure-class duties ignore in-flight agents:** `context.js:218` ✓ captures
    `backgroundTasks`; no duty reads it ✓ (one match in `lib/`). request-closure +
    quality-lens demanded closure with 5 agents in flight and no work product; each of the
    5 completion wakes re-demanded session-digest + request-closure — same "wrong check"
    class as plan mode. → #22.
  - **Recall supply has no per-session memory:** the first wake RE-SUPPLIED two of the
    same three July captures supplied at the first stop — 5 wakes = 5 judge runs + 5
    tails of mostly repeated material. → #23.
  - **Exhaustion re-arms:** `runner.js:190` ✓ emits the "giving up after N attempt(s)"
    note as `additionalContext` on EVERY exhausted fire, which continues the turn → 2
    prompts × 9 fires on 08-27, ended only by the platform's 9-consecutive-block
    override; `MAX_FIRES_PER_PROMPT = 3` (`:37` ✓) never actually stops it. → #22.
  - **Judge startup is the cost, not inference:** `claude-p.js:112-113` ✓ passes only
    `-p`, `--model`; 33.0 s wall / 3.8 s API default vs 3.9 s with `--setting-sources ""`
    (no hooks, OAuth intact) — every judge child today pays SessionStart + UserPromptSubmit
    + the skill listing (~3.75 MB across 235 children). → #23.
  - **`engine` never traced:** `context-recall.js:287` ✓ sets `engine: judgeDeath ?
    'fallback-ranker' : 'judge'`; `hooks/scripts/turn-end.js` `writeTrace` (`:98`/`:161`)
    names no such field ✓; per-duty `ms`/`costUsd` returned by `claude-p.js:126` are
    dropped at `context-recall.js:230` (audit). Dogfood #1 leg (b) is unmeasurable from
    disk. → #23.
  - **Errored duties vanish** (`runner.js:170`, audit — no tail line, no trace field);
    `DUTIES` is a hard-coded array (`lib/duties/index.js:52-59`, audit — not discovery by
    shape); the whole transcript is re-read every Stop (`context.js:122-123`, audit:
    170 MB → 1.4 s, 673 MB RSS). → #23 / #17.
  - **`self-check` is gameable:** the named-check regex (`self-check.js:109-120` ✓,
    result-tense) accepts "Check: none" / "verified by inspection" / "exit 0" (audit);
    `sed` is on the non-run heads list (`:78` ✓) so a `Bash sed -i` mutation is invisible
    to the changed-files detector (audit `:53-55`) — the very edit mode the owner's
    harness prescribes. Blocked 42× (twin 30) while the owner asked for LESS testing on
    Unity (*"no testing on your side is necessary"*). → #28.
  - **`steward-sync` counts raw files:** `ITEM_EXT = '.md'` (`steward-sync.js:45` ✓), no
    status.json read ✓ — on a contract ship every integrated item is re-reported forever
    (measured 08-27: all 4 listed AFTER integration). → #24.
  - **The suite spawns REAL judges** (`tests/turn-end.test.js:912-919`, audit) — 43 s,
    plan-billed, asserts a real `claude` binary exists. → #26.
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
  `node plugins/turn-end/tests/turn-end.test.js` — 146 checks (per the 0.6.0 landing;
  143 at 0.5.0, 131 at 0.4.1).
  Replays of measured failures include: ten work turns do not oscillate, the lens is
  asked at most once per request, `done/` + `.gitkeep` are not inbox items, and
  self-check's full ladder end-to-end (nudge → comply → allow; ignore → block; a check
  BEFORE the last edit rejected; the block-feedback boundary replayed with the real
  transcript shape).
- **Ledger:** `.claude/turn-end/ledger.json` — per-`prompt_id` `asked`/`fires` plus a
  `sessionAsked` bucket that survives an agent-completion wake-up, and `startedAt` for the
  mtime comparison. Trace: `.claude/turn-end/trace.jsonl`.

## steward (0.5.0) — the active thrust

- **Exposes:** per-project `.steward/` living model; ambient loop (auto-brief on open,
  capture on talk, integrate at wrap-up/next-open); `/steward:seed|brief|sync|next`;
  `/steward:fleet` — cross-project briefing aggregation (`bin/steward-fleet.js`,
  deterministic) over `~/.claude/steward/fleet.json`, auto-registered at SessionStart.
- **SHIPPED 0.4.0 (2026-08-23, strike 1 of blueprint §6b — INSTALLED + live-proven same
  day):** `steward-brief.js` computes FRESHNESS at injection (a ⚠ line naming events
  newer than briefing.md — pending inbox, log.md, git HEAD; fs-only, zero tokens) and
  anchors briefing read + inbox count + fleet registration to the nearest `.git` ancestor
  (the class turn-end fixed in 0.4.1, now fixed for steward's own hook); the protocol
  line names `<git root>/.steward/inbox/` as the only capture path. Hook tests 34/34
  (7 new); live smoke flagged this repo's real briefing stale by exactly the day's 3
  inbox items, from root AND subdir cwd.
- **SHIPPED 0.5.0 (2026-08-23, blueprint §6b Phase 1 — pushed `303c00c`, INSTALLED +
  [instr] verified in a real injection same day):** the agent is single writer of
  `status.json` (contract: `design/status-contract.md` v1, 10 rules) — lifecycle +
  `groups[]` at integration, files NEVER move, "new" DERIVED (file present, id absent),
  briefing regenerated LAST, no authored volatile facts. `lib/status.js` tolerant reader
  (13/13) · brief hook cursor staleness + computed `[instr]` lines (hook tests 40/40) ·
  `bin/steward-backfill.js` absent-only seeder (run twice = no-op). Pilot seeded on this
  ship: 29 items, cursors at 20260823-1520. Dogfood week gates Phase 2 (tasks #1).
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
  bin/steward-fleet.js, bin/steward-backfill.js, lib/status.js, skills/steward/,
  commands/}` · **Tests:** `node plugins/steward/tests/*.test.js` (40 hook + 13 status
  checks per the 0.5.0 landing; the plugin CLAUDE.md count line → tasks #6).
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
  **Residual:** nothing checks at WRITE time that a real `briefing.md` is inside budget
  (→ #8, now the compute-what-drifts redesign).
- **GAP MAP — audit 2 (measured 2026-09-06; ✓ = re-read this pass):**
  - **Two inbox counters in ONE injection:** `steward-brief.js:256` ✓ counts every
    `.md` (no dot check, no ledger) while the `[instr]` line derives from status.json —
    Endure shows a permanent phantom from `inbox/.README.md`; `steward-fleet.js:43`
    (audit) is a third raw counter, and fleet dedupe is case-sensitive (`:238`, audit;
    a lowercase-cwd probe added a duplicate ship this sitting). → #24.
  - **False ⚠ on `git-HEAD`:** freshness reads the ref FILE's mtime (`:63-67` ✓) — it
    moves when the regenerated model is COMMITTED, so every model commit trips the
    warning against the briefing it just committed. → #8 (freshness by SHA).
  - **Authored prose lags:** Ship/Last/Next contradicted by the log's last entry in 4/5
    ships; the ⚠ line right in 5/5. Only `Ship:` cannot be computed. → #8.
  - **Agent text vs tools:** `agents/steward.md:59-60` still instructs a done/-move the
    agent's toolset cannot perform (audit); `:62-66` claims an install instrument —
    `INSTRUMENTS = [instrGit, instrItems]` (`:151` ✓) has none. → #8 / #26.
  - **Status contract adopted in 1/5 ships** — the done/-ritual + stub litter stand on
    the other four until `steward-backfill` runs there. → #12.
  - **Wrong-root drops still land** in the aithseis inbox — not the hook (root anchoring
    measured correct, 0 wrong-root paths in transcripts) but twin-game's MODEL text
    hardcoding that path; one aithseis inbox file has a mangled name and an older body
    than its twin; fleet-caste content hijacked an aithseis session. → per-ship chores
    under #12.
- **Integration mechanics — the done/-move ritual is RETIRED on contract ships (0.5.0):**
  status.json owns lifecycle, files never move, "new" is DERIVED (file present, id
  absent) — which also keeps the agent the single writer with no write race, and kills
  the stub-litter class the 08-23 audit measured in THREE projects (crowd: undeleted stub
  beside its done/ copy; twin: a local workaround baked into its own README; the T3
  CONSUMED marker is moot where the contract runs). Pre-contract ships keep the old
  copy-plus-stub ritual (the agent's toolset cannot delete/move) until a session runs
  `bin/steward-backfill.js` — Phase 2 (#12) backfills the fleet.

## kb (0.11.0) — the memory organ: pull core + ambient push

- **0.10.3 (2026-08-23, strike 1 — installed same day):** new `lib/project-root.js`;
  kb-pull + kb-session-start anchor to the nearest `.git` ancestor (payload cwd
  preferred) — a subdir shell no longer reads/rotates another project's kb state.
  Touched suites 47+33+78.
- **SHIPPED 0.11.0 (2026-08-23, Phase 1):** status-join — `lib/status-join.js` injects
  `status:`/`group:` from `status.json` as THEMES at collect time (9/9; full sweep
  33+44+47+42+78+9+273), zero engine change; a first-class facet only if evidence later
  demands it.

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
- **GAP MAP — audit 2 (measured 2026-09-06; citations are the audit capture's):**
  - **kb-pull is the largest unread surface:** the digest is injected WHOLE and UNCAPPED
    every prompt (`kb-pull.js:50`; twin 9,963 B / 110 lines) — 51 of the 53 platform
    stubs (>10 KB → 2 KB preview) carried it; hints have no per-session dedupe (top-3 ids
    fill 40% of slots) and are 84% ignored; no `MK_TURN_END_DEPTH` guard (40/78 judge
    Stops preceded by a kb-pull fire — patterns' menu hook has the guard, this one does
    not); body-repeat bonus leaks into the subject floor (`term-overlap.js:185,235`); a
    malformed `.claude/kb.json` silently drops the digest (`kb-pull.js:157` throws before
    `:170`); `source` facet advertised but unfilterable; archived digests titled by stamp
    → noise hits; 8-digit runs in h2 titles become timestamps; a BOM defeats frontmatter.
    → #27 (cap + dedupe + change-aware digest), #25 (depth guard).
  - **Dead weight still shipped:** `kb-scribe-stop.js` + its tests (RETIRED 0.9.0, "kept
    one release" — now three releases on); `kb.json scribe.focus` has no consumer anywhere
    (crowd + this repo still carry it). → #26.
  - **Tests pollute the home:** `kb-session.test.js` `runHook(root, {})` → `cueOnce`
    falls back to the REAL homedir (cue file: 84 entries, 79 temp test roots); thousands
    of `kb-*`/`kb-cue-*` temp dirs left behind. → #26.
  - **Usage:** 38 MCP calls fleet-wide; deliberate pull fell to ~0 after 08-23 while the
    push tax rose. The hints-ignored cause is REPETITION + SIZE, not vocabulary — rung 2
    (#11) stays parked behind #27.

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
- **Audit 2 (2026-09-06):** ON everywhere via the user-global config; 27 dispatches;
  ZERO telemetry (no trace, no refute/confirm ratio, no cost) — its value is
  UNMEASURABLE; all 39 of its tests test the RETIRED Stop hook (`verifiability-stop.{js,sh}`
  still shipped); the audit reports CLAUDE.md/README/plugin.json/agent.md still describing
  that hook as live — which RE-OPENS the "CLOSED" drift instance above (not re-read this
  pass; the #26 executor settles it); the advancing-vs-oscillating classifier is
  deliberately unbuilt (`quality-lens.js:25-27`) and stays parked until telemetry shows
  escalations get acted on. → #26 (delete + contract test), #13 (telemetry).
- **v3 role:** kept, re-economized at Phase C.

## plugin-toolkit (1.10.1) — dev/maintenance + measurement + THREE gates

- **Exposes:** /skill-heal, /plugin-scaffold, /version-bump, /docs-audit, /code-glossary
  (deterministic `code_glossary/` Python engine: glossary, MAP.md,
  `runner diff|coupling|extensibility`), /dry-refactor (preflight + dry-run, zero source
  writes), and three one-command gates, each a pure runner over a drop-in registry:
  - **repo-guard** (`bin/repo-guard.js`, 1.8.0) over `lib/detectors/` — ONE frozen
    context; exit 0 clean / 1 blocking / 2 cannot-run. **Root cwd REQUIRED + read the
    exit code DIRECT, never after a pipe (measured 2026-08-27, the 1.10.1 catch-up
    `463baa4`):** run from the toolkit dir it scans ONLY plugin-toolkit — repo-guard
    had never actually scanned the whole repo, 8 findings elsewhere sat invisible since
    08-23, and earlier same-sitting "exit 0" records were $?-after-a-pipe mismeasures;
    8 pre-existing + 2 patterns-suite findings → 5 dated allowlist entries; root
    CLAUDE.md gate row carries both rules. Detector contract:
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
- **Audit 2 (2026-09-06):** code-glossary was NEVER invoked interactively in any real
  session; the engine is sound (2.1 s over plugins/kb, 8 real clusters — it found two
  identical registries inside kb). Whether it becomes a gate inside `@ship` instead of a
  skill to remember is Q17.
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
- **Audit 2 (2026-09-06):** ZERO uses of any essense-flow skill or agent in any real
  session since 08-10 (owner 08-26: "rarely used"). Largest surface in the marketplace,
  no live customers — freeze-vs-invest is Q17; Phase E (#19) already plans its retirement.

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
- **Audit 2 (2026-09-06):** `@prompt` 11 + `@ship` 5 + `++ @verify` 1 = the owner's REAL
  workflow (the "obsoleted by the model" role below is refuted by usage — @prompt renders
  FROM the model and is how the owner starts work). Gaps (audit citations): `++` is
  injected THREE ways (THOROUGH_AUGMENT 363 B + thorough-mode 1,007 B + global CLAUDE.md
  restating it under a line that says "not restated here"); `@verify` re-injects 3 of the
  4 always-on rules; the `++` regex fires on pasted code `x ++ ;`, hints fire on "push to"
  / "select … from" / "carefully"; `@prompt`'s steward check uses `process.cwd()` not the
  git root; sub-agent modifier propagation is prose only (no Agent-matcher hook); a
  home-side unreferenced April copy of the hook exists. Its 6-marker machine-text guard
  is the CANONICAL candidate (→ #25). → #25, #17 (fold), Q15.
- **v3 role:** discipline folds into executor protocol — @prompt STAYS (usage-proven).

## session-lifecycle (1.3.1)

- **Exposes:** /handoff (append-only `.claude/handoffs/` + alias), /resume,
  /claude-md-sync, /retro, /meta-review. No dependencies.
- **v3 role:** handoff/resume obsoleted by the steward model; retro/meta-review become
  candidate steward verbs.
- **Audit 2 (2026-09-06):** ZERO uses ever — no `.claude/handoffs/` dir exists on any
  ship; the plugin is globally disabled; `@prompt` took its place. Note the coupling:
  kb's `handoffs` source then indexes nothing. Archive-or-keep is Q17.

## reuse-gate (0.1.0)

- **Exposes:** PreToolUse once-per-message reuse-first reminder on first source write;
  opt-in OFF, fail-open. Dedupes on `prompt_id` and is safe there only because injecting a
  reminder spawns nothing. **v3 role:** folds into executor code-write discipline.
  **Audit 2:** dormant since 07-07, 0 projects configured; one of the FIVE design-open
  surfaces (with the CLAUDE.md gate, generalize-first, pattern-menu, pattern-gate). Fold
  into pattern-gate is the Q17 default.

## patterns (0.1.0) — ambient named-pattern menu + pre-code check (PUSHED + INSTALLED 2026-08-27; menu hook live-verified, interactive legs → #21)

- **Why it exists (owner, two directives):** 08-26 steer — the trigger→shape device must
  be AMBIENT ("the essense flow aprts are rarely used… i want claude overall to abide");
  08-27 GO — catalog wider than one book, trusted sources, more examples, paradigm
  annotations, MVVM/singletons covered, "decoupled is always better". Supersedes task
  #20's original `generativity-protocol.md` placement; essense-flow will CITE the catalog,
  never own it (documented drop-in, → #21).
- **Exposes:** `catalog/patterns.json` — THE single source, JSON on purpose (plan review
  rejected a YAML-subset parser): 41 entries (15 tier-1 menu / 23 tier-2 / 3 caution —
  singleton, premature-abstraction, god-object), per entry trigger · `menu_cue` (≤50
  chars, feeds the menu budget deterministically) · seam · drop-in test · paradigms ·
  ≥2 examples (C#/Python/TS) · cautions · sources (gof/hfdp/fowler/posa/msdocs/nystrom/
  solid; refguru cross-check only; online sources verified live at build). Two hooks:
  **pattern-menu** (UserPromptSubmit — runtime-rendered tier-1 menu, `MENU_MAX_CHARS`
  1100 enforced by TESTS not silent truncation; machine-text + depth + min-chars +
  verb∧noun gates, prompt parsed from stdin JSON — never the raw payload, the measured
  generalize-first cwd-noun misfire) · **pattern-gate** (PreToolUse on source writes,
  ONCE per prompt_id, `additionalContext` only — no permissionDecision, no exit 2).
  `/patterns` browses/prints entries.
- **Contract:** default ON everywhere (owner call at plan approval — deliberate inverse of
  reuse-gate; opt-outs: env `PATTERNS_ENABLED=0`, project + global `.claude/patterns.json`)
  · state HOME-SIDE (`~/.claude/patterns/state/<root-hash>.json`, never in-repo — the kb
  footprint lesson) · **standalone, NOT in mk-cc-all** — load-bearing: hook-carrying AND
  the bundle ships skills only, a bundled `/patterns` would find no `catalog/` · fail-open
  everywhere · own copy of the nearest-`.git` walk (cross-plugin duplication deliberate).
- **Overlap pending (Q15) — now MEASURED (audit 2):** the design-open concern has FIVE
  surfaces (global CLAUDE.md gate 1,788 B STANDING, per session and per sub-agent ·
  generalize-first hook · pattern-menu · pattern-gate · reuse-gate/@build) firing
  1,645 B together on one design prompt. `/patterns` was never invoked in any real
  session; the hooks fire (gate once per prompt_id verified); outcome change unmeasured.
  Slim / fold-to-one-hook / keep is the owner's call.
- **Later drop-ins documented, not built:** turn-end pattern-check duty · review lens ·
  essense-flow citation.
- **Files:** `plugins/patterns/{catalog/patterns.json, hooks/, lib/{render-menu,
  enablement, project-root}.js, skills/patterns/}` · **Tests:**
  `node plugins/patterns/tests/patterns.test.js` — 37 checks per the plugin notes at pass
  end (35 at the build log; the suite gained corrupt/absent-catalog fail-open e2e
  mid-pass): schema, menu cap, gate chains, enablement precedence, root walk, e2e spawns
  via the `PATTERNS_STATE_DIR` + `PATTERNS_CATALOG_PATH` seams.

## prism (0.1.0) — multi-perspective panel skill (SHIPPED + INSTALLED 2026-09-04; acceptance MET)

- **Why it exists (owner, 2026-09-04, verbatim):** *"multiple agents try and… answer it
  from different perspectives… these agents have their sole focus on that specific
  thing… compile their outputs and figure out a plan"* + *"apply that same logic to
  building what I've asked"* — so it was designed BY its own method (five sole-focus
  lenses on the skill's design; rulings in `plugins/prism/CLAUDE.md`).
- **Exposes:** `/prism` — one SKILL.md, ZERO code, stateless, no hooks/config/state files;
  3-step protocol (frame → parallel sole-focus dispatch on the session model → session-side
  synthesis with per-point lens credit, named conflict rulings, a delta line naming what a
  solo answer would have missed); fixed 4-section return contract per lens. **The lens set
  is open at the LANGUAGE level** — an asker-named lens IS an added lens, zero edits (a
  stronger drop-in test than a JSON entry); a standing per-project lens set is the named
  trigger for a future `.claude/prism.json`.
- **Contract:** bundled in mk-cc-all (skill-only, bundle-safe); never integrates INTO
  essense-flow (essense-flow may invoke it); test-all NAMES it as a no-suite unit —
  informational, stays green. Refused on purpose: tests, config, modes, scout, debate
  rounds, quorum — each with a named future trigger.
- **Measured:** design-panel cost ~370k agent tokens (five self-bounded lenses; economy
  blocks in briefs target ~75–150k). **Acceptance criterion MET:** the owner invoked
  `/prism` unprompted in psience on 09-04 (audit 2).
- **Files:** `plugins/prism/{.claude-plugin/plugin.json, skills/prism/SKILL.md, CLAUDE.md,
  README.md, RELEASE-NOTES.md}` · registered marketplace 2.47.2 + bundle 2.27.0.

## Orthogonal (unaffected by v3)

- **schema-scout (1.2.1):** data-file schema CLI (`scout`), Python package.
- **project-note-tracker (1.8.0):** per-handler question tracker, Excel backend.
- **alert-sounds (1.1.1):** cross-platform event alerts, stdlib Python. Audit 2: its
  `clear` step is a 290–410 ms Python interpreter whose whole job is unlinking one file —
  one of 9 process spawns per prompt (~0.85 s summed) → #17.
- **statusline (0.2.0):** segment-based statusline (model | task | dir | steward
  anchor+inbox | context counter); settings-level wiring, no hooks/skills, not a plugin
  install; extend = drop a function into SEGMENTS. **0.2.0 (Phase 1): `segSteward` v2**
  reads `status.json` (⚓N✱ ▲M), root-anchored, tolerant reader, fail-soft to the naive
  anchor when the ledger is absent/corrupt (20/20) — the tombstone-counting bug class is
  dead where the contract runs.

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

**A retired hook is DELETED in the next release, never "kept one release" forever.** Both
"kept" scripts outlived that promise by three releases (kb-scribe-stop.js + 42 tests;
lens verifiability-stop + 39 tests), and the lens's docs describe the dead hook as live —
a shipped file that does nothing is a claim registry-check cannot see. → #26.

**Every UserPromptSubmit hook shares ONE machine-text guard** — four different lists
existed (thorough 6 / pattern-menu 6 / kb-pull 5 / generalize-first 5 / verification-rules
0 / caveman 0), none knew `<system-reminder>`, and a `++` inside an agent report armed a
modifier live. Adding a hook = reusing the guard, not authoring a fifth list. → #25.
