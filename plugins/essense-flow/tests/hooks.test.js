// hooks.test.js — both hooks fail-soft on missing/corrupt state.
// Asserts exit 0 in every case + zero blocking branches.
//
// Since 0.27.0 the hooks also assert WHERE and WHEN they speak:
//   - the degraded banner belongs to SessionStart only (context-inject) — 535 measured
//     re-injections of the same banner on UserPromptSubmit is the defect these cover;
//   - next-step says NOTHING on a degraded state (its /heal suggestion fired every turn);
//   - both anchor to the nearest .git ancestor, so a subdirectory shell reads THIS project.

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

// The platform sends a JSON payload on stdin carrying `hook_event_name` + `cwd`.
// Tests must too: the event is what gates the degraded banner.
function runHook(script, cwd, event) {
  return spawnSync("node", [script], {
    cwd,
    input: JSON.stringify({ hook_event_name: event || "UserPromptSubmit", cwd }),
    encoding: "utf8",
    timeout: 10_000,
  });
}

const SESSION_START = "SessionStart";
const USER_PROMPT_SUBMIT = "UserPromptSubmit";
const STOP = "Stop";

test("context-inject: never-initialized repo (no .pipeline/) emits NOTHING", async () => {
  const root = await tmpProject();
  try {
    const r = runHook(CONTEXT_INJECT, root);
    assert.equal(r.status, 0, "must exit 0 — fail-soft");
    assert.equal(r.stdout, "", "non-pipeline repo must get zero banner");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("context-inject: .pipeline/ exists but state.yaml lost → visible degraded warning on SessionStart", async () => {
  const root = await tmpProject();
  try {
    await mkdir(join(root, ".pipeline"), { recursive: true });
    const r = runHook(CONTEXT_INJECT, root, SESSION_START);
    assert.equal(r.status, 0, "must exit 0 — fail-soft");
    assert.match(r.stdout, /<essense-flow-context>/);
    assert.match(r.stdout, /DEGRADED/);
    assert.match(r.stdout, /missing/);
    assert.match(r.stdout, /tool calls are NOT blocked/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("context-inject: yaml PARSE error (duplicate key) → visible DEGRADED corrupt, not stderr-only", async () => {
  const root = await tmpProject();
  try {
    await mkdir(join(root, ".pipeline"), { recursive: true });
    // Duplicate mapping key — js-yaml throws at parse time (the Diploma case).
    await writeFile(
      join(root, ".pipeline/state.yaml"),
      "schema_version: 1\nphase: idle\nphase: eliciting\n",
      "utf8",
    );
    const r = runHook(CONTEXT_INJECT, root, SESSION_START);
    assert.equal(r.status, 0);
    assert.match(r.stdout, /DEGRADED \(corrupt\)/);
    assert.match(r.stdout, /duplicated mapping key/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("context-inject: corrupt state.yaml exits 0 with degraded:corrupt warning", async () => {
  const root = await tmpProject();
  try {
    await mkdir(join(root, ".pipeline"), { recursive: true });
    await writeFile(join(root, ".pipeline/state.yaml"), "::garbage::", "utf8");
    const r = runHook(CONTEXT_INJECT, root, SESSION_START);
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
      "schema_version: 1\nphase: eliciting\nlast_updated: \"2026-05-01T00:00:00Z\"\n",
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

test("next-step: never-initialized repo (no .pipeline/) emits NOTHING", async () => {
  const root = await tmpProject();
  try {
    const r = runHook(NEXT_STEP, root);
    assert.equal(r.status, 0);
    assert.equal(r.stdout, "", "non-pipeline repo must get zero suggestion");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("next-step: .pipeline/ exists but state.yaml lost → SILENT, exits 0", async () => {
  const root = await tmpProject();
  try {
    await mkdir(join(root, ".pipeline"), { recursive: true });
    const r = runHook(NEXT_STEP, root, STOP);
    assert.equal(r.status, 0);
    assert.equal(r.stdout, "", "a degraded state gets no end-of-turn suggestion (0.27.0)");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("next-step: yaml PARSE error → SILENT (no /heal push at a pipeline nobody runs)", async () => {
  const root = await tmpProject();
  try {
    await mkdir(join(root, ".pipeline"), { recursive: true });
    await writeFile(
      join(root, ".pipeline/state.yaml"),
      "schema_version: 1\nphase: idle\nphase: eliciting\n",
      "utf8",
    );
    const r = runHook(NEXT_STEP, root, STOP);
    assert.equal(r.status, 0);
    assert.equal(r.stdout, "");
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
      "schema_version: 1\nphase: idle\nlast_updated: \"2026-05-01T00:00:00Z\"\n",
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
  // Quote the ISO timestamp so js-yaml loads it as a string scalar, not
  // a Date object. Per D-Rd11-11 validateStateShape requires
  // `typeof last_updated === 'string'`; an unquoted YAML 1.1 timestamp
  // would parse as Date and fail the shape check → degraded read →
  // hook emits `/heal` instead of `/status`. Other tests in this suite
  // route through initState() which writes via yaml.dump() and round-
  // trips cleanly as string; this test seeds the YAML by hand so the
  // quote is load-bearing.
  const root = await tmpProject();
  try {
    await mkdir(join(root, ".pipeline"), { recursive: true });
    await writeFile(
      join(root, ".pipeline/state.yaml"),
      'schema_version: 1\nphase: complete\nlast_updated: \"2026-05-01T00:00:00Z\"\n',
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
  // that yaml.load will throw on AFTER initial parse. The hook must still exit 0
  // AND the degradation must be visible on stdout (not stderr-only silence).
  const root = await tmpProject();
  try {
    await mkdir(join(root, ".pipeline"), { recursive: true });
    // YAML that loads as a non-object (e.g. just a string).
    await writeFile(join(root, ".pipeline/state.yaml"), "just a string\n", "utf8");
    const r1 = runHook(CONTEXT_INJECT, root, SESSION_START);
    const r2 = runHook(NEXT_STEP, root, STOP);
    assert.equal(r1.status, 0);
    assert.equal(r2.status, 0);
    assert.match(r1.stdout, /DEGRADED \(corrupt\)/, "non-object root must be visible at session start");
    assert.equal(r2.stdout, "", "…and nowhere else: next-step stays silent");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// ── 0.27.0: WHEN each hook is allowed to speak ─────────────────────────────
// The defect these close (measured 2026-09-11 over 196 sessions): 535 identical
// `DEGRADED (corrupt)` banners from context-inject and a `/heal` push from next-step at every
// turn's end, in a repo whose pipeline skills were invoked 0 times.

test("context-inject: degraded state is SILENT on UserPromptSubmit (SessionStart owns the banner)", async () => {
  const root = await tmpProject();
  try {
    await mkdir(join(root, ".pipeline"), { recursive: true });
    await writeFile(join(root, ".pipeline/state.yaml"), "::garbage::", "utf8");
    const ups = runHook(CONTEXT_INJECT, root, USER_PROMPT_SUBMIT);
    const start = runHook(CONTEXT_INJECT, root, SESSION_START);
    assert.equal(ups.status, 0);
    assert.equal(ups.stdout, "", "the same banner on every prompt is the defect, not the feature");
    assert.match(start.stdout, /DEGRADED/, "…and SessionStart must still carry it once");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("context-inject: an UNKNOWN event never banners a degraded state (cannot prove it is once-per-session)", async () => {
  const root = await tmpProject();
  try {
    await mkdir(join(root, ".pipeline"), { recursive: true });
    await writeFile(join(root, ".pipeline/state.yaml"), "::garbage::", "utf8");
    const r = runHook(CONTEXT_INJECT, root, "SomeFutureEvent");
    assert.equal(r.status, 0);
    assert.equal(r.stdout, "");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("context-inject: a HEALTHY state still injects on UserPromptSubmit (it changes as the pipeline advances)", async () => {
  const root = await tmpProject();
  try {
    await mkdir(join(root, ".pipeline"), { recursive: true });
    await writeFile(
      join(root, ".pipeline/state.yaml"),
      'schema_version: 1\nphase: eliciting\nlast_updated: "2026-05-01T00:00:00Z"\n',
      "utf8",
    );
    const r = runHook(CONTEXT_INJECT, root, USER_PROMPT_SUBMIT);
    assert.equal(r.status, 0);
    assert.match(r.stdout, /phase: eliciting/, "the phase block is NOT what was silenced");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("next-step: a healthy state still suggests from a Stop payload", async () => {
  const root = await tmpProject();
  try {
    await mkdir(join(root, ".pipeline"), { recursive: true });
    await writeFile(
      join(root, ".pipeline/state.yaml"),
      'schema_version: 1\nphase: idle\nlast_updated: "2026-05-01T00:00:00Z"\n',
      "utf8",
    );
    const r = runHook(NEXT_STEP, root, STOP);
    assert.equal(r.status, 0);
    assert.match(r.stdout, /recommended_next/, "only the degraded branch went quiet");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// ── 0.27.0: WHICH project each hook reads ──────────────────────────────────
// Both hooks used bare process.cwd(): a shell sitting in a subdirectory read — and bannered
// about — whatever .pipeline/ happened to be under it (or none at all). They now walk to the
// nearest .git ancestor, HOME-guarded, the same walk turn-end/kb/patterns each carry a copy of.

test("both hooks anchor to the nearest .git ancestor, not the shell's subdirectory", async () => {
  const root = await tmpProject();
  try {
    await mkdir(join(root, ".git"), { recursive: true });
    await mkdir(join(root, ".pipeline"), { recursive: true });
    await mkdir(join(root, "src/deep/nested"), { recursive: true });
    await writeFile(
      join(root, ".pipeline/state.yaml"),
      'schema_version: 1\nphase: eliciting\nlast_updated: "2026-05-01T00:00:00Z"\n',
      "utf8",
    );
    const subdir = join(root, "src/deep/nested");
    const ci = runHook(CONTEXT_INJECT, subdir, USER_PROMPT_SUBMIT);
    const ns = runHook(NEXT_STEP, subdir, STOP);
    assert.equal(ci.status, 0);
    assert.equal(ns.status, 0);
    assert.match(ci.stdout, /phase: eliciting/, "the subdir shell must read the PROJECT's pipeline");
    assert.match(ns.stdout, /recommended_next/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
