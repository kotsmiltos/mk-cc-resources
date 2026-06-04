# Release notes — plugin-toolkit

## 1.3.0 — /code-glossary v2.1: recall fixes from the acceptance A/B

Every change maps to a measured recall loss in the v2 acceptance run (Scalable Crowd A/B vs the hand-curated reference: 20 FOUND / 8 PARTIAL / 12 MISSED). Engine 2.1.0, 437 tests.

- **Recursive body-size floor** — the floor now counts significant nodes in the body subtree (statements + calls/constructions/operators), not top-level statements. Fat one-liners index (`try{Register();}catch{}` — the flagship n=12 miss); bare assignments stay out. C# property accessors index as `<Property>.<kind>`; expression-bodied members (`=> SafeDispose()`) index at 1 significant node. `--min-statements` flag for tuning. SC corpus: 662 → 841 records, all 5 floor-missed reference families recovered, noise bucket +22% (measured: intentional call-wrapper recall, not the binary knob).
- **Deterministic judge candidates** — `runner near-misses` emits label-prefix pairs, name-match singleton adoptions (catches the dropped ClosestPointOnSegment variants), and signature-only bucket samples (the unreviewed n=143 bucket gets sampled). Judges are part of the step-3 confirmed budget — non-skippable. `adopt` verdicts join singletons to clusters via `adopt_record_ids`.
- **Block-level duplication scanner (MVP, opt-in)** — `index --scan-blocks` + `block-cluster`: function-prologue and loop-prologue windows (K≤2), shape-hashed with the structural serialization; compound-condition + jump predicate kills the trivial-guard flood; min-instances 5; nested-window dedup. Renders as advisory `gloss-blk-NNN` entries in a new "Block-level secondary findings" section. SC corpus: 10 guard families incl. both reference block clusters.
- **EOL discipline** — bodies LF-normalize at capture; artifacts write `newline="\n"`; Pass C compares normalized (92 false-drifts eliminated).
- **Vocab v3** — `index, cluster, bucket, score, iterate` added (147 verbs); these absences demoted 87 labels to `unclear` across the acceptance corpora.
- **Agent returns as files** — all three briefs write YAML to `<work>/returns/` and reply with one line (pasted returns burned ~40% of session context).
- **Self-dogfood applied** — `bucket_by_attribute` extracted per the engine's own cluster-004 finding.

## 1.2.0 — /code-glossary v2: deterministic engine + in-session LLM orchestration

Full rewrite of code-glossary. v1's single-LLM clusterer failed at scale (Scalable Crowd dogfood, 826 C# functions, needed manual curation); v2 splits the work: a deterministic Python engine does everything that doesn't need judgment, in-session sub-agents do everything that does. v1 SKILL.md + briefs deleted as promised in the deprecation banner.

**Engine** (`code_glossary/` Python package, uv-managed, 391 tests):
- Stage 1 index — Python (stdlib ast) + TypeScript/TSX/JS + C# (tree-sitter) parsers emit uniform FunctionRecords (signature, verbatim body, notable calls/inputs/outputs, inline constants). Spec mode: architect task specs → SpecRecords (3 real-world YAML shapes tolerated, incl. frontmatter multi-doc).
- Stage 2 signals — lexical token-sets, structural shape-hash (AST normalize-then-hash; catches Type-2/3 clones; renames + literal changes invisible), signature contract-hash, composite detection. Spec mode: lexical + task-id-mention composites.
- Stage 3 Pass A clustering — deterministic bucketing (structural > signature > label) + scoring + confidence.
- Stage 4 render — GLOSSARY.yaml (frozen schema v1) + GLOSSARY.md; enrichment overlay with a promotion gate (extractable flips true only with canonical_signature + proposed_module + invariant_skeleton + variant_axis + 2+ instances), Pass B split groups, behavioral-judge merges, Pass C quote-drift instance drops.
- `python -m code_glossary.runner` — index / index-specs / apply-labels / signal / cluster / slices / render; `key: value` summaries; exit 2 on hard failure; never-silent failure surfacing throughout.

**SKILL.md v2** (the LLM layer — Agent-tool sub-agents only, NO external LLM SDKs):
- Labeler agents constrained by a 142-verb controlled vocabulary (kills the label drift observed in the v1 dogfood); off-vocabulary labels demote to `unclear`, counted and reported.
- Pass B: one reviewer agent per cluster slice — confirm / split / enrich with extraction design.
- Behavioral judges on near-miss cluster pairs; merge verdicts fold clusters.
- Pass C: master substrate-verifies 3 instances per cluster against disk; drift drops instances and flags entries.
- Estimate-and-confirm before any dispatch; no hard agent cap.

Dogfood: 662 records / 204 C# files / 0 errors / ~4.6s deterministic pipeline on Scalable Crowd; the structural signal finds the BuildFactory clone family (n=6, high confidence) that v1 needed hand-curation to surface.

Also powers essense-flow 0.15.0's `/organize` (spec mode, post-architect) and `/glossary` (code mode, post-build) phases.

## 1.1.0 — Add /code-glossary

New skill: **code-glossary** — audits any codebase for DRY violations and writes a functionality glossary.

- Reads source files via LLM (polyglot — no AST dep): Python, TypeScript, JavaScript, Go, Rust, Java, and others.
- 5-phase workflow: scope → index (parallel sub-agents) → block scan → cluster → write artifacts.
- Each function gets a canonical functionality label (`verb-object-qualifier`, kebab-case) decoupled from how it's written. Identical labels across files cluster into one glossary entry.
- For clusters with ≥2 instances and a clear variant axis, identifies invariant skeleton + variant parameters and proposes a `canonical_signature` + `proposed_module` (helper home anchored to existing project dirs).
- Sub-block scanner finds 3+ line duplicated patterns inside functions as secondary instances.
- Substrate-verify discipline — every instance carries `file:line` + verbatim `body_excerpt`; master rejects entries failing the quote check on disk re-read.
- Output: `GLOSSARY.yaml` (frozen schema, machine-readable for downstream tools) + `GLOSSARY.md` (human-readable summary, top extractables first).
- Glossary-only — does NOT execute refactors. Future `/dry-refactor <gloss-id>` and essense-flow `/architect` pre-check would consume the YAML.

Use when the codebase feels WET, before a refactor pass, or before designing a new module that may overlap with existing code.

## 1.0.0 — Initial release

Plugin/skill development + maintenance toolkit. Four composable skills:

- **skill-heal** — audit a plugin's skill set against current best practices. Dispatches parallel review agents (one per skill), scores against rubric (Anthropic best practices + token efficiency + architecture coherence), produces per-skill scorecard + systemic-issue summary. Diagnostic only — never applies changes.
- **plugin-scaffold** — bootstrap a new mk-cc-resources plugin. Generates directory tree + plugin.json + SKILL.md skeletons + marketplace.json entry + mk-cc-all bundle update + README/CLAUDE.md additions + RELEASE-NOTES.md. Mechanical 9-step chain in one invocation.
- **version-bump** — cascade version updates across plugin.json + marketplace.json entry + mk-cc-all bundle (if affected) + marketplace metadata + RELEASE-NOTES.md. Validates semver consistency. Composable — @ship references this.
- **docs-audit** — cross-document drift audit. Compares CLAUDE.md + README + marketplace.json against disk state. Finds version mismatches, stale references, missing entries. Proposes targeted edits per file for user approval. Broader scope than session-lifecycle's /claude-md-sync (which covers CLAUDE.md only).

Designed for composability: skills invoke each other where appropriate, @ship references /version-bump + /docs-audit, /skill-heal hints at /docs-audit when description quality is weak.
