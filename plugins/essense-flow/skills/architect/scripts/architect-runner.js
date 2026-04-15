"use strict";

const fs = require("fs");
const path = require("path");
const yamlIO = require("../../../lib/yaml-io");
const briefAssembly = require("../../../lib/brief-assembly");
const agentOutput = require("../../../lib/agent-output");
const synthesis = require("../../../lib/synthesis");
const dispatch = require("../../../lib/dispatch");
const consistency = require("../../../lib/consistency");
const transformLib = require("../../../lib/transform");
const tokens = require("../../../lib/tokens");
const paths = require("../../../lib/paths");

// Architecture perspective brief template path
const ARCH_BRIEF_TEMPLATE_REL = "skills/architect/templates/architecture-brief.md";

// Architecture perspective lenses
const ARCHITECTURE_LENSES = [
  { id: "infrastructure", role: "Infrastructure Architect", focus: "module map, dependencies, layering, packaging, scalability" },
  { id: "interface", role: "API and Interface Designer", focus: "contracts, data flow, integration points, version compatibility, API surface" },
  { id: "testing", role: "Testing Strategist", focus: "verification strategy, testability, edge cases, fitness functions, acceptance criteria" },
  { id: "security", role: "Security and Quality Reviewer", focus: "threat surface, error handling, code quality risks, defensive patterns, quality gates" },
];

/**
 * Load SPEC.md from the elicitation directory, strip YAML frontmatter.
 * Returns null if no SPEC.md exists.
 *
 * @param {string} pipelineDir — absolute path to .pipeline/
 * @returns {{ content: string, tokenCount: number } | null}
 */
function loadSpec(pipelineDir) {
  const specPath = path.join(pipelineDir, "elicitation", "SPEC.md");
  if (!fs.existsSync(specPath)) return null;

  const raw = fs.readFileSync(specPath, "utf8");
  const stripped = raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "").trim();
  if (!stripped) return null;

  // Verify SPEC.md hasn't changed since last hash
  try {
    const integrity = require("../../../lib/artifact-integrity");
    const check = integrity.verifyHash(pipelineDir, "elicitation/SPEC.md");
    if (check.ok && check.stale) {
      console.error("[essense-flow] WARNING: SPEC.md changed since last hashed. Downstream artifacts may be stale.");
    }
  } catch (_e) { /* integrity is advisory */ }

  return { content: stripped, tokenCount: tokens.countTokens(stripped) };
}

/**
 * Assemble perspective briefs for architecture analysis.
 * SPEC.md is the primary design source when present; REQ.md is supplementary.
 *
 * @param {string} requirementsContent — parsed REQ.md content
 * @param {string} pluginRoot — path to essense-flow plugin root
 * @param {Object} config — pipeline config
 * @param {string} [specContent] — SPEC.md content (primary, when present)
 * @returns {{ ok: boolean, briefs?: Array, error?: string }}
 */
function planArchitecture(requirementsContent, pluginRoot, config, specContent) {
  if (!requirementsContent || !requirementsContent.trim()) {
    return { ok: false, error: "Requirements content is required" };
  }

  // When SPEC.md is present, adapt the brief ceiling
  const effectiveConfig = { ...config };
  if (specContent) {
    const adaptiveCeiling = tokens.adaptiveBriefCeiling(specContent, config);
    effectiveConfig.token_budgets = {
      ...config.token_budgets,
      brief_ceiling: adaptiveCeiling,
    };
  }

  const briefs = [];

  for (let i = 0; i < ARCHITECTURE_LENSES.length; i++) {
    const lens = ARCHITECTURE_LENSES[i];
    const briefId = `arch-${lens.id}-${Date.now().toString(36)}`;
    const agentId = `architect-${lens.id}`;

    const briefParts = [
      `You are a ${lens.role} reviewing a technical plan.`,
      "",
      `Your focus: ${lens.focus}`,
      "",
    ];

    // SPEC.md is the primary design source when present
    if (specContent) {
      briefParts.push("## Design Specification (primary)");
      briefParts.push("");
      briefParts.push(briefAssembly.wrapDataBlock(specContent, "specification"));
      briefParts.push("");
      briefParts.push("## Research Requirements (supplementary)");
      briefParts.push("");
      briefParts.push(briefAssembly.wrapDataBlock(requirementsContent, "requirements"));
      briefParts.push("");
      briefParts.push("## Task");
      briefParts.push("");
      briefParts.push("The design specification is the primary source for decomposition.");
      briefParts.push("The research requirements provide supplementary risk awareness and gap analysis.");
      briefParts.push(`Analyze both from a ${lens.role.toLowerCase()} perspective.`);
    } else {
      briefParts.push("## Requirements");
      briefParts.push("");
      briefParts.push(briefAssembly.wrapDataBlock(requirementsContent, "requirements"));
      briefParts.push("");
      briefParts.push("## Task");
      briefParts.push("");
      briefParts.push(`Analyze the requirements above from a ${lens.role.toLowerCase()} perspective.`);
    }

    briefParts.push(`Focus on: ${lens.focus}.`);
    briefParts.push("");
    briefParts.push("Return your analysis with sections for your perspective's concerns,");
    briefParts.push("cross-perspective flags, and specific recommendations.");
    briefParts.push("");
    briefParts.push(`<!-- SENTINEL:COMPLETE:${briefId}:${agentId} -->`);

    const briefBody = briefParts.join("\n");

    const contextContent = specContent
      ? specContent + "\n\n" + requirementsContent
      : requirementsContent;

    const sections = {
      identity: `You are a ${lens.role}.`,
      context: contextContent,
    };

    const budgetCheck = tokens.checkBudget(sections, effectiveConfig);
    if (!budgetCheck.ok) {
      return { ok: false, error: `Budget exceeded for ${lens.id}: ${JSON.stringify(budgetCheck)}` };
    }

    briefs.push({
      lensId: lens.id,
      agentId,
      briefId,
      brief: briefBody,
    });
  }

  return { ok: true, briefs };
}

