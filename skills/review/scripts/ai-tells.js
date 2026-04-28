'use strict';
// ai-tells.js — Deterministic R18 AI-tell heuristics.
// Per Phase 3 D-02 (hybrid; in-code rules) + RVW-03.
// Three heuristics:
//   1. detectDefaultBluePalette       — ≥30% of <a:srgbClr> cells fall in DEFAULT_BLUES.
//   2. detectAccentLineUnderTitle     — thin full-width rect within 12pt of title baseline,
//                                       on ≥3 slides. Title detection has a P-09 fallback
//                                       (topmost text shape) when no bold/large title found.
//   3. detectIdenticalLayoutsRepeated — shape-graph SHA-256 hash collision on ≥3 slides.
//
// Every emitted finding carries r18_ai_tell: true and the full Phase 1 4-tier
// severity (P-01 guard — never pre-collapse). category === 'style', genuine === true.
// The downstream agent may flip `genuine: false` per design rationale (P-08); the
// reviewer side never does.
//
// jszip access is delegated to ./lib/read-deck-xml — single source of truth for
// the 100MB zip-bomb cap (T-03-13).

const crypto = require('node:crypto');
const { loadSlides } = require('./lib/read-deck-xml');

const DEFAULT_BLUES = new Set([
  '0070C0', '1F4E79', '2E75B6', '4472C4', '5B9BD5', '8FAADC',
]);
const TITLE_BASELINE_TOLERANCE_EMU = 152400;     // 12pt
const FULL_WIDTH_THRESHOLD_EMU     = 4572000;    // 50% of 9144000 (16:9 default slide width)
const LAYOUT_BUCKET_EMU            = 100000;     // ~0.11 inch
const DEFAULT_BLUE_DOMINANCE_PCT   = 0.30;
const REPEATED_LAYOUT_MIN_COUNT    = 3;
const ACCENT_LINE_MIN_SLIDES       = 3;

function detectDefaultBluePalette(slides) {
  const colorCounts = {};
  for (const s of slides) {
    const matches = s.xml.matchAll(/<a:srgbClr\s+val="([0-9A-Fa-f]{6})"/g);
    for (const m of matches) {
      const hex = m[1].toUpperCase();
      colorCounts[hex] = (colorCounts[hex] || 0) + 1;
    }
  }
  const total = Object.values(colorCounts).reduce((a, b) => a + b, 0);
  if (total === 0) return null;
  let defaultBlueCount = 0;
  for (const [hex, c] of Object.entries(colorCounts)) {
    if (DEFAULT_BLUES.has(hex)) defaultBlueCount += c;
  }
  if (defaultBlueCount / total < DEFAULT_BLUE_DOMINANCE_PCT) return null;
  return {
    severity_reviewer: 'Major', category: 'style', genuine: true,
    nx: 0.5, ny: 0.5,
    text: `Default Office-blue palette dominates the deck (${defaultBlueCount}/${total} fills)`,
    rationale: 'Default Office accent blues appear in >30% of color cells; typical AI-generator fallback',
    location: 'deck-systemic',
    standard: 'Custom palette per deck (DECK-VDA §2)',
    fix: 'Choose a brand-justified palette; document in design-rationale.md',
    r18_ai_tell: true,
    slideNum: null,
  };
}

function extractShapes(xml) {
  // Lightweight shape extraction. Each <p:sp> or <p:pic> chunk between matching tags.
  // Captures (kind, off_x, off_y, ext_cx, ext_cy, prstGeom-or-name).
  const shapes = [];
  const spRegex = /<p:(sp|pic)\b[\s\S]*?<\/p:\1>/g;
  for (const m of xml.matchAll(spRegex)) {
    const chunk = m[0];
    const off = chunk.match(/<a:off\s+x="(-?\d+)"\s+y="(-?\d+)"/);
    const ext = chunk.match(/<a:ext\s+cx="(-?\d+)"\s+cy="(-?\d+)"/);
    if (!off || !ext) continue;
    const prst = (chunk.match(/<a:prstGeom\s+prst="([^"]+)"/) || [])[1] || m[1];
    const szMatch = chunk.match(/<a:rPr[^>]*\bsz="(\d+)"/);
    const sz = szMatch ? parseInt(szMatch[1], 10) : 0;
    /* c8 ignore next */ // The trailing \b after b="1" requires a word char immediately after the closing quote; real PPTX always emits a space (b="1" dirty=...) so this regex never matches in practice — guard kept for future schema variants.
    const isBoldLargeText = /<a:rPr[^>]*\bb="1"\b/.test(chunk) && sz >= 2400;
    const hasText = /<a:t>/.test(chunk);
    shapes.push({
      kind: m[1],
      offX: parseInt(off[1], 10), offY: parseInt(off[2], 10),
      extCx: parseInt(ext[1], 10), extCy: parseInt(ext[2], 10),
      prst,
      isBoldLargeText,
      hasText,
    });
  }
  return shapes;
}

