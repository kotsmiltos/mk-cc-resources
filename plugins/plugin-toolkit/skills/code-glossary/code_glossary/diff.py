"""Glossary drift diff — compare two GLOSSARY.yaml runs (v1.1 chapter).

Entry identity across runs CANNOT use ids: gloss-ids are positional per
render and record ids are line-sensitive (sha1 of relpath:line). Entries
match instead by their instance-identity sets {(file, function)} —
line-proof; a file rename shows as removed+added (accepted v1
semantics).

Matching is greedy: candidate pairs ranked by Jaccard similarity of
identity sets (name equality breaks ties), pairs claimed best-first,
only pairs at or above DIFF_MATCH_THRESHOLD match.

Six drift classes:
    added                 entry in new run only
    removed               entry in old run only
    grown                 matched entry gained instance sites (THE drift signal)
    shrunk                matched entry lost instance sites
    extractable_changed   extractable flag flipped
    verification_changed  verification_status changed

Watchlist singles (1-instance entries) are excluded by default — the
diff is about duplication drift, not inventory churn. include_singles
overrides.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

# Minimum Jaccard similarity between two entries' instance-identity sets
# for them to count as the same functionality across runs. 0.5 = at
# least half the union of sites is shared — below that, treating them
# as the same entry would mislabel churn as growth.
DIFF_MATCH_THRESHOLD = 0.5

# Identity site rendered as file:function in reports.
_SITE_FMT = "{file}:{function}"


@dataclass
class EntrySnapshot:
    """One glossary entry reduced to what the diff needs."""

    entry_id: str
    name: str
    identity: frozenset[tuple[str, str]]  # {(file, function)}
    extractable: bool
    verification_status: str
    instance_count: int


@dataclass
class MatchedChange:
    """A matched old/new entry pair plus what changed between them."""

    old: EntrySnapshot
    new: EntrySnapshot
    jaccard: float
    gained_sites: list[tuple[str, str]] = field(default_factory=list)
    lost_sites: list[tuple[str, str]] = field(default_factory=list)


@dataclass
class DiffResult:
    added: list[EntrySnapshot] = field(default_factory=list)
    removed: list[EntrySnapshot] = field(default_factory=list)
    grown: list[MatchedChange] = field(default_factory=list)
    shrunk: list[MatchedChange] = field(default_factory=list)
    extractable_changed: list[MatchedChange] = field(default_factory=list)
    verification_changed: list[MatchedChange] = field(default_factory=list)
    matched_count: int = 0
    old_total: int = 0
    new_total: int = 0
    singles_excluded_old: int = 0
    singles_excluded_new: int = 0

    def has_drift(self) -> bool:
        return bool(
            self.added
            or self.removed
            or self.grown
            or self.shrunk
            or self.extractable_changed
            or self.verification_changed
        )

    def summary_counts(self) -> dict[str, int]:
        return {
            "matched": self.matched_count,
            "added": len(self.added),
            "removed": len(self.removed),
            "grown": len(self.grown),
            "shrunk": len(self.shrunk),
            "extractable_changed": len(self.extractable_changed),
            "verification_changed": len(self.verification_changed),
        }


def diff_glossaries(
    old_doc: dict[str, Any],
    new_doc: dict[str, Any],
    include_singles: bool = False,
) -> DiffResult:
    """Diff two GLOSSARY.yaml documents (parsed dicts) into drift classes."""
    result = DiffResult()

    old_entries = _snapshots(old_doc)
    new_entries = _snapshots(new_doc)
    if not include_singles:
        kept_old = [e for e in old_entries if e.instance_count >= 2]
        kept_new = [e for e in new_entries if e.instance_count >= 2]
        result.singles_excluded_old = len(old_entries) - len(kept_old)
        result.singles_excluded_new = len(new_entries) - len(kept_new)
        old_entries, new_entries = kept_old, kept_new
    result.old_total = len(old_entries)
    result.new_total = len(new_entries)

    matches = _greedy_match(old_entries, new_entries)
    result.matched_count = len(matches)

    matched_old = {id(m.old) for m in matches}
    matched_new = {id(m.new) for m in matches}
    result.removed = [e for e in old_entries if id(e) not in matched_old]
    result.added = [e for e in new_entries if id(e) not in matched_new]

    for m in matches:
        m.gained_sites = sorted(m.new.identity - m.old.identity)
        m.lost_sites = sorted(m.old.identity - m.new.identity)
        if m.gained_sites:
            result.grown.append(m)
        if m.lost_sites:
            result.shrunk.append(m)
        if m.old.extractable != m.new.extractable:
            result.extractable_changed.append(m)
        if m.old.verification_status != m.new.verification_status:
            result.verification_changed.append(m)
    return result


def _site(inst: dict[str, Any]) -> tuple[str, str]:
    """(file, function) of one instance.

    v2 emits nest these under 'location'; v1 artifacts (the snapshots a
    first diff will typically have as --old) keep them flat on the
    instance. Both shapes are accepted.
    """
    loc = inst.get("location")
    source = loc if isinstance(loc, dict) else inst
    return (str(source.get("file") or ""), str(source.get("function") or ""))


def _snapshots(doc: dict[str, Any]) -> list[EntrySnapshot]:
    entries = doc.get("glossary") or []
    out: list[EntrySnapshot] = []
    for raw in entries:
        instances = raw.get("instances") or []
        identity = frozenset(_site(inst) for inst in instances)
        out.append(
            EntrySnapshot(
                entry_id=str(raw.get("id") or ""),
                name=str(raw.get("name") or ""),
                identity=identity,
                extractable=bool(raw.get("extractable", False)),
                verification_status=str(raw.get("verification_status") or ""),
                instance_count=len(instances),
            )
        )
    return out


def _jaccard(a: frozenset, b: frozenset) -> float:
    if not a and not b:
        return 1.0
    union = a | b
    if not union:
        return 1.0
    return len(a & b) / len(union)


def _greedy_match(
    old_entries: list[EntrySnapshot],
    new_entries: list[EntrySnapshot],
) -> list[MatchedChange]:
    """Best-first pair claiming above DIFF_MATCH_THRESHOLD.

    Rank: higher Jaccard first; name equality breaks ties; then
    (old id, new id) for full determinism.
    """
    candidates: list[tuple[float, int, str, str, EntrySnapshot, EntrySnapshot]] = []
    for o in old_entries:
        for n in new_entries:
            sim = _jaccard(o.identity, n.identity)
            if sim >= DIFF_MATCH_THRESHOLD:
                name_tie = 0 if o.name == n.name else 1
                candidates.append((-sim, name_tie, o.entry_id, n.entry_id, o, n))
    candidates.sort(key=lambda t: t[:4])

    matched: list[MatchedChange] = []
    used_old: set[int] = set()
    used_new: set[int] = set()
    for neg_sim, _tie, _oid, _nid, o, n in candidates:
        if id(o) in used_old or id(n) in used_new:
            continue
        used_old.add(id(o))
        used_new.add(id(n))
        matched.append(MatchedChange(old=o, new=n, jaccard=-neg_sim))
    return matched


# --- report rendering ---


def render_diff_markdown(result: DiffResult, old_label: str, new_label: str) -> str:
    """DIFF.md body — per-class sections with file:function site lists."""
    lines: list[str] = [
        "# Glossary drift report",
        "",
        f"- old: `{old_label}`",
        f"- new: `{new_label}`",
        f"- entries compared: {result.old_total} old / {result.new_total} new "
        f"({result.matched_count} matched)",
        f"- watchlist singles excluded: {result.singles_excluded_old} old / "
        f"{result.singles_excluded_new} new",
        "",
        "## Summary",
        "",
    ]
    for key, count in result.summary_counts().items():
        lines.append(f"- {key}: {count}")

    def site_list(sites) -> list[str]:
        return [
            f"  - {_SITE_FMT.format(file=f, function=fn or '<no-function>')}"
            for f, fn in sorted(sites)
        ]

    def entry_header(snap: EntrySnapshot) -> str:
        return f"- **{snap.name}** ({snap.entry_id}, {snap.instance_count} instance(s))"

    lines += ["", "## Added (new run only)", ""]
    lines += [
        line
        for e in result.added
        for line in [entry_header(e), *site_list(e.identity)]
    ] or ["(none)"]

    lines += ["", "## Removed (old run only)", ""]
    lines += [
        line
        for e in result.removed
        for line in [entry_header(e), *site_list(e.identity)]
    ] or ["(none)"]

    lines += ["", "## Grown — new duplication sites (the drift signal)", ""]
    lines += [
        line
        for m in result.grown
        for line in [
            f"- **{m.new.name}** ({m.old.entry_id} -> {m.new.entry_id}, "
            f"jaccard {m.jaccard:.2f}) gained {len(m.gained_sites)} site(s):",
            *site_list(m.gained_sites),
        ]
    ] or ["(none)"]

    lines += ["", "## Shrunk — sites no longer present", ""]
    lines += [
        line
        for m in result.shrunk
        for line in [
            f"- **{m.new.name}** ({m.old.entry_id} -> {m.new.entry_id}, "
            f"jaccard {m.jaccard:.2f}) lost {len(m.lost_sites)} site(s):",
            *site_list(m.lost_sites),
        ]
    ] or ["(none)"]

    lines += ["", "## Extractable changed", ""]
    lines += [
        f"- **{m.new.name}**: extractable {m.old.extractable} -> {m.new.extractable}"
        for m in result.extractable_changed
    ] or ["(none)"]

    lines += ["", "## Verification changed", ""]
    lines += [
        f"- **{m.new.name}**: {m.old.verification_status or '<empty>'} -> "
        f"{m.new.verification_status or '<empty>'}"
        for m in result.verification_changed
    ] or ["(none)"]

    lines.append("")
    return "\n".join(lines)
