// tests/lib-review-read-deck-xml-branches.test.js — Plan 08-02 Task 1 (Group C).
// Branch coverage for skills/review/scripts/lib/read-deck-xml.js::loadSlides
// (T-03-13 zip-bomb guard, ENOENT propagation, XML throw path, ordered output).

'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const JSZip = require('jszip');

const { loadSlides, MAX_PPTX_BYTES } = require('../skills/review/scripts/lib/read-deck-xml');

const TINY_PPTX = path.join(__dirname, 'fixtures', 'tiny-deck.pptx');

function tmp() { return fs.mkdtempSync(path.join(os.tmpdir(), 'instadecks-08-02-rdx-')); }

test('MAX_PPTX_BYTES is 100MB', () => {
  assert.equal(MAX_PPTX_BYTES, 100 * 1024 * 1024);
});

test('loadSlides: returns ordered slide xml entries from real fixture', async (t) => {
  if (!fs.existsSync(TINY_PPTX)) { t.skip(); return; }
  const slides = await loadSlides(TINY_PPTX);
  assert.ok(slides.length >= 1);
  for (const s of slides) {
    assert.equal(typeof s.slideNum, 'number');
    assert.ok(Number.isInteger(s.slideNum));
    assert.equal(typeof s.xml, 'string');
    assert.ok(s.xml.length > 0);
  }
  // Ordering: slideNum strictly ascending.
  for (let i = 1; i < slides.length; i++) {
    assert.ok(slides[i].slideNum > slides[i - 1].slideNum);
  }
});

test('loadSlides: throws on non-existent file (statSync ENOENT)', async () => {
  await assert.rejects(() => loadSlides('/nonexistent/file.pptx'));
});

test('loadSlides: throws when file size > 100MB cap', async (t) => {
  // Synthesize a stat result by creating a sparse file (truncate to 101MB, no actual write).
  const dir = tmp();
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const big = path.join(dir, 'big.pptx');
  const fd = fs.openSync(big, 'w');
  try {
    fs.ftruncateSync(fd, MAX_PPTX_BYTES + 1);
  } finally {
    fs.closeSync(fd);
  }
  await assert.rejects(() => loadSlides(big), /exceeds 100MB cap/);
});

test('loadSlides: returns [] when zip has no ppt/slides/slideN.xml entries', async (t) => {
  const dir = tmp();
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const empty = path.join(dir, 'no-slides.pptx');
  const zip = new JSZip();
  zip.file('[Content_Types].xml', '<Types/>');
  zip.file('ppt/presentation.xml', '<presentation/>');
  fs.writeFileSync(empty, await zip.generateAsync({ type: 'nodebuffer' }));
  const slides = await loadSlides(empty);
  assert.deepEqual(slides, []);
});

test('loadSlides: filters non-slide files in ppt/ tree', async (t) => {
  const dir = tmp();
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const out = path.join(dir, 'mixed.pptx');
  const zip = new JSZip();
  zip.file('ppt/slides/slide1.xml', '<sld><a:t>one</a:t></sld>');
  zip.file('ppt/slides/_rels/slide1.xml.rels', '<rels/>');
  zip.file('ppt/slideLayouts/slideLayout1.xml', '<layout/>');
  zip.file('ppt/notesSlides/notesSlide1.xml', '<notes/>');
  fs.writeFileSync(out, await zip.generateAsync({ type: 'nodebuffer' }));
  const slides = await loadSlides(out);
  assert.equal(slides.length, 1);
  assert.equal(slides[0].slideNum, 1);
  assert.equal(slides[0].xml, '<sld><a:t>one</a:t></sld>');
});

test('loadSlides: sorts slides numerically (slide10 after slide2)', async (t) => {
  const dir = tmp();
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const out = path.join(dir, 'sort.pptx');
  const zip = new JSZip();
  for (const n of [10, 1, 2, 11]) zip.file(`ppt/slides/slide${n}.xml`, `<s>${n}</s>`);
  fs.writeFileSync(out, await zip.generateAsync({ type: 'nodebuffer' }));
  const slides = await loadSlides(out);
  assert.deepEqual(slides.map(s => s.slideNum), [1, 2, 10, 11]);
});

test('loadSlides: throws on malformed (non-zip) input', async (t) => {
  const dir = tmp();
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const bad = path.join(dir, 'bad.pptx');
  fs.writeFileSync(bad, 'not a zip file');
  await assert.rejects(() => loadSlides(bad));
});
