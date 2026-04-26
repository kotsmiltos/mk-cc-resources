"use strict";

const crypto = require("crypto");
const tokens = require("./tokens");

// Structural element detection patterns
const INTERFACE_PATTERNS = [/expects\s+\w+\s+input/i, /returns\s+a\s+\w+/i, /accepts\s+\w+/i, /exposes\s+\w+/i];
const DEPENDENCY_PATTERNS = [/depends on\s+the\s+\w+/i, /requires\s+\w+\s+access/i, /imports from\s+\w+/i, /uses\s+the\s+\w+\s+module/i];
const EXPORT_PATTERNS = [/exports?\s+a?\s+\w+/i, /defines?\s+a?\s+\w+\s+(type|class|interface|function|schema)/i, /provides?\s+a?\s+\w+/i];
const ASSUMPTION_PATTERNS = [/assumes?\s+that\s+/i, /assuming\s+/i, /presumes?\s+/i];

// Contradiction pairs: if text A matches patA AND text B matches patB, it is a contradiction
const CONTRADICTION_PAIRS = [
  [/\bstateful\b/i, /\bstateless\b/i],
  [/\bshould\b(?!\s+not)/i, /\bshould\s+not\b/i],
  [/\bmust\b(?!\s+not)/i, /\bmust\s+not\b/i],
  [/\bnot\s+authenticated\b/i, /\bauthenticated\b(?!\s+not)/i],
];

/**
 * Extract structural elements (interfaces, dependencies, exports, assumptions)
 * from a parsed agent payload.
 *
 * @param {Object|null} payload
 * @returns {{ interfaces: string[], dependencies: string[], exports: string[], assumptions: string[] }}
 */
function extractStructuralElements(payload) {
  const empty = { interfaces: [], dependencies: [], exports: [], assumptions: [] };
  if (!payload || typeof payload !== "object") return empty;

  const text = Object.values(payload)
    .filter((v) => typeof v === "string")
    .join(" ");

  return {
    interfaces: extractByPatterns(text, INTERFACE_PATTERNS),
    dependencies: extractByPatterns(text, DEPENDENCY_PATTERNS),
    exports: extractByPatterns(text, EXPORT_PATTERNS),
    assumptions: extractByPatterns(text, ASSUMPTION_PATTERNS),
  };
}

function extractByPatterns(text, patterns) {
  const found = [];
  // Split into sentences for broader context extraction
  const sentences = text.split(/[.!?]+/).map((s) => s.trim()).filter((s) => s.length > 0);
  for (const pat of patterns) {
    for (const sentence of sentences) {
      if (pat.test(sentence)) {
        found.push(sentence);
        break; // one match per pattern per text block
      }
    }
  }
  return found;
}

/**
 * Detect if two text strings are contradictory.
 * Uses word overlap to ensure they're about the same topic.
 *
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
function areContradictory(a, b) {
  if (!a || !b) return false;
  const la = a.toLowerCase();
  const lb = b.toLowerCase();

  for (const [patA, patB] of CONTRADICTION_PAIRS) {
    // Check both directions
    const aMatchesA = patA.test(la);
    const bMatchesB = patB.test(lb);
    const aMatchesB = patB.test(la);
    const bMatchesA = patA.test(lb);

    if ((aMatchesA && bMatchesB) || (aMatchesB && bMatchesA)) {
      // Require word overlap to confirm same topic
      const wordsA = new Set(la.split(/\W+/).filter((w) => w.length > 3));
      const wordsB = new Set(lb.split(/\W+/).filter((w) => w.length > 3));
      const overlap = [...wordsA].filter((w) => wordsB.has(w));
      if (overlap.length >= 1) return true;
    }
  }

  return false;
}

/**
 * Check for naming collisions — two agents defining the same named symbol.
 * Extracts "defines a <Name>" / "exports a <Name>" patterns.
 *
 * @param {Array<{ agentId: string, payload: Object }>} siblings
 * @returns {Array<{ severity, category, agentsInvolved, description, evidence, suggestedResolution }>}
 */
