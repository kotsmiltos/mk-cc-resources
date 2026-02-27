# File Report: `models.py`

**Path:** `plugins/schema-scout/skills/schema-scout/tool/schema_scout/models.py`
**LOC:** 117

---

## 1. Purpose

Data model definitions for the schema analysis output. Provides two dataclasses -- `FieldStats` for per-field statistics and `SchemaNode` for the recursive schema tree -- along with serialization (`to_dict` / `from_dict`) and traversal methods.

## 2. Key Components

### `FieldStats` Dataclass

| Field | Type | Purpose |
|-------|------|---------|
| `path` | `str` | Dot-separated field path |
| `types_seen` | `dict[str, int]` | Type name -> observation count |
| `total_count` | `int` | Total observations |
| `null_count` | `int` | Null observations |
| `unique_count` | `int \| None` | Exact unique count (`None` when capped at threshold) |
| `unique_values` | `list[Any] \| None` | All unique values (when <= 50 unique) |
| `sample_values` | `list[Any] \| None` | Reservoir sample (when > 50 unique) |
| `value_counts` | `dict[str, int] \| None` | Value -> frequency mapping (when not capped) |
| `min_value` | `Any` | Minimum numeric value observed |
| `max_value` | `Any` | Maximum numeric value observed |

### `SchemaNode` Dataclass

| Field | Type | Purpose |
|-------|------|---------|
| `name` | `str` | Node name (column name, dict key, or `[]` for array items) |
| `full_path` | `str` | Complete dot-separated path from the root |
| `children` | `dict[str, SchemaNode]` | Child nodes (non-empty for branch nodes) |
| `stats` | `FieldStats \| None` | Leaf node statistics (`None` for branch nodes) |
| `is_array` | `bool` | Whether this node represents an array marker |
| `is_json_column` | `bool` | Whether this column was detected as JSON-in-JSON |
| `occurrence_count` | `int` | Number of rows containing this path |

### Methods

| Method | Class | Purpose |
|--------|-------|---------|
| `to_dict()` | Both | Serialize to a plain dict for JSON output |
| `from_dict(data)` | Both | Class method to deserialize from a dict |
| `find_node(path)` | `SchemaNode` | Recursive DFS lookup by dot-separated path |
| `get_all_paths()` | `SchemaNode` | Return all leaf paths (nodes with stats and no children) |

## 3. Dependencies

None. Pure Python dataclasses with no external or internal imports (stdlib `dataclasses` and `typing` only).

## 4. Patterns / Conventions

- **Pure dataclasses** -- no behavior beyond serialization and traversal; all analysis logic lives in `analyzer.py`
- **Recursive structure** -- `SchemaNode` contains a `dict[str, SchemaNode]` of children, forming a tree
- **Manual serialization** -- `to_dict()` / `from_dict()` handle recursive conversion without external libraries
- **`find_node`** uses recursive DFS -- O(n) where n is total node count; acceptable for typical schema sizes
- **`get_all_paths`** filters to leaf nodes only (nodes with stats and no children)
- Uses `X | Y` union syntax (requires Python >= 3.10)

## 5. Data & Side Effects

- No side effects -- pure data containers
- No I/O, no mutable module-level state
- `from_dict` creates new instances from dict data (no in-place mutation)

## 6. Risks / Issues

| Severity | Issue |
|----------|-------|
| Low | `from_dict` does not validate input -- will raise `KeyError` on malformed data with no descriptive error message |
| Info | `find_node` is O(n) per call; could become slow on extremely large schemas with thousands of paths, though this is unlikely in practice |

## 7. Health Assessment

**Healthy**

- Clean, focused data model with no external dependencies
- Serialization round-trip is straightforward
- Only minor concern is the lack of input validation in `from_dict`

## 8. Test Coverage Hints

- Serialization round-trip: create `FieldStats` and `SchemaNode` instances, call `to_dict()`, then `from_dict()`, and assert equality
- `find_node`: test with nested trees, missing paths, and root-level lookups
- `get_all_paths`: test with trees containing branch-only nodes, leaf-only nodes, and mixed structures
- `from_dict` error behavior: test with missing keys and unexpected types to document current failure modes

## 9. Suggested Improvements

- Add input validation to `from_dict` with clear error messages describing which field is missing or malformed
- Consider adding `__eq__` to both dataclasses for easier testing (if not already provided by `@dataclass` defaults)
- Add a `depth` or `node_count` property to `SchemaNode` for diagnostics and display
