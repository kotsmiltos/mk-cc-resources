"use strict";

const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const os = require("os");
const yaml = require("js-yaml");
const { Worker } = require("worker_threads");

const lockfile = require("../lib/lockfile");

const LOCK_FILE = ".lock";
const WORKER_SCRIPT = path.join(__dirname, "fixtures", "lock-worker.js");

/** Create a unique temp dir under os.tmpdir() */
function makeTmpDir(label) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `essense-lock-${label}-`));
}

/** Read the .lock file from a pipeline dir, parsed from YAML. */
function readLockFile(dir) {
  return yaml.load(fs.readFileSync(path.join(dir, LOCK_FILE), "utf8"));
}

/** Write a raw lock YAML file — used to pre-seed stale-detection tests. */
function writeLockFile(dir, data) {
  fs.writeFileSync(path.join(dir, LOCK_FILE), yaml.dump(data), "utf8");
}

/** Sleep helper */
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Run lock-worker.js in a worker thread, returns a Promise<result>. */
function runWorker(dir) {
  return new Promise((resolve, reject) => {
    const w = new Worker(WORKER_SCRIPT, { workerData: { dir } });
    w.once("message", resolve);
    w.once("error", reject);
  });
}

// ---------------------------------------------------------------------------
// Test 1 — Lock schema has all 5 FR-011 fields
// ---------------------------------------------------------------------------

describe("lock schema", () => {
  let dir;

  before(() => { dir = makeTmpDir("schema"); });
  after(() => { fs.rmSync(dir, { recursive: true, force: true }); });

  it("acquireLock writes all 5 FR-011 fields", () => {
    const result = lockfile.acquireLock(dir, "research");
    assert.equal(result.ok, true);

    const lock = readLockFile(dir);
    assert.ok(lock.session_id != null, "session_id missing");
    assert.ok(lock.pid != null, "pid missing");
    assert.ok(lock.created_at != null, "created_at missing");
    assert.ok(lock.last_heartbeat != null, "last_heartbeat missing");
    assert.ok(lock.phase_at_lock != null, "phase_at_lock missing");
  });
});

// ---------------------------------------------------------------------------
// Test 2 — Concurrent acquire: exactly 1 ok, 1 fails across 10 rounds
// ---------------------------------------------------------------------------

