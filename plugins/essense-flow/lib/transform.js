"use strict";

const tokens = require("./tokens");

// Sections stripped from agent output (internal notes, not needed by agent)
const STRIPPED_SECTIONS = new Set(["notes", "note"]);

// Constraint keywords in pseudocode
const CONSTRAINT_KEYWORDS = /\b(must|only|never|always)\b/i;

// Rationale patterns — sentences that explain "why" rather than "what"
const RATIONALE_PATTERNS = [
  /\bthis matters because\b/i,
  /\bbecause it\b/i,
  /\bin order to\b/i,
  /\bso that\b/i,
  /\bwe decided\b/i,
  /\bwe considered\b/i,
  /\bthe reason\b/i,
  /\bthis is because\b/i,
];

/**
 * Extract YAML frontmatter and named sections from a markdown document.
 *
 * @param {string} text
 * @returns {{ frontmatter: string|null, sections: Object<string, string> }}
 */
function extractSections(text) {
  if (!text) return { frontmatter: null, sections: {} };

  let body = text;
  let frontmatter = null;

  // Strip YAML frontmatter (--- ... ---)
  const fmMatch = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (fmMatch) {
    frontmatter = fmMatch[1].trim();
    body = fmMatch[2];
  }

  // Extract ## sections (top-level only — ## not ###, so sub-headings stay inside section body)
  const sections = {};
  const headingPattern = /^#{1,2}\s+(.+)$/gm;
  const headings = [...body.matchAll(headingPattern)];

  for (let i = 0; i < headings.length; i++) {
    const name = headings[i][1].trim().toLowerCase();
    const start = headings[i].index + headings[i][0].length;
    const end = i + 1 < headings.length ? headings[i + 1].index : body.length;
    const content = body.slice(start, end).trim();
    sections[name] = content;
  }

  return { frontmatter, sections };
}

/**
 * Strip rationale sentences from a text block.
 * Preserves sentences that don't match rationale patterns.
 *
 * @param {string|null} text
 * @returns {string}
 */
function stripRationale(text) {
  if (!text) return "";
  const sentences = text.split(/(?<=[.!?])\s+/);
  return sentences
    .filter((s) => !RATIONALE_PATTERNS.some((pat) => pat.test(s)))
    .join(" ")
    .trim();
}

/**
 * Extract constraint lines from pseudocode (lines containing must/only/never/always).
 *
 * @param {string|null} pseudocode
 * @returns {string[]}
 */
function extractConstraintsFromPseudocode(pseudocode) {
  if (!pseudocode) return [];
  return pseudocode
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => CONSTRAINT_KEYWORDS.test(line))
    .map((line) => line.replace(/^\d+\.\s*/, "").trim())
    .filter((line) => line.length > 0);
}

/**
 * Extract a field value from frontmatter text.
 * Supports both blockquote-style (**key:** value) and YAML-style (key: value).
 *
 * @param {string|null} frontmatter
 * @param {string} field
 * @returns {string|null}
 */
function extractFrontmatterField(frontmatter, field) {
  if (!frontmatter) return null;

  // Blockquote-style: **key:** value or **key:** value
  const blockquotePattern = new RegExp(`\\*\\*${field}:\\*\\*\\s*(.+)`, "i");
  const bqMatch = frontmatter.match(blockquotePattern);
  if (bqMatch) return bqMatch[1].trim();

  // YAML-style: key: value
  const yamlPattern = new RegExp(`^${field}:\\s*(.+)$`, "im");
  const yamlMatch = frontmatter.match(yamlPattern);
  if (yamlMatch) return yamlMatch[1].trim();

  return null;
}

/**
 * Transform a task spec into a 7-block agent markdown brief.
 * Blocks: IDENTITY, CONSTRAINTS, CONTEXT, TASK INSTRUCTIONS, OUTPUT FORMAT,
 *         ACCEPTANCE CRITERIA, COMPLETION SENTINEL.
 *
 * @param {string} spec — raw task specification content
 * @param {string|null} architectureContext — architecture context content
 * @param {Object} config — pipeline config
 * @returns {{ ok: boolean, agentMd?: string, tokenCount?: number, warnings?: string[], error?: string }}
 */
