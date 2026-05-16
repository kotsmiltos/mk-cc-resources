# Release notes — essense-flow

## 0.13.1 — Sprint-id predicate hardening + baseline test maintenance

Hotfix per 2026-05-16 closure-reopening decision in `redesign/06-decisions.md`. Surfaces from real-project failures in `D:\Diploma\Unity\Scalable Crowd` using cached `0.13.0`; root causes verified against cached source line-by-line before any code touch. Three concrete fixes + baseline test green; no new public API; additive `sprint_iteration` state field.

**Fix-1+2 — `<n>` predicate substitution diagnostic (`bin/essense-flow-tools.cjs:2154-2178` + `:1845-1872`).** When a transition's `requires:` predicate references `<n>` (e.g. `.pipeline/build/sprints/<n>/SPRINT-REPORT.md exists`) and the resolved sprint is null (state.sprint absent or non-number, `--sprint` arg not accepted for the target phase), the CLI no longer emits a misleading "not on disk" diagnostic pointing at the literal-`<n>` path. New kind `sprint-template-unresolved` surfaces from `evaluatePredicate`; call site translates to a diagnostic naming the resolution failure + the observed `state.sprint` value + a recovery hint pointing to either `--sprint <int>` (for sprint-accepting targets) or `state-set-sprint --value <int>` (for non-sprint targets that read state.sprint instead). Exit code unchanged (7 = `EXIT_PREREQ_MISSING`).

**Fix-3 — sprint shape type-check (`lib/state.js` `validateStateShape`).** When `sprint` is present in `state.yaml`, it must be `null` or a positive integer. Closes the asymmetry between the CLI write op `state-set-sprint` (which already enforces `parsePositiveIntOrNull`) and the shape validator (previously accepted any value). Direct YAML writes that introduced string sprint ids like `"3-PATCH-2"` previously passed shape validation and broke `<n>` substitution downstream; they now surface as `degraded:'corrupt'` with `shape_error.field === 'sprint'` at `readState` time.

**DD-15 — `sprint_iteration` field (additive; default `null`).** New optional positive-integer counter for re-runs of the *same* sprint number (fix-only follow-up passes). Sprint id stays positive int; iteration counts independently. Closes the user pattern of inventing string sprint labels like `3-PATCH-2`. Added to `OPTIONAL_KEYS` in `lib/state.js`; type-checked in `validateStateShape`; defaulted to `null` in `defaults/state.yaml`. Predicate path templates remain on `<n>` for sprint id only — `sprint_iteration` does not enter canonical paths in this release.

**Baseline test maintenance (17 ACs across 4 CJS test files + 4 ESM test files).** Discovered during this hotfix: plugin source main HEAD shipped `0.13.0` with 17 failing test ACs. Pattern was tests trailing implementation contract changes (D-Rd11-11 + D-Rd12-1 + D-Rd12-5). All updated to match landed contracts; **no implementation rollbacks**.
- `tests/state.test.js` (4) — readState contract for yaml-parse-failure (throws) vs shape-validation-failure (returns degraded with `shape_error`); writeState callers must pass full canonical state (incl. `schema_version`).
- `tests/finalize.test.js` (2) — finalize `nextState` arg now requires `schema_version: 1` (post D-Rd11-11 shape contract).
- `tests/hooks.test.js` (3) — seed YAML for hook tests must quote ISO timestamps (otherwise js-yaml parses as `Date` object and shape validator fails `typeof === 'string'`).
- `tests/conduct-preamble.test.js` (2) — frontmatter regex + canonical-preamble `includes()` checks now normalize CRLF → LF before matching (Windows-checked-in SKILL.md files use CRLF).
- `test/heal-apply-disposition.test.cjs` (3) — envelope keys are now `[ok, op, item_id, action, prior_status, new_status, heal_log_path, last_updated]` per D-Rd12-4 (i); drift keys `claimed_at` + `exit_code` removed from envelope; semantic claimed_at assertions moved to register entry on disk.
- `test/heal-sweep-log-atomic.test.cjs` (2) — atomicity proof is now byte-identical hash + no-orphan-tmp (cleanup hook fires per T-952 + D-Rd11-8); STALE_SWEEP token renamed to STALE_SWEEP_AUTO_RELEASE per T-962 / D-Rd12-6.
- `redesign/scripts/.test-fixtures/arch-alignment-check/pass*.md` (7 fixtures × ~8 ACs) — pass-fixtures now carry `sprint: 10` + `architect_round: 13` so the reader finds the `bootstrap_exemption_round_13: true` flag in `tmp-spike-CLOSURE/.pipeline/architecture/sprints/10/manifest.yaml` and emits zero findings per D-Rd12-5 (ii).

