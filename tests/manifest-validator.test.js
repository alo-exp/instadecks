// tests/manifest-validator.test.js — Unit tests for tools/validate-manifest.js (D-04, FOUND-08).
// Each subtest builds a hermetic plugin tree in a temp dir, runs the validator via
// spawnSync, and asserts on exit code + stderr/stdout. PC-05 multi-line description
// block-scalar rejection is exercised in subtest 7.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const VALIDATOR = path.resolve(__dirname, '..', 'tools', 'validate-manifest.js');

function mkTempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'instadecks-validator-'));
}

function writeManifest(root, manifest) {
  const dir = path.join(root, '.claude-plugin');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'plugin.json'), JSON.stringify(manifest, null, 2));
}

function writeSkill(root, name, frontmatterBody, { skillsDir = 'skills' } = {}) {
  const dir = path.join(root, skillsDir, name);
  fs.mkdirSync(dir, { recursive: true });
  const md = `---\n${frontmatterBody}\n---\n\n# /${name}\n\nBody.\n`;
  fs.writeFileSync(path.join(dir, 'SKILL.md'), md);
}

function runValidator(root) {
  return spawnSync(process.execPath, [VALIDATOR, root], { encoding: 'utf8' });
}

function cleanup(root) {
  fs.rmSync(root, { recursive: true, force: true });
}

const VALID_FM = [
  'name: demo',
  'description: Generate a polished sample for tests. Single-line scalar form.',
  'user-invocable: true',
  'version: 0.1.0',
].join('\n');

test('valid manifest passes', () => {
  const root = mkTempRoot();
  try {
    writeManifest(root, {
      name: 'demo-plugin',
      version: '0.1.0',
      license: 'Apache-2.0',
      skills: './skills/',
    });
    writeSkill(root, 'demo', VALID_FM);
    const r = runValidator(root);
    assert.equal(r.status, 0, `stderr: ${r.stderr}`);
    assert.match(r.stdout, /Manifest OK/);
  } finally {
    cleanup(root);
  }
});

test('rejects non-kebab-case name', () => {
  const root = mkTempRoot();
  try {
    writeManifest(root, { name: 'Instadecks', version: '0.1.0', skills: './skills/' });
    writeSkill(root, 'demo', VALID_FM);
    const r = runValidator(root);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /kebab-case/);
  } finally {
    cleanup(root);
  }
});

test('rejects bad semver', () => {
  const root = mkTempRoot();
  try {
    writeManifest(root, { name: 'demo', version: '1.0', skills: './skills/' });
    writeSkill(root, 'demo', VALID_FM);
    const r = runValidator(root);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /semver/);
  } finally {
    cleanup(root);
  }
});

test('rejects skill description > 1024 chars', () => {
  const root = mkTempRoot();
  try {
    writeManifest(root, { name: 'demo', version: '0.1.0', skills: './skills/' });
    const longDesc = 'Generate ' + 'x'.repeat(1100);
    const fm = [
      'name: demo',
      `description: ${longDesc}`,
      'user-invocable: true',
    ].join('\n');
    writeSkill(root, 'demo', fm);
    const r = runValidator(root);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /1024/);
  } finally {
    cleanup(root);
  }
});

test('rejects skill description starting with "the"', () => {
  const root = mkTempRoot();
  try {
    writeManifest(root, { name: 'demo', version: '0.1.0', skills: './skills/' });
    const fm = [
      'name: demo',
      'description: The skill that does the thing — bad opening word.',
      'user-invocable: true',
    ].join('\n');
    writeSkill(root, 'demo', fm);
    const r = runValidator(root);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /imperative verb/i);
  } finally {
    cleanup(root);
  }
});

test('rejects missing component path when explicitly set', () => {
  const root = mkTempRoot();
  try {
    writeManifest(root, {
      name: 'demo',
      version: '0.1.0',
      skills: './does-not-exist/',
    });
    const r = runValidator(root);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /does-not-exist/);
  } finally {
    cleanup(root);
  }
});

test('rejects multi-line description block scalar (PC-05)', () => {
  // Pipe `|` form
  {
    const root = mkTempRoot();
    try {
      writeManifest(root, { name: 'demo', version: '0.1.0', skills: './skills/' });
      const fm = [
        'name: demo',
        'description: |',
        '  Generate a deck.',
        '  Multi-line continuation.',
        'user-invocable: true',
      ].join('\n');
      writeSkill(root, 'demo', fm);
      const r = runValidator(root);
      assert.equal(r.status, 1, `expected fail for | scalar; stdout=${r.stdout} stderr=${r.stderr}`);
      assert.match(r.stderr, /single-line|block scalar/i);
    } finally {
      cleanup(root);
    }
  }
  // Folded `>` form
  {
    const root = mkTempRoot();
    try {
      writeManifest(root, { name: 'demo', version: '0.1.0', skills: './skills/' });
      const fm = [
        'name: demo',
        'description: >',
        '  Generate a deck across',
        '  several folded lines.',
        'user-invocable: true',
      ].join('\n');
      writeSkill(root, 'demo', fm);
      const r = runValidator(root);
      assert.equal(r.status, 1, `expected fail for > scalar; stdout=${r.stdout} stderr=${r.stderr}`);
      assert.match(r.stderr, /single-line|block scalar/i);
    } finally {
      cleanup(root);
    }
  }
});
