> **type:** qa-report
> **output_path:** artifacts/designs/cascading-decomposition/sprints/sprint-2/QA-REPORT.md
> **date:** 2026-04-07
> **plan:** artifacts/designs/cascading-decomposition/PLAN.md
> **overall_result:** PASS (5 autonomous fixes, 7 issues for next sprint)
> **key_decisions:** none — all findings are corrections or user-deferred
> **open_questions:** parent scope filename convention (H4), routing disambiguation (H5)

# QA Report: Sprint 2

## Summary
- Task spec compliance: 57/62 criteria passed, 4 partial, 0 failed
- Requirements alignment: All Sprint 2 requirements fully addressed, no scope reductions
- Fitness functions: 6/13 passed, 3 failed (F11, F12, F13), 4 cannot verify (runtime-only)
- Adversarial tests: 30 scenarios — 3 FAIL, 14 RISK, 7 PASS, 6 structural checks

## Critical Issues

### C1: Step 5 validation listed `<patterns>` and `<decisions>` as required (F13)
The workflow's Step 5 validation listed all 7 decomposition XML sections as required, but the assembly algorithm (Steps 5-6) and the reference (scope-decomposition.md line 331) explicitly say these are optional when no patterns/decisions apply. Agent output following the assembly rules would fail the workflow's own validation.

**Fixed autonomously:** Split required sections into required (5) and optional (2) with reference to assembly Steps 5-6.

### C2: Implementation brief frontmatter validation used wrong field names
Workflow Step 5 validated frontmatter fields `target, level, scope_root` for ALL brief types. Implementation brief template defines `task, module, component` instead. Every valid implementation brief would fail validation.

**Fixed autonomously:** Added per-type frontmatter field lists (decomposition vs implementation).

## High Priority

### H1: `Scope root` field missing from STATE.md template
Workflow Step 8 writes `Scope root: artifacts/scope/` to Pipeline Position. SKILL.md intake reads `scope_root` from Pipeline Position. STATE.md template had no such field.

**Fixed autonomously:** Added `Scope root` field to STATE.md template Pipeline Position section.

### H2: `scope-decomposition.md` missing from SKILL.md `<reference_index>`
The reference file exists and is required_reading for scope-decompose.md, but was not listed in the SKILL.md reference_index table. Consumers reading the index wouldn't discover it.

**Fixed autonomously:** Added entry to reference_index.

### H3: SKILL.md intake duplicate numbering
Two intake steps numbered "2." after scope INDEX.md check was inserted. Could cause LLM confusion when processing the intake flow.

**Fixed autonomously:** Renumbered steps sequentially (1-5).

### H4: Parent scope filename disagreement between templates and reference
Three-way naming conflict:
- Decompose template saves to `{module}.agent.md`
- Reference Step 7 reads `overview.agent.md`
- Workflow hedges with "OR" between both

**Needs resolution in Sprint 3.** Recommendation: standardize on `{slug}.agent.md` (matching template). Update reference and remove workflow fallback.

### H5: Routing conflict — "architect plan scope"
Route 0 triggers on keyword "scope" before Route 4 triggers on "plan". User saying "architect plan scope" (meaning "plan the scope system") gets routed to scope-decompose instead of plan.

**Schedule for Sprint 3.** Recommendation: require specific command pattern `/architect scope` rather than keyword matching.

### H6: Windows atomic write crash vulnerability
Step 7's delete-then-rename sequence for INDEX.md has a crash-vulnerable window. If a crash occurs between delete and rename, INDEX.md is lost and INDEX.md.tmp remains. No recovery logic documented.

**Schedule for Sprint 3.** Add recovery note: "If INDEX.md is missing but INDEX.md.tmp exists, rename INDEX.md.tmp to INDEX.md."

### H7: Concurrent session conflict (no locking)
Two orchestrators running `/architect scope level-1` simultaneously would read the same INDEX.md, spawn overlapping agents, and overwrite each other's INDEX.md updates. No locking mechanism exists.

**Document as known limitation.** Single-user workflow by design.

## Medium Priority

### M1: Workflow exceeds 300-line threshold from Adversarial Assessment
scope-decompose.md is 601 lines. PLAN.md risk register entry says "Factor into phases. Review at sprint 2 QA." The workflow is modular internally (clear step boundaries) but exceeds the stated threshold.

### M2: Decision ID padding inconsistency
INDEX.md template: `Next decision ID | 1` (raw integer). Decision record template: `D001` (3-digit zero-padded). No documented convention for padding. Agents may produce D1 vs D001 inconsistently.

### M3: QG5 scope conservation undefined at Level 0
At Level 0, the "parent" is the project itself, which may not have an aggregate estimated_lines figure. QG5 would fail to find a parent estimate.

### M4: Forced leaf at depth cap may exceed size target
When depth cap forces a module to leaf task, no warning is generated if the forced leaf exceeds the 250-line target (e.g., a 2000-line module forced to leaf at depth 5).

### M5: `<scope name="...">` attribute missing from assembly output
Assembly Step 8 section c writes `<scope>` without the name attribute, but consistency check CHECK 5 validates that `<scope name="...">` matches the target field.

### M6: Decision ID block overflow not parsed from agent output
Agent prompt says "flag the overflow." Orchestrator result-collection logic does not parse for overflow flags.

