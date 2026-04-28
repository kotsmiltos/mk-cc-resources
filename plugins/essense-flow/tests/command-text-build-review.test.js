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

// ── commands/review.md (I-12) ─────────────────────────────────────────────

describe("commands/review.md — subagent-dispatch contract for post-enterReview JS", () => {
  it("declares enterReview MANDATORY single call (existing — pin)", () => {
    assert.match(REVIEW_MD, /enterReview[^]*MANDATORY single call/);
  });

  it("instructs Agent-tool dispatch for post-enterReview JS calls", () => {
    // After enterReview transitions phase=reviewing, review-guard hook
    // restricts Bash to a safe-list (cat, ls, grep, ...) which excludes
    // node. Subagents bypass the hook (CLAUDE_SUBAGENT=1 env). The
    // markdown must make this contract explicit so orchestrators don't
    // try `node -e` from main session, hit the block, and improvise.
    assert.match(
      REVIEW_MD,
      /(Agent tool|Agent dispatch|subagent dispatch)[^]*post-enterReview/i,
      "review.md must instruct Agent-tool dispatch for post-enterReview JS calls"
    );
  });

  it("warns that main-session node -e is hook-blocked during reviewing", () => {
    assert.match(
      REVIEW_MD,
      /(main-session|main session)[^]*(node -e|hook-blocked|review-guard)/i,
      "review.md must warn that main-session node -e is blocked by review-guard"
    );
  });
});
