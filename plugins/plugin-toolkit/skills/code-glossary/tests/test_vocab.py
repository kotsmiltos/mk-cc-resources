"""Tests for canonical verb vocabulary loader + label validation."""

import pytest

from code_glossary.vocab import (
    UNCLEAR_VERB,
    Vocabulary,
    extract_verb,
    is_valid_verb,
    load_vocab,
    normalize_label,
)


# --- Loader ---

def test_default_vocab_loads():
    v = load_vocab()
    assert isinstance(v, Vocabulary)
    assert v.version >= 1
    assert len(v.verbs) >= 50, f"expected at least 50 verbs; got {len(v.verbs)}"


def test_default_vocab_includes_common_verbs():
    v = load_vocab()
    # These verbs are essential for code-action coverage; any of them missing
    # is a regression in the shipped vocab.
    essentials = {
        "fetch", "load", "parse", "extract", "compute", "compare", "validate",
        "dispose", "allocate", "register", "init", "start", "stop", "filter",
        "render", "serialize", "send",
    }
    missing = essentials - set(v.verbs)
    assert missing == set(), f"shipped vocab missing essential verbs: {missing}"


def test_vocab_membership_includes_unclear():
    v = load_vocab()
    assert UNCLEAR_VERB in v


def test_vocab_describe_returns_string():
    v = load_vocab()
    desc = v.describe("fetch")
    assert isinstance(desc, str) and desc


def test_vocab_describe_missing_returns_none():
    v = load_vocab()
    assert v.describe("nonsense-not-a-verb") is None


# --- extract_verb ---

def test_extract_verb_simple_label():
    assert extract_verb("fetch-user") == "fetch"


def test_extract_verb_single_token():
    assert extract_verb("init") == "init"


def test_extract_verb_multi_kebab():
    assert extract_verb("compare-date-from-api-against-threshold") == "compare"


def test_extract_verb_lowercases():
    assert extract_verb("Fetch-User") == "fetch"


def test_extract_verb_empty_returns_none():
    assert extract_verb("") is None


def test_extract_verb_non_string_returns_none():
    assert extract_verb(None) is None  # type: ignore[arg-type]


# --- is_valid_verb ---

def test_is_valid_verb_known():
    v = load_vocab()
    assert is_valid_verb("fetch", v)


def test_is_valid_verb_unclear_sentinel():
    v = load_vocab()
    assert is_valid_verb(UNCLEAR_VERB, v)


def test_is_valid_verb_unknown():
    v = load_vocab()
    assert not is_valid_verb("foobaragg", v)


# --- normalize_label ---

def test_normalize_label_valid():
    v = load_vocab()
    assert normalize_label("fetch-user-by-id", v) == "fetch-user-by-id"


def test_normalize_label_unclear_passes():
    v = load_vocab()
    assert normalize_label("unclear", v) == "unclear"


def test_normalize_label_rejects_uppercase():
    v = load_vocab()
    with pytest.raises(ValueError, match="lowercase"):
        normalize_label("Fetch-User", v)


def test_normalize_label_rejects_underscore():
    v = load_vocab()
    with pytest.raises(ValueError, match="whitespace or underscores"):
        normalize_label("fetch_user", v)


def test_normalize_label_rejects_whitespace():
    v = load_vocab()
    with pytest.raises(ValueError, match="whitespace or underscores"):
        normalize_label("fetch user", v)


def test_normalize_label_rejects_too_many_tokens():
    v = load_vocab()
    # 7-token label exceeds the v2 max of 6.
    with pytest.raises(ValueError, match=r"exceeds 6 kebab tokens"):
        normalize_label("fetch-user-by-id-from-remote-cache-source", v)


def test_normalize_label_accepts_six_tokens():
    """Real Scalable Crowd labels like 'resolve-spatial-hash-grid-geometry'
    are 5 tokens; the v2 max of 6 must accept these."""
    v = load_vocab()
    assert normalize_label("resolve-spatial-hash-grid-geometry", v) == "resolve-spatial-hash-grid-geometry"
    # Six-token still passes.
    assert normalize_label("dispose-native-resources-with-aggregate-exception", v) == "dispose-native-resources-with-aggregate-exception"


def test_normalize_label_rejects_unknown_verb():
    v = load_vocab()
    with pytest.raises(ValueError, match="not in vocabulary"):
        normalize_label("frobnicate-widget", v)


def test_normalize_label_rejects_empty():
    v = load_vocab()
    with pytest.raises(ValueError, match="non-empty"):
        normalize_label("", v)


def test_normalize_label_rejects_empty_token():
    v = load_vocab()
    with pytest.raises(ValueError, match="empty kebab"):
        normalize_label("fetch--user", v)


# --- Cross-check against the example labels from DESIGN-V2.md ---

def test_design_examples_pass_normalization():
    v = load_vocab()
    # From DESIGN-V2.md piece 2 examples:
    assert normalize_label("fetch-data-from-api", v) == "fetch-data-from-api"
    assert normalize_label("extract-field-from-data", v) == "extract-field-from-data"
    assert normalize_label("compare-value-against-threshold", v) == "compare-value-against-threshold"
    # Composite example (also valid under the rules):
    assert normalize_label("compare-date-against-threshold", v) == "compare-date-against-threshold"
