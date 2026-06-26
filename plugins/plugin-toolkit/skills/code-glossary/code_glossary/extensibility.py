"""Extensibility signal — the open-closed enforcer.

Open-for-extension is the principle; *dispatch enumeration* is the violation
this module measures so a gate can fail work that is closed (the same arc the
rest of the engine uses: it measures DUPLICATION to enforce DRY, COUPLING to
enforce DECOUPLED, and here DISPATCH ENUMERATION to enforce OPEN-FOR-EXTENSION).

It answers the user's real test: "add one new instance of an axis -> how many
existing sites must I edit?" Zero edit-sites == open. N>0 == closed, with the N
sites named file:line.

This module is itself DECOUPLED on purpose -- it practices what it enforces:

    - PURE. No file I/O, no engine-stage imports, no tree-sitter, no global
      state. It takes already-harvested dispatch sites and axes and returns
      facts. Reusable on ANY such inputs, testable with hand-built lists
      (see tests/test_extensibility.py).
    - The caller (runner) is the composition layer that knows how the sites and
      axes were harvested (the AST scan). This module does not.

What it computes (all DETERMINISTIC -- no thresholds, no magic numbers):

    - per axis: the edit_sites that enumerate the axis's instances (every site
      you must touch to add one instance), and their COUNT. The count is a
      MEASUREMENT -- reported, never gated (gating on a count would be arbitrary).
    - has_violations: any DECLARED-OPEN axis that still carries >=1 dispatch
      site. A BINARY fact (the promise "this axis is open" is kept or broken)
      -> gate-worthy. Intrinsic-only axes (enums not declared open) are measured
      and reported, never gated.
"""

from __future__ import annotations

from dataclasses import dataclass, field

# Number of an axis's instances a site's labels must share before the site
# counts as a dispatch on that axis. This is a STRUCTURAL disambiguator, not a
# quality threshold: one shared label is ambiguous (any code may name a single
# enum member in passing); two-or-more members of the SAME declared closed set
# appearing as the branch labels of one construct is the unmistakable signature
# of exhaustive enumeration over that set. A declaration site lists ALL members,
# so it always clears this. (Same spirit as coupling's scope rule and
# block_scanner's jump+condition guard: a deterministic shape test, never a
# tunable cutoff.)
MIN_INSTANCE_OVERLAP = 2

# Site kinds. DECLARATION is the canonical, unavoidable edit (you must declare a
# new instance somewhere); the other three are the enumerating dispatch sites
# whose presence on a declared-open axis is the violation.
KIND_DECLARATION = "declaration"
KIND_SWITCH = "switch"
KIND_IF_LADDER = "if_ladder"
KIND_DICT_DISPATCH = "dict_dispatch"

# The dispatch kinds (everything that is not the declaration).
DISPATCH_KINDS = frozenset({KIND_SWITCH, KIND_IF_LADDER, KIND_DICT_DISPATCH})


@dataclass(frozen=True)
class DispatchSite:
    """One code site that references instances of some axis.

    instance_labels are the case-labels (switch), compared literals (if-ladder),
    dict keys (dict dispatch), or member names (declaration) found at the site --
    the bare instance names, language-agnostic, no type resolution. The pure
    model binds the site to an axis purely from these.
    """

    file: str
    line: int
    kind: str  # declaration | switch | if_ladder | dict_dispatch
    instance_labels: frozenset[str]
    function: str = ""
    language: str = ""


@dataclass(frozen=True)
class Axis:
    """One axis of variation -- a closed instance-set the design may want open.

    open is the declared intent: True == "this must stay open" (a dispatch site
    on it is a violation); False == intrinsic/undeclared (measured, advisory).
    source records where the axis came from (declared ledger vs intrinsic enum).
    """

    type_name: str
    instances: frozenset[str]
    open: bool = False
    source: str = "intrinsic"  # declared | intrinsic


@dataclass
class AxisFinding:
    """The measure for one axis: where the edit-sites are and whether it's a
    gate-worthy violation."""

    axis: Axis
    # Every site that must change to add one instance -- the dispatch sites bound
    # to this axis PLUS its declaration. Sorted (file, line) for determinism.
    edit_sites: list[DispatchSite] = field(default_factory=list)

    @property
    def edit_count(self) -> int:
        """Add-one-instance edit count -- the answer to the user's test."""
        return len(self.edit_sites)

    @property
    def files(self) -> list[str]:
        """Distinct files an instance-add would touch."""
        return sorted({s.file for s in self.edit_sites})

    @property
    def dispatch_sites(self) -> list[DispatchSite]:
        """Edit-sites that are enumerating dispatch (the declaration excluded)."""
        return [s for s in self.edit_sites if s.kind in DISPATCH_KINDS]

    @property
    def is_violation(self) -> bool:
        """BINARY gate fact: a DECLARED-OPEN axis that still carries dispatch.
        Intrinsic axes are never violations (measured + reported only)."""
        return self.axis.open and len(self.dispatch_sites) > 0


@dataclass
class ExtensibilityModel:
    """Facts about a codebase's open-closed shape. edit_counts are measurements
    (reported); `has_violations` is the binary gate-worthy fact."""

    findings: list[AxisFinding] = field(default_factory=list)

    @property
    def has_violations(self) -> bool:
        """True when any declared-open axis still carries a dispatch site."""
        return any(f.is_violation for f in self.findings)

    @property
    def violations(self) -> list[AxisFinding]:
        return [f for f in self.findings if f.is_violation]


def site_binds_to_axis(site: DispatchSite, axis: Axis) -> bool:
    """True when `site` enumerates `axis` -- its labels overlap the axis's
    instance set by at least MIN_INSTANCE_OVERLAP members.

    Pure (inputs -> bool), so the binding rule is testable on its own. No type
    inference: a switch whose case labels are {Worker, Soldier} binds to the
    JobClass axis because those names are JobClass members, full stop.
    """
    overlap = site.instance_labels & axis.instances
    return len(overlap) >= MIN_INSTANCE_OVERLAP


def build_extensibility_model(
    dispatch_sites: list[DispatchSite],
    axes: list[Axis],
) -> ExtensibilityModel:
    """Reduce harvested sites + axes to per-axis edit-site facts.

    Args:
        dispatch_sites: every site the scanner harvested (declarations + the
            three dispatch kinds), each carrying its instance_labels.
        axes: the axis set -- declared (from the growth_axes ledger) and/or
            intrinsic (enum declarations harvested from the AST).

    Returns:
        ExtensibilityModel. Pure function of the inputs -- same inputs, same
        model. A site that binds to no axis is simply omitted (not an error: a
        switch over a non-axis value is not our concern). A site may bind to
        more than one axis only if two axes share >= MIN_INSTANCE_OVERLAP
        member names, which is reported under each (conservative -- never hides
        an edit-site).
    """
    findings: list[AxisFinding] = []
    for axis in axes:
        bound = [s for s in dispatch_sites if site_binds_to_axis(s, axis)]
        bound.sort(key=lambda s: (s.file, s.line, s.kind))
        findings.append(AxisFinding(axis=axis, edit_sites=bound))
    findings.sort(key=lambda f: f.axis.type_name)
    return ExtensibilityModel(findings=findings)
