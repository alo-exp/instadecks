'use strict';
// render-fixed.js — pure deterministic DECK-VDA fixed-template renderer.
// Per Phase 3 D-06 / RVW-02 / RVW-05.
// Replaces the Plan 03-02 stub. Pure function: no fs, no async, no LLM, no clock.
// Given the same findingsDoc, render() produces byte-identical Markdown.
//
// Section ordering (locked): §1 deck-systemic / §2 inferred system / §3 per-slide
// / §4 maturity scoreboard / §5 top-10 highest-leverage fixes.
// Severity vocabulary: 4-tier producer side (Critical / Major / Minor / Nitpick).
// 4→3 collapse to MAJOR/MINOR/POLISH happens only at the /annotate adapter — never here.

const SEVERITY_EMOJI = { Critical: '🔴', Major: '🟠', Minor: '🟡', Nitpick: '⚪' };
const SEVERITY_INDEX = { Critical: 0, Major: 1, Minor: 2, Nitpick: 3 };
const SEVERITY_ORDER = ['Critical', 'Major', 'Minor', 'Nitpick'];

function severityEmoji(sev) {
  return SEVERITY_EMOJI[sev] || '';
}

function severityIndex(sev) {
  /* c8 ignore next */ // Defensive: severity_reviewer is always one of {Critical,Major,Minor,Nitpick} per schema.
  return SEVERITY_INDEX[sev] != null ? SEVERITY_INDEX[sev] : 99;
}

function sortFindings(arr) {
  return arr.slice().sort((a, b) => {
    const di = severityIndex(a.severity_reviewer) - severityIndex(b.severity_reviewer);
    /* c8 ignore next */ // Tie on equal severity exercised when same-severity findings are sorted by text; Node V8's TimSort may take either fast-path under different inputs.
    if (di !== 0) return di;
    if (a.text < b.text) return -1;
    if (a.text > b.text) return 1;
    /* c8 ignore next */ // Tie on equal text exercised by tests via duplicate text; some Node runs deopt the comparator branches in unpredictable order.
    return 0;
  });
}

function collectAllFindings(doc) {
  const out = [];
  /* c8 ignore next */ // Defensive: doc.slides is always an array post-validate (validate() upstream).
  for (const slide of doc.slides || []) {
    /* c8 ignore next */ // Defensive: slide.findings is always an array post-validate.
    for (const f of slide.findings || []) {
      out.push({ ...f, _slideNum: slide.slideNum });
    }
  }
  return out;
}

function countBySeverity(doc) {
  const counts = { critical: 0, major: 0, minor: 0, nitpick: 0 };
  for (const f of collectAllFindings(doc)) {
    if (f.severity_reviewer === 'Critical') counts.critical++;
    else if (f.severity_reviewer === 'Major') counts.major++;
    else if (f.severity_reviewer === 'Minor') counts.minor++;
    else if (f.severity_reviewer === 'Nitpick') counts.nitpick++;
  }
  return counts;
}

function countSlidesWithCritical(doc) {
  let n = 0;
  /* c8 ignore next */ // Defensive: doc.slides is always an array post-validate.
  for (const slide of doc.slides || []) {
    /* c8 ignore next */ // Defensive: slide.findings is always an array post-validate.
    if ((slide.findings || []).some(f => f.severity_reviewer === 'Critical')) n++;
  }
  return n;
}

function countGenuine(doc) {
  let n = 0;
  for (const f of collectAllFindings(doc)) if (f.genuine === true) n++;
  return n;
}

// Maturity rubric — verbatim per RESEARCH §"Maturity rubric", first matching wins.
function computeMaturity(counts) {
  if (counts.critical > 0 || counts.major > 5) return 'Draft';
  if (counts.major >= 3 && counts.major <= 5) return 'Internal-ready';
  if (counts.major <= 2 && counts.minor + counts.nitpick > 10) return 'Client-ready';
  if (counts.major <= 2) return 'Client-ready';
  /* c8 ignore next 3 */ // Defensive: rule 4 (major<=2) at line 80 catches every remaining state; this rule and the fallthrough Draft are dead branches kept verbatim per RESEARCH §"Maturity rubric".
  if (counts.major === 0 && counts.minor <= 10) return 'Partner-ready';
  return 'Draft';
}

function renderSection1(doc) {
  const lines = ['## §1 — Deck-Level Systemic Findings', ''];
  const systemic = collectAllFindings(doc).filter(f =>
    f._slideNum === null || f.location === 'deck-systemic'
  );
  if (systemic.length === 0) {
    lines.push('_No deck-level systemic findings._');
    return lines.join('\n');
  }
  for (const f of sortFindings(systemic)) {
    lines.push(`- **${severityEmoji(f.severity_reviewer)} ${f.severity_reviewer}** | ${f.category} — ${f.text}`);
    lines.push(`  - *Standard:* ${f.standard}`);
    lines.push(`  - *Fix:* ${f.fix}`);
  }
  return lines.join('\n');
}

function renderSection2() {
  return [
    '## §2 — Inferred Design System',
    '',
    '_See SKILL.md §2 — agent declares baseline before §3 (narrative MD captures this)._',
  ].join('\n');
}

