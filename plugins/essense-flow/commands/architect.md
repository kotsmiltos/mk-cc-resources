---
name: architect
description: Plan architecture from requirements or resume mid-flight architect work — auto-detected from state and SPEC.md complexity.
---

# /architect

Plan architecture from requirements, resume mid-flight planning, or continue wave-based decomposition. Flow auto-detected from pipeline state and SPEC.md complexity assessment.

## What it does

**Phase routing (state.yaml `pipeline.phase`):**
- `requirements-ready` → enter planning phase, then dispatch lightweight or heavyweight (see complexity routing below).
- `architecture` → resume planning from disk (artifacts may already exist on partial prior run).
- `decomposing` → resume wave-based decomposition (`skills/architect/workflows/decompose.md`).
- `sprint-complete` → **deprecated** here. Post-sprint QA is owned by `/review`. Run `/review` instead; this branch is retained only for legacy clients and forwards to `/review`'s workflow.
- Other phases → report current phase, suggest correct command.

**Complexity routing (SPEC.md `complexity.assessment`):**

The dispatcher reads `SPEC.md` frontmatter `complexity` block and calls `architect-runner.recommendDecompositionDepth(complexity)` to compute a depth label.

| Trigger | Flow | Path |
|---------|------|------|
| `complexity.assessment === "bug-fix"` (depth = `flat`) | **Lightweight** | inline below |
| `complexity.classification === "mechanical"` (regardless of depth) | **Lightweight** (mechanical override) | inline below |
| Any other complexity OR missing complexity block | **Heavyweight** | follows `skills/architect/workflows/plan.md` |

The mechanical override exists because re-plans of pre-specced tasks, fix sprints, and cited-bug patches have nothing for wave-based decomposition to discover — running it produces no design signal and pays an LLM-decomposition cost the work doesn't need. Mark mechanical work explicitly in `SPEC.md` frontmatter via `complexity.classification: mechanical`.

## Instructions

### 1. Read state and decide route

```
state = read .pipeline/state.yaml
phase = state.pipeline.phase
```

If `phase` is `decomposing` → follow `skills/architect/workflows/decompose.md` (resume wave loop). Stop here — that workflow owns the rest.

If `phase` is `requirements-ready` or `architecture` → continue to step 2 (dispatch).

If `phase` is `sprint-complete` → run `/review` instead. This command no longer owns post-sprint QA.

If `phase` is anything else → report current phase, suggest correct next command, exit.

### 2. Determine flow (lightweight vs heavyweight)

```
spec = architect-runner.loadSpec(pipelineDir)            // { content, complexity } | null
complexity = spec?.complexity ?? null
decision = architect-runner.chooseArchitectFlow(complexity)
//          → { flow, depth, classification, reason }
```

Log the routing decision verbatim — `decision.reason` cites why the flow was chosen so the user can override via SPEC.md edit if the heuristic chose wrong.

If `decision.flow === "lightweight"` → run step 3a.
If `decision.flow === "heavyweight"` → run step 3b.

### 3a. Lightweight flow (skip decomposing phase)

Used for `flat` depth or `mechanical` classification — DAG-based wave construction, no LLM-driven design discussion.

- Read `.pipeline/requirements/REQ.md`
- Read `.pipeline/elicitation/SPEC.md` if exists (primary design source — DEC-010)
- If `phase === "requirements-ready"`: transition `requirements-ready → architecture` via `lib/state-machine.transition()` before any artifacts are produced.
- Call `architect-runner.planArchitecture(requirements, pluginRoot, config, specContent, complexity)` — 4 perspective briefs
- Dispatch perspective agents
- Call `architect-runner.synthesizeArchitecture(parsedOutputs, requirements, config)` — produces ARCH.md content (in memory)
- Call `architect-runner.decomposeIntoSprints(tasks)` — DAG wave ordering
- Call `architect-runner.createTaskSpecs(tasks, archContext, config)` — produces `.md` + `.agent.md` spec pairs
- **MANDATORY single call:** `architect-runner.finalizeArchitecture(pipelineDir, archDoc, synthDoc, "sprinting", { sprintNumber, specs })`. Atomically writes ARCH.md + synthesis.md + every TASK-NNN.md/.agent.md pair AND transitions `architecture → sprinting`. Do NOT split into separate `writeArchitectureArtifacts` + `writeTaskSpecs` + `transition` steps — phase=architecture must not persist after artifacts have been produced, otherwise autopilot stalls. Same B2 failure family closed for /review.
- Report: lightweight flow chosen (cite `depth` + `classification`), architecture complete, next: `/build`.

