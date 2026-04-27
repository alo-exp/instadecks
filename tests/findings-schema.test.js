// Validates tests/fixtures/sample-findings.json against findings-schema.md v1.0.
// Per Phase 1 D-07 (schema_version required) and FOUND-06/FOUND-07.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const FIXTURE = path.join(__dirname, 'fixtures', 'sample-findings.json');
const data = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));

const ALLOWED_SEVERITIES = ['Critical', 'Major', 'Minor', 'Nitpick'];
const ALLOWED_CATEGORIES = ['defect', 'improvement', 'style'];
const REQUIRED_FINDING_FIELDS = [
  'severity_reviewer', 'category', 'genuine',
  'nx', 'ny', 'text', 'rationale', 'location', 'standard', 'fix',
];

test('sample-findings.json honors schema 1.0', async (t) => {
  await t.test('top-level: schema_version is "1.0"', () => {
    assert.equal(data.schema_version, '1.0');
  });

  await t.test('top-level: deck and slides[] present', () => {
    assert.equal(typeof data.deck, 'string');
    assert.ok(data.deck.length > 0, 'deck must be a non-empty string');
    assert.equal(typeof data.generated_at, 'string');
    assert.ok(Array.isArray(data.slides), 'slides must be an array');
    assert.ok(data.slides.length > 0, 'slides must be non-empty');
  });

  await t.test('each slide has slideNum (int), title (string), findings[] (array)', () => {
    for (const slide of data.slides) {
      assert.equal(typeof slide.slideNum, 'number');
      assert.ok(Number.isInteger(slide.slideNum), 'slideNum must be integer');
      assert.equal(typeof slide.title, 'string');
      assert.ok(Array.isArray(slide.findings), 'findings must be array');
    }
  });

  await t.test('each finding has all required fields', () => {
    for (const slide of data.slides) {
      for (const f of slide.findings) {
        for (const key of REQUIRED_FINDING_FIELDS) {
          assert.ok(
            Object.prototype.hasOwnProperty.call(f, key),
            `slide ${slide.slideNum}: finding missing required field "${key}"`,
          );
        }
        assert.equal(typeof f.severity_reviewer, 'string');
        assert.equal(typeof f.category, 'string');
        assert.equal(typeof f.genuine, 'boolean');
        assert.equal(typeof f.nx, 'number');
        assert.equal(typeof f.ny, 'number');
        assert.equal(typeof f.text, 'string');
        assert.equal(typeof f.rationale, 'string');
        assert.equal(typeof f.location, 'string');
        assert.equal(typeof f.standard, 'string');
        assert.equal(typeof f.fix, 'string');
      }
    }
  });

  await t.test('severity_reviewer is one of the 4 allowed tiers', () => {
    for (const slide of data.slides) {
      for (const f of slide.findings) {
        assert.ok(
          ALLOWED_SEVERITIES.includes(f.severity_reviewer),
          `invalid severity "${f.severity_reviewer}" on slide ${slide.slideNum}`,
        );
      }
    }
  });

  await t.test('category is one of defect|improvement|style', () => {
    for (const slide of data.slides) {
      for (const f of slide.findings) {
        assert.ok(
          ALLOWED_CATEGORIES.includes(f.category),
          `invalid category "${f.category}" on slide ${slide.slideNum}`,
        );
      }
    }
  });

  await t.test('nx and ny are floats in [0, 1]', () => {
    for (const slide of data.slides) {
      for (const f of slide.findings) {
        assert.ok(f.nx >= 0 && f.nx <= 1, `nx out of range: ${f.nx}`);
        assert.ok(f.ny >= 0 && f.ny <= 1, `ny out of range: ${f.ny}`);
      }
    }
  });

  await t.test('fixture exercises all 4 severity tiers', () => {
    const seen = new Set();
    for (const slide of data.slides) {
      for (const f of slide.findings) seen.add(f.severity_reviewer);
    }
    for (const tier of ALLOWED_SEVERITIES) {
      assert.ok(seen.has(tier), `fixture missing severity tier: ${tier}`);
    }
  });

  await t.test('fixture exercises all 3 categories', () => {
    const seen = new Set();
    for (const slide of data.slides) {
      for (const f of slide.findings) seen.add(f.category);
    }
    for (const cat of ALLOWED_CATEGORIES) {
      assert.ok(seen.has(cat), `fixture missing category: ${cat}`);
    }
  });

  await t.test('fixture includes at least one genuine: false finding', () => {
    let hasFalse = false;
    for (const slide of data.slides) {
      for (const f of slide.findings) {
        if (f.genuine === false) hasFalse = true;
      }
    }
    assert.ok(hasFalse, 'fixture must include at least one genuine: false finding');
  });
});
