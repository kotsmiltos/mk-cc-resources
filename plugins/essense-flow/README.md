# essense-flow

Multi-phase AI development pipeline for Claude Code. From project pitch to shipped code, with closed design contracts, evidence-bound review, dual-record agent self-reports verified against disk, and fail-soft tooling that never blocks tool calls. 0.18 — the consolidation line: schema single-source, artifacts-authoritative state, and the librarian protocol land along 0.x; v1 declared by the operator, not pre-committed.

## Purpose

essense-flow exists to drive a project from a one-paragraph pitch through elicitation, research, triage, architecture, sprint execution, review, and verification without losing constraints between phases.

The core failure mode it closes: Claude drifts under substance volume, loses the discipline rule by the time synthesis runs, and silently patches over the gap. essense-flow makes that gap visible as schema violation — closed task specs, evidence-bound review findings, dual-record self-reports re-validated against disk, phase transitions gated by a single CLI that checks the legal graph and the prerequisite artifacts before it moves.

Where prior tools assumed Claude would follow loose prose, essense-flow encodes the contract as content the agent reads at the moment of action: closing blocks at the bottom of every phase-producing SKILL.md, propagation footers on every artifact, principle citations in load-bearing sections audited at CI time. Every principle is stated self-contained, with its why inline — a fresh reader can run every skill with zero tribal knowledge.

The plugin ships eleven skills, fourteen slash commands, twelve sub-agent definitions, two fail-soft hooks, four canonical artifact schemas, nineteen lib modules, and one narrow CLI (`bin/essense-flow-tools.cjs`). The plugin does not orchestrate an agent tower; the cognitive work lives in SKILL.md contracts that sub-agents read at dispatch. Master orchestrates; sub-agents do substance; master synthesizes with the rule still loud because the substance was elsewhere.

The asymmetry is deliberate: the discipline is what scales; the mechanism stays narrow. lib modules each do one thing; the CLI is the single gateway for state writes; hooks stay advisory.

## The three pillars (0.18)

### Schema single-source

The artifact shapes — task spec, completion record, register item, unknown entry — live in exactly one place each: `references/schemas/*.schema.yaml`. Everything else derives:

- `lib/schema-validate.cjs` builds the runtime validators from the schemas — required keys, enums, the task-id pattern.
- `scripts/render-schema-docs.cjs` (`npm run render-schemas`) renders the shape blocks into the templates and agent definitions that teach the shape, inside `AUTOGEN` markers.
- `test/schema-docs-drift.test.cjs` fails the suite when a rendered block is hand-edited.

One schema, derived everywhere. Hand-maintained parallel copies of a shape are the drift mechanism this kills: when two validators in the same file can disagree about the same artifact, one of them is lying to somebody.

### Artifacts-authoritative state

The artifacts ARE the state. `.pipeline/state.yaml` is a derived cache that self-corrects from disk:

- `lib/infer-phase.cjs` deterministically infers the phase from the artifact tree, returning ALL candidates with evidence — ambiguity is surfaced, never guessed away.
- `state-reconcile` (CLI op) compares the cache against artifact inference. Report-only by default; `--apply` rebuilds the cache from artifacts (HEAL-LOG audited; artifacts win on conflict). It tolerates a hard-corrupt cache — the repair tool does not die on what it repairs.
- The degraded-state gates inside ordinary ops auto-rebuild a MISSING cache when inference is confident and proceed — a fresh checkout with artifacts but no state.yaml no longer dead-ends into "run /heal first". A corrupt cache still hard-fails, with the inference offered as a hint.

A hand-edited, deleted, or corrupted state.yaml is therefore recoverable by construction, not by archaeology.

### The librarian protocol

The model is a librarian: it hands over the best book it has, but it cannot know which books it doesn't have. A librarian who invents a book is worse than useless. The protocol (`references/librarian.md`):

- **Research first.** Before declaring anything unknown, an agent exhausts what it can reach — source at the cited line, repo grep, current docs.
- **Declare unknowns structurally.** Every producer-agent return carries an `unknowns[]` array (shape in `references/schemas/unknown-entry.schema.yaml`): what, why unresolvable, research attempted, blocking or not, the ready-to-ask question, an optional defensible default. The empty array is an explicit claim, not a silent default.
- **Surface at the gate.** Masters register open unknowns (`register-add --kind unknown`) and put the batch to the user via `AskUserQuestion` — blocking unknowns before acting on the return, non-blocking ones at the phase gate. No unknown is dropped, merged away, or quietly defaulted.

