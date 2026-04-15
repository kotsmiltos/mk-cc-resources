"use strict";

/**
 * Centralized error message catalog.
 * Each entry has a message template (with {param} placeholders) and recovery guidance.
 */
const ERRORS = {
  E_PHASE_INVALID: {
    message: "Cannot run {command} in phase {phase}. Expected: {expected}",
    recovery: "Check current phase with /status. Run the expected command first, or use /init to reset.",
  },
  E_ARTIFACT_MISSING: {
    message: "Required artifact not found: {path}",
    recovery: "Run the phase that produces this artifact. Check /status for the current pipeline state.",
  },
  E_ARTIFACT_STALE: {
    message: "Artifact {path} changed since {phase} ran. Run {command} to refresh",
    recovery: "The upstream artifact was modified after this phase consumed it. Re-run the upstream phase to bring artifacts back into sync.",
  },
  E_QUORUM_FAILED: {
    message: "Agent quorum not met: {received}/{required} agents returned valid output",
    recovery: "Re-run the current phase. If quorum fails repeatedly, check agent briefs for issues.",
  },
  E_AGENT_TIMEOUT: {
    message: "Agent {agentId} timed out after {ms}ms",
    recovery: "The agent did not respond in time. Re-run the phase or increase the timeout in config.yaml.",
  },
  E_LOCK_HELD: {
    message: "Pipeline locked by another session (started {timestamp}). Delete .pipeline/.lock to override",
    recovery: "Wait for the other session to finish, or delete .pipeline/.lock if the other session crashed.",
  },
  E_LOCK_STALE: {
    message: "Found stale lock (last heartbeat {timestamp}). Claim it?",
    recovery: "The previous session appears to have crashed. Claiming the lock will let you proceed.",
  },
  E_BUDGET_EXCEEDED: {
    message: "Brief for {agentId} is {tokens} tokens, exceeds ceiling of {ceiling}",
    recovery: "Reduce the brief content or increase the token ceiling in config.yaml.",
  },
  E_TRANSITION_INVALID: {
    message: "Cannot transition from {from} to {to}. Valid targets: {valid}",
    recovery: "Check the pipeline phase diagram. Use /status to see current phase and valid transitions.",
  },
  E_DECOMPOSITION_DEPTH: {
    message: "Decomposition depth {depth} exceeds max {max}",
    recovery: "The decomposition tree is too deep. Review the convergence summary and consider stopping.",
  },
  E_VERIFY_EXTRACTION_FAILED: {
    message: "Verify extraction failed: {reason} (attempt {retries})",
    recovery: "Check that the source artifact is well-formed and accessible. Inspect logs for the underlying cause and re-run the verify phase.",
  },
  E_VERIFY_STALE_CACHE: {
    message: "Verify cache is stale: cached hash {cached} does not match current hash {current}",
    recovery: "The source artifact changed since the last verify run. Re-run the verify phase to rebuild the cache against the current artifact.",
  },
  E_VERIFY_SPEC_MUTATED: {
    message: "SPEC.md mutated during verify: hash at start was {hash_start}, now {hash_current}",
    recovery: "Do not edit SPEC.md while verify is running. Restore the original SPEC.md or re-run the verify phase from the beginning.",
  },
  E_VERIFY_PARTIAL_REPORT: {
    message: "Verify report is incomplete: {failed} of {total} item groups failed to produce output",
    recovery: "Check agent logs for the failed groups. Re-run the verify phase; if failures persist, reduce items_per_group in config to narrow the failing scope.",
  },
  E_VERIFY_LOOP_LIMIT: {
    message: "Verify-elicit loop limit reached: limit is {limit}, current count is {count}",
    recovery: "The pipeline has cycled between verify and elicit too many times. Review the VERIFICATION-REPORT.md and SPEC.md manually to resolve outstanding gaps before retrying.",
  },
};

/**
 * Substitute {param} placeholders in a template string.
 *
 * @param {string} template — string with {key} placeholders
 * @param {Object} params — key-value pairs for substitution
 * @returns {string} — formatted string
 */
function _substitute(template, params) {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    if (key in params) return String(params[key]);
    return match; // leave unmatched placeholders as-is
  });
}

/**
 * Format an error message from the catalog.
 *
 * @param {string} code — error code (e.g., "E_PHASE_INVALID")
 * @param {Object} [params] — substitution parameters
 * @returns {string} — formatted error message
 * @throws {Error} if code is not in the catalog
 */
function formatError(code, params) {
  const entry = ERRORS[code];
  if (!entry) {
    throw new Error(`Unknown error code: "${code}". Valid codes: ${Object.keys(ERRORS).join(", ")}`);
  }
  return _substitute(entry.message, params);
}

/**
 * Get recovery guidance for an error code.
 *
 * @param {string} code — error code
 * @param {Object} [params] — substitution parameters
 * @returns {string} — recovery guidance
 * @throws {Error} if code is not in the catalog
 */
function formatRecovery(code, params) {
  const entry = ERRORS[code];
  if (!entry) {
    throw new Error(`Unknown error code: "${code}". Valid codes: ${Object.keys(ERRORS).join(", ")}`);
  }
  return _substitute(entry.recovery, params);
}

/**
 * Create a structured error object with code, message, and recovery.
 *
 * @param {string} code — error code
 * @param {Object} [params] — substitution parameters
 * @returns {{ code: string, message: string, recovery: string }}
 */
function makeError(code, params) {
  return {
    code,
    message: formatError(code, params),
    recovery: formatRecovery(code, params),
  };
}

module.exports = { ERRORS, formatError, formatRecovery, makeError };
