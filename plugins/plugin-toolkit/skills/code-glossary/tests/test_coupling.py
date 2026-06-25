"""Tests for the coupling signal (the decoupling enforcer).

Contracts under test, all on hand-built call graphs (no engine run, no
fixtures — the module is pure and decoupled, so a dict is enough):

    - intra-module calls are NOT coupling (no edge, no reach-in);
    - cross-module call into a private callee IS a reach-in;
    - cross-module call into a public callee is NOT a reach-in;
    - same-module call into a private callee is NOT a reach-in (no boundary);
    - 2-module and 3-module dependency cycles are detected; acyclic is empty;
    - afferent/efferent counts are distinct-module measurements;
    - records with no module assignment are ignored, not crashed on;
    - the model is a pure function (same inputs -> identical model).
"""

from __future__ import annotations

from code_glossary.coupling import (
    CouplingModel,
    ReachIn,
    build_coupling_model,
    build_name_index,
    is_internal_name,
    resolve_scoped_edges,
)


def _scoped(units, call_sites):
    """Helper: build_name_index + resolve_scoped_edges in one call."""
    return resolve_scoped_edges(call_sites, build_name_index(units))


def test_scoped_resolution_binds_to_same_module_definition():
    # Two modules each define `_jaccard`; each caller's call must bind to its
    # OWN module's copy, producing NO cross-module edge (the false-positive fix).
    units = [
        ("diff_jac", "diffmod", "_jaccard"),
        ("diff_greedy", "diffmod", "_greedy_match"),
        ("merge_jac", "clustermod", "_jaccard"),
        ("merge_lex", "clustermod", "_lexical_agreement"),
    ]
    call_sites = [
        ("diff_greedy", "diffmod", ["_jaccard"]),
        ("merge_lex", "clustermod", ["_jaccard"]),
    ]
    edges = _scoped(units, call_sites)
    assert edges == {"diff_greedy": ["diff_jac"], "merge_lex": ["merge_jac"]}
    # And the coupling model sees zero cross-module coupling from this.
    module_of = {u[0]: u[1] for u in units}
    model = build_coupling_model(edges, module_of, {u[0]: True for u in units})
    assert model.module_edges == []
    assert model.reach_ins == []
    assert not model.has_violations


def test_scoped_resolution_keeps_genuine_cross_module_call():
    # block_scanner (indexer) calls _serialize_shape, which only signals defines
    # -> no local match -> genuine cross-module edge survives -> real reach-in.
    units = [
        ("blk", "indexer", "_build_block"),
        ("ser", "signals", "_serialize_shape"),
    ]
    call_sites = [("blk", "indexer", ["_serialize_shape"])]
    edges = _scoped(units, call_sites)
    assert edges == {"blk": ["ser"]}
    model = build_coupling_model(
        edges, {"blk": "indexer", "ser": "signals"}, {"ser": True}
    )
    assert model.module_edges == [("indexer", "signals")]
    assert model.reach_ins == [
        ReachIn(caller_id="blk", callee_id="ser", caller_module="indexer", callee_module="signals")
    ]


def test_scoped_resolution_self_call_excluded():
    units = [("rec", "m", "recurse")]
    edges = _scoped(units, [("rec", "m", ["recurse"])])
    assert edges == {}  # only candidate is self -> no edge


def test_scoped_resolution_unknown_name_dropped():
    units = [("a", "m1", "f")]
    edges = _scoped(units, [("a", "m1", ["does_not_exist"])])
    assert edges == {}


def test_scoped_resolution_dotted_call_uses_leaf():
    units = [("a", "m1", "caller"), ("t", "m2", "get")]
    edges = _scoped(units, [("a", "m1", ["requests.get"])])
    assert edges == {"a": ["t"]}  # leaf 'get' resolves cross-module


def test_scoped_resolution_dedups_repeated_calls():
    units = [("a", "m1", "caller"), ("t", "m2", "helper")]
    edges = _scoped(units, [("a", "m1", ["helper", "helper"])])
    assert edges == {"a": ["t"]}


def test_is_internal_name_python_single_underscore():
    assert is_internal_name("_helper", "python") is True
    assert is_internal_name("__mangled", "python") is True  # name-mangled, private


def test_is_internal_name_python_dunder_is_public():
    assert is_internal_name("__init__", "python") is False
    assert is_internal_name("__call__", "python") is False


def test_is_internal_name_python_public():
    assert is_internal_name("run", "python") is False


def test_is_internal_name_unknown_language_never_private():
    assert is_internal_name("_field", "csharp") is False
    assert is_internal_name("_field", "javascript") is False


def test_is_internal_name_empty():
    assert is_internal_name("", "python") is False


def test_intra_module_call_is_not_coupling():
    model = build_coupling_model(
        edges={"a": ["b"]},
        module_of={"a": "mod1", "b": "mod1"},
        private_of={"b": True},  # private, but same module -> no boundary crossed
    )
    assert model.module_edges == []
    assert model.reach_ins == []
    assert model.cycles == []
    assert not model.has_violations


