"""Substrate-verify — does each instance's body_excerpt still match disk?

Reuses the Pass-C compare rule (SKILL.md step 8 / DESIGN-V2.md lock
row 26): line endings normalize to LF on BOTH sides before comparison
(disk files are often CRLF on Windows; excerpts are LF-captured — raw
comparison false-drifted 92 instances in the v2 acceptance run), and
the excerpt may sit within +/- LINE_TOLERANCE lines of the recorded
line number (unrelated edits above shift everything down).

A failed match means the glossary is stale relative to the working
tree — the only safe response is re-running /code-glossary, never
"probably fine".
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Optional

# Pass-C tolerance: the excerpt's actual start line may differ from the
# recorded line by this many lines before it counts as drift.
LINE_TOLERANCE = 5


@dataclass
class SubstrateResult:
    file: str
    recorded_line: int
    matched: bool
    found_line: Optional[int]  # 1-based start line of the match, when found
    reason: str


def _normalize(text: str) -> str:
    return text.replace("\r\n", "\n").replace("\r", "\n")


def _instance_location(instance: dict[str, Any]) -> tuple[str, int]:
    """(file, line) of one instance — v2 nests under 'location', v1 is flat."""
    loc = instance.get("location")
    source = loc if isinstance(loc, dict) else instance
    return (str(source.get("file") or ""), int(source.get("line") or 0))


def verify_instance(root: Path | str, instance: dict[str, Any]) -> SubstrateResult:
    """Compare one instance's body_excerpt against the file on disk."""
    file_rel, recorded_line = _instance_location(instance)
    excerpt = _normalize(str(instance.get("body_excerpt") or "")).strip("\n")

    if not file_rel:
        return SubstrateResult("", recorded_line, False, None, "instance has no file")
    if not excerpt:
        return SubstrateResult(
            file_rel, recorded_line, False, None, "instance has no body_excerpt"
        )

    disk_path = Path(root) / file_rel
    if not disk_path.is_file():
        return SubstrateResult(
            file_rel, recorded_line, False, None, f"file not on disk: {disk_path}"
        )
    try:
        content = _normalize(disk_path.read_text(encoding="utf-8"))
    except (OSError, UnicodeDecodeError) as exc:
        return SubstrateResult(
            file_rel, recorded_line, False, None, f"unreadable: {exc}"
        )

    # Every occurrence of the excerpt, by start line; nearest within
    # tolerance wins. Indentation may differ between capture and disk
    # context, so fall back to a line-stripped comparison when the exact
    # text isn't present.
    found_lines = _occurrence_lines(content, excerpt)
    if not found_lines:
        found_lines = _stripped_occurrence_lines(content, excerpt)
    if not found_lines:
        return SubstrateResult(
            file_rel, recorded_line, False, None, "excerpt not found in file"
        )
    nearest = min(found_lines, key=lambda ln: abs(ln - recorded_line))
    if abs(nearest - recorded_line) <= LINE_TOLERANCE:
        return SubstrateResult(file_rel, recorded_line, True, nearest, "matched")
    return SubstrateResult(
        file_rel,
        recorded_line,
        False,
        nearest,
        f"excerpt found at line {nearest}, beyond +/-{LINE_TOLERANCE} of "
        f"recorded line {recorded_line}",
    )


def verify_cluster(root: Path | str, entry: dict[str, Any]) -> list[SubstrateResult]:
    """Substrate-verify every instance of one glossary entry."""
    return [verify_instance(root, inst) for inst in entry.get("instances") or []]


def _occurrence_lines(content: str, excerpt: str) -> list[int]:
    """1-based start lines of every exact occurrence of excerpt."""
    lines: list[int] = []
    start = 0
    while True:
        idx = content.find(excerpt, start)
        if idx < 0:
            return lines
        lines.append(content.count("\n", 0, idx) + 1)
        start = idx + 1


def _stripped_occurrence_lines(content: str, excerpt: str) -> list[int]:
    """Occurrence start lines comparing line-by-line with whitespace
    stripped — tolerates re-indentation, still requires identical code."""
    excerpt_lines = [ln.strip() for ln in excerpt.split("\n")]
    if not excerpt_lines:
        return []
    content_lines = [ln.strip() for ln in content.split("\n")]
    span = len(excerpt_lines)
    return [
        i + 1
        for i in range(len(content_lines) - span + 1)
        if content_lines[i : i + span] == excerpt_lines
    ]
