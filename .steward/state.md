# State — current truth (2026-07-27 · 3 inbox items integrated · HEAD eee1b35)

> Read this before doing anything:
> - Limits-awareness: Claude drifts, loses context, finishes prematurely, defers, takes shortcuts. Re-read when uncertain. Preserve specifics.
> - Positive mindset: every gap solvable. Find the way by working carefully.
> - Quality ownership: this work matters. Take ownership.
> - Propagation requirement: every descendant artifact must carry these same four instructions.

## Ship position

**local main == origin/main == `eee1b35` — PUSHED.** Refs read this pass from
`.git/refs/heads/main` and `.git/refs/remotes/origin/main`; identical.

Fourteen commits past `817b472` (subjects read from `.git/logs/HEAD`, not remembered):
repo-guard lands (`d46680c`, plugin-toolkit 1.8.0) → the guard is WIRED and the redirect
MODELLED after review (`4f21e30`, tm 1.11.0) → two verification legs closed (`d929e2c`,
kb 0.8.0 + steward 0.2.1) → review fixes incl. a false provenance (`1700fbc`, tm 1.11.1) →
**turn-end 0.1.0** (`9021ca8`) → meta-loop guard judged the NAME not the shape (`cb1a376`,
0.1.1) → **the recall half** (`f20c1a8`, 0.2.0) → kb digest UNCAPPED (`a950afe`, 0.10.0) →
find the binary / never let a broken judge look clean (`ee74d06`, 0.2.1) → a duty that
spawns an agent must not be prompt-scoped (`4859b60`, 0.2.2) → `/reload-plugins` was
archiving the LIVE digest (`74da81d`, kb 0.10.1) → stop speaking in the owner's voice,
stop capping silently (`7edbbff`, 0.2.3) → satisfaction must be a DISK fact (`eee1b35`,
0.2.4).

## Versions on disk

Each read this pass from `plugins/*/.claude-plugin/plugin.json` AND its `marketplace.json`
row; the two agree for all fourteen. Marketplace metadata **2.44.5**, 15 rows.

**turn-end 0.2.4 (NEW) · kb 0.10.1 · plugin-toolkit 1.8.0 · thorough-mode 1.11.1 ·
verifiability-lens 0.5.0 · session-lifecycle 1.3.1 · steward 0.2.1** · unchanged:
essense-flow 0.26.1 · essense-autopilot 0.4.0 · schema-scout 1.2.1 ·
project-note-tracker 1.8.0 · alert-sounds 1.1.1 · reuse-gate 0.1.0 · statusline 0.1.0 ·
mk-cc-all bundle 2.26.0 (correctly unmoved — no new skill shipped).

## IT IS LIVE (the "NOTHING IS LIVE" front is DELETED — it was true at 0.3.0, not now)

- **Installed set** (user-scope plugin registry, read this pass): kb **0.10.1**,
  turn-end **0.2.4 @ eee1b35**, verifiability-lens 0.5.0, steward 0.2.1,
  thorough-mode 1.11.1, session-lifecycle 1.3.1, essense-flow 0.26.1,
  essense-autopilot 0.4.0, alert-sounds 1.1.1, reuse-gate 0.1.0, mk-cc-all 2.26.0.
  **plugin-toolkit and statusline are not installed as plugins at all** (see THE gap).
- **`.claude/kb/trace.jsonl` is no longer the 21-line pre-live baseline — 101 lines**,
  running to 2026-07-27T17:07Z. `kb-session-start` lines from 07-26T21:05Z;
  `kb-pull-hook` lines reading `"digest":true` from 07-26T21:31Z (the short-term-memory
  claim, proven); `kb-scribe-hook … "blocked":true` lines 07-26T21:14Z → 07-27T01:33Z and
  **none after** — exactly what the 0.9.0 retirement predicts.
