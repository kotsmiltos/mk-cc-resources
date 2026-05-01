// verify-disk.test.js — re-validation of agent self-reports.
// Drift surfaces, never hides.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { validateCompletion } from "../lib/verify-disk.js";

async function tmpProject() {
  return mkdtemp(join(tmpdir(), "essense-flow-verify-"));
}

test("validateCompletion: claimed file that doesn't exist → drift", async () => {
  const root = await tmpProject();
  try {
    const taskStart = new Date(Date.now() - 1000);
    const r = await validateCompletion({
      projectRoot: root,
      claim: {
        task_id: "t1",
        files_modified: ["does/not/exist.js"],
        criteria: [],
      },
      taskStartTime: taskStart,
    });
    assert.equal(r.verified, false);
    assert.equal(r.drift.files.length, 1);
    assert.match(r.drift.files[0].reason, /does not exist/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("validateCompletion: stale mtime (older than task start) → drift", async () => {
  const root = await tmpProject();
  try {
    const stalePath = join(root, "stale.txt");
    await writeFile(stalePath, "stale content", "utf8");
    // Task starts AFTER the file was written.
    const taskStart = new Date(Date.now() + 5000);
    const r = await validateCompletion({
      projectRoot: root,
      claim: {
        task_id: "t1",
        files_modified: ["stale.txt"],
        criteria: [],
      },
      taskStartTime: taskStart,
    });
    assert.equal(r.verified, false);
    assert.equal(r.drift.files.length, 1);
    assert.match(r.drift.files[0].reason, /not after task start/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("validateCompletion: fresh file passes with no drift", async () => {
  const root = await tmpProject();
  try {
    const taskStart = new Date(Date.now() - 5000);
    const fresh = join(root, "fresh.txt");
    await writeFile(fresh, "fresh", "utf8");
    const r = await validateCompletion({
      projectRoot: root,
      claim: {
        task_id: "t1",
        files_modified: ["fresh.txt"],
        criteria: [],
      },
      taskStartTime: taskStart,
    });
    assert.equal(r.verified, true);
    assert.equal(r.drift.files.length, 0);
    assert.equal(r.filesValidated[0].fresh, true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("validateCompletion: grep check pass when pattern present", async () => {
  const root = await tmpProject();
  try {
    await writeFile(join(root, "code.js"), "function answer() { return 42; }", "utf8");
    const r = await validateCompletion({
      projectRoot: root,
      claim: {
        task_id: "t1",
        files_modified: [],
        criteria: [
          {
            id: "AC-1",
            status: "pass",
            check: { type: "grep", spec: { pattern: "function answer", path: "code.js", expect: "match" } },
          },
        ],
      },
      taskStartTime: new Date(Date.now() - 1000),
    });
    assert.equal(r.verified, true);
    assert.equal(r.perCriterionVerdicts[0].runner_status, "pass");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("validateCompletion: drift when agent claims pass but grep fails", async () => {
  const root = await tmpProject();
  try {
    await writeFile(join(root, "code.js"), "// nothing here", "utf8");
    const r = await validateCompletion({
      projectRoot: root,
      claim: {
        task_id: "t1",
        files_modified: [],
        criteria: [
          {
            id: "AC-1",
            status: "pass", // agent claims
            check: { type: "grep", spec: { pattern: "function answer", path: "code.js", expect: "match" } },
          },
        ],
      },
      taskStartTime: new Date(Date.now() - 1000),
    });
    assert.equal(r.verified, false);
    assert.equal(r.drift.criteria.length, 1);
    assert.equal(r.drift.criteria[0].claimed, "pass");
    assert.equal(r.drift.criteria[0].actual, "fail");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("validateCompletion: file_exists check honours projectRoot", async () => {
  const root = await tmpProject();
  try {
    await mkdir(join(root, "sub"), { recursive: true });
    await writeFile(join(root, "sub/wired.js"), "ok", "utf8");
    const r = await validateCompletion({
      projectRoot: root,
      claim: {
        task_id: "t1",
        files_modified: [],
        criteria: [
          {
            id: "AC-2",
            status: "pass",
            check: { type: "file_exists", spec: "sub/wired.js" },
          },
        ],
      },
      taskStartTime: new Date(Date.now() - 1000),
    });
    assert.equal(r.verified, true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("validateCompletion: manual criteria pass through with manual flag", async () => {
  const root = await tmpProject();
  try {
    const r = await validateCompletion({
      projectRoot: root,
      claim: {
        task_id: "t1",
        files_modified: [],
        criteria: [{ id: "AC-3", status: "manual", check: { type: "manual", spec: "QA must eyeball" } }],
      },
      taskStartTime: new Date(Date.now() - 1000),
    });
    assert.equal(r.perCriterionVerdicts[0].runner_status, "manual");
    // Manual + manual = no drift.
    assert.equal(r.verified, true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
