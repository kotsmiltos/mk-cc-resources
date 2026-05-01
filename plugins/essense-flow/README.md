# essense-flow

Multi-phase AI development pipeline for Claude Code. From project pitch to shipped code, with closed design contracts, evidence-bound review, and fail-soft tooling.

## What it ships

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

Twelve slash commands wrap the skills (one per skill plus `status`, `next`, `init`, `help`).

Two hooks, both fail-soft, both advisory:
- `context-inject` on `UserPromptSubmit` and `SessionStart` — surfaces phase + canonical artifact paths + any degradation warning.
- `next-step` on `Stop` — suggests the recommended next slash command for the current phase.

Five lib primitives, no more:
- `state.js` — read/write `.pipeline/state.yaml`, validate against `transitions.yaml`.
- `finalize.js` — atomic write-artifact + transition, one call per phase.
- `brief.js` — sub-agent brief assembly. Oversize warns to stderr, never rejects.
- `dispatch.js` — parallel sub-agent fan-out, sentinel envelope, quorum semantics, no concurrency caps.
- `verify-disk.js` — re-validate agent self-reports against the filesystem, drift detection.

## Install

This plugin is part of the [`mk-cc-resources`](https://github.com/kotsmiltos/mk-cc-resources) marketplace. Install via Claude Code:

```
/plugin install essense-flow @ mk-cc-resources
```

Or, if installing the bundle:

```
/plugin install mk-cc-all @ mk-cc-resources
```

## Run

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

## Principles

The four rules that govern every skill: Graceful-Degradation, Front-Loaded-Design, Fail-Soft, Diligent-Conduct. Plus INST-13 — no resource caps as fail-closed gates. See `references/principles.md`.

## Versioning

`0.10.0` — master/sub-agent orchestration pattern across 6 skills (architect, research, build, review, verify, triage, heal). Discipline rules survive synthesis because substance is delegated.
`0.9.0` — principle-citation enforcement + architect Core Principle block.
`0.8.0` — full rewrite. v0.7.0 archived on the `archive/essense-flow-v0.7` branch.

Pre-1.0 — contracts may still shift before the first stable cut.

## Contributing

Plugin self-test:

```
node scripts/self-test.js
```

Plugin manifest + skill audit:

```
node scripts/validate-plugin.js
```

Both run in CI via the marketplace workflow.
