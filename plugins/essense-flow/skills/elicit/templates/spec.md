---
artifact: spec
schema_version: 1
produced_by: /elicit
read_by: /research, /architect
complexity:
  assessment: partial-rewrite | new-feature | bug-fix | new-project
  touch_surface: narrow | moderate | broad
  unknown_count: 0
  notes: "what makes this complex or simple"
---

<!--
TEMPLATE CONTRACT — read this before producing output.

Required inputs (read-only): user conversation (this elicit session)
Must NOT contain: implementation details, code snippets, library/tool choices, architectural patterns

Operating contract: think → verify → surface.
Before finalizing this spec, verify each section against its PASS criteria below.
If a section cannot be completed, attempt the "If stuck" approach. Surface as explicit
question to the user only after a genuine attempt fails.

The complexity block in frontmatter is a judgment call — not a checkbox the user fills.
Claude assesses based on what the spec actually describes; see project memory for guidance.
-->

## 1. What We Are Building (the problem)

**Purpose:** name the problem in user-facing terms — not the solution.

**PASS:** describes who has the problem, what they cannot currently do, why that matters. No solution language.
**FAIL:** describes the solution as if it were the problem; vague "improve X"; no user perspective.
**If stuck:** ask the user "who would notice if this didn't exist, and what would they be unable to do?"

## 2. Goals (what success looks like)

**Purpose:** observable outcomes — not features.

**PASS:** 2–5 outcomes, each one verifiable post-build (a user can do X; a metric moves; a class of bugs disappears).
**FAIL:** restates features as goals; outcomes are subjective without verification path.
**If stuck:** for each candidate goal, ask "how would we know this was achieved?" — that answer is the goal.

## 3. Scope (in/out)

**Purpose:** explicit boundary — what this build will and will not address.

Format:
- **In scope:** [list]
- **Out of scope:** [list — explicit, not "everything else"]

**PASS:** out-of-scope list is specific and reflects actual things considered and rejected; not a generic placeholder.
**FAIL:** out-of-scope is empty or "anything not listed above"; reveals nothing about boundary judgments.
**If stuck:** review the conversation for things the user mentioned but explicitly deferred — those go in out-of-scope.

## 4. Constraints

**Purpose:** non-negotiable limits — must be respected by research and architecture.

**PASS:** each constraint has a source (user said X, business rule Y, regulatory requirement Z) and what it constrains.
**FAIL:** vague constraints ("must be performant"); no source attribution.
**If stuck:** if no real constraints emerged, write `_none_`. Do not invent.

## 5. Open Questions

**Purpose:** things the user could not answer that downstream phases must resolve or escalate.

**PASS:** each question names: who/what could answer it (user, research phase, architecture phase), and whether it blocks the next phase.
**FAIL:** open questions buried in prose; no resolver named.
**If stuck:** if no open questions remain, write `_none_`.

## 6. Risks (early signal)

**Purpose:** known concerns even before research — flag them early so research can investigate.

**PASS:** 0–5 risks, each with a single-sentence description and a rough sense of severity.
**FAIL:** generic risk lists ("might fail"); 20+ items because anything could be a risk.
**If stuck:** if no risks emerged, write `_none_`.

---

**Size signal:** typically 1–2 pages. Longer suggests scope creep into research or architecture territory.
**Completion check:** before finalizing, verify the complexity block in frontmatter reflects an honest reading of the spec content. All four fields must be filled.
