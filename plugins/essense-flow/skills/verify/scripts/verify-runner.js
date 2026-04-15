"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

const yamlIO = require("../../../lib/yaml-io");
const briefAssembly = require("../../../lib/brief-assembly");
const agentOutput = require("../../../lib/agent-output");
const tokens = require("../../../lib/tokens");
const paths = require("../../../lib/paths");
const lockfile = require("../../../lib/lockfile");
const integrity = require("../../../lib/artifact-integrity");
const errors = require("../../../lib/errors");
const verifySchemas = require("./verify-schemas");
const verifyMerge = require("../../../lib/verify-merge");

// ---------------------------------------------------------------------------
// File-tree constants
// ---------------------------------------------------------------------------

/**
 * Directory names excluded from the file tree walk.
 * Keeping these as named constants avoids magic strings scattered in the walker.
 */
const EXCLUDED_DIRS = new Set(["node_modules", ".git", ".pipeline"]);

/**
 * File extensions excluded from the file tree (binaries, generated output).
 * Each entry is a full extension string (e.g. ".min.js") or a dot-prefixed
 * extension for simple extension matching.
 */
const EXCLUDED_EXTENSIONS = new Set([
  ".min.js",
  ".map",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".ico",
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
  ".svg",
  ".webp",
  ".mp4",
  ".mp3",
  ".zip",
  ".tar",
  ".gz",
  ".pdf",
]);

/**
 * Path to the extraction brief template, relative to pluginRoot.
 */
const EXTRACTION_BRIEF_TEMPLATE_REL = "skills/verify/templates/extraction-brief.md";

/**
 * Path to the verification brief template, relative to pluginRoot.
 */
const VERIFICATION_BRIEF_TEMPLATE_REL = "skills/verify/templates/verification-brief.md";

/**
 * Checkpoint file name, relative to pipelineDir.
 */
const CHECKPOINT_REL = "verify-checkpoint.yaml";

/**
 * Gate-mode report file name, relative to pipelineDir.
 */
const REPORT_GATE_REL = "VERIFICATION-REPORT.md";

/**
 * On-demand mode report file name, relative to pipelineDir.
 */
const REPORT_ONDEMAND_REL = "VERIFICATION-REPORT-ondemand.md";

/**
 * Default token threshold below which files are inlined in full.
 * Mirrors the value in defaults/config.yaml.
 */
const DEFAULT_FILE_INLINE_TOKEN_THRESHOLD = 2000;

/**
 * Default token threshold below which files are included as excerpts.
 * Mirrors the value in defaults/config.yaml.
 */
const DEFAULT_FILE_EXCERPT_TOKEN_THRESHOLD = 8000;

/**
 * Number of lines taken from the start and end of a file for excerpt delivery.
 * Principled value: enough context to understand structure without overloading the brief.
 */
const EXCERPT_LINE_COUNT = 50;

/**
 * Path to extracted-items.yaml, relative to pipelineDir.
 */
const EXTRACTED_ITEMS_REL = "extracted-items.yaml";

/**
 * Default items-per-group cap when config.verify.items_per_group is absent.
 * Matches the value in defaults/config.yaml.
 */
const DEFAULT_ITEMS_PER_GROUP = 5;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Check whether a file path should be excluded from the tree.
 * Handles both simple extensions (.png) and compound extensions (.min.js).
 *
 * @param {string} filePath — relative or absolute file path
 * @returns {boolean}
 */
function isExcludedFile(filePath) {
  const base = path.basename(filePath);

  // Check compound extensions first (.min.js, .map)
  for (const ext of EXCLUDED_EXTENSIONS) {
    if (ext.startsWith(".") && base.endsWith(ext)) {
      return true;
    }
  }

  return false;
}

/**
 * Recursively walk a directory and collect relative paths of non-excluded files.
 *
 * @param {string} rootDir — project root to walk (absolute)
 * @param {string} currentDir — current directory being walked (absolute)
 * @param {string[]} accumulator — mutable list receiving relative paths
 */
function walkTree(rootDir, currentDir, accumulator) {
  let entries;
  try {
    entries = fs.readdirSync(currentDir, { withFileTypes: true });
  } catch (_e) {
    // Unreadable directory — skip silently (permission errors are non-fatal)
    return;
  }

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRS.has(entry.name)) {
        walkTree(rootDir, path.join(currentDir, entry.name), accumulator);
      }
    } else if (entry.isFile()) {
      const absPath = path.join(currentDir, entry.name);
      const relPath = path.relative(rootDir, absPath).replace(/\\/g, "/");
      if (!isExcludedFile(relPath)) {
        accumulator.push(relPath);
      }
    }
  }
}

/**
 * Build a human-readable file tree string from a list of relative paths.
 * Sorted for determinism.
 *
 * @param {string[]} filePaths — sorted relative paths
 * @returns {string}
 */
function buildFileTreeText(filePaths) {
  return filePaths.slice().sort().join("\n");
}

/**
 * Strip YAML frontmatter from a markdown string.
 * Frontmatter is a `---`-delimited block at the very start of the file.
 *
 * @param {string} raw — raw file content
 * @returns {string} — content with frontmatter removed, trimmed
 */
function stripFrontmatter(raw) {
  return raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "").trim();
}

/**
 * Compute a stable VI- identifier for a single extracted item.
 * Uses the first 120 characters of the item text joined with its section
 * as the hash input — guarantees the same item always gets the same ID
 * regardless of run order (DEC-A003, FR-025).
 *
 * @param {string} section — item section heading
 * @param {string} text — item requirement text
 * @returns {string} — e.g. "VI-3f7a2b1c"
 */
function computeItemId(section, text) {
  const input = section + "|" + text.slice(0, 120);
  const hash = crypto.createHash("sha256").update(input).digest("hex");
  return "VI-" + hash.slice(0, 8);
}

/**
 * Derive SPEC.md section headings (## level) from spec content, preserving
 * their order of appearance. Used to order groups by spec section order.
 *
 * @param {string} specContent
 * @returns {string[]} — ordered list of section heading texts
 */
function extractSectionOrder(specContent) {
  const headings = [];
  const pattern = /^## (.+)$/gm;
  let match;
  while ((match = pattern.exec(specContent)) !== null) {
    headings.push(match[1].trim());
  }
  return headings;
}

// ---------------------------------------------------------------------------
// loadInputs
// ---------------------------------------------------------------------------

/**
 * Load all inputs needed for the verify phase from disk.
 *
 * Returns the spec content snapshot as a string. All downstream steps must
 * use this string directly — re-reading SPEC.md after this point is prohibited
 * to prevent mixed-version verdicts from concurrent edits (DEC-A005, FR-005).
 *
 * @param {string} pipelineDir — absolute path to .pipeline/
 * @returns {{ specContent: string, specHash: string, fileTree: string[], fileTreeText: string, decisions: Object[] }}
 */
function loadInputs(pipelineDir) {
  const specPath = path.join(pipelineDir, "elicitation", "SPEC.md");
  const raw = fs.readFileSync(specPath, "utf8");

  // Capture the spec as a snapshot string. All downstream code uses this
  // variable — the file is never re-read after this point (DEC-A005).
  const specContent = stripFrontmatter(raw);

  // Compute hash of the snapshot content (not the file on disk, to be consistent
  // with the already-stripped content we pass to agents).
  const specHash = integrity.computeHashFromContent(specContent);

  // Walk the project root (one level above .pipeline/)
  const projectRoot = path.dirname(pipelineDir);
  const fileTree = [];
  walkTree(projectRoot, projectRoot, fileTree);
  fileTree.sort();
  const fileTreeText = buildFileTreeText(fileTree);

  // Decisions are advisory — absent decisions/index.yaml is valid (FR-004)
  const decisionsPath = path.join(pipelineDir, "decisions", "index.yaml");
  let decisions = yamlIO.safeReadWithFallback(decisionsPath);
  if (!decisions) {
    console.log("[verify] Assumption: decisions/index.yaml absent or empty — treating as empty list.");
    decisions = [];
  }
  if (!Array.isArray(decisions)) {
    // Handle case where the file exists but has unexpected shape
    console.log("[verify] Warning: decisions/index.yaml is not an array — treating as empty list.");
    decisions = [];
  }

  return { specContent, specHash, fileTree, fileTreeText, decisions };
}

// ---------------------------------------------------------------------------
// preflight
// ---------------------------------------------------------------------------

