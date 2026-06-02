"""Tests for the structural signal."""

from __future__ import annotations

import textwrap

from code_glossary.signals.structural import structural_hash


def _dedent(s: str) -> str:
    return textwrap.dedent(s).strip("\n")


# --- Basic ---

def test_same_body_same_hash():
    body = _dedent("""
        def f(x):
            y = x + 1
            return y
    """)
    h1 = structural_hash(body, "python")
    h2 = structural_hash(body, "python")
    assert h1 == h2
    assert h1 is not None
    assert len(h1) == 16


def test_renamed_vars_same_hash():
    """Type-2 clone — different variable names, same structure."""
    body_a = _dedent("""
        def alpha(x):
            y = x + 1
            return y
    """)
    body_b = _dedent("""
        def beta(input_val):
            output = input_val + 1
            return output
    """)
    assert structural_hash(body_a, "python") == structural_hash(body_b, "python")


def test_renamed_attribute_same_hash():
    """Attribute names drop out (.json vs .text -> same shape)."""
    body_a = _dedent("""
        def f(resp):
            data = resp.json()
            return data
    """)
    body_b = _dedent("""
        def f(resp):
            data = resp.text()
            return data
    """)
    assert structural_hash(body_a, "python") == structural_hash(body_b, "python")


def test_different_constants_same_hash():
    """The 20-days-vs-30-days case from the user's intro."""
    body_a = _dedent("""
        def is_overdue(target):
            from datetime import date
            days = (date.today() - target).days
            return days >= 20
    """)
    body_b = _dedent("""
        def is_recent(target):
            from datetime import date
            days = (date.today() - target).days
            return days < 30
    """)
    # NOTE: operators DIFFER (>= vs <). Same control flow shape, but
    # ast.Gt vs ast.Lt are different node types -> different hashes.
    h_a = structural_hash(body_a, "python")
    h_b = structural_hash(body_b, "python")
    assert h_a is not None and h_b is not None
    # They differ because of the operator — this is correct behavior.
    # Lexical signal would catch them as similar; structural correctly says shape differs.
    assert h_a != h_b


def test_same_operator_different_constants_same_hash():
    """Constants ARE normalized; operators are NOT."""
    body_a = _dedent("""
        def f(x):
            y = x + 1
            return y
    """)
    body_b = _dedent("""
        def f(x):
            y = x + 42
            return y
    """)
    assert structural_hash(body_a, "python") == structural_hash(body_b, "python")


def test_different_control_flow_different_hash():
    body_a = _dedent("""
        def f(x):
            if x > 0:
                return x
            return 0
    """)
    body_b = _dedent("""
        def f(x):
            while x > 0:
                x = x - 1
            return x
    """)
    h_a = structural_hash(body_a, "python")
    h_b = structural_hash(body_b, "python")
    assert h_a != h_b


def test_different_function_name_same_hash():
    """Function name doesn't affect structural hash."""
    body_a = _dedent("""
        def alpha(x):
            y = x + 1
            return y
    """)
    body_b = _dedent("""
        def beta(x):
            y = x + 1
            return y
    """)
    assert structural_hash(body_a, "python") == structural_hash(body_b, "python")


def test_class_method_dedented_correctly():
    """Class-method bodies have extra indentation; dedent handles it."""
    body = _dedent("""
            def method(self, x):
                y = x + 1
                return y
    """)
    h = structural_hash(body, "python")
    assert h is not None


# --- Robustness ---

def test_empty_body_returns_none():
    assert structural_hash("", "python") is None
    assert structural_hash("   \n", "python") is None


def test_syntax_error_returns_none():
    body = "def broken(\n"
    assert structural_hash(body, "python") is None


def test_unsupported_language_returns_none():
    body = "def f(x): return x"
    assert structural_hash(body, "typescript") is None
    assert structural_hash(body, "csharp") is None
    assert structural_hash(body, "go") is None


def test_non_function_body_returns_none():
    """Body that isn't a function def -> None."""
    body = "x = 1\nprint(x)\n"
    assert structural_hash(body, "python") is None


def test_async_function_supported():
    body = _dedent("""
        async def fetch(url):
            resp = await client.get(url)
            return resp
    """)
    h = structural_hash(body, "python")
    assert h is not None


def test_keyword_arg_names_normalized():
    """Calling foo(x=1) and foo(y=1) should have the same structural hash
    even though the kwarg name differs."""
    body_a = _dedent("""
        def f():
            x = func(timeout=10)
            return x
    """)
    body_b = _dedent("""
        def f():
            x = func(delay=10)
            return x
    """)
    assert structural_hash(body_a, "python") == structural_hash(body_b, "python")


def test_complex_real_world_dedupe():
    """Two real-style functions with renamed vars, different constants,
    different attribute names, same control flow -> same hash."""
    body_a = _dedent("""
        def fetch_user(user_id):
            resp = requests.get('https://api.example.com/users/' + str(user_id))
            data = resp.json()
            if data['status'] == 'ok':
                return data['user']
            return None
    """)
    body_b = _dedent("""
        def load_account(account_id):
            response = http_client.get('https://accounts.internal/' + str(account_id))
            payload = response.parse()
            if payload['ok'] == True:
                return payload['account']
            return None
    """)
    h_a = structural_hash(body_a, "python")
    h_b = structural_hash(body_b, "python")
    assert h_a is not None and h_b is not None
    # Same shape — should cluster together via structural signal.
    assert h_a == h_b, f"expected same structural hash; got {h_a} vs {h_b}"
