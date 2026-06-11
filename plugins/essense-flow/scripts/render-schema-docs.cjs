'use strict';
// scripts/render-schema-docs.cjs — renders the canonical artifact shapes from
// references/schemas/*.schema.yaml into every doc site that teaches them.
//
// Why: shape blocks used to be hand-copied into the brief template, two agent
// defs, and two fill-in templates — and every copy drifted differently
// (paths vs allowed/scratch_space; a template missing the required `sprint`
// key; a task-id pattern three revisions stale). Rendering from the schema
// makes the copies un-driftable; test/schema-docs-drift.test.cjs fails the
// suite if a rendered block is hand-edited.
//
// Usage:
//   node scripts/render-schema-docs.cjs --write   # update files in place
//   node scripts/render-schema-docs.cjs --check   # exit 1 + report on drift
//
// Marker grammar (markdown sites):
//   <!-- AUTOGEN:<artifact>-<kind> START ... -->
//   ...rendered content...
//   <!-- AUTOGEN:<artifact>-<kind> END -->
// Template sites (whole-file): regenerated wholesale; first line carries a
// `# GENERATED` comment.

const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

const PLUGIN_ROOT = path.resolve(__dirname, '..');
const { loadSchema } = require(path.join(PLUGIN_ROOT, 'lib', 'schema-validate.cjs'));

// ---------------------------------------------------------------------------
// Renderers
// ---------------------------------------------------------------------------

// Example document: field order = schema order; values from `example`.
function renderExampleYaml(schema) {
  const doc = {};
  for (const [name, spec] of Object.entries(schema.fields)) {
    if ('example' in spec) doc[name] = spec.example;
  }
  return yaml.dump(doc, { lineWidth: 78, noRefs: true }).trimEnd();
}

// Constraint table: one bullet per field — requiredness, type, rules, doc.
function renderConstraints(schema) {
  const lines = [];
  for (const [name, spec] of Object.entries(schema.fields)) {
    const rules = [];
    rules.push(spec.required ? 'required' : 'optional');
    if (spec.const !== undefined) rules.push(`frozen at ${spec.const}`);
    if (spec.pattern) rules.push(`pattern \`${spec.pattern}\``);
    if (spec.enum) rules.push(`one of \`${spec.enum.join(' | ')}\``);
    if (spec.min !== undefined) rules.push(`>= ${spec.min}`);
    if (spec.min_items) rules.push(`min ${spec.min_items} item(s)`);
    if (spec.nonempty) rules.push('non-empty');
    if (spec.nullable_iff) rules.push(`null allowed only when \`${spec.nullable_iff.field}: ${spec.nullable_iff.equals}\``);
    const docText = spec.doc ? ` — ${String(spec.doc).trim().replace(/\s+/g, ' ')}` : '';
    lines.push(`- \`${name}\` (${spec.type}; ${rules.join(', ')})${docText}`);
    if (spec.fields) {
      for (const [child, cs] of Object.entries(spec.fields)) {
        const crules = [cs.required ? 'required' : 'optional'];
        if (cs.enum) crules.push(`one of \`${cs.enum.join(' | ')}\``);
        const cdoc = cs.doc ? ` — ${String(cs.doc).trim().replace(/\s+/g, ' ')}` : '';
        lines.push(`  - \`${name}.${child}\` (${cs.type}; ${crules.join(', ')})${cdoc}`);
      }
    }
  }
  return lines.join('\n');
}

// Fill-in template: field order = schema order; layout from `placeholder`.
function renderTemplate(schema) {
  const lines = [
    `# GENERATED from references/schemas/${schema.artifact}.schema.yaml — edit the schema, then: npm run render-schemas`,
  ];
  for (const [name, spec] of Object.entries(schema.fields)) {
    if (!('placeholder' in spec)) continue;
    const ph = String(spec.placeholder);
    if (ph.startsWith('|')) {
      // literal-block placeholder: `name: |` then raw body lines
      const [head, ...rest] = ph.split('\n');
      lines.push(`${name}: ${head}`);
      for (const l of rest) lines.push(l);
    } else if (ph.includes('\n')) {
      lines.push(`${name}:`);
      for (const l of ph.split('\n')) lines.push(`  ${l}`);
    } else {
      lines.push(`${name}: ${ph}`);
    }
  }
  return lines.join('\n') + '\n';
}

