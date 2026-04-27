'use strict';
// annotate.js — VERBATIM copy of /Users/shafqat/Documents/Projects/Sourcevo/v5-blue-prestige/annotate.js  // lint-allow:hardcoded-path
// (source-of-truth reference; not a runtime path).
// AUTHORIZED MODIFICATIONS (per CLAUDE.md + REQUIREMENTS.md ANNO-02/03/04):
//   1. require-path patch (ANNO-03): the original sibling-node_modules pptxgenjs require at line 6
//      is replaced with require(process.env.PPTXGENJS_PATH || 'pptxgenjs') so pptxgenjs resolves out of
//      ${CLAUDE_PLUGIN_DATA}/node_modules at runtime; bareword fallback covers test-from-project-root.
//   2. SAMPLES extraction (ANNO-04): the inline 44-line const-SAMPLES literal block (source lines 107-150)
//      is replaced with the single line: const { SAMPLES } = require('./samples'); so runtime data injection
//      is honoured by main()'s for-of SAMPLES loop (live module-level binding via getter).
// Any other diff fails tests/annotate-integrity.test.js (post-patch SHA pin).
// annotate.js — annotation deck for DECK-VDA findings
// node annotate.js   (run from v5-blue-prestige/)

const path = require('path');
const PptxGenJS = require(process.env.PPTXGENJS_PATH || 'pptxgenjs');

// ── Slide geometry ──────────────────────────────────────────────────────────
const SW       = 13.333;
const SH       = 7.5;
const FOOTER_Y = 7.22;

// Annotation columns
const COL_W    = 2.50;
const COL_PAD  = 0.08;

// Mini-slide
const MINI_GAP = 0.15;
const MINI_X   = COL_W + MINI_GAP;                    // 2.65"
const MINI_W   = SW - 2 * (COL_W + MINI_GAP);         // 7.933"
const MINI_H   = MINI_W * (9 / 16);                   // 4.462"
const MINI_Y   = (FOOTER_Y - MINI_H) / 2;             // ≈ 1.38"

const R_COL_X  = MINI_X + MINI_W + MINI_GAP;          // 10.783"

// Box layout constants
const BOX_W       = COL_W - COL_PAD - 0.05;  // 2.37"
const BOX_GAP     = 0.22;   // gap between consecutive boxes
const SEV_H       = 0.17;   // severity label height
const SEV_GAP     = 0.03;   // gap between sev label and body text
const TEXT_PAD_B  = 0.05;   // bottom padding inside box
const BAR_W       = 0.055;  // thin vertical bar width (≥ 8 px at 150 dpi so JPEG doesn't eat it)
const BOX_X_L     = COL_PAD;
const BOX_X_R     = R_COL_X + 0.05;

// Text estimation constants (IBM Plex Sans 7.5 pt) — empirically calibrated at 150 dpi.
// Body-text-only measurement (filtered by navy color, excluding orange severity label):
//   3-line text y=528–577 → height 49 px = 0.327" → per-line 0.110"
//   text starts ~5 px (0.033") below textAreaY due to LibreOffice cap-height padding
// LINE_H is generous (0.130") so the text box never clips actual rendering (~0.110/line).
// LINE_H_BAR matches the actual rendered per-line height so bar height ≈ text height.
// BAR_TOP_OFFSET shifts the bar down so its vertical midpoint aligns with text midpoint
// (compensates for LibreOffice's cap-height top-padding inside text boxes).
const LINE_H         = 0.130;  // text box height per line (generous, prevents clipping)
const LINE_H_BAR     = 0.110;  // bar height per line = actual rendered line height
const BAR_TOP_OFFSET = 0.027;  // bar shifted down so bar top aligns with text top
                               // (LibreOffice cap-height padding ≈ 4 px = 0.027" at 150 dpi)

// Column width in points for word-wrap simulation. The raw box-width math gives 160.9pt,
// but LibreOffice's actual font metrics let text fit slightly tighter than IBM Plex Sans
// nominal widths (or it falls back to a narrower substitute). Adding ~2.5% headroom
// (165pt) brings my line-count estimate in line with what LibreOffice actually wraps to.
const COLUMN_PT = 165;  // pt

