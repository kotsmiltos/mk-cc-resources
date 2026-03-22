<required_reading>
Read the PLAN.md for this project before proceeding — you need the Decisions Log context.
</required_reading>

<process>

<step_1_identify_decision>
Determine what decision needs the user's input. This workflow is triggered when:
- The plan workflow encounters a choice where two viable options have genuinely different tradeoffs
- The review workflow finds a critical issue that requires scope or priority decision
- Another workflow explicitly routes here
- The user asks the architect a question that requires a decision

Read the decision context:
- What is the specific choice?
- What constrains the decision? (timeline, technology, dependencies, user preferences)
- What information do the perspective agents' findings provide about this choice?
- What does the PLAN.md Decisions Log say about related prior decisions?
</step_1_identify_decision>

<step_2_frame_the_decision>
Present the decision clearly and concisely. The user should understand the choice without reading the full PLAN.md.

Structure:
```
**Decision needed: [Brief title]**

Context: [1-2 sentences — why this decision matters now]

Option A: [Name]
- What: [What this choice means concretely]
- Pros: [Benefits — tied to project goals]
- Cons: [Drawbacks — tied to project constraints]
- Impact: [How this affects the plan — sprints, timeline, scope]

Option B: [Name]
- What: [What this choice means concretely]
- Pros: [Benefits]
- Cons: [Drawbacks]
- Impact: [How this affects the plan]

[Option C if genuinely distinct — don't pad with a third option for the sake of it]

**My recommendation: [Option X]** because [specific reasoning tied to project context, not generic advice].
```

**Anti-patterns to avoid:**
- Presenting a "choice" where one option is obviously wrong (straw-man)
- Overwhelming the user with too many options (if there are 5+ options, group them first)
- Hiding your recommendation (the user hired a tech lead for a reason — lead)
- Generic reasoning ("Option A is simpler") — tie it to THIS project's specific needs
</step_2_frame_the_decision>

<step_3_get_user_input>
Use AskUserQuestion with the options identified. Include "Other" implicitly (it's always available).

Example:
```
Question: "[Brief decision question]?"
Options:
1. [Option A name] — [One-line description]
2. [Option B name] — [One-line description]
3. [Option C name if applicable] — [One-line description]
```

Wait for the user's response.

If the user picks "Other" and provides custom input:
- Evaluate whether the custom option is viable
- If viable, adopt it
- If it has issues the user might not see, surface them honestly: "That could work, but here's what to watch out for: [specific concern]. Want to proceed anyway?"
</step_3_get_user_input>

<step_4_record_and_update>
**4a. Record the decision:**
Add to PLAN.md Decisions Log:

| # | Decision | Choice | Rationale | Alternatives Considered | Date |
|---|----------|--------|-----------|------------------------|------|
| [Next #] | [What was decided] | [User's choice] | [Why — the user's reasoning + architect's analysis] | [The other options] | [Today] |

**4b. Update affected artifacts:**
- If the decision affects task specs, update them
- If it affects the sprint plan, update PLAN.md Sprint Tracking
- If it affects fitness functions, update them
- If it introduces new risks, add to Risk Register
- Add to Change Log

**4c. Return to caller:**
The ask workflow was triggered by another workflow (plan or review). Return the decision to that workflow so it can continue.

If invoked standalone (user asked /architect a question directly):
- Record the decision
- Summarize what was decided and how it affects the plan
- Suggest next action: "This affects [sprint/task]. Want me to update the plan?" or "No plan changes needed."
</step_4_record_and_update>

</process>

<success_criteria>
- Decision was framed clearly with concrete options and specific tradeoffs
- Recommendation was provided with project-specific reasoning
- User's choice was recorded in the Decisions Log with full context
- Alternatives were recorded (future sessions need to know what was rejected)
- All affected artifacts were updated
- No assumptions were made — the user made the call
</success_criteria>
