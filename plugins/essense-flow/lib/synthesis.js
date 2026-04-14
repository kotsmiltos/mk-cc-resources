"use strict";

// Entity types recognized during extraction
const ENTITY_TYPES = ["requirement", "analysis", "constraint", "risk", "component", "recommendation", "interface"];

/**
 * Extract named entities from parsed agent outputs.
 * Walks through payload sections and identifies typed items.
 *
 * @param {Array<{ agentId: string, payload: Object }>} parsedOutputs
 * @param {Object|null} vocabulary — optional vocabulary for term normalization
 * @returns {Array<{ name: string, type: string, agentId: string, content: string }>}
 */
function extractEntities(parsedOutputs, vocabulary) {
  const entities = [];
  const vocabMap = buildVocabMap(vocabulary);

  for (const { agentId, payload } of parsedOutputs) {
    if (!payload || typeof payload !== "object") continue;

    for (const [sectionKey, sectionContent] of Object.entries(payload)) {
      if (typeof sectionContent !== "string") continue;

      const type = inferEntityType(sectionKey);
      const items = splitIntoItems(sectionContent);

      for (const item of items) {
        const name = extractEntityName(item, vocabMap);
        entities.push({
          name,
          type,
          agentId,
          content: item,
        });
      }
    }
  }

  return entities;
}

/**
 * Build alignment matrix: group entities by normalized name across agents.
 *
 * @param {Array<{ name: string, type: string, agentId: string, content: string }>} entities
 * @returns {Object<string, { type: string, agents: Object<string, string> }>}
 */
function buildAlignmentMatrix(entities) {
  const matrix = {};

  for (const entity of entities) {
    const key = entity.name.toLowerCase().replace(/\s+/g, "_");

    if (!matrix[key]) {
      matrix[key] = {
        name: entity.name,
        type: entity.type,
        agents: {},
      };
    }

    matrix[key].agents[entity.agentId] = entity.content;
  }

  return matrix;
}

/**
 * Classify positions in alignment matrix by agreement level.
 *
 * @param {Object} matrix — output of buildAlignmentMatrix
 * @returns {{ consensus: Array, majority: Array, split: Array, unique: Array }}
 */
function classifyPositions(matrix) {
  const entries = Object.values(matrix);

  // Count total unique agents across all entries
  const allAgents = new Set();
  for (const entry of entries) {
    for (const agentId of Object.keys(entry.agents)) {
      allAgents.add(agentId);
    }
  }
  const totalAgents = allAgents.size;
  const majorityThreshold = Math.ceil(totalAgents / 2);

  const consensus = [];
  const majority = [];
  const split = [];
  const unique = [];

  for (const entry of entries) {
    const agentCount = Object.keys(entry.agents).length;
    const item = {
      name: entry.name,
      type: entry.type,
      contents: entry.agents,
    };

    if (agentCount === totalAgents) {
      consensus.push(item);
    } else if (agentCount >= majorityThreshold) {
      majority.push(item);
    } else if (agentCount === 1) {
      unique.push(item);
    } else {
      split.push(item);
    }
  }

  return { consensus, majority, split, unique };
}

/**
 * Compose a synthesis document from classified positions.
 *
 * @param {{ consensus: Array, majority: Array, split: Array, unique: Array }} classified
 * @returns {string} markdown synthesis document
 */
function composeSynthesis(classified) {
  const lines = [];

  lines.push("---");
  lines.push("artifact: synthesis");
  lines.push("schema_version: 1");
  lines.push(`generated_at: ${new Date().toISOString()}`);
  lines.push("---");
  lines.push("");
  lines.push("# Synthesis Report");
  lines.push("");

  // Summary
  lines.push("## Summary");
  lines.push("");
  lines.push(`- **Consensus items:** ${classified.consensus.length}`);
  lines.push(`- **Majority items:** ${classified.majority.length}`);
  lines.push(`- **Split items:** ${classified.split.length}`);
  lines.push(`- **Unique items:** ${classified.unique.length}`);
  lines.push("");

  // Consensus
  if (classified.consensus.length > 0) {
    lines.push("## Consensus (all agents agree)");
    lines.push("");
    for (const item of classified.consensus) {
      const content = Object.values(item.contents)[0] || "";
      lines.push(`- **${item.name}** (${item.type}): ${content}`);
    }
    lines.push("");
  }

  // Majority
  if (classified.majority.length > 0) {
    lines.push("## Majority (most agents agree)");
    lines.push("");
    for (const item of classified.majority) {
      const agents = Object.keys(item.contents).join(", ");
      const content = Object.values(item.contents)[0] || "";
      lines.push(`- **${item.name}** (${item.type}) [${agents}]: ${content}`);
    }
    lines.push("");
  }

  // Split
  if (classified.split.length > 0) {
    lines.push("## Split (agents disagree)");
    lines.push("");
    for (const item of classified.split) {
      lines.push(`- **${item.name}** (${item.type}):`);
      for (const [agentId, content] of Object.entries(item.contents)) {
        lines.push(`  - ${agentId}: ${content}`);
      }
    }
    lines.push("");
  }

  // Unique
  if (classified.unique.length > 0) {
    lines.push("## Unique (single agent)");
    lines.push("");
    for (const item of classified.unique) {
      const agent = Object.keys(item.contents)[0];
      const content = item.contents[agent];
      lines.push(`- **${item.name}** (${item.type}) [${agent}]: ${content}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

// --- Internal helpers ---

function buildVocabMap(vocabulary) {
  if (!vocabulary || !vocabulary.terms) return {};
  const map = {};
  for (const [canonical, aliases] of Object.entries(vocabulary.terms)) {
    map[canonical.toLowerCase()] = canonical;
    if (Array.isArray(aliases)) {
      for (const alias of aliases) {
        map[alias.toLowerCase()] = canonical;
      }
    }
  }
  return map;
}

function inferEntityType(sectionKey) {
  const key = sectionKey.toLowerCase();
  for (const type of ENTITY_TYPES) {
    if (key.includes(type) || key.includes(type + "s")) return type;
  }
  if (key.includes("risk") || key.includes("threat")) return "risk";
  if (key.includes("module") || key.includes("component") || key.includes("service")) return "component";
  if (key.includes("api") || key.includes("contract") || key.includes("interface")) return "interface";
  return "analysis";
}

function splitIntoItems(content) {
  // Split on markdown list items or double newlines
  const items = content
    .split(/\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("-") || line.startsWith("*") || line.startsWith("1."))
    .map((line) => line.replace(/^[-*]\s*/, "").replace(/^\d+\.\s*/, "").trim())
    .filter((line) => line.length > 0);

  // If no list items found, treat the whole content as one item
  if (items.length === 0 && content.trim().length > 0) {
    return [content.trim()];
  }

  return items;
}

function extractEntityName(item, vocabMap) {
  // Try to extract a bold name: **name** or a leading phrase before a colon/dash
  const boldMatch = item.match(/^\*\*(.+?)\*\*/);
  if (boldMatch) {
    const name = boldMatch[1].trim();
    return vocabMap[name.toLowerCase()] || name;
  }

  const colonMatch = item.match(/^([^:]{3,40}):/);
  if (colonMatch) {
    const name = colonMatch[1].trim();
    return vocabMap[name.toLowerCase()] || name;
  }

  // Use first N words as name
  const words = item.split(/\s+/).slice(0, 5).join(" ");
  return vocabMap[words.toLowerCase()] || words;
}

module.exports = { extractEntities, buildAlignmentMatrix, classifyPositions, composeSynthesis };
