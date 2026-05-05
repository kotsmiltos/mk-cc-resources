#!/usr/bin/env node
// essense-flow-tools — narrow CLI surface for state mutations + path lookups.
//
// S7 spike scope (2026-05-06): implements `init context` and `step-advance`
// (context skill, all 3 modes — init/status/next; only status mode exercised
// by the spike). Future S8 / S9.x sessions extend with state-set-* family,
// state-set-phase, record-task-completion, task-spec-write, and the other 8
// init <skill> blocks per `redesign/cli-spec.md` and `redesign/init-spec.md`.
//
// Spec sources (read-only — do not paraphrase or invent fields):
//   redesign/cli-spec.md §1.4 step-advance + §5 D-3 Addendum (mode arg).
//   redesign/init-spec.md §1.9 init context (multi-mode shape).
//   redesign/06-decisions.md 2026-05-05 D-3 + 2026-05-06 S6.5.
//
// Conventions:
//   - All ops emit JSON to stdout on success and exit 0.
//   - Errors emit one-line message to stderr with exact wording from cli-spec.md
//     and exit with the cli-spec-named code.
//   - The .cjs container loads ESM `js-yaml` via dynamic import (Node 18+).
//   - Cursor file lives at `<project-root>/.pipeline/cursor.yaml` (per S4 §1.4
//     Note "If S7 surfaces a better location, surface as SURPRISES.md amendment").

const path = require('node:path');
const fs = require('node:fs');

const PLUGIN_ROOT = path.resolve(__dirname, '..');

// ---- Exit codes (per cli-spec.md §1.1 shared rejection table + per-op tables) ----
const EXIT_OK = 0;
const EXIT_DEGRADED = 2;
const EXIT_ARG_MISSING_OR_BAD = 4;
const EXIT_VALIDATION_FAIL = 9;
const EXIT_INIT_LOOKUP_FAIL = 12;
const EXIT_OUT_OF_ORDER = 13;
const EXIT_SKILL_OR_MODE_MISMATCH = 14;
const EXIT_UNKNOWN_OP = 4;

// ---- Closed-list constants (per cli-spec.md §3.1, §3.2; init-spec.md §1.9) ----
const SKILLS = [
  'elicit', 'research', 'architect', 'build', 'review',
  'verify', 'triage', 'heal', 'context',
];
const CONTEXT_MODES = ['init', 'status', 'next'];

// Sentinel passed as --next-step to finalize a skill run (deletes cursor file).
// Per cli-spec.md §1.4 Effect: "the next step-advance call (with --next-step
// matching the canonical 'skill-complete' sentinel from ordered_steps, or with
// no successor existing) deletes the cursor file (signaling 'this skill run
// finalized cleanly; the next skill can run')". S7 implementation uses the
// literal sentinel `skill-complete` since `ordered_steps_by_mode` arrays do
// not contain a sentinel entry; cursor at last step + this token = finalize.
const SKILL_COMPLETE_SENTINEL = 'skill-complete';

const CURSOR_REL = '.pipeline/cursor.yaml';
const STATE_REL = '.pipeline/state.yaml';

// ---- Async YAML helpers (dynamic ESM import for js-yaml) ----
let _yamlMod = null;
async function yaml() {
  if (_yamlMod) return _yamlMod;
  _yamlMod = (await import('js-yaml')).default;
  return _yamlMod;
}
async function loadYaml(p) {
  const y = await yaml();
  return y.load(fs.readFileSync(p, 'utf8'));
}
async function dumpYaml(obj) {
  const y = await yaml();
  return y.dump(obj, { lineWidth: 100, noRefs: true });
}

// ---- Output helpers ----
function emitSuccess(obj) {
  process.stdout.write(JSON.stringify(obj, null, 2) + '\n');
  process.exit(EXIT_OK);
}
function emitFailure(code, msg) {
  process.stderr.write(msg + '\n');
  process.exit(code);
}

