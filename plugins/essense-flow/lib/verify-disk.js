// verify-disk.js — re-validate agent self-reports against the filesystem.
//
// Build's task agents return completion records:
//   { task_id, files_modified: [...], criteria: [{ id, status, check }] }
//
// validateCompletion re-checks every claim against disk before the runner
// persists it. Per Diligent-Conduct: trust is conditional. The agent's
// claim is a hypothesis; the runner-verified result is the proof.
//
// Drift is auditable: both shapes (agent claim, runner verification) are
// returned so the review phase can see disagreement.

import { stat, readFile, access } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

// validateCompletion({ projectRoot, claim, taskStartTime })
// claim: {
//   task_id: string,
//   files_modified: string[],         // paths relative to projectRoot
//   criteria: [{
//     id: string,
//     status: "pass"|"fail"|"manual", // agent's verdict
//     check: { type: "test"|"grep"|"file_exists", spec },
//   }],
// }
// taskStartTime: Date
//
// Returns:
//   {
//     verified: bool,
//     drift: { files: [...], criteria: [...] },
//     perCriterionVerdicts: [{ id, agent_status, runner_status, evidence }],
//     filesValidated: [{ path, exists, mtime, fresh }],
//   }
export async function validateCompletion({ projectRoot, claim, taskStartTime }) {
  if (!projectRoot) throw new Error("projectRoot is required");
  if (!claim) throw new Error("claim is required");

  const taskStart = taskStartTime instanceof Date ? taskStartTime : new Date(taskStartTime);
  const filesValidated = [];
  const driftFiles = [];

  for (const rel of claim.files_modified || []) {
    const full = resolve(projectRoot, rel);
    if (!existsSync(full)) {
      filesValidated.push({ path: rel, exists: false, mtime: null, fresh: false });
      driftFiles.push({ path: rel, reason: "claimed file does not exist" });
      continue;
    }
    let st;
    try {
      st = await stat(full);
    } catch (err) {
      filesValidated.push({
        path: rel,
        exists: true,
        mtime: null,
        fresh: false,
        error: err.message,
      });
      driftFiles.push({ path: rel, reason: `stat failed: ${err.message}` });
      continue;
    }
    const fresh = st.mtime >= taskStart;
    filesValidated.push({
      path: rel,
      exists: true,
      mtime: st.mtime.toISOString(),
      fresh,
    });
    if (!fresh) {
      driftFiles.push({
        path: rel,
        reason: `mtime ${st.mtime.toISOString()} is not after task start ${taskStart.toISOString()}`,
      });
    }
  }

  const perCriterion = [];
  const driftCriteria = [];
  for (const c of claim.criteria || []) {
    const verdict = await runCheck({ projectRoot, check: c.check });
    perCriterion.push({
      id: c.id,
      agent_status: c.status,
      runner_status: verdict.status,
      evidence: verdict.evidence,
    });
    if (c.status !== verdict.status) {
      driftCriteria.push({
        id: c.id,
        claimed: c.status,
        actual: verdict.status,
        evidence: verdict.evidence,
      });
    }
  }

  const verified = driftFiles.length === 0 && driftCriteria.length === 0;
  return {
    verified,
    drift: { files: driftFiles, criteria: driftCriteria },
    perCriterionVerdicts: perCriterion,
    filesValidated,
  };
}

async function runCheck({ projectRoot, check }) {
  if (!check || !check.type) {
    return { status: "manual", evidence: "no check specified — manual" };
  }
  if (check.type === "manual") {
    return { status: "manual", evidence: check.spec || "manual check, not auto-runnable" };
  }
  if (check.type === "file_exists") {
    const full = resolve(projectRoot, check.spec);
    return existsSync(full)
      ? { status: "pass", evidence: `file exists: ${check.spec}` }
      : { status: "fail", evidence: `file missing: ${check.spec}` };
  }
  if (check.type === "grep") {
    // spec: { pattern: string, path: string, expect: "match"|"no_match" }
    const { pattern, path, expect = "match" } = check.spec || {};
    if (!pattern || !path) return { status: "manual", evidence: "grep needs pattern+path" };
    const full = resolve(projectRoot, path);
    if (!existsSync(full)) return { status: "fail", evidence: `path missing: ${path}` };
    let content;
    try {
      content = await readFile(full, "utf8");
    } catch (err) {
      return { status: "fail", evidence: `read failed: ${err.message}` };
    }
    const found = new RegExp(pattern).test(content);
    if (expect === "match") {
      return found
        ? { status: "pass", evidence: `pattern found in ${path}` }
        : { status: "fail", evidence: `pattern absent in ${path}` };
    }
    return found
      ? { status: "fail", evidence: `pattern unexpectedly found in ${path}` }
      : { status: "pass", evidence: `pattern absent in ${path} as expected` };
  }
  if (check.type === "test") {
    // spec: { command: string, cwd?: string, expect_exit?: number }
    const { command, cwd = projectRoot, expect_exit = 0 } = check.spec || {};
    if (!command) return { status: "manual", evidence: "test check needs command" };
    const result = spawnSync(command, {
      cwd,
      shell: true,
      encoding: "utf8",
      timeout: 600_000, // safety floor — 10 min hung-process catch, surfaces as "manual" verdict
    });
    if (result.error) {
      return { status: "fail", evidence: `spawn failed: ${result.error.message}` };
    }
    if (result.status === expect_exit) {
      return {
        status: "pass",
        evidence: `exit ${result.status} matches expected ${expect_exit}`,
      };
    }
    return {
      status: "fail",
      evidence: `exit ${result.status} (expected ${expect_exit}); stderr: ${(result.stderr || "").slice(0, 500)}`,
    };
  }
  return { status: "manual", evidence: `unknown check type: ${check.type}` };
}
