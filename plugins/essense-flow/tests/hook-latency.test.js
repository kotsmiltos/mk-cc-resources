"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert");
const { spawnSync } = require("node:child_process");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");

const N = 50;
const P95_INDEX = 47;
const P95_CEILING_MS = 2000;

const HOOKS = [
  { name: "context-inject", script: "hooks/scripts/context-inject.sh" },
  { name: "review-guard", script: "hooks/scripts/review-guard.sh" },
  { name: "yaml-validate", script: "hooks/scripts/yaml-validate.sh" },
  { name: "session-orient", script: "hooks/scripts/session-orient.sh" },
];

describe("hook-latency", () => {
  for (const hook of HOOKS) {
    it(`${hook.name} P95 ≤ ${P95_CEILING_MS}ms`, () => {
      const absPath = path.join(ROOT, hook.script);
      const durations = [];

      for (let i = 0; i < N; i++) {
        const start = Date.now();
        spawnSync("bash", [absPath], {
          encoding: "utf8",
          timeout: 5000,
          env: {
            ...process.env,
            CLAUDE_PLUGIN_ROOT: ROOT,
          },
        });
        durations.push(Date.now() - start);
      }

      durations.sort((a, b) => a - b);
      const p95 = durations[P95_INDEX];
      assert.ok(
        p95 <= P95_CEILING_MS,
        `${hook.name} P95 latency ${p95}ms exceeds ceiling ${P95_CEILING_MS}ms`
      );
    });
  }
});