// ============================================================================
// Op: init context
// ----------------------------------------------------------------------------
// Returns the multi-mode JSON shape per `redesign/init-spec.md` §1.9.
// Pure (no writes). Reads `references/transitions.yaml` for cross-check
// (currently advisory) and `<project-root>/.pipeline/state.yaml` only to
// populate the `sprint_number` field if state exists.
// ============================================================================
async function initContext(projectRoot) {
  // Look up sprint from project state (read-only; degraded → null)
  let sprint_number = null;
  const statePath = path.join(projectRoot, STATE_REL);
  if (fs.existsSync(statePath)) {
    try {
      const s = await loadYaml(statePath);
      sprint_number = s && typeof s === 'object' && 'sprint' in s ? s.sprint : null;
    } catch (_e) {
      sprint_number = null; // degraded read → null per init-spec §3.7
    }
  }

  return {
    skill: 'context',
    modes: ['init', 'status', 'next'],
    phase_from: '<mode-specific; see modes block below>',
    phase_to: '<mode-specific; see modes block below>',
    transitions: [
      {
        name: 'no-state-to-idle',
        from: '(no-state)',
        to: 'idle',
        auto_advance: false,
        requires: null,
        scope:
          'context.init mode only — writes initial state.yaml from defaults/state.yaml',
      },
    ],
    canonical_paths: {
      state_yaml: STATE_REL,
    },
    ordered_steps_by_mode: {
      init: [
        'check-no-state-exists',
        'init-state-from-defaults',
        'surface-recommended-next',
      ],
      status: ['read-state', 'render-status-block', 'delegate-to-next'],
      next: ['read-state', 'lookup-next-command', 'emit-cue-no-auto-execute'],
    },
    sprint_number,
    required_inputs: [],
    principles_cited: [
      'Graceful-Degradation',
      'Fail-Soft',
      'Diligent-Conduct',
      'Front-Loaded-Design',
      'INST-13',
    ],
    sub_agents: [],
    per_phase_artifact_map: {
      idle: [],
      eliciting: ['.pipeline/elicitation/SPEC.md'],
      research: ['.pipeline/elicitation/SPEC.md', '.pipeline/requirements/REQ.md'],
      triaging: [
        '.pipeline/elicitation/SPEC.md',
        '.pipeline/requirements/REQ.md',
        '.pipeline/triage/TRIAGE-REPORT.md',
      ],
      'requirements-ready': ['.pipeline/requirements/REQ.md'],
      architecture: [
        '.pipeline/architecture/ARCH.md',
        '.pipeline/architecture/sprints/<n>/manifest.yaml',
      ],
      decomposing: ['.pipeline/architecture/ARCH.md'],
      sprinting: [
        '.pipeline/architecture/sprints/<n>/manifest.yaml',
        '<per-task specs>',
      ],
      'sprint-complete': [
        '.pipeline/build/sprints/<n>/SPRINT-REPORT.md',
        '<completion records>',
      ],
      reviewing: ['.pipeline/review/sprints/<n>/QA-REPORT.md'],
      verifying: [
        '.pipeline/verify/VERIFICATION-REPORT.md',
        '.pipeline/verify/extracted-items.yaml',
      ],
      complete: ['.pipeline/state.yaml'],
    },
  };
}

