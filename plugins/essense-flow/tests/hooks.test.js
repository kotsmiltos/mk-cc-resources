// hooks.test.js — both hooks fail-soft on missing/corrupt state.
// Asserts exit 0 in every case + zero blocking branches.

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLUGIN_ROOT = resolve(__dirname, "..");

const CONTEXT_INJECT = join(PLUGIN_ROOT, "hooks/scripts/context-inject.js");
const NEXT_STEP = join(PLUGIN_ROOT, "hooks/scripts/next-step.js");

async function tmpProject() {
  return mkdtemp(join(tmpdir(), "essense-flow-hooks-"));
}

function runHook(script, cwd) {
  return spawnSync("node", [script], {
    cwd,
    encoding: "utf8",
    timeout: 10_000,
  });
}

test("context-inject: missing state.yaml exits 0 with degraded warning", async () => {
  const root = await tmpProject();
  try {
    const r = runHook(CONTEXT_INJECT, root);
    assert.equal(r.status, 0, "must exit 0 — fail-soft");
    assert.match(r.stdout, /<essense-flow-context>/);
    assert.match(r.stdout, /DEGRADED/);
    assert.match(r.stdout, /missing/);
    assert.match(r.stdout, /tool calls are NOT blocked/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("context-inject: corrupt state.yaml exits 0 with degraded:corrupt warning", async () => {
  const root = await tmpProject();
  try {
    await mkdir(join(root, ".pipeline"), { recursive: true });
    await writeFile(join(root, ".pipeline/state.yaml"), "::garbage::", "utf8");
    const r = runHook(CONTEXT_INJECT, root);
    assert.equal(r.status, 0);
    assert.match(r.stdout, /DEGRADED/);
    assert.match(r.stdout, /corrupt/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("context-inject: valid state surfaces phase + canonical artifact paths", async () => {
  const root = await tmpProject();
  try {
    await mkdir(join(root, ".pipeline"), { recursive: true });
    await writeFile(
      join(root, ".pipeline/state.yaml"),
      "schema_version: 1\nphase: eliciting\nlast_updated: 2026-05-01T00:00:00Z\n",
      "utf8",
    );
    const r = runHook(CONTEXT_INJECT, root);
    assert.equal(r.status, 0);
    assert.match(r.stdout, /phase: eliciting/);
    assert.match(r.stdout, /canonical artifacts/);
    assert.match(r.stdout, /SPEC\.md/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("next-step: degraded state recommends /heal, exits 0", async () => {
  const root = await tmpProject();
  try {
    const r = runHook(NEXT_STEP, root);
    assert.equal(r.status, 0);
    assert.match(r.stdout, /<essense-flow-next>/);
    assert.match(r.stdout, /degraded/);
    assert.match(r.stdout, /\/heal/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("next-step: idle phase recommends /elicit", async () => {
  const root = await tmpProject();
  try {
    await mkdir(join(root, ".pipeline"), { recursive: true });
    await writeFile(
      join(root, ".pipeline/state.yaml"),
      "schema_version: 1\nphase: idle\nlast_updated: 2026-05-01T00:00:00Z\n",
      "utf8",
    );
    const r = runHook(NEXT_STEP, root);
    assert.equal(r.status, 0);
    assert.match(r.stdout, /phase: idle/);
    assert.match(r.stdout, /\/elicit/);
    assert.match(r.stdout, /suggestion only/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("next-step: complete phase recommends /status", async () => {
  const root = await tmpProject();
  try {
    await mkdir(join(root, ".pipeline"), { recursive: true });
    await writeFile(
      join(root, ".pipeline/state.yaml"),
      "schema_version: 1\nphase: complete\nlast_updated: 2026-05-01T00:00:00Z\n",
      "utf8",
    );
    const r = runHook(NEXT_STEP, root);
    assert.equal(r.status, 0);
    assert.match(r.stdout, /\/status/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("hooks never exit non-zero — even with read-only filesystem-like errors", async () => {
  // Invoke from a path we know exists but where state file is malformed YAML
  // that yaml.load will throw on AFTER initial parse. The hook must still exit 0.
  const root = await tmpProject();
  try {
    await mkdir(join(root, ".pipeline"), { recursive: true });
    // YAML that loads as a non-object (e.g. just a string).
    await writeFile(join(root, ".pipeline/state.yaml"), "just a string\n", "utf8");
    const r1 = runHook(CONTEXT_INJECT, root);
    const r2 = runHook(NEXT_STEP, root);
    assert.equal(r1.status, 0);
    assert.equal(r2.status, 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
