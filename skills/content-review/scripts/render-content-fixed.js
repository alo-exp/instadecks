'use strict';
// render-content-fixed.js — pure deterministic Content-Review fixed-template renderer.
// Per Plan 06-02 D-04 / 06-RESEARCH §"Render-content-fixed structure".
// Mirrors skills/review/scripts/render-fixed.js shape but specializes section labels and the
// content maturity rubric (Persuasive / Argued / Informational / Draft / Notes).
//
// Pure function: no fs, no async, no LLM, no clock. Same findingsDoc → byte-identical Markdown.
// Within-tier sort by `text` ascending (Phase 3 invariant carried forward).
// Severity vocabulary: 4-tier producer side (Critical/Major/Minor/Nitpick). 4→3 collapse to
// MAJOR/MINOR/POLISH happens only at the /annotate adapter — never here.

const SEVERITY_EMOJI = { Critical: '🔴', Major: '🟠', Minor: '🟡', Nitpick: '⚪' };
const SEVERITY_INDEX = { Critical: 0, Major: 1, Minor: 2, Nitpick: 3 };
const SEVERITY_ORDER = ['Critical', 'Major', 'Minor', 'Nitpick'];

function severityIndex(sev) {
  /* c8 ignore next */ // Defensive: severity_reviewer is always one of {Critical,Major,Minor,Nitpick} per schema.
  return SEVERITY_INDEX[sev] != null ? SEVERITY_INDEX[sev] : 99;
}

