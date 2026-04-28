'use strict';
// sample-render-deck.cjs — canonical Phase 4 fixture covering all 9 cookbook
// recipes (title / section / 2col / comparison / data-chart / data-table /
// stat-callout / quote / closing). Self-contained: hardcoded demo content,
// parameter-free. Reused by Plan 04-02/03/04 integration tests.
//
// ENUM constants only (CRT-15 / Phase 4 D-05). No string-literal addShape calls.
const pptxgen = require('pptxgenjs');

const pres = new pptxgen();
pres.layout = 'LAYOUT_16x9';
pres.author = 'Instadecks';
pres.title = 'Q3 enterprise expansion';

const PALETTE = { primary: '1E2761', secondary: 'CADCFC', accent: 'FFFFFF', ink: '0B1020', muted: '6B7280' };
const TYPE = { heading: 'IBM Plex Sans', body: 'IBM Plex Sans', mono: 'IBM Plex Mono' };

const W = 10, H = 5.625;
const MARGIN_X = 0.5, MARGIN_Y = 0.4;
const TITLE_Y = 0.3, TITLE_H = 0.7;
const FOOTER_Y = H - 0.3;

function addFooter(slide, { pageNum, total, source }) {
  slide.addText(`${pageNum} / ${total}`, {
    x: W - 1.0, y: FOOTER_Y, w: 0.6, h: 0.2,
    fontFace: TYPE.body, fontSize: 9, color: PALETTE.muted, align: 'right', margin: 0,
  });
  if (source) {
    slide.addText(`Source: ${source}`, {
      x: MARGIN_X, y: FOOTER_Y, w: W - 2.0, h: 0.2,
      fontFace: TYPE.body, fontSize: 9, color: PALETTE.muted, italic: true, margin: 0,
    });
  }
}

// ── Recipe 1: Title ──────────────────────────────────────────────────────────
function renderTitle(slide, { title, subtitle, attribution }) {
  slide.background = { color: PALETTE.primary };
  slide.addText(title, {
    x: MARGIN_X, y: 1.6, w: W - 1.0, h: 1.6,
    fontFace: TYPE.heading, fontSize: 40, bold: true,
    color: PALETTE.accent, align: 'left', valign: 'top', margin: 0,
  });
  if (subtitle) slide.addText(subtitle, {
    x: MARGIN_X, y: 3.3, w: W - 1.0, h: 0.6,
    fontFace: TYPE.body, fontSize: 18, color: PALETTE.secondary, margin: 0,
  });
  if (attribution) slide.addText(attribution, {
    x: MARGIN_X, y: H - 0.9, w: W - 1.0, h: 0.3,
    fontFace: TYPE.body, fontSize: 11, color: PALETTE.secondary, margin: 0,
  });
  slide.addNotes('Title slide — establish topic + voice.');
}

// ── Recipe 2: Section ────────────────────────────────────────────────────────
function renderSection(slide, { sectionNum, sectionTitle, pageNum, total }) {
  slide.background = { color: PALETTE.primary };
  slide.addText(String(sectionNum).padStart(2, '0'), {
    x: MARGIN_X, y: 1.8, w: 2, h: 1.0,
    fontFace: TYPE.heading, fontSize: 60, bold: true, color: PALETTE.secondary, margin: 0,
  });
  slide.addText(sectionTitle, {
    x: MARGIN_X + 1.8, y: 2.1, w: W - 2.5, h: 1.4,
    fontFace: TYPE.heading, fontSize: 28, color: PALETTE.accent, margin: 0,
  });
  slide.addShape(pres.shapes.LINE, {
    x: MARGIN_X, y: 3.7, w: 1.5, h: 0,
    line: { color: PALETTE.secondary, width: 2 },
  });
  addFooter(slide, { pageNum, total });
  slide.addNotes(`Section ${sectionNum}: ${sectionTitle}.`);
}

