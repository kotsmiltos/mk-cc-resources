"use strict";

const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const os = require("os");
const yaml = require("js-yaml");

const { writeState } = require("../lib/state-machine");
const { validateManifest } = require("../lib/artifact-integrity");
const { STATE_FILE, STATE_HISTORY_FILE } = require("../lib/constants");

// Path to the project's transitions.yaml (two levels up from this test file)
const PROJECT_TRANSITIONS_YAML = path.join(__dirname, "..", "references", "transitions.yaml");

/** Create an isolated temp directory for a test, return its path. */
function makeTmpDir(label) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `essense-sm-${label}-`));
}

/**
 * Set up a minimal pipeline directory structure inside a temp root.
 *
 * writeState looks for transitions.yaml at:
 *   path.dirname(pipelineDir) + "/references/transitions.yaml"
 *
 * So the layout is:
 *   tmpRoot/
 *     references/transitions.yaml  (copied from project if needed)
 *     .pipeline/                   (pipelineDir)
 *       state.yaml                 (seeded if initialPhase given)
 *
 * @param {string} tmpRoot — temp root directory
 * @param {string|null} initialPhase — pipeline.phase to seed in state.yaml, or null for no file
 * @param {boolean} includeTransitions — copy the project transitions.yaml into the temp layout
 * @returns {string} absolute path to the .pipeline dir
 */
function setupPipelineDir(tmpRoot, initialPhase, includeTransitions) {
  const pipelineDir = path.join(tmpRoot, ".pipeline");
  fs.mkdirSync(pipelineDir, { recursive: true });

  if (initialPhase !== null) {
    const statePath = path.join(pipelineDir, STATE_FILE);
    fs.writeFileSync(statePath, yaml.dump({ pipeline: { phase: initialPhase } }), "utf8");
  }

  if (includeTransitions && fs.existsSync(PROJECT_TRANSITIONS_YAML)) {
    const refsDir = path.join(tmpRoot, "references");
    fs.mkdirSync(refsDir, { recursive: true });
    fs.copyFileSync(PROJECT_TRANSITIONS_YAML, path.join(refsDir, "transitions.yaml"));
  }

  return pipelineDir;
}

// ---------------------------------------------------------------------------
// Test 1 — Terminal guard: complete → sprinting returns {ok:false}, no state change
// ---------------------------------------------------------------------------

