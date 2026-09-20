---
# patterns' promise: before or while designing, name the varying axis and either pick a named
# seam for it or consciously close it. The request plants a growth signal (more pull SOURCES:
# steward inbox, GitHub issues, a calendar) on top of the two it asks for (sessions, PROJECT.md),
# so there IS an axis to name. Read from the trace so the reasoning before the first Write
# counts, not only the final message.
type: llm
focus: trace
---

The request said more pull sources are coming (the steward inbox, GitHub issues, a calendar) on
top of the two it asks for now (session transcripts, PROJECT.md "## Next"). Judge whether the
assistant treated the SOURCE as a DESIGN AXIS rather than writing two readers and moving on.

PASS only if BOTH hold:
1. Somewhere in the trace — its own text, before or after writing — the assistant names the
   thing that will vary (pull sources / readers / providers) as an axis of growth.
2. It then does ONE of: picks a named seam for it and builds it (a source registry or table the
   pull iterates, one module per source behind a shared `collect()`-style contract, a
   strategy/provider object per source, or similar — the name of the seam stated), OR
   explicitly closes the axis with a reason ("two sources now; when the third arrives, …").

FAIL if it never mentions the coming sources, or mentions them without either shaping the code
for them or stating why not. Using the word "pattern" is not what is being judged; one manager
per concern is the house rule, not a choice.
