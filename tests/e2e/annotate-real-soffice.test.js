'use strict';
// E2E: /annotate end-to-end with real soffice (PDF conversion) + real pptxgenjs
// (PPTX emit). Skipped when CI=true or soffice absent (CONTEXT D-08).

const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { skipWithoutSoffice } = require('./helpers/skip-without-soffice');

test('e2e: /annotate end-to-end with real soffice', { timeout: 180000 }, (t) => {
  if (skipWithoutSoffice(t)) return;

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'instadecks-e2e-annotate-'));
  try {
    const deckSrc = path.resolve(__dirname, '..', 'fixtures', 'v8-reference', 'Annotations_Sample.pptx');
    const findingsPath = path.resolve(__dirname, '..', 'fixtures', 'sample-findings.json');
    assert.ok(fs.existsSync(deckSrc), `reference deck missing at ${deckSrc}`);
    assert.ok(fs.existsSync(findingsPath), `sample findings missing at ${findingsPath}`);

    // Copy the deck into tmp so the .annotated.pptx sibling lands inside our tmp dir
    // (annotate writes sibling-of-input, per Phase 2 D-03/D-04).
    const deckPath = path.join(tmp, 'deck.pptx');
    fs.copyFileSync(deckSrc, deckPath);

    const cli = path.resolve(__dirname, '..', '..', 'skills', 'annotate', 'scripts', 'cli.js');
    const r = spawnSync('node', [cli, deckPath, findingsPath, tmp], {
      encoding: 'utf8', timeout: 160000,
    });
    assert.equal(r.status, 0, `annotate cli exited ${r.status}; stderr:\n${r.stderr}`);

    const annotatedPptx = path.join(tmp, 'deck.annotated.pptx');
    const annotatedPdf = path.join(tmp, 'deck.annotated.pdf');
    assert.ok(fs.existsSync(annotatedPptx), `expected ${annotatedPptx}`);
    assert.ok(fs.existsSync(annotatedPdf), `expected ${annotatedPdf} (real soffice required)`);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

// FIX BLOCKER #1 regression test: when deckPath is NOT the v8 reference deck,
// runAnnotate MUST render the user's deck fresh (not symlink the bundled v8 JPGs).
// We assert that the workDir contains rendered/slide-*.jpg artifacts produced from
// the user's deck (proves fresh render path was taken, not the v8-fixture shortcut).
test('e2e: /annotate renders user deck fresh (not v8 fixture imagery)', { timeout: 180000 }, async (t) => {
  if (skipWithoutSoffice(t)) return;

  const { runAnnotate } = require('../../skills/annotate/scripts/index');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'instadecks-e2e-annotate-userdeck-'));
  try {
    // Use tiny-deck.pptx (NOT the v8 fixture) — its SHA differs from the pinned v8 SHA,
    // so runAnnotate must take the fresh-render branch.
    const tinySrc = path.resolve(__dirname, '..', 'fixtures', 'tiny-deck.pptx');
    assert.ok(fs.existsSync(tinySrc), `tiny-deck.pptx missing at ${tinySrc}`);
    const deckPath = path.join(tmp, 'user-deck.pptx');
    fs.copyFileSync(tinySrc, deckPath);

    // Hand-crafted findings referencing slide 1 only (tiny-deck has 1 slide).
    const findings = {
      schema_version: '1.1',
      deck: 'user-deck.pptx',
      generated_at: '2026-04-28T00:00:00Z',
      slides: [
        {
          slideNum: 1,
          title: 'Slide 1',
          findings: [
            {
              severity_reviewer: 'Major',
              category: 'defect',
              genuine: true,
              nx: 0.5,
              ny: 0.5,
              text: 'Test finding',
              rationale: 'Rationale for fresh-render assertion',
              location: 'Center',
              standard: 'Test',
              fix: 'Fix',
            },
          ],
        },
      ],
    };

    const outDir = path.join(tmp, 'run');
    const r = await runAnnotate({ deckPath, findings, outDir });

    // Artifact existence
    assert.ok(fs.existsSync(r.pdfPath), `expected ${r.pdfPath}`);
    assert.ok(fs.existsSync(r.pptxPath), `expected ${r.pptxPath}`);

    // CRITICAL: workDir must contain a `rendered/` subdir with slide-*.jpg from the
    // user's deck (proves fresh render was taken, not v8 fixture symlink).
    const renderedDir = path.join(r.runDir, 'work', 'rendered');
    assert.ok(fs.existsSync(renderedDir),
      `expected ${renderedDir} — fresh render of user deck required (BLOCKER #1)`);
    const renderedJpgs = fs.readdirSync(renderedDir).filter(f => /^slide-\d+\.jpg$/.test(f));
    assert.ok(renderedJpgs.length > 0,
      `expected user-deck JPGs in ${renderedDir}, saw: ${fs.readdirSync(renderedDir).join(', ')}`);

    // The v8s-NN.jpg symlink in workDir must resolve to the freshly-rendered JPG
    // (not the bundled fixture). Check by realpath.
    const link = path.join(r.runDir, 'work', 'v8s-01.jpg');
    assert.ok(fs.existsSync(link), `expected symlink ${link}`);
    const real = fs.realpathSync(link);
    assert.ok(real.includes(path.sep + 'rendered' + path.sep),
      `v8s-01.jpg should resolve into rendered/ for non-v8 decks; got ${real}`);
    assert.ok(!real.includes(path.sep + 'v8-reference' + path.sep),
      `v8s-01.jpg must NOT resolve to v8-reference fixture for user decks; got ${real}`);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
