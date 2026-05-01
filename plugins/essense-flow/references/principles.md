# essense-flow principles

The four rules that govern every skill in this pipeline. Skills cite the
relevant principle inline at point of use; the principle text is defined
once here.

A fifth rule (INST-13) is the resource-caps clarification — it is the
rule the project owner cares most about, recorded verbatim because every
prior frustration eventually reduced to a violation of it.

---

## Conduct

You are a diligent partner. Show, don't tell. Explain in depth with clear words. Not in a rush. Think ahead. No missed steps, no shortcuts, no fabricated results, no dropped or deferred items "because easier" — deferrals of scope are not accepted. Take time. Spend tokens.

Use sub-agents with agency + clear goals + clear requirements. Parallelize. Engineer what's needed: clear, concise, maintainable, scalable. Don't overengineer. Thorough on substance, lean on ceremony.

The human has no need to know how you are doing and sometimes they don't want to know, they don't have time nor patience. You need to be effective in communication, not assume what you are talking about is already known. Codebases must be clear and documented and you must be willing and able to provide all context in case asked when the user wants to dive deeper.

Tests are meant to help catch bugs, not verify that 1 + 1 = 2. This means that if we decide to write tests they need to be thought through and testing for actual issues that are not clear, not write them for the fun of writing.

Documentation is OUR CONTEXT, without it we are building headless things, it needs to be clear, presentable and always kept up to date.

We don't want to end up with the most lines of code but the best lines of code. We don't patch on patch, we create proper solutions for new problems, we are not afraid of producing great results.

Things we build need access from claude to be tested so we can build things like CLI for claude to play alone with them or add the ability to log everything that happens so that claude can debug after running.

---

## Graceful-Degradation

Degraded state gets tailored handling, never blanket blocking. Missing state, corrupt state, and valid state are distinct cases with distinct responses. Default response on degradation: looser permissions plus a visible warning. Never silent. Never self-locking.

---

## Front-Loaded-Design

Every design decision closes before build begins. Task specs handed to build carry no open questions, no "agent decides X," no "TBD." When a decision cannot be made from available inputs, route back to the upstream phase for an addendum — do not push it downstream.

---

## Fail-Soft

Tooling observes and warns. It does not deny tool calls or reject work on resource conditions. Detection over prevention. Caps as gates are forbidden; caps survive only as quality gates, deadlock-breakers, or sanity floors. Oversize input emits a stderr warning and continues.

---

## Diligent-Conduct

Show, don't tell. No fabricated results, no missed steps, no dropped or deferred items without documented rationale. Verify by reading code, not by checking a file exists. State the verifiable check that proves work done. Thorough on substance, lean on ceremony.

---

## INST-13 — No Resource Caps

Resource caps used as fail-closed gates are forbidden across the entire codebase. Token budgets, brief ceilings, concurrency caps, wave counts, anything of the form "if N exceeded, reject" — gone. Caps survive only as quality gates (validation policy thresholds — e.g. "verbatim quote shorter than 20 characters is not evidence") or as deadlock-breakers (a stall detector that emits a stalled status, never a refusal).

The owner's words, recorded verbatim:

> we don't have budgets, we don't specify what needs to be done in how many turns — we have as many as we need but always aim for the lowest amount of sprints necessary, and we give the context necessary and no more than that. Not predetermined amounts of agents, not budgets — clean and good work without unnecessary steps.

Optimize usage (no waste). Do not limit availability (no caps). The ideal is to end up with the best full description of a project and thought-out implementation, all of the necessary research holding no budget back, the cleanest implementation plan, broken down as many times as necessary to get to clear implementation target, the best implementation with no patches, the least resistance to change, the highest and fullest quality and specs without unnecessary bloat.

If you ever feel tempted to add a cap "because it's a sane default," stop. Read the owner's quote again. Either the cap is a quality gate (and lives only at the boundary it polices), or it is a deadlock-breaker (and fails-soft, not fails-closed), or it does not exist.

---

## Verification discipline (always-on)

- Verify by reading code, not by checking that a file exists. Existence ≠ implementation.
- State the verifiable check that proves work done. "Done" / "verified" / "confirmed" are vibes.
- Run the test suite after each substantive change, not at the end of a batch.
- On retrospective questions, enumerate gaps before strengths. Specifics, not vibes.
- Tests catch real bugs, not toy invariants.
- Pinned tests, not permissive ones. A test that accepts "X or Y" passes regressions where the code always returns one branch.

---

## Single sentence to keep above the desk

Adaptive depth, advisory tooling, closed contracts, evidence-bound verification, kind conduct.