// ============================================================================
// Op: step-advance
// ----------------------------------------------------------------------------
// Sole writer of `.pipeline/cursor.yaml`. Monotonic-by-construction.
// Per cli-spec.md §1.4 + §5 D-3 Addendum.
// ============================================================================
async function stepAdvance({ skill, nextStep, mode, projectRoot }) {
  // V1: skill validation
  if (!skill) {
    return emitFailure(
      EXIT_ARG_MISSING_OR_BAD,
      `essense-flow-tools step-advance: --skill required, expected one of [${SKILLS.join(', ')}]`,
    );
  }
  if (!SKILLS.includes(skill)) {
    return emitFailure(
      EXIT_ARG_MISSING_OR_BAD,
      `essense-flow-tools step-advance: --skill required, expected one of [${SKILLS.join(', ')}]`,
    );
  }
  if (!nextStep) {
    return emitFailure(
      EXIT_ARG_MISSING_OR_BAD,
      `essense-flow-tools step-advance: --next-step is required`,
    );
  }

  // V1.5: --mode validation per D-3 Addendum
  if (skill === 'context') {
    if (!mode) {
      return emitFailure(
        EXIT_ARG_MISSING_OR_BAD,
        `essense-flow-tools step-advance: --mode is required when --skill = context (must be one of [init, status, next])`,
      );
    }
    if (!CONTEXT_MODES.includes(mode)) {
      return emitFailure(
        EXIT_VALIDATION_FAIL,
        `essense-flow-tools step-advance: --mode '${mode}' not in [init, status, next]`,
      );
    }
  } else {
    if (mode) {
      return emitFailure(
        EXIT_ARG_MISSING_OR_BAD,
        `essense-flow-tools step-advance: --mode '${mode}' not accepted for --skill '${skill}'; --mode is context-only`,
      );
    }
  }

  // V2: read init <skill>'s ordered_steps (mode-aware for context)
  let initJson;
  try {
    if (skill === 'context') {
      initJson = await initContext(projectRoot);
    } else {
      // S7 spike scope: only context implemented. Future S8/S9.x extend.
      throw new Error(`init <${skill}> not implemented in S7 spike scope`);
    }
  } catch (e) {
    return emitFailure(
      EXIT_INIT_LOOKUP_FAIL,
      `essense-flow-tools step-advance: init ${skill} returned non-zero (${e.message}); cannot validate --next-step`,
    );
  }
  const orderedSteps =
    skill === 'context'
      ? (initJson.ordered_steps_by_mode && initJson.ordered_steps_by_mode[mode])
      : initJson.ordered_steps;
  if (!orderedSteps || !Array.isArray(orderedSteps) || orderedSteps.length === 0) {
    return emitFailure(
      EXIT_INIT_LOOKUP_FAIL,
      `essense-flow-tools step-advance: init ${skill} returned no ordered_steps for ${mode || skill}; cannot validate --next-step`,
    );
  }

  // V3: read cursor file
  const cursorPath = path.join(projectRoot, CURSOR_REL);
  let cursor = null;
  if (fs.existsSync(cursorPath)) {
    try {
      cursor = await loadYaml(cursorPath);
    } catch (e) {
      return emitFailure(
        EXIT_DEGRADED,
        `essense-flow-tools step-advance: current state degraded (cursor parse failed: ${e.message}); run /heal first`,
      );
    }
  }

  // Sentinel: skill-complete (delete cursor when at last step)
  if (nextStep === SKILL_COMPLETE_SENTINEL) {
    if (!cursor) {
      return emitFailure(
        EXIT_OUT_OF_ORDER,
        `essense-flow-tools step-advance: cursor empty; cannot finalize (no skill run in progress)`,
      );
    }
    if (cursor.skill !== skill) {
      return emitFailure(
        EXIT_SKILL_OR_MODE_MISMATCH,
        `essense-flow-tools step-advance: cursor.skill is '${cursor.skill}', --skill is '${skill}'; prior skill run incomplete — run /heal first`,
      );
    }
    if (skill === 'context' && cursor.mode !== mode) {
      return emitFailure(
        EXIT_SKILL_OR_MODE_MISMATCH,
        `essense-flow-tools step-advance: cursor.mode is '${cursor.mode}', --mode is '${mode}'; prior context.${cursor.mode} run incomplete — run /heal first`,
      );
    }
    const lastStep = orderedSteps[orderedSteps.length - 1];
    if (cursor.current_step !== lastStep) {
      return emitFailure(
        EXIT_OUT_OF_ORDER,
        `essense-flow-tools step-advance: --next-step '${SKILL_COMPLETE_SENTINEL}' requires cursor at last step '${lastStep}', got '${cursor.current_step}'`,
      );
    }
    fs.unlinkSync(cursorPath);
    return emitSuccess({
      ok: true,
      op: 'step-advance',
      skill,
      previous_step: cursor.current_step,
      current_step: SKILL_COMPLETE_SENTINEL,
      step_index: orderedSteps.length,
      total_steps: orderedSteps.length,
      cursor_path: CURSOR_REL,
      skill_complete: true,
    });
  }

  // V4: --next-step in ordered_steps
  if (!orderedSteps.includes(nextStep)) {
    return emitFailure(
      EXIT_VALIDATION_FAIL,
      `essense-flow-tools step-advance: --next-step '${nextStep}' not in ${skill}'s ordered_steps [${orderedSteps.join(', ')}]`,
    );
  }

  // V4a: cursor empty → must be first step
  if (!cursor) {
    if (nextStep !== orderedSteps[0]) {
      return emitFailure(
        EXIT_OUT_OF_ORDER,
        `essense-flow-tools step-advance: cursor empty; --next-step must be first step '${orderedSteps[0]}', got '${nextStep}'`,
      );
    }
    const newCursor = {
      skill,
      ...(skill === 'context' ? { mode } : {}),
      current_step: nextStep,
      step_index: 0,
      total_steps: orderedSteps.length,
      last_advanced_at: new Date().toISOString(),
    };
    await writeCursor(cursorPath, newCursor);
    return emitSuccess({
      ok: true,
      op: 'step-advance',
      skill,
      previous_step: null,
      current_step: nextStep,
      step_index: 0,
      total_steps: orderedSteps.length,
      cursor_path: CURSOR_REL,
      skill_complete: false,
    });
  }

  // V4b: cursor exists → skill must match
  if (cursor.skill !== skill) {
    return emitFailure(
      EXIT_SKILL_OR_MODE_MISMATCH,
      `essense-flow-tools step-advance: cursor.skill is '${cursor.skill}', --skill is '${skill}'; prior skill run incomplete — run /heal first`,
    );
  }
  if (skill === 'context' && cursor.mode !== mode) {
    return emitFailure(
      EXIT_SKILL_OR_MODE_MISMATCH,
      `essense-flow-tools step-advance: cursor.mode is '${cursor.mode}', --mode is '${mode}'; prior context.${cursor.mode} run incomplete — run /heal first`,
    );
  }

  // V4c: monotonic successor only
  const currentIdx = orderedSteps.indexOf(cursor.current_step);
  if (currentIdx < 0) {
    return emitFailure(
      EXIT_DEGRADED,
      `essense-flow-tools step-advance: cursor.current_step '${cursor.current_step}' not in ordered_steps for ${skill}/${mode || ''}; run /heal first`,
    );
  }
  const expectedSuccessor = orderedSteps[currentIdx + 1];
  if (expectedSuccessor === undefined) {
    return emitFailure(
      EXIT_OUT_OF_ORDER,
      `essense-flow-tools step-advance: cursor at last step '${cursor.current_step}'; pass --next-step '${SKILL_COMPLETE_SENTINEL}' to finalize`,
    );
  }
  if (nextStep !== expectedSuccessor) {
    return emitFailure(
      EXIT_OUT_OF_ORDER,
      `essense-flow-tools step-advance: --next-step '${nextStep}' is not the immediate successor of cursor.current_step '${cursor.current_step}'; expected '${expectedSuccessor}'`,
    );
  }

  const newCursor = {
    skill,
    ...(skill === 'context' ? { mode } : {}),
    current_step: nextStep,
    step_index: currentIdx + 1,
    total_steps: orderedSteps.length,
    last_advanced_at: new Date().toISOString(),
  };
  await writeCursor(cursorPath, newCursor);
  return emitSuccess({
    ok: true,
    op: 'step-advance',
    skill,
    previous_step: cursor.current_step,
    current_step: nextStep,
    step_index: currentIdx + 1,
    total_steps: orderedSteps.length,
    cursor_path: CURSOR_REL,
    skill_complete: false,
  });
}

