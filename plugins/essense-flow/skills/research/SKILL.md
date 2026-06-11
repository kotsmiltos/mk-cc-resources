---
name: research
description: Research what could inform the best implementation. Multi-perspective parallel agents (best-practices, ecosystem, examples, risks, costs) synthesize into REQ.md with rationale, references, and testable acceptance criteria. Focused on the specific decisions the spec leaves open — never vague. Run after /elicit, before /architect.
version: 1.0.0
schema_version: 1
---

# Research skill

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

## Operating contract

- Read `.pipeline/elicitation/SPEC.md` (required). On missing/corrupt: refuse to start, return `{ok: false, reason: "spec required"}`.
- Verify `state.phase == research` (entered via finalize from elicit, or resumed).
- On degraded state, surface warning, do not refuse.
- Call `essense-flow-tools init research` first thing. Parse the JSON; use `canonical_paths.req_md` for the REQ.md write, `transitions` to choose the legal target phase, `sub_agents` for the registered agent name.
- Dispatch `essense-flow-perspective-agent` (per-lens parallel, all-required quorum) via the **registered agent dispatch** path (Agent tool with `subagent_type: essense-flow-perspective-agent`) — not `lib/dispatch.js`. Briefs assembled per-lens from `templates/perspective-brief.md` with placeholder substitution (`{{lens}}`, `{{project_context}}`, `{{open_questions}}`, `{{lens_specific_instructions}}`, `{{sentinel}}`).
- Write REQ.md to the canonical path with ordinary `Write`; advance phase via `essense-flow-tools state-set-phase` (not `lib/finalize.js`); record the research-completed timestamp via `essense-flow-tools state-set-research-completed`; advance the round counter (on a `research → research` loop) via `essense-flow-tools state-set-research-round`. Step-cursor advances via `essense-flow-tools step-advance --skill research`.
- Quorum mode `all-required` — every commissioned perspective must return a signal or its absence becomes a synthetic finding (never silent).

## Skill operating mechanism (S9.4 redesign — 2026-05-08)

This skill runs against the narrow CLI surface (`bin/essense-flow-tools.cjs`) and the registered subagent (`agents/essense-flow-perspective-agent.md`). The redesigned mechanism replaces the old `lib/dispatch.js` + `lib/finalize.js` advisory surface that allowed master to drift the schema, paths, extensions, and dispatch.

**What you call (in order):**

1. `essense-flow-tools init research` — JSON describing the research skill: `canonical_paths.req_md` (`.pipeline/requirements/REQ.md`), `transitions` (2 — `research-to-research`, `research-to-triaging`), `phase_from`/`phase_to`, `ordered_steps` (8 — `read-spec, identify-open-questions, formulate-perspective-briefs, dispatch-perspective-agents, synthesize-findings, convert-to-acceptance-criteria, reread-spec-and-req, finalize`), `sub_agents` (1 registered role — `essense-flow-perspective-agent`), `principles_cited` (5), `required_inputs` (1 — SPEC.md). `sprint_number` is `null` — research is whole-project (informs implementation decisions across the whole codebase, not a specific sprint).
2. `essense-flow-tools step-advance --skill research --next-step <step>` — eight steps in order. The cursor file `.pipeline/cursor.yaml` enforces monotonic-by-construction order; calling out-of-order rejects with exit 13.
3. **Read SPEC.md.** Identify every open question, every undefined dependency, every architecture decision the spec leaves to research. For each, formulate a perspective brief — a question to a parallel agent.
4. **Dispatch `essense-flow-perspective-agent`** (Agent tool with `subagent_type: essense-flow-perspective-agent`), one per commissioned lens, **in parallel** (single message, multiple Agent tool calls). Brief assembled from `perspective-brief.md` template substituting `{{lens}}`, `{{project_context}}` (relevant SPEC sections), `{{open_questions}}`, `{{lens_specific_instructions}}` (per-lens framing), and `{{sentinel}}`. Each lens runs in a clean context. Per-lens findings return as structured markdown (5 sections — Findings, Recommendation, Trade-offs, Sources, Open follow-ups). Lenses get NO `Write`/`Edit`/`Bash` — synthesis is master's job.
5. **Synthesize.** Collate findings — group by spec question. Reconcile contradictions — when two lenses recommend different paths, surface both with the trade-off, then make the closing call with rationale. Convert each functional requirement to a testable acceptance criterion. Re-read SPEC + draft REQ together; if new questions surface, **research them now** — do not push to triage.
6. **Loop or finalize.** `research → research` (additional round, `research.round` advances) for resumption / additional rounds. Exit to `triaging` only when no new question surfaces on re-read.
7. Write REQ.md to `canonical_paths.req_md` via ordinary `Write`. Frontmatter includes `schema_version`, `sources_consulted`, `perspectives_run`. Body covers Decisions made + rationale, FRs (with testable acceptance criteria), NFRs, Examples and references, Best-practice context, Risks and incurred costs, Open follow-ups.
8. `essense-flow-tools state-set-research-round --value <int>` — advance the round counter (only on the `research → research` loop entry; not required on the exit-to-triaging path).
9. `essense-flow-tools state-set-research-completed --value <iso8601>` — stamp the research exit timestamp (only on the exit-to-triaging path).
10. `essense-flow-tools state-set-phase --value triaging` — advance phase. The deterministic gate fires here: for `research → triaging`, the CLI's predicate evaluator checks `.pipeline/requirements/REQ.md exists` (path-only existence; handled by the existing `path-exists` branch — no content-property predicate, contrast with review's `confirmed_unacknowledged_criticals == 0` and verify's `confirmed_gaps == 0`). REQ.md missing → exit 7 with `predicate '.pipeline/requirements/REQ.md exists' failed: file not present`.
11. `essense-flow-tools step-advance --skill research --next-step skill-complete` — cursor deletes; skill exits.

