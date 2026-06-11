'use strict';
// lib/infer-phase.cjs — infer the pipeline phase from on-disk artifacts.
//
// The artifacts ARE the state. state.yaml is a cache of what disk already
// shows; when the two disagree, disk wins. This module is the single place
// that reads the artifact tree and says which phase the project is actually
// in — consumed by the state-reconcile op, by the degraded-state recovery
// path in the CLI gates (a missing/corrupt state.yaml no longer dead-ends
// into "run /heal first" when the artifacts are unambiguous), and by /heal
// itself.
//
// Inference walks the pipeline backwards (latest artifact wins) and returns
// ALL plausible candidates, best-first. `confident` is true only when the
// evidence supports exactly one phase — callers must not auto-repair on an
// ambiguous read; ambiguity is surfaced, never guessed away.

const fs = require('node:fs');
const path = require('node:path');

const PIPELINE_REL = '.pipeline';

// Read just enough of a file to check a frontmatter-ish field. Tolerates
// YAML frontmatter (`status: build-ready`) and the metadata-blockquote
// convention (`> **status:** build-ready`).
function readHead(file, bytes = 4096) {
  try {
    const fd = fs.openSync(file, 'r');
    const buf = Buffer.alloc(bytes);
    const n = fs.readSync(fd, buf, 0, bytes, 0);
    fs.closeSync(fd);
    return buf.toString('utf8', 0, n);
  } catch {
    return null;
  }
}

function fieldFromHead(head, name) {
  if (!head) return null;
  const fm = head.match(new RegExp(`^${name}:\\s*(.+)$`, 'mi'));
  if (fm) return fm[1].trim();
  const bq = head.match(new RegExp(`^>\\s*\\*\\*${name}:?\\*\\*:?\\s*(.+)$`, 'mi'));
  if (bq) return bq[1].trim();
  return null;
}

function exists(p) {
  try { fs.statSync(p); return true; } catch { return false; }
}

// Highest sprint number with a given artifact under base/<n>/<file>.
function maxSprintWith(base, file) {
  let max = null;
  let dirs = [];
  try { dirs = fs.readdirSync(base, { withFileTypes: true }); } catch { return null; }
  for (const d of dirs) {
    if (!d.isDirectory()) continue;
    const n = Number(d.name);
    if (!Number.isInteger(n) || n < 1) continue;
    if (exists(path.join(base, d.name, file)) && (max === null || n > max)) max = n;
  }
  return max;
}

function listCompletionStatuses(root, sprint) {
  // completion records live next to the sprint's build outputs; tolerate
  // both layouts seen in the wild
  const bases = [
    path.join(root, PIPELINE_REL, 'build', 'sprints', String(sprint)),
    path.join(root, PIPELINE_REL, 'sprints', `sprint-${sprint}`),
  ];
  const statuses = [];
  for (const base of bases) {
    let entries = [];
    try { entries = fs.readdirSync(base); } catch { continue; }
    for (const e of entries) {
      if (!/completion.*\.ya?ml$/i.test(e) && !/\.completion\.ya?ml$/i.test(e)) continue;
      const head = readHead(path.join(base, e));
      const st = fieldFromHead(head, 'status') ||
        (head && (head.match(/status:\s*(crashed|blocked|partial-with-surfaced-concern|complete)/) || [])[1]);
      if (st) statuses.push(st);
    }
  }
  return statuses;
}

