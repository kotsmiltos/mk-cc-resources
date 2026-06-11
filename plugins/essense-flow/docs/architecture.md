# Architecture — essense-flow

This document walks the essense-flow topology at the depth an operator or contributor needs to make changes without breaking the contract surface. The shape: eleven skills, twelve sub-agent definitions, two hooks, one narrow state CLI backed by nineteen lib modules, four canonical artifact schemas, one transitions graph. The discipline that holds the shape together is encoded in SKILL.md prose plus audit tests; this document names the load-bearing pieces and how they connect.

## Module map

The plugin lives under `plugins/essense-flow/` with the following top-level structure:

```
plugins/essense-flow/
├── .claude-plugin/
│   └── plugin.json          # plugin manifest (name, version, description, author)
├── README.md                # operator-facing entry point
├── SECURITY.md              # threat model + reporting + mitigations + known limitations
├── TRUST.md                 # trust boundaries + handoff contract + Claude assumptions
├── RELEASE-NOTES.md         # version-by-version changes, top-down
├── docs/
│   └── architecture.md      # this file
├── references/
│   ├── principles.md        # the 5 principles + Conduct, cited by every SKILL.md
│   ├── librarian.md         # research-first + unknowns[] + surface-at-gate protocol
│   ├── transitions.yaml     # legal phase-transition graph; state writes validate against this
│   ├── phase-command-map.yaml # phase → recommended next command (read by next-step hook)
│   ├── decision-schema.yaml # decisions.yaml entry shape
│   ├── annotation-shape.yaml# in-code exemption annotation shape
│   └── schemas/             # THE canonical artifact shapes — single source
│       ├── task-spec.schema.yaml
│       ├── completion-record.schema.yaml
│       ├── register-item.schema.yaml
│       └── unknown-entry.schema.yaml
├── skills/                  # one directory per skill, each with SKILL.md + optional templates/
│   ├── elicit/  research/  triage/  architect/  organize/
│   ├── build/   glossary/  review/  verify/
│   └── context/ heal/
├── agents/                  # 12 sub-agent definitions the skills dispatch against
├── bin/
│   └── essense-flow-tools.cjs # the narrow CLI — single gateway for state ops + skill init
├── lib/                     # 19 single-purpose modules behind the CLI and skills
├── hooks/
│   ├── hooks.json           # event registrations (UserPromptSubmit, SessionStart, Stop)
│   └── scripts/
│       ├── context-inject.js
│       └── next-step.js
├── commands/                # 14 slash command wrappers
├── defaults/                # config.yaml + state.yaml templates
├── scripts/                 # self-test, validate-plugin, render-schema-docs
├── test/                    # 49 suites — CLI ops + lib modules (node test/run-all.cjs)
└── tests/                   # audit + primitive suites (node scripts/self-test.js)
```

Top-level boundary:

- **Skills** carry contracts (SKILL.md prose).
- **Agents** carry per-role dispatch contracts (return shapes rendered from the schemas).
- **bin + lib** carry mechanism (state gateway, inference, validation, dispatch, verification).
- **hooks** carry advisory surfacing.
- **references** carry shared truth (principles, librarian protocol, transitions graph, canonical schemas).

No cross-layer leak: skills do not write state directly (they call the CLI), lib does not embed skill-specific logic, hooks do not block tool calls. The layer separation is enforced by SKILL.md prose ("advance phase via `state-set-phase`, not direct writes") plus audit tests (`tests/no-caps.test.js` greps for fail-closed patterns; zero hits permitted).

The plugin's `.claude-plugin/plugin.json` manifest declares only name, version, description, and author. Hooks are registered in `hooks/hooks.json`; skills and commands are discovered by Claude Code from the `skills/` and `commands/` directories. Convention over configuration.

## Three load-bearing inversions

Three design commitments shape everything below; each replaced a drift mechanism with a derivation.

### Schema single-source

`references/schemas/*.schema.yaml` are THE artifact shapes — task spec, completion record, register item, unknown entry. Everything that teaches or checks a shape derives from them:

