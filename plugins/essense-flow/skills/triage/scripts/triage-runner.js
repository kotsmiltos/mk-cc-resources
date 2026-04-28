"use strict";

const fs = require("fs");
const path = require("path");
const yamlIO = require("../../../lib/yaml-io");
const paths = require("../../../lib/paths");
const { computeDropSource } = require("../../../lib/triage-utils");
const { GROUNDED_REREVIEW_THRESHOLD } = require("../../../lib/constants");

// Phase priority for multi-category routing (lowest index = earliest phase)
const PHASE_PRIORITY = ["eliciting", "research", "architecture", "verifying"];

// Words shorter than this threshold are excluded from keyword extraction
const MIN_KEYWORD_LENGTH = 5;

// Minimum number of significant keywords that must match for coverage
const MIN_KEYWORD_MATCHES = 2;

// Indicators that an item describes an implementation bug
const BUG_INDICATORS = [
  "fails",
  "broken",
  "incorrect",
  "diverges",
  "doesn't match",
  "wrong",
  "error",
  "crash",
  "missing implementation",
  "not working",
  "regression",
  "unexpected behavior",
];

// Domain concern keywords that trigger missing-analysis checks
const DOMAIN_KEYWORDS = [
  "security",
  "performance",
  "scalability",
  "reliability",
  "accessibility",
  "compliance",
  "privacy",
  "observability",
  "availability",
  "durability",
  "latency",
  "throughput",
];

// Phrases indicating an item is an accepted/known limitation
const ACCEPTABLE_INDICATORS = [
  "acceptable",
  "known limitation",
  "won't fix",
  "by design",
  "wontfix",
  "not a bug",
  "expected behavior",
  "out of scope",
];

// Common English words excluded from keyword extraction
const STOP_WORDS = new Set([
  "about", "above", "after", "again", "being", "below", "between",
  "could", "doing", "during", "every", "first", "found", "great",
  "having", "hence", "itself", "might", "other", "ought", "quite",
  "shall", "should", "since", "still", "their", "there", "these",
  "thing", "those", "through", "under", "until", "using", "very",
  "where", "which", "while", "would", "yours", "always", "because",
  "before", "either", "enough", "further", "however", "indeed",
  "instead", "likely", "matter", "never", "nothing", "perhaps",
  "rather", "really", "seems", "sometimes", "therefore", "though",
  "unless", "whether", "within", "without", "items", "needs",
  "check", "based", "point", "issue", "noted", "review", "ensure",
  "handle", "allow", "added", "given", "makes", "value", "state",
]);

/**
 * Extract significant keywords from a description string.
 * Filters out short words and common stop words.
 *
 * @param {string} text — text to extract keywords from
 * @returns {string[]} — array of lowercase keywords
 */
function extractKeywords(text) {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter(
      (word) => word.length >= MIN_KEYWORD_LENGTH && !STOP_WORDS.has(word)
    );
}

/**
 * Check whether specContent covers an item's description via keyword matching.
 *
 * @param {string} itemDescription — the item description to check
 * @param {string} specContent — the SPEC.md content to search against
 * @returns {{ covered: boolean, matchedTerms: string[] }}
 */
function hasSpecCoverage(itemDescription, specContent) {
  if (!specContent || !itemDescription) {
    return { covered: false, matchedTerms: [] };
  }

  const keywords = extractKeywords(itemDescription);
  if (keywords.length === 0) {
    return { covered: false, matchedTerms: [] };
  }

  const specLower = specContent.toLowerCase();
  const matchedTerms = keywords.filter((kw) => specLower.includes(kw));

  return {
    covered: matchedTerms.length >= MIN_KEYWORD_MATCHES,
    matchedTerms,
  };
}

/**
 * Check whether ARCH.md covers an item's description.
 *
 * @param {string} itemDescription — the item description to check
 * @param {string} pipelineDir — absolute path to .pipeline/ directory
 * @returns {{ covered: boolean, matchedTerms: string[] }}
 */
function hasArchCoverage(itemDescription, pipelineDir) {
  if (!pipelineDir) return { covered: false, matchedTerms: [] };

  const archPath = path.join(pipelineDir, "architecture", "ARCH.md");
  let archContent;
  try {
    if (!fs.existsSync(archPath)) return { covered: false, matchedTerms: [] };
    archContent = fs.readFileSync(archPath, "utf8");
  } catch (_e) {
    return { covered: false, matchedTerms: [] };
  }

  const keywords = extractKeywords(itemDescription);
  if (keywords.length === 0) return { covered: false, matchedTerms: [] };

  const archLower = archContent.toLowerCase();
  const matchedTerms = keywords.filter((kw) => archLower.includes(kw));

  return {
    covered: matchedTerms.length >= MIN_KEYWORD_MATCHES,
    matchedTerms,
  };
}

