"use strict";

/**
 * Pipeline initialization logic.
 * Creates .pipeline/ directory structure and populates defaults.
 *
 * Usage: node init.js [project-name]
 */

const path = require("path");
const fs = require("fs");
const { yamlIO, paths } = require("../../../lib");

const PIPELINE_DIR = ".pipeline";

const PIPELINE_SUBDIRS = [
  "elicitation",
  "requirements",
  "architecture",
  "sprints",
  "reviews",
  "decisions",
];

/**
 * Initialize a pipeline in the given project root.
 */
function initPipeline(projectRoot, projectName) {
  const pipelineDir = path.join(projectRoot, PIPELINE_DIR);

  // Guard: don't overwrite existing pipeline
  if (fs.existsSync(path.join(pipelineDir, "state.yaml"))) {
    throw new Error(`Pipeline already initialized at ${pipelineDir}. Use drift-check to verify state.`);
  }

  // Create directory structure
  paths.ensureDir(pipelineDir);
  for (const sub of PIPELINE_SUBDIRS) {
    paths.ensureDir(path.join(pipelineDir, sub));
  }

  // Find plugin root (where defaults/ lives)
  const pluginRoot = path.resolve(__dirname, "..", "..", "..");
  const defaultsDir = path.join(pluginRoot, "defaults");

  // Copy and customize config.yaml
  const configSrc = yamlIO.safeRead(path.join(defaultsDir, "config.yaml"));
  if (!configSrc) {
    throw new Error(`Default config not found at ${path.join(defaultsDir, "config.yaml")}`);
  }
  configSrc.pipeline.name = projectName || path.basename(projectRoot);
  configSrc.pipeline.created_at = new Date().toISOString();
  yamlIO.safeWrite(path.join(pipelineDir, "config.yaml"), configSrc);

  // Copy and customize state.yaml
  const stateSrc = yamlIO.safeRead(path.join(defaultsDir, "state.yaml"));
  if (!stateSrc) {
    throw new Error(`Default state not found at ${path.join(defaultsDir, "state.yaml")}`);
  }
  stateSrc.last_updated = new Date().toISOString();
  stateSrc.next_action = "/elicit or /research";
  yamlIO.safeWrite(path.join(pipelineDir, "state.yaml"), stateSrc);

  // Create empty rules.yaml from template
  const rulesTemplatePath = path.join(pluginRoot, "skills", "context", "templates", "rules.yaml");
  const rulesTemplate = yamlIO.safeRead(rulesTemplatePath);
  if (rulesTemplate) {
    yamlIO.safeWrite(path.join(pipelineDir, "rules.yaml"), rulesTemplate);
  }

  // Create empty decisions index
  yamlIO.safeWrite(path.join(pipelineDir, "decisions", "index.yaml"), {
    schema_version: 1,
    decisions: [],
  });

  return {
    pipelineDir,
    projectName: configSrc.pipeline.name,
    createdAt: configSrc.pipeline.created_at,
    subdirs: PIPELINE_SUBDIRS,
  };
}

// CLI entry point
if (require.main === module) {
  const projectName = process.argv[2] || "";
  try {
    const result = initPipeline(process.cwd(), projectName);
    console.log(`Pipeline initialized: ${result.pipelineDir}`);
    console.log(`Project: ${result.projectName}`);
    console.log(`Created: ${result.createdAt}`);
    console.log(`Directories: ${result.subdirs.map((s) => PIPELINE_DIR + "/" + s).join(", ")}`);
    console.log(`\nNext: /research`);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

module.exports = { initPipeline, PIPELINE_DIR, PIPELINE_SUBDIRS };
