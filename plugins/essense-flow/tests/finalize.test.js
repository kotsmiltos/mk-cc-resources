// finalize.test.js — atomic write+transition. Failure rolls back.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile, mkdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { finalize } from "../lib/finalize.js";
import { initState, readState } from "../lib/state.js";

async function tmpProject() {
  return mkdtemp(join(tmpdir(), "essense-flow-finalize-"));
}

test("finalize: legal transition writes both artifact and state", async () => {
  const root = await tmpProject();
  try {
    await initState(root);
    const artifactPath = join(root, ".pipeline/elicitation/SPEC.md");
    const r = await finalize({
      projectRoot: root,
      writes: [{ path: artifactPath, content: "# SPEC\n\nbody\n" }],
      nextState: { phase: "eliciting" },
    });
    assert.equal(r.ok, true);
    assert.ok(existsSync(artifactPath));
    const s = await readState(root);
    assert.equal(s.phase, "eliciting");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("finalize: illegal transition writes neither artifact nor state", async () => {
  const root = await tmpProject();
  try {
    await initState(root);
    const artifactPath = join(root, ".pipeline/something/X.md");
    const r = await finalize({
      projectRoot: root,
      writes: [{ path: artifactPath, content: "should not persist" }],
      nextState: { phase: "complete" },
    });
    assert.equal(r.ok, false);
    assert.match(r.reason, /no legal transition/);
    assert.equal(existsSync(artifactPath), false);
    const s = await readState(root);
    assert.equal(s.phase, "idle"); // unchanged
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("finalize: malformed write entry rolls back tmp files", async () => {
  const root = await tmpProject();
  try {
    await initState(root);
    const goodPath = join(root, ".pipeline/good.md");
    const r = await finalize({
      projectRoot: root,
      writes: [
        { path: goodPath, content: "good" },
        { path: null, content: "bad" }, // malformed
      ],
      nextState: { phase: "eliciting" },
    });
    assert.equal(r.ok, false);
    assert.equal(existsSync(goodPath), false, "good tmp must be rolled back");
    assert.equal(existsSync(`${goodPath}.tmp-finalize`), false, "tmp must be unlinked");
    const s = await readState(root);
    assert.equal(s.phase, "idle");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("finalize: empty writes array is allowed (state-only transition)", async () => {
  const root = await tmpProject();
  try {
    await initState(root);
    const r = await finalize({
      projectRoot: root,
      writes: [],
      nextState: { phase: "eliciting" },
    });
    assert.equal(r.ok, true);
    const s = await readState(root);
    assert.equal(s.phase, "eliciting");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("finalize: degraded current state blocks finalize without force", async () => {
  const root = await tmpProject();
  try {
    await mkdir(join(root, ".pipeline"), { recursive: true });
    await writeFile(join(root, ".pipeline/state.yaml"), "::garbage::", "utf8");
    const r = await finalize({
      projectRoot: root,
      writes: [],
      nextState: { phase: "idle" },
    });
    assert.equal(r.ok, false);
    assert.match(r.reason, /degraded/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("finalize: writes go to declared paths verbatim, not relative to .pipeline", async () => {
  const root = await tmpProject();
  try {
    await initState(root);
    const explicit = join(root, ".pipeline/elicitation/SPEC.md");
    await finalize({
      projectRoot: root,
      writes: [{ path: explicit, content: "abc" }],
      nextState: { phase: "eliciting" },
    });
    const content = await readFile(explicit, "utf8");
    assert.equal(content, "abc");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// Walk state from idle to a target phase via legal transitions.
// Used to set up tests for transitions deeper in the graph.
async function walkTo(root, targetPhase) {
  // idle -> eliciting -> research
  await finalize({
    projectRoot: root,
    writes: [{ path: join(root, ".pipeline/elicitation/SPEC.md"), content: "spec" }],
    nextState: { phase: "eliciting" },
  });
  if (targetPhase === "eliciting") return;
  await finalize({
    projectRoot: root,
    writes: [{ path: join(root, ".pipeline/elicitation/SPEC.md"), content: "spec" }],
    nextState: { phase: "research" },
  });
  if (targetPhase === "research") return;
  throw new Error(`walkTo: unsupported target ${targetPhase}`);
}

test("finalize: requires advisory warns to stderr, never refuses", async () => {
  const root = await tmpProject();
  try {
    await initState(root);
    await walkTo(root, "research");

    // research -> triaging requires .pipeline/requirements/REQ.md.
    // We deliberately omit it from writes and from disk to trigger the
    // advisory. The transition must still succeed.
    const origWrite = process.stderr.write.bind(process.stderr);
    let captured = "";
    process.stderr.write = (chunk) => {
      captured += String(chunk);
      return true;
    };
    let r;
    try {
      r = await finalize({
        projectRoot: root,
        writes: [],
        nextState: { phase: "triaging" },
      });
    } finally {
      process.stderr.write = origWrite;
    }
    assert.equal(r.ok, true, "advisory must not refuse a legal transition");
    assert.match(
      captured,
      /heads up.*research->triaging.*requirements\/REQ\.md/,
      "advisory must mention the missing path on stderr",
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("finalize: requires advisory silent when path is in writes", async () => {
  const root = await tmpProject();
  try {
    await initState(root);
    await walkTo(root, "research");

    const origWrite = process.stderr.write.bind(process.stderr);
    let captured = "";
    process.stderr.write = (chunk) => {
      captured += String(chunk);
      return true;
    };
    try {
      await finalize({
        projectRoot: root,
        writes: [
          { path: join(root, ".pipeline/requirements/REQ.md"), content: "# REQ\n" },
        ],
        nextState: { phase: "triaging" },
      });
    } finally {
      process.stderr.write = origWrite;
    }
    assert.equal(
      captured.includes("heads up"),
      false,
      "no advisory when required path is in writes",
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("finalize: requires advisory expands <n> to nextState.sprint", async () => {
  const root = await tmpProject();
  try {
    await initState(root);
    // Walk to architecture: idle -> eliciting -> research -> triaging -> requirements-ready -> architecture
    await finalize({
      projectRoot: root,
      writes: [{ path: join(root, ".pipeline/elicitation/SPEC.md"), content: "s" }],
      nextState: { phase: "eliciting" },
    });
    await finalize({
      projectRoot: root,
      writes: [{ path: join(root, ".pipeline/elicitation/SPEC.md"), content: "s" }],
      nextState: { phase: "research" },
    });
    await finalize({
      projectRoot: root,
      writes: [{ path: join(root, ".pipeline/requirements/REQ.md"), content: "r" }],
      nextState: { phase: "triaging" },
    });
    await finalize({
      projectRoot: root,
      writes: [],
      nextState: { phase: "requirements-ready" },
    });
    await finalize({
      projectRoot: root,
      writes: [],
      nextState: { phase: "architecture" },
    });

    // architecture -> sprinting requires
    // .pipeline/architecture/sprints/<n>/manifest.yaml — <n> must expand
    // to nextState.sprint (here: 7 to verify the substitution).
    const origWrite = process.stderr.write.bind(process.stderr);
    let captured = "";
    process.stderr.write = (chunk) => {
      captured += String(chunk);
      return true;
    };
    try {
      await finalize({
        projectRoot: root,
        writes: [],
        nextState: { phase: "sprinting", sprint: 7 },
      });
    } finally {
      process.stderr.write = origWrite;
    }
    assert.match(
      captured,
      /sprints\/7\/manifest\.yaml/,
      "advisory must expand <n> to literal sprint number",
    );
    assert.equal(
      captured.includes("<n>"),
      false,
      "advisory must not contain unexpanded placeholder",
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
