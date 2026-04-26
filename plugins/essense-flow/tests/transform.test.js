"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const transform = require("../lib/transform");
const yamlIO = require("../lib/yaml-io");

const PLUGIN_ROOT = path.resolve(__dirname, "..");
const CONFIG = yamlIO.safeRead(path.join(PLUGIN_ROOT, "defaults/config.yaml"));

const SAMPLE_TASK_SPEC = `> **type:** task-spec
> **output_path:** sprints/sprint-1/task-1-scaffold.md
> **sprint:** 1
> **depends_on:** None
> **estimated_size:** S

# Task 1: Plugin Scaffold

## Goal
Create the directory structure and plugin manifest for the essense-flow plugin. This matters because the scaffold defines where everything lives.

## Context
Read the plugin documentation for Claude Code plugin structure. Follow existing conventions.

## Interface Specification

### Inputs
- Plugin name: "essense-flow"

### Outputs
- Directory structure created
- plugin.json manifest

### Contracts with Other Tasks
- All subsequent tasks depend on this scaffold existing

## Pseudocode

\`\`\`
FUNCTION createScaffold():
  1. Create .claude-plugin/ directory
  2. Write plugin.json with name and version
  3. Create skills/ subdirectories
  4. Must validate JSON before writing
\`\`\`

## Files Touched

| File | Action | What Changes |
|------|--------|-------------|
| \`.claude-plugin/plugin.json\` | CREATE | Plugin manifest |
| \`skills/\` | CREATE | Skill directories |

## Acceptance Criteria

- [ ] plugin.json exists and is valid JSON
- [ ] All skill directories created
- [ ] No extraneous files

## Edge Cases

- Directory already exists — skip creation, don't error
- Invalid plugin name — reject with clear message

## Notes
This is the foundation task. Everything else depends on it. We considered using a template generator but decided manual creation is simpler and more transparent.
`;

// --- extractSections ---

describe("extractSections", () => {
  it("extracts all sections from a task spec", () => {
    const { sections } = transform.extractSections(SAMPLE_TASK_SPEC);
    assert.ok("goal" in sections);
    assert.ok("context" in sections);
    assert.ok("interface specification" in sections);
    assert.ok("pseudocode" in sections);
    assert.ok("files touched" in sections);
    assert.ok("acceptance criteria" in sections);
    assert.ok("edge cases" in sections);
    assert.ok("notes" in sections);
  });

  it("extracts frontmatter", () => {
    const input = "---\nkey: value\n---\n## Section\nContent";
    const { frontmatter, sections } = transform.extractSections(input);
    assert.equal(frontmatter, "key: value");
    assert.ok("section" in sections);
  });

  it("handles no sections", () => {
    const { sections } = transform.extractSections("Just plain text with no headers");
    assert.deepEqual(sections, {});
  });
});

// --- stripRationale ---

describe("stripRationale", () => {
  it("removes rationale sentences", () => {
    const input = "Create the scaffold. This matters because it defines structure. It creates directories.";
    const result = transform.stripRationale(input);
    assert.ok(!result.includes("This matters because"));
    assert.ok(result.includes("Create the scaffold"));
    assert.ok(result.includes("It creates directories"));
  });

  it("keeps all sentences when no rationale present", () => {
    const input = "Create the scaffold. Write the manifest.";
    const result = transform.stripRationale(input);
    assert.equal(result, input);
  });

  it("handles empty input", () => {
    assert.equal(transform.stripRationale(""), "");
    assert.equal(transform.stripRationale(null), "");
  });
});

// --- extractConstraintsFromPseudocode ---

describe("extractConstraintsFromPseudocode", () => {
  it("extracts must/only/never/always constraints", () => {
    const pseudo = "1. Must validate input\n2. Read file\n3. Never skip validation\n4. Always log errors";
    const constraints = transform.extractConstraintsFromPseudocode(pseudo);
    assert.equal(constraints.length, 3);
    assert.ok(constraints.some((c) => c.includes("Must validate")));
    assert.ok(constraints.some((c) => c.includes("Never skip")));
    assert.ok(constraints.some((c) => c.includes("Always log")));
  });

  it("returns empty array for no constraints", () => {
    const constraints = transform.extractConstraintsFromPseudocode("1. Read file\n2. Write output");
    assert.equal(constraints.length, 0);
  });

  it("handles null input", () => {
    assert.deepEqual(transform.extractConstraintsFromPseudocode(null), []);
  });
});

// --- extractFrontmatterField ---

describe("extractFrontmatterField", () => {
  it("extracts blockquote-style frontmatter fields", () => {
    const fm = '**type:** task-spec\n**sprint:** 1\n**depends_on:** None';
    assert.equal(transform.extractFrontmatterField(fm, "sprint"), "1");
    assert.equal(transform.extractFrontmatterField(fm, "depends_on"), "None");
  });

  it("extracts plain YAML-style fields", () => {
    const fm = "sprint: 3\ntype: task-spec";
    assert.equal(transform.extractFrontmatterField(fm, "sprint"), "3");
  });

  it("returns null for missing field", () => {
    assert.equal(transform.extractFrontmatterField("sprint: 1", "missing"), null);
  });

  it("returns null for null frontmatter", () => {
    assert.equal(transform.extractFrontmatterField(null, "sprint"), null);
  });
});

