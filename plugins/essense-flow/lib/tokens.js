"use strict";

const { CHARS_PER_TOKEN, AGENT_BRIEF_OVERHEAD_TOKENS } = require("./constants");

/**
 * Estimate token count for a string.
 * Uses character-based approximation (no external tokenizer dependency).
 *
 * @param {string} text — input text
 * @returns {number} estimated token count
 */
function countTokens(text) {
  if (!text || typeof text !== "string") return 0;
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/**
 * Check whether sections fit within token budgets defined in config.
 *
 * @param {Object} sections — map of section name to content string (e.g. { identity, context })
 * @param {Object} config — pipeline config with token_budgets
 * @returns {{ ok: boolean, error?: string, details?: Object }}
 */
function checkBudget(sections, config) {
  if (!config || !config.token_budgets) {
    return { ok: true };
  }

  const budgets = config.token_budgets;
  const safetyPct = budgets.safety_margin_pct || 10;
  const safetyFactor = 1 - safetyPct / 100;

  const details = {};
  const errors = [];

  // Check individual section limits
  const sectionLimits = {
    identity: budgets.identity_max,
    constraints: budgets.constraints_max,
  };

  for (const [name, content] of Object.entries(sections)) {
    if (typeof content !== "string") continue;

    const count = countTokens(content);
    const limit = sectionLimits[name] || budgets.section_max;

    if (limit) {
      const effectiveLimit = Math.floor(limit * safetyFactor);
      details[name] = { tokens: count, limit: effectiveLimit };

      if (count > effectiveLimit) {
        errors.push(`Section "${name}" is ${count} tokens, exceeds limit of ${effectiveLimit}`);
      }
    }
  }

  // Check total against brief ceiling
  const totalTokens = Object.values(sections)
    .filter((v) => typeof v === "string")
    .reduce((sum, content) => sum + countTokens(content), 0);

  const briefCeiling = budgets.brief_ceiling;
  if (briefCeiling) {
    const effectiveCeiling = Math.floor(briefCeiling * safetyFactor);
    details.total = { tokens: totalTokens, limit: effectiveCeiling };

    if (totalTokens > effectiveCeiling) {
      errors.push(`Total is ${totalTokens} tokens, exceeds ceiling of ${effectiveCeiling}`);
    }
  }

  if (errors.length > 0) {
    return { ok: false, error: errors.join("; "), details };
  }

  return { ok: true, details };
}

/**
 * Compute adaptive brief ceiling based on SPEC.md size.
 * When a rich spec exists, the brief ceiling scales to accommodate it
 * (spec tokens + overhead for agent instructions), capped at max_brief_ceiling.
 * Falls back to default brief_ceiling when no spec content provided.
 *
 * @param {string|null} specContent — raw SPEC.md content (null if no spec)
 * @param {Object} config — pipeline config with token_budgets
 * @returns {number} effective brief ceiling in tokens
 */
function adaptiveBriefCeiling(specContent, config) {
  const budgets = (config && config.token_budgets) || {};
  const defaultCeiling = budgets.brief_ceiling || 12000;
  const maxCeiling = budgets.max_brief_ceiling || 100000;

  if (!specContent || typeof specContent !== "string") {
    return defaultCeiling;
  }

  const specTokens = countTokens(specContent);
  return Math.min(Math.max(defaultCeiling, specTokens + AGENT_BRIEF_OVERHEAD_TOKENS), maxCeiling);
}

module.exports = { countTokens, checkBudget, adaptiveBriefCeiling };