**What you write directly with `Write`** (not via CLI ops):

- `.pipeline/requirements/REQ.md` (canonical path from init JSON; the artifact whose existence justifies the `research → triaging` transition).

**What you do NOT touch:**

- `lib/dispatch.js` — DEPRECATED for research (registered agent dispatch supersedes; old helpers remain in tree for unmigrated skills).
- `lib/finalize.js` — DEPRECATED for research (CLI ops `state-set-phase` + `state-set-research-completed` + `state-set-research-round` supersede; old helper remains in tree).
- `.pipeline/state.yaml` directly — never `Write` to it; the only legal mutators are `state-set-*` CLI ops.

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

## Unknowns ledger (librarian protocol)

Your agents are librarians: they hand over the best book they have, but they cannot know which books they don't have. Every perspective-agent return carries an `unknowns:` array (shape: `references/librarian.md`). Your duties as master:

1. **Collect** — read every return's `unknowns[]`. A return missing the array is incomplete: bounce it back. An entry with an empty `research_attempted` goes back too — research-first is the rule.
2. **Register** — `essense-flow-tools register-add --item-id U-<n> --kind unknown --closure-criterion "<the suggested_question>" --source-artifact <return ref> --project-root <root>` for every open entry. No unknown lives only in your context window — context dies, the register survives.
3. **Surface** — `blocking: true` entries: put to the user via `AskUserQuestion` BEFORE acting on that return. Non-blocking entries: batch them into one `AskUserQuestion` before REQ.md is finalized (they often become open questions in REQ.md — register them anyway so they survive the phase). A ratified `suggested_default` is an answer — record it as `closure_evidence` and close the register entry.
4. **Never assume** — an unanswered unknown stays open in the register and is surfaced again at the next gate. Silently proceeding past one is the failure mode this protocol exists to kill.

## Constraints

- Per **Diligent-Conduct**: every claim cites a source. No "I think." If an agent can't find a source, that absence is itself a finding.
- Per **Front-Loaded-Design**: research closes a spec decision. If a perspective comes back with "depends on context," route back to elicit for a constraint, not down to architect.
- Per **Fail-Soft**: a single perspective agent crashing produces a synthetic finding ("lens X did not return"). Other lenses still synthesize.
- Per **Graceful-Degradation**: a partial prior REQ.md is reconciled, not regenerated. The skill reads what's there and continues from the open threads — silent overwrite of prior work is forbidden.
- Per **INST-13**: no cap on perspective-lens count. The skill commissions one lens per open spec question. Count is driven by spec gaps, not by a quota.
- Per the user's source rules: high-confidence sources only. Quote, don't paraphrase. Cross-reference where possible.

