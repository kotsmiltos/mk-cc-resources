---
artifact: build-report
schema_version: 1
produced_by: /build
read_by: /review
sprint: "{{SPRINT}}"
status: pass | fail | partial
---

<!--
TEMPLATE CONTRACT — read this before producing output.

Required inputs (read-only): architecture (.pipeline/architecture/ARCH.md), current_task specs (sprint-N/tasks/)
Must NOT contain: restatement of ARCH.md content, full source code of changed files, narrative prose unrelated to acceptance criteria

Operating contract: think → verify → surface.
Before handing off this report, verify each section against its PASS criteria below.
If a section cannot be completed, attempt the "If stuck" approach. Surface as explicit
question to the user only after a genuine attempt fails.
-->

## 1. Sprint Summary

**Purpose:** orient the reviewer in one paragraph — what was attempted and what landed.

**PASS:** names sprint number, total tasks, tasks complete, tasks failed (if any), whether all acceptance criteria were met.
**FAIL:** vague summary; missing task count; no acceptance verdict.
**If stuck:** read sprint-N/sprint-tasks.md and sprint-N/completion-report.md; reconcile what was attempted vs. what landed.

## 2. Task Outcomes

**Purpose:** per-task result so reviewer can scope what to inspect.

Format — one row per task:
| Task ID | Status | Files touched | Notes |
|---------|--------|---------------|-------|
| TASK-N | ✓ complete \| ✗ failed \| ⚠ deviated | path/to/file.js, ... | one-line note (required if failed or deviated; else omit) |

**PASS:** every task in sprint plan accounted for; each failed/deviated row has a note; file list reflects actual changes.
**FAIL:** missing tasks; uniform "complete" without verifying; file paths invented or absent.
**If stuck:** check `git diff` against sprint baseline to confirm files actually changed.

## 3. Test Results

**Purpose:** confirm deterministic gate ran and passed (or document failure).

**PASS:** states which test command was run, exit code, pass/fail count. If lint configured, same fields. If gate skipped, names the reason (no test script, no package.json).
**FAIL:** absent; "tests run" without numbers; success claimed without command output.
**If stuck:** run the gate manually (`npm test`) and capture the output verbatim.

## 4. Known Issues / Deferred Work

**Purpose:** list anything that did not land in this sprint and the reason — must be honest about scope reductions.

**PASS:** explicit list with reason per item (out of scope, blocked, deferred to next sprint with link). Empty list is acceptable if truly nothing deferred.
**FAIL:** "no known issues" when sprint had failed tasks; vague "minor things remain".
**If stuck:** review failed/deviated rows from section 2 — those are candidates.

## 5. Handoff Notes for Review

**Purpose:** point the reviewer at the highest-value places to inspect, not paraphrase the work.

**PASS:** lists 1–3 specific files/functions that warrant careful review and why; references task IDs from section 2.
**FAIL:** generic "review everything"; no specific paths.
**If stuck:** look at task acceptance criteria — anything subjective (UX, naming, structure) goes here.

---

**Size signal:** roughly one screen. If significantly longer, you are restating instead of summarizing.
**Completion check:** before handing off, verify each section against its PASS criteria. Section absent or below PASS → not done.
