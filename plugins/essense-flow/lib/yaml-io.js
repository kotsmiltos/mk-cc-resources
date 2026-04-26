"use strict";

const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");
const debug = require("./debug");
const { YAML_DUMP_OPTS } = require("./constants");

/**
 * Read and parse a YAML file. Throws on missing file or invalid YAML.
 *
 * @param {string} filePath — absolute path to YAML file
 * @returns {Object} parsed YAML content
 */
function safeRead(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  return yaml.load(content);
}

/**
 * Read and parse a YAML file. Returns null if file does not exist or YAML is invalid.
 *
 * @param {string} filePath — absolute path to YAML file
 * @returns {Object|null}
 */
function safeReadWithFallback(filePath, fallback, migrator) {
  const _fallback = fallback !== undefined ? fallback : null;
  try {
    if (!fs.existsSync(filePath)) return _fallback;
    const content = fs.readFileSync(filePath, "utf8");
    let data = yaml.load(content);
    // yaml.load("") returns undefined; treat as missing
    if (data === null || data === undefined || typeof data !== "object") return _fallback;
    if (migrator && typeof migrator === "function") {
      try {
        const migrated = migrator(data);
        // null is a valid migration result (caller intent); undefined means no-op
        if (migrated !== undefined) { data = migrated; }
        else process.stderr.write(`[essense-flow] yaml-io migrator returned undefined for ${filePath} — ignoring\n`);
      } catch (e) {
        process.stderr.write(`[essense-flow] yaml-io migration error for ${filePath}: ${e.message}\n`);
      }
    }
    return data;
  } catch (e) {
    process.stderr.write(`[essense-flow] yaml-io read error for ${filePath}: ${e.message}\n`);
    return _fallback;
  }
}

/**
 * Serialize an object to YAML and write it to a file.
 * Creates parent directories if they don't exist.
 *
 * @param {string} filePath — absolute path to write
 * @param {Object} data — data to serialize
 */
function safeWrite(filePath, data, options) {
  const backup = !options || options.backup !== false;
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const content = yaml.dump(data, YAML_DUMP_OPTS);
  const tmpPath = filePath + ".tmp";
  // Backup before overwrite — FR-010 recovery path (skipped for transient files)
  if (backup && fs.existsSync(filePath)) {
    const bakPath = filePath + ".bak";
    try {
      fs.copyFileSync(filePath, bakPath);
    } catch (bakErr) {
      process.stderr.write(`[essense-flow] WARNING: .bak write failed (${bakErr.message}); proceeding with primary write\n`);
    }
  }
  fs.writeFileSync(tmpPath, content, "utf8");
  try {
    fs.renameSync(tmpPath, filePath);
  } catch (e) {
    if (e.code === "EPERM") {
      // Windows: rename fails with EPERM under open read handles.
      // content is already in memory and .bak was written above — write directly.
      try { fs.unlinkSync(tmpPath); } catch (_) {}
      fs.writeFileSync(filePath, content, "utf8");
    } else {
      try { fs.unlinkSync(tmpPath); } catch (_) {}
      throw e;
    }
  }
  debug.trace("yaml-io:safeWrite", { file: filePath });
}

module.exports = { safeRead, safeReadWithFallback, safeWrite };
