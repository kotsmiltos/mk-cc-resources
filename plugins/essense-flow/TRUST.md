# Trust model — essense-flow

essense-flow operates on a layered trust contract: the operator trusts the marketplace, the master trusts the state CLI (`bin/essense-flow-tools.cjs`) and `transitions.yaml`, master distrusts sub-agent self-reports, and every phase hands off through artifacts on disk rather than memory. This file makes the trust boundaries explicit so future skill authors do not silently widen them.

## What trusts

The plugin trusts these inputs and authorities without re-verification at run time:

- **The marketplace source.** Install pulls SKILL.md, lib/, hooks/, and templates/ from the marketplace repo. Once installed, the plugin treats those files as authoritative. There is no per-call signature check.
- **The state CLI as the only state-writer.** Every phase-producing skill funnels its phase advance through `essense-flow-tools state-set-phase`, which validates the edge against `transitions.yaml` (illegal `from→to` edges are refused) and checks the transition's prerequisite artifacts on disk; `record-task-completion` is the sole writer of completion records. The graph in `transitions.yaml` is the source of truth for phase progression; SKILL.md prose is advisory next to it. And because the artifacts are authoritative, even a tampered or corrupted `state.yaml` cache is recoverable: `state-reconcile` rebuilds it from disk.
- **`transitions.yaml` as the legality oracle.** If an edge is not declared in `transitions.yaml`, it does not exist. Skills that want a new phase must add the edge to `transitions.yaml` AND name it in their SKILL.md; the audit test `tests/transitions.test.js` rejects skills citing edges the graph does not have.
- **The operator's filesystem permissions.** The plugin trusts that the operator's Claude Code session has legitimate access to the project directory. It does not request elevated privileges and does not check whether writes would clobber anything outside `.pipeline/` (file_write_contract is the contract; the operator owns the directory).
- **Conduct preamble + principle citations as a forcing function.** Every SKILL.md opens by citing the canonical Conduct in `references/principles.md` (cite-don't-copy — the text lives once); every SKILL.md cites all 5 principles in load-bearing sections. The audit tests (`tests/conduct-preamble.test.js`, `tests/principle-citations.test.js`) enforce this at CI time. A skill that loses its preamble or citations breaks the build.

## What distrusts

The plugin actively does not trust these surfaces and re-validates them:

- **Sub-agent self-reports.** Agents return `agent_claim` YAML. Master's `verify-disk.js` re-reads the filesystem and computes drift before persisting. The persisted dual-record carries BOTH shapes (`agent_claim` verbatim + `runner_verification` + computed `drift` + `verified` flag). Summarize-on-return is rejected by master at the parse step.
- **Review findings without evidence.** `review` requires verbatim path evidence on every finding. The validator re-reads each cited file and compares the quote against the position. Findings that drift auto-flag as `quote_drift`. A reviewer cannot ship a vibe-finding.
- **Architect's claim that a sprint is well-packed.** The architect packs sprints from the dependency graph; the `data_dependency_on_prior_sprint:` field on sprint > 1 entries is required and must carry a one-sentence justification. An empty justification invalidates the manifest. Heal's sprint-packing recognizer cross-checks against the SPEC.
- **Heal's improvised-schema recognition.** Heal proposes a walk-forward when it sees illegal `phase` values, flat manifests, or `tasks/*.md` instead of `sprints/<n>/tasks/<id>.yaml`. Heal does not auto-apply: every conversion step requires user confirm. The trust boundary is "heal proposes, operator authorizes."
- **Master's own phase claim mid-session.** Context-inject re-reads `state.yaml` on `UserPromptSubmit` and `SessionStart` rather than caching the phase in memory across the boundary. State is reloaded from disk every prompt.

## Handoff between phases

Phase handoff in essense-flow is artifact-mediated, not memory-mediated. The contract:

1. **Phase A's terminal skill writes its phase-defining artifact, then transitions state via `state-set-phase`.** The artifact lands first; the transition is gated on it. No transition-without-artifact split.
2. **`state-set-phase` validates the transition against `transitions.yaml`** before the write. Illegal edges are refused; the state does not move.
3. **`state-set-phase` checks the matched transition's `requires:` artifact preconditions on disk** and rejects with the missing path named when a prerequisite is absent. Concrete artifact preconditions only — never quotas or budgets.
4. **Phase B's opening skill reads the phase-defining artifact from disk, not from memory.** No phase-A-to-phase-B prose handoff. The artifact IS the handoff.
5. **Context-inject surfaces phase + canonical artifact paths on every prompt.** Master re-grounds in current phase every turn; no drift between "what phase do I think I'm in" and "what does state.yaml say."
6. **Build's task dispatch passes a closed brief assembled from the architect-frozen task spec.** Sub-agent receives the spec; spec is not mutable mid-build.
7. **On crash without return, master writes a synthetic completion record** marked `synthetic: true`, `agent_claim.status: crashed`, paused-task verdict. The sprint pauses for triage. Missing signal surfaces — never hidden.
8. **Heal walks the graph one step at a time, not in a batch.** Each apply step gets its own user confirm. The recovery boundary is per-step, not per-recovery.

## Assumptions on Claude

The plugin is calibrated against observed Claude behavior across two months of iteration. Assumptions, named explicitly:

- **Claude drifts.** Long sessions lose constraints from the top of context. Mitigation: closing-block placement (recency bias works for the rule), per-prompt context-inject re-grounding, audit tests that catch drift as schema violation.
- **Claude finishes prematurely.** Sub-agents try to "wrap up" when the task feels large. Mitigation: closed task specs with explicit `test_completion_contract`; master re-validates against disk; deferrals are recorded as `surfaced_concerns`, not silently dropped.
- **Claude takes shortcuts under pressure.** Substance volume invites summarization. Mitigation: master/sub-agent split (substance lives in sub-agent context, not master), dual-record self-reports (raw claim survives), evidence-bound findings (vibe-claims rejected).
- **Claude follows recency bias.** The last thing in context is the loudest. Mitigation: closing blocks at the bottom of every SKILL.md; propagation footer at the bottom of every artifact; phase-producing skills name the legal phase targets verbatim in the closing block.
- **Claude can be lied to via prompt injection.** Operator prose, research material, and review findings can carry injected instructions. Mitigation: the plugin does not auto-trust user-provided substance; agents follow their SKILL.md contract; the contract is install-time content, not run-time content.
- **Claude needs the rule loud at the moment of action.** A discipline rule cited at the top of a 5000-token SKILL.md is invisible at line 4000. Mitigation: principle citations are required in load-bearing sections (Core Principle or Constraints), audited by `tests/principle-citations.test.js`. Citations in incidental prose fail the audit.

## Read this before doing anything

- Limits-awareness: Claude drifts, loses context, finishes prematurely, defers, takes shortcuts. Re-read when uncertain. Preserve specifics.
- Positive mindset: every gap solvable. Find the way by working carefully.
- Quality ownership: this work matters. Take ownership.
- Propagation requirement: every descendant artifact must carry these same four instructions.
