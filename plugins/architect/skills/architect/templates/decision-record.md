<template>

Use this structure for individual decision records — one file per architectural decision. Decisions are immutable once finalized. They constrain downstream work and are assembled into agent briefs at spawn time. Sequential numbering is global across the scope directory.

Save to: `architecture/decisions/DNNN-[slug].md` (relative to scope root)

```markdown
> **type:** decision
> **id:** D001
> **decided_at:** level-0
> **status:** final
> **modules_affected:** [module-a, module-b]

<!-- Decision IDs are globally sequential across the scope directory.
     Check architecture/decisions/ for the highest existing number before assigning.
     decided_at: the decomposition level where this decision was made (level-0 = architecture phase).
     status: "final" or "superseded-by-DNNN" — never deleted, only superseded.
     modules_affected: every module whose implementation is constrained by this decision. -->

# Decision D001: [Title — What Was Decided]

## Decision

<!-- State the decision in 1-3 sentences. Be precise — an implementation agent
     must be able to determine whether their code complies with this decision
     by reading only this section. -->

[What was decided. Concrete and specific — not "we will use a good approach"
but "all inter-module communication uses JSON-RPC over stdin/stdout".]

## Rationale

<!-- Why this decision was made. Tie to specific constraints, requirements,
     or evidence — not just preference. If this came from a miltiaze exploration
     or user requirement, reference the source. -->

- [Reason 1 — tied to a constraint, requirement, or evidence]
- [Reason 2 — tied to a constraint, requirement, or evidence]

## Alternatives Considered

<!-- Every rejected alternative with the specific reason it was rejected.
     Future sessions need to know what was evaluated and why it lost.
     This prevents re-litigating settled decisions. -->

| Alternative | Why Rejected |
|-------------|-------------|
| [Alternative A] | [Specific reason — not "didn't fit", but why it didn't fit] |
| [Alternative B] | [Specific reason] |

## Constraints This Creates

<!-- What downstream work MUST follow from this decision.
     These become requirements for any task touching the affected modules.
     Be explicit — if a constraint is implied but not stated, agents will miss it. -->

- [Constraint 1 — what implementation agents must follow as a result]
- [Constraint 2 — what implementation agents must follow as a result]

---

**This is final. No implementation agent may revisit this decision.** If new evidence invalidates it, escalate to the orchestrator — do not work around it. A superseding decision (with a new ID) is the only path to change.
```

</template>

<conventions>
- **Immutable once final.** Decision records are never edited after status becomes "final." To change a decision, create a new record and set the old one to "superseded-by-DNNN."
- **Global sequential numbering.** D001, D002, D003... across all decisions in the scope, not per-module. Check the decisions directory before assigning.
- **decided_at uses level notation.** `level-0` = architecture phase (before decomposition), `level-1` = first decomposition pass, etc. This tells agents when the decision was locked in.
- **modules_affected is a filter.** When assembling a brief for module X, only decisions listing X in modules_affected are included. Keep this list accurate — missing a module means the agent won't see the constraint.
- **Alternatives are mandatory.** If no alternatives were considered, the decision wasn't a decision — it was an assumption. Assumptions belong in the brief, not in a decision record.
- **Finality statement is non-negotiable.** Every decision record ends with the finality block. Implementation agents are trained to respect it. Removing it weakens the entire contract system.
- **Supersession chain.** When decision D003 supersedes D001, D001's status becomes "superseded-by-D003" and D003's rationale must explain why D001 was wrong or insufficient.
</conventions>