**New tests added with the hotfix.**
- `test/sprint-template-unresolved.test.cjs` — 3 ACs: undefined sprint + reviewing target emits sprint-resolution diagnostic; string sprint surfaces observed-type; regression guard against pre-hotfix `<n>... not on disk` wording.
- `test/sprint-shape-validation.test.cjs` — 10 ACs: sprint accepts null + positive int; rejects string / 0 / negative / non-integer; sprint_iteration accepts null / positive int; rejects strings.

**Cumulative test counts.** CJS: 43/43 pass (was 41/41 with 17 hidden failures pre-hotfix); ESM: 62/62 pass. `npm test` exits 0 cleanly for the first time since `0.13.0` shipped.

**Version source-of-record cleanup.** Plugin `package.json:3` bumped from `0.11.0` → `0.13.1` to reconcile a multi-version stale drift discovered during this hotfix; the Claude Code installer reads `.claude-plugin/marketplace.json:15` and `.claude-plugin/plugin.json:3` (both bumped to `0.13.1`), not `package.json`, so the stale value never affected installation behavior — but it misled human readers. Now consistent across all three.

**Scope NOT addressed by this hotfix** (per closure-reopening decision verbatim).
- Drift-6 audit substance (closure-plan SPEC DD-4): direct-YAML-write bypass detection. This hotfix adds *evidence* that drift-6 fires in real projects (28+ unknown `manual_transition_round_N` keys observed in user's `state.yaml`) but does NOT implement the substantive audit check. Still owed by a future increment.
- Drift-7/8/9 audit substance: still owed by a future increment.
- writeState's no-merge behavior with caller's `nextState`: writeState writes exactly what the caller passes (overlaid with `last_updated`), so callers must supply full canonical shape. Tests updated to match; latent gap for a future increment if production callers ever start passing partial state.

---

## 0.13.0 — Round-loop closure (Move 1-4 + L-7 + L-8 + annotation contract)

Additive feature work landed under `round-loop-closure/` in the meta-repo. Closes the round-N amendment loop pattern observed externally (Unity-shape project showed 8 review rounds on Sprint 3 with 5 of 6 confirmed criticals pre-existing, debt pool emptying one element per round). The framework now surfaces the FAMILY of a rule violation in a single round instead of staging across N rounds.

**Move 1 — rules as executable checks.** `references/decision-schema.yaml` locks the schema for rule-decisions. `lib/decision-schema-validator.cjs` validates every decision; rule-decisions (those with `applies_to:`) must have machine-checkable encoding OR explicit `unchecked-rule` acknowledgment. CLI op `spec-rule-validate --decisions-file <path>` rejects non-conformant decisions with exit 7.

**Move 2 — per-hit validator dispatch.** `essense-flow-validator` agent extended with verdict `intentional_exception` and Step 1.5 annotation re-read. Every sweep candidate gets a clean-context validator pass; raw grep is never trusted directly.

**Move 3 — annotation contract.** `references/annotation-shape.yaml` locks the grammar `[EssenseFlow: exempts <rule-id>, reason: <text>]`. `lib/annotation-parser.cjs` exposes `parseAnnotation` + `findAnnotations`. Validator honors annotations on Step 1.5; sweep marks candidates near annotations as `intentional_exception_candidate: true`.

**Move 4 — two new lenses.**
- `essense-flow-rule-completeness-lens` (L-7): iterates every rule with `applies_to`, calls `review-rule-sweep` per rule, emits findings per non-exempt sibling.
- `essense-flow-pattern-debt-lens` (L-8): reads prior-sprint QA-REPORT files; re-runs each cited rule's sweep against current substrate; emits findings only for NEW hits.

Both registered at `plugins/essense-flow/agents/` + mirrored at `~/.claude/agents/`. Tools allowlist tight (Read, Grep, Glob, Bash).

**CLI surface additions** (3 new ops; existing 17 unchanged):
- `spec-rule-validate --decisions-file <path>`
- `review-rule-sweep --rule-id <id> --project-root <abs> [--decisions-file <path>] [--output-format json|md] [--budget-timeout-ms <int>]`
- `review-pattern-debt-sweep --project-root <abs> [--max-rounds <int>] [--budget-timeout-ms <int>] [--output-format json|md]`

**Review SKILL.md amended** to dispatch L-7 + L-8 alongside the 6 existing adversarial lenses in the same parallel-dispatch step. Existing 6-lens substance preserved verbatim. Bootstrap-baseline mechanism (DD-RLC-5) + budget caps (DD-RLC-6) documented.

**Architect alignment-lens criterion 7d added.** Validates `applies_to.kind` in closed list; `target` regex compiles; `scope_glob` non-empty; `violation_check.detect` non-empty; `unchecked-rule` ack fields present. Lens-side mirror of `spec-rule-validate`.

### Backward compatibility

- Existing v0.12 projects without `applies_to` blocks on rules see L-7 emit zero findings (graceful degradation). No regression.
- 12 canonical phases unchanged.
- 11-key state schema unchanged.
- Existing 17 CLI ops unchanged.
- 6 existing adversarial lenses unchanged.
- 10 existing registered agents unchanged.

### Verifiable checks landed

- `node test/annotation-parser.test.cjs` → 7/7 PASS
- `node test/decision-schema-validator.test.cjs` → 8/8 PASS
- `node test/rule-sweep.test.cjs` → 5/5 PASS
- `node test/pattern-debt-sweep.test.cjs` → 2/2 PASS
- CLI smoke fixtures at `round-loop-closure/.test-fixtures/r5-good`, `r5-bad`, `r6-regex`, `r6-absence`, `r6-xref`, `r7-debt`, `unity-shape`
- End-to-end Unity-shape fixture: round 1 sweep surfaces 1 confirmed + 1 exempt (kind=absence look_direction=before); round 2 (post-patch) returns 0 confirmed; L-8 replay returns 0 new_hits. Full notes at `round-loop-closure/spike-notes/R13-end-to-end.md`.

### Honest gaps in this increment

1. **Real Agent dispatch of L-7 + L-8 not verified end-to-end.** CLI mechanisms verified; lens agents registered; but no `Agent` tool dispatch of either lens fired during the build session. Real verification requires a user-driven `/essense-flow:review` run on a project with `applies_to`-encoded rules.
2. **Master orchestration of 8 lenses parallel not verified end-to-end.** Substance amendment to review/SKILL.md made; orchestration happens when master invokes the skill on a real project. Deferred to user-driven invocation.
3. **Bootstrap-baseline `--acknowledge-baseline` flag NOT implemented.** Documented in DD-RLC-5 + review/SKILL.md but `state-set-phase` does not yet accept the flag. Follow-up needed.
4. **Marketplace install on a third fresh project NOT smoke-tested.** Plugin source modifications uncommitted in mk-cc-resources at this session's end. Smoke install + R13 fixture re-run from marketplace-installed plugin is the final R14 verifiable check, deferred to user invocation.
5. **paired-xref kind** stub-implemented (behaves identically to xref for now). `pair_by` heuristic enforcement deferred.
6. **Annotation co-location heuristic** scans ±3 lines around candidate. Sufficient for most idiomatic placements; complex multi-line annotations may need future tuning.

### Where the design lives

`round-loop-closure/` at the meta-repo root contains the full plan + spec + state + decisions + spike-notes + test fixtures.

---

## 0.12.0 — Trust-model docs + drift-audit harness + dogfood pipeline

A minor increment along the 0.x line. The contract surface still evolves; this release lands the trust-model docs, the substantive drift-audit harness (drift-6/7/8/9 promoted from pending-spec to real checks), and two end-to-end dogfood runs that drove the pipeline idle→complete on fresh projects. v1 declaration deferred to a later release, by the operator, when the operator chooses.

### Move 1 — Trust-model docs as first-class artifacts

`SECURITY.md` and `TRUST.md` are now part of the install, not an afterthought. SECURITY.md names the threat model (operator-trusted infrastructure, not a sandbox), the reporting channel (mk-cc-resources GitHub issues, `[security]` prefix), the mitigations actually in place at 0.12 (finalize-only state writes, dual-record self-reports, evidence-bound findings, fail-soft hooks, no silent stubbing in heal, gitignore re-include negations), and the known limitations operators must absorb (no SAST, no sandbox, no signed releases, single-maintainer bus factor, Resolution A inline-substance dogfood gap from T-1029). TRUST.md makes the trust boundaries explicit: what the plugin trusts (marketplace source, finalize.js, transitions.yaml), what it actively distrusts (sub-agent self-reports, review findings without evidence, architect sprint-packing claims), how phase handoff works (artifact-mediated, atomic finalize, per-prompt re-grounding), and the calibrated assumptions on Claude behavior (drift, premature finish, shortcuts under pressure, recency bias). No future skill author can silently widen trust without contradicting these documents.

### Move 2 — README + architecture docs at D-A6 depth

`README.md` rewritten against the D-A6 doc-depth target: Purpose, Setup, Usage, API reference, Known limitations, Trust model pointer, License, Citation. Eight H2 sections, 150-300 lines. The "Versioning" prose that floated as a single H2 in 0.11.0 is now `## Known limitations` (honest about what 0.12 does not do) plus version history elsewhere. `docs/architecture.md` lands as a new artifact: Module map, Per-module (one subsection per top-level dir), Data flow walkthrough (state.yaml + finalize trace), Key abstractions (closed contracts, dual-record, evidence-bound findings, fail-soft hooks), Propagation. Operators no longer have to grep SKILL.md to understand the lib/skills/hooks topology.

### Move 3 — Doc structure locked by architecture decision

The D-A6 decision (Resolution A) freezes doc depth targets: SECURITY.md ~75 lines, TRUST.md per-section coverage of trust boundaries, README.md ~220 lines with 8 H2 sections, docs/architecture.md ~300 lines with 5 H2 sections. T-1030's test_completion_contract enforces these via grep + wc-l acceptance checks. Future doc edits that drift outside the bands fail the audit. The 0.x pattern of "doc by vibe" closes.

### Move 4 — Substantive drift-audit + end-to-end dogfood

drift-6 (SHA-256 fingerprint integrity), drift-7 (decompose triple-witness), drift-8 (audit-time dispatch-count defense), drift-9 (cursor-phase divergence) all promoted from pending-spec stubs to real checks at `redesign/scripts/drift-audit.py`. Two fresh-project pipelines (bookmarx + mdlinks) ran idle→complete this increment, each terminating with drift-audit 11/11 PASS. `claude plugin install essense-flow` from marketplace.json registry verified working (cold + warm both exit 0). Increment is substantive; v1 declaration intentionally deferred — the operator declares v1 when ready, not at every contract-surface change.

### Verifiable checks

- `SECURITY.md` exists with 4 required H2 sections (`Threat model`, `Reporting`, `Mitigations`, `Known limitations`) + propagation footer; line count 50-100.
- `TRUST.md` exists with 4 required H2 sections (`What trusts`, `What distrusts`, `Handoff between phases`, `Assumptions on Claude`) + propagation footer.
- `README.md` line count 150-300; 8 H2 sections matching the D-A6 spec.
- `docs/architecture.md` line count 200-400; 5 H2 sections.
- `RELEASE-NOTES.md` leads with `## 0.12.0`; 4 `### Move ` subsections; existing `## 0.11.0` entry preserved verbatim below.
- T-1029 + T-1031 ship-gate acceptance criteria remain green (see their completion records).
- `node scripts/self-test.js` + `node scripts/validate-plugin.js` both pass.

### Version bump

Plugin `0.11.0` → `0.12.0` (minor — additive: trust-model docs + drift-audit substance + dogfood evidence; contract surface unchanged).
Marketplace `2.4.0` → `2.5.0` (minor — coincides with plugin minor bump).

## 0.11.0 — Contracts at the point of action

The 0.10.0 master/sub-agent rewrite cut context dilution but left a class of failures in place: master could still bypass `lib/finalize.js` and write `state.yaml` directly with an invented phase value (e.g. `phase: building`), or improvise the on-disk schema (single `SPRINT-MANIFEST.yaml` instead of one per sprint, `tasks/*.md` instead of `sprints/<n>/tasks/*.yaml`). Downstream skills (build) then halted because canonical paths were absent.

0.11.0 closes the bypass without adding new gates. Three moves, each calibrated to "help without encumber."

### Move 1 — Closing "Before you finalize" block on every phase-producing skill

Every phase-producing SKILL.md now ends with a closing block that:

- Lists the legal phase targets verbatim (copied from `references/transitions.yaml` — no synonyms)
- Names common invented values (`building`, `done`, `architected`) so they read as wrong
- Shows the exact `finalize({writes, nextState})` call shape with paths populated
- Carries a numbered self-check: phase spelled exactly, `<n>` expanded to the literal sprint number, file extensions correct, sub-agents dispatched, `finalize` is the only writer
- Closes with: "if any answer is no, stop"

Placement is deliberate. The closing block is the last thing master reads — recency bias works for the rule instead of against. Master executing the finalize step sees the contract right where the action happens, not buried at the top of the file under thousands of substance tokens.

Skills covered: architect, build, review, verify, elicit, research, triage. Heal carries a variant ("Before each apply step") because heal walks the legal graph one step at a time rather than finalizing once.

### Move 2 — Soft `requires:` advisory in `finalize.js`

`finalize` now reads the `requires:` field of the from→to transition in `transitions.yaml`, extracts any path hints (substrings starting with `.pipeline/`), expands `<n>` to `nextState.sprint`, and emits a stderr advisory if a hinted path is neither in `writes[]` nor on disk:

```
[finalize] heads up: transition architecture->sprinting expects
.pipeline/architecture/sprints/1/manifest.yaml — not in writes,
not on disk. proceeding anyway.
```

The advisory does **not** refuse the transition. The legality check (legal `from→to` edge in the graph) remains the gate; this is purely informational, surfacing the gap at the moment of cost. Caller can ignore with reason.

`assertLegalTransition` now returns `requires` alongside the legality verdict, and `finalize` surfaces it. ~30 LOC including path normalization for Windows separators. Three new tests (advisory fires when path missing; advisory silent when path provided; `<n>` expands to literal sprint number). Test count 59 → 62, all pass.

### Move 3 — Heal recognizes improvised-schema architect output

Heal's SKILL.md gains an "Improvised-schema architect output (recovery case)" section enumerating detection signals (illegal `phase` value, single `SPRINT-MANIFEST.yaml`, flat `tasks/*.md`) and a per-step conversion proposal that:

1. Repairs an invalid `phase` to the nearest legal phase via `force: true` on the first finalize step (the only legal recovery for an illegally-named phase).
2. Splits a flat `SPRINT-MANIFEST.yaml` into one `sprints/<n>/manifest.yaml` per sprint, archiving the original under `.pipeline/.heal-archive/`.
3. Converts each `tasks/*.md` to `sprints/<n>/tasks/<id>.yaml`, deriving fields where possible (`goal` from "Why" section, `file_write_contract.allowed` from `files:` frontmatter, etc.) and explicitly surfacing fields that **cannot** be derived (`behavioral_pseudocode`, `test_completion_contract`) for user fill-in or routing back to architect.

No silent stubbing. Per-conversion user confirm. Original artifacts archived, never deleted.

### What did NOT get added

Per the constraint "wary of strict / encumbering": no PreToolUse hook on `state.yaml`, no schema-validator scripts, no count thresholds, no refusal in `finalize` when `requires:` paths are missing. The advisory warns; the legality check refuses. That's the entire enforcement surface.

### Verifiable checks

- `tail -50 skills/architect/SKILL.md` ends with "## Before you finalize"; same for build, review, verify, elicit, research, triage. Heal ends with "## Before each apply step".
- `node scripts/self-test.js` → 62/62 pass.
- `node scripts/validate-plugin.js` → `validate-plugin OK`.
- New tests verify advisory fires/doesn't fire correctly and that `<n>` expansion uses `nextState.sprint`.

Plugin 0.10.1 → 0.11.0 (minor — adds contract surface and `finalize` capability).
Marketplace 2.3.1 → 2.4.0 (minor — plugin sub-bump).

## 0.10.1 — Ship libs and build templates that were silently gitignored

Bug fix. Pre-existing shipping defect, surfaced when 0.10.0 sub-architect dispatch tried to load `lib/dispatch.js` from the installed marketplace cache and failed at `import { envelope } from "./brief.js"` — `brief.js` was on local disk but never reached git.

Root cause: repo-root `.gitignore` carries Python boilerplate (`build/`, `lib/`, `var/`, `wheels/`, etc.). The `lib/` and `build/` rules were recursively swallowing the plugin's own `plugins/essense-flow/lib/` and `plugins/essense-flow/skills/build/` directories. Only `lib/dispatch.js` had been force-added at some point in 0.4.x; the other four lib modules and two build templates that the build skill's SKILL.md references were never tracked.

Fix:
- `.gitignore` adds re-include negation patterns: `!plugins/*/lib/`, `!plugins/*/lib/**`, `!plugins/*/skills/build/`, `!plugins/*/skills/build/**`. Python ignores still apply to repo-root `lib/`, `build/` etc. — only plugin internals are re-included.
- Six previously-ignored files now ship: `lib/brief.js`, `lib/finalize.js`, `lib/state.js`, `lib/verify-disk.js`, `skills/build/templates/completion-record.md`, `skills/build/templates/sprint-report.md`.

Verifiable check: `git ls-files plugins/essense-flow/lib/` now returns 5 paths, not 1. Re-installing the plugin pulls a complete `lib/` so `dispatch.js`'s `import "./brief.js"` resolves.

No code changes to the libs or templates — they were already authored and passing the existing 59-test suite locally; they simply weren't reaching the marketplace install.

## 0.10.0 — Master / sub-agent orchestration

The architect rewrite that surfaced the failure mode also surfaced the systemic answer: when a skill produces N closed contracts, doing the substance in master context causes the discipline rule to drift under the fetched material. The fix is the master/sub-agent pattern — master orchestrates, sub-agents do substance, master synthesizes with the rule still loud.

### Architect rewritten — master architect mandatory

- Architect now opens with: "**You are the master architect. You orchestrate. You do not personally write task specs.**"
- Five jobs in sequence: **decide → delegate → synthesize → pack → finalize.**
- Master decides top-level boundaries; spawns one **sub-architect** per module via `Agent` tool calls (parallel, no concurrency cap); receives closed task specs back; packs sprints from the dependency graph with the rule still in working memory.
- New `templates/sub-architect-brief.md` — sub-architects forbidden from packing sprints, forbidden from cross-module decisions, must return closed contracts only.
- Sprint-packing math made operational: **sprint count = topological depth of the dependency graph.** Sprint > 1 manifest entries MUST carry `data_dependency_on_prior_sprint:` one-sentence justification — empty = invalid (architect collapses).
- Wave-first thinking named: "Wave 2 is parallel-safe; same `/build` invocation. Sprint 2 is a hard checkpoint requiring user re-invoke."
- Stop-cost rule explicit: "Every sprint split = the user types `/build` again."
- New section "Why the master/sub-architect split exists" names three observed failure modes: context dilution, theme drift, stop multiplication.

### research / build / review / verify — delegation hardened

Each carries a new "## Why delegation is mandatory here" section naming:
- The substance volume that would dilute master context
- The specific discipline rule that would drift
- The drift symptom the delegation prevents

These four already dispatched parallel agents; the SKILL.md prose now states *why* the delegation is the mechanism, not just *that* it happens. Drift in the future is now traceable to a removed paragraph, not to an unwritten convention.

### triage / heal — optional delegation pattern added

Both gain "## Optional delegation" sections, judgment-driven:

- **triage** — for large input batches (post-review with many findings, post-research with many gaps), dispatch **per-class sub-triagers** (one per item kind: bug, drift, gap, ambiguity, missing-analysis). Each returns dispositions; master cross-references against SPEC. New `templates/sub-triager-brief.md`.
- **heal** — for mid-flight projects with many prior artifacts, dispatch **per-shape sub-recognizers** (one per artifact kind: SPEC-shape, REQ-shape, ARCH-shape, sprint-output, foreign prose). Each reads bodies in its slice; master synthesizes walk-forward. New `templates/sub-recognizer-brief.md`.

Per **INST-13**: no count threshold triggers delegation. Judgment-driven. If the work feels like reading-and-deciding, master stays in main; if it feels like pattern-matching at volume, master delegates.

### Skills not touched (correctly)

- **elicit** — substance is dialogue with user; delegating breaks the contract.
- **context** — read-only state plumbing; no substance volume.

### Verifiable check

- `node scripts/self-test.js` → 59/59 green
- `node scripts/validate-plugin.js` → OK
- All 9 SKILL.md still carry verbatim Conduct preamble (audited)
- All 9 SKILL.md still cite all 5 principles in load-bearing sections (audited)

### What did NOT get added

Per user direction "forget adding validators as scripts and strict stuff" — no new JS validators, no manifest schema validators, no count thresholds. The discipline lives in SKILL.md prose, enforced by the master/sub-agent split itself: master arrives at synthesis with the rule loud because substance was elsewhere.

## 0.9.0 — Principle-citation enforcement

- **Architect now carries a Core Principle block citing the owner's "lowest amount of sprints necessary" rule verbatim.** The sprint-and-wave packing rules (default one sprint, one wave; split only on real data-dependency or file-conflict; theme-based splits rejected) are now anchored to the principle they enforce, not floating as one-of-many constraints.
- **All 9 SKILL.md files now cite all 5 principles** (Graceful-Degradation, Front-Loaded-Design, Fail-Soft, Diligent-Conduct, INST-13) in load-bearing sections (Core Principle or Constraints). Each citation names the **specific behavior** the principle governs in that skill — not label-stacking.
- **New audit test** `tests/principle-citations.test.js` enforces the above. Two assertions:
  - Every principle cited somewhere in every SKILL.md.
  - Every principle cited in either Core Principle or Constraints (load-bearing only — citations buried in incidental prose fail).
- **Test count: 57 → 59 green.**
- Drift guard: future SKILL.md edits that drop a citation fail this audit. Adding a new skill requires explicit entry + matching citations, or explicit `EXEMPT` registration with one-line justification.

## 0.8.0 — Clean break from 0.7.0

Full rewrite. Old plugin archived on `archive/essense-flow-v0.7`. Pre-1.0 — contracts may still shift before the first stable cut.

### What changed

- **No resource caps as fail-closed gates.** `MAX_CONCURRENT_AGENTS`, `MIN_WAVE_CAP`, every "if N exceeded, reject" clause — gone. Quality-gate thresholds remain (e.g. `evidence.min_quote_length`); they police evidence policy, not throughput.
- **Hooks are advisory only.** Two hooks total (`context-inject`, `next-step`). Neither blocks tool calls. Degraded state surfaces a warning and continues — every prior fail-closed branch removed.
- **Lib reduced to five primitives.** `state`, `finalize`, `brief`, `dispatch`, `verify-disk`. No 27-module orchestration tower. The cognitive work lives in the skill agents via the SKILL.md contracts they read at dispatch time.
- **Atomic finalize.** Every phase-producing skill writes its artifact and transitions state in one call. No more split write+transition that drops an autopilot loop into a phantom-artifact-with-stale-phase state.
- **Evidence-bound review.** Findings without verbatim path evidence are not findings. The validator re-reads cited files; quotes that drifted out of position auto-flag as false positives with reason `quote_drift`.
- **Conduct preamble.** Every SKILL.md begins with the verbatim Conduct block. Audited by `tests/conduct-preamble.test.js`.
- **Brief assembly fail-soft.** Oversize content emits a stderr warning and is returned in full. Briefs are contracts; contracts don't get truncated because the work was bigger than expected.

### Migration

Pipelines started under 0.7.0 should run `/heal` after upgrading. Heal walks the working directory, infers the phase from on-disk artifacts, and proposes a walk-forward — applies only on user confirm.

### Tested

- `node scripts/self-test.js` — all primitives + audits green.
- `tests/no-caps.test.js` — greps for the forbidden patterns; zero hits permitted.
- `tests/conduct-preamble.test.js` — every SKILL.md begins with the verbatim Conduct block.
- `tests/transitions.test.js` — every transition declared in any SKILL.md exists in `transitions.yaml`.
