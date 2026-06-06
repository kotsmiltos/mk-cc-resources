---
description: Code-mode DRY audit after /build — runs the code-glossary engine on the sprint code, clusters duplicate implementations, surfaces extraction candidates. Propose-only; writes .pipeline/glossary/GLOSSARY.{yaml,md}, never modifies source. Also renders MAP.md (functionality map) consumed by /architect and /build before designing.
---

Invoke the `essense-flow:glossary` skill in the current working directory.

Index every function in scope (code-glossary engine, code mode), cluster duplicate implementations across files, and score extraction candidates. Estimate-and-confirm gates all sub-agent dispatch. Writes `.pipeline/glossary/GLOSSARY.yaml` (frozen schema) + `GLOSSARY.md` + `MAP.md` (functionality map).

Optional phase: run after /build, before or alongside /review.
