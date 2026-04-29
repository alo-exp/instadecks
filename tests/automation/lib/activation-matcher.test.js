'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const {
  tokenize,
  scoreSkillForPrompt,
  predictSkill,
  parseActivationPanel,
} = require('./activation-matcher.js');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

test('scoreSkillForPrompt is deterministic (same inputs → same output)', () => {
  const desc = 'Generate a polished slide deck from any input';
  const prompt = 'Build me a deck from this brief';
  const s1 = scoreSkillForPrompt(desc, prompt);
  const s2 = scoreSkillForPrompt(desc, prompt);
  assert.strictEqual(s1, s2);
  assert.ok(s1 >= 0 && s1 <= 1, 'score in [0,1]');
});

test('predictSkill returns the argmax skill name + score', () => {
  const descs = {
    create: 'generate a polished slide deck pitch brief presentation',
    review: 'critique presentation slides for design defects typography',
  };
  const out = predictSkill('Build me a pitch deck from this brief', descs);
  assert.strictEqual(out.name, 'create');
  assert.ok(out.score > 0);
});

test('predictSkill tie-breaks lexicographically (first by sorted name wins)', () => {
  // Two identical descriptions → both score equally → lex-first 'aaa' wins.
  const descs = {
    zzz: 'foo bar baz quux deck',
    aaa: 'foo bar baz quux deck',
  };
  const out = predictSkill('foo bar baz quux deck slides', descs);
  assert.strictEqual(out.name, 'aaa');
});

test('parseActivationPanel returns 4 skills × 10 prompts each', () => {
  const md = fs.readFileSync(path.join(REPO_ROOT, 'tests', 'activation-panel.md'), 'utf8');
  const parsed = parseActivationPanel(md);
  const keys = Object.keys(parsed).sort();
  assert.deepStrictEqual(keys, ['annotate', 'content-review', 'create', 'review']);
  for (const k of keys) {
    assert.strictEqual(parsed[k].length, 10, `skill ${k} should have 10 prompts, got ${parsed[k].length}`);
  }
});

test('tokenize drops stopwords (the, this, that, for, with, from, and, etc.)', () => {
  const toks = tokenize('the user should and that this for with from');
  // All of these are stopwords or ≤2 chars → empty set.
  assert.strictEqual(toks.size, 0);
});

test('tokenize drops tokens of ≤2 characters', () => {
  const toks = tokenize('a ab abc abcd');
  assert.ok(!toks.has('a'));
  assert.ok(!toks.has('ab'));
  assert.ok(toks.has('abc'));
  assert.ok(toks.has('abcd'));
});
