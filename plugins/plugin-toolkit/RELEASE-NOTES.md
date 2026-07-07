# Release notes — plugin-toolkit

## 1.7.1 — /version-bump: the bundle version is TWO writes, each verified

Observed failure (drifted 2 versions before caught): step 5 packed both bundle-version writes into one bullet ("Update both ..."), and real ships bumped the root `.claude-plugin/plugin.json` while the `mk-cc-all` entry in `marketplace.json` silently lagged (2.18.0 vs 2.20.0). One-bullet-two-actions is the classic under-fire shape.

- Step 5 now names the failure and lists the two writes as separate numbered items (root plugin.json version; mk-cc-all marketplace entry set to the SAME value).
- Step 8 verification gains an ALWAYS-run equality check: root plugin.json version == mk-cc-all marketplace entry version, bundled or not — inequality means a prior ship dropped a write; fix now, don't carry the drift.

Verified: the live drift this documents was found and fixed in the same commit (mk-cc-all entry 2.18.0 → 2.20.0, now equal to root).

## 1.7.0 — code-glossary 2.5.0: the open-for-extension enforcer (`runner extensibility`)

The keystone of the "modularity drift" fix. essense-flow *stated* modularity as a value but never *measured* it, so the human was the only open-closed gate and corrections never propagated (a fix landed on one site; identical coupling survived elsewhere). This makes extensibility a CHECKED FACT — the same arc the engine already uses: it measures DUPLICATION to enforce DRY, COUPLING to enforce DECOUPLED, and now **DISPATCH ENUMERATION to enforce OPEN-FOR-EXTENSION**.

