---
name: glossary
description: Code-mode DRY audit after /build. Runs the code-glossary engine on the sprint's code — indexes every function, clusters duplicate implementations across files, surfaces extraction candidates. Propose-only — writes .pipeline/glossary/GLOSSARY.{yaml,md}, never modifies source. Optional phase; run after /build, before or alongside /review.
version: 1.0.0
schema_version: 1
---

# Glossary skill

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

After /build, N task agents have written code in parallel without knowing about each other's implementations — the same logic lands in N slightly-different shapes. This skill inventories what every function DOES, clusters duplicates, and scores extraction candidates, so /review (and the user) see the DRY debt before it compounds.

Engine: the code-glossary deterministic engine (plugin-toolkit), code mode. Deterministic Python does walking/AST/signals/Pass-A clustering; ALL LLM work (labeling against the controlled vocabulary, Pass B cluster review, Pass C substrate-verify) is Agent-tool sub-agent dispatches in this session. NO external LLM SDKs, ever.

## Operating contract

- Verify `state.phase == sprint-complete` (entry) or `glossarying` (resume). Any other phase: refuse with the phase named.
- Propose-only: NEVER modify any source file. Outputs are `.pipeline/glossary/GLOSSARY.yaml` + `GLOSSARY.md` only.
- Estimate-and-confirm before ANY sub-agent dispatch: report the projected labeler + reviewer agent counts, get explicit user OK.
- Every failure (unparseable file, crashed agent, off-vocabulary label, quote drift) surfaces in GLOSSARY.md and the final report. Zero silent outcomes.
- State writes ONLY via `essense-flow-tools state-set-phase`. Never Write/Edit `.pipeline/state.yaml`.

## Skill operating mechanism

No `init glossary` op exists in `essense-flow-tools` yet (glossary landed in v0.15; the init-op surface is a follow-up). Canonical paths are therefore fixed here:

| Artifact | Path |
|---|---|
| Source scope (input) | project source tree (default `.`; honors `.pipeline`-relative excludes) |
| Sprint report (gate) | `.pipeline/build/sprints/<n>/SPRINT-REPORT.md` |
| Glossary (output) | `.pipeline/glossary/GLOSSARY.yaml` + `.pipeline/glossary/GLOSSARY.md` |
| Work dir | `.pipeline/glossary/.work/` |

**Engine discovery.** Same as /organize: dev checkout at `plugins/plugin-toolkit/skills/code-glossary/`, or installed via `find ~/.claude/plugins -path "*/code-glossary/code_glossary/runner.py"`. Not found → hard stop: "glossary requires the plugin-toolkit plugin (code-glossary engine); install mk-cc-all or plugin-toolkit."

## How you work

1. **Enter.** Read `.pipeline/state.yaml`; note sprint `<n>`. Call `essense-flow-tools state-set-phase --value glossarying` (legal from `sprint-complete`; predicate checks SPRINT-REPORT.md).

2. **Run the full /code-glossary v2 flow** from the engine's SKILL.md (`<skill_folder>/SKILL.md` — follow its instructions sections 1–10) with these overrides:
   - Output dir: `.pipeline/glossary/` (not `<target>/glossary/`).
   - Work dir: `.pipeline/glossary/.work/`.
   - Scope default: the whole project source tree; offer the user a sprint-only scope (the files named in the sprint's task `file_write_contract`s) as the second option — sprint-only is faster and reviews exactly what /build just produced.
   - The estimate-and-confirm step is mandatory (this phase is a human gate for exactly that reason).

3. **Report.** Relay the engine's final report (indexed counts, clusters, extractables, verification flags, failures) plus the glossary paths.

4. **Exit.** `essense-flow-tools state-set-phase --value sprint-complete --sprint <n>` (predicate: GLOSSARY.yaml exists). Surface the next cue: `/review` — and tell the reviewer that GLOSSARY.md's top extractables are reusable evidence for a DRY-violation lens.

## Constraints

- NEVER modify source files — propose-only is this skill's identity. `/dry-refactor` (future v3) executes; this skill only surfaces.
- NEVER dispatch sub-agents before the estimate is confirmed.
- NO external LLM SDKs. Engine deterministic; LLM = in-session sub-agents only.
- Frozen schema v1 on GLOSSARY.yaml — downstream consumers depend on it; never hand-edit the emitted YAML.

## State transitions (verbatim from references/transitions.yaml)

| from | to | requires | auto_advance |
|---|---|---|---|
| sprint-complete | glossarying | `.pipeline/build/sprints/<n>/SPRINT-REPORT.md exists` | no |
| glossarying | glossarying | — (labeling/review rounds) | no |
| glossarying | sprint-complete | `.pipeline/glossary/GLOSSARY.yaml exists` | no |

`glossarying` is a human gate (autopilot halts) — the agent-count estimate needs the user's OK.
