'use strict';
// Date helpers for every report. The house rule (DECISIONS.md): ISO 8601 only, through this file.

function formatIso(date) {
  return date.toISOString().slice(0, 10);
}

module.exports = { formatIso };
