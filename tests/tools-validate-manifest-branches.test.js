'use strict';
// tests/tools-validate-manifest-branches.test.js — branch-coverage gaps for
// tools/validate-manifest.js. Complements tests/manifest-validator.test.js (which
// already covers the main happy path + several failure paths). This file fills the
// remaining branches: missing manifest, malformed JSON, license non-string, components
// in array form (entry.path missing/present), skill missing frontmatter, missing
// description field, empty description, info-line for non-user-invocable stop-word skill.

const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const VALIDATOR = path.resolve(__dirname, '..', 'tools', 'validate-manifest.js');

function mkRoot() { return fs.mkdtempSync(path.join(os.tmpdir(), 'tools-vm-br-')); }
function writeManifest(root, m) {
  const dir = path.join(root, '.claude-plugin');
  fs.mkdirSync(dir, { recursive: true });
  if (typeof m === 'string') {
    fs.writeFileSync(path.join(dir, 'plugin.json'), m);
  } else {
    fs.writeFileSync(path.join(dir, 'plugin.json'), JSON.stringify(m, null, 2));
  }
}
function writeSkill(root, name, fm) {
  const dir = path.join(root, 'skills', name);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'SKILL.md'), `---\n${fm}\n---\n\n# x\n`);
}
function run(root) {
  return spawnSync(process.execPath, [VALIDATOR, root], { encoding: 'utf8' });
}

test('tools-validate-manifest-branches', async (t) => {
  await t.test('missing plugin.json → exit 1 + not found', () => {
    const root = mkRoot();
    try {
      const r = run(root);
      assert.equal(r.status, 1);
      assert.match(r.stderr, /not found/);
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  });

  await t.test('malformed plugin.json JSON → exit 1 + invalid JSON', () => {
    const root = mkRoot();
    try {
      writeManifest(root, '{not json');
      const r = run(root);
      assert.equal(r.status, 1);
      assert.match(r.stderr, /invalid JSON/);
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  });

  await t.test('missing name field → exit 1', () => {
    const root = mkRoot();
    try {
      writeManifest(root, { version: '0.1.0', skills: './skills/' });
      writeSkill(root, 'x', 'name: x\ndescription: Generate things.');
      const r = run(root);
      assert.equal(r.status, 1);
      assert.match(r.stderr, /missing required string field "name"/);
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  });

  await t.test('non-string license fails', () => {
    const root = mkRoot();
    try {
      writeManifest(root, { name: 'demo', version: '0.1.0', license: 42, skills: './skills/' });
      writeSkill(root, 'x', 'name: x\ndescription: Generate things.');
      const r = run(root);
      assert.equal(r.status, 1);
      assert.match(r.stderr, /license/);
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  });

  await t.test('component array with missing path → exit 1', () => {
    const root = mkRoot();
    try {
      writeManifest(root, {
        name: 'demo', version: '0.1.0', skills: './skills/',
        commands: [{ path: './does-not-exist.md' }],
      });
      writeSkill(root, 'x', 'name: x\ndescription: Generate things.');
      const r = run(root);
      assert.equal(r.status, 1);
      assert.match(r.stderr, /commands\[\]\.path/);
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  });

  await t.test('SKILL.md missing frontmatter → exit 1', () => {
    const root = mkRoot();
    try {
      writeManifest(root, { name: 'demo', version: '0.1.0', skills: './skills/' });
      const dir = path.join(root, 'skills', 'noFrontmatter');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'SKILL.md'), 'no frontmatter here\n');
      const r = run(root);
      assert.equal(r.status, 1);
      assert.match(r.stderr, /missing YAML frontmatter/);
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  });

  await t.test('SKILL.md missing description → exit 1', () => {
    const root = mkRoot();
    try {
      writeManifest(root, { name: 'demo', version: '0.1.0', skills: './skills/' });
      writeSkill(root, 'x', 'name: x\nuser-invocable: true');
      const r = run(root);
      assert.equal(r.status, 1);
      assert.match(r.stderr, /missing "description"/);
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  });

  await t.test('SKILL.md empty description → exit 1', () => {
    const root = mkRoot();
    try {
      writeManifest(root, { name: 'demo', version: '0.1.0', skills: './skills/' });
      writeSkill(root, 'x', 'name: x\ndescription: ');
      const r = run(root);
      assert.equal(r.status, 1);
      assert.match(r.stderr, /description is empty/);
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  });

  await t.test('non-user-invocable skill with stop-word description prints info, exits 0', () => {
    const root = mkRoot();
    try {
      writeManifest(root, { name: 'demo', version: '0.1.0', skills: './skills/' });
      writeSkill(root, 'x', 'name: x\ndescription: The internal helper skill.\nuser-invocable: false');
      const r = run(root);
      assert.equal(r.status, 0, `stderr=${r.stderr}`);
      assert.match(r.stdout, /info — description starts with "the"/);
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  });

  await t.test('quoted description gets quotes stripped (passes)', () => {
    const root = mkRoot();
    try {
      writeManifest(root, { name: 'demo', version: '0.1.0', skills: './skills/' });
      writeSkill(root, 'x', 'name: x\ndescription: "Generate a deck."\nuser-invocable: true');
      const r = run(root);
      assert.equal(r.status, 0, `stderr=${r.stderr}`);
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  });
});
