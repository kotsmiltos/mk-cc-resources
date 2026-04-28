"use strict";

const crypto = require("crypto");

// Sentinel pattern: <!-- SENTINEL:COMPLETE:briefId:agentId -->
const SENTINEL_PATTERN = /<!--\s*SENTINEL:COMPLETE:([^\s:]+):([^\s]+)\s*-->/;

/**
 * Detect completion sentinel in raw agent output.
 *
 * @param {string|null} rawOutput
 * @returns {{ found: boolean, briefId?: string, agentId?: string }}
 */
function detectSentinel(rawOutput) {
  if (!rawOutput || typeof rawOutput !== "string") {
    return { found: false };
  }
  const match = rawOutput.match(SENTINEL_PATTERN);
  if (!match) return { found: false };
  return { found: true, briefId: match[1], agentId: match[2] };
}

/**
 * Extract content of a named XML-style tag from text.
 *
 * @param {string} text
 * @param {string} tagName
 * @returns {string|null}
 */
function extractTag(text, tagName) {
  if (!text || !tagName) return null;
  // Match <tagName ...>content</tagName>
  const pattern = new RegExp(`<${tagName}(?:[^>]*)>([\\s\\S]*?)<\\/${tagName}>`, "i");
  const match = text.match(pattern);
  return match ? match[1] : null;
}

/**
 * Extract all child tags from a text block as a flat key-value map.
 *
 * @param {string|null} text
 * @returns {Object}
 */
function extractChildTags(text) {
  if (!text) return {};
  const result = {};
  const pattern = /<(\w[\w-]*)(?:[^>]*)>([\s\S]*?)<\/\1>/g;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    result[match[1]] = match[2];
  }
  return result;
}

/**
 * Parse a comma-separated list of numbers into an integer array.
 *
 * @param {string} str
 * @returns {number[]}
 */
function parseCriteriaList(str) {
  if (!str || !str.trim()) return [];
  return str
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => parseInt(s, 10))
    .filter((n) => !isNaN(n));
}

/**
 * Parse structured output from an agent response.
 * Expects <agent-output> XML envelope with <meta>, <payload>, <self-assessment>.
 * Falls back to lenient tag extraction when envelope is absent.
 *
 * @param {string|null} rawOutput
 * @returns {{ ok: boolean, meta?: Object, payload?: Object, selfAssessment?: Object, recovered?: boolean, error?: string }}
 */
function parseOutput(rawOutput) {
  if (!rawOutput || typeof rawOutput !== "string" || !rawOutput.trim()) {
    return { ok: false, error: "Empty or invalid output" };
  }

  // Full envelope parse
  const envelope = extractTag(rawOutput, "agent-output");
  if (envelope) {
    const metaBlock = extractTag(envelope, "meta");
    const payloadBlock = extractTag(envelope, "payload");
    const assessBlock = extractTag(envelope, "self-assessment");

    const meta = metaBlock ? extractChildTags(metaBlock) : {};
    const payloadRaw = payloadBlock ? extractChildTags(payloadBlock) : {};
    const assessRaw = assessBlock ? extractChildTags(assessBlock) : {};

    const selfAssessment = {
      criteria_met: parseCriteriaList(assessRaw.criteria_met || ""),
      criteria_uncertain: parseCriteriaList(assessRaw.criteria_uncertain || ""),
      criteria_failed: parseCriteriaList(assessRaw.criteria_failed || ""),
      deviations: assessRaw.deviations || "",
    };

    return { ok: true, meta, payload: payloadRaw, selfAssessment, recovered: false };
  }

  // Lenient recovery: try to extract any XML tags
  const loose = extractChildTags(rawOutput);
  if (loose && Object.keys(loose).length > 0) {
    return { ok: true, meta: {}, payload: loose, selfAssessment: {}, recovered: true };
  }

  // Fallback: try YAML/JSON code blocks. \r?\n so CRLF agent output
  // (Windows) parses identically to LF.
  const yamlBlockPattern = /```(?:yaml|yml)\r?\n([\s\S]*?)```/g;
  const jsonBlockPattern = /```(?:json)\r?\n([\s\S]*?)```/g;
  let blockPayload = null;

  const yamlMatches = [...rawOutput.matchAll(yamlBlockPattern)];
  if (yamlMatches.length > 0) {
    try {
      const jsYaml = require("js-yaml");
      blockPayload = jsYaml.load(yamlMatches[yamlMatches.length - 1][1]);
    } catch (_e) {}
  }

  if (!blockPayload) {
    const jsonMatches = [...rawOutput.matchAll(jsonBlockPattern)];
    if (jsonMatches.length > 0) {
      try {
        blockPayload = JSON.parse(jsonMatches[jsonMatches.length - 1][1]);
      } catch (_e) {}
    }
  }

  if (blockPayload && typeof blockPayload === "object") {
    return { ok: true, meta: {}, payload: blockPayload, selfAssessment: {}, recovered: true };
  }

  return { ok: false, error: "Could not extract structured data from output" };
}

/**
 * Generate a unique instance ID for an agent invocation.
 *
 * @param {string} phase
 * @param {string} role
 * @param {string|number|null} sprint
 * @returns {string}
 */
function generateAgentInstanceId(phase, role, sprint) {
  return `${phase}-${role}-${sprint ?? "null"}-${new Date().toISOString()}-${crypto.randomBytes(2).toString("hex")}`;
}