/**
 * Synthesize architecture from perspective agent outputs.
 *
 * @param {Array<{ agentId: string, lensId: string, payload: Object }>} parsedOutputs
 * @param {string} requirementsContent — original requirements for traceability
 * @param {Object} config — pipeline config
 * @returns {{ ok: boolean, architecture?: string, synthesis?: string, consistency?: Object, error?: string }}
 */
function synthesizeArchitecture(parsedOutputs, requirementsContent, config) {
  // Check quorum (architecture_perspective: n-1)
  const quorumResults = parsedOutputs.map((p) => ({ ok: true, agentId: p.agentId }));
  const quorum = agentOutput.checkQuorum(quorumResults, "architecture_perspective", config);
  if (!quorum.met) {
    return { ok: false, error: `Architecture quorum not met: need ${quorum.required}, got ${quorum.received}` };
  }

  // Run consistency verification
  const consistencyResult = consistency.verify(parsedOutputs);

  // Run synthesis (vocabulary loaded by caller, passed via parsedOutputs context)
  const entities = synthesis.extractEntities(parsedOutputs, null); // vocabulary wired via orchestrator
  const matrix = synthesis.buildAlignmentMatrix(entities);
  const classified = synthesis.classifyPositions(matrix);
  const synthDoc = synthesis.composeSynthesis(classified);

  // Generate architecture document
  const archDoc = generateArchitectureDoc(classified, parsedOutputs, requirementsContent);

  return {
    ok: true,
    architecture: archDoc,
    synthesis: synthDoc,
    consistency: consistencyResult,
  };
}

/**
 * Generate an architecture document from classified synthesis.
 *
 * @param {Object} classified — classified positions
 * @param {Array} parsedOutputs — agent outputs for attribution
 * @param {string} requirementsContent — for traceability
 * @returns {string}
 */
function generateArchitectureDoc(classified, parsedOutputs, requirementsContent) {
  const lines = [];

  lines.push("---");
  lines.push("artifact: architecture");
  lines.push("schema_version: 1");
  lines.push("produced_by: architect");
  lines.push("consumed_by: build");
  lines.push(`generated_at: ${new Date().toISOString()}`);
  lines.push("---");
  lines.push("");
  lines.push("# Architecture Document");
  lines.push("");

  // Module Map
  lines.push("## Module Map");
  lines.push("");
  const modules = [...classified.consensus, ...classified.majority].filter(
    (item) => item.type === "component" || item.type === "recommendation"
  );
  if (modules.length > 0) {
    for (const mod of modules) {
      const content = Object.values(mod.contents)[0] || mod.name;
      lines.push(`- **${mod.name}**: ${content}`);
    }
  } else {
    lines.push("(Derive from perspective agent analysis)");
  }
  lines.push("");

  // Interface Contracts
  lines.push("## Interface Contracts");
  lines.push("");
  const interfaces = [...classified.consensus, ...classified.majority].filter(
    (item) => item.type === "interface"
  );
  if (interfaces.length > 0) {
    for (const iface of interfaces) {
      const content = Object.values(iface.contents)[0] || iface.name;
      lines.push(`- **${iface.name}**: ${content}`);
    }
  } else {
    lines.push("(Derive from interface perspective analysis)");
  }
  lines.push("");

  // Requirement Traceability (D10)
  lines.push("## Requirement Traceability");
  lines.push("");
  lines.push("| Requirement | Module | Task |");
  lines.push("|-------------|--------|------|");
  // Extract FR-NNN from requirements
  const frPattern = /\*\*(FR-\d{3})\*\*/g;
  let frMatch;
  while ((frMatch = frPattern.exec(requirementsContent)) !== null) {
    lines.push(`| ${frMatch[1]} | (assign during decomposition) | (assign during sprint planning) |`);
  }
  lines.push("");

  // Decisions
  lines.push("## Decisions");
  lines.push("");
  if (classified.split.length > 0) {
    lines.push("Unresolved — require user decision:");
    for (const item of classified.split) {
      lines.push(`- **${item.name}**: ${Object.entries(item.contents).map(([a, c]) => `${a}: ${c}`).join(" vs ")}`);
    }
  } else {
    lines.push("No unresolved decisions.");
  }
  lines.push("");

  // Risks
  lines.push("## Risks");
  lines.push("");
  const risks = [...classified.consensus, ...classified.majority, ...classified.unique].filter(
    (item) => item.type === "risk"
  );
  if (risks.length > 0) {
    for (const risk of risks) {
      const content = Object.values(risk.contents)[0] || risk.name;
      const source = classified.unique.includes(risk) ? " [single-source]" : "";
      lines.push(`- **${risk.name}**: ${content}${source}`);
    }
  } else {
    lines.push("(No risks identified)");
  }
  lines.push("");

  // Source Perspectives
  lines.push("## Source Perspectives");
  lines.push("");
  for (const output of parsedOutputs) {
    lines.push(`- **${output.lensId || output.agentId}**`);
  }
  lines.push("");

  return lines.join("\n");
}

