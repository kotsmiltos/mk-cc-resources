"use strict";

// Entity types recognized during extraction
const ENTITY_TYPES = ["requirement", "analysis", "constraint", "risk", "component", "recommendation", "interface"];

// Stopwords excluded from significant-word analysis
const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "is", "was", "are", "be", "been", "has", "have",
  "it", "its", "that", "this", "as", "from", "not", "no", "over", "into",
  "so", "if", "then", "than", "up", "do", "did", "can", "will", "may",
]);

// Minimum number of significant words required to declare content agreement
const CONTENT_AGREEMENT_MIN_WORDS = 3;
// Fraction of significant words that must overlap
const CONTENT_AGREEMENT_OVERLAP_RATIO = 0.5;

// Default fuzzy match threshold (Levenshtein distance)
const DEFAULT_FUZZY_THRESHOLD = 2;

/**
 * Compute Levenshtein distance between two strings.
 *
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
function levenshteinDistance(a, b) {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = 1 + Math.min(matrix[i - 1][j], matrix[i][j - 1], matrix[i - 1][j - 1]);
      }
    }
  }

  return matrix[a.length][b.length];
}

/**
 * Canonicalize a string: lowercase, strip punctuation (except spaces), collapse whitespace.
 *
 * @param {string} str
 * @returns {string}
 */
function canonicalize(str) {
  if (!str) return "";
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Build a normalizer function from a vocabulary map.
 * Vocabulary shape: { CanonicalTerm: { aliases: string[] }, _config?: { fuzzy_threshold: number } }
 *
 * The normalizer:
 * 1. Checks alias exact match (after canonicalize)
 * 2. Checks canonical-name exact match
 * 3. Fuzzy match within threshold (Levenshtein on canonicalized forms)
 * 4. Falls back to lowercased input
 *
 * @param {Object|null} vocabulary
 * @returns {function(string): string}
 */
function buildNormalizer(vocabulary) {
  if (!vocabulary) {
    return (term) => (term ? term.toLowerCase() : "");
  }

  const configKey = "_config";
  const fuzzyThreshold = (vocabulary[configKey] && vocabulary[configKey].fuzzy_threshold != null)
    ? vocabulary[configKey].fuzzy_threshold
    : DEFAULT_FUZZY_THRESHOLD;

  // Build alias → canonical map (all keys canonicalized)
  const aliasMap = {};
  const canonicals = [];

  for (const [canonical, spec] of Object.entries(vocabulary)) {
    if (canonical === configKey) continue;
    const canonKey = canonicalize(canonical);
    aliasMap[canonKey] = canonical.toLowerCase();
    canonicals.push({ canonical: canonical.toLowerCase(), canonKey });

    const aliases = (spec && spec.aliases) ? spec.aliases : [];
    for (const alias of aliases) {
      const aliasKey = canonicalize(alias);
      aliasMap[aliasKey] = canonical.toLowerCase();
    }
  }

  return function normalize(term) {
    if (!term) return "";
    const canonTerm = canonicalize(term);

    // Exact match in alias map
    if (aliasMap[canonTerm] !== undefined) {
      return aliasMap[canonTerm];
    }

    // Fuzzy match against canonical keys
    let bestMatch = null;
    let bestDist = Infinity;
    for (const { canonical, canonKey } of canonicals) {
      const dist = levenshteinDistance(canonTerm, canonKey);
      if (dist < bestDist) {
        bestDist = dist;
        bestMatch = canonical;
      }
    }

    if (bestDist <= fuzzyThreshold) {
      return bestMatch;
    }

    return term.toLowerCase();
  };
}

/**
 * Extract significant (non-stopword, length > 2) words from a string.
 *
 * @param {string|null} text
 * @returns {Set<string>}
 */
function significantWords(text) {
  if (!text) return new Set();
  return new Set(
    text
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w))
  );
}

/**
 * Check if two text strings have sufficient significant-word overlap to be considered in agreement.
 *
 * @param {string|null} a
 * @param {string|null} b
 * @returns {boolean}
 */
function contentAgreement(a, b) {
  const wordsA = significantWords(a);
  const wordsB = significantWords(b);

  if (wordsA.size < CONTENT_AGREEMENT_MIN_WORDS || wordsB.size < CONTENT_AGREEMENT_MIN_WORDS) {
    return false;
  }

  const overlap = [...wordsA].filter((w) => wordsB.has(w));
  const minSize = Math.min(wordsA.size, wordsB.size);
  return overlap.length / minSize >= CONTENT_AGREEMENT_OVERLAP_RATIO;
}

/**
 * Extract named entities from parsed agent outputs.
 *
 * @param {Array<{ agentId: string, payload: Object }>} parsedOutputs
 * @param {Object|null} vocabulary
 * @returns {Array<{ name: string, type: string, agentId: string, content: string }>}
 */
