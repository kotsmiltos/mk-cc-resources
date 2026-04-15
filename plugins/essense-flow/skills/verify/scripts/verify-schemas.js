"use strict";

/**
 * Schema definitions and pure validation functions for the verify skill.
 *
 * No I/O, no lib imports — safe to use in any context without side effects.
 * All validators return plain result objects so callers can decide how to
 * surface failures.
 */

// ---------------------------------------------------------------------------
// Schema constants
// ---------------------------------------------------------------------------

/**
 * Required fields and their expected types for a single extracted item.
 * Values are human-readable type descriptors used in error messages.
 */
const EXTRACTED_ITEM_FIELDS = {
  text: "non-empty string",
  section: "non-empty string",
  verifiable: "boolean",
  verifiable_reason: "non-empty string",
  files: "array of strings",
};

/**
 * Required fields and their expected types for a single verdict entry.
 */
const VERIFICATION_RESPONSE_FIELDS = {
  item_id: "string matching /^VI-[a-f0-9]+$/",
  verdict: "one of VALID_VERDICTS",
  confidence: "one of VALID_CONFIDENCES",
  evidence: "non-empty string",
  absence_type: '"confirmed" | "unresolved" | null (required when verdict=GAP)',
  decision_override: "string (DEC-NNN) or null",
  decision_scope_confirmed:
    "boolean or null (required when decision_override is set)",
};

/** All valid verdict values (FR-001). */
const VALID_VERDICTS = ["MATCH", "PARTIAL", "GAP", "DEVIATED", "SKIPPED"];

/** All valid confidence values (FR-002). */
const VALID_CONFIDENCES = ["CONFIRMED", "LIKELY", "SUSPECTED"];

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Return true if value is a non-empty string.
 *
 * @param {*} value
 * @returns {boolean}
 */
function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Return true if value is a finite integer >= 0.
 *
 * @param {*} value
 * @returns {boolean}
 */
function isNonNegativeInteger(value) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

/**
 * Return true if value is an array where every element is a string.
 *
 * @param {*} value
 * @returns {boolean}
 */
function isStringArray(value) {
  return Array.isArray(value) && value.every((el) => typeof el === "string");
}

// ---------------------------------------------------------------------------
// validateExtractedItems
// ---------------------------------------------------------------------------

/**
 * Validate the full structure of an extracted-items.yaml payload (FR-001).
 *
 * Checks:
 * - Top-level required fields and types
 * - Each item's required fields and types
 * - Every item's `section` is in `section_headings`
 * - No duplicate item texts within the same section
 * - `total_items` equals `items.length`
 * - `verifiable_items` equals the count of items where verifiable=true
 *
 * @param {Object} data
 * @returns {{ ok: boolean, errors: string[] }}
 */
