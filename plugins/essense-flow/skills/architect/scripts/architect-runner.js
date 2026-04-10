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
 * Assemble perspective briefs for architecture analysis.
 *
 * @param {string} requirementsContent — parsed REQ.md content
 * @param {string} pluginRoot — path to essense-flow plugin root
 * @param {Object} config — pipeline config
 * @returns {{ ok: boolean, briefs?: Array, error?: string }}
 */
function planArchitecture(requirementsContent, pluginRoot, config) {
  if (!requirementsContent || !requirementsContent.trim()) {
    return { ok: false, error: "Requirements content is required" };
  }

  const briefs = [];

  for (let i = 0; i < ARCHITECTURE_LENSES.length; i++) {
    const lens = ARCHITECTURE_LENSES[i];
    const briefId = `arch-${lens.id}-${Date.now().toString(36)}`;
    const agentId = `architect-${lens.id}`;

    const briefBody = [
      `You are a ${lens.role} reviewing a technical plan.`,
      "",
      `Your focus: ${lens.focus}`,
      "",
      "## Requirements",
      "",
      briefAssembly.wrapDataBlock(requirementsContent, "requirements"),
      "",
      "## Task",
      "",
      `Analyze the requirements above from a ${lens.role.toLowerCase()} perspective.`,
      `Focus on: ${lens.focus}.`,
      "",
      "Return your analysis with sections for your perspective's concerns,",
      "cross-perspective flags, and specific recommendations.",
      "",
      `<!-- SENTINEL:COMPLETE:${briefId}:${agentId} -->`,
    ].join("\n");

    const sections = {
      identity: `You are a ${lens.role}.`,
      context: requirementsContent,
    };

    const budgetCheck = tokens.checkBudget(sections, config);
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

module.exports = {
  ARCHITECTURE_LENSES,
  QA_PERSPECTIVES,
  SEVERITY_KEYWORDS,
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
};
