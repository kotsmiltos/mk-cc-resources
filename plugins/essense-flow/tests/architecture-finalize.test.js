"use strict";

/**
 * Tests for architect-runner.finalizeArchitecture — atomic post-architecture
 * hand-off.
 *
 * Background: the lightweight /architect flow in commands/architect.md
 * previously ran writeArchitectureArtifacts → writeTaskSpecs → manual
 * phase transition as three separate steps. The orchestrator could stop
 * between any pair, leaving phase=architecture with ARCH.md (and possibly
 * task specs) present but state never advanced. Autopilot would then
 * either loop /architect or stall (commands/architect.md treats phase=
 * architecture as a no-op "report current phase" branch). Same B2 family
 * of failure that affected /review, /triage, /research, /build, /verify.
 *
 * finalizeArchitecture handles both architecture exits:
 *   - route="sprinting"  : lightweight flow — ARCH + task specs + transition
 *   - route="decomposing": heavyweight flow — prelim ARCH + transition
 */

const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const yaml = require("js-yaml");

const {
  finalizeArchitecture,
  VALID_ARCHITECTURE_ROUTES,
} = require("../skills/architect/scripts/architect-runner");
const { STATE_FILE, STATE_HISTORY_FILE } = require("../lib/constants");

const PROJECT_TRANSITIONS_YAML = path.join(__dirname, "..", "references", "transitions.yaml");

function makeProject(initialPhase, sprintNumber) {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ef-finalize-arch-"));
  const pipelineDir = path.join(tmpRoot, ".pipeline");
  fs.mkdirSync(pipelineDir, { recursive: true });

  const state = {
    schema_version: 1,
    pipeline: { phase: initialPhase, sprint: sprintNumber, wave: null, task_in_progress: null },
    sprints: {},
    blocked_on: null,
    session: {},
  };
  fs.writeFileSync(path.join(pipelineDir, STATE_FILE), yaml.dump(state), "utf8");

  const refsDir = path.join(tmpRoot, "references");
  fs.mkdirSync(refsDir, { recursive: true });
  fs.copyFileSync(PROJECT_TRANSITIONS_YAML, path.join(refsDir, "transitions.yaml"));

  return { tmpRoot, pipelineDir };
}

const fakeSpecs = [
  { id: "TASK-001", md: "# TASK-001\n", agentMd: "# TASK-001 (agent)\n" },
  { id: "TASK-002", md: "# TASK-002\n", agentMd: "# TASK-002 (agent)\n" },
];

const FAKE_ARCH = "# Architecture Document\n\nschema_version: 1\n";
const FAKE_SYNTH = "# Synthesis\n";

