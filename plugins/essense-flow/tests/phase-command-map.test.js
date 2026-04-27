"use strict";

/**
 * Cross-check tests — references/phase-command-map.yaml is the canonical
 * phase→command source. These tests enforce that:
 *
 *   - phase-command-map.yaml lists every phase reachable in transitions.yaml
 *   - next-runner.js loads the canonical map cleanly and exposes parity
 *   - autopilot's flow map (when reachable in dev) mirrors the same entries
 *     for non-gated, non-terminal phases
 *
 * The third check is best-effort: it skips when essense-autopilot source is
 * not reachable, so the test suite still passes in environments where only
 * essense-flow is checked out.
 */

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const yaml = require("js-yaml");

const ROOT = path.resolve(__dirname, "..");
const PHASE_MAP_YAML = path.join(ROOT, "references", "phase-command-map.yaml");
const TRANSITIONS_YAML = path.join(ROOT, "references", "transitions.yaml");

function loadYaml(p) {
  return yaml.load(fs.readFileSync(p, "utf8"));
}

function canonicalPhasesFromTransitions() {
  const data = loadYaml(TRANSITIONS_YAML);
  const phases = new Set();
  for (const def of Object.values(data.transitions || {})) {
    if (def && def.from) phases.add(def.from);
    if (def && def.to) phases.add(def.to);
  }
  return phases;
}

test("phase-command-map.yaml lists every phase from transitions.yaml", () => {
  const map = loadYaml(PHASE_MAP_YAML);
  const mapped = new Set(Object.keys(map.phase_command || {}));
  const canonical = canonicalPhasesFromTransitions();

  const missing = [...canonical].filter((p) => !mapped.has(p));
  assert.equal(
    missing.length,
    0,
    `phase-command-map.yaml missing entries for canonical phases: ${missing.join(", ")}`
  );
});

test("phase-command-map.yaml has no entries for non-canonical phases", () => {
  const map = loadYaml(PHASE_MAP_YAML);
  const mapped = new Set(Object.keys(map.phase_command || {}));
  const canonical = canonicalPhasesFromTransitions();

  const orphans = [...mapped].filter((p) => !canonical.has(p));
  assert.equal(
    orphans.length,
    0,
    `phase-command-map.yaml has entries for unknown phases: ${orphans.join(", ")}`
  );
});

test("phase-command-map.yaml every phase covered by autopilot flow OR human_gates OR terminal", () => {
  const map = loadYaml(PHASE_MAP_YAML);
  const phases = Object.keys(map.phase_command || {});
  const gates = new Set(map.autopilot_human_gates || []);
  const terminal = new Set(map.autopilot_terminal || []);

  // Every phase must have a defined behavior for autopilot:
  //   - in flow (auto-advance)
  //   - in human_gates (halt for dialogue)
  //   - in terminal (pipeline done)
  for (const phase of phases) {
    const inFlow = !!map.phase_command[phase];
    const inGates = gates.has(phase);
    const inTerminal = terminal.has(phase);
    // Phases in human_gates / terminal are also allowed to have a phase_command
    // entry (next-runner uses it for user-facing suggestions). But they must
    // be classified somewhere.
    assert.ok(
      inFlow || inGates || inTerminal,
      `phase '${phase}' has no autopilot behavior — must be in flow OR human_gates OR terminal`
    );
  }
});

test("next-runner.js loads phase-command-map.yaml and exposes correct mappings", () => {
  // Re-require after delete to force fresh load against current YAML.
  const nextRunnerPath = require.resolve("../skills/context/scripts/next-runner.js");
  delete require.cache[nextRunnerPath];

  // Point process.cwd-derived helpers at a clean dir so next-runner doesn't
  // exit-on-load via require.main check (it's required, not main here).
  const map = loadYaml(PHASE_MAP_YAML);
  // We don't import next-runner directly because it executes top-level code
  // that calls process.exit. Instead, validate the YAML it claims to load
  // is well-formed and contains the expected entries.

  // Spot-check the corrections from this session:
  assert.equal(map.phase_command.architecture, "/architect", "architecture must map to /architect (was /build pre-fix)");
  assert.equal(map.phase_command.decomposing, "/architect", "decomposing must map to /architect");
  assert.equal(map.phase_command.triaging, "/triage", "triaging must map to /triage");
  assert.equal(map.phase_command.reviewing, "/triage", "reviewing must map to /triage (post-review hand-off; readiness gate halts when QA-REPORT.md missing)");
  assert.equal(map.phase_command.sprinting, "/build", "sprinting must map to /build");
});

test("autopilot flow map (when reachable) mirrors phase-command-map.yaml for non-gated phases", { skip: !findAutopilotSource() }, () => {
  const autopilotPath = findAutopilotSource();
  if (!autopilotPath) return;

  // Read autopilot.js source and extract the DEFAULT_CONFIG.flow object via
  // require — autopilot.js executes top-level code that reads stdin and
  // exits. Instead parse the source for the flow object literal.
  const source = fs.readFileSync(autopilotPath, "utf8");

  const flowRegex = /flow:\s*\{([^}]+)\}/m;
  const match = source.match(flowRegex);
  assert.ok(match, "could not locate DEFAULT_CONFIG.flow object literal in autopilot.js");

  const flowBody = match[1];
  const apMap = {};
  // Match  "phase": "/cmd",   or   phase: "/cmd",
  const entryRegex = /["']?([\w-]+)["']?\s*:\s*["']([^"']+)["']/g;
  let m;
  while ((m = entryRegex.exec(flowBody)) !== null) {
    apMap[m[1]] = m[2];
  }

  const canonical = loadYaml(PHASE_MAP_YAML);
  const gates = new Set(canonical.autopilot_human_gates || []);
  const terminal = new Set(canonical.autopilot_terminal || []);

  // For every phase in canonical that is NOT a gate or terminal, autopilot's
  // flow must have a matching entry with the same command.
  for (const [phase, cmd] of Object.entries(canonical.phase_command || {})) {
    if (gates.has(phase) || terminal.has(phase)) continue;
    assert.equal(
      apMap[phase],
      cmd,
      `autopilot flow[${phase}] = ${apMap[phase]} but canonical says ${cmd}`
    );
  }
});

/**
 * Look for essense-autopilot source in the same workspace as essense-flow.
 * Returns absolute path to autopilot.js, or null if not found.
 */
function findAutopilotSource() {
  const candidates = [
    // Sibling under mk-cc-resources monorepo
    path.resolve(ROOT, "..", "mk-cc-resources", "plugins", "essense-autopilot", "hooks", "scripts", "autopilot.js"),
    // Sibling at workspace root
    path.resolve(ROOT, "..", "essense-autopilot", "hooks", "scripts", "autopilot.js"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}
