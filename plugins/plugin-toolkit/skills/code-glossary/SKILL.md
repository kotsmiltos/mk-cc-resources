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

Runner subcommands: `index`, `apply-labels`, `signal`, `cluster`, `slices`, `render`, `diff`, `map`. Each prints `key: value` summary lines and exits 2 on hard failure. Working artifacts live in `<target>/glossary/.work/` (kept after the run for debuggability).
</context>

<instructions>

## 1. Scope + config

`$ARGUMENTS`: first token (optional) = target path, default current working directory. Resolve; abort with a clear message if it doesn't exist.

Read `<target>/glossary/config.yaml` if present. If absent, this is a first run: write the default config there (scope paths/excludes/include_tests, clustering helper_home_candidates + min_instances, execution max_parallel_agents=20 + estimate_and_confirm, output settings — defaults per DESIGN-V2.md §9).

Detect helper-home candidates: list top-level dirs, note existing shared-code homes (`src/utils/`, `src/common/`, `lib/`, `Shared/`, etc.). These feed `proposed_module` — never invent new top-level dirs.

Confirm via `AskUserQuestion`: target path, excludes, include_tests, output dir (`<target>/glossary/`). Do NOT proceed unconfirmed.

## 2. Stage 1 — index (deterministic)

```
runner index --root <target> --out <work>/records.yaml [--include-tests] [--exclude <pat> ...] [--min-statements N] [--scan-blocks --blocks-out <work>/block_records.yaml]
```

`--scan-blocks` (v2.1, opt-in) additionally scans for duplicated sub-function guard patterns; cluster them with `runner block-cluster --blocks <work>/block_records.yaml --out <work>/block_clusters.yaml` and pass both files to `render` (`--block-records`/`--block-clusters`) — they emit as advisory `gloss-blk-NNN` entries in a "Block-level secondary findings" section, no agent dispatches needed.

Exit 2 = zero functions indexed: abort, relay the runner's diagnostic (scope empty, all excluded, or unreadable). Note `languages_skipped` — those files get no deterministic records; mention them in the final report as LLM-sketch candidates (not dispatched by default; offer only if the user asks).

## 3. Estimate + confirm (lock row 16 — before ANY dispatch)

From the index summary compute:
- **labeler agents** = ceil(records / 40)
- **Pass B agents** ≈ multi-instance cluster count (known precisely after stage 5; use the index-time estimate `records / 8` for the upfront number, then re-confirm at step 6 if actual exceeds estimate by >50%)
- **judge agents** ≈ `records / 80` upfront; precise count comes from `runner near-misses` at step 7. Judges are PART of the confirmed budget — they may not be skipped later. If budget is tight, reduce labeler/reviewer batch sizes first; the judge tier is where the v2 acceptance lost three whole cluster families.

Report: "N records → ~K labeler + ~M reviewer + ~J judge dispatches, runs on session tokens." Ask the user to confirm before kickoff (`AskUserQuestion`). No hard cap — the user decides.

## 4. Labeling (LLM — parallel sub-agents)

Build batches of ≤40 records. For each batch, dispatch one sub-agent (single message, parallel) with:
- The brief at `briefs/labeler.md` (verbatim)
- The batch's record table: `id | file | line | function | signature` (from `records.yaml`)
- The vocabulary file path: `<skill_folder>/code_glossary/canonical_verbs.yaml`
- Helper-home candidates
- **Its output path**: `<work>/returns/labels-<batch>.yaml` — agents WRITE their YAML there and return only `path — N labels` (pasted returns burned ~40% of session context in the v2 acceptance run)

