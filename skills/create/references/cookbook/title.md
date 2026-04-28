# Recipe — Title

**Slide type:** title
**16:9:** 10″ × 5.625″
**Footer:** none (convention — title slide skips the page-number footer)
**Notes:** speaker notes via `slide.addNotes()`

## Code

```javascript
function renderTitle(slide, { title, subtitle, attribution, pageNum, total }) {
  slide.background = { color: PALETTE.primary };

  slide.addText(title, {                    // ✅ action-title (claim, not topic)
    x: MARGIN_X, y: 1.6, w: W - 1.0, h: 1.6,
    fontFace: TYPE.heading, fontSize: 40, bold: true,
    color: PALETTE.accent, align: 'left', valign: 'top', margin: 0,
  });
  if (subtitle) slide.addText(subtitle, {
    x: MARGIN_X, y: 3.3, w: W - 1.0, h: 0.6,
    fontFace: TYPE.body, fontSize: 18, color: PALETTE.secondary, margin: 0,
  });
  if (attribution) slide.addText(attribution, {
    x: MARGIN_X, y: H - 0.9, w: W - 1.0, h: 0.3,
    fontFace: TYPE.body, fontSize: 11, color: PALETTE.secondary, margin: 0,
  });
  // No footer page-num on title slide (convention).
  slide.addNotes(`Title slide — establish topic + voice.`);
}
```

## DO / DON'T

| ✅ DO | ❌ DON'T |
|---|---|
| Action title: `'Q3 revenue grew 23% on enterprise expansion'` | Topic title: `'Q3 Revenue'` |
| `color: PALETTE.accent` (token) | `color: '#FFFFFF'` (string-with-`#`) |
| `slide.addNotes(...)` ends every recipe | Skip speaker notes — fails CRT-05 |

## When to use

The opening beat of `DeckBrief.narrative_arc` — establishes topic and voice in one claim. Always pair with a short subtitle that names audience or context.