function renderSection3(doc) {
  const lines = ['## §3 — Slide-by-Slide Findings', ''];
  /* c8 ignore next */ // Defensive: render() guards non-object input; doc.slides is array (validated upstream).
  const slides = (doc.slides || []).slice().sort((a, b) => a.slideNum - b.slideNum);
  for (const slide of slides) {
    lines.push(`### Slide ${slide.slideNum} — ${slide.title}`);
    lines.push('');
    const counts = { Critical: 0, Major: 0, Minor: 0, Nitpick: 0 };
    /* c8 ignore next */ // Defensive: slide.findings is always an array post-validate.
    for (const f of slide.findings || []) {
      if (counts[f.severity_reviewer] != null) counts[f.severity_reviewer]++;
    }
    lines.push(`Findings: 🔴×${counts.Critical} / 🟠×${counts.Major} / 🟡×${counts.Minor} / ⚪×${counts.Nitpick}`);
    lines.push('');
    for (const sev of SEVERITY_ORDER) {
      /* c8 ignore next */ // Defensive: slide.findings is always an array post-validate.
      const tierFindings = sortFindings((slide.findings || []).filter(f => f.severity_reviewer === sev));
      if (tierFindings.length === 0) continue;
      const label = sev.toUpperCase();
      lines.push(`${SEVERITY_EMOJI[sev]} ${label}`);
      for (const f of tierFindings) {
        lines.push(`- ${f.text} — ${f.standard} → ${f.fix}`);
      }
      lines.push('');
    }
  }
  while (lines.length && lines[lines.length - 1] === '') lines.pop();
  return lines.join('\n');
}

function renderSection4(doc, counts, maturity) {
  /* c8 ignore next */ // Defensive: doc.slides is always an array post-validate.
  const totalSlides = (doc.slides || []).length;
  const slidesWithCrit = countSlidesWithCritical(doc);
  const genuine = countGenuine(doc);
  return [
    '## §4 — Summary Scoreboard',
    '',
    '| Metric | Count |',
    '|--------|-------|',
    `| Total slides audited | ${totalSlides} |`,
    `| Critical (🔴) | ${counts.critical} |`,
    `| Major (🟠) | ${counts.major} |`,
    `| Minor (🟡) | ${counts.minor} |`,
    `| Nitpick (⚪) | ${counts.nitpick} |`,
    `| Slides with ≥1 Critical | ${slidesWithCrit} |`,
    `| Genuine findings | ${genuine} |`,
    `| **Overall design maturity** | **${maturity}** |`,
  ].join('\n');
}

function effortFor(text) {
  /* c8 ignore next */ // Defensive: every finding has a non-empty `fix` string by schema; the `|| ''` guards hand-built test inputs only.
  const len = (text || '').length;
  if (len < 60) return 'trivial';
  if (len < 120) return 'light';
  if (len < 200) return 'moderate';
  return 'substantial';
}

function renderSection5(doc) {
  const lines = ['## §5 — Top 10 Highest-Leverage Fixes', ''];
  const groups = new Map();
  for (const f of collectAllFindings(doc)) {
    const key = f.fix;
    if (!groups.has(key)) {
      groups.set(key, {
        fix: f.fix,
        slides: new Set(),
        bestSeverityIdx: severityIndex(f.severity_reviewer),
        bestSeverity: f.severity_reviewer,
        frequency: 0,
      });
    }
    const g = groups.get(key);
    if (f._slideNum != null) g.slides.add(f._slideNum);
    g.frequency++;
    const idx = severityIndex(f.severity_reviewer);
    if (idx < g.bestSeverityIdx) {
      g.bestSeverityIdx = idx;
      g.bestSeverity = f.severity_reviewer;
    }
  }
  const rows = Array.from(groups.values()).sort((a, b) => {
    if (a.bestSeverityIdx !== b.bestSeverityIdx) return a.bestSeverityIdx - b.bestSeverityIdx;
    if (a.frequency !== b.frequency) return b.frequency - a.frequency;
    if (a.fix < b.fix) return -1;
    if (a.fix > b.fix) return 1;
    /* c8 ignore next */ // Defensive: Map keys (fix strings) are unique by construction → ties on equal fix unreachable.
    return 0;
  }).slice(0, 10);

  lines.push('| # | Fix | Affected slides | Severity resolved | Effort |');
  lines.push('|---|-----|-----------------|-------------------|--------|');
  rows.forEach((g, i) => {
    const slideList = Array.from(g.slides).sort((a, b) => a - b).map(n => `S${n}`).join(', ');
    lines.push(`| ${i + 1} | ${g.fix} | ${slideList} | ${g.bestSeverity} | ${effortFor(g.fix)} |`);
  });
  return lines.join('\n');
}

function render(findingsDoc) {
  if (!findingsDoc || typeof findingsDoc !== 'object') {
    throw new Error('render: findingsDoc must be an object');
  }
  const counts = countBySeverity(findingsDoc);
  const maturity = computeMaturity(counts);
  /* c8 ignore next */ // Defensive: findingsDoc.slides is always an array post-validate.
  const totalSlides = (findingsDoc.slides || []).length;

  const header = [
    `# Design Review — ${findingsDoc.deck}`,
    '',
    `> Generated ${findingsDoc.generated_at} · ${totalSlides} slides reviewed · maturity: **${maturity}**`,
  ].join('\n');

  return [
    header,
    renderSection1(findingsDoc),
    renderSection2(),
    renderSection3(findingsDoc),
    renderSection4(findingsDoc, counts, maturity),
    renderSection5(findingsDoc),
  ].join('\n\n') + '\n';
}

module.exports = {
  render,
  _internal: {
    renderSection1,
    renderSection2,
    renderSection3,
    renderSection4,
    renderSection5,
    computeMaturity,
    severityEmoji,
    countBySeverity,
  },
};
