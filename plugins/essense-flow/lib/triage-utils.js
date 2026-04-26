"use strict";

const crypto = require("crypto");

/**
 * Compute a deterministic source string for a triage drop-history record.
 * Same passName + same filePaths (regardless of order) always produce the same string.
 * Different file sets produce different strings.
 *
 * @param {string} passName — name of the triage pass (e.g. "triage")
 * @param {string[]} filePaths — paths of files involved in this pass
 * @returns {string} — "{passName}::{sha256-hex}"
 */
function computeDropSource(passName, filePaths) {
  const sorted = [...filePaths].sort().join("\n");
  const hash = crypto.createHash("sha256").update(sorted).digest("hex");
  return `${passName}::${hash}`;
}

module.exports = { computeDropSource };
