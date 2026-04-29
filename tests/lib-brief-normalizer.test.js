'use strict';
// tests/lib-brief-normalizer.test.js — Plan 9-04 Task 1.
// Covers detectBriefShape (4 shapes), normalizeBrief (json passthrough +
// extractor delegation for markdown/raw/files), and the _test_setExtractor /
// _test_setLlm DI hooks. No network, no real LLM — extractor stub injected.

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  normalizeBrief,
  detectBriefShape,
  _test_setExtractor,
  _test_setLlm,
} = require('../skills/create/scripts/lib/brief-normalizer');

// Canonical brief shape used by runCreate / validateBrief.
const CANONICAL = {
  topic: 'Q3 review',
  audience: 'board',
  tone: 'executive',
  narrative_arc: ['Open', 'Body', 'Close'],
  key_claims: [],
  asset_hints: { has_data: true },
  source_files: [],
};

test('lib-brief-normalizer', async (t) => {
  // ---------- detectBriefShape ----------

  await t.test('detect: parsed json with topic+audience → json', () => {
    assert.equal(detectBriefShape(CANONICAL), 'json');
  });

  await t.test('detect: parsed json with topic+narrative_arc → json', () => {
    assert.equal(detectBriefShape({ topic: 'X', narrative_arc: ['a'] }), 'json');
  });

  await t.test('detect: parsed json with topic+key_claims → json', () => {
    assert.equal(detectBriefShape({ topic: 'X', key_claims: [] }), 'json');
  });

  await t.test('detect: legacy {title, audience} → json (compat alias)', () => {
    assert.equal(detectBriefShape({ title: 'X', audience: 'Y' }), 'json');
  });

  await t.test('detect: markdown string starting with "# " → markdown', () => {
    assert.equal(detectBriefShape('# Title\nBody'), 'markdown');
  });

  await t.test('detect: {files:[...]} → files', () => {
    assert.equal(
      detectBriefShape({ files: [{ path: 'a.pdf', type: 'pdf' }] }),
      'files',
    );
  });

  await t.test('detect: array of {path,type} → files', () => {
    assert.equal(
      detectBriefShape([{ path: 'a.pdf', type: 'pdf' }]),
      'files',
    );
  });

  await t.test('detect: plain raw text → raw', () => {
    assert.equal(detectBriefShape('plain prose with no heading'), 'raw');
  });

  await t.test('detect: object without telltale fields → json (validateBrief catches)', () => {
    // Any plain object that is NOT a files-shape gets 'json' — preserving the
    // legacy contract that runCreate always passed objects through validateBrief.
    assert.equal(detectBriefShape({}), 'json');
    assert.equal(detectBriefShape({ topic: 'x' }), 'json');
  });

  await t.test('detect: empty array → raw', () => {
    assert.equal(detectBriefShape([]), 'raw');
  });

  await t.test('detect: array of non-{path,type} items → raw', () => {
    assert.equal(detectBriefShape(['a', 'b']), 'raw');
  });

  await t.test('detect: null → raw', () => {
    assert.equal(detectBriefShape(null), 'raw');
  });

  // ---------- normalizeBrief: json passthrough ----------

  await t.test('normalize: canonical json passes through unchanged', async () => {
    const out = await normalizeBrief(CANONICAL);
    assert.deepEqual(out, CANONICAL);
  });

  await t.test('normalize: aliases title→topic, key_messages→narrative_arc', async () => {
    const out = await normalizeBrief({
      title: 'My Topic',
      audience: 'board',
      tone: 'executive',
      key_messages: ['a', 'b'],
      key_claims: [],
      asset_hints: {},
      source_files: [],
    });
    assert.equal(out.topic, 'My Topic');
    assert.deepEqual(out.narrative_arc, ['a', 'b']);
  });

  // ---------- normalizeBrief: extractor DI ----------

  await t.test('normalize: markdown delegates to injected extractor', async () => {
    let captured = null;
    _test_setExtractor(async (input, shape) => {
      captured = { input, shape };
      return CANONICAL;
    });
    try {
      const out = await normalizeBrief('# My Deck\nBody text');
      assert.equal(captured.shape, 'markdown');
      assert.equal(captured.input, '# My Deck\nBody text');
      assert.deepEqual(out, CANONICAL);
    } finally {
      _test_setExtractor(null);
    }
  });

  await t.test('normalize: raw delegates to injected extractor', async () => {
    let captured = null;
    _test_setExtractor(async (input, shape) => {
      captured = { input, shape };
      return CANONICAL;
    });
    try {
      const out = await normalizeBrief('plain text input');
      assert.equal(captured.shape, 'raw');
      assert.deepEqual(out, CANONICAL);
    } finally {
      _test_setExtractor(null);
    }
  });

  await t.test('normalize: files delegates to injected extractor', async () => {
    let captured = null;
    _test_setExtractor(async (input, shape) => {
      captured = { input, shape };
      return CANONICAL;
    });
    try {
      const out = await normalizeBrief({ files: [{ path: 'a.txt', type: 'transcript' }] });
      assert.equal(captured.shape, 'files');
      assert.deepEqual(captured.input, { files: [{ path: 'a.txt', type: 'transcript' }] });
      assert.deepEqual(out, CANONICAL);
    } finally {
      _test_setExtractor(null);
    }
  });

  await t.test('normalize: throws when extractor returns shape without topic', async () => {
    _test_setExtractor(async () => ({ audience: 'x' }));
    try {
      await assert.rejects(
        () => normalizeBrief('plain prose'),
        /brief-normalizer: missing required field "topic"/,
      );
    } finally {
      _test_setExtractor(null);
    }
  });

  await t.test('_test_setExtractor(null) restores default extractor', async () => {
    // Set a stub, then null it. With no LLM stub set either, the default
    // extractor must throw a clear "no LLM configured" error rather than
    // silently succeeding — that's how we know the stub was cleared.
    _test_setExtractor(async () => CANONICAL);
    _test_setExtractor(null);
    _test_setLlm(null);
    await assert.rejects(
      () => normalizeBrief('# md'),
      /brief-normalizer: no LLM configured/,
    );
  });

  await t.test('default extractor uses injected LLM via _test_setLlm', async () => {
    _test_setExtractor(null); // ensure default
    _test_setLlm(async (_prompt, _opts) => CANONICAL);
    try {
      const out = await normalizeBrief('# Some Markdown\nbody');
      assert.deepEqual(out, CANONICAL);
    } finally {
      _test_setLlm(null);
    }
  });

  await t.test('default extractor: array-of-files (no wrapper) routes through extractor', async () => {
    const path = require('node:path');
    const fs = require('node:fs');
    const os = require('node:os');
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bn-arr-'));
    const f1 = path.join(tmp, 'a.txt');
    fs.writeFileSync(f1, 'gamma content', 'utf8');
    let promptSeen = '';
    _test_setExtractor(null);
    _test_setLlm(async (prompt) => {
      promptSeen = prompt;
      return CANONICAL;
    });
    try {
      const out = await normalizeBrief([{ path: f1, type: 'transcript' }]);
      assert.deepEqual(out, CANONICAL);
      assert.match(promptSeen, /gamma content/);
    } finally {
      _test_setLlm(null);
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  await t.test('default extractor: files shape concatenates extracted text and feeds LLM', async () => {
    const path = require('node:path');
    const fs = require('node:fs');
    const os = require('node:os');
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bn-files-'));
    const f1 = path.join(tmp, 'a.txt');
    const f2 = path.join(tmp, 'b.md');
    fs.writeFileSync(f1, 'alpha content', 'utf8');
    fs.writeFileSync(f2, 'beta content', 'utf8');

    let promptSeen = '';
    _test_setExtractor(null);
    _test_setLlm(async (prompt) => {
      promptSeen = prompt;
      return CANONICAL;
    });
    try {
      const out = await normalizeBrief({
        files: [{ path: f1, type: 'transcript' }, { path: f2, type: 'md' }],
      });
      assert.deepEqual(out, CANONICAL);
      assert.match(promptSeen, /alpha content/);
      assert.match(promptSeen, /beta content/);
    } finally {
      _test_setLlm(null);
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});
