"use strict";

const fs = require("fs");
const path = require("path");
const yamlIO = require("./yaml-io");

const LOCK_FILE = ".lock";
// 5 minutes — typical session idle timeout. A heartbeat older than this
// indicates the session crashed or was abandoned.
const STALE_THRESHOLD_MS = 300000;

function _lockPath(pipelineDir) {
  return path.join(pipelineDir, LOCK_FILE);
}

function acquireLock(pipelineDir) {
  const lockPath = _lockPath(pipelineDir);

  // Check for existing lock
  if (fs.existsSync(lockPath)) {
    const existing = yamlIO.safeReadWithFallback(lockPath);
    if (existing && existing.heartbeat) {
      const age = Date.now() - new Date(existing.heartbeat).getTime();
      if (age < STALE_THRESHOLD_MS) {
        return { ok: false, error: `Pipeline locked by another session (started ${existing.session_start}, PID ${existing.pid})` };
      }
      // Stale — overwrite
    }
  }

  const lockData = {
    session_start: new Date().toISOString(),
    heartbeat: new Date().toISOString(),
    pid: process.pid,
  };
  yamlIO.safeWrite(lockPath, lockData);
  return { ok: true };
}

function releaseLock(pipelineDir) {
  const lockPath = _lockPath(pipelineDir);
  try {
    if (fs.existsSync(lockPath)) {
      fs.unlinkSync(lockPath);
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

function checkLock(pipelineDir) {
  const lockPath = _lockPath(pipelineDir);
  if (!fs.existsSync(lockPath)) {
    return { locked: false };
  }

  const lockInfo = yamlIO.safeReadWithFallback(lockPath);
  if (!lockInfo || !lockInfo.heartbeat) {
    return { locked: false };
  }

  const age = Date.now() - new Date(lockInfo.heartbeat).getTime();
  return {
    locked: true,
    stale: age >= STALE_THRESHOLD_MS,
    lockInfo,
  };
}

function updateHeartbeat(pipelineDir) {
  const lockPath = _lockPath(pipelineDir);
  const lockData = yamlIO.safeReadWithFallback(lockPath);
  if (!lockData) return { ok: false, error: "No lock to update" };

  lockData.heartbeat = new Date().toISOString();
  yamlIO.safeWrite(lockPath, lockData);
  return { ok: true };
}

module.exports = { STALE_THRESHOLD_MS, acquireLock, releaseLock, checkLock, updateHeartbeat };
