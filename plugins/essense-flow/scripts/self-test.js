"use strict";

const fs = require("fs");
const path = require("path");
const yamlIO = require("../lib/yaml-io");
const stateMachine = require("../lib/state-machine");

const PLUGIN_ROOT = path.resolve(__dirname, "..");

// Result tracking
const results = [];
let totalChecks = 0;
let totalPassed = 0;
let totalFailed = 0;

function report(check, name, pass, detail) {
  totalChecks++;
  if (pass) {
    totalPassed++;
    console.log(`  PASS  ${name}`);
  } else {
    totalFailed++;
    console.log(`  FAIL  ${name} — ${detail}`);
  }
  results.push({ check, name, pass, detail });
}

// --- CHECK 1: SKILL.md files have valid frontmatter ---

function checkSkillFiles() {
  console.log("\nCheck 1: SKILL.md files have valid frontmatter");

  const skillDirs = ["research", "architect", "context", "build", "elicit"];
  const requiredFields = ["name", "description", "version", "schema_version"];

  for (const skill of skillDirs) {
    const skillPath = path.join(PLUGIN_ROOT, "skills", skill, "SKILL.md");

    if (!fs.existsSync(skillPath)) {
      report(1, `skills/${skill}/SKILL.md exists`, false, "File not found");
      continue;
    }

    const content = fs.readFileSync(skillPath, "utf8");
    const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!fmMatch) {
      report(1, `skills/${skill}/SKILL.md frontmatter`, false, "No YAML frontmatter found");
      continue;
    }

    try {
      const yaml = require("js-yaml");
      const parsed = yaml.load(fmMatch[1]);
      const missing = requiredFields.filter((f) => !(f in parsed));

      if (missing.length > 0) {
        report(1, `skills/${skill}/SKILL.md fields`, false, `Missing: ${missing.join(", ")}`);
      } else {
        report(1, `skills/${skill}/SKILL.md`, true);
      }
    } catch (e) {
      report(1, `skills/${skill}/SKILL.md YAML`, false, e.message);
    }
  }
}

// --- CHECK 2: Templates have schema_version ---

function checkTemplates() {
  console.log("\nCheck 2: Templates have schema_version");

  // Only check files in skills/*/templates/ directories and defaults/*.yaml
  const templateGlobs = [];
  const skillDirs = ["research", "architect", "context", "build", "elicit"];
  for (const skill of skillDirs) {
    const tplDir = path.join(PLUGIN_ROOT, "skills", skill, "templates");
    if (fs.existsSync(tplDir)) {
      const files = fs.readdirSync(tplDir).filter((f) => f.endsWith(".md"));
      templateGlobs.push(...files.map((f) => path.join(tplDir, f)));
    }
  }
  // Add defaults/*.yaml
  const defaultsDir = path.join(PLUGIN_ROOT, "defaults");
  if (fs.existsSync(defaultsDir)) {
    const files = fs.readdirSync(defaultsDir).filter((f) => f.endsWith(".yaml"));
    templateGlobs.push(...files.map((f) => path.join(defaultsDir, f)));
  }

  for (const filePath of templateGlobs) {
    const relPath = path.relative(PLUGIN_ROOT, filePath);
    const content = fs.readFileSync(filePath, "utf8");
    const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);

    if (!fmMatch) {
      // YAML files may not have frontmatter delimiters — check for schema_version directly
      if (filePath.endsWith(".yaml")) {
        try {
          const parsed = yamlIO.safeRead(filePath);
          if (parsed && parsed.schema_version !== undefined) {
            report(2, relPath, true);
          } else {
            report(2, relPath, false, "No schema_version field");
          }
        } catch {
          report(2, relPath, false, "Failed to parse YAML");
        }
        continue;
      }
      report(2, relPath, false, "No frontmatter found");
      continue;
    }

    if (fmMatch[1].includes("schema_version")) {
      report(2, relPath, true);
    } else {
      report(2, relPath, false, "Missing schema_version in frontmatter");
    }
  }
}

// --- CHECK 3: No cross-skill imports ---

function checkCrossSkillImports() {
  console.log("\nCheck 3: No cross-skill imports");

  const skillDirs = ["research", "architect", "context", "build", "elicit"];

  for (const skill of skillDirs) {
    const scriptDir = path.join(PLUGIN_ROOT, "skills", skill, "scripts");
    if (!fs.existsSync(scriptDir)) continue;

    const jsFiles = fs.readdirSync(scriptDir).filter((f) => f.endsWith(".js"));

    for (const jsFile of jsFiles) {
      const content = fs.readFileSync(path.join(scriptDir, jsFile), "utf8");
      const otherSkills = skillDirs.filter((s) => s !== skill);
      let violations = [];

      for (const other of otherSkills) {
        if (content.includes(`skills/${other}`)) {
          violations.push(other);
        }
      }

      if (violations.length > 0) {
        report(3, `skills/${skill}/scripts/${jsFile}`, false, `Imports from: ${violations.join(", ")}`);
      } else {
        report(3, `skills/${skill}/scripts/${jsFile}`, true);
      }
    }
  }
}

// --- CHECK 4: State machine has no dead-ends ---