/**
 * Check whether any task spec in sprint task directories references an item.
 *
 * @param {string} itemDescription — the item description to check
 * @param {string} pipelineDir — absolute path to .pipeline/ directory
 * @returns {{ covered: boolean, taskId: string|null, matchedTerms: string[] }}
 */
function hasTaskCoverage(itemDescription, pipelineDir) {
  if (!pipelineDir) {
    return { covered: false, taskId: null, matchedTerms: [] };
  }

  const sprintsDir = path.join(pipelineDir, "sprints");
  if (!fs.existsSync(sprintsDir)) {
    return { covered: false, taskId: null, matchedTerms: [] };
  }

  const keywords = extractKeywords(itemDescription);
  if (keywords.length === 0) {
    return { covered: false, taskId: null, matchedTerms: [] };
  }

  let bestMatch = { taskId: null, matchCount: 0, matchedTerms: [] };

  try {
    const sprintDirs = fs
      .readdirSync(sprintsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory());

    for (const sprintDir of sprintDirs) {
      const tasksDir = path.join(sprintsDir, sprintDir.name, "tasks");
      if (!fs.existsSync(tasksDir)) continue;

      const taskFiles = fs
        .readdirSync(tasksDir)
        .filter((f) => f.endsWith(".md"));

      for (const taskFile of taskFiles) {
        const taskPath = path.join(tasksDir, taskFile);
        let taskContent;
        try {
          taskContent = fs.readFileSync(taskPath, "utf8").toLowerCase();
        } catch (_e) {
          continue;
        }

        const matched = keywords.filter((kw) => taskContent.includes(kw));
        if (matched.length > bestMatch.matchCount) {
          bestMatch = {
            taskId: `${sprintDir.name}/${taskFile.replace(".md", "")}`,
            matchCount: matched.length,
            matchedTerms: matched,
          };
        }
      }
    }
  } catch (_e) {
    return { covered: false, taskId: null, matchedTerms: [] };
  }

  return {
    covered: bestMatch.matchCount >= MIN_KEYWORD_MATCHES,
    taskId: bestMatch.taskId,
    matchedTerms: bestMatch.matchedTerms,
  };
}

/**
 * Check whether the item description indicates an implementation bug.
 *
 * @param {string} itemDescription — the item description to check
 * @returns {{ isBug: boolean, matchedIndicators: string[] }}
 */
function isImplementationBug(itemDescription) {
  if (!itemDescription) return { isBug: false, matchedIndicators: [] };
  const lower = itemDescription.toLowerCase();
  const matchedIndicators = BUG_INDICATORS.filter((ind) =>
    lower.includes(ind)
  );
  return {
    isBug: matchedIndicators.length > 0,
    matchedIndicators,
  };
}

/**
 * Check whether the item description mentions a domain concern.
 *
 * @param {string} itemDescription — the item description to check
 * @returns {{ isDomain: boolean, matchedDomains: string[] }}
 */
function isDomainConcern(itemDescription) {
  if (!itemDescription) return { isDomain: false, matchedDomains: [] };
  const lower = itemDescription.toLowerCase();
  const matchedDomains = DOMAIN_KEYWORDS.filter((kw) => lower.includes(kw));
  return {
    isDomain: matchedDomains.length > 0,
    matchedDomains,
  };
}

/**
 * Check whether the item description indicates an acceptable/known limitation.
 *
 * @param {string} itemDescription — the item description to check
 * @returns {{ isAcceptable: boolean, matchedPhrases: string[] }}
 */
function isAcceptableLimitation(itemDescription) {
  if (!itemDescription) return { isAcceptable: false, matchedPhrases: [] };
  const lower = itemDescription.toLowerCase();
  const matchedPhrases = ACCEPTABLE_INDICATORS.filter((phrase) =>
    lower.includes(phrase)
  );
  return {
    isAcceptable: matchedPhrases.length > 0,
    matchedPhrases,
  };
}

/**
 * Read REQ.md content from the pipeline directory.
 *
 * @param {string} pipelineDir — absolute path to .pipeline/
 * @returns {string|null}
 */
function readReqContent(pipelineDir) {
  if (!pipelineDir) return null;
  const reqPath = path.join(pipelineDir, "requirements", "REQ.md");
  try {
    if (!fs.existsSync(reqPath)) return null;
    return fs.readFileSync(reqPath, "utf8");
  } catch (_e) {
    return null;
  }
}

