"use strict";

const fs = require("fs");
const path = require("path");
const yamlIO = require("../../../lib/yaml-io");
const briefAssembly = require("../../../lib/brief-assembly");
const agentOutput = require("../../../lib/agent-output");
const synthesis = require("../../../lib/synthesis");
const tokens = require("../../../lib/tokens");
const paths = require("../../../lib/paths");
const { SPEC_PATH, REQ_PATH } = require("../../../lib/constants");

/**
 * Load SPEC.md from the elicitation directory, strip YAML frontmatter.
 * Returns null if no SPEC.md exists.
 *
 * @param {string} pipelineDir — absolute path to .pipeline/
 * @returns {{ ok: boolean, content?: string, tokenCount?: number, error?: string } | null}
 */
function loadSpec(pipelineDir) {
  const specPath = path.join(pipelineDir, "elicitation", "SPEC.md");
  if (!fs.existsSync(specPath)) return null;

  const raw = fs.readFileSync(specPath, "utf8");
  // Strip YAML frontmatter (--- delimited block at start of file)
  const stripped = raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "").trim();
  if (!stripped) return null;

  // Verify SPEC.md hasn't changed since last hash — block if stale
  try {
    const integrity = require("../../../lib/artifact-integrity");
    const check = integrity.verifyHash(pipelineDir, SPEC_PATH);
    if (check.ok && check.stale) {
      return {
        ok: false,
        stale: true,
        error: "SPEC.md changed since research last ran. Downstream artifacts (REQ.md) may not reflect the current design. Re-run /research to refresh, or use /research --full to start fresh.",
        storedHash: check.storedHash,
        currentHash: check.currentHash,
      };
    }
  } catch (_e) { /* integrity check unavailable — proceed without blocking */ }

  return {
    ok: true,
    content: stripped,
    tokenCount: tokens.countTokens(stripped),
  };
}

// Default perspective lenses
const DEFAULT_LENSES = [
  { id: "security", role: "Security Engineer", focus: "threats, attack surface, authentication, authorization, data protection" },
  { id: "infrastructure", role: "Infrastructure Engineer", focus: "scalability, deployment, monitoring, failure modes, resource constraints" },
  { id: "ux", role: "UX Engineer", focus: "user workflows, error handling, accessibility, performance perception" },
  { id: "testing", role: "Testing Engineer", focus: "testability, edge cases, acceptance criteria quality, coverage gaps" },
];

// Domain-specific perspective registries — each maps to a set of lenses
// tailored for that project type. "default" → null signals fallback to DEFAULT_LENSES.
const PERSPECTIVE_REGISTRY = {
  "game": [
    { id: "gameplay", role: "Gameplay Systems Designer", focus: "game mechanics, balance, progression, player agency, feedback loops" },
    { id: "game-ux", role: "Game UX Specialist", focus: "player experience, onboarding, controls, accessibility, game feel" },
    { id: "performance", role: "Game Performance Engineer", focus: "frame rate, memory, asset loading, optimization, platform constraints" },
    { id: "content", role: "Content Systems Architect", focus: "content pipeline, procedural generation, data-driven design, modding support" },
  ],
  "web-app": [
    { id: "security", role: "Security/Auth Engineer", focus: "authentication, authorization, data protection, OWASP, session management" },
    { id: "api", role: "API Design Specialist", focus: "REST/GraphQL design, versioning, rate limiting, pagination, error contracts" },
    { id: "data", role: "Data Modeling Engineer", focus: "schema design, migrations, indexing, query patterns, data integrity" },
    { id: "scalability", role: "Scalability Architect", focus: "horizontal scaling, caching, CDN, load balancing, async processing" },
  ],
  "cli-tool": [
    { id: "usability", role: "CLI Usability Engineer", focus: "command structure, help text, error messages, discoverability, shell integration" },
    { id: "error-handling", role: "Error Handling Specialist", focus: "failure modes, recovery, diagnostics, logging, exit codes" },
    { id: "cross-platform", role: "Cross-Platform Engineer", focus: "OS compatibility, file paths, shell differences, CI environments" },
    { id: "integration", role: "Integration Architect", focus: "piping, scripting, automation, config files, environment variables" },
  ],
  "library": [
    { id: "api-surface", role: "API Surface Designer", focus: "public API, naming, ergonomics, type safety, backwards compatibility" },
    { id: "performance", role: "Performance Engineer", focus: "algorithmic efficiency, memory allocation, hot paths, benchmarking" },
    { id: "testing", role: "Testing Strategist", focus: "unit testing, property testing, fuzz testing, coverage, test ergonomics" },
    { id: "packaging", role: "Packaging Specialist", focus: "distribution, versioning, bundling, tree-shaking, dependency management" },
  ],
  "data-pipeline": [
    { id: "reliability", role: "Data Reliability Engineer", focus: "exactly-once processing, checkpointing, recovery, data quality" },
    { id: "scale", role: "Scale Architect", focus: "throughput, partitioning, backpressure, resource management" },
    { id: "observability", role: "Observability Engineer", focus: "metrics, tracing, alerting, debugging, data lineage" },
    { id: "schema", role: "Schema Evolution Specialist", focus: "schema changes, backwards compatibility, data migration, validation" },
  ],
  "plugin": [
    { id: "host-integration", role: "Host Integration Specialist", focus: "host API surface, lifecycle hooks, isolation, versioning, compatibility" },
    { id: "dx", role: "Developer Experience Engineer", focus: "setup, configuration, debugging, documentation, error messages" },
    { id: "resilience", role: "Plugin Resilience Engineer", focus: "error handling, host crashes, state corruption, recovery, graceful degradation" },
    { id: "architecture", role: "Plugin Architecture Reviewer", focus: "separation of concerns, extensibility, dependency management, testing" },
  ],
  "default": null, // signals: use DEFAULT_LENSES
};

