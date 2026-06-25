"""Coupling signal — the decoupling enforcer.

Decoupling is the principle; *coupling* is the violation this module measures
so a gate can fail work that is too coupled (the same arc the glossary uses:
it measures DUPLICATION to enforce DRY; this measures COUPLING to enforce
DECOUPLED). Low coupling == decoupled == pass.

This module is itself DECOUPLED on purpose — it practices what it enforces:

    - PURE. No file I/O, no engine-stage imports, no global state. It takes a
      generic call graph and returns facts. Reusable on ANY directed call graph,
      testable in isolation with a hand-built dict (see tests/test_coupling.py).
    - The caller (runner) is the composition layer that knows where the edges,
      module assignments, and privacy flags came from. This module does not.

What it computes (all DETERMINISTIC — no thresholds, no magic numbers):

    - module dependency edges + per-module afferent/efferent COUNTS. These are
      MEASUREMENTS, reported, never gated (gating on a count would be arbitrary).
    - cycles: strongly-connected components of the module graph with more than
      one member, plus any single-module self-loop. A BINARY fact (a cycle
      exists or it does not) -> gate-worthy.
    - reach-ins: a cross-module edge whose callee is internal by the language's
      own naming convention (the caller marks which callees are private). A
      BINARY fact -> gate-worthy.

Contract-aware reach-in (callee not in a unit's declared `exposes`) is computed
by the essense-flow consumers, where declarations exist; this engine emits the
language-level facts those consumers build on.
"""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass, field

from code_glossary.call_names import leaf_name


def build_name_index(
    units: list[tuple[str, str, str]],
) -> dict[str, list[tuple[str, str]]]:
    """Index function name -> [(record_id, module)] for scoped resolution.

    Args:
        units: (record_id, module, function_name) for every indexed unit.

    Pure. The name is the bare function name (the resolution key calls match on).
    """
    index: dict[str, list[tuple[str, str]]] = defaultdict(list)
    for record_id, module, function_name in units:
        if function_name:
            index[function_name].append((record_id, module))
    return index


def resolve_scoped_edges(
    call_sites: list[tuple[str, str, list[str]]],
    name_index: dict[str, list[tuple[str, str]]],
) -> dict[str, list[str]]:
    """Resolve each caller's calls to callee record ids with LEXICAL SCOPING.

    A call binds to a SAME-MODULE definition when one exists; it resolves to
    cross-module candidate(s) ONLY when no same-module definition matches the
    name. This is standard scope semantics and it is what makes the coupling
    signal trustworthy: without it, a private helper name duplicated across
    modules (two `_jaccard`s) fabricates phantom cross-module edges and phantom
    cycles — false decoupling violations. Deterministic, no thresholds.

    Args:
        call_sites: (caller_id, caller_module, raw_call_names) per caller.
        name_index: build_name_index() output.

    Returns:
        caller_id -> list of resolved callee ids (deduped, order-stable, self
        excluded). Callers with no resolved calls are omitted.
    """
    edges: dict[str, list[str]] = {}
    for caller_id, caller_module, calls in call_sites:
        seen: set[str] = set()
        ordered: list[str] = []
        for call in calls:
            name = leaf_name(call)
            if not name:
                continue
            candidates = [c for c in name_index.get(name, ()) if c[0] != caller_id]
            if not candidates:
                continue
            same_module = [c for c in candidates if c[1] == caller_module]
            chosen = same_module if same_module else candidates
            for callee_id, _callee_module in chosen:
                if callee_id in seen:
                    continue
                seen.add(callee_id)
                ordered.append(callee_id)
        if ordered:
            edges[caller_id] = ordered
    return edges


# Languages whose naming convention marks a function as internal with a single
# leading underscore. Conservative on purpose: a language not listed here has no
# unambiguous private marker, so we never flag a reach-in into it (no guessing).
_LEADING_UNDERSCORE_PRIVATE = frozenset({"python"})


def is_internal_name(name: str, language: str) -> bool:
    """True when `name` is internal by `language`'s own naming convention.

    Pure (string -> bool), so the privacy rule is testable on its own and the
    runner stays a thin wiring layer. Python: a single leading underscore marks
    internal; dunders (`__x__`) are protocol/framework hooks, treated as public
    (they are called by the runtime, not a reach-in). Other languages: unknown
    -> not internal (never false-flag).
    """
    if not name:
        return False
    if language in _LEADING_UNDERSCORE_PRIVATE:
        if name.startswith("__") and name.endswith("__"):
            return False  # dunder: special method, not "private"
        return name.startswith("_")
    return False


@dataclass(frozen=True)
class ReachIn:
    """One cross-module call into a callee that is internal by naming
    convention — a decoupling violation at the language level."""

    caller_id: str
    callee_id: str
    caller_module: str
    callee_module: str


