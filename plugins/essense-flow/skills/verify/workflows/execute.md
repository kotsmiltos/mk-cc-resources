---
workflow: verify-execute
skill: verify
trigger: /verify
phase_requires: any
phase_transitions: verifying -> complete | verifying -> eliciting | verifying -> architecture
---

# Verify Execute Workflow

## Prerequisites

- Pipeline initialized (`.pipeline/state.yaml` exists)
- `.pipeline/elicitation/SPEC.md` exists
- Project code has been built (at least one sprint complete)
- No active verify lock (`.pipeline/verify.lock`)

## Mode Detection

Before any other step, read `.pipeline/state.yaml` and check `state.pipeline.phase`:

- **`verifying`** → gate mode: runs state transitions and routing on completion
- **any other phase** → on-demand mode: produces report with routing suggestions, no state changes

## Scope Variant: lightweight vs full-swarm

Orthogonal to gate/on-demand, verify runs in one of two scope variants:

- **full-swarm** (default) — step 10 dispatches one verification agent per group in parallel.
- **lightweight** — step 10 is skipped; orchestrator runs verification inline in step 11. Valid when BOTH conditions are true:
  1. Diff since last verify (or since SPEC.md's last modification) fits within `config.verify.lightweight_max_files` (default 6 files).
  2. Most recent QA report for current sprint is PASS with grounded findings (findings carry verbatim on-disk quotes — see review skill).

Lightweight exists because dispatching ~N verification agents for 3-file change set that already passed grounded review produces no new signal and costs full swarm's tokens. Extraction agent (step 5) still runs — provides audit trail. Record variant in `state.verify.variant: lightweight|full-swarm` with one-line rationale.

## Steps

### 1. Preflight

Call `verify-runner.preflight(pipelineDir, pluginRoot, config)`. This:

- Verifies SPEC.md exists at `.pipeline/elicitation/SPEC.md`
- Computes SHA-256 hash of SPEC.md content (stored on run context for downstream steps)
- Checks no active verify lock held — if locked, report and exit
- Acquires run lock

If preflight fails (missing SPEC.md, lock conflict), report error and exit.

### 2. Load Inputs

Call `verify-runner.loadInputs(pipelineDir)` to gather:

- **SPEC.md content** — full text of design specification
- **Project file tree** — walked from project root, excluding `node_modules`, `.git`, `.pipeline`, and binary/generated file extensions
- **decisions/index.yaml** — intentional deviation records; null if file does not exist

### 3. Check for Existing Checkpoint

Call `verify-runner.loadCheckpoint(pipelineDir, specHash)`. If checkpoint exists for current spec hash, already-completed group verdicts loaded and those groups skipped during dispatch. Allows re-runs to resume without re-dispatching completed groups.

### 4. Assemble Extraction Brief

Call `verify-runner.assembleExtractionBrief(specContent, fileTreeText, specHash, pluginRoot, config)`. Produces brief for single extraction agent containing:

- Full SPEC.md content
- Project file tree listing
- Instructions for extracting items with id, text, section, verifiable flag, verifiable_reason, and tagged files

### 5. Dispatch Extraction Agent

Dispatch one extraction agent with assembled brief. Single dispatch — no parallelism at this step.

Extraction agent must:
1. Read through every section of SPEC.md
2. Extract every meaningful statement as discrete item (VI-NNN)
3. Tag each item with: section name, verifiable boolean, verifiable_reason, and list of likely implementation files
4. Output structured item list in required format
5. NOT filter — include context, rationale, and design philosophy statements tagged as `verifiable: false`

### 6. Process Extraction Output

Call `verify-runner.processExtraction(rawOutput, specContent, specHash, pipelineDir)`. This:

- Parses agent's structured output (XML envelope or structured markdown)
- Validates item schema (id, text, section, verifiable, files)
- Persists item list by calling `writeExtractedItems()` to `.pipeline/extracted-items.yaml`
- Returns items array

If extraction agent output malformed or missing required fields, retry once. If still failing, escalate to user with raw output attached.

### 7. Group Items

Call `verify-runner.groupItems(items, config, specContent)`. This:

- Groups all items deterministically by `section` field
- Splits sections with more than ~5 verifiable items into sequential sub-groups
- Preserves non-verifiable items in their section group (appear in report as SKIPPED — not dispatched for verification)

Returns array of groups, each with group id, section name, and item list.

### 8. Build File Content Cache

Call `verify-runner.buildFileContentCache(groups, projectRoot, config)`. This:

- Collects all unique file paths tagged across all groups
- Reads each file once and stores in shared cache
- Respects adaptive brief ceiling — files that would exceed token budget noted but not silently dropped

### 9. Assemble Verification Briefs

For each group (excluding groups already completed in checkpoint), call `verify-runner.assembleVerificationBrief(group, fileCache, decisions, specHash, pluginRoot, config)`. Each brief contains:

- Items in this group (spec text + verifiability tags)
- Contents of tagged implementation files from cache
- Relevant entries from `decisions/index.yaml` (matching items' sections or file paths)
- Instructions for semantic comparison: read spec intent, read code, check decision overrides, assign verdict + confidence + evidence

### 10. Dispatch Verification Agents

**full-swarm variant**: Spawn all verification agents in parallel using Agent tool — one agent per group. All groups in same batch.

**lightweight variant**: SKIP this step. Verification runs inline in step 11.

Each agent (full-swarm) must:
1. Read each spec item's text and understand design intent
2. Read implementation files provided
3. Check `decisions/index.yaml` entries for DEC-NNN overrides covering this item
4. Assign verdict: MATCH, PARTIAL, GAP, DEVIATED, or SKIPPED
5. Assign confidence tier: CONFIRMED, LIKELY, or SUSPECTED
6. Provide evidence: specific file paths and line numbers, or explicit description of what is absent
7. Output in required structured format

### 11. Process Verification Responses

**full-swarm variant**: For each agent's raw output, call `verify-runner.processVerificationResponse(rawOutput, specHash, extractedItems)`. This:

- Parses structured verdict output
- Validates verdict values and confidence tiers
- Associates verdicts back to item ids
- Returns parsed verdict map for this group

If agent output malformed, retry that agent once. If still failing, escalate to user — missing group means report cannot be complete.

**lightweight variant**: Orchestrator performs same semantic-comparison logic inline, reading each group's items, cached file contents, and relevant decisions. Produce verdict map directly. Inline verdicts capped at LIKELY confidence (no CONFIRMED) since no independent agent review; recency of grounded review carries confidence.

Call `verify-runner.saveCheckpoint(pipelineDir, specHash, completedGroups)` after each successful group.

### 12. Merge All Verdicts

Call `verify-runner.mergeAllVerdicts(completedGroups, extractedItems)`. For items in multiple groups:

- Verdict merge: worst-verdict-wins — GAP > PARTIAL > DEVIATED > MATCH
- Confidence merge: worst-first — CONFIRMED > LIKELY > SUSPECTED

Items in only one group keep that group's verdict as-is.

Returns merged verdict map keyed by item id.

### 13. Assemble Report

Call `verify-runner.assembleReport(extractedItems, mergedVerdicts, specHash, mode, config)`. Report structure:

- YAML frontmatter: artifact type, schema_version, produced_by, generated_at, spec_hash
- **Scorecard**: total items, verifiable items, counts and percentages per verdict (MATCH, PARTIAL, GAP, DEVIATED, SKIPPED), confidence breakdown
- **Per-section breakdown**: mirrors SPEC.md's section order; each section lists items with verdict, confidence, evidence, and decision override reference (if DEVIATED)
- **Routing section**: gate mode shows routing decisions; on-demand mode shows routing suggestions

### 14. Write Report

Call `verify-runner.writeReport(pipelineDir, report, mode)`. Output paths:

- Gate mode: `.pipeline/VERIFICATION-REPORT.md`
- On-demand mode: `.pipeline/VERIFICATION-REPORT-ondemand.md`

### 15. Routing and State Transition (Gate Mode Only)

Skip in on-demand mode.

Call `verify-runner.determineRouting(mergedVerdicts, mode, report)` to classify CONFIRMED gaps:

- CONFIRMED GAP → `architecture` (missing implementation — needs task specs and build sprint)
- CONFIRMED PARTIAL or CONFIRMED DEVIATED (without valid DEC-NNN override) → `eliciting` (spec drift — design needs revisiting)
- No CONFIRMED gaps → `complete`

Call `verify-runner.checkLoopLimit(pipelineDir, config, currentGapCount)` to check whether pipeline cycled through verify → elicit/architecture too many times. If loop limit reached, halt and escalate to user.

Call `verify-runner.updateVerifyState(pipelineDir, target, gapItems, currentGapCount)` to write routing target and gap summary to `state.yaml`.

Transition phase using `lib/state-machine.transition()`:
- `verifying -> complete`: auto-advance
- `verifying -> eliciting`: stop — user runs `/elicit`
- `verifying -> architecture`: stop — user runs `/architect`

### 16. Report

Show user:

- **Mode**: gate or on-demand
- **Scorecard**: total items extracted, verifiable items, verdict counts (MATCH / PARTIAL / GAP / DEVIATED / SKIPPED)
- **Confidence breakdown**: CONFIRMED / LIKELY / SUSPECTED counts
- **CONFIRMED gaps** (if any): list each item id, verdict, and evidence summary
- **Report location**: path to VERIFICATION-REPORT.md
- **Routing outcome** (gate mode): next phase and reason, or confirmation of complete
- **Routing suggestions** (on-demand mode): what pipeline would do if this were gate mode
