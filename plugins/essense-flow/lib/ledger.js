"use strict";

const fs = require("fs");
const path = require("path");
const yamlIO = require("./yaml-io");

const LEDGER_SCHEMA_VERSION = 1;
const FIND_ID_PREFIX = "FIND-";
const FIND_ID_PAD = 3;

function formatFindId(n) {
  return `${FIND_ID_PREFIX}${String(n).padStart(FIND_ID_PAD, "0")}`;
}

function initLedger(ledgerPath) {
  if (fs.existsSync(ledgerPath)) {
    return readLedger(ledgerPath);
  }
  // Return skeleton in memory only — writeLedger is the single write point (DEC-039)
  return { schema_version: LEDGER_SCHEMA_VERSION, next_id: 1, findings: [] };
}

function readLedger(ledgerPath) {
  if (!fs.existsSync(ledgerPath)) {
    throw new Error(`confirmed-findings.yaml not found at ${ledgerPath}`);
  }
  const ledger = yamlIO.safeRead(ledgerPath);
  if (!ledger) throw new Error(`confirmed-findings.yaml could not be read: ${ledgerPath}`);
  if (ledger.schema_version !== LEDGER_SCHEMA_VERSION) {
    throw new Error(
      `confirmed-findings.yaml: expected schema_version ${LEDGER_SCHEMA_VERSION}, found ${ledger.schema_version}`
    );
  }
  // Recover next_id when the persisted value is missing/invalid. A corrupt
  // next_id silently produced "FIND-NaN" IDs in earlier versions; recovering
  // from the existing findings keeps assignFindIds total over its input.
  if (!Number.isFinite(ledger.next_id) || ledger.next_id < 1) {
    ledger.next_id = recoverNextId(ledger.findings || []);
  }
  return ledger;
}

// Pure — assigns FIND-IDs to an array of findings in memory, no file writes.
// Precondition: currentNextId is a positive finite integer. Callers go
// through readLedger / initLedger which guarantee this; passing undefined
// or NaN here is a programming error and is rejected loudly so corrupt
// ledger writes (FIND-NaN) cannot escape unnoticed.
function assignFindIds(findings, currentNextId) {
  if (!Number.isFinite(currentNextId) || currentNextId < 1) {
    throw new Error(
      `assignFindIds: currentNextId must be a positive finite integer, got ${currentNextId}. ` +
      `Use recoverNextId(existingFindings) to derive a valid value from a corrupt ledger.`
    );
  }
  let id = currentNextId;
  const updated = findings.map(f => ({ ...f, id: formatFindId(id++) }));
  return { updated, nextId: id };
}

// Recover next_id from existing findings when the counter field is absent/corrupt.
function recoverNextId(existingFindings) {
  if (!existingFindings || existingFindings.length === 0) return 1;
  const nums = existingFindings
    .map(f =>
      f.id && f.id.startsWith(FIND_ID_PREFIX)
        ? parseInt(f.id.slice(FIND_ID_PREFIX.length), 10)
        : 0
    )
    .filter(n => Number.isFinite(n) && n > 0);
  return nums.length > 0 ? Math.max(...nums) + 1 : 1;
}

// Atomic write with .bak — delegates to safeWrite which handles both internally.
function writeLedger(ledgerPath, ledger) {
  const dir = path.dirname(ledgerPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  yamlIO.safeWrite(ledgerPath, ledger);
}

module.exports = {
  initLedger,
  readLedger,
  assignFindIds,
  recoverNextId,
  writeLedger,
  formatFindId,
};
