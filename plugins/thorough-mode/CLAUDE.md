# Thorough Mode

## Usage

Type `++` or `@thorough` anywhere in your prompt to activate thorough mode for that response.

## What it does

When activated, thorough mode enforces exhaustive processing:
- Enumerate all items before processing — state the count
- Process every item — never skip, summarize, or batch
- Show intermediate work — don't abbreviate steps
- Verify completeness — count outputs vs inputs at the end
- Include rather than exclude when in doubt

## Sub-agent propagation

When dispatching sub-agents while thorough mode is active, pass the behavioral instructions through in the agent prompt. The trigger keywords (`++` / `@thorough`) are detected by the hook at the conversation level — sub-agents need the rules stated explicitly in their prompts.
