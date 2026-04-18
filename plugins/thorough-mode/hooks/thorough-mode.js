"use strict";

/**
 * UserPromptSubmit hook: prompt modifier injection + hints.
 * Detects keywords in the user's prompt and injects
 * structured behavioral instructions into the context.
 * Also detects intent-without-keyword patterns and suggests modifiers.
 *
 * Modifiers:
 *   ++ / @thorough  — exhaustive processing, no skipping
 *   @ship           — pre-push documentation and versioning checklist
 *   @present        — use AskUserQuestion for all choices
 */

const MODIFIERS = [
  {
    name: "thorough",
    triggers: [
      /(?:^|\s)\+\+(?:\s|$)/,       // ++ as standalone token
      /(?:^|\s)@thorough(?:\s|$)/i,  // @thorough as standalone token
    ],
    injection: `[thorough-mode] Be thorough, not hasty. Take the time to do this right:
- READ and UNDERSTAND fully before acting — do not skim, assume, or jump to conclusions.
- Do not skip, drop, or silently omit things. If something is relevant, address it.
- Do not take shortcuts that sacrifice quality — prefer the careful path over the fast one.
- When working through multiple items, handle each one properly — do not batch, merge, or hand-wave.
- When in doubt, INCLUDE rather than exclude.
- If you realize you missed something, go back and fix it rather than hoping it doesn't matter.`,
  },
  {
    name: "ship",
    triggers: [
      /(?:^|\s)@ship(?:\s|$)/i,  // @ship as standalone token
    ],
    injection: `[pre-ship checklist] Before pushing, verify ALL of the following:
- README.md — does it mention new features, changed behavior, or new commands/skills? Update if not.
- CHANGELOG / RELEASE-NOTES — are the changes being pushed documented? Add entries if not.
- Version numbers — are package.json, plugin.json, marketplace.json bumped appropriately? (patch for fixes, minor for features)
- CLAUDE.md — does it reflect new patterns, structure, or conventions introduced?
- New skills/commands/hooks — are they listed and described in the appropriate docs?
- Marketplace versions — if this is a plugin repo, does marketplace.json match the plugin version?
- DO NOT push until every applicable item is verified or confirmed not applicable.
- Report what you checked and what you updated before executing the push.`,
  },
  {
    name: "present",
    triggers: [
      /(?:^|\s)@present(?:\s|$)/i,  // @present as standalone token
    ],
    injection: `[present-mode] Use the AskUserQuestion tool for ALL choices, options, and decisions in this response.
- NEVER present options as inline text (A/B/C, numbered lists, or bullet points in your response body).
- Use the \`options\` parameter with \`label\` (concise name) and \`description\` (tradeoffs/implications).
- Use \`preview\` when comparing concrete artifacts (UI layouts, code snippets, schemas).
- Use \`multiSelect: true\` when choices aren't mutually exclusive.
- Put your recommended option first with "(Recommended)" in the label.
- Batch up to 4 independent decisions into a single AskUserQuestion call.
- The tool always includes an "Other" option for free text — no need to add one yourself.
- Plain text is only acceptable for genuinely open-ended questions with no finite option set.`,
  },
];

// Patterns that suggest a modifier would help, but the user didn't use it.
// Each hint only fires if the corresponding modifier was NOT already triggered.
const HINTS = [
  {
    name: "thorough",
    patterns: [
      /\b(be thorough|don'?t skip|don'?t be lazy|take your time|carefully|don'?t drop|every single|each one|all of them|don'?t miss|don'?t forget any|don'?t leave out|exhaustive|make sure you get)\b/i,
    ],
    hint: `[hint] Tip: add \`++\` or \`@thorough\` to your message to auto-enforce exhaustive processing.`,
  },
  {
    name: "ship",
    patterns: [
      /\b(push it|push this|push to|go ahead and push|yeah push|do.{0,10}push|git push|push the changes|push the commit)\b/i,
    ],
    hint: `[hint] Tip: add \`@ship\` to auto-check README, versions, and docs before pushing.`,
  },
  {
    name: "present",
    patterns: [
      /\b(present.{0,15}options|show.{0,10}choices|interactive.{0,10}question|arrow.{0,10}key|navigate.{0,10}option|nice.{0,10}way|select.{0,10}from)\b/i,
    ],
    hint: `[hint] Tip: add \`@present\` to force interactive arrow-key question format.`,
  },
];

/**
 * Read the user prompt from stdin (JSON) or env var fallback.
 * Claude Code sends UserPromptSubmit hooks a JSON payload on stdin:
 *   { "session_id": "...", "hook_event_name": "UserPromptSubmit", "prompt": "..." }
 */
function readPrompt() {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => { data += chunk; });
    process.stdin.on("end", () => {
      // Try stdin JSON first, fall back to env var (for manual testing)
      if (data.trim()) {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed.prompt || "");
          return;
        } catch (_e) { /* not JSON, treat as raw */ }
        resolve(data.trim());
        return;
      }
      resolve(process.env.CLAUDE_USER_PROMPT || "");
    });
    // If stdin is a TTY (manual run without piping), resolve immediately with env var
    if (process.stdin.isTTY) {
      resolve(process.env.CLAUDE_USER_PROMPT || "");
    }
  });
}

async function main() {
  const prompt = await readPrompt();
  if (!prompt) return;

  // Check which modifiers are explicitly triggered
  const activeModifiers = new Set();
  const injections = [];

  for (const modifier of MODIFIERS) {
    const triggered = modifier.triggers.some((rx) => rx.test(prompt));
    if (triggered) {
      activeModifiers.add(modifier.name);
      injections.push(modifier.injection);
    }
  }

  // Check for hints — only for modifiers NOT already active
  const hints = [];
  for (const hint of HINTS) {
    if (activeModifiers.has(hint.name)) continue;
    const matches = hint.patterns.some((rx) => rx.test(prompt));
    if (matches) {
      hints.push(hint.hint);
    }
  }

  const output = [];
  if (injections.length > 0) output.push(injections.join("\n\n"));
  if (hints.length > 0) output.push(hints.join("\n"));

  if (output.length > 0) {
    process.stdout.write(output.join("\n\n"));
  }
}

main().catch((err) => {
  process.stderr.write(`[prompt-modifier hook error] ${err.message}\n`);
  process.exit(0);
});
