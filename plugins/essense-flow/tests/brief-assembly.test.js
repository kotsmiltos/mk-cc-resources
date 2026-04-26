"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const fs = require("fs");
const ba = require("../lib/brief-assembly");
const yamlIO = require("../lib/yaml-io");

const PLUGIN_ROOT = path.resolve(__dirname, "..");
const CONFIG = yamlIO.safeRead(path.join(PLUGIN_ROOT, "defaults/config.yaml"));

// --- splitFrontmatter ---

describe("splitFrontmatter", () => {
  it("extracts YAML frontmatter and body", () => {
    const input = "---\nkey: value\ntwo: 2\n---\nBody content here";
    const result = ba.splitFrontmatter(input);
    assert.equal(result.frontmatter, "key: value\ntwo: 2");
    assert.equal(result.body, "Body content here");
  });

  it("returns null frontmatter when no delimiters", () => {
    const result = ba.splitFrontmatter("Just plain text");
    assert.equal(result.frontmatter, null);
    assert.equal(result.body, "Just plain text");
  });

  it("handles unclosed frontmatter delimiter", () => {
    const result = ba.splitFrontmatter("---\nkey: value\nno closing");
    assert.equal(result.frontmatter, null);
  });

  it("handles empty frontmatter", () => {
    const result = ba.splitFrontmatter("---\n\n---\nBody");
    assert.equal(result.frontmatter, "");
    assert.equal(result.body, "Body");
  });
});

// --- extractPlaceholders ---

describe("extractPlaceholders", () => {
  it("extracts unique placeholder names", () => {
    const phs = ba.extractPlaceholders("{{NAME}} and {{PROJECT}} and {{NAME}} again");
    assert.deepEqual(phs.sort(), ["NAME", "PROJECT"]);
  });

  it("returns empty array when no placeholders", () => {
    assert.deepEqual(ba.extractPlaceholders("no placeholders here"), []);
  });

  it("only matches uppercase with underscores", () => {
    const phs = ba.extractPlaceholders("{{VALID_NAME}} but not {{lowercase}}");
    assert.deepEqual(phs, ["VALID_NAME"]);
  });
});

// --- resolvePlaceholders ---

describe("resolvePlaceholders", () => {
  it("replaces known placeholders", () => {
    const result = ba.resolvePlaceholders("Hello {{NAME}}", { NAME: "World" });
    assert.equal(result, "Hello World");
  });

  it("leaves unknown placeholders as-is", () => {
    const result = ba.resolvePlaceholders("{{KNOWN}} and {{UNKNOWN}}", { KNOWN: "yes" });
    assert.equal(result, "yes and {{UNKNOWN}}");
  });

  it("handles multiple replacements", () => {
    const result = ba.resolvePlaceholders("{{A}} {{B}} {{A}}", { A: "1", B: "2" });
    assert.equal(result, "1 2 1");
  });

  it("handles empty bindings", () => {
    const result = ba.resolvePlaceholders("{{X}}", {});
    assert.equal(result, "{{X}}");
  });
});

// --- wrapDataBlock ---

describe("wrapDataBlock", () => {
  it("wraps content with data-block tags and source attribute", () => {
    const result = ba.wrapDataBlock("content", "test.md");
    assert.ok(result.includes('<data-block source="test.md">'));
    assert.ok(result.includes("content"));
    assert.ok(result.includes("</data-block>"));
  });

  it("preserves content exactly", () => {
    const content = "line1\nline2\nline3";
    const result = ba.wrapDataBlock(content, "src");
    assert.ok(result.includes(content));
  });
});

// --- truncateSection ---

