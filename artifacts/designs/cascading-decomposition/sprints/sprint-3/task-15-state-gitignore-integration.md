> **type:** task-spec
> **output_path:** artifacts/designs/cascading-decomposition/sprints/sprint-3/task-15-state-gitignore-integration.md
> **sprint:** 3
> **status:** planned
> **depends_on:** T7
> **estimated_size:** S
> **plan:** ../../PLAN.md
> **key_decisions:** D2, D8
> **open_questions:** none
> **parent_task:** None
> **children:** None
> **decomposition_level:** 0
> **traces_to:** None

# Task 15: STATE.md + .gitignore Integration

## Goal
Add `artifacts/scope/` to .gitignore (per D2 — scope files contain architectural details and function signatures that could be sensitive) and verify all scope-related pipeline stage routing is consistent across mk-flow, architect, and ladder-build. This task ensures the scope pipeline is properly integrated with the project's git hygiene and state management infrastructure.

## Context
- D2 (scope directory privacy): gitignore `artifacts/scope/` by default
- D8 (INDEX.md vs STATE.md): INDEX.md is authoritative for scope decomposition state. STATE.md Pipeline Position gets `scope_root` field for routing. Stage values: `scope-L0`, `scope-L1`, etc.
- STATE.md template already has scope_root field and scope-L0/LN stages (added in Sprint 2 QA fix H1)
- Canonical pipeline stages in `plugins/mk-flow/skills/state/templates/state.md` already include scope stages
- The scope-decompose workflow already updates STATE.md Pipeline Position at the end of each level
- What's NOT yet done: .gitignore entry, and verification that mk-flow hook routing handles scope stages correctly

## Interface Specification

### Inputs
- Current `.gitignore` file
- `plugins/mk-flow/hooks/intent-inject.sh` — hook routing instructions
- `plugins/mk-flow/skills/state/templates/state.md` — canonical stage list

### Outputs
- Updated `.gitignore` with `artifacts/scope/` entry
- Verified mk-flow hook routing handles scope stages (update if needed)

### Contracts with Other Tasks
- T7 (scope-decompose) uses scope stages → this task ensures the infrastructure supports them
- T12 (miltiaze scope output) creates `artifacts/scope/` → .gitignore must be ready before first scope output is committed

## Pseudocode

```
1. ADD artifacts/scope/ to .gitignore:
   Open .gitignore
   ADD at the top (after the first comment block, before "# Claude Code local settings"):
   
   # Scope decomposition artifacts (architectural details, function signatures)
   artifacts/scope/
   
   Rationale comment references D2.

2. VERIFY STATE.md template scope coverage:
   Read plugins/mk-flow/skills/state/templates/state.md
   CHECK that Canonical Pipeline Stages includes:
   - scope-L0
   - scope-L0-complete
   - scope-LN
   - scope-LN-complete
   CHECK that Pipeline Position fields include:
   - Scope root: [path]
   
   IF any missing: ADD them. (Expected: already present from Sprint 2 H1 fix.)

3. VERIFY mk-flow hook routing:
   Read plugins/mk-flow/hooks/intent-inject.sh
   CHECK that routing instructions handle scope stages:
   - On scope-L0 or scope-LN stage: user should be prompted to continue decomposition or start implementation
   - On scope-L0-complete or scope-LN-complete: user should be prompted to review or proceed to next level
   
   IF scope stage routing instructions are missing from the hook's injected guidance:
     ADD routing hints for scope stages to the status_query or action intent handling.
     These are informational hints only — the hook injects context, it doesn't execute actions.

4. VERIFY scope-decompose consumer registration:
   Read plugins/mk-flow/skills/state/templates/state.md canonical stages consumers list
   CHECK that scope-decompose.md is listed as a consumer.
   (Expected: already present from Sprint 2.)
   
   IF missing: ADD to consumers list.
```

## Files Touched

| File | Action | What Changes |
|------|--------|-------------|
| `.gitignore` | MODIFY | Add `artifacts/scope/` entry with D2 rationale comment |
| `plugins/mk-flow/hooks/intent-inject.sh` | CHECK | Verify scope stage routing hints are present; add if missing |
| `plugins/mk-flow/skills/state/templates/state.md` | CHECK | Verify scope stages and scope_root field are present; add if missing |

## Acceptance Criteria
- [ ] `.gitignore` contains `artifacts/scope/` entry
- [ ] .gitignore entry has a comment referencing scope decomposition purpose
- [ ] `git status` after creating `artifacts/scope/test.md` shows the file as untracked (gitignore working)
- [ ] STATE.md template Canonical Pipeline Stages lists all scope stages: scope-L0, scope-L0-complete, scope-LN, scope-LN-complete
- [ ] STATE.md template Pipeline Position fields include `Scope root`
- [ ] STATE.md canonical stages consumers list includes `scope-decompose.md`
- [ ] mk-flow hook routing handles scope stages without errors (no unrecognized stage warnings)

## Edge Cases
- User wants to commit scope artifacts (overrides D2) — they can use `git add -f artifacts/scope/` to bypass gitignore. The gitignore is a default, not a hard block.
- `artifacts/scope/` directory doesn't exist yet — gitignore still works (git ignores patterns for nonexistent paths)
- mk-flow hook not initialized for this project — .gitignore change still applies; hook verification is best-effort
