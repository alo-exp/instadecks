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

## Sizing rule of thumb (overflow guard)

The hero number is the single biggest source of overflow in this recipe. At
fontSize 60–110pt a 3-character stat will wrap to two lines if the box width is
too tight. Use this width-to-fontSize ratio:

| Hero stat                         | fontSize | Min box width `w` | Supporting-text x ≥ |
|-----------------------------------|----------|-------------------|---------------------|
| 1–2 char (e.g. `5×`, `42`)        | 72–90    | ≥ 2.0″            | ≥ 2.8″              |
| 3-char (e.g. `112%`)              | 72       | ≥ 4.0″            | ≥ 4.8″              |
| 3-char (e.g. `112%`)              | 110      | ≥ 4.5″            | ≥ 5.3″              |
| 4-char (e.g. `$8.7M`)             | 110      | ≥ 6.5″            | ≥ 7.3″              |
| 5+ char (e.g. `$2.4M+`)           | 90       | ≥ 6.5″            | ≥ 7.3″              |

Rule of thumb: at fontSize 110pt allow ≥ 1.5″ per glyph; at 72pt allow ≥ 1.0″
per glyph. The supporting-text x ≥ column is `MARGIN_X (0.5) + w + 0.3″ gap` —
use the paired value to avoid hero-vs-supporting overlap. When in doubt, set
`fit: 'shrink'` (or `autoFit: true`) on the stat text so pptxgenjs scales the
glyphs to fit instead of wrapping.

**Anti-pattern:** DON'T use the recipe's default `x: 5.3″` for the supporting
text when hero box `w > 4.5″`. The hero ends at `MARGIN_X + w` so a w=6.5″
hero ends at x=7.0″, overlapping the 5.3″ supporting region (which extends to
x=9.5″). Always pair w with the Supporting-text x ≥ value from the table.

```javascript
slide.addText(statValue, {
  x: MARGIN_X, y: 1.4, w: 4.5, h: 2.5,
  fontFace: TYPE.heading, fontSize: 110, bold: true, color: PALETTE.primary,
  align: 'left', valign: 'top', margin: 0,
  fit: 'shrink',          // shrink-to-fit overflow guard
  autoFit: true,          // belt + suspenders for older pptxgenjs callsites
});
```

## When to use

A hero statistic that anchors a beat — one number the audience should remember. Pair with one sentence of supporting context.
