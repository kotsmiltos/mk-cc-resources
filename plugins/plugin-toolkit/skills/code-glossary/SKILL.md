---
name: code-glossary
description: (v1 — DEPRECATED, will be deleted when v2 ships) Build a functionality glossary for a codebase. For every function and every duplicated sub-block, assign a canonical functionality label (verb + object + qualifiers) decoupled from how it's written, cluster instances of the same functionality across files, and identify which clusters are extractable into shared helpers. Produces GLOSSARY.yaml (machine-readable, frozen schema) + GLOSSARY.md (human summary). Use when the codebase feels WET (same logic in many slightly-different spots), before a refactor pass, before /architect when designing a new module that may overlap with existing code, or as part of a code-review lens that catches DRY violations. Polyglot via LLM-read — no AST dependency. Glossary-only — does NOT execute refactors (downstream skills consume the YAML).
argument-hint: "[path] [language-hint?]"
---

> **DEPRECATED — v1 of /code-glossary.**
> Real-world dogfood on Scalable Crowd (~826 C# functions) showed the single-LLM clusterer can't handle large projects without manual Python helper intervention. v2 redesign replaces the single-pass LLM clusterer with a deterministic Pass A + parallel LLM Pass B + master verification Pass C, adds tree-sitter for first-class TS+C# support, and integrates with essense-flow via two new phases (`/organize` post-architect, `/glossary` post-build).
>
> **Source of truth:** [`DESIGN-V2.md`](./DESIGN-V2.md) in this folder.
>
> **Until v2 ships:** v1 still works in the "indexer-only" path (run indexer, then manually curate clustering as the user did for Scalable Crowd). Not recommended for new use cases.
>
> **This file will be deleted when v2 ships.**

---


<objective>
Read a codebase, label every function and notable sub-block by canonical functionality (what it does, not how it's written), cluster instances across files, and write a frozen-schema glossary. Substrate-verify every claim with file:line + verbatim body excerpt. Glossary-only — no refactor execution.
</objective>

## Disk hints

```!
pwd 2>/dev/null
```

```!
ls -d */ 2>/dev/null | head -20
```

<instructions>

## 1. Scope

`$ARGUMENTS`:
- First token (optional) = target path (default: current working directory)
- Second token (optional) = language hint (e.g. `python`, `ts`, `polyglot`); default `polyglot`

Resolve target path. Confirm exists; abort with a clear message if not.

Detect project conventions by listing top-level dirs and reading any `pyproject.toml`, `package.json`, or `Cargo.toml`. Note candidate "shared helper" homes already present (e.g. `src/utils/`, `src/common/`, `lib/`, `app/helpers/`). These become hints for the `proposed_module` field — never invent new top-level dirs.

Build an exclude set:
- `.git`, `node_modules`, `__pycache__`, `.venv`, `venv`, `dist`, `build`, `.next`, `.pytest_cache`, `target`, `.serena`
- Any path matching `*.min.js`, `*.lock`, `*generated*`
- User's `.gitignore` entries if available
- Test directories ONLY if user opts out — by default INCLUDE tests (duplicate test fixtures are also DRY candidates)

Show the user the scope plan via `AskUserQuestion`:
- Confirm target path + excludes + include-tests setting
- Confirm output location (default: `<target>/GLOSSARY.yaml` + `<target>/GLOSSARY.md`)

Do NOT proceed until confirmed.

## 2. Enumerate source files

Walk the target path. Collect files matching common source extensions (`.py`, `.js`, `.ts`, `.tsx`, `.jsx`, `.go`, `.rs`, `.java`, `.kt`, `.rb`, `.cs`, `.php`, `.swift`, `.cpp`, `.c`, `.h`). Skip excludes.

Batch into groups of ~10-20 files (or 1 directory each, whichever is smaller) for parallel indexing. Report total files + batch count before dispatch.

## 3. Phase 1 — Index (parallel)

Read the brief at `${CLAUDE_PLUGIN_ROOT}/skills/code-glossary/briefs/indexer.md` (in development this resolves to `plugins/plugin-toolkit/skills/code-glossary/briefs/indexer.md`; when installed via plugin marketplace, `find ~/.claude/plugins -path "*/code-glossary/briefs/indexer.md" -type f` discovers it).

Dispatch one `Explore` sub-agent per batch via the Agent tool in a single message (parallel). Each agent receives:
- The brief content (verbatim from `briefs/indexer.md`)
- The batch's file paths
- The detected project conventions (helper home candidates)

Each indexer returns YAML with `indexed_functions` array. Wait for all to return.

Merge returns into a single `indexed_functions` master list. Reject any entry missing `file`, `line`, `function_name`, `body_excerpt`, or `functionality_label`. Log rejections.

## 4. Phase 2 — Block scan (single agent)

Read the brief at `${CLAUDE_PLUGIN_ROOT}/skills/code-glossary/briefs/block-scanner.md` (same discovery pattern as phase 1). Dispatch one `Explore` sub-agent with:
- The brief content
- The `indexed_functions` master list (so block hits can be tied to parent function)
- A token-budget cap of ~50 candidate blocks (block scan is secondary — function-level is primary)

The agent returns `block_instances` — duplicated/near-duplicated multi-line patterns (3+ consecutive lines, 2+ occurrences across files). Each block instance points to its parent function via `parent_function_id`.

## 5. Phase 3 — Cluster (single agent)

Read the brief at `${CLAUDE_PLUGIN_ROOT}/skills/code-glossary/briefs/clusterer.md` (same discovery pattern as phase 1). Dispatch one `Explore` sub-agent with:
- The brief content
- The `indexed_functions` master list (every label per function)
- The `block_instances` list (secondary instances)
- The frozen schema at `${CLAUDE_PLUGIN_ROOT}/skills/code-glossary/templates/glossary.schema.yaml`

The agent merges similar labels into canonical clusters, identifies variant axis (the parts that differ across instances — operators, constants, identifiers, calls), invariant skeleton (the parts that match), and proposes `canonical_signature` + `proposed_module` per extractable cluster (N≥2 instances).

Returns `glossary` array conforming to the frozen schema.

## 6. Phase 4 — Write artifacts

Validate the returned `glossary` against the frozen schema at `${CLAUDE_PLUGIN_ROOT}/skills/code-glossary/templates/glossary.schema.yaml` (same discovery pattern as phase 1). For each entry:
- Required fields present: `id`, `name`, `description`, `instances`, `extractable`
- Each instance has `file`, `function`, `line`, `body_excerpt`
- If `extractable: true`: `canonical_signature`, `proposed_module`, `variant_axis`, `invariant_skeleton` all present and non-empty
- If `extractable: false`: at minimum 1 instance, `notes` populated explaining why (single-instance, language-idiomatic, security-critical, etc.)

Re-validate a random sample of 3 instances: open the cited file, confirm `body_excerpt` appears at/near the cited line (±5 lines). Drop instances where the quote doesn't match — log as drift.

Write `<target>/GLOSSARY.yaml` per the schema. Include `metadata` block with: `generated_at`, `scope` (paths + excludes), `total_functions_indexed`, `total_clusters`, `total_extractable`, `language_mix`.

Render `<target>/GLOSSARY.md` from the template at `${CLAUDE_PLUGIN_ROOT}/skills/code-glossary/templates/report.md.tmpl` (same discovery pattern as phase 1). The template is illustrative — render the same sections, but fill from the actual glossary data rather than trying to substitute `{{...}}` literally. Order clusters by:
1. `extractable: true` first
2. Within extractable, descending by instance count
3. Then single-instance entries (alphabetical by name)

## 7. Report

```
Code glossary: <target>

Indexed:    <N> functions across <M> files
Clusters:   <total_clusters> canonical functionalities
Extractable: <K> clusters (≥2 instances, parametric variant axis)

Top extractables (by reuse count):
  1. <name> — <N> instances — proposed: <proposed_module>
  2. ...
  3. ...

Outputs:
  - <target>/GLOSSARY.yaml  (machine-readable, frozen schema)
  - <target>/GLOSSARY.md    (human summary)

Next:
  - Review GLOSSARY.md, focus on top extractables
  - Feed GLOSSARY.yaml to a refactor skill (v2) or hand-extract via /architect
```

## Composition

- Standalone use: most common — "audit my codebase for DRY violations"
- Future v2 — `/dry-refactor <glossary.yaml> <gloss-id>` would execute extractions with test-after-each
- essense-flow integration (future) — `/architect` could read an existing GLOSSARY.yaml before designing new modules, surfacing existing functionality that overlaps with planned work
- `/review` lens (future) — a new adversarial lens could flag commits that add an Nth instance of a known gloss-id (DRY regression)

## Constraints

- DO NOT modify any source file. This skill produces glossary artifacts only.
- DO NOT invent file paths, function names, or line numbers. Every instance is sourced from a sub-agent return; sub-agents are required to quote verbatim.
- DO NOT propose new top-level helper directories that don't exist. `proposed_module` must point to an existing dir OR an obvious sibling of one (e.g. `src/utils/dates.py` is OK if `src/utils/` exists; inventing `src/lib/` when only `src/utils/` exists is not).
- DO NOT mark a cluster `extractable: true` with fewer than 2 instances.
- DO NOT proceed past phase 1 if zero functions are indexed — abort with a clear message (target may be empty, all excluded, or unreadable).
- DO NOT auto-execute refactors. v1 is glossary-only by design.

</instructions>