// inferPhaseFromArtifacts(projectRoot) →
//   { candidates: [{phase, sprint, evidence: [..]}], confident, phase, sprint }
function inferPhaseFromArtifacts(projectRoot) {
  const p = (rel) => path.join(projectRoot, PIPELINE_REL, rel);
  const candidates = [];
  const push = (phase, sprint, evidence) => candidates.push({ phase, sprint, evidence });

  const specPath = p(path.join('elicitation', 'SPEC.md'));
  const reqPath = p(path.join('requirements', 'REQ.md'));
  const triagePath = p(path.join('triage', 'TRIAGE-REPORT.md'));
  const verifPath = p(path.join('verify', 'VERIFICATION-REPORT.md'));

  const archSprint = maxSprintWith(p(path.join('architecture', 'sprints')), 'manifest.yaml');
  const buildSprint = maxSprintWith(p(path.join('build', 'sprints')), 'SPRINT-REPORT.md');
  const reviewSprint = maxSprintWith(p(path.join('review', 'sprints')), 'QA-REPORT.md');

  // --- walk backwards: latest artifact wins -------------------------------

  if (exists(verifPath)) {
    const gaps = fieldFromHead(readHead(verifPath), 'confirmed_gaps');
    if (gaps !== null && Number(gaps) === 0) {
      push('complete', buildSprint, [`${verifPath} exists with confirmed_gaps: 0`]);
    } else {
      push('verifying', buildSprint, [
        `${verifPath} exists with confirmed_gaps: ${gaps === null ? 'unparsed' : gaps} — routing decision pending`,
      ]);
    }
    return finalize(candidates);
  }

  if (reviewSprint !== null) {
    const qa = path.join(p(path.join('review', 'sprints')), String(reviewSprint), 'QA-REPORT.md');
    const crit = fieldFromHead(readHead(qa), 'confirmed_unacknowledged_criticals');
    if (crit !== null && Number(crit) === 0) {
      push('verifying', reviewSprint, [`${qa} exists with confirmed_unacknowledged_criticals: 0`]);
    } else if (crit !== null) {
      push('triaging', reviewSprint, [`${qa} exists with confirmed_unacknowledged_criticals: ${crit} — criticals route to triage`]);
      push('reviewing', reviewSprint, ['review may still be amending the report']);
    } else {
      push('reviewing', reviewSprint, [`${qa} exists but confirmed_unacknowledged_criticals not parseable`]);
    }
    return finalize(candidates);
  }

  if (buildSprint !== null) {
    const statuses = listCompletionStatuses(projectRoot, buildSprint);
    const paused = statuses.filter((s) => s !== 'complete');
    if (paused.length > 0) {
      push('triaging', buildSprint, [
        `sprint ${buildSprint} SPRINT-REPORT exists but ${paused.length} completion record(s) carry status ${[...new Set(paused)].join('/')} — paused sprint routes to triage`,
      ]);
      push('sprint-complete', buildSprint, ['report exists; pause may already be dispositioned']);
    } else {
      push('sprint-complete', buildSprint, [
        `.pipeline/build/sprints/${buildSprint}/SPRINT-REPORT.md exists, no paused completion records`,
      ]);
    }
    return finalize(candidates);
  }

  if (archSprint !== null) {
    push('sprinting', archSprint, [
      `.pipeline/architecture/sprints/${archSprint}/manifest.yaml exists, no SPRINT-REPORT for sprint ${archSprint}`,
    ]);
    return finalize(candidates);
  }

  if (exists(triagePath)) {
    const routed = fieldFromHead(readHead(triagePath), 'routed_to');
    push('triaging', null, [`${triagePath} exists${routed ? ` (routed_to: ${routed})` : ''} — disposition pending or just routed`]);
    if (exists(reqPath)) push('architecture', null, ['REQ.md exists; triage may already have routed forward']);
    return finalize(candidates);
  }

  if (exists(reqPath)) {
    push('architecture', null, ['.pipeline/requirements/REQ.md exists, no sprint manifests yet']);
    return finalize(candidates);
  }

  if (exists(specPath)) {
    const status = fieldFromHead(readHead(specPath), 'status');
    if (status === 'build-ready') {
      push('research', null, ['.pipeline/elicitation/SPEC.md exists with status: build-ready, no REQ.md yet']);
    } else {
      push('eliciting', null, [`.pipeline/elicitation/SPEC.md exists with status: ${status || 'unparsed'}`]);
    }
    return finalize(candidates);
  }

  push('idle', null, ['no pipeline artifacts found under .pipeline/']);
  return finalize(candidates);
}

function finalize(candidates) {
  const confident = candidates.length === 1;
  return {
    candidates,
    confident,
    phase: confident ? candidates[0].phase : null,
    sprint: confident ? candidates[0].sprint : null,
  };
}

module.exports = { inferPhaseFromArtifacts };
