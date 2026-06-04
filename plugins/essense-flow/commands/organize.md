---
description: Spec-level DRY pass — cluster the sprint's task specs, propose consolidations of overlapping functionality before /build. Propose-with-confirm.
---

Invoke the `essense-flow:organize` skill in the current working directory.

Index the current sprint's task specs (code-glossary engine, spec mode), cluster overlapping functionality across sub-architects, and propose consolidations. Every merge requires explicit user OK; originals are archived to `_pre-organize/<timestamp>/` before any edit. Writes ORGANIZE-REPORT.md.

Optional phase: run after /architect packs the sprint, before /build.
