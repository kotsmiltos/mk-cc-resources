"use strict";

const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const fs = require("fs");
const os = require("os");
const yaml = require("js-yaml");
const yamlIO = require("../lib/yaml-io");

// Each describe block creates its own isolated tmp dir so tests don't interfere.

// ---------------------------------------------------------------------------
// Test 1 — Basic write creates .bak
// ---------------------------------------------------------------------------

describe("safeWrite — .bak created on second write", () => {
  const tmpDir = path.join(os.tmpdir(), `atomic-write-t1-${Date.now()}`);
  const filePath = path.join(tmpDir, "state.yml");

  before(() => {
    fs.mkdirSync(tmpDir, { recursive: true });
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("creates a .bak file containing the first write's content after a second write", () => {
    const firstData = { version: 1, label: "first" };
    const secondData = { version: 2, label: "second" };

    // First write — no .bak expected yet
    yamlIO.safeWrite(filePath, firstData);

    // Second write — should produce filePath + ".bak" with firstData
    yamlIO.safeWrite(filePath, secondData);

    const bakPath = filePath + ".bak";
    assert.ok(fs.existsSync(bakPath), ".bak file must exist after second write");

    const bakContent = yaml.load(fs.readFileSync(bakPath, "utf8"));
    assert.deepEqual(bakContent, firstData, ".bak must contain the first write's data");
  });
});

// ---------------------------------------------------------------------------
// Test 2 — No .bak on first write
// ---------------------------------------------------------------------------

describe("safeWrite — no .bak on first write", () => {
  const tmpDir = path.join(os.tmpdir(), `atomic-write-t2-${Date.now()}`);
  const filePath = path.join(tmpDir, "state.yml");

  before(() => {
    fs.mkdirSync(tmpDir, { recursive: true });
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("does not create a .bak file when the target file did not previously exist", () => {
    yamlIO.safeWrite(filePath, { version: 1 });

    assert.ok(!fs.existsSync(filePath + ".bak"), ".bak must NOT exist after first-ever write");
  });
});

// ---------------------------------------------------------------------------
// Test 3 — Atomicity: monkey-patch renameSync, file must remain valid YAML
// ---------------------------------------------------------------------------

describe("safeWrite — atomicity under renameSync failure (100 iterations)", () => {
  const tmpDir = path.join(os.tmpdir(), `atomic-write-t3-${Date.now()}`);
  const filePath = path.join(tmpDir, "state.yml");

  const ITERATIONS = 100;
  const VALID_DATA = { version: 0, status: "ok" };

  before(() => {
    fs.mkdirSync(tmpDir, { recursive: true });
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("file remains parseable valid YAML when renameSync is patched to throw", () => {
    // Write the known-valid baseline before any monkey-patching
    yamlIO.safeWrite(filePath, VALID_DATA);

    // fs module is shared via require cache — patching here affects yaml-io internals
    const originalRename = fs.renameSync.bind(fs);

    for (let i = 0; i < ITERATIONS; i++) {
      // Patch: make renameSync throw to simulate a mid-write failure
      fs.renameSync = () => { throw new Error("simulated rename failure"); };

      try {
        yamlIO.safeWrite(filePath, { version: i + 1, status: "new" });
      } catch (_e) {
        // Expected — the patched rename throws; safeWrite does not swallow it
      } finally {
        // Always restore before asserting, so subsequent iterations start clean
        fs.renameSync = originalRename;
      }

      // The main file must still be parseable (either the original valid data
      // or a successfully committed write if restore happened before rename)
      assert.ok(
        fs.existsSync(filePath),
        `iteration ${i}: target file must still exist`
      );

      const raw = fs.readFileSync(filePath, "utf8");
      assert.ok(raw.length > 0, `iteration ${i}: file must not be zero-byte`);

      // yaml.load throws on corrupt YAML — that would fail the assertion
      const parsed = yaml.load(raw);
      assert.ok(
        parsed !== null && typeof parsed === "object",
        `iteration ${i}: file must parse as a non-null YAML object`
      );
    }
  });
});

// ---------------------------------------------------------------------------
// Test 4 — Migrator callback is called and can transform data
// ---------------------------------------------------------------------------

describe("safeReadWithFallback — migrator callback", () => {
  const tmpDir = path.join(os.tmpdir(), `atomic-write-t4-${Date.now()}`);
  const filePath = path.join(tmpDir, "state.yml");

  before(() => {
    fs.mkdirSync(tmpDir, { recursive: true });
    // Write a simple file so safeReadWithFallback reads real data
    yamlIO.safeWrite(filePath, { version: 1 });
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("applies the migrator and returns transformed data", () => {
    const result = yamlIO.safeReadWithFallback(
      filePath,
      {},
      (data) => ({ ...data, migrated: true })
    );

    assert.equal(result.migrated, true, "result must have migrated: true from the migrator");
  });
});

// ---------------------------------------------------------------------------
// Test 5 — Migrator that throws does not crash; returns original data
// ---------------------------------------------------------------------------

describe("safeReadWithFallback — migrator that throws is safe", () => {
  const tmpDir = path.join(os.tmpdir(), `atomic-write-t5-${Date.now()}`);
  const filePath = path.join(tmpDir, "state.yml");
  const ORIGINAL_DATA = { version: 1, label: "original" };

  before(() => {
    fs.mkdirSync(tmpDir, { recursive: true });
    yamlIO.safeWrite(filePath, ORIGINAL_DATA);
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("returns original parsed data when the migrator throws, not undefined or null", () => {
    const result = yamlIO.safeReadWithFallback(
      filePath,
      {},
      () => { throw new Error("oops"); }
    );

    assert.ok(result !== undefined, "result must not be undefined");
    assert.ok(result !== null, "result must not be null");
    assert.deepEqual(result, ORIGINAL_DATA, "result must equal the original file data");
  });
});

// ---------------------------------------------------------------------------
// Test 6 — safeWrite EPERM fallback: file written via copy, no .tmp orphan
// ---------------------------------------------------------------------------
// (legacy name — now verifies the write-from-memory path introduced in FIX-043)

describe("safeWrite — EPERM fallback writes via copy, no .tmp orphan", () => {
  let tmpDir;
  let filePath;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ef-fix9e-"));
    filePath = path.join(tmpDir, "test.yaml");
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("safeWrite EPERM fallback — file written via copy, no .tmp orphan", () => {
    const origRename = fs.renameSync;
    let callCount = 0;

    // Patch renameSync to throw EPERM on the first call only, simulating a
    // Windows open-handle conflict. Subsequent calls (e.g. from .bak rename)
    // use the real implementation.
    fs.renameSync = (src, dst) => {
      callCount++;
      if (callCount === 1) {
        const e = new Error("EPERM");
        e.code = "EPERM";
        throw e;
      }
      origRename(src, dst);
    };

    try {
      yamlIO.safeWrite(filePath, { key: "value" });

      const result = yamlIO.safeRead(filePath);
      assert.deepEqual(result, { key: "value" }, "file content must match written data");

      // No .tmp file should remain after EPERM fallback cleanup
      const tmpFiles = fs.readdirSync(tmpDir).filter((f) => f.endsWith(".tmp"));
      assert.equal(tmpFiles.length, 0, "no .tmp orphan files should remain");
    } finally {
      fs.renameSync = origRename;
    }
  });
});

// ---------------------------------------------------------------------------
// Test 7 — safeWrite EPERM fallback writes correct content from memory (FIX-043)
// ---------------------------------------------------------------------------

describe("safeWrite — EPERM fallback writes correct content from memory", () => {
  let tmpDir;
  let filePath;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ef-fix43-"));
    filePath = path.join(tmpDir, "eperm-mem-test.yaml");
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("safeWrite EPERM fallback writes correct content from in-memory serialized string", () => {
    const data = { schema_version: 1, value: "hello" };
    const origRename = fs.renameSync;
    let renameCalled = false;

    fs.renameSync = (src, dst) => {
      if (!renameCalled) {
        renameCalled = true;
        const err = new Error("EPERM");
        err.code = "EPERM";
        throw err;
      }
      origRename(src, dst);
    };

    try {
      yamlIO.safeWrite(filePath, data);
    } finally {
      fs.renameSync = origRename;
    }

    const result = yamlIO.safeReadWithFallback(filePath);
    assert.ok(result !== null, "file must be readable after EPERM fallback");
    assert.equal(result.value, "hello", "written value must survive EPERM fallback write-from-memory path");
    assert.equal(result.schema_version, 1, "schema_version must match original data");
  });
});
