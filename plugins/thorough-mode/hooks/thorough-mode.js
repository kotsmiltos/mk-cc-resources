"use strict";

/**
 * UserPromptSubmit hook: thorough mode injection.
 * Detects ++ or @thorough in the user's prompt and injects
 * structured thoroughness instructions into the context.
 *
 * Triggers: "++", "@thorough" (case-insensitive, word boundary)
 */

const TRIGGERS = [
  /(?:^|\s)\+\+(?:\s|$)/,       // ++ as standalone token
  /(?:^|\s)@thorough(?:\s|$)/i,  // @thorough as standalone token
];

const INJECTION = `[thorough-mode] Active for this response. Follow these rules strictly:
- ENUMERATE all items, files, or steps before processing any. State the count.
- PROCESS EVERY ITEM — do not skip, summarize, batch, or say "and so on."
- DO NOT abbreviate intermediate work. Show each step.
- VERIFY completeness at the end — count outputs vs inputs. If they don't match, go back.
- When in doubt, INCLUDE rather than exclude.
- READ fully before acting — do not skim or assume.
- DO NOT merge, group, or compress separate items into summaries.`;

function main() {
  const prompt = process.env.CLAUDE_USER_PROMPT || "";
  if (!prompt) return;

  const triggered = TRIGGERS.some((rx) => rx.test(prompt));
  if (triggered) {
    process.stdout.write(INJECTION);
  }
}

try {
  main();
} catch (err) {
  process.stderr.write(`[thorough-mode hook error] ${err.message}\n`);
  process.exit(0);
}
