#!/usr/bin/env python3
"""CLI entrypoint for the repo audit and amendment system.

Usage:
    python scripts/repo_audit.py audit
        Scaffold the _code_audit/ directory with placeholder files.

    python scripts/repo_audit.py amend --slug <slug> --description <desc> --files f1 f2 ...
        Create a new amendment record in _code_audit/amendments/.
        The record includes all required YAML fields for the cross-cutting
        protocol. Fields that need manual input are marked with TODO.

All stdlib — no external dependencies.
"""

from __future__ import annotations

import argparse
import re
import sys
import textwrap
from datetime import datetime, timezone
from pathlib import Path

# Allowed characters for amendment slugs: letters, digits, hyphens, underscores.
# Prevents path traversal (e.g. "../evil") and shell injection via the filename.
VALID_SLUG_PATTERN = re.compile(r'^[a-zA-Z0-9_-]+$')

# Ensure the scripts directory is importable
sys.path.insert(0, str(Path(__file__).resolve().parent))

from _audit_config import (
    AMENDMENTS_DIR,
    AUDIT_DIR,
    AUDIT_FILES_DIR,
    PATTERNS_PATH,
    SNAPSHOT_PATH,
)

REPO_ROOT = Path(__file__).resolve().parent.parent


def _write_if_missing(path: Path, content: str) -> bool:
    """Write content to path only if the file does not already exist.

    Returns True if the file was created, False if it already existed.
    """
    if path.exists():
        return False
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    return True


# ---------------------------------------------------------------------------
# audit subcommand
# ---------------------------------------------------------------------------

def cmd_audit(_args: argparse.Namespace) -> None:
    """Scaffold the _code_audit/ directory with placeholder files."""
    root = REPO_ROOT
    audit_dir = root / AUDIT_DIR
    files_dir = root / AUDIT_FILES_DIR
    amendments_dir = root / AMENDMENTS_DIR

    audit_dir.mkdir(parents=True, exist_ok=True)
    files_dir.mkdir(parents=True, exist_ok=True)
    amendments_dir.mkdir(parents=True, exist_ok=True)

    placeholders = {
        audit_dir / "README.md": "# Code Audit\n\n> See _code_audit/README.md for details.\n",
        audit_dir / "index.md": "# Audit Index\n\n> Consolidated audit report — to be populated.\n",
        audit_dir / "plan.md": "# Improvement Plan\n\n> Derived from audit findings — to be populated.\n",
        audit_dir / "tooling.md": "# Tooling Audit\n\n> Linters, formatters, CI configuration — to be populated.\n",
        audit_dir / "test_hints.md": "# Test Strategy\n\n> Test hints and coverage plan — to be populated.\n",
        audit_dir / "patterns.md": "# Pattern Index\n\n> Structural patterns and semantic map — to be populated.\n",
    }

    created = 0
    for path, content in placeholders.items():
        if _write_if_missing(path, content):
            created += 1
            print(f"  created  {path.relative_to(root)}")
        else:
            print(f"  exists   {path.relative_to(root)}")

    print(f"\nScaffolded {created} new file(s) in {AUDIT_DIR}/")


# ---------------------------------------------------------------------------
# amend subcommand
# ---------------------------------------------------------------------------

def _yaml_list(items: list[str], indent: int = 2) -> str:
    """Format a list as YAML indented items, or [] if empty."""
    if not items:
        return " " * indent + "[]"
    prefix = " " * indent
    return "\n".join(f'{prefix}- "{item}"' for item in items)


