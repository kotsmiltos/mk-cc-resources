---
artifact: qa-report
schema_version: 2
produced_by: /review
read_by: /triage
sprint: "{{SPRINT}}"
verdict: pass | fail
blocks_advance_count: 0
findings_total: 0
---

<!--
TEMPLATE CONTRACT — read this before producing output.

Required inputs (read-only): spec (.pipeline/elicitation/SPEC.md), changed_files (sprint working tree), task acceptance criteria
Must NOT contain: findings without a verbatim quote + file path + line number; findings without reproduction steps; severity inferred from keywords (must be declared by the validator agent)

Operating contract: think → verify → surface.
Before surfacing a finding — verify the verbatim quote exists on disk at the cited file and line.
Every finding must declare blocks_advance at write time. The triage phase routes by counting blocks_advance, not by interpreting severity.
-->

## 1. Acceptance Criteria Verification

**Purpose:** for each task in the sprint, did the acceptance criteria from its task-spec land?

| Task ID | Criterion | Result | Evidence |
|---------|-----------|--------|----------|
| TASK-N | acceptance criterion text | met \| not-met \| partial | file:line or test name |

**PASS:** every task in the sprint has at least one row; every "not-met" or "partial" has evidence pointing to the gap; verdicts are deterministic (a test ran, a file was inspected) — not impressions.
**FAIL:** missing tasks; "met" without evidence; criteria reworded from the task spec.
**If stuck:** if criterion is subjective (UX, naming) and cannot be deterministically verified, mark `partial` and create a finding for it in section 4.

## 2. Findings (the meat of this report)

**Purpose:** every issue found during review, with the evidence and importance declared at write time.

Format — one block per finding:

```yaml
- id: FIND-NNN
  severity: critical | high | medium | low
  blocks_advance: yes | no            # declared, not inferred — see assignment rule below
  category: correctness | security | spec-compliance | code-quality
  verdict: CONFIRMED | LIKELY | SUSPECTED
  file: path/to/file.js
  line: 123
  quote: |
    verbatim text from the file at line — at least 20 chars
  reproduction: |
    exact steps that demonstrate the issue
  reason: |
    why this is a problem (one to two sentences)
```

**blocks_advance assignment rule** (declared at write time, named in lib/constants.js):
- `severity: critical` AND `verdict: CONFIRMED` → `blocks_advance: yes`
- `severity: high` AND `verdict: CONFIRMED` → `blocks_advance: yes`
- everything else → `blocks_advance: no`

**PASS:** every finding has all fields filled; quote is verbatim from on-disk content; line number is real; blocks_advance follows the rule; no field is inferred from another after the fact.
**FAIL:** quote paraphrased or invented; line number absent; blocks_advance inferred by reader instead of declared; severity from keyword scanning.
**If stuck:** if you cannot find a verbatim quote that supports a finding, the finding is fabricated — drop it. Do not soften it; do not promote suspicion as a finding without evidence.

## 3. Frontmatter Reconciliation

**Purpose:** the counts in frontmatter must match the findings list.

Verify before completing:
- `findings_total` equals the number of finding blocks in section 2
- `blocks_advance_count` equals the count of findings where `blocks_advance: yes`
- `verdict: pass` requires `blocks_advance_count == 0`
- `verdict: fail` requires `blocks_advance_count > 0`

**PASS:** all four equalities hold; no manual mismatch.
**FAIL:** counts disagree; verdict contradicts blocks_advance_count.
**If stuck:** recount mechanically — `grep "blocks_advance: yes"` on this report.

## 4. Notes for Triage

**Purpose:** brief routing hints for the triage phase — not interpretation.

**PASS:** points to FIND-IDs that span multiple categories (so triage knows secondary concerns); empty section is acceptable when routing is unambiguous.
**FAIL:** opinion-laden language ("this is a serious problem"); restates findings; tells triage what to do.
**If stuck:** if there are no special routing notes, leave the section header with `_none_`.

---

**Size signal:** scales with finding count, not prose. The report is a finding list — not a narrative.
**Completion check:** before handing off, run section 3 reconciliation. If counts disagree, fix the source of truth (findings list) — not the frontmatter.

<!-- QA_SENTINEL sprint:{{SPRINT}} verdict:{{VERDICT}} blocks_advance_count:{{BLOCKS_ADVANCE_COUNT}} findings_total:{{FINDINGS_TOTAL}} -->