// ── Recipe 3: Two-column ─────────────────────────────────────────────────────
function render2Col(slide, { title, leftHeader, leftBody, rightHeader, rightBody, source, pageNum, total }) {
  slide.background = { color: PALETTE.accent };
  slide.addText(title, {
    x: MARGIN_X, y: TITLE_Y, w: W - 1.0, h: TITLE_H,
    fontFace: TYPE.heading, fontSize: 24, bold: true, color: PALETTE.ink, margin: 0,
  });
  const COL_W = (W - MARGIN_X * 2 - 0.4) / 2;
  slide.addText(leftHeader, {
    x: MARGIN_X, y: 1.3, w: COL_W, h: 0.5,
    fontFace: TYPE.heading, fontSize: 16, bold: true, color: PALETTE.primary, margin: 0,
  });
  slide.addText(leftBody.map((s, i) => ({ text: s, options: { bullet: true, breakLine: i < leftBody.length - 1 } })), {
    x: MARGIN_X, y: 1.9, w: COL_W, h: H - 2.6,
    fontFace: TYPE.body, fontSize: 14, color: PALETTE.ink, paraSpaceAfter: 6, margin: 0,
  });
  const RIGHT_X = MARGIN_X + COL_W + 0.4;
  slide.addText(rightHeader, {
    x: RIGHT_X, y: 1.3, w: COL_W, h: 0.5,
    fontFace: TYPE.heading, fontSize: 16, bold: true, color: PALETTE.primary, margin: 0,
  });
  slide.addText(rightBody.map((s, i) => ({ text: s, options: { bullet: true, breakLine: i < rightBody.length - 1 } })), {
    x: RIGHT_X, y: 1.9, w: COL_W, h: H - 2.6,
    fontFace: TYPE.body, fontSize: 14, color: PALETTE.ink, paraSpaceAfter: 6, margin: 0,
  });
  addFooter(slide, { pageNum, total, source });
  slide.addNotes('Two-column comparison.');
}

// ── Recipe 4: Comparison ─────────────────────────────────────────────────────
function renderComparison(slide, { title, optionA, optionB, source, pageNum, total }) {
  slide.background = { color: PALETTE.accent };
  slide.addText(title, {
    x: MARGIN_X, y: TITLE_Y, w: W - 1.0, h: TITLE_H,
    fontFace: TYPE.heading, fontSize: 24, bold: true, color: PALETTE.ink, margin: 0,
  });
  const CARD_W = (W - MARGIN_X * 2 - 0.5) / 2;
  for (const [i, opt] of [optionA, optionB].entries()) {
    const cx = MARGIN_X + i * (CARD_W + 0.5);
    slide.addShape(pres.shapes.RECTANGLE, {
      x: cx, y: 1.3, w: CARD_W, h: H - 2.0,
      fill: { color: 'F5F7FA' }, line: { color: 'E5E7EB', width: 1 },
    });
    slide.addShape(pres.shapes.RECTANGLE, {
      x: cx, y: 1.3, w: CARD_W, h: 0.08,
      fill: { color: opt.color || PALETTE.primary },
    });
    slide.addText(opt.label, {
      x: cx + 0.2, y: 1.5, w: CARD_W - 0.4, h: 0.5,
      fontFace: TYPE.heading, fontSize: 18, bold: true, color: PALETTE.ink, margin: 0,
    });
    slide.addText(opt.bullets.map((s, j) => ({ text: s, options: { bullet: true, breakLine: j < opt.bullets.length - 1 } })), {
      x: cx + 0.2, y: 2.1, w: CARD_W - 0.4, h: H - 2.9,
      fontFace: TYPE.body, fontSize: 13, color: PALETTE.ink, paraSpaceAfter: 6, margin: 0,
    });
  }
  addFooter(slide, { pageNum, total, source });
  slide.addNotes(`Side-by-side: ${optionA.label} vs ${optionB.label}.`);
}

// ── Recipe 5: Data chart ─────────────────────────────────────────────────────
function renderDataChart(slide, { title, chartType, series, source, pageNum, total }) {
  slide.background = { color: PALETTE.accent };
  slide.addText(title, {
    x: MARGIN_X, y: TITLE_Y, w: W - 1.0, h: TITLE_H,
    fontFace: TYPE.heading, fontSize: 24, bold: true, color: PALETTE.ink, margin: 0,
  });
  slide.addChart(pres.charts[chartType], series, {
    x: MARGIN_X, y: 1.3, w: W - 1.0, h: H - 2.2,
    barDir: chartType === 'BAR' ? 'col' : undefined,
    chartColors: [PALETTE.primary, PALETTE.secondary, PALETTE.muted],
    chartArea: { fill: { color: 'FFFFFF' }, roundedCorners: false },
    catAxisLabelColor: PALETTE.muted, valAxisLabelColor: PALETTE.muted,
    catAxisLabelFontFace: TYPE.body, valAxisLabelFontFace: TYPE.body,
    valGridLine: { color: 'E5E7EB', size: 0.5 }, catGridLine: { style: 'none' },
    showValue: chartType === 'BAR', dataLabelPosition: 'outEnd',
    dataLabelColor: PALETTE.ink, showLegend: series.length > 1,
  });
  addFooter(slide, { pageNum, total, source });
  slide.addNotes(`${chartType} chart — ${series.length} series.`);
}