- **`runner extensibility --root <src> --out EXTENSIBILITY.yaml [--axes ledger.yaml]`** — answers the user's real test: "add one new instance of an axis → how many existing sites must I edit?" Per axis it lists every **edit-site** — the enum declaration plus each `switch` / `switch`-expression / if-else-if ladder / dict dispatch that ENUMERATES the axis's instances — and the COUNT. `0` dispatch sites = open; `N>0` = closed, each named `file:line`.
- **Sites bind to an axis by case-label membership — NO type inference.** A construct whose case-labels / compared-literals / dict-keys overlap an axis's instance set by ≥2 members is a dispatch on that axis (the ≥2 is a structural disambiguator — one shared label is ambiguous, two members of the same closed set is the unmistakable signature of exhaustive enumeration — not a tunable threshold). Deterministic, language-agnostic, never guesses.
- **Default-closed false-flag guard** (mirrors architect-alignment criterion 9 + coupling's conservatism): a site is measured ONLY against a DECLARED growth axis (from /elicit's ledger) or an INTRINSIC axis (any enum with ≥2 members — a closed set the language author declared). No axis → no flag; a `switch` on an arbitrary int never fires.
- **No arbitrary numbers.** The edit-count is a MEASUREMENT (reported, never gated). The gate is BINARY: a **declared-OPEN** axis that still carries ≥1 dispatch site is a violation (you promised it open; an exhaustive switch breaks that), `--fail-on-violation` exits 1. Intrinsic enums are measured + advisory (we don't *know* the human wanted them open).
- **Verifiable check met** — applied to the retro's JobClass case the engine mechanically reproduces the human finding: **"add a JobClass = 4 edits / 2 files incl. a duplicated switch"** with a `file:line` per site (`tests/fixtures/extensibility/jobclass/`). 22 new tests (14 pure-model + 8 scanner/e2e on the real tree-sitter C# grammar); **613 total, green**.
- **Itself decoupled** — `extensibility.py` is a PURE model (no I/O, no tree-sitter, testable with hand-built lists); `indexer/dispatch_scanner.py` is the impure tree-sitter layer (the block_scanner precedent). It practices the open-closed shape it enforces.
- **MVP language scope: C#** (the colony-sim / JobClass substrate + the verifiable check). The per-language extractor seam is in place; TS/JS + Python slot in next. essense-flow consumers (/elicit axis ledger, /review extensibility lens, /verify extensibility-compliance, architect+review correction-sweep) land in the following increment — same engine-first cadence as `runner coupling` (1.6.0). Design source: `EXTENSIBILITY-MEASURE-DESIGN.md`.

## 1.6.0 — code-glossary 2.4.0: the decoupling enforcer (`runner coupling`)

Propagates essense-flow's "build decoupled" principle (0.21.0) into the shared engine — Target 1 of the decoupling propagation. The engine already measures DUPLICATION to enforce DRY; this measures COUPLING to enforce DECOUPLED, the same arc. One new deterministic subcommand, zero schema changes; the module is itself decoupled (pure, no engine-stage imports, reusable on any call graph).

- **`runner coupling --records <records.yaml> --out COUPLING.yaml`** — reads the Stage-1 call graph and emits threshold-free facts: per-module afferent/efferent **counts** (measurements, reported never gated); **cycles** (module-graph SCCs >1 member — a dependency cycle exists or it does not); **reach-ins** (a cross-module call into a callee that is internal by the language's own naming convention — Python `_name`, dunders excluded, languages without an unambiguous private marker never flag). Cycles + reach-ins are the gate-worthy binary violations; `--fail-on-violation` exits 1 (CI gate), default report-only exits 0. Each violation is named `file:function` so a reviewer (or the essense-flow review `coupling` lens) substrate-verifies the cited site instead of re-hunting it.
- **Scope-aware resolution is what makes the gate trustworthy** — a call binds to a same-module definition when one exists; it resolves cross-module ONLY when no local match. Without it, a private helper name duplicated across modules (two `_jaccard`s) fabricates phantom cross-module edges and phantom cycles. Verified on the engine itself: the naive name-resolver reported 5 reach-ins (4 false — `_jaccard`/`_build_parser` collisions, confirmed by reading source); scoped resolution leaves exactly 1 real reach-in (`block_scanner._build_block` → `signals.structural._serialize_shape`, a genuine private cross-module import at `indexer/block_scanner.py:48`).
- **No arbitrary numbers** — every gate is a binary structural fact (cycle present? reach-in present?), never a magic threshold. Counts are surfaced but never gate. 25 new pure unit tests on hand-built graphs (591 total); the coupling module needs no engine run to test — it practices the decoupling it enforces.
- Wired into the `/code-glossary` SKILL run (emits `COUPLING.yaml` alongside MAP.md). Engine consumers (essense-flow /architect design-time gate, /review coupling lens fed pre-computed evidence, /verify contract-compliance) land in following targets.

## 1.5.1 — code-glossary 2.3.1: indexer sees CommonJS/ESM source

Two verified indexer-coverage gaps from a live run on essense-flow (engine 2.3.1, 566 tests):

- **`.cjs`/`.mjs` index as javascript, `.cts`/`.mts` as typescript** — same tree-sitter grammars as `.js`/`.ts`. Previously these extensions were a SILENT miss: unmapped extensions never even reached `languages_skipped`. On essense-flow the fix takes indexed JS files 9 → 25 (209 records), recovering the 7k-line CLI plus all of `lib/*.cjs`.
- **`bin` removed from the walker's DEFAULT_EXCLUDES** — .NET `bin/` holds compiled binaries (nothing with a mapped source extension), but Node projects keep real CLI entry-point source there; `bin/essense-flow-tools.cjs` (88 function records) was invisible. .NET's generated-source dir `obj/` stays excluded.
- **Block-scanner finding documented (DESIGN-V2.md decision 34)** — post-fix, `--scan-blocks` emits 172 JS block records on essense-flow but 0 clusters at the default `min-instances 5` (largest shape family n=3; 11 clusters at `--min-instances 2`). Mid-function repeated shapes (9-branch if-else dispatch chains, repeated validator bodies) fall outside the MVP's two prologue window shapes by design — known limitation, not a pattern-table gap; threshold knob already exposed via `block-cluster --min-instances`.

Regression tests: `.cjs`/`.mjs`/`.cts`/`.mts` language mapping, `bin/` walkability, and an end-to-end `bin/tool.cjs` → FunctionRecords orchestrator test.

## 1.5.0 — code-glossary v2.3: the functionality map (`runner map`)

One new deterministic subcommand, zero schema changes: `runner map --glossary GLOSSARY.yaml --out MAP.md` renders the codebase's functionality map — the consult-before-designing artifact.

- **Mermaid graph**: subgraph per module (module = mode of instance-file path segments, `--group-depth` tunable — NOT `proposed_module`, which is null on non-extractables); duplication families as `×N` rectangles, composites as hexagons with `composed_of` arrows, cross-module edges dashed. Node budget 100 → auto per-module graphs → top-N truncation.
- **Machine index**: lossless fenced-yaml block (every entry exactly once — graph nodes under `modules:`, singles under `singles:`), sliceable per module/file. This is what essense-flow 0.17.0's /architect and /build inject into sub-agent briefs.
- Singles collapsed in a `<details>` list; `--include-singles`, `--min-instances`, `--no-graph` escape hatches. 32 new tests (562 total) incl. v1-flat parity, determinism-under-shuffle, lossless round-trip on real corpora (426- and 728-entry glossaries).

## 1.4.0 — code-glossary v2.2: sharpenings + the three unbuilt chapters

Engine 2.2.0, 530 tests. Two engine sharpenings plus the three design chapters that v2 left unbuilt: composites in practice, drift tracking, and the /dry-refactor MVP.

- **Signature-bucket pre-split** — signature buckets ≥20 members fragment by sorted leaf call names before merge (sub-groups ≥2 survive; singles pool into a residual). Signature hashes are coarse; call cohesion recovers signal from the noise bucket. SC corpus: the n=175 noise bucket → 116 residual + call-cohesive groups (20/9/5/4/4 + pairs).
- **Two shape-hash relaxations** (equivalence-adding only) — (1) `variable_declaration` type-field child collapses to `(ty)`: `var` vs explicit type can't split clone families (SC skip-inactive 13+13 → one n=28 family); (2) single-statement if/else brace blocks serialize as the statement: cosmetic braces invisible (SC lifecycle-guard 8 → 10 + sibling 5).
- **Composites made real** — `slices --fingerprints` attaches `composed_of_candidates` ({record_id, function, file}, resolved from the abstraction signal) to every slice member; the cluster-reviewer brief judges `kind: composite` with real ids; the renderer rewrites record-ids → gloss-ids in a post-pass (every record has an entry home). Unresolvable refs stay verbatim + loud note; self-loops drop; a composite emptied by self-loops demotes to leaf. The schema's "list of gloss-ids" contract is now true in emitted artifacts.
- **Drift tracking (`runner diff`)** — compare two GLOSSARY.yaml runs: entries match by {(file, function)} instance-identity sets (gloss-ids are positional, record ids line-sensitive — neither survives a re-run), greedy Jaccard ≥0.5 with name tie-break. Six classes: added / removed / **grown** (new duplication sites — the drift signal) / shrunk / extractable_changed / verification_changed. Watchlist singles excluded by default; `--fail-on-drift` for CI-style exit 1; v1 flat-instance artifacts accepted as `--old`. Real check: the diff caught the new ORCABurst build's clone sites in Scalable Crowd.
- **/dry-refactor v3 MVP (new skill)** — preflight + dry-run only, **zero source writes**. Engine sub-package `code_glossary.dry_refactor`: frozen-schema loader, substrate-verify (Pass-C rule: LF-normalized both sides, ±5 line tolerance — CRLF disk vs LF excerpt matches), test-command auto-detection, the 7 Appendix-A gates as a structured report, CLI runner (`preflight|substrate|detect-test`, exit 0/1-blocked/2). SKILL relays gates per the Appendix-A severity table, then prints the planned helper + per-site edit plan. Live execution (writes, rollback, test-after-each) ships later behind its own gate. A test asserts the entire MVP surface never speaks of pushing.

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
