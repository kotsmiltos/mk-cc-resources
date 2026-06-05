"""/dry-refactor engine layer (v3 MVP) — preflight + dry-run support.

Deterministic checks consumed by the dry-refactor SKILL.md layer:
    loader      load + validate GLOSSARY.yaml, select cluster, config block
    substrate   body_excerpt vs disk (LF-normalized, line tolerance)
    detect_test_command  test-command auto-detection by repo signal
                         (named to dodge the indexer's *_test.* filter)
    preflight   the 7 Appendix-A gates as a structured report
    runner      CLI: python -m code_glossary.dry_refactor.runner <stage>

MVP scope (DESIGN-V2.md Appendix A, phases 0-2): this package NEVER
modifies source files — it reads, checks, and reports. Live execution
(helper writes, call-site rewrites, rollback) is a later phase with its
own user gate.
"""