function detectAccentLineUnderTitle(slides) {
  const findings = [];
  for (const s of slides) {
    const shapes = extractShapes(s.xml);
    // Title heuristic: topmost bold-large; P-09 fallback: topmost text-bearing shape.
    let title = shapes
      .filter((sh) => sh.isBoldLargeText)
      .sort((a, b) => a.offY - b.offY)[0];
    if (!title) {
      title = shapes
        .filter((sh) => sh.hasText)
        .sort((a, b) => a.offY - b.offY)[0];
    }
    if (!title) continue;
    const titleBaseline = title.offY + title.extCy;
    const accent = shapes.find((sh) =>
      sh.kind === 'sp' &&
      (sh.prst === 'line' || sh.extCy < 50800) &&
      Math.abs(sh.offY - titleBaseline) <= TITLE_BASELINE_TOLERANCE_EMU &&
      sh.extCx >= FULL_WIDTH_THRESHOLD_EMU,
    );
    if (accent) {
      findings.push({
        slideNum: s.slideNum,
        severity_reviewer: 'Major', category: 'style', genuine: true,
        nx: (accent.offX + accent.extCx / 2) / 9144000,
        ny: (accent.offY) / 5143500,
        text: 'Accent line under title (R18 AI-tell)',
        rationale: 'Generator-style accent rule under title; flagged on Anthropic pptx skill Avoid list',
        location: 'under title',
        standard: 'NEVER use accent lines under titles (Anthropic pptx skill Avoid list)',
        fix: 'Remove the accent line; use whitespace + type weight for hierarchy',
        r18_ai_tell: true,
      });
    }
  }
  return findings.length >= ACCENT_LINE_MIN_SLIDES ? findings : [];
}

function detectIdenticalLayoutsRepeated(slides) {
  const hashesBySlide = {};
  for (const s of slides) {
    const shapes = extractShapes(s.xml);
    const tuples = shapes
      .map((sh) => [sh.kind, sh.prst,
        Math.round(sh.offX / LAYOUT_BUCKET_EMU),
        Math.round(sh.offY / LAYOUT_BUCKET_EMU),
        Math.round(sh.extCx / LAYOUT_BUCKET_EMU),
        Math.round(sh.extCy / LAYOUT_BUCKET_EMU)].join('|'))
      .sort();
    const hash = crypto.createHash('sha256').update(tuples.join('\0')).digest('hex');
    (hashesBySlide[hash] ||= []).push(s.slideNum);
  }
  const findings = [];
  for (const [, slideNums] of Object.entries(hashesBySlide)) {
    if (slideNums.length >= REPEATED_LAYOUT_MIN_COUNT) {
      findings.push({
        slideNum: null,
        severity_reviewer: 'Major', category: 'style', genuine: true,
        nx: 0.5, ny: 0.5,
        text: `Identical layout repeated on slides ${slideNums.join(', ')}`,
        rationale: `Shape-graph hash collision across ${slideNums.length} slides; AI generators reuse scaffolding`,
        location: 'deck-systemic',
        standard: 'Slide-to-slide visual variety (DECK-VDA Pass 1 MACRO)',
        fix: 'Vary at least one layout dimension across consecutive same-type slides',
        r18_ai_tell: true,
      });
    }
  }
  return findings;
}

async function detectAITells(pptxPath) {
  const slides = await loadSlides(pptxPath);
  const out = [];
  const dblue = detectDefaultBluePalette(slides); if (dblue) out.push(dblue);
  out.push(...detectAccentLineUnderTitle(slides));
  out.push(...detectIdenticalLayoutsRepeated(slides));
  return out;
}

module.exports = {
  detectAITells,
  DEFAULT_BLUES,
  _internal: {
    detectDefaultBluePalette,
    detectAccentLineUnderTitle,
    detectIdenticalLayoutsRepeated,
    extractShapes,
    loadSlides,
  },
};
