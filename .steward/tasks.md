# Tasks — ordered, executor-ready (recomputed 2026-07-27 · 3 inbox items integrated · HEAD eee1b35)

> Read this before doing anything:
> - Limits-awareness: Claude drifts, loses context, finishes prematurely, defers, takes shortcuts. Re-read when uncertain. Preserve specifics.
> - Positive mindset: every gap solvable. Find the way by working carefully.
> - Quality ownership: this work matters. Take ownership.
> - Propagation requirement: every descendant artifact must carry these same four instructions.

**Ordering rationale.** The old #1 ("make it LIVE") is DONE — kb, steward, thorough-mode,
the lens and turn-end are all installed and firing, proven from two trace files, not from a
transcript. What replaced it as the top gap is one layer up: **what the owner RUNS is not
what this repo contains** — the bundle is pinned three fixes behind, and repo-guard cannot
leave this checkout at all. Work that cannot reach a session is invisible regardless of its
quality, so distribution is #1. #2 is the last hole in the one-blocking-tail invariant. #3
lands the moment Q10's staged answer does. Everything measurement-shaped waits behind the
crowd-game seed (#4), which is still the only foreign corpus.

**Hygiene rule for this file:** `.steward/` model files are COMMITTED to a PUBLIC repo
(only `inbox/` is gitignored). Never write an absolute path, username or machine-specific
detail here — name projects, not drives.

## 1. Make what the owner runs match what this repo contains (distribution)

- **Why now:** measured this pass — the installed `mk-cc-all` bundle is cached at
  `gitCommitSha ab1ba82`, and its `plugin-scaffold` / `skill-heal` / `docs-audit` SKILL.md
  still open with `ls -d plugins/*/ 2>/dev/null`. The portability fix was written three
  times in this repo and has reached NONE of the skills that actually get invoked. Separately,
  `plugin-toolkit` is not installed as a plugin at all and the bundle ships `skills` paths
  only, so `lib/`, `bin/` and `defaults/` never travel — **repo-guard exists only in this
  checkout.** The owner deferred this once to close the verification legs; those are closed.
- **What (three legs, verified one at a time):**
  1. **Update the installs and PROVE the text moved.** The marketplace now points at the
     GitHub repo, so an update fetches the pushed tree. Update the bundle (and any plugin
     whose cached sha is behind), then read the cached skill file itself.
  2. **Decide how a plugin's non-skill assets reach a project, generically** — this is not
     about repo-guard, it is about the class: `bin/`, `lib/`, `defaults/` for
     plugin-toolkit today, anything similar tomorrow. The contract that exists on disk is
     "the bundle carries `skills` only; everything else travels only if the plugin itself
     is installed." Cheapest honest move (Claude's recommendation, not an owner
     instruction): install `plugin-toolkit` standalone the way kb/turn-end/steward already
     are, and say so in its README + the bundle description.
  3. **Make the class checkable** (Claude's proposal, not requested): a repo-guard detector
     that fails when a shipped instruction names a path an install cannot resolve. The
     `@ship` line already had to be hand-fixed into a probe — that is the same defect once,
     by hand.
- **Done-check:** (1) the cached bundle's `docs-audit` SKILL.md contains the
  resolve-and-fallback form and no `ls -d plugins/*/ 2>/dev/null` — read the installed file,
  not the repo's; (2) `node plugins/plugin-toolkit/bin/repo-guard.js` runs from a DIFFERENT
  project on this machine (or the decision is recorded in log.md with its reason); (3) if
  built, the new detector flags a deliberately unreachable path in a fixture and passes on
  the current tree.

## 2. Extract autopilot's `decide()` so it can become a duty (closes invariant 9)

- **What:** essense-autopilot still owns a blocking `Stop` hook and IS installed
  (user-scope). Its decision logic is welded into `main()` — only `countInFlightAgents` is
  exported (`plugins/essense-autopilot/hooks/scripts/autopilot.js:421`). Extract a PURE
  `decide(state) -> {advance|halt, reason}` in that plugin, then register a turn-end duty
  that consumes it. Owner direction: "autopilot should become a duty." Do NOT re-implement a
  thinner "what's next" inside turn-end — that creates a competing source of truth.
- **Done-check:** `decide()` is exported and unit-tested against the existing halt cases;
  the turn-end duty returns the same verdict for the same state; autopilot's `hooks.json`
  no longer registers a Stop hook; a pipeline project shows ONE tail with both items.

## 3. `steward-sync`: document it, then see it fire [Q10 — answer inbound]

- **What:** the duty is already on disk (`plugins/turn-end/lib/duties/steward-sync.js`,
  registered, `advise` in `defaults/config.json`) and has never fired — no `steward-sync`
  line in `.claude/turn-end/trace.jsonl` through 07-27T17:02Z, and it is missing from
  turn-end's README duty table, its RELEASE-NOTES and root CLAUDE.md. Q10's staged answer
  decides whether it stays `advise`, hardens to `block`, or widens its trigger; the
  documenting and the first observed fire are needed either way.
- **Done-check:** a trace line naming `steward-sync` in `unsatisfied` while items sit in
  `.steward/inbox/`, and a later line where it is absent after an integration; the README
  duty table lists all four duties; version bump + cascade (marketplace row + root
  CLAUDE.md + RELEASE-NOTES).

## 4. Crowd-game: commit its config, then run the DEEP seed (first foreign corpus)

- **What:** in the crowd-game project (its own checkout): (a) commit the written-but-
  UNCOMMITTED `.claude/kb.json` — a config that lives on one machine is a footgun for the
  pilot; note its `scribe.focus` key now names a RETIRED hook, so port it to
  `.claude/turn-end.json` `duties.session-digest.important` if it should still apply;
  (b) update the kb + turn-end plugins there and restart; (c) re-run `/kb-seed` under the
  depth mandate + judge-then-report autonomy, running `kb coverage` FIRST so the sweep mines
  only what existing `Extracted-from:` citations do not already cover — the first real test
  that re-seed is incremental BY MECHANISM; (d) copy the `game-project.yaml` lens preset
  into `.claude/verifiability-lens/profile.yaml`; (e) delete the stray
  `.claude/prompts/.claude/verifiability-lens/state.json`.
- **Also record while there** (this is the evidence #11 gates on): every hand-driven query
  that MISSES, classified — splitter / vocabulary / ranking / genuinely-absent.
- **Done-check:** config committed there; `kb coverage` output shows previously-uncovered
  substrate now cited; entry count before/after both read from the tool; a hand-driven query
  finds a fact only the deep sweep could reach; the miss list exists in writing, even if it
  reads "none found".

## 5. Prove which MCP build is answering (the one open leg of the old task #1)

- **What:** `.claude/kb/trace.jsonl` holds no `kb_query`/`kb_read` line. The two
  `kb_overview` lines in it (07-26T22:54Z, 22:56Z) PREDATE the commit that shipped that
  write path (`7657f00`, 22:57Z), so they prove a dev run, not the session-attached server.
  A stdio MCP server keeps the code it was launched with — editing the file and
  `/reload-plugins` both do nothing, and retrieval keeps working, so there is no symptom.
  This is a substrate fact, not a defect.
- **Done-check:** after a full Claude Code restart, one `kb_overview` call reports
  `version: 0.10.1` (kb 0.8.0 derives it from plugin.json) AND a `kb_query`/`kb_read` line
  with a post-restart timestamp appears in the trace. Both, or the leg is not closed.

## 6. Make documented counts and claims derivable, not remembered

- **What:** the class produced four fresh instances this pass, in three files, none of them
  code: root CLAUDE.md says turn-end "72 checks" (its RELEASE-NOTES 0.2.4 says 95) and
  kb.test.js 256 / kb-pull 37 (kb's own CLAUDE.md says 273 / 42); the root bundle
  `.claude-plugin/plugin.json` description still says kb carries "three hooks", still lists
  verifiability-lens as hook-carrying, and omits turn-end; kb/CLAUDE.md and
  verifiability-lens/CLAUDE.md both still document Stop hooks that no longer register. Text
  cannot fix text (invariant 3): add a deterministic check that runs each suite and compares
  the count to what the docs claim, or stop printing counts in prose and point at the command
  instead. Prefer the second wherever the number earns nothing. The hook-registration claims
  are checkable the same way: parse each `hooks/hooks.json` and compare it to the prose.
- **Done-check:** the check fails on today's four instances and passes after they are
  corrected; one command re-verifies every documented count and hook claim in the repo.

## 7. Retire the leaked-path allowlist entry (the absolute-path debt, expressed as a gate)

- **What:** `plugins/essense-flow/test/` is the one entry in repo-guard's `leaked-path`
  allowlist (`plugins/plugin-toolkit/defaults/repo-guard.json`), and its own note calls it
  *"Known debt, NOT exempt by design … remove this entry when that pass lands."* Those files
  carry the author's real home paths as load-bearing fixture roots — a blanket replace broke
  4 suites and was reverted, so this needs a per-file pass: read what each literal is FOR,
  replace with a tmpdir/`__dirname`-derived path or a placeholder the assertion still
  matches, run that suite, then move on.
- **Do NOT re-introduce a count.** The "exactly 7 files" claim was wrong in both directions:
  two sites named in an earlier capture are already fixed, and `artifacts/` holds
  placeholder-shaped strings a naive regex flags wrongly. The allowlist entry IS the
  done-check.
- **Done-check:** the `plugins/essense-flow/test/` entry is deleted from the allowlist AND
  `node plugins/plugin-toolkit/bin/repo-guard.js` still exits 0, AND
  `node plugins/essense-flow/test/run-all.cjs` still reports zero failures. All three.

## 8. Enforce the briefing budget at WRITE time (residual of the fixed cap defect)

- **What:** the injection side is fixed (steward 0.2.1: line + char budgets, cuts on line
  boundaries, marker names `dropped N line(s) / M chars` + the remedy). What is still
  missing is the root fix: the steward agent is the ONLY writer, so an over-budget briefing
  is an integration defect, and nothing checks it. The agent's contract text is the only
  thing holding the line — the "rule, not mechanism" shape invariant 3 rejects.
- **Done-check:** a deterministic check FAILS on a deliberately over-budget
  `.steward/briefing.md` fixture and passes on this repo's real one; steward suite green.

## 9. Chore: fix ledger-compaction calendar drift (essense-flow)

- **What:** `plugins/essense-flow/tests/ledger-compaction.test.js` fails on a clean tree —
  10 governance ledger entries dated 2026-05-14..17 are past its 30-day archive threshold.
  It is a time-triggered gate asking for an archive sibling to be authored. Root-fix (archive
  the entries or make the test time-robust), never a skip.
- **Done-check:** green on a clean tree AND still green with the system date advanced 60
  days — the drift class closed, not dodged. Run `tests/` explicitly; `test/run-all` says
  nothing about it.

## 10. Diploma residual: confirm the corrupt-state banner (next Diploma session)

- **What:** essense-flow 0.26.1's parse-corrupt DEGRADED banner is only observable IN
  Diploma (its duplicate key in `state.yaml`). First minutes of the next Diploma session:
  launch, expect the banner, then fix that file.
- **Done-check:** banner observed (or its absence investigated as a 0.26.1 bug); Diploma
  `state.yaml` parses clean afterward.

## 11. Decide kb retrieval rungs 2/3 on the deep-seed evidence (after #4)

- **What:** Q9's law is cheapest-substrate-first, and the first foreign datum already bent
  it — the miss was SPLITTER-class and a `pattern` split mode fixed it for free, so rungs
  2/3 are still UNGATED. Read #4's classified miss list: build rung 2 (characterization
  pass — one LLM enrich at index time, cached by content hash, ranker reads it as a
  high-weight field) ONLY if vocabulary-mismatch misses actually appear. Otherwise record
  "rung 1 + splitters suffice — 2/3 parked WITH evidence".
- **Done-check:** decision written in log.md citing concrete misses by name (or their
  documented absence); if built: enrich job cached + incremental, ranker tests green, and
  the previously-missing queries now hit.

## 12. Dogfood watch — do the ambient surfaces actually change the work? (passive)

- **What:** the sharpest datum is still T13 (crowd-game: /kb-seed ran, a founding DESIGN
  shipped the same day, the server instructions name that exact trigger, and NO query
  fired). There are now TWO instruments: `.claude/kb/trace.jsonl` (hint lines, digest
  injection) and `.claude/turn-end/trace.jsonl` (which notes `context-recall` chose, and
  whether the answer used them).
- **Done-check:** across ~5 real sessions — how many turns carried a kb-pull hint; how many
  hints were followed by a `kb_read`/`kb_query` in the same turn; how many `context-recall`
  supplies named a note the answer then actually used; ≥1 case logged where recalled
  material changed the work, with what it saved. **A zero is still a result** — it would
  point at hint/selection QUALITY, not at awareness.

## 13. Phase 0 validation — passive, on THIS repo (live)

- **What:** keep using this repo through the steward loop: auto-brief at open, captures
  during talk, owner-present integration diffs.
- **Done-check:** design §5 Phase 0 checks measured HERE — (a) zero pasted context at
  session start; (b) diffs read correctly; (c) ~0 steering turns between "do it" and
  hand-back; (d) ≥1 direction-change lands as thought → recompute → diff → rebuilt part.
  Data so far: the kb thread 07-24→07-25, Q9 → rung 1 same session, the 0.5.0→0.7.0 wave
  built straight off inbox captures, and the turn-end plugin itself (three captures → one
  plugin → two retirements).

## 14. Crowd-game steward evaluation (~5 sessions or ~1 week after its deep seed)

- **What:** re-run the 2026-07-21 audit methodology on crowd-game transcripts (baseline =
  43 `.jsonl` files existing 2026-07-21; after-set = post-seed mtime; exclude eval
  sessions). Before/after on 5 signals: start ritual (baseline 21 kickoff files;
  >500-char context paste = ritual) · steering density (user-typed turns only; baseline
  median ~20–25, max 93) · idea survival (captured/spoken ratio; baseline 0) · ship
  awareness ("where do we stand" in user text; pass = zero + owner-felt verdict) ·
  direction-change cost (user turns from change-of-mind to built+accepted; precedent is a
  45-turn churn; pass = single digits). Full rules preserved verbatim in
  `.steward/inbox/done/20260721-2345-eval-measurement-recipe.md`.
- **Done-check:** before/after table with confidence notes (inherited vs disk-verified).
  **Owner annoyance = veto regardless of numbers.** Outcome also unlocks the deferred
  drop-channel decision (Q8).

## 15. Phase A — wire the gates (on this repo)

- **What:** coupling/extensibility + tests into every executor step; a deterministic
  model-vs-code drift check (parts.md contracts vs `runner map`). #6's counts check is the
  same family and can share the harness.
- **Done-check:** a deliberate reach-in fails a hand-back; a stale parts.md entry is
  flagged. (Gated on #13 showing the loop holds here.)

## 16. Phase B — harden the steward

- **What:** adversarial inbox suite (pivot, vision-contradiction, deletion, duplicate,
  **and three items that supersede each other** — the shape this integration actually had →
  correct cascaded diffs); recurring spot-check re-injection; verbs /discuss /test /work.
  Fold in whatever #3 and #8 leave standing.
- **Done-check:** each adversarial item produces a correct diff incl. cascaded deletions;
  spot-check fires periodically in normal use.

## 17. Phase C — injection-layer economics

- **What:** REMAINING lens work: hand-back + risk-triggered firing — the profile side
  shipped in 0.4.0 and the per-request scoping came free with the duty. BROADENED per
  owner: the same economics for the whole per-prompt stack (verification-rules, caveman,
  generalize-first, hints, kb-pull) plus the per-turn-end stack (`context-recall` fires a
  judge on EVERY turn end by owner choice, measured at 46s per fire).
- **Done-check:** measured AFTER numbers against the 2026-07-21 baseline (24–30 fires/long
  session, ~25–55k tok/dispatch) with zero missed hand-back failures; each injector fires
  only where its trigger holds; per-prompt and per-turn-end cost recorded.

## 18. Phase D — generalization pass

- **What:** crowd-game steward-seeded 2026-07-21 and kb-seeded 2026-07-25 — remaining:
  extract anything mk-cc-resources-specific from the loop after the #14 eval; verb set +
  model structure prove open or get fixed; /kb-seed generalization rides the same pass.
  Then EMDE/psience.
- **Done-check:** the next project onboards by steward-seeding + kb-seeding alone — no
  tooling code changes.

## 19. Phase E — retire ceremony officially [Q4, Q5 land here]

- **What:** docs + marketplace reposition; classic pipeline preserved; essense-autopilot
  retires (Q4 — #2 may make this a deletion rather than a migration). Absorption fodder:
  handoff/resume redundant in steward projects (and double-indexed by kb); retro/meta-review
  → steward verbs; truth split memory=owner / model=project / CLAUDE.md=code / kb=queryable
  everything.
- **Done-check:** a new toy project goes idea → running slice through the steward loop only,
  in one evening.