/**
 * Pre-categorization staleness check.
 * Validates each incoming item before categorization runs:
 * - Bug findings: confirms verbatim_quote still appears in the cited file.
 *   If not, marks stale (file deleted or quote no longer present).
 * - Gap findings: gap staleness (covered-elsewhere) is handled in categorizeItem
 *   against SPEC.md — no additional check needed here.
 *
 * Returns surviving items (passed checks) and dropped items (stale, with reason).
 *
 * @param {Array<{ id: string, description: string, source: string, verbatim_quote?: string, file_path?: string }>} items
 * @param {string} pipelineDir — absolute path to .pipeline/
 * @returns {{ surviving: Array, dropped: Array }}
 */
function revalidateFindings(items, pipelineDir) {
  const surviving = [];
  const dropped = [];

  for (const item of items || []) {
    // Only items with an explicit verbatim_quote and file_path can go stale this way
    if (item.verbatim_quote && item.file_path && pipelineDir) {
      const projectRoot = path.dirname(pipelineDir);
      const absPath = path.join(projectRoot, item.file_path);

      if (!fs.existsSync(absPath)) {
        dropped.push({
          ...item,
          stale: "file-not-found",
          stale_reason: `Cited file no longer exists: ${item.file_path}`,
        });
        continue;
      }

      const fileContent = fs.readFileSync(absPath, "utf8");
      const quote = item.verbatim_quote.trim();
      if (quote.length > 0 && !fileContent.includes(quote)) {
        dropped.push({
          ...item,
          stale: "quote-mismatch",
          stale_reason: `verbatim_quote not found in ${item.file_path}: "${quote.slice(0, 80)}"`,
        });
        continue;
      }
    }

    surviving.push(item);
  }

  return { surviving, dropped };
}

/**
 * Categorize a single item and return its category with rationale.
 *
 * @param {Object} item — { id, description, source }
 * @param {string|null} specContent — SPEC.md text
 * @param {string|null} pipelineDir — .pipeline/ path
 * @returns {{ category: string, rationale: string }}
 */
function categorizeItem(item, specContent, pipelineDir) {
  const desc = item.description || "";

  // Step 6: Check for acceptable limitation first (explicit markers override all)
  const acceptableResult = isAcceptableLimitation(desc);
  if (acceptableResult.isAcceptable) {
    return {
      category: "acceptable",
      rationale: `Item explicitly marked as acceptable/known limitation. Matched phrases: ${acceptableResult.matchedPhrases.join(", ")}`,
    };
  }

  // Step 0: Grounded check — verify verbatim_quote exists in the referenced file.
  // If a quote is supplied but cannot be found in the file, the finding is stale
  // (file has changed since the finding was recorded) and must not proceed further.
  if (item.verbatim_quote && item.file_path && pipelineDir) {
    const projectRoot = path.dirname(pipelineDir);
    const absPath = path.join(projectRoot, item.file_path);
    if (fs.existsSync(absPath)) {
      const fileContent = fs.readFileSync(absPath, "utf8");
      const quote = item.verbatim_quote.trim();
      if (quote.length > 0 && !fileContent.includes(quote)) {
        return {
          category: "stale:quote-mismatch",
          rationale: `verbatim_quote not found in ${item.file_path}: "${quote.slice(0, 80)}"`,
        };
      }
    }
  }

  // Step 1: Check SPEC.md coverage
  const specResult = hasSpecCoverage(desc, specContent);
  if (!specResult.covered) {
    const reason = specResult.matchedTerms.length > 0
      ? `Only ${specResult.matchedTerms.length} keyword(s) matched in SPEC.md (${specResult.matchedTerms.join(", ")}), below threshold of ${MIN_KEYWORD_MATCHES} required for coverage`
      : "No significant keywords from this item found in SPEC.md";
    return {
      category: "design_gaps",
      rationale: `Spec does not cover this item. ${reason}.`,
    };
  }

  // Step 2: Check architecture coverage (only when pipelineDir available)
  if (pipelineDir) {
    const archResult = hasArchCoverage(desc, pipelineDir);
    if (!archResult.covered) {
      return {
        category: "design_decisions",
        rationale: `Spec covers this item (matched: ${specResult.matchedTerms.join(", ")}), but ARCH.md does not address it. Architecture decision needed.`,
      };
    }

    // Step 3: Check task coverage and bug indicators
    const taskResult = hasTaskCoverage(desc, pipelineDir);
    const bugResult = isImplementationBug(desc);

    if (taskResult.covered && bugResult.isBug) {
      return {
        category: "implementation_bugs",
        rationale: `Task ${taskResult.taskId} addresses this area, but item indicates implementation issue. Bug indicators: ${bugResult.matchedIndicators.join(", ")}. Task matched on: ${taskResult.matchedTerms.join(", ")}.`,
      };
    }
  }

  // Step 4: Check domain concern against REQ.md
  const domainResult = isDomainConcern(desc);
  if (domainResult.isDomain) {
    const reqContent = readReqContent(pipelineDir);
    if (reqContent) {
      const reqLower = reqContent.toLowerCase();
      const uncoveredDomains = domainResult.matchedDomains.filter(
        (d) => !reqLower.includes(d)
      );
      if (uncoveredDomains.length > 0) {
        return {
          category: "missing_analysis",
          rationale: `Item raises domain concern(s) not covered in REQ.md: ${uncoveredDomains.join(", ")}.`,
        };
      }
    } else if (!pipelineDir) {
      // No REQ.md available and no pipeline dir — domain concern is unverifiable
      return {
        category: "missing_analysis",
        rationale: `Item raises domain concern(s) (${domainResult.matchedDomains.join(", ")}), but no REQ.md available to verify coverage.`,
      };
    }
  }

  // Step 5: Ambiguous — multiple categories could fit or nothing clearly applies
  // If we got here and pipelineDir is available, the item has spec and arch coverage
  // but doesn't clearly fall into bugs, domain concerns, or acceptable
  if (pipelineDir) {
    const bugResult = isImplementationBug(desc);
    const taskResult = hasTaskCoverage(desc, pipelineDir);

    // Bug indicators without task coverage is ambiguous
    if (bugResult.isBug && !taskResult.covered) {
      return {
        category: "ambiguous",
        rationale: `Item has bug indicators (${bugResult.matchedIndicators.join(", ")}) but no matching task was found. Could be design_decisions or implementation_bugs.`,
      };
    }

    // Has task coverage, no bug — item is covered, categorize as acceptable
    if (taskResult.covered) {
      return {
        category: "acceptable",
        rationale: `Item is covered by spec, architecture, and task ${taskResult.taskId}. No bug indicators found. Considered addressed.`,
      };
    }
  }

  // Fallback: ambiguous when we can't clearly categorize
  return {
    category: "ambiguous",
    rationale: `Item has spec coverage (matched: ${specResult.matchedTerms.join(", ")}) but could not be definitively categorized. Manual review recommended.`,
  };
}

