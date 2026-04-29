'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const path = require('node:path');
const { runCheck, parseNoticeDeps, classifyLicense, run } = require('../tools/license-audit');

const NOTICE_GREEN = `Header text
- pptxgenjs (MIT) — https://github.com/gitbrent/PptxGenJS
  Copyright (c) Brent.

- IBM Plex Sans (SIL OFL 1.1) — https://github.com/IBM/plex
  Copyright IBM.

- jszip (MIT or GPL-3.0; used under MIT) — https://github.com/Stuk/jszip

- image-size (MIT) — https://github.com/image-size/image-size
`;

const SUBDIRS_GREEN = ['pptxgenjs', 'IBM_Plex_Sans', 'jszip', 'image-size'];

test('green: no GPL/AGPL prod deps; NOTICE <-> licenses/ aligned', () => {
  const pkgs = {
    'pptxgenjs@4.0.1': { licenses: 'MIT' },
    'jszip@3.10.1': { licenses: '(MIT OR GPL-3.0)' },
    'image-size@1.0.0': { licenses: 'MIT' },
  };
  const r = runCheck(pkgs, NOTICE_GREEN, SUBDIRS_GREEN);
  assert.equal(r.ok, true, JSON.stringify(r.violations));
});

test('red: GPL transitive without whitelist is rejected', () => {
  const pkgs = {
    'evil-gpl-lib@1.0.0': { licenses: 'GPL-3.0' },
  };
  const r = runCheck(pkgs, NOTICE_GREEN, SUBDIRS_GREEN);
  assert.equal(r.ok, false);
  assert.ok(r.violations.some((v) => v.kind === 'gpl-transitive' && v.package === 'evil-gpl-lib@1.0.0'));
});

test('green: jszip GPL OR MIT passes (whitelisted as MIT)', () => {
  const pkgs = {
    'jszip@3.10.1': { licenses: '(MIT OR GPL-3.0)' },
  };
  const r = runCheck(pkgs, NOTICE_GREEN, SUBDIRS_GREEN);
  assert.equal(r.ok, true);
  // Whitelist classification check
  const c = classifyLicense('jszip', '(MIT OR GPL-3.0)');
  assert.equal(c.ok, true);
  assert.equal(c.whitelisted, true);
});

test('red: NOTICE dep without licenses/<dep> subdir', () => {
  const r = runCheck({}, NOTICE_GREEN, ['pptxgenjs', 'IBM_Plex_Sans', 'jszip']);
  assert.equal(r.ok, false);
  assert.ok(r.violations.some((v) => v.kind === 'notice-missing-licenses-dir' && v.dep === 'image-size'));
});

test('red: licenses/<dep> subdir without NOTICE entry', () => {
  const r = runCheck({}, NOTICE_GREEN, SUBDIRS_GREEN.concat(['orphan-dep']));
  assert.equal(r.ok, false);
  assert.ok(r.violations.some((v) => v.kind === 'licenses-dir-missing-notice' && v.dep === 'orphan-dep'));
});

test('HARD-03: run() emits OK message to stdout on clean tree', async () => {
  // Direct exercise of tools/license-audit.js lines 132-134 — the OK-path stdout
  // emission. Captures process.stdout.write for the duration of the call so the
  // assertion runs against the exact string the script writes.
  const origWrite = process.stdout.write.bind(process.stdout);
  let captured = '';
  process.stdout.write = (chunk, ...rest) => { captured += String(chunk); return origWrite(chunk, ...rest); };
  try {
    const r = await run(path.join(__dirname, '..'));
    assert.equal(r.ok, true, JSON.stringify(r.violations));
    assert.match(captured, /license-audit: OK \(no GPL\/AGPL prod deps; NOTICE <-> licenses\/ in sync\)/);
  } finally {
    process.stdout.write = origWrite;
  }
});

test('HARD-03: run() emits violations to stderr on dirty tree', async () => {
  // Covers the !r.ok branch (lines 127-131): missing licenses/<dep>/LICENSE files
  // for NOTICE-listed deps. We point run() at a synthetic rootDir with a NOTICE
  // listing a phantom dep and no licenses/ subdir.
  const fs = require('node:fs');
  const os = require('node:os');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lic-aud-dirty-'));
  fs.writeFileSync(path.join(tmp, 'NOTICE'), '- phantom-dep (MIT) — link\n');
  // licenses/ dir omitted entirely → notice-missing-licenses-dir violation.
  // license-checker against tmp is fine (no node_modules → empty pkg map).
  fs.mkdirSync(path.join(tmp, 'node_modules'), { recursive: true });
  fs.writeFileSync(path.join(tmp, 'package.json'), '{"name":"x","version":"0.0.0"}');
  const origStderr = process.stderr.write.bind(process.stderr);
  let stderr = '';
  process.stderr.write = (chunk, ...rest) => { stderr += String(chunk); return origStderr(chunk, ...rest); };
  try {
    const r = await run(tmp);
    assert.equal(r.ok, false);
    assert.match(stderr, /license-audit: violations found/);
    assert.match(stderr, /notice-missing-licenses-dir/);
  } finally {
    process.stderr.write = origStderr;
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('HARD-03: run() flags empty licenses/<dep>/LICENSE files', async () => {
  // Covers the empty-license-file violation branch (lines 122-125).
  const fs = require('node:fs');
  const os = require('node:os');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lic-aud-empty-'));
  fs.writeFileSync(path.join(tmp, 'NOTICE'), '- foo (MIT) — link\n');
  fs.mkdirSync(path.join(tmp, 'licenses', 'foo'), { recursive: true });
  fs.writeFileSync(path.join(tmp, 'licenses', 'foo', 'LICENSE'), ''); // empty
  fs.mkdirSync(path.join(tmp, 'node_modules'), { recursive: true });
  fs.writeFileSync(path.join(tmp, 'package.json'), '{"name":"x","version":"0.0.0"}');
  try {
    const r = await run(tmp);
    assert.equal(r.ok, false);
    assert.ok(r.violations.some((v) => v.kind === 'empty-license-file' && v.dep === 'foo'),
      JSON.stringify(r.violations));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('parseNoticeDeps extracts only the bundled-software bullets', () => {
  const deps = parseNoticeDeps(NOTICE_GREEN);
  const names = deps.map((d) => d.name);
  assert.deepEqual(names.sort(), ['IBM Plex Sans', 'image-size', 'jszip', 'pptxgenjs'].sort());
});