describe("truncateSection", () => {
  it("returns untruncated content when within budget", () => {
    const result = ba.truncateSection("short text", 1000, "file.md");
    assert.equal(result.truncated, false);
    assert.equal(result.text, "short text");
  });

  it("truncates content exceeding budget", () => {
    const longContent = "x".repeat(2000);
    const result = ba.truncateSection(longContent, 100, "file.md");
    assert.equal(result.truncated, true);
    assert.ok(result.text.includes("[truncated"));
    assert.ok(result.text.includes("file.md"));
    assert.ok(result.text.length < longContent.length);
  });
});

// --- formatMetadataHeader ---

describe("formatMetadataHeader", () => {
  it("formats metadata as HTML comment block", () => {
    const header = ba.formatMetadataHeader({
      briefId: "test-001",
      phase: "research",
      batchIndex: 0,
      agentIndex: 2,
    });
    assert.ok(header.includes("<!-- BRIEF-META"));
    assert.ok(header.includes("brief_id: test-001"));
    assert.ok(header.includes("phase: research"));
    assert.ok(header.includes("batch_index: 0"));
    assert.ok(header.includes("agent_index: 2"));
    assert.ok(header.includes("timestamp:"));
    assert.ok(header.includes("-->"));
  });

  it("includes parent_brief_id when provided", () => {
    const header = ba.formatMetadataHeader({
      briefId: "child-001",
      phase: "architecture",
      batchIndex: 1,
      agentIndex: 0,
      parentBriefId: "parent-001",
    });
    assert.ok(header.includes("parent_brief_id: parent-001"));
  });
});

// --- assembleBrief ---