// Per-character advance widths for IBM Plex Sans 7.5pt (approximate).
// Derived from measured glyph widths: proportional font needs per-char estimates,
// not a single CPL, to avoid over/under counting on texts with many wide or narrow chars.
function charPts(c) {
  if (c === ' ')                         return 2.1;
  if ('iIl|!1j'.includes(c))            return 2.3;
  if ('frt'.includes(c))                return 3.0;
  if ('acesuvxyz'.includes(c))          return 3.9;
  if ('bdghknopq'.includes(c))          return 4.2;
  if ('mw'.includes(c))                 return 5.8;
  if (c >= 'A' && c <= 'Z') {
    if ('IFJL'.includes(c))             return 3.8;
    if ('MW'.includes(c))               return 6.2;
    return 5.0;                         // most caps
  }
  if (c >= '0' && c <= '9')             return 4.3;
  // punctuation and symbols
  return 3.2;
}

// Explicit gap between bar right-edge and text — overrides any renderer default.
// Set margin:0 on all addText calls so LibreOffice uses exactly this gap.
const BAR_GAP = 0.08;  // 0.08" gap (≈12 px at 150 dpi), same for left and right

// Arrow transparency (0–100, 50 = 50% opacity)
const ARROW_TRANS = 50;

// Max annotations per side before overflow to above/below
const MAX_SIDE = 3;

// ── Colors ──────────────────────────────────────────────────────────────────
const C = {
  bg:       'F7F8FD',
  footer:   'A0AEC0',
  border:   'D9DFE8',
  arrow:    'A0AEC0',
  major:    'D97706',
  minor:    '2563EB',
  polish:   '8896A7',
  bodyText: '1E2A4A',
};

const SEV = {
  major:  { color: C.major,  label: 'MAJOR'  },
  minor:  { color: C.minor,  label: 'MINOR'  },
  polish: { color: C.polish, label: 'POLISH' },
};

// ── Annotation data ─────────────────────────────────────────────────────────
// nx, ny: normalised position on the mini slide (0=left/top → 1=right/bottom)
// Side auto-assigned: nx < 0.5 → left, nx >= 0.5 → right.
// Boxes are sorted by ny before layout so arrows never cross.
const { SAMPLES } = require('./samples');

// ── Text-height estimator ───────────────────────────────────────────────────
// Simulates greedy word-wrap to count rendered lines. More accurate than
// ceil(len/CPL) for proportional fonts where word breaks shift chars to the
// next line, causing the naïve formula to undercount lines (bar too short).
function wordWrapLineCount(text) {
  const words = text.split(/\s+/).filter(w => w.length > 0);
  let lines = 1, linePts = 0;
  const spaceW = charPts(' ');
  for (const word of words) {
    const wordPts = [...word].reduce((s, c) => s + charPts(c), 0);
    if (linePts === 0) {
      linePts = wordPts;
    } else if (linePts + spaceW + wordPts <= COLUMN_PT) {
      linePts += spaceW + wordPts;
    } else {
      lines++;
      linePts = wordPts;
    }
  }
  return lines;
}

// Returns estimated total box height for a given annotation text.
function estimateBoxH(text) {
  const lines = wordWrapLineCount(text);
  const textH = lines * LINE_H;
  return SEV_H + SEV_GAP + textH + TEXT_PAD_B;
}

// ── Drawing helpers ─────────────────────────────────────────────────────────

function seg(s, pres, x1, y1, x2, y2, color, width, trans) {
  const bx = Math.min(x1, x2);
  const by = Math.min(y1, y2);
  const bw = Math.max(Math.abs(x2 - x1), 0.002);
  const bh = Math.max(Math.abs(y2 - y1), 0.002);
  const flipV = ((x2 >= x1) && (y2 <= y1)) || ((x2 <= x1) && (y2 >= y1));
  s.addShape(pres.shapes.LINE, {
    x: bx, y: by, w: bw, h: bh, flipV,
    line: { color, width: width || 1.1, transparency: trans !== undefined ? trans : 0 },
  });
}

function circleDot(s, pres, cx, cy, r, color, trans) {
  s.addShape(pres.shapes.OVAL, {
    x: cx - r, y: cy - r, w: r * 2, h: r * 2,
    fill: { color, transparency: trans !== undefined ? trans : 0 },
    line: { color: C.arrow, transparency: 100 },  // 0% alpha → fully transparent border
  });
}

