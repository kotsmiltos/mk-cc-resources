<impact_analysis>

<overview>
Impact analysis ensures that changes don't break coupled files. Most projects have files that MUST change together — a data model and its UI, a config and its consumer, a function and its callers. Missing one creates bugs that only surface later.

This reference teaches how to trace impact BEFORE building, and verify it AFTER.
</overview>

<when_to_perform>
- **During kickoff**: Before decomposing a project into milestones. The impact trace shapes how milestones are grouped.
- **During milestone planning**: Before starting each milestone. The trace confirms all coupled files are accounted for.
- **During milestone verification**: After completing each milestone. The trace confirms nothing was missed.
- **During reassembly**: After all milestones complete. The full manifest confirms the project is whole.
</when_to_perform>

<how_to_find_architecture_maps>

Look for architecture documentation in this order (stop when you find the richest source):

1. **CLAUDE.md — Change Impact Map section** (preferred, most detailed)
   Look for `## Change Impact Map` or `## Mandatory: Change Impact Map` heading.
   Contains tables with "Touch" and "Also update" columns organized by concern area.

2. **context/cross-references.yaml** (mk-flow cross-references)
   YAML rules that say "when X changes, check Y". These are already structured.

3. **_code_audit/patterns.md** (repo-audit patterns, if present)
   Pattern index from a previous repo audit.

4. **Manual discovery** (fallback when no documentation exists)
   - Read imports in the files you plan to modify
   - Search for consumers of functions/classes you plan to change
   - Check for UI, tests, config, and documentation that reference the same concepts
   - Look at `__init__.py` re-exports, registry files, config loaders

If multiple sources exist, use all of them. They complement each other — the impact map gives the big picture, cross-references give the rules, manual discovery catches what was never documented.
</how_to_find_architecture_maps>

<trace_procedure>

<step_1_identify_scope>
For the feature or milestone you're about to build, list every file you plan to create or modify. Be explicit — file paths, not concepts.
</step_1_identify_scope>

<step_2_look_up_coupled_files>
For each file in your scope:
1. Check the architecture map (CLAUDE.md Change Impact Map) for that file or its parent concern
2. Check cross-references.yaml for rules that trigger on that file
3. List ALL coupled files with their coupling reason

Categorize each coupled file:
- **MUST UPDATE**: The change will break this file if not updated (e.g., interface change, renamed export, schema migration)
- **SHOULD CHECK**: The change might affect this file (e.g., shared constant, display logic, related test)
- **INFORM ONLY**: This file consumes the concept but handles changes gracefully (e.g., reads from config with defaults)
</step_2_look_up_coupled_files>

<step_3_document_the_trace>
Write the impact trace into the BUILD-PLAN.md (during kickoff) or into the milestone section (during build):

```
### Impact Trace for [Milestone/Feature Name]

Files planned to modify:
- `path/file.py` — what we're changing

Impact map says also update:
- [MUST] `path/coupled.py` — reason from impact map
- [SHOULD] `path/related.py` — reason from impact map
- [INFORM] `path/consumer.py` — reason

Additional discovered dependencies (not in impact map):
- `path/other.py` — found via import/consumer analysis

Files NOT in impact map that we discovered:
- `path/new-dep.py` — [describe the coupling]
  → ADD to CLAUDE.md Change Impact Map after this milestone
```
</step_3_document_the_trace>

<step_4_verify_after_building>
After the milestone is built, re-read the impact trace and confirm:

- [ ] Every MUST UPDATE file was actually updated
- [ ] Every SHOULD CHECK file was reviewed (even if no change was needed — document why)
- [ ] Tests pass for ALL coupled files, not just the ones you changed
- [ ] No new cross-file dependencies were introduced without documenting them

If the impact map was incomplete (you found dependencies not listed), update the architecture docs:
- Add to CLAUDE.md's Change Impact Map
- Add to context/cross-references.yaml (if mk-flow is initialized)
</step_4_verify_after_building>

<step_5_maintain_architecture_docs>
If your changes add new cross-file dependencies:
1. Add them to CLAUDE.md's Change Impact Map (if it exists)
2. Add them to context/cross-references.yaml (if mk-flow is initialized)
3. Note them in the milestone report's Discoveries section

The architecture map is a living document. Every milestone that introduces new coupling should update it. This prevents the next developer (or the next session) from missing the same dependency.
</step_5_maintain_architecture_docs>

</trace_procedure>

<impact_trace_in_milestones>
When grouping files into milestones during kickoff:

**Keep coupled files together.** If changing `model.py` requires updating `ui.py`, `config.py`, and `test_model.py`, these should all be in the same milestone. Splitting coupled files across milestones creates windows where the project is in an inconsistent state.

**Exception:** If the coupling is one-directional and the downstream file can tolerate the change temporarily (e.g., a display helper that gracefully handles new fields), the downstream update can go in a later milestone. But document this explicitly in the BUILD-PLAN.md.
</impact_trace_in_milestones>

<common_missed_dependencies>
These are the files most commonly forgotten during planning:

- `__init__.py` re-exports (new classes/functions need to be exported)
- Registry files (marketplace.json, plugin.json, routing tables)
- Display/formatting helpers (when data models change, display logic often needs updating)
- Configuration persistence (new features often need settings, defaults, migration)
- Cache invalidation (when underlying data changes, caches may serve stale data)
- Filename/path parsers (when file naming conventions change)
- Auto-generated content (tags, summaries, indexes that derive from source data)
- Test fixtures (when data models change, test data needs updating)
- Documentation (API docs, CLAUDE.md, README when behavior changes)
</common_missed_dependencies>

</impact_analysis>
