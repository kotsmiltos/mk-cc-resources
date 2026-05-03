// brief.js — sub-agent brief assembly.
//
// A brief is template + bindings + sections + metadata. The skill agent
// assembles it, then dispatches a sub-agent with the brief as the prompt.
//
// Per Fail-Soft: oversize never rejects. A brief that exceeds the
// SANITY_FLOOR character count emits a stderr warning naming the size,
// then returns the full content. The agent reads everything. Briefs are
// contracts; contracts don't get truncated because the work was bigger
// than expected.
//
// SANITY_FLOOR is a deadlock-breaker, not a cap — its only effect is
// surfacing a warning so the user can see why a brief got large. It does
// not refuse, throttle, or shorten output.

import { readFile } from "node:fs/promises";

const SANITY_FLOOR_CHARS = 200_000; // surface warning above this; never truncate

// Interpolate {{key}} placeholders in a template against a bindings map.
// Missing keys leave the placeholder in place AND emit a stderr note —
// per Diligent-Conduct, missing bindings are visible, not silently empty.
function interpolate(template, bindings) {
  const missing = [];
  const out = template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (match, key) => {
    if (Object.prototype.hasOwnProperty.call(bindings, key)) {
      const v = bindings[key];
      return v === null || v === undefined ? "" : String(v);
    }
    missing.push(key);
    return match;
  });
  if (missing.length > 0) {
    process.stderr.write(
      `[brief] WARN: unresolved bindings: ${[...new Set(missing)].join(", ")}\n`,
    );
  }
  return out;
}

// assemble({
//   templatePath?: string,            // path to .md template file
//   templateString?: string,          // OR raw template string
//   bindings?: Record<string,any>,    // {{key}} substitutions
//   sections?: Array<{title, body}>,  // appended after template
//   metadata?: Record<string,any>,    // emitted as YAML frontmatter
// }) → { content, size, warnings }
//
// Always returns { content }. Warnings is informational. Size warnings
// also print to stderr.
export async function assemble({
  templatePath,
  templateString,
  bindings = {},
  sections = [],
  metadata = null,
} = {}) {
  let template = templateString;
  if (!template && templatePath) {
    template = await readFile(templatePath, "utf8");
  }
  if (template === undefined || template === null) {
    template = "";
  }

  const warnings = [];

  let body = interpolate(template, bindings);

  for (const s of sections) {
    if (!s || !s.title || s.body === undefined) {
      warnings.push("section missing title/body — skipped");
      continue;
    }
    body += `\n\n## ${s.title}\n\n${s.body}\n`;
  }

  let content = body;
  if (metadata) {
    const yaml = await import("js-yaml");
    const fm = yaml.default.dump(metadata, { lineWidth: 100, noRefs: true }).trimEnd();
    content = `---\n${fm}\n---\n\n${body}`;
  }

  if (content.length > SANITY_FLOOR_CHARS) {
    const msg = `brief size ${content.length} exceeds sanity floor ${SANITY_FLOOR_CHARS} — passing through (no truncation)`;
    warnings.push(msg);
    process.stderr.write(`[brief] WARN: ${msg}\n`);
  }

  return { content, size: content.length, warnings };
}

// Build the dispatch envelope a parallel sub-agent will return inside.
// The agent emits: <body>...</body>\n<SENTINEL_LINE>
// Dispatch.js parses on the SENTINEL.
export function envelope({ lens, brief, sentinel }) {
  const sent = sentinel || `<<<ESSENSE-FLOW:${lens}:END>>>`;
  return {
    prompt:
      `You are the ${lens} agent. Read the brief carefully and produce the artifact described.\n\n` +
      `BRIEF:\n\n${brief}\n\n` +
      `When you are finished, emit your output, then end with the sentinel line on its own:\n${sent}\n`,
    sentinel: sent,
  };
}

export const _SANITY_FLOOR_CHARS = SANITY_FLOOR_CHARS;
