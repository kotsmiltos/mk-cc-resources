"use strict";

/**
 * Deterministic gate — runs tests and lint before LLM phases.
 * Failing tests are findings the LLM does not need to re-find.
 * Returns structured result; never throws.
 */

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const GATE_TIMEOUT_MS = 180_000; // 3 minutes — enough for ~600 unit tests
const PACKAGE_FILE = "package.json";

/**
 * Run the deterministic gate against a project root.
 *
 * Looks for npm scripts: `test` and `lint`. Runs each that exists.
 *
 * @param {string} projectRoot - directory containing package.json
 * @param {object} [options]
 * @param {boolean} [options.skipTest=false] - skip the test step
 * @param {boolean} [options.skipLint=false] - skip the lint step
 * @param {number}  [options.timeoutMs] - override default timeout per command
 * @returns {{ ok: boolean, failures: Array<{type: string, exitCode: number, output: string}>, skipped: string[] }}
 */
function runGate(projectRoot, options = {}) {
  const result = { ok: true, failures: [], skipped: [] };
  const timeoutMs = options.timeoutMs || GATE_TIMEOUT_MS;

  const pkgPath = path.join(projectRoot, PACKAGE_FILE);
  if (!fs.existsSync(pkgPath)) {
    result.skipped.push("no package.json found");
    return result;
  }

  let pkg;
  try {
    pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  } catch (e) {
    result.skipped.push(`package.json unreadable: ${e.message}`);
    return result;
  }

  const scripts = pkg.scripts || {};

  // Single helper — runs npm script with timeout, captures all error modes.
  // spawnSync rarely throws; r.error is set if the process can't launch.
  // r.signal is set on timeout (SIGTERM). r.status null on spawn failure.
  function runScript(type, args) {
    let r;
    try {
      r = spawnSync("npm", args, {
        cwd: projectRoot,
        timeout: timeoutMs,
        encoding: "utf8",
        shell: true,
      });
    } catch (e) {
      // Defensive: spawnSync should not throw, but capture if it does
      result.ok = false;
      result.failures.push({
        type,
        exitCode: -1,
        output: `spawnSync threw: ${e.message}`,
      });
      return;
    }

    if (r.error) {
      result.ok = false;
      result.failures.push({
        type,
        exitCode: -1,
        output: `spawn error: ${r.error.message}\n${(r.stdout || "") + (r.stderr || "")}`,
      });
      return;
    }

    if (r.signal) {
      result.ok = false;
      result.failures.push({
        type,
        exitCode: -1,
        output: `terminated by signal ${r.signal} (timeout ${timeoutMs}ms)\n${(r.stdout || "") + (r.stderr || "")}`,
      });
      return;
    }

    if (r.status !== 0) {
      result.ok = false;
      result.failures.push({
        type,
        exitCode: r.status == null ? -1 : r.status,
        output: (r.stdout || "") + (r.stderr || ""),
      });
    }
  }

  if (!options.skipTest) {
    if (scripts.test) {
      runScript("test", ["test"]);
    } else {
      result.skipped.push("no test script in package.json");
    }
  } else {
    result.skipped.push("test step skipped by caller");
  }

  if (!options.skipLint) {
    if (scripts.lint) {
      runScript("lint", ["run", "lint"]);
    } else {
      result.skipped.push("no lint script in package.json");
    }
  } else {
    result.skipped.push("lint step skipped by caller");
  }

  return result;
}

/**
 * Format gate failures into review-finding shape — for use by review-runner
 * when test/lint fails (skip LLM, surface deterministic failures as findings).
 */
function failuresToFindings(failures, sprint) {
  const findings = [];
  let id = 1;
  for (const f of failures) {
    findings.push({
      id: `FIND-DET-${String(id).padStart(3, "0")}`,
      severity: "critical",
      blocks_advance: "yes",
      category: "correctness",
      verdict: "CONFIRMED",
      file: "deterministic-gate",
      line: 0,
      quote: `${f.type} failed with exit code ${f.exitCode}`,
      reproduction: `npm ${f.type === "lint" ? "run lint" : "test"}`,
      reason: `Deterministic gate ${f.type} step failed; LLM review skipped — fix this first.`,
      output: f.output,
      sprint,
    });
    id += 1;
  }
  return findings;
}

module.exports = {
  runGate,
  failuresToFindings,
  GATE_TIMEOUT_MS,
};
