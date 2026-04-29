# Recipe — Closing

**Slide type:** closing
**16:9:** 10″ × 5.625″
**Footer:** none on closing (variant of title convention); page numbering optional
**Notes:** speaker notes via `slide.addNotes()`

> 3 variants — all share `(slide, { headline, callToAction, contact, pageNum, total })`.

## Variant A: closing-A-cta-arrow

**Variant ID:** closing-A-cta-arrow
**Visual:** Headline in accent on primary background; right-arrow shape next to a concrete CTA line; small contact line at the bottom. v8 default register.

```javascript
function renderClosingA(slide, { headline, callToAction, contact, pageNum, total }) {
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
  slide.addNotes(`Closing — ${callToAction || 'wrap'}.`);
}
```

**When to use:** Default close — concrete CTA + contact line; wrap with a clear ask.
**When NOT to use:** When the close is meant to provoke discussion (use B) or hand off contact info as the primary message (use C).

## Variant B: closing-B-question-prompt

**Variant ID:** closing-B-question-prompt
**Visual:** A single open question fills most of the slide as a hero typographic statement; small CTA/handoff line below. Discussion-prompt register.

```javascript
function renderClosingB(slide, { headline, callToAction, contact, pageNum, total }) {
  slide.background = { color: PALETTE.primary };

  // Hero question mark glyph as visual anchor.
  slide.addText('?', {
    x: W - 2.4, y: 0.4, w: 2.0, h: 2.0,
    fontFace: TYPE.heading, fontSize: 220, bold: true,
    color: PALETTE.secondary, align: 'right', valign: 'top', margin: 0,
    fit: 'shrink',
  });

  slide.addText(headline, {
    x: MARGIN_X, y: 1.6, w: W - 3.0, h: 2.6,
    fontFace: TYPE.heading, fontSize: 40, bold: true,
    color: PALETTE.accent, align: 'left', valign: 'top', margin: 0,
    fit: 'shrink',
  });

  // Thin rule above CTA.
  slide.addShape(pres.shapes.LINE, {
    x: MARGIN_X, y: H - 1.2, w: 1.0, h: 0,
    line: { color: PALETTE.secondary, width: 2 },
  });
  if (callToAction) slide.addText(callToAction, {
    x: MARGIN_X, y: H - 1.1, w: W - 1.0, h: 0.5,
    fontFace: TYPE.body, fontSize: 14, color: PALETTE.secondary,
    align: 'left', margin: 0,
  });
  if (contact) slide.addText(contact, {
    x: MARGIN_X, y: H - 0.6, w: W - 1.0, h: 0.4,
    fontFace: TYPE.body, fontSize: 11, color: PALETTE.muted,
    align: 'left', margin: 0,
  });

  slide.addNotes(`Closing question prompt — ${headline}.`);
}
```

**When to use:** Workshop / strategy decks closing with a discussion prompt rather than an ask.
**When NOT to use:** Investor decks or board presentations where a concrete ask is required.

## Variant C: closing-C-contact-card

**Variant ID:** closing-C-contact-card
**Visual:** Headline + a structured contact card on the right (name, role, email, link) framed in a secondary-fill rectangle. Handoff register.

```javascript
function renderClosingC(slide, { headline, callToAction, contact, pageNum, total }) {
  slide.background = { color: PALETTE.primary };

  slide.addText(headline, {
    x: MARGIN_X, y: 1.4, w: W * 0.55, h: 2.4,
    fontFace: TYPE.heading, fontSize: 30, bold: true,
    color: PALETTE.accent, align: 'left', valign: 'top', margin: 0,
  });

  if (callToAction) slide.addText(callToAction, {
    x: MARGIN_X, y: H - 1.4, w: W * 0.55, h: 0.8,
    fontFace: TYPE.body, fontSize: 14,
    color: PALETTE.secondary, align: 'left', margin: 0,
  });

  // Contact card on right.
  const CARD_X = W * 0.62;
  const CARD_W = W - CARD_X - MARGIN_X;
  slide.addShape(pres.shapes.RECTANGLE, {
    x: CARD_X, y: 1.6, w: CARD_W, h: H - 2.4,
    fill: { color: PALETTE.secondary },
    line: { color: PALETTE.secondary, width: 0 },
  });
  slide.addShape(pres.shapes.RECTANGLE, {
    x: CARD_X, y: 1.6, w: CARD_W, h: 0.08,
    fill: { color: PALETTE.accent },
    line: { color: PALETTE.accent, width: 0 },
  });

  slide.addText('GET IN TOUCH', {
    x: CARD_X + 0.25, y: 1.85, w: CARD_W - 0.5, h: 0.4,
    fontFace: TYPE.body, fontSize: 11, bold: true,
    color: PALETTE.primary, align: 'left', margin: 0,
  });
  if (contact) slide.addText(contact, {
    x: CARD_X + 0.25, y: 2.3, w: CARD_W - 0.5, h: H - 3.4,
    fontFace: TYPE.body, fontSize: 14,
    color: PALETTE.primary, align: 'left', valign: 'top',
    paraSpaceAfter: 8, margin: 0,
  });

  slide.addNotes(`Closing contact card — ${contact || ''}.`);
}
```

**When to use:** Sales / business-development decks where the next step is "reach out to this person."
**When NOT to use:** Internal decks where contact info is irrelevant.

## DO / DON'T

| ✅ DO | ❌ DON'T |
|---|---|
| `slide.addShape(pres.shapes.RIGHT_ARROW, …)` | `slide.addShape('rightArrow', …)` | <!-- enum-lint-allow: anti-pattern doc -->
| Concrete CTA: `'Approve EU expansion budget by 2026-11-15'` | Vague CTA: `'Thank You / Q&A'` (use override flag if needed) |
| Closing variant of title — same primary-bg motif | Match a content-slide background (kills the wrap signal) |

## When to use

The final beat — call-to-action, ask, or wrap. A for concrete CTA, B for discussion-prompt close, C for contact-handoff close.
