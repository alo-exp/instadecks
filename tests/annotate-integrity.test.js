// Phase 1 scaffold: it.skip until Phase 2 commits skills/annotate/scripts/annotate.js (per CONTEXT.md D-06). Phase 1 records the PRE-patch SHA; Phase 2 replaces it with post-patch SHA after applying the documented require-path patch.
// SKIPPED IN PHASE 1: skills/annotate/scripts/annotate.js does not yet exist. Phase 2 unsuspends after copying the file and recording the post-patch SHA.
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const crypto = require('node:crypto');
const path = require('node:path');

test(
  'annotate.js post-patch SHA matches v8 baseline',
  {
    skip: 'Phase 2 unsuspends after copying file + applying require-path patch + replacing PRE-PATCH SHA with post-patch SHA',
  },
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
