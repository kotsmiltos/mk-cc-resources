---
name: intake
description: Decompose any user input — dense bug reports, multi-issue messages, stream-of-consciousness thoughts — into structured, actionable items with an assumption table. Routes items to the right skill based on type and temporal target. Use when input contains multiple issues or needs decomposition before acting.
---

<objective>
Take messy, multi-issue user input and decompose it into structured items with types, locations, and explicit assumptions. Present an assumption table for user confirmation, then route each item to the appropriate skill (note-tracker for bugs, ladder-build for features, memory for thoughts, STATE.md for amendments). Handle temporal routing — determine if context applies to current work, past/completed work (amendment), future planned work (forward-note), or general knowledge.
</objective>

<quick_start>
If the user provided input with their invocation, analyze it immediately. If the input is simple and clear (single issue, obvious intent), skip the assumption table and route directly. If the input is dense or multi-issue, decompose into the assumption table.
</quick_start>

<essential_principles>
<core_rules>
1. **Decompose before acting.** Never start working on dense input without first showing what you understood.
2. **Assumption table for multi-issue input.** Single clear requests skip the table.
3. **Temporal routing is mandatory.** Every context addition must be classified: current work, past work (amendment), future work (forward-note), decision override, or general.
4. **Amendments track changes to completed work.** When new context touches something already built, create an amendment entry in STATE.md with NEEDS_AMENDMENT status.
5. **Decision overrides surface original reasoning.** When the user contradicts a previous decision, show why that decision was made before accepting the override.
6. **One round-trip for confirmation.** Present the table, user corrects by number or says "looks good", then route. No multi-round clarification loops.
7. **Classifier corrections update intents.yaml.** When the user says "no, that was a bug", reclassify, re-route, and record the correction.
</core_rules>
</essential_principles>

<reference_index>
All in `references/`:

| Reference | Purpose |
|-----------|---------|
| parsing-rules.md | Type extraction, assumption surfacing, temporal routing rules |
</reference_index>

<templates_index>
All in `templates/`:

| Template | Purpose |
|----------|---------|
| assumption-table.md | Format for presenting decomposed items to user |
</templates_index>

<routing>
This skill is invoked explicitly via `/intake` or automatically when the intent classifier detects multi-issue input. After decomposition and confirmation, items are routed to:

| Item Type | Destination |
|-----------|-------------|
| Bug | note-tracker (if available) or STATE.md blocked section |
| Feature | Current plan milestones or new plan via ladder-build |
| UI gap | Amendment if completed work, otherwise current plan |
| Rule/Constraint | Locked decision for current or future plan |
| Question | note-tracker (if available) or direct answer |
| Thought | Forward-note in context/notes/ or STATE.md amendments |
| General knowledge | Claude Code memory (reference type) |
</routing>

<success_criteria>
- Multi-issue input decomposed into correct number of items
- Each item has: type, description, location, assumption
- Temporal routing correctly identifies current/past/future/override/general
- Amendments created for past-work context with NEEDS_AMENDMENT status
- Decision overrides surface original reasoning
- Simple input skips the table and routes directly
- Classifier corrections recorded in intents.yaml
</success_criteria>