## Why delegation is mandatory here

Without parallel perspective agents, the research substance — multiple lenses, fetched sources, candidate answers — runs entirely in master context. By the time synthesis happens, the rule (high-confidence sources only; cross-reference; convert to testable acceptance criteria) has drifted under hundreds of tokens of fetched content. Drift symptom: REQ.md ends up with vague NFRs and low-confidence citations.

Delegation keeps the rule loud at synthesis time. Each lens-agent returns findings + sources; master applies the source rule when stitching, with the citation discipline still in working memory because it didn't burn context fetching pages.

## Scripts

- `lib/dispatch.js` — DEPRECATED for research (replaced by registered `essense-flow-perspective-agent` dispatch via the Agent tool with `subagent_type`). Kept in tree for unmigrated skills until S9.7.
- `lib/brief.js` — DEPRECATED for research (perspective briefs assembled inline from `templates/perspective-brief.md` with master-side placeholder substitution, then handed to the Agent tool). Kept in tree for unmigrated skills.
- `lib/finalize.js` — DEPRECATED for research (replaced by `state-set-phase` + `state-set-research-completed` + `state-set-research-round` CLI ops + ordinary `Write` on the canonical path from init JSON).
- `mcp__context7__resolve-library-id` + `mcp__context7__query-docs` — current library docs (used by perspective agents per `~/.claude/CLAUDE.md` "Context7" rule).
- `WebSearch` / `WebFetch` — current articles, papers, official blogs (used by perspective agents).

## State transitions

| from | to | trigger | auto |
|------|----|---------|------|
| research | research | additional round | no |
| research | triaging | REQ.md written, no open questions | yes |

## Before you finalize

Last block — read it just before you act.

**Phase targets** (verbatim from `references/transitions.yaml`):

- `research → research` — additional round (`research.round` advances)
- `research → triaging` — REQ.md written, no open questions

Not legal: `researched`, `req-ready`, `done`.

**The exact CLI op sequence** for the research→triaging transition (post-S9.4 redesign):

```bash
# Step 8 of 8 — finalize
# (1) write REQ.md via ordinary Write at the canonical path from `init research`:
#       .pipeline/requirements/REQ.md  (frontmatter MUST include schema_version,
#                                        sources_consulted, perspectives_run)

# (2) stamp the research-completed timestamp:
essense-flow-tools state-set-research-completed --value 2026-05-08T12:34:56Z

# (3) advance phase; CLI predicate evaluator checks REQ.md exists at the canonical
#     path; missing → exit 7 with predicate-failed message:
essense-flow-tools state-set-phase --value triaging

# (4) cursor cleanup:
essense-flow-tools step-advance --skill research --next-step skill-complete
```

For an additional round (`research → research`), do NOT advance phase. Instead:

```bash
essense-flow-tools state-set-research-round --value <int>
# (cursor stays on the in-progress step; no skill-complete sentinel)
```

The round counter is monotonic-by-construction at the setter (parses non-neg int, writes the literal value); master is responsible for incrementing.

**Self-check before the call:**

