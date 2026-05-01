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

test("readState: corrupt yaml returns degraded:corrupt with reason", async () => {
  const root = await tmpProject();
  try {
    await mkdir(join(root, ".pipeline"), { recursive: true });
    await writeFile(join(root, ".pipeline/state.yaml"), "this is: not: valid: yaml: ::", "utf8");
    const s = await readState(root);
    assert.equal(s.degraded, "corrupt");
    assert.match(s.reason, /yaml parse failed/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("readState: unknown phase value flagged corrupt", async () => {
  const root = await tmpProject();
  try {
    await mkdir(join(root, ".pipeline"), { recursive: true });
    await writeFile(join(root, ".pipeline/state.yaml"), "phase: invented-phase\n", "utf8");
    const s = await readState(root);
    assert.equal(s.degraded, "corrupt");
    assert.match(s.reason, /unknown phase/);
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
  const root = await tmpProject();
  try {
    await initState(root);
    const r = await writeState(root, { phase: "eliciting" });
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
  const root = await tmpProject();
  try {
    await mkdir(join(root, ".pipeline"), { recursive: true });
    await writeFile(join(root, ".pipeline/state.yaml"), "::garbage::", "utf8");
    const r = await writeState(root, { phase: "idle" }, { force: true });
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
