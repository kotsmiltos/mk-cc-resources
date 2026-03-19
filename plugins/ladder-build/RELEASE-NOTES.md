# ladder-build Release Notes

## v1.1.0 (2026-03-15)

### Architecture-Aware Build System

- Impact analysis reference — traces cross-file dependencies before and after each milestone
- Context protection — detects context fatigue warning signs and hands off cleanly
- Reassembly verification — checks every file in the manifest after all milestones complete
- File manifests in BUILD-PLAN.md — every file tracked with checkboxes across milestones
- Declarative config project decomposition pattern — milestones organized by feature, not file type

### Improvements

- Miltiaze exploration Build Plans table feeds directly into kickoff as milestones
- Context-aware milestone sizing guidelines

## v1.0.0 (2026-03-08)

### Initial Release

- Incremental build pipeline with small, verifiable milestones
- Build, test, verify contract — each milestone confirmed before the next begins
- Kickoff, build-milestone, and continue workflows
- BUILD-PLAN.md as living document with decisions log and discovered work tracking
- Milestone reports saved per-milestone
- Pure XML structure migration