function sortFindings(arr) {
  return arr.slice().sort((a, b) => {
    const di = severityIndex(a.severity_reviewer) - severityIndex(b.severity_reviewer);
    if (di !== 0) return di;
    if (a.text < b.text) return -1;
    if (a.text > b.text) return 1;
    /* c8 ignore next */ // Tie on equal text exercised by tests; some Node runs deopt the comparator branches.
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

function countGenuine(doc) {
  let n = 0;
  for (const f of collectAllFindings(doc)) if (f.genuine === true) n++;
  return n;
}

// "Thesis present" heuristic — no systemic pyramid-mece finding whose text mentions thesis
// (i.e., no "missing thesis" finding flagged at deck level).
function thesisLikelyPresent(doc) {
  for (const f of collectAllFindings(doc)) {
    if (f.check_id === 'pyramid-mece' && (f._slideNum == null || f.location === 'deck-systemic')) {
      /* c8 ignore next */ // Defensive: f.text is non-empty by schema (validate() enforces).
      if (/thesis/i.test(f.text || '')) return false;
    }
  }
  return true;
}

// "Resolution present" heuristic — no systemic narrative-arc finding whose text mentions resolution.
function resolutionLikelyPresent(doc) {
  for (const f of collectAllFindings(doc)) {
    if (f.check_id === 'narrative-arc' && (f._slideNum == null || f.location === 'deck-systemic')) {
      /* c8 ignore next */ // Defensive: f.text is non-empty by schema.
      if (/resolution/i.test(f.text || '')) return false;
    }
  }
  return true;
}

// Content maturity rubric — first-match-wins per 06-RESEARCH §"Render-content-fixed structure".
function computeMaturity(doc, counts) {
  const noThesis = !thesisLikelyPresent(doc);
  const noResolution = !resolutionLikelyPresent(doc);
  // 1 Notes — ≥3 Critical OR no thesis OR no resolution
  if (counts.critical >= 3 || noThesis || noResolution) return 'Notes';
  // 2 Draft — 1–2 Critical
  if (counts.critical >= 1 && counts.critical <= 2) return 'Draft';
  // 5 Persuasive — 0 Critical AND ≤2 Major AND coherent thesis surfaces (heuristic above true)
  if (counts.critical === 0 && counts.major <= 2) return 'Persuasive';
  // 4 Argued — 0 Critical AND ≤4 Major
  if (counts.critical === 0 && counts.major <= 4) return 'Argued';
  // 3 Informational — 0 Critical AND ≥5 Major
  if (counts.critical === 0 && counts.major >= 5) return 'Informational';
  /* c8 ignore next */ // Defensive fallthrough: prior rules cover all non-negative {critical,major} integer combos.
  return 'Notes';
}

function renderSection1(doc) {
  const lines = ['## §1 — Deck-Level Argument Structure', ''];
  const systemic = collectAllFindings(doc).filter(f =>
    f._slideNum == null || f.location === 'deck-systemic'
  );
  if (systemic.length === 0) {
    lines.push('_No deck-level systemic findings — no content findings emitted._');
    return lines.join('\n');
  }
  for (const f of sortFindings(systemic)) {
    /* c8 ignore next */ // Defensive: f.severity_reviewer is one of the validated four; SEVERITY_EMOJI[sev] always defined.
    const emoji = SEVERITY_EMOJI[f.severity_reviewer] || '';
    /* c8 ignore next */ // Defensive: f.check_id is required for content findings (validate() enforces).
    lines.push(`- **${emoji} ${f.severity_reviewer}** | ${f.check_id || 'content'} — ${f.text}`);
    lines.push(`  - *Standard:* ${f.standard}`);
    lines.push(`  - *Fix:* ${f.fix}`);
  }
  return lines.join('\n');
}

function renderSection2() {
  return [
    '## §2 — Inferred Argument Architecture',
    '',
    '_Thesis statement, supporting points, and tension/resolution beats — declared by the calling agent in the narrative MD._',
  ].join('\n');
}

function renderSection3(doc) {
  const lines = ['## §3 — Slide-by-Slide Content Findings', ''];
  /* c8 ignore next */ // Defensive: doc.slides always an array post-validate.
  const slides = (doc.slides || []).slice().sort((a, b) => a.slideNum - b.slideNum);
  if (slides.length === 0) {
    lines.push('_No content findings emitted._');
    return lines.join('\n');
  }
  let anyFinding = false;
  for (const slide of slides) {
    if (!slide.findings || slide.findings.length === 0) continue;
    anyFinding = true;
    lines.push(`### Slide ${slide.slideNum} — ${slide.title}`);
    lines.push('');
    const counts = { Critical: 0, Major: 0, Minor: 0, Nitpick: 0 };
    for (const f of slide.findings) {
      if (counts[f.severity_reviewer] != null) counts[f.severity_reviewer]++;
    }
    lines.push(`Findings: 🔴×${counts.Critical} / 🟠×${counts.Major} / 🟡×${counts.Minor} / ⚪×${counts.Nitpick}`);
    lines.push('');
    for (const sev of SEVERITY_ORDER) {
      const tier = sortFindings(slide.findings.filter(f => f.severity_reviewer === sev));
      if (tier.length === 0) continue;
      lines.push(`${SEVERITY_EMOJI[sev]} ${sev.toUpperCase()}`);
      for (const f of tier) {
        lines.push(`- ${f.text} — ${f.standard} → ${f.fix}`);
      }
      lines.push('');
    }
  }
  if (!anyFinding) {
    lines.push('_No content findings emitted._');
  }
  while (lines.length && lines[lines.length - 1] === '') lines.pop();
  return lines.join('\n');
}

function renderSection4(doc, counts, maturity) {
  /* c8 ignore next */ // Defensive: doc.slides always an array post-validate.
  const totalSlides = (doc.slides || []).length;
  const genuine = countGenuine(doc);
  return [
    '## §4 — Content Maturity Scoreboard',
    '',
    '| Metric | Count |',
    '|--------|-------|',
    `| Total slides reviewed | ${totalSlides} |`,
    `| Critical (🔴) | ${counts.critical} |`,
    `| Major (🟠) | ${counts.major} |`,
    `| Minor (🟡) | ${counts.minor} |`,
    `| Nitpick (⚪) | ${counts.nitpick} |`,
    `| Genuine findings | ${genuine} |`,
    `| **Overall content maturity** | **${maturity}** |`,
  ].join('\n');
}

function effortFor(text) {
  /* c8 ignore next */ // Defensive: every finding has a non-empty `fix` string by schema.
  const len = (text || '').length;
  if (len < 60) return 'trivial';
  if (len < 120) return 'light';
  if (len < 200) return 'moderate';
  return 'substantial';
}

function renderSection5(doc) {
  const lines = ['## §5 — Top 10 Content Fixes', ''];
  const all = collectAllFindings(doc);
  if (all.length === 0) {
    lines.push('_No content findings emitted._');
    return lines.join('\n');
  }
  const groups = new Map();
  for (const f of all) {
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
  const maturity = computeMaturity(findingsDoc, counts);
  /* c8 ignore next */ // Defensive: findingsDoc.slides always an array post-validate.
  const totalSlides = (findingsDoc.slides || []).length;

  const header = [
    `# Content Review — ${findingsDoc.deck}`,
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
    countBySeverity,
  },
};
