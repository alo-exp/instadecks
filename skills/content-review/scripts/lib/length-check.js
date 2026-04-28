'use strict';
// length-check.js — per-bullet word count >25 → finding. CRV-07.
// Phase 6 Plan 06-01 Task 3.

function wordCount(s) {
  return String(s || '').trim().split(/\s+/).filter(Boolean).length;
}

function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

function checkLength(slide) {
  if (!slide || !Array.isArray(slide.bullets)) return [];
  const out = [];
  for (let i = 0; i < slide.bullets.length; i++) {
    const bullet = slide.bullets[i];
    const words = wordCount(bullet);
    if (words <= 25) continue;
    const severity_reviewer = words > 35 ? 'Major' : 'Minor';
    const ny = clamp(0.3 + 0.1 * i, 0.3, 0.85);
    out.push({
      slideNum: slide.slideNum,
      severity_reviewer,
      category: 'content',
      check_id: 'length',
      genuine: true,
      nx: 0.5,
      ny,
      text: `Slide ${slide.slideNum} bullet ${i + 1} is ${words} words: "${String(bullet).slice(0, 60)}..."`,
      rationale: 'Bullets >25 words become paragraphs; audience reads instead of listening, breaking presenter-audience connection.',
      location: `slide body, bullet ${i + 1}`,
      standard: '6×6 rule heuristic (Reynolds, Presentation Zen 2008)',
      fix: 'Split into two bullets, OR move detail to speaker notes, OR rewrite as a single short claim',
    });
  }
  return out;
}

module.exports = { checkLength, _internal: { wordCount, clamp } };
