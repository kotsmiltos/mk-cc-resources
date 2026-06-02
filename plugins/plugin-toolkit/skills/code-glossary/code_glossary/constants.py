"""Frozen constants for code-glossary v2.

Changing SCHEMA_VERSION is a breaking change to downstream consumers
(e.g. the future /dry-refactor executor). Bump major when fields are
removed or required-status flips; minor when new optional fields land.
"""

# Schema versioning — see DESIGN-V2.md section 6 and Appendix A.
SCHEMA_VERSION: int = 1

# Generator identity (written into every GLOSSARY.yaml metadata block).
GENERATOR_NAME: str = "code-glossary"
GENERATOR_VERSION: str = "2.0.0.dev0"

# Confidence levels for cluster matching (see DESIGN-V2.md piece 3).
CONFIDENCE_LEVELS = ("high", "medium", "low")

# Verification statuses for clusters (see DESIGN-V2.md section 8).
VERIFICATION_STATUSES = ("verified", "quote_drift_detected", "inconclusive")

# Instance types (see DESIGN-V2.md section 6).
INSTANCE_TYPES = ("function", "block", "spec")

# Entry kinds (see DESIGN-V2.md piece 2).
ENTRY_KINDS = ("leaf", "composite")

# Default minimum instance count for an entry to be marked extractable
# (see DESIGN-V2.md piece 4). Overridable via glossary/config.yaml.
DEFAULT_MIN_INSTANCES_FOR_EXTRACTABLE: int = 2

# Default maximum concurrent sub-agent dispatches (see DESIGN-V2.md piece 10).
DEFAULT_MAX_PARALLEL_AGENTS: int = 20

# Languages with first-class AST support in v2 (see DESIGN-V2.md piece 6).
# Falling back to LLM-sketch for everything else.
FIRST_CLASS_LANGUAGES = ("python", "typescript", "javascript", "csharp")

# File extension to language mapping. javascript shares the typescript parser
# (tree-sitter-typescript handles both .js/.jsx and .ts/.tsx).
EXTENSION_TO_LANGUAGE: dict[str, str] = {
    ".py": "python",
    ".ts": "typescript",
    ".tsx": "typescript",
    ".js": "javascript",
    ".jsx": "javascript",
    ".cs": "csharp",
    ".go": "go",
    ".rs": "rust",
    ".java": "java",
    ".kt": "kotlin",
    ".rb": "ruby",
    ".cpp": "cpp",
    ".cc": "cpp",
    ".c": "c",
    ".h": "c",
    ".hpp": "cpp",
    ".swift": "swift",
    ".php": "php",
}
