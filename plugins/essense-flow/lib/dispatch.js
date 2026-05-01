// dispatch.js — parallel sub-agent fan-out helpers.
//
// This plugin runs INSIDE Claude Code; the actual sub-agent invocation
// is performed by the skill agent using the Agent tool. dispatch.js does
// the bookkeeping around that call:
//
//   - prepareBriefs: assembles parallel briefs (one per lens)
//   - parseReturn:   extracts the body from a returned string,
//                    detecting the sentinel line that terminates output
//   - synthesizeMissing: builds a synthetic finding for a lens whose
//                    agent crashed or returned no signal — never silent
//   - collateQuorum: combines results, applies the per-skill quorum rule
//
// No concurrency cap, no agent-count cap, no budget enforcement. The
// skill decides how many lenses are useful for the work; dispatch.js
// just orders the bookkeeping.

import { envelope } from "./brief.js";

// prepareBriefs(lensSpecs) where lensSpecs is:
//   [{ lens: "correctness", brief: "...string...", sentinel?: "..." }, ...]
// Returns an array of { lens, prompt, sentinel } ready to hand to Agent calls.
export function prepareBriefs(lensSpecs) {
  if (!Array.isArray(lensSpecs)) {
    return { ok: false, reason: "lensSpecs must be an array" };
  }
  const out = [];
  for (const spec of lensSpecs) {
    if (!spec || !spec.lens || !spec.brief) {
      return {
        ok: false,
        reason: "each lensSpec needs {lens, brief}",
        offending: spec,
      };
    }
    const env = envelope({ lens: spec.lens, brief: spec.brief, sentinel: spec.sentinel });
    out.push({ lens: spec.lens, prompt: env.prompt, sentinel: env.sentinel });
  }
  return { ok: true, briefs: out };
}

// parseReturn({ raw, sentinel })
// Returns:
//   { ok: true, body }     — sentinel found at end of a line; body is everything before it
//   { ok: false, reason }  — sentinel missing (agent crashed, malformed, or didn't follow contract)
export function parseReturn({ raw, sentinel }) {
  if (typeof raw !== "string") {
    return { ok: false, reason: "raw is not a string" };
  }
  if (!sentinel) {
    return { ok: false, reason: "sentinel is required" };
  }
  const idx = raw.indexOf(sentinel);
  if (idx < 0) {
    return { ok: false, reason: `sentinel not found in agent return` };
  }
  return { ok: true, body: raw.slice(0, idx).trimEnd() };
}

// synthesizeMissing({ lens, reason })
// Produces the canonical synthetic-finding shape that callers should treat
// as a real finding (never a silent drop). Per Diligent-Conduct: missing
// signals surface, not hide.
export function synthesizeMissing({ lens, reason }) {
  return {
    lens,
    status: "crashed",
    synthetic: true,
    reason: reason || "no signal returned by agent",
  };
}

// collateQuorum({ results, expectedLenses, mode })
// results: array of either { lens, body, ok: true } or { lens, ok: false, reason }
// mode: "all-required" | "tolerant" | "task-by-task"
//   - all-required: any missing → ok: false
//   - tolerant:     n-1 of expected may be missing → ok: true with warnings
//   - task-by-task: per-result ok flags, no aggregate gate (build uses this)
//
// Always returns the results array, augmented with synthetic findings for
// any lens in expectedLenses that has no result. Quorum decides only
// whether the aggregate is "actionable" — never drops anything.
export function collateQuorum({ results, expectedLenses, mode }) {
  if (!Array.isArray(results)) results = [];
  const seen = new Set(results.map((r) => r.lens));
  const augmented = [...results];
  const missing = [];
  for (const lens of expectedLenses) {
    if (!seen.has(lens)) {
      const synthetic = synthesizeMissing({ lens, reason: "no signal" });
      augmented.push(synthetic);
      missing.push(lens);
    }
  }

  if (mode === "task-by-task") {
    return { ok: true, mode, results: augmented, missing };
  }

  if (mode === "all-required") {
    return {
      ok: missing.length === 0,
      reason: missing.length > 0 ? `missing lenses: ${missing.join(", ")}` : null,
      mode,
      results: augmented,
      missing,
    };
  }

  if (mode === "tolerant") {
    const expected = expectedLenses.length;
    const ok = missing.length <= 1 && expected >= 2;
    return {
      ok,
      reason: ok ? null : `tolerant quorum needs n-1 lenses; ${missing.length} missing of ${expected}`,
      mode,
      results: augmented,
      missing,
    };
  }

  return {
    ok: false,
    reason: `unknown quorum mode: ${mode}`,
    mode,
    results: augmented,
    missing,
  };
}
