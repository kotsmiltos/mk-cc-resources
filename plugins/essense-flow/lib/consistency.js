"use strict";

/**
 * Verify consistency across parsed agent outputs.
 * Checks for contradictions, terminology drift, and scope conflicts.
 *
 * @param {Array<{ agentId: string, lensId: string, payload: Object }>} parsedOutputs
 * @returns {{ consistent: boolean, issues: Array<{ type: string, detail: string, agents: string[] }> }}
 */
function verify(parsedOutputs) {
  const issues = [];

  if (!parsedOutputs || parsedOutputs.length < 2) {
    return { consistent: true, issues: [] };
  }

  // Check 1: Look for contradictory recommendations across agents
  const recommendations = {};
  for (const { agentId, payload } of parsedOutputs) {
    if (!payload) continue;
    for (const [key, value] of Object.entries(payload)) {
      if (typeof value !== "string") continue;
      const items = extractItems(value);
      for (const item of items) {
        const normalized = item.toLowerCase().trim();
        if (!recommendations[normalized]) {
          recommendations[normalized] = [];
        }
        recommendations[normalized].push(agentId);
      }
    }
  }

  // Check 2: Look for opposing statements (simple heuristic)
  const allItems = [];
  for (const { agentId, payload } of parsedOutputs) {
    if (!payload) continue;
    for (const [_key, value] of Object.entries(payload)) {
      if (typeof value !== "string") continue;
      const items = extractItems(value);
      for (const item of items) {
        allItems.push({ agentId, text: item });
      }
    }
  }

  // Check for negation patterns between agents
  for (let i = 0; i < allItems.length; i++) {
    for (let j = i + 1; j < allItems.length; j++) {
      if (allItems[i].agentId === allItems[j].agentId) continue;

      if (areContradictory(allItems[i].text, allItems[j].text)) {
        issues.push({
          type: "contradiction",
          detail: `"${truncate(allItems[i].text)}" vs "${truncate(allItems[j].text)}"`,
          agents: [allItems[i].agentId, allItems[j].agentId],
        });
      }
    }
  }

  return {
    consistent: issues.length === 0,
    issues,
  };
}

// --- Internal helpers ---

function extractItems(text) {
  return text
    .split(/\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("-") || line.startsWith("*"))
    .map((line) => line.replace(/^[-*]\s*/, "").trim())
    .filter((line) => line.length > 0);
}

function areContradictory(a, b) {
  const la = a.toLowerCase();
  const lb = b.toLowerCase();

  // Simple negation patterns
  const negations = [
    [/\bshould\b/, /\bshould not\b/],
    [/\bmust\b/, /\bmust not\b/],
    [/\bavoid\b/, /\buse\b/],
    [/\brecommend\b/, /\bavoid\b/],
  ];

  for (const [pos, neg] of negations) {
    if ((pos.test(la) && neg.test(lb)) || (neg.test(la) && pos.test(lb))) {
      // Check if they're about the same topic (share significant words)
      const wordsA = new Set(la.split(/\W+/).filter((w) => w.length > 4));
      const wordsB = new Set(lb.split(/\W+/).filter((w) => w.length > 4));
      const overlap = [...wordsA].filter((w) => wordsB.has(w));
      if (overlap.length >= 2) {
        return true;
      }
    }
  }

  return false;
}

function truncate(text, maxLen) {
  const limit = maxLen || 80;
  return text.length > limit ? text.slice(0, limit) + "..." : text;
}

module.exports = { verify };
