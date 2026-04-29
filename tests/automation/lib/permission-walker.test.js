'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const {
  parseAllowedTools,
  extractSubprocessCalls,
  simulatePermissionMode,
} = require('./permission-walker.js');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

test('parseAllowedTools parses the create skill frontmatter list', () => {
  const out = parseAllowedTools(path.join(REPO_ROOT, 'skills', 'create', 'SKILL.md'));
  assert.ok(out.includes('Bash(node:*)'), `expected Bash(node:*), got ${out.join(',')}`);
  assert.ok(out.includes('Bash(soffice:*)'));
  assert.ok(out.includes('Read'));
  assert.ok(out.includes('Write'));
});

test('parseAllowedTools on annotate returns at least Bash(node:*)', () => {
  const out = parseAllowedTools(path.join(REPO_ROOT, 'skills', 'annotate', 'SKILL.md'));
  assert.ok(out.includes('Bash(node:*)'));
});

test('extractSubprocessCalls finds soffice + unzip in skills/create/scripts', () => {
  const calls = extractSubprocessCalls(path.join(REPO_ROOT, 'skills', 'create', 'scripts'));
  assert.ok(calls.has('soffice'), `expected soffice, got ${[...calls].join(',')}`);
  assert.ok(calls.has('unzip'));
});

test('simulatePermissionMode default mode: missing=0 → passes (extras OK)', () => {
  const out = simulatePermissionMode(
    ['Bash(node:*)', 'Bash(soffice:*)'],
    new Set(['node']),
    'default',
  );
  assert.strictEqual(out.passes, true);
  assert.deepStrictEqual(out.missing, []);
  assert.ok(out.extra.includes('soffice'));
});

test('simulatePermissionMode dontAsk mode: missing=0 → passes; missing>0 → fails', () => {
  const fail = simulatePermissionMode(
    ['Bash(node:*)'],
    new Set(['node', 'soffice']),
    'dontAsk',
  );
  assert.strictEqual(fail.passes, false);
  assert.deepStrictEqual(fail.missing, ['soffice']);

  const pass = simulatePermissionMode(
    ['Bash(node:*)', 'Bash(soffice:*)'],
    new Set(['node', 'soffice']),
    'dontAsk',
  );
  assert.strictEqual(pass.passes, true);
});

test('extractSubprocessCalls picks up bash command-v probes in synthetic fixture', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'permwalk-'));
  fs.writeFileSync(path.join(tmp, 'probe.sh'), '#!/usr/bin/env bash\nif command -v jq >/dev/null; then which curl; fi\n');
  fs.writeFileSync(path.join(tmp, 'mod.js'), "const {execFile}=require('child_process');execFile('imaginary-bin',['x']);\n");
  const calls = extractSubprocessCalls(tmp);
  assert.ok(calls.has('jq'));
  assert.ok(calls.has('curl'));
  assert.ok(calls.has('imaginary-bin'));
  fs.rmSync(tmp, { recursive: true, force: true });
});
