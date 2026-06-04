"""Tests for the tree-sitter Stage 1 parser (TypeScript/JavaScript + C#).

Mirrors test_indexer_python's coverage: extraction fields, skip rules,
deterministic IDs, relative paths. Samples modeled on real shapes from
the Scalable Crowd dogfood corpus (C#) and typical TS service code.
"""

from __future__ import annotations

from pathlib import Path

import pytest

from code_glossary.indexer.treesitter_parser import parse_file


# --- fixtures ---


TS_SAMPLE = """\
import { api } from './api';

export function fetchUser(id: string): Promise<User> {
    const r = api.get('/users/' + id);
    return r.then(x => x.data);
}

const saveUser = async (user: User, retries?: number): Promise<void> => {
    const body = JSON.stringify(user);
    await api.post('/users', body);
};

export class UserService {
    private cache = new Map<string, User>();

    load(id: string): User {
        const hit = this.cache.get(id);
        return hit;
    }
}

// Anonymous + trivial cases that must be skipped:
setTimeout(() => {
    console.log('tick');
    console.log('tock');
}, 1000);

function tiny(): number { return 42; }

function* counter(limit: number) {
    let i = 0;
    while (i < limit) { yield i; i += 1; }
}

function spread(...rest: number[]): number {
    const total = rest.reduce((a, b) => a + b, 0);
    return total;
}
"""

CSHARP_SAMPLE = """\
namespace Crowd.Builds
{
    public static class FactoryRegistration
    {
        public static void RegisterFactory()
        {
            try { BuildFactory.Register(BuildId.AStarReynolds, Create); }
            catch (System.ArgumentException) { }
        }

        public static string Describe(BuildId id, params object[] args)
        {
            var spec = Registry.Get(id);
            return spec.Name + " v" + spec.Version;
        }
    }

    public class Spawner
    {
        private readonly int _max;

        public Spawner(int max)
        {
            _max = max;
            Init();
        }

        public void Run()
        {
            void Step(int i)
            {
                var agent = new Agent(i);
                agents.Add(agent);
            }
            Step(0);
            Step(1);
        }

        // Expression-bodied: one statement, must be skipped.
        public int Max() => _max;
    }
}
"""


@pytest.fixture()
def ts_file(tmp_path: Path) -> Path:
    p = tmp_path / "src" / "userService.ts"
    p.parent.mkdir(parents=True)
    p.write_text(TS_SAMPLE, encoding="utf-8")
    return p


@pytest.fixture()
def cs_file(tmp_path: Path) -> Path:
    p = tmp_path / "Assets" / "FactoryRegistration.cs"
    p.parent.mkdir(parents=True)
    p.write_text(CSHARP_SAMPLE, encoding="utf-8")
    return p


# --- TypeScript ---


def test_ts_function_names(ts_file: Path, tmp_path: Path):
    records = parse_file(ts_file, "typescript", rel_to=tmp_path)
    names = {r.location.function for r in records}
    # fetchUser: 2 statements; saveUser: 2; load: 2; counter: 2; spread: 2.
    assert names == {"fetchUser", "saveUser", "load", "counter", "spread"}


def test_ts_skips_anonymous_and_tiny(ts_file: Path, tmp_path: Path):
    records = parse_file(ts_file, "typescript", rel_to=tmp_path)
    names = {r.location.function for r in records}
    assert "tiny" not in names  # 1 statement < MIN_BODY_STATEMENTS
    # The setTimeout callback has 2 statements but no binding name.
    bodies = [r.body for r in records]
    assert not any("tick" in b for b in bodies)


def test_ts_function_declaration_fields(ts_file: Path, tmp_path: Path):
    records = parse_file(ts_file, "typescript", rel_to=tmp_path)
    fetch = next(r for r in records if r.location.function == "fetchUser")
    assert fetch.language == "typescript"
    assert fetch.location.file == "src/userService.ts"
    assert fetch.location.line == 3
    # 'export' belongs to the parent export_statement node, not the
    # function_declaration — the signature starts at 'function'.
    assert fetch.signature == "function fetchUser(id: string): Promise<User>"
    assert fetch.notable_inputs == ["id: string"]
    assert fetch.notable_outputs == "Promise<User>"
    assert "api.get" in fetch.notable_calls
    assert "'/users/'" in fetch.inline_constants
    assert fetch.body.startswith("function fetchUser") or fetch.body.startswith("export")
    assert fetch.functionality_label == ""  # LLM fills later


def test_ts_arrow_bound_to_const(ts_file: Path, tmp_path: Path):
    records = parse_file(ts_file, "typescript", rel_to=tmp_path)
    save = next(r for r in records if r.location.function == "saveUser")
    # Name prefixed onto the header; trailing arrow stripped, generics intact.
    assert save.signature == "saveUser = async (user: User, retries?: number): Promise<void>"
    assert save.notable_inputs == ["user: User", "retries: number"]
    assert save.notable_outputs == "Promise<void>"
    assert "api.post" in save.notable_calls
    assert "JSON.stringify" in save.notable_calls


