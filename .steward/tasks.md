# Tasks — ordered, executor-ready (recomputed 2026-09-18, garden pass · HEAD `6729e54` · ids 1–42 stable, never reused, #13 stays deleted, #20/#22/#23/#24/#25/#26/#27/#28/#29/#30/#31/#39/#40 CLOSED and removed from this file)

> Read this before doing anything:
> - Limits-awareness: Claude drifts, loses context, finishes prematurely, defers, takes shortcuts. Re-read when uncertain. Preserve specifics.
> - Positive mindset: every gap solvable. Find the way by working carefully.
> - Quality ownership: this work matters. Take ownership.
> - Propagation requirement: every descendant artifact must carry these same four instructions.

Order: #1 (standing watch) → #42/#41 (small, precede #32) → #17/#38 (push cuts + garden, ahead of
Phase 2 per Q26) → #32/#8 → Phase 3/4 (#33–#37) → the rest in original priority. Under invariant 13
a task's done-check is what the executor RUNS; the owner reads the outcome in-session, never this
file. `.steward/` is a PUBLIC repo — never write an absolute path or username here.

## 1. Dogfood watch — hook liveness + Q26's readings (standing)

- **What:** confirm turn-end/kb/steward restarted onto the versions this pass records (re-read
  `installed_plugins.json`); keep the hook-liveness WATCH armed: a sitting that has YIELDED at
  least once (`stop_hook_summary`, or ≥2 `promptId`s) with STILL no Stop trace line while
  `checks.jsonl` grew is a real finding — capture it IN that sitting, it is unreproducible after.
- **Done-check:** a fresh trace line in this repo reports the current turn-end version; no
  UNEXPLAINED silent-hook finding stands. **Metric keys:** `running.*`, `judge.chosen_empty_pct`,
  `judge.agreement_pct`, `hook_bytes.p50/p95`.

## 42. Exec ledger must preserve the EVIDENCE, not 300 chars of it (turn-end) — parts 2–4 remain

- **What:** part 1 (mark a truncation) is DONE. Remaining: (2) preserve the CHECK-BEARING segment
  rather than a blind prefix — `CHECK_COMMAND_RX` already knows where it is; (3) raise
  `MAX_CMD_CHARS` from a MEASURED number of real compound commands in this repo's ledger, not a
  guess; (4) a regression fixture from a real 600+ char compound command whose gate sits last.
- **Where:** `plugins/turn-end/hooks/scripts/tool-record.js`.
- **Done-check:** the fixture's ledger line names the gate in full; turn-end suite green. **Metric
  key:** `checks.truncated_pct` trending to ~0.

## 41. `base-freshness` claim source — `git fetch` as a gate, not a habit

- **What:** new `lib/registry-claims/` source comparing local `origin/<branch>` against the
  remote (`git ls-remote --heads`); MISMATCH = exit 1 naming the branch + count behind; offline =
  informational only. Wire into `/version-bump`'s first step and `@ship`'s checklist.
- **Where:** `plugins/plugin-toolkit/lib/registry-claims/`.
- **Done-check:** a deliberately rewound local ref fails the gate naming `base-freshness`; a fetch
  clears it; negative control in `tests/registry-check.test.js`.

## 17. Push-side cuts (Q26) — amendment 1 (kb-hints off) DONE; the rest open

- **What:** (2) `model: sonnet` frontmatter on the steward + lens agent definitions (cheap
  lighter-model trial, the visible diff is the tripwire); (3) rotate `log.md` when it nears cap
  (the garden, #38, now does this mechanically — recheck after a few sittings instead of building
  a second mechanism); (4) strip the four-line propagation preamble from MACHINE-INJECTED bodies
  (keep it in the files themselves — it was scoring as false "uptake").
- **Done-check:** `hook_bytes.p50` on this repo below the 09-17 reading (10.1 KB avg) with the
  command recorded. **Metric key:** `push.bytes_per_prompt` p50/p95.

## 38. Garden — BUILT as steward 0.7.0; residue only

- **What:** the lifecycle/garden mechanism is SHIPPED (this pass is its first live run on
  `.steward/`). Residual: (a) kb captures (`.claude/kb/captures/`) are still a SECOND store not
  yet folded through the same latest-wins rule — the garden today only reads `.steward/`;
  (b) record PROVENANCE (who/when) at capture WRITE time, not after — `.claude/kb/` is gitignored
  so no entry carries a commit/author today, and an archive decision without it cannot answer
  "who said this and was it ever true."
