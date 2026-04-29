# Recipe — 2-Column

**Slide type:** 2col
**16:9:** 10″ × 5.625″
**Footer:** page number + source line via `addFooter()`
**Notes:** speaker notes via `slide.addNotes()`

> 3 variants — all share `(slide, { title, leftHeader, leftBody, rightHeader, rightBody, source, pageNum, total })`.

## Variant A: 2col-A-equal-bullets

**Variant ID:** 2col-A-equal-bullets
**Visual:** Two equal columns with header + bullet body each, accent background. Default v8 register.

```javascript
function render2ColA(slide, { title, leftHeader, leftBody, rightHeader, rightBody, source, pageNum, total }) {
  slide.background = { color: PALETTE.accent };
  slide.addText(title, {
    x: MARGIN_X, y: TITLE_Y, w: W - 1.0, h: TITLE_H,
    fontFace: TYPE.heading, fontSize: 24, bold: true, color: PALETTE.ink, margin: 0,
  });
  const COL_W = (W - MARGIN_X * 2 - 0.4) / 2;
  // Left column
  slide.addText(leftHeader, {
    x: MARGIN_X, y: 1.3, w: COL_W, h: 0.5,
    fontFace: TYPE.heading, fontSize: 16, bold: true, color: PALETTE.primary, margin: 0,
  });
  slide.addText(leftBody.map((s, i) => ({
    text: s, options: { bullet: true, breakLine: i < leftBody.length - 1 },
  })), {
    x: MARGIN_X, y: 1.9, w: COL_W, h: H - 2.6,
    fontFace: TYPE.body, fontSize: 14, color: PALETTE.ink, paraSpaceAfter: 6, margin: 0,
  });
  // Right column
  const RIGHT_X = MARGIN_X + COL_W + 0.4;
  slide.addText(rightHeader, {
    x: RIGHT_X, y: 1.3, w: COL_W, h: 0.5,
    fontFace: TYPE.heading, fontSize: 16, bold: true, color: PALETTE.primary, margin: 0,
  });
  slide.addText(rightBody.map((s, i) => ({
    text: s, options: { bullet: true, breakLine: i < rightBody.length - 1 },
  })), {
    x: RIGHT_X, y: 1.9, w: COL_W, h: H - 2.6,
    fontFace: TYPE.body, fontSize: 14, color: PALETTE.ink, paraSpaceAfter: 6, margin: 0,
  });
  addFooter(slide, { pageNum, total, source });
  slide.addNotes(`Two-column comparison.`);
}
```

**When to use:** Symmetric paired arguments where neither side dominates.
**When NOT to use:** When one side is the recommendation (use B for asymmetric weighting).

## Variant B: 2col-B-asymmetric-7030

**Variant ID:** 2col-B-asymmetric-7030
**Visual:** Wide left column (70%) carries the dominant argument; narrow right column (30%) acts as supporting sidebar. Editorial weighting.

```javascript
function render2ColB(slide, { title, leftHeader, leftBody, rightHeader, rightBody, source, pageNum, total }) {
  slide.background = { color: PALETTE.accent };
  slide.addText(title, {
    x: MARGIN_X, y: TITLE_Y, w: W - 1.0, h: TITLE_H,
    fontFace: TYPE.heading, fontSize: 24, bold: true, color: PALETTE.ink, margin: 0,
  });

  const TOTAL_W = W - MARGIN_X * 2 - 0.4;
  const LEFT_W = TOTAL_W * 0.70;
  const RIGHT_W = TOTAL_W * 0.30;
  const RIGHT_X = MARGIN_X + LEFT_W + 0.4;

  // Dominant left column.
  slide.addText(leftHeader, {
    x: MARGIN_X, y: 1.3, w: LEFT_W, h: 0.5,
    fontFace: TYPE.heading, fontSize: 18, bold: true, color: PALETTE.primary, margin: 0,
  });
  slide.addText(leftBody.map((s, i) => ({
    text: s, options: { bullet: true, breakLine: i < leftBody.length - 1 },
  })), {
    x: MARGIN_X, y: 1.9, w: LEFT_W, h: H - 2.6,
    fontFace: TYPE.body, fontSize: 14, color: PALETTE.ink, paraSpaceAfter: 6, margin: 0,
  });

  // Sidebar — narrow, with a thin left rule (editorial-rule motif).
  slide.addShape(pres.shapes.LINE, {
    x: RIGHT_X - 0.15, y: 1.3, w: 0, h: H - 2.0,
    line: { color: PALETTE.secondary, width: 1 },
  });
  slide.addText(rightHeader, {
    x: RIGHT_X, y: 1.3, w: RIGHT_W, h: 0.5,
    fontFace: TYPE.heading, fontSize: 13, bold: true, color: PALETTE.muted, margin: 0,
  });
  slide.addText(rightBody.map((s, i) => ({
    text: s, options: { bullet: false, breakLine: i < rightBody.length - 1 },
  })), {
    x: RIGHT_X, y: 1.9, w: RIGHT_W, h: H - 2.6,
    fontFace: TYPE.body, fontSize: 12, color: PALETTE.muted, paraSpaceAfter: 6, margin: 0,
  });

  addFooter(slide, { pageNum, total, source });
  slide.addNotes(`Two-column (asymmetric 70/30) — left dominates.`);
}
```

