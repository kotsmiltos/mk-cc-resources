---
description: Code-mode DRY audit after /build — runs the code-glossary engine on the sprint code, clusters duplicate implementations, surfaces extraction candidates. Propose-only; writes .pipeline/glossary/GLOSSARY.{yaml,md}, never modifies source.
---

Invoke the `essense-flow:glossary` skill in the current working directory.

Index every function in scope (code-glossary engine, code mode), cluster duplicate implementations across files, and score extraction candidates. Estimate-and-confirm gates all sub-agent dispatch. Writes `.pipeline/glossary/GLOSSARY.yaml` (frozen schema) + `GLOSSARY.md`.

Optional phase: run after /build, before or alongside /review.
