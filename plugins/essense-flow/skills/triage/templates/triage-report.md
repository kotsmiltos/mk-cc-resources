---
artifact: triage-report
schema_version: 1
produced_by: /triage
read_by: next phase (whichever this report routes to)
sprint: "{{SPRINT}}"
route: /elicit | /research | /architect | /build | /verify | complete
blocks_advance_count: 0
findings_total: 0
---

<!--
TEMPLATE CONTRACT — read this before producing output.

Required inputs (read-only): current_sprint_findings (.pipeline/reviews/sprint-N/QA-REPORT.md)
Must NOT contain: re-stated findings (reference by FIND-ID), opinion on findings without evidence, routing inferred from severity keywords (use blocks_advance_count from QA-REPORT)

Operating contract: think → verify → surface.
Before routing — confirm the finding count from blocks_advance_count, not from reading severity labels.
If routing is genuinely ambiguous, attempt the "If stuck" approach. Surface to the user
only after a genuine attempt fails.
-->

## 1. Findings Summary (counts only)

**Purpose:** numerical picture — counts, not content.

Format:
- Total findings: N
- blocks_advance: yes (N) / no (N)
- By category: correctness (N), security (N), spec-compliance (N), code-quality (N)

**PASS:** counts derived from QA-REPORT.md fields, not from re-reading prose; matches frontmatter blocks_advance_count.
**FAIL:** counts disagree with QA-REPORT; categories invented; numbers approximated.
**If stuck:** the source of truth is QA-REPORT.md frontmatter — re-read it.

## 2. Routing Decision

**Purpose:** the single decision this report exists to produce.

Format:
- **Route:** /elicit | /research | /architect | /build | /verify | complete
- **Reason:** one sentence

Routing rule (deterministic — do not improvise):
- `blocks_advance_count == 0` AND verify not yet run → `/verify`
- `blocks_advance_count == 0` AND verify passed → `complete`
- `blocks_advance_count > 0` AND failures are spec gaps → `/elicit`
- `blocks_advance_count > 0` AND failures are unknown-driven → `/research`
- `blocks_advance_count > 0` AND failures are design issues → `/architect`
- `blocks_advance_count > 0` AND failures are implementation bugs → `/build` (fix sprint)

**PASS:** route matches the rule above given the input counts; reason cites blocks_advance_count, not severity.
**FAIL:** route picked from gut; reason mentions "looks bad" or vague concern; rule above ignored.
**If stuck:** if findings span multiple categories, route to the earliest pipeline phase that can address the dominant category — and note the secondary category in section 4.

## 3. Categorized Items (pointers, not restatements)

**Purpose:** group findings by which phase will address them — point to FIND-IDs, do not restate.

Format — one row per category that has findings:
| Category | FIND-IDs | Routes via | Notes |
|----------|----------|------------|-------|
| spec-gap | FIND-007, FIND-012 | /elicit | one-line note if needed |

**PASS:** every blocks_advance:yes finding appears in exactly one row; FIND-IDs are real (cross-checkable in QA-REPORT.md).
**FAIL:** findings duplicated across categories; FIND-IDs hallucinated; categories invented.
**If stuck:** when uncertain about category, prefer the earliest pipeline phase that could address it.

## 4. Deferred / Acknowledged Items

**Purpose:** findings that are real but not blocking — they should not delay advance but must be tracked.

Format — one row per item:
| FIND-ID | Reason for deferring | Track where |
|---------|----------------------|-------------|
| FIND-NN | one sentence | next sprint, backlog, etc. |

**PASS:** every blocks_advance:no finding appears here OR is explicitly noted as not requiring tracking; tracking destination is real.
**FAIL:** "various low-priority items" without enumeration; deferred items disappear without trace.
**If stuck:** if there are no deferred items, write `_none_`.

---

**Size signal:** typically half a page. This is a routing report, not a findings document.
**Completion check:** before handing off, confirm `route` in frontmatter matches the rule in section 2 given the input counts.