/**
 * Load queued findings from a prior triage pass.
 * These are findings that were deferred to later phases and need re-evaluation.
 *
 * @param {string} pipelineDir — absolute path to .pipeline/
 * @returns {Array<{ id: string, description: string, source: string }>}
 */
function loadQueuedFindings(pipelineDir) {
  if (!pipelineDir) return [];
  const queuedPath = path.join(pipelineDir, "triage", "queued-findings.yaml");
  const data = yamlIO.safeReadWithFallback(queuedPath);
  if (!data || !Array.isArray(data.items)) return [];
  return data.items;
}

/**
 * Merge new items with previously queued findings, deduplicating by id.
 * Queued items are marked with source "queued" so they can be distinguished
 * from fresh findings in the triage report.
 *
 * @param {Array} newItems — fresh gaps or findings from current phase
 * @param {Array} queuedItems — items from prior queued-findings.yaml
 * @returns {Array} — merged, deduplicated item list
 */
function mergeWithQueued(newItems, queuedItems) {
  if (!queuedItems || queuedItems.length === 0) return newItems || [];
  if (!newItems || newItems.length === 0) {
    return queuedItems.map((item) => ({ ...item, source: item.source || "queued" }));
  }

  const seen = new Set();
  const merged = [];

  // New items take precedence
  for (const item of newItems) {
    if (item.id) seen.add(item.id);
    merged.push(item);
  }

  // Queued items only added if not already present
  for (const item of queuedItems) {
    if (item.id && seen.has(item.id)) continue;
    merged.push({ ...item, source: item.source || "queued" });
  }

  return merged;
}

/**
 * Determine whether a categorization result is ambiguous.
 * A result is ambiguous if it carries an explicit ambiguous flag or
 * has multiple candidate routes with no single dominant one.
 *
 * @param {Object|null} result — categorizeItem result or a route descriptor
 * @returns {boolean}
 */
function isAmbiguous(result) {
  if (!result) return false;
  if (result.ambiguous === true) return true;
  if (Array.isArray(result.routes) && result.routes.length > 1) return true;
  return false;
}

/**
 * Emit a structured AMBIGUOUS_FINDING signal to stdout so the orchestrator
 * can intercept and prompt for user input instead of auto-routing.
 *
 * @param {Object} item — the finding being categorized
 * @param {string[]} routes — candidate route options
 */
function emitAmbiguousSignal(item, routes) {
  const findingId = item.id || item.description || "unknown";
  process.stdout.write(
    JSON.stringify({
      type: "AMBIGUOUS_FINDING",
      finding_id: findingId,
      options: routes.length > 0 ? routes : ["elicitation", "architecture", "defer"],
      message: `Finding "${findingId}" has multiple candidate routes. Awaiting selection.`,
    }) + "\n"
  );
}

