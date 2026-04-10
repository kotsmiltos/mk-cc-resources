"use strict";

const fs = require("fs");
const path = require("path");
const yamlIO = require("../../../lib/yaml-io");
const briefAssembly = require("../../../lib/brief-assembly");
const agentOutput = require("../../../lib/agent-output");
const synthesis = require("../../../lib/synthesis");
const tokens = require("../../../lib/tokens");
const paths = require("../../../lib/paths");

// Default perspective lenses
const DEFAULT_LENSES = [
  { id: "security", role: "Security Engineer", focus: "threats, attack surface, authentication, authorization, data protection" },
  { id: "infrastructure", role: "Infrastructure Engineer", focus: "scalability, deployment, monitoring, failure modes, resource constraints" },
  { id: "ux", role: "UX Engineer", focus: "user workflows, error handling, accessibility, performance perception" },
  { id: "testing", role: "Testing Engineer", focus: "testability, edge cases, acceptance criteria quality, coverage gaps" },
];

// Path relative to plugin root
const BRIEF_TEMPLATE_REL = "skills/research/templates/perspective-brief.md";
const VOCABULARY_REL = "defaults/vocabulary.yaml";

/**
 * Generate a simple unique ID for brief identification.
 * Uses timestamp + lens ID for deterministic-ish uniqueness.
 *
 * @param {string} lensId — perspective lens identifier
 * @returns {string}
 */
function generateBriefId(lensId) {
  const ts = Date.now().toString(36);
  return `res-${lensId}-${ts}`;
}

/**
 * Assemble perspective briefs for all lenses.
 *
 * @param {string} problemStatement — the problem to analyze
 * @param {string} pluginRoot — absolute path to essense-flow plugin root
 * @param {Object} config — pipeline config
 * @param {Array} [lenses] — override default lenses
 * @returns {{ ok: boolean, briefs?: Array<{ lensId: string, agentId: string, briefId: string, brief: string }>, error?: string }}
 */
function assemblePerspectiveBriefs(problemStatement, pluginRoot, config, lenses) {
  if (!problemStatement || typeof problemStatement !== "string" || !problemStatement.trim()) {
    return { ok: false, error: "Problem statement is required and must be a non-empty string" };
  }

  const activeLenses = lenses || DEFAULT_LENSES;
  if (activeLenses.length === 0) {
    return { ok: false, error: "At least one perspective lens is required" };
  }

  const templatePath = path.join(pluginRoot, BRIEF_TEMPLATE_REL);

  if (!fs.existsSync(templatePath)) {
    return { ok: false, error: `Brief template not found: ${templatePath}` };
  }

  const briefs = [];

  for (let i = 0; i < activeLenses.length; i++) {
    const lens = activeLenses[i];
    const briefId = generateBriefId(lens.id);
    const agentId = `research-${lens.id}`;
    const timestamp = new Date().toISOString();

    const bindings = {
      ROLE_LENS: lens.role,
      FOCUS_AREA: lens.focus,
      PROBLEM_STATEMENT: problemStatement,
      SIBLING_CONTEXT: "", // First batch — no sibling context
      BRIEF_ID: briefId,
      AGENT_ID: agentId,
      TIMESTAMP: timestamp,
    };

    // Build sections for budget checking
    const identity = `You are a ${lens.role} analyzing a software project proposal. Your sole concern is ${lens.focus}.`;
    const context = problemStatement;

    const sections = {
      identity,
      context,
    };

    const result = briefAssembly.assembleBrief({
      templatePath,
      bindings,
      sections,
      metadata: {
        briefId,
        phase: "research",
        batchIndex: 0,
        agentIndex: i,
      },
      config,
    });

    if (!result.ok) {
      return { ok: false, error: `Brief assembly failed for ${lens.id}: ${result.error}` };
    }

    briefs.push({
      lensId: lens.id,
      agentId,
      briefId,
      brief: result.brief,
    });
  }

  return { ok: true, briefs };
}

/**
 * Parse raw outputs from perspective agents.
 *
 * @param {Array<{ lensId: string, agentId: string, briefId: string, rawOutput: string }>} rawOutputs
 * @returns {{ ok: boolean, parsed?: Array<{ agentId: string, payload: Object, meta: Object }>, failures?: Array<{ agentId: string, failure: Object }> }}
 */
