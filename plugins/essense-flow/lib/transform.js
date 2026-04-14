"use strict";

const tokens = require("./tokens");

/**
 * Transform a task spec into an agent-friendly markdown (.agent.md) format.
 * Injects architecture context, reformats for agent consumption,
 * and validates against token budgets.
 *
 * @param {string} spec — raw task specification content
 * @param {string} architectureContext — ARCH.md content for context injection
 * @param {Object} config — pipeline config
 * @returns {{ ok: boolean, agentMd?: string, tokenCount?: number, warnings?: string[], error?: string }}
 */
function transformToAgentMd(spec, architectureContext, config) {
  try {
    if (!spec || typeof spec !== "string" || !spec.trim()) {
      return { ok: false, error: "Task spec is empty or invalid" };
    }

    const warnings = [];

    // Build the agent markdown
    const sections = [];

    // Architecture context (trimmed if too large)
    if (architectureContext) {
      const archTokens = tokens.countTokens(architectureContext);
      const contextLimit = config && config.token_budgets
        ? Math.floor((config.token_budgets.section_max || 4000) * 0.9)
        : 3600;

      if (archTokens > contextLimit) {
        warnings.push(`Architecture context truncated from ${archTokens} to ~${contextLimit} tokens`);
        // Approximate truncation by character count
        const charLimit = Math.floor(contextLimit * 3.5);
        sections.push("## Architecture Context (truncated)");
        sections.push("");
        sections.push(architectureContext.slice(0, charLimit) + "\n\n[... truncated for token budget]");
      } else {
        sections.push("## Architecture Context");
        sections.push("");
        sections.push(architectureContext);
      }
      sections.push("");
    }

    // Task spec
    sections.push("## Task Specification");
    sections.push("");
    sections.push(spec);
    sections.push("");

    // Completion sentinel
    sections.push("## Completion");
    sections.push("");
    sections.push("When you have completed this task:");
    sections.push("1. Verify all acceptance criteria are met");
    sections.push("2. Ensure code compiles/lints without errors");
    sections.push("3. Confirm no regressions in related functionality");
    sections.push("");

    const agentMd = sections.join("\n");
    const tokenCount = tokens.countTokens(agentMd);

    // Check against brief ceiling
    if (config && config.token_budgets && config.token_budgets.brief_ceiling) {
      const ceiling = config.token_budgets.brief_ceiling;
      const safetyPct = config.token_budgets.safety_margin_pct || 10;
      const effectiveCeiling = Math.floor(ceiling * (1 - safetyPct / 100));

      if (tokenCount > effectiveCeiling) {
        warnings.push(`Agent markdown is ${tokenCount} tokens, exceeds effective ceiling of ${effectiveCeiling}`);
      }
    }

    return {
      ok: true,
      agentMd,
      tokenCount,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

module.exports = { transformToAgentMd };
