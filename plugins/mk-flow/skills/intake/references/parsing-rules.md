<parsing_rules>

<type_extraction>
Classify each distinct issue in the user's input into one of these types:

| Type | Signals | Examples |
|------|---------|----------|
| Bug | "broken", "doesn't work", "wrong", "keeps doing", "still broken" | "highlights don't clear after battle" |
| Feature | "I want", "should be able to", "add", "let me" | "let me drag pieces from roster" |
| UI gap | "missing", "no grid", "can't see", "where's the" | "mini board is missing grid lines" |
| Rule/Constraint | "if X then Y", "only when", "unless", "should/shouldn't" | "if in battle, save for later" |
| Question | "what is", "how does", "why", "can we" | "what's a MaterialPropertyBlock?" |
| Thought | "maybe", "at some point", "idea", "we should probably" | "health bars should pulse when low" |

When a signal could match multiple types, prefer the more specific:
- "doesn't work" + existing functionality → Bug (not Feature)
- "doesn't work" + no existing functionality → Feature
- "missing" + was in the plan → Bug
- "missing" + never planned → UI gap or Feature
</type_extraction>

<assumption_surfacing>
For each item, state what you're inferring that the user didn't explicitly say:

Good assumptions:
- "All piece animations, not specific ones" (when user said "animations don't work")
- "Should only rotate on manual action" (when user said "pieces rotate on their own")
- "Should match main board style" (when user said "missing grid lines")

Bad assumptions:
- "This is a problem" (too vague — of course it is)
- "User wants this fixed" (obvious — say HOW you assume it should be fixed)
- "Related to the UI" (too generic — say WHICH part of the UI)

The assumption column is what the user corrects. Make it specific enough to be wrong.
</assumption_surfacing>

<temporal_routing>
When the intent is context_addition, determine WHERE the context belongs:

| Temporal Target | How to Detect | Action |
|---|---|---|
| **current_work** | References current milestone, plan, or active work area | Update current requirements. No amendment |
| **past_work** | References completed milestone, plan, or feature that's already built | Create amendment in STATE.md with NEEDS_AMENDMENT status. Surface at next status check |
| **future_work** | References planned but not-yet-started work, or uses "when we get to", "later", "eventually" | Create forward-note in context/notes/[plan-slug].md. Loaded when that work starts |
| **decision_override** | Contradicts a previous decision logged in STATE.md or BUILD-PLAN.md decisions log | Surface original reasoning with date and context. Ask user to confirm override |
| **general** | Domain knowledge, tool capabilities, preferences not tied to specific work | Save to Claude Code memory as reference type |

To determine temporal target:
1. Read STATE.md for current focus, done items, and decisions
2. Read BUILD-PLAN.md (if exists) for milestone names and structure. Read STATE.md for current status
3. Match the user's context against known completed/current/future work
4. If uncertain, state your assumption: "I'm assuming this is about [completed work X]. Is this an amendment to that, or for the current plan?"
</temporal_routing>

<amendment_format>
When creating an amendment for past work:

```markdown
| ID | Target | What Changed | Status | Added |
|----|--------|-------------|--------|-------|
| A[N] | [completed plan/milestone name] | [what the user wants changed] | NEEDS_AMENDMENT | [YYYY-MM-DD] |
```

Statuses:
- **NEEDS_AMENDMENT** — completed work needs to be changed
- **NEEDS_VERIFICATION** — a previous decision is being questioned
- **NOTED** — forward context for future work
- **DONE** — amendment was implemented and verified
</amendment_format>

<frustration_escalation>
When the frustration_signal intent is detected:

1. Check STATE.md amendments and note-tracker for previous mentions of this topic
2. Count how many times it's been flagged
3. If 3+ mentions: "You've flagged [topic] [N] times now. Let me understand exactly what's wrong so we can scope this properly."
4. Ask for specifics — don't assume
5. Once scoped, add as P0 in note-tracker (if available) or STATE.md blocked section
6. The specific scoping from the user becomes the bug description — not the vague frustration
</frustration_escalation>

<classifier_correction>
When the user says "no, that was a [correct_type]":

1. Reclassify the item immediately
2. Re-route to the correct destination
3. Record the correction in `.claude/mk-flow/intents.yaml`:

```yaml
corrections:
  - text: "[the user's original text]"
    was: "[incorrect classification]"
    should_be: "[correct classification]"
    reason: "[user's explanation if given]"
    date: "[YYYY-MM-DD]"
```

The intent classifier reads these corrections as few-shot examples to improve future accuracy.
</classifier_correction>

<vocabulary_capture>
When the user clarifies what a term means during decomposition or correction:

1. Check if `context/vocabulary.yaml` exists
2. If the term is already there, update or add a new meaning with context clues
3. If the term is new, add it

Examples of triggers:
- "by board I mean the inventory one"
- "highlights = the tile glow effects"
- User corrects an assumption that reveals what a term means in this project

Format in vocabulary.yaml:
```yaml
terms:
  board:
    - context: "battle, pieces, placement"
      means: "The game board where battles happen"
      files: "Assets/Scripts/Board/"
    - context: "inventory, roster, collection"
      means: "The inventory panel showing owned pieces"
      files: "Assets/Scripts/UI/InventoryPanel.cs"
```

The vocabulary file is referenced automatically by the intent classification hook when user terms are ambiguous. It's also used by miltiaze and ladder-build to understand domain language when researching or building.
</vocabulary_capture>

</parsing_rules>
