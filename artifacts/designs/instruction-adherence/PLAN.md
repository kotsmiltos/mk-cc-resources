> **type:** plan
> **output_path:** artifacts/designs/instruction-adherence/PLAN.md
> **source:** artifacts/audits/2026-03-31-instruction-adherence-audit-report.md
> **created:** 2026-03-31
> **key_decisions:** D1, D2
> **open_questions:** none

# Plan: Instruction Adherence Remediation

## Vision
Make Claude reliably follow user instructions across all skills by restructuring how instructions are written and delivered. Fix the pattern where correct instructions in the wrong position get ignored. The goal: routing works on bare invocation, rules get followed without reminding, and the user never has to fight the tool.

## Sprint Tracking

| Sprint | Tasks | Completed | QA Result | Key Changes | Boundary Rationale |
|--------|-------|-----------|-----------|-------------|-------------------|
| 1 | 5 | 5 | pending | Fix quick_starts, convert routing tables, shorten hook | Scope boundary: all structural changes to instruction delivery |

## Task Index

| Task | Sprint | File | Depends On | Blocked By |
|------|--------|------|-----------|------------|
| Fix miltiaze quick_start | 1 | sprints/sprint-1/task-0-miltiaze-quickstart.md | None | — |
| Fix architect quick_start | 1 | sprints/sprint-1/task-1-architect-quickstart.md | None | — |
| Convert routing tables to checklists | 1 | sprints/sprint-1/task-2-routing-checklists.md | Tasks 0, 1 | — |
| Add verification examples to rules | 1 | sprints/sprint-1/task-3-rule-examples.md | None | — |
| Shorten hook injection | 1 | sprints/sprint-1/task-4-hook-slim.md | None | — |

## Decisions Log

| # | Decision | Choice | Rationale | Alternatives Considered | Date |
|---|----------|--------|-----------|------------------------|------|
| D1 | Whether to split multi-mode skills | No — fix routing instead | Splitting creates maintenance burden (more plugins, more versions, more cross-references). The quick_start gate pattern is proven with ladder-build. Apply it to miltiaze and architect first. Revisit if routing still fails after the fix. | Split into separate skills (e.g., /ladder-build-execute) | 2026-03-31 |
| D2 | Whether to create ROUTING.yaml as single source of truth | No — too much indirection | Adding another file for Claude to read increases instruction surface area. The hook already injects routing. The fix is to make the hook injection shorter and the skill quick_starts more reliable, not to add another layer. | Create .claude/mk-flow/ROUTING.yaml consumed by hook and skills | 2026-03-31 |

## Adversarial Assessment

| # | Failure Mode | Affected Sprint(s) | Mitigation | Assumption at Risk |
|---|-------------|--------------------|-----------|--------------------|
| 1 | Imperative quick_start gates still get skipped by Claude when context is long | Sprint 1 | Test each fix by invoking the skill bare and checking routing. If still failing, the quick_start text needs to be even shorter/stronger | Assumption: position + imperative framing is sufficient for adherence |
| 2 | Shortening hook injection removes rules Claude occasionally follows | Sprint 1 | Keep the 5 highest-impact rules in injection, move others to on-demand reading. Track which rules were removed and whether behavior degrades | Assumption: shorter injection = higher adherence per rule |
| 3 | Converting routing tables to checklists changes the semantics Claude interprets | Sprint 1 | Both formats say the same thing — the checklist just uses imperative language. Test by invoking with various inputs | Assumption: checklists are strictly better than tables for Claude |

## Fitness Functions

- [ ] FF-1: Every multi-mode skill's quick_start checks for existing context BEFORE defaulting to "ask user"
- [ ] FF-2: No skill has conditional routing logic in a `<routing>` table that isn't ALSO in quick_start as an imperative gate
- [ ] FF-3: Hook injection is under 40 lines of directive text (excluding context file contents)
- [ ] FF-4: Every behavioral rule in defaults/rules.yaml has a `check_for` or concrete example section
- [ ] FF-5: Bare `/skill-name` invocation routes correctly when task specs or pipeline state exist (tested manually)

## Change Log

| Date | What Changed | Why | Impact on Remaining Work |
|------|-------------|-----|-------------------------|
| 2026-03-31 | Plan created | Instruction adherence audit found 2 routing gaps + systemic patterns | — |
| 2026-03-31 | Sprint 1 complete (all 5 tasks) | Quick starts gated, routing tables converted to checklists, rule check_for added, hook directives cut from 80+ to 25 lines | QA review pending |
