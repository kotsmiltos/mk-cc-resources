// dispatch.test.js — fan-out helpers, sentinel parsing, missing-signal
// synthesis, quorum modes.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  prepareBriefs,
  parseReturn,
  synthesizeMissing,
  collateQuorum,
} from "../lib/dispatch.js";

test("prepareBriefs: builds prompts + sentinels for each lens", () => {
  const r = prepareBriefs([
    { lens: "correctness", brief: "B1" },
    { lens: "drift", brief: "B2" },
  ]);
  assert.equal(r.ok, true);
  assert.equal(r.briefs.length, 2);
  assert.match(r.briefs[0].prompt, /correctness agent/);
  assert.match(r.briefs[0].prompt, /B1/);
  assert.equal(r.briefs[0].sentinel, "<<<ESSENSE-FLOW:correctness:END>>>");
});

test("prepareBriefs: malformed spec returns ok:false", () => {
  const r = prepareBriefs([{ lens: "x" }]);
  assert.equal(r.ok, false);
  assert.match(r.reason, /needs \{lens, brief\}/);
});

test("parseReturn: sentinel found returns body trimmed", () => {
  const sentinel = "<<<END>>>";
  const r = parseReturn({
    raw: "the body here\nmore body\n<<<END>>>\nignore after",
    sentinel,
  });
  assert.equal(r.ok, true);
  assert.equal(r.body, "the body here\nmore body");
});

test("parseReturn: missing sentinel returns ok:false (agent crashed)", () => {
  const r = parseReturn({ raw: "some body without terminator", sentinel: "<<<END>>>" });
  assert.equal(r.ok, false);
  assert.match(r.reason, /sentinel not found/);
});

test("synthesizeMissing: produces synthetic finding shape", () => {
  const f = synthesizeMissing({ lens: "correctness", reason: "killed" });
  assert.equal(f.lens, "correctness");
  assert.equal(f.status, "crashed");
  assert.equal(f.synthetic, true);
  assert.match(f.reason, /killed/);
});

test("collateQuorum all-required: missing lens flags ok:false", () => {
  const c = collateQuorum({
    results: [{ lens: "a", body: "x", ok: true }],
    expectedLenses: ["a", "b"],
    mode: "all-required",
  });
  assert.equal(c.ok, false);
  assert.deepEqual(c.missing, ["b"]);
  // Synthetic finding for b is ALWAYS appended — never silently dropped.
  assert.ok(c.results.some((r) => r.lens === "b" && r.synthetic === true));
});

test("collateQuorum tolerant: 1 missing of 3 lenses still ok:true", () => {
  const c = collateQuorum({
    results: [
      { lens: "a", body: "x", ok: true },
      { lens: "b", body: "y", ok: true },
    ],
    expectedLenses: ["a", "b", "c"],
    mode: "tolerant",
  });
  assert.equal(c.ok, true);
  assert.deepEqual(c.missing, ["c"]);
  assert.ok(c.results.some((r) => r.lens === "c" && r.synthetic === true));
});

test("collateQuorum tolerant: 2 missing of 3 lenses fails the gate", () => {
  const c = collateQuorum({
    results: [{ lens: "a", body: "x", ok: true }],
    expectedLenses: ["a", "b", "c"],
    mode: "tolerant",
  });
  assert.equal(c.ok, false);
});

test("collateQuorum task-by-task: never aggregates ok across tasks", () => {
  const c = collateQuorum({
    results: [
      { lens: "task-1", ok: true, body: "ok" },
      { lens: "task-2", ok: false, reason: "boom" },
    ],
    expectedLenses: ["task-1", "task-2", "task-3"],
    mode: "task-by-task",
  });
  assert.equal(c.ok, true); // mode never gates aggregate
  assert.ok(c.missing.includes("task-3"));
  assert.ok(c.results.some((r) => r.lens === "task-3" && r.synthetic === true));
});

test("collateQuorum: unknown mode surfaces the error", () => {
  const c = collateQuorum({
    results: [],
    expectedLenses: ["a"],
    mode: "made-up",
  });
  assert.equal(c.ok, false);
  assert.match(c.reason, /unknown quorum mode/);
});
