'use strict';
// tools/build-ai-tells-fixtures.js — Generates the positive + negative R18
// AI-tell fixtures consumed by tests/review-ai-tells.test.js (Plan 03-03 / RVW-03).
//
// Positive fixture (tests/fixtures/ai-tells-positive.pptx) — 3 slides crafted to
// trigger ALL three in-code heuristics in skills/review/scripts/ai-tells.js:
//   1. detectDefaultBluePalette: every shape uses srgb fill #0070C0 (Office Accent 1),
//      so >30% of <a:srgbClr> hits land on a DEFAULT_BLUES member.
//   2. detectAccentLineUnderTitle: each slide has a bold 24pt title at top + a thin
//      90%-wide rect 0.05" tall directly under the title baseline (fires on ≥3 slides).
//   3. detectIdenticalLayoutsRepeated: every slide has the same 3 text shapes at
//      identical coords, so the shape-graph hash collides across 3 slides.
//
// Negative fixture (tests/fixtures/ai-tells-negative.pptx) — 3 slides with an
// artisanal palette (#2E5266, #D8973C, #7B2D26 — none in DEFAULT_BLUES), no
// horizontal rects under titles, and three structurally distinct layouts.
//
// Calibration note: pptxgenjs serializes per-shape `fill: { color: 'HEX' }` as
// <a:srgbClr val="HEX"/> (not <a:schemeClr>), which is what the heuristic regex
// expects. Background/scheme fills do NOT count for the heuristic — see Plan 03-03
// task 2 acceptance "Calibration runbook".

const path = require('node:path');
const fs = require('node:fs');

function repoRoot() { return path.join(__dirname, '..'); }

function ensurePptxgenjsPath() {
  if (!process.env.PPTXGENJS_PATH) {
    const baseDir = process.env.CLAUDE_PLUGIN_DATA || repoRoot();
    process.env.PPTXGENJS_PATH = path.join(baseDir, 'node_modules', 'pptxgenjs');
  }
}

async function buildPositive(PptxGenJS, outPath) {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE'; // 13.333" x 7.5" (16:9)
  const BLUE = '0070C0';

  for (let i = 1; i <= 3; i++) {
    const slide = pptx.addSlide();

    // Title — bold 24pt at top. Identical coords across all 3 slides (locks
    // identical-layouts-repeated hash).
    slide.addText(`Default Office Title ${i}`, {
      x: 0.5, y: 0.3, w: 12.3, h: 0.6,
      fontSize: 24, bold: true, color: BLUE,
    });

    // Accent line — thin 90%-wide rect directly under title baseline.
    // Title baseline ≈ y(0.3") + h(0.6") = 0.9"; rect at y=0.95" satisfies the
    // 12pt (= ~0.166") tolerance.
    slide.addShape('rect', {
      x: 0.65, y: 0.95, w: 12, h: 0.05,
      fill: { color: BLUE }, line: { color: BLUE, width: 0 },
    });

    // 3 body text shapes at identical coords — deck-systemic blue fills,
    // identical layout across slides.
    slide.addText(`Bullet A on slide ${i}`, {
      x: 0.5, y: 2, w: 12, h: 0.8,
      fontSize: 18, color: BLUE, fill: { color: BLUE },
    });
    slide.addText(`Bullet B on slide ${i}`, {
      x: 0.5, y: 3, w: 12, h: 0.8,
      fontSize: 18, color: BLUE, fill: { color: BLUE },
    });
    slide.addText(`Bullet C on slide ${i}`, {
      x: 0.5, y: 4, w: 12, h: 0.8,
      fontSize: 18, color: BLUE, fill: { color: BLUE },
    });
  }

  await pptx.writeFile({ fileName: outPath });
}

async function buildNegative(PptxGenJS, outPath) {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  const PALETTE = ['2E5266', 'D8973C', '7B2D26'];

  // Slide 1 — title + 2-column.
  {
    const slide = pptx.addSlide();
    slide.addText('Artisanal Two-Column Slide', {
      x: 0.5, y: 0.4, w: 12, h: 0.7,
      fontSize: 24, bold: true, color: PALETTE[0],
    });
    slide.addText('Left column body copy with a fairly long line of prose.', {
      x: 0.5, y: 2, w: 5.8, h: 4,
      fontSize: 16, color: PALETTE[1], fill: { color: PALETTE[1] },
    });
    slide.addText('Right column body copy paired against the left.', {
      x: 7, y: 2, w: 5.8, h: 4,
      fontSize: 16, color: PALETTE[2], fill: { color: PALETTE[2] },
    });
  }

  // Slide 2 — hero block + caption.
  {
    const slide = pptx.addSlide();
    slide.addText('Hero Layout', {
      x: 1.5, y: 1, w: 10, h: 1,
      fontSize: 32, bold: true, color: PALETTE[1],
    });
    slide.addShape('rect', {
      x: 2, y: 2.5, w: 9, h: 3.5,
      fill: { color: PALETTE[0] }, line: { color: PALETTE[0], width: 0 },
    });
    slide.addText('caption beneath hero', {
      x: 2, y: 6.2, w: 9, h: 0.6,
      fontSize: 12, color: PALETTE[2], fill: { color: PALETTE[2] },
    });
  }

  // Slide 3 — quote layout (single big-text shape).
  {
    const slide = pptx.addSlide();
    slide.addText('"A pull quote in italics, centered, no rule above."', {
      x: 1.5, y: 2.5, w: 10.3, h: 2.5,
      fontSize: 28, italic: true, align: 'center',
      color: PALETTE[2], fill: { color: PALETTE[2] },
    });
    slide.addText('— attributed source', {
      x: 1.5, y: 5.2, w: 10.3, h: 0.6,
      fontSize: 14, align: 'center',
      color: PALETTE[1], fill: { color: PALETTE[1] },
    });
  }

  await pptx.writeFile({ fileName: outPath });
}

async function main() {
  ensurePptxgenjsPath();
  const PptxGenJS = require(process.env.PPTXGENJS_PATH);

  const fixturesDir = path.join(repoRoot(), 'tests', 'fixtures');
  fs.mkdirSync(fixturesDir, { recursive: true });

  const posPath = path.join(fixturesDir, 'ai-tells-positive.pptx');
  const negPath = path.join(fixturesDir, 'ai-tells-negative.pptx');

  await buildPositive(PptxGenJS, posPath);
  await buildNegative(PptxGenJS, negPath);

  process.stdout.write(
    `Instadecks: wrote ${posPath} (${fs.statSync(posPath).size} bytes)\n` +
    `Instadecks: wrote ${negPath} (${fs.statSync(negPath).size} bytes)\n`,
  );
}

main().catch((err) => {
  /* c8 ignore next */ // Defensive: Errors thrown by Node always carry .stack; the `|| err` arm only fires for non-Error throws.
  process.stderr.write(`Instadecks: ai-tells fixture generation failed: ${err.stack || err}\n`);
  process.exit(1);
});
