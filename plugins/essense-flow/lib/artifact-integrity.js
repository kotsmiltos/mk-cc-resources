"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");
const yamlIO = require("./yaml-io");
const { HASH_STORE_FILE, YAML_DUMP_OPTS } = require("./constants");
const { formatError } = require("./errors");

// Frontmatter delimiter used in Markdown artifact files
const FRONTMATTER_DELIMITER = "---\n";

const SCHEMA_VERSION = 1;

/**
 * Compute the SHA-256 hex digest of a file's contents.
 *
 * @param {string} filePath — absolute path to the file
 * @returns {string|null} hex digest, or null if the file does not exist
 */
function computeHash(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(content).digest("hex");
}

/**
 * Compute the SHA-256 hex digest of a buffer or string directly (without reading from disk).
 *
 * @param {string|Buffer} content
 * @returns {string} hex digest
 */
function computeHashFromContent(content) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

/**
 * Store a hash for a given relative path in the pipeline's hash store.
 *
 * @param {string} pipelineDir — absolute path to the .pipeline directory
 * @param {string} relativePath — path relative to pipelineDir (e.g. "elicitation/SPEC.md")
 * @param {string} hash — SHA-256 hex digest
 * @returns {{ ok: boolean }}
 */
function storeHash(pipelineDir, relativePath, hash) {
  const storePath = path.join(pipelineDir, HASH_STORE_FILE);

  const existing = yamlIO.safeReadWithFallback(storePath);
  const store = existing && typeof existing === "object"
    ? existing
    : { schema_version: SCHEMA_VERSION, hashes: {} };

  // Ensure structure is present even if the file existed with partial data
  if (!store.schema_version) store.schema_version = SCHEMA_VERSION;
  if (!store.hashes || typeof store.hashes !== "object") store.hashes = {};

  store.hashes[relativePath] = hash;

  yamlIO.safeWrite(storePath, store);
  return { ok: true };
}

/**
 * Verify a file's current hash against the stored hash.
 *
 * @param {string} pipelineDir — absolute path to the .pipeline directory
 * @param {string} relativePath — path relative to pipelineDir
 * @returns {{ ok: boolean, match?: boolean, stale?: boolean, storedHash?: string, currentHash?: string, error?: string }}
 */
function verifyHash(pipelineDir, relativePath) {
  const filePath = path.join(pipelineDir, relativePath);
  const currentHash = computeHash(filePath);

  if (currentHash === null) {
    return { ok: false, error: `File does not exist: ${relativePath}` };
  }

  const storePath = path.join(pipelineDir, HASH_STORE_FILE);
  const store = yamlIO.safeReadWithFallback(storePath);
  const storedHash =
    store && store.hashes && typeof store.hashes === "object"
      ? store.hashes[relativePath]
      : undefined;

  if (!storedHash) {
    return { ok: true, match: false, stale: false };
  }

  if (storedHash === currentHash) {
    return { ok: true, match: true };
  }

  return {
    ok: true,
    match: false,
    stale: true,
    storedHash,
    currentHash,
  };
}

/**
 * Write content to a file and store its hash atomically.
 *
 * The file is written first, then its hash is stored. If the hash store
 * write fails, the file exists but is unhashed — detectable on next verify.
 *
 * @param {string} pipelineDir — absolute path to the .pipeline directory
 * @param {string} relativePath — path relative to pipelineDir
 * @param {string|Buffer} content — file content to write
 * @returns {{ ok: boolean, hash: string }}
 */
function hashOnWrite(pipelineDir, relativePath, content) {
  const filePath = path.join(pipelineDir, relativePath);
  const dir = path.dirname(filePath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const tmpPath = filePath + ".tmp";
  fs.writeFileSync(tmpPath, content, typeof content === "string" ? "utf8" : undefined);
  fs.renameSync(tmpPath, filePath);

  const hash = computeHashFromContent(content);
  try {
    storeHash(pipelineDir, relativePath, hash);
  } catch (e) {
    return { ok: false, hash: null, error: e.message };
  }

  return { ok: true, hash };
}

/**
 * Validate a Markdown artifact's frontmatter for completion fields.
 *
 * Reads the file (if it exists), extracts the YAML frontmatter block between
 * the first and second `---\n` delimiters, and checks whether required
 * perspectives or passes have been completed.
 *
 * @param {string} filePath — absolute path to the artifact file
 * @returns {{ ok: boolean, error?: string }}
 */
module.exports = {
  computeHash,
  computeHashFromContent,
  storeHash,
  verifyHash,
  hashOnWrite,
};