1. Is `--value` for `state-set-phase` exactly `triaging` (the only legal exit target from research per the init JSON `phase_to`)?
2. Does REQ.md exist at the canonical path before you call `state-set-phase --value triaging`? (The CLI's predicate evaluator will reject if not — but the self-check catches it before the rejection.)
3. Did **perspective agents** produce the per-lens findings, master synthesizes? If master wrote REQ.md from main-context recall, the high-confidence-sources rule has likely drifted. Per Why-delegation-mandatory: master fetching pages inline burns context, the citation discipline drifts, the verification gate at downstream review/verify catches vague NFRs.
4. Are you calling `state-set-phase`, not `Write` on `.pipeline/state.yaml`? The only legal state mutators are `state-set-*` CLI ops.

If any answer is `no`, stop. Re-read.

The CLI emits a one-line stderr message + exit 7 if the predicate fails (REQ.md missing); the failure is loud, not advisory.

## Numbered step sequence (per DD-15 ordered_steps)

The eight blocks below are the addressable anchors consumed by
`essense-flow-tools next-step --skill research`. Each `## N. <step-
name>` heading mirrors a slot in the `ordered_steps` array returned by
`essense-flow-tools init research` (verbatim). Bodies above remain the
source-of-truth for the step's substance; these blocks point back into
them so the parser (lib/cursor-schema.cjs `parseSkillStepsFromMarkdown`)
can slice the emission window cleanly. Per CMC-Rd10-3 + D-Rd10-10: the
parser stays canonical, only the SKILL.md files carry numbered headings.

## 1. read-spec

Step 1 of 8 for the research skill (DD-15 ordered_steps anchor).

Read `.pipeline/elicitation/SPEC.md` (required). On missing/corrupt:
refuse to start. Identify every open question, every undefined
dependency, every architecture decision the spec leaves to research.

See the existing skill body section "How you work" → "Setup" step 1 for
the full substance. This heading is the addressable anchor for `next-
step --skill research` body emission bounded by the next numbered
heading.

## 2. identify-open-questions

Step 2 of 8 for the research skill (DD-15 ordered_steps anchor).

Enumerate the spec gaps that need research-driven closure: each open
question, each undefined dependency, each architecture decision the spec
defers.

See the existing skill body section "How you work" → "Setup" step 1
(open-question enumeration) for the full substance. This heading is the
addressable anchor for `next-step --skill research` body emission
bounded by the next numbered heading.

## 3. formulate-perspective-briefs

Step 3 of 8 for the research skill (DD-15 ordered_steps anchor).

For each open question, formulate a perspective brief — a question to a
parallel agent — using `templates/perspective-brief.md` with placeholder
substitution (`{{lens}}`, `{{project_context}}`, `{{open_questions}}`,
`{{lens_specific_instructions}}`, `{{sentinel}}`).

See the existing skill body section "How you work" → "Setup" steps 2-3
+ "Perspective lenses" for the full substance. This heading is the
addressable anchor for `next-step --skill research` body emission
bounded by the next numbered heading.

## 4. dispatch-perspective-agents

Step 4 of 8 for the research skill (DD-15 ordered_steps anchor).

Dispatch `essense-flow-perspective-agent` (Agent tool with
`subagent_type: essense-flow-perspective-agent`), one per commissioned
lens, in parallel (single message, multiple Agent tool calls). Quorum
`all-required`.

See the existing skill body section "How you work" → "Dispatch" for the
full substance. This heading is the addressable anchor for `next-step
--skill research` body emission bounded by the next numbered heading.

## 5. synthesize-findings

Step 5 of 8 for the research skill (DD-15 ordered_steps anchor).

Collate findings — group by spec question. Reconcile contradictions —
when two lenses recommend different paths, surface both with the trade-
off, then make the closing call with rationale.

See the existing skill body section "How you work" → "Synthesis" steps
1-2 for the full substance. This heading is the addressable anchor for
`next-step --skill research` body emission bounded by the next numbered
heading.

## 6. convert-to-acceptance-criteria

Step 6 of 8 for the research skill (DD-15 ordered_steps anchor).

Convert each functional requirement to a testable acceptance criterion.
"Should be fast" is not a criterion. "p95 < 200ms on 1k concurrent
reads" is.

See the existing skill body section "How you work" → "Synthesis" step 3
for the full substance. This heading is the addressable anchor for
`next-step --skill research` body emission bounded by the next numbered
heading.

## 7. reread-spec-and-req

Step 7 of 8 for the research skill (DD-15 ordered_steps anchor).

Re-read SPEC + draft REQ together. If new questions surface, research
them now — do not push to triage. Loop `research → research` for
additional rounds via `state-set-research-round --value <int>`.

See the existing skill body section "How you work" → "Synthesis" step 4
+ "Loop until closed" for the full substance. This heading is the
addressable anchor for `next-step --skill research` body emission
bounded by the next numbered heading.

## 8. finalize

Step 8 of 8 for the research skill (DD-15 ordered_steps anchor).

Write REQ.md to `canonical_paths.req_md` via ordinary `Write`. Stamp
`state-set-research-completed`. Advance phase via `state-set-phase
--value triaging`. Cursor cleanup via `step-advance --skill research
--next-step skill-complete`.

See the existing skill body section "Before you finalize" + "Finalize"
for the full substance. This heading is the addressable anchor for
`next-step --skill research` body emission; since this is the last step
(N == K == 8), the emission window runs from this heading to end-of-
file.