// Bar + horizontal arm + diagonal arm — ALL merged into a SINGLE custom-geometry
// filled polygon. No overlap, no gap, no separate strokes. The polygon outline
// traces around the entire bar→arm→diagonal silhouette as one closed CW path,
// using miter joins at the elbow (with bevel fallback when the diagonal is
// nearly horizontal). The endpoint circle dot is a separate shape; the arm
// length is shortened by DOT_R so the polygon ends exactly at the dot's edge.
function drawBarArrowMerged(s, pres, barGeom, dotX, dotY) {
  const { barX, barY, barH, isLeft } = barGeom;
  const LT     = 0.018;
  const DOT_R  = 0.034;
  const T      = ARROW_TRANS;
  const COL    = C.arrow;
  const halfLT = LT / 2;

  const anchorY = barY + barH / 2;
  const elbowX  = isLeft ? MINI_X - 0.04 : MINI_X + MINI_W + 0.04;

  // Diagonal direction (elbow → dot); shorten by DOT_R so polygon ends at dot edge.
  const dx     = dotX - elbowX;
  const dy     = dotY - anchorY;
  const len    = Math.sqrt(dx * dx + dy * dy);
  const ux     = dx / len;
  const uy     = dy / len;
  const armLen = Math.max(len - DOT_R, 0.04);
  const tipX   = elbowX + ux * armLen;
  const tipY   = anchorY + uy * armLen;

  // Perpendicular pointing "above" the diagonal (negative y component in screen coords).
  // For LEFT (ux>0): topPerp = (uy, -ux).  For RIGHT (ux<0): topPerp = (-uy, ux).
  const sgn      = ux >= 0 ? 1 : -1;
  const topPerpX = sgn * uy;
  const topPerpY = -sgn * ux;
  const topPx    = topPerpX * halfLT;
  const topPy    = topPerpY * halfLT;

  // Miter intersections at the elbow: top edges meet at y=anchorY-halfLT,
  // bottom edges at y=anchorY+halfLT. Bevel fallback when |uy| is too small
  // (avoids divide-by-near-zero blowup when diagonal is nearly horizontal).
  let miterTopX, miterBotX;
  if (Math.abs(uy) > 0.1) {
    miterTopX = elbowX + topPx + ux * (-halfLT - topPy) / uy;
    miterBotX = elbowX - topPx + ux * ( halfLT + topPy) / uy;
  } else {
    miterTopX = elbowX;
    miterBotX = elbowX;
  }

  // Polygon (CW in screen coords; interior on the right of travel direction).
  // LEFT: bar TL → bar TR → top-arm-at-bar → top-miter → top-of-diag-at-tip
  //       → bot-of-diag-at-tip → bot-miter → bot-arm-at-bar → bar BR → bar BL.
  // RIGHT is mirrored: walks AROUND the bar first, exits LEFT into arm+diagonal.
  let pts;
  if (isLeft) {
    pts = [
      { x: barX,          y: barY,             moveTo: true },
      { x: barX + BAR_W,  y: barY                          },
      { x: barX + BAR_W,  y: anchorY - halfLT              },
      { x: miterTopX,     y: anchorY - halfLT              },
      { x: tipX + topPx,  y: tipY + topPy                  },
      { x: tipX - topPx,  y: tipY - topPy                  },
      { x: miterBotX,     y: anchorY + halfLT              },
      { x: barX + BAR_W,  y: anchorY + halfLT              },
      { x: barX + BAR_W,  y: barY + barH                   },
      { x: barX,          y: barY + barH                   },
      { close: true                                        },
    ];
  } else {
    pts = [
      { x: barX,          y: barY,             moveTo: true },
      { x: barX + BAR_W,  y: barY                          },
      { x: barX + BAR_W,  y: barY + barH                   },
      { x: barX,          y: barY + barH                   },
      { x: barX,          y: anchorY + halfLT              },
      { x: miterBotX,     y: anchorY + halfLT              },
      { x: tipX - topPx,  y: tipY - topPy                  },
      { x: tipX + topPx,  y: tipY + topPy                  },
      { x: miterTopX,     y: anchorY - halfLT              },
      { x: barX,          y: anchorY - halfLT              },
      { close: true                                        },
    ];
  }

  // Translate absolute coords to shape-local (path coords are relative to bbox).
  const xs   = pts.filter(p => 'x' in p).map(p => p.x);
  const ys   = pts.filter(p => 'y' in p).map(p => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  const relPts = pts.map(p => {
    if (p.close) return { close: true };
    const o = { x: p.x - minX, y: p.y - minY };
    if (p.moveTo) o.moveTo = true;
    return o;
  });

  s.addShape(pres.shapes.CUSTOM_GEOMETRY, {
    x: minX, y: minY, w: maxX - minX, h: maxY - minY,
    points: relPts,
    fill: { color: COL, transparency: T },
    line: { color: COL, transparency: 100 },  // 0% alpha → no border
  });

  // Endpoint dot — separate shape, no overlap (arm already shortened by DOT_R).
  circleDot(s, pres, dotX, dotY, DOT_R, COL, T);
}

// Vertical+diagonal arrow for above/below boxes
function arrowTB(s, pres, anchorX, anchorY, dotX, dotY, miniY, isAbove) {
  const COL    = C.arrow;
  const T      = ARROW_TRANS;
  const DOT_R  = 0.034;   // 50% smaller than original 0.068"
  const elbowY = isAbove ? miniY - 0.04 : miniY + MINI_H + 0.04;

  seg(s, pres, anchorX, anchorY, anchorX, elbowY, COL, 1.0, T);

  const dx = dotX - anchorX, dy = dotY - elbowY;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len > DOT_R + 0.04) {
    const f = (len - DOT_R) / len;
    seg(s, pres, anchorX, elbowY, anchorX + dx * f, elbowY + dy * f, COL, 1.0, T);
  }
  circleDot(s, pres, dotX, dotY, DOT_R, COL, T);
}