async function writeCursor(cursorPath, cursor) {
  const dir = path.dirname(cursorPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(cursorPath, await dumpYaml(cursor), 'utf8');
}

// ============================================================================
// Arg parser — minimal, no external dep
// ----------------------------------------------------------------------------
// Recognises positional `<op>` and optional `<sub>` (for `init <skill>`),
// then `--flag value` pairs. Boolean flags not used by S7 ops.
// ============================================================================
function parseArgs(argv) {
  const out = { _op: null, _sub: null };
  let i = 0;
  if (argv[i] && !argv[i].startsWith('--')) out._op = argv[i++];
  if (out._op === 'init' && argv[i] && !argv[i].startsWith('--')) out._sub = argv[i++];
  while (i < argv.length) {
    const tok = argv[i];
    if (!tok.startsWith('--')) {
      i++;
      continue;
    }
    const key = tok.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) {
      out[key] = true;
      i += 1;
    } else {
      out[key] = next;
      i += 2;
    }
  }
  return out;
}

function printHelp() {
  process.stdout.write(
    [
      'essense-flow-tools — narrow CLI for essense-flow state ops + path lookups',
      '',
      'Ops implemented in S7 spike (2026-05-06):',
      '  init context',
      '      → JSON describing context skill (canonical paths, modes,',
      '        ordered_steps_by_mode, per_phase_artifact_map). Pure; no writes.',
      '  step-advance --skill <name> --next-step <step> [--mode <init|status|next>] [--project-root <path>]',
      '      → advance per-skill cursor at <project-root>/.pipeline/cursor.yaml',
      '        monotonic-by-construction; --mode required for --skill=context only',
      '        --next-step skill-complete + cursor on last step → cursor deleted',
      '',
      'Future S8 / S9.x extend with: state-set-* family, state-set-phase,',
      'record-task-completion, task-spec-write, init <skill> for the other 8 skills.',
      'See redesign/cli-spec.md and redesign/init-spec.md.',
    ].join('\n') + '\n',
  );
}

