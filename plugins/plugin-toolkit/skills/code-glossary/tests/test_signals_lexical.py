"""Tests for the lexical signal."""

from __future__ import annotations

from code_glossary.signals.lexical import (
    MIN_TOKEN_LEN,
    STOPWORDS,
    tokenize_body,
    tokenize_label,
)


# --- tokenize_body ---

def test_extracts_identifiers():
    body = "def parse_date(s):\n    result = parse_iso(s)\n    return result"
    tokens = tokenize_body(body)
    assert "parse_date" in tokens
    assert "result" in tokens
    assert "parse_iso" in tokens


def test_lowercases():
    """Identifiers are lowercased regardless of source casing."""
    body = "DoThingSpecial(MyArg)"
    tokens = tokenize_body(body)
    assert "dothingspecial" in tokens
    assert "myarg" in tokens
    # Source casing must not survive.
    assert "DoThingSpecial" not in tokens


def test_filters_short_tokens():
    body = "a = 1\nbi = 2\ncat = 3"
    tokens = tokenize_body(body)
    assert "a" not in tokens
    assert "bi" not in tokens
    assert "cat" in tokens  # exactly MIN_TOKEN_LEN passes


def test_filters_stopwords():
    body = "def f(self, args):\n    return self.x"
    tokens = tokenize_body(body)
    assert "self" not in tokens
    assert "args" not in tokens


def test_filters_python_keywords():
    body = "if True and not False:\n    return None\nelse:\n    raise Exception()"
    tokens = tokenize_body(body)
    # 'if', 'and', 'not', 'else', 'raise' are too short or keywords;
    # 'true', 'false', 'none' are stopwords / keywords; 'exception' should remain.
    assert "true" not in tokens
    assert "false" not in tokens
    assert "none" not in tokens
    assert "exception" in tokens


def test_pure_numbers_excluded():
    body = "x = 42\ny = 100"
    tokens = tokenize_body(body)
    assert "42" not in tokens
    assert "100" not in tokens


def test_extra_stopwords_applied():
    body = "fetch_user_record"
    tokens = tokenize_body(body, extra_stopwords=("fetch_user_record",))
    assert "fetch_user_record" not in tokens


def test_returns_frozenset():
    body = "def f():\n    x = 1\n    return x"
    tokens = tokenize_body(body)
    assert isinstance(tokens, frozenset)


def test_empty_body_returns_empty():
    assert tokenize_body("") == frozenset()


def test_compound_identifiers_kept_whole():
    """snake_case and camelCase tokens stay as-is (single token, not split)."""
    body = "user_id = getUserId()"
    tokens = tokenize_body(body)
    assert "user_id" in tokens
    assert "getuserid" in tokens


def test_attribute_chains_tokenized_individually():
    """foo.bar.baz tokenizes to {foo, bar, baz} (separately)."""
    body = "x = requests.get('url').json()"
    tokens = tokenize_body(body)
    assert "requests" in tokens
    assert "get" in tokens
    assert "json" in tokens


def test_stopwords_contains_python_keywords():
    """sanity: 'class', 'def', 'return', etc. are all stopwords."""
    for kw in ("class", "def", "return", "yield", "import", "from", "with", "while"):
        assert kw in STOPWORDS


def test_min_token_len_constant():
    assert MIN_TOKEN_LEN == 3


# --- tokenize_label ---

def test_label_kebab_split():
    assert tokenize_label("fetch-user-by-id") == ("fetch", "user", "by", "id")


def test_label_single_token():
    assert tokenize_label("init") == ("init",)


def test_label_empty():
    assert tokenize_label("") == ()


def test_label_preserves_order():
    """Order matters — verb position is semantically meaningful."""
    a = tokenize_label("fetch-user")
    b = tokenize_label("user-fetch")
    assert a != b
