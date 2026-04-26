> **type:** plan
> **output_path:** artifacts/designs/essense-flow-pipeline/PLAN.md
> **source:** essence/MENTAL-MODEL.md + two miltiaze research syntheses (pipeline design + implementation architecture)
> **created:** 2026-04-10
> **key_decisions:** D1, D2, D3, D4, D5, D6, D7, D8, D9, D10, D11, D12, D13
> **open_questions:** none

# Plan: essense-flow Pipeline

## Vision
Build essense-flow — a Claude Code plugin that implements a multi-phase AI development pipeline turning ideas into production-quality code. Five phases (Research → Architecture → Build → Review → Context System) with cascading decomposition, adversarial QA, disk-based state, and multi-perspective analysis at every stage. This is mk-flow v2 — it subsumes mk-flow's context management while adding the full pipeline.

## Architecture Overview

```mermaid
graph TD
    subgraph Plugin ["essense-flow plugin"]
        subgraph Skills
            CTX[Context Skill]
            RES[Research Skill]
            ARC[Architect Skill]
            BLD[Build Skill]
        end
        subgraph Hooks
            CI[context-inject.sh]
            SO[session-orient.sh]
            YV[yaml-validate.sh]
        end
        subgraph Lib ["lib/ (pure functions)"]
            SM[State Machine]
            BA[Brief Assembly]
            DP[Dispatch Queue]
            XP[XML Parser]
            TC[Token Counter]
        end
        subgraph Commands
            CMD[/research /architect /build /review /status /next]
        end
    end

    subgraph Project [".pipeline/ (project-side)"]
        ST[state.yaml]
        CFG[config.yaml]
        REQ[requirements/]
        ARCH[architecture/]
        SPR[sprints/]
        REV[reviews/]
        DEC[decisions/]
    end

    CI -->|reads| ST
    CI -->|reads| CFG
    SO -->|reads| ST
    YV -->|validates| ST
    CMD -->|routes to| Skills
    Skills -->|uses| Lib
    Skills -->|reads/writes| Project
    RES -->|produces| REQ
    ARC -->|reads| REQ
    ARC -->|produces| ARCH
    ARC -->|produces| SPR
    BLD -->|reads| SPR
    BLD -->|produces| SPR
    ARC -->|review workflow| REV
```

## Module Map

| Module | Purpose | Key Files | Dependencies | Owner (Sprint) |
|--------|---------|-----------|--------------|----------------|
| Plugin scaffold | Plugin manifest, directory structure | `.claude-plugin/plugin.json`, `hooks/hooks.json` | None | Sprint 1 |
| Templates | All artifact templates (14 files) | `skills/*/templates/*.md`, `defaults/` | None | Sprint 1 |
| Config | Pipeline configuration schema | `defaults/config.yaml`, `references/config-schema.yaml` | None | Sprint 1 |
| lib/core | Pure functions: state machine, YAML IO, token counter, path sandbox | `lib/state-machine.js`, `lib/yaml-io.js`, `lib/tokens.js`, `lib/paths.js` | Config schema | Sprint 1 |
| Context skill | State management, drift-check, pause/resume | `skills/context/` | lib/core, templates | Sprint 2 |
| Hooks | Context injection, session orientation, YAML validation | `hooks/scripts/` | Context skill, lib/core | Sprint 2 |
| Brief assembly lib | Template loading, placeholder resolution, inlining, budget enforcement | `lib/brief-assembly.js` | lib/core, templates | Sprint 3 |
| Agent output lib | XML parsing, sentinel detection, quorum checking | `lib/agent-output.js` | lib/core | Sprint 3 |
| Synthesis lib | Alignment matrix, classification, composition | `lib/synthesis.js` | lib/core | Sprint 3 |
| Research skill | Multi-perspective research, requirements generation | `skills/research/` | Brief assembly, agent output, synthesis libs | Sprint 3 |
| Architect skill | Planning, decomposition, review, escalation | `skills/architect/` | All libs, research output | Sprint 4 |
| Dispatch lib | Dependency graph, wave construction, crash recovery | `lib/dispatch.js` | lib/core | Sprint 4 |
| Build skill | Wave-based task execution, overflow detection | `skills/build/` | Dispatch lib, brief assembly | Sprint 5 |
| Review workflow | Adversarial QA, escalation classification | `skills/architect/workflows/review.md` | Agent output, synthesis | Sprint 6 |
| Commands | All 6 slash commands | `commands/` | All skills | Sprint 6 |

