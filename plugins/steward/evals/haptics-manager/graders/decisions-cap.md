---
# The 0.6 amplitude cap is a decision that lives outside the code. Graded on the trace as the
# C# literal `0.6f`; the notes that state the decision write "0.6 on the 0..1 scale", never the
# literal, so a Read of the note cannot satisfy this. No fixture file carries 0.6f either.
type: regex
pattern: '0\.6f'
target: trace
---