The substrate-citation rule is scoped accordingly: prescribed pseudocode asserting behavior of a file that exists on disk must cite the line it read; claims about libraries or new code are exempt from citation — but what an agent cannot read or run is an unknown, and the affected spec downgrades to `agency_level: guided` so the build agent verifies at execution time, where Bash exists.

## Setup

This plugin is part of the [`mk-cc-resources`](https://github.com/kotsmiltos/mk-cc-resources) marketplace.

Install via Claude Code:

```
/plugin install essense-flow @ mk-cc-resources
```

Or, if installing the bundle:

```
/plugin install mk-cc-all @ mk-cc-resources
```

Requirements:

- Claude Code with the marketplace installed.
- Node.js >= 18 on PATH for the CLI, lib modules, and audit scripts.
- A writable project directory for `.pipeline/`.

No external services, no credentials, no environment variables. The plugin runs entirely against the local filesystem with the operator's existing Claude Code session credentials.

Optional installs from the same marketplace:

- `essense-autopilot` — a Stop-hook autopilot driving the pipeline forward across phases without typing between steps. Halts at human gates (eliciting, organizing, glossarying, verifying), real blockers, and forward-detect signals; see the autopilot plugin's README for the halt-and-resume contract.
- `plugin-toolkit` — required only for the optional `/organize` and `/glossary` DRY phases, which run on its code-glossary engine. Both skills hard-stop with an install hint when it is absent.

## Usage

In a fresh project directory:

```
/essense-flow:init           # write .pipeline/state.yaml
/elicit "your project pitch" # enter elicitation
/research                    # parallel perspective agents
/triage                      # categorize and route
/architect                   # close design + decompose
/organize                    # (optional) spec-level DRY pass before build
/build                       # execute the sprint
/glossary                    # (optional) code-level DRY audit + functionality map
/review                      # adversarial QA
/verify                      # top-down spec compliance
```

If you join a project mid-flight (or with prior artifacts from another tool):

```
/heal                        # discover phase from disk, propose walk-forward
```

Utility commands:

- `/status` — current phase + canonical artifact paths.
- `/next` — recommended next slash command.
- `/help` — slash command index.

The `next-step` Stop hook also surfaces the recommended next command after every assistant turn. The `context-inject` hook surfaces phase + canonical paths on every `UserPromptSubmit` and `SessionStart`. Both hooks are advisory and fail-soft — they never block tool calls.

If you start a phase and need to walk away, the next session re-grounds from the artifacts: context-inject reads the state cache on the first prompt, and if the cache is missing the ops rebuild it from disk. When the cache and the artifacts disagree, `state-reconcile` reports the conflict (and `--apply` resolves it — artifacts win).

## API reference

Eleven skills, each with a SKILL.md contract and (where relevant) artifact templates:

| Skill | Phase it owns | Produces |
|-------|---------------|----------|
| `elicit` | eliciting | `.pipeline/elicitation/SPEC.md` |
| `research` | research | `.pipeline/requirements/REQ.md` |
| `triage` | triaging | `.pipeline/triage/TRIAGE-REPORT.md` |
| `architect` | architecture, decomposing | `.pipeline/architecture/ARCH.md` + per-task specs + sprint manifest |
| `organize` | organizing *(optional)* | `.pipeline/architecture/ORGANIZE-REPORT.md` + consolidated task specs |
| `build` | sprinting → sprint-complete | per-task completion records + `SPRINT-REPORT.md` under `.pipeline/build/sprints/<n>/` |
| `glossary` | glossarying *(optional)* | `.pipeline/glossary/GLOSSARY.{yaml,md}` + `MAP.md` functionality map |
| `review` | reviewing | `.pipeline/review/sprints/<n>/QA-REPORT.md` |
| `verify` | verifying | `.pipeline/verify/VERIFICATION-REPORT.md` |
| `context` | (utility) | state plumbing — init, status, next-step |
| `heal` | (recovery) | phase inference + walk-forward proposal |

Twelve sub-agent definitions under `agents/` carry the per-role contracts the skills dispatch against — sub-architect, task-agent, perspective-agent, sub-triager, sub-recognizer, adversarial lenses, validator, extractor, item-verifier. Every producer agent's return shape (including the required `unknowns[]` array) is rendered from the canonical schemas.

Two hooks, both fail-soft, both advisory:

- `context-inject` on `UserPromptSubmit` and `SessionStart` — surfaces phase + canonical artifact paths + any degradation warning. Never blocks.
- `next-step` on `Stop` — suggests the recommended next slash command for the current phase. Never blocks.

The state surface:

- `bin/essense-flow-tools.cjs` — the single gateway for state writes. `init <skill>` returns each skill's canonical paths, ordered steps, and legal transitions as JSON; `state-set-phase` advances the phase (legality checked against `references/transitions.yaml`, prerequisite artifacts checked on disk); `record-task-completion` is the sole writer of completion records; `state-reconcile` audits/rebuilds the cache from artifacts; `register-add --kind unknown` files librarian unknowns into the outstanding-work register.
- `lib/` — nineteen single-purpose modules behind the CLI and the skills: state read/write (`state.js`), phase inference (`infer-phase.cjs`), schema validation (`schema-validate.cjs`), brief assembly (`brief.js`), parallel dispatch + quorum (`dispatch.js`), on-disk verification of agent claims (`verify-disk.js`), atomic writes, locking, rule sweeps, and friends.

The discipline lives in SKILL.md prose, enforced by the master/sub-agent split itself.

Fourteen slash commands wrap the skills:

- `/elicit`, `/research`, `/triage`, `/architect`, `/organize`, `/build`, `/glossary`, `/review`, `/verify`, `/heal` — invoke the corresponding skill.
- `/essense-flow:init` — write initial `.pipeline/state.yaml` for a fresh project.
- `/status` — print phase + canonical artifact paths.
- `/next` — print recommended next slash command for the current phase.
- `/help` — slash command index.

Tests run by `npm test` (`node test/run-all.cjs` + `node scripts/self-test.js`):

- `test/` — 49 suites covering the CLI ops and lib modules: schema validation, phase inference, state reconcile, locking, completion-record gates, drift tests that fail on hand-edited AUTOGEN blocks.
- `tests/` — the audit + primitive suites run by `scripts/self-test.js`: conduct citation (cite-don't-copy against `references/principles.md`), principle citations in load-bearing sections, transitions-graph alignment, the no-caps grep (zero fail-closed cap patterns permitted), plus state/dispatch/brief/verify-disk primitives.

All green is the audit-pass gate for any release on the 0.x line.

## Known limitations

0.18 ships with eyes open. Operators should be aware of the following:

- **No SAST or secrets scanning.** Agent-written code is not scanned for hardcoded credentials or static-analysis findings. Run your own scanners (gitleaks, semgrep) before commit.
- **No sandboxing of sub-agent file writes.** `file_write_contract` flags out-of-contract writes per Fail-Soft; it does not jail them. Sub-agents can in principle write anywhere the operator's Claude Code session can.
- **Dual-record spot-check still advised.** Master re-validates every agent self-report against disk, but operators running large fan-outs should spot-check `agent_claim` vs `runner_verification` on the first few tasks of any new pipeline.
- **No signed releases, no SBOM.** Marketplace install pulls GitHub `main` by default. Pin to a tagged commit if your threat model requires reproducibility.
- **Single-maintainer bus factor.** Response latency for bugs and security issues depends on maintainer availability.
- **Contract surface still evolving on 0.x.** v1 declaration awaits operator signoff. Breaking changes within 0.x ship as minor bumps with explicit notes.

See `SECURITY.md` for the full threat model and `TRUST.md` for the trust boundaries.

## Trust model

See [`TRUST.md`](./TRUST.md) for the trust-boundary contract: what the plugin trusts (marketplace source, the state CLI, `transitions.yaml`), what it actively distrusts (sub-agent self-reports, review findings without evidence, architect sprint-packing claims), how phase handoff works (artifact-mediated, gated transitions, per-prompt re-grounding from disk), and the calibrated assumptions on Claude behavior (drift, premature finish, shortcuts, recency bias).

See [`SECURITY.md`](./SECURITY.md) for the threat model, reporting channel, mitigations, and known limitations.

The five governing principles — Graceful-Degradation, Front-Loaded-Design, Fail-Soft, Diligent-Conduct, and No Resource Caps (no resource caps as fail-closed gates) — are detailed in `references/principles.md`. Every SKILL.md cites them in load-bearing sections; the audit test `tests/principle-citations.test.js` enforces this at CI time.

## License

This plugin is part of the `mk-cc-resources` marketplace. License terms inherit from the marketplace repository LICENSE file. Contributions welcome via GitHub issues and pull requests on [`mk-cc-resources`](https://github.com/kotsmiltos/mk-cc-resources).

## Citation

No citation placeholders at this writing. If you build on essense-flow in a publishable context, reference the marketplace repository URL and the plugin version (`0.18.0`).

## Read this before doing anything

- Limits-awareness: Claude drifts, loses context, finishes prematurely, defers, takes shortcuts. Re-read when uncertain. Preserve specifics.
- Positive mindset: every gap solvable. Find the way by working carefully.
- Quality ownership: this work matters. Take ownership.
- Propagation requirement: every descendant artifact must carry these same four instructions.
