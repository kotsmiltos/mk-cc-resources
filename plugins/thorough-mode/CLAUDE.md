# Prompt Modifiers

Keyword triggers that inject behavioral rules into the current response.

## Available Modifiers

### `++` / `@thorough` — Thorough Mode
Enforces exhaustive processing:
- Enumerate all items before processing — state the count
- Process every item — never skip, summarize, or batch
- Show intermediate work — don't abbreviate steps
- Verify completeness — count outputs vs inputs at the end
- Include rather than exclude when in doubt

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

## Smart Hints

When you describe the intent without using the keyword (e.g., "don't skip anything", "push it", "show me choices with arrows"), the hook shows a one-line hint suggesting the relevant modifier. Hints are suppressed when the modifier is already active — no nagging.

## Sub-agent Propagation

When dispatching sub-agents while a modifier is active, pass the behavioral instructions through in the agent prompt. The trigger keywords are detected by the hook at the conversation level — sub-agents need the rules stated explicitly in their prompts.