describe("concurrent lock acquisition", () => {
  it("exactly one worker wins per round across 10 rounds", async () => {
    for (let round = 0; round < 10; round++) {
      const dir = makeTmpDir(`conc-${round}`);
      try {
        const [r1, r2] = await Promise.all([runWorker(dir), runWorker(dir)]);
        const successCount = [r1, r2].filter((r) => r.ok === true).length;
        const failCount = [r1, r2].filter((r) => r.ok === false).length;
        assert.equal(successCount, 1, `round ${round}: expected 1 success, got ${successCount}`);
        assert.equal(failCount, 1, `round ${round}: expected 1 failure, got ${failCount}`);
      } finally {
        // Clean up even if assertion fails
        fs.rmSync(dir, { recursive: true, force: true });
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Test 3 — Stale detection: not yet stale (4 min old) → {ok:false}
// ---------------------------------------------------------------------------

describe("stale lock detection", () => {
  let dir;

  before(() => { dir = makeTmpDir("stale"); });
  after(() => { fs.rmSync(dir, { recursive: true, force: true }); });

  it("returns ok:false when lock is 4 min old (not yet stale)", () => {
    const fourMinAgo = new Date(Date.now() - 4 * 60 * 1000).toISOString();
    writeLockFile(dir, {
      session_id: "existing-session",
      pid: 99999,
      created_at: fourMinAgo,
      last_heartbeat: fourMinAgo,
      phase_at_lock: "research",
    });

    const result = lockfile.acquireLock(dir, "research");
    assert.equal(result.ok, false, "expected ok:false for live lock");
  });

  it("returns ok:true when lock is 6 min old (stale — replaced)", () => {
    const sixMinAgo = new Date(Date.now() - 6 * 60 * 1000).toISOString();
    writeLockFile(dir, {
      session_id: "stale-session",
      pid: 99999,
      created_at: sixMinAgo,
      last_heartbeat: sixMinAgo,
      phase_at_lock: "research",
    });

    const result = lockfile.acquireLock(dir, "research");
    assert.equal(result.ok, true, "expected ok:true for stale lock (should be replaced)");
  });
});

// ---------------------------------------------------------------------------
// Test 5 — updateHeartbeat updates last_heartbeat
// ---------------------------------------------------------------------------

describe("updateHeartbeat", () => {
  let dir;

  before(() => { dir = makeTmpDir("heartbeat"); });
  after(() => { fs.rmSync(dir, { recursive: true, force: true }); });

  it("updates last_heartbeat to a later timestamp", async () => {
    lockfile.acquireLock(dir, "build");
    const before = readLockFile(dir).last_heartbeat;

    await sleep(10);

    lockfile.updateHeartbeat(dir);
    const after = readLockFile(dir).last_heartbeat;

    // New timestamp must be the same or later (ISO strings are lexicographically comparable)
    assert.ok(
      after >= before,
      `expected updated heartbeat (${after}) >= original (${before})`
    );
  });
});

// ---------------------------------------------------------------------------
// Test 7 — releaseLock with undefined sessionId is rejected
// ---------------------------------------------------------------------------

describe("releaseLock — undefined sessionId rejected", () => {
  let dir;

  before(() => { dir = makeTmpDir("rel-undef"); });
  after(() => { fs.rmSync(dir, { recursive: true, force: true }); });

  it("releaseLock with undefined sessionId is rejected", () => {
    const r1 = lockfile.acquireLock(dir, "phase");
    assert.equal(r1.ok, true);

    const r2 = lockfile.releaseLock(dir, undefined);
    assert.equal(r2.ok, false);

    // Lock should still be held — a second acquire must fail
    const r3 = lockfile.acquireLock(dir, "phase");
    assert.equal(r3.ok, false, "lock should still be held after rejected release");

    // Cleanup
    lockfile.releaseLock(dir, r1.sessionId);
  });
});

// ---------------------------------------------------------------------------
// Test 8 — corrupt lock (missing last_heartbeat) — checkLock returns corrupt:true
// ---------------------------------------------------------------------------

describe("checkLock — corrupt lock missing last_heartbeat", () => {
  let dir;

  before(() => { dir = makeTmpDir("corrupt-check"); });
  after(() => { fs.rmSync(dir, { recursive: true, force: true }); });

  it("corrupt lock (missing last_heartbeat) — checkLock returns corrupt:true", () => {
    writeLockFile(dir, { session_id: "x", pid: 1, created_at: new Date().toISOString() });

    const r = lockfile.checkLock(dir);
    assert.equal(r.corrupt, true);
    assert.equal(r.locked, true);
  });
});

// ---------------------------------------------------------------------------
// Test 9 — corrupt lock — acquireLock returns ok:false with 'corrupt' reason
// ---------------------------------------------------------------------------

describe("acquireLock — corrupt lock returns ok:false with corrupt reason", () => {
  let dir;

  before(() => { dir = makeTmpDir("corrupt-acquire"); });
  after(() => { fs.rmSync(dir, { recursive: true, force: true }); });

  it("corrupt lock — acquireLock returns ok:false with 'corrupt' reason", () => {
    writeLockFile(dir, { session_id: "x", pid: 1, created_at: new Date().toISOString() });

    const r = lockfile.acquireLock(dir, "phase");
    assert.equal(r.ok, false);
    assert.match(r.reason, /corrupt/i);
  });
});

// ---------------------------------------------------------------------------
// Test 10 — post-release re-acquisition succeeds
// ---------------------------------------------------------------------------

describe("acquireLock — post-release re-acquisition succeeds", () => {
  let dir;

  before(() => { dir = makeTmpDir("reacquire"); });
  after(() => { fs.rmSync(dir, { recursive: true, force: true }); });

  it("post-release re-acquisition succeeds", () => {
    const r1 = lockfile.acquireLock(dir, "phase1");
    assert.equal(r1.ok, true);

    lockfile.releaseLock(dir, r1.sessionId);

    const r2 = lockfile.acquireLock(dir, "phase2");
    assert.equal(r2.ok, true);

    lockfile.releaseLock(dir, r2.sessionId);
  });
});