def test_ts_class_method(ts_file: Path, tmp_path: Path):
    records = parse_file(ts_file, "typescript", rel_to=tmp_path)
    load = next(r for r in records if r.location.function == "load")
    assert load.signature == "load(id: string): User"
    assert load.notable_inputs == ["id: string"]
    assert load.notable_outputs == "User"
    assert "this.cache.get" in load.notable_calls


def test_ts_rest_parameter(ts_file: Path, tmp_path: Path):
    records = parse_file(ts_file, "typescript", rel_to=tmp_path)
    spread = next(r for r in records if r.location.function == "spread")
    assert spread.notable_inputs == ["*rest"]


def test_ts_generator(ts_file: Path, tmp_path: Path):
    records = parse_file(ts_file, "typescript", rel_to=tmp_path)
    counter = next(r for r in records if r.location.function == "counter")
    assert counter.notable_inputs == ["limit: number"]


def test_tsx_component(tmp_path: Path):
    p = tmp_path / "Greeting.tsx"
    p.write_text(
        """\
export const Greeting = ({name}: {name: string}) => {
    const text = 'Hello ' + name;
    return <div>{text}</div>;
};
""",
        encoding="utf-8",
    )
    records = parse_file(p, "typescript", rel_to=tmp_path)
    assert len(records) == 1
    assert records[0].location.function == "Greeting"


def test_js_plain(tmp_path: Path):
    p = tmp_path / "util.js"
    p.write_text(
        """\
function clamp(v, lo, hi) {
    const x = Math.max(v, lo);
    return Math.min(x, hi);
}
""",
        encoding="utf-8",
    )
    records = parse_file(p, "javascript", rel_to=tmp_path)
    assert len(records) == 1
    rec = records[0]
    assert rec.language == "javascript"
    assert rec.notable_inputs == ["v", "lo", "hi"]  # unannotated
    assert rec.notable_outputs is None
    assert "Math.max" in rec.notable_calls


# --- C# ---


def test_cs_method_names(cs_file: Path, tmp_path: Path):
    records = parse_file(cs_file, "csharp", rel_to=tmp_path)
    names = {r.location.function for r in records}
    # RegisterFactory: try is 1 stmt + catch? try_statement is one named
    # statement; that method has 1 statement -> skipped? No: try{...}catch{}
    # is a single try_statement = 1 named child -> skipped by the floor.
    # Describe: 2; Spawner ctor: 2; Run: 3 (local fn + 2 calls); Step: 2.
    # Max(): expression-bodied -> skipped.
    assert "Describe" in names
    assert "Spawner" in names
    assert "Run" in names
    assert "Step" in names
    assert "Max" not in names


def test_cs_method_fields(cs_file: Path, tmp_path: Path):
    records = parse_file(cs_file, "csharp", rel_to=tmp_path)
    desc = next(r for r in records if r.location.function == "Describe")
    assert desc.language == "csharp"
    assert desc.location.file == "Assets/FactoryRegistration.cs"
    assert desc.signature == "public static string Describe(BuildId id, params object[] args)"
    assert desc.notable_inputs == ["id: BuildId", "*args"]
    assert desc.notable_outputs == "string"
    assert "Registry.Get" in desc.notable_calls
    assert '" v"' in desc.inline_constants


def test_cs_constructor(cs_file: Path, tmp_path: Path):
    records = parse_file(cs_file, "csharp", rel_to=tmp_path)
    ctor = next(r for r in records if r.location.function == "Spawner")
    assert ctor.notable_inputs == ["max: int"]
    assert ctor.notable_outputs is None  # constructors have no return type
    assert "Init" in ctor.notable_calls


def test_cs_local_function(cs_file: Path, tmp_path: Path):
    records = parse_file(cs_file, "csharp", rel_to=tmp_path)
    step = next(r for r in records if r.location.function == "Step")
    assert step.notable_inputs == ["i: int"]
    assert step.notable_outputs == "void"
    assert "new Agent" in step.notable_calls
    assert "agents.Add" in step.notable_calls


def test_cs_run_contains_local_call(cs_file: Path, tmp_path: Path):
    records = parse_file(cs_file, "csharp", rel_to=tmp_path)
    run = next(r for r in records if r.location.function == "Run")
    assert "Step" in run.notable_calls


# --- shared behaviors ---


def test_deterministic_ids(ts_file: Path, tmp_path: Path):
    a = parse_file(ts_file, "typescript", rel_to=tmp_path)
    b = parse_file(ts_file, "typescript", rel_to=tmp_path)
    assert [r.id for r in a] == [r.id for r in b]
    assert all(r.id.startswith("fn-") for r in a)


def test_unreadable_file_returns_empty(tmp_path: Path):
    missing = tmp_path / "ghost.ts"
    assert parse_file(missing, "typescript", rel_to=tmp_path) == []


def test_unsupported_language_returns_empty(tmp_path: Path):
    p = tmp_path / "main.go"
    p.write_text("package main", encoding="utf-8")
    assert parse_file(p, "go", rel_to=tmp_path) == []


def test_garbage_input_no_crash(tmp_path: Path):
    p = tmp_path / "broken.ts"
    p.write_text("function ((((( {{{ ===", encoding="utf-8")
    # tree-sitter is error-tolerant; must not raise, and the garbage has
    # no well-formed 2-statement function to emit.
    records = parse_file(p, "typescript", rel_to=tmp_path)
    assert records == []
