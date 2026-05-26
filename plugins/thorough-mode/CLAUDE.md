# Prompt Modifiers

Keyword triggers that inject behavioral rules into the current response.

## Available Modifiers

### `++` / `@thorough` — Thorough Mode
Be thorough, not hasty — take the time to do it right:
- Read and understand fully before acting — don't skim or assume
- Don't skip, drop, or silently omit things
- Don't take shortcuts that sacrifice quality — prefer careful over fast
- Handle each item properly — don't batch, merge, or hand-wave
- Include rather than exclude when in doubt
- Go back and fix if you missed something

### `@ship` — Pre-Push Checklist
Enforces documentation and versioning hygiene before pushing:
- README.md reflects new features and changed behavior
- CHANGELOG / RELEASE-NOTES have entries for the changes
- Version numbers are bumped (package.json, plugin.json, marketplace.json)
- CLAUDE.md reflects new patterns or conventions
- New skills/commands/hooks are documented
- Reports what was checked and updated before pushing

### `@present` — Interactive Question Format
Forces all choices and decisions through `AskUserQuestion` with arrow-key navigation:
- No inline A/B/C or numbered option lists in the response body
- Uses labels, descriptions, previews, and multiSelect as appropriate
- Batches up to 4 independent decisions per call
- Recommended option listed first

### `@debug` — Root Cause Investigation
Enforces investigation before fixing:
- Read relevant code first — understand what it does and WHY
- Find the ROOT CAUSE, not just the symptom — trace back to origin
- Check for patterns — similar issues in related files?
- Propose fix with rationale BEFORE implementing
- Never layer patches on patches — fix the design if wrong

### `@verify` — Paranoid Verification
Proves every claim with evidence before declaring done:
- Verify the RESULT, not what you wrote — check files exist, tests pass, hooks fire
- State the verifiable check: "tests pass + parseX returns Y" not "done"
- Run test suite after EACH change, not at end of batch
- Verify by reading code, not by checking file exists (existence ≠ implementation)
- If you can't verify, say so explicitly

### `@fresh` — Context Refresh
Forces re-reading key files and verifying against current state:
- Re-read key files NOW — don't trust compressed/summarized earlier reads
- After multi-step work, run verification tools
- When instructions reference multiple files, verify EACH against current disk
- Assume mental model has drifted in long conversations — check, don't assume

## Smart Hints

When you describe the intent without using the keyword (e.g., "don't skip anything", "push it", "show me choices with arrows"), the hook shows a one-line hint suggesting the relevant modifier. Hints are suppressed when the modifier is already active — no nagging.

## Sub-agent Propagation

When dispatching sub-agents while a modifier is active, pass the behavioral instructions through in the agent prompt. The trigger keywords are detected by the hook at the conversation level — sub-agents need the rules stated explicitly in their prompts.
