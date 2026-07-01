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
 *   @debug          — root cause investigation before fixing
 *   @verify         — paranoid verification of every claim
 *   @fresh          — context refresh, re-read key files
 *   @prompt         — produce a copy-paste kickoff prompt for the next session
 *   @build          — plan the change, review the plan, then build it
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
- Version numbers — are package.json, plugin.json, marketplace.json bumped appropriately? (patch for fixes, minor for features). If this is an mk-cc-resources plugin and a version bump is warranted, invoke /version-bump (plugin-toolkit) to cascade correctly across plugin.json + marketplace.json + bundle + metadata + RELEASE-NOTES in one go.
- CLAUDE.md — does it reflect new patterns, structure, or conventions introduced?
- Cross-doc consistency — if this is an mk-cc-resources plugin repo, consider invoking /docs-audit (plugin-toolkit) to detect drift between CLAUDE.md + README + marketplace.json + disk state.
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
  {
    name: "debug",
    triggers: [
      /(?:^|\s)@debug(?:\s|$)/i,  // @debug as standalone token
    ],
    injection: `[debug-mode] Root cause investigation — understand before fixing:
- Do NOT immediately start writing a fix. Read the relevant code first.
- Understand what the code does and WHY it was written that way.
- Find the ROOT CAUSE, not just the symptom. Trace the issue back to its origin.
- Check if this is part of a pattern — are there similar issues in related files?
- Propose the fix with rationale BEFORE implementing. For trivial/obvious fixes, fix and explain simultaneously.
- Never add a patch on top of a patch. If the underlying design is wrong, say so and propose a proper fix.
- When dispatching sub-agents for investigation, pass these constraints through.`,
  },
  {
    name: "verify",
    triggers: [
      /(?:^|\s)@verify(?:\s|$)/i,  // @verify as standalone token
    ],
    injection: `[verify-mode] Paranoid verification — prove every claim with evidence:
- Before claiming ANYTHING is done, working, or complete — VERIFY the result, not what you wrote.
- "Init is complete" → did you check every file was actually created?
- "Hook is configured" → did you verify it actually fires?
- "All tests pass" → did you RUN them? Show the output.
- "Fixed" → did you confirm the fix works? How?
- If you cannot verify, say "I wrote X but haven't confirmed it works yet."
- State the VERIFIABLE CHECK that proves work done. "Done" is a vibe; "tests pass + parseX returns Y for input Z" is a check.
- Run the test suite after EACH substantive change, not at the end of a batch.
- Verify by reading code, not by checking that a file exists. Existence ≠ implementation.`,
  },
  {
    name: "fresh",
    triggers: [
      /(?:^|\s)@fresh(?:\s|$)/i,  // @fresh as standalone token
    ],
    injection: `[fresh-mode] Context refresh — re-read before acting:
- Re-read key files NOW — do not trust earlier reads that may have been compressed or summarized.
- After implementing multi-step work, run available verification tools to catch what you missed.
- If you notice you are skimming, simplifying, or forgetting earlier instructions — STOP and re-read the source files.
- When instructions reference multiple files or constraints, verify EACH one against current disk state.
- More context is better than less — do not limit what you read to save time.
- Verify that what you read is still what you are acting on — files may have changed during this session.
- When in a long conversation, assume your mental model has drifted. Check, don't assume.`,
  },
  {
    name: "prompt",
    triggers: [
      /(?:^|\s)@prompt(?:\s|$)/i,  // @prompt as standalone token
    ],
    injection: `[prompt-mode] Produce a copy-paste prompt to kick off the NEXT session. Assume a fresh context with NO memory of this conversation:
- Output it as ONE fenced code block the user can copy verbatim — nothing mixed in, no preamble inside the block.
- Lead with the objective in one or two sentences: what the next session should accomplish.
- Give the minimal cold-start context: repo + branch, key file paths, current state, what was just done, what remains.
- Name the concrete first action AND the verifiable check that proves it done.
- List open decisions / blockers the next session must resolve (or that need the user).
- Point to durable artifacts instead of restating them (handoff.md, RELEASE-NOTES, task specs) — reference, don't paste.
- Keep it tight: enough to act without re-deriving, zero narration of this session's back-and-forth.
- Carry forward any working-style the work needs (e.g. \`++\`, \`@verify\`) so the next session starts in the right mode.
- THEN SAVE it (so generated prompts accumulate for review, not just shown once): write the exact prompt to \`.claude/prompts/prompt-<fs-ts>.md\` (use a filesystem-safe UTC timestamp, \`:\` → \`-\`), and PREPEND a newest-first line to \`.claude/prompts/INDEX.md\` — \`- \\\`<timestamp>\\\` · <one-line objective>  → prompts/prompt-<fs-ts>.md\` (create the file with a \`# Prompt index\` header if absent). Show the prompt AND confirm where it was saved. Never overwrite a prior prompt — this is an append-only history.`,
  },
  {
    name: "build",
    triggers: [
      /(?:^|\s)@build(?:\s|$)/i,  // @build as standalone token
    ],
    injection: `[build-mode] Plan the change, review the plan, THEN build it. Do not start editing before the plan is reviewed.
1. PLAN — write a detailed change plan, broken into:
   - MODIFY — each file/symbol to be touched, with what changes and why.
   - ADD — new files/functions/types, where they live, their shape.
   - REMOVE — what gets deleted or replaced, and why that is safe.
   - The order of operations, and the verifiable check that proves each step.
2. REVIEW the plan against the bar before building:
   - Is this the BEST option? Name the simpler/alternative approach you considered and why you rejected it.
   - Is it already built? Before adding new code, confirm the capability isn't already implemented here (search the codebase / functionality glossary) or served by an existing package/library — reuse or extend instead of reinventing; only write new when neither fits, and say why.
   - Does it match the codebase's existing style and implementation patterns? Read neighboring code; reuse existing helpers/abstractions instead of reinventing.
   - Does it honor project conventions (if \`references/code-conventions.md\` or a CLAUDE.md exists, follow them): named constants, layered/acyclic deps, fail-fast config, no silent errors, atomic writes, verify-beyond-units.
   - Surface open decisions, risks, or unknowns the plan cannot resolve alone — flag them, don't guess.
3. BUILD — implement the reviewed plan in the smallest viable steps, running the verifiable check after each. Fix at the root. Do not drift from the plan; if the plan turns out wrong, revise the plan and re-review, don't patch around it.`,
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
  {
    name: "debug",
    patterns: [
      /\b(root cause|investigate|why is.{0,15}broken|trace.{0,10}(it|the|this)|understand.{0,10}(first|before)|don'?t just fix|read the code|what'?s causing)\b/i,
    ],
    hint: `[hint] Tip: add \`@debug\` to enforce root-cause investigation before any fix.`,
  },
  {
    name: "verify",
    patterns: [
      /\b(prove it|actually check|confirm it works|did you (verify|test|run|check)|make sure.{0,10}(works|passes|fires)|verify.{0,10}(it|that|this)|are you sure)\b/i,
    ],
    hint: `[hint] Tip: add \`@verify\` to enforce paranoid verification of every claim.`,
  },
  {
    name: "fresh",
    patterns: [
      /\b(re-?read|check again|fresh eyes|context.{0,10}stale|read.{0,10}again|re-?examine|look at.{0,10}again|you'?re (drifting|losing|forgetting))\b/i,
    ],
    hint: `[hint] Tip: add \`@fresh\` to force a context refresh — re-read key files before acting.`,
  },
  {
    name: "prompt",
    patterns: [
      /\b((kick.?off|kickoff|starting|start|handoff|next.?session).{0,15}prompt|prompt.{0,15}(to (kick|start)|for (the )?next session|next session)|prompt to (kick|start|begin)|continue (in|next) session)\b/i,
    ],
    hint: `[hint] Tip: add \`@prompt\` to generate a copy-paste kickoff prompt for your next session.`,
  },
  {
    name: "build",
    patterns: [
      /\b(plan.{0,15}(the change|it out|first|before).{0,15}(then )?(build|implement)?|make a plan.{0,10}(and|then).{0,10}(build|implement)|plan.{0,10}then.{0,10}(build|implement|code)|what.{0,10}(will|you).{0,10}(touch|change|modify)|plan before (building|coding|implementing))\b/i,
    ],
    hint: `[hint] Tip: add \`@build\` to plan the change (files touched/added/removed), review the plan against our patterns, then implement.`,
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
