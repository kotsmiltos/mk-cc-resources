---
name: organize
description: Spec-level DRY pass between /architect and /build. Clusters the current sprint's task specs across sub-architects, surfaces overlapping functionality ("task-042 and task-067 both describe fetch-user-from-db"), and proposes consolidations. Propose-with-confirm — every merge needs user OK; originals archived before any edit. Optional phase; run after /architect packs the sprint, before /build.
version: 1.0.0
schema_version: 1
---

# Organize skill

## Read this before doing anything

See `references/principles.md` `## Read This Before Doing Anything` (canonical source per v0.13.3 consolidation; the 4-bullet block lives there, this skill cites it by reference).

## Conduct

You are a diligent partner. Show, don't tell. Explain in depth with clear words. Not in a rush. Think ahead. No missed steps, no shortcuts, no fabricated results, no dropped or deferred items "because easier" — deferrals of scope are not accepted. Take time. Spend tokens.

Use sub-agents with agency + clear goals + clear requirements. Parallelize. Engineer what's needed: clear, concise, maintainable, scalable. Don't overengineer. Thorough on substance, lean on ceremony.

The human has no need to know how you are doing and sometimes they don't want to know, they don't have time nor patience. You need to be effective in communication, not assume what you are talking about is already known. Codebases must be clear and documented and you must be willing and able to provide all context in case asked when the user wants to dive deeper.

Tests are meant to help catch bugs, not verify that 1 + 1 = 2. This means that if we decide to write tests they need to be thought through and testing for actual issues that are not clear, not write them for the fun of writing.

Documentation is OUR CONTEXT, without it we are building headless things, it needs to be clear, presentable and always kept up to date.

We don't want to end up with the most lines of code but the best lines of code. We don't patch on patch, we create proper solutions for new problems, we are not afraid of producing great results.

Things we build need access from claude to be tested so we can build things like CLI for claude to play alone with them or add the ability to log everything that happens so that claude can debug after running.

## What this is

Parallel sub-architects design modules without knowing about each other; they describe overlapping functionality under different names; build agents then implement N variants of the same thing. This skill catches that BEFORE build, at the spec layer — the cheapest place to fix duplication.

Engine: the code-glossary deterministic engine (plugin-toolkit), spec mode. The clustering/signals are deterministic Python; ALL LLM work (labeling, behavioral judgment) is Agent-tool sub-agent dispatches in this session. NO external LLM SDKs, ever.

## Operating contract

- Verify `state.phase == sprinting` (entry) or `organizing` (resume). Any other phase: refuse with the phase named.
- Propose-with-confirm: NO task spec, manifest, or ARCH.md edit without an explicit per-consolidation user OK via `AskUserQuestion`.
- Before applying ANY approved edit, archive the originals to `.pipeline/architecture/_pre-organize/<UTC-timestamp>/` (full copies of every file about to change).
- Every proposal, decision (applied/rejected), and failure lands in `.pipeline/architecture/ORGANIZE-REPORT.md`. Zero silent outcomes.
- State writes ONLY via `essense-flow-tools state-set-phase`. Never Write/Edit `.pipeline/state.yaml`.

## Skill operating mechanism

No `init organize` op exists in `essense-flow-tools` yet (organize landed in v0.15; the init-op surface is a follow-up). Canonical paths are therefore fixed here:

| Artifact | Path |
|---|---|
| Task specs (input) | `.pipeline/architecture/sprints/<n>/tasks/*.yaml` |
| Sprint manifest | `.pipeline/architecture/sprints/<n>/manifest.yaml` |
| ARCH.md | `.pipeline/architecture/ARCH.md` |
| Report (output) | `.pipeline/architecture/ORGANIZE-REPORT.md` |
| Archive | `.pipeline/architecture/_pre-organize/<timestamp>/` |
| Work dir | `.pipeline/architecture/.organize-work/` |

**Engine discovery.** The engine ships in plugin-toolkit's code-glossary skill. Locate it:
1. Dev checkout: `plugins/plugin-toolkit/skills/code-glossary/` relative to the marketplace repo.
2. Installed: `find ~/.claude/plugins -path "*/code-glossary/code_glossary/runner.py"` → skill folder is two levels up.
If not found: hard stop — "organize requires the plugin-toolkit plugin (code-glossary engine); install mk-cc-all or plugin-toolkit." Do not improvise a clustering fallback.

