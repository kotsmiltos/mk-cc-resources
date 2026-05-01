// self-test.js — single entrypoint that runs every test in tests/.
//
// Exits 0 on green, non-zero on any failure. Used by CI and by the user
// during development. No env required beyond Node 18 + js-yaml installed.

import { spawn } from "node:child_process";
import { readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLUGIN_ROOT = resolve(__dirname, "..");
const TESTS_DIR = join(PLUGIN_ROOT, "tests");

const entries = await readdir(TESTS_DIR);
const testFiles = entries
  .filter((f) => f.endsWith(".test.js"))
  .map((f) => join(TESTS_DIR, f));

if (testFiles.length === 0) {
  console.error("[self-test] no test files found");
  process.exit(1);
}

const args = ["--test", "--test-reporter=spec", ...testFiles];
const proc = spawn("node", args, { stdio: "inherit", cwd: PLUGIN_ROOT });
proc.on("exit", (code) => process.exit(code ?? 1));
