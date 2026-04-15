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

## Steps

### 1. Preflight

Call `verify-runner.preflight(pipelineDir, pluginRoot, config)`. This:

- Verifies SPEC.md exists at `.pipeline/elicitation/SPEC.md`
- Computes SHA-256 hash of SPEC.md content (stored on the run context for downstream steps)
- Checks no active verify lock is held — if locked, report and exit
- Acquires the run lock

If preflight fails (missing SPEC.md, lock conflict), report the error and exit. Do not proceed.

### 2. Load Inputs

Call `verify-runner.loadInputs(pipelineDir)` to gather:

- **SPEC.md content** — full text of the design specification
- **Project file tree** — walked from project root, excluding `node_modules`, `.git`, `.pipeline`, and binary/generated file extensions
- **decisions/index.yaml** — intentional deviation records; null if the file does not exist

### 3. Check for Existing Checkpoint

Call `verify-runner.loadCheckpoint(pipelineDir, specHash)`. If a checkpoint exists for the current spec hash, already-completed group verdicts are loaded and those groups will be skipped during dispatch. This allows re-runs to resume without re-dispatching completed groups.

### 4. Assemble Extraction Brief

Call `verify-runner.assembleExtractionBrief(specContent, fileTreeText, specHash, pluginRoot, config)`. This produces a brief for a single extraction agent containing:

- Full SPEC.md content
- Project file tree listing
- Instructions for extracting items with id, text, section, verifiable flag, verifiable_reason, and tagged files

### 5. Dispatch Extraction Agent

Dispatch one extraction agent with the assembled extraction brief. This is a single dispatch — no parallelism at this step.

The extraction agent must:
1. Read through every section of SPEC.md
2. Extract every meaningful statement as a discrete item (VI-NNN)
3. Tag each item with: section name, verifiable boolean, verifiable_reason, and a list of likely implementation files from the project file tree
4. Output the structured item list in the required format
5. NOT filter — include context, rationale, and design philosophy statements tagged as `verifiable: false`

### 6. Process Extraction Output

Call `verify-runner.processExtraction(rawOutput, specContent, specHash, pipelineDir)`. This:

- Parses the agent's structured output (XML envelope or structured markdown)
- Validates item schema (id, text, section, verifiable, files)
- Persists the item list by calling `writeExtractedItems()` to `.pipeline/extracted-items.yaml`
- Returns the items array

If the extraction agent output is malformed or missing required fields, retry once. If still failing, escalate to the user with the raw output attached.

### 7. Group Items

Call `verify-runner.groupItems(items, config, specContent)`. This:

- Groups all items deterministically by their `section` field
- Splits sections with more than ~5 verifiable items into sequential sub-groups
- Preserves non-verifiable items in their section group (they appear in the report as SKIPPED — not dispatched for verification)

Returns an array of groups, each with a group id, section name, and item list.

### 8. Build File Content Cache

Call `verify-runner.buildFileContentCache(groups, projectRoot, config)`. This:

- Collects all unique file paths tagged across all groups
- Reads each file once and stores content in a shared cache
- Respects the adaptive brief ceiling — files that would exceed the token budget are noted but not silently dropped

### 9. Assemble Verification Briefs

For each group (excluding groups already completed in a checkpoint), call `verify-runner.assembleVerificationBrief(group, fileCache, decisions, specHash, pluginRoot, config)`. Each brief contains:

- The items in this group (spec text + verifiability tags)
- Contents of the tagged implementation files from the cache
- Relevant entries from `decisions/index.yaml` (entries matching the items' sections or file paths)
- Instructions for semantic comparison: read spec intent, read code, check decision overrides, assign verdict + confidence + evidence

### 10. Dispatch Verification Agents

Spawn all verification agents in parallel using the Agent tool — one agent per group. All groups in the same batch.

Each agent must:
1. Read each spec item's text and understand the design intent
2. Read the implementation files provided
3. Check `decisions/index.yaml` entries for DEC-NNN overrides covering this item
4. Assign a verdict: MATCH, PARTIAL, GAP, DEVIATED, or SKIPPED
5. Assign a confidence tier: CONFIRMED, LIKELY, or SUSPECTED
6. Provide evidence: specific file paths and line numbers, or an explicit description of what is absent
7. Output in the required structured format

### 11. Process Verification Responses

For each agent's raw output, call `verify-runner.processVerificationResponse(rawOutput, specHash, extractedItems)`. This:

- Parses the structured verdict output
- Validates verdict values and confidence tiers
- Associates verdicts back to their item ids
- Returns the parsed verdict map for this group

If an agent's output is malformed, retry that agent once. If still failing, escalate to the user — a missing group means the report cannot be complete.

Call `verify-runner.saveCheckpoint(pipelineDir, specHash, completedGroups)` after each successful group to persist progress.

### 12. Merge All Verdicts

Call `verify-runner.mergeAllVerdicts(completedGroups, extractedItems)`. For items that appear in multiple groups:

- Verdict merge: worst-verdict-wins — GAP > PARTIAL > DEVIATED > MATCH
- Confidence merge: worst-first — CONFIRMED > LIKELY > SUSPECTED

Items that appear in only one group keep that group's verdict as-is.

Returns a merged verdict map keyed by item id.

### 13. Assemble Report

Call `verify-runner.assembleReport(extractedItems, mergedVerdicts, specHash, mode, config)`. The report structure:

- YAML frontmatter: artifact type, schema_version, produced_by, generated_at, spec_hash
- **Scorecard**: total items, verifiable items, counts and percentages per verdict (MATCH, PARTIAL, GAP, DEVIATED, SKIPPED), confidence breakdown
- **Per-section breakdown**: mirrors SPEC.md's section order; each section lists its items with verdict, confidence, evidence, and decision override reference (if DEVIATED)
- **Routing section**: gate mode shows routing decisions; on-demand mode shows routing suggestions

### 14. Write Report

Call `verify-runner.writeReport(pipelineDir, report, mode)`. Output paths:

- Gate mode: `.pipeline/VERIFICATION-REPORT.md`
- On-demand mode: `.pipeline/VERIFICATION-REPORT-ondemand.md`

### 15. Routing and State Transition (Gate Mode Only)

Skip this step entirely in on-demand mode.

Call `verify-runner.determineRouting(mergedVerdicts, mode, report)` to classify CONFIRMED gaps:

- CONFIRMED GAP → `architecture` (missing implementation — needs task specs and a build sprint)
- CONFIRMED PARTIAL or CONFIRMED DEVIATED (without a valid DEC-NNN override) → `eliciting` (spec drift — design needs revisiting)
- No CONFIRMED gaps → `complete`

Call `verify-runner.checkLoopLimit(pipelineDir, config, currentGapCount)` to check whether the pipeline has cycled through verify → elicit/architecture too many times. If the loop limit is reached, halt and escalate to the user.

Call `verify-runner.updateVerifyState(pipelineDir, target, gapItems, currentGapCount)` to write the routing target and gap summary to `state.yaml`.

Transition phase using `lib/state-machine.transition()`:
- `verifying -> complete`: auto-advance
- `verifying -> eliciting`: stop — user runs `/elicit`
- `verifying -> architecture`: stop — user runs `/architect`

### 16. Report

Show the user:

- **Mode**: gate or on-demand
- **Scorecard**: total items extracted, verifiable items, verdict counts (MATCH / PARTIAL / GAP / DEVIATED / SKIPPED)
- **Confidence breakdown**: CONFIRMED / LIKELY / SUSPECTED counts
- **CONFIRMED gaps** (if any): list each item id, verdict, and evidence summary
- **Report location**: path to VERIFICATION-REPORT.md
- **Routing outcome** (gate mode): next phase and reason; or confirmation of complete
- **Routing suggestions** (on-demand mode): what the pipeline would do if this were gate mode
