# Recipe — Section

**Slide type:** section
**16:9:** 10″ × 5.625″
**Footer:** page number + source line via `addFooter()`
**Notes:** speaker notes via `slide.addNotes()`

## Code

```javascript
function renderSection(slide, { sectionNum, sectionTitle, pageNum, total }) {
  slide.background = { color: PALETTE.primary };
  slide.addText(String(sectionNum).padStart(2, '0'), {
    x: MARGIN_X, y: 1.8, w: 2, h: 1.0,
    fontFace: TYPE.heading, fontSize: 60, bold: true, color: PALETTE.secondary, margin: 0,
  });
  slide.addText(sectionTitle, {
    x: MARGIN_X + 1.8, y: 2.1, w: W - 2.5, h: 1.4,
    fontFace: TYPE.heading, fontSize: 28, color: PALETTE.accent, margin: 0,
  });
  // Decorative thin line at section-number rail — NOT under the title (R18 anti-tell).
  slide.addShape(pres.shapes.LINE, {
    x: MARGIN_X, y: 3.7, w: 1.5, h: 0,
    line: { color: PALETTE.secondary, width: 2 },
  });
  addFooter(slide, { pageNum, total });
  slide.addNotes(`Section ${sectionNum}: ${sectionTitle}.`);
}
```

## DO / DON'T

| ✅ DO | ❌ DON'T |
|---|---|
| `slide.addShape(pres.shapes.LINE, …)` | `slide.addShape('line', …)` |
| Place the rail line under the section number | Place a divider directly under the slide title (R18 AI-tell) |
| Zero-pad: `String(n).padStart(2, '0')` | Manual `'01'` literal (breaks for 10+) |

## When to use

Major narrative breaks between `DeckBrief.narrative_arc` beats — typically one section divider per 3–5 content slides.