// --- transformToAgentMd ---

describe("transformToAgentMd", () => {
  it("transforms a task spec into 7-block agent brief", () => {
    const result = transform.transformToAgentMd(SAMPLE_TASK_SPEC, null, CONFIG);
    assert.equal(result.ok, true);
    assert.ok(result.agentMd.includes("## IDENTITY"));
    assert.ok(result.agentMd.includes("## CONSTRAINTS"));
    assert.ok(result.agentMd.includes("## CONTEXT"));
    assert.ok(result.agentMd.includes("## TASK INSTRUCTIONS"));
    assert.ok(result.agentMd.includes("## OUTPUT FORMAT"));
    assert.ok(result.agentMd.includes("## ACCEPTANCE CRITERIA"));
    assert.ok(result.agentMd.includes("## COMPLETION SENTINEL"));
  });

  it("strips Notes section from output", () => {
    const result = transform.transformToAgentMd(SAMPLE_TASK_SPEC, null, CONFIG);
    assert.ok(!result.agentMd.includes("template generator"));
    assert.ok(!result.agentMd.includes("simpler and more transparent"));
  });

  it("preserves pseudocode in task instructions", () => {
    const result = transform.transformToAgentMd(SAMPLE_TASK_SPEC, null, CONFIG);
    assert.ok(result.agentMd.includes("Create .claude-plugin/ directory"));
    assert.ok(result.agentMd.includes("Write plugin.json"));
  });

  it("preserves acceptance criteria", () => {
    const result = transform.transformToAgentMd(SAMPLE_TASK_SPEC, null, CONFIG);
    assert.ok(result.agentMd.includes("plugin.json exists and is valid JSON"));
    assert.ok(result.agentMd.includes("All skill directories created"));
  });

  it("wraps interface spec in data-block (D8)", () => {
    const result = transform.transformToAgentMd(SAMPLE_TASK_SPEC, null, CONFIG);
    assert.ok(result.agentMd.includes('<data-block source="interface-spec">'));
    assert.ok(result.agentMd.includes("</data-block>"));
  });

  it("wraps architecture context in data-block (D8)", () => {
    const result = transform.transformToAgentMd(SAMPLE_TASK_SPEC, "Module A: handles auth", CONFIG);
    assert.ok(result.agentMd.includes('<data-block source="architecture-context">'));
    assert.ok(result.agentMd.includes("Module A: handles auth"));
  });

  it("includes sentinel placeholder", () => {
    const result = transform.transformToAgentMd(SAMPLE_TASK_SPEC, null, CONFIG);
    assert.ok(result.agentMd.includes("SENTINEL:COMPLETE"));
  });

  it("reports token count", () => {
    const result = transform.transformToAgentMd(SAMPLE_TASK_SPEC, null, CONFIG);
    assert.ok(typeof result.tokenCount === "number");
    assert.ok(result.tokenCount > 0);
  });

  it("warns when token count exceeds ceiling", () => {
    const hugeSpec = SAMPLE_TASK_SPEC.replace("## Pseudocode", "## Pseudocode\n\n" + "x".repeat(50000));
    const result = transform.transformToAgentMd(hugeSpec, null, CONFIG);
    assert.ok(result.warnings);
    assert.ok(result.warnings[0].includes("exceeds token ceiling"));
  });

  it("is deterministic (same input → same output except timing)", () => {
    const r1 = transform.transformToAgentMd(SAMPLE_TASK_SPEC, null, CONFIG);
    const r2 = transform.transformToAgentMd(SAMPLE_TASK_SPEC, null, CONFIG);
    assert.equal(r1.agentMd, r2.agentMd);
  });

  it("returns ok: false for spec with no extractable sections", () => {
    const emptySpec = "Just plain text with no headers at all.";
    const result = transform.transformToAgentMd(emptySpec, null, CONFIG);
    assert.equal(result.ok, false);
    assert.ok(result.error.includes("no extractable sections"));
  });

  it("returns ok: true for spec with only Goal section", () => {
    const goalOnlySpec = "## Goal\nBuild a thing.";
    const result = transform.transformToAgentMd(goalOnlySpec, null, CONFIG);
    assert.equal(result.ok, true);
  });

  it("returns ok: true for spec with only Pseudocode section", () => {
    const pseudoOnlySpec = "## Pseudocode\n1. Do stuff\n2. More stuff";
    const result = transform.transformToAgentMd(pseudoOnlySpec, null, CONFIG);
    assert.equal(result.ok, true);
  });

  it("returns ok: true for spec with only Acceptance Criteria section", () => {
    const acOnlySpec = "## Acceptance Criteria\n- [ ] It works";
    const result = transform.transformToAgentMd(acOnlySpec, null, CONFIG);
    assert.equal(result.ok, true);
  });

  it("handles spec with missing optional sections", () => {
    const minimalSpec = "## Goal\nBuild something.\n\n## Acceptance Criteria\n- [ ] It works";
    const result = transform.transformToAgentMd(minimalSpec, null, CONFIG);
    assert.equal(result.ok, true);
    assert.ok(result.agentMd.includes("Build something"));
  });
});
