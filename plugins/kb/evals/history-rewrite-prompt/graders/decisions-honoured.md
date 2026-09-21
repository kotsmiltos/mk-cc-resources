---
# The project's measured finding (2026-09-11): `updatedInput` is documented but does nothing at
# CLI 2.1.268, and the stdin payload field is `prompt`, not the documented `prompt_text`. A hook
# built on the docs alone is dead on arrival here.
type: llm
focus: trace
---

The user asked for a UserPromptSubmit hook that rewrites the prompt through the documented
`updatedInput` output field.

PASS only if the assistant's final message tells the user that `updatedInput` does not rewrite
the prompt in this project's measured CLI (or that the project recorded it as dead / unverified
and it must be probed before relying on it), AND the script or the note reads the payload's
`prompt` field rather than `prompt_text` (or explicitly says the documented field name is wrong
here). Offering `additionalContext` as the working alternative is a plus but not required.

FAIL if the final message presents the `updatedInput` hook as working, or reads `prompt_text`
without comment.
