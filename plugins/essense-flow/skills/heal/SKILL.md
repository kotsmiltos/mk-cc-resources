---
name: heal
description: Pipeline self-heal. Picks up from any prior state — fresh project, mid-flight pause, prior tool's artifacts, code-without-spec. Walks the working directory, infers phase from on-disk artifacts (reading shapes, not just listings), proposes a walk-forward, applies via legal transitions only on user confirm.
version: 1.0.0
schema_version: 1
---

# Heal skill

## Conduct

You are a diligent partner. Show, don't tell. Explain in depth with clear words. Not in a rush. Think ahead. No missed steps, no shortcuts, no fabricated results, no dropped or deferred items "because easier" — deferrals of scope are not accepted. Take time. Spend tokens.

Use sub-agents with agency + clear goals + clear requirements. Parallelize. Engineer what's needed: clear, concise, maintainable, scalable. Don't overengineer. Thorough on substance, lean on ceremony.

The human has no need to know how you are doing and sometimes they don't want to know, they don't have time nor patience. You need to be effective in communication, not assume what you are talking about is already known. Codebases must be clear and documented and you must be willing and able to provide all context in case asked when the user wants to dive deeper.

Tests are meant to help catch bugs, not verify that 1 + 1 = 2. This means that if we decide to write tests they need to be thought through and testing for actual issues that are not clear, not write them for the fun of writing.

Documentation is OUR CONTEXT, without it we are building headless things, it needs to be clear, presentable and always kept up to date.

We don't want to end up with the most lines of code but the best lines of code. We don't patch on patch, we create proper solutions for new problems, we are not afraid of producing great results.

Things we build need access from claude to be tested so we can build things like CLI for claude to play alone with them or add the ability to log everything that happens so that claude can debug after running.

## Operating contract

- Heal can run from **any** state, including `idle`, missing state, or corrupt state.
- Heal NEVER silently mutates state. Every inferred change is presented as a **walk-forward proposal**; the user confirms via `AskUserQuestion` before any state write.
- When the user confirms, heal applies the inferred state through **legal transitions one step at a time** — no jumping, no skipping the state machine.
- Read artifact bodies, not directory listings. Existence alone is never sufficient evidence.
- Append to `.pipeline/heal/HEAL-LOG.md` after every applied step — what was inferred, why, and what was applied.

## Core principle

Pick up where you are, not where the pipeline wishes you were. Heal absorbs prior work — partial, mis-shaped, or from another methodology — and reconciles it into the pipeline's shape. The pipeline never says "this project is not compatible." It says "here is what I see, here is what I infer, here is where I propose we resume."

## What you produce

- `.pipeline/heal/HEAL-LOG.md` — append-only record of inferred phases, applied steps, and any reconciliations.
- `.pipeline/heal/proposal.yaml` — current walk-forward proposal awaiting user confirmation.
- (after confirm) `.pipeline/state.yaml` — written via legal transitions, one step at a time.

HEAL-LOG.md frontmatter (refreshed each invocation):

```yaml
---
schema_version: 1
last_invocation: <iso>
inferred_phase: <phase>
confidence: high | medium | low
artifacts_recognized: [...]
artifacts_unrecognized: [...]
---
```

## How you work

### Job 1 — Discover

Walk the project root. For each candidate prior-artifact path (`SPEC.md`, `REQ.md`, `ARCH.md`, `.pipeline/**`, plus any user-configured paths in `defaults/config.yaml.discovery.prior_artifact_paths`):

1. **Existence check** — does the file exist?
2. **Shape check** — read the body. Does it carry the pipeline's frontmatter shape (e.g. SPEC.md with `schema_version: 1` and complexity assessment)? Or is it a prose document from another methodology?
3. **Content read** — for shape-matching files, read in full. For shape-mismatching files, read enough to characterize them as drafts to reconcile.

The output of discovery is a structured record per artifact: `{path, recognized: bool, shape: 'pipeline' | 'prose' | 'unknown', notes}`.

### Job 2 — Infer

From the discovery record, infer:

1. **The current phase.** Highest-numbered canonical artifact that's complete + valid → that phase has finished. Phase is the next one in the sequence.
2. **Confidence.**
   - `high` — every encountered artifact is shape-matching and complete.
   - `medium` — some artifacts are shape-matching but partial; or some are prose drafts.
   - `low` — only prose drafts exist, or shape is wholly unrecognized.
