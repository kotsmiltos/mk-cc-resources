"use strict";

const fs = require("fs");
const yaml = require("js-yaml");

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
function safeReadWithFallback(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const content = fs.readFileSync(filePath, "utf8");
    return yaml.load(content) || null;
  } catch (_e) {
    return null;
  }
}

/**
 * Serialize an object to YAML and write it to a file.
 * Creates parent directories if they don't exist.
 *
 * @param {string} filePath — absolute path to write
 * @param {Object} data — data to serialize
 */
function safeWrite(filePath, data) {
  const path = require("path");
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const content = yaml.dump(data, { lineWidth: 120, noRefs: true });
  const tmpPath = filePath + ".tmp";
  fs.writeFileSync(tmpPath, content, "utf8");
  fs.renameSync(tmpPath, filePath);
}

module.exports = { safeRead, safeReadWithFallback, safeWrite };