/**
 * Categorize all items against spec, architecture, and task coverage.
 * Automatically loads and merges queued findings from prior triage passes.
 * Falls back to Increment 1 pass-through when specContent is not provided.
 * Emits AMBIGUOUS_FINDING signals for items that cannot be auto-routed.
 * Every item receives a disposition — no silent skips.
 *
 * @param {Array<{ id: string, description: string, source: string }>} items — gaps or findings
 * @param {string|null} specContent — SPEC.md content for cross-referencing
 * @param {string|null} [pipelineDir=null] — .pipeline/ path for arch/task checks
 * @returns {{ categorized: Object, route: string }}
 */
function categorizeItems(items, specContent, pipelineDir) {
  pipelineDir = pipelineDir || null;

  // Load and merge queued findings from prior triage passes
  const queuedItems = loadQueuedFindings(pipelineDir);
  const allItems = mergeWithQueued(items, queuedItems);

  const categorized = {
    design_gaps: [],
    design_decisions: [],
    implementation_bugs: [],
    missing_analysis: [],
    ambiguous: [],
    acceptable: [],
    all_items: allItems,
  };

  // Increment 1 fallback: when no specContent provided, pass through
  if (!specContent || !allItems || allItems.length === 0) {
    return categorized;
  }

  // Full categorization (Increment 2)
  for (const item of allItems) {
    const result = categorizeItem(item, specContent, pipelineDir);
    const { category, rationale } = result;

    // When the item lands in the ambiguous bucket, emit a structured signal
    // so the orchestrator can surface it for user input instead of silently
    // auto-routing. The item is still recorded in the report with a
    // triage_route of "pending_user_input" so no finding is left undisposed.
    if (category === "ambiguous" || isAmbiguous(result)) {
      const candidateRoutes = Array.isArray(result.routes) ? result.routes : [];
      emitAmbiguousSignal(item, candidateRoutes);
      const enrichedItem = {
        ...item,
        rationale,
        triage_route: "pending_user_input",
        ambiguous_routes: candidateRoutes.length > 0
          ? candidateRoutes
          : ["elicitation", "architecture", "defer"],
      };
      categorized.ambiguous.push(enrichedItem);
    } else {
      const enrichedItem = { ...item, rationale };
      categorized[category].push(enrichedItem);
    }
  }

  return categorized;
}

/**
 * Determine the target phase based on categorized findings.
 * Routes to the earliest phase that has work (elicit < research < architect < complete).
 *
 * @param {Object} categorized — output of categorizeItems
 * @returns {string} — target phase name for state machine transition
 */
function determineRoute(categorized) {
  if (categorized.design_gaps.length > 0) return "eliciting";
  if (categorized.missing_analysis.length > 0) return "research";
  if (categorized.design_decisions.length > 0 || categorized.implementation_bugs.length > 0) {
    return "architecture";
  }
  if (categorized.acceptable.length > 0 && categorized.all_items.length === categorized.acceptable.length) {
    return "verifying";
  }
  // Default: all gaps are implementation tasks, forward to architect
  return "requirements-ready";
}

/**
 * Read blocks_advance_count from QA-REPORT.md frontmatter.
 * Returns null if the file or field is missing — triage falls back to
 * categorization-based routing in that case (legacy/old-schema compatibility).
 */
function readBlocksAdvanceCount(qaReportPath) {
  if (!qaReportPath || !fs.existsSync(qaReportPath)) return null;
  try {
    const content = fs.readFileSync(qaReportPath, "utf8");
    // Frontmatter is delimited by --- ... --- at top of file
    const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
    if (!match) return null;
    const fm = yamlIO.parseString ? yamlIO.parseString(match[1]) : null;
    if (fm && typeof fm.blocks_advance_count === "number") {
      return fm.blocks_advance_count;
    }
    // Fall back to regex if parser didn't catch it
    const lineMatch = match[1].match(/^blocks_advance_count:\s*(\d+)/m);
    if (lineMatch) return parseInt(lineMatch[1], 10);
    return null;
  } catch (_e) {
    return null;
  }
}

/**
 * Deterministic routing based on QA-REPORT blocks_advance_count.
 * Returns a structured decision the caller can act on without further interpretation.
 *
 * Output shape:
 *   { source: "blocks_advance" | "missing", route: string | null, reason: string }
 *
 * Routing semantics:
 *   - count == 0 → { source: "blocks_advance", route: "verifying", reason: "no blockers" }
 *   - count > 0  → { source: "blocks_advance", route: null,        reason: "N blockers; category routing applies" }
 *   - count missing → { source: "missing",    route: null,        reason: "old QA-REPORT schema" }
 *
 * Caller pattern:
 *   const decision = routeByBlocksAdvance(qaPath);
 *   if (decision.route) return decision.route;
 *   // count > 0 OR count missing — fall through to category-based determineRoute()
 */