@dataclass
class CouplingModel:
    """Facts about a call graph's coupling. Counts are measurements (reported);
    `cycles` and `reach_ins` are the binary gate-worthy violations."""

    # Distinct directed module->module dependency edges (no self-loops here;
    # self-loops surface as single-module cycles instead).
    module_edges: list[tuple[str, str]] = field(default_factory=list)
    # module -> number of distinct modules that depend ON it (incoming).
    afferent: dict[str, int] = field(default_factory=dict)
    # module -> number of distinct modules it depends on (outgoing).
    efferent: dict[str, int] = field(default_factory=dict)
    # Each inner list is a set of modules mutually reachable (a dependency
    # cycle). A single-element list means that module calls itself across
    # the unit boundary (self-cycle). Empty list == acyclic == decoupled.
    cycles: list[list[str]] = field(default_factory=list)
    # Cross-module calls into internally-named callees.
    reach_ins: list[ReachIn] = field(default_factory=list)
    modules: list[str] = field(default_factory=list)

    @property
    def has_violations(self) -> bool:
        """True when any gate-worthy decoupling violation is present."""
        return bool(self.cycles) or bool(self.reach_ins)


def build_coupling_model(
    edges: dict[str, list[str]],
    module_of: dict[str, str],
    private_of: dict[str, bool],
) -> CouplingModel:
    """Reduce a call graph to coupling facts.

    Args:
        edges: caller record id -> list of callee record ids (intra-codebase
            resolved calls; the engine's compute_abstraction `called_ids`).
        module_of: record id -> its module (unit/boundary) label.
        private_of: record id -> True when the record's name is internal by its
            language convention (e.g. Python leaf name starts with '_'). Missing
            keys are treated as not-private (conservative: never false-flag a
            language that has no unambiguous private marker).

    Returns:
        CouplingModel. Pure function of the inputs — same inputs, same model.
    """
    # --- module-level dependency graph (distinct edges, self-loops apart) ---
    module_edge_set: set[tuple[str, str]] = set()
    self_loops: set[str] = set()
    modules: set[str] = set(module_of.values())

    reach_ins: list[ReachIn] = []

    for caller, callees in edges.items():
        caller_mod = module_of.get(caller)
        if caller_mod is None:
            continue  # caller outside the indexed set; nothing to attribute
        modules.add(caller_mod)
        for callee in callees:
            callee_mod = module_of.get(callee)
            if callee_mod is None:
                continue
            modules.add(callee_mod)
            if callee_mod == caller_mod:
                continue  # intra-module call is not cross-boundary coupling
            module_edge_set.add((caller_mod, callee_mod))
            if private_of.get(callee, False):
                reach_ins.append(
                    ReachIn(
                        caller_id=caller,
                        callee_id=callee,
                        caller_module=caller_mod,
                        callee_module=callee_mod,
                    )
                )
            # A->B and B->A both present is a 2-module cycle, found below.
            if (callee_mod, caller_mod) in module_edge_set:
                pass  # detected structurally by SCC, not flagged here

    # Self-loop at module granularity: a unit whose functions call each other
    # is normal; that is NOT cross-boundary. So we do not synthesize self
    # cycles. Cycles below are strictly between DISTINCT modules.

    afferent: dict[str, int] = defaultdict(int)
    efferent: dict[str, int] = defaultdict(int)
    for src, dst in module_edge_set:
        efferent[src] += 1
        afferent[dst] += 1

    cycles = _find_cycles(module_edge_set, modules)

    return CouplingModel(
        module_edges=sorted(module_edge_set),
        afferent={m: afferent.get(m, 0) for m in sorted(modules)},
        efferent={m: efferent.get(m, 0) for m in sorted(modules)},
        cycles=cycles,
        reach_ins=sorted(
            reach_ins, key=lambda r: (r.caller_module, r.callee_module, r.caller_id, r.callee_id)
        ),
        modules=sorted(modules),
    )


def _find_cycles(edges: set[tuple[str, str]], nodes: set[str]) -> list[list[str]]:
    """Strongly-connected components with more than one node — the dependency
    cycles. Iterative Tarjan (no recursion limit on large graphs -> robust,
    another facet of building this decoupled/reusable).

    Returns each multi-node SCC as a sorted list, the whole list sorted for
    determinism. Single-node SCCs are acyclic and omitted.
    """
    adjacency: dict[str, list[str]] = defaultdict(list)
    for src, dst in edges:
        adjacency[src].append(dst)
    for targets in adjacency.values():
        targets.sort()

    index_of: dict[str, int] = {}
    low_of: dict[str, int] = {}
    on_stack: set[str] = set()
    stack: list[str] = []
    counter = 0
    sccs: list[list[str]] = []

    # Iterative DFS frame: (node, iterator-position into its sorted successors).
    for root in sorted(nodes):
        if root in index_of:
            continue
        work: list[tuple[str, int]] = [(root, 0)]
        while work:
            node, next_child = work[-1]
            if next_child == 0:
                index_of[node] = low_of[node] = counter
                counter += 1
                stack.append(node)
                on_stack.add(node)
            successors = adjacency.get(node, ())
            if next_child < len(successors):
                work[-1] = (node, next_child + 1)
                child = successors[next_child]
                if child not in index_of:
                    work.append((child, 0))
                elif child in on_stack:
                    low_of[node] = min(low_of[node], index_of[child])
            else:
                # Done with node's children: settle low-links and pop an SCC.
                if low_of[node] == index_of[node]:
                    component: list[str] = []
                    while True:
                        member = stack.pop()
                        on_stack.discard(member)
                        component.append(member)
                        if member == node:
                            break
                    if len(component) > 1:
                        sccs.append(sorted(component))
                work.pop()
                if work:
                    parent = work[-1][0]
                    low_of[parent] = min(low_of[parent], low_of[node])

    return sorted(sccs)
