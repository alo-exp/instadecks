'use strict';
// Phase 6 Plan 06-01 Task 3 — four code-side content checks.

const test = require('node:test');
const assert = require('node:assert/strict');

const { checkTitles } = require('../skills/content-review/scripts/lib/title-adapter');
const { checkRedundancy, _internal: redundancyInternal } = require('../skills/content-review/scripts/lib/redundancy');
const { checkJargon } = require('../skills/content-review/scripts/lib/jargon');
const { checkLength } = require('../skills/content-review/scripts/lib/length-check');
const { validate } = require('../skills/review/scripts/lib/schema-validator');

const VALID_SEVERITIES = new Set(['Critical', 'Major', 'Minor', 'Nitpick']);

function assertValidFinding(f) {
  assert.ok(VALID_SEVERITIES.has(f.severity_reviewer),
    `severity_reviewer must be title-case 4-tier (Pitfall 2), got ${f.severity_reviewer}`);
  assert.equal(f.category, 'content');
  assert.equal(f.genuine, true);
}

// --- title-adapter ---

test('title-adapter: "Q3 Revenue" → Minor (no verb / too short)', () => {
  const out = checkTitles({ slides: [{ slideNum: 3, title: 'Q3 Revenue', slide_type: 'content' }] });
  assert.equal(out.length, 1);
  assert.equal(out[0].severity_reviewer, 'Minor');
  assert.equal(out[0].check_id, 'action-title');
  assertValidFinding(out[0]);
});

test('title-adapter: "Overview" → Major (blocked phrase)', () => {
  const out = checkTitles({ slides: [{ slideNum: 2, title: 'Overview', slide_type: 'content' }] });
  assert.equal(out.length, 1);
  assert.equal(out[0].severity_reviewer, 'Major');
  assertValidFinding(out[0]);
});

test('title-adapter: action title with verb passes (no finding)', () => {
  const out = checkTitles({ slides: [{ slideNum: 4, title: 'Revenue grew 40% in Q3 from enterprise renewals', slide_type: 'content' }] });
  assert.equal(out.length, 0);
});

test('title-adapter: closing slide override (Thank You) → no finding', () => {
  const out = checkTitles({ slides: [{ slideNum: 9, title: 'Thank You', slide_type: 'closing' }] });
  assert.equal(out.length, 0);
});

// --- redundancy ---

test('redundancy: identical 10/10 token sets → Major (cos=1.0 ≥ 0.95)', () => {
  const slides = [
    { slideNum: 1, title: 'alpha beta gamma delta epsilon', bullets: ['zeta eta theta iota kappa'], slide_type: 'content' },
    { slideNum: 2, title: 'alpha beta gamma delta epsilon', bullets: ['zeta eta theta iota kappa'], slide_type: 'content' },
  ];
  const out = checkRedundancy({ slides });
  assert.equal(out.length, 1);
  assert.equal(out[0].severity_reviewer, 'Major');
  assert.equal(out[0].slideNum, 2);
  assert.equal(out[0].check_id, 'redundancy');
  assertValidFinding(out[0]);
});

test('redundancy: 9/10 shared → Minor (cos in [0.85, 0.95))', () => {
  const slides = [
    { slideNum: 1, title: 'alpha beta gamma delta epsilon', bullets: ['zeta eta theta iota kappa'], slide_type: 'content' },
    { slideNum: 2, title: 'alpha beta gamma delta epsilon', bullets: ['zeta eta theta iota lambda'], slide_type: 'content' },
  ];
  const out = checkRedundancy({ slides });
  assert.equal(out.length, 1);
  // confirm sim in [0.85, 0.95)
  const sim = redundancyInternal.cosine(
    redundancyInternal.vector(redundancyInternal.tokenize('alpha beta gamma delta epsilon zeta eta theta iota kappa')),
    redundancyInternal.vector(redundancyInternal.tokenize('alpha beta gamma delta epsilon zeta eta theta iota lambda')),
  );
  assert.ok(sim >= 0.85 && sim < 0.95, `expected sim in [0.85,0.95), got ${sim}`);
  assert.equal(out[0].severity_reviewer, 'Minor');
});

test('redundancy: 5/10 shared → no finding (cos<0.85)', () => {
  const slides = [
    { slideNum: 1, title: 'alpha beta gamma delta epsilon', bullets: ['zeta eta theta iota kappa'], slide_type: 'content' },
    { slideNum: 2, title: 'alpha beta gamma delta epsilon', bullets: ['mmmm nnnn oooo pppp qqqq'], slide_type: 'content' },
  ];
  const out = checkRedundancy({ slides });
  assert.equal(out.length, 0);
});

test('redundancy: Agenda title is whitelisted → skipped', () => {
  const slides = [
    { slideNum: 1, title: 'Agenda', bullets: ['alpha beta gamma delta'], slide_type: 'content' },
    { slideNum: 2, title: 'Agenda', bullets: ['alpha beta gamma delta'], slide_type: 'content' },
  ];
  const out = checkRedundancy({ slides });
  assert.equal(out.length, 0);
});