Engine calls: `uv run --project <skill_folder> python -m code_glossary.runner <stage> ...`.

## How you work

1. **Enter.** Read `.pipeline/state.yaml`; note sprint `<n>`. Call `essense-flow-tools state-set-phase --value organizing` (legal from `sprinting`; predicate checks the sprint manifest exists).

2. **Index specs (deterministic).**
   `runner index-specs --root .pipeline/architecture/sprints/<n> --out <work>/specs.yaml`
   Report `spec_records` + every `failure_detail` (malformed spec YAML is an architect-phase bug the user must see). Zero records → write ORGANIZE-REPORT.md saying so, transition back, stop.

3. **Label (LLM, parallel).** Batch records ≤40. One sub-agent per batch: each gets the spec file paths + record-id table, the controlled vocabulary at `<skill_folder>/code_glossary/canonical_verbs.yaml`, and the labeling rules from `<skill_folder>/briefs/labeler.md` (adapted: read task spec YAML, label what the DESCRIBED functionality does). Merge returns → `<work>/labels.yaml` → `runner apply-labels --mode spec --records <work>/specs.yaml --labels <work>/labels.yaml`. Report unclear/unknown counts.

4. **Cluster (deterministic).**
   `runner signal --mode spec --records <work>/specs.yaml --out <work>/fps.yaml`
   `runner cluster --mode spec --records <work>/specs.yaml --fingerprints <work>/fps.yaml --out <work>/clusters.yaml`

5. **Judge borderline clusters (LLM).** For each multi-instance cluster, ONE sub-agent confirms the specs truly describe the same functionality (behavioral test from `<skill_folder>/briefs/behavioral-judge.md`, adapted to spec text). Default distinct when uncertain — a wrong merge corrupts the sprint.

6. **Propose (user gate — one AskUserQuestion per confirmed cluster).** Show: the task IDs, their one-line descriptions, the shared functionality label, and the consolidation plan — which task survives as owner (the most complete spec), which tasks fold in (their unique acceptance criteria + file contracts merged into the owner), what the manifest/dependency edits are. Options: apply / reject / defer-to-report-only.

7. **Apply approved consolidations.** Per approval, in this order:
   a. Archive: copy every file about to change to `_pre-organize/<timestamp>/` (same relative layout).
   b. Merge folded tasks' acceptance criteria, file_write_contract entries, and requirements_traced into the owner spec (dedupe; never drop).
   c. Delete folded task spec files; update `manifest.yaml` (remove folded task ids, rewire `dependencies` references to the owner).
   d. Append a consolidation note to ARCH.md's relevant module section.

8. **Report.** Write `ORGANIZE-REPORT.md`: clusters found, proposals made, applied/rejected/deferred per cluster with the user's decision, archive location, label/judge dispatch counts, failures.

9. **Exit.** `essense-flow-tools state-set-phase --value sprinting --sprint <n>` (predicate: ORGANIZE-REPORT.md exists). Surface the next cue: `/build`.

## Constraints

- NEVER edit task specs, manifest, or ARCH.md without the per-cluster user OK (propose-with-confirm is this skill's identity).
- NEVER skip the archive step. No archive → no edit.
- NEVER invent task IDs or quote spec text that isn't in the files.
- NEVER drop a folded task's acceptance criteria — merge means union, not replacement.
- NO external LLM SDKs. Engine deterministic; LLM = in-session sub-agents only.
- Spec-mode signals only (structural/signature N/A) — confidence is lower than code mode by design; the user gate compensates.

## State transitions (verbatim from references/transitions.yaml)

| from | to | requires | auto_advance |
|---|---|---|---|
| sprinting | organizing | `.pipeline/architecture/sprints/<n>/manifest.yaml exists` | no |
| organizing | organizing | — (proposal rounds) | no |
| organizing | sprinting | `.pipeline/architecture/ORGANIZE-REPORT.md exists` | no |

`organizing` is a human gate (autopilot halts) — consolidation decisions are the user's.
