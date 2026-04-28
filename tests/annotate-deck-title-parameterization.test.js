'use strict';
// tests/annotate-deck-title-parameterization.test.js — MINOR #1 fix verification.
//
// annotate.js's footer band used to hardcode "Agentic Disruption  ·  Slide N / 43".
// This test pins the parameterized behavior:
//   - When sample.deckTitle / sample.deckTotal are provided, the footer reflects them.
//   - When absent (e.g. visual-regression v8 SAMPLES path), the footer falls back to
//     the historical "Agentic Disruption" / 43 values so the Tier-1 normalized SHA
//     baseline still matches.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ANNOTATE_PATH = path.join(__dirname, '..', 'skills', 'annotate', 'scripts', 'annotate.js');

test('annotate.js footer is parameterized via sample.deckTitle and sample.deckTotal', () => {
  const src = fs.readFileSync(ANNOTATE_PATH, 'utf8');
  // The footer addText must reference sample.deckTitle and sample.deckTotal (with fallbacks).
  assert.match(src, /sample\.deckTitle/, 'annotate.js footer must reference sample.deckTitle');
  assert.match(src, /sample\.deckTotal/, 'annotate.js footer must reference sample.deckTotal');
  // The historical fallback values must remain present so the v8 visual-regression
  // baseline (which passes raw SAMPLES with no deckTitle/deckTotal) keeps matching.
  assert.match(src, /Agentic Disruption/,
    'annotate.js must retain the "Agentic Disruption" fallback for back-compat');
  assert.match(src, /\b43\b/, 'annotate.js must retain the 43 fallback total for back-compat');
});

test('adapter.adaptFindings decorates samples with deckTitle/deckTotal when deckMeta provided', () => {
  const { adaptFindings } = require('../skills/annotate/scripts/adapter');
  const findings = {
    schema_version: '1.1',
    slides: [
      {
        slideNum: 1,
        title: 'S1',
        findings: [
          {
            severity_reviewer: 'Major', category: 'defect', genuine: true,
            nx: 0.5, ny: 0.5, text: 'x', rationale: 'r', location: 'l',
            standard: 's', fix: 'f',
          },
        ],
      },
    ],
  };
  const samples = adaptFindings(findings, { deckTitle: 'My Strategy', deckTotal: 8 });
  assert.equal(samples.length, 1);
  assert.equal(samples[0].deckTitle, 'My Strategy');
  assert.equal(samples[0].deckTotal, 8);
});

test('adapter.adaptFindings without deckMeta omits deckTitle/deckTotal (back-compat)', () => {
  const { adaptFindings } = require('../skills/annotate/scripts/adapter');
  const findings = {
    schema_version: '1.1',
    slides: [
      {
        slideNum: 1,
        title: 'S1',
        findings: [
          {
            severity_reviewer: 'Major', category: 'defect', genuine: true,
            nx: 0.5, ny: 0.5, text: 'x', rationale: 'r', location: 'l',
            standard: 's', fix: 'f',
          },
        ],
      },
    ],
  };
  const samples = adaptFindings(findings);
  assert.equal(samples[0].deckTitle, undefined);
  assert.equal(samples[0].deckTotal, undefined);
});

test('readDeckMeta extracts dc:title and slide count from a PPTX', async () => {
  const { readDeckMeta } = require('../skills/annotate/scripts/adapter');
  const fixtureDeck = path.join(
    __dirname, 'fixtures', 'v8-reference', 'Annotations_Sample.pptx');
  const meta = await readDeckMeta(fixtureDeck);
  // v8 fixture has 43 annotated slides per the historical hardcode.
  assert.equal(typeof meta, 'object');
  assert.ok(typeof meta.deckTotal === 'number' && meta.deckTotal > 0,
    `deckTotal must be a positive number, got ${meta.deckTotal}`);
  // deckTitle may be empty string if core.xml lacks dc:title — must still be a string.
  assert.equal(typeof meta.deckTitle, 'string');
});
