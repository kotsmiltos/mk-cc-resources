"use strict";

const fs = require("fs");
const tokens = require("./tokens");

/**
 * Assemble a brief from a template file, replacing {{BINDING}} placeholders.
 *
 * @param {Object} options
 * @param {string} options.templatePath — path to .md template file
 * @param {Object} options.bindings — template variable bindings
 * @param {Object} options.sections — section content for budget checking
 * @param {Object} options.metadata — metadata (briefId, phase, batchIndex, agentIndex)
 * @param {Object} options.config — pipeline config for token budgets
 * @returns {{ ok: boolean, brief?: string, error?: string }}
 */
function assembleBrief({ templatePath, bindings, sections, metadata, config }) {
  try {
    if (!fs.existsSync(templatePath)) {
      return { ok: false, error: `Template not found: ${templatePath}` };
    }

    // Check token budget before assembly
    if (sections && config) {
      const budgetCheck = tokens.checkBudget(sections, config);
      if (!budgetCheck.ok) {
        return { ok: false, error: `Budget exceeded: ${budgetCheck.error}` };
      }
    }

    let template = fs.readFileSync(templatePath, "utf8");

    // Replace all {{BINDING}} placeholders
    for (const [key, value] of Object.entries(bindings || {})) {
      const pattern = new RegExp(`\\{\\{${key}\\}\\}`, "g");
      template = template.replace(pattern, value != null ? String(value) : "");
    }

    // Inject metadata as YAML comment block at the top if present
    if (metadata) {
      const metaBlock = [
        `<!-- brief-meta`,
        `  briefId: ${metadata.briefId || "unknown"}`,
        `  phase: ${metadata.phase || "unknown"}`,
        `  batchIndex: ${metadata.batchIndex != null ? metadata.batchIndex : "-"}`,
        `  agentIndex: ${metadata.agentIndex != null ? metadata.agentIndex : "-"}`,
        `-->`,
        "",
      ].join("\n");
      template = metaBlock + template;
    }

    return { ok: true, brief: template };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * Wrap content in a labeled data block (fenced code block with type annotation).
 *
 * @param {string} content — content to wrap
 * @param {string} blockType — label for the block (e.g. "requirements", "task-specs")
 * @returns {string}
 */
function wrapDataBlock(content, blockType) {
  return `\`\`\`${blockType}\n${content}\n\`\`\``;
}

module.exports = { assembleBrief, wrapDataBlock };
