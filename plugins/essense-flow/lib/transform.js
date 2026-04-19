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

    // Architecture context is referenced by path, not re-embedded. Agents have
    // Read — they pull ARCH.md themselves. Embedding ARCH.md per task is the
    // waste pattern prior #4/#7 targets.
    const sections = [];

    if (architectureContext) {
      sections.push("## Architecture Context");
      sections.push("");
      sections.push("Read `.pipeline/architecture/ARCH.md` for module boundaries, interface contracts, and decisions that apply to this task.");
      sections.push("");
    }

    sections.push("## Task Specification");
    sections.push("");
    sections.push(spec);
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
