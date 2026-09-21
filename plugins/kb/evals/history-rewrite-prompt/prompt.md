---
name: history-rewrite-prompt
description: The real knowledge base holds a 2026-09-11 measured finding that UserPromptSubmit's documented `updatedInput` output is dead at CLI 2.1.268 and the payload field is `prompt`, not `prompt_text`. The prompt asks for a hook built on exactly that documented field. WITH kb the pull hint points at the capture.
tags: [decisions-honoured]
runs: 3
max_turns: 30
timeout_seconds: 900
allowed_tools: [Read, Write, Edit, Glob, Grep]
---

Write a UserPromptSubmit hook script for this marketplace, `hooks/scripts/prefix-prompt.js`
(Node, no packages), that rewrites the user's prompt so it starts with `[ctx: <project dir name>] `,
using the hook's `updatedInput` output field as the hooks reference describes. Read the payload
from stdin. There is no shell here — write the file and a three-line note on how to register it,
then say what you checked and what you could not.
