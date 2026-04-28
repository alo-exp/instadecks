# Recipe — Stat Callout

**Slide type:** stat-callout
**16:9:** 10″ × 5.625″
**Footer:** page number + source line via `addFooter()`
**Notes:** speaker notes via `slide.addNotes()`

## Code

```javascript
function renderStatCallout(slide, { title, statValue, statLabel, supporting, source, pageNum, total }) {
  slide.background = { color: PALETTE.accent };
  slide.addText(title, {
    x: MARGIN_X, y: TITLE_Y, w: W - 1.0, h: TITLE_H,
    fontFace: TYPE.heading, fontSize: 22, bold: true, color: PALETTE.ink, margin: 0,
  });
  // Big number — 60–72pt per design-ideas.md guidance
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
```

## DO / DON'T

| ✅ DO | ❌ DON'T |
|---|---|
| Hero number 60–72pt | Hero number ≤ 36pt (loses callout impact) |
| Action title naming the implication | Topic title: `'Q3 Revenue'` |
| Supporting prose to the right of the number | Wrap the number in supporting text (visual clash) |

## When to use

A hero statistic that anchors a beat — one number the audience should remember. Pair with one sentence of supporting context.