def test_cross_module_private_callee_is_reach_in():
    model = build_coupling_model(
        edges={"a": ["b"]},
        module_of={"a": "mod1", "b": "mod2"},
        private_of={"b": True},
    )
    assert model.module_edges == [("mod1", "mod2")]
    assert model.reach_ins == [
        ReachIn(caller_id="a", callee_id="b", caller_module="mod1", callee_module="mod2")
    ]
    assert model.has_violations


def test_cross_module_public_callee_is_not_reach_in():
    model = build_coupling_model(
        edges={"a": ["b"]},
        module_of={"a": "mod1", "b": "mod2"},
        private_of={"b": False},
    )
    assert model.module_edges == [("mod1", "mod2")]
    assert model.reach_ins == []
    assert not model.has_violations  # a clean declared-surface dependency


def test_missing_private_flag_defaults_to_public():
    model = build_coupling_model(
        edges={"a": ["b"]},
        module_of={"a": "mod1", "b": "mod2"},
        private_of={},  # unknown -> conservative: not a reach-in
    )
    assert model.reach_ins == []


def test_two_module_cycle_detected():
    model = build_coupling_model(
        edges={"a": ["b"], "b": ["a"]},
        module_of={"a": "mod1", "b": "mod2"},
        private_of={},
    )
    assert model.cycles == [["mod1", "mod2"]]
    assert model.has_violations


def test_three_module_cycle_detected():
    model = build_coupling_model(
        edges={"a": ["b"], "b": ["c"], "c": ["a"]},
        module_of={"a": "m1", "b": "m2", "c": "m3"},
        private_of={},
    )
    assert model.cycles == [["m1", "m2", "m3"]]


def test_acyclic_graph_has_no_cycles():
    model = build_coupling_model(
        edges={"a": ["b"], "b": ["c"]},
        module_of={"a": "m1", "b": "m2", "c": "m3"},
        private_of={},
    )
    assert model.cycles == []
    assert model.module_edges == [("m1", "m2"), ("m2", "m3")]
    assert not model.has_violations


def test_self_module_recursion_is_not_a_cycle():
    # Two functions in the same module calling each other is normal cohesion,
    # not a cross-boundary dependency cycle.
    model = build_coupling_model(
        edges={"a": ["b"], "b": ["a"]},
        module_of={"a": "mod1", "b": "mod1"},
        private_of={},
    )
    assert model.cycles == []
    assert model.module_edges == []


def test_afferent_efferent_counts_distinct_modules():
    # m1->m2, m1->m3, m2->m3 : m1 efferent 2; m3 afferent 2.
    model = build_coupling_model(
        edges={"a": ["b", "c"], "b": ["c"]},
        module_of={"a": "m1", "b": "m2", "c": "m3"},
        private_of={},
    )
    assert model.efferent == {"m1": 2, "m2": 1, "m3": 0}
    assert model.afferent == {"m1": 0, "m2": 1, "m3": 2}


def test_duplicate_edges_counted_once_at_module_level():
    # Two functions in m1 both call into m2 -> one module dependency, not two.
    model = build_coupling_model(
        edges={"a": ["c"], "b": ["c"]},
        module_of={"a": "m1", "b": "m1", "c": "m2"},
        private_of={},
    )
    assert model.module_edges == [("m1", "m2")]
    assert model.efferent["m1"] == 1
    assert model.afferent["m2"] == 1


def test_unknown_caller_or_callee_ignored():
    model = build_coupling_model(
        edges={"a": ["ghost"], "phantom": ["b"]},
        module_of={"a": "m1", "b": "m2"},
        private_of={},
    )
    # 'ghost' and 'phantom' have no module -> their edges drop, no crash.
    assert model.module_edges == []
    assert model.reach_ins == []


def test_pure_function_same_inputs_same_model():
    args = dict(
        edges={"a": ["b"], "b": ["c"], "c": ["a"]},
        module_of={"a": "m1", "b": "m2", "c": "m3"},
        private_of={"b": True},
    )
    first = build_coupling_model(**args)
    second = build_coupling_model(**args)
    assert first == second


def test_reach_ins_sorted_deterministically():
    model = build_coupling_model(
        edges={"z": ["_y"], "a": ["_b"]},
        module_of={"z": "modZ", "_y": "modY", "a": "modA", "_b": "modB"},
        private_of={"_y": True, "_b": True},
    )
    # Sorted by (caller_module, callee_module, ...): modA/modB before modZ/modY.
    assert [r.caller_module for r in model.reach_ins] == ["modA", "modZ"]


def test_empty_graph_is_clean():
    model = build_coupling_model(edges={}, module_of={}, private_of={})
    assert model == CouplingModel(
        module_edges=[], afferent={}, efferent={}, cycles=[], reach_ins=[], modules=[]
    )
    assert not model.has_violations
