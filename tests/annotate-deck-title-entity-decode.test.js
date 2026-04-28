'use strict';
// tests/annotate-deck-title-entity-decode.test.js — Live E2E Round 4 MAJOR R4-1.
//
// readDeckMeta() pulls dc:title from docProps/core.xml via regex. core.xml stores
// `&` as `&amp;` (and other reserved chars as XML entities). Without decoding,
// the annotate.js footer renders literal "&amp;" in the deck title. This test
// pins the decoder behavior for the 5 named entities + numeric entities.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const REPO_ROOT = path.join(__dirname, '..');
const FIXTURE_DECK = path.join(REPO_ROOT, 'tests', 'fixtures', 'v8-reference', 'Annotations_Sample.pptx');

function buildDeckWithTitle(title) {
  // Clone the fixture pptx and rewrite docProps/core.xml's dc:title to the given
  // raw (pre-encoded) string. We must encode the 5 reserved chars ourselves so
  // the resulting core.xml is well-formed XML — that way readDeckMeta exercises
  // its decoder on real entity-encoded input.
  const enc = (s) => s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'anno-entity-'));
  const deckCopy = path.join(tmp, 'deck.pptx');
  fs.copyFileSync(FIXTURE_DECK, deckCopy);
  // Extract core.xml, rewrite dc:title, zip back in.
  const coreOriginal = execFileSync('unzip', ['-p', deckCopy, 'docProps/core.xml']).toString();
  const rewritten = coreOriginal.replace(
    /<dc:title[^>]*>[\s\S]*?<\/dc:title>/,
    `<dc:title>${enc(title)}</dc:title>`,
  );
  // If the original had no dc:title, inject one inside cp:coreProperties.
  let finalXml = rewritten;
  if (finalXml === coreOriginal) {
    finalXml = coreOriginal.replace(
      /(<cp:coreProperties[^>]*>)/,
      `$1<dc:title>${enc(title)}</dc:title>`,
    );
  }
  const stage = path.join(tmp, 'docProps');
  fs.mkdirSync(stage, { recursive: true });
  fs.writeFileSync(path.join(stage, 'core.xml'), finalXml);
  // Use `zip` to update the entry in-place.
  execFileSync('zip', ['-j', deckCopy, path.join(stage, 'core.xml')], { stdio: 'pipe' });
  // The above flattens path; we need it under docProps/. Re-do with proper path:
  // Recreate by deleting and re-adding with directory structure.
  execFileSync('zip', ['-d', deckCopy, 'core.xml'], { stdio: 'pipe' });
  // Stage with correct directory
  const stagedFile = path.join(tmp, 'docProps', 'core.xml');
  // zip with -j strips path; without -j it preserves relative path from cwd.
  execFileSync('zip', [deckCopy, 'docProps/core.xml'], { cwd: tmp, stdio: 'pipe' });
  return { deckCopy, cleanup: () => fs.rmSync(tmp, { recursive: true, force: true }) };
}

test('readDeckMeta decodes &amp; in dc:title', async () => {
  const { readDeckMeta } = require('../skills/annotate/scripts/adapter');
  const { deckCopy, cleanup } = buildDeckWithTitle('FY26 Annual Plan: Revenue & Resources');
  try {
    const meta = await readDeckMeta(deckCopy);
    assert.equal(meta.deckTitle, 'FY26 Annual Plan: Revenue & Resources',
      `expected literal &, got "${meta.deckTitle}"`);
  } finally {
    cleanup();
  }
});

test('readDeckMeta decodes all 5 named XML entities', async () => {
  const { readDeckMeta } = require('../skills/annotate/scripts/adapter');
  const raw = `A & B < C > D " E ' F`;
  const { deckCopy, cleanup } = buildDeckWithTitle(raw);
  try {
    const meta = await readDeckMeta(deckCopy);
    assert.equal(meta.deckTitle, raw,
      `expected all 5 entities decoded, got "${meta.deckTitle}"`);
  } finally {
    cleanup();
  }
});

test('readDeckMeta decodes numeric (decimal) XML entities', async () => {
  // Inject &#38; (= '&') as a numeric entity directly — bypass our enc() helper
  // by writing core.xml with a hand-crafted body.
  const { readDeckMeta } = require('../skills/annotate/scripts/adapter');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'anno-num-'));
  const deckCopy = path.join(tmp, 'deck.pptx');
  fs.copyFileSync(FIXTURE_DECK, deckCopy);
  const coreOriginal = execFileSync('unzip', ['-p', deckCopy, 'docProps/core.xml']).toString();
  const rewritten = coreOriginal.replace(
    /<dc:title[^>]*>[\s\S]*?<\/dc:title>/,
    `<dc:title>X &#38; Y &#60; Z</dc:title>`,
  );
  fs.mkdirSync(path.join(tmp, 'docProps'), { recursive: true });
  fs.writeFileSync(path.join(tmp, 'docProps', 'core.xml'), rewritten);
  execFileSync('zip', ['-d', deckCopy, 'docProps/core.xml'], { stdio: 'pipe' });
  execFileSync('zip', [deckCopy, 'docProps/core.xml'], { cwd: tmp, stdio: 'pipe' });
  try {
    const meta = await readDeckMeta(deckCopy);
    assert.equal(meta.deckTitle, 'X & Y < Z',
      `expected decimal entities decoded, got "${meta.deckTitle}"`);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('readDeckMeta decodes hexadecimal XML entities', async () => {
  const { readDeckMeta } = require('../skills/annotate/scripts/adapter');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'anno-hex-'));
  const deckCopy = path.join(tmp, 'deck.pptx');
  fs.copyFileSync(FIXTURE_DECK, deckCopy);
  const coreOriginal = execFileSync('unzip', ['-p', deckCopy, 'docProps/core.xml']).toString();
  const rewritten = coreOriginal.replace(
    /<dc:title[^>]*>[\s\S]*?<\/dc:title>/,
    `<dc:title>P &#x26; Q &#x3C; R</dc:title>`,
  );
  fs.mkdirSync(path.join(tmp, 'docProps'), { recursive: true });
  fs.writeFileSync(path.join(tmp, 'docProps', 'core.xml'), rewritten);
  execFileSync('zip', ['-d', deckCopy, 'docProps/core.xml'], { stdio: 'pipe' });
  execFileSync('zip', [deckCopy, 'docProps/core.xml'], { cwd: tmp, stdio: 'pipe' });
  try {
    const meta = await readDeckMeta(deckCopy);
    assert.equal(meta.deckTitle, 'P & Q < R',
      `expected hex entities decoded, got "${meta.deckTitle}"`);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
