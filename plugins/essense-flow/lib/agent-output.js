"use strict";

/**
 * Parse structured output from an agent response.
 * Agents return markdown that may contain YAML/JSON code blocks with structured data.
 *
 * @param {string} rawOutput — raw agent output text
 * @returns {{ ok: boolean, payload?: Object, meta?: Object, error?: string, recovered?: boolean }}
 */
function parseOutput(rawOutput) {
  if (!rawOutput || typeof rawOutput !== "string" || !rawOutput.trim()) {
    return { ok: false, error: "Empty or invalid output" };
  }

  // Try to extract structured data from fenced code blocks (YAML or JSON)
  const yamlBlockPattern = /```(?:yaml|yml)\n([\s\S]*?)```/g;
  const jsonBlockPattern = /```(?:json)\n([\s\S]*?)```/g;

  let payload = null;
  let recovered = false;

  // Try YAML blocks first
  const yamlMatches = [...rawOutput.matchAll(yamlBlockPattern)];
  if (yamlMatches.length > 0) {
    try {
      const yaml = require("js-yaml");
      // Use the last YAML block (most likely the structured output)
      payload = yaml.load(yamlMatches[yamlMatches.length - 1][1]);
    } catch (_e) {
      // Fall through to JSON attempt
    }
  }

  // Try JSON blocks
  if (!payload) {
    const jsonMatches = [...rawOutput.matchAll(jsonBlockPattern)];
    if (jsonMatches.length > 0) {
      try {
        payload = JSON.parse(jsonMatches[jsonMatches.length - 1][1]);
      } catch (_e) {
        // Fall through to recovery
      }
    }
  }

  // Recovery: try to parse the entire output as YAML
  if (!payload) {
    try {
      const yaml = require("js-yaml");
      const parsed = yaml.load(rawOutput);
      if (parsed && typeof parsed === "object") {
        payload = parsed;
        recovered = true;
      }
    } catch (_e) {
      // Not parseable
    }
  }

  // Recovery: extract key-value pairs from markdown sections
  if (!payload) {
    payload = extractSectionsFromMarkdown(rawOutput);
    if (payload && Object.keys(payload).length > 0) {
      recovered = true;
    } else {
      return { ok: false, error: "Could not extract structured data from output" };
    }
  }

  const meta = {
    rawLength: rawOutput.length,
    extractedAt: new Date().toISOString(),
    recovered,
  };

  return { ok: true, payload, meta, recovered };
}

/**
 * Extract section content from markdown headings as a fallback parser.
 */
function extractSectionsFromMarkdown(text) {
  const sections = {};
  const headingPattern = /^#{1,3}\s+(.+)$/gm;
  const matches = [...text.matchAll(headingPattern)];

  for (let i = 0; i < matches.length; i++) {
    const name = matches[i][1].trim().toLowerCase().replace(/\s+/g, "_");
    const start = matches[i].index + matches[i][0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
    const content = text.slice(start, end).trim();
    if (content) {
      sections[name] = content;
    }
  }

  return Object.keys(sections).length > 0 ? sections : null;
}

/**
 * Classify the type of failure when output parsing fails.
 *
 * @param {string} rawOutput — the raw output that failed to parse
 * @param {string} error — the error message from parsing
 * @param {Object} context — additional context
 * @returns {Object} failure classification
 */
function classifyFailure(rawOutput, error, context) {
  const classification = {
    type: "unknown",
    error,
    recoverable: false,
    rawLength: rawOutput ? rawOutput.length : 0,
  };

  if (!rawOutput || rawOutput.trim().length === 0) {
    classification.type = "empty_output";
    classification.recoverable = false;
  } else if (error && error.includes("timeout")) {
    classification.type = "timeout";
    classification.recoverable = true;
  } else if (rawOutput.length < 50) {
    classification.type = "truncated";
    classification.recoverable = true;
  } else {
    classification.type = "parse_error";
    classification.recoverable = false;
  }

  return classification;
}

/**
 * Check if quorum is met for a given quorum type.
 *
 * @param {Array<{ ok: boolean, agentId: string }>} results — agent results
 * @param {string} quorumType — quorum key from config (e.g. "architecture_perspective")
 * @param {Object} config — pipeline config with quorum settings
 * @returns {{ met: boolean, required: number, received: number }}
 */
function checkQuorum(results, quorumType, config) {
  const total = results.length;
  const received = results.filter((r) => r.ok).length;

  const quorumConfig = config && config.quorum ? config.quorum : {};
  const rule = quorumConfig[quorumType] || "all";

  let required;
  if (rule === "all") {
    required = total;
  } else if (rule === "n-1") {
    required = Math.max(1, total - 1);
  } else if (typeof rule === "number") {
    required = rule;
  } else {
    // Parse "n-X" patterns
    const nMinusMatch = String(rule).match(/^n-(\d+)$/);
    if (nMinusMatch) {
      required = Math.max(1, total - parseInt(nMinusMatch[1], 10));
    } else {
      required = total;
    }
  }

  return {
    met: received >= required,
    required,
    received,
  };
}

module.exports = { parseOutput, classifyFailure, checkQuorum };
