"use strict";

const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const fs = require("fs");
const os = require("os");

const runner = require("../skills/elicit/scripts/elicit-runner");

function makePipeline() {
  const dir = path.join(os.tmpdir(), `elicit-write-spec-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  fs.mkdirSync(path.join(dir, "elicitation"), { recursive: true });
  return dir;
}

function specPath(pipelineDir) {
  return path.join(pipelineDir, "elicitation", "SPEC.md");
}

// ---------------------------------------------------------------------------
// Fresh write — no existing SPEC.md
// ---------------------------------------------------------------------------

describe("writeSpec — fresh write", () => {
  let pipelineDir;
  before(() => { pipelineDir = makePipeline(); });
  after(() => { fs.rmSync(pipelineDir, { recursive: true, force: true }); });

  it("writes content when no SPEC.md exists", () => {
    const result = runner.writeSpec(pipelineDir, "# My Spec\n\nContent here.");
    assert.equal(result.ok, true);
    assert.equal(result.isAddendum, false);
    const written = fs.readFileSync(specPath(pipelineDir), "utf8");
    assert.ok(written.includes("# My Spec"));
    assert.ok(!written.includes("## Addendum"));
  });
});

// ---------------------------------------------------------------------------
// Addendum — existing SPEC.md present, no restart flag
// ---------------------------------------------------------------------------

describe("writeSpec — appends addendum when SPEC.md exists", () => {
  let pipelineDir;
  before(() => {
    pipelineDir = makePipeline();
    fs.writeFileSync(specPath(pipelineDir), "# Original Spec\n\nOriginal content.", "utf8");
  });
  after(() => { fs.rmSync(pipelineDir, { recursive: true, force: true }); });

  it("appends a dated addendum section without overwriting original", () => {
    const result = runner.writeSpec(pipelineDir, "New change request content.");
    assert.equal(result.ok, true);
    assert.equal(result.isAddendum, true);

    const written = fs.readFileSync(specPath(pipelineDir), "utf8");
    assert.ok(written.includes("# Original Spec"), "original content must be preserved");
    assert.ok(written.includes("## Addendum —"), "addendum heading must be present");
    assert.ok(written.includes("New change request content."), "new content must be appended");
    // Original must come before addendum
    assert.ok(written.indexOf("# Original Spec") < written.indexOf("## Addendum —"));
  });

  it("addendum heading contains today's date", () => {
    const written = fs.readFileSync(specPath(pipelineDir), "utf8");
    const today = new Date().toISOString().slice(0, 10);
    assert.ok(written.includes(today), `addendum heading must contain ${today}`);
  });
});

// ---------------------------------------------------------------------------
// Restart flag — existing SPEC.md present but restart=true overwrites
// ---------------------------------------------------------------------------

describe("writeSpec — restart flag overwrites existing SPEC.md", () => {
  let pipelineDir;
  before(() => {
    pipelineDir = makePipeline();
    fs.writeFileSync(specPath(pipelineDir), "# Original Spec\n\nOriginal content.", "utf8");
  });
  after(() => { fs.rmSync(pipelineDir, { recursive: true, force: true }); });

  it("overwrites when options.restart is true", () => {
    const result = runner.writeSpec(pipelineDir, "# Fresh Start\n\nNew content.", { restart: true });
    assert.equal(result.ok, true);
    assert.equal(result.isAddendum, false);

    const written = fs.readFileSync(specPath(pipelineDir), "utf8");
    assert.ok(!written.includes("# Original Spec"), "original content must be gone");
    assert.ok(written.includes("# Fresh Start"), "new content must be written");
    assert.ok(!written.includes("## Addendum"), "no addendum heading when restart");
  });
});

// ---------------------------------------------------------------------------
// Error — empty content
// ---------------------------------------------------------------------------

describe("writeSpec — rejects empty content", () => {
  let pipelineDir;
  before(() => { pipelineDir = makePipeline(); });
  after(() => { fs.rmSync(pipelineDir, { recursive: true, force: true }); });

  it("returns ok:false for empty string", () => {
    const result = runner.writeSpec(pipelineDir, "");
    assert.equal(result.ok, false);
    assert.ok(result.error);
  });

  it("returns ok:false for whitespace-only string", () => {
    const result = runner.writeSpec(pipelineDir, "   \n  ");
    assert.equal(result.ok, false);
  });
});