// Keyword indicators per domain for classification
const DOMAIN_KEYWORDS = {
  "game": ["player", "level", "score", "dungeon", "inventory", "combat", "quest"],
  "web-app": ["api", "endpoint", "auth", "database", "rest", "graphql", "session", "route"],
  "cli-tool": ["command", "flag", "argument", "terminal", "stdin", "stdout", "cli"],
  "library": ["import", "export", "package", "dependency", "bundle", "api surface"],
  "data-pipeline": ["pipeline", "stream", "batch", "etl", "transform", "ingest"],
  "plugin": ["plugin", "hook", "extension", "host", "manifest"],
};

// Minimum keyword matches for a confident domain classification
const DOMAIN_MATCH_THRESHOLD = 3;

/**
 * Classify the domain of a spec/problem statement by scanning for keyword indicators.
 *
 * @param {string} specContent — the content to classify
 * @returns {string} — domain key from PERSPECTIVE_REGISTRY, or "default"
 */
function classifyDomain(specContent) {
  if (!specContent || typeof specContent !== "string") return "default";

  const lowerContent = specContent.toLowerCase();
  let bestDomain = "default";
  let bestCount = 0;

  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
    let count = 0;
    for (const keyword of keywords) {
      // Use word-boundary-aware matching for single words,
      // plain includes for multi-word phrases like "api surface"
      if (keyword.includes(" ")) {
        if (lowerContent.includes(keyword)) count++;
      } else {
        // Match as whole word or at word boundaries
        const pattern = new RegExp(`\\b${keyword}\\b`, "gi");
        if (pattern.test(lowerContent)) count++;
      }
    }
    if (count > bestCount) {
      bestCount = count;
      bestDomain = domain;
    }
  }

  if (bestCount < DOMAIN_MATCH_THRESHOLD) return "default";
  return bestDomain;
}

/**
 * Select perspective lenses for a given domain.
 *
 * @param {string} domain — domain key (from classifyDomain or explicit)
 * @returns {Array<{ id: string, role: string, focus: string }>}
 */
function selectPerspectives(domain) {
  const lenses = PERSPECTIVE_REGISTRY[domain];
  if (lenses && lenses !== null) return lenses;
  return DEFAULT_LENSES;
}

// Path relative to plugin root
const BRIEF_TEMPLATE_REL = "skills/research/templates/perspective-brief.md";

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

let _syntheticGapCounter = 0;

/**
 * Create a synthetic gap finding for an agent that failed after retry.
 *
 * @param {string} lensId
 * @param {string} agentId
 * @returns {{ id: string, source: string, kind: string, description: string }}
 */
function createSyntheticGapFinding(lensId, agentId) {
  _syntheticGapCounter++;
  const id = `GAP-SYNTHETIC-${String(_syntheticGapCounter).padStart(3, "0")}`;
  return {
    id,
    source: agentId,
    kind: "missed-perspective",
    description: `Perspective agent ${lensId} failed after retry. Analysis incomplete for this lens.`,
  };
}

/**
 * Append a "Gaps from Failed Perspectives" section to requirements content.
 *
 * @param {string} reqContent
 * @param {Array} syntheticFindings
 * @returns {string}
 */