function checkStateMachine() {
  console.log("\nCheck 4: State machine has no dead-ends");

  const transitionsPath = path.join(PLUGIN_ROOT, "references", "transitions.yaml");
  if (!fs.existsSync(transitionsPath)) {
    report(4, "transitions.yaml exists", false, "File not found");
    return;
  }

  const transitionMap = stateMachine.loadTransitions(transitionsPath);

  // Build reachability from "idle"
  const reachable = new Set();
  const queue = ["idle"];
  while (queue.length > 0) {
    const state = queue.shift();
    if (reachable.has(state)) continue;
    reachable.add(state);
    const transitions = transitionMap[state] || [];
    for (const t of transitions) {
      if (!reachable.has(t.to)) {
        queue.push(t.to);
      }
    }
  }

  // Collect all states referenced
  const allStates = new Set();
  for (const [from, transitions] of Object.entries(transitionMap)) {
    allStates.add(from);
    for (const t of transitions) allStates.add(t.to);
  }

  // Check all states are reachable
  const unreachable = [...allStates].filter((s) => !reachable.has(s));
  if (unreachable.length > 0) {
    report(4, "All states reachable from idle", false, `Unreachable: ${unreachable.join(", ")}`);
  } else {
    report(4, "All states reachable from idle", true);
  }

  // Check only "complete" has outgoing transition back to idle (no real dead-ends)
  for (const state of allStates) {
    const outgoing = transitionMap[state] || [];
    if (outgoing.length === 0 && state !== "complete") {
      // "complete" should have transition to idle
      report(4, `State "${state}" has outgoing transitions`, false, "Dead-end state");
    }
  }

  // Verify "complete" cycles back to idle
  const completeTransitions = transitionMap["complete"] || [];
  const cyclesToIdle = completeTransitions.some((t) => t.to === "idle");
  report(4, "complete → idle cycle exists", cyclesToIdle, cyclesToIdle ? undefined : "No transition from complete to idle");
}

// --- CHECK 5: Config parses without error ---

function checkConfig() {
  console.log("\nCheck 5: Config parses without error");

  const configPath = path.join(PLUGIN_ROOT, "defaults", "config.yaml");
  if (!fs.existsSync(configPath)) {
    report(5, "defaults/config.yaml exists", false, "File not found");
    return;
  }

  try {
    const config = yamlIO.safeRead(configPath);
    const requiredSections = ["token_budgets", "overflow", "quorum"];

    for (const section of requiredSections) {
      if (config[section]) {
        report(5, `config.${section} exists`, true);
      } else {
        report(5, `config.${section} exists`, false, "Section missing");
      }
    }
  } catch (e) {
    report(5, "config.yaml parses", false, e.message);
  }
}

// --- CHECK 6: Commands map to skills ---

function checkCommands() {
  console.log("\nCheck 6: Commands have valid frontmatter");

  const cmdDir = path.join(PLUGIN_ROOT, "commands");
  if (!fs.existsSync(cmdDir)) {
    report(6, "commands/ exists", false, "Directory not found");
    return;
  }

  const cmdFiles = fs.readdirSync(cmdDir).filter((f) => f.endsWith(".md"));

  for (const cmdFile of cmdFiles) {
    const content = fs.readFileSync(path.join(cmdDir, cmdFile), "utf8");
    const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);

    if (!fmMatch) {
      report(6, `commands/${cmdFile} frontmatter`, false, "No YAML frontmatter");
      continue;
    }

    try {
      const yaml = require("js-yaml");
      const parsed = yaml.load(fmMatch[1]);
      if (parsed.name) {
        report(6, `commands/${cmdFile}`, true);
      } else {
        report(6, `commands/${cmdFile}`, false, "Missing name field");
      }
    } catch (e) {
      report(6, `commands/${cmdFile} YAML`, false, e.message);
    }
  }
}

// --- CHECK 7: Hooks exist ---

function checkHooks() {
  console.log("\nCheck 7: Hooks exist");

  const hookScripts = [
    "hooks/scripts/context-inject.sh",
    "hooks/scripts/context-inject.js",
    "hooks/scripts/yaml-validate.sh",
    "hooks/scripts/yaml-validate.js",
    "hooks/scripts/session-orient.sh",
    "hooks/scripts/session-orient.js",
  ];

  for (const hook of hookScripts) {
    const fullPath = path.join(PLUGIN_ROOT, hook);
    const exists = fs.existsSync(fullPath);
    report(7, hook, exists, exists ? undefined : "File not found");
  }
}

// --- Helpers ---

function findFiles(dir, ext, subdir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (subdir && entry.name === subdir) {
        results.push(...findFiles(full, ext));
      } else if (!subdir) {
        results.push(...findFiles(full, ext));
      } else {
        results.push(...findFiles(full, ext, subdir));
      }
    } else if (entry.isFile() && entry.name.endsWith(ext.replace("*", ""))) {
      results.push(full);
    }
  }
  return results;
}

// --- Main ---

console.log("essense-flow Self-Test");
console.log("=".repeat(40));

checkSkillFiles();
checkTemplates();
checkCrossSkillImports();
checkStateMachine();
checkConfig();
checkCommands();
checkHooks();

console.log("\n" + "=".repeat(40));
console.log(`Total: ${totalChecks} checks, ${totalPassed} passed, ${totalFailed} failed`);

process.exit(totalFailed > 0 ? 1 : 0);
