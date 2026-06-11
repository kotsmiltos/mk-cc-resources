'use strict';
// lib/schema-validate.cjs — generic shape validator driven by
// references/schemas/*.schema.yaml.
//
// Why this exists: shape checks used to be hand-coded per validator, and the
// copies drifted into mutual contradiction (one validator required
// `file_write_contract.paths`, a sibling in the same file required
// `.allowed`; templates taught a third shape). A schema file is the only
// place an artifact's shape may be defined; every validator, template, and
// agent-def shape block derives from it.
//
// Schema field spec keys (all optional unless noted):
//   type            int | string | bool | array | object | iso8601 (REQUIRED)
//   required        bool — key must be present (enforced by requiredKeys()
//                   loops at the op layer; validate() treats absent optional
//                   fields and null-valued optional fields as "skip")
//   const           exact value (ints)
//   min             minimum value (ints)
//   pattern         regex source string (strings)
//   enum            closed value list (strings)
//   nonempty        true → trim() !== '' (strings)
//   items           { type, pattern?, has_keys? } — per-element check (arrays)
//   item_observed   'item' → report the failing element, default reports the
//                   whole array (legacy message compat)
//   fields          nested field map (objects); nested keys report as
//                   'parent.child' unless report_as_parent
//   report_as_parent true → nested failure reports the PARENT key + parent
//                   `expected` (legacy message compat for file_write_contract)
//   nullable_iff    { field, equals } — null accepted iff sibling field
//                   equals the given value
//   nullable        true — null accepted outright
//   expected        error-message override (CLI message contract)
//
// Return contract (identical to the legacy hand-coded validators):
//   { ok: true } | { ok: false, key, observed, expected }

const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

const SCHEMAS_DIR = path.resolve(__dirname, '..', 'references', 'schemas');

// Cache per absolute path + mtime so repeated validations in one process
// don't re-read, but schema edits are picked up across invocations.
const schemaCache = new Map();

function loadSchema(artifact) {
  const file = path.join(SCHEMAS_DIR, `${artifact}.schema.yaml`);
  const stat = fs.statSync(file); // throws loudly if missing — schema absence is a packaging bug
  const cached = schemaCache.get(file);
  if (cached && cached.mtimeMs === stat.mtimeMs) return cached.schema;
  const schema = yaml.load(fs.readFileSync(file, 'utf8'));
  if (!schema || typeof schema !== 'object' || !schema.fields) {
    throw new Error(`schema-validate: ${file} is not a valid schema document (missing fields map)`);
  }
  schemaCache.set(file, { mtimeMs: stat.mtimeMs, schema });
  return schema;
}

function requiredKeys(schema) {
  return Object.entries(schema.fields)
    .filter(([, spec]) => spec.required === true)
    .map(([name]) => name);
}

function schemaEnum(schema, fieldPath) {
  // Resolve an enum list out of the schema (e.g. 'status' or 'agent_claim.status').
  let spec = { fields: schema.fields };
  for (const part of fieldPath.split('.')) {
    spec = spec.fields && spec.fields[part];
    if (!spec) throw new Error(`schema-validate: no field '${fieldPath}' in schema '${schema.artifact}'`);
  }
  if (!Array.isArray(spec.enum)) throw new Error(`schema-validate: field '${fieldPath}' has no enum`);
  return spec.enum;
}

function observedFor(spec, value) {
  if (spec.type === 'array' || spec.type === 'object') return JSON.stringify(value);
  return String(value);
}

function fail(key, spec, value, expectedOverride) {
  return {
    ok: false,
    key,
    observed: observedFor(spec, value),
    expected: expectedOverride || spec.expected || defaultExpected(spec),
  };
}

function defaultExpected(spec) {
  switch (spec.type) {
    case 'int': return spec.const !== undefined ? `int frozen at ${spec.const}` : 'int';
    case 'string': return spec.enum ? `enum [${spec.enum.join(', ')}]`
      : spec.nonempty ? 'non-empty string' : 'string';
    case 'bool': return 'bool (true / false)';
    case 'array': return 'array';
    case 'object': return 'object (mapping)';
    case 'iso8601': return 'ISO 8601 datetime string';
    default: return spec.type;
  }
}