describe("writeState — terminal guard blocks complete → sprinting", () => {
  let tmpRoot;
  let pipelineDir;

  before(() => {
    tmpRoot = makeTmpDir("t1");
    pipelineDir = setupPipelineDir(tmpRoot, "complete", true);
  });

  after(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it("returns {ok:false} and does NOT modify state.yaml", () => {
    const statePath = path.join(pipelineDir, STATE_FILE);
    const beforeContent = fs.readFileSync(statePath, "utf8");

    const result = writeState(pipelineDir, "sprinting", {}, { command: "test" });

    assert.equal(result.ok, false, "expected ok:false for complete → sprinting");

    // State file must be unchanged — read again and compare
    const afterContent = fs.readFileSync(statePath, "utf8");
    assert.equal(afterContent, beforeContent, "state.yaml must not be modified after a failed transition");
  });
});

// ---------------------------------------------------------------------------
// Test 2 — Transition guard: triaging → verifying with a transitions.yaml that
//           contains NO outgoing transitions from triaging — guard must block it.
//           Skip if transitions.yaml cannot be found at project root (not applicable).
// ---------------------------------------------------------------------------

// An empty-transitions YAML with no entries — so no outgoing edges exist for any state.
const EMPTY_TRANSITIONS_YAML = "schema_version: 1\ntransitions: {}\n";

// The phase we seed for Test 2 — referenced in error message assertions below.
const TEST2_FROM_PHASE = "triaging";

describe("writeState — transition guard blocks unlisted triaging → verifying", () => {
  let tmpRoot;
  let pipelineDir;

  before(() => {
    tmpRoot = makeTmpDir("t2");
    pipelineDir = setupPipelineDir(tmpRoot, TEST2_FROM_PHASE, false);

    // Write a transitions.yaml with zero transitions so triaging → verifying is not listed.
    const refsDir = path.join(tmpRoot, "references");
    fs.mkdirSync(refsDir, { recursive: true });
    fs.writeFileSync(path.join(refsDir, "transitions.yaml"), EMPTY_TRANSITIONS_YAML, "utf8");
  });

  after(() => {
    if (tmpRoot) fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it("returns {ok:false} when triaging → verifying is not in the transitions map (guard exists)", (t) => {
    // Skip if the project transitions.yaml is absent — the guard only makes
    // sense in a project that defines transitions.
    if (!fs.existsSync(PROJECT_TRANSITIONS_YAML)) {
      t.skip("transitions.yaml not found");
      return;
    }

    // With an empty transitions map, no outgoing edges from 'triaging' exist —
    // the guard must return {ok:false}, proving the transition validation is active.
    const result = writeState(pipelineDir, "verifying", {}, { command: "test" });
    assert.equal(result.ok, false, "expected ok:false when transition is absent from map");
    assert.ok(typeof result.error === "string" && result.error.length > 0, "error message must be present");
    assert.ok(result.error, "error message must be non-empty");
    assert.ok(result.error.includes("next valid") || result.error.toLowerCase().includes("next"), "error must reference next valid command");
    assert.ok(result.error.includes(TEST2_FROM_PHASE), "error must include current phase");
  });
});

// ---------------------------------------------------------------------------
// Test 3 — Happy path: idle → research writes state.yaml and state-history.yaml
// ---------------------------------------------------------------------------

describe("writeState — idle → research happy path", () => {
  let tmpRoot;
  let pipelineDir;

  before(() => {
    tmpRoot = makeTmpDir("t3");
    pipelineDir = setupPipelineDir(tmpRoot, "idle", true);
  });

  after(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it("returns {ok:true}", () => {
    const result = writeState(pipelineDir, "research", {}, { command: "test" });
    assert.equal(result.ok, true, "expected ok:true for idle → research");
  });

  it("state.yaml has pipeline.phase === 'research'", () => {
    const statePath = path.join(pipelineDir, STATE_FILE);
    const state = yaml.load(fs.readFileSync(statePath, "utf8"));
    assert.equal(state.pipeline.phase, "research", "pipeline.phase must be 'research'");
  });

  it("state-history.yaml has exactly one entry with fromState:'idle', toState:'research'", () => {
    const historyPath = path.join(pipelineDir, STATE_HISTORY_FILE);
    assert.ok(fs.existsSync(historyPath), "state-history.yaml must exist after writeState");

    const history = yaml.load(fs.readFileSync(historyPath, "utf8"));
    assert.ok(Array.isArray(history.entries), "history.entries must be an array");
    assert.equal(history.entries.length, 1, "must have exactly one history entry");

    const entry = history.entries[0];
    assert.equal(entry.from_state, "idle", "entry.from_state must be 'idle'");
    assert.equal(entry.to_state, "research", "entry.to_state must be 'research'");
    assert.ok("trigger" in entry, "history entry must have trigger field");
    assert.ok("session_id" in entry, "history entry must have session_id field");
  });
});

// ---------------------------------------------------------------------------
// Test 3.1 — Phase-enum guard: writeState rejects non-canonical phase values
//
// Prevents state corruption from typos / external writers landing values like
// "triaged" (which is not a real phase) into pipeline.phase.
// ---------------------------------------------------------------------------

describe("writeState — phase-enum guard rejects unknown target phase", () => {
  let tmpRoot;
  let pipelineDir;

  before(() => {
    tmpRoot = makeTmpDir("t31");
    pipelineDir = setupPipelineDir(tmpRoot, "research", true);
  });

  after(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it("returns {ok:false} for invalid phase 'triaged'", (t) => {
    if (!fs.existsSync(PROJECT_TRANSITIONS_YAML)) {
      t.skip("transitions.yaml not found");
      return;
    }
    const result = writeState(pipelineDir, "triaged", {}, { command: "test" });
    assert.equal(result.ok, false, "expected ok:false for unknown phase 'triaged'");
    assert.ok(/Unknown phase/i.test(result.error), `error must mention 'Unknown phase'; got: ${result.error}`);
    assert.ok(result.error.includes("triaged"), "error must include the rejected phase value");
  });

  it("error lists valid canonical phases", (t) => {
    if (!fs.existsSync(PROJECT_TRANSITIONS_YAML)) {
      t.skip("transitions.yaml not found");
      return;
    }
    const result = writeState(pipelineDir, "nonexistent-phase", {}, { command: "test" });
    assert.equal(result.ok, false);
    // Spot-check that the error advertises the canonical phase set
    assert.ok(result.error.includes("triaging"), "error must list 'triaging' as a valid phase");
    assert.ok(result.error.includes("architecture"), "error must list 'architecture' as a valid phase");
  });

  it("state.yaml unchanged after rejected write", () => {
    const statePath = path.join(pipelineDir, STATE_FILE);
    const state = yaml.load(fs.readFileSync(statePath, "utf8"));
    assert.equal(state.pipeline.phase, "research", "phase must remain 'research' — rejected write must not mutate state");
  });
});

// ---------------------------------------------------------------------------
// Test 4 — validateManifest: incomplete perspectives returns {ok:false}
// ---------------------------------------------------------------------------

describe("validateManifest — incomplete perspectives_completed returns {ok:false}", () => {
  let tmpDir;
  let artifactPath;

  const PERSPECTIVES_REQUIRED = 4;
  const PERSPECTIVES_COMPLETED = 2;

  before(() => {
    tmpDir = makeTmpDir("t4");
    artifactPath = path.join(tmpDir, "RESEARCH.md");

    const frontmatter = yaml.dump({
      perspectives_required: PERSPECTIVES_REQUIRED,
      perspectives_completed: PERSPECTIVES_COMPLETED,
    });
    // Write a valid markdown file with YAML frontmatter
    fs.writeFileSync(
      artifactPath,
      `---\n${frontmatter}---\n\n# Research\n\nContent here.\n`,
      "utf8"
    );
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("returns {ok:false} when perspectives_completed < perspectives_required", () => {
    const result = validateManifest(artifactPath);
    assert.equal(result.ok, false, "expected ok:false for incomplete perspectives");
    assert.ok(typeof result.error === "string" && result.error.length > 0, "error message must be present");
  });
});

// ---------------------------------------------------------------------------
// Test 5 — validateManifest: matching counts returns {ok:true}
// ---------------------------------------------------------------------------

describe("validateManifest — matching perspectives counts returns {ok:true}", () => {
  let tmpDir;
  let artifactPath;

  const PERSPECTIVES_REQUIRED = 3;
  const PERSPECTIVES_COMPLETED = 3;

  before(() => {
    tmpDir = makeTmpDir("t5");
    artifactPath = path.join(tmpDir, "RESEARCH.md");

    const frontmatter = yaml.dump({
      perspectives_required: PERSPECTIVES_REQUIRED,
      perspectives_completed: PERSPECTIVES_COMPLETED,
    });
    fs.writeFileSync(
      artifactPath,
      `---\n${frontmatter}---\n\n# Research\n\nContent here.\n`,
      "utf8"
    );
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("returns {ok:true} when perspectives_completed === perspectives_required", () => {
    const result = validateManifest(artifactPath);
    assert.equal(result.ok, true, "expected ok:true when perspectives counts match");
  });
});
