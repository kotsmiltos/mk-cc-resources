<workflow>

<required_reading>
Read ALL of these before proceeding. They define the rules, formats, and constraints for this workflow.

- references/scope-decomposition.md — stopping criteria, brief assembly, quality gates, INDEX.md update protocol, path structure
- references/team-culture.md — operating principles embedded in every agent prompt
- templates/index.md — INDEX.md structure and conventions (feature flow variant)
</required_reading>

<overview>
Feature flow discovery workflow for existing codebases. Invoked by `/architect scope discover <feature-slug>`.
Scans the existing codebase, maps architecture, traces feature impact, and produces discovery artifacts
at `{scope_root}/discovery/`. Updates INDEX.md to phase `discovery-complete`.

This workflow precedes scope-decompose. It answers: "What does the codebase look like today, and what
does this feature touch?" The output feeds Level 0 decomposition with real codebase knowledge instead
of greenfield assumptions.

Discovery is read-only analysis — no code is modified.
</overview>

<process>

<step_1_intake>

1. **Validate slug safety.**
   Check the feature slug against: `/^[a-z0-9][a-z0-9-]{0,28}[a-z0-9]$/`
   - Lowercase alphanumeric + hyphens only
   - Length: 2-30 characters
   - Must start and end with alphanumeric
   - If slug is empty or not provided: STOP — "Feature slug is required. Usage: `/architect scope discover <feature-slug>`"
   If invalid: STOP with specific validation failure reason.
   Slug validation MUST run before any path construction to prevent path traversal.

2. **Determine feature scope root.**
   Construct `scope_root` = `artifacts/scope/features/<slug>/`.
   Check for `{scope_root}/INDEX.md`.
   - If INDEX.md exists: read it. Extract `phase`, `scope_root`.
   - If INDEX.md missing but `INDEX.md.tmp` exists: rename `.tmp` to `INDEX.md`. Read it.
   - If INDEX.md missing entirely: this is a new feature scope. Create the directory structure
     and initialize INDEX.md from templates/index.md with:
     - `scope_root`: `artifacts/scope/features/<slug>/`
     - `phase`: `brief-complete`
     - `project`: read from project CLAUDE.md or cwd name

3. **Validate phase.**
   - If phase is `discovery-complete` or any `decomposition-*` or `architecture` phase:
     Tell user: "Discovery already complete for <slug>. Run `/architect scope level-0` to start decomposition."
     STOP.
   - If phase is `brief-complete`: proceed with discovery.

4. **Locate feature brief.**
   Check for `{scope_root}/brief/feature-brief.agent.md`.
   - If found: read it. Extract project context and requirements.
   - If not found: check for `{scope_root}/brief/feature-brief.md`.
     - If .md exists but .agent.md missing: WARN — agent brief is missing, using human-facing brief.
     - If neither exists: Tell user: "No feature brief found at `{scope_root}/brief/`. Run miltiaze requirements first to produce the feature brief." STOP.

</step_1_intake>

<step_2_spawn_discovery_agents>

Spawn discovery agents in two phases: Agents 1 and 2 in parallel, then Agent 3 after Agent 2
completes (Agent 3 needs the impact trace to focus on the right files).

All agents include this team values block in their prompt:

```
Team values — follow these unconditionally:
- Be thorough. Surface everything you find. Think beyond your assigned scope.
- Be direct. No filler, no hedging. State findings as facts or qualified assessments.
- Nothing is too small to note or too big to attempt.
```

**Phase A — Spawn Agents 1 and 2 in parallel (2 Agent tool calls in a single message).**

**Agent 1 — Architecture Scanner:**

Prompt:
```
You are an architecture scanner. Your job is to analyze an existing codebase and produce a
structured architecture snapshot. You are NOT designing architecture — you are DOCUMENTING
what exists.

Scan these sources in order:
1. The project's CLAUDE.md (if it exists) — architecture section, file tree, conventions
2. Package manifests (package.json, pyproject.toml, Cargo.toml, go.mod, etc.)
3. Key entry points (main files, index files, app bootstrap)
4. Module/package boundaries (directory structure, __init__.py, mod.rs, index.ts)

For large codebases (estimate: over 1000 files via directory listing):
- Focus on entry points and module boundaries
- Read representative files per module, not every file
- Map the dependency direction between top-level modules

Produce a structured report with these sections:

MODULES:
For each module/package:
- Name and path
- Purpose (1 sentence)
- Key exports/interfaces
- Dependencies (which other modules it imports from)
- Estimated size (file count, approximate lines)

DEPENDENCY MAP:
- Which modules depend on which (direction matters)
- External dependencies (third-party packages)
- Circular dependencies (flag these prominently)

TECHNOLOGY STACK:
- Language(s), runtime(s), framework(s)
- Build system, package manager
- Test framework (if detectable)

CONVENTIONS:
- Naming patterns (files, functions, classes)
- Import organization style
- Configuration approach

CONSTRAINTS:
- Platform requirements
- Minimum versions
- Known limitations from docs or configs

{team_values}
```

