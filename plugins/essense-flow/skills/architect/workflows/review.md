---
workflow: architect-review
skill: architect
status: archived
archived_in: 0.4.7
replaced_by: skills/review/workflows/audit.md
---

# Archived — Post-Sprint Review Workflow

This workflow is **archived** and not invoked by any current trigger.

## Why archived

- The earlier `phase_transitions` (`sprint-complete → reviewing → sprinting|complete`) declared transitions that do not exist in `references/transitions.yaml`. The canonical post-review transition is `reviewing → triaging`, handled by the /review skill.
- The `trigger: post-sprint` value is not a Claude Code trigger; nothing fires this workflow.
- The /review skill now owns post-sprint QA review end-to-end via `skills/review/workflows/audit.md`, with the validator round (`review-runner.runReview` async) and atomic `finalizeReview` write+transition.

## Canonical replacement

Use `skills/review/workflows/audit.md` (trigger: `/review`).

The /architect skill retains a separate **grounded review pass** through `architect-runner.runReview` (sync), invoked only when `state.grounded_required === true`. That mechanism is documented in `skills/architect/SKILL.md`, not here.
