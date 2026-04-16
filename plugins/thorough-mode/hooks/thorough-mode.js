"use strict";

/**
 * UserPromptSubmit hook: prompt modifier injection.
 * Detects keywords in the user's prompt and injects
 * structured behavioral instructions into the context.
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
    injection: `[thorough-mode] Active for this response. Follow these rules strictly:
- ENUMERATE all items, files, or steps before processing any. State the count.
- PROCESS EVERY ITEM — do not skip, summarize, batch, or say "and so on."
- DO NOT abbreviate intermediate work. Show each step.
- VERIFY completeness at the end — count outputs vs inputs. If they don't match, go back.
- When in doubt, INCLUDE rather than exclude.
- READ fully before acting — do not skim or assume.
- DO NOT merge, group, or compress separate items into summaries.`,
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

function main() {
  const prompt = process.env.CLAUDE_USER_PROMPT || "";
  if (!prompt) return;

  const injections = [];
  for (const modifier of MODIFIERS) {
    const triggered = modifier.triggers.some((rx) => rx.test(prompt));
    if (triggered) {
      injections.push(modifier.injection);
    }
  }

  if (injections.length > 0) {
    process.stdout.write(injections.join("\n\n"));
  }
}

try {
  main();
} catch (err) {
  process.stderr.write(`[prompt-modifier hook error] ${err.message}\n`);
  process.exit(0);
}
