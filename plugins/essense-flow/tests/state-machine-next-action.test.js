"use strict";

/**
 * Tests for writeState's next_action auto-update (I-05).
 *
 * Before this contract, finalize* helpers transitioned phase atomically but
 * left state.next_action pointing at the OLD phase's command. /status,
 * context-inject auto-advance hint, and next-runner fallback all surface that
 * stale value. writeState now pins next_action to the target phase's
 * canonical command (from references/phase-command-map.yaml or the inline
 * fallback) on every transition.
 */

const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const yaml = require("js-yaml");

const stateMachine = require("../lib/state-machine");
const { STATE_FILE } = require("../lib/constants");

const PROJECT_TRANSITIONS_YAML = path.join(__dirname, "..", "references", "transitions.yaml");
const PROJECT_PHASE_COMMAND_MAP = path.join(__dirname, "..", "references", "phase-command-map.yaml");

function makeProject(initialPhase, extraState = {}) {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ef-na-"));
  const pipelineDir = path.join(tmpRoot, ".pipeline");
  fs.mkdirSync(pipelineDir, { recursive: true });

  const state = {
    schema_version: 1,
    pipeline: { phase: initialPhase, sprint: null },
    sprints: {},
    blocked_on: null,
    session: {},
    ...extraState,
  };
  fs.writeFileSync(path.join(pipelineDir, STATE_FILE), yaml.dump(state), "utf8");

  // Mirror references/ alongside the temp project so state-machine can resolve
  // transitions.yaml + phase-command-map.yaml.
  const refsDir = path.join(tmpRoot, "references");
  fs.mkdirSync(refsDir, { recursive: true });
  fs.copyFileSync(PROJECT_TRANSITIONS_YAML, path.join(refsDir, "transitions.yaml"));
  fs.copyFileSync(PROJECT_PHASE_COMMAND_MAP, path.join(refsDir, "phase-command-map.yaml"));

  return { tmpRoot, pipelineDir };
}

function readState(pipelineDir) {
  return yaml.load(fs.readFileSync(path.join(pipelineDir, STATE_FILE), "utf8"));
}

describe("writeState — next_action auto-update", () => {
  it("transition triaging → verifying sets next_action = /verify", () => {
    const { tmpRoot, pipelineDir } = makeProject("triaging", { next_action: "/triage" });
    try {
      const r = stateMachine.writeState(pipelineDir, "verifying", {}, {
        command: "/triage", trigger: "test",
      });
      assert.equal(r.ok, true);
      const state = readState(pipelineDir);
      assert.equal(state.pipeline.phase, "verifying");
      assert.equal(state.next_action, "/verify");
    } finally {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
  });

  it("transition sprinting → sprint-complete sets next_action = /review", () => {
    const { tmpRoot, pipelineDir } = makeProject("sprinting", { next_action: "/build" });
    try {
      const r = stateMachine.writeState(pipelineDir, "sprint-complete", {}, {
        command: "/build", trigger: "test",
      });
      assert.equal(r.ok, true);
      const state = readState(pipelineDir);
      assert.equal(state.next_action, "/review");
    } finally {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
  });

  it("transition reviewing → triaging sets next_action = /triage", () => {
    const { tmpRoot, pipelineDir } = makeProject("reviewing", { next_action: "/review" });
    try {
      const r = stateMachine.writeState(pipelineDir, "triaging", {}, {
        command: "/review", trigger: "test",
      });
      assert.equal(r.ok, true);
      const state = readState(pipelineDir);
      assert.equal(state.next_action, "/triage");
    } finally {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
  });

  it("transition idle → eliciting sets next_action = /elicit", () => {
    const { tmpRoot, pipelineDir } = makeProject("idle", { next_action: "" });
    try {
      const r = stateMachine.writeState(pipelineDir, "eliciting", {}, {
        command: "/elicit", trigger: "test",
      });
      assert.equal(r.ok, true);
      const state = readState(pipelineDir);
      assert.equal(state.next_action, "/elicit");
    } finally {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
  });

  it("transition verifying → complete sets next_action = /status", () => {
    const { tmpRoot, pipelineDir } = makeProject("verifying", { next_action: "/verify" });
    try {
      const r = stateMachine.writeState(pipelineDir, "complete", {}, {
        command: "/verify", trigger: "test",
      });
      assert.equal(r.ok, true);
      const state = readState(pipelineDir);
      assert.equal(state.next_action, "/status");
    } finally {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
  });

  it("caller-supplied stateUpdates.next_action overrides computed", () => {
    // Caller knows best — explicit override wins over the auto-pin.
    const { tmpRoot, pipelineDir } = makeProject("triaging");
    try {
      const r = stateMachine.writeState(pipelineDir, "verifying", {
        next_action: "/custom-action",
      }, { command: "/triage", trigger: "test" });
      assert.equal(r.ok, true);
      const state = readState(pipelineDir);
      assert.equal(state.next_action, "/custom-action");
    } finally {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
  });

  it("regression: stale next_action is overwritten on transition", () => {
    // Pre-fix bug: phase=verifying but next_action=/triage (left from triaging
    // → verifying transition that never updated next_action). Post-fix:
    // next_action MUST match new phase's canonical command.
    const { tmpRoot, pipelineDir } = makeProject("triaging", {
      next_action: "/triage",  // stale (from prior triaging entry)
    });
    try {
      const r = stateMachine.writeState(pipelineDir, "verifying", {}, {
        command: "/triage", trigger: "finalize-triage",
      });
      assert.equal(r.ok, true);
      const state = readState(pipelineDir);
      // Bug: would still say /triage. Fix: must say /verify.
      assert.notEqual(state.next_action, "/triage");
      assert.equal(state.next_action, "/verify");
    } finally {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
  });
});
