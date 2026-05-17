// brief-vs-agent-returns.test.js — T-ENF-2 (v0.13.3) per 2026-05-17 v0.13.3
// closure-reopening decision in redesign/06-decisions.md.
//
// Anthropic canonical context-engineering guidance: tools (and by analogy,
// sub-agent contracts) must be "self-contained, robust to error, and
// extremely clear" regarding intended use. A brief that doesn't declare
// what shape the consuming agent must return — or an agent that doesn't
// declare what it returns — is a silent-drift surface.
//
// **V1 (this iteration): PRESENCE-only test.** For each known brief↔agent
// pair, the brief MUST declare an output-shape section (one of: `## Required
// output(...)`, `## Output`, `## Required return shape`), AND the agent MUST
// declare a return-shape section (one of: `## Returns`, `## Output shape`,
// `## Output format`).
//
// **V2 (future increment): CONTENT-overlap test.** Cross-check brief-required
// field names ⊆ agent-emit field names. Requires structured fields on both
// sides (currently free-prose with mixed YAML-fence + numbered-list shapes).
//
// Mapping: 7 brief↔agent pairs known from filename pattern + agent-spec.md.
// The 5 templateless agents (architect-alignment-lens, item-verifier,
// pattern-debt-lens, rule-completeness-lens, task-agent) receive structured
// artifacts (yaml entry / task spec) directly as brief input per agent-spec
// §1.7/§1.8/§3.2/§3.3 + are out of T-ENF-2 scope this iteration.
//
// Read this before doing anything:
//   See `references/principles.md` `## Read This Before Doing Anything`
//   (canonical source per v0.13.3 consolidation).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLUGIN_ROOT = resolve(__dirname, "..");

// 7 known brief↔agent pairs.
const PAIRS = [
  { brief: "skills/research/templates/perspective-brief.md", agent: "agents/essense-flow-perspective-agent.md" },
  { brief: "skills/review/templates/adversarial-brief.md", agent: "agents/essense-flow-adversarial-lens.md" },
  { brief: "skills/review/templates/validator-brief.md", agent: "agents/essense-flow-validator.md" },
  { brief: "skills/architect/templates/sub-architect-brief.md", agent: "agents/essense-flow-sub-architect.md" },
  { brief: "skills/heal/templates/sub-recognizer-brief.md", agent: "agents/essense-flow-sub-recognizer.md" },
  { brief: "skills/triage/templates/sub-triager-brief.md", agent: "agents/essense-flow-sub-triager.md" },
  { brief: "skills/verify/templates/extraction-brief.md", agent: "agents/essense-flow-extractor.md" },
];

// Tolerated heading variants per side. Pre-v0.13.3 the plugin used multiple
// conventions; T-ENF-2 V1 accepts any of these. Future-increment can
// normalize to a single canonical heading per side.
const BRIEF_HEADING_RE = /^##\s+(Required\s+(output|return\s+shape)|Output)\b/i;
const AGENT_HEADING_RE = /^##\s+(Returns|Output\s+(shape|format))\b/i;

async function readNormalized(path) {
  const raw = await readFile(path, "utf8");
  return raw.replace(/\r\n/g, "\n");
}

function hasSection(raw, headingRegex) {
  return raw.split("\n").some((line) => headingRegex.test(line));
}

test("T-ENF-2: each brief↔agent pair declares output-shape section on BOTH sides (presence-only)", async () => {
  const failures = [];
  for (const { brief, agent } of PAIRS) {
    const briefPath = join(PLUGIN_ROOT, brief);
    const agentPath = join(PLUGIN_ROOT, agent);

    if (!existsSync(briefPath)) {
      failures.push(`brief template missing on disk: ${brief}`);
      continue;
    }
    if (!existsSync(agentPath)) {
      failures.push(`agent definition missing on disk: ${agent}`);
      continue;
    }

    const briefRaw = await readNormalized(briefPath);
    const agentRaw = await readNormalized(agentPath);

    if (!hasSection(briefRaw, BRIEF_HEADING_RE)) {
      failures.push(
        `${brief}: no output-shape section heading (must be one of '## Required output' | '## Required return shape' | '## Output'); brief does not declare what shape the consuming agent must return`,
      );
    }
    if (!hasSection(agentRaw, AGENT_HEADING_RE)) {
      failures.push(
        `${agent}: no return-shape section heading (must be one of '## Returns' | '## Output shape' | '## Output format'); agent does not formally declare what it returns`,
      );
    }
  }

  if (failures.length > 0) {
    assert.fail(
      `T-ENF-2 V1: brief↔agent return-shape declaration drift in ${failures.length} surface(s):\n  ${failures.join("\n  ")}\n\nForward implication: T-ENF-2 V2 (content-overlap check) deferred to future increment — requires both sides to be normalized to a single section name + structured fields (numbered list OR labeled YAML). v0.13.3 closes presence-only; content-match is future-increment.`,
    );
  }
});
