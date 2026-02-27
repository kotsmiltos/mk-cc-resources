"""Shared constants for the repo audit and amendment enforcement system.

Single source of truth for file extensions, paths, and required fields
used by both repo_audit.py and enforce_amendment_protocol.py.
"""

from pathlib import PurePosixPath

# ---------------------------------------------------------------------------
# File extensions that constitute "code" and trigger amendment enforcement
# ---------------------------------------------------------------------------

SOURCE_EXTENSIONS = frozenset({
    ".py", ".js", ".ts", ".jsx", ".tsx", ".sh", ".bash", ".zsh", ".ps1",
})

CONFIG_EXTENSIONS = frozenset({
    ".toml", ".yaml", ".yml", ".json",
})

ENFORCED_EXTENSIONS = SOURCE_EXTENSIONS | CONFIG_EXTENSIONS

# ---------------------------------------------------------------------------
# Paths / patterns excluded from amendment enforcement
# ---------------------------------------------------------------------------

EXCLUDED_PREFIXES = (
    "_code_audit/",
    ".github/",
)

EXCLUDED_FILES = frozenset({
    "CLAUDE.md",
    ".gitignore",
    "LICENSE",
})

# ---------------------------------------------------------------------------
# Amendment record layout
# ---------------------------------------------------------------------------

AMENDMENTS_DIR = PurePosixPath("_code_audit/amendments")

# Canonical snapshot and lookup paths that amendments must reference
SNAPSHOT_PATH = "CLAUDE.md"
PATTERNS_PATH = "_code_audit/patterns.md"

# Required YAML frontmatter fields in an amendment record.
# Each tuple is (field_name, expected_value_or_None).
# None means any non-empty value is accepted.
# A string means the field must have exactly that value.
REQUIRED_AMENDMENT_FIELDS = (
    ("mode", "amend"),
    ("slug", None),
    ("date", None),
    ("description", None),
    ("snapshot_used", SNAPSHOT_PATH),
    ("patterns_used", PATTERNS_PATH),
    ("integrity_check_done", "true"),
)

# Required list fields — must be present (can be empty list [] only where noted)
REQUIRED_AMENDMENT_LIST_FIELDS = (
    "primary_files",
    "related_files_considered",
    "updated_files",
)

# Optional but recommended list fields (validator warns if missing, doesn't fail)
RECOMMENDED_AMENDMENT_LIST_FIELDS = (
    "not_updated_files",
    "patterns",
    "tests_updated",
    "docs_updated",
)

# ---------------------------------------------------------------------------
# Audit output paths
# ---------------------------------------------------------------------------

AUDIT_DIR = PurePosixPath("_code_audit")
AUDIT_FILES_DIR = AUDIT_DIR / "files"
