# skill-substance — runtime subset

This directory ships **3 of 9** skill substance files (architect, review, verify). The full 9-file substance set (the source-of-truth authored during the 2026-05-05 S1 redesign deliverable) lives in the parallel governance workspace at `essense-flow-re-imagined/redesign/skill-substance/`.

## Why a subset

Per closure-plan SPEC DD-2 (substance-rule-via-dispatch precedent) + D-Sprint10-5 META-GAP M-2 (lens-side mirror), three skills carry **machine-checkable dispatch substance** that the CLI op `eval-dispatch-predicate` reads at runtime to evaluate Skip-IFF criteria:

| Skill | Dispatch rule | CLI handler |
|---|---|---|
| `architect.md` | When to dispatch sub-architects (per-module parallel) vs condensed single-flow | `eval-dispatch-predicate` reads `architect.md` substance + manifest frontmatter |
| `review.md` | When to dispatch adversarial lenses (per-lens parallel) vs condensed single-flow | `eval-dispatch-predicate` reads `review.md` substance + QA-REPORT frontmatter |
| `verify.md` | When to dispatch item-verifiers (per-item parallel) vs condensed single-flow | `eval-dispatch-predicate` reads `verify.md` substance + VERIFICATION-REPORT frontmatter |

These three substance files are runtime-needed: the predicate handler at `bin/essense-flow-tools.cjs` reads them to make routing decisions on every dispatch evaluation.

The remaining 6 substance files (build, context, elicit, heal, research, triage) describe per-skill ordered steps + sub-agent dispatches + outputs + principles cited, but their dispatch decisions do NOT require runtime substance lookup (they are either invariant per-skill or directly encoded in CLI ops + transitions.yaml). Shipping them in the plugin would add ~600 lines that the CLI never reads — bloat without runtime value.

## Source-of-truth

The 6 non-shipped substance files (build / context / elicit / heal / research / triage) live at:

```
essense-flow-re-imagined/redesign/skill-substance/
  ├── architect.md      ← ALSO shipped (in this directory; FROZEN-SHA-pinned)
  ├── build.md          ← redesign-only (source-of-truth for SKILL.md authoring)
  ├── context.md        ← redesign-only
  ├── elicit.md         ← redesign-only
  ├── heal.md           ← redesign-only
  ├── research.md       ← redesign-only
  ├── review.md         ← ALSO shipped (in this directory; FROZEN-SHA-pinned)
  ├── triage.md         ← redesign-only
  └── verify.md         ← ALSO shipped (in this directory; FROZEN-SHA-pinned)
```

For the 3 shipped substance files, the redesign workspace also carries `FROZEN-SHA.yaml` recording the hash-pin between redesign source-of-truth and plugin runtime copy. Drift between the two surfaces is auditable via that pin.

## How to discover skill substance for the 6 redesign-only skills

If you (Claude) need the substance for build / context / elicit / heal / research / triage during plugin development, the corresponding files in `essense-flow-re-imagined/redesign/skill-substance/` are the canonical source. For users consuming the plugin without the redesign workspace: each shipped `skills/<skill>/SKILL.md` already encodes the skill's operating contract; the substance file is the design-time source, not the runtime requirement.

## Verification

`tests/skill-substance-readme.test.js` (T-ENF-4 per v0.13.3) enforces: if this directory contains ≥1 *.md substance file but lacks this README.md, the test fails. README presence is the discoverability gate.

## Read this before doing anything

See `references/principles.md` `## Read This Before Doing Anything` (canonical source per v0.13.3 consolidation).
