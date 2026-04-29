'use strict';
// render-rationale.js — D-07 fixed-template design-rationale renderer.
// Pure deterministic function: no fs, no async, no clock, no random.
// Given identical inputs, render() returns byte-identical Markdown.
// Mirrors skills/review/scripts/render-fixed.js style.
//
// Section ordering (locked, D-07): Palette / Typography / Motif /
// Narrative Arc / Key Tradeoffs / Reviewer Notes.

const REVIEWER_NOTES_PLACEHOLDER =
  '_(no reviewer findings recorded — auto-refine converged on cycle 1.)_';

function renderPalette(designChoices) {
  const p = (designChoices && designChoices.palette) || {};
  const triple = [p.primary, p.secondary, p.accent].filter(Boolean).join(', ');
  const lines = ['## Palette'];
  lines.push(`- Chosen: ${p.name || '(unnamed)'} (${triple})`);
  lines.push(`- Rationale: ${p.rationale || ''}`);
  return lines.join('\n');
}

function renderTypography(designChoices) {
  const t = (designChoices && designChoices.typography) || {};
  const lines = ['## Typography'];
  lines.push(`- Headings: ${t.heading || ''}`);
  lines.push(`- Body: ${t.body || ''}`);
  lines.push(`- Pair rationale: ${t.rationale || ''}`);
  return lines.join('\n');
}

function renderMotif(designChoices) {
  const motif = (designChoices && designChoices.motif) || '';
  return ['## Motif', motif].join('\n');
}

function renderNarrativeArc(brief) {
  const lines = ['## Narrative Arc'];
  const arc = (brief && Array.isArray(brief.narrative_arc)) ? brief.narrative_arc : [];
  arc.forEach((beat, i) => {
    lines.push(`${i + 1}. ${beat}`);
  });
  return lines.join('\n');
}

function renderKeyTradeoffs(designChoices) {
  const lines = ['## Key Tradeoffs'];
  const tradeoffs = (designChoices && Array.isArray(designChoices.tradeoffs))
    ? designChoices.tradeoffs : [];
  if (tradeoffs.length === 0) {
    lines.push('- _(none recorded)_');
  } else {
    for (const t of tradeoffs) lines.push(`- ${t}`);
  }
  return lines.join('\n');
}

function renderReviewerNotes(reviewerNotes) {
  const body = (reviewerNotes && String(reviewerNotes).trim().length > 0)
    ? String(reviewerNotes)
    : REVIEWER_NOTES_PLACEHOLDER;
  return ['## Reviewer Notes', body].join('\n');
}

// Live E2E Iteration 1 — Fix #2: emit shorthand `**Palette:** <name>` etc.
// lines at the top so SKILL.md-documented regex extraction (and the
// visual-diversity test that parses these to verify DNA distinctness across
// runs) finds the rolled DNA without parsing markdown sections.
function renderShorthand(designChoices) {
  const dc = designChoices || {};
  const palette = (dc.palette && dc.palette.name) || '(unnamed)';
  let typography;
  if (dc.typography && typeof dc.typography === 'object') {
    if (dc.typography.pairing) {
      typography = dc.typography.pairing;
    } else if (dc.typography.heading || dc.typography.body) {
      const h = dc.typography.heading || '';
      const b = dc.typography.body || '';
      typography = h && b ? `${h}+${b}` : (h || b);
    } else {
      typography = '(unnamed)';
    }
  } else {
    typography = '(unnamed)';
  }
  let motif;
  if (typeof dc.motif === 'string') {
    if (dc.motif.length === 0) {
      motif = '(unnamed)';
    } else {
      // First sentence/phrase — split on period, semicolon, or em-dash.
      const m = dc.motif.split(/[.;—]/)[0].trim();
      motif = m.length > 0 ? m : dc.motif;
    }
  } else if (dc.motif && typeof dc.motif === 'object' && dc.motif.name) {
    motif = dc.motif.name;
  } else {
    motif = '(unnamed)';
  }
  return [
    `**Palette:** ${palette}`,
    `**Typography:** ${typography}`,
    `**Motif:** ${motif}`,
  ].join('\n');
}

function render({ brief, designChoices, reviewerNotes } = {}) {
  if (!brief || typeof brief !== 'object') {
    throw new Error('render: brief must be an object');
  }
  const header = `# Design Rationale — ${brief.topic || ''}`;
  return [
    header,
    renderShorthand(designChoices),
    renderPalette(designChoices),
    renderTypography(designChoices),
    renderMotif(designChoices),
    renderNarrativeArc(brief),
    renderKeyTradeoffs(designChoices),
    renderReviewerNotes(reviewerNotes),
  ].join('\n\n') + '\n';
}

module.exports = {
  render,
  _internal: {
    renderPalette, renderTypography, renderMotif,
    renderNarrativeArc, renderKeyTradeoffs, renderReviewerNotes,
    renderShorthand,
    REVIEWER_NOTES_PLACEHOLDER,
  },
};