- **`.claude/turn-end/trace.jsonl` — 13 fires, 07-27T01:37Z → 17:02Z.** The escalation
  ladder is proven on ONE `prompt_id` (`fb0276d2`): `action:"advise"` at 15:43:48Z →
  `action:"block"`, `stop_hook_active:true`, `fires:1` at 15:44:45Z. `context-recall`
  supplied real notes from 13:13Z on, including `.steward/parts.md` + `.steward/questions.md`
  at 17:02Z — the steward model reaching a session as MATERIAL, not as a summary. Two
  `spawnSync claude ENOENT` supply errors (02:21Z, 02:35Z) are visible in the trace because
  a broken judge is REPORTED rather than silently clean; `ee74d06` fixed the cause.
- **One leg still open:** no `kb_query`/`kb_read` line anywhere in the trace. Two
  `kb_overview` lines exist (07-26T22:54Z, 22:56Z) but both PREDATE the commit that shipped
  that write path (`7657f00`, 22:57Z), so they are dev-run evidence, not proof of the
  session-attached server. A stdio MCP server keeps the code it was launched with — editing
  the file and `/reload-plugins` both do nothing. Retrieval works, so there is no symptom.

## What exists and works

- **turn-end 0.2.4 — THE single blocking Stop hook** (new plugin; see parts.md for the
  contract). One runner walks a duty registry against ONE frozen context snapshot and emits
  ONE consolidated message per user request. Four duties registered
  (`lib/duties/index.js`): `context-recall` (supply), `session-digest` (block),
  `steward-sync` (advise — see gaps), `quality-lens` (advise). Termination is structural;
  `MAX_FIRES_PER_PROMPT = 3` sits under the platform's documented 8-consecutive-block cap
  (`lib/runner.js:32-38`) and names what it abandons. Judge adapter (`claude -p`,
  plan-billed) with the recursion guard the platform does not provide.
- **kb 0.10.1 — two hooks + MCP.** `hooks/hooks.json` (read this pass) registers
  UserPromptSubmit + SessionStart only; its own description records the Stop hook as
  RETIRED at 0.9.0. 0.8.0 made the running server say which build it is
  (`kb_overview` returns version/startedAt, derived from plugin.json so the staleness
  diagnostic cannot itself go stale); 0.10.0 removed the digest cap; 0.10.1 stopped
  `/reload-plugins` archiving the LIVE sitting's digest.
- **verifiability-lens 0.5.0 — carries NO hook.** `hooks/hooks.json` is literally
  `{"hooks": {}}` with the retirement reason in its description. Its firing is now
  turn-end's `quality-lens` duty, shipped `advise` (it cannot yet tell an advancing pass
  from one repairing its own earlier characterisation).
- **plugin-toolkit 1.8.0 — repo-guard.** A pure runner over a detector registry, one
  frozen context for all detectors, a crashed detector becomes a BLOCKING finding.
  Shipped detectors: `leaked-path` (block), `silenced-failure` (block), `revert-chain`
  (warn). Config merges BY DETECTOR ID over `defaults/repo-guard.json`.
- **thorough-mode 1.11.1** — `@ship` gained a repo-pathologies item that PROBES for
  repo-guard before naming it (`hooks/thorough-mode.js:72`), so the instruction is honest
  in a project that has no checkout.
- **steward 0.2.1** — the injected briefing now names its loss
  (`dropped N line(s) / M chars` + the budget + regenerate-shorter) and enforces ≤10 lines
  as a line budget in its own right (cap 12, two lines of slack), cutting on line
  boundaries; the one mid-line cut left is a single line that busts the whole char budget.
  A test drove that out: the first implementation let a 5000-char single-line briefing
  through uncut.
