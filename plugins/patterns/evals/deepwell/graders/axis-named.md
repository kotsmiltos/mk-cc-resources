---
# patterns' promise: before or while designing, name the varying axis and either pick a named
# seam for it or consciously close it. The request plants the growth signal ("more structure
# kinds and more materials will keep coming; adding one is data, not a new branch"). Read from
# the trace so the reasoning before the first Write counts, not only the final message.
type: llm
focus: trace
---

The request said more structure kinds and more materials will keep coming, and asked that adding
one be data rather than a new branch. Judge whether the assistant treated STRUCTURE KIND (and/or
MATERIAL) as a DESIGN AXIS rather than writing one if/switch branch per kind.

PASS only if BOTH hold:
1. Somewhere in the trace — its own text, before or after writing — the assistant names the
   thing that will vary (structure kinds / materials / recipes) as an axis of growth.
2. It then does ONE of: picks a named seam for it and builds it (a registry or table of structure
   behaviours keyed by kind that tick() iterates, a data-driven recipe/material catalogue in
   config.json the sim reads generically, one module per kind behind a shared contract, or
   similar — the name of the seam stated), OR explicitly closes the axis with a reason.

FAIL if it never mentions the coming kinds, or mentions them without either shaping the code for
them or stating why not. A switch over structure kinds inside tick() with one case per kind is
the anti-pattern the request asked to avoid. Using the word "pattern" is not what is being
judged; one manager per concern is the house rule, not a choice.