/**
 * Pre-flight checks for the verify phase. Acquires the pipeline lock.
 *
 * Steps:
 * 1. Verify SPEC.md exists.
 * 2. Load all inputs via loadInputs().
 * 3. Estimate token usage; prune and retry if over the adaptive ceiling.
 * 4. Acquire the pipeline lock (FR-017).
 * 5. Check for a cached extracted-items.yaml and validate its spec_hash.
 *
 * @param {string} pipelineDir — absolute path to .pipeline/
 * @param {string} pluginRoot — absolute path to essense-flow plugin root
 * @param {Object} config — pipeline config
 * @returns {{ ok: boolean, specContent?: string, specHash?: string, fileTree?: string[], fileTreeText?: string, decisions?: Object[], cacheHit?: boolean, error?: string }}
 */
function preflight(pipelineDir, pluginRoot, config) {
  // Step 1: SPEC.md existence check
  const specPath = path.join(pipelineDir, "elicitation", "SPEC.md");
  if (!fs.existsSync(specPath)) {
    return {
      ok: false,
      error: errors.formatError("E_ARTIFACT_MISSING", { path: specPath }),
    };
  }

  // Step 2: Load all inputs (snapshot taken here — DEC-A005)
  const inputs = loadInputs(pipelineDir);
  const { specContent, specHash, fileTree, decisions } = inputs;
  let { fileTreeText } = inputs;

  // Step 3: Token budget estimation
  const ceiling = tokens.adaptiveBriefCeiling(specContent, config);
  const specTokens = tokens.countTokens(specContent);
  let treeTokens = tokens.countTokens(fileTreeText);

  if (specTokens + treeTokens > ceiling) {
    // First pruning pass: remove binary/generated paths that may have survived
    // the walk exclusions (e.g. files in subdirectories not caught by extension filter)
    const PRUNABLE_PATTERNS = [/\/dist\//, /\/build\//, /\/coverage\//, /\/\.cache\//];
    const pruned = fileTree.filter(
      (p) => !PRUNABLE_PATTERNS.some((pattern) => pattern.test(p))
    );
    fileTreeText = buildFileTreeText(pruned);
    treeTokens = tokens.countTokens(fileTreeText);

    if (specTokens + treeTokens > ceiling) {
      return {
        ok: false,
        error: errors.formatError("E_BUDGET_EXCEEDED", {
          agentId: "verify-extraction",
          tokens: specTokens + treeTokens,
          ceiling,
        }),
      };
    }

    console.log(`[verify] File tree pruned: removed ${fileTree.length - pruned.length} build/dist paths to fit token ceiling.`);
  }

  // Step 4: Acquire the pipeline lock before any further work (FR-017)
  const lockResult = lockfile.acquireLock(pipelineDir);
  if (!lockResult.ok) {
    return {
      ok: false,
      error: errors.formatError("E_LOCK_HELD", { timestamp: "(unknown)" }),
    };
  }

  // Step 5: Cache check — compare stored spec_hash to current (FR-021)
  const extractedPath = path.join(pipelineDir, EXTRACTED_ITEMS_REL);
  let cacheHit = false;

  if (fs.existsSync(extractedPath)) {
    const cached = yamlIO.safeReadWithFallback(extractedPath);
    if (cached && cached.spec_hash === specHash) {
      cacheHit = true;
      console.log("[verify] Cache hit: extracted-items.yaml spec_hash matches — extraction can be skipped.");
    } else {
      const cachedHash = cached && cached.spec_hash ? cached.spec_hash : "(none)";
      console.log(
        `[verify] Cache miss: spec_hash mismatch (cached: ${cachedHash.slice(0, 8)}…, current: ${specHash.slice(0, 8)}…) — will re-extract.`
      );
    }
  }

  return {
    ok: true,
    specContent,
    specHash,
    fileTree,
    fileTreeText,
    decisions,
    cacheHit,
  };
}

// ---------------------------------------------------------------------------
// assembleExtractionBrief
// ---------------------------------------------------------------------------

/**
 * Assemble the extraction agent brief from the spec snapshot and file tree.
 *
 * @param {string} specContent — spec snapshot string (DEC-A005)
 * @param {string} fileTreeText — newline-separated list of project files
 * @param {string} specHash — SHA-256 hex digest of specContent
 * @param {string} pluginRoot — absolute path to essense-flow plugin root
 * @param {Object} config — pipeline config
 * @returns {{ ok: boolean, brief?: string, briefId?: string, error?: string }}
 */
function assembleExtractionBrief(specContent, fileTreeText, specHash, pluginRoot, config) {
  const templatePath = path.join(pluginRoot, EXTRACTION_BRIEF_TEMPLATE_REL);

  // Brief ID combines a timestamp (base-36) with a truncated spec hash for traceability
  const timestamp = new Date().toISOString();
  const briefId = `verify-extract-${Date.now().toString(36)}-${specHash.slice(0, 6)}`;

  const bindings = {
    SPEC_CONTENT: specContent,
    FILE_TREE: fileTreeText,
    SPEC_HASH: specHash,
    BRIEF_ID: briefId,
    TIMESTAMP: timestamp,
  };

  // Sections fed to the budget checker — spec and tree are the dominant consumers
  const sections = {
    spec: specContent,
    file_tree: fileTreeText,
  };

  const result = briefAssembly.assembleBrief({
    templatePath,
    bindings,
    sections,
    metadata: {
      briefId,
      phase: "verify",
      batchIndex: 0,
      agentIndex: 0,
    },
    config,
  });

  if (!result.ok) {
    return { ok: false, error: `Extraction brief assembly failed: ${result.error}` };
  }

  // Secondary budget check: validate assembled brief size against adaptive ceiling
  const ceiling = tokens.adaptiveBriefCeiling(specContent, config);
  const briefTokens = tokens.countTokens(result.brief);
  if (briefTokens > ceiling) {
    return {
      ok: false,
      error: errors.formatError("E_BUDGET_EXCEEDED", {
        agentId: "verify-extraction",
        tokens: briefTokens,
        ceiling,
      }),
    };
  }

  return { ok: true, brief: result.brief, briefId };
}

// ---------------------------------------------------------------------------
// processExtraction
// ---------------------------------------------------------------------------

/**
 * Parse, validate, and persist the extraction agent's raw output.
 *
 * Assigns stable VI- IDs to each item (DEC-A003). Writes extracted-items.yaml
 * via yamlIO.safeWrite() for atomic persistence (NFR-003).
 *
 * @param {string} rawOutput — raw output string from the extraction agent
 * @param {string} specContent — spec snapshot string (used for phantom + coverage checks)
 * @param {string} specHash — SHA-256 hex digest embedded in the written artifact
 * @param {string} pipelineDir — absolute path to .pipeline/
 * @returns {{ ok: boolean, items?: Object[], errors?: string[] }}
 */
function processExtraction(rawOutput, specContent, specHash, pipelineDir) {
  // Parse structured data from the agent output
  const parsed = agentOutput.parseOutput(rawOutput);
  if (!parsed.ok) {
    return {
      ok: false,
      errors: [`Output parse failed: ${parsed.error}`],
    };
  }

  // Schema validation of the extracted payload (FR-001)
  const schemaResult = verifySchemas.validateExtractedItems(parsed.payload);
  if (!schemaResult.ok) {
    return {
      ok: false,
      errors: [`Schema validation failed: ${schemaResult.errors.join("; ")}`],
    };
  }

  const items = parsed.payload.items;

  // Phantom check: every item's text must exist verbatim in the spec (FR-006)
  const phantomResult = verifySchemas.validatePhantomItems(items, specContent);
  if (!phantomResult.ok) {
    const phantomTexts = phantomResult.phantoms
      .map((p) => `"${String(p.text).slice(0, 60)}…"`)
      .join(", ");
    return {
      ok: false,
      errors: [`Phantom items detected (text not in spec): ${phantomTexts}`],
    };
  }

  // Section coverage: every ## heading in the spec must have at least one item (FR-007)
  const coverageResult = verifySchemas.validateSectionCoverage(items, specContent);
  if (!coverageResult.ok) {
    return {
      ok: false,
      errors: [
        `Section coverage incomplete — no items extracted for: ${coverageResult.missingSections.join(", ")}`,
      ],
    };
  }

  // Assign stable IDs post-extraction (DEC-A003, FR-025).
  // IDs are deterministic: same section + text always yields the same VI- ID.
  const itemsWithIds = items.map((item) => ({
    ...item,
    id: computeItemId(item.section, item.text),
  }));

  // Write extracted-items.yaml atomically, embedding spec_hash so future runs
  // can detect staleness without re-running extraction (FR-021, NFR-003).
  const extractedPath = path.join(pipelineDir, EXTRACTED_ITEMS_REL);
  const payload = {
    schema_version: 1,
    spec_hash: specHash,
    generated_at: new Date().toISOString(),
    total_items: itemsWithIds.length,
    verifiable_items: itemsWithIds.filter((i) => i.verifiable).length,
    section_headings: parsed.payload.section_headings,
    items: itemsWithIds,
  };

  yamlIO.safeWrite(extractedPath, payload);

  return { ok: true, items: itemsWithIds };
}

// ---------------------------------------------------------------------------
// groupItems
// ---------------------------------------------------------------------------

/**
 * Group extracted items by section and split large sections into sub-groups.
 *
 * Grouping is deterministic: same input array always produces the same groups
 * in the same order (FR-026). Groups are sorted by their section's position in
 * the spec to preserve spec reading order.
 *
 * Non-verifiable items are included in group data but flagged — they will not
 * be dispatched to verification agents.
 *
 * @param {Object[]} items — extracted items with assigned IDs (from processExtraction)
 * @param {Object} config — pipeline config
 * @param {string} specContent — spec snapshot for section-order sorting
 * @returns {{ groups: Array<{ groupId: string, section: string, items: Object[] }> }}
 */
function groupItems(items, config, specContent) {
  const itemsPerGroup =
    (config && config.verify && config.verify.items_per_group) || DEFAULT_ITEMS_PER_GROUP;

  // Build section → items map, preserving insertion order within each section
  const sectionMap = new Map();
  for (const item of items) {
    const section = item.section;
    if (!sectionMap.has(section)) {
      sectionMap.set(section, []);
    }
    sectionMap.get(section).push(item);
  }

  // Derive spec section order so groups respect the spec's narrative structure
  const sectionOrder = specContent ? extractSectionOrder(specContent) : [];

  // Sort section keys by their position in the spec; unknown sections go last
  const sortedSections = [...sectionMap.keys()].sort((a, b) => {
    const ai = sectionOrder.indexOf(a);
    const bi = sectionOrder.indexOf(b);
    // -1 from indexOf means the section was not found in the spec headings;
    // push those to the end to avoid them interleaving with known sections.
    const aOrder = ai === -1 ? Number.MAX_SAFE_INTEGER : ai;
    const bOrder = bi === -1 ? Number.MAX_SAFE_INTEGER : bi;
    return aOrder - bOrder;
  });

  const groups = [];

  for (const section of sortedSections) {
    const sectionItems = sectionMap.get(section);

    // Only verifiable items count toward the per-group cap; non-verifiable items
    // are carried in the group but won't be dispatched.
    const verifiable = sectionItems.filter((i) => i.verifiable);
    const nonVerifiable = sectionItems.filter((i) => !i.verifiable);

    if (verifiable.length <= itemsPerGroup) {
      // Single group — all verifiable items fit within the cap
      groups.push({
        groupId: section,
        section,
        items: [...verifiable, ...nonVerifiable],
      });
    } else {
      // Split into sub-groups named "{section}:0", "{section}:1", etc. (FR-026).
      // Sequential splitting guarantees identical output for the same input.
      let subIndex = 0;
      for (let offset = 0; offset < verifiable.length; offset += itemsPerGroup) {
        const chunk = verifiable.slice(offset, offset + itemsPerGroup);
        // Non-verifiable items only go into the first sub-group to avoid duplication
        const extra = subIndex === 0 ? nonVerifiable : [];
        groups.push({
          groupId: `${section}:${subIndex}`,
          section,
          items: [...chunk, ...extra],
        });
        subIndex++;
      }
    }
  }

  return { groups };
}

// ---------------------------------------------------------------------------
// buildFileContentCache
// ---------------------------------------------------------------------------

/**
 * Build a map of file path → { content, tokenCount, policy } for all files
 * referenced across all groups.
 *
 * Delivery policy per file (RISK-010):
 *   - tokenCount < file_inline_token_threshold → policy "full": entire file content
 *   - tokenCount < file_excerpt_token_threshold → policy "excerpt": first+last N lines
 *   - Otherwise → policy "path-only": only the path reference is recorded
 *
 * Deduplication is automatic — the returned Map uses relative paths as keys,
 * so a file referenced in multiple groups is read only once.
 *
 * @param {Array<{ items: Array<{ files: string[] }> }>} groups
 * @param {string} projectRoot — absolute path to project root
 * @param {Object} config — pipeline config
 * @returns {Map<string, { content: string, tokenCount: number, policy: string }>}
 */
function buildFileContentCache(groups, projectRoot, config) {
  const inlineThreshold =
    (config && config.verify && config.verify.file_inline_token_threshold) ||
    DEFAULT_FILE_INLINE_TOKEN_THRESHOLD;
  const excerptThreshold =
    (config && config.verify && config.verify.file_excerpt_token_threshold) ||
    DEFAULT_FILE_EXCERPT_TOKEN_THRESHOLD;

  // Collect all unique relative paths referenced by any item in any group
  const uniquePaths = new Set();
  for (const group of groups) {
    for (const item of group.items || []) {
      for (const filePath of item.files || []) {
        if (typeof filePath === "string" && filePath.trim().length > 0) {
          uniquePaths.add(filePath.trim());
        }
      }
    }
  }

  const cache = new Map();

  for (const relPath of uniquePaths) {
    const absPath = path.join(projectRoot, relPath);

    let rawContent;
    try {
      rawContent = fs.readFileSync(absPath, "utf8");
    } catch (_e) {
      // File unreadable — record as path-only so the agent still knows the file exists
      console.log(`[verify] Warning: cannot read file "${relPath}" — recording as path-only.`);
      cache.set(relPath, { content: relPath, tokenCount: 0, policy: "path-only" });
      continue;
    }

    const tokenCount = tokens.countTokens(rawContent);

    let policy;
    let content;

    if (tokenCount < inlineThreshold) {
      policy = "full";
      content = rawContent;
    } else if (tokenCount < excerptThreshold) {
      policy = "excerpt";
      const lines = rawContent.split("\n");
      const head = lines.slice(0, EXCERPT_LINE_COUNT);
      const tail = lines.slice(-EXCERPT_LINE_COUNT);
      // Clearly mark where the middle was omitted so the agent understands the gap
      const omittedCount = Math.max(0, lines.length - EXCERPT_LINE_COUNT * 2);
      const omitMarker =
        omittedCount > 0
          ? [`... [${omittedCount} lines omitted] ...`]
          : [];
      content = [...head, ...omitMarker, ...tail].join("\n");
    } else {
      policy = "path-only";
      content = relPath;
    }

    console.log(`[verify] File "${relPath}": ${tokenCount} tokens → policy "${policy}"`);
    cache.set(relPath, { content, tokenCount, policy });
  }

  return cache;
}

// ---------------------------------------------------------------------------
// assembleVerificationBrief
// ---------------------------------------------------------------------------

/**
 * Assemble the verification agent brief for a single item group.
 *
 * Builds file contents from the cache, logging the delivery policy per file,
 * then delegates to brief-assembly. If the assembled brief exceeds the token
 * ceiling, file delivery tiers are downgraded (full→excerpt, excerpt→path-only)
 * and the assembly is retried once.
 *
 * @param {{ groupId: string, section: string, items: Object[] }} group
 * @param {Map<string, { content: string, tokenCount: number, policy: string }>} fileCache
 * @param {Object[]} decisions — full decisions list from loadInputs
 * @param {string} specHash
 * @param {string} pluginRoot
 * @param {Object} config
 * @returns {{ ok: boolean, brief?: string, briefId?: string, agentId?: string, error?: string }}
 */
function assembleVerificationBrief(group, fileCache, decisions, specHash, pluginRoot, config) {
  const templatePath = path.join(pluginRoot, VERIFICATION_BRIEF_TEMPLATE_REL);

  const briefId = `verify-${group.groupId.replace(/[^a-z0-9]/gi, "-")}-${Date.now().toString(36)}-${specHash.slice(0, 6)}`;
  const agentId = `verify-agent-${group.groupId.replace(/[^a-z0-9]/gi, "-")}`;

  // Filter decisions relevant to this group's section only
  const relevantDecisions = Array.isArray(decisions)
    ? decisions.filter(
        (d) => !d.section || d.section === group.section || d.section === group.groupId
      )
    : [];

  const ceiling = tokens.adaptiveBriefCeiling(null, config);

  /**
   * Inner helper: attempt assembly for a given policy override map.
   * policyOverrides is a Map<relPath, "full"|"excerpt"|"path-only"> that
   * allows a downgrade pass without mutating the original cache.
   */
  function attemptAssembly(policyOverrides) {
    const deliveryLog = [];
    const fileBlocks = [];

    for (const item of group.items || []) {
      for (const relPath of item.files || []) {
        if (!relPath || fileBlocks.some((b) => b.path === relPath)) {
          // Already added this file — skip duplicates within the same brief
          continue;
        }

        const entry = fileCache.get(relPath);
        if (!entry) {
          deliveryLog.push(`${relPath}: not in cache (skipped)`);
          continue;
        }

        // Apply override if present, otherwise use cached policy
        const policy = policyOverrides.has(relPath)
          ? policyOverrides.get(relPath)
          : entry.policy;

        let content;
        if (policy === "full") {
          content = entry.content;
        } else if (policy === "excerpt") {
          // If the cache already has the excerpt, reuse it; otherwise fall back to path
          content =
            entry.policy === "excerpt" || entry.policy === "full"
              ? entry.content
              : relPath;
        } else {
          content = relPath;
        }

        deliveryLog.push(`${relPath}: policy=${policy} (${entry.tokenCount} tokens)`);
        fileBlocks.push({ path: relPath, policy, content });
      }
    }

    const fileContentsText = fileBlocks
      .map(({ path: p, policy, content }) =>
        `### ${p} [${policy}]\n\`\`\`\n${content}\n\`\`\``
      )
      .join("\n\n");

    const itemsYaml = yaml.dump(
      group.items.map((i) => ({
        id: i.id,
        section: i.section,
        text: i.text,
        verifiable: i.verifiable,
        verifiable_reason: i.verifiable_reason,
        files: i.files,
      })),
      { lineWidth: 120, noRefs: true }
    );

    const decisionsYaml = yaml.dump(relevantDecisions, { lineWidth: 120, noRefs: true });
    const deliveryLogText = deliveryLog.join("\n");

    const bindings = {
      ITEMS_YAML: itemsYaml,
      FILE_CONTENTS: fileContentsText,
      DECISIONS_YAML: decisionsYaml,
      SPEC_HASH: specHash,
      GROUP_ID: group.groupId,
      BRIEF_ID: briefId,
      AGENT_ID: agentId,
      DELIVERY_LOG: deliveryLogText,
    };

    const result = briefAssembly.assembleBrief({
      templatePath,
      bindings,
      sections: { file_contents: fileContentsText, items: itemsYaml },
      metadata: {
        briefId,
        phase: "verify",
        batchIndex: 0,
        agentIndex: 0,
      },
      config,
    });

    return result;
  }

  // First attempt: use cached policies as-is
  const firstResult = attemptAssembly(new Map());
  if (!firstResult.ok) {
    return { ok: false, error: `Verification brief assembly failed: ${firstResult.error}` };
  }

  const firstTokens = tokens.countTokens(firstResult.brief);
  if (firstTokens <= ceiling) {
    return { ok: true, brief: firstResult.brief, briefId, agentId };
  }

  console.log(
    `[verify] Brief for group "${group.groupId}" is ${firstTokens} tokens (ceiling: ${ceiling}) — downgrading file delivery tiers.`
  );

  // Downgrade pass: full→excerpt, excerpt→path-only, path-only stays
  const downgradedPolicies = new Map();
  for (const item of group.items || []) {
    for (const relPath of item.files || []) {
      if (!relPath) continue;
      const entry = fileCache.get(relPath);
      if (!entry) continue;
      if (entry.policy === "full") {
        downgradedPolicies.set(relPath, "excerpt");
      } else if (entry.policy === "excerpt") {
        downgradedPolicies.set(relPath, "path-only");
      }
    }
  }

  const retryResult = attemptAssembly(downgradedPolicies);
  if (!retryResult.ok) {
    return { ok: false, error: `Verification brief assembly (retry) failed: ${retryResult.error}` };
  }

  const retryTokens = tokens.countTokens(retryResult.brief);
  if (retryTokens > ceiling) {
    return {
      ok: false,
      error: errors.formatError("E_BUDGET_EXCEEDED", {
        agentId,
        tokens: retryTokens,
        ceiling,
      }),
    };
  }

  return { ok: true, brief: retryResult.brief, briefId, agentId };
}

// ---------------------------------------------------------------------------
// loadCheckpoint
// ---------------------------------------------------------------------------

/**
 * Load the verification checkpoint from disk.
 *
 * Returns `{ ok: true, completedGroups }` where completedGroups is a
 * `Map<groupId, verdicts[]>` only when the checkpoint exists and its
 * spec_hash matches the current specHash. Any mismatch — file absent,
 * parse error, or hash mismatch — returns `{ ok: false }` so the caller
 * can trigger a full re-dispatch.
 *
 * @param {string} pipelineDir
 * @param {string} specHash
 * @returns {{ ok: boolean, completedGroups?: Map<string, Object[]> }}
 */
function loadCheckpoint(pipelineDir, specHash) {
  const checkpointPath = path.join(pipelineDir, CHECKPOINT_REL);
  const data = yamlIO.safeReadWithFallback(checkpointPath);

  if (!data) {
    console.log("[verify] No checkpoint found — full dispatch required.");
    return { ok: false };
  }

  if (data.spec_hash !== specHash) {
    console.log(
      `[verify] Checkpoint spec_hash mismatch (checkpoint: ${String(data.spec_hash).slice(0, 8)}…, current: ${specHash.slice(0, 8)}…) — stale checkpoint discarded.`
    );
    return { ok: false };
  }

  // Reconstruct completedGroups as a Map from the plain YAML object
  const completedGroups = new Map();
  if (data.completed_groups && typeof data.completed_groups === "object") {
    for (const [groupId, verdicts] of Object.entries(data.completed_groups)) {
      completedGroups.set(groupId, Array.isArray(verdicts) ? verdicts : []);
    }
  }

  console.log(
    `[verify] Checkpoint loaded: ${completedGroups.size} completed group(s) will be skipped.`
  );
  return { ok: true, completedGroups };
}

// ---------------------------------------------------------------------------
// saveCheckpoint
// ---------------------------------------------------------------------------

/**
 * Persist the current set of completed groups to the checkpoint file.
 *
 * Written atomically via yamlIO.safeWrite() so a crash mid-write cannot
 * corrupt the checkpoint.
 *
 * @param {string} pipelineDir
 * @param {string} specHash
 * @param {Map<string, Object[]>} completedGroups — groupId → verdicts[]
 */
function saveCheckpoint(pipelineDir, specHash, completedGroups) {
  const checkpointPath = path.join(pipelineDir, CHECKPOINT_REL);

  // Convert Map to a plain object for YAML serialization
  const completedGroupsObj = {};
  for (const [groupId, verdicts] of completedGroups) {
    completedGroupsObj[groupId] = verdicts;
  }

  const payload = {
    spec_hash: specHash,
    saved_at: new Date().toISOString(),
    completed_groups: completedGroupsObj,
  };

  yamlIO.safeWrite(checkpointPath, payload);
  console.log(`[verify] Checkpoint saved: ${completedGroups.size} completed group(s).`);
}

// ---------------------------------------------------------------------------
// processVerificationResponse
// ---------------------------------------------------------------------------

/**
 * Parse, validate, and post-process a single verification agent's raw output.
 *
 * Steps:
 *  1. Parse raw output via agentOutput.parseOutput()
 *  2. Validate the parsed payload via verifySchemas.validateVerificationResponse()
 *     — this applies automatic downgrades (FR-010, FR-011, FR-012)
 *  3. Verify the embedded spec_hash matches the expected hash
 *  4. Verify all returned item_ids exist in extractedItems
 *
 * @param {string} rawOutput
 * @param {string} specHash
 * @param {Object[]} extractedItems
 * @returns {{ ok: boolean, verdicts?: Object[], errors?: string[], downgrades?: string[] }}
 */
function processVerificationResponse(rawOutput, specHash, extractedItems) {
  // Step 1: Parse raw output
  const parsed = agentOutput.parseOutput(rawOutput);
  if (!parsed.ok) {
    return { ok: false, errors: [`Output parse failed: ${parsed.error}`] };
  }

  // Step 2: Schema validation with automatic downgrades
  const validated = verifySchemas.validateVerificationResponse(parsed.payload);
  if (!validated.ok) {
    return {
      ok: false,
      errors: [`Schema validation failed: ${validated.errors.join("; ")}`],
      downgrades: validated.downgrades,
    };
  }

  if (validated.downgrades && validated.downgrades.length > 0) {
    for (const msg of validated.downgrades) {
      console.log(`[verify] Downgrade applied: ${msg}`);
    }
  }

  const response = parsed.payload;

  // Step 3: Spec hash guard — prevents cross-run verdict contamination (DEC-A005)
  if (response.spec_hash !== specHash) {
    return {
      ok: false,
      errors: [
        `spec_hash mismatch in agent response: expected ${specHash.slice(0, 8)}…, got ${String(response.spec_hash).slice(0, 8)}…`,
      ],
    };
  }

  // Step 4: Item ID cross-reference — all returned IDs must exist in extractedItems
  const knownIds = new Set((extractedItems || []).map((i) => i.id));
  const unknownIds = (response.verdicts || [])
    .map((v) => v.item_id)
    .filter((id) => !knownIds.has(id));

  if (unknownIds.length > 0) {
    return {
      ok: false,
      errors: [`Unknown item_ids in response: ${unknownIds.join(", ")}`],
    };
  }

  return {
    ok: true,
    verdicts: response.verdicts || [],
    downgrades: validated.downgrades || [],
  };
}

// ---------------------------------------------------------------------------
// mergeAllVerdicts
// ---------------------------------------------------------------------------

/**
 * Merge per-agent verdicts for all extracted items into a single verdict per item.
 *
 * Rules:
 *  - Items with verifiable=false → SKIPPED, confidence null (no agents ran for them)
 *  - Items with no returned verdicts (agent group failed) → UNVERIFIED, confidence null
 *  - All others → call verifyMerge.mergeItemVerdicts() (worst-verdict-wins algorithm)
 *
 * @param {Map<string, Object[]>} completedGroups — groupId → verdicts[] from agents
 * @param {Object[]} extractedItems
 * @returns {Map<string, { verdict: string, confidence: string|null, triggersRouting: boolean, contributingAgents: Object[] }>}
 */
function mergeAllVerdicts(completedGroups, extractedItems) {
  // Flatten all raw verdicts into a map: item_id → [{ verdict, confidence, agentId, groupId }]
  const rawByItemId = new Map();

  for (const [groupId, verdicts] of completedGroups) {
    for (const v of verdicts || []) {
      if (!v || !v.item_id) continue;
      if (!rawByItemId.has(v.item_id)) {
        rawByItemId.set(v.item_id, []);
      }
      rawByItemId.get(v.item_id).push({
        verdict: v.verdict,
        confidence: v.confidence,
        agentId: v.agent_id || groupId,
        groupId,
        evidence: v.evidence,
      });
    }
  }

  const merged = new Map();

  for (const item of extractedItems) {
    const itemId = item.id;

    if (!item.verifiable) {
      // Non-verifiable items are always SKIPPED — no agent processes them
      merged.set(itemId, {
        verdict: "SKIPPED",
        confidence: null,
        triggersRouting: false,
        contributingAgents: [],
      });
      continue;
    }

    const agentResults = rawByItemId.get(itemId) || [];

    if (agentResults.length === 0) {
      // No verdicts returned for this item — its group may have failed
      merged.set(itemId, {
        verdict: "UNVERIFIED",
        confidence: null,
        triggersRouting: false,
        contributingAgents: [],
      });
      continue;
    }

    // Delegate to the merge truth table (worst-verdict-wins, see lib/verify-merge.js)
    const mergeResult = verifyMerge.mergeItemVerdicts(agentResults);
    merged.set(itemId, mergeResult);
  }

  return merged;
}

// ---------------------------------------------------------------------------
// assembleReport
// ---------------------------------------------------------------------------

/**
 * Assemble the full verification report as a markdown string with YAML frontmatter.
 *
 * Structure:
 *  - YAML frontmatter with scorecard, completion_status, mode, spec_hash
 *  - Sections ordered by SPEC.md canonical sequence (FR-022)
 *  - Each section lists items with verdict + confidence + evidence
 *  - Multi-agent items show individual agent verdicts (FR-023)
 *  - Routing section at the bottom
 *
 * @param {Object[]} extractedItems
 * @param {Map<string, Object>} mergedVerdicts
 * @param {string} specHash
 * @param {"gate"|"on-demand"} mode
 * @param {Object} config
 * @returns {string} full report markdown
 */
function assembleReport(extractedItems, mergedVerdicts, specHash, mode, config) {
  const total = extractedItems.length;
  const verifiable = extractedItems.filter((i) => i.verifiable).length;

  // Tally verdict distribution across merged results
  const verdictCounts = {};
  const confidenceCounts = {};
  let unverifiedCount = 0;

  for (const item of extractedItems) {
    const mv = mergedVerdicts.get(item.id);
    if (!mv) continue;

    verdictCounts[mv.verdict] = (verdictCounts[mv.verdict] || 0) + 1;
    if (mv.confidence) {
      confidenceCounts[mv.confidence] = (confidenceCounts[mv.confidence] || 0) + 1;
    }
    if (mv.verdict === "UNVERIFIED") {
      unverifiedCount++;
    }
  }

  // FR-024: completion_status is "complete" only when no items remain UNVERIFIED
  const completionStatus = unverifiedCount === 0 ? "complete" : "partial";

  const matchCount = verdictCounts["MATCH"] || 0;
  const matchRate =
    verifiable > 0 ? Math.round((matchCount / verifiable) * 100) : 0;

  // Count routing-triggered items for the summary
  const routingItems = extractedItems.filter((item) => {
    const mv = mergedVerdicts.get(item.id);
    return mv && mv.triggersRouting;
  });

  // Build YAML frontmatter as a plain object (serialized inline below)
  const frontmatter = {
    schema_version: 1,
    spec_hash: specHash,
    mode,
    generated_at: new Date().toISOString(),
    completion_status: completionStatus,
    scorecard: {
      total,
      verifiable,
      verdict_counts: verdictCounts,
      confidence_counts: confidenceCounts,
      match_rate_pct: matchRate,
    },
  };

  // Determine section order from extractedItems section_headings field if present,
  // otherwise derive from item.section values preserving first-seen order (FR-022)
  // The extraction phase stores section_headings in the yaml; we reconstruct order here.
  const sectionOrder = [];
  const seenSections = new Set();
  for (const item of extractedItems) {
    if (item.section && !seenSections.has(item.section)) {
      sectionOrder.push(item.section);
      seenSections.add(item.section);
    }
  }

  // Group items by section, preserving spec order
  const itemsBySection = new Map();
  for (const section of sectionOrder) {
    itemsBySection.set(section, []);
  }
  for (const item of extractedItems) {
    if (itemsBySection.has(item.section)) {
      itemsBySection.get(item.section).push(item);
    }
  }

  // Build report body
  const lines = [];

  // Frontmatter block
  lines.push("---");
  lines.push(yaml.dump(frontmatter, { lineWidth: 120, noRefs: true }).trimEnd());
  lines.push("---");
  lines.push("");

  lines.push("# Verification Report");
  lines.push("");
  lines.push(
    `**Status:** ${completionStatus === "complete" ? "Complete" : "Partial"} | **Mode:** ${mode} | **Match rate:** ${matchRate}%`
  );
  lines.push("");

  // Scorecard summary table
  lines.push("## Scorecard");
  lines.push("");
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Total items | ${total} |`);
  lines.push(`| Verifiable | ${verifiable} |`);
  for (const [verdict, count] of Object.entries(verdictCounts)) {
    lines.push(`| ${verdict} | ${count} |`);
  }
  lines.push(`| Match rate | ${matchRate}% |`);
  lines.push(`| Completion status | ${completionStatus} |`);
  lines.push("");

  // Per-section item details
  for (const section of sectionOrder) {
    const sectionItems = itemsBySection.get(section) || [];
    lines.push(`## ${section}`);
    lines.push("");

    for (const item of sectionItems) {
      const mv = mergedVerdicts.get(item.id);
      if (!mv) continue;

      const verdictLabel = mv.confidence
        ? `**${mv.verdict}** (${mv.confidence})`
        : `**${mv.verdict}**`;

      lines.push(`### ${item.id}`);
      lines.push("");
      lines.push(`> ${item.text}`);
      lines.push("");
      lines.push(`**Verdict:** ${verdictLabel}`);
      lines.push("");

      // Include per-agent breakdown for multi-agent items (FR-023)
      if (mv.contributingAgents && mv.contributingAgents.length > 1) {
        lines.push("**Agent verdicts:**");
        lines.push("");
        for (const agent of mv.contributingAgents) {
          const agentConf = agent.confidence ? ` (${agent.confidence})` : "";
          lines.push(`- ${agent.agentId}: ${agent.verdict}${agentConf}`);
          if (agent.evidence) {
            lines.push(`  - Evidence: ${agent.evidence}`);
          }
        }
        lines.push("");
      } else if (mv.contributingAgents && mv.contributingAgents.length === 1) {
        const singleAgent = mv.contributingAgents[0];
        if (singleAgent.evidence) {
          lines.push(`**Evidence:** ${singleAgent.evidence}`);
          lines.push("");
        }
      }
    }
  }

  // Routing section — items that trigger downstream action (FR-015)
  lines.push("## Routing");
  lines.push("");
  if (routingItems.length === 0) {
    lines.push("No items require routing.");
  } else {
    lines.push(`${routingItems.length} item(s) trigger downstream routing:`);
    lines.push("");
    for (const item of routingItems) {
      const mv = mergedVerdicts.get(item.id);
      lines.push(
        `- **${item.id}** — ${mv.verdict} (${mv.confidence}): ${item.text.slice(0, 80)}${item.text.length > 80 ? "…" : ""}`
      );
    }
  }
  lines.push("");

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// writeReport
// ---------------------------------------------------------------------------

/**
 * Write the assembled report to the appropriate file based on mode.
 *
 * - gate mode → VERIFICATION-REPORT.md (hash stored for integrity checks)
 * - on-demand mode → VERIFICATION-REPORT-ondemand.md (no hash — NFR-004)
 *
 * All writes use fs.writeFileSync (plain string content, not YAML).
 * safeWrite is for YAML objects; the report is a markdown string.
 *
 * @param {string} pipelineDir
 * @param {string} report — assembled markdown report string
 * @param {"gate"|"on-demand"} mode
 */
function writeReport(pipelineDir, report, mode) {
  const relPath =
    mode === "gate" ? REPORT_GATE_REL : REPORT_ONDEMAND_REL;

  const absPath = path.join(pipelineDir, relPath);

  // Write atomically via tmp file then rename (same pattern as yamlIO.safeWrite)
  const tmpPath = absPath + ".tmp";
  fs.writeFileSync(tmpPath, report, "utf8");
  fs.renameSync(tmpPath, absPath);

  if (mode === "gate") {
    // Store hash so downstream phases can detect tampering (NFR-002)
    integrity.storeHash(pipelineDir, relPath, integrity.computeHashFromContent(report));
    console.log(`[verify] Gate report written and hashed: ${absPath}`);
  } else {
    console.log(`[verify] On-demand report written: ${absPath}`);
  }
}

// ---------------------------------------------------------------------------
// writeExtractedItems
// ---------------------------------------------------------------------------

/**
 * Write extracted items to extracted-items.yaml.
 *
 * Separated from processExtraction so it can be called independently when
 * working with cached items or after post-processing.
 *
 * @param {string} pipelineDir
 * @param {Object[]} items — array of extracted items with IDs
 * @param {string} specHash
 */
function writeExtractedItems(pipelineDir, items, specHash) {
  const extractedPath = path.join(pipelineDir, EXTRACTED_ITEMS_REL);

  const payload = {
    schema_version: 1,
    spec_hash: specHash,
    generated_at: new Date().toISOString(),
    total_items: items.length,
    verifiable_items: items.filter((i) => i.verifiable).length,
    items,
  };

  yamlIO.safeWrite(extractedPath, payload);
  console.log(`[verify] Wrote ${items.length} extracted items to ${extractedPath}`);
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------
// T-021 exports — pre-flight, extraction orchestration, grouping.
// T-022 exports — file delivery, dispatch, checkpoint, merge, report.
// T-023 exports — routing classification, loop guard, state update, orchestrator.

module.exports = {
  loadInputs,
  preflight,
  assembleExtractionBrief,
  processExtraction,
  groupItems,
  buildFileContentCache,
  assembleVerificationBrief,
  loadCheckpoint,
  saveCheckpoint,
  processVerificationResponse,
  mergeAllVerdicts,
  assembleReport,
  writeReport,
  writeExtractedItems,
};

// ---------------------------------------------------------------------------
// T-023: Routing classification constants
// ---------------------------------------------------------------------------

/**
 * Verdicts that indicate missing implementation — routes to architecture phase.
 * GAP means the feature/behaviour described in the spec has no corresponding code.
 */
const MISSING_IMPL_VERDICTS = new Set(["GAP"]);

/**
 * Verdicts that indicate spec drift — code exists but diverges from the spec.
 * Routes to eliciting phase so the spec can be reconciled with reality.
 */
const SPEC_DRIFT_VERDICTS = new Set(["PARTIAL", "DEVIATED"]);

/**
 * Path to state.yaml relative to pipelineDir.
 * pipelineDir IS the .pipeline directory, so state.yaml lives directly inside it.
 */
const STATE_YAML_REL = "state.yaml";

/**
 * Path to transitions.yaml relative to the project root (parent of pipelineDir).
 */
const TRANSITIONS_YAML_REL = path.join("references", "transitions.yaml");

/**
 * Default maximum number of consecutive verify→elicit/architecture cycles
 * before the loop guard halts the pipeline (FR-019).
 * Used only when config.verify.elicit_loop_max is absent.
 */
const DEFAULT_ELICIT_LOOP_MAX = 3;

// ---------------------------------------------------------------------------
// extractRoutingSuggestions (on-demand mode helper)
// ---------------------------------------------------------------------------

/**
 * Produce routing suggestions from merged verdicts for on-demand report inclusion.
 *
 * In on-demand mode state.yaml is never written, but the report still surfaces
 * which items would have triggered routing in gate mode. The shape mirrors the
 * gapItems array produced by determineRouting() so callers get a consistent API.
 *
 * @param {Map<string, import('../../../lib/verify-merge').MergedVerdict>} mergedVerdicts
 * @returns {Array<{ item_id: string, verdict: string, confidence: string, routing_target: string }>}
 */
function extractRoutingSuggestions(mergedVerdicts) {
  const suggestions = [];
  for (const [itemId, verdict] of mergedVerdicts.entries()) {
    if (!verdict.triggersRouting) continue;

    // Classify the same way determineRouting does for gate mode
    const routingTarget = MISSING_IMPL_VERDICTS.has(verdict.verdict)
      ? "architecture"
      : "eliciting";

    suggestions.push({
      item_id: itemId,
      verdict: verdict.verdict,
      confidence: verdict.confidence,
      routing_target: routingTarget,
    });
  }
  return suggestions;
}

// ---------------------------------------------------------------------------
// determineRouting
// ---------------------------------------------------------------------------

/**
 * Classify merged verdicts and determine which pipeline phase to route to next.
 *
 * Only items with triggersRouting === true (CONFIRMED GAP or CONFIRMED PARTIAL)
 * are acted on — all other verdicts are advisory (FR-020).
 *
 * Routing priority: "eliciting" takes precedence over "architecture". Spec drift
 * must be resolved before tackling missing implementations, because a drifted
 * spec invalidates what counts as "missing".
 *
 * @param {Map<string, import('../../../lib/verify-merge').MergedVerdict>} mergedVerdicts
 * @param {"gate"|"on-demand"} mode
 * @param {string} completionStatus — "complete" or "partial"
 * @param {Map<string, Object>} [extractedItemsMap] — Map of itemId → item for text lookup
 * @returns {{ target: string|null, gapItems: Array, shouldHalt?: boolean, reason?: string }}
 */
function determineRouting(mergedVerdicts, mode, completionStatus, extractedItemsMap) {
  // On-demand mode: surface suggestions only, never propose a state transition.
  if (mode === "on-demand") {
    return {
      target: null,
      gapItems: extractRoutingSuggestions(mergedVerdicts),
      shouldHalt: false,
    };
  }

  // Gate mode requires a complete report before routing is safe to act on.
  // A partial report means some groups failed; routing on incomplete data is
  // dangerous because the missing verdicts might change the target phase.
  if (completionStatus !== "complete") {
    return {
      target: null,
      gapItems: [],
      shouldHalt: true,
      reason: "partial report",
    };
  }

  // Collect all items that carry a CONFIRMED routing signal.
  const routingItems = [];
  for (const [itemId, verdict] of mergedVerdicts.entries()) {
    if (verdict.triggersRouting) {
      routingItems.push({ itemId, verdict });
    }
  }

  // No confirmed gaps — pipeline can advance to complete.
  if (routingItems.length === 0) {
    return { target: "complete", gapItems: [] };
  }

  // Classify each routing item: spec drift vs missing implementation.
  let hasSpecDrift = false;
  let hasMissingImpl = false;
  for (const { verdict } of routingItems) {
    if (SPEC_DRIFT_VERDICTS.has(verdict.verdict)) hasSpecDrift = true;
    if (MISSING_IMPL_VERDICTS.has(verdict.verdict)) hasMissingImpl = true;
  }

  // Routing priority: eliciting (spec drift) before architecture (missing impl).
  const target = hasSpecDrift ? "eliciting" : "architecture";

  // Build the full routing payload for downstream phase consumption (FR-020).
  const gapItems = routingItems.map(({ itemId, verdict }) => {
    const routingTarget = SPEC_DRIFT_VERDICTS.has(verdict.verdict)
      ? "eliciting"
      : "architecture";

    // Summarise contributing agents to help the next phase's human triage.
    const agentSummary = Array.isArray(verdict.contributingAgents)
      ? verdict.contributingAgents
          .map((a) => `${a.agentId || a.groupId}: ${a.verdict}/${a.confidence}`)
          .join("; ")
      : "(no agent detail)";

    const sourceItem = extractedItemsMap ? extractedItemsMap.get(itemId) : null;
    return {
      item_id: itemId,
      text: (sourceItem && sourceItem.text) || null,
      verdict: verdict.verdict,
      confidence: verdict.confidence,
      routing_target: routingTarget,
      rationale: agentSummary,
    };
  });

  return { target, gapItems };
}

// ---------------------------------------------------------------------------
// checkLoopLimit
// ---------------------------------------------------------------------------

/**
 * Guard against infinite verify→elicit/architecture→verify cycles (FR-019).
 *
 * The limit fires when the gap count has not improved (remained the same or
 * grown) across consecutive routing cycles. "Not improved" means
 * currentGapCount >= verify_last_gap_count, which catches both stagnation and
 * regression in equal measure.
 *
 * @param {string} pipelineDir — absolute path to .pipeline/
 * @param {Object} config — pipeline config
 * @param {number} currentGapCount — number of routing items found in this cycle
 * @returns {{ ok: boolean, cycleCount: number, limitReached?: boolean, reason?: string }}
 */
function checkLoopLimit(pipelineDir, config, currentGapCount) {
  const statePath = path.join(pipelineDir, STATE_YAML_REL);
  const state = yamlIO.safeReadWithFallback(statePath) || {};
  const pipeline = state.pipeline || {};

  // Read persisted counters; default to safe initial values when absent.
  const cycleCount = typeof pipeline.verify_cycle_count === "number"
    ? pipeline.verify_cycle_count
    : 0;
  const lastGapCount = typeof pipeline.verify_last_gap_count === "number"
    ? pipeline.verify_last_gap_count
    : null;

  const loopMax =
    (config && config.verify && typeof config.verify.elicit_loop_max === "number")
      ? config.verify.elicit_loop_max
      : DEFAULT_ELICIT_LOOP_MAX;

  // First routing cycle (no previous gap count stored) — loop guard cannot
  // trigger yet because there is nothing to compare against.
  if (lastGapCount === null) {
    return { ok: true, cycleCount };
  }

  // Gap count has not improved — this counts as a non-improving consecutive cycle.
  if (currentGapCount >= lastGapCount) {
    const consecutiveCycles = cycleCount + 1;
    if (consecutiveCycles >= loopMax) {
      return {
        ok: false,
        cycleCount: consecutiveCycles,
        limitReached: true,
        reason: errors.formatError("E_VERIFY_LOOP_LIMIT", {
          limit: loopMax,
          count: consecutiveCycles,
        }),
      };
    }
  }

  return { ok: true, cycleCount };
}

// ---------------------------------------------------------------------------
// updateVerifyState
// ---------------------------------------------------------------------------

/**
 * Persist verify cycle counters, gap payload, and phase transition to state.yaml.
 *
 * This is the single write point for verify-phase state mutations. It must
 * never be called in on-demand mode — that enforcement lives in runVerify.
 *
 * @param {string} pipelineDir — absolute path to .pipeline/
 * @param {"complete"|"eliciting"|"architecture"} target — routing target
 * @param {Array} gapItems — routing payload from determineRouting()
 * @param {number} currentGapCount — number of gap items in this cycle
 */
function updateVerifyState(pipelineDir, target, gapItems, currentGapCount) {
  const statePath = path.join(pipelineDir, STATE_YAML_REL);
  const state = yamlIO.safeReadWithFallback(statePath) || {};

  if (!state.pipeline) {
    state.pipeline = {};
  }

  if (target === "complete") {
    // Successful completion resets the loop counter so the next verify cycle
    // starts fresh — the loop guard is only about consecutive failures.
    state.pipeline.verify_cycle_count = 0;
    delete state.pipeline.verify_last_gap_count;
    delete state.pipeline.verify_gap_items;
  } else {
    // Routing back to eliciting or architecture: increment cycle counter and
    // snapshot the current gap count for comparison on the next cycle.
    const prevCount = typeof state.pipeline.verify_cycle_count === "number"
      ? state.pipeline.verify_cycle_count
      : 0;
    state.pipeline.verify_cycle_count = prevCount + 1;
    state.pipeline.verify_last_gap_count = currentGapCount;

    // Store gap items so the downstream phase can target specific items (FR-020).
    state.pipeline.verify_gap_items = gapItems;
  }

  // Validate the phase transition against the state machine before committing.
  // An invalid transition is logged but does not crash — a partial state write
  // is worse than a warning.
  const stateMachine = require("../../../lib/state-machine");
  const transitionsPath = path.join(
    path.dirname(pipelineDir),
    TRANSITIONS_YAML_REL
  );
  const transitionMap = stateMachine.loadTransitions(transitionsPath);
  const currentPhase = state.pipeline.phase || "verifying";
  const transitionResult = stateMachine.transition(currentPhase, target, transitionMap);

  if (!transitionResult.ok) {
    console.error(
      `[verify] State transition rejected (${currentPhase} → ${target}): ${transitionResult.error}. Phase field not updated.`
    );
  } else {
    state.pipeline.phase = target;
  }

  state.last_updated = new Date().toISOString();
  yamlIO.safeWrite(statePath, state);
}

// ---------------------------------------------------------------------------
// runVerify (main orchestrator — DEC-A004)
// ---------------------------------------------------------------------------

/**
 * Main entry point for the verify phase.
 *
 * Ties together all verify-phase steps: preflight, extraction, grouping, file
 * content caching, brief assembly, agent dispatch, checkpoint, merge, report,
 * routing, loop guard, and state transition.
 *
 * The dispatchFn parameter is an injectable seam (DEC-A004): tests pass a
 * synchronous stub; production dispatch is handled by the SKILL.md behavioral
 * layer (dispatchFn === null means "let SKILL.md drive").
 *
 * On-demand mode NEVER writes to state.yaml (NFR-004).
 * The pipeline lock is ALWAYS released in the finally block (FR-017).
 *
 * @param {Object} opts
 * @param {string} opts.pipelineDir — absolute path to .pipeline/
 * @param {string} opts.pluginRoot — absolute path to essense-flow plugin root
 * @param {Object} opts.config — pipeline config
 * @param {"gate"|"on-demand"} opts.mode — run mode
 * @param {Function|null} [opts.dispatchFn] — async fn(brief) → rawOutput; null = real dispatch
 * @returns {Promise<{ ok: boolean, report?: string, routing?: Object, error?: string }>}
 */
async function runVerify({ pipelineDir, pluginRoot, config, mode, dispatchFn = null }) {
  const projectRoot = path.dirname(pipelineDir);

  // Track whether preflight acquired the lock so the finally block knows
  // whether a release is needed. preflight() both acquires the lock and does
  // all pre-dispatch validation — if it fails, no lock was taken.
  let lockAcquired = false;

  try {
    // -----------------------------------------------------------------------
    // Step 1: Pre-flight (acquires the pipeline lock on success)
    // -----------------------------------------------------------------------
    const preflightResult = preflight(pipelineDir, pluginRoot, config);
    if (!preflightResult.ok) {
      return { ok: false, error: preflightResult.error };
    }
    lockAcquired = true;

    const { specContent, specHash, fileTree, fileTreeText, decisions, cacheHit } =
      preflightResult;

    // -----------------------------------------------------------------------
    // Step 2: Extraction — load cached items or dispatch the extraction agent
    // -----------------------------------------------------------------------
    let items;
    const extractedPath = path.join(pipelineDir, EXTRACTED_ITEMS_REL);

    if (cacheHit) {
      // Re-check spec hash even in cache-hit path (H-4 fix)
      const specFilePath = path.join(pipelineDir, "elicitation", "SPEC.md");
      if (fs.existsSync(specFilePath)) {
        const currentContent = stripFrontmatter(fs.readFileSync(specFilePath, "utf8"));
        const currentHash = integrity.computeHashFromContent(currentContent);
        if (currentHash !== specHash) {
          console.log("[verify] SPEC.md changed since preflight — invalidating cache.");
          cacheHit = false;
        }
      }
    }

    if (cacheHit) {
      const cached = yamlIO.safeReadWithFallback(extractedPath);
      items = cached && Array.isArray(cached.items) ? cached.items : null;
      if (!items) {
        return {
          ok: false,
          error: errors.formatError("E_ARTIFACT_MISSING", { path: extractedPath }),
        };
      }
      console.log(`[verify] Using cached extraction: ${items.length} item(s).`);
    } else {
      // Step 3 (inline): Re-check spec hash before dispatching to prevent
      // mixed-version verdicts when SPEC.md is edited during a run (FR-005).
      const specFilePath = path.join(pipelineDir, "elicitation", "SPEC.md");
      if (!fs.existsSync(specFilePath)) {
        return {
          ok: false,
          error: errors.formatError("E_ARTIFACT_MISSING", { path: specFilePath }),
        };
      }
      const currentSpecContent = stripFrontmatter(fs.readFileSync(specFilePath, "utf8"));
      const currentHash = integrity.computeHashFromContent(currentSpecContent);
      if (currentHash !== specHash) {
        return {
          ok: false,
          error: errors.formatError("E_VERIFY_SPEC_MUTATED", {
            hash_start: specHash.slice(0, 8),
            hash_current: currentHash.slice(0, 8),
          }),
        };
      }

      // Assemble extraction brief then dispatch.
      const briefResult = assembleExtractionBrief(
        specContent,
        fileTreeText,
        specHash,
        pluginRoot,
        config
      );
      if (!briefResult.ok) {
        return { ok: false, error: briefResult.error };
      }

      if (!dispatchFn) {
        // No dispatchFn — return the brief so the SKILL.md behavioral layer can
        // dispatch it. The caller is responsible for calling processExtraction()
        // and re-entering the orchestrator with the result cached.
        console.log("[verify] No dispatchFn — brief assembled; dispatch via SKILL.md.");
        return { ok: true, brief: briefResult.brief, awaitingDispatch: true };
      }

      const rawExtractionOutput = await dispatchFn(briefResult.brief);
      const extractionResult = processExtraction(
        rawExtractionOutput,
        specContent,
        specHash,
        pipelineDir
      );
      if (!extractionResult.ok) {
        return {
          ok: false,
          error: errors.formatError("E_VERIFY_EXTRACTION_FAILED", {
            reason: extractionResult.errors.join("; "),
            retries: 1,
          }),
        };
      }
      items = extractionResult.items;
    }

    // -----------------------------------------------------------------------
    // Step 4: Group items by section
    // -----------------------------------------------------------------------
    const { groups } = groupItems(items, config, specContent);

    // -----------------------------------------------------------------------
    // Step 5: Build file content cache (deduplicates shared files across groups)
    // -----------------------------------------------------------------------
    const fileCache = buildFileContentCache(groups, projectRoot, config);

    // -----------------------------------------------------------------------
    // Step 6: Load checkpoint — skip already-completed groups on re-run (FR-016)
    // -----------------------------------------------------------------------
    const checkpointResult = loadCheckpoint(pipelineDir, specHash);
    const completedGroups = new Map(
      checkpointResult.ok && checkpointResult.completedGroups
        ? checkpointResult.completedGroups
        : []
    );

    // -----------------------------------------------------------------------
    // Step 7: Dispatch verification briefs for each uncompleted group
    // -----------------------------------------------------------------------
    for (const group of groups) {
      if (completedGroups.has(group.groupId)) {
        console.log(`[verify] Skipping group "${group.groupId}" — already in checkpoint.`);
        continue;
      }

      const briefResult = assembleVerificationBrief(
        group,
        fileCache,
        decisions,
        specHash,
        pluginRoot,
        config
      );
      if (!briefResult.ok) {
        // Non-fatal: leave this group out of completedGroups. mergeAllVerdicts()
        // will mark its items as UNVERIFIED, resulting in a partial report.
        console.error(
          `[verify] Brief assembly failed for group "${group.groupId}": ${briefResult.error}`
        );
        continue;
      }

      if (!dispatchFn) {
        // No dispatchFn — cannot dispatch. Report will be partial.
        console.log(
          `[verify] No dispatchFn — skipping verification dispatch for group "${group.groupId}".`
        );
        continue;
      }

      const rawOutput = await dispatchFn(briefResult.brief);
      const verificationResult = processVerificationResponse(rawOutput, specHash, items);
      if (!verificationResult.ok) {
        console.error(
          `[verify] Verification response invalid for group "${group.groupId}": ` +
            (verificationResult.errors || []).join("; ")
        );
        continue;
      }

      completedGroups.set(group.groupId, verificationResult.verdicts);
      saveCheckpoint(pipelineDir, specHash, completedGroups);
    }

    // -----------------------------------------------------------------------
    // Step 8: Merge all verdicts across all completed groups
    // -----------------------------------------------------------------------
    const mergedVerdicts = mergeAllVerdicts(completedGroups, items);

    // -----------------------------------------------------------------------
    // Step 9: Assemble the verification report
    // -----------------------------------------------------------------------
    const report = assembleReport(items, mergedVerdicts, specHash, mode, config);

    // -----------------------------------------------------------------------
    // Step 10: Write report to disk (DEC-A001: gate and on-demand use distinct paths)
    // -----------------------------------------------------------------------
    writeReport(pipelineDir, report, mode);

    // -----------------------------------------------------------------------
    // Step 11: Gate-mode routing and state transition
    // On-demand mode never touches state.yaml (NFR-004).
    // -----------------------------------------------------------------------
    let routing = null;

    // Compute completion status and build item lookup for routing
    const hasUnverified = [...mergedVerdicts.values()].some((mv) => mv.verdict === "UNVERIFIED");
    const completionStatus = hasUnverified ? "partial" : "complete";
    const extractedItemsMap = new Map(items.map((item) => [item.id, item]));

    if (mode === "gate") {
      const routingResult = determineRouting(mergedVerdicts, mode, completionStatus, extractedItemsMap);

      if (routingResult.shouldHalt) {
        // Partial report: refuse to route and surface the error to the caller.
        return {
          ok: false,
          report,
          error: errors.formatError("E_VERIFY_PARTIAL_REPORT", {
            failed: groups.length - completedGroups.size,
            total: groups.length,
          }),
          routing: routingResult,
        };
      }

      const { target, gapItems } = routingResult;
      const gapCount = Array.isArray(gapItems) ? gapItems.length : 0;

      // Loop guard — halt if gap count is not improving across consecutive cycles.
      const loopResult = checkLoopLimit(pipelineDir, config, gapCount);
      if (!loopResult.ok && loopResult.limitReached) {
        return {
          ok: false,
          report,
          error: loopResult.reason,
          routing: routingResult,
        };
      }

      // Commit phase transition + cycle counters to state.yaml.
      updateVerifyState(pipelineDir, target, gapItems, gapCount);
      routing = { target, gapItems };
    } else {
      // On-demand: surface routing suggestions without writing any state.
      routing = determineRouting(mergedVerdicts, mode, completionStatus, extractedItemsMap);
    }

    return { ok: true, report, routing };
  } finally {
    // Step 12: Always release the lock — even on thrown errors (FR-017).
    if (lockAcquired) {
      const releaseResult = lockfile.releaseLock(pipelineDir);
      if (!releaseResult.ok) {
        console.error(`[verify] Failed to release pipeline lock: ${releaseResult.error}`);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// T-023 exports (appended to avoid conflicts — T-022 already assigned module.exports)
// ---------------------------------------------------------------------------

module.exports.determineRouting = determineRouting;
module.exports.checkLoopLimit = checkLoopLimit;
module.exports.updateVerifyState = updateVerifyState;
module.exports.runVerify = runVerify;