describe("assembleBrief", () => {
  it("assembles a valid brief from template body", () => {
    const result = ba.assembleBrief({
      templateBody: "You are a {{ROLE}}. Analyze {{TOPIC}}.",
      bindings: { ROLE: "tester", TOPIC: "auth" },
      sections: { identity: "You are a tester.", context: "Analyze auth." },
      metadata: { briefId: "b-001", phase: "research", batchIndex: 0, agentIndex: 0 },
      config: CONFIG,
    });
    assert.equal(result.ok, true);
    assert.ok(result.brief.includes("You are a tester"));
    assert.ok(result.brief.includes("Analyze auth"));
    assert.ok(result.brief.includes("BRIEF-META"));
  });

  it("assembles from a template file", () => {
    const templatePath = path.join(PLUGIN_ROOT, "skills/research/templates/perspective-brief.md");
    const result = ba.assembleBrief({
      templatePath,
      bindings: {
        ROLE_LENS: "Security Engineer",
        FOCUS_AREA: "security analysis",
        PROBLEM_STATEMENT: "Build a chat app",
        SIBLING_CONTEXT: "",
        BRIEF_ID: "b-sec-001",
        AGENT_ID: "research-security",
        TIMESTAMP: new Date().toISOString(),
      },
      sections: { identity: "Security Engineer", context: "Build a chat app" },
      metadata: { briefId: "b-sec-001", phase: "research", batchIndex: 0, agentIndex: 0 },
      config: CONFIG,
    });
    assert.equal(result.ok, true);
    assert.ok(result.brief.includes("Security Engineer"));
  });

  it("truncates oversized section instead of rejecting", () => {
    const result = ba.assembleBrief({
      templateBody: "test",
      bindings: {},
      sections: { identity: "x".repeat(50000) },
      metadata: { briefId: "b-trunc", phase: "research", batchIndex: 0, agentIndex: 0 },
      config: CONFIG,
    });
    assert.equal(result.ok, true, "Should succeed with truncation");
    assert.ok(result.truncations, "Should have truncations array");
    assert.equal(result.truncations.length, 1);
    assert.equal(result.truncations[0].section, "identity");
    assert.ok(result.truncations[0].originalTokens > 0, "Should report original token count");
  });

  it("truncations array contains section name and original token count", () => {
    const bigContent = "word ".repeat(5000); // ~5000 words = ~1250 tokens (5 chars each / 4)
    const result = ba.assembleBrief({
      templateBody: "test",
      bindings: {},
      sections: { context: bigContent },
      metadata: { briefId: "b-trunc2", phase: "research", batchIndex: 0, agentIndex: 0 },
      config: { token_budgets: { brief_ceiling: 50000, section_max: 500, identity_max: 200, constraints_max: 500, safety_margin_pct: 10 } },
    });
    assert.equal(result.ok, true);
    assert.ok(result.truncations);
    assert.equal(result.truncations[0].section, "context");
    assert.ok(result.truncations[0].originalTokens > 0);
    assert.ok(result.truncations[0].truncatedTo > 0);
  });

  it("returns no truncations when all sections fit", () => {
    const result = ba.assembleBrief({
      templateBody: "Hello {{NAME}}",
      bindings: { NAME: "World" },
      sections: { identity: "small text" },
      metadata: { briefId: "b-notrunc", phase: "research", batchIndex: 0, agentIndex: 0 },
      config: CONFIG,
    });
    assert.equal(result.ok, true);
    assert.equal(result.truncations, undefined);
  });

  it("rejects when total exceeds ceiling", () => {
    // 4 sections × 12000 chars = 48000 chars = 12000 tokens > 10800 effective ceiling
    // Each section = 3000 tokens, under 3600 per-section limit
    const result = ba.assembleBrief({
      templateBody: "test",
      bindings: {},
      sections: {
        section_a: "x".repeat(12000),
        section_b: "x".repeat(12000),
        section_c: "x".repeat(12000),
        section_d: "x".repeat(12000),
      },
      metadata: { briefId: "b-fail", phase: "research", batchIndex: 0, agentIndex: 0 },
      config: CONFIG,
    });
    assert.equal(result.ok, false);
    assert.ok(result.error.includes("exceeds"));
  });

  it("returns briefTokens in budget on success", () => {
    const result = ba.assembleBrief({
      templateBody: "Hello {{NAME}}",
      bindings: { NAME: "World" },
      sections: { identity: "Hello World" },
      metadata: { briefId: "b-tok", phase: "research", batchIndex: 0, agentIndex: 0 },
      config: CONFIG,
    });
    assert.equal(result.ok, true);
    assert.ok(typeof result.budget.briefTokens === "number", "briefTokens is a number");
    assert.ok(result.budget.briefTokens > 0, "briefTokens > 0");
  });

  it("rejects when assembled brief exceeds ceiling despite sections passing", () => {
    // Sections individually pass, but a huge template body pushes the final brief over
    // 44000 chars = 11000 tokens > 10800 effective ceiling
    const hugeTemplate = "x".repeat(44000);
    const result = ba.assembleBrief({
      templateBody: hugeTemplate + " {{A}}",
      bindings: { A: "small" },
      sections: { identity: "small" }, // passes section check easily
      metadata: { briefId: "b-boilerplate", phase: "research", batchIndex: 0, agentIndex: 0 },
      config: CONFIG,
    });
    assert.equal(result.ok, false);
    assert.ok(result.error.includes("Assembled brief exceeds ceiling"));
    assert.ok(result.budget.briefTokens > 0, "briefTokens reported");
  });

  it("errors when neither templatePath nor templateBody provided", () => {
    const result = ba.assembleBrief({
      bindings: {},
      sections: {},
      metadata: { briefId: "b-err", phase: "research", batchIndex: 0, agentIndex: 0 },
      config: CONFIG,
    });
    assert.equal(result.ok, false);
    assert.ok(result.error.includes("required"));
  });
});

// --- loadTemplate ---

describe("loadTemplate", () => {
  it("loads the perspective brief template", () => {
    const templatePath = path.join(PLUGIN_ROOT, "skills/research/templates/perspective-brief.md");
    const template = ba.loadTemplate(templatePath);
    assert.ok(template.frontmatter !== null);
    assert.ok(template.frontmatter.includes("perspective-brief"));
    assert.ok(template.body.includes("{{ROLE_LENS}}"));
  });
});