function extractEntities(parsedOutputs, vocabulary) {
  const entities = [];
  const normalize = buildNormalizer(vocabulary);

  for (const { agentId, payload } of parsedOutputs) {
    if (!payload || typeof payload !== "object") continue;

    for (const [sectionKey, sectionContent] of Object.entries(payload)) {
      if (typeof sectionContent !== "string") continue;

      const type = inferEntityType(sectionKey);
      const items = splitIntoItems(sectionContent);

      for (const item of items) {
        const rawName = extractEntityName(item, {});
        const name = normalize(rawName);
        entities.push({ name, type, agentId, content: item });
      }
    }
  }

  return entities;
}

/**
 * Build alignment matrix: group entities by name::type composite key.
 * For each entity group, pairwise compare agents using contentAgreement.
 * Returns a map of "name::type" → { name, type, positions: {agentId: "agrees"|"disagrees"|"silent"}, contents: {agentId: string} }
 *
 * @param {Array<{ name: string, type: string, agentId: string, content: string }>} entities
 * @returns {Object}
 */
function buildAlignmentMatrix(entities) {
  // Collect all unique agents
  const allAgents = new Set(entities.map((e) => e.agentId));

  // Group by name::type
  const groups = {};
  for (const entity of entities) {
    const key = `${entity.name}::${entity.type}`;
    if (!groups[key]) {
      groups[key] = { name: entity.name, type: entity.type, byAgent: {} };
    }
    groups[key].byAgent[entity.agentId] = entity.content;
  }

  const matrix = {};

  for (const [key, group] of Object.entries(groups)) {
    const agentIds = Object.keys(group.byAgent);
    const positions = {};
    const contents = { ...group.byAgent };

    // Mark silent agents
    for (const agentId of allAgents) {
      if (!group.byAgent[agentId]) {
        positions[agentId] = "silent";
      }
    }

    if (agentIds.length === 1) {
      // Single source — agrees with itself
      positions[agentIds[0]] = "agrees";
    } else if (agentIds.length === 2) {
      // Two agents: pairwise compare
      const [a1, a2] = agentIds;
      const agree = contentAgreement(group.byAgent[a1], group.byAgent[a2]);
      if (agree) {
        positions[a1] = "agrees";
        positions[a2] = "agrees";
      } else {
        // Split — both "disagrees" for symmetric 2-agent case
        positions[a1] = "disagrees";
        positions[a2] = "disagrees";
      }
    } else {
      // 3+ agents: find majority agreement group
      // All-pairs comparison — cluster by pairwise content agreement
      const agreementMatrix = {};
      for (let i = 0; i < agentIds.length; i++) {
        for (let j = i + 1; j < agentIds.length; j++) {
          const a = agentIds[i];
          const b = agentIds[j];
          const agree = contentAgreement(group.byAgent[a], group.byAgent[b]);
          if (!agreementMatrix[a]) agreementMatrix[a] = {};
          if (!agreementMatrix[b]) agreementMatrix[b] = {};
          agreementMatrix[a][b] = agree;
          agreementMatrix[b][a] = agree;
        }
      }

      // Count agreements per agent
      const agreeCounts = {};
      for (const agent of agentIds) {
        agreeCounts[agent] = Object.values(agreementMatrix[agent] || {}).filter(Boolean).length;
      }

      // Find majority threshold: more than half of other agents agree
      const majority = Math.floor(agentIds.length / 2);
      for (const agent of agentIds) {
        positions[agent] = agreeCounts[agent] >= majority ? "agrees" : "disagrees";
      }
    }

    matrix[key] = {
      name: group.name,
      type: group.type,
      positions,
      contents,
    };
  }

  return matrix;
}

/**
 * Classify positions in alignment matrix by agreement level.
 *
 * @param {Object} matrix
 * @returns {{ consensus: Array, majority: Array, split: Array, unique: Array }}
 */