**Agent 2 — Impact Tracer:**

Prompt:
```
You are an impact tracer. Your job is to read a feature brief and trace which parts of an
existing codebase the feature touches. You produce a requirement-by-requirement impact map.

Read the feature brief at: {feature_brief_path}

For each requirement in the brief:
1. Identify the codebase areas it affects (grep for related patterns: API endpoints,
   data models, service names, function names, UI components)
2. Classify each affected file/function by change type:
   - MODIFY: existing code needs changes
   - EXTEND: existing code gets new functionality added
   - WRAP: existing code gets wrapped with new behavior
   - NEW: file/function does not exist yet, must be created

Produce a structured report with these sections:

IMPACT TABLE:
| Requirement | File | Function/Component | Change Type | Description |
|---|---|---|---|---|

NEW FILES:
List any files that must be created (do not exist today).
For each: proposed path, purpose, which requirement drives it.

RISK ASSESSMENT:
For each impacted area, assess risk:
- HIGH: core logic changes, data model changes, security-sensitive
- MEDIUM: feature additions to stable interfaces, new integrations
- LOW: configuration, documentation, isolated additions

HOTSPOTS:
Files or modules affected by 3+ requirements — these are integration hotspots
that need careful coordination.

{team_values}
```

Wait for both agents to complete. If either fails, report the failure and offer retry.

**Phase B — Spawn Agent 3 after Agent 2 completes (sequential — needs impact trace).**

**Agent 3 — Pattern Extractor:**

Prompt:
```
You are a pattern extractor. Your job is to read example files from the codebase that the
feature will touch and extract the conventions, patterns, and styles in use. The goal is to
ensure the feature implementation matches the existing codebase.

The Impact Tracer has identified which files the feature touches:

{Agent 2's impact trace output — IMPACT TABLE and NEW FILES sections}

Read representative files from the impacted areas listed above.

For each pattern category, extract concrete examples:

NAMING CONVENTIONS:
- File naming (kebab-case, camelCase, snake_case)
- Function/method naming
- Class/type naming
- Variable naming
- Constant naming

ERROR HANDLING:
- How errors are raised/thrown
- How errors are caught and reported
- Error message format
- Whether errors are logged, re-thrown, or swallowed

TEST PATTERNS:
- Test file location convention (co-located, separate test dir)
- Test naming convention
- Setup/teardown patterns
- Mock/stub approach
- Assertion style

IMPORT ORGANIZATION:
- Import ordering (stdlib, third-party, local)
- Absolute vs relative imports
- Re-export patterns

CODE STRUCTURE:
- Module/file size norms
- Function length norms
- Comment style and density
- Type annotation usage

For each pattern, cite the specific file and line range where you found it.

For large codebases (1000+ files): focus on the impacted files from the impact trace.
Read representative examples from each impacted module rather than every file.

{team_values}
```

If Agent 3 fails, report the failure and offer retry.

</step_2_spawn_discovery_agents>

<step_3_synthesize>

Read all 3 agent outputs. Produce 4 files in `{scope_root}/discovery/`:

**File 1: `discovery/codebase-snapshot.md` (human-facing)**

```markdown
> **type:** discovery-report
> **output_path:** {scope_root}/discovery/codebase-snapshot.md
> **feature:** <slug>
> **created:** YYYY-MM-DD

# Codebase Snapshot: [Project Name]

## Architecture Overview
[Synthesize from Agent 1: module list, boundaries, dependency direction.
 Present as a clear module map — what exists today.]

## Technology Stack
[From Agent 1: languages, frameworks, build tools, test infrastructure]

## Key Patterns and Conventions
[From Agent 3: naming, error handling, test patterns, import style.
 Cite specific files as examples.]

## Constraints
[From Agent 1: platform requirements, version constraints, known limitations]

## Questions for User
[Anything the scanners could not determine from the codebase alone.
 Missing documentation, ambiguous boundaries, unclear ownership.]
```

**File 2: `discovery/codebase-snapshot.agent.md`**

```yaml
---
type: agent-brief
purpose: codebase-snapshot
project: [project name]
scope_root: {scope_root}
source_hash: [SHA-256 of codebase-snapshot.md]
---
```

```xml
<architecture>
[Module list with boundaries and purposes — structured for agent consumption]
</architecture>

<modules>
[Per-module detail: name, path, purpose, key exports, estimated size]
</modules>

<dependencies>
[Directed dependency map between modules. Flag circular dependencies.]
</dependencies>

<patterns>
[Extracted patterns: naming, error handling, testing, imports — concrete examples with file paths]
</patterns>

<constraints>
[Platform, version, and framework constraints that implementation agents must follow]
</constraints>
```

Use positive framing only. State what TO DO, not what to avoid.
The only exception is SECURITY: prefixed lines for security-critical prohibitions.

**File 3: `discovery/impact-map.md` (human-facing)**

