'use strict';
// title-adapter.js — wraps skills/create/scripts/lib/title-check.js::validateTitle (REUSE; locked invariant).
// Phase 6 Plan 06-01 Task 3 / CRV-04 / D-02.
//
// Pure function. Maps title-check {ok:false, reason} → finding object per
// 06-RESEARCH §"Check 1 — Action-title quality".

const { validateTitle } = require('../../../create/scripts/lib/title-check');

function makeFinding(slide, reason) {
  let severity_reviewer = 'Minor';
  if (reason.startsWith('blocked phrase')) severity_reviewer = 'Major';
  return {
    slideNum: slide.slideNum,
    severity_reviewer,
    category: 'content',
    check_id: 'action-title',
    genuine: true,
    nx: 0.5,
    ny: 0.08,
    text: `Slide ${slide.slideNum} title "${slide.title}" is a label, not a claim — ${reason}`,
    rationale: 'Action titles state the slide\'s claim; topic labels force the audience to derive the message themselves.',
    location: 'slide title',
    standard: 'Pyramid Principle (Minto 1987) — title states the answer',
    fix: 'Rewrite title as a claim, e.g., "Revenue grew 40% in Q3 from enterprise renewals" instead of "Q3 Revenue"',
  };
}

function checkTitles(extract) {
  if (!extract || !Array.isArray(extract.slides)) return [];
  const out = [];
  for (const slide of extract.slides) {
    if (!slide.title || slide.title.length === 0) continue;
    const r = validateTitle(slide.title, {
      action_title_override: slide.slide_type === 'closing',
    });
    if (!r.ok) out.push(makeFinding(slide, r.reason));
  }
  return out;
}

module.exports = { checkTitles };
