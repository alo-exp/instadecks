# Recipe — Section

**Slide type:** section
**16:9:** 10″ × 5.625″
**Footer:** page number + source line via `addFooter()`
**Notes:** speaker notes via `slide.addNotes()`

> 3 variants — pick per design DNA. All variants share `(slide, { sectionNum, sectionTitle, pageNum, total })`.

## Variant A: section-A-numbered-rail

**Variant ID:** section-A-numbered-rail
**Visual:** Large two-digit zero-padded section number in secondary; section title to its right; thin rule under the number. Default v8 register.

```javascript
function renderSectionA(slide, { sectionNum, sectionTitle, pageNum, total }) {
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

**When to use:** Default for multi-section decks where calm pacing is wanted.
**When NOT to use:** Decks with only one section (no breaks needed) or briefs requesting bold-modern register.

## Variant B: section-B-numbered-anchor

**Variant ID:** section-B-numbered-anchor
**Visual:** Oversized section numeral (200pt) anchors center-left as the dominant visual element; small section title above it acts as a label. Number-as-design motif.

```javascript
function renderSectionB(slide, { sectionNum, sectionTitle, pageNum, total }) {
  slide.background = { color: PALETTE.primary };

  slide.addText(`Section ${String(sectionNum).padStart(2, '0')}`, {
    x: MARGIN_X, y: 1.0, w: W - 1.0, h: 0.4,
    fontFace: TYPE.body, fontSize: 12,
    color: PALETTE.muted, align: 'left', margin: 0,
  });

  slide.addText(String(sectionNum).padStart(2, '0'), {
    x: MARGIN_X, y: 1.4, w: 5.5, h: 3.6,
    fontFace: TYPE.heading, fontSize: 200, bold: true,
    color: PALETTE.secondary, align: 'left', valign: 'top', margin: 0,
    fit: 'shrink',
  });

  slide.addText(sectionTitle, {
    x: 5.8, y: 2.6, w: W - 6.3, h: 1.4,
    fontFace: TYPE.heading, fontSize: 24, bold: true,
    color: PALETTE.accent, align: 'left', valign: 'middle', margin: 0,
  });

  addFooter(slide, { pageNum, total });
  slide.addNotes(`Section ${sectionNum} (numbered anchor): ${sectionTitle}.`);
}
```

**When to use:** Bold-modern decks where a strong visual break between sections is part of the design intent.
**When NOT to use:** Conservative briefs (financial / academic) — oversized numerals can read as "look-at-me."

## Variant C: section-C-full-bleed-color

**Variant ID:** section-C-full-bleed-color
**Visual:** Full-bleed secondary-color background; section title set centered at 36pt in primary color; small number label top-right. High-impact divider.

```javascript
function renderSectionC(slide, { sectionNum, sectionTitle, pageNum, total }) {
  slide.background = { color: PALETTE.secondary };

  slide.addText(`${String(sectionNum).padStart(2, '0')} / ${String(total || sectionNum).padStart(2, '0')}`, {
    x: W - 2.0, y: 0.4, w: 1.5, h: 0.4,
    fontFace: TYPE.body, fontSize: 12,
    color: PALETTE.primary, align: 'right', margin: 0,
  });

  slide.addText(sectionTitle, {
    x: MARGIN_X, y: 1.8, w: W - 1.0, h: 2.0,
    fontFace: TYPE.heading, fontSize: 36, bold: true,
    color: PALETTE.primary, align: 'center', valign: 'middle', margin: 0,
  });

  // Thin centered rule for emphasis (editorial-rule motif).
  slide.addShape(pres.shapes.LINE, {
    x: W / 2 - 0.6, y: 4.0, w: 1.2, h: 0,
    line: { color: PALETTE.primary, width: 2 },
  });

  addFooter(slide, { pageNum, total });
  slide.addNotes(`Section ${sectionNum} (full-bleed): ${sectionTitle}.`);
}
```

**When to use:** Decks where each section is meant to feel like a fresh chapter — high contrast against content slides.
**When NOT to use:** When the secondary palette color is light (low contrast against primary text); pick B instead.

## DO / DON'T

| ✅ DO | ❌ DON'T |
|---|---|
| `slide.addShape(pres.shapes.LINE, …)` | `slide.addShape('line', …)` | <!-- enum-lint-allow: anti-pattern doc -->
| Place the rail line under the section number | Place a divider directly under the slide title (R18 AI-tell) |
| Zero-pad: `String(n).padStart(2, '0')` | Manual `'01'` literal (breaks for 10+) |

## When to use

Major narrative breaks between `DeckBrief.narrative_arc` beats — typically one section divider per 3–5 content slides. Variant A for calm; B for bold; C for chapter-break feel.