describe("finalizeArchitecture — route=sprinting (lightweight flow)", () => {
  let tmpRoot, pipelineDir;

  before(() => {
    ({ tmpRoot, pipelineDir } = makeProject("architecture", 1));
  });

  after(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it("returns ok:true and transitions architecture → sprinting atomically", () => {
    const result = finalizeArchitecture(
      pipelineDir, FAKE_ARCH, FAKE_SYNTH, "sprinting",
      { sprintNumber: 1, specs: fakeSpecs },
    );
    assert.equal(result.ok, true, `expected ok:true, got: ${JSON.stringify(result)}`);
    assert.equal(result.transitioned, true);
    assert.equal(result.targetPhase, "sprinting");
    assert.ok(result.archPath.endsWith("ARCH.md"));
    assert.ok(result.sprintDir.endsWith(path.join("sprint-1", "tasks")));
  });

  it("ARCH.md and synthesis.md were written under .pipeline/architecture/", () => {
    const archDir = path.join(pipelineDir, "architecture");
    assert.ok(fs.existsSync(path.join(archDir, "ARCH.md")));
    assert.ok(fs.existsSync(path.join(archDir, "synthesis.md")));
  });

  it("task specs (.md and .agent.md pairs) were written for each spec", () => {
    const sprintDir = path.join(pipelineDir, "sprints", "sprint-1", "tasks");
    for (const s of fakeSpecs) {
      assert.ok(fs.existsSync(path.join(sprintDir, `${s.id}.md`)));
      assert.ok(fs.existsSync(path.join(sprintDir, `${s.id}.agent.md`)));
    }
  });

  it("state.yaml phase is now 'sprinting'", () => {
    const state = yaml.load(fs.readFileSync(path.join(pipelineDir, STATE_FILE), "utf8"));
    assert.equal(state.pipeline.phase, "sprinting");
  });

  it("state-history.yaml records architecture → sprinting with ARCH artifact", () => {
    const histPath = path.join(pipelineDir, STATE_HISTORY_FILE);
    assert.ok(fs.existsSync(histPath));
    const hist = yaml.load(fs.readFileSync(histPath, "utf8"));
    const last = hist.entries[hist.entries.length - 1];
    assert.equal(last.from_state, "architecture");
    assert.equal(last.to_state, "sprinting");
    assert.match(last.triggering_artifact || "", /ARCH\.md/);
  });
});

describe("finalizeArchitecture — route=decomposing (heavyweight flow)", () => {
  let tmpRoot, pipelineDir;

  before(() => {
    ({ tmpRoot, pipelineDir } = makeProject("architecture", 2));
  });

  after(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it("returns ok:true and transitions architecture → decomposing atomically", () => {
    const result = finalizeArchitecture(pipelineDir, FAKE_ARCH, FAKE_SYNTH, "decomposing");
    assert.equal(result.ok, true, `expected ok:true, got: ${JSON.stringify(result)}`);
    assert.equal(result.transitioned, true);
    assert.equal(result.targetPhase, "decomposing");
    assert.ok(result.archPath.endsWith("ARCH.md"));
    assert.equal(result.sprintDir, undefined, "no sprint dir for decomposing route");
  });

  it("prelim ARCH.md was written under .pipeline/architecture/", () => {
    const archDir = path.join(pipelineDir, "architecture");
    assert.ok(fs.existsSync(path.join(archDir, "ARCH.md")));
    assert.ok(fs.existsSync(path.join(archDir, "synthesis.md")));
  });

  it("NO task specs written for decomposing route", () => {
    const sprintDir = path.join(pipelineDir, "sprints", "sprint-2", "tasks");
    assert.equal(
      fs.existsSync(sprintDir),
      false,
      "task specs are only written by finalizeDecompose, not finalizeArchitecture(decomposing)",
    );
  });

  it("state.yaml phase is now 'decomposing'", () => {
    const state = yaml.load(fs.readFileSync(path.join(pipelineDir, STATE_FILE), "utf8"));
    assert.equal(state.pipeline.phase, "decomposing");
  });

  it("state-history.yaml records architecture → decomposing", () => {
    const histPath = path.join(pipelineDir, STATE_HISTORY_FILE);
    const hist = yaml.load(fs.readFileSync(histPath, "utf8"));
    const last = hist.entries[hist.entries.length - 1];
    assert.equal(last.from_state, "architecture");
    assert.equal(last.to_state, "decomposing");
  });
});

describe("finalizeArchitecture — invalid route rejected", () => {
  let tmpRoot, pipelineDir;

  before(() => {
    ({ tmpRoot, pipelineDir } = makeProject("architecture", 3));
  });

  after(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it("returns ok:false when route is not in VALID_ARCHITECTURE_ROUTES", () => {
    const result = finalizeArchitecture(
      pipelineDir, FAKE_ARCH, FAKE_SYNTH, "verifying",
      { sprintNumber: 3, specs: fakeSpecs },
    );
    assert.equal(result.ok, false);
    assert.equal(result.transitioned, false);
    assert.match(result.error, /invalid route/);
  });

  it("does not write any artifacts when route is invalid (early reject)", () => {
    const archDir = path.join(pipelineDir, "architecture");
    const sprintDir = path.join(pipelineDir, "sprints", "sprint-3", "tasks");
    assert.equal(fs.existsSync(archDir), false, "no architecture dir on invalid-route reject");
    assert.equal(fs.existsSync(sprintDir), false, "no sprint dir on invalid-route reject");
  });

  it("state.yaml phase remains 'architecture' on invalid route", () => {
    const state = yaml.load(fs.readFileSync(path.join(pipelineDir, STATE_FILE), "utf8"));
    assert.equal(state.pipeline.phase, "architecture");
  });
});

describe("finalizeArchitecture — sprintMeta validation for sprinting route", () => {
  let tmpRoot, pipelineDir;

  before(() => {
    ({ tmpRoot, pipelineDir } = makeProject("architecture", 4));
  });

  after(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it("returns ok:false when route=sprinting and sprintMeta is missing", () => {
    const result = finalizeArchitecture(pipelineDir, FAKE_ARCH, FAKE_SYNTH, "sprinting");
    assert.equal(result.ok, false);
    assert.match(result.error, /sprintMeta/);
  });

  it("returns ok:false when sprintMeta lacks specs array", () => {
    const result = finalizeArchitecture(
      pipelineDir, FAKE_ARCH, FAKE_SYNTH, "sprinting",
      { sprintNumber: 4 },
    );
    assert.equal(result.ok, false);
    assert.match(result.error, /sprintMeta/);
  });

  it("returns ok:false when sprintMeta.sprintNumber is not a number", () => {
    const result = finalizeArchitecture(
      pipelineDir, FAKE_ARCH, FAKE_SYNTH, "sprinting",
      { sprintNumber: "1", specs: fakeSpecs },
    );
    assert.equal(result.ok, false);
    assert.match(result.error, /sprintMeta/);
  });
});

describe("finalizeArchitecture — archDoc required", () => {
  let tmpRoot, pipelineDir;

  before(() => {
    ({ tmpRoot, pipelineDir } = makeProject("architecture", 5));
  });

  after(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it("returns ok:false when archDoc is missing", () => {
    const result = finalizeArchitecture(pipelineDir, null, FAKE_SYNTH, "decomposing");
    assert.equal(result.ok, false);
    assert.match(result.error, /archDoc/);
  });

  it("returns ok:false when archDoc is not a string", () => {
    const result = finalizeArchitecture(pipelineDir, 12345, FAKE_SYNTH, "decomposing");
    assert.equal(result.ok, false);
    assert.match(result.error, /archDoc/);
  });
});

describe("finalizeArchitecture — phase guard", () => {
  let tmpRoot, pipelineDir;

  before(() => {
    // Wrong starting phase — finalizeArchitecture should reject the transition
    ({ tmpRoot, pipelineDir } = makeProject("sprinting", 6));
  });

  after(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it("returns ok:false when starting phase is not 'architecture'", () => {
    const result = finalizeArchitecture(
      pipelineDir, FAKE_ARCH, FAKE_SYNTH, "sprinting",
      { sprintNumber: 6, specs: fakeSpecs },
    );
    assert.equal(result.ok, false);
    assert.equal(result.transitioned, false);
    assert.ok(typeof result.error === "string" && result.error.length > 0);
  });

  it("ARCH.md is still written even when transition fails (preserves work)", () => {
    const archPath = path.join(pipelineDir, "architecture", "ARCH.md");
    assert.ok(fs.existsSync(archPath), "ARCH.md preserved on transition failure");
  });

  it("task specs are still written even when transition fails (preserves work)", () => {
    const sprintDir = path.join(pipelineDir, "sprints", "sprint-6", "tasks");
    assert.ok(fs.existsSync(path.join(sprintDir, "TASK-001.md")));
  });

  it("state.yaml phase remains unchanged on transition failure", () => {
    const state = yaml.load(fs.readFileSync(path.join(pipelineDir, STATE_FILE), "utf8"));
    assert.equal(state.pipeline.phase, "sprinting");
  });
});

describe("finalizeArchitecture — exports VALID_ARCHITECTURE_ROUTES", () => {
  it("exports the expected route set", () => {
    assert.deepEqual(
      [...VALID_ARCHITECTURE_ROUTES].sort(),
      ["decomposing", "sprinting"],
    );
  });
});