// ── Recipe 6: Data table ─────────────────────────────────────────────────────
function renderDataTable(slide, { title, headers, rows, source, pageNum, total }) {
  slide.background = { color: PALETTE.accent };
  slide.addText(title, {
    x: MARGIN_X, y: TITLE_Y, w: W - 1.0, h: TITLE_H,
    fontFace: TYPE.heading, fontSize: 24, bold: true, color: PALETTE.ink, margin: 0,
  });
  const tableData = [
    headers.map(h => ({
      text: h,
      options: { fill: { color: PALETTE.primary }, color: PALETTE.accent, bold: true, fontFace: TYPE.heading },
    })),
    ...rows.map((r, ri) => r.map(c => ({
      text: String(c),
      options: { fontFace: TYPE.body, fill: { color: ri % 2 ? 'F5F7FA' : 'FFFFFF' }, color: PALETTE.ink },
    }))),
  ];
  slide.addTable(tableData, {
    x: MARGIN_X, y: 1.3, w: W - 1.0,
    fontSize: 12, border: { pt: 0.5, color: 'E5E7EB' },
    colW: Array(headers.length).fill((W - 1.0) / headers.length),
  });
  addFooter(slide, { pageNum, total, source });
  slide.addNotes(`Table — ${rows.length} rows.`);
}

// ── Recipe 7: Stat callout ───────────────────────────────────────────────────
function renderStatCallout(slide, { title, statValue, statLabel, supporting, source, pageNum, total }) {
  slide.background = { color: PALETTE.accent };
  slide.addText(title, {
    x: MARGIN_X, y: TITLE_Y, w: W - 1.0, h: TITLE_H,
    fontFace: TYPE.heading, fontSize: 22, bold: true, color: PALETTE.ink, margin: 0,
  });
  slide.addText(statValue, {
    x: MARGIN_X, y: 1.4, w: 4.5, h: 2.5,
    fontFace: TYPE.heading, fontSize: 72, bold: true, color: PALETTE.primary,
    align: 'left', valign: 'top', margin: 0,
  });
  slide.addText(statLabel, {
    x: MARGIN_X, y: 3.9, w: 4.5, h: 0.5,
    fontFace: TYPE.body, fontSize: 14, color: PALETTE.muted, margin: 0,
  });
  if (supporting) slide.addText(supporting, {
    x: 5.3, y: 1.6, w: W - 5.8, h: 3.0,
    fontFace: TYPE.body, fontSize: 14, color: PALETTE.ink, margin: 0,
  });
  addFooter(slide, { pageNum, total, source });
  slide.addNotes(`Stat: ${statValue} — ${statLabel}.`);
}

// ── Recipe 8: Quote ──────────────────────────────────────────────────────────
function renderQuote(slide, { quote, attribution, role, pageNum, total }) {
  slide.background = { color: PALETTE.primary };
  slide.addShape(pres.shapes.LEFT_BRACE, {
    x: 0.6, y: 1.4, w: 0.4, h: H - 2.5,
    line: { color: PALETTE.secondary, width: 2 }, fill: { color: PALETTE.primary },
  });
  slide.addText(quote, {
    x: 1.3, y: 1.5, w: W - 1.8, h: H - 2.6,
    fontFace: TYPE.heading, fontSize: 26, italic: true, color: PALETTE.accent,
    valign: 'middle', margin: 0,
  });
  slide.addText(`— ${attribution}${role ? `, ${role}` : ''}`, {
    x: 1.3, y: H - 1.0, w: W - 1.8, h: 0.4,
    fontFace: TYPE.body, fontSize: 14, color: PALETTE.secondary, margin: 0,
  });
  addFooter(slide, { pageNum, total });
  slide.addNotes(`Quote from ${attribution}.`);
}