Read each return file (NOT the agent's message) and concatenate the `labels:` lists into `<work>/labels.yaml`; verify the per-file count against the agent's one-line message — a mismatch means a malformed write, re-dispatch that batch once. A crashed agent's batch is re-dispatched once; if it crashes again, its records stay unlabeled (they cluster by structural/signature signals only) and the failure is reported — never silently.

```
runner apply-labels --records <work>/records.yaml --labels <work>/labels.yaml
```

Report `labels_normalized_to_unclear` and `unknown_record_id` counts — both are agent drift the user should see.

## 5. Stages 2–3 — signal + cluster (deterministic)

```
runner signal  --records <work>/records.yaml --out <work>/fingerprints.yaml
runner cluster --records <work>/records.yaml --fingerprints <work>/fingerprints.yaml --out <work>/clusters.yaml
runner slices  --records <work>/records.yaml --clusters <work>/clusters.yaml --fingerprints <work>/fingerprints.yaml --out-dir <work>/slices
```

`--fingerprints` makes slice members carry `composed_of_candidates` (deterministic who-calls-whom refs) so Pass B can judge `kind: composite` with real record ids.

## 6. Pass B — cluster review (LLM — parallel sub-agents)

One sub-agent per slice file (re-confirm count with the user if it exceeds the step-3 estimate by >50%). Each gets:
- The brief at `briefs/cluster-reviewer.md` (verbatim)
- Its slice file path
- Helper-home candidates
- **Its output path**: `<work>/returns/review-<cluster_id>.yaml`

Cap concurrency at `max_parallel_agents` from config (default 20); dispatch in waves if needed.

Read each return FILE (the agent's message carries only the path + a one-line summary). Malformed YAML in a file: retry that agent once with a stricter prompt; still malformed → that cluster keeps its deterministic baseline (extractable=false, pending note) and is logged. Merge all `enrichments:` entries into `<work>/enrichments.yaml` — reject duplicate cluster_ids (keep the first, log the collision).

## 7. Behavioral judge — near-miss candidates (LLM — parallel sub-agents)

Generate candidates deterministically — never by eyeballing `clusters.yaml`:

```
runner near-misses --records <work>/records.yaml --clusters <work>/clusters.yaml --out <work>/near_misses.yaml
```

Three candidate kinds, each mapped to a v2-acceptance recall loss:
- **label-pair** — two multi-instance clusters whose labels share the first two kebab tokens (the split build-factory family). Dispatch one judge with `briefs/behavioral-judge.md` + both slice paths.
- **singleton-adoption** — an unclustered record whose function name matches a cluster member's (the dropped ClosestPointOnSegment variants). Dispatch one judge with the cluster's slice path + the record's `id | file | line | body` block from `records.yaml`.
- **bucket-sample** — a deterministic sample from a big signature-only bucket (the unreviewed n=143 parameterless-void bucket). Dispatch one judge with the sampled members' bodies; question is "does a real cluster hide in here" — a `merge`-family answer means slice + review that subset in a follow-up Pass B dispatch.

Every judge also gets **its output path**: `<work>/returns/judge-<n>.yaml`; verdicts are read from the files, not from agent messages.

Verdict handling in `enrichments.yaml`:
- `merge` → add `merge_into: <cluster_a>` to cluster B's entry (the renderer folds members; B emits no separate entry).
- `adopt` → append the record id to `adopt_record_ids: [...]` on cluster A's entry (the renderer joins it to the cluster's instances and keeps it off the watchlist).
- `distinct`/`inconclusive` → no change; note inconclusive candidates in the report.

**This step is non-skippable.** Judge dispatches were confirmed in the step-3 budget; skipping them silently reproduces the v2 acceptance's judge-tier recall losses. If the candidate list is unexpectedly large (>2× the step-3 estimate), re-confirm with the user — do not quietly truncate.

## 8. Pass C — master substrate-verify (you, inline)

For every enrichment entry (and every merge target), sample 3 instances (all, if fewer): Read the cited file at the cited line, confirm the slice's verbatim body still matches the disk (±5 lines tolerance for drift in line numbers). **Normalize line endings (`\r\n` → `\n`) on BOTH sides before comparing** — record bodies are LF-normalized at index time, but the disk file may be CRLF; comparing raw bytes false-drifted 92 instances in the v2 acceptance run.

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

### Re-run + diff (drift tracking)

Snapshotting is user-land: keep the previous `GLOSSARY.yaml` (rename or copy it before re-running — the tool never deletes artifacts). After a fresh run, compare:

```
runner diff --old <previous>/GLOSSARY.yaml --new <target>/glossary/GLOSSARY.yaml --out <target>/glossary/DIFF.md
```

Entries match across runs by their `{(file, function)}` instance sets (gloss-ids are positional, record ids line-sensitive — neither is stable). Six classes: `added`, `removed`, `grown` (new duplication sites — THE drift signal), `shrunk`, `extractable_changed`, `verification_changed`. Watchlist singles are excluded unless `--include-singles`. Exit is 0 even with drift (reporting, not gating); pass `--fail-on-drift` for CI-style exit 1.

### Functionality map (the consult-before-designing artifact)

```
runner map --glossary <target>/glossary/GLOSSARY.yaml --out <target>/glossary/MAP.md
```

MAP.md = mermaid graph (subgraph per module; duplication families ×N, composites as hexagons with `composed_of` arrows, cross-module edges dashed) + a lossless machine index (fenced yaml, sliceable per module) + collapsed singles list. This is the artifact downstream consumers (essense-flow /architect + /build, or any human) consult BEFORE designing or building — the map of what already exists. Flags: `--group-depth` (module granularity), `--min-instances`, `--include-singles`, `--max-nodes`, `--per-module-graphs`, `--no-graph`. The graph is the lossy human view; the machine index always carries every entry.

### Coupling (the decoupling enforcer)

```
runner coupling --records <work>/records.yaml --out <target>/glossary/COUPLING.yaml
```

Measures COUPLING to enforce DECOUPLED (the same arc the glossary uses to enforce DRY by measuring duplication). Reads the Stage-1 records (call graph), resolves each call with **lexical scoping** (a call binds to a same-module definition when one exists, so a private helper name shared across modules never fabricates a phantom cross-module edge), then emits deterministic, **threshold-free** facts:

- per-module afferent/efferent **counts** — measurements, *reported, never gated*;
- **cycles** — module-graph SCCs with >1 member (a dependency cycle exists, or it does not — a binary fact);
- **reach-ins** — a cross-module call into a callee that is internal by the language's own naming convention (Python `_name`; dunders excluded; languages without an unambiguous private marker never flag).

Cycles and reach-ins are the gate-worthy violations. Default exit 0 (report-only); `--fail-on-violation` makes any cycle or reach-in exit 1 (the CI gate). `--group-depth` sets module granularity (the same rule `map` uses — a coarse root package that lumps a shared types module with the CLI entrypoint will read as a cycle; deepen the grouping to separate them). COUPLING.yaml names each violation as `file:function` so a reviewer (or the essense-flow review `coupling` lens) can substrate-verify the cited site instead of re-hunting it.

### Extensibility (the open-for-extension enforcer)

```
runner extensibility --root <source-root> --out <target>/glossary/EXTENSIBILITY.yaml [--axes <growth-axes-ledger>.yaml]
```

Measures DISPATCH ENUMERATION to enforce OPEN-FOR-EXTENSION (the same arc — DRY via duplication, decoupled via coupling, open-for-extension via dispatch). `<source-root>` is the same tree passed to `index`. Scans source directly (its own tree-sitter pass; needs no records). Answers "add one new instance of an axis → how many existing sites must I edit?" Per axis it emits, deterministically and **threshold-free**:

- the **edit_sites** — every site you must touch to add one instance: the enum declaration plus each `switch` / switch-expression / if-else-if ladder / dict dispatch that enumerates the axis's instances — and their **count** (a measurement, *reported, never gated*);
- **is_violation** — a binary fact: a **declared-OPEN** axis (from the `--axes` growth-axes ledger) that still carries ≥1 dispatch site (you promised it open; an exhaustive switch breaks that).

Sites bind to an axis by **case-label membership** (a construct's labels overlap an axis's instance set by ≥2 members — no type inference). Axes come from the optional declared ledger (`growth_axes:` with `type_name`, `instances`, `open`) and/or **intrinsic** enums (any enum with ≥2 members — measured + advisory; never gated, since we don't know the human wanted it open). No axis → no flag. Default exit 0 (report-only); `--fail-on-violation` exits 1 on a declared-open violation. EXTENSIBILITY.yaml names each site `file:line` so a reviewer (or the essense-flow review `extensibility` lens) substrate-verifies it instead of re-hunting. **MVP scans C# only** (the per-language extractor seam is in place; TS/JS + Python next).

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
  <target>/glossary/MAP.md          (functionality map — consult before designing/building)
  <target>/glossary/COUPLING.yaml   (decoupling facts — cycles + reach-ins; gate via --fail-on-violation)
  <target>/glossary/EXTENSIBILITY.yaml (open-for-extension facts — per-axis edit-sites; gate via --fail-on-violation)
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
