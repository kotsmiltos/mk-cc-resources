> **type:** qa-report
> **output_path:** artifacts/designs/essense-flow-pipeline/sprints/sprint-3/QA-REPORT.md
> **date:** 2026-04-10
> **plan:** artifacts/designs/essense-flow-pipeline/PLAN.md
> **overall_result:** PASS (8 autonomous fixes applied, 6 improvements noted)
> **key_decisions:** none
> **open_questions:** none

# QA Report: Sprint 3

## Summary
- Task spec compliance: ~85% — core functionality fully working, gaps in failure-path handling
- Requirements alignment: Strong — all 15 checked requirements addressed, no scope creep
- Fitness functions: 7/7 pass
- Adversarial tests: 48 scenarios tested, 6 critical/high risks identified
- Tests: 99/99 passing after autonomous fixes

## Critical Issues

None blocking. All critical findings were either autonomously fixed or are deferred design decisions for sprint 4+.

## Autonomous Fixes Applied

| Fix | File | What Changed |
|-----|------|-------------|
| Windows line-ending normalization | `lib/brief-assembly.js` | `splitFrontmatter` now normalizes `\r\n` to `\n` before parsing |
| Magic number: sentinel scan | `lib/agent-output.js` | Extracted `500` to named constant `SENTINEL_SCAN_CHARS` |
| Zero-agent quorum guard | `lib/agent-output.js` | `checkQuorum` returns `met: false` when results array is empty |
| Config validation | `lib/tokens.js` | `checkBudget` throws descriptive error if config or token_budgets is missing |
| Module-level OVERLAP_THRESHOLD | `lib/synthesis.js` | Moved from local scope in `contentAgreement` to module-level constant |
| Dead code: REQUIREMENTS_TEMPLATE_REL | `skills/research/scripts/research-runner.js` | Removed unused constant |
| Dead code: sentinel variable | `skills/research/scripts/research-runner.js` | Removed unused `sentinel` variable in `parseAgentOutputs` |
| Input validation | `skills/research/scripts/research-runner.js` | `assemblePerspectiveBriefs` rejects null/empty problem statements and empty lens arrays |

## High Priority

### H1: First-responder bias in alignment matrix
**File:** `lib/synthesis.js` `buildAlignmentMatrix()`
**Issue:** First responding agent is always set to AGREES and used as comparison baseline. If agents 2+3 agree with each other but disagree with agent 1, they're both marked DISAGREES. Corrupts majority detection.
**Fix:** Use pairwise comparison and cluster into agreement groups. Majority group determines the AGREES position.
**Effort:** M

### H2: Budget check measures sections, not final brief
**File:** `lib/brief-assembly.js` `assembleBrief()`
**Issue:** Token budget is checked on the `sections` parameter, but the final brief includes metadata header + template boilerplate that aren't counted. A brief could pass the check but exceed the actual ceiling.
**Fix:** After assembly, run `countTokens` on the complete brief string and compare against ceiling.
**Effort:** S

### H3: truncateSection never wired into assembleBrief
**File:** `lib/brief-assembly.js`
**Issue:** Per BRIEF-PROTOCOL.md, oversized sections should be truncated with a warning (step 2c), then the total is checked (step 4). Implementation skips truncation and rejects outright.
**Fix:** Add truncation step before budget rejection. Use `truncateSection` for sections exceeding their budget, collect warnings, then check total.
**Effort:** M

### H4: XML injection via closing delimiters
**Files:** `lib/brief-assembly.js` `wrapDataBlock()`, `lib/agent-output.js`
**Issue:** Content containing `</data-block>` or `</agent-output>` breaks wrapping structure. Regex parser can't handle nested same-name tags.
**Fix:** Escape closing delimiters in content before wrapping. Consider CDATA-like encoding.
**Effort:** S

### H5: Scope overflow detection unimplemented
**File:** `lib/agent-output.js`
**Issue:** `FAILURE_MODES.SCOPE_OVERFLOW` defined but never used. Spec requires detecting and stripping out-of-scope sections.
**Fix:** Requires knowing what sections were requested (brief context). Implement when dispatch lib provides brief-to-output mapping.
**Effort:** M — deferred to sprint 4 (needs dispatch lib)

### H6: Silent REQ.md overwrite without backup
**File:** `skills/research/scripts/research-runner.js` `writeRequirements()`
**Issue:** Uses `fs.writeFileSync` without backup, unlike `yaml-io.safeWrite` which creates `.bak` files.
**Fix:** Create `.bak` of existing REQ.md before overwriting.
**Effort:** S

## Medium Priority

| Finding | File | Description | Effort |
|---------|------|-------------|--------|
| M1: Content agreement asymmetry | `lib/synthesis.js` | Short content trivially "agrees" with longer content via smaller-set overlap | S |
| M2: Markdown content escaping | `skills/research/scripts/research-runner.js` | Pipe chars and newlines in entity content break markdown tables/bullets | S |
| M3: extractTag regex injection | `lib/agent-output.js` | Tag names are not sanitized — metacharacters could corrupt regex | S |
| M4: Hook scripts duplicate findPipelineDir | `hooks/scripts/*.js` | Identical directory-walk logic copy-pasted 3 times | S |
| M5: wrapDataBlock not called for dynamic content | `skills/research/scripts/research-runner.js` | SIBLING_CONTEXT binding will need wrapping when populated in future batches | S |
| M6: Entity name fuzzy matching | `lib/synthesis.js` | `Auth/OAuth 2.0` vs `Auth/OAuth2.0` treated as separate entities | M |

## Low Priority

- Self-closing XML tags silently ignored
- No range validation on safety margin percentage
- Negative criteria numbers accepted
- UTF-8 truncation could split multi-byte characters

## New Fitness Functions Proposed

- [ ] All dynamic content inlined into briefs is wrapped in `<data-block>` delimiters
- [ ] No magic numbers in lib/ or skills/ code — all numeric literals must be named constants
- [ ] lib/ modules never import from skills/
- [ ] Generated artifacts (REQ.md, synthesis.md) always have valid YAML frontmatter with schema_version
- [ ] All exports in lib/ modules are covered by at least one test

## Recommendations for Next Sprint

1. Include H1 (alignment matrix fix) and H2 (budget check on final brief) as sprint 4 tasks — they affect correctness
2. H3 (truncation wiring) and H6 (backup before overwrite) are lower priority but should be scheduled
3. H5 (scope overflow) deferred to sprint 4 where it naturally fits with the dispatch lib
4. Medium priority items can be bundled as a single "hardening" task
