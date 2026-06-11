---
name: meta-review
description: Diagnose this session — find multi-step workflow chains you did manually, friction with skills that fired badly or should have fired, installed plugins that fit but went unused, and clear coverage gaps. Reads conversation + git activity (session scope) or also handoffs + memory + recent commits (wide scope). Output is diagnostic — issues with evidence + root causes + where to look for fixes. Does NOT propose diffs or apply changes. Use when something felt off, when reviewing what worked, or periodically to find workflow gaps.
disable-model-invocation: true
argument-hint: "[session | wide | <focus topic>]"
---

<objective>
Diagnose session friction. Identify multi-step workflow chains worth automating, friction with existing skills, plugin coverage gaps. Output is analysis — never diffs, never applied fixes. User decides what to do.
</objective>

## Session activity

```!
git log --oneline -20 2>/dev/null || echo "no git"
```

```!
git diff --name-only HEAD~20..HEAD 2>/dev/null || echo "unknown"
```

## Installed sibling plugins

```!
ls -d "${CLAUDE_PLUGIN_ROOT}/../"*/ 2>/dev/null || echo "plugins root not found"
```

(Plugins root = parent of this plugin's root. Read plugin names from the directory paths above.)

<instructions>

## 1. Scope

Based on `$ARGUMENTS`:
- `session` (default) or no arg: review THIS conversation + current session's git activity
- `wide`: also read `.claude/handoff-*.md`, memory files in the per-project memory directory under `~/.claude/projects/` (directory name is the munged project path), recent commits beyond session
- specific topic (e.g., "build workflow", "testing"): focus diagnosis on that area

## 2. Identify multi-step workflow chains

A workflow chain = a sequence of 3+ related actions performed deliberately as a unit.

**Examples that ARE chains:**
- Scaffold new plugin: create dirs → write plugin.json → write SKILL.md(s) → update marketplace.json → update bundle → update README → update CLAUDE.md
- Review skillset: dispatch lens agents → score against rubric → consolidate findings → present scorecard
- Audit documentation drift: read CLAUDE.md → compare to disk state → find stale refs → propose updates

**NOT chains** (single-step, ignore):
- One `git log`, one Edit, one Read
- A single tool call no matter how long

For each chain found in session, note:
- What the chain does (the macro-process, one sentence)
- Number of times performed in scope (1× rare, 2× pattern, 3+ recurring)
- Whether a skill exists for it (search the available-skills list already in context)
- If no skill exists, is the chain repeatable or one-off?

## 3. Diagnose existing skill usage

**For each skill invoked this session:**
- Did it deliver what its description promises?
- Did the user need to correct course mid-execution?
- Did manual steps fill gaps the skill should have covered?
- Was the friction from the skill's body, its description, or external factors?

**For each installed skill NOT invoked this session:**
- Read its description (from the available-skills list in context; for deeper reading, open the plugin's SKILL.md under `${CLAUDE_PLUGIN_ROOT}/../<plugin>/skills/`)
- Did session work fit that skill's domain?
- If yes, why didn't it fire? (description mismatch / wrong trigger / unknown to user / disabled?)

## 4. Identify coverage gaps

A coverage gap = a workflow chain done manually with no skill match.
- Read the natural-language intent the user expressed when doing the chain
- Search the available-skills list (and each plugin's SKILL.md under `${CLAUDE_PLUGIN_ROOT}/../<plugin>/skills/` when deeper reading is needed) for fit
- If no fit: this is a gap. Note the chain, the intent, the user's natural phrasing.

## 5. Output format

```markdown
## Diagnosis: <session | wide | topic>

### Multi-step chains observed
- **<chain name>**: <what it did, # times performed>
  - Skill exists? <yes — /skill-name | no>
  - Repeatable? <yes/no, evidence>

### Skill friction
- **<skill name>** fired but didn't help — <evidence: user said "X" or corrected to Y>
  - Root cause: <description vs intent? body unclear? wrong trigger?>
  - Where to look: <SKILL.md section, frontmatter field>
- **<skill name>** should have fired but didn't — <intent: "Z">
  - Root cause: <description doesn't surface this use case / unknown to model>
  - Where to look: SKILL.md `description:` field

### Underused plugins (installed)
- **<plugin>**: installed, fits session work (<evidence>), never invoked
  - Possible reasons: <description gap | not discoverable | unknown to user>

### Coverage gaps
- **<chain done manually>** — no skill covers this
  - User intent phrasing: "<verbatim quote>"
  - No installed-skill match found
  - Where to look: candidate for a new skill (new plugin, or new skill under an existing plugin you author)

### Where fixes live
- Skill friction → the skill's SKILL.md (description or body) in the plugin's source repository (for marketplace authors)
- Coverage gaps → new plugin, or new skill under an existing plugin, in the plugin's source repository
- Underused plugins → description rewriting in the plugin's source repository (for hint-phrasing precedent, see the HINTS table in `plugins/thorough-mode/hooks/thorough-mode.js`)
```

## Constraints

- NEVER show diffs or write SKILL.md changes. Pure diagnosis.
- NEVER propose more than 5 items per section. If fewer real findings exist, return fewer — don't pad.
- ALWAYS quote evidence verbatim from session (or cite where evidence lives if file-based).
- IF a finding can't be backed by specific evidence, drop it.
- IF session was trivial (no chains, no friction), say so and stop. Don't manufacture issues.

</instructions>
