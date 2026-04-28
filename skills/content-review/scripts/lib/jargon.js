'use strict';
// jargon.js — per-slide UPPERCASE 2-5-char acronym counter. CRV-07.
// Phase 6 Plan 06-01 Task 3.

const FILTER = new Set([
  'I', 'II', 'III', 'IV', 'V',
  'OK', 'USA', 'EU', 'UK',
  'CEO', 'CTO', 'CFO',
]);

function detectAcronyms(text) {
  const matches = String(text || '').match(/\b[A-Z]{2,5}\b/g) || [];
  const distinct = new Set();
  for (const m of matches) {
    if (!FILTER.has(m)) distinct.add(m);
  }
  return [...distinct];
}

function checkJargon(slide) {
  if (!slide) return [];
  const bulletJoin = Array.isArray(slide.bullets) ? slide.bullets.join(' ') : '';
  const text = `${slide.body || ''} ${bulletJoin}`;
  const acronyms = detectAcronyms(text);
  const count = acronyms.length;
  if (count <= 5) return [];
  const severity_reviewer = count >= 8 ? 'Major' : 'Minor';
  const list = acronyms.slice(0, 8).join(', ');
  const more = count > 8 ? '...' : '';
  return [{
    slideNum: slide.slideNum,
    severity_reviewer,
    category: 'content',
    check_id: 'jargon',
    genuine: true,
    nx: 0.5,
    ny: 0.6,
    text: `Slide ${slide.slideNum} contains ${count} acronyms: ${list}${more}`,
    rationale: 'Acronym density above 5/slide forces the audience to context-switch into a glossary lookup; reduces standalone-readability.',
    location: 'slide body',
    standard: 'Audience-fit (Knaflic, Storytelling with Data 2015)',
    fix: 'Spell out acronyms on first use; move definitions to speaker notes; keep ≤5 distinct acronyms per slide',
  }];
}

module.exports = { checkJargon, _internal: { detectAcronyms, FILTER } };