- `lib/schema-validate.cjs` is a generic validator engine driven by the schema files: required keys, per-field type checks, enums (`agency_level`, statuses), the task-id pattern. The CLI's `task-spec-write` and `record-task-completion` validators are instances, not hand-maintained copies.
- `scripts/render-schema-docs.cjs` (`npm run render-schemas`) renders shape blocks into the doc sites that teach the shape — the sub-architect brief, the task-spec and completion-record templates, the agent-definition AUTOGEN blocks, and `librarian.md`'s unknown-entry shape.
- `test/schema-docs-drift.test.cjs` fails the suite when any rendered block diverges from the schema — hand-editing an AUTOGEN block breaks the build.

Why: hand-maintained parallel copies of a shape WILL drift — at one point two validators in the same file disagreed about the same artifact's key name. Derive, don't copy.

### Artifacts-authoritative state

The artifacts ARE the state; `.pipeline/state.yaml` is a derived cache.

- `lib/infer-phase.cjs` walks the pipeline backwards from the artifact tree and returns ALL candidate phases with evidence. Ambiguity is surfaced, never guessed away.
- The `state-reconcile` CLI op compares cache against inference. Report-only by default; `--apply` rebuilds the cache from artifacts (HEAL-LOG audited; artifacts win on conflict). It tolerates a hard-corrupt cache — the repair tool must not die on what it repairs.
- The degraded-state gates inside ordinary ops (the setter family, `state-set-phase`, `task-spec-write`, `record-task-completion`) auto-rebuild a MISSING cache when inference is confident, then proceed. A corrupt cache still hard-fails, with the inference offered as a hint.

Why: a fresh checkout has artifacts but no cache; a crashed session can leave a stale one. When the cache is the truth source, both dead-end into manual recovery. When the artifacts are the truth source, the cache is rebuildable by construction.

### The librarian protocol

`references/librarian.md`. The model is a librarian — it hands over the best book it has but cannot know which books it doesn't have. Three duties: research first (exhaust what you CAN reach before declaring an unknown); declare unknowns structurally (every producer-agent return carries `unknowns[]`, shape from `references/schemas/unknown-entry.schema.yaml`; the empty array is an explicit claim); surface at the gate (masters register open unknowns via `register-add --kind unknown` and batch them to the user via `AskUserQuestion` — blocking ones before acting, non-blocking ones at the phase gate).

Verdict classes are unknown channels too: a validator's `needs_context`, a verifier's `manual`, a lens's `inconclusive` get the same gate discipline — surfaced, never silently dropped.

The substrate-citation rule is scoped to existing substrate only: prescribed pseudocode asserting behavior of a file that exists on disk must cite the line it read. Library and new-code claims are exempt from citation — but if the author cannot read or run the thing it is claiming about, the claim routes to the unknowns ledger and the spec downgrades to `agency_level: guided` so the build agent (which has Bash) verifies first.

## Per-module

### `skills/`

Each skill is a directory with a single `SKILL.md` and (where the skill produces structured artifacts) a `templates/` subdirectory. SKILL.md is the contract content sub-agents read at dispatch. It carries:

