<output_template>

Use this structure when producing requirements for the architect. This is NOT an exploration report — it's a requirements document that frames research findings for implementation. The architect reads this to plan sprints and design architecture.

Omit sections that don't apply — NEVER include empty sections.

```markdown
> **type:** requirements
> **output_path:** artifacts/explorations/YYYY-MM-DD-[topic-slug]-requirements.md
> **key_decisions:** [bullet list of decisions made during requirements research]
> **open_questions:** [bullet list of unresolved questions, or "none"]

# Requirements: [Project/Feature Title]

> **TL;DR:** [2-4 sentences. What are we building? What's the recommended approach? What are the key constraints? What's the most important thing the architect needs to know?]

---

### Key Terms
_(Include only if the topic has non-obvious terminology. Omit entirely if all terms are self-explanatory.)_

- **[Term]:** [One-sentence definition.]

---

## What We're Building

[Clear description of the end product from the user's perspective. Not technical — what does it DO? Who uses it? What problem does it solve? This becomes the architect's "Vision" section.]

### User Stories
_(Concrete scenarios that describe how people will use this. The architect derives acceptance criteria from these.)_

1. **As a [role]**, I want to [action] so that [outcome].
2. **As a [role]**, I want to [action] so that [outcome].

---

## Research Findings

### [Perspective 1 Name]: [One-Line Summary]

**Agent:** [Perspective role — e.g., "Technical feasibility analyst"]

[Findings from this perspective. Follow presentation-standards.md formatting.]

**Bottom line:** [1-2 sentence takeaway for this perspective]

---

### [Perspective 2 Name]: [One-Line Summary]

**Agent:** [Perspective role]

[Findings...]

**Bottom line:** [1-2 sentence takeaway]

---

_(Repeat for each perspective — as many as relevant)_

---

## Cross-Perspective Agreements
[Things 2+ perspectives flagged — high confidence findings. The architect can treat these as settled.]

- [Agreement] — flagged by [Perspective A] and [Perspective B]

## Cross-Perspective Disagreements
[Things perspectives disagreed on — these are decisions for the architect. Do NOT resolve them here — surface them clearly.]

- **[Topic]:** [Perspective A] says [X]. [Perspective B] says [Y]. Tradeoff: [what's at stake].

---

## Recommended Solution

### Approach
[The recommended technical approach. If multiple genuine options exist, present them all with tradeoffs — but lead with a recommendation.]

**Key components:**
- [Component] — [what it does, why it's needed]

**Dependencies:** [What this relies on]

**Risks:**
- [Risk] — [mitigation]

**Hard limits:** [What this approach cannot do]

### Alternatives Considered
_(Include only if multiple genuine options exist. No straw-men.)_

| Aspect | Recommended | Alternative A | Alternative B |
|--------|------------|--------------|--------------|
| [Key differentiator] | | | |

---

## Acceptance Criteria
[Testable conditions that define "done" for the whole feature. The architect uses these to verify the final product. Write as assertions.]

- [ ] [User can do X and see Y]
- [ ] [System handles Z gracefully]
- [ ] [Performance: response within N seconds for typical input]
- [ ] [Edge case: empty input produces clear error message]

## Implementation Constraints
[Hard constraints the architect must respect when planning.]

- [Constraint — e.g., "Must follow existing plugin conventions"]
- [Constraint — e.g., "No new runtime dependencies"]
- [Constraint — e.g., "Must work on Windows and Unix"]

## Non-Functional Requirements
_(Omit if not applicable)_

- **Performance:** [Expectations]
- **Security:** [Requirements]
- **Compatibility:** [What it must work with]
- **Maintainability:** [Standards to meet]

---

## Build Plans
_(Structured table for the architect. Same format as exploration reports — this feeds into the architect's sprint planning.)_

| Plan | Goal | Milestones | Effort | Depends On |
|------|------|------------|--------|------------|
| [Plan name] | [What it delivers] | [Count] | S/M/L | [Dependencies or "None"] |

**Recommended order:** [Plan A] → [Plan B] → [Plan C]

---

## Implementation Risks

State 3+ specific ways the recommended approach could fail during implementation. Name the risk, its likelihood (H/M/L), and the mitigation. Cross-reference with perspective agent disagreements — unresolved disagreements are risks by definition. Do NOT write generic hedging ("there could be integration challenges"). Be specific: name the component, the failure mode, and what happens to the project if it occurs.

Each risk must follow this structure:
- **[Risk name]:** [What goes wrong and why] — **Likelihood:** [H/M/L] — **Mitigation:** [concrete action or fallback]

Aggregate risks from all perspective agents here. Risks scattered across individual perspective sections must be collected and deduplicated in this section so the architect has a single view.

---

## Sources

- [Source title] — [URL] — accessed [YYYY-MM-DD]

_(Every source listed here must have been actually used in the research above. No padding.)_
```

</output_template>

<conventions>
- **Frame everything for the architect.** The architect is the primary reader. Implementation details matter. Vague requirements ("make it fast") are forbidden — be specific ("response under 200ms for files under 10MB").
- **User Stories** are the human lens. They ground the technical requirements in real usage. The architect derives task acceptance criteria from these.
- **Cross-Perspective sections are mandatory** when multiple research agents were used. These tell the architect what's settled (agreements) and what needs a decision (disagreements).
- **Acceptance Criteria** are the contract. If the final product meets all of these, the requirements are satisfied. Write them as testable assertions — the architect's QA agents will verify against them.
- **Build Plans table** feeds directly into the architect's sprint planning, just like it feeds into ladder-build's kickoff for standalone builds.
- **Disagreements are surfaced, not resolved.** miltiaze's job is research and framing. The architect resolves disagreements during planning.
</conventions>