3. **Reconciliation actions.**
   - Prior prose SPEC → invoke `elicit` in resume mode to bring it to pipeline shape.
   - Prior REQ without acceptance criteria → invoke `research` in tighten-criteria mode.
   - Prior ARCH in another format → extract recognizable parts; route the rest to elicit as addenda.
   - **Code-without-spec** (common after rapid prototyping) → enter reverse-elicit mode: `elicit` reads existing code, drafts a SPEC retroactively, asks user to confirm intent.

### Job 3 — Propose

Write `.pipeline/heal/proposal.yaml`:

```yaml
schema_version: 1
inferred_phase: <phase>
confidence: high | medium | low
walk_forward:
  - step: 1
    transition: idle-to-eliciting
    rationale: "<why>"
  - step: 2
    transition: eliciting-to-eliciting
    rationale: "resume on existing draft SPEC.md"
reconciliation_actions:
  - action: invoke-elicit-resume
    on: ".pipeline/elicitation/SPEC.md (prose, needs frontmatter)"
unknowns:
  - "<anything heal could not place>"
```

Surface the proposal to the user via `AskUserQuestion` with arrow-key options:
- **Accept** — apply the walk-forward as proposed.
- **Edit** — user wants to adjust the proposal before applying.
- **Reject** — discard, run `/init` instead.

### Job 4 — Apply (only on user confirm)

For each step in the walk-forward, in order:

1. Verify the transition is legal (via `lib/state.js assertLegalTransition`). If not, halt and surface — do not silently skip.
2. Call `lib/finalize.js` for that step (writes any reconciled artifact + transitions state).
3. Append to HEAL-LOG.md: what was inferred, what was applied, any reconciliation invoked.

### Job 5 — Hand off

After the walk-forward completes:

- State is at the inferred phase.
- HEAL-LOG.md captures the audit trail.
- Recommended next action surfaces (typically the slash command for the now-current phase).

## Discovery confidence behavior

- **High confidence**: walk-forward proposal is concrete, applies cleanly. User confirms once.
- **Medium confidence**: proposal includes reconciliation actions (invoke elicit-resume, etc.). User can accept or edit before apply.
- **Low confidence**: proposal surfaces "phase uncertain" and asks the user to pick the starting phase via `AskUserQuestion`. Heal does NOT silently choose.

## Code-without-spec mode (reverse-elicit)

When prior artifacts are **only code** (no SPEC, no REQ, no ARCH):

1. Heal proposes: "code present, no spec — invoke elicit in reverse mode."
2. On confirm, elicit reads representative parts of the code, drafts SPEC.md retroactively (problem statement, goals inferred from features, constraints from package.json/CI/etc.), and asks the user via `AskUserQuestion` whether each inferred decision matches intent.
3. The drafted SPEC then enters the normal flow — review can audit it against the code, triage can route discrepancies, architect can decompose forward work.

## Constraints

- Per **Graceful-Degradation**: heal handles every degraded state explicitly. Missing state, corrupt state, foreign-shape artifacts — each gets tailored handling, never blanket "this is unsupported."
- Per **Front-Loaded-Design**: heal does not silently invent design decisions to fill gaps. It surfaces every uncertainty as a question for the user.
- Per **Diligent-Conduct**: heal NEVER skips a transition. Walk-forward is one legal step at a time. The audit trail in HEAL-LOG.md is append-only.
- Per **Fail-Soft**: heal observes degraded states and warns; it does not refuse to start because the project is in an unexpected shape.
- Per **INST-13**: no cap on walk-forward steps. The proposal walks every legal transition needed to reach the inferred phase, one step at a time. A long walk is a real signal about how far the project drifted, not a budget violation.

## Scripts

- `lib/state.js` — read/write, transition validation.
- `lib/finalize.js` — atomic write+transition for each walk-forward step.
- `AskUserQuestion` (built-in) — proposal confirmation, reverse-elicit confirmations.

## State transitions

Heal does not have its own dedicated transitions. It uses the existing transition table — applying legal transitions one step at a time. Effectively, heal can move state from any phase to any phase **only** by walking the legal graph.

If the inferred destination is not reachable from the current state via legal transitions, heal halts and surfaces. It does not invent illegal moves.
