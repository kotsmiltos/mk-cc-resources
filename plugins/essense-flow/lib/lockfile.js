"use strict";

const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");
const yamlIO = require("./yaml-io");
const { STALE_THRESHOLD_MS, LOCK_FILE_NAME, LOCK_SCHEMA_VERSION } = require("./constants");

function _lockPath(pipelineDir) {
  return path.join(pipelineDir, LOCK_FILE_NAME);
}

/**
 * Read the lock file, returning null on any error (missing, corrupt, etc.).
 * Used internally to avoid throwing during stale-check reads.
 *
 * @param {string} lockPath
 * @returns {Object|null}
 */
function safeReadLock(lockPath) {
  return yamlIO.safeReadWithFallback(lockPath);
}

/**
 * Acquire an exclusive lock for the pipeline directory.
 * Uses O_EXCL atomic creation to prevent TOCTOU races.
 * If a stale lock is found (last_heartbeat older than STALE_THRESHOLD_MS),
 * it is deleted and acquisition is retried once.
 *
 * @param {string} pipelineDir
 * @param {string} [phase]
 * @returns {{ ok: boolean, reason?: string, lock?: Object }}
 */
function acquireLock(pipelineDir, phase) {
  const lockPath = _lockPath(pipelineDir);

  let fd;
  try {
    fd = fs.openSync(lockPath, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL);
  } catch (e) {
    if (e.code !== "EEXIST") throw e;
    // Lock file exists — check if stale
    const existing = safeReadLock(lockPath);
    if (!existing) return { ok: false, reason: "lock file unreadable" };
    // Corrupt lock: missing heartbeat — cannot determine staleness safely
    if (!existing.last_heartbeat) {
      return { ok: false, reason: "corrupt lock file — delete .pipeline/.lock to recover" };
    }
    const age = Date.now() - new Date(existing.last_heartbeat).getTime();
    // Treat NaN age (corrupt timestamp) as live — conservative, prevents hijack
    if (isNaN(age) || age < STALE_THRESHOLD_MS) {
      return { ok: false, reason: "live session holds lock", lock: existing };
    }
    // Stale — delete and retry once
    try { fs.unlinkSync(lockPath); } catch (e) { if (e.code !== "ENOENT") throw e; }
    try {
      fd = fs.openSync(lockPath, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL);
    } catch (_) {
      return { ok: false, reason: "concurrent lock acquisition" };
    }
  }

  const lockData = {
    schema_version: LOCK_SCHEMA_VERSION,
    session_id: new Date().toISOString() + "-" + process.pid,
    pid: process.pid,
    created_at: new Date().toISOString(),
    last_heartbeat: new Date().toISOString(),
    phase_at_lock: phase || "unknown",
  };
  try {
    fs.writeSync(fd, yaml.dump(lockData), 0, "utf8");
  } catch (e) {
    // Write failed (e.g. ENOSPC) — close and remove the empty lock so future acquires can proceed
    try { fs.closeSync(fd); } catch (_) {}
    try { fs.unlinkSync(lockPath); } catch (_) {}
    return { ok: false, reason: `lock write failed: ${e.message}` };
  }
  fs.closeSync(fd);
  return { ok: true, sessionId: lockData.session_id };
}

function releaseLock(pipelineDir, sessionId) {
  // Enforce caller identity — undefined/null sessionId bypasses the ownership check below
  if (!sessionId) {
    return { ok: false, reason: "sessionId required for release" };
  }
  const lockPath = _lockPath(pipelineDir);
  try {
    if (sessionId) {
      const existing = safeReadLock(lockPath);
      // If lock exists and belongs to a different session, refuse deletion
      if (existing && existing.session_id !== sessionId) {
        return { ok: false, reason: "session_id mismatch — refusing to release another session's lock" };
      }
    }
    fs.unlinkSync(lockPath);
    return { ok: true };
  } catch (e) {
    if (e.code === "ENOENT") return { ok: true }; // already gone — idempotent
    return { ok: false, error: e.message };
  }
}

function checkLock(pipelineDir) {
  const lockPath = _lockPath(pipelineDir);
  if (!fs.existsSync(lockPath)) {
    return { locked: false };
  }

  const lockInfo = safeReadLock(lockPath);
  if (!lockInfo) {
    // File exists but is completely unreadable — treat as corrupt locked state
    return { locked: true, stale: false, corrupt: true, reason: "lock file corrupt: missing last_heartbeat" };
  }
  if (!lockInfo.last_heartbeat) {
    return { locked: true, stale: false, corrupt: true, reason: "lock file corrupt: missing last_heartbeat" };
  }

  const age = Date.now() - new Date(lockInfo.last_heartbeat).getTime();
  return {
    locked: true,
    stale: age >= STALE_THRESHOLD_MS,
    lockInfo,
  };
}

function updateHeartbeat(pipelineDir) {
  const lockPath = _lockPath(pipelineDir);
  const lockData = safeReadLock(lockPath);
  if (!lockData) return { ok: false, error: "No lock to update" };

  lockData.last_heartbeat = new Date().toISOString();
  // tmp+rename for atomic write — prevents partial-content corruption on concurrent reads
  const tmpPath = lockPath + ".tmp";
  fs.writeFileSync(tmpPath, yaml.dump(lockData), "utf8");
  try {
    fs.renameSync(tmpPath, lockPath);
  } catch (e) {
    if (e.code === "EPERM") {
      // Windows: destination held open — fall back to copy, then clean up tmp
      try {
        fs.copyFileSync(tmpPath, lockPath);
      } catch (copyErr) {
        try { fs.unlinkSync(tmpPath); } catch (_) {}
        throw copyErr;
      }
      try { fs.unlinkSync(tmpPath); } catch (_) {}
    } else {
      try { fs.unlinkSync(tmpPath); } catch (_) {}
      throw e;
    }
  }
  return { ok: true };
}

module.exports = { acquireLock, releaseLock, checkLock, updateHeartbeat };
