"""Tests for the tree-sitter structural hash (TypeScript/JavaScript + C#).

Same contract as the Python structural hash: Type-2 clones (renamed
identifiers, different literals) hash equal; different control flow
hashes differently. C# samples mirror the Scalable Crowd
BuildFactoryRegistration pattern — the real-world clone family this
signal must catch.
"""

from __future__ import annotations

from code_glossary.signals.structural import structural_hash


# --- TypeScript ---


TS_FETCH_A = """\
function fetchUser(id: string): Promise<User> {
    const response = api.get('/users/' + id);
    return response.then(r => r.data);
}
"""

# Type-2 clone of TS_FETCH_A: renamed function, params, vars; different literal.
TS_FETCH_B = """\
function loadAccount(key: string): Promise<Account> {
    const reply = client.get('/accounts/' + key);
    return reply.then(x => x.data);
}
"""

TS_DIFFERENT = """\
function sumEvens(nums: number[]): number {
    let total = 0;
    for (const n of nums) {
        if (n % 2 === 0) { total += n; }
    }
    return total;
}
"""


def test_ts_type2_clones_hash_equal():
    a = structural_hash(TS_FETCH_A, "typescript")
    b = structural_hash(TS_FETCH_B, "typescript")
    assert a is not None
    assert a == b


def test_ts_different_shape_hash_differs():
    a = structural_hash(TS_FETCH_A, "typescript")
    c = structural_hash(TS_DIFFERENT, "typescript")
    assert a is not None and c is not None
    assert a != c


def test_ts_literal_value_does_not_affect_hash():
    with_number = """\
function f(x: number) {
    const limit = 5;
    return x + limit;
}
"""
    with_string = """\
function f(x: number) {
    const limit = 'five';
    return x + limit;
}
"""
    assert structural_hash(with_number, "typescript") == structural_hash(
        with_string, "typescript"
    )


def test_ts_comments_do_not_affect_hash():
    without = """\
function f(x: number) {
    const y = x * 2;
    return y;
}
"""
    with_comments = """\
function f(x: number) {
    // double it
    const y = x * 2;
    return y; /* done */
}
"""
    assert structural_hash(without, "typescript") == structural_hash(
        with_comments, "typescript"
    )


def test_ts_class_method_snippet_needs_wrapper():
    """A method body ripped from a class isn't valid top-level TS; the
    class wrapper must recover it."""
    method = """\
load(id: string): User {
    const hit = this.cache.get(id);
    return hit;
}
"""
    assert structural_hash(method, "typescript") is not None


def test_ts_arrow_function_snippet():
    arrow = """\
async (user: User): Promise<void> => {
    const body = JSON.stringify(user);
    await api.post('/users', body);
}
"""
    assert structural_hash(arrow, "typescript") is not None


def test_javascript_uses_same_path():
    js = """\
function clamp(v, lo, hi) {
    const x = Math.max(v, lo);
    return Math.min(x, hi);
}
"""
    assert structural_hash(js, "javascript") is not None


# --- C# ---


CS_REGISTER_A = """\
public static void RegisterFactory()
{
    try { BuildFactory.Register(BuildId.AStarReynolds, Create); }
    catch (System.ArgumentException) { }
}
"""

# Type-2 clone: different build id + method names — the Scalable Crowd family.
CS_REGISTER_B = """\
public static void RegisterAggregate()
{
    try { BuildFactory.Register(BuildId.Aggregate, MakeInstance); }
    catch (System.ArgumentException) { }
}
"""

CS_DIFFERENT = """\
public static int CountActive(List<Agent> agents)
{
    var total = 0;
    foreach (var a in agents) { if (a.Active) { total++; } }
    return total;
}
"""


def test_cs_type2_clones_hash_equal():
    a = structural_hash(CS_REGISTER_A, "csharp")
    b = structural_hash(CS_REGISTER_B, "csharp")
    assert a is not None
    assert a == b


def test_cs_different_shape_hash_differs():
    a = structural_hash(CS_REGISTER_A, "csharp")
    c = structural_hash(CS_DIFFERENT, "csharp")
    assert a is not None and c is not None
    assert a != c


def test_cs_literal_value_does_not_affect_hash():
    five = """\
public int Limit()
{
    var x = 5;
    return x;
}
"""
    text = """\
public int Limit()
{
    var x = "five";
    return x;
}
"""
    assert structural_hash(five, "csharp") == structural_hash(text, "csharp")


def test_cs_method_with_modifiers_parses():
    """'public static ...' is not valid at compilation-unit top level;
    the class wrapper must recover it."""
    assert structural_hash(CS_REGISTER_A, "csharp") is not None


# --- shared contract ---


def test_unsupported_language_returns_none():
    assert structural_hash("def f(): pass", "go") is None


def test_empty_body_returns_none():
    assert structural_hash("", "typescript") is None
    assert structural_hash("   \n  ", "csharp") is None


def test_garbage_returns_none():
    assert structural_hash("((((( {{{ ===", "typescript") is None


def test_deterministic_across_calls():
    a1 = structural_hash(TS_FETCH_A, "typescript")
    a2 = structural_hash(TS_FETCH_A, "typescript")
    assert a1 == a2


def test_ts_and_cs_hashes_do_not_collide_on_same_logic():
    """Cross-language clones are out of scope for the structural signal
    (different grammars -> different node types). Documented behavior."""
    ts = structural_hash(TS_FETCH_A, "typescript")
    cs = structural_hash(CS_REGISTER_A, "csharp")
    assert ts != cs