function classifyPositions(matrix) {
  const consensus = [];
  const majority = [];
  const split = [];
  const unique = [];

  for (const [key, entry] of Object.entries(matrix)) {
    const positions = entry.positions || {};
    const agreeCount = Object.values(positions).filter((p) => p === "agrees").length;
    const totalNonSilent = Object.values(positions).filter((p) => p !== "silent").length;

    const item = {
      // name may be stored on entry, or derived from the composite key (e.g. "auth::req")
      name: entry.name || key.split("::")[0],
      type: entry.type,
      contents: entry.contents || {},
      positions,
    };

    if (agreeCount === totalNonSilent && totalNonSilent > 1) {
      consensus.push(item);
    } else if (agreeCount === 1 && totalNonSilent === 1) {
      unique.push(item);
    } else if (agreeCount > totalNonSilent / 2) {
      majority.push(item);
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
 * @returns {string}
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

  // Consensus
  lines.push("## Consensus");
  lines.push("");
  if (classified.consensus.length === 0) {
    lines.push("No items with full consensus.");
  } else {
    for (const item of classified.consensus) {
      const content = Object.values(item.contents)[0] || "";
      lines.push(`- **${item.name}** (${item.type}): ${content}`);
    }
  }
  lines.push("");

  // Majority agreement (not escalated)
  if (classified.majority.length > 0) {
    lines.push("## Majority Agreement");
    lines.push("");
    for (const item of classified.majority) {
      const agents = Object.keys(item.contents).join(", ");
      const content = Object.values(item.contents)[0] || "";
      lines.push(`- **${item.name}** (${item.type}) [${agents}]: ${content}`);
    }
    lines.push("");
  }

  // Disagreements
  lines.push("## Disagreements");
  lines.push("");
  if (classified.split.length === 0) {
    lines.push("No split items.");
  } else {
    for (const item of classified.split) {
      lines.push(`- **${item.name}** (${item.type}):`);
      for (const [agentId, content] of Object.entries(item.contents)) {
        lines.push(`  - ${agentId}: ${content}`);
      }
    }
  }
  lines.push("");

  // Unique Insights
  lines.push("## Unique Insights");
  lines.push("");
  if (classified.unique.length === 0) {
    lines.push("No unique single-source items.");
  } else {
    for (const item of classified.unique) {
      const agent = Object.keys(item.contents)[0];
      const content = item.contents[agent];
      lines.push(`- **${item.name}** (${item.type}) [single-source: ${agent}]: ${content}`);
    }
  }
  lines.push("");

  // Escalations
  lines.push("## Escalations");
  lines.push("");
  if (classified.split.length === 0) {
    lines.push("No items requiring user decision.");
  } else {
    for (const item of classified.split) {
      lines.push(`- **${item.name}**: REQUIRES USER DECISION`);
    }
  }
  lines.push("");

  return lines.join("\n");
}

/**
 * Validate coverage of confirmed findings in synthesized doc.
 *
 * @param {Array<{ payload: Object }>} rawOutputs
 * @param {string} synthesizedDoc
 * @returns {{ ok: boolean, missing?: Array }}
 */
function validateCoverage(rawOutputs, synthesizedDoc) {
  if (!synthesizedDoc || typeof synthesizedDoc !== "string") {
    return { ok: false, missing: [] };
  }

  const confirmed = [];
  for (const output of rawOutputs || []) {
    const payload = output && output.payload;
    if (!payload) continue;
    const findings = Array.isArray(payload.findings) ? payload.findings : [];
    for (const finding of findings) {
      if (finding && finding.status === "CONFIRMED") {
        confirmed.push(finding);
      }
    }
  }

  const missing = [];
  for (const finding of confirmed) {
    const needle = finding.id || finding.verbatim_quote || null;
    if (needle !== null && !synthesizedDoc.includes(needle)) {
      missing.push(finding);
    }
  }

  return missing.length === 0 ? { ok: true } : { ok: false, missing };
}

// --- Internal helpers ---

function inferEntityType(sectionKey) {
  const key = sectionKey.toLowerCase();
  for (const type of ENTITY_TYPES) {
    if (key.includes(type) || key.includes(type + "s")) return type;
  }
  if (key.includes("risk") || key.includes("threat")) return "risk";
  if (key.includes("module") || key.includes("component") || key.includes("service")) return "component";
  if (key.includes("api") || key.includes("contract") || key.includes("interface")) return "interface";
  // "findings" key maps to requirement (common pattern in research outputs)
  if (key.includes("finding")) return "requirement";
  return "analysis";
}

function splitIntoItems(content) {
  if (!content) return [];

  const items = content
    .split(/\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("-") || line.startsWith("*") || line.startsWith("1.") || /^\d+\./.test(line))
    .map((line) => line.replace(/^[-*]\s*/, "").replace(/^\d+\.\s*/, "").trim())
    .filter((line) => line.length > 0);

  if (items.length > 0) return items;

  // Fallback: split on double newlines (paragraphs)
  const paragraphs = content
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  if (paragraphs.length > 0) return paragraphs;

  if (content.trim().length > 0) return [content.trim()];
  return [];
}

function extractEntityName(item, _vocabMap) {
  // Bold pattern: **name**
  const boldMatch = item.match(/^\*\*(.+?)\*\*/);
  if (boldMatch) return boldMatch[1].replace(/:$/, "").trim();

  // Dash separator: Name — description
  const dashMatch = item.match(/^([^—]{3,40})\s*—/);
  if (dashMatch) return dashMatch[1].trim();

  // Colon separator: Name: description
  const colonMatch = item.match(/^([^:]{3,40}):/);
  if (colonMatch) return colonMatch[1].trim();

  // Fallback: first 5 words
  return item.split(/\s+/).slice(0, 5).join(" ");
}

module.exports = {
  splitIntoItems,
  extractEntityName,
  buildNormalizer,
  canonicalize,
  levenshteinDistance,
  significantWords,
  contentAgreement,
  extractEntities,
  buildAlignmentMatrix,
  classifyPositions,
  composeSynthesis,
  validateCoverage,
};
