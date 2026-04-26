"use strict";

const fs = require("fs");
const tokens = require("./tokens");

// Placeholder pattern: uppercase letters and underscores only
const PLACEHOLDER_PATTERN = /\{\{([A-Z][A-Z0-9_]*)\}\}/g;

/**
 * Split a document into optional YAML frontmatter and body.
 *
 * @param {string} text
 * @returns {{ frontmatter: string|null, body: string }}
 */
function splitFrontmatter(text) {
  if (!text) return { frontmatter: null, body: "" };

  // Must start with --- on first line
  const lines = text.split("\n");
  if (lines[0].trim() !== "---") {
    return { frontmatter: null, body: text };
  }

  // Find closing ---
  const closingIdx = lines.slice(1).findIndex((l) => l.trim() === "---");
  if (closingIdx === -1) {
    return { frontmatter: null, body: text };
  }

  const actualClosingIdx = closingIdx + 1; // offset from slice(1)
  const frontmatter = lines.slice(1, actualClosingIdx).join("\n");
  const body = lines.slice(actualClosingIdx + 1).join("\n");

  return { frontmatter, body };
}

/**
 * Extract unique placeholder names from a template string.
 *
 * @param {string} text
 * @returns {string[]}
 */
function extractPlaceholders(text) {
  if (!text) return [];
  const matches = new Set();
  let match;
  const pattern = new RegExp(PLACEHOLDER_PATTERN.source, "g");
  while ((match = pattern.exec(text)) !== null) {
    matches.add(match[1]);
  }
  return [...matches];
}

/**
 * Replace {{PLACEHOLDER}} tokens with values from bindings.
 * Unknown placeholders are left as-is.
 *
 * @param {string} text
 * @param {Object} bindings
 * @returns {string}
 */
function resolvePlaceholders(text, bindings) {
  if (!text) return text || "";
  return text.replace(new RegExp(PLACEHOLDER_PATTERN.source, "g"), (_m, key) => {
    return key in bindings ? String(bindings[key]) : `{{${key}}}`;
  });
}

/**
 * Wrap content in a <data-block> XML element with a source attribute.
 *
 * @param {string} content
 * @param {string} source — source label (e.g. "interface-spec")
 * @returns {string}
 */
function wrapDataBlock(content, source) {
  return `<data-block source="${source}">\n${content}\n</data-block>`;
}

/**
 * Truncate section content to a token budget.
 *
 * @param {string} content
 * @param {number} maxTokens
 * @param {string} sourceName — label used in truncation notice
 * @returns {{ text: string, truncated: boolean }}
 */
function truncateSection(content, maxTokens, sourceName) {
  const tokenCount = tokens.countTokens(content);
  if (tokenCount <= maxTokens) {
    return { text: content, truncated: false };
  }

  // Binary-search a character cut that fits under budget
  let lo = 0;
  let hi = content.length;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (tokens.countTokens(content.slice(0, mid)) <= maxTokens) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }

  const notice = `\n[truncated — original was ${tokenCount} tokens, see ${sourceName} for full content]`;
  const cut = content.slice(0, lo - 1);
  return { text: cut + notice, truncated: true };
}

/**
 * Format metadata as an HTML comment header block.
 *
 * @param {{ briefId: string, phase: string, batchIndex: number, agentIndex: number, parentBriefId?: string }} meta
 * @returns {string}
 */
function formatMetadataHeader(meta) {
  const lines = [
    "<!-- BRIEF-META",
    `  brief_id: ${meta.briefId}`,
    `  phase: ${meta.phase}`,
    `  batch_index: ${meta.batchIndex != null ? meta.batchIndex : "-"}`,
    `  agent_index: ${meta.agentIndex != null ? meta.agentIndex : "-"}`,
    `  timestamp: ${new Date().toISOString()}`,
  ];
  if (meta.parentBriefId) {
    lines.push(`  parent_brief_id: ${meta.parentBriefId}`);
  }
  lines.push("-->");
  return lines.join("\n");
}

/**
 * Load a template file, splitting frontmatter from body.
 *
 * @param {string} templatePath
 * @returns {{ frontmatter: string|null, body: string }}
 */