1. **Conduct + propagation cited by reference** — the canonical text lives once in `references/principles.md`; each SKILL.md cites it instead of duplicating it (audited by `tests/conduct-preamble.test.js`, which enforces cite-don't-copy).
2. **Core Principle block** citing the load-bearing principle for that skill (architect cites "lowest amount of sprints necessary"; review cites evidence-bound findings; etc.).
3. **An operating mechanism keyed to the CLI** — first call is `essense-flow-tools init <skill>`, which returns canonical paths, `ordered_steps`, registered sub-agents, and legal transitions as JSON. Skills use the returned strings verbatim; the step cursor (`step-advance`) rejects out-of-order advances.
4. **Phase-producing skills carry a closing block** at the bottom — the legal phase targets and the exact `state-set-phase` invocation, placed last so recency bias works for the rule.
5. **Principle citations in load-bearing sections** for all 5 principles, audited by `tests/principle-citations.test.js`. Citations in incidental prose fail.

Heal's closing variant is per-apply-step because heal walks the recovery graph one step at a time with per-step user confirm.

Skills NOT touched by the master/sub-agent split: `elicit` (dialogue with user; delegating breaks the contract), `context` (read-only state plumbing; no substance volume).

`organize` and `glossary` are optional DRY phases that require the plugin-toolkit code-glossary engine; both hard-stop with an install hint when it is absent, and both are autopilot human gates.

### `bin/` + `lib/`

`bin/essense-flow-tools.cjs` is the single gateway for state operations. The ops that matter for the contract surface:

- `init <skill>` — per-skill JSON (canonical paths, ordered steps, sub-agents, transitions), dispatched through one `INIT_DISPATCH` table (one place to add a skill, not two parallel chains).
- `state-set-phase` — the phase advancer. Validates the edge against `transitions.yaml`, checks the transition's prerequisite artifacts on disk (exit 7 names the missing path), and runs per-task-record gates (sprint-complete requires count_recorded == count_declared).
- `record-task-completion` — sole writer of completion records; validates against the canonical schema.
- `task-spec-write` — schema-validated task-spec writer, including the substrate-citation check for prescribed pseudocode naming on-disk files.
- `state-reconcile [--apply]` — cache-vs-artifacts audit and rebuild (see above).
- `register-add --kind <work|unknown>` — outstanding-work register, including the librarian unknowns ledger.
- `step-advance` / `next-step` — per-skill step cursor; monotonic by construction.

`lib/` holds nineteen single-purpose modules behind the CLI and skills. The ones contributors touch most: `state.js` (cache read/write + transition legality), `infer-phase.cjs` (artifact-tree phase inference), `schema-validate.cjs` (generic schema-driven validator), `brief.js` (sub-agent brief assembly; oversize warns to stderr, never truncates — briefs are contracts), `dispatch.js` (parallel fan-out, sentinel envelope, quorum semantics, no concurrency caps), `verify-disk.js` (re-reads the filesystem after an agent returns; produces the `runner_verification` half of the dual-record), `atomic-write.cjs` + `with-lock.cjs` (write discipline for audit-bearing files), `rule-sweep.cjs` + `pattern-debt-sweep.cjs` (review-rule sweeps across the codebase).

Direct `lib/finalize.js` calls are deprecated in favor of `state-set-phase`; the cognitive work stays in SKILL.md, not in lib.

### `agents/`

Twelve sub-agent definitions: `sub-architect`, `task-agent`, `perspective-agent`, `sub-triager`, `sub-recognizer`, the review lenses (`adversarial-lens`, `architect-alignment-lens`, `rule-completeness-lens`, `pattern-debt-lens`), `validator`, `extractor`, `item-verifier`. Each carries its role contract, tool surface, quorum semantics, and — for every producer agent — the required return shape including `unknowns[]`, rendered from the canonical schemas inside AUTOGEN blocks.

### `hooks/`

Two hook scripts, registered in `hooks/hooks.json`, both advisory, both fail-soft:

- **`context-inject`** — runs on `UserPromptSubmit` + `SessionStart`. Reads `.pipeline/state.yaml`; emits phase + canonical artifact paths + degradation warnings (missing state file, malformed YAML — pointing at `state-reconcile` first) as additional context to the prompt. Never blocks the prompt.
- **`next-step`** — runs on `Stop`. Reads current phase; emits the recommended next slash command (from `references/phase-command-map.yaml`) as advisory text. Never blocks the Stop.

Both fail-soft on degraded state: emit a stderr warning and continue. No fail-closed branches anywhere in hook code (audited by `tests/no-caps.test.js`).

### `references/`

- **`principles.md`** — the 5 governing principles: Graceful-Degradation, Front-Loaded-Design, Fail-Soft, Diligent-Conduct, No Resource Caps — plus the canonical Conduct and propagation blocks every SKILL.md cites by reference.
- **`librarian.md`** — the librarian protocol (above).
- **`schemas/`** — the canonical artifact shapes; the single source everything else derives from.
- **`transitions.yaml`** — the legal phase-transition graph. Schema per edge: `{from, to, requires: [<artifact-precondition>, ...]}` — concrete artifact preconditions only, never quotas or budgets. `state-set-phase` validates against it at run time; `tests/transitions.test.js` audits that every transition cited in any SKILL.md exists in the graph. The graph includes amendment edges — `sprint-complete → architecture` (amend a finished sprint) and `sprinting → triaging` (a sprint pauses for triage) — so mid-flight course corrections are legal moves, not heal-only recoveries.
- **`phase-command-map.yaml`** — phase → recommended next command, read by the next-step hook.
- **`decision-schema.yaml`**, **`annotation-shape.yaml`** — decisions.yaml entry shape and the in-code exemption annotation shape the review validator honors.

Why a separate `references/` directory: shared truth that multiple skills cite needs exactly one source. Principles cited by reference, shapes derived by render — in both cases the canonical wording lives one directory over, and the audit tests catch divergence.

### `scripts/` + `test/` + `tests/`

- **`scripts/self-test.js`** — runs the audit + primitive suites under `tests/`. Green is part of the audit-pass gate for any 0.x release.
- **`scripts/validate-plugin.js`** — validates `.claude-plugin/plugin.json`, the SKILL.md citation audits, and the transitions graph.
- **`scripts/render-schema-docs.cjs`** — renders schema shape blocks into their doc sites; `--check` mode backs the drift test.
- **`test/`** — 49 suites covering the CLI ops and lib modules (`node test/run-all.cjs`): schema validation, phase inference, state reconcile, locking, completion-record gates, schema-docs drift.
- **`tests/`** — the audits: conduct citation (cite-don't-copy), principle citations in load-bearing sections, transitions-graph alignment, the no-caps grep, plus the state/dispatch/brief/verify-disk primitive suites.

`npm test` runs both. The audit tests are not "extra coverage"; they are the mechanism that prevents discipline drift between versions. A skill that copies the Conduct text instead of citing it breaks the build. A skill that cites a phase edge the graph does not have breaks the build. A hand-edited AUTOGEN shape block breaks the build. A hook that smuggles in a fail-closed cap breaks the build.

## Data flow walkthrough

Pipeline walks one phase at a time, artifact-mediated. A typical run:

1. **Operator invokes `/essense-flow:init`** in a fresh project directory. `context/SKILL.md` runs; the CLI seeds `.pipeline/state.yaml` from `defaults/`. No transition logic; this is the initial seed.

2. **Operator invokes `/elicit "<pitch>"`**. Master conducts dialogue with the operator; produces `.pipeline/elicitation/SPEC.md`; advances `idle → eliciting → research` via `state-set-phase` (legality + prerequisite artifacts checked).

3. **Operator invokes `/research`**. Master decides perspective boundaries; dispatches one perspective agent per lens. Each returns evidence-bound findings + `unknowns[]`; master synthesizes `.pipeline/requirements/REQ.md`, registers open unknowns, and surfaces them at the gate.

4. **Operator invokes `/triage`**. For large input batches, master dispatches per-class sub-triagers. Each returns dispositions; master cross-references against SPEC. Output: `.pipeline/triage/TRIAGE-REPORT.md`.

5. **Operator invokes `/architect`**. Master architect dispatches one sub-architect per module in parallel; an alignment lens reviews each return against the closed decision corpus. Sub-architects return CLOSED task specs (schema-validated: `file_write_contract`, `behavioral_pseudocode` with substrate citations, `test_completion_contract`, `agency_level`) + `unknowns[]`. Master packs sprints from the dependency graph; sprint count = topological depth. Output: `.pipeline/architecture/ARCH.md` + per-sprint `manifest.yaml` + per-task spec YAMLs.

6. **Optional `/organize`** — spec-level DRY pass over the packed sprint; consolidations are propose-with-confirm; `.pipeline/architecture/ORGANIZE-REPORT.md`.

7. **Operator invokes `/build`**. Reads the sprint manifest; per wave, dispatches one task agent per task in parallel. Each receives the closed task spec; implements code + tests; returns `agent_claim` + `unknowns[]`. Master calls `verify-disk` to re-validate against disk; persists the dual-record (`agent_claim` verbatim + `runner_verification` + computed drift + `verified` flag) via `record-task-completion` at `.pipeline/build/sprints/<n>/tasks/<task-id>/completion-record.yaml`. After the last wave: `SPRINT-REPORT.md`; `state-set-phase --value sprint-complete` gates on count_recorded == count_declared.

8. **Optional `/glossary`** — code-mode DRY audit of the sprint output via the plugin-toolkit engine; `.pipeline/glossary/GLOSSARY.{yaml,md}` + `MAP.md` functionality map, consulted by later `/architect` and `/build` runs.

9. **Operator invokes `/review`**. Adversarial lenses hunt bugs and drift; findings require verbatim path evidence; a validator re-reads each cited file (quote-drift auto-flags as false positive; exemption annotations honored). Output: `.pipeline/review/sprints/<n>/QA-REPORT.md`.

10. **Operator invokes `/verify`**. An extractor walks SPEC.md + ARCH.md into items; one verifier per item reads the code at the locator and verdicts it (existence ≠ implementation — the body gets read). Output: `.pipeline/verify/VERIFICATION-REPORT.md`.

11. **Mid-flight: operator invokes `/heal`** (or any op trips the degraded gate). `state-reconcile` runs first — missing cache rebuilds from artifacts automatically when inference is confident; conflicts are reported with evidence; `--apply` rebuilds with HEAL-LOG audit. For improvised foreign schemas, heal proposes per-step conversion with per-step user confirm; originals archived under `.pipeline/.heal-archive/`, never deleted.

12. **Throughout: `context-inject` re-grounds master in current phase on every prompt.** State is reloaded from disk every turn — no phase memory cached across prompt boundaries.

The state machine, summarized:

```
idle → eliciting → research → triaging → requirements-ready → architecture
  → decomposing → [organizing] → sprinting → sprint-complete → [glossarying]
  → reviewing → verifying → complete
```

Amendment edges (`sprint-complete → architecture`, `sprinting → triaging`, `verifying → architecture`, …) and recovery edges exist throughout; the full graph is in `references/transitions.yaml`, read on every state write.

The autopilot plugin (`essense-autopilot`, separate install) drives this state machine forward across phases on `Stop` events. It halts at human gates (`idle`, `eliciting`, `organizing`, `glossarying`, `verifying`), real blockers, in-flight background Agent calls, forward-detect for sprint-complete + QA-REPORT, and no-progress. Diagnostic stderr on every halt path. Opt-in per project via `.pipeline/config.yaml`.

## Key abstractions

- **Closed task specs.** Architect produces task specs as immutable, schema-validated YAML contracts. Build cannot mutate them mid-sprint. Deviations are recorded as `surfaced_concerns`, not silently rewritten.
- **Dual-record self-reports.** Every task completion persists both `agent_claim` (verbatim from sub-agent) and `runner_verification` (master's re-read of disk) plus computed drift and `verified` flag. Summarize-on-return is impossible; master compares to disk.
- **Evidence-bound findings.** Review rejects findings without verbatim path evidence. Validator re-anchors quotes; drift auto-flags as `quote_drift`. Vibe-findings cannot ship.
- **Gated state writes.** `state-set-phase` is the phase advancer: legal edge in the graph, prerequisite artifacts on disk, per-task-record gates. `record-task-completion` is the sole writer of completion records. No skill writes state files directly.
- **Artifacts-authoritative cache.** state.yaml is derived; `infer-phase` + `state-reconcile` rebuild it from disk. Missing cache self-heals inside ordinary ops; corrupt cache fails loudly with the inference as a hint.
- **Schema-derived everything.** One schema file per artifact shape; validators, templates, and agent-def shape blocks render from it; the drift test fails the build on hand edits.
- **Unknowns ledger.** Every producer return carries `unknowns[]`; masters register and surface them at gates via `AskUserQuestion`. What cannot be verified is researched; what research cannot answer is asked — never assumed.
- **Fail-soft hooks.** Hooks emit stderr warnings on degraded state; never block tool calls.
- **Master/sub-agent split.** When substance volume would dilute master context, master dispatches sub-agents in parallel. Sub-agents do substance with their contract loud; master synthesizes with the discipline rule still in working memory because substance was elsewhere.
- **Propagation block.** Every artifact carries (or cites) the "Read this before doing anything" block: limits-awareness, positive mindset, quality ownership, propagation requirement. Descendants inherit the discipline by content.
- **Closing-block recency.** Phase-producing SKILL.md ends with the transition contract at the bottom — recency bias works for the rule instead of against it.
- **Audit tests as drift guards.** Conduct citation, principle citations, transitions alignment, no-caps grep, schema-docs drift — all run on every `npm test`.
- **Synthetic record on crash.** If a sub-agent crashes without returning, master persists a synthetic completion record (`synthetic: true`, `status: crashed`); the sprint pauses for triage. Missing signal becomes evidence, not silence.
- **Wave-first sprint packing.** Sprint count = topological depth of the dependency graph. Waves within a sprint are parallel-safe; every extra sprint costs the user a re-invoke, so architect optimizes for minimum sprints first.
- **No resource caps as fail-closed gates.** The plugin has no `MAX_CONCURRENT_AGENTS`, no "if N exceeded, reject" clauses. Quality-gate thresholds remain (e.g. `evidence.min_quote_length`); they police evidence policy, not throughput. Capacity belongs to the operator's session, not to hardcoded limits.

## Propagation

This document, like every artifact produced by essense-flow or contributed to it, carries the four-instruction propagation block. Future doc edits and future skill additions inherit the discipline by content. The four:

- **Limits-awareness** — Claude drifts, loses context, finishes prematurely, defers, takes shortcuts. Re-read when uncertain. Preserve specifics.
- **Positive mindset** — every gap is solvable; find the way by working carefully.
- **Quality ownership** — the work matters; output reflects that; take ownership.
- **Propagation requirement** — every descendant artifact must carry these same four instructions.

Pattern for new artifacts: place a `## Read this before doing anything` block as the final H2 of the document, with the four instructions as bullet points, after the substantive content so recency bias works for the rule.

Pattern for new skills: cite the canonical Conduct and propagation blocks from `references/principles.md` (the conduct-preamble audit enforces cite-don't-copy), carry the closing transition block at the bottom, and register the skill in the CLI's `INIT_DISPATCH` table so `init <skill>` serves its canonical paths.

Pattern for new artifact shapes: add the schema under `references/schemas/`, derive the validator through `lib/schema-validate.cjs`, add render targets to `scripts/render-schema-docs.cjs`, run `npm run render-schemas` — never hand-write a shape block into a template or agent definition; the drift test will catch it.

Pattern for new lib modules: lib code does not carry the propagation block for the runtime's benefit, but the module's trust contract and failure modes must be documented in `TRUST.md` and reflected in the SKILL.md prose that depends on it.

Pattern for new hooks: fail-soft only (stderr warning + continue; never block tool calls); the no-caps audit must remain green.

Pattern for new transitions: an edge added to `transitions.yaml` is not real until at least one SKILL.md cites it AND `tests/transitions.test.js` passes. Editing the YAML without updating SKILL.md is a half-implemented transition; editing SKILL.md without updating the YAML breaks `state-set-phase` at run time. Both move together.

The shape stays small because the discipline lives in content, not in mechanism. Future contributors who add a skill, a module, a hook, or a transition: keep that asymmetry. Content scales; mechanism does not need to.

## Read this before doing anything

- Limits-awareness: Claude drifts, loses context, finishes prematurely, defers, takes shortcuts. Re-read when uncertain. Preserve specifics.
- Positive mindset: every gap solvable. Find the way by working carefully.
- Quality ownership: this work matters. Take ownership.
- Propagation requirement: every descendant artifact must carry these same four instructions.
