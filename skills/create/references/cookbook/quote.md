# Recipe — Quote

**Slide type:** quote
**16:9:** 10″ × 5.625″
**Footer:** page number via `addFooter()`
**Notes:** speaker notes via `slide.addNotes()`

> 3 variants — all share `(slide, { quote, attribution, role, pageNum, total })`.

## Variant A: quote-A-brace-italic

**Variant ID:** quote-A-brace-italic
**Visual:** Decorative left brace shape; quote in italic accent type; attribution below in muted secondary. v8 default register.

```javascript
function renderQuoteA(slide, { quote, attribution, role, pageNum, total }) {
  slide.background = { color: PALETTE.primary };
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

**When to use:** Default register for a single anchoring quote.
**When NOT to use:** When the quote is short and punchy — use Variant B for hero treatment.

## Variant B: quote-B-pull-quote-mega

**Variant ID:** quote-B-pull-quote-mega
**Visual:** Quote set at near-hero scale (44pt) filling most of the slide; oversized opening quotation mark glyph in secondary as visual anchor; attribution as small footer line. Pull-quote magazine register.

```javascript
function renderQuoteB(slide, { quote, attribution, role, pageNum, total }) {
  slide.background = { color: PALETTE.primary };

  // Oversized opening quote glyph.
  slide.addText('“', {
    x: MARGIN_X, y: 0.4, w: 1.5, h: 1.6,
    fontFace: TYPE.heading, fontSize: 160, bold: true,
    color: PALETTE.secondary, align: 'left', valign: 'top', margin: 0,
    fit: 'shrink',
  });

  slide.addText(quote, {
    x: MARGIN_X, y: 1.6, w: W - 1.0, h: 2.8,
    fontFace: TYPE.heading, fontSize: 44, bold: false,
    color: PALETTE.accent, align: 'left', valign: 'top', margin: 0,
    fit: 'shrink',
  });

  // Thin rule above attribution (editorial-rule motif).
  slide.addShape(pres.shapes.LINE, {
    x: MARGIN_X, y: H - 1.1, w: 1.0, h: 0,
    line: { color: PALETTE.secondary, width: 2 },
  });
  slide.addText(`${attribution}${role ? `  —  ${role}` : ''}`, {
    x: MARGIN_X, y: H - 1.0, w: W - 1.0, h: 0.5,
    fontFace: TYPE.body, fontSize: 13, color: PALETTE.secondary,
    align: 'left', margin: 0,
  });

  addFooter(slide, { pageNum, total });
  slide.addNotes(`Pull quote from ${attribution}.`);
}
```

**When to use:** Short, punchy quotes (≤20 words) where the quote IS the slide.
**When NOT to use:** Long quotes — text shrinks to illegibility; use Variant A or C.

## Variant C: quote-C-attribution-card

**Variant ID:** quote-C-attribution-card
**Visual:** Quote on left; attribution card on right with name + role boxed in secondary fill. Testimonial register.

```javascript
function renderQuoteC(slide, { quote, attribution, role, pageNum, total }) {
  slide.background = { color: PALETTE.primary };

  slide.addText(quote, {
    x: MARGIN_X, y: 1.3, w: W * 0.62, h: H - 2.2,
    fontFace: TYPE.heading, fontSize: 22, italic: true,
    color: PALETTE.accent, valign: 'middle', margin: 0,
  });

  // Attribution card.
  const CARD_X = W * 0.66;
  const CARD_W = W - CARD_X - MARGIN_X;
  slide.addShape(pres.shapes.RECTANGLE, {
    x: CARD_X, y: 1.6, w: CARD_W, h: 2.4,
    fill: { color: PALETTE.secondary },
    line: { color: PALETTE.secondary, width: 0 },
  });
  // Thin top accent rule on the card.
  slide.addShape(pres.shapes.RECTANGLE, {
    x: CARD_X, y: 1.6, w: CARD_W, h: 0.08,
    fill: { color: PALETTE.accent },
    line: { color: PALETTE.accent, width: 0 },
  });

  slide.addText(attribution, {
    x: CARD_X + 0.2, y: 1.9, w: CARD_W - 0.4, h: 0.6,
    fontFace: TYPE.heading, fontSize: 16, bold: true,
    color: PALETTE.primary, align: 'left', margin: 0,
  });
  if (role) slide.addText(role, {
    x: CARD_X + 0.2, y: 2.5, w: CARD_W - 0.4, h: 1.4,
    fontFace: TYPE.body, fontSize: 12,
    color: PALETTE.primary, align: 'left', valign: 'top', margin: 0,
  });

  addFooter(slide, { pageNum, total });
  slide.addNotes(`Quote with attribution card from ${attribution}.`);
}
```

**When to use:** Customer-testimonial decks where the source's identity carries weight.
**When NOT to use:** Anonymous or composite quotes where there is no role to display.

## DO / DON'T

| ✅ DO | ❌ DON'T |
|---|---|
| `slide.addShape(pres.shapes.LEFT_BRACE, …)` | `slide.addShape('leftBrace', …)` | <!-- enum-lint-allow: anti-pattern doc -->
| Italicize the quote body | Bold the quote (reads like shouting) |
| Always include attribution + role | Anonymous quotes (loses authority) |

## When to use

An attributed quote anchoring a claim — customer voice, expert testimony, primary-source citation. One quote per deck max; more dilutes impact.
