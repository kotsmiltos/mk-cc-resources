---
name: skill-heal
description: Audit a plugin's skill set against current best practices. For each skill, scores frontmatter quality, body length vs 500-line guide, conciseness, description discoverability, single-responsibility, and architecture coherence. Dispatches parallel review agents (one per skill). Produces per-skill scorecard with letter grades + systemic vs per-skill issues + ranked fixes. Diagnostic only — never applies changes. Use when reviewing a plugin's skill quality or before a major release.
argument-hint: "<plugin-name> [focus area]"
---

<objective>
Audit a plugin's skill set against the rubric proven on essense-flow (2026-05). Produce per-skill scorecard + systemic-issue summary. Diagnostic only.
</objective>

## Target plugin discovery

```!
ls -d C:/Users/mkots/mk-cc-resources/plugins/*/ 2>/dev/null | xargs -n1 basename
```

<instructions>

## 1. Resolve target

`$ARGUMENTS` first token = plugin name (e.g. `essense-flow`, `session-lifecycle`). Resolve to `plugins/<name>/`. If path doesn't exist, list available plugins (from injection above) and stop.

Second token (optional) = focus area:
- `descriptions` — only audit frontmatter descriptions
- `bodies` — only audit body length + conciseness
- `architecture` — only audit single-responsibility + coherence
- (default if omitted) — full audit across all dimensions

## 2. Discover skills in plugin

Find all `SKILL.md` files under `plugins/<name>/skills/*/`. For each, capture path + skill name (from frontmatter `name:` or directory name).

If the plugin has zero skills, report that and stop.

## 3. Dispatch parallel review agents

For each skill (or batched if more than ~5), dispatch a review agent in parallel via the Agent tool. Each agent gets the same rubric brief:

```
Review the SKILL.md at <path> against this rubric. Read the file FULLY.

LENS 1 — ANTHROPIC BEST PRACTICES:
- Frontmatter: description present, under 1,536 chars, key use case first. allowed-tools / disable-model-invocation set where appropriate. argument-hint where useful.
- Body length: keep under 500 lines (Anthropic guidance). Skill content stays in context all session.
- Body conciseness: "State what to do rather than narrating how or why."
- Description quality: use-case-first phrasing, no internal jargon, keywords users would naturally search.

LENS 2 — TOKEN EFFICIENCY:
- Propagation/preamble redundancy across skills in the same plugin
- Internal redundancy (same instruction in multiple sections)
- Content that should be in supporting files (referenced, not loaded)

LENS 3 — ARCHITECTURE COHERENCE:
- Single responsibility — does the skill do ONE thing or many?
- Description vs body match
- Routing — clear input/output contract with sibling skills
- Naming consistency

For each skill, output:
- GRADE per dimension (A/B/C/D/F) with one-line justification
- Top 3 concrete improvements with file:line evidence

Be specific and adversarial. Find real problems. No padding.
```

## 4. Consolidate scorecard

Aggregate agent returns into one report:

```markdown
## Skill audit: <plugin-name>

### Scorecard

| Skill | Lines | Frontmatter | Length | Concise | Descr | SingleResp | Overall |
|-------|-------|-------------|--------|---------|-------|------------|---------|
| ... | ... | ... | ... | ... | ... | ... | ... |

### Systemic issues (affect multiple skills)
- <issue>: <which skills affected, where to look>

### Per-skill issues (single skill)
- <skill>: <issue, where to look>

### Ranked improvements (top 5 max)
1. <fix>: <skills affected, effort, expected impact>
```

Best skill = highest overall. Worst = lowest. Name both.

## 5. Identify systemic vs per-skill

A finding is systemic if it appears in 3+ skills of the plugin. Otherwise per-skill.

## 6. Composition hints

- After scorecard, if descriptions are weak across skills → suggest the user invoke `/docs-audit` for the plugin's external docs (CLAUDE.md, README) too
- If single-responsibility issues are flagged → suggest splitting decisions (don't propose splits; that's user judgment)

## Constraints

- NEVER propose specific diffs. Point to where fixes live (file + section), not what the new content should be.
- NEVER pad. Max 5 ranked improvements. Fewer if real findings are fewer.
- ALWAYS quote evidence (line numbers, verbatim text) from the actual SKILL.md files.

</instructions>
