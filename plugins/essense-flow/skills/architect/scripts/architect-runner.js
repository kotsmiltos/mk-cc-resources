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
const { SPEC_PATH, ARCH_PATH } = require("../../../lib/constants");

// Architecture perspective brief template path
const ARCH_BRIEF_TEMPLATE_REL = "skills/architect/templates/architecture-brief.md";

// Directories excluded from project file search
const SEARCH_EXCLUDED_DIRS = new Set(["node_modules", ".git", ".pipeline"]);

/**
 * Recursively collect all .js/.ts/.md/.yaml/.yml/.json files under projectRoot,
 * skipping excluded directories.
 *
 * @param {string} projectRoot — absolute path to project root
 * @returns {string[]} absolute file paths
 */
function collectProjectFiles(projectRoot) {
  const results = [];
  function walk(dir) {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (_e) { return; }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (!SEARCH_EXCLUDED_DIRS.has(entry.name)) walk(path.join(dir, entry.name));
      } else if (/\.(js|ts|md|yaml|yml|json)$/.test(entry.name)) {
        results.push(path.join(dir, entry.name));
      }
    }
  }
  walk(projectRoot);
  return results;
}

// Case-insensitive global regex to extract file references from finding text
const FILE_REF_PATTERN = /\b([\w./\\-]+\.(?:js|ts|md|yaml|yml|json))\b/gi;

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
    const check = integrity.verifyHash(pipelineDir, SPEC_PATH);
    if (check.ok && check.stale) {
      console.error("[essense-flow] WARNING: SPEC.md changed since last hashed. Downstream artifacts may be stale.");
    }
  } catch (_e) { /* integrity is advisory */ }

  // Parse complexity block from frontmatter — drives decomposition depth.
  // Missing block returns null; architect treats it as standard depth.
  let complexity = null;
  try {
    const elicitRunner = require("../../elicit/scripts/elicit-runner");
    complexity = elicitRunner.parseComplexityBlock(raw);
  } catch (_e) { /* complexity is advisory */ }

  return { content: stripped, tokenCount: tokens.countTokens(stripped), complexity };
}

/**
 * Recommend decomposition depth from complexity signal.
 * Returns a structured recommendation — architect honors as guidance, not as
 * a hard cap. The actual wave count is set by Claude's judgment informed by this.
 *
 *   bug-fix         → flat (single-wave decomposition where possible)
 *   new-feature     → standard (multi-wave when shared modules touched)
 *   partial-rewrite → high-care (track cross-cutting concerns; what touches changed code)
 *   new-project     → full (multi-perspective, full decomposition tree)
 *
 * touch_surface:broad escalates depth one level. unknown_count > 2 signals research first.
 */
function recommendDecompositionDepth(complexity) {
  if (!complexity || !complexity.assessment) {
    return { depth: "standard", notes: ["no complexity block in SPEC.md — defaulting to standard depth"] };
  }
  const notes = [];
  let depth;
  switch (complexity.assessment) {
    case "bug-fix":         depth = "flat"; break;
    case "new-feature":     depth = "standard"; break;
    case "partial-rewrite": depth = "high-care"; break;
    case "new-project":     depth = "full"; break;
    default:                depth = "standard";
  }
  if (complexity.touch_surface === "broad" && depth === "flat") {
    depth = "standard";
    notes.push("touch_surface:broad escalated depth: flat → standard");
  } else if (complexity.touch_surface === "broad" && depth === "standard") {
    depth = "high-care";
    notes.push("touch_surface:broad escalated depth: standard → high-care");
  }
  if (Number.isFinite(complexity.unknown_count) && complexity.unknown_count > 2) {
    notes.push(`unknown_count=${complexity.unknown_count} > 2 — research phase should resolve unknowns first`);
  }
  return { depth, notes, source: complexity };
}

/**
 * Choose lightweight vs heavyweight architect flow from SPEC.md complexity.
 *
 * The /architect dispatcher uses this to decide whether to run the
 * lightweight DAG-based path (skip decomposing phase) or the heavyweight
 * wave-based path (enter decomposing phase). Decision is deterministic
 * from the SPEC.md frontmatter `complexity` block.
 *
 * Routing rules (in order):
 *   1. complexity.classification === "mechanical" → lightweight (override)
 *      Rationale: re-plans of pre-specced tasks, fix sprints, cited-bug
 *      patches have nothing for wave-based decomposition to discover —
 *      running it produces no design signal at LLM-decomposition cost.
 *   2. depth === "flat" (i.e. complexity.assessment === "bug-fix" with
 *      narrow touch_surface) → lightweight
 *   3. anything else (incl. missing complexity block) → heavyweight
 *
 * Missing complexity defaults to heavyweight because the safer choice
 * for an unknown project is full design rigor — explicit complexity
 * declaration is required to opt into the cheaper lightweight path.
 *
 * @param {Object|null} complexity — SPEC.md complexity block, or null
 * @returns {{ flow: "lightweight"|"heavyweight",
 *            depth: string, classification: string|null, reason: string }}
 */
