# Architecture — essense-flow

This document walks the essense-flow topology at the depth an operator or contributor needs to make changes without breaking the contract surface. The shape is small: nine skills, two hooks, five lib primitives, one state file, one transitions graph. The discipline that holds the shape together is encoded in SKILL.md prose plus audit tests; this document names the load-bearing pieces and how they connect.

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
│   ├── principles.md        # 5 principles (4 + INST-13) cited by every SKILL.md
│   └── transitions.yaml     # legal phase-transition graph; finalize.js validates against this
├── skills/                  # one directory per skill, each with SKILL.md + optional templates/
│   ├── elicit/
│   ├── research/
│   ├── triage/
│   ├── architect/
│   ├── build/
│   ├── review/
│   ├── verify/
│   ├── context/
│   └── heal/
├── lib/                     # five primitives, no more
│   ├── state.js
│   ├── finalize.js
│   ├── brief.js
│   ├── dispatch.js
│   └── verify-disk.js
├── hooks/                   # advisory only — fail-soft, never block tool calls
│   ├── context-inject.js
│   └── next-step.js
├── commands/                # slash command wrappers, one per skill plus utility commands
├── scripts/                 # self-test, validate-plugin, audit runners
└── tests/                   # audit tests run by self-test
```

Top-level boundary:

- **Skills** carry contracts (SKILL.md prose).
- **lib** carries mechanism (state, finalize, brief, dispatch, verify).
- **hooks** carry advisory surfacing.
- **references** carry shared constants (principles, transitions graph).

No cross-layer leak: skills do not write state directly, lib does not embed skill-specific logic, hooks do not block tool calls. The layer separation is enforced by SKILL.md prose ("finalize is the only state-writer") plus audit tests (`no-caps.test.js` greps for fail-closed patterns in hooks; zero hits permitted).

The plugin's `.claude-plugin/plugin.json` manifest declares only name, version, description, and author. There are no programmatic capabilities, no hook registrations in JSON, no skill registrations in JSON. Hooks are discovered by Claude Code from the `hooks/` directory; skills are discovered from the `skills/` directory. Convention over configuration.

## Per-module

### `skills/`

Each skill is a directory with a single `SKILL.md` and (where the skill produces structured artifacts) a `templates/` subdirectory. SKILL.md is the contract content sub-agents read at dispatch. It carries:

1. **Verbatim Conduct preamble** at the very top (audited by `tests/conduct-preamble.test.js`).
2. **Core Principle block** citing the load-bearing principle for that skill (architect cites "lowest amount of sprints necessary"; review cites evidence-bound findings; etc.).
3. **Phase-producing skills carry a closing "Before you finalize" block** at the very bottom — verbatim phase targets from `transitions.yaml`, exact `finalize({writes, nextState})` call shape, numbered self-check, "if any answer is no, stop."
4. **Principle citations in load-bearing sections** (Core Principle or Constraints) for all 5 principles. Audited by `tests/principle-citations.test.js`. Citations in incidental prose fail.

Heal's closing variant is "Before each apply step" because heal walks the recovery graph one step at a time with per-step user confirm.

Skills NOT touched by the master/sub-agent split: `elicit` (dialogue with user; delegating breaks the contract), `context` (read-only state plumbing; no substance volume).

### `lib/`

Five primitives, sized to do one thing each:

- **`state.js`** — read/write `.pipeline/state.yaml`. Validates phase value against the legal phase set on read. Writes go through `finalize.js`; nothing else mutates state.
- **`finalize.js`** — the single state-writer. Signature: `finalize({writes, nextState})`. Calls `assertLegalTransition(currentPhase, nextState.phase)` against `transitions.yaml`; refuses illegal edges. Reads `requires:` from the matched transition; expands `<n>` to `nextState.sprint`; emits stderr advisory if a hinted `.pipeline/...` path is neither in `writes[]` nor on disk. Advisory only — never refuses on `requires:` miss. Writes are atomic (artifact + state in one call).
- **`brief.js`** — sub-agent brief assembly. Receives the closed task spec (or skill-specific input); concatenates into a dispatch prompt; emits stderr warning on oversize content but returns the brief in full. Briefs are contracts; contracts don't get truncated.
- **`dispatch.js`** — parallel sub-agent fan-out via Claude Code Agent tool. Implements sentinel envelope (start/end markers around each agent's structured response), quorum semantics (all-required with synthetic record on crash), no concurrency caps.
- **`verify-disk.js`** — re-reads filesystem after agent returns; compares `agent_claim` paths and content against disk; computes drift; produces the `runner_verification` half of the dual-record.

No 27-module orchestration tower. The cognitive work is in SKILL.md, not in lib.

### `hooks/`

Two hooks, both advisory, both fail-soft:

- **`context-inject`** — runs on `UserPromptSubmit` + `SessionStart`. Reads `.pipeline/state.yaml`; emits phase + canonical artifact paths + degradation warnings (missing state file, malformed YAML, etc.) as additional context to the prompt. Never blocks the prompt.
- **`next-step`** — runs on `Stop`. Reads current phase; emits the recommended next slash command as advisory text. Never blocks the Stop.

Both fail-soft on degraded state: emit a stderr warning and continue. No fail-closed branches anywhere in hook code (audited by `tests/no-caps.test.js`).

### `references/`

- **`principles.md`** — the 5 governing principles: Graceful-Degradation, Front-Loaded-Design, Fail-Soft, Diligent-Conduct, INST-13 (no resource caps as fail-closed gates). Each SKILL.md cites all 5 in load-bearing sections.
- **`transitions.yaml`** — the legal phase-transition graph. Schema: `{from: <phase>, to: <phase>, requires: [<path-hint>, ...]}` per edge. `finalize.js` validates against this; `tests/transitions.test.js` audits that every transition cited in any SKILL.md exists in the graph.

Why a separate `references/` directory: shared constants that multiple skills cite by content (not by reference) need exactly one source of truth. Putting the principles in a SKILL.md would force every other skill to either duplicate the citation or rely on cross-skill prose drift. Putting them in `references/principles.md` lets every SKILL.md cite the principle name verbatim with the canonical wording one directory over.

`transitions.yaml` plays the same role for phase edges: when an edge is in question, the answer is in `transitions.yaml`, not in skill prose. SKILL.md says "transition X → Y is legal here"; `transitions.yaml` says whether the graph permits it; `finalize.js` enforces the graph at run time; `transitions.test.js` audits SKILL.md citations against the graph at build time.

### `scripts/` + `tests/`

- **`scripts/self-test.js`** — runs all primitive tests + audits. Green is the audit-pass gate for any 0.x release.
- **`scripts/validate-plugin.js`** — validates `.claude-plugin/plugin.json`, the SKILL.md preamble + citation audits, and the transitions graph. Green is the audit-pass gate for any 0.x release.
- **`tests/conduct-preamble.test.js`** — every SKILL.md begins with the verbatim Conduct block.
- **`tests/principle-citations.test.js`** — every SKILL.md cites all 5 principles in load-bearing sections.
- **`tests/transitions.test.js`** — every transition cited in any SKILL.md exists in `transitions.yaml`.
- **`tests/no-caps.test.js`** — greps for forbidden fail-closed cap patterns; zero hits permitted.

The audit tests are not "extra coverage"; they are the mechanism that prevents discipline drift between versions. A skill that drops its preamble breaks the build. A skill that cites a phase edge the graph does not have breaks the build. A hook that smuggles in a fail-closed cap breaks the build. The discipline is content-based at SKILL.md level; the audit tests are the build-time enforcement of that content.

### `.claude-plugin/`

The `plugin.json` manifest. Four fields:

- `name` — `essense-flow`.
- `version` — semver. 0.12.0 at this writing. Major bump on breaking changes to the contract surface; minor bump on additive features; patch on fixes. v1 declaration pending operator signoff.
- `description` — one-paragraph summary read by `/plugin list` and marketplace UIs.
- `author.name` — single-maintainer string.

No programmatic capabilities are declared in JSON. Hook + skill discovery is convention-based from `hooks/` and `skills/` directories.

## Data flow walkthrough

Pipeline walks one phase at a time, artifact-mediated. A typical run:

1. **Operator invokes `/essense-flow:init`** in a fresh project directory. `context/SKILL.md` runs; `state.js` writes `.pipeline/state.yaml` with `phase: idle` (or the first legal opening phase per the graph). No transition logic; this is the initial seed.

2. **Operator invokes `/elicit "<pitch>"`**. `elicit/SKILL.md` runs in master context. Master conducts dialogue with the operator; produces `.pipeline/elicitation/SPEC.md` from the dialogue. `finalize.js` validates `idle → eliciting` against `transitions.yaml`, writes SPEC.md + transitions state in one atomic call.

3. **Operator invokes `/research`**. `research/SKILL.md` opens with master architect framing: master decides perspective boundaries; dispatches one sub-research agent per perspective via `dispatch.js`. Each sub-agent returns evidence-bound findings; master synthesizes into `.pipeline/requirements/REQ.md`. `finalize.js` validates `eliciting → research`, writes REQ.md + transitions state atomically.

4. **Operator invokes `/triage`**. `triage/SKILL.md` runs. For large input batches, master dispatches per-class sub-triagers (one per item kind: bug, drift, gap, ambiguity, missing-analysis). Each returns dispositions; master cross-references against SPEC. Output: `.pipeline/triage/TRIAGE-REPORT.md`.

5. **Operator invokes `/architect`**. Master architect dispatches one sub-architect per module via `Agent` tool calls. Sub-architects return CLOSED task specs (with `file_write_contract.paths`, `behavioral_pseudocode`, `test_completion_contract`, `agency_level`). Master packs sprints from the dependency graph; sprint count = topological depth. Output: `.pipeline/architecture/ARCH.md` + per-sprint `manifest.yaml` + per-task spec YAMLs.

6. **Operator invokes `/build`**. `build/SKILL.md` reads the sprint manifest; for each wave, dispatches one sub-agent per task in parallel via `dispatch.js`. Each sub-agent receives the closed task spec assembled by `brief.js`; implements code + tests; returns `agent_claim`. Master calls `verify-disk.js` to re-validate against disk; produces dual-record with `agent_claim` verbatim + `runner_verification` + computed `drift` + `verified` flag. Persisted via `record-task-completion` CLI op at `.pipeline/build/sprints/<n>/tasks/<task-id>/completion-record.yaml`. After the last wave: `SPRINT-REPORT.md`.

7. **Operator invokes `/review`**. Adversarial QA against the sprint output. Findings require verbatim path evidence; the validator re-reads each cited file and compares the quote against position; quote_drift findings auto-flag as false positives. Output: `.pipeline/review/sprints/<n>/QA-REPORT.md`.

8. **Operator invokes `/verify`**. Top-down spec compliance check against SPEC.md + REQ.md + ARCH.md + completion records. Output: `.pipeline/verify/VERIFICATION-REPORT.md`.

9. **Mid-flight: operator invokes `/heal`**. Heal walks the disk; recognizes improvised schema (illegal `phase` value, flat `SPRINT-MANIFEST.yaml`, `tasks/*.md` instead of `sprints/<n>/tasks/<id>.yaml`); proposes per-step conversion with per-step user confirm. Originals archived under `.pipeline/.heal-archive/`, never deleted.

10. **Throughout: `context-inject` re-grounds master in current phase on every prompt.** State is reloaded from disk every turn — no phase memory cached across prompt boundaries.

The state machine, summarized:

```
idle → eliciting → research → triaging → architecture → decomposing
  → sprinting → sprint-complete → reviewing → verifying → done
```

Recovery edges (heal-mediated, per-step user confirm) exist from most phases back to a prior recovery point. The full graph is in `references/transitions.yaml`; `finalize.js` reads it on every state write.

The autopilot plugin (`essense-autopilot`, separate install) drives this state machine forward across phases on `Stop` events. It halts at human gates (`eliciting`, `verifying`), real blockers (incomplete sub-agent return), in-flight background Agent calls, forward-detect for sprint-complete + QA-REPORT, and no-progress (same phase + sprint + wave as last fire). On halt, autopilot suggests `/heal`. Diagnostic stderr on every halt path. Autopilot is opt-in per project via `.pipeline/config.yaml`.

## Key abstractions

- **Closed task specs.** Architect produces task specs as immutable YAML contracts. Build cannot mutate them mid-sprint. Sub-agent receives the spec; spec is the contract; deviations are recorded as `surfaced_concerns`, not silently rewritten.
- **Dual-record self-reports.** Every task completion persists both `agent_claim` (verbatim from sub-agent) and `runner_verification` (master's re-read of disk) plus computed `drift` and `verified` flag. Summarize-on-return is impossible; master compares to disk.
- **Evidence-bound findings.** Review rejects findings without verbatim path evidence. Validator re-anchors quotes; drift auto-flags as `quote_drift`. Vibe-findings cannot ship.
- **Atomic finalize.** `finalize({writes, nextState})` is the only state-writer. Writes artifact + transitions state in one call; no partial-write-then-transition split that drops autopilot into phantom-artifact-with-stale-phase.
- **Fail-soft hooks.** Hooks emit stderr warnings on degraded state; never block tool calls. `tests/no-caps.test.js` greps for forbidden fail-closed patterns; zero hits permitted.
- **Master/sub-agent split.** When substance volume would dilute master context, master dispatches sub-agents in parallel. Sub-agents do substance with their SKILL.md contract loud; master synthesizes with the discipline rule still in working memory because substance was elsewhere.
- **Propagation block.** Every artifact (SKILL.md, redesign docs, generated reports) carries a "Read this before doing anything" block with the four instructions: limits-awareness, positive mindset, quality ownership, propagation requirement. Future descendants inherit the discipline by content, not by reference.
- **Closing-block recency.** Phase-producing SKILL.md ends with the contract at the bottom — recency bias works for the rule instead of against. Master executing finalize sees the contract right where the action happens.
- **Audit tests as drift guards.** Conduct preamble, principle citations, transitions graph alignment, no-caps grep, all run on every `scripts/self-test.js` invocation. A skill that drops its preamble or invents a transition fails the build.
- **Synthetic record on crash.** If a sub-agent crashes without returning, master writes a synthetic completion record with `synthetic: true`, `agent_claim.status: crashed`, paused-task verdict. The sprint pauses for triage. Missing signal becomes evidence, not silence.
- **`requires:` advisory in finalize.** `finalize.js` reads `requires:` path hints from the matched transition; emits stderr advisory when hinted paths are missing from both `writes[]` and disk. Caller can ignore the advisory; the legality check (legal `from→to` edge in the graph) remains the gate. Informational, not refusal.
- **Wave-first sprint packing.** Architect packs sprints from the dependency graph; sprint count = topological depth. Wave 2 within a sprint is parallel-safe (same `/build` invocation). Sprint 2 is a hard checkpoint requiring user re-invoke. The stop-cost rule: every sprint split = the user types `/build` again. Architect optimizes for minimum sprints first.
- **No resource caps as fail-closed gates.** INST-13. The plugin has no `MAX_CONCURRENT_AGENTS`, no `MIN_WAVE_CAP`, no "if N exceeded, reject" clauses. Quality-gate thresholds remain (e.g. `evidence.min_quote_length`); they police evidence policy, not throughput. `tests/no-caps.test.js` greps for forbidden cap patterns; zero hits permitted.

## Propagation

This document, like every artifact produced by essense-flow or contributed to it, carries the four-instruction propagation block. Future doc edits and future skill additions inherit the discipline by content. The four:

- **Limits-awareness** — Claude drifts, loses context, finishes prematurely, defers, takes shortcuts. Re-read when uncertain. Preserve specifics.
- **Positive mindset** — every gap is solvable; find the way by working carefully.
- **Quality ownership** — the work matters; output reflects that; take ownership.
- **Propagation requirement** — every descendant artifact must carry these same four instructions.

Pattern for new artifacts: place a `## Read this before doing anything` block as the final H2 of the document, with the four instructions as bullet points. Place it after the substantive content so recency bias works for the rule. Do not abbreviate the four instructions; the verbatim wording is what makes the audit possible.

Pattern for new skills: the propagation block goes inside the verbatim Conduct preamble at the top of SKILL.md (already audited by `tests/conduct-preamble.test.js`) plus the closing "Before you finalize" block at the bottom (audited by the SKILL.md preamble test indirectly — the closing block is the recency-bias enforcement, not separately audited as of 0.12).

Pattern for new lib primitives: lib code does not carry the propagation block in source (JavaScript files are read by the runtime, not by Claude). But the lib's mental model — the trust contract, the failure modes — must be documented in `TRUST.md` and reflected in the SKILL.md prose that depends on the primitive. New primitives without a TRUST.md update do not ship on any release line.

Pattern for new hooks: hooks must be fail-soft (emit stderr warning + continue; never block tool calls), and the no-caps audit must remain green. A hook that introduces a `MAX_*` cap or "if N exceeded, reject" branch fails the audit and does not ship. The same rule applies to lib: caps live nowhere in the codebase.

Pattern for new transitions: an edge added to `transitions.yaml` is not real until at least one SKILL.md cites it AND `tests/transitions.test.js` passes. Editing the YAML without updating SKILL.md is a half-implemented transition; editing SKILL.md without updating the YAML breaks `finalize.js` at run time. Both move together.

The shape stays small because the discipline lives in content, not in mechanism. Future contributors who add a skill, a primitive, a hook, or a transition: keep that asymmetry. Content scales; mechanism does not need to.

## Read this before doing anything

- Limits-awareness: Claude drifts, loses context, finishes prematurely, defers, takes shortcuts. Re-read when uncertain. Preserve specifics.
- Positive mindset: every gap solvable. Find the way by working carefully.
- Quality ownership: this work matters. Take ownership.
- Propagation requirement: every descendant artifact must carry these same four instructions.
