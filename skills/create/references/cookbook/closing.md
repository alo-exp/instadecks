# Recipe — Closing

**Slide type:** closing
**16:9:** 10″ × 5.625″
**Footer:** none on closing (variant of title convention); page numbering optional
**Notes:** speaker notes via `slide.addNotes()`

## Code

```javascript
function renderClosing(slide, { headline, callToAction, contact, pageNum, total }) {
  slide.background = { color: PALETTE.primary };
  slide.addText(headline, {
    x: MARGIN_X, y: 1.6, w: W - 1.0, h: 1.4,
    fontFace: TYPE.heading, fontSize: 36, bold: true, color: PALETTE.accent, margin: 0,
  });
  if (callToAction) {
    slide.addShape(pres.shapes.RIGHT_ARROW, {
      x: MARGIN_X, y: 3.4, w: 0.5, h: 0.4,
      fill: { color: PALETTE.secondary }, line: { color: PALETTE.secondary, width: 0 },
    });
    slide.addText(callToAction, {
      x: MARGIN_X + 0.7, y: 3.35, w: W - 2.0, h: 0.5,
      fontFace: TYPE.body, fontSize: 18, color: PALETTE.secondary, margin: 0,
    });
  }
  if (contact) slide.addText(contact, {
    x: MARGIN_X, y: H - 1.0, w: W - 1.0, h: 0.4,
    fontFace: TYPE.body, fontSize: 12, color: PALETTE.secondary, margin: 0,
  });
  // 'Thank You' headline allowed via D-06 override: { action_title_override: true }.
  slide.addNotes(`Closing — ${callToAction || 'wrap'}.`);
}
```

## DO / DON'T

| ✅ DO | ❌ DON'T |
|---|---|
| `slide.addShape(pres.shapes.RIGHT_ARROW, …)` | `slide.addShape('rightArrow', …)` | <!-- enum-lint-allow: anti-pattern doc -->
| Concrete CTA: `'Approve EU expansion budget by 2026-11-15'` | Vague CTA: `'Thank You / Q&A'` (use override flag if needed) |
| Closing variant of title — same primary-bg motif | Match a content-slide background (kills the wrap signal) |

## When to use

The final beat — call-to-action, ask, or wrap. The headline carries the close (`'We're ready to ship in Q1'`); the CTA is the concrete action.
