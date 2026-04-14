"use strict";

const fs = require("fs");

/**
 * Create a directory if it doesn't exist (idempotent, recursive).
 *
 * @param {string} dirPath — absolute path to directory
 */
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

module.exports = { ensureDir };
