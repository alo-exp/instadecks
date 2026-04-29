# Recipe — Title

**Slide type:** title
**16:9:** 10″ × 5.625″
**Footer:** none (convention — title slide skips the page-number footer)
**Notes:** speaker notes via `slide.addNotes()`

> 4 variants — pick per design DNA. All variants share the same `(slide, { title, subtitle, attribution, pageNum, total })` parameter shape.

## Variant A: title-A-centered-classic

**Variant ID:** title-A-centered-classic
**Visual:** Left-aligned action title in accent color on primary background; subtitle below; small attribution at bottom. The original v8 register.

```javascript
function renderTitleA(slide, { title, subtitle, attribution, pageNum, total }) {
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
  slide.addNotes(`Title slide — establish topic + voice.`);
}
```

**When to use:** Default editorial register; executive / financial / academic briefs that want a calm, classic opening.
**When NOT to use:** When the brief tone calls for visual punch (consumer launch, creative pitch) — use B, C, or D instead.

## Variant B: title-B-asymmetric-block

**Variant ID:** title-B-asymmetric-block
**Visual:** Solid accent-color block fills left third of the slide; title sits to the right of the block on primary background; subtitle below the block edge. Magazine cover feel.

```javascript
function renderTitleB(slide, { title, subtitle, attribution, pageNum, total }) {
  slide.background = { color: PALETTE.primary };

  // Left accent block — full-bleed left third.
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: W * 0.33, h: H,
    fill: { color: PALETTE.secondary }, line: { color: PALETTE.secondary, width: 0 },
  });

  slide.addText(title, {
    x: W * 0.33 + 0.4, y: 1.4, w: W * 0.67 - 0.9, h: 2.4,
    fontFace: TYPE.heading, fontSize: 36, bold: true,
    color: PALETTE.accent, align: 'left', valign: 'top', margin: 0,
  });
  if (subtitle) slide.addText(subtitle, {
    x: W * 0.33 + 0.4, y: 3.9, w: W * 0.67 - 0.9, h: 0.6,
    fontFace: TYPE.body, fontSize: 16, color: PALETTE.secondary, margin: 0,
  });
  if (attribution) slide.addText(attribution, {
    x: W * 0.33 + 0.4, y: H - 0.7, w: W * 0.67 - 0.9, h: 0.3,
    fontFace: TYPE.body, fontSize: 11, color: PALETTE.muted, margin: 0,
  });
  slide.addNotes(`Title slide (asymmetric block) — magazine register.`);
}
```

**When to use:** Confident product / brand / strategy decks where the brief tone is bold-modern.
**When NOT to use:** Quiet financial briefs or audiences expecting traditional layouts — block reads as visually loud.

## Variant C: title-C-oversized-numeral

**Variant ID:** title-C-oversized-numeral
**Visual:** Massive single-character numeral or letter (e.g., issue/edition number) fills left half at 280pt; title sits to its right at smaller weight. Editorial / report cover.

```javascript
function renderTitleC(slide, { title, subtitle, attribution, pageNum, total }) {
  slide.background = { color: PALETTE.primary };

  // Hero numeral — derive from attribution or fallback to '01'.
  const heroChar = (attribution && /\d+/.test(attribution))
    ? (attribution.match(/\d+/)[0]).slice(0, 2).padStart(2, '0')
    : '01';

  slide.addText(heroChar, {
    x: MARGIN_X, y: 0.4, w: 4.5, h: 5.0,
    fontFace: TYPE.heading, fontSize: 280, bold: true,
    color: PALETTE.secondary, align: 'left', valign: 'top', margin: 0,
    fit: 'shrink', autoFit: true,
  });

  slide.addText(title, {
    x: 5.2, y: 1.8, w: W - 5.7, h: 2.4,
    fontFace: TYPE.heading, fontSize: 28, bold: true,
    color: PALETTE.accent, align: 'left', valign: 'top', margin: 0,
  });
  if (subtitle) slide.addText(subtitle, {
    x: 5.2, y: 4.2, w: W - 5.7, h: 0.5,
    fontFace: TYPE.body, fontSize: 14, color: PALETTE.muted, margin: 0,
  });
  if (attribution) slide.addText(attribution, {
    x: 5.2, y: H - 0.7, w: W - 5.7, h: 0.3,
    fontFace: TYPE.body, fontSize: 10, color: PALETTE.muted, margin: 0,
  });
  slide.addNotes(`Title slide (oversized numeral) — editorial register.`);
}
```

**When to use:** Annual reports, issue-numbered briefings, "Volume X" series — anywhere a number is part of the identity.
**When NOT to use:** When there is no natural numeric anchor (a forced numeral feels gimmicky).

## Variant D: title-D-type-as-image

**Variant ID:** title-D-type-as-image
**Visual:** Title set at near-hero scale (96pt) filling the slide as the primary visual; no decorative shapes; subtitle and attribution as minimal footer line. Type IS the image.

```javascript
function renderTitleD(slide, { title, subtitle, attribution, pageNum, total }) {
  slide.background = { color: PALETTE.primary };

  slide.addText(title, {
    x: MARGIN_X, y: 0.8, w: W - 1.0, h: 3.8,
    fontFace: TYPE.heading, fontSize: 96, bold: true,
    color: PALETTE.accent, align: 'left', valign: 'top', margin: 0,
    fit: 'shrink',
  });

  // Thin rule between title and footer line.
  slide.addShape(pres.shapes.LINE, {
    x: MARGIN_X, y: H - 1.1, w: W - 1.0, h: 0,
    line: { color: PALETTE.secondary, width: 1 },
  });

  if (subtitle) slide.addText(subtitle, {
    x: MARGIN_X, y: H - 1.0, w: (W - 1.0) / 2, h: 0.4,
    fontFace: TYPE.body, fontSize: 12, color: PALETTE.secondary, margin: 0,
  });
  if (attribution) slide.addText(attribution, {
    x: MARGIN_X + (W - 1.0) / 2, y: H - 1.0, w: (W - 1.0) / 2, h: 0.4,
    fontFace: TYPE.body, fontSize: 12, color: PALETTE.muted,
    align: 'right', margin: 0,
  });
  slide.addNotes(`Title slide (type-as-image) — bold typographic opener.`);
}
```

**When to use:** Short, declarative titles (≤8 words) where the headline is the strongest creative asset.
**When NOT to use:** Long titles (>10 words) — they shrink to illegibility even with `fit: 'shrink'`.

## DO / DON'T (all variants)

| ✅ DO | ❌ DON'T |
|---|---|
| Action title: `'Q3 revenue grew 23% on enterprise expansion'` | Topic title: `'Q3 Revenue'` |
| `color: PALETTE.accent` (token) | Hardcoded literal hex strings |
| `slide.addNotes(...)` ends every recipe | Skip speaker notes — fails CRT-05 |

## When to use (recipe overall)

The opening beat of `DeckBrief.narrative_arc` — establishes topic and voice in one claim. Pick a variant per design DNA: A for calm/editorial, B for bold-modern, C for numbered-series, D for typographic showpiece.
