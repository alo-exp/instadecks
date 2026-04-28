# /instadecks:create — Cookbook

This cookbook is the reference Claude reads at runtime to compose a per-run `render-deck.cjs` for `/instadecks:create`. Each recipe is a copy-pasteable building block — never a template. Per CRT-03, `render-deck.cjs` is authored fresh per run, content-tuned to the `DeckBrief`.

> **Locked invariants (CRT-15 / D-05):**
> - **ENUM-only shapes:** `slide.addShape(pres.shapes.OVAL, …)` ✅ — never `addShape('oval', …)` ❌. Same for charts: `pres.charts.BAR`. <!-- enum-lint-allow: anti-pattern doc -->
> - **No `#` prefix on hex:** `color: 'FF0000'` ✅ — not `'#FF0000'` and not 8-char `'FF000040'`.
> - **Fresh option objects per call** — never reuse one options bag across multiple `addShape`/`addText` invocations.
> - **Action titles only** (D-06) — every slide title is a claim (subject-verb-object), not a topic. `lib/title-check.js` blocks the laziest violations.

## Setup boilerplate (top of every render-deck.cjs)

```javascript
'use strict';
const pptxgen = require('pptxgenjs');
const fs = require('node:fs');
const path = require('node:path');

const pres = new pptxgen();
pres.layout = 'LAYOUT_16x9';            // 10" × 5.625"
pres.author = 'Instadecks';
pres.title  = brief.topic;              // brief loaded from brief.json

// Palette tokens (chosen by agent from design-ideas.json — example shape)
const PALETTE = { primary: '1E2761', secondary: 'CADCFC', accent: 'FFFFFF',
                  ink: '0B1020', muted: '6B7280' };
const TYPE = { heading: 'IBM Plex Sans', body: 'IBM Plex Sans', mono: 'IBM Plex Mono' };

// Layout constants (16:9 inches)
const W = 10, H = 5.625;
const MARGIN_X = 0.5, MARGIN_Y = 0.4;
const TITLE_Y = 0.3, TITLE_H = 0.7;
const FOOTER_Y = H - 0.3;

function addFooter(slide, { pageNum, total, source }) {
  slide.addText(`${pageNum} / ${total}`, {
    x: W - 1.0, y: FOOTER_Y, w: 0.6, h: 0.2,
    fontFace: TYPE.body, fontSize: 9, color: PALETTE.muted, align: 'right', margin: 0,
  });
  if (source) {
    slide.addText(`Source: ${source}`, {
      x: MARGIN_X, y: FOOTER_Y, w: W - 2.0, h: 0.2,
      fontFace: TYPE.body, fontSize: 9, color: PALETTE.muted, italic: true, margin: 0,
    });
  }
}
```

## Recipe index

| # | Slide type | Recipe file | When to use |
|---|---|---|---|
| 1 | title | [title.md](cookbook/title.md) | Opening + topic statement |
| 2 | section | [section.md](cookbook/section.md) | Major narrative breaks |
| 3 | 2-column | [2col.md](cookbook/2col.md) | Side-by-side bullets |
| 4 | comparison | [comparison.md](cookbook/comparison.md) | Option-A vs Option-B cards |
| 5 | data-chart | [data-chart.md](cookbook/data-chart.md) | Quantitative trend |
| 6 | data-table | [data-table.md](cookbook/data-table.md) | Multi-row tabular detail |
| 7 | stat-callout | [stat-callout.md](cookbook/stat-callout.md) | Hero statistic |
| 8 | quote | [quote.md](cookbook/quote.md) | Attributed quote |
| 9 | closing | [closing.md](cookbook/closing.md) | CTA / wrap (variant of title) |

## Global DO / DON'T cheatsheet

| ✅ DO | ❌ DON'T |
|---|---|
| `slide.addShape(pres.shapes.OVAL, …)` | `slide.addShape('oval', …)` | <!-- enum-lint-allow: anti-pattern doc -->
| `color: 'FF0000'` | `color: '#FF0000'` or `color: 'FF000040'` |
| `bullet: true` | `'• item'` (unicode) |
| `paraSpaceAfter: 6` | `lineSpacing: 1.4` (with bullets) |
| `margin: 0` (when aligning shapes/text) | rely on default margin then offset shapes |
| Action title: `'Q3 revenue grew 23%'` | Topic title: `'Q3 Revenue'` |
| Fresh shadow/option object per call | Reuse one option object across `addShape` calls |

## See also

- [`design-ideas.md`](design-ideas.md) — 10 palettes / 8 typography pairings / 10 anti-patterns (author-original guidance).
- [`design-ideas.json`](design-ideas.json) — machine-readable companion consumed by `lib/design-validator.js`.