// ── Annotation box ──────────────────────────────────────────────────────────
// Draws ONLY the text content (severity label + body text). The bar is drawn
// as part of the merged bar+arrow shape (drawBarArrowMerged), so bar and arrow
// share a single custom-geometry shape with no joining/overlap/gap.
// Returns bar geometry: { barX, barY, barH, isLeft }.
function annotBox(s, ann, boxX, boxY, isLeft, boxH) {
  const { sev, text } = ann;
  const si = SEV[sev];

  const textAreaY = boxY + SEV_H + SEV_GAP;
  const textAreaH = boxH - SEV_H - SEV_GAP - TEXT_PAD_B;

  let barX, txtX, txtW;
  if (isLeft) {
    barX = boxX + BOX_W - BAR_W;
    txtX = boxX;
    txtW = BOX_W - BAR_W - BAR_GAP;
  } else {
    barX = boxX;
    txtX = boxX + BAR_W + BAR_GAP;
    txtW = BOX_W - BAR_W - BAR_GAP;
  }

  // Bar geometry — bar is drawn later as part of the merged shape.
  const barY = textAreaY + BAR_TOP_OFFSET;
  const barH = textAreaH * (LINE_H_BAR / LINE_H);

  // Severity label
  s.addText(si.label, {
    x: txtX, y: boxY + 0.02, w: txtW, h: SEV_H,
    fontFace: 'IBM Plex Sans', fontSize: 6.5, bold: true, color: si.color,
    valign: 'middle', align: isLeft ? 'right' : 'left', margin: 0,
  });

  // Body text
  s.addText(text, {
    x: txtX, y: textAreaY, w: txtW, h: textAreaH,
    fontFace: 'IBM Plex Sans', fontSize: 7.5, color: C.bodyText,
    valign: 'top', align: isLeft ? 'right' : 'left', wrap: true, margin: 0,
  });

  return { barX, barY, barH, isLeft };
}

// Above/below box
function annotBoxTB(s, ann, boxX, boxY, boxW, isAbove, boxH) {
  const { sev, text } = ann;
  const si = SEV[sev];

  const textAreaY = boxY + (isAbove ? SEV_H + SEV_GAP : BAR_W + SEV_H + SEV_GAP);
  const textAreaH = boxH - SEV_H - SEV_GAP - TEXT_PAD_B;

  const barY = isAbove ? boxY + boxH - BAR_W : boxY;
  s.addShape('rect', {
    x: boxX, y: barY, w: boxW, h: BAR_W,
    fill: { color: C.arrow, transparency: 50 },
    line: { color: C.arrow, transparency: 100 },  // 0% alpha → no border
  });

  s.addText(si.label, {
    x: boxX + 0.04, y: boxY + (isAbove ? 0.02 : BAR_W + 0.02), w: boxW - 0.08, h: SEV_H,
    fontFace: 'IBM Plex Sans', fontSize: 6.5, bold: true, color: si.color,
    valign: 'middle', align: 'left',
  });
  s.addText(text, {
    x: boxX + 0.04, y: textAreaY, w: boxW - 0.08, h: textAreaH,
    fontFace: 'IBM Plex Sans', fontSize: 7.5, color: C.bodyText,
    valign: 'top', align: 'left', wrap: true,
  });

  return {
    x: boxX + boxW / 2,
    y: isAbove ? boxY + boxH + 0.02 : boxY - 0.02,
  };
}

