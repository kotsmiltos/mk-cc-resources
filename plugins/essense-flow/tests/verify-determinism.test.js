"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");

describe("verify-determinism", () => {
  describe("adaptiveBriefCeiling determinism", () => {
    it("identical inputs produce identical output", () => {
      const { adaptiveBriefCeiling } = require("../lib/tokens");
      // Config shape matches what adaptiveBriefCeiling actually reads:
      // config.token_budgets.brief_ceiling and config.token_budgets.max_brief_ceiling
      const config = {
        token_budgets: { brief_ceiling: 8000, max_brief_ceiling: 16000 },
      };
      const spec = "Spec content describing features. ".repeat(50);
      const r1 = adaptiveBriefCeiling(spec, config);
      const r2 = adaptiveBriefCeiling(spec, config);
      assert.strictEqual(typeof r1, "number", "result must be a number");
      assert.strictEqual(r1, r2, "adaptiveBriefCeiling must be deterministic");
    });
  });

  describe("computeDropSource determinism", () => {
    it("identical inputs produce identical output", () => {
      const { computeDropSource } = require("../lib/triage-utils");
      const files = ["foo.yaml", "bar.md", "baz.js"];
      assert.strictEqual(
        computeDropSource("triage", files),
        computeDropSource("triage", files)
      );
    });

    it("is order-invariant (file list sorted internally)", () => {
      const { computeDropSource } = require("../lib/triage-utils");
      const a = computeDropSource("triage", ["baz.js", "foo.yaml", "bar.md"]);
      const b = computeDropSource("triage", ["foo.yaml", "bar.md", "baz.js"]);
      assert.strictEqual(a, b, "computeDropSource must be order-invariant");
    });
  });

  describe("runReview pass/fail decision boundary", () => {
    it("0 critical findings → summary.pass === true", () => {
      const { runReview } = require("../skills/architect/scripts/architect-runner");
      // Use a real temp directory so ensureDir and writeFileSync don't throw
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ef-test-"));
      const mockOutputs = [{
        agentId: "qa-test",
        payload: {
          findings: "- Medium: something minor\n- Low: trivial note",
        },
      }];
      const { summary } = runReview(mockOutputs, 6, tmpDir, {});
      assert.strictEqual(summary.critical, 0);
      assert.strictEqual(summary.pass, true);
    });

    it("1+ critical findings → summary.pass === false", () => {
      const { runReview } = require("../skills/architect/scripts/architect-runner");
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ef-test-"));
      const mockOutputs = [{
        agentId: "qa-test",
        payload: {
          findings: "- Critical: this is a security vulnerability",
        },
      }];
      const { summary } = runReview(mockOutputs, 6, tmpDir, {});
      assert.ok(summary.critical >= 1);
      assert.strictEqual(summary.pass, false);
    });
  });

  describe("named constants audit", () => {
    it("tokens.js imports CHARS_PER_TOKEN from lib/constants.js", () => {
      const tokensSrc = fs.readFileSync(path.join(ROOT, "lib", "tokens.js"), "utf8");
      assert.ok(
        tokensSrc.includes("require") && tokensSrc.includes("constants"),
        "tokens.js must require lib/constants.js"
      );
      const constantsSrc = fs.readFileSync(path.join(ROOT, "lib", "constants.js"), "utf8");
      assert.ok(
        constantsSrc.includes("CHARS_PER_TOKEN"),
        "lib/constants.js must define CHARS_PER_TOKEN"
      );
      assert.ok(
        tokensSrc.includes("CHARS_PER_TOKEN"),
        "tokens.js must reference CHARS_PER_TOKEN (not inline its value)"
      );
    });
  });
});
