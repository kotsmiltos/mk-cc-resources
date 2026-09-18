---
name: decisions-honoured
description: A prior decision lives only in the project's knowledge base (.claude/kb/extracted). WITH kb, the kb-pull hint points at it and the change honours it; WITHOUT, the model hand-rolls.
tags: [decisions-honoured]
runs: 3
max_turns: 12
timeout_seconds: 600
allowed_tools: [Read, Write, Edit, Glob, Grep]
---

Add today's date to the report header in src/report.js so that header('Weekly') returns the
title followed by today's date, like `Weekly — 2026-09-18`. Keep body() unchanged. There is a
test in test/report.test.js.