function validateField(keyPath, spec, value, doc, parent) {
  // null handling — order matters: nullable rules are about ACCEPTING null,
  // so they run before the type check rejects it.
  if (value === null || value === undefined) {
    if (spec.nullable === true) return { ok: true };
    if (spec.nullable_iff) {
      const sibling = doc[spec.nullable_iff.field];
      if (sibling === spec.nullable_iff.equals) return { ok: true };
      return fail(keyPath, spec, value);
    }
    if (spec.required !== true) {
      // optional field absent-or-null → skip (legacy "when present" semantics)
      return { ok: true };
    }
    return fail(keyPath, spec, value);
  }

  switch (spec.type) {
    case 'int': {
      if (typeof value !== 'number' || !Number.isInteger(value)) return fail(keyPath, spec, value);
      if (spec.const !== undefined && value !== spec.const) return fail(keyPath, spec, value);
      if (spec.min !== undefined && value < spec.min) return fail(keyPath, spec, value);
      return { ok: true };
    }
    case 'string': {
      if (typeof value !== 'string') return fail(keyPath, spec, value);
      if (spec.enum && !spec.enum.includes(value)) return fail(keyPath, spec, value);
      if (spec.pattern && !new RegExp(spec.pattern).test(value)) return fail(keyPath, spec, value);
      if (spec.nonempty && value.trim() === '') return fail(keyPath, spec, value);
      return { ok: true };
    }
    case 'bool': {
      if (typeof value !== 'boolean') return fail(keyPath, spec, value);
      return { ok: true };
    }
    case 'iso8601': {
      if (typeof value !== 'string') return fail(keyPath, spec, value, spec.expected || 'ISO 8601 datetime string');
      if (Number.isNaN(new Date(value).getTime())) {
        return { ok: false, key: keyPath, observed: value, expected: (spec.expected || 'ISO 8601 datetime string') + ' (parseable)' };
      }
      return { ok: true };
    }
    case 'array': {
      if (!Array.isArray(value)) return fail(keyPath, spec, value);
      if (spec.min_items !== undefined && value.length < spec.min_items) return fail(keyPath, spec, value);
      if (spec.items) {
        for (const el of value) {
          if (!itemOk(spec.items, el)) {
            if (spec.item_observed === 'item') {
              return { ok: false, key: keyPath, observed: JSON.stringify(el), expected: spec.expected || defaultExpected(spec) };
            }
            return fail(keyPath, spec, value);
          }
        }
      }
      return { ok: true };
    }
    case 'object': {
      if (typeof value !== 'object' || Array.isArray(value)) return fail(keyPath, spec, value);
      if (spec.fields) {
        for (const [name, childSpec] of Object.entries(spec.fields)) {
          const childVal = value[name];
          const present = name in value;
          if (!present || childVal === null || childVal === undefined) {
            if (childSpec.required === true) {
              // missing required nested field
              if (childSpec.report_as_parent) return fail(keyPath, spec, value);
              return fail(`${keyPath}.${name}`, childSpec, childVal);
            }
            continue; // optional nested field absent/null → skip
          }
          const res = validateField(`${keyPath}.${name}`, childSpec, childVal, value, keyPath);
          if (!res.ok) {
            if (childSpec.report_as_parent) return fail(keyPath, spec, value);
            return res;
          }
        }
      }
      return { ok: true };
    }
    default:
      throw new Error(`schema-validate: unknown type '${spec.type}' at '${keyPath}'`);
  }
}

function itemOk(itemSpec, el) {
  if (itemSpec.type === 'string') {
    if (typeof el !== 'string') return false;
    if (itemSpec.pattern && !new RegExp(itemSpec.pattern).test(el)) return false;
    return true;
  }
  if (itemSpec.type === 'object') {
    if (!el || typeof el !== 'object' || Array.isArray(el)) return false;
    if (itemSpec.has_keys) {
      for (const k of itemSpec.has_keys) if (!(k in el)) return false;
    }
    return true;
  }
  throw new Error(`schema-validate: unsupported items.type '${itemSpec.type}'`);
}

// validate(doc, schema) — walks schema.fields in order. Assumes the
// required-key presence loop already ran at the op layer (requiredKeys()),
// mirroring the legacy split between EXIT_REQUIRED_KEY and EXIT_TYPE_MISMATCH.
function validate(doc, schema) {
  for (const [name, spec] of Object.entries(schema.fields)) {
    const present = name in doc;
    if (!present && spec.required !== true) continue;
    const res = validateField(name, spec, doc[name], doc, undefined);
    if (!res.ok) return res;
  }
  return { ok: true };
}

module.exports = { loadSchema, validate, requiredKeys, schemaEnum, SCHEMAS_DIR };
