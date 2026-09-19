---
# The config asset's menu path is a decision that lives outside the code. Graded on the trace
# (the Write tool call carries the file body, JSON-escaped, hence the optional backslash before
# the quote). The notes that state the decision say `Zarmada/Config/<Name>`, never `…/Haptics`,
# so a Read of the note cannot satisfy this.
type: regex
pattern: 'menuName\s*=\s*\\?"Zarmada/Config/Haptics'
target: trace
---