## Sprint Tracking

| Sprint | Tasks | Completed | QA Result | Key Changes | Boundary Rationale |
|--------|-------|-----------|-----------|-------------|-------------------|
| 1 | 5 | 5/5 | PASS | Foundation: scaffold, templates, config, state, lib/core | Scope boundary: all schemas defined and validated, lib/core tested in isolation |
| 2 | 4 | 4/4 | PASS | Context system + hooks | Decision gate: context injection must work before any skill can manage state |
| 3 | 4 | 4/4 | PASS (8 fixes) | Research skill + agent infrastructure libs. QA: 8 autonomous fixes, 2 improvements added to S4 | Scope boundary: research produces valid requirements from test input |
| 4 | 7 | 7/7 | PASS (5 fixes) | Architecture skill + dispatch + consistency + transform + QA fixes. 195/195 tests. | Decision gate: architecture must produce valid task specs before build depends on them |
| 5 | 7 | 7/7 | PASS (5 fixes) | Build skill + wave execution + QA fixes. 251/251 tests. QA: 5 autonomous fixes (pipeline guard, bounds checks, null guard). H1 added to S6. | Scope boundary: build executes fixture tasks in correct wave order |
| 6 | 7 | 7/7 | PASS | Review runner + slash commands + self-test + E2E + packaging + QA fixes (state-machine wiring, SKILL.md schema_version). 267/267 tests. | Scope boundary: full pipeline works end-to-end on a toy project |

## Task Index

| Task | Sprint | File | Depends On |
|------|--------|------|-----------|
| Plugin scaffold | 1 | sprints/sprint-1/task-1-scaffold.md | None |
| Config schema | 1 | sprints/sprint-1/task-2-config.md | None |
| State schema + transitions | 1 | sprints/sprint-1/task-3-state-schema.md | None |
| Artifact templates | 1 | sprints/sprint-1/task-4-templates.md | None |
| lib/core utilities | 1 | sprints/sprint-1/task-5-lib-core.md | Task 3 (state schema) |
| Context skill | 2 | TBD after sprint 1 review | Sprint 1 |
| Hooks (all 3) | 2 | TBD | Context skill |
| Drift-check script | 2 | TBD | Context skill |
| Init command | 2 | TBD | Context skill, hooks |
| Brief assembly lib | 3 | TBD | lib/core, templates |
| Agent output + synthesis libs | 3 | TBD | lib/core |
| Research skill | 3 | TBD | Brief assembly, agent output, synthesis |
| Research integration test | 3 | TBD | Research skill |
| Fix alignment matrix bias (H1) | 4 | sprints/sprint-4/task-1-alignment-fix.md | lib/synthesis |
| Fix budget check on final brief (H2) | 4 | sprints/sprint-4/task-2-budget-fix.md | lib/brief-assembly |
| Dispatch lib | 4 | sprints/sprint-4/task-3-dispatch.md | lib/core |
| Consistency verifier | 4 | sprints/sprint-4/task-4-consistency.md | Agent output lib |
| .md → .agent.md transform | 4 | sprints/sprint-4/task-5-agent-md-transform.md | Templates |
| Architect skill (plan + decompose) | 4 | sprints/sprint-4/task-6-architect-skill.md | All libs, research output, dispatch |
| Architecture integration test | 4 | sprints/sprint-4/task-7-integration-test.md | Architect skill |
| Implement runQAReview (S4-H1) | 5 | sprints/sprint-5/task-1-qa-review.md | architect-runner, brief-assembly |
| Fix contentAgreement bias (S4-H2) | 5 | sprints/sprint-5/task-2-content-agreement.md | lib/synthesis |
| Empty spec validation (S4-H3) | 5 | sprints/sprint-5/task-3-spec-validation.md | lib/transform |
| Build skill (execute + resume) | 5 | sprints/sprint-5/task-4-build-skill.md | Dispatch, brief assembly |
| Wave dispatch + overflow detection | 5 | sprints/sprint-5/task-5-wave-overflow.md | Dispatch lib, build skill |
| Build integration test | 5 | sprints/sprint-5/task-6-build-integration.md | Build skill |
| Sprint completion + state transitions | 5 | sprints/sprint-5/task-7-completion.md | Build skill, state machine |
| Wire state-machine transition (S5-H1) | 6 | sprints/sprint-6/task-1-state-machine-wiring.md | build-runner, state-machine |
| SKILL.md schema_version (S5-L2) | 6 | sprints/sprint-6/task-2-skill-schema-version.md | None |
| Review workflow runner | 6 | sprints/sprint-6/task-3-review-runner.md | Agent output, synthesis, architect-runner |
| Slash commands (all 6) | 6 | sprints/sprint-6/task-4-slash-commands.md | All skills |
| Self-test script | 6 | sprints/sprint-6/task-5-self-test.md | All components |
| End-to-end integration test | 6 | sprints/sprint-6/task-6-e2e-test.md | Everything |
| Plugin packaging | 6 | sprints/sprint-6/task-7-plugin-packaging.md | Everything |