function loadTemplate(templatePath) {
  const text = fs.readFileSync(templatePath, "utf8");
  return splitFrontmatter(text);
}

/**
 * Assemble a brief from template body or file, with placeholder resolution,
 * per-section token truncation, and ceiling enforcement.
 *
 * @param {Object} options
 * @param {string} [options.templatePath] — path to .md template (mutually exclusive with templateBody)
 * @param {string} [options.templateBody] — inline template string
 * @param {Object} options.bindings — placeholder replacements
 * @param {Object} options.sections — section content map for budget checking
 * @param {Object} options.metadata — briefId, phase, batchIndex, agentIndex, parentBriefId?
 * @param {Object} options.config — pipeline config with token_budgets
 * @returns {{ ok: boolean, brief?: string, budget?: Object, truncations?: Array, error?: string }}
 */
function assembleBrief({ templatePath, templateBody, bindings, sections, metadata, config }) {
  try {
    // Require at least one template source
    if (!templatePath && !templateBody) {
      return { ok: false, error: "templatePath or templateBody required" };
    }

    let rawTemplate;
    if (templateBody) {
      rawTemplate = templateBody;
    } else {
      if (!fs.existsSync(templatePath)) {
        return { ok: false, error: `Template not found: ${templatePath}` };
      }
      const { body } = loadTemplate(templatePath);
      rawTemplate = body;
    }

    const cfg = config || {};
    const budgets = cfg.token_budgets || {};
    const ceiling = budgets.brief_ceiling || Infinity;
    const safetyPct = budgets.safety_margin_pct != null ? budgets.safety_margin_pct : 10;
    const effectiveCeiling = Number.isFinite(ceiling) ? Math.floor(ceiling * (1 - safetyPct / 100)) : Infinity;
    const sectionMax = budgets.section_max || effectiveCeiling;

    // Per-section truncation
    const truncations = [];
    const resolvedSections = {};

    for (const [key, value] of Object.entries(sections || {})) {
      if (typeof value !== "string") {
        resolvedSections[key] = value;
        continue;
      }
      const originalTokens = tokens.countTokens(value);
      const result = truncateSection(value, sectionMax, key);
      resolvedSections[key] = result.text;
      if (result.truncated) {
        truncations.push({
          section: key,
          originalTokens,
          truncatedTo: tokens.countTokens(result.text),
        });
      }
    }

    // Check total section token budget
    const totalSectionTokens = Object.values(resolvedSections).reduce((sum, v) => {
      return sum + (typeof v === "string" ? tokens.countTokens(v) : 0);
    }, 0);

    if (Number.isFinite(effectiveCeiling) && totalSectionTokens > effectiveCeiling) {
      return {
        ok: false,
        error: `Total section tokens (${totalSectionTokens}) exceeds effective ceiling of ${effectiveCeiling}`,
        budget: { briefTokens: totalSectionTokens, effectiveCeiling },
      };
    }

    // Resolve placeholders in template
    const resolved = resolvePlaceholders(rawTemplate, bindings || {});

    // Prepend metadata header
    const metaHeader = metadata ? formatMetadataHeader(metadata) + "\n\n" : "";
    const brief = metaHeader + resolved;

    // Final ceiling check on assembled brief
    const briefTokens = tokens.countTokens(brief);
    if (Number.isFinite(effectiveCeiling) && briefTokens > effectiveCeiling) {
      return {
        ok: false,
        error: `Assembled brief exceeds ceiling: ${briefTokens} tokens > ${effectiveCeiling}`,
        budget: { briefTokens, effectiveCeiling },
      };
    }

    const result = {
      ok: true,
      brief,
      budget: { briefTokens, effectiveCeiling },
    };

    if (truncations.length > 0) {
      result.truncations = truncations;
    }

    return result;
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

module.exports = {
  splitFrontmatter,
  extractPlaceholders,
  resolvePlaceholders,
  wrapDataBlock,
  truncateSection,
  formatMetadataHeader,
  loadTemplate,
  assembleBrief,
};