function validateExtractedItems(data) {
  const errors = [];

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return { ok: false, errors: ["data must be a non-null object"] };
  }

  // --- Top-level field validation ---

  if (data.schema_version !== 1) {
    errors.push("schema_version must be 1");
  }

  const SPEC_HASH_PATTERN = /^[a-f0-9]{64}$/;
  if (!isNonEmptyString(data.spec_hash) || !SPEC_HASH_PATTERN.test(data.spec_hash)) {
    errors.push("spec_hash must be a 64-character lowercase hex string");
  }

  if (!isNonNegativeInteger(data.total_items)) {
    errors.push("total_items must be a non-negative integer");
  }

  if (!isNonNegativeInteger(data.verifiable_items)) {
    errors.push("verifiable_items must be a non-negative integer");
  }

  if (
    !Array.isArray(data.section_headings) ||
    data.section_headings.length === 0 ||
    !isStringArray(data.section_headings)
  ) {
    errors.push("section_headings must be a non-empty array of strings");
  }

  if (!Array.isArray(data.items)) {
    errors.push("items must be an array");
    // Cannot continue item-level checks without a valid items array
    return { ok: errors.length === 0, errors };
  }

  // --- Cross-field totals ---

  if (isNonNegativeInteger(data.total_items) && data.total_items !== data.items.length) {
    errors.push(
      `total_items (${data.total_items}) does not match items.length (${data.items.length})`
    );
  }

  const verifiableCount = data.items.filter(
    (item) => item && item.verifiable === true
  ).length;

  if (
    isNonNegativeInteger(data.verifiable_items) &&
    data.verifiable_items !== verifiableCount
  ) {
    errors.push(
      `verifiable_items (${data.verifiable_items}) does not match actual count of verifiable items (${verifiableCount})`
    );
  }

  // --- Per-item validation ---

  const validHeadings = Array.isArray(data.section_headings)
    ? new Set(data.section_headings)
    : new Set();

  // Tracks item texts per section to detect duplicates within a section
  const seenTextsBySection = new Map();

  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i];
    const prefix = `items[${i}]`;

    if (!item || typeof item !== "object") {
      errors.push(`${prefix}: must be a non-null object`);
      continue;
    }

    if (!isNonEmptyString(item.text)) {
      errors.push(`${prefix}.text: must be a non-empty string`);
    }

    if (!isNonEmptyString(item.section)) {
      errors.push(`${prefix}.section: must be a non-empty string`);
    } else if (validHeadings.size > 0 && !validHeadings.has(item.section)) {
      errors.push(
        `${prefix}.section: "${item.section}" is not listed in section_headings`
      );
    }

    if (typeof item.verifiable !== "boolean") {
      errors.push(`${prefix}.verifiable: must be a boolean`);
    }

    if (!isNonEmptyString(item.verifiable_reason)) {
      errors.push(`${prefix}.verifiable_reason: must be a non-empty string`);
    }

    if (!isStringArray(item.files)) {
      errors.push(`${prefix}.files: must be an array of strings`);
    }

    // Duplicate detection within section
    if (isNonEmptyString(item.text) && isNonEmptyString(item.section)) {
      const key = item.section;
      if (!seenTextsBySection.has(key)) {
        seenTextsBySection.set(key, new Set());
      }
      const sectionTexts = seenTextsBySection.get(key);
      if (sectionTexts.has(item.text)) {
        errors.push(
          `${prefix}.text: duplicate text in section "${item.section}"`
        );
      } else {
        sectionTexts.add(item.text);
      }
    }
  }

  return { ok: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// validateVerificationResponse
// ---------------------------------------------------------------------------

/**
 * Validate an agent verification response and apply automatic confidence
 * downgrades per the spec rules (FR-010, FR-011, FR-012).
 *
 * Downgrades applied:
 * 1. Any file read incompletely (complete=false) → all CONFIRMED verdicts in
 *    this response downgraded to LIKELY (FR-011).
 * 2. verdict=GAP, confidence=CONFIRMED, absence_type="unresolved" →
 *    downgraded to SUSPECTED (FR-010).
 * 3. verdict=DEVIATED but decision_scope_confirmed is false or null →
 *    verdict treated as GAP (FR-012).
 *
 * @param {Object} response
 * @returns {{ ok: boolean, errors: string[], downgrades: string[] }}
 */
function validateVerificationResponse(response) {
  const errors = [];
  const downgrades = [];

  if (!response || typeof response !== "object" || Array.isArray(response)) {
    return {
      ok: false,
      errors: ["response must be a non-null object"],
      downgrades,
    };
  }

  // --- Top-level fields ---

  if (!isNonEmptyString(response.agent_id)) {
    errors.push("agent_id must be a non-empty string");
  }

  if (!isNonEmptyString(response.group_id)) {
    errors.push("group_id must be a non-empty string");
  }

  if (!isNonEmptyString(response.spec_hash)) {
    errors.push("spec_hash must be a non-empty string");
  }

  if (typeof response.read_complete !== "boolean") {
    errors.push("read_complete must be a boolean");
  }

  if (!Array.isArray(response.files_read)) {
    errors.push("files_read must be an array");
  } else {
    for (let i = 0; i < response.files_read.length; i++) {
      const file = response.files_read[i];
      const prefix = `files_read[${i}]`;

      if (!file || typeof file !== "object") {
        errors.push(`${prefix}: must be a non-null object`);
        continue;
      }
      if (!isNonEmptyString(file.path)) {
        errors.push(`${prefix}.path: must be a non-empty string`);
      }
      if (typeof file.complete !== "boolean") {
        errors.push(`${prefix}.complete: must be a boolean`);
      }
      if (
        file.tokens_estimated !== null &&
        file.tokens_estimated !== undefined &&
        (typeof file.tokens_estimated !== "number" ||
          !Number.isInteger(file.tokens_estimated))
      ) {
        errors.push(`${prefix}.tokens_estimated: must be an integer or null`);
      }
    }
  }

  if (!Array.isArray(response.verdicts)) {
    errors.push("verdicts must be an array");
    return { ok: errors.length === 0, errors, downgrades };
  }

  // --- Determine whether any file was read incompletely (FR-011) ---
  // This drives the CONFIRMED→LIKELY blanket downgrade for the entire response.
  const hasIncompleteRead =
    Array.isArray(response.files_read) &&
    response.files_read.some((f) => f && f.complete === false);

  // --- Per-verdict validation and downgrade logic ---

  const ITEM_ID_PATTERN = /^VI-[a-f0-9]+$/;

  for (let i = 0; i < response.verdicts.length; i++) {
    const verdict = response.verdicts[i];
    const prefix = `verdicts[${i}]`;

    if (!verdict || typeof verdict !== "object") {
      errors.push(`${prefix}: must be a non-null object`);
      continue;
    }

    // item_id
    if (
      !isNonEmptyString(verdict.item_id) ||
      !ITEM_ID_PATTERN.test(verdict.item_id)
    ) {
      errors.push(`${prefix}.item_id: must match /^VI-[a-f0-9]+$/`);
    }

    const verdictLabel = isNonEmptyString(verdict.item_id)
      ? verdict.item_id
      : `index ${i}`;

    // verdict value
    if (!VALID_VERDICTS.includes(verdict.verdict)) {
      errors.push(
        `${prefix}.verdict: "${verdict.verdict}" is not a valid verdict (${VALID_VERDICTS.join(", ")})`
      );
    }

    // confidence value
    if (!VALID_CONFIDENCES.includes(verdict.confidence)) {
      errors.push(
        `${prefix}.confidence: "${verdict.confidence}" is not a valid confidence (${VALID_CONFIDENCES.join(", ")})`
      );
    }

    // evidence
    if (!isNonEmptyString(verdict.evidence)) {
      errors.push(`${prefix}.evidence: must be a non-empty string`);
    }

    // absence_type — required when verdict=GAP (FR-010)
    const VALID_ABSENCE_TYPES = ["confirmed", "unresolved"];
    if (verdict.verdict === "GAP") {
      if (
        verdict.absence_type === null ||
        verdict.absence_type === undefined ||
        !VALID_ABSENCE_TYPES.includes(verdict.absence_type)
      ) {
        errors.push(
          `${prefix}.absence_type: must be "confirmed" or "unresolved" when verdict=GAP (got ${verdict.absence_type})`
        );
      }
    }

    // DEVIATED requires a decision reference (FR-012)
    if (
      verdict.verdict === "DEVIATED" &&
      (verdict.decision_override === null || verdict.decision_override === undefined)
    ) {
      errors.push(
        `${prefix}: DEVIATED verdict requires a decision_override (DEC-NNN reference)`
      );
    }

    // decision_override and decision_scope_confirmed (FR-012)
    if (
      verdict.decision_override !== null &&
      verdict.decision_override !== undefined
    ) {
      if (typeof verdict.decision_override !== "string") {
        errors.push(`${prefix}.decision_override: must be a string or null`);
      }
      if (
        verdict.decision_scope_confirmed === null ||
        verdict.decision_scope_confirmed === undefined
      ) {
        errors.push(
          `${prefix}.decision_scope_confirmed: must be set when decision_override is provided`
        );
      } else if (typeof verdict.decision_scope_confirmed !== "boolean") {
        errors.push(
          `${prefix}.decision_scope_confirmed: must be a boolean or null`
        );
      }
    }

    // --- Apply downgrades ---

    // FR-012: DEVIATED without confirmed scope → treat as GAP
    if (
      verdict.verdict === "DEVIATED" &&
      (verdict.decision_scope_confirmed === false ||
        verdict.decision_scope_confirmed === null ||
        verdict.decision_scope_confirmed === undefined)
    ) {
      downgrades.push(
        `${verdictLabel}: verdict downgraded DEVIATED→GAP (decision_scope_confirmed is not true)`
      );
      verdict.verdict = "GAP";
    }

    // FR-011: incomplete read → CONFIRMED→LIKELY blanket downgrade
    if (hasIncompleteRead && verdict.confidence === "CONFIRMED") {
      downgrades.push(
        `${verdictLabel}: confidence downgraded CONFIRMED→LIKELY (incomplete file read)`
      );
      verdict.confidence = "LIKELY";
    }

    // FR-010: GAP + CONFIRMED + unresolved absence → SUSPECTED
    // Must run after FR-011 downgrade so we compare the already-adjusted confidence
    if (
      verdict.verdict === "GAP" &&
      verdict.confidence === "CONFIRMED" &&
      verdict.absence_type === "unresolved"
    ) {
      downgrades.push(
        `${verdictLabel}: confidence downgraded CONFIRMED→SUSPECTED (GAP with unresolved absence)`
      );
      verdict.confidence = "SUSPECTED";
    }
  }

  return { ok: errors.length === 0, errors, downgrades };
}

// ---------------------------------------------------------------------------
// validatePhantomItems
// ---------------------------------------------------------------------------

/**
 * Check that each item's `text` field appears verbatim in specContent.
 *
 * Items whose text cannot be traced back to the spec are considered phantoms —
 * hallucinated extractions that should be rejected (FR-006).
 *
 * @param {Array<{ text: string, [key: string]: unknown }>} items
 * @param {string} specContent — full raw spec text
 * @returns {{ ok: boolean, phantoms: Array }}
 */
function validatePhantomItems(items, specContent) {
  if (!Array.isArray(items)) {
    return { ok: false, phantoms: [] };
  }

  if (typeof specContent !== "string") {
    // Cannot validate without a spec — treat all as phantoms
    return { ok: false, phantoms: items.slice() };
  }

  const phantoms = items.filter((item) => {
    if (!item || typeof item.text !== "string" || item.text.trim().length === 0) {
      // Malformed items are not phantoms in the hallucination sense; skip them
      return false;
    }
    return !specContent.includes(item.text);
  });

  return { ok: phantoms.length === 0, phantoms };
}

// ---------------------------------------------------------------------------
// validateSectionCoverage
// ---------------------------------------------------------------------------

/**
 * Check that every top-level heading (lines starting with `## `) in
 * specContent is represented by at least one item's `section` field (FR-007).
 *
 * @param {Array<{ section: string, [key: string]: unknown }>} items
 * @param {string} specContent — full raw spec text
 * @returns {{ ok: boolean, missingSections: string[] }}
 */
function validateSectionCoverage(items, specContent) {
  if (typeof specContent !== "string") {
    return { ok: false, missingSections: [] };
  }

  // Extract top-level headings (## followed by a space and heading text)
  const SECTION_HEADING_PATTERN = /^## (.+)$/gm;
  const specHeadings = [];
  let match;
  while ((match = SECTION_HEADING_PATTERN.exec(specContent)) !== null) {
    specHeadings.push(match[1].trim());
  }

  if (specHeadings.length === 0) {
    return { ok: true, missingSections: [] };
  }

  // Build set of section values present in items
  const coveredSections = new Set();
  if (Array.isArray(items)) {
    for (const item of items) {
      if (item && typeof item.section === "string" && item.section.trim().length > 0) {
        coveredSections.add(item.section.trim());
      }
    }
  }

  const missingSections = specHeadings.filter(
    (heading) => !coveredSections.has(heading)
  );

  return { ok: missingSections.length === 0, missingSections };
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  EXTRACTED_ITEM_FIELDS,
  VERIFICATION_RESPONSE_FIELDS,
  VALID_VERDICTS,
  VALID_CONFIDENCES,
  validateExtractedItems,
  validateVerificationResponse,
  validatePhantomItems,
  validateSectionCoverage,
};
