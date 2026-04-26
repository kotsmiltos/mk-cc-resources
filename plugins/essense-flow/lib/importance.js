"use strict";

/**
 * Importance declaration — `blocks_advance` is set at production time by this rule,
 * not inferred post-hoc by consumers. Keeps the rule explicit and grep-able.
 *
 * Rule: a finding blocks pipeline advance iff it is BOTH
 *   - severity: critical OR high
 *   - verdict (confidence tier): CONFIRMED
 *
 * Anything less certain (LIKELY/SUSPECTED) or less severe (medium/low) does not block.
 */

const BLOCKING_SEVERITIES = ["critical", "high"];
const BLOCKING_VERDICTS = ["CONFIRMED"];

function shouldBlockAdvance(severity, verdict) {
  return (
    BLOCKING_SEVERITIES.includes(severity) &&
    BLOCKING_VERDICTS.includes(verdict)
  );
}

/**
 * Convert boolean to the canonical yes|no string used in reports.
 */
function blocksAdvanceLabel(severity, verdict) {
  return shouldBlockAdvance(severity, verdict) ? "yes" : "no";
}

module.exports = {
  shouldBlockAdvance,
  blocksAdvanceLabel,
  BLOCKING_SEVERITIES,
  BLOCKING_VERDICTS,
};
