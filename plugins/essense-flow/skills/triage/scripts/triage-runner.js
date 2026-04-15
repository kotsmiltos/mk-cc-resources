"use strict";

const fs = require("fs");
const path = require("path");
const yamlIO = require("../../../lib/yaml-io");
const paths = require("../../../lib/paths");

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
 * Categorize all items against spec, architecture, and task coverage.
 * Automatically loads and merges queued findings from prior triage passes.
 * Falls back to Increment 1 pass-through when specContent is not provided.
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
    const { category, rationale } = categorizeItem(item, specContent, pipelineDir);
    const enrichedItem = { ...item, rationale };
    categorized[category].push(enrichedItem);
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
 */
function writeTriage(pipelineDir, report, queued) {
  const triageDir = path.join(pipelineDir, "triage");
  paths.ensureDir(triageDir);

  const reportPath = path.join(triageDir, "TRIAGE-REPORT.md");
  fs.writeFileSync(reportPath, report, "utf8");

  const queuedPath = path.join(triageDir, "queued-findings.yaml");
  yamlIO.safeWrite(queuedPath, {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    items: queued || [],
  });

  return { reportPath, queuedPath };
}

module.exports = {
  PHASE_PRIORITY,
  BUG_INDICATORS,
  DOMAIN_KEYWORDS,
  ACCEPTABLE_INDICATORS,
  MIN_KEYWORD_LENGTH,
  MIN_KEYWORD_MATCHES,
  categorizeItems,
  categorizeItem,
  determineRoute,
  generateReport,
  writeTriage,
  loadQueuedFindings,
  mergeWithQueued,
  // Helper functions exported for testability
  extractKeywords,
  hasSpecCoverage,
  hasArchCoverage,
  hasTaskCoverage,
  isImplementationBug,
  isDomainConcern,
  isAcceptableLimitation,
  readReqContent,
};
