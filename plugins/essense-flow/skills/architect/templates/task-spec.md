---
artifact: task-spec
schema_version: 1
produced_by: /architect
read_by: /build
id: "{{TASK_ID}}"
sprint: "{{SPRINT}}"
module: "{{MODULE}}"
depends_on: []
decisions_applied: []
---

<!--
TEMPLATE CONTRACT — read this before producing output.

Required inputs (read-only): architecture (.pipeline/architecture/ARCH.md), spec (.pipeline/elicitation/SPEC.md), upstream task-specs this depends on
Must NOT contain: full source code, restatement of architecture rationale, narrative about why the architect made this decision

Operating contract: think → verify → surface.
A task-spec is the contract the build phase will be held to. Be explicit and specific.
If the task is mechanical (rename, single-function tweak), the optional sections at the bottom should be omitted — not filled with placeholders.
-->

## 1. Objective

**Purpose:** one paragraph — what this task changes about the system.

**PASS:** names the file or module being changed, the behavior being added/altered/removed, and why this task exists (cross-reference to architecture decisions).
**FAIL:** vague "improve X"; objective restates the task ID; no link to architecture intent.
**If stuck:** if you cannot say what changes after this task lands, the task is not specified — go back to architecture.

## 2. Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| path/to/file.js | create \| modify \| delete | one-line note |

**PASS:** every file the build phase will touch is listed; action and purpose are specific.
**FAIL:** "various files"; paths invented; missing files that the objective implies must change.
**If stuck:** trace the objective through the architecture document — every named file there is a candidate.

## 3. Acceptance Criteria

**Purpose:** the deterministic checks a reviewer will use to verify this task landed.

Format — checkbox list:
- [ ] specific verifiable claim (e.g. "function `foo` returns `null` when input is empty")
- [ ] specific verifiable claim
- [ ] tests added: `tests/foo.test.js` covers the new branch

**PASS:** every criterion is verifiable by reading code or running tests; the criteria collectively prove the objective landed.
**FAIL:** criteria like "code is clean"; criteria not derivable from the objective; no test criterion when the change is non-trivial.
**If stuck:** for each criterion, ask "what command or inspection would prove this is true?" — if nothing, rewrite the criterion.

## 4. Interfaces (include when load-bearing — omit otherwise)

**Purpose:** input/output contracts at module boundaries — only when this task changes a public interface.

**PASS:** when present — names function/method, lists arg types, return type, and any thrown/error conditions.
**FAIL:** present but empty; restates objective; describes private internals.
**If stuck:** if this task is purely internal refactor, omit this section entirely.

## 5. Constraints (include when load-bearing — omit otherwise)

**Purpose:** limits the build phase must respect that are not obvious from the architecture document.

**PASS:** when present — each constraint has a source (a specific architecture decision, a deterministic test that must continue passing, a perf/security requirement) and what it forbids.
**FAIL:** generic "follow conventions"; constraints unrelated to this task.
**If stuck:** omit if no task-specific constraints apply.

## 6. Edge Cases (include when load-bearing — omit otherwise)

**Purpose:** input/state combinations the implementation must handle correctly.

**PASS:** when present — each edge case names the input/state and the expected behavior.
**FAIL:** speculative "what if..." without concrete input.
**If stuck:** omit if the task is mechanical and edge cases are obvious from the type signature.

## 7. Rationale (include for non-obvious tasks — omit otherwise)

**Purpose:** why this task exists at all — only when build phase is likely to question the approach.

**PASS:** when present — short paragraph linking to architecture decisions or to specific findings being addressed.
**FAIL:** restates the architecture document; reads like a sales pitch.
**If stuck:** if the task is straightforward, omit this section.

---

**Size signal:** scales with task complexity. Mechanical tasks should fit half a page; system-level tasks may span more but should still be scannable.
**Completion check:** before handing off, walk every acceptance criterion and ask "could a builder verify this without asking me?" If no, the criterion needs to be more specific.
