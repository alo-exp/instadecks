'use strict';
// tests/ai-tells-branches.test.js — branch-coverage gaps for skills/review/scripts/ai-tells.js.
// Complements tests/review-ai-tells.test.js. Drives all three heuristics through their
// internal branches without spawning loadSlides() (synthetic xml-bearing slide objects).
//
// Branches covered:
//   - detectDefaultBluePalette: total=0 short-circuit, blue-share <30% returns null,
//     blue-share ≥30% emits the systemic finding shape.
//   - detectAccentLineUnderTitle: <3 slides → empty result; bold-large title path;
//     line-via-prst="line" branch; nx/ny placement check.
//   - detectIdenticalLayoutsRepeated: hash collision ≥3 slides emits; <3 slides empty.
//   - extractShapes: chunks missing <a:off>/<a:ext> are skipped (continue branch).

const test = require('node:test');
const assert = require('node:assert/strict');
const { _internal, DEFAULT_BLUES } = require('../skills/review/scripts/ai-tells');

const {
  detectDefaultBluePalette,
  detectAccentLineUnderTitle,
  detectIdenticalLayoutsRepeated,
  extractShapes,
} = _internal;

test('ai-tells-branches', async (t) => {
  await t.test('detectDefaultBluePalette: zero color cells → null (early return)', () => {
    const slides = [{ slideNum: 1, xml: '<p:sld></p:sld>' }];
    assert.equal(detectDefaultBluePalette(slides), null);
  });

  await t.test('detectDefaultBluePalette: <30% default-blue share → null', () => {
    // 1 default blue out of 10 colors = 10% < 30% → null.
    const xml = '<p:sld>' +
      '<a:srgbClr val="0070C0"/>' +
      Array.from({ length: 9 }, (_, i) =>
        `<a:srgbClr val="${(0xAA0000 + i).toString(16).toUpperCase().padStart(6, '0')}"/>`).join('') +
      '</p:sld>';
    assert.equal(detectDefaultBluePalette([{ slideNum: 1, xml }]), null);
  });

  await t.test('detectDefaultBluePalette: ≥30% share emits systemic Major finding', () => {
    // 5 default blues vs 5 others = 50% → fires.
    const xml = '<p:sld>' +
      Array.from({ length: 5 }, () => '<a:srgbClr val="0070C0"/>').join('') +
      Array.from({ length: 5 }, (_, i) =>
        `<a:srgbClr val="${(0xAA0000 + i).toString(16).toUpperCase().padStart(6, '0')}"/>`).join('') +
      '</p:sld>';
    const f = detectDefaultBluePalette([{ slideNum: 1, xml }]);
    assert.ok(f);
    assert.equal(f.r18_ai_tell, true);
    assert.equal(f.severity_reviewer, 'Major');
    assert.equal(f.category, 'style');
    assert.equal(f.location, 'deck-systemic');
    assert.equal(f.slideNum, null);
  });

  await t.test('detectDefaultBluePalette: case-insensitive hex match (lowercase normalized)', () => {
    const xml = '<p:sld>' +
      Array.from({ length: 5 }, () => '<a:srgbClr val="0070c0"/>').join('') +
      '</p:sld>';
    const f = detectDefaultBluePalette([{ slideNum: 1, xml }]);
    assert.ok(f);
  });

  await t.test('detectAccentLineUnderTitle: <3 slides with accent → empty array', () => {
    function slideXml() {
      // Bold large title + thin accent under it.
      return '<p:sld>' +
        '<p:sp>' +
        '<a:off x="457200" y="457200"/><a:ext cx="8229600" cy="457200"/>' +
        '<a:rPr b="1" sz="2400"/><a:t>Title</a:t>' +
        '</p:sp>' +
        '<p:sp>' +
        '<a:off x="457200" y="990600"/><a:ext cx="8229600" cy="38100"/>' +
        '<a:prstGeom prst="rect"/>' +
        '</p:sp>' +
        '</p:sld>';
    }
    const slides = [
      { slideNum: 1, xml: slideXml() },
      { slideNum: 2, xml: slideXml() },
    ];
    assert.deepEqual(detectAccentLineUnderTitle(slides), []);
  });

  await t.test('detectAccentLineUnderTitle: prst="line" satisfies the line-detection branch', () => {
    function slideXml() {
      return '<p:sld>' +
        '<p:sp>' +
        '<a:off x="457200" y="457200"/><a:ext cx="8229600" cy="457200"/>' +
        '<a:rPr b="1" sz="2400"/><a:t>Title</a:t>' +
        '</p:sp>' +
        '<p:sp>' +
        '<a:off x="457200" y="990600"/><a:ext cx="8229600" cy="200000"/>' +
        '<a:prstGeom prst="line"/>' +
        '</p:sp>' +
        '</p:sld>';
    }
    const slides = [
      { slideNum: 1, xml: slideXml() },
      { slideNum: 2, xml: slideXml() },
      { slideNum: 3, xml: slideXml() },
    ];
    const findings = detectAccentLineUnderTitle(slides);
    assert.equal(findings.length, 3);
    for (const f of findings) {
      assert.equal(f.r18_ai_tell, true);
      assert.ok(f.nx >= 0 && f.nx <= 1);
      assert.ok(f.ny >= 0 && f.ny <= 1);
      assert.equal(f.location, 'under title');
    }
  });

  await t.test('detectAccentLineUnderTitle: title with no accent line yields no finding for that slide', () => {
    function slideXml() {
      return '<p:sld>' +
        '<p:sp>' +
        '<a:off x="457200" y="457200"/><a:ext cx="8229600" cy="457200"/>' +
        '<a:rPr b="1" sz="2400"/><a:t>Title</a:t>' +
        '</p:sp>' +
        '</p:sld>';
    }
    const slides = [1, 2, 3].map((n) => ({ slideNum: n, xml: slideXml() }));
    assert.deepEqual(detectAccentLineUnderTitle(slides), []);
  });

  await t.test('detectAccentLineUnderTitle: shapes without offX/offY skip (continue branch)', () => {
    // No <a:off> in any shape → extractShapes returns [] → no title → continue → empty.
    const xml = '<p:sld><p:sp><p:txBody><a:r><a:t>x</a:t></a:r></p:txBody></p:sp></p:sld>';
    const slides = [1, 2, 3].map((n) => ({ slideNum: n, xml }));
    assert.deepEqual(detectAccentLineUnderTitle(slides), []);
  });

  await t.test('detectIdenticalLayoutsRepeated: ≥3 identical slides → emits finding', () => {
    function slideXml() {
      return '<p:sld>' +
        '<p:sp>' +
        '<a:off x="457200" y="457200"/><a:ext cx="8229600" cy="457200"/>' +
        '<a:prstGeom prst="rect"/>' +
        '</p:sp>' +
        '</p:sld>';
    }
    const slides = [1, 2, 3].map((n) => ({ slideNum: n, xml: slideXml() }));
    const findings = detectIdenticalLayoutsRepeated(slides);
    assert.equal(findings.length, 1);
    assert.match(findings[0].text, /Identical layout repeated/);
    assert.equal(findings[0].slideNum, null);
  });

  await t.test('detectIdenticalLayoutsRepeated: 2 identical slides → no emission (<3 threshold)', () => {
    function slideXml() {
      return '<p:sld><p:sp>' +
        '<a:off x="457200" y="457200"/><a:ext cx="8229600" cy="457200"/>' +
        '<a:prstGeom prst="rect"/></p:sp></p:sld>';
    }
    const slides = [1, 2].map((n) => ({ slideNum: n, xml: slideXml() }));
    assert.deepEqual(detectIdenticalLayoutsRepeated(slides), []);
  });

  await t.test('detectIdenticalLayoutsRepeated: distinct shapes → no collision', () => {
    const slides = [1, 2, 3].map((n) => ({
      slideNum: n,
      xml: `<p:sld><p:sp>` +
        `<a:off x="${n * 100000}" y="${n * 100000}"/>` +
        `<a:ext cx="${n * 1000000}" cy="${n * 1000000}"/>` +
        `<a:prstGeom prst="rect"/></p:sp></p:sld>`,
    }));
    assert.deepEqual(detectIdenticalLayoutsRepeated(slides), []);
  });

  await t.test('extractShapes: chunks lacking <a:off>/<a:ext> are skipped', () => {
    // <p:sp> without off/ext → continue branch.
    const xml = '<p:sp><p:txBody></p:txBody></p:sp>' +
      '<p:sp><a:off x="0" y="0"/><a:ext cx="100" cy="100"/></p:sp>';
    const shapes = extractShapes(xml);
    assert.equal(shapes.length, 1);
    assert.equal(shapes[0].offX, 0);
  });

  await t.test('DEFAULT_BLUES export contains the documented 6 hex codes', () => {
    assert.equal(DEFAULT_BLUES.size, 6);
    for (const hex of ['0070C0', '1F4E79', '2E75B6', '4472C4', '5B9BD5', '8FAADC']) {
      assert.ok(DEFAULT_BLUES.has(hex));
    }
  });
});