## Interface Contracts

| From | To | Contract | Format |
|------|----|----------|--------|
| Research | Architect | Requirements document | `.pipeline/requirements/REQ.md` — YAML frontmatter + FR-NNN/NFR-NNN with acceptance criteria |
| Architect | Build | Task specs | `.pipeline/sprints/sprint-NN/tasks/TASK-NNN.agent.md` — generated from .md via deterministic transform |
| Architect | Build | Architecture + contracts | `.pipeline/architecture/ARCH.agent.md` — module boundaries, typed interfaces |
| Build | Review | Completion evidence | `.pipeline/sprints/sprint-NN/completion/TASK-NNN.completion.yaml` + sprint-level .md |
| Review | Architect | QA findings | `.pipeline/reviews/sprint-NN/QA-REPORT.md` — per-criterion verdicts with evidence |
| Context | All | Pipeline state | `.pipeline/state.yaml` — single source of truth, YAML, machine-parseable |
| Context | All | Behavioral rules | `.pipeline/rules.yaml` — injected every message via hook |
| All | Decisions | Recorded decisions | `.pipeline/decisions/index.yaml` + `DEC-NNN.md` — never re-debated |
| Architect | Build | Traceability | FR-NNN → TASK-NNN mapping in ARCH.md — enables coverage verification |

## Decisions Log