function routeByBlocksAdvance(qaReportPath) {
  const count = readBlocksAdvanceCount(qaReportPath);
  if (count === null) {
    return { source: "missing", route: null, reason: "QA-REPORT lacks blocks_advance_count (old schema)" };
  }
  if (count === 0) {
    return { source: "blocks_advance", route: "verifying", reason: "no blockers — advance toward verify" };
  }
  return { source: "blocks_advance", route: null, reason: `${count} blocker(s) — category routing applies` };
}

/**
 * Combined routing: deterministic blocks_advance signal first, category routing fallback.
 * This is the function the runner should call — encapsulates the two-tier rule.
 *
 * @param {string} qaReportPath — path to QA-REPORT.md
 * @param {object} categorized — output of categorizeItems(); used when blocks_advance is silent
 * @returns {{ route: string, signal: object }} signal carries provenance for logging/triage report
 */
function routeFinal(qaReportPath, categorized) {
  const blocksDecision = routeByBlocksAdvance(qaReportPath);
  if (blocksDecision.route) {
    return { route: blocksDecision.route, signal: blocksDecision };
  }
  const categoryRoute = determineRoute(categorized);
  return {
    route: categoryRoute,
    signal: {
      source: "category",
      route: categoryRoute,
      reason: `${blocksDecision.source}: ${blocksDecision.reason}; category routing chose ${categoryRoute}`,
    },
  };
}

/**
 * Generate triage report markdown with per-item rationale.
 *
 * @param {Object} categorized — categorized findings
 * @param {string} route — determined route
 * @param {string} source — "research" or "review"
 * @returns {string} — markdown report
 */
function generateReport(categorized, route, source) {
  const lines = [];
  lines.push("---");
  lines.push("artifact: triage-report");
  lines.push("schema_version: 1");
  lines.push(`source: ${source}`);
  lines.push(`route: ${route}`);
  lines.push(`generated_at: ${new Date().toISOString()}`);
  lines.push("---");
  lines.push("");
  lines.push("# Triage Report");
  lines.push("");
  lines.push(`**Source:** ${source}`);
  lines.push(`**Route:** ${route}`);
  lines.push(`**Total items:** ${categorized.all_items.length}`);
  lines.push("");

  lines.push("## Categorization Summary");
  lines.push("");
  lines.push(`- Design gaps (\u2192 elicit): ${categorized.design_gaps.length}`);
  lines.push(`- Design decisions (\u2192 architect): ${categorized.design_decisions.length}`);
  lines.push(`- Implementation bugs (\u2192 architect): ${categorized.implementation_bugs.length}`);
  lines.push(`- Missing analysis (\u2192 research): ${categorized.missing_analysis.length}`);
  lines.push(`- Ambiguous (\u2192 user): ${categorized.ambiguous.length}`);
  lines.push(`- Acceptable limitations (\u2192 complete): ${categorized.acceptable.length}`);
  lines.push("");

  lines.push("## Routing Decision");
  lines.push("");
  lines.push(`Pipeline routed to **${route}** based on earliest-phase rule.`);
  lines.push("");

  // Per-item detail sections
  const sections = [
    { key: "design_gaps", title: "Design Gaps", routeLabel: "elicit" },
    { key: "design_decisions", title: "Design Decisions", routeLabel: "architect" },
    { key: "implementation_bugs", title: "Implementation Bugs", routeLabel: "architect" },
    { key: "missing_analysis", title: "Missing Analysis", routeLabel: "research" },
    { key: "ambiguous", title: "Ambiguous Items", routeLabel: "user review" },
    { key: "acceptable", title: "Acceptable Limitations", routeLabel: "complete" },
  ];

  const hasAnyItems = sections.some((s) => categorized[s.key].length > 0);

  if (hasAnyItems) {
    lines.push("## Item Details");
    lines.push("");

    for (const section of sections) {
      const sectionItems = categorized[section.key];
      if (sectionItems.length === 0) continue;

      lines.push(`### ${section.title} (\u2192 ${section.routeLabel})`);
      lines.push("");

      for (const item of sectionItems) {
        lines.push(`**${item.id || "unknown"}** (source: ${item.source || "unknown"})`);
        lines.push(`> ${item.description || "No description"}`);
        lines.push("");
        if (item.rationale) {
          lines.push(`_Rationale:_ ${item.rationale}`);
          lines.push("");
        }
        // Surface pending disposition fields for ambiguous items so every
        // finding has a fully recorded triage outcome in this report.
        if (item.triage_route) {
          lines.push(`_Triage route:_ \`${item.triage_route}\``);
          lines.push("");
        }
        if (Array.isArray(item.ambiguous_routes) && item.ambiguous_routes.length > 0) {
          lines.push(`_Candidate routes:_ ${item.ambiguous_routes.join(", ")}`);
          lines.push("");
        }
      }
    }
  }

  return lines.join("\n");
}