/**
 * Decompose architecture into sprints using the dispatch lib.
 *
 * @param {Object<string, { dependsOn: string[] }>} tasks — task dependency map
 * @returns {{ ok: boolean, waves?: string[][], order?: string[], error?: string, cycle?: string[] }}
 */
function decomposeIntoSprints(tasks) {
  const graph = dispatch.buildDependencyGraph(tasks);
  const dagResult = dispatch.validateDAG(graph);

  if (!dagResult.valid) {
    return { ok: false, error: `Dependency cycle detected`, cycle: dagResult.cycle };
  }

  const waves = dispatch.constructWaves(graph, dagResult.order);
  return { ok: true, waves, order: dagResult.order };
}

/**
 * Create task specs and their .agent.md transforms for a sprint.
 *
 * @param {Array<{ id: string, spec: string }>} tasks — task ID + raw spec content
 * @param {string} architectureContext — ARCH.md content for context
 * @param {Object} config — pipeline config
 * @returns {{ ok: boolean, specs?: Array<{ id: string, md: string, agentMd: string }>, errors?: string[] }}
 */
function createTaskSpecs(tasks, architectureContext, config) {
  const specs = [];
  const errors = [];

  for (const { id, spec } of tasks) {
    const transformResult = transformLib.transformToAgentMd(spec, architectureContext, config);

    if (!transformResult.ok) {
      errors.push(`Transform failed for ${id}: ${transformResult.error}`);
      continue;
    }

    if (transformResult.warnings) {
      errors.push(...transformResult.warnings.map((w) => `${id}: ${w}`));
    }

    specs.push({
      id,
      md: spec,
      agentMd: transformResult.agentMd,
      tokenCount: transformResult.tokenCount,
    });
  }

  return {
    ok: errors.length === 0,
    specs,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Write architecture artifacts to the pipeline directory.
 *
 * @param {string} pipelineDir — .pipeline/ path
 * @param {string} archDoc — architecture document content
 * @param {string} synthDoc — synthesis document content
 */
function writeArchitectureArtifacts(pipelineDir, archDoc, synthDoc) {
  const archDir = path.join(pipelineDir, "architecture");
  paths.ensureDir(archDir);

  fs.writeFileSync(path.join(archDir, "ARCH.md"), archDoc, "utf8");

  // Store content hash for staleness detection
  try {
    const integrity = require("../../../lib/artifact-integrity");
    integrity.storeHash(pipelineDir, "architecture/ARCH.md", integrity.computeHash(path.join(pipelineDir, "architecture", "ARCH.md")));
  } catch (_e) { /* integrity is advisory */ }

  if (synthDoc) {
    fs.writeFileSync(path.join(archDir, "synthesis.md"), synthDoc, "utf8");
  }
}

// QA review perspective agents (post-sprint review)
const QA_PERSPECTIVES = [
  {
    id: "task-compliance",
    role: "Task Spec Compliance Reviewer",
    focus: "Check each acceptance criterion from task specs against the built code. Verify every criterion is met, partially met, or unmet. Flag missing implementations.",
  },
  {
    id: "requirements-alignment",
    role: "Requirements Alignment Reviewer",
    focus: "Verify the sprint output serves the original project requirements. Check that built features map back to functional and non-functional requirements. Flag drift or gaps.",
  },
  {
    id: "fitness-functions",
    role: "Fitness Function Verifier",
    focus: "Check that architectural properties are preserved in the built code. Verify layering, module boundaries, interface contracts, and non-functional constraints. Flag architectural erosion.",
  },
  {
    id: "adversarial",
    role: "Adversarial Edge Case Analyst",
    focus: "Try to break the built code. Identify edge cases, error handling gaps, race conditions, malformed inputs, boundary conditions, and failure modes not covered by tests.",
  },
];

/**
 * Assemble QA review briefs for a completed sprint.
 *
 * @param {number} sprintNumber — completed sprint number
 * @param {string[]} taskSpecPaths — paths to task spec .md files
 * @param {string[]} builtFilePaths — paths to files built during the sprint
 * @param {string} requirementsPath — path to REQ.md
 * @param {string} pluginRoot — plugin root path
 * @param {Object} config — pipeline config
 * @returns {{ ok: boolean, briefs?: Array<{ perspectiveId: string, agentId: string, briefId: string, brief: string }>, error?: string }}
 */
function runQAReview(sprintNumber, taskSpecPaths, builtFilePaths, requirementsPath, pluginRoot, config) {
  if (!taskSpecPaths || taskSpecPaths.length === 0) {
    return { ok: false, error: "At least one task spec path is required" };
  }
  if (!builtFilePaths || builtFilePaths.length === 0) {
    return { ok: false, error: "At least one built file path is required" };
  }

  const briefs = [];

  for (let i = 0; i < QA_PERSPECTIVES.length; i++) {
    const perspective = QA_PERSPECTIVES[i];
    const briefId = `qa-${perspective.id}-${Date.now().toString(36)}`;
    const agentId = `qa-${perspective.id}`;

    const taskSpecList = taskSpecPaths.map((p) => `- ${p}`).join("\n");
    const builtFileList = builtFilePaths.map((p) => `- ${p}`).join("\n");

    const briefBody = [
      `You are a ${perspective.role} performing post-sprint QA on Sprint ${sprintNumber}.`,
      "",
      `Your focus: ${perspective.focus}`,
      "",
      "## Requirements",
      "",
      briefAssembly.wrapDataBlock(`Requirements document: ${requirementsPath}`, "requirements-path"),
      "",
      "## Task Specs (Sprint " + sprintNumber + ")",
      "",
      briefAssembly.wrapDataBlock(taskSpecList, "task-specs"),
      "",
      "## Built Files (Sprint " + sprintNumber + ")",
      "",
      briefAssembly.wrapDataBlock(builtFileList, "built-files"),
      "",
      "## Task",
      "",
      `Review Sprint ${sprintNumber} from a ${perspective.role.toLowerCase()} perspective.`,
      `Focus on: ${perspective.focus}`,
      "",
      "Categorize each finding by severity: critical, high, medium, or low.",
      "Return your analysis with specific file references and actionable recommendations.",
      "",
      `<!-- SENTINEL:COMPLETE:${briefId}:${agentId} -->`,
    ].join("\n");

    const sections = {
      identity: `You are a ${perspective.role}.`,
      context: taskSpecList + "\n" + builtFileList,
    };

    const budgetCheck = tokens.checkBudget(sections, config);
    if (!budgetCheck.ok) {
      return { ok: false, error: `Budget exceeded for ${perspective.id}: ${JSON.stringify(budgetCheck)}` };
    }

    briefs.push({
      perspectiveId: perspective.id,
      agentId,
      briefId,
      brief: briefBody,
    });
  }

  return { ok: true, briefs };
}

/**
 * Write task specs and .agent.md files for a sprint.
 *
 * @param {string} pipelineDir — .pipeline/ path
 * @param {number} sprintNumber
 * @param {Array<{ id: string, md: string, agentMd: string }>} specs
 */
function writeTaskSpecs(pipelineDir, sprintNumber, specs) {
  const sprintDir = path.join(pipelineDir, "sprints", `sprint-${sprintNumber}`, "tasks");
  paths.ensureDir(sprintDir);

  for (const spec of specs) {
    fs.writeFileSync(path.join(sprintDir, `${spec.id}.md`), spec.md, "utf8");
    fs.writeFileSync(path.join(sprintDir, `${spec.id}.agent.md`), spec.agentMd, "utf8");
  }
}

// Severity keyword maps for QA finding categorization
const SEVERITY_KEYWORDS = {
  critical: ["critical", "must fix", "blocks", "crash", "data loss"],
  high: ["high", "should fix", "important", "significant"],
  medium: ["medium", "consider", "improvement", "refactor"],
  low: ["low", "minor", "nice to have", "cosmetic"],
};

const DEFAULT_SEVERITY = "medium";

/**
 * Categorize QA findings by severity based on keyword detection.
 *
 * @param {Array<{ agentId: string, payload: Object }>} parsedQAOutputs — parsed QA agent outputs
 * @returns {{ critical: Array, high: Array, medium: Array, low: Array }}
 */
function categorizeFindings(parsedQAOutputs) {
  const findings = { critical: [], high: [], medium: [], low: [] };

  for (const output of parsedQAOutputs) {
    const { agentId, payload } = output;
    if (!payload) continue;

    const sections = ["analysis", "findings", "risks", "recommendations"];

    for (const section of sections) {
      const content = payload[section];
      if (!content) continue;

      // Split section into individual items (by newlines starting with -)
      const items = content
        .split(/\n/)
        .map((line) => line.trim())
        .filter((line) => line.startsWith("-") || line.startsWith("*"))
        .map((line) => line.replace(/^[-*]\s*/, "").trim())
        .filter((line) => line.length > 0);

      for (const item of items) {
        const lower = item.toLowerCase();
        let severity = DEFAULT_SEVERITY;

        for (const [level, keywords] of Object.entries(SEVERITY_KEYWORDS)) {
          if (keywords.some((kw) => lower.includes(kw))) {
            severity = level;
            break;
          }
        }

        findings[severity].push({ text: item, source: agentId, section });
      }
    }
  }

  return findings;
}

/**
 * Generate a QA report markdown document.
 *
 * @param {number} sprintNumber — completed sprint number
 * @param {{ critical: Array, high: Array, medium: Array, low: Array }} findings
 * @param {Array} parsedQAOutputs — for source attribution
 * @returns {string} — full QA-REPORT.md content
 */
function generateQAReport(sprintNumber, findings, parsedQAOutputs) {
  const totalFindings =
    findings.critical.length +
    findings.high.length +
    findings.medium.length +
    findings.low.length;

  let overallResult;
  if (findings.critical.length > 0) {
    overallResult = `FAIL (${findings.critical.length} critical issue${findings.critical.length > 1 ? "s" : ""})`;
  } else if (findings.high.length > 0) {
    overallResult = `PASS (${findings.high.length} note${findings.high.length > 1 ? "s" : ""})`;
  } else {
    overallResult = "PASS";
  }

  const lines = [];
  const date = new Date().toISOString().slice(0, 10);

  lines.push("---");
  lines.push("artifact: qa-report");
  lines.push("schema_version: 1");
  lines.push(`sprint: ${sprintNumber}`);
  lines.push(`generated_at: ${new Date().toISOString()}`);
  lines.push(`overall_result: "${overallResult}"`);
  lines.push("---");
  lines.push("");
  lines.push(`# Sprint ${sprintNumber} QA Report`);
  lines.push("");
  lines.push(`**Date:** ${date}`);
  lines.push(`**Result:** ${overallResult}`);
  lines.push(`**Total findings:** ${totalFindings}`);
  lines.push("");

  // Summary
  lines.push("## Summary");
  lines.push("");
  lines.push(`- **Critical:** ${findings.critical.length}`);
  lines.push(`- **High:** ${findings.high.length}`);
  lines.push(`- **Medium:** ${findings.medium.length}`);
  lines.push(`- **Low:** ${findings.low.length}`);
  lines.push("");

  // Findings by severity
  const severities = ["critical", "high", "medium", "low"];
  for (const severity of severities) {
    const items = findings[severity];
    if (items.length === 0) continue;

    lines.push(`## ${severity.charAt(0).toUpperCase() + severity.slice(1)}`);
    lines.push("");
    for (const item of items) {
      lines.push(`- ${item.text} _(source: ${item.source})_`);
    }
    lines.push("");
  }

  // Source perspectives
  lines.push("## Source Perspectives");
  lines.push("");
  for (const output of parsedQAOutputs) {
    lines.push(`- **${output.agentId}**`);
  }
  lines.push("");

  return lines.join("\n");
}

/**
 * Run the full QA review: categorize findings, generate report, write to disk.
 *
 * @param {Array<{ agentId: string, payload: Object }>} parsedQAOutputs — parsed QA agent outputs
 * @param {number} sprintNumber — completed sprint number
 * @param {string} pipelineDir — .pipeline/ path
 * @param {Object} config — pipeline config
 * @returns {{ ok: boolean, report: string, findings: Object, summary: Object }}
 */
function runReview(parsedQAOutputs, sprintNumber, pipelineDir, config) {
  const findings = categorizeFindings(parsedQAOutputs);
  const report = generateQAReport(sprintNumber, findings, parsedQAOutputs);

  // Write report to disk
  const reviewDir = path.join(pipelineDir, "reviews", `sprint-${sprintNumber}`);
  paths.ensureDir(reviewDir);
  fs.writeFileSync(path.join(reviewDir, "QA-REPORT.md"), report, "utf8");

  const summary = {
    totalFindings:
      findings.critical.length +
      findings.high.length +
      findings.medium.length +
      findings.low.length,
    critical: findings.critical.length,
    high: findings.high.length,
    medium: findings.medium.length,
    low: findings.low.length,
    pass: findings.critical.length === 0,
  };

  return { ok: true, report, findings, summary };
}

// ---------------------------------------------------------------------------
// DECOMPOSITION-STATE tracking
// ---------------------------------------------------------------------------

// Valid node states and their allowed transitions
const NODE_STATES = {
  unresolved: ["in-progress", "pending-user-decision"],
  "in-progress": ["resolved", "leaf", "blocked"],
  resolved: ["unresolved"], // can re-open if further decomposition needed
  leaf: [], // terminal — no transitions out
  blocked: ["unresolved"], // can unblock
  "pending-user-decision": ["resolved", "blocked"],
};

const DECOMPOSITION_STATE_FILENAME = "DECOMPOSITION-STATE.yaml";

/**
 * Resolve the absolute path to the DECOMPOSITION-STATE.yaml file.
 *
 * @param {string} pipelineDir — absolute path to .pipeline/
 * @returns {string}
 */
function _statePath(pipelineDir) {
  return path.join(pipelineDir, "architecture", DECOMPOSITION_STATE_FILENAME);
}

/**
 * Create the initial DECOMPOSITION-STATE.yaml at
 * .pipeline/architecture/DECOMPOSITION-STATE.yaml.
 *
 * @param {string} pipelineDir — absolute path to .pipeline/
 * @returns {{ ok: boolean, statePath: string }}
 */
function initDecompositionState(pipelineDir) {
  const statePath = _statePath(pipelineDir);
  paths.ensureDir(path.join(pipelineDir, "architecture"));

  const state = {
    schema_version: 1,
    last_updated: new Date().toISOString(),
    current_wave: 0,
    total_waves: null,
    nodes: {},
    wave_history: [],
    convergence: { resolution_rate: [] },
  };

  yamlIO.safeWrite(statePath, state);
  return { ok: true, statePath };
}

/**
 * Read DECOMPOSITION-STATE.yaml.
 *
 * @param {string} pipelineDir — absolute path to .pipeline/
 * @returns {Object|null} state object, or null if the file does not exist
 */
function loadDecompositionState(pipelineDir) {
  return yamlIO.safeReadWithFallback(_statePath(pipelineDir));
}

/**
 * Atomically write the decomposition state back to disk.
 * Automatically bumps the last_updated timestamp.
 *
 * @param {string} pipelineDir — absolute path to .pipeline/
 * @param {Object} state — full state object
 */
function saveDecompositionState(pipelineDir, state) {
  state.last_updated = new Date().toISOString();
  paths.ensureDir(path.join(pipelineDir, "architecture"));
  yamlIO.safeWrite(_statePath(pipelineDir), state);
}

/**
 * Validate and apply a state transition on a single node.
 *
 * @param {Object} state — full decomposition state (mutated in place)
 * @param {string} nodeId — node identifier
 * @param {string} newState — target state name
 * @param {Object} [metadata] — optional fields to merge (design_question, user_answer, wave_resolved, children, etc.)
 * @returns {{ ok: boolean, error?: string }}
 */
function updateNodeState(state, nodeId, newState, metadata) {
  const node = state.nodes[nodeId];
  if (!node) {
    return { ok: false, error: `Node "${nodeId}" not found` };
  }

  const currentState = node.state;
  const allowed = NODE_STATES[currentState];

  if (!allowed) {
    return { ok: false, error: `Unknown current state "${currentState}"` };
  }

  if (!allowed.includes(newState)) {
    return { ok: false, error: `Cannot transition from ${currentState} to ${newState}` };
  }

  node.state = newState;

  if (metadata) {
    Object.assign(node, metadata);
  }

  return { ok: true };
}

/**
 * Add a new node to the decomposition tree.
 *
 * @param {Object} state — full decomposition state (mutated in place)
 * @param {string} nodeId — unique node identifier
 * @param {Object} nodeData — { name, state: "unresolved", depth, parent_id, children: [] }
 * @returns {{ ok: boolean }}
 */
function addNode(state, nodeId, nodeData) {
  state.nodes[nodeId] = {
    name: nodeData.name,
    state: nodeData.state || "unresolved",
    depth: nodeData.depth,
    parent_id: nodeData.parent_id || null,
    children: nodeData.children || [],
  };
  return { ok: true };
}

/**
 * Append a wave record to wave_history, update convergence metrics,
 * and increment current_wave.
 *
 * @param {Object} state — full decomposition state (mutated in place)
 * @param {Object} waveData — { wave, started_at, nodes_processed, nodes_resolved, nodes_pending }
 */
function addWaveRecord(state, waveData) {
  state.wave_history.push(waveData);

  const rate =
    waveData.nodes_processed > 0
      ? waveData.nodes_resolved / waveData.nodes_processed
      : 0;

  state.convergence.resolution_rate.push(rate);
  state.current_wave = state.current_wave + 1;
}

/**
 * Compute a high-level convergence summary from current state.
 *
 * @param {Object} state — full decomposition state
 * @returns {{ total: number, resolved: number, unresolved: number, pending: number, leafCount: number, blockedCount: number, resolutionTrend: number[] }}
 */
function getConvergenceSummary(state) {
  const nodes = Object.values(state.nodes);
  const total = nodes.length;

  let resolved = 0;
  let unresolved = 0;
  let pending = 0;
  let leafCount = 0;
  let blockedCount = 0;

  for (const node of nodes) {
    switch (node.state) {
      case "resolved":
        resolved++;
        break;
      case "unresolved":
        unresolved++;
        break;
      case "pending-user-decision":
        pending++;
        break;
      case "leaf":
        leafCount++;
        break;
      case "blocked":
        blockedCount++;
        break;
      // "in-progress" nodes are counted only in total
      default:
        break;
    }
  }

  const TREND_WINDOW = 3;
  const rates = state.convergence.resolution_rate;
  const resolutionTrend = rates.slice(-TREND_WINDOW);

  return { total, resolved, unresolved, pending, leafCount, blockedCount, resolutionTrend };
}

/**
 * Format a convergence summary as a human-readable string.
 *
 * @param {Object} summary — output of getConvergenceSummary()
 * @param {number} currentWave — current wave number
 * @returns {string}
 */
function formatConvergenceSummary(summary, currentWave) {
  const rateStr = summary.resolutionTrend
    .map(r => Math.round(r * 100) + "%")
    .join(", ");

  const lines = [
    `After ${currentWave} waves:`,
    `  Leaves: ${summary.leafCount}`,
    `  Resolved: ${summary.resolved}`,
    `  Unresolved: ${summary.unresolved}`,
    `  Pending user decisions: ${summary.pending}`,
    `  Blocked: ${summary.blockedCount}`,
    `  Total nodes: ${summary.total}`,
    `  Resolution rate trend: [${rateStr}]`,
  ];

  return lines.join("\n");
}

/**
 * Generate a markdown visualization of the decomposition tree.
 * Shows node state next to each node name using indentation for depth.
 *
 * @param {Object} state — full decomposition state
 * @returns {string} markdown string
 */
function generateTreeMd(state) {
  const nodes = state.nodes;
  const nodeIds = Object.keys(nodes);

  if (nodeIds.length === 0) {
    return "_(no nodes in decomposition tree)_\n";
  }

  // Build a lookup of children for each node
  const childrenMap = {};
  const roots = [];

  for (const id of nodeIds) {
    const node = nodes[id];
    if (!node.parent_id || !nodes[node.parent_id]) {
      roots.push(id);
    } else {
      if (!childrenMap[node.parent_id]) {
        childrenMap[node.parent_id] = [];
      }
      childrenMap[node.parent_id].push(id);
    }
  }

  const STATE_ICONS = {
    unresolved: "[ ]",
    "in-progress": "[~]",
    resolved: "[x]",
    leaf: "[.]",
    blocked: "[!]",
    "pending-user-decision": "[?]",
  };

  const lines = [];
  lines.push("# Decomposition Tree");
  lines.push("");

  /**
   * Recursively render a node and its descendants.
   *
   * @param {string} id — node id
   * @param {number} indent — indentation level
   */
  function renderNode(id, indent) {
    const node = nodes[id];
    const prefix = "  ".repeat(indent) + "-";
    const icon = STATE_ICONS[node.state] || `[${node.state}]`;
    lines.push(`${prefix} ${icon} **${node.name}** \`${id}\``);

    const children = childrenMap[id] || node.children || [];
    for (const childId of children) {
      // Only render if the child exists in nodes to avoid infinite loops
      if (nodes[childId]) {
        renderNode(childId, indent + 1);
      }
    }
  }

  for (const rootId of roots) {
    renderNode(rootId, 0);
  }

  lines.push("");
  return lines.join("\n");
}

// Convergence check threshold — show summary and ask user after this many waves
const CONVERGENCE_CHECK_WAVE = 10;

/**
 * Process one wave of decomposition.
 * For each unresolved node at the current depth:
 *   - If it has design choices → mark pending-user-decision
 *   - If it's a technical detail → resolve it (architect decides)
 *   - If it's small enough → mark as leaf
 *
 * @param {Object} state — DECOMPOSITION-STATE (mutated)
 * @param {string} specContent — SPEC.md content for context
 * @param {string} reqContent — REQ.md content for risk awareness
 * @param {Object} config — pipeline config
 * @returns {{ ok: boolean, nodesProcessed: number, nodesResolved: number, nodesPending: number, questionsToSurface: Array }}
 */
function decomposeWave(state, specContent, reqContent, config) {
  const unresolvedNodes = Object.entries(state.nodes)
    .filter(([_, n]) => n.state === "unresolved");

  let nodesProcessed = 0;
  let nodesResolved = 0;
  let nodesPending = 0;
  const questionsToSurface = [];

  for (const [nodeId, node] of unresolvedNodes) {
    nodesProcessed++;

    // First transition to in-progress
    updateNodeState(state, nodeId, "in-progress");

    const evaluation = evaluateNode(node, specContent);

    if (evaluation.isLeaf) {
      // Small enough, no design choices — mark as leaf
      updateNodeState(state, nodeId, "leaf");
      nodesResolved++;
    } else if (evaluation.hasDesignChoice) {
      // Design question — needs user input
      updateNodeState(state, nodeId, "pending-user-decision", {
        design_question: evaluation.question,
      });
      questionsToSurface.push({
        nodeId,
        nodeName: node.name,
        question: evaluation.question,
        options: evaluation.options,
      });
      nodesPending++;
    } else {
      // Technical detail — architect resolves, create children for further decomposition
      updateNodeState(state, nodeId, "resolved", {
        wave_resolved: state.current_wave,
      });
      nodesResolved++;

      // If the node can be decomposed further, add child nodes
      if (evaluation.children && evaluation.children.length > 0) {
        for (const child of evaluation.children) {
          const childId = `${nodeId}-${child.id}`;
          addNode(state, childId, {
            name: child.name,
            state: "unresolved",
            depth: node.depth + 1,
            parent_id: nodeId,
            children: [],
          });
          // Update parent's children list
          if (!node.children) node.children = [];
          node.children.push(childId);
        }
      }
    }
  }

  // Record wave
  addWaveRecord(state, {
    wave: state.current_wave + 1,
    started_at: new Date().toISOString(),
    nodes_processed: nodesProcessed,
    nodes_resolved: nodesResolved,
    nodes_pending: nodesPending,
  });

  return { ok: true, nodesProcessed, nodesResolved, nodesPending, questionsToSurface };
}

/**
 * Evaluate whether a node has design choices remaining.
 * This is a heuristic based on the node name and spec content.
 *
 * @param {Object} node — the node to evaluate
 * @param {string} specContent — SPEC.md content for context
 * @returns {{ isLeaf: boolean, hasDesignChoice: boolean, question?: string, options?: Array, children?: Array }}
 */
function evaluateNode(node, specContent) {
  const name = (node.name || "").toLowerCase();

  // Check if the node is already small/specific enough to be a leaf
  // Leaf indicators: very specific names, single-file scope, utility functions
  const LEAF_INDICATORS = [
    "test", "config", "constant", "type definition", "schema",
    "helper", "utility", "fixture", "migration", "seed",
  ];

  const isSmallScope = LEAF_INDICATORS.some(ind => name.includes(ind));
  if (isSmallScope) {
    return { isLeaf: true, hasDesignChoice: false };
  }

  // Check for design choice indicators in the node name or description
  const DESIGN_CHOICE_INDICATORS = [
    "or", "vs", "choose", "decide", "strategy", "approach",
    "pattern", "which", "alternative",
  ];

  const hasDesignKeyword = DESIGN_CHOICE_INDICATORS.some(ind => name.includes(ind));

  if (hasDesignKeyword) {
    return {
      isLeaf: false,
      hasDesignChoice: true,
      question: `How should "${node.name}" be implemented?`,
      options: [
        { label: "Option A", description: `Standard approach for ${node.name}` },
        { label: "Option B", description: `Alternative approach for ${node.name}` },
      ],
    };
  }

  // Default: not a leaf, no design choice — decompose further
  return {
    isLeaf: false,
    hasDesignChoice: false,
    children: [],  // The architect workflow will fill in actual children based on spec analysis
  };
}

/**
 * Format a design question for AskUserQuestion tool.
 *
 * @param {Object} questionData — { nodeId, nodeName, question, options }
 * @returns {Object} — formatted for AskUserQuestion
 */
function createDesignQuestion(questionData) {
  return {
    question: questionData.question,
    header: questionData.nodeName.substring(0, 12),
    multiSelect: false,
    options: (questionData.options || []).map(opt => ({
      label: opt.label,
      description: opt.description,
    })),
  };
}

/**
 * Apply a user's answer to a pending-user-decision node.
 * Records the decision and transitions the node to resolved.
 *
 * @param {Object} state — DECOMPOSITION-STATE (mutated)
 * @param {string} nodeId — node that had the question
 * @param {string} answer — the user's selected option
 * @param {Object} [decisionRecord] — optional decision to add to index
 * @returns {{ ok: boolean, error?: string }}
 */
function applyAnswer(state, nodeId, answer, decisionRecord) {
  const node = state.nodes[nodeId];
  if (!node) {
    return { ok: false, error: `Node "${nodeId}" not found` };
  }

  if (node.state !== "pending-user-decision") {
    return { ok: false, error: `Node "${nodeId}" is not pending a decision (state: ${node.state})` };
  }

  return updateNodeState(state, nodeId, "resolved", {
    user_answer: answer,
    wave_resolved: state.current_wave,
  });
}

/**
 * Check if decomposition is complete — all nodes are either leaf or blocked.
 *
 * @param {Object} state — DECOMPOSITION-STATE
 * @returns {{ complete: boolean, summary: Object }}
 */
function isDecompositionComplete(state) {
  const summary = getConvergenceSummary(state);
  const complete = summary.unresolved === 0 && summary.pending === 0;
  return { complete, summary };
}

/**
 * Detect potential spec gaps from a user's answer.
 * If the answer suggests the spec didn't cover something, flag it.
 *
 * @param {string} answer — user's answer text
 * @param {string} nodeName — what was being discussed
 * @returns {{ isSpecGap: boolean, reason?: string }}
 */
function detectSpecGap(answer, nodeName) {
  if (!answer || typeof answer !== "string") return { isSpecGap: false };

  const lower = answer.toLowerCase();
  const GAP_INDICATORS = [
    "not in the spec", "spec doesn't cover", "spec doesn't mention",
    "wasn't specified", "need to go back", "missing from spec",
    "should have been in elicit", "design gap",
  ];

  const matched = GAP_INDICATORS.find(ind => lower.includes(ind));
  if (matched) {
    return {
      isSpecGap: true,
      reason: `User answer for "${nodeName}" suggests a spec gap: "${matched}"`,
    };
  }

  return { isSpecGap: false };
}

module.exports = {
  ARCHITECTURE_LENSES,
  QA_PERSPECTIVES,
  SEVERITY_KEYWORDS,
  NODE_STATES,
  CONVERGENCE_CHECK_WAVE,
  loadSpec,
  planArchitecture,
  runQAReview,
  synthesizeArchitecture,
  generateArchitectureDoc,
  decomposeIntoSprints,
  createTaskSpecs,
  writeArchitectureArtifacts,
  writeTaskSpecs,
  categorizeFindings,
  generateQAReport,
  runReview,
  initDecompositionState,
  loadDecompositionState,
  saveDecompositionState,
  updateNodeState,
  addNode,
  addWaveRecord,
  getConvergenceSummary,
  formatConvergenceSummary,
  generateTreeMd,
  decomposeWave,
  evaluateNode,
  createDesignQuestion,
  applyAnswer,
  isDecompositionComplete,
  detectSpecGap,
};