test('redundancy: section/closing/title slide_type → skipped', () => {
  const slides = [
    { slideNum: 1, title: 'alpha beta gamma delta', bullets: ['zeta eta theta iota'], slide_type: 'section' },
    { slideNum: 2, title: 'alpha beta gamma delta', bullets: ['zeta eta theta iota'], slide_type: 'content' },
  ];
  const out = checkRedundancy({ slides });
  assert.equal(out.length, 0);
});

// --- jargon ---

test('jargon: 6 distinct unfiltered acronyms → Minor', () => {
  const slide = {
    slideNum: 5,
    body: 'Our SaaS GTM uses PLG MQL SQL ICP and ARR metrics',
    bullets: [],
  };
  const out = checkJargon(slide);
  assert.equal(out.length, 1);
  assert.equal(out[0].severity_reviewer, 'Minor');
  assert.equal(out[0].check_id, 'jargon');
  assertValidFinding(out[0]);
});

test('jargon: 8+ distinct → Major', () => {
  const slide = {
    slideNum: 5,
    body: 'SaaS GTM PLG MQL SQL ICP ARR ACV NPS LTV',
    bullets: [],
  };
  const out = checkJargon(slide);
  assert.equal(out.length, 1);
  assert.equal(out[0].severity_reviewer, 'Major');
});

test('jargon: filter list (CEO, USA, I, IV) excluded', () => {
  const slide = {
    slideNum: 6,
    body: 'CEO USA I IV',
    bullets: [],
  };
  const out = checkJargon(slide);
  assert.equal(out.length, 0);
});

test('jargon: ≤5 acronyms → no finding', () => {
  const slide = {
    slideNum: 7,
    body: 'SaaS GTM PLG MQL SQL', // 5
    bullets: [],
  };
  const out = checkJargon(slide);
  assert.equal(out.length, 0);
});

// --- length ---

test('length: 26-word bullet → Minor', () => {
  const bullet = Array.from({ length: 26 }, (_, i) => `word${i}`).join(' ');
  const slide = { slideNum: 3, bullets: [bullet] };
  const out = checkLength(slide);
  assert.equal(out.length, 1);
  assert.equal(out[0].severity_reviewer, 'Minor');
  assert.equal(out[0].check_id, 'length');
  assertValidFinding(out[0]);
});

test('length: 36-word bullet → Major', () => {
  const bullet = Array.from({ length: 36 }, (_, i) => `word${i}`).join(' ');
  const slide = { slideNum: 3, bullets: [bullet] };
  const out = checkLength(slide);
  assert.equal(out.length, 1);
  assert.equal(out[0].severity_reviewer, 'Major');
});

test('length: 25-word bullet → no finding', () => {
  const bullet = Array.from({ length: 25 }, (_, i) => `word${i}`).join(' ');
  const slide = { slideNum: 3, bullets: [bullet] };
  const out = checkLength(slide);
  assert.equal(out.length, 0);
});

test('length: multiple long bullets → multiple findings, ny clamped to [0.3,0.85]', () => {
  const long = Array.from({ length: 40 }, (_, i) => `word${i}`).join(' ');
  const slide = {
    slideNum: 3,
    bullets: [long, 'short', long, long, long, long, long, long],
  };
  const out = checkLength(slide);
  // bullets at idx 0,2,3,4,5,6,7 are long → 7 findings
  assert.equal(out.length, 7);
  for (const f of out) {
    assert.ok(f.ny >= 0.3 && f.ny <= 0.85, `ny out of clamp: ${f.ny}`);
  }
});

// --- integration: all findings pass v1.1 schema validator ---

test('all 4 checks: emitted findings pass v1.1 schema-validator', () => {
  const sample = require('./fixtures/content-review/sample-extract.json');
  const findings = [
    ...checkTitles(sample),
    ...checkRedundancy(sample),
    ...sample.slides.flatMap(s => checkJargon(s)),
    ...sample.slides.flatMap(s => checkLength(s)),
  ];
  // Assemble into a doc grouped by slide
  const bySlide = new Map();
  for (const f of findings) {
    const k = f.slideNum;
    if (!bySlide.has(k)) bySlide.set(k, []);
    // Validator doesn't expect slideNum on the finding itself; strip it.
    const { slideNum, ...rest } = f;
    bySlide.get(k).push(rest);
  }
  const doc = {
    schema_version: '1.1',
    deck: 'sample.pptx',
    generated_at: '2026-04-28T00:00:00Z',
    slides: sample.slides.map((s) => ({
      slideNum: s.slideNum,
      title: s.title,
      findings: bySlide.get(s.slideNum) || [],
    })),
  };
  assert.equal(validate(doc), true);
  // Sanity: at least one finding emitted (slide 3 'Q3 Revenue' fails action-title; slide 5 redundant w/ slide 2)
  assert.ok(findings.length > 0, 'sample-extract should yield ≥1 finding');
});