function transformToAgentMd(spec, architectureContext, config) {
  try {
    if (!spec || typeof spec !== "string" || !spec.trim()) {
      return { ok: false, error: "Task spec is empty or invalid" };
    }

    const { frontmatter, sections } = extractSections(spec);

    // Check if there are any extractable sections (excluding notes)
    const usableSections = Object.keys(sections).filter((k) => !STRIPPED_SECTIONS.has(k));
    if (usableSections.length === 0) {
      return { ok: false, error: "Task spec has no extractable sections" };
    }

    const warnings = [];

    // Extract frontmatter fields for metadata
    const sprint = frontmatter ? extractFrontmatterField(frontmatter, "sprint") : null;
    const outputPath = frontmatter ? extractFrontmatterField(frontmatter, "output_path") : null;

    // Extract pseudocode constraints
    const pseudocode = sections["pseudocode"] || "";
    const constraints = extractConstraintsFromPseudocode(pseudocode);

    // Interface spec section
    const interfaceSpec = sections["interface specification"] || sections["interface spec"] || "";

    // Goal
    const goal = sections["goal"] || sections["objective"] || "";

    // Context
    const contextSection = sections["context"] || sections["background"] || "";

    // Acceptance Criteria
    const acceptanceCriteria = sections["acceptance criteria"] || sections["acceptance"] || "";

    // Build agent brief blocks
    const blocks = [];

    // Block 1: IDENTITY
    blocks.push("## IDENTITY");
    blocks.push("");
    blocks.push("You are a focused implementation agent. Your job is to execute the task spec below precisely.");
    if (sprint) blocks.push(`Sprint: ${sprint}`);
    if (outputPath) blocks.push(`Output path: ${outputPath}`);
    blocks.push("");

    // Block 2: CONSTRAINTS
    blocks.push("## CONSTRAINTS");
    blocks.push("");
    if (constraints.length > 0) {
      for (const c of constraints) {
        blocks.push(`- ${c}`);
      }
    } else {
      blocks.push("- Follow task spec exactly.");
      blocks.push("- Write only files listed in Files Touched.");
    }
    blocks.push("");

    // Block 3: CONTEXT
    blocks.push("## CONTEXT");
    blocks.push("");
    if (architectureContext) {
      blocks.push('<data-block source="architecture-context">');
      blocks.push(architectureContext);
      blocks.push("</data-block>");
      blocks.push("");
    }
    if (contextSection) {
      blocks.push(contextSection);
      blocks.push("");
    }

    // Block 4: TASK INSTRUCTIONS
    blocks.push("## TASK INSTRUCTIONS");
    blocks.push("");
    if (goal) {
      blocks.push(goal);
      blocks.push("");
    }
    if (pseudocode) {
      blocks.push(pseudocode);
      blocks.push("");
    }

    // Interface spec as data-block
    if (interfaceSpec) {
      blocks.push('<data-block source="interface-spec">');
      blocks.push(interfaceSpec);
      blocks.push("</data-block>");
      blocks.push("");
    }

    // Files touched
    const filesTouched = sections["files touched"] || sections["files"] || "";
    if (filesTouched) {
      blocks.push(filesTouched);
      blocks.push("");
    }

    // Edge cases
    const edgeCases = sections["edge cases"] || "";
    if (edgeCases) {
      blocks.push("**Edge Cases:**");
      blocks.push(edgeCases);
      blocks.push("");
    }

    // Block 5: OUTPUT FORMAT
    blocks.push("## OUTPUT FORMAT");
    blocks.push("");
    blocks.push("Respond with:");
    blocks.push("1. A brief summary of what you did.");
    blocks.push("2. List of files written or modified.");
    blocks.push("3. Any issues encountered.");
    blocks.push("");

    // Block 6: ACCEPTANCE CRITERIA
    blocks.push("## ACCEPTANCE CRITERIA");
    blocks.push("");
    if (acceptanceCriteria) {
      blocks.push(acceptanceCriteria);
    } else {
      blocks.push("(No acceptance criteria specified.)");
    }
    blocks.push("");

    // Block 7: COMPLETION SENTINEL
    blocks.push("## COMPLETION SENTINEL");
    blocks.push("");
    blocks.push("After completing your task, end your response with:");
    blocks.push("<!-- SENTINEL:COMPLETE:{BRIEF_ID}:{AGENT_ID} -->");
    blocks.push("");

    const agentMd = blocks.join("\n");
    const tokenCount = tokens.countTokens(agentMd);

    // Check against brief ceiling
    if (config && config.token_budgets && config.token_budgets.brief_ceiling) {
      const ceiling = config.token_budgets.brief_ceiling;
      const safetyPct = config.token_budgets.safety_margin_pct || 10;
      const effectiveCeiling = Math.floor(ceiling * (1 - safetyPct / 100));

      if (tokenCount > effectiveCeiling) {
        warnings.push(`Token count ${tokenCount} exceeds token ceiling of ${effectiveCeiling}`);
      }
    }

    return {
      ok: true,
      agentMd,
      tokenCount,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

module.exports = {
  extractSections,
  stripRationale,
  extractConstraintsFromPseudocode,
  extractFrontmatterField,
  transformToAgentMd,
};
