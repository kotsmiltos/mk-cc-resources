---
name: code-glossary
description: Build a functionality glossary + DRY audit for a codebase. A deterministic Python engine indexes every function (Python/TS/JS/C# via AST, tree-sitter), fingerprints 5 signals, and clusters duplicate implementations; Claude sub-agents label functionalities against a controlled verb vocabulary, review each cluster (Pass B), and substrate-verify instances (Pass C). Produces GLOSSARY.yaml (frozen schema, consumed by future /dry-refactor) + GLOSSARY.md. Use when the codebase feels WET, before a refactor pass, or before /architect when a new module may overlap existing code.
argument-hint: "[path]"
---

<objective>
Read a codebase, identify what each function DOES (decoupled from how it's written), cluster duplicate implementations across files, and write a frozen-schema glossary with extraction proposals. Every claim substrate-verified with file:line + verbatim body. Glossary-only — no refactor execution.
</objective>

<context>
**Architecture (DESIGN-V2.md is the source of truth — read it for any design question):**

- **Deterministic engine** (`code_glossary/` Python package in this skill folder): walking, AST parsing (Python stdlib ast; TS/JS/C# tree-sitter), signal fingerprints, Pass A clustering, schema validation, rendering. Driven via Bash, one stage per invocation.
- **LLM layer** (this file): functionality labeling, Pass B cluster review, behavioral judging, Pass C verification. ALL LLM work happens as Claude Code Agent-tool sub-agent dispatches **in this session**. NO external LLM SDKs, NO API keys, NO Anthropic/OpenAI calls — ever (DESIGN-V2.md lock row 15).

**Engine invocation.** Resolve the skill folder: `${CLAUDE_PLUGIN_ROOT}/skills/code-glossary` (in development: `plugins/plugin-toolkit/skills/code-glossary` inside the marketplace repo). Then:

```
uv run --project <skill_folder> python -m code_glossary.runner <stage> ...
```

Runner subcommands: `index`, `apply-labels`, `signal`, `cluster`, `slices`, `render`. Each prints `key: value` summary lines and exits 2 on hard failure. Working artifacts live in `<target>/glossary/.work/` (kept after the run for debuggability).
</context>

<instructions>

## 1. Scope + config

`$ARGUMENTS`: first token (optional) = target path, default current working directory. Resolve; abort with a clear message if it doesn't exist.

Read `<target>/glossary/config.yaml` if present. If absent, this is a first run: write the default config there (scope paths/excludes/include_tests, clustering helper_home_candidates + min_instances, execution max_parallel_agents=20 + estimate_and_confirm, output settings — defaults per DESIGN-V2.md §9).

Detect helper-home candidates: list top-level dirs, note existing shared-code homes (`src/utils/`, `src/common/`, `lib/`, `Shared/`, etc.). These feed `proposed_module` — never invent new top-level dirs.

Confirm via `AskUserQuestion`: target path, excludes, include_tests, output dir (`<target>/glossary/`). Do NOT proceed unconfirmed.

## 2. Stage 1 — index (deterministic)

```
runner index --root <target> --out <work>/records.yaml [--include-tests] [--exclude <pat> ...]
```

Exit 2 = zero functions indexed: abort, relay the runner's diagnostic (scope empty, all excluded, or unreadable). Note `languages_skipped` — those files get no deterministic records; mention them in the final report as LLM-sketch candidates (not dispatched by default; offer only if the user asks).

## 3. Estimate + confirm (lock row 16 — before ANY dispatch)

From the index summary compute:
- **labeler agents** = ceil(records / 40)
- **Pass B agents** ≈ multi-instance cluster count (known precisely after stage 5; use the index-time estimate `records / 8` for the upfront number, then re-confirm at step 6 if actual exceeds estimate by >50%)

Report: "N records → ~K labeler + ~M reviewer dispatches, runs on session tokens." Ask the user to confirm before kickoff (`AskUserQuestion`). No hard cap — the user decides.

## 4. Labeling (LLM — parallel sub-agents)

Build batches of ≤40 records. For each batch, dispatch one sub-agent (single message, parallel) with:
- The brief at `briefs/labeler.md` (verbatim)
- The batch's record table: `id | file | line | function | signature` (from `records.yaml`)
- The vocabulary file path: `<skill_folder>/code_glossary/canonical_verbs.yaml`
- Helper-home candidates

Merge all returns into `<work>/labels.yaml` (top-level `labels:` list). A crashed agent's batch is re-dispatched once; if it crashes again, its records stay unlabeled (they cluster by structural/signature signals only) and the failure is reported — never silently.

```
runner apply-labels --records <work>/records.yaml --labels <work>/labels.yaml
```

Report `labels_normalized_to_unclear` and `unknown_record_id` counts — both are agent drift the user should see.

## 5. Stages 2–3 — signal + cluster (deterministic)

```
runner signal  --records <work>/records.yaml --out <work>/fingerprints.yaml
runner cluster --records <work>/records.yaml --fingerprints <work>/fingerprints.yaml --out <work>/clusters.yaml
runner slices  --records <work>/records.yaml --clusters <work>/clusters.yaml --out-dir <work>/slices
```

## 6. Pass B — cluster review (LLM — parallel sub-agents)

One sub-agent per slice file (re-confirm count with the user if it exceeds the step-3 estimate by >50%). Each gets:
- The brief at `briefs/cluster-reviewer.md` (verbatim)
- Its slice file path
- Helper-home candidates

Cap concurrency at `max_parallel_agents` from config (default 20); dispatch in waves if needed.

Collect returns. Malformed YAML: retry that agent once with a stricter prompt; still malformed → that cluster keeps its deterministic baseline (extractable=false, pending note) and is logged. Merge all `enrichments:` entries into `<work>/enrichments.yaml` — reject duplicate cluster_ids (keep the first, log the collision).

## 7. Behavioral judge — borderline pairs (LLM — parallel sub-agents)

Identify near-miss pairs from `clusters.yaml`: two multi-instance clusters whose labels share the same first two kebab tokens (same verb + object) but were not merged by Pass A. For each pair (usually a handful), dispatch one judge with `briefs/behavioral-judge.md` + both slice paths.

Verdict `merge` → add `merge_into: <cluster_a>` to cluster B's entry in `enrichments.yaml` (the renderer folds members; B emits no separate entry). `distinct`/`inconclusive` → no change; note inconclusive pairs in the report.

## 8. Pass C — master substrate-verify (you, inline)

For every enrichment entry (and every merge target), sample 3 instances (all, if fewer): Read the cited file at the cited line, confirm the slice's verbatim body still matches the disk (±5 lines tolerance for drift in line numbers).

- Instance body not found → add its record id to that entry's `drop_instance_ids`.
- >50% of sampled instances fail → set `verification_status: quote_drift_detected` on the entry (kept in the glossary, flagged — never suppressed).
- All sampled pass → `verification_status: verified`.

Write the updated `enrichments.yaml`. This step is yours — do not delegate it; fresh context is the point.

## 9. Stage 4 — render (deterministic)

```
runner render --records <work>/records.yaml --fingerprints <work>/fingerprints.yaml \
  --clusters <work>/clusters.yaml --enrichments <work>/enrichments.yaml \
  --out-dir <target>/glossary --target-path <project-name> \
  --scope-path <p> [--scope-exclude <e> ...] [--include-tests]
```

Check the summary: `enrichments_unmatched` non-empty means an agent returned a cluster id that doesn't exist — report it.

## 10. Report

```
Code glossary: <target>

Indexed:     <N> functions across <M> files (<language mix>)
Clusters:    <K> multi-instance (of <T> total entries)
Extractable: <E> promoted by Pass B review
Dispatches:  <L> labelers + <R> reviewers + <J> judges

Top 3 extractables (by score):
  1. <name> — <n> instances — proposed: <module>
  ...

Verification: <V> verified, <D> quote-drift flagged, <I> instances dropped
Failures:     <unlabeled batches, malformed returns, skipped languages — or "none">

Outputs:
  <target>/glossary/GLOSSARY.yaml   (frozen schema v1 — /dry-refactor input)
  <target>/glossary/GLOSSARY.md     (human summary, sorted by score)
  <target>/glossary/.work/          (stage artifacts, kept for inspection)
```

</instructions>

<failure_handling>
Never silent (DESIGN-V2.md §10):

| Failure | Behavior |
|---|---|
| Unreadable/unparseable file | Engine logs + counts it; surfaces in index summary |
| Zero records indexed | Hard abort with diagnostic |
| Labeler/reviewer agent crash | One re-dispatch; then degrade (unlabeled / deterministic baseline) + report |
| Malformed agent YAML | One stricter retry; then drop that return, log it |
| Off-vocabulary label | Demoted to `unclear` by apply-labels, counted, reported |
| Unknown record/cluster id in a return | Surfaced in runner output + metadata, never merged |
| Pass C quote drift | Instance dropped; entry flagged `quote_drift_detected` if >50% fail |
</failure_handling>

<constraints>
- NO external LLM SDKs or API calls. All LLM work = Agent-tool dispatches in this session. The engine stays deterministic.
- DO NOT modify any source file in the target. Glossary artifacts only.
- DO NOT invent file paths, record ids, or line numbers. Everything traces to engine output or a verified agent return.
- DO NOT mark extractable with <2 instances (the renderer enforces this too).
- DO NOT propose helper modules outside existing helper homes.
- DO NOT dispatch before the step-3 estimate is confirmed.
</constraints>

<composition>
- Standalone: "audit my codebase for DRY violations".
- essense-flow: `/organize` (post-architect, spec mode) and `/glossary` (post-build, code mode) reuse this engine — waves 8–10.
- Future `/dry-refactor` (v3, designed in DESIGN-V2.md Appendix A) executes extractions from GLOSSARY.yaml.
</composition>
