# Recipe — Comparison

**Slide type:** comparison
**16:9:** 10″ × 5.625″
**Footer:** page number + source line via `addFooter()`
**Notes:** speaker notes via `slide.addNotes()`

## Code

```javascript
function renderComparison(slide, { title, optionA, optionB, source, pageNum, total }) {
  // optionA / optionB = { label, color, bullets[] }
  slide.background = { color: PALETTE.accent };
  slide.addText(title, {
    x: MARGIN_X, y: TITLE_Y, w: W - 1.0, h: TITLE_H,
    fontFace: TYPE.heading, fontSize: 24, bold: true, color: PALETTE.ink, margin: 0,
  });
  const CARD_W = (W - MARGIN_X * 2 - 0.5) / 2;
  for (const [i, opt] of [optionA, optionB].entries()) {
    const cx = MARGIN_X + i * (CARD_W + 0.5);
    // RECTANGLE not ROUNDED_RECTANGLE so the thin colored bar overlays cleanly.
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

## DO / DON'T

| ✅ DO | ❌ DON'T |
|---|---|
| `slide.addShape(pres.shapes.RECTANGLE, …)` | `slide.addShape('rect', …)` | <!-- enum-lint-allow: anti-pattern doc -->
| Fresh option object per `addShape` call | Reuse one options bag across both cards |
| Thin colored top bar overlay (height 0.08) | Full-card colored fill (loses neutrality) |

## When to use

Option-A vs Option-B cards — buy/build, two vendors, two strategies. The action title should name the recommendation, not the comparison.