- **Done-check:** a kb capture superseded by a newer one is held back by a garden-equivalent pass;
  new captures carry a provenance field at write time.

## 32. Goal duty — armed task's done-check becomes the loop's termination criterion

- **What:** session-scoped turn-end DEMAND `goal`, `severity: advise`, armed by `steward:next` /
  an owner "do it"; satisfied by `checks.jsonl` (a check ran + was observed) or an explicit "stop".
  **Blocked on #42** landing first — a truncated ledger would make this duty nag about checks that
  already passed. Sequenced AFTER #17/#38 (Q26: don't build a new tail duty while the owner
  questions the tail's value).
- **Done-check:** an armed task yielded-without-check shows one tail line; green after → silent.
  **Metric key:** `goal.met_before_yield`, `goal.nudge_heeded`.

## 8. Briefing — compute what drifts, author only `Ship:`

- **What:** `Last:` = log.md's last heading, `Next:` = tasks.md's top-3, `Waiting:` =
  questions.md's open headings, all computed at read time; freshness by SHA (record
  `views.briefing.head` in status.json); drop the stale `agents/steward.md:59-60` done/-move
  instruction; anchor remaining protocol text to `<git root>/…`.
- **Done-check:** the hook's `Last:` equals log.md's tail heading by construction on every ship.
  **Metric key:** `briefing.contradictions` = 0 by construction.

## 33. Compaction guard — PreCompact snapshot + PostCompact "where we are"

- **What:** PreCompact snapshots the live digest + armed goal + last check; PostCompact re-injects
  a ≤1 KB block. Presence-gated. **Done-check:** forced `/compact` mid-task → next turn names the
  task + last check. **Metric key:** `compact.recovered`.

## 35. Sub-agents observed — SubagentStart/Stop trace + isolation policy

- **What:** empty-matcher SubagentStart/Stop hooks (turn-end) → one trace line per agent, the
  authoritative in-flight set for `defer()`; isolation floors (lean judges, `tools`/`effort`/
  `maxTurns` for panel lenses); a PreToolUse (matcher `Agent`) that propagates active modifiers.
  **Done-check:** every dispatch traced; `++ do X` then an Agent dispatch shows `[thorough-mode]`
  in the child. **Metric key:** `agents.traced`, `agents.bytes_inherited`.

## 34. Soft budgets — a per-sitting budget line, never blocking

- **What:** budget ledger (agents/judge-cost/tokens), owner-set soft thresholds, ONE tail line on
  crossing. **Done-check:** crossing prints once/sitting, nothing blocks. **Metric key:**
  `budget.crossings`, `budget.judge_usd`.

## 36. Harness replay gate — hook fixtures become a `test-all` suite

- **What:** `harness-replay.js` runs every hook over recorded, scrubbed fixtures and diffs
  `harness-stats` against `defaults/harness-baselines.json`. **Done-check:** a deliberate 400 B
  injection bump shows as a red delta.

## 37. Code-design duty + `@ship` gate — measured convergence, not text (severity: Q22)