function chooseArchitectFlow(complexity) {
  const depthRec = recommendDecompositionDepth(complexity);
  const depth = depthRec.depth;
  const classification = (complexity && complexity.classification) || null;

  if (classification === "mechanical") {
    return {
      flow: "lightweight",
      depth,
      classification,
      reason: "mechanical override — wave-based decomposition skipped",
    };
  }
  if (depth === "flat") {
    return {
      flow: "lightweight",
      depth,
      classification,
      reason: "depth=flat — DAG-based wave construction sufficient",
    };
  }
  return {
    flow: "heavyweight",
    depth,
    classification,
    reason: classification
      ? `depth=${depth}, classification=${classification} — wave-based decomposition`
      : `depth=${depth} — wave-based decomposition (no classification override)`,
  };
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
function planArchitecture(requirementsContent, pluginRoot, config, specContent, complexity) {
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

  // Scope-aware depth signal — derived from SPEC complexity block.
  // Logged here so the decomposition depth recommendation is visible at planning time;
  // injected into each brief so perspective agents adapt their analysis to the scale.
  const depthRecommendation = recommendDecompositionDepth(complexity);
  if (depthRecommendation && depthRecommendation.depth) {
    const sourceNote = (depthRecommendation.source && depthRecommendation.source.assessment)
      ? ` (assessment=${depthRecommendation.source.assessment}, touch_surface=${depthRecommendation.source.touch_surface || "n/a"})`
      : "";
    console.log(`[architect] decomposition depth: ${depthRecommendation.depth}${sourceNote}`);
    for (const note of depthRecommendation.notes || []) {
      console.log(`[architect]   note: ${note}`);
    }
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

    // Inject scope context so each perspective adapts depth to spec complexity.
    if (depthRecommendation && depthRecommendation.depth) {
      briefParts.push("## Scope Context");
      briefParts.push("");
      briefParts.push(`Decomposition depth recommendation: **${depthRecommendation.depth}**.`);
      if (depthRecommendation.source && depthRecommendation.source.assessment) {
        briefParts.push(`Source: SPEC complexity block — assessment=${depthRecommendation.source.assessment}, touch_surface=${depthRecommendation.source.touch_surface || "n/a"}, unknown_count=${depthRecommendation.source.unknown_count != null ? depthRecommendation.source.unknown_count : "n/a"}.`);
      }
      for (const note of depthRecommendation.notes || []) {
        briefParts.push(`- ${note}`);
      }
      briefParts.push("");
      briefParts.push("Adapt your analysis to this scope — flat scopes do not need deep decomposition; high-care scopes do.");
      briefParts.push("");
    }

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

  return { ok: true, briefs, depthRecommendation };
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
    integrity.storeHash(pipelineDir, ARCH_PATH, integrity.computeHash(path.join(pipelineDir, ARCH_PATH)));
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

// Valid post-decompose transitions per references/transitions.yaml.
// `decomposing → decomposing` is the mid-wave self-loop and is NOT a
// finalize target — it's handled by saveDecompositionState during waves.
const VALID_DECOMPOSE_ROUTES = ["sprinting"];

/**
 * Atomic post-decompose hand-off: write task specs (+ TREE.md, + final
 * ARCH.md) AND transition `decomposing → sprinting` in a single call.
 * Mirrors the B2 finalizeReview / finalizeTriage pattern: prevents the
 * orchestrator from stopping between artifact production and state
 * transition, which would leave phase=decomposing with TASK-NNN files
 * already present and trick autopilot into looping /architect against
 * an existing decomposition.
 *
 * @param {string} pipelineDir — absolute path to .pipeline/
 * @param {number} sprintNumber — sprint number for task spec dir
 * @param {Array<{id:string, md:string, agentMd:string}>} specs — task specs
 * @param {string} [treeMd] — optional TREE.md content to persist alongside
 * @param {string} [archDoc] — optional final ARCH.md (overwrites prelim)
 * @param {string} [synthDoc] — optional synthesis.md
 * @param {string} [route] — target phase (defaults to "sprinting")
 * @returns {{ ok: boolean, sprintDir?: string, transitioned: boolean,
 *            targetPhase?: string, error?: string }}
 */
function finalizeDecompose(pipelineDir, sprintNumber, specs, treeMd, archDoc, synthDoc, route) {
  const targetRoute = route || "sprinting";
  if (!VALID_DECOMPOSE_ROUTES.includes(targetRoute)) {
    return {
      ok: false,
      transitioned: false,
      error: `invalid route '${targetRoute}' — must be one of: ${VALID_DECOMPOSE_ROUTES.join(", ")}`,
    };
  }

  let sprintDir;
  try {
    writeTaskSpecs(pipelineDir, sprintNumber, specs);
    sprintDir = path.join(pipelineDir, "sprints", `sprint-${sprintNumber}`, "tasks");

    if (treeMd) {
      const archDir = path.join(pipelineDir, "architecture");
      paths.ensureDir(archDir);
      fs.writeFileSync(path.join(archDir, "TREE.md"), treeMd, "utf8");
    }

    if (archDoc) {
      writeArchitectureArtifacts(pipelineDir, archDoc, synthDoc);
    }
  } catch (err) {
    return { ok: false, transitioned: false, error: `decompose write failed: ${err.message}` };
  }

  const stateMachine = require("../../../lib/state-machine");
  const transition = stateMachine.writeState(pipelineDir, targetRoute, {}, {
    command: "/architect",
    trigger: "architect-decompose",
    artifact: sprintDir,
  });

  if (!transition.ok) {
    return { ok: false, sprintDir, transitioned: false, error: transition.error };
  }
  return { ok: true, sprintDir, transitioned: true, targetPhase: targetRoute };
}

// Valid post-architecture transitions per references/transitions.yaml.
// Architecture has two real exits:
//   - `sprinting`: lightweight flow — writeArchitectureArtifacts +
//     writeTaskSpecs + transition (skip decomposing phase). Used for
//     mechanical work and bug-fix-tier complexity (`flat` depth).
//   - `decomposing`: heavyweight flow — write prelim ARCH.md + transition
//     into the wave-based decomposition phase. Final ARCH.md is later
//     produced by finalizeDecompose.
const VALID_ARCHITECTURE_ROUTES = ["sprinting", "decomposing"];

/**
 * Atomic post-architecture hand-off: write architecture artifacts AND
 * transition `architecture → <route>` in a single call. Closes the
 * B-class split that previously existed between
 * writeArchitectureArtifacts → writeTaskSpecs → manual transition in
 * the lightweight /architect flow.
 *
 * Side effects per route:
 *   route = "sprinting"   — writes ARCH.md, synthesis.md, TASK-NNN.md
 *                            (plus .agent.md pairs) for sprintMeta.specs,
 *                            then transitions architecture → sprinting.
 *                            Used by the lightweight (skip-decomposing)
 *                            flow described in commands/architect.md.
 *   route = "decomposing" — writes prelim ARCH.md + synthesis.md, then
 *                            transitions architecture → decomposing. No
 *                            task specs at this boundary; finalizeDecompose
 *                            later writes the final ARCH.md and task specs.
 *                            Used by the heavyweight (wave-based) flow
 *                            described in skills/architect/workflows/plan.md.
 *
 * Either route preserves the artifact on transition failure (ARCH.md +
 * any task specs written before the writeState call stay on disk so the
 * orchestrator can recover; only state.yaml is left unchanged).
 *
 * @param {string} pipelineDir — absolute path to .pipeline/
 * @param {string} archDoc — ARCH.md markdown content (required)
 * @param {string} [synthDoc] — synthesis.md markdown content (optional)
 * @param {string} route — target phase (one of VALID_ARCHITECTURE_ROUTES)
 * @param {{ sprintNumber:number, specs:Array<{id:string,md:string,agentMd:string}> }} [sprintMeta]
 *   Required when route === "sprinting"; ignored otherwise.
 * @returns {{ ok: boolean, archPath?: string, sprintDir?: string,
 *            transitioned: boolean, targetPhase?: string, error?: string }}
 */
function finalizeArchitecture(pipelineDir, archDoc, synthDoc, route, sprintMeta) {
  if (!VALID_ARCHITECTURE_ROUTES.includes(route)) {
    return {
      ok: false,
      transitioned: false,
      error: `invalid route '${route}' — must be one of: ${VALID_ARCHITECTURE_ROUTES.join(", ")}`,
    };
  }
  if (!archDoc || typeof archDoc !== "string") {
    return {
      ok: false,
      transitioned: false,
      error: "archDoc is required and must be a string",
    };
  }
  if (route === "sprinting") {
    if (!sprintMeta || typeof sprintMeta.sprintNumber !== "number" || !Array.isArray(sprintMeta.specs)) {
      return {
        ok: false,
        transitioned: false,
        error: "route=sprinting requires sprintMeta = { sprintNumber:number, specs:Array }",
      };
    }
  }

  let archPath, sprintDir;
  try {
    writeArchitectureArtifacts(pipelineDir, archDoc, synthDoc);
    archPath = path.join(pipelineDir, "architecture", "ARCH.md");

    if (route === "sprinting") {
      writeTaskSpecs(pipelineDir, sprintMeta.sprintNumber, sprintMeta.specs);
      sprintDir = path.join(pipelineDir, "sprints", `sprint-${sprintMeta.sprintNumber}`, "tasks");
    }
  } catch (err) {
    return { ok: false, transitioned: false, error: `architecture write failed: ${err.message}` };
  }

  const stateMachine = require("../../../lib/state-machine");
  const transition = stateMachine.writeState(pipelineDir, route, {}, {
    command: "/architect",
    trigger: "architect-plan",
    artifact: archPath,
  });

  if (!transition.ok) {
    return { ok: false, archPath, sprintDir, transitioned: false, error: transition.error };
  }
  return { ok: true, archPath, sprintDir, transitioned: true, targetPhase: route };
}

// ---------------------------------------------------------------------------
// runArchitectPlan — orchestrator with injection seams (dispatchFn + askFn)
//
// Mirrors the verify-runner.runVerify pattern (DEC-A004 injectable seam):
//   - dispatchFn === null: production mode — return briefs to caller, let
//     SKILL.md drive the perspective-agent dispatch.
//   - dispatchFn provided: test mode (or future automation) — runner
//     dispatches all 4 briefs in parallel, parses raw outputs, runs
//     synthesis end-to-end.
//   - askFn === null: production mode — when heavyweight wave surfaces
//     design questions, pause and return them so SKILL.md can drive
//     AskUserQuestion. Caller resumes by applying answers and re-invoking.
//   - askFn provided: test mode — runner calls askFn for each surfaced
//     question and applies the answer via applyAnswer.
//
// The runner is opt-in: existing /architect orchestrator-driven flow in
// commands/architect.md continues to work without runArchitectPlan. The
// runner exists primarily as a deterministic test harness for the
// dispatch + question loop, and as a foundation for future automation.
// ---------------------------------------------------------------------------

const ARCHITECT_PLAN_PHASES = ["requirements-ready", "architecture", "decomposing"];

/**
 * Default task-spec builder used when wave loop completes and the caller
 * did not supply a custom builder. Generates one TASK-NNN per leaf node
 * with a minimal acceptance criterion. Production callers will typically
 * override this with an LLM-driven task synthesis pass that produces
 * richer specs informed by ARCH.md context.
 *
 * @param {Object} state — DECOMPOSITION-STATE
 * @returns {Array<{ id: string, spec: string }>}
 */
function _defaultTasksFromLeafNodes(state) {
  const leafEntries = Object.entries(state.nodes).filter(([_, n]) => n.state === "leaf");
  return leafEntries.map(([_, node], i) => ({
    id: `TASK-${String(i + 1).padStart(3, "0")}`,
    spec: [
      "---",
      "depends_on: None",
      "---",
      "## Goal",
      "",
      node.name,
      "",
      "## Acceptance Criteria",
      "",
      `- [ ] ${node.name} implemented per ARCH.md module contract`,
      "",
    ].join("\n"),
  }));
}

/**
 * Heavyweight wave loop. Drives decomposeWave + applyAnswer + detectSpecGap
 * + isDecompositionComplete + finalizeDecompose. Pauses when
 * questionsToSurface is non-empty AND askFn is null, so the orchestrator
 * (SKILL.md) can drive AskUserQuestion. Caller resumes by applying
 * answers (calling applyAnswer + saveDecompositionState) then re-invoking
 * runArchitectPlan from phase=decomposing.
 *
 * @returns {Promise<{ ok, status, ... }>}
 */
async function _runDecomposeLoop({ pipelineDir, config, askFn, sprintNumber, taskSpecBuilder, maxWaves }) {
  const reqPath = path.join(pipelineDir, "requirements", "REQ.md");
  const reqContent = fs.existsSync(reqPath) ? fs.readFileSync(reqPath, "utf8") : null;
  const spec = loadSpec(pipelineDir);
  const specContent = spec ? spec.content : null;

  const builder = taskSpecBuilder || _defaultTasksFromLeafNodes;
  const limit = Number.isFinite(maxWaves) && maxWaves > 0 ? maxWaves : 50;

  const stateP = path.join(pipelineDir, "architecture", "DECOMPOSITION-STATE.yaml");

  let waveCount = 0;
  while (waveCount < limit) {
    if (!fs.existsSync(stateP)) {
      return { ok: false, status: "missing-decomposition-state", error: `DECOMPOSITION-STATE.yaml absent at ${stateP}` };
    }
    const state = yamlIO.safeRead(stateP);
    if (!state) {
      return { ok: false, status: "missing-decomposition-state", error: "DECOMPOSITION-STATE.yaml unreadable" };
    }

    // Convergence check before processing more waves — unresolved=0 AND
    // pending=0 means every node is leaf, blocked, or resolved.
    const completion = isDecompositionComplete(state);
    if (completion.complete) {
      const treeMd = generateTreeMd(state);
      const tasks = builder(state);
      const specsResult = createTaskSpecs(tasks, "", config);
      if (!specsResult || !specsResult.specs) {
        return { ok: false, status: "task-specs-failed", error: "createTaskSpecs returned no specs" };
      }
      const fdec = finalizeDecompose(
        pipelineDir, sprintNumber, specsResult.specs, treeMd, null, null, "sprinting",
      );
      if (!fdec.ok) {
        return { ok: false, status: "finalize-decompose-failed", error: fdec.error };
      }
      return {
        ok: true,
        status: "complete",
        targetPhase: "sprinting",
        waveCount,
        leafCount: completion.summary.leafCount,
        sprintDir: fdec.sprintDir,
      };
    }

    // Process one wave
    const waveResult = decomposeWave(state, specContent, reqContent, config);
    if (!waveResult.ok) {
      return { ok: false, status: "wave-failed", error: waveResult.error };
    }
    waveCount++;
    state.current_wave = waveCount;

    // Surface design questions
    if (waveResult.questionsToSurface.length > 0) {
      if (askFn === null) {
        // SKILL.md-driven mode: persist state and return for orchestrator
        // to call AskUserQuestion. Caller resumes by applying answers
        // (applyAnswer + saveDecompositionState) and re-invoking the runner.
        saveDecompositionState(pipelineDir, state);
        return {
          ok: true,
          status: "questions-pending",
          questions: waveResult.questionsToSurface,
          waveCount,
          state,
        };
      }
      for (const q of waveResult.questionsToSurface) {
        const answer = await askFn(q.question, q.options);
        const applyResult = applyAnswer(state, q.nodeId, answer, { decision: answer });
        if (!applyResult.ok) {
          saveDecompositionState(pipelineDir, state);
          return { ok: false, status: "apply-answer-failed", error: applyResult.error, nodeId: q.nodeId, waveCount, state };
        }
        const gap = detectSpecGap(answer, q.nodeName);
        if (gap.isSpecGap) {
          saveDecompositionState(pipelineDir, state);
          return { ok: true, status: "spec-gap", gap, waveCount, state };
        }
      }
    }

    saveDecompositionState(pipelineDir, state);
  }

  // Hit the max-waves guard without converging.
  const state = yamlIO.safeRead(stateP);
  return {
    ok: true,
    status: "max-waves-reached",
    waveCount,
    summary: state ? getConvergenceSummary(state) : null,
    state,
  };
}

/**
 * Drive the architect plan flow with injection seams for perspective
 * dispatch and design-question surfacing.
 *
 * Multi-status return shape (caller dispatches on `status`):
 *   - "phase-rejected"      — current phase isn't supported
 *   - "missing-input"       — REQ.md not found
 *   - "transition-failed"   — state-machine.writeState rejected the entry transition
 *   - "plan-failed"         — planArchitecture rejected (budget, missing input)
 *   - "briefs-pending"      — dispatchFn=null; caller dispatches via SKILL.md
 *   - "parse-failed"        — every dispatched output failed to parse
 *   - "synthesis-failed"    — synthesizeArchitecture quorum/error
 *   - "synthesis-ready"     — synthesis complete; lightweight: caller extracts
 *                             tasks + calls finalizeArchitecture(sprinting).
 *                             heavyweight: caller seeds nodes + re-invokes
 *                             (re-entry sees phase=decomposing → wave loop).
 *   - "missing-decomposition-state" — heavyweight resume with no state.yaml
 *   - "questions-pending"   — heavyweight wave produced questions; askFn=null
 *   - "spec-gap"            — design question revealed a SPEC.md gap
 *   - "max-waves-reached"   — exceeded maxWaves without converging
 *   - "complete"            — heavyweight finalizeDecompose called; phase=sprinting
 *
 * @param {Object} opts
 * @param {string} opts.pipelineDir
 * @param {string} opts.pluginRoot
 * @param {Object} opts.config
 * @param {Function|null} [opts.dispatchFn] — async (brief) => rawOutput
 * @param {Function|null} [opts.askFn] — async (question, options) => answer
 * @param {number} [opts.sprintNumber] — sprint number for finalizeDecompose (heavyweight)
 * @param {Function} [opts.taskSpecBuilder] — (state) => Array<{id, spec}>
 * @param {number} [opts.maxWaves] — convergence guard (default 50)
 * @returns {Promise<Object>}
 */
async function runArchitectPlan({
  pipelineDir,
  pluginRoot,
  config,
  dispatchFn = null,
  askFn = null,
  sprintNumber = 1,
  taskSpecBuilder = null,
  maxWaves = 50,
}) {
  const stateMachine = require("../../../lib/state-machine");
  const agentOutput = require("../../../lib/agent-output");

  const statePath = path.join(pipelineDir, "state.yaml");
  const pipelineState = yamlIO.safeRead(statePath) || {};
  const phase = pipelineState.pipeline && pipelineState.pipeline.phase;

  if (!ARCHITECT_PLAN_PHASES.includes(phase)) {
    return {
      ok: false,
      status: "phase-rejected",
      error: `phase '${phase}' not supported by runArchitectPlan; expected one of: ${ARCHITECT_PLAN_PHASES.join(", ")}`,
    };
  }

  // phase=decomposing → resume directly into wave loop
  if (phase === "decomposing") {
    return await _runDecomposeLoop({
      pipelineDir, config, askFn, sprintNumber, taskSpecBuilder, maxWaves,
    });
  }

  // Read inputs
  const reqPath = path.join(pipelineDir, "requirements", "REQ.md");
  if (!fs.existsSync(reqPath)) {
    return { ok: false, status: "missing-input", error: `REQ.md not found at ${reqPath}` };
  }
  const reqContent = fs.readFileSync(reqPath, "utf8");
  const spec = loadSpec(pipelineDir);
  const specContent = spec ? spec.content : null;
  const complexity = spec ? spec.complexity : null;

  // Routing decision
  const decision = chooseArchitectFlow(complexity);

  // Transition requirements-ready → architecture if needed (no-op when
  // already at architecture phase, e.g. resume after interrupted plan run)
  if (phase === "requirements-ready") {
    const trans = stateMachine.writeState(pipelineDir, "architecture", {}, {
      command: "/architect",
      trigger: "architect-plan-entry",
    });
    if (!trans.ok) {
      return { ok: false, status: "transition-failed", error: trans.error };
    }
  }

  // Plan architecture briefs
  const planResult = planArchitecture(reqContent, pluginRoot, config, specContent, complexity);
  if (!planResult.ok) {
    return { ok: false, status: "plan-failed", error: planResult.error };
  }

  // Production mode (dispatchFn=null): hand briefs back to SKILL.md
  if (dispatchFn === null) {
    return {
      ok: true,
      status: "briefs-pending",
      flow: decision.flow,
      decision,
      briefs: planResult.briefs,
      depthRecommendation: planResult.depthRecommendation,
    };
  }

  // Test/automation mode: dispatch all briefs in parallel and parse outputs
  const rawResults = await Promise.all(
    planResult.briefs.map(async (b) => ({
      lensId: b.lensId,
      agentId: b.agentId,
      briefId: b.briefId,
      rawOutput: await dispatchFn(b),
    })),
  );

  const parsedOutputs = [];
  const parseFailures = [];
  for (const r of rawResults) {
    const parsed = agentOutput.parseOutput(r.rawOutput);
    if (parsed.ok) {
      parsedOutputs.push({
        agentId: r.agentId,
        lensId: r.lensId,
        briefId: r.briefId,
        payload: parsed.payload,
        meta: parsed.meta,
      });
    } else {
      parseFailures.push({ agentId: r.agentId, error: parsed.error || "parse failed" });
    }
  }
  if (parsedOutputs.length === 0) {
    return {
      ok: false,
      status: "parse-failed",
      error: "all dispatched perspective outputs failed to parse",
      failures: parseFailures,
    };
  }

  // Synthesize
  const synthResult = synthesizeArchitecture(parsedOutputs, reqContent, config);
  if (!synthResult.ok) {
    return { ok: false, status: "synthesis-failed", error: synthResult.error };
  }

  // Branch on flow. Both branches return synthesis-ready — for lightweight
  // the caller extracts tasks from archDoc and invokes finalizeArchitecture
  // (sprinting). For heavyweight we additionally finalize architecture
  // (decomposing) + initialize decomposition state, then return synthesis-
  // ready with the note that the caller must seed initial nodes (per
  // plan.md step 9 — "Create initial nodes from synthesized architecture
  // — one node per top-level module/system from step 8") before re-
  // invoking runArchitectPlan, which will then enter the wave loop.
  if (decision.flow === "lightweight") {
    return {
      ok: true,
      status: "synthesis-ready",
      flow: "lightweight",
      decision,
      archDoc: synthResult.architecture,
      synthDoc: synthResult.synthesis,
      consistency: synthResult.consistency,
    };
  }

  // Heavyweight
  const finalizeArch = finalizeArchitecture(
    pipelineDir, synthResult.architecture, synthResult.synthesis, "decomposing",
  );
  if (!finalizeArch.ok) {
    return { ok: false, status: "finalize-arch-failed", error: finalizeArch.error };
  }
  initDecompositionState(pipelineDir);

  return {
    ok: true,
    status: "synthesis-ready",
    flow: "heavyweight",
    decision,
    archDoc: synthResult.architecture,
    synthDoc: synthResult.synthesis,
    consistency: synthResult.consistency,
    note: "Heavyweight: phase is now 'decomposing' and DECOMPOSITION-STATE.yaml is initialized. Seed initial nodes via addNode for each top-level module from ARCH.md, then re-invoke runArchitectPlan to drive the wave loop.",
  };
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
 * LEGACY runReview — sync, single-pass.
 *
 * Scope: retained ONLY for the /architect skill's grounded review path
 * (clears state.grounded_required after a snippet-in-file substring check).
 * /review production code uses `skills/review/scripts/review-runner.runReview`
 * which is async and runs the full validator round with path-evidence
 * line-proximity check. Do NOT use this from /review — it bypasses the
 * validator round and returns a different shape.
 *
 * Sprint-7 review correctly flagged the dual implementation as a state
 * inconsistency risk; the root cause was a stale `commands/review.md`
 * pointing here instead of at review-runner. Doc fix lands in 0.4.6.
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

  // Grounded post-validation pass — when state.yaml has grounded_required: true,
  // drop any finding whose backtick snippet cannot be found verbatim in the
  // referenced source file. Findings without an extractable snippet or file ref
  // are left untouched (per constraint: never drop un-parseable findings).
  const stateData = yamlIO.safeReadWithFallback(path.join(pipelineDir, "state.yaml")) || {};
  if (stateData.grounded_required === true) {
    const projectRoot = path.dirname(pipelineDir);
    const allFiles = collectProjectFiles(projectRoot);
    let groundedDropCount = 0;

    for (const severity of ["critical", "high", "medium", "low"]) {
      if (!findings[severity]) continue;
      findings[severity] = findings[severity].filter(finding => {
        const snippetMatch = finding.text.match(/`([^`]{4,})`/);
        const fileRefs = Array.from(finding.text.matchAll(FILE_REF_PATTERN), m => m[1]);
        // No parseable snippet or file ref — keep the finding (never drop un-parseable)
        if (!snippetMatch || fileRefs.length === 0) return true;

        const verbatimQuote = snippetMatch[1];

        // Check every file ref extracted from the finding text
        const isGrounded = fileRefs.some(fileRef => {
          const refBasename = path.basename(fileRef).toLowerCase();
          const candidates = allFiles.filter(f => path.basename(f).toLowerCase() === refBasename);
          // No matching file found — cannot verify this ref, treat as unverifiable (grounded)
          if (candidates.length === 0) return true;
          return candidates.some(candidatePath => {
            try {
              const content = fs.readFileSync(candidatePath, "utf8");
              return content.includes(verbatimQuote);
            } catch (_e) { return false; }
          });
        });

        if (!isGrounded) {
          process.stderr.write(`[grounded-drop] fabricated: ${finding.text.slice(0, 120)}\n`);
          groundedDropCount++;
          return false;
        }
        return true;
      });
    }

    if (groundedDropCount > 0) {
      const reportPath = path.join(reviewDir, "QA-REPORT.md");
      if (fs.existsSync(reportPath)) {
        const existingReport = fs.readFileSync(reportPath, "utf8");
        fs.writeFileSync(
          reportPath,
          existingReport + `\n## Grounded Review\n\nDropped ${groundedDropCount} finding(s) with unverifiable verbatim quotes.\n`,
          "utf8"
        );
      }
    }

    // Clear the grounded_required flag so the next sprint starts clean
    yamlIO.safeWrite(path.join(pipelineDir, "state.yaml"), {
      ...stateData,
      grounded_required: false,
      last_updated: new Date().toISOString(),
    });
  }

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

// Valid node states and their allowed transitions.
//
// `in-progress` represents a node currently being evaluated by decomposeWave.
// After evaluateNode classifies it, the wave moves the node into one of:
//   - `resolved`   (technical detail — architect resolves)
//   - `leaf`       (small enough — no further decomposition)
//   - `blocked`    (cannot proceed — surfaced to user)
//   - `pending-user-decision` (design choice — surfaced via AskUserQuestion)
// Bug fix (v0.5.0 / 3b): `pending-user-decision` was missing from the
// in-progress allowed list, which silently dropped the state-transition in
// updateNodeState (return value was unchecked) and left every design-
// keyword node stuck at `in-progress`.
const NODE_STATES = {
  unresolved: ["in-progress", "pending-user-decision"],
  "in-progress": ["resolved", "leaf", "blocked", "pending-user-decision"],
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
  if (state.nodes[nodeId]) {
    // Duplicate guard — re-adding would silently overwrite the existing
    // node and orphan its children references in the parent. Wave loop
    // re-entries (resume after crash, replay) must not stomp prior state.
    return { ok: false, error: `node "${nodeId}" already exists` };
  }
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

// Convergence check threshold — default depth before architect prompts user.
// Used as a fallback when SPEC.md has no complexity block. Adaptive callers
// should prefer convergenceCheckWaveFor(complexity) which scales to scope.
const CONVERGENCE_CHECK_WAVE = 10;

// Per-complexity convergence depth. Smaller scopes converge sooner — "bug-fix"
// rarely needs 10 waves of decomposition; "new-project" may need more leeway.
const CONVERGENCE_CHECK_WAVE_BY_COMPLEXITY = {
  "bug-fix":         3,
  "new-feature":     7,
  "partial-rewrite": 10,
  "new-project":     15,
};

/**
 * Adaptive convergence threshold derived from SPEC complexity signal.
 * Falls back to CONVERGENCE_CHECK_WAVE when complexity is missing/invalid.
 *
 * @param {object|null} complexity — output of parseComplexityBlock()
 * @returns {number} wave count after which architect should check convergence
 */
function convergenceCheckWaveFor(complexity) {
  if (!complexity || !complexity.assessment) return CONVERGENCE_CHECK_WAVE;
  const v = CONVERGENCE_CHECK_WAVE_BY_COMPLEXITY[complexity.assessment];
  if (typeof v !== "number") return CONVERGENCE_CHECK_WAVE;
  // touch_surface:broad escalates one tier — adds care without removing the cap
  if (complexity.touch_surface === "broad") {
    return v + 3;
  }
  return v;
}

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

    // First transition to in-progress. updateNodeState returns
    // {ok:false} on illegal transitions — bail with the error so the
    // wave loop surfaces the problem instead of silently corrupting
    // state (latent bug class: NODE_STATES["in-progress"] previously
    // missed "pending-user-decision" and the unchecked return swallowed
    // the rejection, leaving nodes stuck in "in-progress").
    let r = updateNodeState(state, nodeId, "in-progress");
    if (!r.ok) {
      return { ok: false, error: `decomposeWave: ${r.error}`, nodeId, nodesProcessed, nodesResolved, nodesPending, questionsToSurface };
    }

    const evaluation = evaluateNode(node, specContent);

    if (evaluation.isLeaf) {
      // Small enough, no design choices — mark as leaf
      r = updateNodeState(state, nodeId, "leaf");
      if (!r.ok) {
        return { ok: false, error: `decomposeWave: ${r.error}`, nodeId, nodesProcessed, nodesResolved, nodesPending, questionsToSurface };
      }
      nodesResolved++;
    } else if (evaluation.hasDesignChoice) {
      // Design question — needs user input
      r = updateNodeState(state, nodeId, "pending-user-decision", {
        design_question: evaluation.question,
      });
      if (!r.ok) {
        return { ok: false, error: `decomposeWave: ${r.error}`, nodeId, nodesProcessed, nodesResolved, nodesPending, questionsToSurface };
      }
      questionsToSurface.push({
        nodeId,
        nodeName: node.name,
        question: evaluation.question,
        options: evaluation.options,
      });
      nodesPending++;
    } else {
      // Technical detail — architect resolves, create children for further decomposition
      r = updateNodeState(state, nodeId, "resolved", {
        wave_resolved: state.current_wave,
      });
      if (!r.ok) {
        return { ok: false, error: `decomposeWave: ${r.error}`, nodeId, nodesProcessed, nodesResolved, nodesPending, questionsToSurface };
      }
      nodesResolved++;

      // If the node can be decomposed further, add child nodes
      if (evaluation.children && evaluation.children.length > 0) {
        for (const child of evaluation.children) {
          const childId = `${nodeId}-${child.id}`;
          const addRes = addNode(state, childId, {
            name: child.name,
            state: "unresolved",
            depth: node.depth + 1,
            parent_id: nodeId,
            children: [],
          });
          if (!addRes.ok) {
            return { ok: false, error: `decomposeWave: ${addRes.error}`, nodeId: childId, nodesProcessed, nodesResolved, nodesPending, questionsToSurface };
          }
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
  finalizeDecompose,
  VALID_DECOMPOSE_ROUTES,
  finalizeArchitecture,
  VALID_ARCHITECTURE_ROUTES,
  runArchitectPlan,
  ARCHITECT_PLAN_PHASES,
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
  // Scope-aware depth recommendation — adapts decomposition to spec complexity.
  // Architect logs the recommendation; Claude uses it to inform wave depth, not as a hard cap.
  recommendDecompositionDepth,
  chooseArchitectFlow,
  // Adaptive convergence threshold — scales with complexity assessment.
  // Replaces the static CONVERGENCE_CHECK_WAVE for callers that have read SPEC complexity.
  convergenceCheckWaveFor,
  CONVERGENCE_CHECK_WAVE_BY_COMPLEXITY,
};
