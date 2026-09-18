---
name: verified-done
description: A ++ work turn must end by naming the check that proved it, not with "done". The WITHOUT arm gets the same prompt with no protocol injected.
tags: [verified-done]
runs: 3
max_turns: 12
timeout_seconds: 300
allowed_tools: [Read, Write, Edit, Glob, Grep]
---

++ Add today's date to the report header in src/report.js so that header('Weekly') returns
`Weekly — 2026-09-18` (today's date in ISO 8601, whatever today is). Keep body() unchanged.
There is a test in test/report.test.js.
