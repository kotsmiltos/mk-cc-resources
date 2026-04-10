"use strict";

const fs = require("fs");
const path = require("path");

const PLUGIN_ROOT = path.resolve(__dirname, "..");
let totalChecks = 0;
let totalPassed = 0;
let totalFailed = 0;

function report(name, pass, detail) {
  totalChecks++;
  if (pass) {
    totalPassed++;
    console.log(`  PASS  ${name}`);
  } else {
    totalFailed++;
    console.log(`  FAIL  ${name} — ${detail}`);
  }
}

// --- CHECK 1: plugin.json parses as valid JSON ---

function checkPluginJson() {
  console.log("\nCheck 1: plugin.json is valid JSON");

  const pluginJsonPath = path.join(PLUGIN_ROOT, ".claude-plugin", "plugin.json");
  if (!fs.existsSync(pluginJsonPath)) {
    report("plugin.json exists", false, "File not found");
    return null;
  }

  try {
    const content = fs.readFileSync(pluginJsonPath, "utf8");
    const parsed = JSON.parse(content);
    report("plugin.json parses", true);
    return parsed;
  } catch (e) {
    report("plugin.json parses", false, e.message);
    return null;
  }
}

// --- CHECK 2: All commands have corresponding .md files ---

function checkCommands(plugin) {
  console.log("\nCheck 2: Commands reference existing files");

  if (!plugin || !plugin.commands) {
    report("commands section exists", false, "No commands in plugin.json");
    return;
  }

  for (const cmd of plugin.commands) {
    const cmdPath = path.join(PLUGIN_ROOT, cmd.file);
    const exists = fs.existsSync(cmdPath);
    report(`command "${cmd.name}" → ${cmd.file}`, exists, exists ? undefined : "File not found");
  }
}

// --- CHECK 3: All skills have SKILL.md ---

function checkSkills(plugin) {
  console.log("\nCheck 3: Skills reference existing SKILL.md files");

  if (!plugin || !plugin.skills) {
    report("skills section exists", false, "No skills in plugin.json");
    return;
  }

  for (const skill of plugin.skills) {
    const skillPath = path.join(PLUGIN_ROOT, skill.file);
    const exists = fs.existsSync(skillPath);
    report(`skill "${skill.name}" → ${skill.file}`, exists, exists ? undefined : "File not found");
  }
}

// --- CHECK 4: hooks.json exists and references valid scripts ---

function checkHooks(plugin) {
  console.log("\nCheck 4: Hooks reference existing scripts");

  if (!plugin || !plugin.hooks) {
    report("hooks field exists", false, "No hooks reference in plugin.json");
    return;
  }

  const hooksPath = path.join(PLUGIN_ROOT, plugin.hooks);
  if (!fs.existsSync(hooksPath)) {
    report("hooks.json exists", false, `${plugin.hooks} not found`);
    return;
  }

  try {
    const hooksContent = fs.readFileSync(hooksPath, "utf8");
    const hooks = JSON.parse(hooksContent);
    report("hooks.json parses", true);

    // Check each hook command references an existing script
    if (hooks.hooks) {
      for (const [event, entries] of Object.entries(hooks.hooks)) {
        for (const entry of entries) {
          for (const hook of entry.hooks || []) {
            if (hook.command) {
              // Extract script path from command (e.g., "bash hooks/scripts/context-inject.sh")
              const parts = hook.command.split(" ");
              const scriptPath = parts[parts.length - 1];
              const fullPath = path.join(PLUGIN_ROOT, scriptPath);
              const exists = fs.existsSync(fullPath);
              report(`hook ${event} → ${scriptPath}`, exists, exists ? undefined : "Script not found");
            }
          }
        }
      }
    }
  } catch (e) {
    report("hooks.json parses", false, e.message);
  }
}

// --- CHECK 5: Run self-test ---

function checkSelfTest() {
  console.log("\nCheck 5: Self-test script exists");

  const selfTestPath = path.join(PLUGIN_ROOT, "scripts", "self-test.js");
  const exists = fs.existsSync(selfTestPath);
  report("scripts/self-test.js exists", exists, exists ? undefined : "File not found");
}

// --- CHECK 6: Version consistency ---

function checkVersion(plugin) {
  console.log("\nCheck 6: Version is set");

  if (!plugin || !plugin.version) {
    report("version field", false, "No version in plugin.json");
    return;
  }

  report(`version: ${plugin.version}`, plugin.version === "0.1.0", plugin.version !== "0.1.0" ? `Expected 0.1.0, got ${plugin.version}` : undefined);
}

// --- Main ---

console.log("essense-flow Plugin Validation");
console.log("=".repeat(40));

const plugin = checkPluginJson();
checkCommands(plugin);
checkSkills(plugin);
checkHooks(plugin);
checkSelfTest();
checkVersion(plugin);

console.log("\n" + "=".repeat(40));
console.log(`Total: ${totalChecks} checks, ${totalPassed} passed, ${totalFailed} failed`);

if (totalFailed === 0) {
  console.log("\nPlugin is ready to install.");
} else {
  console.log(`\nPlugin has ${totalFailed} issue(s) to fix.`);
}

process.exit(totalFailed > 0 ? 1 : 0);
