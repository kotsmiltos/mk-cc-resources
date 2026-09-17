# Log — outcome ledger (append-only; entries before 2026-09-11 evening deleted by the garden, cap 40000 B — see git history for the full record)

> Read this before doing anything:
> - Limits-awareness: Claude drifts, loses context, finishes prematurely, defers, takes shortcuts. Re-read when uncertain. Preserve specifics.
> - Positive mindset: every gap solvable. Find the way by working carefully.
> - Quality ownership: this work matters. Take ownership.
> - Propagation requirement: every descendant artifact must carry these same four instructions.

## 2026-09-11 (evening) · #1 leg A CLOSED from disk; leg B was already DONE at 019e007 (model correction → inbox)

- **Leg A(1) — judge fields present.** `node -e` over `.claude/turn-end/trace.jsonl`: 28 v1 lines,
  9 with `duty:"context-recall"`, and **every one carries both `judge_chosen` and `ranker_top`**
  (Q20's missing input now exists). Q20 datum read off the same 9: the judge returned an EMPTY
  pick in 6/9 sittings where the ranker had candidates, and in the 3 sittings it did pick, its
  top choice was never the ranker's top choice (0/3 on top-1).
- **Leg A(2) — one scorecard run.** `node plugins/plugin-toolkit/bin/harness-stats.js --root .`
  (checkout command — plugin-toolkit is uninstalled, Q24) exit 0, 14 sources ran:
  `trace.lines_per_dispatch` 1 · `acted_on.spans` 6 · `judge.agreement_n` 3 /
  `judge.agreement_pct` 66.7 · `running.installed_vs_checkout` NON-EMPTY for five plugins
  (essense-flow 0.26.2→0.26.3 · essense-autopilot 0.4.1→0.4.2 · verifiability-lens 0.6.0→0.7.0 ·
  steward 0.5.2→0.6.0 · turn-end 0.9.0→0.10.0). Also: `uptake.used_pct` 100 (6 of 10 scorable
  notes used), `tail.under_bound_pct` 100, `running.stale_trace_lines` 0,
  `briefing.contradictions` honestly `n/a` (waits on #8).
- **Leg B correction.** `git log --oneline -1` = `019e007` and `git status --short` shows only
  `M .steward/state.md` + untracked `.pipeline/` — the phase the model calls UNCOMMITTED was
  committed and pushed. The remaining drift is an INSTALL gap, not a commit gap: the ledger
  (`installed_plugins.json`) still reports the 09-10 generation, so the owner's
  `claude plugin update` is the outstanding half of leg B.

## 2026-09-11 (night) · Tracks 4 + 5 shipped in 4 commits; leg C's watch fired and is a false positive

- **Track 4 — the false alarms are gone (essense-flow 0.27.0 · essense-autopilot 0.5.0).**
  Degraded banner → SessionStart only (gated on `payload.hook_event_name`, no counter);
  next-step → silent on a degraded state; autopilot's `no .pipeline/` halt → silent, every
  other halt still loud; both essense-flow hooks root-anchored through a new
  `lib/project-root.js` (NOT the hard-failing `project-dir.cjs`). Verified live against this
  repo's own dead `.pipeline/`: SessionStart prints the banner, UserPromptSubmit prints
  NOTHING, next-step prints NOTHING, autopilot writes 0 stderr bytes outside a pipeline, and a
  subdirectory shell resolves back to the repo root. Suites: essense-flow hooks 16/16 (was 11),
  autopilot 44/44.
- **Track 4 — `/elicit` promoted to `plugins/elicit/` 0.1.0** (one SKILL.md, zero code, no
  preconditions, bundle-safe): the gap-recursion engine retargeted at `.steward/vision.md` +
  `questions.md`, orienting from kb + the model first, writing ONE inbox capture and never the
  model itself. Benching routed to Q17 with two facts and no self-answer (inbox
  `20260911-2342-…`).
- **Track 5 — the user-facing pass.** README 382 lines/41 KB → 149/7.6 KB (hero → install → one
  quickstart → grouped catalog → links out), install commands corrected to
  `<name>@mk-cc-resources`, five previously-unlisted plugins added; all 18 marketplace rows cut
  to ≤200 chars (longest 191, was 9,879) and given the 7 recommended metadata fields (was 0/17);
  the 5 missing plugin READMEs written (17/17); all 16 `RELEASE-NOTES.md` → `CHANGELOG.md` (Keep
  a Changelog, recent 5 rewritten user-facing, older verbatim into `design/notes/<plugin>-history.md`);
  the convention moved with it (`/version-bump`, `/plugin-scaffold`, `/docs-audit`, `@ship` —
  thorough-mode 1.11.3 for the injected-text change).
- **Track 5 — the guard, so it cannot regress (plugin-toolkit 1.14.0).** New `plugin-docs` claim
  (README present · CHANGELOG's newest entry == shipped version · description ≤200); `doc-version`
  broadened to link-form rows and any version cell, sweeping `plugins/*/README.md` + `CHANGELOG.md`.
  **And a defect in the gate itself:** `test-all` matched node:test's old `# pass N` marker, so on
  node 24 every node-file suite counted ZERO — reported 1,325 against a real 1,443, and the number
  could not move when 16 tests were added or removed (both measured). Fixed; the same blind spot
  hid `essense-flow:tests/ledger-compaction.test.js` **running and checking NOTHING** since the
  gate began.
- **Gates at the four commits** (`2135b28` · `4f45fa5` · `750f0f6` · `94df2d5`), run from the repo
  root, exit codes read directly: `repo-guard` **clean, exit 0** (4 detectors) · `registry-check`
  **exit 0** (8 claim sources) · `test-all --root <repo>` **32/35, 1452 checks, 1 skipped, exit 1**
  on three named non-green — two pre-existing (`essense-flow:test/run-all.cjs` fixtures gone;
  code-glossary pytest deps absent) and the ledger-compaction skip, newly VISIBLE, not newly broken.
- **18 `<plugin>@<version>` tags created LOCALLY, none pushed** (`git push --dry-run --tags`
  confirms all 18 would be new). The convention had stalled at `mk-cc-all@1.13.0`.
- **#1 leg C — the watch FIRED, and it is a false positive** (inbox `20260912-0013-…`): 142
  `checks.jsonl` lines this session against 0 Stop trace lines, because the sitting had not
  yielded once (one `promptId` across 760 transcript lines). A timed hand-run of the INSTALLED
  0.9.0 over this transcript: **exit 0, 38,436 ms, 2,334-byte tail, +2 trace lines** — the hook
  works. The predicate needs a yield guard; that is the model's call, not a session's patch.
- **NOT done, and outstanding:** `claude plugin update` is still the owner's to run (the ledger
  still reads the 09-10 generation: turn-end 0.9.0 · lens 0.6.0 · steward 0.5.2 · essense-flow
  0.26.2 · autopilot 0.4.1) — and it will only carry TODAY's work once these four commits are
  pushed. Nothing was pushed; the push and the tag push both wait on the owner's word.

## 2026-09-12 (00:2x) · PUSHED — `acb736b..7cc3d3d` live, 29 tags on origin; the tag push raced the rebase and was corrected

- Owner ruled "push commits + tags". The branch push was **REJECTED** — `origin/main` had moved
  to `acb736b` (another session's 28-line log append). Rebased onto it; the only conflict was
  `.steward/log.md`, resolved by keeping BOTH entries. Gates re-run AFTER the rebase: repo-guard
  exit 0 · registry-check exit 0 · test-all 32/35, 1452 checks. Then `acb736b..7cc3d3d` pushed.
- **Recorded because it nearly shipped wrong:** 18 tags were pushed BEFORE the rebase, so six of
  them pointed at commits the rebase orphaned — tags on origin naming shas unreachable from
  main. Caught by walking every tag with `git merge-base --is-ancestor <tag> main`, re-pointed
  and force-pushed; `git ls-remote --tags` now matches local EXACTLY for all 29. **Order rule for
  next time: push the branch first, tags only after it lands.**
- Still the owner's to run: `claude plugin update turn-end verifiability-lens steward
  essense-flow essense-autopilot` + restart.

## 2026-09-12 · Two items + five ships integrated at a50fa75 — #39 and #40 CLOSED and deleted, Q23 closed as answered two days ago, leg C's watch re-cut with a yield guard, every pre-1.14.0 test-all total RETIRED

- **#39 CLOSED (Track 4).** essense-flow 0.27.0 + autopilot 0.5.0 silence the false alarms at
  the source. NEW plugin `plugins/elicit/` 0.1.0 retargets the gap-recursion engine at
  `.steward/vision.md` + `questions.md`, writes ONE inbox capture. Bench decision routed to Q17.
- **#40 CLOSED (Track 5).** Public surface rebuilt and GUARDED by `registry-check`'s new
  `plugin-docs` claim, not merely swept.
- **Three unplanned toolkit ships absorbed.** 1.14.0: test-all could not read node 24's pass
  marker, so 30 of 35 suites counted ZERO — every test-all total this model recorded before it
  is retired, not compared. 1.15.0 `digest-uptake`: 1 injection in 5 CUT by the platform bound.
  1.16.0 + turn-end 0.11.0: the uptake scorer credited BOILERPLATE (this model's own four-line
  preamble) as use; idf weighting drops steward-model uptake 79% → 64%. New `asset-value` source
  ranks knowledge per kb source/asset with an `unused_assets` list (`.steward/log.md` 0/1 used
  across 5 surfacings → Q21) and reports `asset.origin_recorded` FALSE (`.claude/kb/` gitignored).
- **#1 leg C — the watch fired FALSE and the model ruled on the predicate.** New trigger requires
  a YIELD (a `stop_hook_summary`, or ≥2 distinct `promptId`s) before silence counts as a finding.
- **Q23 CLOSED as already answered** — the owner delegated the `[instr]` pick 09-10; the model
  carried it OPEN for two days, a log-vs-model contradiction the class #8/#38 exist to catch.
- **Q17 and Q21 gained inputs; neither was answered.** Q17: extraction done, essense-flow now
  costs ~zero to keep installed. Q21: `asset-value` replaces the argument with numbers.

## 2026-09-12 · thorough-mode 1.12.0 — `@fc` (fewer clicks), built twice: once on a dead base, then on origin

Owner asked for a ninth prompt modifier: "doing everything it can on its own instead of telling me
to do things ... least effort to see what it is you wanna show me". Shipped as `@fc`, tag
`[fewer-clicks]` — a drop-in entry in the existing `MODIFIERS` + `HINTS` registries. Content is the
2026-09-09 owner law cited with provenance, available ON DEMAND, not as a default.

**The expensive lesson: the first build was done on a base 10 commits stale.** `origin/main` had
moved `acb736b -> c4d8093`. No `git fetch` ran before the work; the local ref was trusted as
current. **Rule earned: `git fetch` is step 0 of any version bump — `registry-check` cannot catch
this class, because it validates the checkout against itself.** Recovered via stash +
`merge --ff-only` + re-apply onto upstream's shape.

**Lens defect found in the exec ledger:** `.claude/turn-end/checks.jsonl` truncates `command` at
exactly 300 chars, so a gate at the tail of a long compound command is invisible to any ledger
reader. The lens used that silence to refute two gate runs that had in fact run and passed — the
ledger manufactures FALSE NEGATIVES, the mirror of the false-clean it was built to catch.

**Checks:** `thorough-mode.test.js` exit 0, 30/30 (21 baseline + 9 new) · repo-guard exit 0 ·
`registry-check --root .` exit 0, 8 claim sources · `test-all` x3: exit 1/0/0, 2100 checks.

**#9 flake — mechanism finally named.** 4 of 8 observed sweeps red, always `essense-flow:
test/run-all.cjs — exit 1`, passing standalone. `bin/test-all.js:118` captures stdout/stderr but
the FAILED block prints only the exit code — **the evidence is discarded at the reporter.**

NOT committed, NOT pushed — owner's call.

## 2026-09-12 (late) · Two items integrated at `c4d8093` — the `@fc` build recorded as BUILT-not-shipped, parts drift corrected, #42 + #41 opened ahead of Phase 2, Q25 re-derived with the audit evidence

**Base note:** this checkout was ten commits stale and fast-forwarded `acb736b` → `c4d8093`.

**Item 1 — model-vs-disk drift, verified and corrected.** parts.md carried thorough-mode at
1.11.3/8 modifiers; disk showed 1.12.0/9 modifiers, built-uncommitted — the first
working-tree-only plugin state this model has had to represent.

**Item 2 — cascaded into four places:**
- **New law: `git fetch` is step 0 of any version bump.** Reach chain now **fetch → bump → push
  → install → restart.** Mechanized as **#41**.
- **New defect, #42.** `.claude/turn-end/checks.jsonl` writes `cmd: command.slice(0, 300)`
  silently while `classify()`/`filesInCommand()` parse the full string — two false refutations
  in one sitting. Placed ahead of Phase 2 because **#32's goal duty is satisfied by this file.**
- **#9's flake has a MECHANISM:** the reporter discards captured stdout/stderr on FAILED — fix
  starts in plugin-toolkit, not essense-flow.
- **Q25 re-derived:** ship `@fc` on demand, with the conditional turn-end fold pre-registered —
  never a standing injection on a harness already at p95 20.5 KB.

## 2026-09-17 · Two items integrated at `6052e6b` — the owner's value question parked as Q26 with its measured table, Q25 + Q13 closed into it, the 09-14 judge-timeout ruling recorded from source; the 09-13/14 sitting is NOT in the model (no capture)

**Base note:** HEAD `6052e6b` == origin/main, tree clean. Five commits and one sitting (09-13/14)
sat between the model's last recompute and here with NO inbox item and NO log entry — this pass
verified only what it wrote and named the rest at subject level.

**Item 1 (inbox 20260910-0510):** already integrated by the 09-11 correction pass; residue folded
into #8.

**Item 2 (inbox 20260917-1652, OWNER verbatim: "is steward and verification and all that adding
value?... it feels like it's just burning tokens... infinite things that conflict... lighter
models?"):** → **Q26**, with the four-ship + control table and three corrections: (i) hint/digest
file-open metrics are honest for pointer kinds only; (ii) judge p95=60s in all ships is OUR
constant — **owner ruling 09-14, verbatim "extend the timeout... make it 5 times longer i don't
care", 60→300s, hook ceiling 420s**; (iii) this ship's "19 unintegrated" is a FILE count where
status.json said 2. **Cascade:** Q13 merged into Q26; Q25 CLOSED BY BUILD; Q20 + Q21 amended;
**#17 and #38 moved AHEAD of #32/#8**; #42 part (1) closed on disk; #9 steps 2a/2b CLOSED (lock
contention, capture `20260914-2130`); #41 still open.

**MID-PASS CORRECTION:** the raised judge build IS installed — ledger grep-read, INSTALLED ==
DISK for all 17. Post-install judge: aithseis 21 fires/81% empty; twin 3/67%; mk-cc 2/0%. **#1 leg
B CLOSED**, **Q24 CLOSED BY INSTALL**. The model and the session's own digest both carried
"nothing installed" for three to six days past the truth.

## 2026-09-17 (session) · slice 1 of the memory redesign SHIPPED: kb 0.16.0 — kb-hints OFF by default

- Owner delegated the shape ("explain it to me or take responsibility"); plan of record in
  `inbox/20260917-1830-…`; research in `.claude/kb/captures/20260917-1800-…`. **This plan's own
  status-lifecycle machinery (slices 2-3) was SUPERSEDED the next day by the owner's 09-18
  one-live-copy ruling** — only slice 1 survives as shipped.
- Change: `pull.hints` opt-in (literal `true`), shipped default `false`; hints channel = total
  silence when off; malformed kb.json still prints its one line; digest channel + MCP pull
  unchanged.
- Check: kb-pull 107/107 (5 new), footprint 32/32, session 79/79, kb 276/276, mcp 45/45;
  registry-check exit 0 (8 claims); repo-guard clean (5 detectors); test-all 34/35, 2156 checks —
  the red is essense-flow `run-all.cjs` lock contention (#9, pre-existing).
- NOT yet measured: `hook_bytes.per_prompt.avg` ≤ 3,000 needs the plugin INSTALLED + restart and
  ~20 real prompts.

## 2026-09-18 (session) · the GARDEN shipped: steward 0.7.0 — one live copy, latest wins, nightly deletes

- Owner ruling verbatim in `inbox/20260918-0010-…` (supersedes Claude's five-slice plan: no
  supersedes links, no dormant tier, no importance scores — delete).
- Built: `lib/garden.js` (pure planner), `bin/steward-garden.js` (--json/--apply), agent job
  `garden`, brief-hook instrument + DUE note + protocol law, `/steward:garden`,
  `.steward/garden.json` overrides.
- Check: garden 40/40, steward-brief 59/59 (+5), status 13/13; dry run on THIS repo: 43 log
  entries, 23 digests, 17 integrated inbox files, 29 inbox/done deletable; every model file over
  cap (log.md 154 KB vs 40 KB cap); Q12 + Q14 expired.
- NOT yet applied here: the first real garden run is the owner's to watch (the diff is the review
  surface).

## 2026-09-18 (garden pass) · FIRST REAL GARDEN RUN — every model file cut to cap by deletion, Q12+Q14 resolved to default, the 09-17/18 research + ruling integrated, three inbox items marked integrated

- **Applied the 2026-09-18 owner ruling to the model itself** (previously only shipped as code):
  vision.md's invariant-4 extension (the `live/superseded-by/refuted-by/archived` status-lifecycle
  proposal) REPLACED with the one-live-copy law; #38 marked BUILT with a two-item residue (kb
  captures still a second store; provenance-at-capture still missing); Q21 moved to the resolved
  ledger (the ruling answers it).
- **Contradictions resolved, latest wins:** judge timeout is 300s/ours, not a platform limit, and
  raising it did NOT fix the empty-pick rate (post-install numbers now the live reading, replacing
  the whole-life "60s" artifact everywhere it appeared); kb's inline bound is PER HOOK OUTPUT, not
  shared across hooks on one event (0.15.0 probe, replacing the older shared-budget model);
  reuse-gate is ON (0.2.0), replacing "dormant since 07-07" everywhere it was stated; #9's flake is
  named (lock contention) with a fix not yet applied, replacing "mechanism found, cause unknown."
- **Q12 (CI) and Q14 (extensibility consumers)** — both past their 14-day expiry with a stated
  default, resolved to that default and moved to questions.md's resolved ledger.
- **Caps enforced by deletion, not compression:** vision 24,811→~7.4 KB · state 48,924→~6 KB ·
  parts 87,262→~14 KB · tasks 57,329→~13 KB · questions 46,546→~5.5 KB · log.md cut to entries
  from 2026-09-11 evening forward (everything older is git history). briefing.md regenerated last.
- **Named for the session (cannot write outside `.steward/`):** the 2026-09-17 memory-research
  S1-S14 field comparison is real research behind the ruling but fits no live-copy file under
  cap — capture it only if the diagnosis table is worth citing again.
- **Check:** HEAD `6729e54` noted once at pass start, not re-audited mid-pass; every claim above
  traces to a capture or a prior log entry already in this file or the six 09-14/09-17 captures
  read this pass; status.json items appended for the three unmarked inbox files
  (`20260917-1740`, `20260917-1830`, `20260918-0010`); `views.garden/model/briefing.derived_through`
  advanced to `20260918-0010-owner-ruling-one-live-copy-latest-wins-nightly-gardener-deletes`.
