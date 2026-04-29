# Recipe — Comparison

**Slide type:** comparison
**16:9:** 10″ × 5.625″
**Footer:** page number + source line via `addFooter()`
**Notes:** speaker notes via `slide.addNotes()`

> 3 variants — all share `(slide, { title, optionA, optionB, optionC?, source, pageNum, total })` where each option is `{ label, color?, bullets[] }`.

## Variant A: comparison-A-cards

**Variant ID:** comparison-A-cards
**Visual:** Two equal-width cards on light fill, each with thin top accent bar in option color, label, and bullets. Default v8 register.

```javascript
function renderComparisonA(slide, { title, optionA, optionB, source, pageNum, total }) {
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
      x: cx, y: 1.3, w: CARD_W, h: 0.08, fill: { color: opt.color || PALETTE.primary },
    });
    slide.addText(opt.label, {
      x: cx + 0.2, y: 1.5, w: CARD_W - 0.4, h: 0.5,
      fontFace: TYPE.heading, fontSize: 18, bold: true, color: PALETTE.ink, margin: 0,
    });
    slide.addText(opt.bullets.map((s, j) => ({
      text: s, options: { bullet: true, breakLine: j < opt.bullets.length - 1 },
    })), {
      x: cx + 0.2, y: 2.1, w: CARD_W - 0.4, h: H - 2.9,
      fontFace: TYPE.body, fontSize: 13, color: PALETTE.ink, paraSpaceAfter: 6, margin: 0,
    });
  }
  addFooter(slide, { pageNum, total, source });
  slide.addNotes(`Side-by-side: ${optionA.label} vs ${optionB.label}.`);
}
```

**When to use:** Two-option decisions (buy/build, vendor A vs B) where cards visually contain each thread.
**When NOT to use:** Three-way comparisons (use Variant C) or when emphasizing one option (use B).

## Variant B: comparison-B-versus-split

**Variant ID:** comparison-B-versus-split
**Visual:** Diagonal-split background (left primary, right secondary) with a centered "VS" pill; option labels and bullets on each half. High contrast, editorial.

```javascript
function renderComparisonB(slide, { title, optionA, optionB, source, pageNum, total }) {
  slide.background = { color: PALETTE.accent };
  slide.addText(title, {
    x: MARGIN_X, y: TITLE_Y, w: W - 1.0, h: TITLE_H,
    fontFace: TYPE.heading, fontSize: 22, bold: true, color: PALETTE.ink, margin: 0,
  });

  const HALF_W = (W - MARGIN_X * 2) / 2;

  // Left half block.
  slide.addShape(pres.shapes.RECTANGLE, {
    x: MARGIN_X, y: 1.3, w: HALF_W, h: H - 2.0,
    fill: { color: optionA.color || PALETTE.primary },
    line: { color: optionA.color || PALETTE.primary, width: 0 },
  });
  // Right half block.
  slide.addShape(pres.shapes.RECTANGLE, {
    x: MARGIN_X + HALF_W, y: 1.3, w: HALF_W, h: H - 2.0,
    fill: { color: optionB.color || PALETTE.secondary },
    line: { color: optionB.color || PALETTE.secondary, width: 0 },
  });

  // Centered VS pill (oval).
  slide.addShape(pres.shapes.OVAL, {
    x: W / 2 - 0.45, y: (H / 2) - 0.4, w: 0.9, h: 0.6,
    fill: { color: PALETTE.accent }, line: { color: PALETTE.ink, width: 1 },
  });
  slide.addText('VS', {
    x: W / 2 - 0.45, y: (H / 2) - 0.4, w: 0.9, h: 0.6,
    fontFace: TYPE.heading, fontSize: 16, bold: true,
    color: PALETTE.ink, align: 'center', valign: 'middle', margin: 0,
  });

  // Left label + bullets.
  slide.addText(optionA.label, {
    x: MARGIN_X + 0.3, y: 1.5, w: HALF_W - 0.9, h: 0.5,
    fontFace: TYPE.heading, fontSize: 16, bold: true, color: PALETTE.accent, margin: 0,
  });
  slide.addText(optionA.bullets.map((s, j) => ({
    text: s, options: { bullet: true, breakLine: j < optionA.bullets.length - 1 },
  })), {
    x: MARGIN_X + 0.3, y: 2.1, w: HALF_W - 0.9, h: H - 2.9,
    fontFace: TYPE.body, fontSize: 12, color: PALETTE.accent, paraSpaceAfter: 6, margin: 0,
  });
  // Right label + bullets.
  slide.addText(optionB.label, {
    x: MARGIN_X + HALF_W + 0.6, y: 1.5, w: HALF_W - 0.9, h: 0.5,
    fontFace: TYPE.heading, fontSize: 16, bold: true, color: PALETTE.accent, margin: 0,
  });
  slide.addText(optionB.bullets.map((s, j) => ({
    text: s, options: { bullet: true, breakLine: j < optionB.bullets.length - 1 },
  })), {
    x: MARGIN_X + HALF_W + 0.6, y: 2.1, w: HALF_W - 0.9, h: H - 2.9,
    fontFace: TYPE.body, fontSize: 12, color: PALETTE.accent, paraSpaceAfter: 6, margin: 0,
  });

  addFooter(slide, { pageNum, total, source });
  slide.addNotes(`VS-split: ${optionA.label} vs ${optionB.label}.`);
}
```

