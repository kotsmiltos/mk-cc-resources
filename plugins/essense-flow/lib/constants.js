"use strict";

// Pipeline directory constants
const PIPELINE_DIR_NAME = ".pipeline";
const LOCK_FILE_NAME = ".lock";
const HASH_STORE_FILE = ".hashes.yaml";
const STATE_HISTORY_FILE = "state-history.yaml";
const STATE_FILE = "state.yaml";
const CONFIG_FILE = "config.yaml";
const CONTEXT_MAP_FILE = "context_map.yaml";

// Canonical artifact paths (relative to .pipeline/) — single source of truth
const SPEC_PATH = "elicitation/SPEC.md";
const REQ_PATH = "requirements/REQ.md";
const ARCH_PATH = "architecture/ARCH.md";

// Complexity assessment values — set by elicit, read by architect.
// Each value drives different decomposition depth and care level.
//   - bug-fix:        flat decomposition; minimum blast radius
//   - new-feature:    multi-perspective when touching shared modules
//   - partial-rewrite: high-care; track everything that touches changed code
//   - new-project:    full multi-perspective decomposition
const COMPLEXITY_ASSESSMENTS = ["bug-fix", "new-feature", "partial-rewrite", "new-project"];
const COMPLEXITY_TOUCH_SURFACES = ["narrow", "moderate", "broad"];

// Phase → input contract — what each phase needs to do its work.
// Used by context-inject to inject only the relevant slice; defines the
// propagating contract so any new phase must declare its inputs explicitly.
const PHASE_INPUTS = {
  idle: [],
  eliciting: [],
  research: ["spec"],
  triaging: ["current_sprint_findings"],
  "requirements-ready": ["spec", "requirements"],
  architecture: ["spec", "requirements"],
  decomposing: ["spec", "requirements"],
  sprinting: ["architecture", "current_task"],
  "sprint-complete": ["architecture", "current_sprint_findings"],
  reviewing: ["spec", "changed_files"],
  verifying: ["spec", "findings_summary"],
  complete: [],
};

// Lockfile
const STALE_THRESHOLD_MS = 300_000; // 5 minutes — FR-012
const HEARTBEAT_INTERVAL_MS = 100_000; // one-third of STALE_THRESHOLD_MS — fires 3× per stale window, ensuring heartbeat lands before timeout
// Hook stdin read timeout — ms to wait for stdin before defaulting to allow (FR-002)
const HOOK_TIMEOUT_MS = 5000;

// Token budgets
// Empirical average for English prose + code mix (~3.5 chars per token); actual ratio
// varies 2.5–3.8 by content type; conservative lower estimate used to avoid under-budgeting.
const CHARS_PER_TOKEN = 3.5;
// Estimated overhead for system prompt, XML envelope, and output preamble (~1200 tokens
// measured) plus 800-token safety margin, totalling 2000 tokens reserved before payload.
const AGENT_BRIEF_OVERHEAD_TOKENS = 2000;

// Agent dispatch
// Hard cap on simultaneous sub-agent dispatches per wave (DEC-105); 4 = balances API rate limits vs. parallelism benefit
const MAX_CONCURRENT_AGENTS = 4;
// Maximum command string length before bash-guard rejects — prevents ReDoS and memory exhaustion in regex evaluation
const MAX_COMMAND_LENGTH = 16384;
const MIN_WAVE_CAP = 1;

// Grounded rereview
// Minimum consecutive sprints with drift before grounded rereview triggers (DEC-104); 2 = early signal without false positives
const GROUNDED_REREVIEW_THRESHOLD = 2;

// Schema versions
const STATE_SCHEMA_VERSION = 1;
const LOCK_SCHEMA_VERSION = 1;
const HISTORY_SCHEMA_VERSION = 1;

// FR-042: per-validator wall-clock timeout
// Derivation: 4 validators × avg 20s per finding batch + 10s buffer
const VALIDATOR_TIMEOUT_MS = 90_000;

// Minimum verbatim quote length for path_evidence validation — DEC-037
const MIN_PATH_EVIDENCE_QUOTE_CHARS = 20;

