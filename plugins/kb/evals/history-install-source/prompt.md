---
name: history-install-source
description: The real knowledge base holds two captures that CONTRADICT each other — 2026-07-27 "installs read the local checkout, pushing is orthogonal" and 2026-08-27 "installs read the GitHub remote now, pushing is required" (the later one refutes the earlier and the earlier carries a SUPERSEDED banner). The prompt asks the question both answer. WITH kb the hint points at them.
tags: [decisions-honoured]
runs: 3
max_turns: 20
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep]
---

I edited one of this marketplace's plugins locally in this checkout. Will
`claude plugin install <that-plugin>@mk-cc-resources` on this machine pick up my edit, or do I
have to push first? Answer in at most three lines and say how you know.
