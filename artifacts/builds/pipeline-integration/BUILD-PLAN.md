# Build Plan: Pipeline Integration

> **End Goal:** Connect the architect plugin to miltiaze, ladder-build, and mk-flow so the full automated dev team pipeline works: miltiaze produces requirements → architect plans sprints → ladder-build executes task specs → mk-flow tracks pipeline position and routes intents. Each existing skill gains a new mode while keeping standalone behavior intact.

> **Source:** artifacts/explorations/2026-03-22-architecture-design-step-exploration.md (Build Plans items 3-7)

---

## Status

- **Current milestone:** Complete
- **Completed:** 4 of 4 milestones
- **Last updated:** 2026-03-22

---

## Milestones

### Milestone 1: miltiaze requirements mode (M) *(current)*
**Goal:** Add a requirements workflow to miltiaze that produces REQUIREMENTS.md with perspective-assigned research agents, acceptance criteria, and explicit disagreement surfacing. Existing exploration mode stays untouched.
**Done when:**
- New `plugins/miltiaze/skills/miltiaze/templates/requirements-report.md` exists with requirements-focused structure (acceptance criteria, implementation implications, disagreements section)
- New `plugins/miltiaze/skills/miltiaze/workflows/requirements.md` exists with perspective agent prompts and requirements synthesis
- `plugins/miltiaze/skills/miltiaze/SKILL.md` routing table updated to detect build intent → requirements workflow
- Requirements workflow produces output at `artifacts/explorations/YYYY-MM-DD-[slug]-requirements.md`
- Handoff suggests `/architect` to plan from the requirements
**Status:** completed | 2026-03-22 — requirements-report.md template, requirements.md workflow with perspective agents, SKILL.md routing updated with build-intent detection

### Milestone 2: ladder-build executor mode (M)
**Goal:** Add an executor workflow to ladder-build that reads architect's task specs from `artifacts/designs/[slug]/sprints/sprint-N/`, parallelizes independent tasks via subagents, and reports completion per-task back to the architect. Existing kickoff/build-milestone/continue workflows stay untouched.
**Done when:**
- New `plugins/ladder-build/skills/ladder-build/workflows/execute.md` exists with task spec reading, parallel execution, and per-task reporting
- `plugins/ladder-build/skills/ladder-build/SKILL.md` routing table updated to detect architect task specs → execute workflow
- Executor reads task specs, respects dependency ordering, parallelizes independent tasks
- Reports completion with reference to architect's review workflow
**Depends on:** None (parallel with M1)
**Status:** completed | 2026-03-22 — execute.md workflow with wave-based parallelization, agent subagent prompts, deviation rules, COMPLETION.md output, SKILL.md routing updated

### Milestone 3: mk-flow pipeline awareness (S)
**Goal:** Add pipeline position tracking to STATE.md and pipeline-aware routing to mk-flow's hook so it suggests the right next skill based on where the project is in the pipeline.
**Done when:**
- `plugins/mk-flow/hooks/intent-inject.sh` includes pipeline-aware routing instructions
- `plugins/mk-flow/skills/state/templates/state.md` includes Pipeline Position section
- Hook routing: post-exploration with no PLAN.md → suggest /architect; post-audit → suggest /architect; mid-sprint action → route to current tasks; post-sprint → suggest architect review; "assess codebase" → suggest architect audit
**Depends on:** M1, M2 (needs to know the pipeline stages those create)
**Status:** completed | 2026-03-22 — intent-inject.sh updated with 5 pipeline-aware routing rules, state.md template has Pipeline Position section with stage/requirements/audit/plan/sprint fields

