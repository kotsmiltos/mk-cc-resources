# code-glossary v2 — design

> **Status:** design doc (not implementation)
> **Supersedes:** v1 (current `SKILL.md` in this folder)
> **Authors:** user vision + Claude technical decisions, walked piece-by-piece
> **Date:** 2026-06

## 1. What this is

A functionality-clustering tool that reads a codebase, identifies what each chunk of logic DOES (decoupled from how it's written), groups duplicate implementations across files, and produces a glossary of distinct functionalities with their call sites.

Two flavors of the same engine ship in v2:

| Tool | Input | Mode | Output | Lives in |
|---|---|---|---|---|
| `/code-glossary` | source files | code mode | `<project>/glossary/GLOSSARY.{yaml,md}` | plugin-toolkit (standalone) |
| `/glossary` (new essense-flow phase) | source files (post-build) | code mode | `.pipeline/glossary/GLOSSARY.{yaml,md}` | essense-flow |
| `/organize` (new essense-flow phase) | architect task specs (post-architect, pre-build) | spec mode | edits to `ARCH.md` + sprint manifest, audit trail in `.pipeline/architecture/_pre-organize/` | essense-flow |

All three share the **same clustering engine** with different input adapters and rendering.

## 2. The problem this solves

Three problems, one root cause (the same idea implemented in N slightly-different ways):

1. **Code-level duplication** — bug fix to logic requires N edits; miss one → silent regression. Tool surfaces all N call sites.
2. **Design-level duplication** — essense-flow architect dispatches parallel sub-architects who don't know about each other; they design overlapping modules; build agents implement N variants of the same thing. Tool catches this BEFORE build at the spec layer.
3. **Lost reuse opportunities** — when a developer adds new code, they don't know what already exists. Tool gives them an inventory.

## 3. Vision (locked from user walkthrough)

### What "a functionality" is (piece 2)

Functionalities form a TREE, not a flat list:
- **Leaf** = atomic logic (`fetch-data-from-api`, `extract-field-from-data`, `compare-value-against-threshold`)
- **Composite** = wraps a sequence of leaves (`compare-date-from-api-against-threshold` = fetch + extract + compare)

Both kinds are first-class glossary entries. Composites carry `composed_of: [leaf_id, ...]`. An entry being a composite does not auto-make it extractable — that's a separate judgment.

### What "the same idea" means (piece 3)

Multi-signal cross-validation. Five signals, ordered by priority:
1. **Lexical** — label match, body excerpt token overlap
2. **Structural** — control flow shape, call pattern fingerprint (real AST when available, LLM-sketch otherwise)
3. **Signature** — input/output types, parameter shape
4. **Behavioral** — LLM judge: "given the same inputs, do these compute the same thing?"
5. **Abstraction-level** — leaf vs composite, does this entry call other entries

**Confidence is signal agreement:**
- 5/5 agree → `high` (auto-extractable per piece 4 threshold)
- 3/5 agree → `medium` (surface, "manual review recommended")
- 1-2/5 agree → `low` (informational only, "weak match")
- Disagree → not clustered, kept separate

### When to extract (piece 4)

Aggressive — propose anything with 2+ instances. Each proposal carries `extractability_score` (deterministic: instance count × file spread × lines saved, minus variant-axis penalty, with existing-helper-collision adjusting). User sorts/filters.

### Languages (piece 6)

v1: **Python** (stdlib AST), **TypeScript/JavaScript** (tree-sitter), **C#** (tree-sitter). Real-AST first-class. Other languages: LLM-sketch fallback (still works, lower precision).

Tool implementation: Python (uses `uv`, tree-sitter Python bindings, async/parallel via stdlib).

### Output (piece 5)

`<project>/glossary/GLOSSARY.yaml` (machine, frozen schema, downstream consumers) + `<project>/glossary/GLOSSARY.md` (human, sorted by extractability descending). Visible folder. Tool does NOT modify `.gitignore`.

Re-runs (piece 9): fresh each time in v1. Snapshot + diff is v1.1.

Scale (piece 10): works at any project size. Concurrency control + cost transparency upfront + soft caps. Engineering complexity is internal.

## 4. essense-flow integration (piece 7)

### Phase: `/organize` (NEW, post-architect, spec mode)

**Position:** After `/architect`, before `/build`. New pipeline phase.

**Trigger:** Manual via `/organize`, OR autopilot if enabled.

**Inputs:** All sub-architect task specs from `.pipeline/architecture/sprints/sprint-N/tasks/*.yaml`, plus ARCH.md, plus sprint manifest.

**What it does:**
1. Indexes each task spec — extracts the functionality the spec describes (lexical + behavioral signals; structural fingerprint not applicable — specs aren't executable).
2. Clusters specs across all sub-architects.
3. For each cluster with 2+ specs, surfaces it: "agent 1 (`task-042`) and agent 2 (`task-067`) both describe what looks like the same functionality (`fetch-user-from-db` vs `load-user-by-id`)."
4. Proposes consolidation per cluster: merge into one task spec, identify which sub-architect owns the consolidated version, update sprint manifest.

**Execution model (piece 8):** propose-with-confirm. Each proposed consolidation requires user OK. Approved consolidations apply edits to ARCH.md + task specs + sprint manifest. Originals archived to `.pipeline/architecture/_pre-organize/<timestamp>/` for audit trail.

**Output:**
- `.pipeline/architecture/ORGANIZE-REPORT.md` — proposed consolidations, what was applied, what was rejected
- Updated ARCH.md, task specs, sprint manifest (in-place edits)
- Archive of pre-edit versions

### Phase: `/glossary` (NEW, post-build, code mode)

**Position:** After `/build`, before or as part of `/review`. New pipeline phase.

**Trigger:** Manual via `/glossary`, OR autopilot if enabled.

**Inputs:** Sprint code at `.pipeline/sprints/sprint-N/` (or full project source tree, configurable).

**What it does:**
1. Indexes all source functions (full multi-signal pipeline per piece 3).
2. Block-scan for duplicated sub-function patterns.
3. Cluster.
4. Score extractability.
5. Write `.pipeline/glossary/GLOSSARY.{yaml,md}`.

**Execution model:** propose-only. No code modifications. `/dry-refactor` is a v2-of-v2 skill that consumes the YAML.

**Output:**
- `.pipeline/glossary/GLOSSARY.yaml`
- `.pipeline/glossary/GLOSSARY.md`

### State-machine wiring

Add to `essense-flow/references/transitions.yaml`:
```
build → organize         # no, organize comes BEFORE build
architect → organize → build → glossary → review
```

Add to `essense-flow/references/phase-command-map.yaml`:
```yaml
organize: /organize
glossary: /glossary
```

Add to `essense-autopilot/hooks/autopilot.js` phase map.

Update `essense-flow/lib/state-machine.js` legal transitions.

## 5. Clustering engine (the shared core)

Implemented as a Python module under `plugins/plugin-toolkit/skills/code-glossary/engine/`. All three commands (`/code-glossary`, `/organize`, `/glossary`) import the same engine with different input adapters.

### Pipeline (4 stages)

```
Stage 1: index    →  per-unit records (functions or specs)
Stage 2: signal    →  attach 5-signal fingerprints to each record
Stage 3: cluster   →  group by signal agreement, compute confidence
Stage 4: render    →  schema-validate, write YAML + MD (or in /organize case, propose edits)
```

### Stage 1 — Index

Input adapters per mode:
- **Code mode**: walk source tree, AST-parse where supported (Python stdlib AST, tree-sitter for TS+C#), LLM-sketch for unsupported langs. Emit `function_record`s with file:line + verbatim body + parsed signature.
- **Spec mode**: walk `.pipeline/architecture/sprints/*/tasks/*.yaml`. Emit `spec_record`s with task ID + description + expected behavior + acceptance criteria.

Each record carries: `id`, `source_location`, `verbatim_body_or_spec`, `parsed_signature`, `language_or_format`.

### Stage 2 — Signal extraction

For each record, compute the 5 signals:

| Signal | How (code mode) | How (spec mode) |
|---|---|---|
| Lexical | label kebab-case via LLM, body token-set | description token-set, name kebab-case via LLM |
| Structural | AST shape fingerprint OR LLM-sketch | N/A (specs aren't executable) |
| Signature | extracted from AST/parse | extracted from spec's "inputs" + "outputs" fields if present |
| Behavioral | LLM "what does this compute?" → canonical statement | LLM "what would the implementation do?" |
| Abstraction | composite detection via cross-record call graph | composite detection via spec mention of other task IDs |

Labels constrained by a **controlled verb vocabulary** loaded from `engine/canonical-verbs.yaml` (~60 verbs: fetch, extract, compute, compare, validate, dispose, allocate, register, parse, render, etc.). Indexer LLM must pick from list. This single change kills ~80% of label drift observed in Scalable Crowd run.

### Stage 3 — Cluster

Two-pass:

**Pass A (deterministic, Python):**
- Group records by exact label match
- Merge near-label-matches by edit distance (Levenshtein ≤ 2 on kebab tokens, OR shared verb stem after stopword stripping `-on-load|-at-X|-when-Y`)
- Output: candidate groups (~100 groups for an 826-function codebase)

**Pass B (LLM cluster-review, parallel sub-agents, one per group):**
- Each sub-agent receives ONE group (3–20 records max) + the 5-signal data + the frozen schema
- Sub-agent confirms merge or splits (e.g., "label looks similar but signal 4 says they compute different things — split into 2 clusters")
- Returns one or more schema-conformant glossary entries per input group

**Pass C (master aggregation + spot-check):**
- Collect all returns
- Random sample: 3 instances per cluster, re-read source, confirm verbatim body matches `body_excerpt`. Drop instances on quote drift; mark cluster `verification_status: quote_drift_detected` if >50% of sampled instances fail
- Schema-validate
- Compute extractability score per cluster

### Stage 4 — Render

**Code mode** → write `GLOSSARY.yaml` + `GLOSSARY.md`
**Spec mode** → produce `ORGANIZE-REPORT.md` with proposed consolidations, prompt user, apply approved edits to architect outputs

## 6. Frozen schema (v1)

```yaml
schema_version: 1
generator: code-glossary
generator_version: <X.Y.Z>

metadata:
  generated_at: <iso8601>
  mode: code | spec
  scope: { paths: [...], excludes: [...], include_tests: bool }
  totals: { records_indexed: N, clusters: M, extractable: K }
  language_or_format_mix: { python: 0.4, typescript: 0.4, csharp: 0.2 }
  dispatch_count: { indexer_batches: K, cluster_reviewers: M, verifiers: N }
  runtime_seconds: <int>

glossary:
  - id: gloss-001
    name: <kebab-case canonical>
    description: <one sentence, what it DOES>
    kind: leaf | composite                          # piece 2
    composed_of: [gloss-002, gloss-005]             # only if kind: composite
    extractable: true | false
    extractability_score: <float 0-1>               # piece 4
    extractability_confidence: high | medium | low  # piece 3
    canonical_signature: <pseudocode>               # required if extractable
    proposed_module: <path under existing helper dir>  # required if extractable
    invariant_skeleton: |                           # required if extractable
      <pseudocode of shared structure>
    variant_axis:                                   # required if extractable
      - parameter: <name>
        instance_values: [...]
        inferred_type: <type>
    instances:
      - instance_type: function | block | spec
        source_location:
          file: <relative path>
          line: <int>
          function: <name>                          # required if instance_type: function
          parent_function_id: <gloss-id>            # required if instance_type: block
          task_id: <task spec id>                   # required if instance_type: spec
        verbatim_body: |
          <quoted source>
        variant_values: { ... }
        language_or_format: <string>
    related_functionalities: [<gloss-id>, ...]
    verification_status: verified | quote_drift_detected | inconclusive
    signal_agreement: { lexical: 0.9, structural: 0.85, signature: 1.0, behavioral: 0.9, abstraction: 0.8 }
    notes: <free text; always required if extractable: false>
```

Schema is **versioned**. Downstream consumers check `schema_version` and fail loudly on mismatch.

## 7. Tech stack

- **Language**: Python 3.11+ (verified: user has 3.10.6 default + 3.12.10 via `py -3`; pin at 3.11 minimum, runs on 3.12 cleanly)
- **Package manager**: `uv` (already on user PATH, 0.9.26 verified)
- **Parsing**: `ast` stdlib (Python), `tree-sitter` + `tree-sitter-typescript` + `tree-sitter-c-sharp`
- **Embeddings (for label/description similarity)**: TF-IDF baseline first (zero new dep, scikit-learn or pure Python). Upgrade to `sentence-transformers` only if TF-IDF underperforms on real corpora.
- **LLM**: Claude Code Agent tool dispatches only. NO external LLM SDK (no Anthropic SDK direct calls, no OpenAI, no Gemini). All LLM-dependent work happens in the SKILL.md layer (which dispatches sub-agents via Agent tool). The Python engine handles all deterministic work (AST parsing, structural fingerprinting, signature extraction, Pass A clustering, schema validation, rendering). The SKILL.md handles LLM work (LLM-sketch fallback for non-AST languages, behavioral judge, Pass B per-cluster review).
- **Install**: `uv tool install` for the standalone CLI; ships with the plugin
- **No native deps beyond tree-sitter** (pip-installable on Windows verified before wave 1 closes)

## 8. Trust & verification (piece 11 — Claude's call)

Substrate-verify is already locked at the instance level (master re-reads 3 random instances per cluster, drops on quote drift). For the LLM-judgment fields (canonical_signature, proposed_module, variant_axis, behavioral signal):

- **Every LLM-produced field carries a confidence** (high/medium/low) returned by the sub-agent and validated against signal agreement.
- **`extractability_confidence` aggregates** the signal scores into a single visible flag. If you only trust `high`, filter by it.
- **`signal_agreement` block is exposed in the YAML** so downstream tools (and humans) can see which signals voted yes vs no per cluster. No black-box confidence.
- **Verification status per cluster** (`verified | quote_drift_detected | inconclusive`) surfaces clusters where master spot-check failed. These are NOT silently dropped — they're in the glossary with the flag so user knows what to manually review.
- **Trust ledger** at `glossary/.trust/last-verified.yaml` tracks which clusters were manually confirmed by the user across runs. (Future: skip re-verification for ledger-confirmed clusters; v1.1.)

## 9. Configuration (piece 12 — Claude's call)

Per-project config at `<project>/glossary/config.yaml` (optional, sensible defaults if absent). Tool writes a default config on first run.

```yaml
# glossary/config.yaml — defaults shown, all optional
scope:
  paths: [.]
  excludes: [node_modules, .git, dist, build, __pycache__, .venv, target]
  include_tests: false                      # set true to include test files
  file_extensions: [.py, .ts, .tsx, .js, .jsx, .cs, .go, .rs, .java, .rb, .cpp, .c, .h]

clustering:
  canonical_verbs: <path-or-inline>         # override the default verb list
  helper_home_candidates: [src/utils, src/common, lib]   # for proposed_module
  min_instances_for_extractable: 2          # piece 4

execution:
  max_parallel_agents: 20
  estimate_and_confirm: true                # always show estimated agent count + ask before kickoff
  # No $$ caps — runs on Claude Code session tokens. User confirms each big run.

output:
  output_dir: glossary
  include_long_tail: false                  # if false, GLOSSARY.md skips single-instance entries
```

CLI args override config file. Config file overrides defaults.

## 10. Failure handling (piece 13 — Claude's call)

Never silent. Every failure surfaces in the output:

| Failure | Behavior |
|---|---|
| File can't be read (permissions, encoding) | Skip, log to `GLOSSARY-FAILURES.md`, count in summary |
| AST parse fails on a supported language | Fall back to LLM-sketch for that file, note in failures log |
| Sub-agent crashes | Synthetic record with `status: crashed`, sprint continues, surfaced in summary |
| Sub-agent returns malformed YAML | Retry once with stricter prompt; if still fails, batch dropped, logged |
| Cluster verification fails (>50% instances drift) | Entry written with `verification_status: quote_drift_detected`; don't suppress |
| Whole pipeline can't make progress (zero indexed) | Hard fail with diagnostic ("scope empty, all excluded, or unreadable") |
| Agent-count estimate before kickoff | Show estimated dispatch count (no $$ cap — runs on Claude Code session tokens); ask user to confirm before proceeding |

## 11. User experience (piece 14 — Claude's call)

GLOSSARY.md is the primary human entry point. Structure:

```markdown
# Code glossary — <project>

## Summary
- Indexed N functions across M files
- K canonical clusters
- J extractable (>=2 instances + clear variant axis)
- Language mix, runtime, cost

## Top 3 actions (do these first)
1. <highest-score cluster> — <one line>
2. <2nd highest> — <one line>
3. <3rd highest> — <one line>

## Extractable clusters (sorted by score descending)
<full per-cluster sections with proposed signature, instances, variants>

## Watchlist (single-instance entries that might recur)
<collapsed appendix, alphabetical>

## Block-level secondary findings
<duplicated sub-function patterns>

## Failures
<files that couldn't be indexed, agents that crashed, drift-detected clusters>
```

IDs (`gloss-NNN`) are greppable. File:line links are formatted for IDE clickability where possible.

Interactive review TUI/UI is out of scope for v1 — defer to v2 if real usage warrants it.

## 12. v1 implementation plan (rough)

| Wave | Tasks |
|---|---|
| 1 | Engine skeleton: `engine/` Python package; controlled verb list; record/cluster/signal dataclasses; frozen schema validator |
| 2 | Stage 1 indexer: code-mode adapter (Python AST first); tests against `mk-cc-resources/plugins/plugin-toolkit/`; LLM-sketch fallback for non-AST |
| 3 | Stage 2 signal extraction: lexical (TF-IDF baseline first; embeddings later), structural (Python AST fingerprint), signature, behavioral LLM, abstraction |
| 4 | Stage 3 clustering: deterministic Pass A + parallel LLM Pass B + master spot-check Pass C |
| 5 | Stage 4 render: YAML emit + MD emit; verify against Scalable Crowd as reference codebase |
| 6 | tree-sitter integration: TypeScript + C# parsers; re-run Scalable Crowd, compare to v1 output |
| 7 | `/code-glossary` SKILL.md v2: replace current 5-phase SKILL.md with one that drives the engine |
| 8 | Spec-mode adapter (for `/organize`): consumes task-spec YAML, emits records |
| 9 | `/organize` SKILL.md + essense-flow state-machine wiring + autopilot map |
| 10 | `/glossary` SKILL.md + essense-flow state-machine wiring + autopilot map |
| 11 | Documentation cascade: plugin-toolkit RELEASE-NOTES + version bump + marketplace + bundle + CLAUDE.md + README; essense-flow RELEASE-NOTES + version bump |
| 12 | Acceptance run: full pipeline on Scalable Crowd (`/code-glossary` standalone), full pipeline on plugin-toolkit (smaller sanity-check), `/organize` dry-run on an existing essense-flow sprint |

## 13. Roadmap beyond v1

### Designed alongside v1, built as v3 (`/dry-refactor`)

See **Appendix A** for the full design. Schema field requirements in §6 already account for what `/dry-refactor` needs to consume (canonical_signature, proposed_module, invariant_skeleton, variant_axis, full instance bodies, verification_status). Locking that schema now means the executor can be built later without re-designing the producer.

### Deferred to v1.1+ (not designed yet)

- Re-run snapshot + diff (`GLOSSARY-DIFF.md`)
- Incremental indexing (only re-process changed files since last run)
- Embedding upgrade if TF-IDF baseline is insufficient
- Interactive review UI (TUI or web)
- Per-cluster manual confidence override + trust ledger
- CI integration (`exit 1` if new instance of known gloss-id added)
- `/review` DRY-violation lens
- Cross-project glossary federation (run on multiple repos, find cross-repo reuse opportunities)

## 14. Locked decisions table (cross-reference)

| Piece | Decision | Locked |
|---|---|---|
| 1 | Tool identity = glossary builder + extraction enabler. Standalone AND essense-flow-integrated. | ✓ |
| 2 | Functionalities form a tree (leaves + composites). Both first-class. `composed_of: [...]` references. | ✓ |
| 3 | "Same idea" = multi-signal cross-validation (lexical + structural + signature + behavioral + abstraction). Confidence = signal agreement. | ✓ |
| 4 | Aggressive proposal threshold: 2+ instances. Extractability score on each. | ✓ |
| 5 | `<project>/glossary/GLOSSARY.yaml` + `GLOSSARY.md`. Frozen schema. Tool does NOT touch .gitignore. | ✓ |
| 6 | v1 languages: Python (stdlib AST) + TypeScript (tree-sitter) + C# (tree-sitter). Others LLM-sketch fallback. | ✓ |
| 7 | essense-flow: `/organize` (post-architect, spec mode) + `/glossary` (post-build, code mode). New phases. | ✓ |
| 8 | `/organize` propose-with-confirm. `/glossary` propose-only. `/dry-refactor` is v2 of v2. | ✓ |
| 9 | Re-runs: fresh each time in v1. Diff in v1.1. | ✓ |
| 10 | Scale: works at any size. Concurrency cap + cost transparency. | ✓ |
| 11 | Trust: per-field confidence + signal agreement exposed in YAML + verification status flag. Trust ledger v1.1. | Claude |
| 12 | Config: `<project>/glossary/config.yaml`. CLI args override file. Tool writes defaults on first run. | Claude |
| 13 | Failures: never silent. Per-failure-type behavior table. | Claude |
| 14 | UX: GLOSSARY.md sorted by score, top 3 actions, watchlist, failures section. | Claude |
| 15 | LLM = Claude Code Agent tool dispatches only. No external LLM SDK. Engine = deterministic Python; SKILL.md = LLM orchestration. | session 2 |
| 16 | Agent budget = no hard cap. Tool reports estimate, asks confirm before kickoff. Runs on Claude Code session tokens. | session 2 |
| 17 | Python 3.11+ min, pinned via pyproject.toml. uv for install. tree-sitter + tree-sitter-typescript + tree-sitter-c-sharp installed in wave 1.5. | session 2 |
| 18 | Branch: direct to main, one commit per logical chunk. NEVER pushed without explicit user OK. | session 2 |
| 19 | v1 SKILL.md marked deprecated immediately, deleted when v2 ships. | session 2 |
| 20 | Tests: golden fixtures (small handcrafted) + Scalable Crowd A/B comparison against the hand-curated Python-helper artifact. Both pass = done. | session 2 |
| 21 | `/dry-refactor` designed alongside v2 (Appendix A), built later as v3. | session 2 |
| 22 | Real essense-flow sprints available: 16 in Scalable Crowd, 3 in BiananceRepo. Spec-mode adapter design reads these. | session 2 |
| 23 | Canonical verb list: I seed ~60 from common code-action verbs; user overrides via config anytime. | session 2 |

---

## Appendix A — `/dry-refactor` (designed now, built as v3)

### Purpose

Execute the extractions that `/code-glossary` (or `/glossary`) proposed. Reads `GLOSSARY.yaml`, performs the refactor for one cluster (or all high-confidence clusters), with test-after-each safety.

### CLI shape

```
/dry-refactor <glossary.yaml> <gloss-id>            # single cluster
/dry-refactor <glossary.yaml> --all-high-confidence # batch all high-conf extractable clusters
/dry-refactor <glossary.yaml> --dry-run             # show planned edits, no writes
```

### Pre-flight checks (before ANY code modifications)

| Check | If fail |
|---|---|
| Test suite passes currently (baseline) | Hard stop — "fix tests first; can't extract safely" |
| Git working tree clean (changes will be visible) | Warn; offer to stash or abort |
| Target module path: exists OR user OK to create | Ask user; never silent dir creation |
| Cluster `verification_status == verified` | Refuse unless `--override-unverified` flag |
| Cluster `extractability_confidence >= configured-min` (default `high`) | Refuse unless `--override-low-confidence` |
| All instance `body_excerpt` still match disk (substrate-verify) | Refuse — glossary is stale; suggest re-run `/glossary` |
| Each instance file is not in `.gitignore` | Warn; some instances may not be tracked |

### Execution per cluster

1. Generate the extracted helper:
   - Use `canonical_signature` as the function signature
   - Use `invariant_skeleton` as the body, with `variant_axis` params replacing the literal differences
2. Write the helper to `proposed_module`. If the file doesn't exist, create it (after user pre-flight OK).
3. Add the import statement(s) to all instance files.
4. Run test suite. If any failure → hard stop, roll back the helper file + imports, report what failed.
5. For each instance in the cluster:
   a. Re-read the file (substrate-verify body_excerpt still matches)
   b. Replace inline implementation with call to new helper (parameterized with this instance's `variant_values`)
   c. Save file
   d. Run test suite
   e. If pass → atomic commit (config-dependent granularity)
   f. If fail → roll back this file only, log "extraction failed for this site", continue to next instance
6. Final report: which sites migrated, which failed, helper file written, tests delta.

### Failure modes

| Failure | Behavior |
|---|---|
| Test suite baseline failure | Hard stop before any change. "Fix tests first." |
| Generated helper has syntax error | Roll back; log; abort cluster. |
| Target module path conflicts with existing function name | Ask user: rename helper, rename existing, or abort. |
| Test failure during call-site rewrite | Roll back THIS file only (preserve previous successful migrations + helper). Mark site failed. Continue. |
| Cluster has 5+ instances and 3+ fail | Hard stop the cluster (the abstraction is likely wrong); roll back to pre-cluster state on user OK. |
| Substrate-verify failure on any instance | Refuse the cluster; "glossary is stale, re-run /glossary first". |

### Configuration (extends `glossary/config.yaml`)

```yaml
refactor:
  min_confidence: high                        # high | medium — refuse clusters below
  require_verification_status: verified       # verified | any
  commit_granularity: per_cluster             # per_cluster | per_call_site
  on_test_failure: rollback_this_site         # rollback_this_site | rollback_cluster | hard_stop
  test_command: auto                          # auto | "pytest tests/" | "npm test" | etc.
  pause_for_review: true                      # if true, after writing helper but before call-site rewrites, ask user to review the helper
```

Test command auto-detection by repo signal:
- `pyproject.toml` present + `pytest` in dev deps → `pytest`
- `package.json` with `test` script → `npm test`
- `*.csproj` present → `dotnet test`
- `Cargo.toml` → `cargo test`
- `go.mod` → `go test ./...`
- None detected → user must set explicitly

### Output

- `<project>/glossary/refactor-history/<timestamp>.md` — per-run report: cluster, helper written, sites migrated/failed, commits made, test results
- Git commits (per granularity)

### Composition

- Manual: `/dry-refactor <glossary.yaml> <gloss-id>`
- Batch: `/dry-refactor <glossary.yaml> --all-high-confidence`
- Future essense-flow integration: `/review` DRY-violation lens proposes; user approves; `/dry-refactor` executes (closing the audit + fix loop)

### Schema requirements (already satisfied by §6)

`/dry-refactor` consumes these fields from each cluster entry; the v1 schema must guarantee them:

- `id`, `extractable`, `extractability_confidence`, `verification_status` — pre-flight gates
- `canonical_signature` — function signature for the helper
- `proposed_module` — target file path
- `invariant_skeleton` — body template
- `variant_axis[].parameter`, `variant_axis[].instance_values`, `variant_axis[].inferred_type` — parameter list
- For each `instance`: `file`, `line`, `function`, `body_excerpt`, `variant_values` — what to replace and with what

All present in §6 schema. No schema changes needed when `/dry-refactor` is built later.

### Out of v3 scope (deferred to v4+)

- Cross-cluster batch coordination (extract gloss-001 + gloss-003 atomically when they share call sites)
- Helper-of-helpers (extract a higher-level composite that calls existing extracted helpers — `kind: composite` in glossary)
- Cross-repo extraction (extract to a shared library used by multiple repos)
- Undo/redo across multiple `/dry-refactor` runs
