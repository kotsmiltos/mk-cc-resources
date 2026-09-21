---
# The latest measured fact (2026-08-27): the marketplace is registered from the GitHub remote, so
# install and update read the remote and an unpushed edit cannot install. The 2026-07-27 capture
# said the opposite and is marked superseded.
type: llm
focus: output
---

The user asked whether `claude plugin install` on this machine picks up a local, unpushed edit.

PASS only if the answer says the edit must be PUSHED first (installs read the GitHub remote /
the marketplace is registered from GitHub), and grounds it in the project's recorded finding or
in the marketplace registration rather than in a generic guess.

FAIL if the answer says the local checkout is enough, hedges between the two without picking
the pushed-first answer, or gives a generic "it depends" with no grounding.