### Milestone 4: Integration + sync (S)
**Goal:** Version bumps, skill alias syncs, CLAUDE.md documentation, cross-reference rules for the new pipeline coupling.
**Done when:**
- `plugins/miltiaze/.claude-plugin/plugin.json` version bumped
- `plugins/ladder-build/.claude-plugin/plugin.json` version bumped
- `plugins/mk-flow/.claude-plugin/plugin.json` version bumped
- `skills/miltiaze/` synced with `plugins/miltiaze/skills/miltiaze/`
- `skills/ladder-build/` synced with `plugins/ladder-build/skills/ladder-build/`
- `CLAUDE.md` updated with pipeline documentation
- `context/cross-references.yaml` updated with pipeline coupling rules
- `.claude-plugin/marketplace.json` versions updated
**Depends on:** M1, M2, M3
**Status:** completed | 2026-03-22 — miltiaze 1.2.0, ladder-build 1.2.0, mk-flow 0.6.0. Aliases synced (verified identical). CLAUDE.md pipeline section added. 3 new cross-reference rules. Marketplace versions consistent.

---

## Architecture Impact Summary

### Concerns touched:
- **miltiaze plugin** — new workflow + template, SKILL.md routing update
- **ladder-build plugin** — new workflow, SKILL.md routing update
- **mk-flow plugin** — hook instructions update, state template update
- **Skill aliases** — miltiaze and ladder-build copies must be resynced
- **Documentation** — CLAUDE.md pipeline section, cross-references

### Full file manifest:
- [x] `plugins/miltiaze/skills/miltiaze/templates/requirements-report.md` — NEW requirements output template (M1)
- [x] `plugins/miltiaze/skills/miltiaze/workflows/requirements.md` — NEW requirements workflow (M1)
- [x] `plugins/miltiaze/skills/miltiaze/SKILL.md` — routing update for requirements workflow (M1)
- [x] `plugins/ladder-build/skills/ladder-build/workflows/execute.md` — NEW executor workflow (M2)
- [x] `plugins/ladder-build/skills/ladder-build/SKILL.md` — routing update for execute workflow (M2)
- [x] `plugins/mk-flow/hooks/intent-inject.sh` — pipeline-aware routing instructions (M3)
- [x] `plugins/mk-flow/skills/state/templates/state.md` — Pipeline Position section (M3)
- [x] `plugins/miltiaze/.claude-plugin/plugin.json` — version bump (M4)
- [x] `plugins/ladder-build/.claude-plugin/plugin.json` — version bump (M4)
- [x] `plugins/mk-flow/.claude-plugin/plugin.json` — version bump (M4)
- [x] `skills/miltiaze/` — resync alias copy (M4)
- [x] `skills/ladder-build/` — resync alias copy (M4)
- [x] `CLAUDE.md` — pipeline documentation (M4)
- [x] `context/cross-references.yaml` — pipeline coupling rules (M4)
- [x] `.claude-plugin/marketplace.json` — version updates (M4)

---

## Discovered Work

---

## Refinement Queue

---

## Decisions Log

| Date | Decision | Reasoning |
|------|----------|-----------|
| 2026-03-22 | New workflows instead of modifying existing | Existing miltiaze exploration and ladder-build kickoff/build work standalone. Adding new workflows preserves backward compatibility. Users who don't use the architect still get the same experience. |
| 2026-03-22 | QA automation already done | The architect's review.md workflow already includes 4 parallel QA agents, QA-REPORT.md, autonomous corrective action, and escalation. No separate QA build needed. |
| 2026-03-22 | Pipeline routing in hook instructions, not hook code | mk-flow's hook outputs text instructions for Claude, not programmatic logic. Pipeline awareness is added as additional routing instructions, not bash code changes. |

---

## Context Notes

- 2026-03-22: The architect plugin (plugins/architect/) was built earlier this session. It's complete with plan, review, ask, and audit workflows. This build connects the other skills to it.
- 2026-03-22: QA automation from the exploration's build plans is already embedded in the architect's review.md workflow — it's not a separate milestone here.
- 2026-03-22: miltiaze's existing exploration mode (full-exploration.md, drill-deeper.md) stays untouched. Requirements mode is additive.
- 2026-03-22: ladder-build's existing workflows (kickoff.md, build-milestone.md, continue.md) stay untouched. Executor mode is additive.
