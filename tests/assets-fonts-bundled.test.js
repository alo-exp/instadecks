'use strict';
// tests/assets-fonts-bundled.test.js — Live E2E Iter4-1 regression.
// Cookbook recipes (palettes.md / typography.md) reference Plex Sans, Serif,
// and Mono. Each family MUST ship at least 4 weights (Regular, Italic, Bold,
// BoldItalic) under assets/fonts/<family>/, plus a per-family OFL.txt.
//
// When a referenced family isn't bundled, soffice silently falls back to a
// system serif/mono with different metrics, producing visible internal
// letter-spacing artifacts on every heading (the original Iter4-1 symptom).

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const FONTS_ROOT = path.join(__dirname, '..', 'assets', 'fonts');

const FAMILIES = [
  { dir: 'IBM_Plex_Sans',  prefix: 'IBMPlexSans'  },
  { dir: 'IBM_Plex_Serif', prefix: 'IBMPlexSerif' },
  { dir: 'IBM_Plex_Mono',  prefix: 'IBMPlexMono'  },
];
const REQUIRED_WEIGHTS = ['Regular', 'Italic', 'Bold', 'BoldItalic'];

for (const fam of FAMILIES) {
  test(`assets/fonts/${fam.dir}: directory exists`, () => {
    const p = path.join(FONTS_ROOT, fam.dir);
    assert.ok(fs.existsSync(p), `expected ${p} to exist`);
    assert.ok(fs.statSync(p).isDirectory(), `${p} must be a directory`);
  });

  test(`assets/fonts/${fam.dir}: ships ${REQUIRED_WEIGHTS.length} required weights`, () => {
    const p = path.join(FONTS_ROOT, fam.dir);
    for (const w of REQUIRED_WEIGHTS) {
      const ttf = path.join(p, `${fam.prefix}-${w}.ttf`);
      assert.ok(fs.existsSync(ttf), `missing weight: ${ttf}`);
      const sz = fs.statSync(ttf).size;
      assert.ok(sz > 10000, `${ttf} suspiciously small (${sz} bytes)`);
    }
  });

  test(`assets/fonts/${fam.dir}: per-family OFL.txt present`, () => {
    const ofl = path.join(FONTS_ROOT, fam.dir, 'OFL.txt');
    assert.ok(fs.existsSync(ofl), `missing OFL.txt for ${fam.dir}`);
    const txt = fs.readFileSync(ofl, 'utf8');
    assert.match(txt, /SIL Open Font License/i, `${ofl} must contain SIL OFL text`);
  });
}

test('NOTICE references the IBM Plex family (Sans, Serif, Mono)', () => {
  const notice = fs.readFileSync(path.join(__dirname, '..', 'NOTICE'), 'utf8');
  assert.match(notice, /IBM Plex family/i, 'NOTICE should reference Plex family bundling');
  assert.match(notice, /Serif/, 'NOTICE should mention Serif');
  assert.match(notice, /Mono/,  'NOTICE should mention Mono');
});