function appendSyntheticGapsToReq(reqContent, syntheticFindings) {
  if (!syntheticFindings || syntheticFindings.length === 0) return reqContent;
  const lines = ["", "## Gaps from Failed Perspectives", ""];
  for (const f of syntheticFindings) {
    lines.push(`- **${f.id}** — ${f.description} [source: ${f.source}]`);
  }
  lines.push("");
  return reqContent + lines.join("\n");
}

/**
 * Parse raw outputs from perspective agents.
 * Retries once per agent (per config.max_per_agent). On second failure, creates synthetic gap.
 *
 * @param {Array<{ lensId: string, agentId: string, briefId: string, rawOutput: string }>} rawOutputs
 * @param {Object} [config] — pipeline config; config.max_per_agent controls retry count (default 1)
 * @returns {{ ok: boolean, parsed?: Array, failures?: Array, syntheticGaps?: Array }}
 */
function parseAgentOutputs(rawOutputs, config) {
  const maxPerAgent = config && config.max_per_agent !== undefined ? config.max_per_agent : 1;
  const parsed = [];
  const failures = [];
  const syntheticGaps = [];

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
      // Retry once (simulate retry with same content)
      let retryResult = null;
      if (maxPerAgent > 0) {
        retryResult = agentOutput.parseOutput(rawOutput);
      }

      if (retryResult && retryResult.ok) {
        parsed.push({
          agentId,
          lensId,
          briefId,
          payload: retryResult.payload,
          meta: retryResult.meta,
          recovered: retryResult.recovered || false,
        });
      } else {
        // Retry also failed — record failure and create synthetic gap finding
        failures.push({ lensId, agentId, briefId });
        syntheticGaps.push(createSyntheticGapFinding(lensId, agentId));
      }
    }
  }

  return {
    ok: failures.length === 0 && syntheticGaps.length === 0,
    parsed,
    failures: failures.length > 0 ? failures : undefined,
    syntheticGaps: syntheticGaps.length > 0 ? syntheticGaps : undefined,
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
 * Tag an item with its source pass based on agent payload structure.
 * Items originating from the <gaps> section get "gap", from <depth> get "depth".
 *
 * @param {Object} item — synthesis entity
 * @param {Array<{ agentId: string, payload: Object }>} parsedOutputs — for source lookup
 * @returns {"gap"|"depth"|"untagged"}
 */
function tagItemSourcePass(item, parsedOutputs) {
  if (!item || !item.contents) return "untagged";

  // Check each contributing agent's payload for source pass info
  for (const agentId of Object.keys(item.contents)) {
    const agentOutput = parsedOutputs.find((o) => o.agentId === agentId);
    if (!agentOutput || !agentOutput.payload) continue;

    const content = item.contents[agentId];

    // Check if item content appears in gaps vs depth sections of the agent payload
    if (agentOutput.payload.gaps) {
      const gapsText = typeof agentOutput.payload.gaps === "string"
        ? agentOutput.payload.gaps
        : JSON.stringify(agentOutput.payload.gaps);
      if (gapsText.includes(item.name) || gapsText.includes(content)) return "gap";
    }
    if (agentOutput.payload.depth) {
      const depthText = typeof agentOutput.payload.depth === "string"
        ? agentOutput.payload.depth
        : JSON.stringify(agentOutput.payload.depth);
      if (depthText.includes(item.name) || depthText.includes(content)) return "depth";
    }
  }

  return "untagged";
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
      const sourcePass = tagItemSourcePass(item, parsedOutputs);
      const passTag = sourcePass !== "untagged" ? ` [${sourcePass}]` : "";
      lines.push(`- [ ] **${id}** — ${content}${passTag} \`VERIFY\``);
      frIndex++;
    }
  }
  lines.push("");

  // Gaps Found — items tagged as originating from Pass 1 (gap analysis)
  lines.push("## Gaps Found");
  lines.push("");
  const allItems = [...classified.consensus, ...classified.majority, ...classified.unique];
  const gapItems = allItems.filter((item) => tagItemSourcePass(item, parsedOutputs) === "gap");
  if (gapItems.length === 0) {
    lines.push("- (no gaps identified — all perspectives covered by the spec)");
  } else {
    let gapIndex = 1;
    for (const item of gapItems) {
      const id = `GAP-${String(gapIndex).padStart(3, "0")}`;
      const content = Object.values(item.contents)[0] || item.name;
      const agents = Object.keys(item.contents).join(", ");
      lines.push(`- **${id}** — ${content} [source: ${agents}]`);
      gapIndex++;
    }
  }
  lines.push("");

  // Depth Additions — items tagged as originating from Pass 2 (depth analysis)
  lines.push("## Depth Additions");
  lines.push("");
  const depthItems = allItems.filter((item) => tagItemSourcePass(item, parsedOutputs) === "depth");
  if (depthItems.length === 0) {
    lines.push("- (no depth additions identified — spec detail is sufficient)");
  } else {
    let depthIndex = 1;
    for (const item of depthItems) {
      const id = `DEPTH-${String(depthIndex).padStart(3, "0")}`;
      const content = Object.values(item.contents)[0] || item.name;
      const agents = Object.keys(item.contents).join(", ");
      lines.push(`- **${id}** — ${content} [source: ${agents}]`);
      depthIndex++;
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
 * @param {Array} [syntheticGaps] — synthetic gap findings from failed agents
 */
function writeRequirements(pipelineDir, requirements, synthesisDoc, syntheticGaps) {
  if (syntheticGaps && syntheticGaps.length > 0) {
    requirements = appendSyntheticGapsToReq(requirements, syntheticGaps);
  }
  const reqDir = path.join(pipelineDir, "requirements");
  paths.ensureDir(reqDir);

  const reqPath = path.join(reqDir, "REQ.md");
  fs.writeFileSync(reqPath, requirements, "utf8");

  // Store content hash for staleness detection
  try {
    const integrity = require("../../../lib/artifact-integrity");
    integrity.storeHash(pipelineDir, REQ_PATH, integrity.computeHash(reqPath));
  } catch (_e) { /* integrity is advisory */ }

  if (synthesisDoc) {
    const synthPath = path.join(reqDir, "synthesis.md");
    fs.writeFileSync(synthPath, synthesisDoc, "utf8");
  }

  // Clear progress file after research completes
  try {
    const progress = require("../../../lib/progress");
    progress.clearProgress(path.join(pipelineDir, "research", "progress.yaml"));
  } catch (_e) { /* progress is advisory */ }

  return reqPath;
}

// Valid post-research transitions per references/transitions.yaml.
// `triaging` is canonical; `requirements-ready` is a legacy shortcut kept
// for Increment 1 compatibility (skip triage when no categorization needed).
const VALID_RESEARCH_ROUTES = ["triaging", "requirements-ready"];

/**
 * Atomic post-research hand-off: write REQ.md (+ synthesis.md, +
 * synthetic gaps if any) AND transition `research → <route>` in a single
 * call. Mirrors the B2 finalizeReview / finalizeTriage pattern: prevents
 * the orchestrator from stopping between artifact production and state
 * transition, which would leave phase=research with REQ.md already
 * present and trick autopilot into looping /research against an existing
 * report.
 *
 * @param {string} pipelineDir — absolute path to .pipeline/
 * @param {string} requirements — REQ.md markdown content
 * @param {string} [synthesisDoc] — optional synthesis.md content
 * @param {Array} [syntheticGaps] — synthetic gap findings from failed agents
 * @param {string} [route] — target phase (defaults to "triaging")
 * @returns {{ ok: boolean, reqPath?: string, transitioned: boolean,
 *            targetPhase?: string, error?: string }}
 */
function finalizeResearch(pipelineDir, requirements, synthesisDoc, syntheticGaps, route) {
  const targetRoute = route || "triaging";
  if (!VALID_RESEARCH_ROUTES.includes(targetRoute)) {
    return {
      ok: false,
      transitioned: false,
      error: `invalid route '${targetRoute}' — must be one of: ${VALID_RESEARCH_ROUTES.join(", ")}`,
    };
  }

  let reqPath;
  try {
    reqPath = writeRequirements(pipelineDir, requirements, synthesisDoc, syntheticGaps);
  } catch (err) {
    return { ok: false, transitioned: false, error: `writeRequirements failed: ${err.message}` };
  }

  const stateMachine = require("../../../lib/state-machine");
  const transition = stateMachine.writeState(pipelineDir, targetRoute, {}, {
    command: "/research",
    trigger: "research-skill",
    artifact: reqPath,
  });

  if (!transition.ok) {
    return { ok: false, reqPath, transitioned: false, error: transition.error };
  }
  return { ok: true, reqPath, transitioned: true, targetPhase: targetRoute };
}

module.exports = {
  DEFAULT_LENSES,
  PERSPECTIVE_REGISTRY,
  generateBriefId,
  loadSpec,
  classifyDomain,
  selectPerspectives,
  assemblePerspectiveBriefs,
  parseAgentOutputs,
  synthesizeAndGenerate,
  generateRequirements,
  writeRequirements,
  finalizeResearch,
  VALID_RESEARCH_ROUTES,
  createSyntheticGapFinding,
  appendSyntheticGapsToReq,
};