| # | Decision | Choice | Rationale | Alternatives Considered | Date |
|---|----------|--------|-----------|------------------------|------|
| D1 | essense-flow vs mk-flow relationship | Subsume (mk-flow v2) | User confirmed: take the good parts of mk-flow, evolve them. Single state authority, single hook, no sync conflicts. | Coexist (too complex), Layer on top (hard dependency) | 2026-04-10 |
| D2 | Artifact directory convention | `.pipeline/` | Dot-prefix signals infrastructure. Avoids collision with user-created dirs. Namespaced. | `artifacts/`, `essence/` | 2026-04-10 |
| D3 | plugin.json location | `.claude-plugin/plugin.json` | Claude Code requires it there. Not root. Infrastructure agent verified. | Root-level (would fail to load) | 2026-04-10 |
| D4 | .agent.md authoring | Generate from .md via deterministic transform | Single source of truth. Eliminates sync problem entirely. 3 agents flagged drift risk. | Hand-author both (drift), Detect divergence (reactive not preventive) | 2026-04-10 |
| D5 | Hook implementation | Bash thin dispatcher + Node logic layer | Portability (bash universal) + testability (Node unit-testable). Security + Infra agents converged. | Pure bash (hard to test), Pure Node (portability concern) | 2026-04-10 |
| D6 | YAML validation scope | All pipeline files (.pipeline/ AND context/) | Security + Interface both flagged .pipeline/ writes are unvalidated. | context/ only (leaves gap) | 2026-04-10 |
| D7 | Fitness function check_commands | Static allowlist only, never interpolated | Highest severity security threat (shell injection). Security agent flagged. | Dynamic commands from specs (injection risk) | 2026-04-10 |
| D8 | Brief content isolation | Wrap inlined content in `<data-block>` delimiters | Reduces prompt injection risk. Security agent flagged first-class injection vector. | No wrapping (vulnerable), Sanitize content (lossy) | 2026-04-10 |
| D9 | Orchestration logic architecture | Testable lib/ layer of pure functions | Testing agent's #1 recommendation. State machine, brief assembly, dispatch, parsing all testable without LLM. | Embedded in skills (untestable), External service (overkill) | 2026-04-10 |
| D10 | Requirement traceability | FR-NNN → TASK-NNN mapping in ARCH.md | Interface agent flagged: review can't verify coverage without it. | No tracing (can't verify), Implicit (unreliable) | 2026-04-10 |
| D11 | State authority | Single `.pipeline/state.yaml` | Follows D1 (subsume mk-flow). One state file, one truth. Context hook reads it. | Multiple state files (sync nightmare) | 2026-04-10 |
| D12 | Command naming | No prefix: /research, /architect, /build, /review, /status, /next | User confirmed. Clean, short. This IS the primary workflow. | /ef: prefix, /flow: prefix | 2026-04-10 |
| D13 | Schema versioning | Version field in all artifact frontmatter from day one | Interface agent flagged: without versioning, schema evolution breaks old artifacts silently. | No versioning (migration impossible later) | 2026-04-10 |

## Refactor Requests

| From Sprint | What | Why | Scheduled In | Status |
|-------------|------|-----|-------------|--------|
| 3 | H3: Wire truncateSection into assembleBrief | Spec says truncate-and-flag, implementation rejects outright | TBD | deferred |
| 3 | H4: Escape closing delimiters in wrapDataBlock | XML injection via `</data-block>` in content breaks D8 isolation | TBD | deferred |
| 3 | H5: Implement scope overflow detection | SCOPE_OVERFLOW defined but never detected — needs dispatch context | TBD | deferred |
| 3 | H6: Backup REQ.md before overwrite | writeRequirements uses raw writeFileSync unlike yaml-io.safeWrite | TBD | deferred |

## Risk Register

| Risk | Likelihood | Impact | Mitigation | Status |
|------|-----------|--------|-----------|--------|
| context-inject hook becomes monolith as pipeline grows | High | High | Modular design from start (bash dispatcher + Node logic). Composable injection fragments. Token budget with truncation strategy. | Active |
| Agent output XML parsing is fragile (LLMs produce malformed XML) | High | Medium | Lenient parser with recovery. Sentinel detection from end. Retry once with size constraint on truncation. | Active |
| Dual token budgets (hook injection 3-5K + brief assembly 12K) squeeze effective context | Medium | High | Monitor total injection. Summarize completed sprints as one-liners. Prune rules/vocab when they exceed budget. | Active |
| Consistency verifier fails to catch interface mismatches (LLM-based) | Medium | High | Structural comparison supplement: extract interface signatures, compare mechanically. LLM handles semantic issues only. | Active |
| Vocabulary cold-start degrades first synthesis runs | Medium | Low | Bootstrap vocabulary from research phase output automatically. | Active |
| Config spread across multiple files confuses users | Low | Medium | Single config.yaml with all pipeline settings. Reference doc mapping config keys to their purpose. | Active |

## Change Log

