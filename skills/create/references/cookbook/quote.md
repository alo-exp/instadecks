# Recipe — Quote

**Slide type:** quote
**16:9:** 10″ × 5.625″
**Footer:** page number via `addFooter()`
**Notes:** speaker notes via `slide.addNotes()`

## Code

```javascript
function renderQuote(slide, { quote, attribution, role, pageNum, total }) {
  slide.background = { color: PALETTE.primary };
  // Decorative left brace using ENUM (not a string literal — CRT-15)
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
```

## DO / DON'T

| ✅ DO | ❌ DON'T |
|---|---|
| `slide.addShape(pres.shapes.LEFT_BRACE, …)` | `slide.addShape('leftBrace', …)` |
| Italicize the quote body | Bold the quote (reads like shouting) |
| Always include attribution + role | Anonymous quotes (loses authority) |

## When to use

An attributed quote anchoring a claim — customer voice, expert testimony, primary-source citation. One quote per deck max; more dilutes impact.