- **What:** turn-end DEMAND `design` (advise default) computing the DELTA on touched files only
  (per-project, invariant 7's scope limit) via the code-glossary engine — new switch-on-subtype,
  coupling edges added, a DRY cluster gaining a member (3 members demands extract/accept-with-reason).
  `@ship` blocks if a per-project baseline score drops (Q22 default: b).
- **Done-check:** a seeded `switch(kind)` names file:line + the catalog seam. **Metric key:**
  `design.regressions_caught`.

## 21. Patterns — finish the interactive legs

- **What:** `/patterns` try-out + one real gate fire in an owner session (never invoked in a real
  session yet); the essense-flow catalog-citation lines. **Done-check:** both hooks observed once
  each in the owner's own session.

## 2. Ratify the distribution layout (standalone toolkit + full bundle, six skills double-listed)

- **What:** owner one-keystroke pick — KEEP the duplication (default) or SLIM the bundle. Reach is
  proven (both installed, 09-17 ledger). **Done-check:** decision recorded in log.md with its
  reason; README/marketplace prose matches.

## 3. Extract autopilot's `decide()` into a pure function → turn-end duty

- **What:** `plugins/essense-autopilot/hooks/scripts/autopilot.js:421` welds decision logic into
  `main()`. Extract `decide(state) -> {advance|halt, reason}`, register as a turn-end duty, drop
  autopilot's own Stop-hook registration. **Done-check:** BLOCKING Stop-hook registrations across
  enabled plugins = 1.

## 4. Prove which kb MCP build is answering

- **What:** one `kb_overview` call reporting the installed version + a `tool: kb_query|kb_read`
  trace line post-restart. **Done-check:** both observed.

## 5. Crowd-game — commit config, run the deep seed, collect post-fix turn-end data

- **What:** commit `.claude/kb.json`, drop dead `scribe.focus`; restart to pick up the fixes;
  re-run `/kb-seed` after `kb coverage`; copy the lens preset; audit-2 chores (untrack the 11 MB
  PNG, delete a consumed duplicate inbox item). **Done-check:** config committed, coverage moved,
  one hand-driven query hits only the deep sweep, a written miss list.

## 6. Make documented counts/claims derivable, not remembered

- **What:** extend registry-check's pattern to test counts and hook-registration prose still
  stated by hand (root CLAUDE.md's gate count, per-plugin CLAUDE.md test-count lines). **Done-check:**
  a claim source fails on today's instances and passes after correction.

## 7. Retire the leaked-path allowlist entry

- **What:** `plugins/essense-flow/test/` carries real home-directory literals as fixture roots —
  replace per-file with a tmpdir/`__dirname`-derived path. **Done-check:** the allowlist entry
  deleted AND repo-guard exits 0 AND the suite reports zero failures.

## 9. Essense-flow flake — mechanism named (lock contention), fix not applied

- **What:** raise the retry budget in `essense-flow/lib/with-lock.cjs` (governed by D-Rd11-4)
  with a MEASURED number from a contended sweep, not a guess; same fix covers two pre-existing
  `state-shape WARN` lines. Separately: `code-glossary`'s pytest suite needs its deps present or a
  declared SKIP, not a red. **Done-check:** 5 consecutive clean sweeps; `test-all` counts a
  non-zero, moving check total for the suite.

## 10. Diploma residual — confirm the corrupt-state banner

- **What:** first minutes of the next Diploma session: expect the DEGRADED banner, fix the file.
  **Done-check:** banner observed (or its absence investigated) and `state.yaml` parses clean.

## 11. kb retrieval rung 2 — re-parked on evidence

- **What:** re-measure `hints.strict_pct`/`loose_pct` post-0.16.0 (hints off by default changes
  the denominator entirely — re-baseline before deciding rung 2 is even still the right question).
  **Done-check:** a post-0.16.0 measurement recorded in log.md.

## 12. Phase 2 — fleet rollout of the status spine

- **What:** backfill twin-game/crowd-game/aithseis/Endure with the status contract + per-ship
  chores (untrack nested `.claude/turn-end`, repair a mangled inbox filename, this repo's dead
  `.pipeline/` — gitignore or delete it, never `state-reconcile --apply`). **Done-check:** the
  fleet table matches a spot audit on all five ships.

## 14. Crowd-game steward evaluation (after its deep seed)

- **What:** re-run the before/after audit via `harness-stats --root <crowd checkout>`.
  **Done-check:** a before/after table; owner annoyance vetoes regardless of numbers.

## 15. Phase A — wire the gates into executor steps (this repo)

- **What:** coupling/extensibility/tests into every executor step; a model-vs-code drift check.
  Precondition: the code-glossary signature signal is dead for JS/untyped params — fix or declare
  before any gate reads it. **Done-check:** `with_signature_hash > 0` on `plugins/kb`.

## 16. Phase B — harden the steward

- **What:** adversarial inbox suite (pivot, contradiction, deletion, duplicate); recurring
  spot-check re-injection; verbs `/discuss` (must absorb `elicit`, never duplicate it) `/test`
  `/work`. **Done-check:** each adversarial item produces a correct diff incl. cascaded deletions.

## 18. Phase D — generalization pass

- **What:** extract anything mk-cc-resources-specific after the #14 eval; then EMDE/psience/
  BiananceRepo. **Done-check:** the next project onboards by steward+kb-seeding alone.

## 19. Phase E — retire ceremony officially

- **What:** essense-autopilot retires (Q4); session-lifecycle/reuse-gate per Q17; on every model
  release re-run `harness-stats` and remove any mechanism whose metric is flat (invariant 12).
  **Done-check:** BLOCKING Stop-hook registrations = 1; spawns per prompt ≤ 6.
