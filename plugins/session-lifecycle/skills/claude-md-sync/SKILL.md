---
name: claude-md-sync
description: Propose targeted CLAUDE.md updates after code changes. Reads git diff (last 20 commits), cross-references against CLAUDE.md sections — impact map, shared modules table, file locations, architecture reference, known issues. Shows current-vs-proposed for each stale section. User approves each edit individually. Callable standalone or triggered by /handoff when staleness detected.
argument-hint: "[optional: section to focus on]"
---

<objective>
Keep CLAUDE.md accurate by proposing targeted updates to sections that drifted from code reality. Never auto-apply — every proposed edit needs user approval.
</objective>

## Recent changes

```!
git diff --stat HEAD~20..HEAD 2>/dev/null || git diff --stat 2>/dev/null || echo "no git history"
```

## Changed files detail

```!
git diff --name-only HEAD~20..HEAD 2>/dev/null || echo "no git history"
```

<instructions>

## 1. Read CLAUDE.md

Read the project's CLAUDE.md fully. Identify which updateable sections exist. Common sections:
- **Change Impact Map** — "when changing X, also update Y" rules
- **Shared Modules** — table of modules + consumers
- **File Locations / Project Structure** — key paths and what lives where
- **Architecture Reference** — high-level component descriptions
- **Known Issues / Active Investigations** — tracked problems
- **Frequently Used Locations** — paths developers reference often
- **Dependencies / Stack** — technology and version references

If `$ARGUMENTS` specifies a section, focus only on that section.

## 2. Cross-reference against changes

For each section found in CLAUDE.md:

**Impact Map:** Check if changed files are listed. If new files were added in areas covered by impact rules, propose adding them. If files were deleted or renamed, propose removing/updating references.

**Shared Modules:** For each changed file that appears in the modules table, verify consumer list is still accurate. For new shared modules (files imported by 3+ others), propose adding them.

**File Locations:** Verify listed paths still exist. Flag any that were moved or deleted. Propose additions for significant new files.

**Architecture Reference:** If changes modified component boundaries, interfaces, or data flow, flag for review.

**Known Issues:** If changes appear to fix a listed known issue, propose marking it resolved.

## 3. Propose updates

For each stale section, present:

```
### Section: <section name>

**Why:** <what changed that makes this stale>

**Current content (stale):**
> <quoted current text>

**Proposed update:**
> <proposed replacement text>
```

Group proposals by section. If a section is current, skip it — don't report "no changes needed" per section.

## 4. Apply approved changes

After presenting all proposals, ask user which to apply (all, specific ones, none).
Apply approved changes via Edit tool. Do NOT modify sections the user didn't approve.

## 5. Report

State what was updated and what was skipped. Verifiable check: "Updated N sections in CLAUDE.md. Sections X, Y changed. Section Z skipped per user."

</instructions>