function detectNamingCollisions(siblings) {
  const issues = [];
  // name -> list of agentIds that define it
  const definedBy = {};

  for (const { agentId, payload } of siblings) {
    if (!payload) continue;
    const text = Object.values(payload).filter((v) => typeof v === "string").join(" ");
    // Match any camelCase/PascalCase identifier after defines/exports
    const matches = text.matchAll(/(?:defines?|exports?)\s+a?\s*([a-zA-Z][a-zA-Z0-9]{2,})/gi);
    for (const m of matches) {
      const name = m[1];
      if (!definedBy[name]) definedBy[name] = [];
      if (!definedBy[name].includes(agentId)) definedBy[name].push(agentId);
    }
  }

  for (const [name, agents] of Object.entries(definedBy)) {
    if (agents.length > 1) {
      issues.push({
        severity: "blocking",
        category: "naming-collision",
        agentsInvolved: agents,
        description: `Multiple agents define "${name}"`,
        evidence: `${agents.join(", ")} all define ${name}`,
        suggestedResolution: `Rename one instance of "${name}" to avoid collision`,
      });
    }
  }

  return issues;
}

/**
 * Check for assumption divergence across agents.
 *
 * @param {Array<{ agentId: string, payload: Object }>} siblings
 * @returns {Array}
 */
function detectAssumptionDivergence(siblings) {
  const issues = [];
  const assumptions = [];

  for (const { agentId, payload } of siblings) {
    const elements = extractStructuralElements(payload);
    for (const a of elements.assumptions) {
      assumptions.push({ agentId, text: a });
    }
  }

  for (let i = 0; i < assumptions.length; i++) {
    for (let j = i + 1; j < assumptions.length; j++) {
      if (assumptions[i].agentId === assumptions[j].agentId) continue;
      if (areContradictory(assumptions[i].text, assumptions[j].text)) {
        issues.push({
          severity: "warning",
          category: "assumption-divergence",
          agentsInvolved: [assumptions[i].agentId, assumptions[j].agentId],
          description: `Contradictory assumptions: "${assumptions[i].text}" vs "${assumptions[j].text}"`,
          evidence: `${assumptions[i].agentId}: "${assumptions[i].text}" / ${assumptions[j].agentId}: "${assumptions[j].text}"`,
          suggestedResolution: "Clarify assumption in architecture document",
        });
      }
    }
  }

  return issues;
}

/**
 * Verify consistency across parsed sibling agent outputs.
 *
 * @param {Array<{ agentId: string, payload: Object }>|null} parsedOutputs
 * @returns {{ status: 'PASS'|'FAIL', issues: Array }}
 */
function verify(parsedOutputs) {
  if (!parsedOutputs || parsedOutputs.length < 2) {
    return { status: "PASS", issues: [] };
  }

  const issues = [
    ...detectNamingCollisions(parsedOutputs),
    ...detectAssumptionDivergence(parsedOutputs),
  ];

  const hasBlocking = issues.some((i) => i.severity === "blocking");
  return {
    status: hasBlocking ? "FAIL" : "PASS",
    issues,
  };
}

/**
 * Format a verification result into a human-readable markdown report.
 *
 * @param {{ status: string, issues: Array }} result
 * @returns {string}
 */
