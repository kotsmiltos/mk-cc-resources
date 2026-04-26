---
artifact: architecture
schema_version: 1
produced_by: /architect
read_by: /build, /review
---

<!--
TEMPLATE CONTRACT — read this before producing output.

Required inputs (read-only): spec (.pipeline/elicitation/SPEC.md), requirements (.pipeline/requirements/REQ.md)
Must NOT contain: implementation source code; restatement of FR/NFR text (reference by ID); long prose justifying every decision (move that to decision-record.md)

Operating contract: think → verify → surface.
ARCH.md is the single source of truth for build and review. Vague architecture
multiplies into vague tasks and vague reviews. Be specific. Decisions go to
decision-record.md; this document is the SHAPE.
-->

## 1. System Overview

**Purpose:** one paragraph + diagram — how the pieces fit together at a glance.

```
{{ARCHITECTURE_DIAGRAM}}
```

**PASS:** prose names the layers/components and their relationships; diagram shows the same things named in the prose; both are aligned with FRs.
**FAIL:** prose talks about features (FR territory); diagram contains components not described in prose.
**If stuck:** start with REQ.md FRs, group them into modules by data/responsibility; that grouping IS the overview.

## 2. Module Definitions

**Purpose:** per-module contract — what each module owns.

For each module:
- **Purpose**: one sentence — why this module exists
- **Responsibilities**: bulleted list — what it does
- **Public API**: function/class signatures or interface descriptions
- **Owns**: data/state this module is the only one allowed to touch

**PASS:** every module has all four fields; no two modules claim the same responsibility; "owns" sections do not overlap.
**FAIL:** modules with overlapping responsibilities; missing "owns"; vague API ("does X stuff").
**If stuck:** if two modules feel like they overlap, they probably should be one module — merge them and document the reason.

## 3. Interface Contracts

**Purpose:** the wire between modules — what flows, in what shape.

For each contract:
- **Provider**: module that exposes it
- **Consumer**: module(s) that depend on it
- **Contract**: input shape, output shape, error modes
- **Stability**: stable | unstable | deprecated

**PASS:** every cross-module call appears as a contract; error modes are listed (not just happy path); stability is set.
**FAIL:** missing contracts for known cross-module flows; "error modes: errors"; stability absent.
**If stuck:** if a contract is unclear, mark stability `unstable` and add to section 7 (Open Decisions).

## 4. Dependency Order

**Purpose:** topological sort — which modules can be built first.

Format:
1. {module} — no dependencies
2. {module} — depends on: [list]

**PASS:** order is a valid topological sort (no module depends on a later-listed one); cycles are explicitly called out and resolved (interface module, dependency injection, etc.).
**FAIL:** circular deps not addressed; order doesn't match what build phase will need.
**If stuck:** if you find a cycle, name it as an open decision in section 7.

## 5. Requirement Traceability

**Purpose:** every FR/NFR maps to one or more tasks.

| Requirement | Task | Status |
|-------------|------|--------|

**PASS:** every FR-NNN and NFR-NNN from REQ.md appears here; status is one of: planned | in-progress | done | deferred (with reason).
**FAIL:** orphan requirements; orphan tasks (tasks not tied to a requirement); silent deferrals.
**If stuck:** if a requirement has no task, either add a task or move the requirement to deferred (with reason); do not leave it floating.

## 6. Sprint Plan

**Purpose:** task breakdown — what gets built when, in dependency order.

For each sprint:

| Task | Module | Depends On | Estimate |
|------|--------|------------|----------|

**PASS:** every task has a module from section 2; dependencies match section 4; estimates are present (rough is fine).
**FAIL:** tasks without modules; deps that don't match the dependency order.
**If stuck:** if you cannot estimate a task, it is too vague — break it down further before listing.

## 7. Open Decisions

**Purpose:** things deferred to user input or future architects — never silently undecided.

Format:
- **OPEN-NNN** — what is undecided + what hinges on it + how it will be resolved (user input, prototype, reference).

**PASS:** each open decision is specific and has a resolution path. Empty list is acceptable when nothing is open.
**FAIL:** vague "might revisit"; open items that should have been decided.
**If stuck:** if you cannot articulate the resolution path, surface it to the user before proceeding.

## 8. Decisions Referenced

**Purpose:** pointers to `.pipeline/decisions/DEC-NNN.md` — every architecturally significant choice.

Format:
- **DEC-NNN** — one-line summary; full rationale lives in the linked decision record.

**PASS:** every architectural choice has a DEC-NNN; one-liners do not duplicate the rationale (which lives in the DEC file).
**FAIL:** decisions inline in this document; missing DECs for choices that affect multiple modules.
**If stuck:** if a choice is small enough that a DEC feels like overkill, inline it in the relevant module section but note "no formal DEC".

---

**Size signal:** scales with system complexity. A bug-fix produces minimal architecture; a new project produces full sections. Adapt depth to `complexity.assessment` from SPEC.md.
**Completion check:** before handing off, verify the requirement traceability table — every FR/NFR from REQ.md must appear with a status.
