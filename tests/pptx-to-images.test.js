'use strict';
// tests/pptx-to-images.test.js — Smoke + negative-case coverage for scripts/pptx-to-images.sh.
// Covers RVW-09 (-env:UserInstallation flag), RVW-10 (existence/size/magic-bytes), RVW-11 (cleanup trap).
// Skip-guards on missing soffice/pdftoppm so CI without those tools stays green (Phase 7 RESERVED block).

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'pptx-to-images.sh');
const FIXTURE = path.join(__dirname, 'fixtures', 'tiny-deck.pptx');

const sofficeAvailable = spawnSync('command', ['-v', 'soffice'], { shell: true }).status === 0;
const pdftoppmAvailable = spawnSync('command', ['-v', 'pdftoppm'], { shell: true }).status === 0;

function freshTmp(tag) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `${tag}-`));
}

function listLoTmpDirs() {
  return fs.readdirSync('/tmp').filter(n => n.startsWith('lo-'));
}

test('pptx-to-images.sh', async (t) => {
  const script = fs.readFileSync(SCRIPT, 'utf8');

  await t.test('static: RVW-09 -env:UserInstallation flag present', () => {
    assert.match(script, /-env:UserInstallation=file:\/\/\$LO_PROFILE/);
  });

  await t.test('static: RVW-11 cleanup trap installed for EXIT INT TERM', () => {
    assert.match(script, /trap [^\n]*rm -rf [^\n]*\$LO_PROFILE[^\n]*EXIT INT TERM/);
  });

  await t.test('static: timeout 60 wraps soffice', () => {
    assert.match(script, /timeout 60 soffice/);
  });

  await t.test('static: Q-3 portable size check via wc -c', () => {
    assert.match(script, /wc -c < "\$PDF_PATH"/);
  });

  await t.test('static: PDF magic-bytes check via head -c 4', () => {
    assert.match(script, /head -c 4 "\$PDF_PATH"/);
  });

  await t.test('script is executable', () => {
    const mode = fs.statSync(SCRIPT).mode;
    assert.ok(mode & 0o111, 'expected execute bit set on pptx-to-images.sh');
  });

  await t.test('negative: missing input file → exit 1 with input-not-a-file stderr', () => {
    const outDir = freshTmp('p2i-neg');
    try {
      const result = spawnSync('bash', [SCRIPT, '/nonexistent/foo.pptx', outDir], { encoding: 'utf8' });
      assert.equal(result.status, 1, `expected exit 1, got ${result.status}\nstderr: ${result.stderr}`);
      assert.match(result.stderr, /input not a file/);
    } finally {
      fs.rmSync(outDir, { recursive: true, force: true });
    }
  });

  await t.test('negative: missing args → exit 1 with usage', () => {
    const result = spawnSync('bash', [SCRIPT], { encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Usage:/);
  });

  await t.test('positive: PPTX → PDF + JPGs end-to-end', { skip: !sofficeAvailable || !pdftoppmAvailable }, () => {
    const outDir = freshTmp('p2i-pos');
    // Pin SESSION_ID so we can grep ONLY our own /tmp/lo-<sid>-* dirs (avoids false positives
    // from concurrent test files that also invoke soffice with their own SESSION_IDs).
    const sessionId = `p2itest${Date.now()}${Math.floor(Math.random() * 1e6)}`;
    try {
      const result = spawnSync('bash', [SCRIPT, FIXTURE, outDir], {
        encoding: 'utf8',
        env: { ...process.env, CLAUDE_SESSION_ID: sessionId },
      });
      assert.equal(result.status, 0, `expected exit 0, got ${result.status}\nstderr: ${result.stderr}\nstdout: ${result.stdout}`);

      const pdfPath = path.join(outDir, 'tiny-deck.pdf');
      assert.ok(fs.existsSync(pdfPath), `PDF missing: ${pdfPath}`);
      const pdfSize = fs.statSync(pdfPath).size;
      assert.ok(pdfSize > 1024, `PDF size ${pdfSize} ≤ 1024`);
      const pdfMagic = fs.readFileSync(pdfPath).slice(0, 4).toString('ascii');
      assert.equal(pdfMagic, '%PDF');

      const jpgs = fs.readdirSync(outDir).filter(n => /^slide-\d+\.jpg$/.test(n));
      assert.ok(jpgs.length >= 1, `expected ≥1 slide-*.jpg, got ${jpgs.length}`);
      const firstJpg = fs.readFileSync(path.join(outDir, jpgs[0]));
      assert.ok(firstJpg.length > 1024, 'JPG too small');
      assert.equal(firstJpg[0], 0xff);
      assert.equal(firstJpg[1], 0xd8);
      assert.equal(firstJpg[2], 0xff);

      // RVW-11: cleanup trap fired — no /tmp/lo-<our-session-id>-* dirs remain.
      const ourLeaks = listLoTmpDirs().filter(n => n.startsWith(`lo-${sessionId}-`));
      assert.equal(ourLeaks.length, 0, `cleanup trap leaked: ${ourLeaks.join(', ')}`);
    } finally {
      fs.rmSync(outDir, { recursive: true, force: true });
    }
  });
});