// ============================================================================
// Main
// ============================================================================
(async () => {
  const argv = process.argv.slice(2);
  if (argv.length === 0 || argv[0] === '--help' || argv[0] === '-h' || argv[0] === 'help') {
    printHelp();
    process.exit(EXIT_OK);
  }
  const args = parseArgs(argv);
  const projectRoot = args['project-root'] ? path.resolve(args['project-root']) : process.cwd();

  switch (args._op) {
    case 'init': {
      if (args._sub === 'context') {
        const json = await initContext(projectRoot);
        process.stdout.write(JSON.stringify(json, null, 2) + '\n');
        process.exit(EXIT_OK);
      }
      if (!args._sub) {
        return emitFailure(
          EXIT_ARG_MISSING_OR_BAD,
          `essense-flow-tools init: <skill> required (one of [${SKILLS.join(', ')}])`,
        );
      }
      if (!SKILLS.includes(args._sub)) {
        return emitFailure(
          EXIT_ARG_MISSING_OR_BAD,
          `essense-flow-tools init: unknown skill '${args._sub}', expected one of [${SKILLS.join(', ')}]`,
        );
      }
      // Known skill but not yet implemented in S7 spike
      return emitFailure(
        EXIT_INIT_LOOKUP_FAIL,
        `essense-flow-tools init: skill '${args._sub}' not implemented in S7 spike scope (only 'context' implemented; future S8/S9.x extend per redesign/init-spec.md)`,
      );
    }
    case 'step-advance': {
      await stepAdvance({
        skill: args.skill,
        nextStep: args['next-step'],
        mode: args.mode,
        projectRoot,
      });
      return; // emitSuccess / emitFailure inside stepAdvance call process.exit
    }
    default:
      return emitFailure(
        EXIT_UNKNOWN_OP,
        `essense-flow-tools: unknown op '${args._op}' (run with --help for ops list)`,
      );
  }
})().catch((err) => {
  process.stderr.write(`essense-flow-tools: unhandled error: ${err.message}\n`);
  if (process.env.ESSENSE_FLOW_DEBUG) console.error(err.stack);
  process.exit(1);
});
