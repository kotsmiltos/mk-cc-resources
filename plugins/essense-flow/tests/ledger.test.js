"use strict";

/**
 * Tests for lib/ledger.js — FIND-ID assignment and corrupt-state recovery.
 *
 * Sprint-8 review claimed "assignFindIds produces FIND-NaN on corrupt
 * next_id" and "recoverNextId never called". Both were valid concerns
 * about a missing wiring: recoverNextId existed but no caller invoked it
 * when a persisted ledger had a missing/invalid next_id field.
 *
 * Coverage:
 *   - readLedger recovers next_id when missing or non-finite
 *   - assignFindIds rejects invalid currentNextId loudly (no FIND-NaN ever)
 *   - recoverNextId returns max(existing FIND-NNN) + 1
 */

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const yaml = require("js-yaml");

const ledger = require("../lib/ledger");
const { checkMissingLedger } = require("../skills/review/scripts/review-runner");

function tmpFile(contents) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ef-ledger-"));
  const p = path.join(dir, "confirmed-findings.yaml");
  fs.writeFileSync(p, yaml.dump(contents), "utf8");
  return { path: p, dir };
}

describe("readLedger — next_id recovery", () => {
  it("returns ledger as-is when next_id is a positive integer", () => {
    const { path: p, dir } = tmpFile({
      schema_version: 1,
      next_id: 7,
      findings: [{ id: "FIND-001" }, { id: "FIND-002" }],
    });
    try {
      const result = ledger.readLedger(p);
      assert.equal(result.next_id, 7);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("recovers next_id from existing FIND-IDs when persisted value missing", () => {
    const { path: p, dir } = tmpFile({
      schema_version: 1,
      // next_id absent
      findings: [{ id: "FIND-005" }, { id: "FIND-003" }, { id: "FIND-009" }],
    });
    try {
      const result = ledger.readLedger(p);
      assert.equal(result.next_id, 10, "max FIND-009 + 1 = 10");
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("recovers next_id when persisted value is null", () => {
    const { path: p, dir } = tmpFile({
      schema_version: 1,
      next_id: null,
      findings: [{ id: "FIND-002" }],
    });
    try {
      const result = ledger.readLedger(p);
      assert.equal(result.next_id, 3);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("recovers next_id when persisted value is NaN-equivalent", () => {
    const { path: p, dir } = tmpFile({
      schema_version: 1,
      next_id: "not a number",
      findings: [],
    });
    try {
      const result = ledger.readLedger(p);
      assert.equal(result.next_id, 1, "empty ledger → next_id = 1");
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("assignFindIds — input validation", () => {
  it("assigns sequential IDs when currentNextId is valid", () => {
    const { updated, nextId } = ledger.assignFindIds([{ x: 1 }, { x: 2 }], 5);
    assert.equal(updated[0].id, "FIND-005");
    assert.equal(updated[1].id, "FIND-006");
    assert.equal(nextId, 7);
  });

  it("throws loudly when currentNextId is undefined", () => {
    assert.throws(
      () => ledger.assignFindIds([{ x: 1 }], undefined),
      /currentNextId must be a positive finite integer/
    );
  });

  it("throws loudly when currentNextId is NaN", () => {
    assert.throws(
      () => ledger.assignFindIds([{ x: 1 }], NaN),
      /currentNextId must be a positive finite integer/
    );
  });

  it("throws loudly when currentNextId is zero", () => {
    assert.throws(
      () => ledger.assignFindIds([{ x: 1 }], 0),
      /currentNextId must be a positive finite integer/
    );
  });

  it("throws loudly when currentNextId is negative", () => {
    assert.throws(
      () => ledger.assignFindIds([{ x: 1 }], -1),
      /currentNextId must be a positive finite integer/
    );
  });
});

describe("checkMissingLedger — throws (not process.exit) on re-review without ledger", () => {
  function makeSprintDir({ withQaOutput, withLedger }) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "ef-checkmissing-"));
    if (withQaOutput) fs.writeFileSync(path.join(root, "qa-run-output.yaml"), "schema_version: 1\n", "utf8");
    if (withLedger) fs.writeFileSync(path.join(root, "confirmed-findings.yaml"), "schema_version: 1\nnext_id: 1\nfindings: []\n", "utf8");
    return root;
  }

  it("does nothing on first review (no qa-run-output)", () => {
    const dir = makeSprintDir({ withQaOutput: false, withLedger: false });
    try {
      assert.doesNotThrow(() => checkMissingLedger(dir));
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("does nothing on re-review with ledger present", () => {
    const dir = makeSprintDir({ withQaOutput: true, withLedger: true });
    try {
      assert.doesNotThrow(() => checkMissingLedger(dir));
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("throws ERR_MISSING_LEDGER on re-review without ledger", () => {
    const dir = makeSprintDir({ withQaOutput: true, withLedger: false });
    try {
      assert.throws(
        () => checkMissingLedger(dir),
        (err) => err.code === "ERR_MISSING_LEDGER" && /confirmed-findings\.yaml not found/.test(err.message)
      );
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("recoverNextId — derivation from existing findings", () => {
  it("returns 1 when no existing findings", () => {
    assert.equal(ledger.recoverNextId([]), 1);
    assert.equal(ledger.recoverNextId(null), 1);
    assert.equal(ledger.recoverNextId(undefined), 1);
  });

  it("returns max + 1 of existing FIND-NNN ids", () => {
    assert.equal(
      ledger.recoverNextId([{ id: "FIND-001" }, { id: "FIND-005" }, { id: "FIND-003" }]),
      6
    );
  });

  it("ignores findings without a parseable FIND-NNN id", () => {
    assert.equal(
      ledger.recoverNextId([{ id: "FIND-002" }, { id: null }, { id: "junk" }, { other: 1 }]),
      3
    );
  });
});