### M7: `scope-LN` literal vs placeholder ambiguity in STATE.md template
Template shows `scope-LN` as a stage value. Could be read as literal string or as placeholder (replace N with actual number).

## Low Priority

### L1: Feature flow fallback paths not fully documented in workflow
Assembly Step 2 mentions feature-brief.agent.md but does not document fallback to project-brief.agent.md.

### L2: F11 template positive framing violations (8+ instances)
Multiple templates contain negation keywords inside code fences: `agent-brief-decompose.md` ("don't", "do not"), `agent-brief-implement.md` ("never"), `decision-record.md` ("do not", "never"), `interface-contract.md` ("never", "Do not"), `consistency-check.md` ("Do not skip", "do not"). Mostly in instructional comments and examples.

### L3: F12 quality gate coverage still deferred
F4, F5, F8, F9, F10 lack numbered quality gates. Known from Sprint 1 QA, still deferred.

### L4: Inline threshold literals duplicate Decomposition Config values
Values 300, 0.30, 250 appear as inline literals in Step 2 of the workflow, duplicating config table defaults.

### L5: Consistency report overwrite on re-run
Report path `reports/consistency-L{level}-{batch-slug}.md` has no versioning. Re-running overwrites previous report, losing audit trail.

### L6: `feature-map.agent.md` referenced in scope-decomposition.md but no template exists
Feature flow fallback references this file format, but it is not defined in any template. Non-blocking since fallback to system-map.agent.md exists.

### L7: Single-module batch behavior undocumented in workflow
The consistency check is spawned for single-module batches but the workflow doesn't explicitly note that most checks return CLEAR.

## Autonomous Fixes Applied

| # | What Was Found | What Was Fixed | File |
|---|---------------|----------------|------|
| 1 | Step 5 validation listed `<patterns>` and `<decisions>` as required — contradicting assembly Steps 5-6 and reference (F13) | Split into required (5 sections) and optional (2 sections) with cross-reference to assembly instructions | `workflows/scope-decompose.md` |
| 2 | Step 5 validation checked decomposition frontmatter fields for ALL brief types — implementation briefs use different fields | Added per-type frontmatter field lists: decomposition (target, level, scope_root) vs implementation (task, module, component) | `workflows/scope-decompose.md` |
| 3 | STATE.md template missing `Scope root` field — workflow writes it, SKILL.md reads it, template doesn't define it | Added `Scope root` field to Pipeline Position section between `Build plan` and `Task specs` | `plugins/mk-flow/skills/state/templates/state.md` |
| 4 | `scope-decomposition.md` reference missing from SKILL.md `<reference_index>` — file exists and is required_reading but not discoverable via index | Added entry to reference_index table | `plugins/architect/skills/architect/SKILL.md` |
| 5 | SKILL.md intake had duplicate "2." numbering after scope INDEX.md check insertion | Renumbered intake steps sequentially (1 through 5) | `plugins/architect/skills/architect/SKILL.md` |

## Fitness Function Results

| Function | Result | Notes |
|----------|--------|-------|
| F1 | Cannot verify | Runtime check — no scope/ artifacts exist yet. Enforced via QG2. |
| F2 | Cannot verify | Runtime check. Enforced via QG1. |
| F3 | PASS | New agent prompts use positive framing. SECURITY: exception documented. |
| F4 | PASS (structural) | Enforced procedurally in assembly Step 9. No QG covers it. |
| F5 | PASS | Implementation template contains all 6 required sections. |
| F6 | Cannot verify | Runtime check. Enforced via QG5. |
| F7 | Cannot verify | Runtime check. Enforced via QG4. |
| F8 | PASS | Workflow enforces tier ordering: "Tier 1 first, then Tier 2, then Tier 3." |
| F9 | PASS | Assembly Step 8 places constraints (context, scope) before task section. |
| F10 | PASS | Orchestrator-only INDEX.md writes. Agent prompts restrict to assigned directory. |
| F11 | FAIL | 8+ negation instances in templates inside code fences. Mostly instructional/example text. |
| F12 | FAIL | F4, F5, F8, F9, F10 lack numbered QGs. Known deferred from Sprint 1. |
| F13 | FAIL -> FIXED | Workflow validation contradicted reference optionality. Fixed autonomously. |

## Proposed Fitness Functions

- [ ] F14: STATE.md template fields cover all Pipeline Position fields written by any workflow
- [ ] F15: SKILL.md reference_index lists every file in references/
- [ ] F16: Workflow files stay under the size threshold declared in the Adversarial Assessment
- [ ] F17: Intra-file consistency — validation rules match assembly rules within the same workflow

## Recommendations for Next Sprint

1. **Resolve parent scope filename convention (H4)** — standardize on `{slug}.agent.md`, update reference and workflow
2. **Fix routing disambiguation (H5)** — require `/architect scope` command pattern, not keyword match
3. **Add INDEX.md crash recovery note (H6)** — document temp file recovery
4. **Document concurrent session limitation (H7)** — single-user workflow by design
5. **Add decision ID padding convention (M2)** — standardize on D001 3-digit format
6. **Add QG5 Level 0 exception (M3)** — skip or use project-level estimate
7. **Add forced-leaf size warning (M4)** — warn when forced leaf exceeds overflow threshold
8. **Fix `<scope name>` attribute in assembly (M5)** — include name attribute in Step 8c