**When to use:** When the left column is the argument and the right column is supporting context (caveats, sources, side notes).
**When NOT to use:** When both sides need equal billing — use Variant A.

## Variant C: 2col-C-stacked-with-rule

**Variant ID:** 2col-C-stacked-with-rule
**Visual:** Two side-by-side columns with a thick top rule across both, magazine layout. Header rows aligned, body bullets below the rule.

```javascript
function render2ColC(slide, { title, leftHeader, leftBody, rightHeader, rightBody, source, pageNum, total }) {
  slide.background = { color: PALETTE.accent };
  slide.addText(title, {
    x: MARGIN_X, y: TITLE_Y, w: W - 1.0, h: TITLE_H,
    fontFace: TYPE.heading, fontSize: 24, bold: true, color: PALETTE.ink, margin: 0,
  });

  // Thick top rule under title — editorial-rule motif.
  slide.addShape(pres.shapes.RECTANGLE, {
    x: MARGIN_X, y: 1.25, w: W - 1.0, h: 0.06,
    fill: { color: PALETTE.primary }, line: { color: PALETTE.primary, width: 0 },
  });

  const COL_W = (W - MARGIN_X * 2 - 0.4) / 2;
  const RIGHT_X = MARGIN_X + COL_W + 0.4;

  // Headers on a shared row directly under the rule.
  slide.addText(leftHeader, {
    x: MARGIN_X, y: 1.45, w: COL_W, h: 0.5,
    fontFace: TYPE.heading, fontSize: 14, bold: true, color: PALETTE.primary,
    align: 'left', margin: 0,
  });
  slide.addText(rightHeader, {
    x: RIGHT_X, y: 1.45, w: COL_W, h: 0.5,
    fontFace: TYPE.heading, fontSize: 14, bold: true, color: PALETTE.primary,
    align: 'left', margin: 0,
  });

  // Vertical thin divider between columns.
  slide.addShape(pres.shapes.LINE, {
    x: MARGIN_X + COL_W + 0.2, y: 1.5, w: 0, h: H - 2.5,
    line: { color: PALETTE.muted, width: 0.5 },
  });

  slide.addText(leftBody.map((s, i) => ({
    text: s, options: { bullet: true, breakLine: i < leftBody.length - 1 },
  })), {
    x: MARGIN_X, y: 2.1, w: COL_W, h: H - 2.8,
    fontFace: TYPE.body, fontSize: 13, color: PALETTE.ink, paraSpaceAfter: 6, margin: 0,
  });
  slide.addText(rightBody.map((s, i) => ({
    text: s, options: { bullet: true, breakLine: i < rightBody.length - 1 },
  })), {
    x: RIGHT_X, y: 2.1, w: COL_W, h: H - 2.8,
    fontFace: TYPE.body, fontSize: 13, color: PALETTE.ink, paraSpaceAfter: 6, margin: 0,
  });

  addFooter(slide, { pageNum, total, source });
  slide.addNotes(`Two-column (stacked-with-rule) — magazine layout.`);
}
```

**When to use:** Editorial / magazine register where the rule signals "comparison spread."
**When NOT to use:** Slide-heavy briefs where rules add visual noise across many slides.

## DO / DON'T

| ✅ DO | ❌ DON'T |
|---|---|
| Action title: `'Onboarding cuts to 3 days when reps own discovery'` | Topic title: `'Onboarding'` |
| `bullet: true` | Unicode bullet `'• '` prefix in text |
| `paraSpaceAfter: 6` for bullet rhythm | `lineSpacing: 1.4` mixed with bullets |

## When to use

Side-by-side bullets — paired arguments, before/after, two threads of the same beat. A for symmetric, B for asymmetric weighting, C for editorial register. Avoid more than 5 bullets per column.
