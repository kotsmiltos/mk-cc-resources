"use strict";

/**
 * YAML validation hook logic (Node layer).
 * Called by yaml-validate.sh on PostToolUse(Write/Edit).
 * Validates that YAML files in configured paths are well-formed.
 *
 * Reads the tool input from stdin (JSON with file_path field).
 * Exits 0 on valid YAML or non-YAML file; exits 1 on invalid YAML with error message.
 */

const path = require("path");
const fs = require("fs");
const { yamlIO } = require("../../lib");

function findPipelineDir(startDir) {
  let dir = startDir;
  const root = path.parse(dir).root;
  while (dir !== root) {
    const candidate = path.join(dir, ".pipeline");
    if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
      return candidate;
    }
    dir = path.dirname(dir);
  }
  return null;
}

function shouldValidate(filePath, validatePaths, projectRoot) {
  // Only validate .yaml and .yml files
  const ext = path.extname(filePath).toLowerCase();
  if (ext !== ".yaml" && ext !== ".yml") return false;

  // Check if file is within any configured validation path
  const relative = path.relative(projectRoot, filePath).replace(/\\/g, "/");
  return validatePaths.some((vp) => relative.startsWith(vp));
}

function getFilePath(callback) {
  const chunks = [];
  process.stdin.on("data", (c) => chunks.push(c));
  process.stdin.on("end", () => {
    let filePath;
    try {
      const input = JSON.parse(chunks.join(""));
      filePath = input.tool_input && input.tool_input.file_path;
    } catch (_) {}
    filePath = filePath || process.env.TOOL_FILE_PATH;
    if (filePath) filePath = filePath.replace(/\\/g, "/");
    callback(filePath);
  });
}

function main() {
  getFilePath((filePath) => {
    if (!filePath) return;

    const ext = path.extname(filePath).toLowerCase();
    if (ext !== ".yaml" && ext !== ".yml") {
      process.exit(0);
    }

    const cwd = process.cwd();
    const pipelineDir = findPipelineDir(cwd);
    if (!pipelineDir) return;

    const projectRoot = path.dirname(pipelineDir);
    const configFile = path.join(pipelineDir, "config.yaml");
    const config = yamlIO.safeReadWithFallback(configFile);
    const validatePaths = (config && config.validation && config.validation.yaml_validate_paths) || [
      ".pipeline/",
      "context/",
    ];

    if (!shouldValidate(filePath, validatePaths, projectRoot)) return;

    try {
      yamlIO.safeRead(filePath);
    } catch (err) {
      process.stderr.write(`[essense-flow] YAML validation failed: ${err.message}\n`);
      process.exit(1);
    }
  });
}

try {
  main();
} catch (err) {
  process.stderr.write(`[essense-flow hook error] ${err.message}\n`);
  process.exit(0);
}
