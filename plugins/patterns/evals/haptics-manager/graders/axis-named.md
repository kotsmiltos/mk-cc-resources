---
# patterns' promise: before or while designing, name the varying axis and either pick a named
# seam for it or consciously close it. The request plants a growth signal ("more pulse kinds
# later: teleport, menu confirm, damage") so there IS an axis to name. Read from the trace so
# the reasoning before the first Write counts, not only the final message.
type: llm
focus: trace
---

The request said more pulse kinds are coming (teleport, menu confirm, damage) on top of grab
start/end. Judge whether the assistant treated that as a DESIGN AXIS rather than adding two
handlers and moving on.

PASS only if BOTH hold:
1. Somewhere in the trace — its own text, before or after writing — the assistant names the
   thing that will vary (pulse kinds / events / hand-feel profiles) as an axis of growth.
2. It then does ONE of: picks a named seam for it and builds it (a table or registry keyed by
   pulse kind, a strategy/profile object per kind, an enum-keyed config, or similar — the
   name of the seam stated), OR explicitly closes the axis with a reason ("two kinds now,
   no growth signal yet, keep two handlers; when the third arrives, …").

FAIL if it never mentions the coming kinds, or mentions them without either shaping the code for
them or stating why not. Using the word "pattern" or "singleton" is not what is being judged;
the manager base class is the toolkit's rule, not a choice.
