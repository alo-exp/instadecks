'use strict';
// redundancy.js — cross-slide bag-of-words cosine ≥0.85 on title + first bullet.
// Phase 6 Plan 06-01 Task 3 / CRV-06 / D-02.
// Hand-rolled (no NLP dep) — matches "Don't Hand-Roll" exception in 06-RESEARCH.

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'from', 'into', 'our', 'your',
  'are', 'was', 'were', 'has', 'have', 'had', 'will', 'can', 'but', 'not',
  'all', 'any', 'one', 'two', 'new',
]);

const BOILERPLATE_TITLES = new Set([
  'agenda', 'q&a', 'thank you', 'questions', 'appendix', 'table of contents',
]);

const SKIP_SLIDE_TYPES = new Set(['section', 'closing', 'title']);

function tokenize(s) {
  if (!s) return [];
  // strip punctuation; keep letters / numbers / whitespace (Unicode)
  const cleaned = String(s).toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ');
  return cleaned.split(/\s+/)
    .filter((t) => t.length > 2 && !STOP_WORDS.has(t));
}

function vector(tokens) {
  const v = new Map();
  for (const t of tokens) v.set(t, (v.get(t) || 0) + 1);
  return v;
}

function cosine(a, b) {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (const [, c] of a) na += c * c;
  for (const [, c] of b) nb += c * c;
  if (na === 0 || nb === 0) return 0;
  for (const [t, c] of a) {
    if (b.has(t)) dot += c * b.get(t);
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function makeFinding(laterSlideNum, earlierSlideNum, sim) {
  const severity_reviewer = sim >= 0.95 ? 'Major' : 'Minor';
  return {
    slideNum: laterSlideNum,
    severity_reviewer,
    category: 'content',
    check_id: 'redundancy',
    genuine: true,
    nx: 0.5,
    ny: 0.5,
    text: `Slide ${laterSlideNum} repeats the claim from slide ${earlierSlideNum} (cos sim ${sim.toFixed(2)})`,
    rationale: 'Repeating a claim across slides without a new angle wastes audience attention.',
    location: 'whole slide',
    standard: 'MECE (Minto) — Mutually Exclusive ensures no claim is restated',
    fix: `Merge slides ${earlierSlideNum} and ${laterSlideNum}, OR differentiate the angle (e.g., problem on ${earlierSlideNum}, solution on ${laterSlideNum})`,
  };
}

function checkRedundancy(extract) {
  if (!extract || !Array.isArray(extract.slides)) return [];
  const slides = extract.slides;
  const indexed = slides.map((s) => {
    const titleNorm = String(s.title || '').trim().toLowerCase();
    const skipType = SKIP_SLIDE_TYPES.has(s.slide_type);
    const skipTitle = BOILERPLATE_TITLES.has(titleNorm);
    const firstBullet = (s.bullets && s.bullets[0]) || '';
    const text = `${s.title || ''} ${firstBullet}`;
    return {
      slide: s,
      skip: skipType || skipTitle,
      vec: vector(tokenize(text)),
    };
  });

  const out = [];
  for (let i = 0; i < indexed.length; i++) {
    if (indexed[i].skip) continue;
    if (indexed[i].vec.size === 0) continue;
    for (let j = i + 1; j < indexed.length; j++) {
      if (indexed[j].skip) continue;
      if (indexed[j].vec.size === 0) continue;
      const sim = cosine(indexed[i].vec, indexed[j].vec);
      if (sim >= 0.85) {
        const earlier = indexed[i].slide.slideNum;
        const later = indexed[j].slide.slideNum;
        out.push(makeFinding(later, earlier, sim));
      }
    }
  }
  return out;
}

module.exports = { checkRedundancy, _internal: { tokenize, cosine, vector } };
