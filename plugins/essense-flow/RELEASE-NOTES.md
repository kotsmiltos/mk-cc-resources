# Release notes — essense-flow

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
