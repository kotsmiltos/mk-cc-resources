<template>

Use this structure for INDEX.md — the master routing table for cascading decomposition scope. A fresh session reads this file FIRST and immediately knows: what the project is, what's been decided, what's been decomposed, and what needs to happen next. Only the orchestrator writes to INDEX.md — parallel agents never modify it.

Save to: `artifacts/scope/INDEX.md` (greenfield) or `artifacts/scope/features/<slug>/INDEX.md` (feature)

```markdown
> **type:** scope-index
> **scope_root:** artifacts/scope/
> **project:** [Project name]
> **created:** [YYYY-MM-DD]
> **last_updated:** [YYYY-MM-DD]
> **phase:** brief-complete
> **key_decisions:** [decision IDs from architecture phase, e.g., D1, D3, or "none yet"]
> **open_questions:** [unresolved items requiring user input, or "none"]

# Scope Index: [Project Name]

<!-- INDEX.md is the ONLY file a fresh session needs to read to orient itself.
     It is authoritative for scope state. STATE.md tracks pipeline position.
     Only the orchestrator writes here — parallel agents never modify this file. -->

## Status Summary

<!-- One paragraph: current phase, what level decomposition has reached,
     what's ready for implementation, and what's pending.
     This is the first thing any agent reads — make it count.
     For feature flow after discovery: starting phase may be `discovery-complete`
     instead of `brief-complete`. -->

Phase: **brief-complete**. The project brief has been written but no architecture
or decomposition work has started. Next step: architecture phase to produce
the system map, contracts, and module boundaries.

## Module Status

<!-- Master tracking table for every module in the system.
     Updated after each decomposition level completes.
     Tier determines build order: Tier 1 (core/foundation) before Tier 2 (feature) before Tier 3 (integration).
     Status progression: pending → in-progress → L0-done → L1-done → ... → LN-done → ready → implementing → complete -->

| Module | Tier | Decomposition Level | Components | Leaf Tasks | Status |
|--------|------|---------------------|------------|------------|--------|
| [module-name] | 1 | L0 | 0 | 0 | pending |

<!-- Status values:
     - pending:        not yet started
     - in-progress:    currently being decomposed at its current level
     - L0-done:        top-level decomposition complete (submodules identified)
     - L1-done:        first refinement complete (components within submodules)
     - LN-done:        Nth refinement complete (replace N with actual level)
     - leaf-ready:     individual component/task confirmed as leaf (<=size target), awaiting module readiness
     - ready:          all leaf tasks in module are within size target, ready to build
     - implementing:   leaf tasks are being built by execution agents
     - overflow:       implementation exceeded overflow threshold, needs further decomposition
     - complete:       all leaf tasks built and verified

     Tier values:
     - 1: core / foundation — must be built first, other modules depend on it
     - 2: feature — primary functionality, can be built after Tier 1
     - 3: integration — glue, cross-cutting concerns, built last -->

## File Inventory

<!-- Catalog of all scope artifacts. Agents use this to find files without scanning the filesystem.
     Updated as new artifacts are created. Counts help detect drift. -->

- **Brief:** `brief/project-brief.md`
- **Architecture:** `architecture/system-map.md`
- **Contracts:** 0 files in `architecture/contracts/`
- **Patterns:** 0 files in `architecture/patterns/`
- **Decisions:** 0 files in `architecture/decisions/`
- **Modules:** _(none yet — populated after L0 decomposition)_

<!-- Module entries follow this format once they exist:
     - **[module-name]:** `modules/[module-name]/` — [component count] components, [leaf count] leaf tasks -->

## Decomposition Config

<!-- Tuning parameters for the cascading decomposition engine.
     Defaults work for most projects. Adjust if modules are unusually large or small.
     These values are READ by decomposition agents — only the orchestrator changes them. -->

| Parameter | Value | Description |
|-----------|-------|-------------|
| Max depth | 5 | Maximum decomposition levels before forced leaf assignment |
| Leaf size target | 250 lines | Target implementation size per leaf task |
| Overflow threshold | 300 lines | Leaf tasks above this trigger a warning or further split |
| Parallel batch size | 5 | Number of modules decomposed concurrently per level |
| Next decision ID | 1 | Next available global decision ID (raw integer; pad to 3 digits for file paths, e.g., 1 → D001) |

## Level History

<!-- Audit trail: one row per completed decomposition pass.
     Proves what happened, when, and what changed.
     Amendments column captures scope changes discovered during that level. -->

| Level | Date | Modules Processed | Agents Spawned | Amendments | Notes |
|-------|------|-------------------|----------------|------------|-------|
| — | — | — | — | — | No decomposition levels completed yet |
```

</template>

<conventions>
- **Orchestrator-only writes.** INDEX.md is never modified by parallel decomposition agents. Only the orchestrator updates it after each level completes. This prevents merge conflicts and ensures a single authoritative view.
- **Phase values are enumerated:** `brief-complete`, `discovery-complete`, `architecture`, `decomposition-LN` (where N is the current level), `implementation`, `verification`, `complete`. No free-text phase descriptions.
- **Status Summary is prose, not a table.** It gives context that tables cannot — what just happened, what's next, and why. Keep it to one paragraph.
- **Module Status table must remain scannable.** For projects with 20+ modules, group by tier (all Tier 1 rows first, then Tier 2, then Tier 3). Never let the table exceed what fits in a single screen read.
- **File Inventory uses relative paths** from the scope root. All paths are relative to whatever `scope_root` is set to in the metadata.
- **Decomposition Config values are defaults.** The orchestrator may adjust them per-project. Agents read these values — they do not change them.
- **Level History is append-only.** Rows are never modified after being written. If a level needs correction, add a new row with an amendment note referencing the original.
- **Feature flow:** For feature-scoped work, set `scope_root` to `artifacts/scope/features/<slug>/` and all relative paths resolve from there. The structure inside is identical.
</conventions>
