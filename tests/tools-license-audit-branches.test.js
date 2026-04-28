'use strict';
// tests/tools-license-audit-branches.test.js — branch-coverage gaps for
// tools/license-audit.js. Complements tests/license-audit.test.js. Adds branches:
// classifyLicense without GPL substring (pure pass), license-checker error path via run(),
// AGPL detection, parseNoticeDeps filtering of header lines, and SLUG_MAP rewrite.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { runCheck, parseNoticeDeps, classifyLicense, run } =
  require('../tools/license-audit');

test('tools-license-audit-branches', async (t) => {
  await t.test('classifyLicense: clean MIT passes immediately (non-GPL branch)', () => {
    const c = classifyLicense('any', 'MIT');
    assert.equal(c.ok, true);
  });

  await t.test('classifyLicense: AGPL fails (separate regex branch from GPL)', () => {
    const c = classifyLicense('agpl-thing', 'AGPL-3.0');
    assert.equal(c.ok, false);
    assert.equal(c.reason, 'gpl-transitive');
  });

  await t.test('classifyLicense: undefined license string is treated as non-GPL', () => {
    const c = classifyLicense('no-lic', undefined);
    assert.equal(c.ok, true);
  });

  await t.test('parseNoticeDeps: skips ALL-CAPS section header bullets', () => {
    const notice = [
      '- BUNDLED SOFTWARE ATTRIBUTION (X)',
      '- pptxgenjs (MIT) — link',
      '- Copyright Foo (Bar)',
    ].join('\n');
    const deps = parseNoticeDeps(notice);
    assert.deepEqual(deps.map(d => d.name), ['pptxgenjs']);
  });

  await t.test('parseNoticeDeps: handles empty notice', () => {
    assert.deepEqual(parseNoticeDeps(''), []);
  });

  await t.test('runCheck: SLUG_MAP rewrites "IBM Plex Sans" → IBM_Plex_Sans', () => {
    const notice = '- IBM Plex Sans (SIL OFL 1.1) — link\n';
    const r = runCheck({}, notice, ['IBM_Plex_Sans']);
    assert.equal(r.ok, true);
  });

  await t.test('runCheck: empty pkg map + empty notice + empty subdirs → ok', () => {
    const r = runCheck({}, '', []);
    assert.equal(r.ok, true);
  });

  await t.test('run(): bad rootDir (no NOTICE) throws synchronously via fs.readFileSync', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'lic-aud-br-'));
    try {
      // No NOTICE file → readFileSync throws SYNCHRONOUSLY (before run() returns its Promise).
      assert.throws(() => run(root), /ENOENT/);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
