# Assumption Table Template

When decomposing user input, present findings in this format:

```
Here's what I understood. Correct anything that's wrong:

| # | Type       | Item                    | Where          | Assumption                     |
|---|------------|-------------------------|----------------|--------------------------------|
| 1 | [type]     | [short description]     | [location]     | [what you're assuming]         |
| 2 | [type]     | [short description]     | [location]     | [what you're assuming]         |
```

## Column Definitions

- **#**: Sequential number for reference ("2 is wrong — it should be...")
- **Type**: One of: Bug, Feature, UI gap, Rule/Constraint, Question, Thought
- **Item**: Short description of the specific issue or request (not the user's exact words — a clear restatement)
- **Where**: Screen, component, or system area this applies to. Use language the user would recognize
- **Assumption**: What you're inferring that wasn't explicitly stated. This is what the user corrects

## After Confirmation

Show routing with temporal targets:

```
Updated. Routing:
  - #1, #2 → [destination] as [type]
  - #3 → amendment to [completed work] (NEEDS_AMENDMENT)
  - #4 → forward-note for [future plan] (NOTED)
  - #5 → locked constraint for implementation
```

## Simple Input (Skip Table)

If the input is a single, clear request ("fix the button", "build the API"), skip the assumption table entirely. Route directly. The table is for multi-issue or ambiguous input only.
