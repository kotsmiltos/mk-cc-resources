// brief.test.js — assemble interpolates, fail-soft on oversize, no truncation.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { assemble, envelope, _SANITY_FLOOR_CHARS } from "../lib/brief.js";

async function tmpDir() {
  return mkdtemp(join(tmpdir(), "essense-flow-brief-"));
}

test("assemble: interpolates {{key}} bindings", async () => {
  const r = await assemble({
    templateString: "Hello {{name}}, you are {{role}}.",
    bindings: { name: "Mko", role: "owner" },
  });
  assert.equal(r.content, "Hello Mko, you are owner.");
});

test("assemble: missing binding leaves placeholder + warns", async () => {
  // Capture stderr.
  const original = process.stderr.write.bind(process.stderr);
  let captured = "";
  process.stderr.write = (chunk) => {
    captured += String(chunk);
    return true;
  };
  try {
    const r = await assemble({
      templateString: "A {{present}} B {{absent}}",
      bindings: { present: "yes" },
    });
    assert.match(r.content, /\{\{absent\}\}/);
    assert.match(captured, /unresolved bindings.*absent/);
  } finally {
    process.stderr.write = original;
  }
});

test("assemble: appends sections", async () => {
  const r = await assemble({
    templateString: "## Goal\n\nOne goal.",
    sections: [{ title: "Notes", body: "Extra detail." }],
  });
  assert.match(r.content, /## Goal/);
  assert.match(r.content, /## Notes/);
  assert.match(r.content, /Extra detail\./);
});

test("assemble: prepends YAML frontmatter when metadata given", async () => {
  const r = await assemble({
    templateString: "# Body",
    metadata: { schema_version: 1, lens: "correctness" },
  });
  assert.match(r.content, /^---\n/);
  assert.match(r.content, /lens: correctness/);
  assert.match(r.content, /# Body/);
});

test("assemble: oversize content emits warning and returns FULL content", async () => {
  const big = "x".repeat(_SANITY_FLOOR_CHARS + 1000);
  const original = process.stderr.write.bind(process.stderr);
  let captured = "";
  process.stderr.write = (chunk) => {
    captured += String(chunk);
    return true;
  };
  try {
    const r = await assemble({ templateString: big });
    // Per Fail-Soft: full pass-through.
    assert.equal(r.content.length, big.length);
    assert.match(captured, /sanity floor/);
    assert.ok(r.warnings.some((w) => /sanity floor/.test(w)));
  } finally {
    process.stderr.write = original;
  }
});

test("assemble: reads templatePath from disk", async () => {
  const dir = await tmpDir();
  try {
    const tpl = join(dir, "tpl.md");
    await writeFile(tpl, "# {{title}}", "utf8");
    const r = await assemble({ templatePath: tpl, bindings: { title: "Hi" } });
    assert.equal(r.content, "# Hi");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("envelope: includes brief + sentinel + reasonable instruction", () => {
  const e = envelope({ lens: "correctness", brief: "do thing" });
  assert.match(e.prompt, /correctness agent/);
  assert.match(e.prompt, /do thing/);
  assert.match(e.prompt, /<<<ESSENSE-FLOW:correctness:END>>>/);
  assert.equal(e.sentinel, "<<<ESSENSE-FLOW:correctness:END>>>");
});
