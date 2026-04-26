"use strict";

const fs = require("fs");
const path = require("path");

if (process.env.CLAUDE_SUBAGENT === "1") process.exit(0);

const { HOOK_TIMEOUT_MS } = require("../../lib/constants");
const { isSafeCommand, SHELL_CHAIN_PATTERN } = require("../../lib/bash-guard");

function block(reason) {
  process.stdout.write(JSON.stringify({ decision: "block", reason }) + "\n");
  process.exit(0);
}

const timeoutHandle = setTimeout(() => {
  process.stdout.write(JSON.stringify({ decision: "allow" }) + "\n");
  process.exit(0);
}, HOOK_TIMEOUT_MS);
timeoutHandle.unref();

const chunks = [];
process.stdin.on("data", (c) => {
  clearTimeout(timeoutHandle);
  chunks.push(c);
});
process.stdin.on("end", () => {
  let parsed;
  try { parsed = JSON.parse(chunks.join("")); } catch (_e) { process.exit(0); }

  const toolName = parsed.tool_name || "";
  const toolInput = parsed.tool_input || {};

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

  if (!pipelineDir) process.exit(0);

  let state;
  try {
    const yaml = require("js-yaml");
    const content = fs.readFileSync(path.join(pipelineDir, "state.yaml"), "utf8");
    state = yaml.load(content);
  } catch (_e) {
    process.stdout.write(
      JSON.stringify({
        decision: "block",
        reason: "review-guard: state.yaml unreadable or corrupt. Run /status to diagnose. Guard fails closed until state is repaired.",
      }) + "\n"
    );
    process.stderr.write("[HOOK ERROR: review-guard — state.yaml unreadable. Run /status.]\n");
    process.exit(0);
  }

  const phase = state && state.pipeline && state.pipeline.phase;
  if (phase !== "reviewing" && phase !== "verifying") process.exit(0);

  if (phase === "reviewing" && (toolName === "Write" || toolName === "Edit")) {
    const toolFilePath = toolInput.file_path || "";
    let resolvedTarget;
    try {
      resolvedTarget = fs.realpathSync(toolFilePath);
    } catch (_e) {
      resolvedTarget = path.resolve(toolFilePath);
    }
    let resolvedPipelineDir;
    try {
      resolvedPipelineDir = fs.realpathSync(pipelineDir);
    } catch (_e) {
      resolvedPipelineDir = path.resolve(pipelineDir);
    }
    const resolvedReviews = path.resolve(resolvedPipelineDir, "reviews");
    // FR-054: validator artifacts (confirmed-findings.yaml, false-positives.yaml,
    // qa-run-output.yaml, acknowledged.yaml, validator-checkpoint.yaml) permitted
    // by this prefix check.
    const resolvedTriage = path.resolve(resolvedPipelineDir, "triage");
    const resolvedState = path.resolve(resolvedPipelineDir, "state.yaml");
    const allowed =
      resolvedTarget.startsWith(resolvedReviews + path.sep)
      || resolvedTarget.startsWith(resolvedTriage + path.sep)
      || resolvedTarget === resolvedState;
    if (!allowed) {
      block(`Write to \`${toolFilePath}\` blocked: reviewing phase restriction. Allowed write paths: .pipeline/reviews/sprint-NN/, .pipeline/triage/, .pipeline/state.yaml. Restriction lifts when reviewing phase ends.`);
    }
    process.exit(0);
  }

  if (phase === "verifying" && (toolName === "Write" || toolName === "Edit")) {
    const filePath = toolInput.file_path || "";
    let resolvedTarget;
    try {
      resolvedTarget = fs.realpathSync(filePath);
    } catch (_e) {
      resolvedTarget = path.resolve(filePath);
    }
    const pipelineParent = path.dirname(pipelineDir);
    const VERIFY_ALLOWED_DIRS = [
      path.resolve(pipelineParent, ".pipeline", "verify"),
    ];
    const VERIFY_ALLOWED_FILES = [
      path.resolve(pipelineParent, ".pipeline", "VERIFICATION-REPORT.md"),
      path.resolve(pipelineParent, ".pipeline", "VERIFICATION-REPORT-ondemand.md"),
      path.resolve(pipelineParent, ".pipeline", "extracted-items.yaml"),
      path.resolve(pipelineParent, ".pipeline", "verify-checkpoint.yaml"),
    ];
    const isAllowed =
      VERIFY_ALLOWED_DIRS.some((d) => resolvedTarget.startsWith(d + path.sep) || resolvedTarget === d)
      || VERIFY_ALLOWED_FILES.some((f) => resolvedTarget === f);
    if (!isAllowed) {
      block(
        toolName + " blocked during verifying phase. Allowed paths: .pipeline/verify/, .pipeline/VERIFICATION-REPORT.md, .pipeline/extracted-items.yaml. Restriction lifts when verifying phase ends."
      );
    }
    process.exit(0);
  }

  if (toolName === "Bash") {
    const cmd = toolInput.command || "";
    if (!isSafeCommand(cmd)) {
      block(`Bash \`${cmd}\` blocked: reviewing phase restriction. Allowed bash: read-only commands (cat, ls, grep, git log/show/status/diff, head, tail, wc, diff, find). Restriction lifts when reviewing phase ends.`);
    }
    process.exit(0);
  }

  process.exit(0);
});
