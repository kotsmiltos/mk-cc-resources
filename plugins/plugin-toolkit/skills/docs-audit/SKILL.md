---
name: docs-audit
description: Cross-document drift audit. Compares CLAUDE.md + README.md + marketplace.json + bundle plugin.json against disk state (plugins/, versions). Finds stale references (benched plugins as active), version mismatches between docs and reality, plugins on disk missing from docs, outdated architecture descriptions. Proposes targeted edits per file for user approval. Broader scope than /claude-md-sync (which covers CLAUDE.md only). Use when shipping, after plugin/version changes, or when docs feel stale.
argument-hint: "[plugin-name | all]"
---

<objective>
Detect drift between repo docs (CLAUDE.md, README.md, marketplace.json) and actual disk state. Propose surgical fixes per doc. User approves each.
</objective>

## Disk state

```!
ls -d C:/Users/mkots/mk-cc-resources/plugins/*/ 2>/dev/null | xargs -n1 basename
```

```!
grep -E '"name"|"version"' C:/Users/mkots/mk-cc-resources/.claude-plugin/marketplace.json | paste - - | head -20
```

<instructions>

## 1. Scope

`$ARGUMENTS`:
- `all` (default if omitted): audit all docs against all plugins on disk
- `<plugin-name>`: focus on one plugin's coverage in docs

## 2. Read sources

Read these files fully:
- `.claude-plugin/marketplace.json`
- `.claude-plugin/plugin.json` (mk-cc-all bundle)
- `CLAUDE.md`
- `README.md`

Read disk state:
- `plugins/*/` directories
- Each plugin's `.claude-plugin/plugin.json` (for version + description)
- Each plugin's `RELEASE-NOTES.md` (if exists)

## 3. Drift checks

For each of the following categories, list findings with `file:line` evidence:

**(a) Version mismatches:**
- marketplace.json plugin entry version vs plugins/<name>/.claude-plugin/plugin.json version
- README.md mentioned version vs disk version
- mk-cc-all bundle version vs underlying plugin versions

**(b) Missing entries:**
- Plugin on disk but not in marketplace.json
- Plugin on disk but not in README active-plugins table
- Plugin on disk but not in CLAUDE.md architecture tree

**(c) Stale references:**
- README mentions plugins not on disk (benched as active, removed but referenced)
- CLAUDE.md architecture tree shows directories that don't exist on disk
- marketplace.json description mentions skills/features removed from actual plugin

**(d) Description drift:**
- marketplace.json description doesn't match plugin.json description (significant divergence)
- README dedicated section conflicts with plugin's actual SKILL.md descriptions

**(e) Bundle inconsistencies:**
- mk-cc-all skills array references plugins not in marketplace
- mk-cc-all bundle description names plugins not in skills array
- README "Quick Start" install commands reference non-existent plugins

## 4. Propose fixes

For each finding, present:

```markdown
### <file>: <issue>

**Evidence:** <observed-state> vs <expected-state>

**Proposed fix:**
> <quoted current content>
↓
> <quoted proposed content>
```

Group findings by file. Within each file, order by severity (missing entries > version mismatches > stale refs > description drift).

## 5. Apply approved fixes

After presenting all findings, ask user via `AskUserQuestion`:
- Apply all
- Apply specific findings (offer list)
- None

Apply approved fixes via Edit. Do NOT modify findings the user didn't approve.

## 6. Verify

After apply, re-run drift checks on the touched files. Report:
- Findings resolved: N
- Findings skipped: M (per user)
- Findings still present: 0 (or list if any)

## Composition

- Called by @ship before push (catches doc drift in pre-push checklist)
- Called by /skill-heal after skill audit (if skill quality issues correlate with doc drift)
- Called by /plugin-scaffold? No — scaffold writes docs itself, no drift on creation
- Standalone use: most common — "are my docs current?"

## Constraints

- DO NOT auto-apply without user approval per finding (or "apply all" explicit).
- DO NOT propose architectural rewrites — only factual drift fixes.
- If zero drift found, say so plainly: "Docs match disk state. Nothing to fix."

</instructions>