function renderShapeBlock(schema) {
  return [
    '```yaml',
    renderExampleYaml(schema),
    '```',
    '',
    'Field rules:',
    '',
    renderConstraints(schema),
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Sites
// ---------------------------------------------------------------------------

const SITES = [
  {
    file: 'skills/architect/templates/task-spec.md',
    kind: 'whole-file',
    render: () => renderTemplate(loadSchema('task-spec')),
  },
  {
    file: 'skills/build/templates/completion-record.md',
    kind: 'whole-file',
    render: () => renderTemplate(loadSchema('completion-record')),
  },
  {
    file: 'skills/architect/templates/sub-architect-brief.md',
    kind: 'marker',
    marker: 'task-spec-shape',
    render: () => renderShapeBlock(loadSchema('task-spec')),
  },
  {
    file: 'agents/essense-flow-sub-architect.md',
    kind: 'marker',
    marker: 'task-spec-shape',
    render: () => renderShapeBlock(loadSchema('task-spec')),
  },
  {
    file: 'agents/essense-flow-task-agent.md',
    kind: 'marker',
    marker: 'task-spec-shape',
    render: () => renderShapeBlock(loadSchema('task-spec')),
  },
];

function markerBounds(content, marker, file) {
  const startRe = new RegExp(`<!-- AUTOGEN:${marker} START[^>]*-->`);
  const endRe = new RegExp(`<!-- AUTOGEN:${marker} END -->`);
  const start = content.match(startRe);
  const end = content.match(endRe);
  if (!start || !end) {
    throw new Error(`render-schema-docs: ${file} is missing AUTOGEN:${marker} START/END markers`);
  }
  return {
    head: content.slice(0, start.index + start[0].length),
    tail: content.slice(end.index),
  };
}

function startMarker(marker, schemaFile) {
  return `<!-- AUTOGEN:${marker} START — rendered from ${schemaFile} by scripts/render-schema-docs.cjs; edit the schema, then: npm run render-schemas -->`;
}

function expectedContent(site, current) {
  if (site.kind === 'whole-file') return site.render();
  const { head, tail } = markerBounds(current, site.marker, site.file);
  return `${head}\n${site.render()}\n${tail}`;
}

function main() {
  const mode = process.argv.includes('--write') ? 'write'
    : process.argv.includes('--check') ? 'check' : null;
  if (!mode) {
    process.stderr.write('usage: render-schema-docs.cjs --write | --check\n');
    process.exit(4);
  }
  const drifted = [];
  for (const site of SITES) {
    const abs = path.join(PLUGIN_ROOT, site.file);
    const current = fs.readFileSync(abs, 'utf8').replace(/\r\n/g, '\n');
    const expected = expectedContent(site, current);
    if (current !== expected) {
      drifted.push(site.file);
      if (mode === 'write') fs.writeFileSync(abs, expected, 'utf8');
    }
  }
  if (mode === 'check' && drifted.length > 0) {
    process.stderr.write(
      `render-schema-docs --check: ${drifted.length} site(s) drifted from schema:\n` +
      drifted.map((f) => `  ${f}`).join('\n') +
      '\nRun: npm run render-schemas\n',
    );
    process.exit(1);
  }
  process.stdout.write(
    mode === 'write'
      ? `render-schema-docs: ${drifted.length} site(s) updated, ${SITES.length - drifted.length} already current\n`
      : 'render-schema-docs --check: all sites current\n',
  );
}

if (require.main === module) main();
module.exports = { renderExampleYaml, renderConstraints, renderTemplate, renderShapeBlock, SITES, startMarker };
