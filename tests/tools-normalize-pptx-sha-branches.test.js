'use strict';
// tests/tools-normalize-pptx-sha-branches.test.js — branch coverage for
// tools/normalize-pptx-sha.js. Covers the three normalization paths (DIR entry,
// docProps/core.xml timestamp scrub, slide descr= path-strip), determinism, and
// the non-pptx (non-zip) input throw path.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const JSZip = require('jszip');

const { normalizedShaOfPptx } = require('../tools/normalize-pptx-sha');

function tmp() { return fs.mkdtempSync(path.join(os.tmpdir(), 'norm-pptx-sha-')); }

async function makeZip(entries) {
  const zip = new JSZip();
  for (const [name, content] of Object.entries(entries)) {
    if (name.endsWith('/')) {
      zip.folder(name.slice(0, -1));
    } else {
      zip.file(name, content);
    }
  }
  return zip.generateAsync({ type: 'nodebuffer' });
}

test('tools-normalize-pptx-sha-branches', async (t) => {
  await t.test('determinism: same input → same SHA across runs', async () => {
    const dir = tmp();
    try {
      const p = path.join(dir, 'a.pptx');
      const buf = await makeZip({
        '[Content_Types].xml': '<x/>',
        'docProps/core.xml': '<root><dcterms:created>2026-01-01</dcterms:created><dcterms:modified>x</dcterms:modified></root>',
        'ppt/slides/slide1.xml': '<sld><pic descr="/abs/path/to/img.png"/></sld>',
      });
      fs.writeFileSync(p, buf);
      const sha1 = await normalizedShaOfPptx(p);
      const sha2 = await normalizedShaOfPptx(p);
      assert.equal(sha1, sha2);
      assert.match(sha1, /^[a-f0-9]{64}$/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  await t.test('timestamp scrub: differing dcterms values produce same SHA', async () => {
    const dir = tmp();
    try {
      const a = path.join(dir, 'a.pptx');
      const b = path.join(dir, 'b.pptx');
      fs.writeFileSync(a, await makeZip({
        '[Content_Types].xml': '<x/>',
        'docProps/core.xml': '<r><dcterms:created>2020</dcterms:created><dcterms:modified>2020</dcterms:modified></r>',
      }));
      fs.writeFileSync(b, await makeZip({
        '[Content_Types].xml': '<x/>',
        'docProps/core.xml': '<r><dcterms:created>9999</dcterms:created><dcterms:modified>9999</dcterms:modified></r>',
      }));
      assert.equal(await normalizedShaOfPptx(a), await normalizedShaOfPptx(b));
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  await t.test('slide descr path-strip: absolute path vs basename produce same SHA', async () => {
    const dir = tmp();
    try {
      const a = path.join(dir, 'a.pptx');
      const b = path.join(dir, 'b.pptx');
      fs.writeFileSync(a, await makeZip({
        'ppt/slides/slide1.xml': '<sld><pic descr="/some/long/abs/path/img.png"/></sld>',
      }));
      fs.writeFileSync(b, await makeZip({
        'ppt/slides/slide1.xml': '<sld><pic descr="img.png"/></sld>',
      }));
      assert.equal(await normalizedShaOfPptx(a), await normalizedShaOfPptx(b));
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  await t.test('descr without path separator passes through (no slash branch)', async () => {
    const dir = tmp();
    try {
      const p = path.join(dir, 'a.pptx');
      fs.writeFileSync(p, await makeZip({
        'ppt/slides/slide1.xml': '<sld><pic descr="plain.png"/></sld>',
      }));
      const sha = await normalizedShaOfPptx(p);
      assert.match(sha, /^[a-f0-9]{64}$/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  await t.test('non-pptx (non-zip) input rejects', async () => {
    const dir = tmp();
    try {
      const p = path.join(dir, 'not-a-zip.pptx');
      fs.writeFileSync(p, 'this is plainly not a zip file');
      await assert.rejects(normalizedShaOfPptx(p));
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  await t.test('zip with directory entries: DIR branch is hit', async () => {
    const dir = tmp();
    try {
      const p = path.join(dir, 'a.pptx');
      const zip = new JSZip();
      zip.folder('ppt');
      zip.folder('ppt/slides');
      zip.file('ppt/slides/slide1.xml', '<sld/>');
      fs.writeFileSync(p, await zip.generateAsync({ type: 'nodebuffer' }));
      const sha = await normalizedShaOfPptx(p);
      assert.match(sha, /^[a-f0-9]{64}$/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
