"use strict";

const fs = require("fs");
const path = require("path");

const DENIED_COMMANDS = ["rm ", "git ", "npm ", "yarn ", "pnpm ", "curl ", "wget ", "ssh ", "chmod ", "chown "];

function main() {
  const input = process.argv[2] || "{}";
  let parsed;
  try {
    parsed = JSON.parse(input);
  } catch (_e) {
    process.exit(0); // can't parse, allow
  }

  const toolName = parsed.tool_name || "";
  const toolInput = parsed.tool_input || {};

  // Find pipeline dir
  let pipelineDir = null;
  let dir = process.cwd();
  for (let i = 0; i < 10; i++) {
    const candidate = path.join(dir, ".pipeline", "state.yaml");
    if (fs.existsSync(candidate)) {
      pipelineDir = path.join(dir, ".pipeline");
      break;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  if (!pipelineDir) process.exit(0); // no pipeline, allow

  // Read state
  let state;
  try {
    const yaml = require("js-yaml");
    const content = fs.readFileSync(path.join(pipelineDir, "state.yaml"), "utf8");
    state = yaml.load(content);
  } catch (_e) {
    process.exit(0);
  }

  const phase = state && state.pipeline && state.pipeline.phase;
  if (phase !== "reviewing") process.exit(0); // not reviewing, allow

  // Write/Edit guard
  if (toolName === "Write" || toolName === "Edit") {
    const filePath = toolInput.file_path || "";
    const normalized = filePath.replace(/\\/g, "/");
    if (normalized.includes(".pipeline/reviews/") && normalized.includes("/tests/")) {
      process.exit(0); // sandbox path, allow
    }
    process.stderr.write("BLOCKED: Review agents can only write to .pipeline/reviews/sprint-N/tests/\n");
    process.exit(1);
  }

  // Bash guard
  if (toolName === "Bash") {
    const command = toolInput.command || "";
    for (const denied of DENIED_COMMANDS) {
      if (command.includes(denied)) {
        process.stderr.write("BLOCKED: Command not allowed during review phase: " + denied.trim() + "\n");
        process.exit(1);
      }
    }
    process.exit(0); // command allowed
  }

  process.exit(0); // other tools, allow
}

main();
