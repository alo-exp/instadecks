// tests/assert-pin.test.js — Exercises tools/assert-pptxgenjs-pin.js (FOUND-05).
//
// Each test writes a temp package.json and invokes the assertion script with
// that path, asserting on exit code + stderr message.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const SCRIPT = path.resolve(process.cwd(), 'tools/assert-pptxgenjs-pin.js');

function writePkg(deps) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'assert-pin-'));
  const pkgPath = path.join(dir, 'package.json');
  const body = { name: 'tmp', version: '0.0.0' };
  if (deps !== undefined) body.dependencies = deps;
  fs.writeFileSync(pkgPath, JSON.stringify(body, null, 2));
  return pkgPath;
}

function run(pkgPath) {
  return spawnSync('node', [SCRIPT, pkgPath], { encoding: 'utf8' });
}

test('4.0.1 exact passes', () => {
  const r = run(writePkg({ pptxgenjs: '4.0.1' }));
  assert.equal(r.status, 0, 'stderr=' + r.stderr);
  assert.match(r.stdout, /pptxgenjs pin OK: 4\.0\.1/);
});

test('^4.0.1 fails', () => {
  const r = run(writePkg({ pptxgenjs: '^4.0.1' }));
  assert.equal(r.status, 1);
  assert.match(r.stderr, /FOUND-05 invariant/);
});

test('~4.0.1 fails', () => {
  const r = run(writePkg({ pptxgenjs: '~4.0.1' }));
  assert.equal(r.status, 1);
  assert.match(r.stderr, /FOUND-05 invariant/);
});

test('4.0.0 fails', () => {
  const r = run(writePkg({ pptxgenjs: '4.0.0' }));
  assert.equal(r.status, 1);
  assert.match(r.stderr, /4\.0\.1/);
});

test('missing dep fails', () => {
  const r = run(writePkg({}));
  assert.equal(r.status, 1);
  assert.match(r.stderr, /FOUND-05 invariant/);
});

test('4.0.1 with surrounding spaces fails', () => {
  const r = run(writePkg({ pptxgenjs: ' 4.0.1 ' }));
  assert.equal(r.status, 1);
  assert.match(r.stderr, /FOUND-05 invariant/);
});