// Verdict gate thresholds — controls which finding states block PASS
// Any CONFIRMED critical finding is a hard blocker regardless of acknowledgments
const PASS_REQUIRES_ZERO_CONFIRMED_CRITICALS = true;
// NEEDS_CONTEXT criticals block unless a human has explicitly acknowledged them
const PASS_REQUIRES_ZERO_UNACKNOWLEDGED_NC_CRITICALS = true;

// Auto-advance phase→command mapping — FR-039 / DEC-106
// Each entry maps a "complete" phase to the command that advances pipeline forward.
// context-inject emits an [auto-advance: cmd] signal when phase + next_action align.
const AUTO_ADVANCE_MAP = {
  "sprint-complete": "/review",
  research:          "/triage",
  sprinting:         "/build",
  architecture:      "/build",  // conditional: only when state.next_action === '/build'
  reviewing:         "/triage", // review complete → triage routes the verdict
};

// Human-readable description per auto-advance phase — keys MUST match AUTO_ADVANCE_MAP.
// Used by context-inject when emitting the auto-advance hint to the user.
// Keep these in sync — the assertion below enforces parity at module load time.
const AUTO_ADVANCE_DESCRIPTIONS = {
  "sprint-complete": "sprint complete",
  research:          "research complete",
  sprinting:         "build queued",
  architecture:      "build queued",
  reviewing:         "review complete",
};

// Compile-time invariant: any new auto-advance phase must have a description.
// Throwing here is desired — surface drift early instead of silently emitting bad UI.
(function _assertAutoAdvanceParity() {
  const cmdKeys = Object.keys(AUTO_ADVANCE_MAP).sort();
  const descKeys = Object.keys(AUTO_ADVANCE_DESCRIPTIONS).sort();
  if (cmdKeys.length !== descKeys.length || cmdKeys.some((k, i) => k !== descKeys[i])) {
    throw new Error(
      `AUTO_ADVANCE_MAP and AUTO_ADVANCE_DESCRIPTIONS keys must match. ` +
      `commands: [${cmdKeys.join(",")}] descriptions: [${descKeys.join(",")}]`
    );
  }
})();

// YAML serialization options — shared across all yaml.dump() calls for hash consistency
const YAML_DUMP_OPTS = { lineWidth: 120, noRefs: true };

// Quorum labels
const QUORUM_RESEARCH          = "all";
const QUORUM_ARCHITECTURE      = "n-1";
const QUORUM_BUILD             = "all";
const QUORUM_REVIEW            = "n-1";

module.exports = {
  PIPELINE_DIR_NAME,
  LOCK_FILE_NAME,
  HASH_STORE_FILE,
  STATE_HISTORY_FILE,
  STATE_FILE,
  CONFIG_FILE,
  CONTEXT_MAP_FILE,
  SPEC_PATH,
  REQ_PATH,
  ARCH_PATH,
  PHASE_INPUTS,
  COMPLEXITY_ASSESSMENTS,
  COMPLEXITY_TOUCH_SURFACES,
  STALE_THRESHOLD_MS,
  HEARTBEAT_INTERVAL_MS,
  HOOK_TIMEOUT_MS,
  CHARS_PER_TOKEN,
  AGENT_BRIEF_OVERHEAD_TOKENS,
  MAX_CONCURRENT_AGENTS,
  MAX_COMMAND_LENGTH,
  MIN_WAVE_CAP,
  GROUNDED_REREVIEW_THRESHOLD,
  VALIDATOR_TIMEOUT_MS,
  MIN_PATH_EVIDENCE_QUOTE_CHARS,
  PASS_REQUIRES_ZERO_CONFIRMED_CRITICALS,
  PASS_REQUIRES_ZERO_UNACKNOWLEDGED_NC_CRITICALS,
  STATE_SCHEMA_VERSION,
  LOCK_SCHEMA_VERSION,
  HISTORY_SCHEMA_VERSION,
  YAML_DUMP_OPTS,
  AUTO_ADVANCE_MAP,
  AUTO_ADVANCE_DESCRIPTIONS,
  QUORUM_RESEARCH,
  QUORUM_ARCHITECTURE,
  QUORUM_BUILD,
  QUORUM_REVIEW,
};
