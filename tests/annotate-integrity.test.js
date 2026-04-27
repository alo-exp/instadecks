// Phase 2 active — verifies post-patch SHA pin per ANNO-02; reads tests/fixtures/v8-reference/annotate.js.sha256 (banner: POST-PATCH).
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const crypto = require('node:crypto');
const path = require('node:path');

test(
  'annotate.js post-patch SHA matches v8 baseline',
  async () => {
    const shaPath = path.join(
      __dirname,
      'fixtures',
      'v8-reference',
      'annotate.js.sha256',
    );
    const annotatePath = path.join(
      __dirname,
      '..',
      'skills',
      'annotate',
      'scripts',
      'annotate.js',
    );
    const raw = await fs.readFile(shaPath, 'utf8');
    const expected = raw
      .split('\n')
      .filter((l) => !l.startsWith('#') && l.trim())
      .map((l) => l.split(/\s+/)[0])[0];
    const buf = await fs.readFile(annotatePath);
    const actual = crypto.createHash('sha256').update(buf).digest('hex');
    assert.equal(
      actual,
      expected,
      'annotate.js drift — file modified beyond the documented one-line require-path patch',
    );
  },
);