def cmd_amend(args: argparse.Namespace) -> None:
    """Create a new amendment record with all required fields."""
    slug: str = args.slug
    description: str = args.description
    primary: list[str] = args.primary or []
    related: list[str] = args.related or []
    updated: list[str] = args.files or []
    patterns: list[str] = args.patterns or []

    # Reject slugs that contain characters outside the allowed set.
    # This prevents path traversal attacks (e.g. "../evil") and ensures
    # the slug is safe to embed directly in a filename.
    if not VALID_SLUG_PATTERN.match(slug):
        print(
            f"Error: invalid slug {slug!r}. "
            "Slugs may only contain letters, digits, hyphens, and underscores.",
            file=sys.stderr,
        )
        sys.exit(1)

    # Sanitize description before embedding it into the YAML frontmatter.
    # Double-quotes would break the YAML string literal; newlines would
    # corrupt the multi-line structure.
    safe_description = description.replace('\\', '\\\\').replace('"', '\\"').replace('\n', ' ')

    # Normalize all paths to forward slashes (Windows compat)
    primary = [f.replace("\\", "/") for f in primary]
    related = [f.replace("\\", "/") for f in related]
    updated = [f.replace("\\", "/") for f in updated]

    now = datetime.now(timezone.utc)
    date_prefix = now.strftime("%Y-%m-%d")
    filename = f"{date_prefix}_{slug}.md"

    amendments_dir = REPO_ROOT / AMENDMENTS_DIR
    amendments_dir.mkdir(parents=True, exist_ok=True)
    record_path = amendments_dir / filename

    # Build the full amendment record
    content = textwrap.dedent(f"""\
        ---
        mode: amend
        slug: "{slug}"
        date: "{now.isoformat()}"
        description: "{safe_description}"
        snapshot_used: {SNAPSHOT_PATH}
        patterns_used: {PATTERNS_PATH}
        patterns:
        {_yaml_list(patterns)}
        primary_files:
        {_yaml_list(primary)}
        related_files_considered:
        {_yaml_list(related)}
        updated_files:
        {_yaml_list(updated)}
        not_updated_files:
          []
        integrity_check_done: true
        tests_updated:
          []
        docs_updated:
          []
        ---

        ## Pre-Change Cross-Cutting Analysis

        **Primary target:** {', '.join(primary) if primary else 'TODO'}

        **Pattern(s) involved:** {', '.join(patterns) if patterns else 'TODO — check _code_audit/patterns.md'}

        **Canonical implementation:** TODO

        **Related implementations found:**
        TODO — list files found by searching patterns.md touch points

        **Shared helpers/utilities impacted:**
        TODO — list any shared code affected

        ---

        ## {safe_description}

        TODO — describe what changed and why

        ---

        ## Cross-Cutting Integrity Check

        - [ ] Patterns reviewed: TODO
        - [ ] Files updated: {', '.join(updated) if updated else 'TODO'}
        - [ ] Files NOT updated (with justification): TODO or N/A
        - [ ] Tests updated: TODO or N/A
        - [ ] Docs updated: TODO or N/A
        - [ ] CLAUDE.md needs update: yes / no
        - [ ] patterns.md needs update: yes / no
    """)

    record_path.write_text(content, encoding="utf-8")
    print(f"Amendment created: {record_path.relative_to(REPO_ROOT)}")
    print()
    print(f"  IMPORTANT: Before filling this out, read:")
    print(f"    1. {SNAPSHOT_PATH}")
    print(f"    2. {PATTERNS_PATH}")
    print()
    if updated:
        print(f"  Covers {len(updated)} file(s):")
        for f in updated:
            print(f"    - {f}")
    else:
        print("  WARNING: No --files listed. The validator will reject this.")
        print("  Add --files with every changed code file.")
    print()
    print("  Fill in all TODO sections before committing.")


# ---------------------------------------------------------------------------
# Argument parser
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        prog="repo_audit",
        description="Repo audit and amendment management CLI.",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    # audit
    audit_parser = subparsers.add_parser(
        "audit", help="Scaffold the _code_audit/ directory"
    )
    audit_parser.set_defaults(func=cmd_audit)

    # amend
    amend_parser = subparsers.add_parser(
        "amend", help="Create a new amendment record"
    )
    amend_parser.add_argument(
        "--slug", required=True,
        help="Short identifier for this amendment (used in filename)",
    )
    amend_parser.add_argument(
        "--description", required=True,
        help="One-line description of what changed",
    )
    amend_parser.add_argument(
        "--files", nargs="*", default=[],
        help="Paths to changed code files (populates updated_files)",
    )
    amend_parser.add_argument(
        "--primary", nargs="*", default=[],
        help="Primary target files (the main files being changed)",
    )
    amend_parser.add_argument(
        "--related", nargs="*", default=[],
        help="Related files considered during cross-cutting analysis",
    )
    amend_parser.add_argument(
        "--patterns", nargs="*", default=[],
        help="Pattern IDs involved (e.g. P1 P3)",
    )
    amend_parser.set_defaults(func=cmd_amend)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
