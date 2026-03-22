# architect Release Notes

## v0.2.0 (2026-03-22)

### Review Workflow QA Improvements

- Review workflow now asks user before adding QA improvement items to the next sprint scope
- Pipeline continuity — explicit STATE.md updates and exact handoff commands after each workflow step
- Cross-session continuity: architect records pipeline position so the next session resumes without re-asking

### Improvements

- Review workflow scope-integrity check prevents silent scope expansion
- Handoff commands reference exact artifact paths for seamless ladder-build resume

## v0.1.0 (2026-03-22)

### Initial Release

- Multi-agent technical leadership — spawns parallel perspective agents (infrastructure, interface, testing, security/quality) for architecture design
- Plan workflow — reads miltiaze requirements or audit output, synthesizes agent perspectives into PLAN.md with sprint task specs, user confirmation gate
- Review workflow — post-sprint QA with 4 adversarial verification agents (spec compliance, requirements alignment, fitness functions, edge cases), produces QA-REPORT.md, plans next sprint
- Ask workflow — escalation path for unclear decisions: frames options with recommendation, records outcome in Decisions Log
- Audit workflow — existing codebase entry point with 6 perspective agents (implementation quality, risk/vulnerability, architecture coherence, future-proofing, practice compliance, goal alignment)
- Templates: plan.md, task-spec.md, audit-report.md
- References: architecture-patterns.md, sprint-management.md, team-culture.md (agent operating principles)
- Integrated into mk-flow pipeline routing: miltiaze → architect → ladder-build → architect (review) loop
