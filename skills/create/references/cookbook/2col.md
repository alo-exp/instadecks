# Recipe — 2-Column

**Slide type:** 2col
**16:9:** 10″ × 5.625″
**Footer:** page number + source line via `addFooter()`
**Notes:** speaker notes via `slide.addNotes()`

## Code

```javascript
function render2Col(slide, { title, leftHeader, leftBody, rightHeader, rightBody, source, pageNum, total }) {
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

## DO / DON'T

| ✅ DO | ❌ DON'T |
|---|---|
| Action title: `'Onboarding cuts to 3 days when reps own discovery'` | Topic title: `'Onboarding'` |
| `bullet: true` | Unicode bullet `'• '` prefix in text |
| `paraSpaceAfter: 6` for bullet rhythm | `lineSpacing: 1.4` mixed with bullets |

## When to use

Side-by-side bullets — paired arguments, before/after, two threads of the same beat. Avoid more than 5 bullets per column.
