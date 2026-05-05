// state.js — read/write .pipeline/state.yaml, validate transitions.
//
// Honours degraded states explicitly:
//   missing   → returns { phase: 'idle', degraded: 'missing' }
//   corrupt   → returns { phase: 'idle', degraded: 'corrupt', reason }
//   valid     → returns the parsed state with degraded: null
//
// Per Graceful-Degradation: degraded reads never throw. Callers see the
// degradation state and decide what to do — typically emit a warning and
// continue with looser permissions.
//
// Per Fail-Soft: writeState rejects only illegal transitions (a state
// machine integrity violation). Resource conditions never reject.

import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLUGIN_ROOT = resolve(__dirname, "..");

const STATE_PATH_REL = ".pipeline/state.yaml";
const TRANSITIONS_PATH = join(PLUGIN_ROOT, "references/transitions.yaml");
const DEFAULT_STATE_PATH = join(PLUGIN_ROOT, "defaults/state.yaml");

let _transitionsCache = null;

export async function loadTransitions() {
  if (_transitionsCache) return _transitionsCache;
  const raw = await readFile(TRANSITIONS_PATH, "utf8");
  _transitionsCache = yaml.load(raw);
  return _transitionsCache;
}

export async function loadDefaultState() {
  const raw = await readFile(DEFAULT_STATE_PATH, "utf8");
  return yaml.load(raw);
}

export function statePath(projectRoot) {
  return join(projectRoot, STATE_PATH_REL);
}

export async function readState(projectRoot) {
  const path = statePath(projectRoot);
  if (!existsSync(path)) {
    return { phase: "idle", degraded: "missing", path };
  }
  let raw;
  try {
    raw = await readFile(path, "utf8");
  } catch (err) {
    return {
      phase: "idle",
      degraded: "corrupt",
      reason: `read failed: ${err.code || err.message}`,
      path,
    };
  }
  let parsed;
  try {
    parsed = yaml.load(raw);
  } catch (err) {
    return {
      phase: "idle",
      degraded: "corrupt",
      reason: `yaml parse failed: ${err.message}`,
      path,
    };
  }
  if (!parsed || typeof parsed !== "object") {
    return {
      phase: "idle",
      degraded: "corrupt",
      reason: "state file is empty or not an object",
      path,
    };
  }
  const transitions = await loadTransitions();
  if (!transitions.phases.includes(parsed.phase)) {
    return {
      ...parsed,
      degraded: "corrupt",
      reason: `unknown phase: ${parsed.phase}`,
      path,
    };
  }
  return { ...parsed, degraded: null, path };
}

export async function assertLegalTransition(from, to) {
  const transitions = await loadTransitions();
  if (from === to) return { ok: true, transition: null, identity: true, requires: null };
  for (const [name, t] of Object.entries(transitions.transitions)) {
    if (t.from === from && t.to === to) {
      return {
        ok: true,
        transition: name,
        identity: false,
        requires: t.requires || null,
      };
    }
  }
  return {
    ok: false,
    reason: `no legal transition from ${from} to ${to}`,
    transition: null,
    requires: null,
  };
}

export async function writeState(projectRoot, nextState, options = {}) {
  const path = statePath(projectRoot);
  const current = await readState(projectRoot);

  // From a degraded read, allow heal/init to repair via {force: true}.
  // Without force, a degraded current state blocks transition writes
  // (a corrupt state file is a state-machine integrity violation —
  // exactly the kind of thing that warrants explicit recovery, not a
  // silent overwrite).
  if (current.degraded && !options.force) {
    return {
      ok: false,
      reason: `current state is degraded (${current.degraded}); pass {force: true} to overwrite`,
      degraded: current.degraded,
    };
  }

  const fromPhase = current.degraded ? null : current.phase;
  const toPhase = nextState.phase;

  if (fromPhase !== null && fromPhase !== undefined) {
    const legal = await assertLegalTransition(fromPhase, toPhase);
    if (!legal.ok) {
      return { ok: false, reason: legal.reason };
    }
  }

  const dir = dirname(path);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }

  const merged = {
    ...nextState,
    last_updated: new Date().toISOString(),
  };
  const yamlText = yaml.dump(merged, { lineWidth: 100, noRefs: true });
  await writeFile(path, yamlText, "utf8");
  return { ok: true, path, phase: toPhase };
}

export async function initState(projectRoot) {
  const path = statePath(projectRoot);
  if (existsSync(path)) {
    return { ok: false, reason: "state already exists", path };
  }
  const defaults = await loadDefaultState();
  const dir = dirname(path);
  await mkdir(dir, { recursive: true });
  const yamlText = yaml.dump(
    { ...defaults, last_updated: new Date().toISOString() },
    { lineWidth: 100, noRefs: true },
  );
  await writeFile(path, yamlText, "utf8");
  return { ok: true, path };
}

// Test-only: clear the transitions cache so a test can swap fixtures.
export function _resetTransitionsCache() {
  _transitionsCache = null;
}