### 3b. Heavyweight flow (wave-based decomposition)

Used for non-flat, non-mechanical work. Follows `skills/architect/workflows/plan.md` end-to-end. Summary:

1. Validate state (accept `requirements-ready` or `architecture` resume).
2. If `phase === "requirements-ready"`: transition to `architecture`. Otherwise skip (already there).
3. Read REQ.md (always) and SPEC.md (if exists).
4. Classify design-bearing vs mechanical-but-not-bypassed (i.e. mechanical work whose `complexity.classification` was NOT set — still gets full plan but skips swarm).
5. Assemble perspective briefs via `planArchitecture` (swarm path only).
6. Dispatch perspective agents (swarm path only).
7. Parse and verify outputs (swarm path only).
8. Synthesize architecture (swarm path: `synthesizeArchitecture`; mechanical-not-bypassed path: inline).
9. **MANDATORY single call:** `architect-runner.finalizeArchitecture(pipelineDir, archDoc, synthDoc, "decomposing")`. Atomically persists prelim ARCH.md + synthesis.md AND transitions `architecture → decomposing`.
10. Initialize DECOMPOSITION-STATE via `architect-runner.initDecompositionState()`.
11. Continue per `skills/architect/workflows/plan.md` step 10 onward (wave loop, AskUserQuestion for design questions, convergence check, finalizeDecompose).

Report: heavyweight flow chosen (cite `depth` + `classification`), wave-based decomposition started.

## Constraints

- Do NOT run planning if `.pipeline/requirements/REQ.md` does not exist.
- Do NOT skip multi-perspective analysis when in heavyweight design-bearing path — always spawn at least 3 agents.
- Do NOT resolve decisions silently — log in decisions index.
- All briefs under `BRIEF_TOKEN_CEILING`.
- The lightweight/heavyweight choice MUST cite the values that drove it (`depth`, `classification`) so the user can override via SPEC.md edit if the heuristic chose wrong.

## SPEC.md complexity block (used by dispatcher)

The dispatcher relies on `SPEC.md` YAML frontmatter:

```yaml
---
complexity:
  assessment: "bug-fix" | "new-feature" | "partial-rewrite" | "new-project"
  classification: "mechanical" | "design-bearing"   # optional override
  touch_surface: "narrow" | "broad"                  # optional, escalates depth
  unknown_count: 0                                   # optional, flags research need
---
```

If `complexity` is missing entirely, the dispatcher defaults to **heavyweight** flow.

### Per-cycle override pattern (mechanical fix sprints)

A project's SPEC.md captures its **inherent** complexity (e.g. `partial-rewrite` for an evolving system). Individual sprints may diverge from that baseline — most often, a **fix sprint** that addresses review-derived findings has nothing for wave-based decomposition to discover. To force lightweight for one cycle without changing the project's baseline:

1. Edit SPEC.md frontmatter `complexity` block. Add `classification: "mechanical"` (alongside existing `assessment`).
2. Run `/architect`. Dispatcher logs `mechanical override — wave-based decomposition skipped` and follows lightweight path.
3. After the fix sprint completes, remove the `classification: "mechanical"` line from SPEC.md so subsequent design-bearing sprints route correctly.

This is intentionally explicit. The `mechanical` classification asserts "this work has no design discussion to surface" — wrong for design-bearing work, right for cited-bug patches and re-plans of pre-specced tasks.

### Verifying the dispatcher's choice

Before the actual /architect run, you can preview the routing decision:

```bash
node -e "
const {chooseArchitectFlow} = require('./skills/architect/scripts/architect-runner');
const yaml = require('js-yaml');
const fs = require('fs');
const m = fs.readFileSync('.pipeline/elicitation/SPEC.md', 'utf8').match(/^---\n([\s\S]*?)\n---/);
console.log(chooseArchitectFlow(yaml.load(m[1]).complexity));
"
```

Returns `{ flow, depth, classification, reason }` so you can confirm the heuristic chose the path you wanted before committing tokens to a heavyweight run.