- **essense-flow 0.26.1** — unchanged this arc; zero files touched.
- Measurement machinery unchanged: `runner coupling` (2.4.0), `runner extensibility`
  (2.5.0, C#-only), MAP.md, drift diff.

## THE gap: what the owner RUNS is not what this repo contains

The old gap ("none of it is live") is closed. The one that replaced it is one layer up.

- **Distribution is now push-coupled.** The marketplace was re-pointed from a `file`
  source at this checkout to `{"source":"github","repo":"kotsmiltos/mk-cc-resources"}`
  (owner instruction: *"i wanna push an update to me marketplace, update from there and
  have it working"*). **Push is REQUIRED before any install/update sees a change.** Local
  == origin right now, so the door is open.
- **CORRECTION to the capture:** `autoUpdate: true` IS set for this marketplace (registry
  read this pass, lastUpdated 07-27T16:21Z). The inbox item said the re-point silently
  dropped it; disk disagrees. No task.
- **The installed bundle is pinned behind the repo.** `mk-cc-all` 2.26.0 is cached at
  `gitCommitSha ab1ba82`. Its cached `plugin-scaffold`, `skill-heal` and `docs-audit`
  SKILL.md still open with the bare-relative `ls -d plugins/*/ 2>/dev/null` — **the
  portability fix, rewritten three times in this repo, has reached NONE of the skills that
  actually get invoked.** The bundle version did not move (patch bumps skip it by rule), so
  nothing signals an update is due.
- **plugin-toolkit reaches the owner only through the bundle, and the bundle ships
  `skills` paths only** (root `.claude-plugin/plugin.json`, read this pass). `lib/`, `bin/`
  and `defaults/` are never distributed — **repo-guard exists only in this checkout.** Half
  mitigated: `@ship` now probes instead of naming a dead path. The instruction is honest;
  the capability still does not travel.
- Owner chose to close the verification legs before this. It is **PARKED, not resolved**,
  and it is the top task.

## Known-broken / known-gaps

- **Invariant 9 has a hole: essense-autopilot still owns a blocking Stop hook, and it IS
  installed.** Its decision logic is welded into `main()` — only `countInFlightAgents` is
  exported (`hooks/scripts/autopilot.js:421`), so migrating it means extracting a pure
  `decide()` in that plugin first. Shipping a thinner "what's next" inside turn-end would
  create a competing source of truth. Inert in THIS repo (no `.pipeline/`), live wherever a
  pipeline project opts in.
- **`steward-sync` duty: on disk, undocumented, never yet fired.** Registered in
  `lib/duties/index.js`, enabled `advise` in `defaults/config.json`; its source header
  records what the owner specified (severity, session span, silent on an empty inbox,
  applies on inbox count > 0) versus what Claude chose (priority, wording, the definition
  of an item). Session span is load-bearing: a backgrounded agent's completion wakes the
  session as a NEW `prompt_id`. It is absent from turn-end's README duty table, its
  RELEASE-NOTES and root CLAUDE.md, and no `steward-sync` appears in any trace line through
  17:02Z. **Q10 is the open decision; the owner's answer is being staged separately.**
- **Absolute-path debt, restated as a mechanism instead of a count.** repo-guard exits 0
  ONLY because `plugins/essense-flow/test/` is allowlisted in
  `plugins/plugin-toolkit/defaults/repo-guard.json`, whose own note calls it *"Known debt,
  NOT exempt by design … remove this entry when that pass lands."* Verified this pass: the
  files under that dir still carry real home-directory literals as load-bearing fixture
  roots (a blanket replace broke 4 suites and was reverted). The "exactly 7 files" claim is
  dead as a done-check in BOTH directions — the two sites the 0035 capture named
  (essense-flow RELEASE-NOTES; the code-glossary sanity-check script, which now takes the
  corpus path from argv/env) are FIXED, while `artifacts/` holds placeholder-shaped hits a
  naive regex would flag wrongly. The allowlist entry is the done-check.
- **Recurring defect class 1 — counts and claims in prose.** The statusline 12→16 instance
  is FIXED. Four fresh ones found this pass, all in docs, none in code, each quoted from
  the file that claims it (nothing re-run here): root CLAUDE.md says turn-end "72 checks"
  while turn-end's RELEASE-NOTES 0.2.4 says 95; root CLAUDE.md says kb.test.js 256 /
  kb-pull 37 while kb's own CLAUDE.md says 273 / 42; the root bundle
  `.claude-plugin/plugin.json` description still says kb carries "three hooks", still lists
  verifiability-lens as hook-carrying, and omits turn-end (README's bundle row is correct);
  kb/CLAUDE.md and verifiability-lens/CLAUDE.md both still document their retired Stop
  hooks. Text drifts, code moved on.
- **Recurring defect class 2 — tests that lie.** Standing. A green suite is evidence only
  when the check itself has been read. Two fresh confirmations from this arc: a
  satisfaction check that asked HOW the work was done instead of WHETHER (0.2.4), and a
  `markdown-dir` default that silently indexed 60 of 75 notes (0.2.3).
- **essense-flow `tests/ledger-compaction.test.js` still red** (session-measured 07-27, not
  re-run at this pass): 10 governance ledger entries dated 2026-05-14..17 are past the
  30-day archive threshold. Time-triggered gate wanting an archive sibling authored; zero
  essense-flow files were touched this arc.
- **steward briefing: no WRITE-time gate.** The injection side is fixed (0.2.1) and its
  tests use fixtures; nothing checks that this repo's own `briefing.md` is inside budget.
  The only thing keeping it there is the agent's contract text — the "rule, not mechanism"
  shape invariant 3 rejects.
- **kb ambient-availability still unproven, but now instrumented.** T13 stands as the
  sharpest datum (crowd-game: /kb-seed ran, a founding DESIGN shipped the same day, no
  query fired). Two trace files now make the question answerable from disk.
- **verifiability-lens firing economics:** the old baseline (24–30 fires/long session,
  ~25–55k tok/dispatch) is superseded in mechanism — the duty asks at most once per
  `prompt_id` and is `advise` — but there is no measured AFTER number yet.
- **Crowd-game:** its `.claude/kb.json` (splitter override + scribe focus) is still
  uncommitted THERE, and its deep `/kb-seed` re-run is pending — the first real
  foreign-corpus test of coverage-driven top-up. Its scribe-focus key now names a retired
  hook.
- **Diploma residual (must not vanish):** the 0.26.1 corrupt-state DEGRADED banner is only
  observable IN Diploma.
- **Coupling/extensibility gates run in ZERO projects.** Phase A closes this.
- **essense-flow slash-command adoption:** all 14 commands abandoned after week 1; the
  steward loop is the fix, not an in-place patch. Autopilot retires with Phase E (Q4); doc
  repositioning holds until Phase D/E (Q5).

## Working tree

`eee1b35` pushed. The tracked tree carries only the `.steward/` model files rewritten by
this integration — that is the next commit. `.steward/inbox/*` is gitignored (including
`done/`), as is `.claude/*` — so `.claude/kb/` (extracted + captures + trace + digests) and
`.claude/turn-end/` (trace + ledger) are local evidence only, never shipped.

## Outside-repo (log-only context)

- Marketplace registry now GitHub-sourced with `autoUpdate: true`; config backups
  (`*.json.bak`) sit beside it from the re-point.
- `~/.claude/kb/cued.json` (one-time seed cue) and `~/.claude/steward/fleet.json` are real
  HOME-scope artifacts.
- `~/.claude/hooks/generalize-first.sh` fixed 2026-07-25 (jq-absent root cause); Serena
  read-nag wrapper active; BinanceRepo key scare RESOLVED 2026-07-22.
- External hygiene debt: Diploma corrupt `state.yaml`; psience missing root CLAUDE.md +
  deploy queue (parked, Q8); crowd-game stray file
  `.claude/prompts/.claude/verifiability-lens/state.json` to delete during the crowd-game
  task.
