# Recipe — Stat Callout

**Slide type:** stat-callout
**16:9:** 10″ × 5.625″
**Footer:** page number + source line via `addFooter()`
**Notes:** speaker notes via `slide.addNotes()`

> 5 variants — all share `(slide, { title, statValue, statLabel, supporting, source, pageNum, total, stats? })` where `stats` is an optional array of `{ value, label }` for multi-stat variants.

## Variant A: stat-callout-A-centered-hero

**Variant ID:** stat-callout-A-centered-hero
**Visual:** Hero stat number on left at 72pt; supporting prose to the right; standard accent background. v8 default register.

```javascript
function renderStatCalloutA(slide, { title, statValue, statLabel, supporting, source, pageNum, total }) {
  slide.background = { color: PALETTE.accent };
  slide.addText(title, {
    x: MARGIN_X, y: TITLE_Y, w: W - 1.0, h: TITLE_H,
    fontFace: TYPE.heading, fontSize: 22, bold: true, color: PALETTE.ink, margin: 0,
  });
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

**When to use:** Default — single hero stat with supporting prose.
**When NOT to use:** Multi-stat decks (use B or E) or decks needing maximum hero impact (use D).

## Variant B: stat-callout-B-asymmetric-grid

**Variant ID:** stat-callout-B-asymmetric-grid
**Visual:** One large hero stat (left ~60%) with two smaller secondary stats stacked on the right. Asymmetric grid motif.

```javascript
function renderStatCalloutB(slide, { title, statValue, statLabel, supporting, source, pageNum, total, stats }) {
  slide.background = { color: PALETTE.accent };
  slide.addText(title, {
    x: MARGIN_X, y: TITLE_Y, w: W - 1.0, h: TITLE_H,
    fontFace: TYPE.heading, fontSize: 22, bold: true, color: PALETTE.ink, margin: 0,
  });

  // Hero stat — left.
  slide.addText(statValue, {
    x: MARGIN_X, y: 1.4, w: 5.4, h: 2.6,
    fontFace: TYPE.heading, fontSize: 96, bold: true, color: PALETTE.primary,
    align: 'left', valign: 'top', margin: 0, fit: 'shrink',
  });
  slide.addText(statLabel, {
    x: MARGIN_X, y: 4.0, w: 5.4, h: 0.5,
    fontFace: TYPE.body, fontSize: 13, color: PALETTE.muted, margin: 0,
  });

  // Two smaller stats — right.
  const SMALL_X = 6.2;
  const SMALL_W = W - SMALL_X - MARGIN_X;
  const arr = (stats || []).slice(0, 2);
  for (let i = 0; i < arr.length; i++) {
    const sy = 1.4 + i * 1.6;
    slide.addText(arr[i].value, {
      x: SMALL_X, y: sy, w: SMALL_W, h: 0.9,
      fontFace: TYPE.heading, fontSize: 36, bold: true, color: PALETTE.secondary,
      align: 'left', valign: 'top', margin: 0, fit: 'shrink',
    });
    slide.addText(arr[i].label, {
      x: SMALL_X, y: sy + 0.85, w: SMALL_W, h: 0.5,
      fontFace: TYPE.body, fontSize: 11, color: PALETTE.muted,
      align: 'left', margin: 0,
    });
  }

  addFooter(slide, { pageNum, total, source });
  slide.addNotes(`Asymmetric grid: hero ${statValue} + ${arr.length} secondary stats.`);
}
```

**When to use:** When one number is the headline but 2 supporting numbers reinforce it.
**When NOT to use:** Single-stat moments (use A) or 3+ equal stats (use E).

## Variant C: stat-callout-C-vertical-stack

**Variant ID:** stat-callout-C-vertical-stack
**Visual:** Three stats stacked vertically, each with thin rule between, large numbers on left and labels on right. Editorial dashboard.

```javascript
function renderStatCalloutC(slide, { title, statValue, statLabel, supporting, source, pageNum, total, stats }) {
  slide.background = { color: PALETTE.accent };
  slide.addText(title, {
    x: MARGIN_X, y: TITLE_Y, w: W - 1.0, h: TITLE_H,
    fontFace: TYPE.heading, fontSize: 22, bold: true, color: PALETTE.ink, margin: 0,
  });

  const all = [{ value: statValue, label: statLabel }, ...((stats || []).slice(0, 2))];
  const ROW_H = (H - 2.0) / Math.max(all.length, 1);
  for (let i = 0; i < all.length; i++) {
    const ry = 1.3 + i * ROW_H;

    // Top rule (skip for first row, which sits under title's baseline).
    if (i > 0) slide.addShape(pres.shapes.LINE, {
      x: MARGIN_X, y: ry, w: W - 1.0, h: 0,
      line: { color: PALETTE.muted, width: 0.5 },
    });

    slide.addText(all[i].value, {
      x: MARGIN_X, y: ry + 0.05, w: 3.5, h: ROW_H - 0.1,
      fontFace: TYPE.heading, fontSize: 44, bold: true, color: PALETTE.primary,
      align: 'left', valign: 'middle', margin: 0, fit: 'shrink',
    });
    slide.addText(all[i].label, {
      x: 4.2, y: ry + 0.05, w: W - 4.7, h: ROW_H - 0.1,
      fontFace: TYPE.body, fontSize: 14, color: PALETTE.ink,
      align: 'left', valign: 'middle', margin: 0,
    });
  }

  addFooter(slide, { pageNum, total, source });
  slide.addNotes(`Vertical stack — ${all.length} stats.`);
}
```

**When to use:** 2-3 stats of equal weight (KPIs, scoreboard).
**When NOT to use:** Single hero number — use A or D.

## Variant D: stat-callout-D-full-bleed-numeral

**Variant ID:** stat-callout-D-full-bleed-numeral
**Visual:** The stat fills the slide at near-hero scale (240pt) over a primary-color background; label and supporting prose minimized at footer. Maximum impact register.

```javascript
function renderStatCalloutD(slide, { title, statValue, statLabel, supporting, source, pageNum, total }) {
  slide.background = { color: PALETTE.primary };

  // Tiny eyebrow title.
  slide.addText(title, {
    x: MARGIN_X, y: 0.5, w: W - 1.0, h: 0.4,
    fontFace: TYPE.body, fontSize: 12, bold: true,
    color: PALETTE.muted, align: 'left', margin: 0,
  });

  // Hero stat — fills slide.
  slide.addText(statValue, {
    x: MARGIN_X, y: 0.9, w: W - 1.0, h: 3.4,
    fontFace: TYPE.heading, fontSize: 240, bold: true,
    color: PALETTE.accent, align: 'left', valign: 'top', margin: 0,
    fit: 'shrink',
  });

  // Thin secondary rule.
  slide.addShape(pres.shapes.LINE, {
    x: MARGIN_X, y: H - 1.3, w: 1.5, h: 0,
    line: { color: PALETTE.secondary, width: 2 },
  });

  slide.addText(statLabel, {
    x: MARGIN_X, y: H - 1.2, w: W - 1.0, h: 0.4,
    fontFace: TYPE.heading, fontSize: 16, bold: true,
    color: PALETTE.secondary, align: 'left', margin: 0,
  });
  if (supporting) slide.addText(supporting, {
    x: MARGIN_X, y: H - 0.7, w: W - 1.0, h: 0.4,
    fontFace: TYPE.body, fontSize: 11, color: PALETTE.muted,
    align: 'left', margin: 0,
  });

  addFooter(slide, { pageNum, total, source });
  slide.addNotes(`Full-bleed numeral: ${statValue}.`);
}
```

**When to use:** Single, must-remember number where impact > nuance.
**When NOT to use:** When the stat needs context to be meaningful — use A or B for supporting prose.

## Variant E: stat-callout-E-side-by-side

**Variant ID:** stat-callout-E-side-by-side
**Visual:** Three or four stats laid out horizontally as equal-width cards across the slide; each card has number above label. KPI strip register.

```javascript
function renderStatCalloutE(slide, { title, statValue, statLabel, source, pageNum, total, stats }) {
  slide.background = { color: PALETTE.accent };
  slide.addText(title, {
    x: MARGIN_X, y: TITLE_Y, w: W - 1.0, h: TITLE_H,
    fontFace: TYPE.heading, fontSize: 22, bold: true, color: PALETTE.ink, margin: 0,
  });

  const all = [{ value: statValue, label: statLabel }, ...((stats || []).slice(0, 3))];
  const n = Math.max(all.length, 1);
  const GAP = 0.25;
  const CARD_W = (W - MARGIN_X * 2 - GAP * (n - 1)) / n;

  for (let i = 0; i < all.length; i++) {
    const cx = MARGIN_X + i * (CARD_W + GAP);
    // Card background.
    slide.addShape(pres.shapes.RECTANGLE, {
      x: cx, y: 1.4, w: CARD_W, h: H - 2.2,
      fill: { color: 'FFFFFF' }, line: { color: 'E5E7EB', width: 1 },
    });
    // Top accent rule.
    slide.addShape(pres.shapes.RECTANGLE, {
      x: cx, y: 1.4, w: CARD_W, h: 0.06,
      fill: { color: i === 0 ? PALETTE.primary : PALETTE.secondary },
      line: { color: i === 0 ? PALETTE.primary : PALETTE.secondary, width: 0 },
    });

    slide.addText(all[i].value, {
      x: cx + 0.15, y: 1.7, w: CARD_W - 0.3, h: 1.6,
      fontFace: TYPE.heading, fontSize: 48, bold: true,
      color: i === 0 ? PALETTE.primary : PALETTE.ink,
      align: 'left', valign: 'top', margin: 0, fit: 'shrink',
    });
    slide.addText(all[i].label, {
      x: cx + 0.15, y: 3.4, w: CARD_W - 0.3, h: H - 4.0,
      fontFace: TYPE.body, fontSize: 12, color: PALETTE.muted,
      align: 'left', valign: 'top', margin: 0,
    });
  }

  addFooter(slide, { pageNum, total, source });
  slide.addNotes(`KPI strip — ${all.length} side-by-side stats.`);
}
```

**When to use:** Dashboard / KPI strip — 3-4 metrics that all matter equally.
**When NOT to use:** Hero-stat moments where one number is the point — use A or D.

## DO / DON'T

| ✅ DO | ❌ DON'T |
|---|---|
| Hero number 60–72pt (or 240pt for D) | Hero number ≤ 36pt (loses callout impact in A/D) |
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

A hero statistic that anchors a beat. A for default single hero, B for asymmetric grid (1 hero + 2 supporting), C for vertical stack (2-3 equal), D for full-bleed maximum impact, E for KPI strip (3-4 equal stats).