| Date | What Changed | Why | Impact on Remaining Work |
|------|-------------|-----|-------------------------|
| 2026-04-10 | Initial plan created | Sprint 0 complete | None — starting fresh |
| 2026-04-10 | Sprint 3 complete, QA reviewed | 99/99 tests pass, 8 autonomous fixes applied | Sprint 4 expanded from 5 to 7 tasks (added H1, H2 QA fixes) |
| 2026-04-10 | Sprint 4 task specs created | QA review of sprint 3 complete | H1 (alignment fix) and H2 (budget fix) scheduled as first tasks; H3-H6 deferred to Refactor Requests |
| 2026-04-10 | Sprint 4 complete, QA reviewed | 195/195 tests, 5 autonomous fixes | Sprint 5 expanded from 4 to 7 tasks (added runQAReview, contentAgreement fix, spec validation) |
| 2026-04-10 | Sprint 5 complete, QA reviewed | 251/251 tests, 5 autonomous fixes (pipeline guard, bounds checks, null guard). H1 (state-machine transition) added to S6. | Sprint 6 expanded from 5 to 6 tasks |
| 2026-04-10 | Sprint 6 complete | 267/267 tests. 7 tasks: state-machine wiring, schema_version, review runner (categorize+report+write), 6 slash commands, self-test (37 checks), E2E test (5 phases), plugin packaging (18 validations). | All sprints complete — pipeline ready for QA |
| 2026-04-10 | Sprint 7 complete | 308/308 tests (+41). 5 tasks: brief truncation (H3), vocabulary normalization (M6), retry+escalation chain, LLM verifier brief, cross-batch consistency gates. Implements deferred research recommendations. | Research-spec parity achieved |

## Adversarial Assessment

| # | Failure Mode | Affected Sprint(s) | Mitigation | Assumption at Risk |
|---|-------------|--------------------|-----------|--------------------|
| 1 | context-inject.sh hook is too slow (reads 5+ files, formats output, counts tokens) and causes noticeable input lag on every message | Sprint 2 | Profile hook execution time. Cache formatted output, only re-read changed files (check mtimes). Target <200ms. | Assumption: reading and formatting 5+ YAML files in bash+Node is fast enough for every-message execution |
| 2 | Brief assembly token counting is inaccurate (wrong tokenizer, off by 15%+), causing briefs that exceed the effective attention zone | Sprint 3 | Use Anthropic's actual tokenizer or a well-calibrated approximation (chars/4 is too crude). Build in 10% safety margin. Test against real model behavior. | Assumption: we can accurately count tokens before dispatching to the model |
| 3 | The .md → .agent.md transform loses semantic information that the builder needs (pseudocode nuance, edge case context) | Sprint 4 | Design the transform conservatively — strip rationale and alternatives, but preserve ALL implementation-relevant content. Test by having an agent build from .agent.md and comparing output quality to building from .md directly. | Assumption: a deterministic transform can reliably separate "rationale" from "implementation context" |
| 4 | Adversarial QA agents produce high false-positive rates, wasting user time with spurious findings and eroding trust in the review phase | Sprint 6 | Calibrate QA prompts against real project output before first real review. Require evidence (line references) for every finding. Tune mandatory-minimum-findings threshold based on component size, not a fixed number. | Assumption: LLM-based adversarial QA can reliably distinguish real issues from noise |

## Fitness Functions

- [ ] Every file in `templates/` and `defaults/` has valid YAML frontmatter that parses without error
- [ ] Every template contains a `schema_version` field in its frontmatter
- [ ] No skill directly reads or writes another skill's internal files (grep for cross-skill paths)
- [ ] The state machine transition table has no unreachable states and no dead-ends other than `complete`
- [ ] Every slash command maps to exactly one skill
- [ ] All assembled briefs are under `BRIEF_TOKEN_CEILING` (from config.yaml)
- [ ] No single brief section exceeds `TOKEN_BUDGET_PER_SECTION` (from config.yaml)
- [ ] Context injection payload is under the configured ceiling for all pipeline positions
- [ ] Every decision in `decisions/index.yaml` has a corresponding `DEC-NNN.md` file
- [ ] Every task spec that references a decision ID points to an existing, non-superseded decision
- [ ] The dependency graph across all task specs in any sprint is a valid DAG (no cycles)
- [ ] Every `.agent.md` file has a corresponding source `.md` file
- [ ] All hook scripts complete within the configured timeout
- [ ] Fitness function check_commands contain no variable interpolation (static allowlist enforcement)