/**
 * Write triage output artifacts.
 *
 * @param {string} pipelineDir — absolute path to .pipeline/
 * @param {string} report — triage report markdown
 * @param {Array} queued — items queued for later phases
 * @param {Array} [revalidateDrops=[]] — items dropped by revalidateFindings (stale)
 */
function writeTriage(pipelineDir, report, queued, revalidateDrops) {
  const triageDir = path.join(pipelineDir, "triage");
  paths.ensureDir(triageDir);

  const reportPath = path.join(triageDir, "TRIAGE-REPORT.md");
  fs.writeFileSync(reportPath, report, "utf8");

  const queuedPath = path.join(triageDir, "queued-findings.yaml");
  const dropSource = computeDropSource("triage", [reportPath, queuedPath]);

  // Validate required fields on every queued item before writing.
  // Missing category or drop_source indicates upstream assembly gaps — warn and fill defaults
  // so downstream consumers never receive structurally incomplete findings.
  for (const item of (queued || [])) {
    if (!item.category) {
      console.warn(`[triage] queued item ${item.id ?? "(unknown id)"} missing category — assigning "uncategorized"`);
      item.category = "uncategorized";
    }
    if (!item.drop_source) {
      console.warn(`[triage] queued item ${item.id ?? "(unknown id)"} missing drop_source — assigning "unknown"`);
      item.drop_source = "unknown";
    }
  }

  yamlIO.safeWrite(queuedPath, {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    drop_source: dropSource,
    items: queued || [],
  });

  // Track stale:quote-mismatch drops across sprints.
  // When a single drop_source accumulates GROUNDED_REREVIEW_THRESHOLD consecutive
  // sprints with mismatched quotes, flag grounded_required on state.yaml so the
  // architect QA pass will post-validate verbatim quotes next cycle.
  const dropHistoryPath = path.join(pipelineDir, "triage", "drop-history.yaml");
  const existingHistory = yamlIO.safeReadWithFallback(dropHistoryPath) || { schema_version: 1, entries: [] };
  if (!Array.isArray(existingHistory.entries)) existingHistory.entries = [];

  const sprintNum = (() => {
    const statePath = path.join(pipelineDir, "state.yaml");
    const s = yamlIO.safeReadWithFallback(statePath);
    return s && s.pipeline ? s.pipeline.sprint : null;
  })();

  // Combine queued stale items and revalidateFindings drops to get ALL stale:quote-mismatch
  // drops for this sprint. revalidateDrops are pre-categorization drops not in queued[].
  const revalidateStale = (revalidateDrops || []).filter(i => i.stale === "quote-mismatch");
  const staleMismatchItems = [
    ...(queued || []).filter(i => i.category === "stale:quote-mismatch"),
    ...revalidateStale,
  ];
  if (staleMismatchItems.length > 0) {
    const bySource = {};
    for (const item of staleMismatchItems) {
      const src = item.drop_source || "unknown";
      bySource[src] = (bySource[src] || 0) + 1;
    }

    // Build prospective history in memory only; the streak decision must
    // not depend on whether drop-history.yaml has been flushed yet.
    const candidateEntry = {
      sprint: sprintNum,
      timestamp: new Date().toISOString(),
      drops: Object.entries(bySource).map(([drop_source, count]) => ({ drop_source, count })),
    };
    const prospectiveHistory = {
      ...existingHistory,
      entries: [...existingHistory.entries, candidateEntry],
    };

    // Per-source consecutive-sprint streak check on the prospective history.
    const allSources = {};
    for (const [entryIndex, entry] of prospectiveHistory.entries.entries()) {
      // null sprint entries must not reset or increment the streak;
      // coerce to a unique sentinel so they are excluded from Number.isFinite filtering below.
      const safeSprint = entry.sprint ?? `null-${entryIndex}`;
      for (const d of entry.drops || []) {
        if (!allSources[d.drop_source]) allSources[d.drop_source] = [];
        allSources[d.drop_source].push(safeSprint);
      }
    }
    let thresholdCrossed = false;
    for (const [, sprints] of Object.entries(allSources)) {
      // Filter out null-sentinel values — only finite sprint numbers participate in streak calc.
      const sorted = sprints.filter(Number.isFinite).sort((a, b) => a - b);
      let consecutive = 1;
      for (let i = 1; i < sorted.length; i++) {
        consecutive = sorted[i] === sorted[i - 1] + 1 ? consecutive + 1 : 1;
        if (consecutive >= GROUNDED_REREVIEW_THRESHOLD) {
          thresholdCrossed = true;
          break;
        }
      }
      if (thresholdCrossed) break;
    }

    // Transactional ordering: write the durable signal first, audit log
    // second. If state.yaml grounded_required write fails when the
    // threshold has crossed, abort before drop-history.yaml is touched —
    // next /triage run computes the same streak from unchanged input data
    // and retries. If drop-history.yaml write fails after state.yaml
    // succeeds, the grounded flag is already set so next sprint behaves
    // correctly; the audit log lags by one sprint (acceptable —
    // grounded-required is idempotent).
    if (thresholdCrossed) {
      const currentStateData = yamlIO.safeReadWithFallback(path.join(pipelineDir, "state.yaml")) || {};
      try {
        yamlIO.safeWrite(path.join(pipelineDir, "state.yaml"), {
          ...currentStateData,
          grounded_required: true,
          last_updated: new Date().toISOString(),
        });
      } catch (err) {
        throw new Error(
          `[triage] Failed to write grounded_required to state.yaml: ${err.message}. ` +
          `No state mutated; Re-run /triage to retry.`
        );
      }
    }
    yamlIO.safeWrite(dropHistoryPath, prospectiveHistory);
  }

  return { reportPath, queuedPath };
}