/**
 * Validate that each result has required fields (agent_instance_id, status).
 *
 * @param {Array<Object>} results
 * @returns {Array<Object>}
 */
function validateRequiredFields(results) {
  return (results || []).map((result) => {
    if (!result || !result.ok) return result;
    const payload = result.payload || {};
    if (!payload.agent_instance_id || !payload.status) {
      return { ...result, ok: false, error: "Missing required fields: agent_instance_id or status" };
    }
    return result;
  });
}

/**
 * Classify failure mode from context.
 *
 * @param {string|null} rawOutput
 * @param {string|null} error
 * @param {Object} context — { timedOut?, retryCount? }
 * @returns {{ mode: string, recoverable: boolean, detail?: string }}
 */
function classifyFailure(rawOutput, error, context) {
  const ctx = context || {};

  if (ctx.timedOut) {
    return { mode: "timeout", recoverable: true };
  }

  if (typeof ctx.retryCount === "number" && ctx.retryCount > 0) {
    return { mode: "retry_exhausted", recoverable: false };
  }

  // If output contains sentinel but no valid envelope → malformed XML
  if (rawOutput && SENTINEL_PATTERN.test(rawOutput)) {
    return { mode: "malformed_xml", recoverable: true };
  }

  // Envelope present but truncated or no sentinel
  if (rawOutput && rawOutput.includes("<agent-output")) {
    return { mode: "missing_sentinel", recoverable: false, detail: "truncated output" };
  }

  // Empty / no output
  return { mode: "missing_sentinel", recoverable: false };
}

/**
 * Check if quorum is met for a given quorum type.
 *
 * @param {Array<{ ok: boolean, agentId: string }>} results
 * @param {string} quorumType
 * @param {Object} config
 * @returns {{ met: boolean, required: number, received: number, missing?: string[] }}
 */
function checkQuorum(results, quorumType, config) {
  const total = results.length;
  const okResults = results.filter((r) => r.ok);
  const received = okResults.length;

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
    const nMinusMatch = String(rule).match(/^n-(\d+)$/);
    if (nMinusMatch) {
      required = Math.max(1, total - parseInt(nMinusMatch[1], 10));
    } else {
      required = total;
    }
  }

  const met = received >= required;
  const result = { met, required, received };

  if (!met) {
    // Report which agentIds are missing (those with ok=false)
    result.missing = results.filter((r) => !r.ok).map((r) => r.agentId).filter(Boolean);
  }

  return result;
}

/**
 * Build a retry brief by appending retry context to the original brief.
 *
 * @param {string} originalBrief
 * @param {string} agentId
 * @param {{ mode: string, detail?: string }} failure
 * @returns {string}
 */
function retryAgent(originalBrief, agentId, failure) {
  const retryBlock = [
    "",
    "<!-- RETRY CONTEXT -->",
    `Agent: ${agentId}`,
    `Failure mode: ${failure.mode}`,
    failure.detail ? `Detail: ${failure.detail}` : null,
    "Please ensure your response ends with: <!-- SENTINEL:COMPLETE:{briefId}:{agentId} -->",
    "<!-- END RETRY CONTEXT -->",
  ]
    .filter((line) => line !== null)
    .join("\n");

  return originalBrief + retryBlock;
}

/**
 * Handle failures across a batch of agents, deciding retry / proceed / escalate.
 *
 * @param {Array<{ agentId: string, briefId: string, failure: Object, retryCount?: number }>} failures
 * @param {Array<{ agentId: string }>} parsed — successfully parsed results
 * @param {string} quorumType
 * @param {Object} config — { quorum, retry: { max_per_agent, allow_partial_synthesis } }
 * @returns {{ action: 'retry'|'proceed'|'escalate', retries?: Array, gaps?: string[], detail?: string }}
 */
function handleFailures(failures, parsed, quorumType, config) {
  const retry = (config && config.retry) || {};
  const maxPerAgent = retry.max_per_agent != null ? retry.max_per_agent : 1;
  const allowPartial = retry.allow_partial_synthesis !== false;

  // Partition failures into recoverable-and-within-retry vs terminal
  const retryable = [];
  const terminal = [];

  for (const f of failures) {
    const retryCount = f.retryCount || 0;
    const recoverable = f.failure && f.failure.recoverable;
    if (recoverable && retryCount < maxPerAgent) {
      retryable.push(f);
    } else {
      terminal.push(f);
    }
  }

  // If there are retryable failures, retry them first
  if (retryable.length > 0) {
    return { action: "retry", retries: retryable };
  }

  // All failures are terminal — check if quorum is still met
  const allResults = [
    ...parsed.map((p) => ({ ok: true, agentId: p.agentId })),
    ...terminal.map((f) => ({ ok: false, agentId: f.agentId })),
  ];

  const quorumResult = checkQuorum(allResults, quorumType, config);

  if (quorumResult.met && allowPartial) {
    return {
      action: "proceed",
      gaps: terminal.map((f) => f.agentId),
    };
  }

  return {
    action: "escalate",
    detail: `Quorum not met for ${quorumType}: required ${quorumResult.required}, received ${quorumResult.received}`,
    gaps: terminal.map((f) => f.agentId),
  };
}

module.exports = {
  detectSentinel,
  extractTag,
  extractChildTags,
  parseCriteriaList,
  parseOutput,
  classifyFailure,
  checkQuorum,
  generateAgentInstanceId,
  validateRequiredFields,
  retryAgent,
  handleFailures,
};
