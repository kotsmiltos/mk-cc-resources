<template>

Use this structure for audit reports — the output of the audit workflow when assessing an existing codebase. Each finding is specific and actionable.

Save to: `artifacts/audits/YYYY-MM-DD-[slug]-audit-report.md`

```markdown
> **type:** audit-report
> **output_path:** artifacts/audits/YYYY-MM-DD-[slug]-audit-report.md
> **date:** YYYY-MM-DD
> **scope:** [What was assessed — full codebase, specific module, specific concern]
> **entry_point:** [What triggered this audit — user request, pre-build assessment, periodic review]
> **existing_goals:** [Path to STATE.md, BUILD-PLAN.md, or REQUIREMENTS.md if they exist]
> **key_decisions:** [key findings that require decisions — list finding IDs, e.g., IQ-1, AC-3]
> **open_questions:** [unresolved items from the audit, or "none"]

# Audit Report: [Project/Codebase Name]

## Executive Summary
[3-5 sentences. What's the overall state? What are the biggest risks? What's the recommended next action? Write for the user (client), not a developer.]

## Assessment by Perspective

### Implementation Quality
**Agent:** Implementation quality perspective
**Overall:** Strong | Adequate | Needs Work | Critical Issues

| # | Finding | Severity | File(s) | Recommendation |
|---|---------|----------|---------|----------------|
| IQ-1 | [Specific issue — not vague] | Low/Med/High/Critical | `path/file.ext:line` | [Specific fix] |

### Risk & Vulnerability
**Agent:** Risk and vulnerability perspective
**Overall:** Strong | Adequate | Needs Work | Critical Issues

| # | Finding | Severity | File(s) | Recommendation |
|---|---------|----------|---------|----------------|
| RV-1 | [Specific issue] | Low/Med/High/Critical | `path/file.ext:line` | [Specific fix] |

### Architecture Coherence
**Agent:** Architecture coherence perspective
**Overall:** Strong | Adequate | Needs Work | Critical Issues

| # | Finding | Severity | File(s) | Recommendation |
|---|---------|----------|---------|----------------|
| AC-1 | [Specific issue] | Low/Med/High/Critical | `path/file.ext:line` | [Specific fix] |

### Future-Proofing
**Agent:** Future-proofing perspective
**Overall:** Strong | Adequate | Needs Work | Critical Issues

| # | Finding | Severity | File(s) | Recommendation |
|---|---------|----------|---------|----------------|
| FP-1 | [Specific issue] | Low/Med/High/Critical | `path/file.ext:line` | [Specific fix] |

### Practice Compliance
**Agent:** Practice compliance perspective
**Overall:** Strong | Adequate | Needs Work | Critical Issues

| # | Finding | Severity | File(s) | Recommendation |
|---|---------|----------|---------|----------------|
| PC-1 | [Specific issue] | Low/Med/High/Critical | `path/file.ext:line` | [Specific fix] |

### Goal Alignment
**Agent:** Goal alignment perspective
**Overall:** On Track | Minor Drift | Significant Drift | Off Track

| # | Finding | Severity | File(s) | Recommendation |
|---|---------|----------|---------|----------------|
| GA-1 | [Specific issue] | Low/Med/High/Critical | Reference | [Specific action] |

## Cross-Perspective Agreements
[Things multiple agents flagged — high confidence findings.]

- [Finding] — flagged by [Agent A] and [Agent B]

## Cross-Perspective Disagreements
[Things agents disagreed on — these are important decisions.]

- [Topic] — [Agent A] says [X], [Agent B] says [Y]. Recommendation: [Z]

## Priority Matrix

| Priority | Findings | Rationale |
|----------|----------|-----------|
| Fix Now (Critical) | [IDs] | [Why these can't wait] |
| Fix Soon (High) | [IDs] | [Why these matter] |
| Plan For (Medium) | [IDs] | [Why these should be scheduled] |
| Note (Low) | [IDs] | [Why these are worth knowing] |

## Recommended Actions
[Ordered list of what the architect should plan for. This feeds directly into the plan workflow.]

1. [Action] — addresses findings [IDs]. Estimated effort: S/M/L
2. [Action] — addresses findings [IDs]. Estimated effort: S/M/L

## Adversarial Assessment
[State 3+ ways this audit's findings could be wrong, incomplete, or misleading. For each: name the blind spot, what it could miss, and what the consequence would be if the audit is wrong about it.]

| # | Blind Spot | What It Could Miss | Consequence If Wrong |
|---|-----------|-------------------|---------------------|
| 1 | [Where the audit methodology has a gap] | [What problems could slip through] | [What happens if this gap matters] |
| 2 | [Where the audit methodology has a gap] | [What problems could slip through] | [What happens if this gap matters] |
| 3 | [Where the audit methodology has a gap] | [What problems could slip through] | [What happens if this gap matters] |

[If the audit gives a clean bill of health, what could still be broken? If the audit found many issues, what patterns might the methodology amplify or suppress? Do NOT produce generic disclaimers — name specific areas this audit could not adequately assess and why.]

## Handoff
[Next step suggestion for the user.]

Audit complete. [N] findings across [M] perspectives. [X] critical, [Y] high priority.
Recommended next step: `/architect` to plan improvements based on these findings.
```

</template>

<conventions>
- **Every finding is specific.** "Code quality could be improved" is not a finding. "Function `parse_input` in `parser.py:45` has a bare except clause that swallows errors silently" IS a finding.
- **File paths include line numbers** where possible (`file.ext:line`).
- **Severity levels:** Critical = broken/security risk, High = degrades quality significantly, Medium = should be fixed, Low = nice to have.
- **Cross-perspective sections are mandatory.** Agreements give confidence. Disagreements surface decisions. Both are more valuable than individual findings.
- **Priority Matrix** groups findings by urgency, not by perspective. This is what the architect acts on.
- **Recommended Actions** are architect-ready — they map directly to sprint tasks.
</conventions>
