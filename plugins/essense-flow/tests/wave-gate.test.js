"use strict";

/**
 * Tests for build-runner.runWaveGate — the inter-wave test gate that gates
 * progress between waves in a single /build invocation.
 *
 * Strategy: create a temp project root with a package.json whose test/lint
 * scripts are real shell commands controllable via env or filename. Then
 * invoke runWaveGate against that root and assert the shape of the returned
 * envelope ({ ok, blockedOn, failures, ... }).
 */

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { runWaveGate } = require("../skills/build/scripts/build-runner");

function makeProjectWithScripts(testCmd, lintCmd) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "wave-gate-"));
  const pkg = { name: "wave-gate-fixture", version: "0.0.0", scripts: {} };
  if (testCmd !== null) pkg.scripts.test = testCmd;
  if (lintCmd !== null) pkg.scripts.lint = lintCmd;
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify(pkg, null, 2));
  return root;
}

test("runWaveGate: passing tests + lint → ok:true, gateRan:true, no blocker", () => {
  // Use cross-platform no-op commands. `node -e "process.exit(0)"` is portable.
  const root = makeProjectWithScripts(
    'node -e "process.exit(0)"',
    'node -e "process.exit(0)"'
  );
  try {
    const r = runWaveGate(root, 0);
    assert.equal(r.ok, true, "expected ok:true on passing gate");
    assert.equal(r.gateRan, true, "expected gateRan:true when scripts execute");
    assert.equal(r.skipped, false);
    assert.equal(r.waveIndex, 0);
    assert.ok(!r.blockedOn, "no blockedOn when gate passes");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("runWaveGate: failing test → ok:false, blockedOn carries wave index + failure summary", () => {
  const root = makeProjectWithScripts(
    'node -e "process.exit(1)"',
    'node -e "process.exit(0)"'
  );
  try {
    const r = runWaveGate(root, 2);
    assert.equal(r.ok, false, "expected ok:false on failing gate");
    assert.equal(r.gateRan, true);
    assert.equal(r.waveIndex, 2);
    assert.ok(Array.isArray(r.failures), "failures must be an array");
    assert.ok(r.failures.length >= 1, "expected at least one recorded failure");
    assert.equal(typeof r.blockedOn, "string");
    assert.match(r.blockedOn, /wave-2 test gate failed/, `blockedOn must cite wave index; got: ${r.blockedOn}`);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("runWaveGate: no test/lint scripts → ok:true, skipped:true, gateRan:false", () => {
  const root = makeProjectWithScripts(null, null);
  try {
    const r = runWaveGate(root, 0);
    assert.equal(r.ok, true, "fully-skipped gate must pass");
    assert.equal(r.skipped, true, "skipped flag must be true when no scripts present");
    assert.equal(r.gateRan, false);
    assert.ok(Array.isArray(r.skipReasons));
    assert.ok(r.skipReasons.length >= 2, `expected ≥2 skip reasons (test+lint missing); got ${JSON.stringify(r.skipReasons)}`);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("runWaveGate: only test script (no lint) → ok depends on test result, lint skip recorded", () => {
  const root = makeProjectWithScripts('node -e "process.exit(0)"', null);
  try {
    const r = runWaveGate(root, 1);
    assert.equal(r.ok, true);
    // Partially-skipped — test ran (not fully skipped) but lint did not.
    assert.equal(r.skipped, false, "partial skip should not set skipped:true");
    assert.equal(r.gateRan, true);
    assert.ok(r.skipReasons.some((s) => /lint/i.test(s)), `lint skip reason expected; got: ${JSON.stringify(r.skipReasons)}`);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("runWaveGate: blockedOn string format suitable for state.blocked_on", () => {
  // Verifies the contract that the workflow can write blockedOn directly into
  // state.yaml without further formatting.
  const root = makeProjectWithScripts('node -e "process.exit(2)"', null);
  try {
    const r = runWaveGate(root, 5);
    assert.equal(r.ok, false);
    assert.equal(typeof r.blockedOn, "string");
    assert.ok(r.blockedOn.length > 0 && r.blockedOn.length < 200, "blockedOn should be a single-line summary");
    assert.ok(!r.blockedOn.includes("\n"), "blockedOn must be single-line");
    assert.match(r.blockedOn, /wave-5/, "must include wave index");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
