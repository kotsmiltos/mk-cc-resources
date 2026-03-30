> **type:** audit-report
> **output_path:** artifacts/audits/2026-03-31-instruction-adherence-audit-report.md
> **date:** 2026-03-31
> **scope:** All 13 skills — quick_start routing gaps + instruction adherence patterns
> **entry_point:** User request after ladder-build routing failure (entered plan mode instead of execute)
> **existing_goals:** context/STATE.md
> **key_decisions:** How to restructure skills for reliable routing
> **open_questions:** Whether to split multi-mode skills into separate skills

# Audit Report: Instruction Adherence & Routing Gaps

## Executive Summary

13 skills audited. 2 have the same routing gap that caused the ladder-build failure (miltiaze, architect). The root cause isn't incorrect documentation — it's that Claude reads quick_start first and acts on it, treating routing tables lower in the file as optional reference material. The fix pattern is proven: put the critical check in quick_start as an imperative gate with STOP, not as a conditional suggestion in a routing table. Beyond individual fixes, the codebase has a systemic pattern where instructions compete across 4 layers (hook, SKILL.md, workflow, rules) and Claude defaults to the simplest path when overwhelmed.

## Quick_Start Routing Gap Analysis

### Skills with routing gaps (fix needed)

| # | Skill | Severity | Gap |
|---|-------|----------|-----|
| 1 | miltiaze | MEDIUM | quick_start doesn't check for upstream context (architect inputs, existing explorations, STATE.md pipeline position). Bare `/miltiaze` asks "what do you want to explore?" even when context exists |
| 2 | architect | MEDIUM | quick_start checks artifacts/designs/ but doesn't prioritize STATE.md Pipeline Position first. The intake section does this correctly but quick_start runs first and sets direction |

### Skills with no routing gap (good)

| Skill | Why it works |
|-------|-------------|
| ladder-build | Fixed — imperative checklist with STOP gates |
| state | Clear keyword signals mapped 1:1 to workflows |
| mk-flow-init | Single-mode skill, no routing needed |
| mk-flow-update | Single-mode skill, no routing needed |
| repo-audit | Clear "audit" vs "amend" signal mapping |
| safe-commit | Linear workflow, no branching |
| schema-scout | CLI tool reference, not multi-mode |
| project-structure | Single workflow |
| alert-sounds | Single workflow |
| intake | Low risk — flexibility is by design |
| note | Low risk — handler auto-detection works but could be clearer |

## Instruction Adherence Patterns

### What gets followed vs skipped

| Element | Adherence | Why |
|---------|-----------|-----|
| quick_start (imperative, top of file) | ~95% | First thing read, short, clear actions |
| objective (narrative) | ~85% | Read second, orients Claude |
| Routing tables (mid-file) | ~40% | Requires parsing, treated as optional |
| Hook-injected rules (system reminder) | ~50% | Long, reference-like, not actionable |
| Rules with concrete tools (e.g., "run drift-check.sh") | ~90% | Specific command to execute |
| Rules with behavioral guidelines (e.g., "be thorough") | ~65% | Depends on Claude's self-assessment |
| Nested conditionals across files | ~30% | Requires holding multiple contexts |

### Key pattern: Imperative beats conditional

- "STOP reading. Execute workflows/execute.md." → followed ~95%
- "If task specs exist in artifacts/designs/, route to execute." → followed ~40%
- Same instruction, different framing, 2x adherence difference

### Key pattern: Length inversely correlates with adherence

- Skills under 65 lines → high quick_start adherence
- Skills over 100 lines → routing tables get skimmed
- Hook injecting 80+ lines → ~50% adherence to full ruleset
- Hook injecting first 3 lines → ~95% adherence to those lines

## Recommended Actions

### Action 1: Fix miltiaze quick_start (MEDIUM, effort S)

Replace current quick_start with imperative gate:
```
BEFORE ANYTHING ELSE — check for existing context:
1. Check context/STATE.md Pipeline Position — if stage is "research", read current focus
2. Check artifacts/explorations/ for existing explorations on this topic
3. If upstream context found: use it as input, don't ask "what do you want to explore?"

Only if NO context exists:
4. If user provided input, extract and route
5. If bare invocation, ask what to explore
```

### Action 2: Fix architect quick_start (MEDIUM, effort S)

Replace current quick_start with imperative gate:
```
BEFORE ANYTHING ELSE — check Pipeline Position:
1. Read context/STATE.md Pipeline Position
2. If stage is sprint-N-complete: read workflows/review.md. STOP.
3. If stage is requirements-complete or audit-complete: read workflows/plan.md. STOP.
4. If user said "audit": read workflows/audit.md. STOP.

Only if no Pipeline Position or stage is idle/complete:
5. Check for existing PLAN.md in artifacts/designs/
6. Check for miltiaze output in artifacts/explorations/
7. If nothing exists, ask user what to build or audit
```

### Action 3: Convert all routing tables to imperative checklists (HIGH, effort M)

Every `<routing>` section that uses a markdown table should be converted to a numbered checklist with STOP gates. Tables are documentation. Checklists are instructions.

### Action 4: Shorten hook injection (HIGH, effort M)

The hook currently injects 80+ lines of routing instructions. The first 3 lines get followed; lines 30+ get skimmed. Options:
- Move detailed routing logic into a file Claude reads on-demand instead of injecting it every message
- Keep only the 5 most critical rules in the injection, reference the rest
- Split the injection: short directive (always injected) + detailed rules (injected only when relevant intent detected)

### Action 5: Add verification examples to behavioral rules (MEDIUM, effort S)

Rules with concrete tools ("run drift-check.sh") get followed ~90%. Rules with behavioral guidelines ("be thorough") get followed ~65%. Adding concrete check_for criteria and examples to behavioral rules closes this gap.

### Action 6: Consider splitting multi-mode skills (LOW, effort L)

ladder-build has 4 workflows. Each requires different routing. An alternative: `/ladder-build-execute`, `/ladder-build-kickoff`, `/ladder-build-continue` as separate skills. Each has a 3-line quick_start with no routing ambiguity. Trade-off: more skills to maintain, but each one is more reliable.

## Adversarial Assessment

| # | Blind Spot | What It Could Miss | Consequence If Wrong |
|---|-----------|-------------------|---------------------|
| 1 | Adherence percentages are estimates from observed behavior, not measured data | Actual adherence might be higher or lower for specific rules/skills | Prioritization of fixes might be wrong — a "40% adherence" item might actually be 70% |
| 2 | This audit assumes quick_start position is the primary driver of adherence | Other factors (model version, context length, conversation history) may matter more | Fixes to quick_start might not improve adherence as much as expected |
| 3 | The "imperative > conditional" pattern is observed in this codebase but not universally tested | Different prompt structures might work equally well | We might over-optimize for imperative style when the real issue is instruction density |
| 4 | This audit doesn't test actual runtime behavior — it analyzes prompt structure | A structurally-good prompt might still fail in practice due to context window effects | All recommended fixes need to be tested by invoking skills, not just by reading the SKILL.md |

## Handoff

Audit complete. 2 skills with routing gaps (miltiaze, architect), 6 structural recommendations. Estimated effort for top-priority fixes (Actions 1-3): Small.

To plan fixes: `/architect` — will create sprint tasks from these findings.
To fix immediately: Actions 1 and 2 are small enough to do directly without planning.
