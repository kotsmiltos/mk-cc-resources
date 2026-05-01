---
description: Turn project pitch into build-ready SPEC.md through collaborative ideation.
---

Invoke the `essense-flow:elicit` skill in the current working directory.

Arguments (free-form): the project pitch. Pass to the skill as the initial input.

If `state.phase` is `eliciting`, this is a resume — load existing SPEC.md and continue the elicitation loop. If `idle`, enter elicitation fresh.

Use `AskUserQuestion` with arrow-key options for every choice. Never inline A/B/C.
