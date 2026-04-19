"use strict";

/**
 * Pure merge truth table for the verify phase.
 *
 * Implements "worst-verdict-wins" merging across multiple agent results for a
 * single requirement item. No I/O, no side effects — independently testable.
 *
 * @module verify-merge
 */

// ---------------------------------------------------------------------------
// Ranking constants — lower rank = worse / higher severity
// ---------------------------------------------------------------------------

/**
 * Numeric rank for each verdict. Lower rank wins (is "worse").
 * @type {Object<string, number>}
 */
const VERDICT_ORDER = {
  GAP:        0,
  PARTIAL:    1,
  DEVIATED:   2,
  MATCH:      3,
  SKIPPED:    4,
  UNVERIFIED: 5,
};

/**
 * Numeric rank for each confidence level. Lower rank wins (is "stronger").
 * @type {Object<string, number>}
 */
const CONFIDENCE_ORDER = {
  CONFIRMED: 0,
  LIKELY:    1,
  SUSPECTED: 2,
};

// Verdicts that indicate a problem (GAP, PARTIAL, DEVIATED).
// Used to determine whether disagreement between agents should degrade confidence.
const PROBLEM_VERDICT_THRESHOLD = VERDICT_ORDER.DEVIATED;

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

/**
 * Return the worst (lowest-rank) verdict from an array of verdict strings.
 *
 * @param {string[]} verdicts
 * @returns {string}
 */
function worstVerdict(verdicts) {
  if (!verdicts || verdicts.length === 0) return null;
  // Validate upfront so single-element arrays (which skip reduce's callback)
  // also surface unknown verdicts.
  for (const v of verdicts) {
    if (VERDICT_ORDER[v] === undefined) {
      throw new Error(
        `Unknown verdict "${v}" — expected one of ${Object.keys(VERDICT_ORDER).join(", ")}`
      );
    }
  }
  return verdicts.reduce((best, v) =>
    VERDICT_ORDER[v] < VERDICT_ORDER[best] ? v : best
  );
}

/**
 * Return the best (lowest-rank / strongest) confidence from an array of
 * confidence strings.
 *
 * @param {string[]} confidences
 * @returns {string}
 */
function worstConfidence(confidences) {
  // Despite the name matching the spec, this returns the *strongest* confidence
  // (lowest CONFIDENCE_ORDER rank), which is the right value to carry forward
  // when multiple agents agree on the worst verdict.
  if (!confidences || confidences.length === 0) return null;
  for (const c of confidences) {
    if (CONFIDENCE_ORDER[c] === undefined) {
      throw new Error(
        `Unknown confidence "${c}" — expected one of ${Object.keys(CONFIDENCE_ORDER).join(", ")}`
      );
    }
  }
  return confidences.reduce((best, c) =>
    CONFIDENCE_ORDER[c] < CONFIDENCE_ORDER[best] ? c : best
  );
}

// ---------------------------------------------------------------------------
// Core merge logic
// ---------------------------------------------------------------------------

/**
 * @typedef {{ verdict: string, confidence: string, agentId: string, groupId: string }} AgentResult
 * @typedef {{ verdict: string, confidence: string, triggersRouting: boolean, contributingAgents: AgentResult[] }} MergedVerdict
 */

/**
 * Merge multiple agent results for one requirement item using worst-verdict-wins.
 *
 * Algorithm:
 *  1. Find the worst verdict across all results.
 *  2. Collect agents that returned that worst verdict.
 *  3a. If exactly one agent holds the worst verdict:
 *      - If that agent's confidence is SUSPECTED → merged confidence = LIKELY
 *        (lone dissenter with low certainty is degraded).
 *      - Else if all other agents returned only non-problem verdicts with CONFIRMED
 *        → merged confidence = LIKELY (consensus on "no issue" dilutes a lone
 *        CONFIRMED problem verdict).
 *      - Otherwise (at least one other agent also flagged a problem) → keep the
 *        lone agent's confidence as-is (corroborated indirectly by other problems).
 *  3b. If multiple agents share the worst verdict → best (strongest) confidence
 *      among them (consensus amplifies the strongest evidence).
 *
 * @param {AgentResult[]} agentResults
 * @returns {MergedVerdict}
 */
function mergeItemVerdicts(agentResults) {
  const worst = worstVerdict(agentResults.map((r) => r.verdict));

  const worstAgents  = agentResults.filter((r) => r.verdict === worst);
  const betterAgents = agentResults.filter((r) => r.verdict !== worst);

  let mergedConfidence;

  if (worstAgents.length === 1) {
    const soloConfidence = worstAgents[0].confidence;

    if (soloConfidence === "SUSPECTED") {
      // A lone SUSPECTED dissenter — weaker than a consensus; degrade to LIKELY.
      mergedConfidence = "LIKELY";
    } else {
      // Check whether every other agent reported a non-problem verdict with CONFIRMED.
      // When all dissenting agents are "clean" (CONFIRMED non-problem), the lone
      // problem reporter's certainty is diluted — degrade to LIKELY.
      const allOthersCleanConfirmed = betterAgents.every(
        (r) =>
          VERDICT_ORDER[r.verdict] > PROBLEM_VERDICT_THRESHOLD &&
          r.confidence === "CONFIRMED"
      );

      mergedConfidence = allOthersCleanConfirmed ? "LIKELY" : soloConfidence;
    }
  } else {
    // Multiple agents agree on the worst verdict — take the strongest confidence
    // among them (best evidence within consensus).
    mergedConfidence = worstConfidence(worstAgents.map((r) => r.confidence));
  }

  return {
    verdict: worst,
    confidence: mergedConfidence,
    triggersRouting: shouldRoute(worst, mergedConfidence),
    contributingAgents: agentResults,
  };
}

/**
 * Determine whether a verdict+confidence pair should trigger downstream routing
 * (e.g. escalation or remediation pipeline).
 *
 * Only CONFIRMED GAP or CONFIRMED PARTIAL routes — all other combinations return
 * false. A high-severity finding with anything less than CONFIRMED is not yet
 * certain enough to warrant automatic routing.
 *
 * @param {string} verdict
 * @param {string} confidence
 * @returns {boolean}
 */
function shouldRoute(verdict, confidence) {
  return confidence === "CONFIRMED" && (verdict === "GAP" || verdict === "PARTIAL");
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  VERDICT_ORDER,
  CONFIDENCE_ORDER,
  worstVerdict,
  worstConfidence,
  mergeItemVerdicts,
  shouldRoute,
};
