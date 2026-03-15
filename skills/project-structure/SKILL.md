---
name: project-structure
description: Generates and maintains a live project structure map in the project's CLAUDE.md. Scans the codebase, builds an annotated file tree with key export/purpose annotations, and adds maintenance instructions so the structure stays current across sessions.
---

<objective>
Scan the current project, generate a comprehensive annotated file tree, and write it into the project's CLAUDE.md file. The structure includes annotations for what each file does, a "Frequently Used Locations" table for quick lookup, and maintenance instructions that tell Claude to keep the structure updated after every edit.
</objective>

<quick_start>
1. Check for an existing CLAUDE.md at the project root
2. If it exists, look for `<!-- STRUCTURE:START -->` / `<!-- STRUCTURE:END -->` markers
3. Scan the project filesystem, then generate or update the structure section
</quick_start>

<workflow>

<step_1_discover>
Scan the project for all relevant source files. Exclude common noise directories.

```bash
find . -type f \( -name "*.py" -o -name "*.ts" -o -name "*.js" -o -name "*.md" -o -name "*.yaml" -o -name "*.yml" -o -name "*.toml" -o -name "*.json" -o -name "*.txt" -o -name "*.example" -o -name "*.env*" -o -name "Dockerfile*" -o -name "*.sh" \) \
  ! -path "*/.venv/*" ! -path "*/__pycache__/*" ! -path "*/.git/*" \
  ! -path "*/node_modules/*" ! -path "*/.claude/plans/*" ! -path "*/.claude/*" \
  ! -path "*/dist/*" ! -path "*/build/*" ! -path "*/.next/*" \
  ! -path "*/*.egg-info/*" ! -path "*/coverage/*" \
  | sort
```
</step_1_discover>

<step_2_analyze>
For each important source file, read it briefly to understand:
- What it exports or provides
- Its role in the project architecture
- What depends on it / what it depends on

Focus on files that are edited frequently or imported by many others. These go into the "Frequently Used Locations" table.
</step_2_analyze>

<step_3_check_existing>
Look for a `CLAUDE.md` at the project root.

- If it exists, look for the `<!-- STRUCTURE:START -->` / `<!-- STRUCTURE:END -->` markers.
  - If markers exist: replace only the content between them.
  - If no markers: append the structure section at the end of the file.
- If no CLAUDE.md exists: create one with the structure section and a minimal project header.
</step_3_check_existing>

<step_4_generate_tree>
Build the annotated tree using this format:

```
<!-- STRUCTURE:START — Auto-maintained. Run /project-structure to regenerate. -->
```
(annotated tree here)
```
<!-- STRUCTURE:END -->
```

Rules for the tree:
- Use box-drawing characters for the tree structure
- Add a short annotation after each file: `— What this file does / key exports`
- Group files logically by directory
- For directories with many similar files, show the pattern rather than every file
- Annotate directories too when their purpose isn't obvious
- Skip generated files, lock files, and build artifacts
</step_4_generate_tree>

<step_5_locations_table>
Create a markdown table mapping common tasks to file locations:

```markdown
### Frequently Used Locations

| What | Where |
|------|-------|
| Example task | `path/to/file.py` → `specific_thing` |
```

Include entries for:
- Adding new features / entities / types
- Configuration and environment
- Shared utilities and helpers
- Key business logic entry points
- Test locations
- API / route definitions
</step_5_locations_table>

<step_6_maintenance>
After the structure, add this section (if not already present):

```markdown
### Structure Maintenance

**This project structure section must be kept up to date.** After any edit that adds, removes, moves, or renames files:

1. Review the project structure above and update it to reflect the change.
2. Update the "Frequently Used Locations" table if the change affects key locations.
3. Before making edits to existing files, reference this structure to understand where things live and what depends on what.
```
</step_6_maintenance>

<step_7_write>
Use the Edit tool to update the CLAUDE.md between the structure markers, or Write if creating from scratch.
</step_7_write>

</workflow>

<behavior>
- Always scan the actual filesystem — never generate from memory or assumptions.
- Read key files briefly (first 20-30 lines) to understand their purpose. Don't read every file fully.
- Annotations should be concise: 5-15 words per file max.
- The Frequently Used Locations table should have 5-15 entries, covering the most common edit patterns.
- If the project has a monorepo structure, annotate each package/app separately.
- Skip files that are clearly generated (lock files, `.egg-info`, `dist/`, `build/`, `coverage/`).
- If the user provides arguments (like specific directories to focus on), scope the scan accordingly.
- The structure should be useful for both humans reading CLAUDE.md and Claude Code referencing it before edits.
</behavior>

<success_criteria>
Structure generation is successful when:
- [ ] `<!-- STRUCTURE:START -->` and `<!-- STRUCTURE:END -->` markers are correctly placed
- [ ] Tree uses box-drawing characters with concise annotations
- [ ] Frequently Used Locations table has 5-15 entries
- [ ] Maintenance instructions are present
- [ ] Existing CLAUDE.md content outside the markers was not overwritten
- [ ] The structure reflects the actual filesystem, not assumptions
</success_criteria>
