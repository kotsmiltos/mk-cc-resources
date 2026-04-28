"use strict";

/**
 * heal-runner — interactive pipeline self-heal.
 *
 * Walks state.pipeline.phase forward through legal transitions in
 * references/transitions.yaml when on-disk artifacts indicate phase is
 * behind reality. Pairs with lib/phase-inference (pure) and
 * lib/state-machine.writeState (atomic, audit-logged).
 *
 * Public API:
 *   runHeal({ pipelineDir, askFn, applyDirectly }) → HealResult
 *
 * Modes:
 *   - askFn=null + applyDirectly=false (production default): runner returns
 *     `{status:"proposal", inference, proposal}` so the orchestrator
 *     (commands/heal.md) can drive the AskUserQuestion loop.
 *   - askFn provided: runner calls askFn, applies user choice. Used in
 *     tests + automation.
 *   - applyDirectly=true: skip ask, walk immediately. Reserved for scripted
 *     repair pipelines (CI), used cautiously.
 *
 * HealResult statuses:
 *   - "no-heal-needed"        — current === inferred
 *   - "ambiguous"             — inference is ambiguous; user must
 *                               investigate manually
 *   - "no-walk"               — walk is null (no legal path); manual
 *                               state edit required
 *   - "proposal"              — askFn=null mode; orchestrator drives
 *                               the user prompt
 *   - "applied"               — walk applied successfully
 *   - "partial"               — walk halted mid-way (writeState rejected)
 *   - "user-declined"         — askFn returned a non-apply option
 */

const fs = require("fs");
const path = require("path");
const phaseInference = require("../../../lib/phase-inference");
const stateMachine = require("../../../lib/state-machine");

const APPLY_OPTION = "Apply walk-forward";
const INVESTIGATE_OPTION = "Investigate first";
const LEAVE_OPTION = "Leave alone";

async function runHeal({ pipelineDir, askFn = null, applyDirectly = false }) {
  if (!pipelineDir) {
    return { ok: false, status: "missing-pipeline-dir", error: "pipelineDir is required" };
  }
  if (!fs.existsSync(pipelineDir)) {
    return { ok: false, status: "missing-pipeline-dir", error: `pipelineDir not found: ${pipelineDir}` };
  }

  const inference = phaseInference.inferPhaseFromArtifacts(pipelineDir);

  // Same phase: nothing to do.
  if (inference.inferred_phase === inference.current_phase) {
    return {
      ok: true,
      status: "no-heal-needed",
      inference,
    };
  }

  if (inference.ambiguous) {
    return {
      ok: true,
      status: "ambiguous",
      inference,
      message:
        `Cannot heal automatically: ${inference.reason}. ` +
        `Inspect state-history.yaml + .pipeline/ artifacts manually, ` +
        `or use /repair --apply for the deterministic backward-revert cases.`,
    };
  }

  if (!Array.isArray(inference.walk) || inference.walk.length === 0) {
    return {
      ok: true,
      status: "no-walk",
      inference,
      message:
        `Inferred phase '${inference.inferred_phase}' but no legal walk from ` +
        `'${inference.current_phase}' via transitions.yaml. Manual intervention required.`,
    };
  }

  const proposal = {
    current_phase: inference.current_phase,
    inferred_phase: inference.inferred_phase,
    walk: inference.walk,
    evidence_count: inference.evidence.length,
    summary: `${inference.current_phase} → ${inference.walk.join(" → ")}`,
  };

  // Production mode (orchestrator drives ask): return proposal for SKILL.md
  // to render with AskUserQuestion.
  if (askFn === null && !applyDirectly) {
    return {
      ok: true,
      status: "proposal",
      inference,
      proposal,
    };
  }

  // Apply path: either direct (applyDirectly) or after asking.
  if (askFn !== null) {
    const choice = await askFn({
      question: `Pipeline appears stuck. Inferred phase '${inference.inferred_phase}' from disk artifacts; current phase is '${inference.current_phase}'. Proposed walk: ${proposal.summary}. Apply?`,
      options: [
        { label: APPLY_OPTION, description: `Walk through ${inference.walk.length} legal transition(s) via state-machine.writeState (audited).` },
        { label: INVESTIGATE_OPTION, description: "Exit without changes; user inspects state-history.yaml + .pipeline/ artifacts then decides." },
        { label: LEAVE_OPTION, description: "Exit without changes; the apparent stuck-state is intentional." },
      ],
    });
    if (choice !== APPLY_OPTION) {
      return {
        ok: true,
        status: "user-declined",
        inference,
        proposal,
        choice,
      };
    }
  }

  // Walk via writeState. Each step audit-logged as trigger="heal-walk-forward".
  const completedSteps = [];
  for (const targetPhase of inference.walk) {
    const r = stateMachine.writeState(pipelineDir, targetPhase, {}, {
      command: "/heal",
      trigger: "heal-walk-forward",
    });
    if (!r.ok) {
      return {
        ok: false,
        status: "partial",
        inference,
        proposal,
        completed_steps: completedSteps,
        stopped_at: targetPhase,
        error: r.error,
      };
    }
    completedSteps.push(targetPhase);
  }

  return {
    ok: true,
    status: "applied",
    inference,
    proposal,
    completed_steps: completedSteps,
    final_phase: completedSteps[completedSteps.length - 1],
  };
}

module.exports = {
  runHeal,
  APPLY_OPTION,
  INVESTIGATE_OPTION,
  LEAVE_OPTION,
};

// CLI entry — for scripted use. `--apply` walks immediately without asking.
// Without `--apply`, prints the proposal and exits 0.
if (require.main === module) {
  (async () => {
    const args = process.argv.slice(2);
    const applyFlag = args.includes("--apply");
    // findPipelineDir mirrors paths.findPipelineDir; inline to avoid import noise.
    let dir = process.cwd();
    let pipelineDir = null;
    while (true) {
      const cand = path.join(dir, ".pipeline");
      if (fs.existsSync(cand) && fs.statSync(cand).isDirectory()) {
        pipelineDir = cand;
        break;
      }
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
    if (!pipelineDir) {
      process.stderr.write("[heal] no .pipeline/ found\n");
      process.exit(1);
    }
    const result = await runHeal({ pipelineDir, askFn: null, applyDirectly: applyFlag });
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
    process.exit(result.ok ? 0 : 1);
  })().catch((err) => {
    process.stderr.write(`[heal] error: ${err.message}\n`);
    process.exit(1);
  });
}
