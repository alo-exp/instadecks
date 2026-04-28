'use strict';
// create-integration.test.js — Phase 4 Plan 04 end-to-end gate.
// Closes the integration ribbon for CRT-01..CRT-06 + CRT-15 simultaneously.
// Soffice/xmllint missing → individual subtests skip cleanly (Phase 7 release-gate
// territory per D-05 Layer 3).

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const { execSync, spawnSync } = require('node:child_process');

const { runCreate } = require('../skills/create/scripts/index');

const SOFFICE = (() => {
  try { execSync('command -v soffice', { stdio: 'ignore' }); return true; }
  catch { return false; }
})();
const XMLLINT = (() => {
  try { execSync('command -v xmllint', { stdio: 'ignore' }); return true; }
  catch { return false; }
})();

async function freshTmp() {
  const t = path.join(process.cwd(), '.tmp-test',
    `create-int-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  await fsp.mkdir(t, { recursive: true });
  return t;
}

const FIXTURE_BRIEF = path.join(__dirname, 'fixtures', 'sample-brief.json');
const FIXTURE_CJS = path.join(__dirname, 'fixtures', 'sample-render-deck.cjs');
const BAD_CJS = path.join(__dirname, 'fixtures', 'bad-render-deck.cjs');

test('end-to-end: brief + cjs → deck + pdf + rationale (CRT-01..CRT-06 + P-10)',
  { skip: !SOFFICE && 'soffice missing — Phase 7 will gate on real-PowerPoint open' },
  async (t) => {
    const tmp = await freshTmp();
    t.after(() => fsp.rm(tmp, { recursive: true, force: true }));

    // Stage cjs into run dir (in production, agent authors this; here, copy fixture).
    await fsp.copyFile(FIXTURE_CJS, path.join(tmp, 'render-deck.cjs'));
    const brief = JSON.parse(fs.readFileSync(FIXTURE_BRIEF, 'utf8'));

    const result = await runCreate({
      brief,
      outDir: tmp,
      mode: 'structured-handoff',
      designChoices: {
        palette: {
          name: 'Indigo Dawn',
          primary: '1E2761',
          secondary: 'CADCFC',
          accent: 'FFFFFF',
          ink: '0B1020',
          muted: '6B7280',
          rationale: 'executive depth without corporate-blue cliché',
        },
        typography: {
          heading: 'Inter',
          body: 'IBM Plex Sans',
          rationale: 'high-density executive typography',
        },
        motif: 'progressive disclosure with section-rail dividers',
        tradeoffs: ['no images in v1', 'IBM Plex on all platforms'],
      },
    });

    // CRT-01: outputs exist.
    assert.ok(fs.existsSync(result.deckPath), 'deck.pptx exists');
    assert.ok(fs.statSync(result.deckPath).size > 0, 'deck.pptx non-empty');

    // PDF exists OR a soffice-related warning is surfaced.
    assert.ok(
      (result.pdfPath && fs.existsSync(result.pdfPath))
        || result.warnings.some(w => /soffice/i.test(w)),
      'pdf produced or warning surfaced'
    );

    // D-07: rationale.md exists with all 6 sections.
    assert.ok(fs.existsSync(result.rationalePath), 'rationale.md exists');
    const md = fs.readFileSync(result.rationalePath, 'utf8');
    for (const section of [
      '## Palette', '## Typography', '## Motif',
      '## Narrative Arc', '## Key Tradeoffs', '## Reviewer Notes',
    ]) {
      assert.match(md, new RegExp(section), `rationale missing ${section}`);
    }

    // CRT-04: 8 slide types (sample fixture ships 9; assert ≥8).
    assert.ok(
      typeof result.slidesCount === 'number' && result.slidesCount >= 8,
      `slidesCount ≥ 8 (CRT-04); got ${result.slidesCount}`
    );

    // P-10: speaker-notes XML present per slide (notesSlide*.xml inside the .pptx).
    const unzip = spawnSync('unzip', ['-l', result.deckPath], { encoding: 'utf8' });
    assert.equal(unzip.status, 0, `unzip listing failed: ${unzip.stderr}`);
    const notesCount = (unzip.stdout.match(/notesSlide\d+\.xml/g) || []).length;
    assert.ok(
      notesCount >= result.slidesCount - 1,
      `notesSlide*.xml present for most slides (P-10): got ${notesCount} for ${result.slidesCount} slides`
    );

    if (XMLLINT) {
      assert.ok(
        !result.warnings.some(w => /xmllint.*missing/i.test(w)),
        'xmllint ran (no skip warning)'
      );
    }
  });

test('integration: enum-lint catches bad cjs before spawn (D-05 Layer 2 / CRT-15)', async (t) => {
  const tmp = await freshTmp();
  t.after(() => fsp.rm(tmp, { recursive: true, force: true }));
  await fsp.copyFile(BAD_CJS, path.join(tmp, 'render-deck.cjs'));
  const brief = JSON.parse(fs.readFileSync(FIXTURE_BRIEF, 'utf8'));
  await assert.rejects(
    () => runCreate({ brief, outDir: tmp, mode: 'structured-handoff' }),
    /enum-lint|addShape/i,
    'bad cjs must be rejected by enum-lint before node spawn'
  );
});

test('integration: CLI subprocess happy path (RVW-07 parallel for create)',
  { skip: !SOFFICE && 'soffice missing' },
  async (t) => {
    const tmp = await freshTmp();
    t.after(() => fsp.rm(tmp, { recursive: true, force: true }));
    await fsp.copyFile(FIXTURE_CJS, path.join(tmp, 'render-deck.cjs'));
    const r = spawnSync(process.execPath, [
      path.join(__dirname, '..', 'skills', 'create', 'scripts', 'cli.js'),
      '--brief', FIXTURE_BRIEF,
      '--out-dir', tmp,
      '--mode', 'standalone',
    ], { encoding: 'utf8' });
    assert.equal(r.status, 0, `CLI failed: ${r.stderr}`);
    const out = JSON.parse(r.stdout);
    assert.ok(out.deckPath && fs.existsSync(out.deckPath), 'CLI deckPath exists');
    assert.ok(typeof out.slidesCount === 'number' && out.slidesCount >= 8,
      `CLI slidesCount ≥ 8; got ${out.slidesCount}`);
  });
