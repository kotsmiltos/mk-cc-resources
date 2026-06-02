# Release notes — plugin-toolkit

## 1.1.0 — Add /code-glossary

New skill: **code-glossary** — audits any codebase for DRY violations and writes a functionality glossary.

- Reads source files via LLM (polyglot — no AST dep): Python, TypeScript, JavaScript, Go, Rust, Java, and others.
- 5-phase workflow: scope → index (parallel sub-agents) → block scan → cluster → write artifacts.
- Each function gets a canonical functionality label (`verb-object-qualifier`, kebab-case) decoupled from how it's written. Identical labels across files cluster into one glossary entry.
- For clusters with ≥2 instances and a clear variant axis, identifies invariant skeleton + variant parameters and proposes a `canonical_signature` + `proposed_module` (helper home anchored to existing project dirs).
- Sub-block scanner finds 3+ line duplicated patterns inside functions as secondary instances.
- Substrate-verify discipline — every instance carries `file:line` + verbatim `body_excerpt`; master rejects entries failing the quote check on disk re-read.
- Output: `GLOSSARY.yaml` (frozen schema, machine-readable for downstream tools) + `GLOSSARY.md` (human-readable summary, top extractables first).
- Glossary-only — does NOT execute refactors. Future `/dry-refactor <gloss-id>` and essense-flow `/architect` pre-check would consume the YAML.

Use when the codebase feels WET, before a refactor pass, or before designing a new module that may overlap with existing code.

## 1.0.0 — Initial release

Plugin/skill development + maintenance toolkit. Four composable skills:

- **skill-heal** — audit a plugin's skill set against current best practices. Dispatches parallel review agents (one per skill), scores against rubric (Anthropic best practices + token efficiency + architecture coherence), produces per-skill scorecard + systemic-issue summary. Diagnostic only — never applies changes.
- **plugin-scaffold** — bootstrap a new mk-cc-resources plugin. Generates directory tree + plugin.json + SKILL.md skeletons + marketplace.json entry + mk-cc-all bundle update + README/CLAUDE.md additions + RELEASE-NOTES.md. Mechanical 9-step chain in one invocation.
- **version-bump** — cascade version updates across plugin.json + marketplace.json entry + mk-cc-all bundle (if affected) + marketplace metadata + RELEASE-NOTES.md. Validates semver consistency. Composable — @ship references this.
- **docs-audit** — cross-document drift audit. Compares CLAUDE.md + README + marketplace.json against disk state. Finds version mismatches, stale references, missing entries. Proposes targeted edits per file for user approval. Broader scope than session-lifecycle's /claude-md-sync (which covers CLAUDE.md only).

Designed for composability: skills invoke each other where appropriate, @ship references /version-bump + /docs-audit, /skill-heal hints at /docs-audit when description quality is weak.
