"use strict";
const path = require("path");
const yamlIO = require("../../../lib/yaml-io");
const paths = require("../../../lib/paths");

const COMMANDS = [
  { command: "/init",      description: "Initialize pipeline directory and hooks",               available_phases: ["*"],                             example: "/init" },
  { command: "/elicit",    description: "Start or resume elicitation session",                   available_phases: ["idle", "eliciting"],              example: "/elicit" },
  { command: "/research",  description: "Run multi-perspective research pass",                   available_phases: ["eliciting"],                      example: "/research" },
  { command: "/triage",    description: "Route research findings to next phase",                 available_phases: ["research", "triaging"],           example: "/triage" },
  { command: "/architect", description: "Translate requirements into sprint plan",               available_phases: ["requirements-ready"],             example: "/architect" },
  { command: "/build",     description: "Execute current sprint tasks",                         available_phases: ["sprinting", "architecture"],      example: "/build" },
  { command: "/review",    description: "Run QA review gate on completed sprint",               available_phases: ["sprint-complete", "reviewing"],   example: "/review" },
  { command: "/verify",    description: "Run on-demand verification pass",                      available_phases: ["verifying", "complete"],          example: "/verify" },
  { command: "/status",    description: "Show current pipeline state",                          available_phases: ["*"],                              example: "/status --json" },
  { command: "/next",      description: "Show next recommended action with prerequisites",       available_phases: ["*"],                              example: "/next --json" },
  { command: "/help",      description: "List all commands with availability",                  available_phases: ["*"],                              example: "/help --json" },
  { command: "/repair",    description: "Detect and fix inconsistent pipeline state",           available_phases: ["*"],                              example: "/repair --apply" },
];

const args = process.argv.slice(2);
const jsonMode = args.includes("--json");

let phase = "unknown";
const pipelineDir = paths.findPipelineDir(process.cwd());
if (pipelineDir) {
  const state = yamlIO.safeReadWithFallback(path.join(pipelineDir, "state.yaml"));
  if (state && state.pipeline) phase = state.pipeline.phase || "unknown";
}

const commands = COMMANDS.map((c) => {
  const available = c.available_phases.includes("*") || c.available_phases.includes(phase);
  const entry = {
    command: c.command,
    description: c.description,
    available,
    example: c.example,
  };
  if (!available) {
    entry.reason = `requires ${c.available_phases.join(" or ")} phase (current: ${phase})`;
  }
  return entry;
});

const output = { phase, commands };

if (jsonMode) {
  process.stdout.write(JSON.stringify(output, null, 2) + "\n");
} else {
  process.stdout.write(`Pipeline phase: ${phase}\n\n`);
  for (const c of commands) {
    const avail = c.available ? "available" : `unavailable — ${c.reason}`;
    process.stdout.write(`  ${c.command.padEnd(12)} ${c.description}\n`);
    process.stdout.write(`               ${avail}\n`);
    process.stdout.write(`               Example: ${c.example}\n\n`);
  }
}
process.exit(0);
