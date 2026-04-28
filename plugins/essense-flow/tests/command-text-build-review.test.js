"use strict";

/**
 * Static-text tests on commands/build.md and commands/review.md.
 *
 * The orchestrator-instruction text is load-bearing — orchestrators read
 * these markdowns to decide which functions to call. Drift in the text
 * (removed MANDATORY language, removed forbid-list, removed Agent-dispatch
 * contract) reintroduces bugs that the runtime guards alone cannot catch.
 *
 * Pairs with the runtime gates (enterReview readiness check, completeSprintExecution
 * disk validation) — runtime catches the bypass at execution time, text contract
 * prevents the orchestrator from forming the bypass intent in the first place.
 */

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const BUILD_MD = fs.readFileSync(path.join(__dirname, "..", "commands", "build.md"), "utf8");
const REVIEW_MD = fs.readFileSync(path.join(__dirname, "..", "commands", "review.md"), "utf8");

// ── commands/build.md (I-10b) ─────────────────────────────────────────────

describe("commands/build.md — MANDATORY-call language for recordCompletion + completeSprintExecution", () => {
  it("declares recordCompletion MANDATORY single call per task", () => {
    assert.match(BUILD_MD, /recordCompletion[^]*MANDATORY single call PER TASK/);
  });

  it("declares completeSprintExecution MANDATORY single call", () => {
    assert.match(BUILD_MD, /completeSprintExecution[^]*MANDATORY single call/);
  });

  it("forbids direct state-machine.writeState bypass", () => {
    assert.match(BUILD_MD, /Do NOT call `lib\/state-machine\.writeState` directly/);
  });

  it("forbids writing SPRINT-REPORT.md (or other top-level summary)", () => {
    assert.match(BUILD_MD, /Do NOT write `SPRINT-REPORT\.md`/);
  });

  it("names completion-report.md as the canonical output", () => {
    assert.match(BUILD_MD, /canonical output is `completion-report\.md`/);
  });

  it("names per-task records under sprints/sprint-N/completion/", () => {
    assert.match(BUILD_MD, /sprints\/sprint-N\/completion\/\*\.completion\.yaml/);
  });
});

// ── commands/review.md ────────────────────────────────────────────────────

describe("commands/review.md — atomic enterReview contract", () => {
  it("declares enterReview MANDATORY single call", () => {
    assert.match(REVIEW_MD, /enterReview[^]*MANDATORY single call/);
  });
});
