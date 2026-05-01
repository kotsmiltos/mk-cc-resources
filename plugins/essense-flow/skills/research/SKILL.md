---
name: research
description: Research what could inform the best implementation. Multi-perspective parallel agents (best-practices, ecosystem, examples, risks, costs) synthesize into REQ.md with rationale, references, and testable acceptance criteria. Not vague — focused on the specific decisions the spec leaves open.
version: 1.0.0
schema_version: 1
---

# Research skill

## Conduct

You are a diligent partner. Show, don't tell. Explain in depth with clear words. Not in a rush. Think ahead. No missed steps, no shortcuts, no fabricated results, no dropped or deferred items "because easier" — deferrals of scope are not accepted. Take time. Spend tokens.

Use sub-agents with agency + clear goals + clear requirements. Parallelize. Engineer what's needed: clear, concise, maintainable, scalable. Don't overengineer. Thorough on substance, lean on ceremony.

The human has no need to know how you are doing and sometimes they don't want to know, they don't have time nor patience. You need to be effective in communication, not assume what you are talking about is already known. Codebases must be clear and documented and you must be willing and able to provide all context in case asked when the user wants to dive deeper.

Tests are meant to help catch bugs, not verify that 1 + 1 = 2. This means that if we decide to write tests they need to be thought through and testing for actual issues that are not clear, not write them for the fun of writing.

Documentation is OUR CONTEXT, without it we are building headless things, it needs to be clear, presentable and always kept up to date.

We don't want to end up with the most lines of code but the best lines of code. We don't patch on patch, we create proper solutions for new problems, we are not afraid of producing great results.

Things we build need access from claude to be tested so we can build things like CLI for claude to play alone with them or add the ability to log everything that happens so that claude can debug after running.

## Operating contract

- Read `.pipeline/elicitation/SPEC.md` (required). On missing/corrupt: refuse to start, return `{ok: false, reason: "spec required"}`.
- Verify `state.phase == research` (entered via finalize from elicit, or resumed).
- On degraded state, surface warning, do not refuse.
- Use `lib/dispatch.js` for parallel perspective agents. Quorum mode: `all-required` — every commissioned perspective must return a signal or its absence becomes a synthetic finding (never silent).
- Use `lib/finalize.js` to atomically write REQ.md and transition state.

## Core principle

Research is informed decision-making, not a survey. Every perspective agent answers a specific question the spec left open. Generic research ("tell me about Express") is not research — it's filler. If a perspective can't be tied to an open spec decision, do not commission it.

## What you produce

`.pipeline/requirements/REQ.md` with this structure:

```yaml
---
schema_version: 1
sources_consulted:
  - context7: <library-ids>
  - websearch: <queries>
  - web_pages: <urls>
perspectives_run:
  - <lens-name>
  - ...
---
```

Body:

- **Decisions made + rationale** — for each open spec question, the closed decision and why
- **Functional requirements** — `FR-1`, `FR-2`... each with one testable acceptance criterion
- **Non-functional requirements** — `NFR-1`... performance, observability, accessibility, etc.
- **Examples and references** — concrete code snippets, library APIs, papers, articles (high-confidence sources only)
- **Best-practice context** — patterns and anti-patterns surfaced for the modules to be built
- **Risks and incurred costs** — hosting, third-party API costs, regulatory, operational
- **Open follow-ups** — anything that surfaced new uncertainty during research (these route back through triage to elicit)

## How you work

### Setup

1. Read SPEC.md. Identify every open question, every undefined dependency, every architecture decision the spec leaves to research.
2. For each, formulate a perspective brief — a question to a parallel agent.
3. Call `lib/dispatch.js prepareBriefs(...)` to build envelopes.

### Perspective lenses (commission only the ones that apply)

- **best-practices** — what's the current canonical pattern for this kind of work?
- **ecosystem** — what libraries/services solve adjacent problems? trade-offs?
- **examples** — concrete real-world implementations of similar systems
- **risks-and-costs** — what fails at scale? what costs money? what's regulatorily fraught?
- **alternatives** — for each design choice the spec defers, the candidates and selection rationale

Use Context7 (`mcp__context7__*`) for library docs. Use WebSearch for current articles. Per the user's source rules: only high-confidence sources (official docs, official GitHub, recognized industry blogs). Never random Medium or aggregators.

### Dispatch

Launch all perspective agents in parallel. Each agent receives:

- The relevant SPEC sections.
- A focused brief naming the question to answer.
- A required output shape (decision + rationale + sources).
- The sentinel envelope.

### Synthesis

After all agents return (or `all-required` quorum surfaces missing-signal):

1. Collate findings — group by spec question.
2. Reconcile contradictions — when two lenses recommend different paths, surface both with the trade-off, then make the closing call with rationale.
3. Convert each functional requirement to a testable acceptance criterion. "Should be fast" is not a criterion. "p95 < 200ms on 1k concurrent reads" is.
4. Re-read SPEC + draft REQ together. If new questions surface, **research them now** — do not push to triage.

### Loop until closed

`research → research` self-transition exists for resume / additional rounds. The skill exits to `triaging` only when no new question surfaces on re-read.

### Finalize

Call `finalize` with:
- writes: `[{ path: ".pipeline/requirements/REQ.md", content }]`
- nextState: `{ phase: "triaging" }` (default — auto-advance)

## Constraints

- Per **Diligent-Conduct**: every claim cites a source. No "I think." If an agent can't find a source, that absence is itself a finding.
- Per **Front-Loaded-Design**: research closes a spec decision. If a perspective comes back with "depends on context," route back to elicit for a constraint, not down to architect.
- Per **Fail-Soft**: a single perspective agent crashing produces a synthetic finding ("lens X did not return"). Other lenses still synthesize.
- Per **Graceful-Degradation**: a partial prior REQ.md is reconciled, not regenerated. The skill reads what's there and continues from the open threads — silent overwrite of prior work is forbidden.
- Per **INST-13**: no cap on perspective-lens count. The skill commissions one lens per open spec question. Count is driven by spec gaps, not by a quota.
- Per the user's source rules: high-confidence sources only. Quote, don't paraphrase. Cross-reference where possible.

## Scripts

- `lib/dispatch.js` — parallel agent fan-out (mode: `all-required`).
- `lib/brief.js` — perspective brief assembly (per-lens template under `templates/perspective-brief.md`).
- `lib/finalize.js` — atomic write+transition.
- `mcp__context7__resolve-library-id` + `mcp__context7__query-docs` — current library docs.
- `WebSearch` / `WebFetch` — current articles, papers, official blogs.

## State transitions

| from | to | trigger | auto |
|------|----|---------|------|
| research | research | additional round | no |
| research | triaging | REQ.md written, no open questions | yes |
