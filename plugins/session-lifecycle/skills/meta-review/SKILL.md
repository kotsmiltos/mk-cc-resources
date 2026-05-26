---
name: meta-review
description: Mine session for automation opportunities. Identifies repeated manual steps, pain points (corrections, retries, "like before"), unused skills (bad trigger? wrong description?), and process gaps. Produces ranked proposals — improve existing SKILL.md (specific diff) or new skill spec (name, trigger, inputs, outputs, effort/value). Max 5 proposals, evidence-backed from session patterns.
disable-model-invocation: true
argument-hint: "[optional: focus area e.g. 'build workflow' or 'testing']"
---

<objective>
Mine the current session for automation opportunities. Produce actionable proposals: specific changes to existing skills, or specs for new skills. Each proposal backed by evidence from session patterns.
</objective>

## Session commits

```!
git log --oneline -20 2>/dev/null || echo "no git"
```

## Files touched this session

```!
git diff --name-only HEAD~20..HEAD 2>/dev/null || echo "unknown"
```

<instructions>

## 1. Analyze session patterns

Review the conversation history and injected git data. Identify:

**Repeated manual steps:**
- Same sequence of commands run multiple times
- Same type of file created/edited with similar structure
- Same checks performed before/after actions
- Copy-paste patterns (same text/config reused)

**Pain points:**
- Where did the user correct course? (indicates unclear process)
- Where did things fail and need retry? (indicates fragile process)
- Where did the user say "again" or "like before"? (indicates missing automation)
- What took multiple back-and-forth turns that could be one command?

**Tool usage gaps:**
- Were existing skills used? If not, why? (bad description? wrong trigger? missing feature?)
- Were tools used in ways their docs don't cover? (indicates skill gap)
- Were manual workarounds used instead of available automation?

**Process patterns:**
- What workflow was followed? (linear, iterative, exploratory?)
- Where were decisions made? (could decisions be templated?)
- What context was gathered repeatedly? (could be injected via hooks?)

If `$ARGUMENTS` specifies a focus area, prioritize patterns in that area.

## 2. Review existing skills

Read the available skills (use `Glob` to find SKILL.md files in `~/.claude/skills/` and `.claude/skills/`).
For each existing skill relevant to session patterns:
- Was it used? If not, is description too narrow or trigger wrong?
- Did it cover the full workflow, or did manual steps fill gaps?
- Are there missing features that would have helped?

## 3. Generate proposals

Produce proposals in two categories:

### Improve Existing Skills

For each improvement:
```markdown
#### Improve: <skill-name>

**Evidence:** <what happened in session that shows this gap>
**Current behavior:** <what the skill does now>
**Proposed change:** <specific modification — new step, better trigger, added template>
**Effort:** <small (frontmatter tweak) | medium (new section) | large (new workflow)>
**Value:** <how often this pattern recurs, time saved per occurrence>
```

### New Skill Candidates

For each new skill:
```markdown
#### New: /<proposed-name>

**Evidence:** <session pattern that motivates this>
**What it would do:** <one paragraph>
**Trigger:** <when user/Claude should invoke it>
**Inputs:** <what it reads>
**Outputs:** <what it produces>
**Effort:** <small | medium | large>
**Value:** <frequency x time-saved estimate>
**Conflicts with:** <any existing skill overlap>
```

## 4. Prioritize

Rank all proposals by value/effort ratio. Present top 5 max. If fewer than 5 are worth proposing, present fewer — don't pad.

## 5. Offer to act

For each accepted proposal:
- **Existing skill improvement:** Open the SKILL.md, show proposed diff, apply on approval.
- **New skill:** Generate SKILL.md skeleton in appropriate location, ready for refinement.

</instructions>