```markdown
> **type:** discovery-report
> **output_path:** {scope_root}/discovery/impact-map.md
> **feature:** <slug>
> **created:** YYYY-MM-DD

# Impact Map: [Feature Name]

## Summary
[N files affected across M modules. Brief characterization of the change footprint.]

## Per-Requirement Impact

### [Requirement 1 Title]
| File | Function/Component | Change Type | Risk | Description |
|---|---|---|---|---|

[Repeat for each requirement]

## New Files
[Files that must be created, with proposed paths and purposes]

## Integration Hotspots
[Files/modules affected by 3+ requirements — need careful coordination]

## Risk Assessment
[Overall risk profile. Which areas carry the highest risk and why.]

## Recommended Approach
[Suggested implementation order based on dependency analysis and risk.
 Which modules to tackle first, where to be careful.]
```

**File 4: `discovery/impact-map.agent.md`**

```yaml
---
type: agent-brief
purpose: impact-map
feature: <slug>
scope_root: {scope_root}
source_hash: [SHA-256 of impact-map.md]
---
```

```xml
<impact>
[Per-requirement impact entries — requirement ID, affected files, change types]
</impact>

<affected_files>
[Complete list of existing files that require modification, with change type per file]
</affected_files>

<new_files>
[Files to create: path, purpose, owning requirement]
</new_files>

<risks>
[Risk entries: area, level (high/medium/low), description, mitigation]
</risks>

<approach>
[Recommended implementation order, module sequencing, coordination points]
</approach>
```

Use positive framing only. State what TO DO, not what to avoid.
The only exception is SECURITY: prefixed lines for security-critical prohibitions.

**source_hash computation:**
For each .agent.md file, compute SHA-256 of its sibling .md file and include it in the
YAML frontmatter `source_hash` field. This enables downstream consumers to verify the
.agent.md is in sync with the human-facing document.

</step_3_synthesize>

<step_4_update_index>

Update INDEX.md at `{scope_root}/INDEX.md`:

1. **Update phase.**
   Set `phase` to `discovery-complete`.

2. **Update Status Summary.**
   Replace with: "Phase: **discovery-complete**. Codebase scanned and feature impact traced.
   Discovery artifacts ready at `discovery/`. Next step: Level 0 architecture to produce
   system map, contracts, and module boundaries informed by the discovery analysis."

3. **Update File Inventory.**
   Add discovery entries:
   ```
   - **Discovery:** `discovery/codebase-snapshot.md`, `discovery/codebase-snapshot.agent.md`
   - **Impact Map:** `discovery/impact-map.md`, `discovery/impact-map.agent.md`
   ```

4. **Populate Module Status table.**
   From the architecture scan, add rows for each existing module discovered:
   - Modules NOT touched by the feature: Status = `existing` (not part of decomposition)
   - Modules touched by the feature: Status = `impacted` (will be included in scope decomposition)
   Use Tier assignments from the dependency analysis (Tier 1 for core/foundation, Tier 2 for features, Tier 3 for integration).

5. **Atomic write.**
   Write updated INDEX.md to `INDEX.md.tmp` first, then rename to `INDEX.md`.
   On Windows: delete target first, then rename (delete-then-rename sequence).
   Recovery: if a future session finds INDEX.md missing but INDEX.md.tmp present,
   rename .tmp to INDEX.md.

</step_4_update_index>

<step_5_update_state>

Update `context/STATE.md` Pipeline Position:
- Stage: `scope-L0` (ready for architecture phase)
- Scope root: `artifacts/scope/features/<slug>/`

Present to user:

```
Discovery complete for <slug>.
Impact map shows {N} files affected across {M} modules.

Discovery artifacts at {scope_root}/discovery/:
  - codebase-snapshot.md  — architecture overview, patterns, constraints
  - impact-map.md         — per-requirement impact trace, risks, approach

Review the impact map, then run:
   /architect scope level-0

You can /clear first — all state is on disk.
```

</step_5_update_state>

</process>

<edge_cases>

**No CLAUDE.md or project documentation:**
The architecture scanner relies on file structure and package manifests only.
It reads directory listings, entry point files, and import statements to infer
module boundaries. Report to user that documentation-derived context was unavailable.

**Very large codebase (1000+ files):**
The architecture scanner focuses on entry points, module boundaries, and package manifests.
It reads representative files per module rather than every file. The impact tracer
uses targeted grep for patterns from the feature brief rather than scanning all files.

**Feature is a pure addition (no existing code touched):**
The impact map shows new files only, with all change types as NEW. The module status
table may have no `impacted` modules — all existing modules remain `existing`.
The codebase snapshot still captures the architecture and patterns that the new code
must follow.

**Feature scope root directory does not exist:**
Step 1 creates the directory structure (`{scope_root}/brief/`, `{scope_root}/discovery/`)
before writing any files.

**Feature brief exists but has no agent brief (.agent.md):**
Step 1 warns and falls back to the human-facing .md. Discovery agents receive the
raw brief content instead of structured YAML+XML.

</edge_cases>

</workflow>