**When to use:** Bold-modern decks where the comparison itself IS the dramatic point.
**When NOT to use:** Conservative briefs — versus framing reads as combative.

## Variant C: comparison-C-three-column

**Variant ID:** comparison-C-three-column
**Visual:** Three equal cards across the slide for three-way option comparison. Same card pattern as A but tighter typography to fit three.

```javascript
function renderComparisonC(slide, { title, optionA, optionB, optionC, source, pageNum, total }) {
  slide.background = { color: PALETTE.accent };
  slide.addText(title, {
    x: MARGIN_X, y: TITLE_Y, w: W - 1.0, h: TITLE_H,
    fontFace: TYPE.heading, fontSize: 22, bold: true, color: PALETTE.ink, margin: 0,
  });

  const opts = [optionA, optionB, optionC];
  const GAP = 0.3;
  const CARD_W = (W - MARGIN_X * 2 - GAP * 2) / 3;

  for (const [i, opt] of opts.entries()) {
    const cx = MARGIN_X + i * (CARD_W + GAP);
    slide.addShape(pres.shapes.RECTANGLE, {
      x: cx, y: 1.3, w: CARD_W, h: H - 2.0,
      fill: { color: 'F5F7FA' }, line: { color: 'E5E7EB', width: 1 },
    });
    slide.addShape(pres.shapes.RECTANGLE, {
      x: cx, y: 1.3, w: CARD_W, h: 0.08,
      fill: { color: opt.color || PALETTE.primary },
      line: { color: opt.color || PALETTE.primary, width: 0 },
    });
    slide.addText(opt.label, {
      x: cx + 0.15, y: 1.5, w: CARD_W - 0.3, h: 0.45,
      fontFace: TYPE.heading, fontSize: 14, bold: true, color: PALETTE.ink, margin: 0,
    });
    slide.addText(opt.bullets.map((s, j) => ({
      text: s, options: { bullet: true, breakLine: j < opt.bullets.length - 1 },
    })), {
      x: cx + 0.15, y: 2.0, w: CARD_W - 0.3, h: H - 2.8,
      fontFace: TYPE.body, fontSize: 11, color: PALETTE.ink, paraSpaceAfter: 4, margin: 0,
    });
  }

  addFooter(slide, { pageNum, total, source });
  slide.addNotes(`Three-way comparison: ${optionA.label} / ${optionB.label} / ${optionC.label}.`);
}
```

**When to use:** Three-way option decisions (small/medium/large, low/mid/high tier).
**When NOT to use:** Two-way comparisons — three columns dilute the contrast; use A or B.

## DO / DON'T

| ✅ DO | ❌ DON'T |
|---|---|
| `slide.addShape(pres.shapes.RECTANGLE, …)` | `slide.addShape('rect', …)` | <!-- enum-lint-allow: anti-pattern doc -->
| Fresh option object per `addShape` call | Reuse one options bag across both cards |
| Thin colored top bar overlay (height 0.08) | Full-card colored fill (loses neutrality) |

## When to use

Option-A vs Option-B (or three-way) cards — buy/build, two vendors, two strategies. The action title should name the recommendation, not the comparison.
