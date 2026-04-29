'use strict';
// tests/cli-create-scaffold.test.js — Iter2 Fix #10.
// --scaffold writes canonical-brief.example.json + design-choices.example.json
// + render-deck.template.cjs into <out-dir>.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = path.join(__dirname, '..');
const CLI = path.join(REPO_ROOT, 'skills', 'create', 'scripts', 'cli.js');
const { writeScaffold } = require(CLI);

function tmp(tag) { return fs.mkdtempSync(path.join(os.tmpdir(), `${tag}-`)); }

test('writeScaffold writes the three starter files', () => {
  const dir = tmp('scaffold');
  try {
    const r = writeScaffold(dir);
    assert.ok(fs.existsSync(r.brief));
    assert.ok(fs.existsSync(r.designChoices));
    assert.ok(fs.existsSync(r.template));
    const brief = JSON.parse(fs.readFileSync(r.brief, 'utf8'));
    assert.equal(typeof brief.topic, 'string');
    assert.ok(Array.isArray(brief.narrative_arc));
    assert.ok(brief.key_claims.every(kc => typeof kc.claim === 'string'));
    const dc = JSON.parse(fs.readFileSync(r.designChoices, 'utf8'));
    assert.equal(typeof dc.palette.name, 'string');
    const cjs = fs.readFileSync(r.template, 'utf8');
    assert.match(cjs, /pptxgenjs/);
    assert.match(cjs, /Motif:/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('CLI --scaffold writes scaffold and exits 0', () => {
  const dir = tmp('scaffold-cli');
  try {
    const r = spawnSync(process.execPath, [CLI, '--scaffold', dir],
      { encoding: 'utf8' });
    assert.equal(r.status, 0, `stderr=${r.stderr}`);
    assert.ok(fs.existsSync(path.join(dir, 'canonical-brief.example.json')));
    assert.ok(fs.existsSync(path.join(dir, 'design-choices.example.json')));
    assert.ok(fs.existsSync(path.join(dir, 'render-deck.template.cjs')));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('parseArgs accepts --diversity-history flag', () => {
  const { parseArgs } = require(CLI);
  const args = parseArgs(['--brief', 'b.json', '--diversity-history', '/tmp/hist']);
  assert.equal(args.diversityHistory, '/tmp/hist');
  assert.equal(args.brief, 'b.json');
});

test('canonical-brief.example.json validates as a canonical brief', () => {
  const { validateBrief } = require('../skills/create/scripts/lib/deck-brief');
  const example = JSON.parse(fs.readFileSync(
    path.join(REPO_ROOT, 'skills', 'create', 'references', 'canonical-brief.example.json'),
    'utf8'));
  assert.equal(validateBrief(example), true);
});