function parseAgentOutputs(rawOutputs) {
  const parsed = [];
  const failures = [];

  for (const { lensId, agentId, briefId, rawOutput } of rawOutputs) {
    const result = agentOutput.parseOutput(rawOutput);

    if (result.ok) {
      parsed.push({
        agentId,
        lensId,
        briefId,
        payload: result.payload,
        meta: result.meta,
        recovered: result.recovered || false,
      });
    } else {
      const failure = agentOutput.classifyFailure(rawOutput, result.error, {});
      failures.push({ agentId, lensId, briefId, failure });
    }
  }

  return {
    ok: failures.length === 0,
    parsed,
    failures: failures.length > 0 ? failures : undefined,
  };
}

/**
 * Run synthesis on parsed agent outputs and generate requirements document.
 *
 * @param {Array<{ agentId: string, payload: Object }>} parsedOutputs
 * @param {string} pluginRoot — path to plugin root
 * @param {Object} [vocabulary] — vocabulary.yaml content
 * @returns {{ synthesis: string, requirements: string }}
 */
function synthesizeAndGenerate(parsedOutputs, pluginRoot, vocabulary) {
  // Step 1: Extract entities
  const entities = synthesis.extractEntities(parsedOutputs, vocabulary);

  // Step 2: Build alignment matrix
  const matrix = synthesis.buildAlignmentMatrix(entities);

  // Step 3: Classify positions
  const classified = synthesis.classifyPositions(matrix);

  // Step 4: Compose synthesis document
  const synthDoc = synthesis.composeSynthesis(classified);

  // Step 5: Generate requirements from synthesis
  const requirements = generateRequirements(classified, parsedOutputs);

  return { synthesis: synthDoc, requirements };
}

/**
 * Generate a requirements document (REQ.md) from classified synthesis data.
 *
 * @param {Object} classified — output of classifyPositions
 * @param {Array<{ agentId: string, lensId?: string, payload: Object }>} parsedOutputs — for attribution
 * @returns {string} — markdown requirements document
 */
