"""Tests for the extensibility signal (the open-closed enforcer).

Contracts under test, all on hand-built site/axis lists (no engine run, no
fixtures -- the module is pure and decoupled, so a list is enough):

    - a switch whose case-labels overlap an axis by >=2 binds to it;
    - a single shared label does NOT bind (ambiguity guard);
    - the declaration site binds (it lists every member) and counts as the one
      canonical edit;
    - edit_count == declaration + dispatch sites (the user's "how many edits");
    - files lists the distinct files an instance-add touches;
    - a DECLARED-OPEN axis with >=1 dispatch site is a binary violation;
    - an intrinsic axis with dispatch sites is measured but NOT a violation;
    - a declared-open axis with only its declaration is NOT a violation;
    - sites binding to no axis are dropped, not crashed on;
    - the model is a pure function (same inputs -> identical model).
"""

from __future__ import annotations

from code_glossary.extensibility import (
    KIND_DECLARATION,
    KIND_DICT_DISPATCH,
    KIND_IF_LADDER,
    KIND_SWITCH,
    Axis,
    DispatchSite,
    build_extensibility_model,
    site_binds_to_axis,
)

JOBCLASS = frozenset({"Worker", "Soldier", "Scout"})


def _axis(open=False, source="intrinsic", instances=JOBCLASS):
    return Axis(type_name="JobClass", instances=instances, open=open, source=source)


def _site(file, line, kind, labels, function=""):
    return DispatchSite(
        file=file, line=line, kind=kind, instance_labels=frozenset(labels), function=function
    )


# --- binding rule ---------------------------------------------------------


def test_switch_with_two_member_overlap_binds():
    site = _site("a.cs", 10, KIND_SWITCH, {"Worker", "Soldier"})
    assert site_binds_to_axis(site, _axis())


def test_single_shared_label_does_not_bind():
    # One enum member named in passing is ambiguous -> not a dispatch.
    site = _site("a.cs", 10, KIND_SWITCH, {"Worker"})
    assert not site_binds_to_axis(site, _axis())


def test_declaration_with_all_members_binds():
    site = _site("a.cs", 1, KIND_DECLARATION, JOBCLASS)
    assert site_binds_to_axis(site, _axis())


def test_no_overlap_does_not_bind():
    site = _site("a.cs", 10, KIND_SWITCH, {"Red", "Green", "Blue"})
    assert not site_binds_to_axis(site, _axis())


# --- edit-count measurement ----------------------------------------------


def test_edit_count_is_declaration_plus_dispatch():
    sites = [
        _site("a.cs", 1, KIND_DECLARATION, JOBCLASS),
        _site("a.cs", 20, KIND_SWITCH, {"Worker", "Soldier"}),
        _site("b.cs", 5, KIND_SWITCH, {"Worker", "Soldier", "Scout"}),
    ]
    model = build_extensibility_model(sites, [_axis()])
    finding = model.findings[0]
    assert finding.edit_count == 3
    assert finding.files == ["a.cs", "b.cs"]
    assert len(finding.dispatch_sites) == 2  # declaration excluded


def test_edit_sites_sorted_by_file_then_line():
    sites = [
        _site("b.cs", 5, KIND_SWITCH, {"Worker", "Soldier"}),
        _site("a.cs", 20, KIND_SWITCH, {"Worker", "Scout"}),
        _site("a.cs", 1, KIND_DECLARATION, JOBCLASS),
    ]
    model = build_extensibility_model(sites, [_axis()])
    locs = [(s.file, s.line) for s in model.findings[0].edit_sites]
    assert locs == [("a.cs", 1), ("a.cs", 20), ("b.cs", 5)]


def test_dict_and_ladder_kinds_count_as_dispatch():
    sites = [
        _site("a.cs", 1, KIND_DECLARATION, JOBCLASS),
        _site("a.cs", 30, KIND_IF_LADDER, {"Worker", "Soldier"}),
        _site("b.cs", 8, KIND_DICT_DISPATCH, {"Soldier", "Scout"}),
    ]
    model = build_extensibility_model(sites, [_axis()])
    assert model.findings[0].edit_count == 3
    assert len(model.findings[0].dispatch_sites) == 2


# --- gate policy ----------------------------------------------------------


def test_declared_open_axis_with_dispatch_is_violation():
    sites = [
        _site("a.cs", 1, KIND_DECLARATION, JOBCLASS),
        _site("a.cs", 20, KIND_SWITCH, {"Worker", "Soldier"}),
    ]
    model = build_extensibility_model(sites, [_axis(open=True, source="declared")])
    assert model.has_violations
    assert model.violations[0].axis.type_name == "JobClass"


def test_intrinsic_axis_with_dispatch_is_not_violation():
    # Same sites, but the axis was not DECLARED open -> measured, not gated.
    sites = [
        _site("a.cs", 1, KIND_DECLARATION, JOBCLASS),
        _site("a.cs", 20, KIND_SWITCH, {"Worker", "Soldier"}),
    ]
    model = build_extensibility_model(sites, [_axis(open=False, source="intrinsic")])
    assert not model.has_violations
    assert model.findings[0].edit_count == 2  # still measured


def test_declared_open_axis_with_only_declaration_is_not_violation():
    # Open and only the enum decl -> nothing to enumerate -> clean.
    sites = [_site("a.cs", 1, KIND_DECLARATION, JOBCLASS)]
    model = build_extensibility_model(sites, [_axis(open=True, source="declared")])
    assert not model.has_violations
    assert model.findings[0].edit_count == 1


# --- robustness -----------------------------------------------------------


def test_site_binding_to_no_axis_is_dropped():
    sites = [_site("a.cs", 10, KIND_SWITCH, {"Red", "Green"})]
    model = build_extensibility_model(sites, [_axis()])
    assert model.findings[0].edit_count == 0
    assert not model.has_violations


def test_two_axes_each_get_their_own_findings():
    payload = frozenset({"Json", "Binary", "Xml"})
    sites = [
        _site("a.cs", 1, KIND_DECLARATION, JOBCLASS),
        _site("a.cs", 20, KIND_SWITCH, {"Worker", "Soldier"}),
        _site("p.cs", 1, KIND_DECLARATION, payload),
        _site("p.cs", 9, KIND_SWITCH, {"Json", "Binary"}),
    ]
    axes = [
        _axis(open=True, source="declared"),
        Axis(type_name="PayloadType", instances=payload, open=False, source="intrinsic"),
    ]
    model = build_extensibility_model(sites, axes)
    by_name = {f.axis.type_name: f for f in model.findings}
    assert by_name["JobClass"].edit_count == 2
    assert by_name["PayloadType"].edit_count == 2
    assert by_name["JobClass"].is_violation  # declared open
    assert not by_name["PayloadType"].is_violation  # intrinsic


def test_pure_function_same_inputs_same_model():
    sites = [
        _site("a.cs", 1, KIND_DECLARATION, JOBCLASS),
        _site("a.cs", 20, KIND_SWITCH, {"Worker", "Soldier"}),
    ]
    axes = [_axis(open=True, source="declared")]
    first = build_extensibility_model(sites, axes)
    second = build_extensibility_model(sites, axes)
    assert first == second


def test_empty_inputs_are_clean():
    model = build_extensibility_model([], [])
    assert model.findings == []
    assert not model.has_violations
