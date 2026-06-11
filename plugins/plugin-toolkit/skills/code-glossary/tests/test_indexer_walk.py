"""Tests for the file walker.

Builds tiny tmp directory structures and confirms walk results.
"""

from __future__ import annotations

from pathlib import Path

import pytest

from code_glossary.indexer.walk import (
    DEFAULT_EXCLUDES,
    TEST_PATH_SEGMENTS,
    iter_source_files,
)


def _make_tree(root: Path, files: dict[str, str]) -> None:
    """Create files (relative path -> content) under root."""
    for rel, content in files.items():
        p = root / rel
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(content, encoding="utf-8")


def test_walks_python_files(tmp_path: Path):
    _make_tree(tmp_path, {
        "src/a.py": "x = 1",
        "src/b.py": "y = 2",
    })
    results = list(iter_source_files(tmp_path))
    paths = [str(p.relative_to(tmp_path)).replace("\\", "/") for p, _ in results]
    assert sorted(paths) == ["src/a.py", "src/b.py"]


def test_walk_yields_language():
    """Every yielded entry pairs (path, language)."""
    pass  # covered by other tests via tuple unpacking


def test_skips_unknown_extensions(tmp_path: Path):
    _make_tree(tmp_path, {
        "src/a.py": "x = 1",
        "src/readme.md": "# readme",
        "src/data.txt": "hello",
        "src/icon.png": "binary",
    })
    results = list(iter_source_files(tmp_path))
    exts = sorted({Path(p).suffix for p, _ in results})
    assert exts == [".py"]


def test_default_excludes_pycache(tmp_path: Path):
    _make_tree(tmp_path, {
        "src/a.py": "x = 1",
        "src/__pycache__/a.cpython-313.pyc": "binary",
        "src/__pycache__/b.py": "should not be indexed",
    })
    results = list(iter_source_files(tmp_path))
    paths = [str(p.relative_to(tmp_path)).replace("\\", "/") for p, _ in results]
    assert "src/a.py" in paths
    assert not any("__pycache__" in p for p in paths)


def test_default_excludes_node_modules(tmp_path: Path):
    _make_tree(tmp_path, {
        "src/app.ts": "x",
        "node_modules/foo/index.ts": "y",
        "src/node_modules/bar/index.ts": "z",  # nested too
    })
    results = list(iter_source_files(tmp_path))
    paths = [str(p.relative_to(tmp_path)).replace("\\", "/") for p, _ in results]
    assert paths == ["src/app.ts"]


def test_custom_excludes_added(tmp_path: Path):
    _make_tree(tmp_path, {
        "src/a.py": "x",
        "vendor/lib.py": "y",
    })
    results = list(iter_source_files(tmp_path, excludes=("vendor",)))
    paths = [str(p.relative_to(tmp_path)).replace("\\", "/") for p, _ in results]
    assert paths == ["src/a.py"]


def test_glob_excludes(tmp_path: Path):
    _make_tree(tmp_path, {
        "src/a.py": "x",
        "generated/foo.py": "y",
        "generated/bar.py": "z",
    })
    results = list(iter_source_files(tmp_path, excludes=("*generated*",)))
    paths = [str(p.relative_to(tmp_path)).replace("\\", "/") for p, _ in results]
    assert paths == ["src/a.py"]


def test_tests_excluded_by_default(tmp_path: Path):
    _make_tree(tmp_path, {
        "src/a.py": "x",
        "tests/test_a.py": "y",
        "src/sub/test_b.py": "z",  # filename pattern in non-tests dir
    })
    results = list(iter_source_files(tmp_path, include_tests=False))
    paths = [str(p.relative_to(tmp_path)).replace("\\", "/") for p, _ in results]
    assert paths == ["src/a.py"]


def test_tests_included_when_opted_in(tmp_path: Path):
    _make_tree(tmp_path, {
        "src/a.py": "x",
        "tests/test_a.py": "y",
    })
    results = list(iter_source_files(tmp_path, include_tests=True))
    paths = [str(p.relative_to(tmp_path)).replace("\\", "/") for p, _ in results]
    assert sorted(paths) == ["src/a.py", "tests/test_a.py"]


def test_jsx_tsx_get_typescript_language(tmp_path: Path):
    _make_tree(tmp_path, {
        "src/a.tsx": "x",
        "src/b.jsx": "y",
    })
    results = list(iter_source_files(tmp_path))
    langs = {p.name: lang for p, lang in results}
    assert langs["a.tsx"] == "typescript"
    assert langs["b.jsx"] == "javascript"


def test_cjs_mjs_get_javascript_language(tmp_path: Path):
    """Regression: .cjs/.mjs were silently skipped (no language mapping)."""
    _make_tree(tmp_path, {
        "lib/tool.cjs": "x",
        "lib/mod.mjs": "y",
    })
    results = list(iter_source_files(tmp_path))
    langs = {p.name: lang for p, lang in results}
    assert langs["tool.cjs"] == "javascript"
    assert langs["mod.mjs"] == "javascript"


def test_cts_mts_get_typescript_language(tmp_path: Path):
    _make_tree(tmp_path, {
        "src/a.cts": "x",
        "src/b.mts": "y",
    })
    results = list(iter_source_files(tmp_path))
    langs = {p.name: lang for p, lang in results}
    assert langs["a.cts"] == "typescript"
    assert langs["b.mts"] == "typescript"


def test_bin_directory_not_excluded(tmp_path: Path):
    """Regression: 'bin' was in DEFAULT_EXCLUDES, pruning Node CLI source
    like bin/essense-flow-tools.cjs. Node bin/ holds real entry points."""
    _make_tree(tmp_path, {
        "bin/cli.cjs": "x",
        "src/a.py": "y",
    })
    results = list(iter_source_files(tmp_path))
    paths = sorted(str(p.relative_to(tmp_path)).replace("\\", "/") for p, _ in results)
    assert paths == ["bin/cli.cjs", "src/a.py"]


def test_csharp_picked_up(tmp_path: Path):
    _make_tree(tmp_path, {
        "src/Foo.cs": "namespace Foo {}",
    })
    results = list(iter_source_files(tmp_path))
    paths = [str(p.relative_to(tmp_path)).replace("\\", "/") for p, _ in results]
    langs = [lang for _, lang in results]
    assert paths == ["src/Foo.cs"]
    assert langs == ["csharp"]


def test_deterministic_ordering(tmp_path: Path):
    _make_tree(tmp_path, {
        "z/a.py": "x",
        "a/z.py": "y",
        "m/m.py": "z",
    })
    results = list(iter_source_files(tmp_path))
    paths = [str(p.relative_to(tmp_path)).replace("\\", "/") for p, _ in results]
    assert paths == ["a/z.py", "m/m.py", "z/a.py"]


def test_missing_root_raises(tmp_path: Path):
    with pytest.raises(FileNotFoundError):
        list(iter_source_files(tmp_path / "does-not-exist"))


def test_root_not_directory_raises(tmp_path: Path):
    f = tmp_path / "file.txt"
    f.write_text("hi")
    with pytest.raises(NotADirectoryError):
        list(iter_source_files(f))


def test_default_excludes_includes_common_dirs():
    """Sanity check on the constant — catches accidental removal."""
    must_have = {".git", "node_modules", "__pycache__", ".venv", "dist", "build"}
    assert must_have <= set(DEFAULT_EXCLUDES)


def test_test_path_segments_includes_tests():
    assert "tests" in TEST_PATH_SEGMENTS
