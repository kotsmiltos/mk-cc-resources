// state.test.js — readState honours degraded states; writeState rejects
// illegal transitions; init writes from defaults.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  readState,
  writeState,
  assertLegalTransition,
  initState,
  loadTransitions,
} from "../lib/state.js";

async function tmpProject() {
  return mkdtemp(join(tmpdir(), "essense-flow-test-"));
}

test("readState: missing file returns idle+degraded:missing", async () => {
  const root = await tmpProject();
  try {
    const s = await readState(root);
    assert.equal(s.phase, "idle");
    assert.equal(s.degraded, "missing");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("readState: corrupt yaml throws ShapeValidationError (field='yaml')", async () => {
  // Per T-956 / D-Rd11-11 (commit afc6787): yaml-parse failure throws as
  // ShapeValidationError with details.field='yaml'. This is distinct from
  // shape-validation failures (post-parse) which return degraded per
  // D-Rd12-1. The throw site is preserved by D-Rd12-1 verbatim: "yaml.load
  // throw → rewrapped as ShapeValidationError (field:'yaml') at L223;
  // still throws (parse-error path)."
  const root = await tmpProject();
  try {
    await mkdir(join(root, ".pipeline"), { recursive: true });
    await writeFile(join(root, ".pipeline/state.yaml"), "this is: not: valid: yaml: ::", "utf8");
    await assert.rejects(
      async () => readState(root),
      (err) => {
        assert.equal(err.name, "ShapeValidationError");
        assert.equal(err.code, "ESHAPE");
        assert.equal(err.details.field, "yaml");
        assert.match(err.message, /yaml parse failed/);
        return true;
      },
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("readState: unknown phase value returns degraded with shape_error", async () => {
  // Per D-Rd12-1 (2026-05-14): shape-validation failures (post yaml-parse)
  // no longer throw — they return a degraded marker with `degraded:'corrupt'`
  // plus a `shape_error` object carrying name/code/message/details. The
  // legacy `reason` field was replaced by `shape_error.message` for
  // structured access. Empty/missing-required-key state files still throw
  // (root-empty path); only validated-but-failing-shape returns degraded.
  const root = await tmpProject();
  try {
    await mkdir(join(root, ".pipeline"), { recursive: true });
    // Minimum-required-keys present so validateStateShape can reach the
    // phase check; the failure is "phase value invented-phase not in
    // canonical transitions list" → shape_error.field === 'phase'.
    await writeFile(
      join(root, ".pipeline/state.yaml"),
      "schema_version: 1\nphase: invented-phase\nlast_updated: 2026-05-16T12:00:00.000Z\n",
      "utf8",
    );
    const s = await readState(root);
    assert.equal(s.degraded, "corrupt");
    assert.ok(s.shape_error, "expected shape_error object on degraded return");
    assert.equal(s.shape_error.code, "ESHAPE");
    assert.equal(s.shape_error.details.field, "phase");
    assert.match(s.shape_error.message, /phase 'invented-phase' not in canonical transitions/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("assertLegalTransition: idle→eliciting is legal", async () => {
  const r = await assertLegalTransition("idle", "eliciting");
  assert.equal(r.ok, true);
  assert.equal(r.transition, "idle-to-eliciting");
});

test("assertLegalTransition: idle→complete is illegal", async () => {
  const r = await assertLegalTransition("idle", "complete");
  assert.equal(r.ok, false);
  assert.match(r.reason, /no legal transition/);
});

test("assertLegalTransition: identity transition is allowed without rule", async () => {
  const r = await assertLegalTransition("idle", "idle");
  assert.equal(r.ok, true);
  assert.equal(r.identity, true);
});

test("initState: writes defaults to .pipeline/state.yaml", async () => {
  const root = await tmpProject();
  try {
    const r = await initState(root);
    assert.equal(r.ok, true);
    assert.ok(existsSync(join(root, ".pipeline/state.yaml")));
    const s = await readState(root);
    assert.equal(s.phase, "idle");
    assert.equal(s.degraded, null);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("initState: refuses if state already exists", async () => {
  const root = await tmpProject();
  try {
    await initState(root);
    const r2 = await initState(root);
    assert.equal(r2.ok, false);
    assert.match(r2.reason, /already exists/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("writeState: rejects illegal transition (idle→complete)", async () => {
  const root = await tmpProject();
  try {
    await initState(root);
    const r = await writeState(root, { phase: "complete" });
    assert.equal(r.ok, false);
    assert.match(r.reason, /no legal transition/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("writeState: accepts legal transition (idle→eliciting)", async () => {
  // Per D-Rd11-11: writeState callers must pass a full canonical state
  // shape (schema_version + phase + last_updated). writeState stamps
  // last_updated itself but does NOT inject schema_version — callers
  // own the canonical shape. Pre-D-Rd11-11 tests passed only `{phase}`
  // because the shape validator did not yet run on the written file.
  const root = await tmpProject();
  try {
    await initState(root);
    const r = await writeState(root, { schema_version: 1, phase: "eliciting" });
    assert.equal(r.ok, true);
    const s = await readState(root);
    assert.equal(s.phase, "eliciting");
    assert.equal(s.degraded, null);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("writeState: degraded current state blocks write without force", async () => {
  const root = await tmpProject();
  try {
    await mkdir(join(root, ".pipeline"), { recursive: true });
    await writeFile(join(root, ".pipeline/state.yaml"), "::garbage::", "utf8");
    const r = await writeState(root, { phase: "idle" });
    assert.equal(r.ok, false);
    assert.match(r.reason, /degraded/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("writeState: force=true allows recovery from degraded state", async () => {
  // Garbage state.yaml degrades the read; force=true bypasses the
  // degraded-block. Writer must still supply full canonical shape
  // (schema_version + phase) per D-Rd11-11 — writeState does not
  // synthesize schema_version. Note the input `::garbage::` causes
  // yaml-parse failure which now THROWS through readState (D-Rd11-11
  // throw site preserved); writeState catches via its own `readState`
  // call wrapped to surface `degraded` without re-raising, OR force
  // bypasses entirely. To exercise the recovery path under D-Rd12-1
  // semantics, seed a shape-degraded state (parseable yaml but invalid
  // phase) rather than a yaml-parse-throw input.
  const root = await tmpProject();
  try {
    await mkdir(join(root, ".pipeline"), { recursive: true });
    await writeFile(
      join(root, ".pipeline/state.yaml"),
      "schema_version: 1\nphase: invented-phase\nlast_updated: 2026-05-16T12:00:00.000Z\n",
      "utf8",
    );
    const r = await writeState(root, { schema_version: 1, phase: "idle" }, { force: true });
    assert.equal(r.ok, true);
    const s = await readState(root);
    assert.equal(s.phase, "idle");
    assert.equal(s.degraded, null);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("loadTransitions: surface phases array contains expected entries", async () => {
  const t = await loadTransitions();
  assert.ok(Array.isArray(t.phases));
  for (const p of [
    "idle",
    "eliciting",
    "research",
    "triaging",
    "requirements-ready",
    "architecture",
    "decomposing",
    "sprinting",
    "sprint-complete",
    "reviewing",
    "verifying",
    "complete",
  ]) {
    assert.ok(t.phases.includes(p), `expected ${p} in phases`);
  }
});