// ── Recipe 9: Closing ────────────────────────────────────────────────────────
function renderClosing(slide, { headline, callToAction, contact, pageNum, total }) {
  slide.background = { color: PALETTE.primary };
  slide.addText(headline, {
    x: MARGIN_X, y: 1.6, w: W - 1.0, h: 1.4,
    fontFace: TYPE.heading, fontSize: 36, bold: true, color: PALETTE.accent, margin: 0,
  });
  if (callToAction) {
    slide.addShape(pres.shapes.RIGHT_ARROW, {
      x: MARGIN_X, y: 3.4, w: 0.5, h: 0.4,
      fill: { color: PALETTE.secondary }, line: { color: PALETTE.secondary, width: 0 },
    });
    slide.addText(callToAction, {
      x: MARGIN_X + 0.7, y: 3.35, w: W - 2.0, h: 0.5,
      fontFace: TYPE.body, fontSize: 18, color: PALETTE.secondary, margin: 0,
    });
  }
  if (contact) slide.addText(contact, {
    x: MARGIN_X, y: H - 1.0, w: W - 1.0, h: 0.4,
    fontFace: TYPE.body, fontSize: 12, color: PALETTE.secondary, margin: 0,
  });
  slide.addNotes(`Closing — ${callToAction || 'wrap'}.`);
}

async function main() {
  const total = 9;

  renderTitle(pres.addSlide(), {
    title: 'Q3 revenue grew 23% on enterprise expansion',
    subtitle: 'Board update — Q3 2026',
    attribution: 'Prepared by RevOps · 2026-10-20',
  });

  renderSection(pres.addSlide(), { sectionNum: 1, sectionTitle: 'Where we landed', pageNum: 2, total });

  render2Col(pres.addSlide(), {
    title: 'Three deals anchored the upside',
    leftHeader: 'What worked',
    leftBody: ['Champion-led discovery', 'Tight 30-day pilot', 'Exec sponsor early'],
    rightHeader: 'What lagged',
    rightBody: ['SMB ramp slower than plan', 'EU pipeline still thin', 'Renewal cohort risk'],
    source: 'Salesforce Q3 close',
    pageNum: 3, total,
  });

  renderComparison(pres.addSlide(), {
    title: 'Plan vs. actual on the top three segments',
    optionA: { label: 'Plan',   color: '6B7280', bullets: ['Enterprise: $18M', 'Mid-market: $9M', 'SMB: $3M'] },
    optionB: { label: 'Actual', color: '1E2761', bullets: ['Enterprise: $22M', 'Mid-market: $9M', 'SMB: $2.4M'] },
    source: 'Finance review',
    pageNum: 4, total,
  });

  renderDataChart(pres.addSlide(), {
    title: 'Pipeline coverage trended up across the quarter',
    chartType: 'BAR',
    series: [{ name: 'Coverage (x)', labels: ['Jul','Aug','Sep'], values: [2.1, 2.6, 3.1] }],
    source: 'Pipeline snapshot',
    pageNum: 5, total,
  });

  renderDataTable(pres.addSlide(), {
    title: 'Q4 commitments by segment',
    headers: ['Segment', 'Target', 'Coverage', 'Owner'],
    rows: [
      ['Enterprise', '$24M', '3.4x', 'A. Patel'],
      ['Mid-market', '$10M', '2.8x', 'M. Chen'],
      ['SMB',        '$3.5M','2.1x', 'R. Diaz'],
    ],
    source: 'RevOps planning',
    pageNum: 6, total,
  });

  renderStatCallout(pres.addSlide(), {
    title: 'Customer concentration is the standout risk',
    statValue: '38%',
    statLabel: 'of revenue from top 3 customers',
    supporting: 'Mitigation: accelerate EU expansion and SMB packaging to broaden the base by Q2 2027.',
    source: 'Finance review',
    pageNum: 7, total,
  });

  renderQuote(pres.addSlide(), {
    quote: 'The pilot paid for itself in the first 30 days — we want the rest of the org on it by Q1.',
    attribution: 'J. Lin',
    role: 'CFO, Acme Corp',
    pageNum: 8, total,
  });

  renderClosing(pres.addSlide(), {
    headline: 'The ask: 6 AEs and EU budget approval',
    callToAction: 'Approve hire plan + EU expansion at this meeting',
    contact: 'revops@instadecks.example',
    pageNum: 9, total,
  });

  await pres.writeFile({ fileName: 'deck.pptx' });
}

main().catch(e => { console.error(e); process.exit(1); });