function generateRequirements(classified, parsedOutputs) {
  const lines = [];

  // Frontmatter
  lines.push("---");
  lines.push("artifact: requirements");
  lines.push("schema_version: 1");
  lines.push("produced_by: research");
  lines.push("consumed_by: architecture");
  lines.push(`generated_at: ${new Date().toISOString()}`);
  lines.push("---");
  lines.push("");

  // Project Intent
  lines.push("## Project Intent");
  lines.push("");
  lines.push("(Derived from research synthesis — see synthesis document for full analysis)");
  lines.push("");

  // Functional Requirements — from consensus + majority findings
  lines.push("## Functional Requirements");
  lines.push("");
  let frIndex = 1;
  const allFindings = [...classified.consensus, ...classified.majority];
  const frItems = allFindings.filter((item) => item.type === "requirement" || item.type === "analysis");

  if (frItems.length === 0) {
    lines.push("- [ ] **FR-001** — (no consensus requirements extracted — review synthesis) `VERIFY`");
  } else {
    for (const item of frItems) {
      const id = `FR-${String(frIndex).padStart(3, "0")}`;
      const content = Object.values(item.contents)[0] || item.name;
      lines.push(`- [ ] **${id}** — ${content} \`VERIFY\``);
      frIndex++;
    }
  }
  lines.push("");

  // Non-Functional Requirements — from consensus + majority constraints
  lines.push("## Non-Functional Requirements");
  lines.push("");
  let nfrIndex = 1;
  const nfrItems = [...classified.consensus, ...classified.majority].filter(
    (item) => item.type === "constraint"
  );

  if (nfrItems.length === 0) {
    lines.push("- [ ] **NFR-001** — (no consensus constraints extracted — review synthesis) `VERIFY`");
  } else {
    for (const item of nfrItems) {
      const id = `NFR-${String(nfrIndex).padStart(3, "0")}`;
      const content = Object.values(item.contents)[0] || item.name;
      lines.push(`- [ ] **${id}** — ${content} \`VERIFY\``);
      nfrIndex++;
    }
  }
  lines.push("");

  // Constraints — from all constraint-type entities
  lines.push("## Constraints");
  lines.push("");
  const constraintItems = [...classified.consensus, ...classified.majority, ...classified.unique].filter(
    (item) => item.type === "constraint"
  );
  if (constraintItems.length === 0) {
    lines.push("- (none identified)");
  } else {
    for (const item of constraintItems) {
      const content = Object.values(item.contents)[0] || item.name;
      lines.push(`- ${content}`);
    }
  }
  lines.push("");

  // Risks — from all risk-type entities
  lines.push("## Risks");
  lines.push("");
  lines.push("| ID       | Description              | Severity | Mitigation               |");
  lines.push("|----------|--------------------------|----------|--------------------------|");
  let riskIndex = 1;
  const riskItems = [...classified.consensus, ...classified.majority, ...classified.unique].filter(
    (item) => item.type === "risk"
  );
  if (riskItems.length === 0) {
    lines.push(`| RISK-001 | (none identified)        | —        | —                        |`);
  } else {
    for (const item of riskItems) {
      const id = `RISK-${String(riskIndex).padStart(3, "0")}`;
      const content = Object.values(item.contents)[0] || item.name;
      lines.push(`| ${id} | ${content} | — | — |`);
      riskIndex++;
    }
  }
  lines.push("");

  // Unresolved Disagreements — from split items
  lines.push("## Unresolved Disagreements");
  lines.push("");
  if (classified.split.length === 0) {
    lines.push("- (none — all perspectives aligned)");
  } else {
    for (const item of classified.split) {
      lines.push(`- **${item.name}** (${item.type}): agents disagree — requires architect resolution`);
      for (const [agentId, content] of Object.entries(item.contents)) {
        lines.push(`  - ${agentId}: ${content}`);
      }
    }
  }
  lines.push("");

  // Source Perspectives
  lines.push("## Source Perspectives");
  lines.push("");
  for (const output of parsedOutputs) {
    const label = output.lensId || output.agentId;
    const confidence = output.payload && output.payload.confidence
      ? output.payload.confidence
      : "(not reported)";
    lines.push(`- **${label}**: ${confidence}`);
  }
  lines.push("");

  // Unique Insights (appended as supplementary section)
  if (classified.unique.length > 0) {
    lines.push("## Unique Insights");
    lines.push("");
    lines.push("Items raised by a single perspective — valuable but unverified:");
    lines.push("");
    for (const item of classified.unique) {
      const agent = Object.keys(item.contents)[0];
      const content = item.contents[agent];
      lines.push(`- **${item.name}** (${item.type}) [source: ${agent}]: ${content}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Write requirements document to the pipeline directory.
 *
 * @param {string} pipelineDir — absolute path to .pipeline/
 * @param {string} requirements — requirements markdown content
 * @param {string} [synthesisDoc] — synthesis document to write alongside
 */
function writeRequirements(pipelineDir, requirements, synthesisDoc) {
  const reqDir = path.join(pipelineDir, "requirements");
  paths.ensureDir(reqDir);

  const reqPath = path.join(reqDir, "REQ.md");
  fs.writeFileSync(reqPath, requirements, "utf8");

  if (synthesisDoc) {
    const synthPath = path.join(reqDir, "synthesis.md");
    fs.writeFileSync(synthPath, synthesisDoc, "utf8");
  }

  return reqPath;
}

/**
 * Load vocabulary from pipeline dir (project-level) or plugin defaults.
 *
 * @param {string} pluginRoot — path to essense-flow plugin root
 * @param {string} [pipelineDir] — path to .pipeline/ (optional)
 * @returns {Object|null}
 */
function loadVocabulary(pluginRoot, pipelineDir) {
  if (pipelineDir) {
    const projectVocab = path.join(pipelineDir, "vocabulary.yaml");
    const data = yamlIO.safeReadWithFallback(projectVocab);
    if (data) return data;
  }
  const defaultVocab = path.join(pluginRoot, VOCABULARY_REL);
  return yamlIO.safeReadWithFallback(defaultVocab);
}

module.exports = {
  DEFAULT_LENSES,
  generateBriefId,
  assemblePerspectiveBriefs,
  parseAgentOutputs,
  synthesizeAndGenerate,
  generateRequirements,
  writeRequirements,
  loadVocabulary,
};
