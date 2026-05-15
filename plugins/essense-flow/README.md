# essense-flow

Multi-phase AI development pipeline for Claude Code. From project pitch to shipped code, with closed design contracts, evidence-bound review, dual-record agent self-reports verified against disk, and fail-soft tooling that never blocks tool calls. 0.12 — substantive drift-audit + dogfood landing along the 0.x line; v1 declared by the operator, not pre-committed.

## Purpose

essense-flow exists to drive a project from a one-paragraph pitch through elicitation, research, triage, architecture, sprint execution, review, and verification without losing constraints between phases.

The core failure mode it closes: Claude drifts under substance volume, loses the discipline rule by the time synthesis runs, and silently patches over the gap. essense-flow makes that gap visible as schema violation — closed task specs, evidence-bound review findings, dual-record self-reports re-validated against disk, atomic phase transitions through a single `finalize` call.

Where prior tools assumed Claude would follow loose prose, essense-flow encodes the contract as content the agent reads at the moment of action: closing blocks at the bottom of every phase-producing SKILL.md, propagation footers on every artifact, principle citations in load-bearing sections audited at CI time.

The plugin ships nine skills, twelve slash commands, two fail-soft hooks, and five lib primitives. The plugin does not orchestrate an agent tower; the cognitive work lives in SKILL.md contracts that sub-agents read at dispatch. Master orchestrates; sub-agents do substance; master synthesizes with the rule still loud because the substance was elsewhere.

The shape is small on purpose. Five lib primitives, not 27. Nine skills, not a constellation. Two hooks, both advisory. The discipline is what scales; the mechanism stays compact.

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
- Node.js available on PATH for the lib/ primitives and audit scripts.
- A writable project directory for `.pipeline/`.

No external services, no credentials, no environment variables. The plugin runs entirely against the local filesystem with the operator's existing Claude Code session credentials.

Optional: install `essense-autopilot` from the same marketplace if you want a Stop-hook autopilot driving the pipeline forward across phases without typing between steps. Autopilot halts at human gates (eliciting, verifying), real blockers, and forward-detect signals — see the autopilot plugin's README for the halt-and-resume contract.

## Usage

In a fresh project directory:

```
/essense-flow:init           # write .pipeline/state.yaml
/elicit "your project pitch" # enter elicitation
/research                    # parallel perspective agents
/triage                      # categorize and route
/architect                   # close design + decompose
/build                       # execute the sprint
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

If you start a phase and need to walk away, the next session inherits state from `.pipeline/state.yaml`. Master re-grounds via context-inject on the first prompt; no manual phase re-declaration needed.

## API reference

Nine skills, each with a SKILL.md contract and (where relevant) artifact templates:

| Skill | Phase it owns | Produces |
|-------|---------------|----------|
| `elicit` | eliciting | `.pipeline/elicitation/SPEC.md` |
| `research` | research | `.pipeline/requirements/REQ.md` |
| `triage` | triaging | `.pipeline/triage/TRIAGE-REPORT.md` |
| `architect` | architecture, decomposing | `.pipeline/architecture/ARCH.md` + per-task specs |
| `build` | sprinting → sprint-complete | per-task completion records + `SPRINT-REPORT.md` |
| `review` | reviewing | `.pipeline/review/sprints/<n>/QA-REPORT.md` |
| `verify` | verifying | `.pipeline/verify/VERIFICATION-REPORT.md` |
| `context` | (utility) | state plumbing — init, status, next-step |
| `heal` | (recovery) | phase inference + walk-forward proposal |

Two hooks, both fail-soft, both advisory:

- `context-inject` on `UserPromptSubmit` and `SessionStart` — surfaces phase + canonical artifact paths + any degradation warning. Never blocks.
- `next-step` on `Stop` — suggests the recommended next slash command for the current phase. Never blocks.

Five lib primitives, no more:

- `state.js` — read/write `.pipeline/state.yaml`, validate against `transitions.yaml`.
- `finalize.js` — atomic write-artifact + transition, one call per phase. Reads `requires:` and emits stderr advisory when hinted paths missing.
- `brief.js` — sub-agent brief assembly. Oversize warns to stderr, never rejects.
- `dispatch.js` — parallel sub-agent fan-out, sentinel envelope, quorum semantics, no concurrency caps.
- `verify-disk.js` — re-validate agent self-reports against the filesystem, drift detection.

The discipline lives in SKILL.md prose, enforced by the master/sub-agent split itself.

Twelve slash commands wrap the skills:

- `/elicit`, `/research`, `/triage`, `/architect`, `/build`, `/review`, `/verify`, `/heal` — invoke the corresponding skill.
- `/essense-flow:init` — write initial `.pipeline/state.yaml` for a fresh project.
- `/status` — print phase + canonical artifact paths.
- `/next` — print recommended next slash command for the current phase.
- `/help` — slash command index.

Audit tests run by `node scripts/self-test.js`:

- `tests/conduct-preamble.test.js` — every SKILL.md begins with the verbatim Conduct block.
- `tests/principle-citations.test.js` — every SKILL.md cites all 5 principles in load-bearing sections.
- `tests/transitions.test.js` — every transition cited in any SKILL.md exists in `transitions.yaml`.
- `tests/no-caps.test.js` — greps for forbidden fail-closed cap patterns; zero hits permitted.

All four green is the audit-pass gate for any release on the 0.x line.

## Known limitations

0.12 ships with eyes open. Operators should be aware of the following:

- **No SAST or secrets scanning.** Agent-written code is not scanned for hardcoded credentials or static-analysis findings. Run your own scanners (gitleaks, semgrep) before commit.
- **No sandboxing of sub-agent file writes.** `file_write_contract` flags out-of-contract writes per Fail-Soft; it does not jail them. Sub-agents can in principle write anywhere the operator's Claude Code session can.
- **Resolution A inline-substance dogfood gap.** T-1029 noted a count-without-real-dispatch path in S10 dogfood. Spot-check `agent_claim` vs `runner_verification` on the first few tasks of any new pipeline.
- **No signed releases, no SBOM.** Marketplace install pulls GitHub `main` by default. Pin to a tagged commit if your threat model requires reproducibility.
- **Single-maintainer bus factor.** Response latency for bugs and security issues depends on maintainer availability.
- **Contract surface still evolving on 0.x.** v1 declaration awaits operator signoff. Breaking changes within 0.x ship as minor bumps with explicit notes.

See `SECURITY.md` for the full threat model and `TRUST.md` for the trust boundaries.

## Trust model

See [`TRUST.md`](./TRUST.md) for the trust-boundary contract: what the plugin trusts (marketplace source, `finalize.js`, `transitions.yaml`), what it actively distrusts (sub-agent self-reports, review findings without evidence, architect sprint-packing claims), how phase handoff works (artifact-mediated, atomic finalize, per-prompt re-grounding from disk), and the calibrated assumptions on Claude behavior (drift, premature finish, shortcuts, recency bias).

See [`SECURITY.md`](./SECURITY.md) for the threat model, reporting channel, mitigations, and known limitations.

The four governing principles plus INST-13 (no resource caps as fail-closed gates) are detailed in `references/principles.md`. Every SKILL.md cites all five in load-bearing sections; the audit test `tests/principle-citations.test.js` enforces this at CI time.

## License

This plugin is part of the `mk-cc-resources` marketplace. License terms inherit from the marketplace repository LICENSE file. Contributions welcome via GitHub issues and pull requests on [`mk-cc-resources`](https://github.com/kotsmiltos/mk-cc-resources).

## Citation

No citation placeholders at this writing. If you build on essense-flow in a publishable context, reference the marketplace repository URL and the plugin version (`0.12.0`).

## Read this before doing anything

- Limits-awareness: Claude drifts, loses context, finishes prematurely, defers, takes shortcuts. Re-read when uncertain. Preserve specifics.
- Positive mindset: every gap solvable. Find the way by working carefully.
- Quality ownership: this work matters. Take ownership.
- Propagation requirement: every descendant artifact must carry these same four instructions.
