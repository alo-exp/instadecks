// tests/lib-content-review-extract-content.test.js — Plan 08-02 Task 1 (Group A).
// Branch coverage for skills/content-review/scripts/lib/extract-content.js:
// extractContent (input validation, missing file, real PPTX), and the _internal
// pure helpers (decoding, paragraph/shape parsing, slide-type inference).

'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  extractContent,
  _internal: { shapeParagraphs, paragraphText, slideShapes, inferSlideType },
} = require('../skills/content-review/scripts/lib/extract-content');

const REPO_ROOT = path.join(__dirname, '..');
const TINY_PPTX = path.join(REPO_ROOT, 'tests', 'fixtures', 'tiny-deck.pptx');

test('extractContent: rejects missing pptxPath', async () => {
  await assert.rejects(() => extractContent(undefined), /pptxPath required/);
  await assert.rejects(() => extractContent(null), /pptxPath required/);
  await assert.rejects(() => extractContent(123), /pptxPath required/);
});

test('extractContent: rejects non-existent file', async () => {
  await assert.rejects(
    () => extractContent('/nonexistent/path/to/deck.pptx'),
    /file not found/,
  );
});

test('extractContent: parses tiny-deck fixture into slides[]', async (t) => {
  if (!fs.existsSync(TINY_PPTX)) {
    t.skip('tiny-deck.pptx fixture missing');
    return;
  }
  const { slides } = await extractContent(TINY_PPTX);
  assert.ok(Array.isArray(slides), 'slides is array');
  assert.ok(slides.length >= 1, 'at least one slide');
  for (const s of slides) {
    assert.equal(typeof s.slideNum, 'number');
    assert.equal(typeof s.title, 'string');
    assert.ok(Array.isArray(s.bullets));
    assert.equal(typeof s.body, 'string');
    assert.equal(typeof s.notes, 'string');
    assert.ok(Array.isArray(s.sources));
    assert.ok(['title', 'content', 'closing', 'section'].includes(s.slide_type));
  }
});

test('extractContent: first slide is inferred as title type', async (t) => {
  if (!fs.existsSync(TINY_PPTX)) { t.skip(); return; }
  const { slides } = await extractContent(TINY_PPTX);
  assert.equal(slides[0].slide_type, 'title');
});

test('paragraphText: concatenates all <a:t> segments and decodes entities', () => {
  const xml = '<a:t>Hello </a:t><a:t>&amp; world &lt;ok&gt;</a:t>';
  assert.equal(paragraphText(xml), 'Hello & world <ok>');
});

test('paragraphText: decodes numeric and hex char references', () => {
  const xml = '<a:t>&#65;&#x42;C</a:t>';
  assert.equal(paragraphText(xml), 'ABC');
});

test('paragraphText: returns "" for xml with no <a:t>', () => {
  assert.equal(paragraphText('<a:p/>'), '');
});

test('paragraphText: handles non-string input via String coercion', () => {
  assert.equal(paragraphText(undefined), '');
});

test('shapeParagraphs: extracts ordered non-empty paragraphs', () => {
  const xml = '<a:p><a:t>One</a:t></a:p><a:p><a:t>   </a:t></a:p><a:p><a:t>Two</a:t></a:p>';
  assert.deepEqual(shapeParagraphs(xml), ['One', 'Two']);
});

test('shapeParagraphs: returns [] when no paragraphs present', () => {
  assert.deepEqual(shapeParagraphs('<sp/>'), []);
});

test('slideShapes: detects placeholder type when present', () => {
  const xml = '<p:sp><p:ph type="title"/><a:p><a:t>T</a:t></a:p></p:sp>'
    + '<p:sp><a:p><a:t>B</a:t></a:p></p:sp>';
  const shapes = slideShapes(xml);
  assert.equal(shapes.length, 2);
  assert.equal(shapes[0].phType, 'title');
  assert.equal(shapes[1].phType, null);
});

test('inferSlideType: closing patterns', () => {
  assert.equal(inferSlideType('', 'Thank You', 5, 6), 'closing');
  assert.equal(inferSlideType('', 'Q&A', 5, 6), 'closing');
  assert.equal(inferSlideType('', 'Questions?', 5, 6), 'closing');
});

test('inferSlideType: section divider via cSld name', () => {
  const xml = '<p:cSld name="Section Divider 1">';
  assert.equal(inferSlideType(xml, 'Whatever', 2, 6), 'section');
});

test('inferSlideType: index 0 is title', () => {
  assert.equal(inferSlideType('', 'Anything', 0, 5), 'title');
});

test('inferSlideType: default is content', () => {
  assert.equal(inferSlideType('<p:cSld name="Slide 3"/>', 'Body', 2, 5), 'content');
});

test('inferSlideType: handles null/empty title', () => {
  assert.equal(inferSlideType('', null, 1, 3), 'content');
  assert.equal(inferSlideType('', undefined, 0, 3), 'title');
});
