'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { runCheck, parseNoticeDeps, classifyLicense } = require('../tools/license-audit');

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

test('parseNoticeDeps extracts only the bundled-software bullets', () => {
  const deps = parseNoticeDeps(NOTICE_GREEN);
  const names = deps.map((d) => d.name);
  assert.deepEqual(names.sort(), ['IBM Plex Sans', 'image-size', 'jszip', 'pptxgenjs'].sort());
});
