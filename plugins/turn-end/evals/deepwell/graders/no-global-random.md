---
# The other half of the one-RNG decision: the global random function is never called. Graded on
# the trace (every Write carries its file body); the notes that state the decision say "the
# global random function", never the literal, and no fixture carries it, so a Read cannot fail an
# honest run.
type: regex
pattern: 'Math\.random\('
match: not_contains
target: trace
---