// Valid target phases the triage skill can route to. Mirrors the from:
// "triaging" entries in references/transitions.yaml.
const VALID_TRIAGE_ROUTES = ["eliciting", "research", "architecture", "verifying", "requirements-ready"];

/**
 * Atomic post-triage hand-off — write triage artifacts AND transition
 * `triaging → <route>` in a single call.
 *
 * Background (B-class): the previous /triage workflow had separate steps
 * for "write TRIAGE-REPORT.md" and "transition to target phase". The
 * orchestrator could legitimately stop between them, leaving phase=triaging
 * with TRIAGE-REPORT.md present — autopilot then loops /triage against an
 * existing report. Same failure mode as B2's reviewing→triaging gap.
 *
 * `finalizeTriage` combines both into one call so the orchestrator cannot
 * stop mid-chain. Phase guard rejects starting phase ≠ "triaging" with a
 * structured error; on guard failure the triage artifacts are still
 * written so the user can recover manually.
 *
 * @param {string} pipelineDir
 * @param {string} report — TRIAGE-REPORT.md content
 * @param {Array} queued — queued findings
 * @param {Array} revalidateDrops — pre-categorization drops
 * @param {string} route — target phase (one of VALID_TRIAGE_ROUTES)
 * @returns {{ ok: boolean, reportPath?: string, queuedPath?: string, transitioned: boolean, targetPhase?: string, error?: string }}
 */
function finalizeTriage(pipelineDir, report, queued, revalidateDrops, route) {
  if (!VALID_TRIAGE_ROUTES.includes(route)) {
    return {
      ok: false,
      transitioned: false,
      error: `invalid route '${route}'; must be one of ${VALID_TRIAGE_ROUTES.join(", ")}`,
    };
  }

  let reportPath, queuedPath;
  try {
    ({ reportPath, queuedPath } = writeTriage(pipelineDir, report, queued, revalidateDrops));
  } catch (err) {
    return { ok: false, transitioned: false, error: `writeTriage failed: ${err.message}` };
  }

  const stateMachine = require("../../../lib/state-machine");
  const transition = stateMachine.writeState(
    pipelineDir,
    route,
    {},
    { command: "/triage", trigger: "triage-skill", artifact: reportPath }
  );

  if (!transition.ok) {
    return {
      ok: false,
      reportPath,
      queuedPath,
      transitioned: false,
      error: transition.error || "writeState returned no error message",
    };
  }

  return { ok: true, reportPath, queuedPath, transitioned: true, targetPhase: route };
}

module.exports = {
  PHASE_PRIORITY,
  BUG_INDICATORS,
  DOMAIN_KEYWORDS,
  ACCEPTABLE_INDICATORS,
  MIN_KEYWORD_LENGTH,
  MIN_KEYWORD_MATCHES,
  revalidateFindings,
  categorizeItems,
  categorizeItem,
  determineRoute,
  generateReport,
  writeTriage,
  loadQueuedFindings,
  mergeWithQueued,
  // Ambiguity detection helpers exported for testability
  isAmbiguous,
  emitAmbiguousSignal,
  // Helper functions exported for testability
  extractKeywords,
  hasSpecCoverage,
  hasArchCoverage,
  hasTaskCoverage,
  isImplementationBug,
  isDomainConcern,
  isAcceptableLimitation,
  readReqContent,
  // blocks_advance routing — deterministic primary signal from QA-REPORT.md frontmatter.
  // Triage uses this when present; falls back to category routing only when absent.
  readBlocksAdvanceCount,
  routeByBlocksAdvance,
  routeFinal,
  finalizeTriage,
  VALID_TRIAGE_ROUTES,
};