function formatVerificationReport(result) {
  const lines = [];
  lines.push(`# Consistency Verification: ${result.status}`);
  lines.push("");

  if (!result.issues || result.issues.length === 0) {
    lines.push("No issues found.");
    return lines.join("\n");
  }

  for (const issue of result.issues) {
    lines.push(`## [${issue.severity.toUpperCase()}] ${issue.category}`);
    lines.push(`**Agents:** ${(issue.agentsInvolved || []).join(", ")}`);
    lines.push(`**Description:** ${issue.description}`);
    if (issue.evidence) lines.push(`**Evidence:** ${issue.evidence}`);
    if (issue.suggestedResolution) lines.push(`**Resolution:** ${issue.suggestedResolution}`);
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Assemble a verifier brief from sibling agent outputs.
 *
 * @param {Array<{ agentId: string, payload: Object }>} siblings
 * @param {Object} config
 * @returns {{ ok: boolean, brief?: string, briefId?: string, agentId?: string, error?: string }}
 */
function assembleVerifierBrief(siblings, config) {
  if (!siblings || siblings.length === 0) {
    return { ok: false, error: "No sibling outputs provided" };
  }

  const briefId = `verify-${crypto.randomBytes(4).toString("hex")}`;
  const agentId = "consistency-verifier";

  const siblingBlocks = siblings.map(({ agentId: aid, payload }) => {
    const fields = Object.entries(payload || {})
      .map(([k, v]) => `  <${k}>${v}</${k}>`)
      .join("\n");
    return `<sibling agent_id="${aid}">\n${fields}\n</sibling>`;
  });

  const brief = [
    `<!-- BRIEF-META brief_id: ${briefId} agent_id: ${agentId} -->`,
    "",
    "## IDENTITY",
    "You are the consistency verifier for a multi-agent pipeline wave.",
    "",
    "## TASK",
    "Review the sibling agent outputs below. Check for these categories of issues:",
    "- interface-mismatch",
    "- dependency-conflict",
    "- naming-collision",
    "- contract-gap",
    "- assumption-divergence",
    "",
    "## SIBLING OUTPUTS",
    "",
    ...siblingBlocks,
    "",
    "## OUTPUT FORMAT",
    "Respond using this XML structure:",
    "<verification>",
    "  <status>PASS|FAIL</status>",
    "  <issues>",
    "    <issue>",
    "      <severity>blocking|warning</severity>",
    "      <category>naming-collision|interface-mismatch|...</category>",
    "      <agents>agent-id-1, agent-id-2</agents>",
    "      <description>What is wrong</description>",
    "      <evidence>Specific evidence</evidence>",
    "      <resolution>How to fix</resolution>",
    "    </issue>",
    "  </issues>",
    "</verification>",
    `<!-- SENTINEL:COMPLETE:${briefId}:${agentId} -->`,
  ].join("\n");

  return { ok: true, brief, briefId, agentId };
}

/**
 * Parse the verifier agent's XML output.
 *
 * @param {string} raw
 * @returns {{ ok: boolean, status?: string, issues?: Array, error?: string }}
 */
function parseVerifierOutput(raw) {
  if (!raw || !raw.trim()) {
    return { ok: false, error: "Empty verifier output" };
  }

  // Extract <verification> block
  const verifMatch = raw.match(/<verification>([\s\S]*?)<\/verification>/i);
  if (!verifMatch) {
    return { ok: false, error: "Missing <verification> block" };
  }

  const inner = verifMatch[1];

  // Extract status
  const statusMatch = inner.match(/<status>([\s\S]*?)<\/status>/i);
  const status = statusMatch ? statusMatch[1].trim().toUpperCase() : null;
  if (!status || !["PASS", "FAIL"].includes(status)) {
    return { ok: false, error: `Invalid status: "${status}"` };
  }

  // Extract issues
  const issues = [];
  const issuesBlock = inner.match(/<issues>([\s\S]*?)<\/issues>/i);
  if (issuesBlock) {
    const issueMatches = issuesBlock[1].matchAll(/<issue>([\s\S]*?)<\/issue>/gi);
    for (const m of issueMatches) {
      const issueText = m[1];
      // Extract a named tag's content — use a literal regex to avoid escaping issues
      const get = (tag) => {
        const re = new RegExp("<" + tag + ">([\\s\\S]*?)</" + tag + ">", "i");
        const match = issueText.match(re);
        return match ? match[1].trim() : null;
      };

      const agentsRaw = get("agents");
      const agentsInvolved = agentsRaw
        ? agentsRaw.split(/,\s*/).map((s) => s.trim()).filter(Boolean)
        : [];

      issues.push({
        severity: get("severity") || "warning",
        category: get("category") || "unknown",
        agentsInvolved,
        description: get("description") || "",
        evidence: get("evidence") || "",
        suggestedResolution: get("resolution") || "",
      });
    }
  }

  return { ok: true, status, issues };
}

module.exports = {
  extractStructuralElements,
  areContradictory,
  verify,
  formatVerificationReport,
  assembleVerifierBrief,
  parseVerifierOutput,
};