// ── Build one annotation slide ──────────────────────────────────────────────
function buildSlide(pres, sample) {
  const s = pres.addSlide();
  s.background = { color: C.bg };

  // Assign by nx; sort each side by ny to prevent arrow crossings
  const left = [], right = [];
  for (const ann of sample.annotations) {
    (ann.nx < 0.5 ? left : right).push(ann);
  }

  // Overflow to above/below if either column exceeds MAX_SIDE
  const above = [], below = [];
  function overflow(arr) {
    while (arr.length > MAX_SIDE) {
      arr.sort((a, b) => Math.abs(a.nx - 0.5) - Math.abs(b.nx - 0.5));
      const ann = arr.shift();
      (ann.ny < 0.5 ? above : below).push(ann);
    }
  }
  overflow(left);
  overflow(right);

  // Sort each column top→bottom by ny so box order matches dot order
  left.sort((a, b) => a.ny - b.ny);
  right.sort((a, b) => a.ny - b.ny);

  // Compute per-annotation box heights
  const leftH  = left.map(a => estimateBoxH(a.text));
  const rightH = right.map(a => estimateBoxH(a.text));

  // Compute MINI_Y with optional above/below zones
  const ABOVE_ZONE = above.length ? estimateBoxH(above[0].text) + 0.18 : 0;
  const BELOW_ZONE = below.length ? estimateBoxH(below[0].text) + 0.18 : 0;
  const totalH = ABOVE_ZONE + MINI_H + BELOW_ZONE;
  const startY = Math.max(0.30, (FOOTER_Y - totalH) / 2);
  const miniY  = startY + ABOVE_ZONE;
  const aboveY = startY;
  const belowY = miniY + MINI_H + 0.18;

  // Mini slide — faint gray border only
  s.addShape('rect', {
    x: MINI_X - 0.012, y: miniY - 0.012,
    w: MINI_W + 0.024, h: MINI_H + 0.024,
    fill: { color: C.border }, line: { color: C.border, width: 0 },
  });
  const imgPath = path.join(__dirname, `v8s-${String(sample.slideNum).padStart(2, '0')}.jpg`);
  s.addImage({ path: imgPath, x: MINI_X, y: miniY, w: MINI_W, h: MINI_H });

  // Left/right columns — boxes stacked top→bottom (already sorted by ny)
  function layoutLR(anns, heights, isLeft) {
    if (!anns.length) return;
    const total    = heights.reduce((s, h) => s + h, 0) + (anns.length - 1) * BOX_GAP;
    const startBoxY = miniY + (MINI_H - total) / 2;
    const boxX     = isLeft ? BOX_X_L : BOX_X_R;
    let curY = startBoxY;
    anns.forEach((ann, i) => {
      const bh = heights[i];
      const barGeom = annotBox(s, ann, boxX, curY, isLeft, bh);
      const dotX = MINI_X + ann.nx * MINI_W;
      const dotY = miniY  + ann.ny * MINI_H;
      drawBarArrowMerged(s, pres, barGeom, dotX, dotY);
      curY += bh + BOX_GAP;
    });
  }

  layoutLR(left,  leftH,  true);
  layoutLR(right, rightH, false);

  // Above/below rows
  function layoutTB(anns, isAbove) {
    if (!anns.length) return;
    const boxW  = MINI_W / anns.length - 0.10;
    const baseY = isAbove ? aboveY : belowY;
    anns.forEach((ann, i) => {
      const bh   = estimateBoxH(ann.text);
      const boxX = MINI_X + i * (MINI_W / anns.length) + 0.05;
      const { x: ax, y: ay } = annotBoxTB(s, ann, boxX, baseY, boxW, isAbove, bh);
      const dotX = MINI_X + ann.nx * MINI_W;
      const dotY = miniY  + ann.ny * MINI_H;
      arrowTB(s, pres, ax, ay, dotX, dotY, miniY, isAbove);
    });
  }

  layoutTB(above, true);
  layoutTB(below, false);

  // Footer
  s.addText(`Agentic Disruption  ·  Slide ${sample.slideNum} / 43`, {
    x: 0, y: FOOTER_Y, w: SW, h: SH - FOOTER_Y,
    fontFace: 'IBM Plex Sans', fontSize: 7, color: C.footer,
    align: 'center', valign: 'middle',
  });
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  const pres = new PptxGenJS();
  pres.layout = 'LAYOUT_WIDE';

  for (const sample of SAMPLES) {
    buildSlide(pres, sample);
  }

  const out = path.join(__dirname, 'Annotations_Sample.pptx');
  await pres.writeFile({ fileName: out });
  console.log(`✓ Written: ${out}`);
}

main().catch(err => { console.error(err); process.exit(1); });
