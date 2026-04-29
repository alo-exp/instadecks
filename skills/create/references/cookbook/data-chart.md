# Recipe — Data Chart

**Slide type:** data-chart
**16:9:** 10″ × 5.625″
**Footer:** page number + source line via `addFooter()`
**Notes:** speaker notes via `slide.addNotes()`

> 3 variants — all share `(slide, { title, chartType, series, source, pageNum, total, annotation? })`.

## Variant A: data-chart-A-clean

**Variant ID:** data-chart-A-clean
**Visual:** Standard chart filling content area on accent background, gridlines, palette colors. Default v8 register.

```javascript
function renderDataChartA(slide, { title, chartType, series, source, pageNum, total }) {
  // chartType ∈ { 'BAR', 'LINE', 'PIE', 'DOUGHNUT' }  — must be a key on pres.charts
  slide.background = { color: PALETTE.accent };
  slide.addText(title, {
    x: MARGIN_X, y: TITLE_Y, w: W - 1.0, h: TITLE_H,
    fontFace: TYPE.heading, fontSize: 24, bold: true, color: PALETTE.ink, margin: 0,
  });
  slide.addChart(pres.charts[chartType], series, {
    x: MARGIN_X, y: 1.3, w: W - 1.0, h: H - 2.2,
    barDir: chartType === 'BAR' ? 'col' : undefined,
    chartColors: [PALETTE.primary, PALETTE.secondary, PALETTE.muted],
    chartArea: { fill: { color: 'FFFFFF' }, roundedCorners: false },
    catAxisLabelColor: PALETTE.muted, valAxisLabelColor: PALETTE.muted,
    catAxisLabelFontFace: TYPE.body, valAxisLabelFontFace: TYPE.body,
    valGridLine: { color: 'E5E7EB', size: 0.5 }, catGridLine: { style: 'none' },
    showValue: chartType === 'BAR', dataLabelPosition: 'outEnd',
    dataLabelColor: PALETTE.ink, showLegend: series.length > 1,
  });
  addFooter(slide, { pageNum, total, source });
  slide.addNotes(`${chartType} chart — ${series.length} series.`);
}
```

**When to use:** Default chart presentation; trend or distribution where chart speaks for itself.
**When NOT to use:** When the takeaway needs an explicit annotation overlay (use B) or when comparing 3+ small datasets (use C).

## Variant B: data-chart-B-annotated-line

**Variant ID:** data-chart-B-annotated-line
**Visual:** Line chart with a callout box pointing to the key inflection point; takeaway text in callout. Anchors the audience attention.

```javascript
function renderDataChartB(slide, { title, chartType, series, source, pageNum, total, annotation }) {
  slide.background = { color: PALETTE.accent };
  slide.addText(title, {
    x: MARGIN_X, y: TITLE_Y, w: W - 1.0, h: TITLE_H,
    fontFace: TYPE.heading, fontSize: 24, bold: true, color: PALETTE.ink, margin: 0,
  });

  // Chart on left ~65% of width.
  const CHART_W = (W - 1.0) * 0.62;
  slide.addChart(pres.charts[chartType || 'LINE'], series, {
    x: MARGIN_X, y: 1.3, w: CHART_W, h: H - 2.2,
    chartColors: [PALETTE.primary, PALETTE.secondary],
    chartArea: { fill: { color: 'FFFFFF' }, roundedCorners: false },
    catAxisLabelColor: PALETTE.muted, valAxisLabelColor: PALETTE.muted,
    catAxisLabelFontFace: TYPE.body, valAxisLabelFontFace: TYPE.body,
    valGridLine: { color: 'E5E7EB', size: 0.5 }, catGridLine: { style: 'none' },
    showLegend: series.length > 1, lineSize: 3,
  });

  // Callout card on right.
  const CALLOUT_X = MARGIN_X + CHART_W + 0.3;
  const CALLOUT_W = W - CALLOUT_X - MARGIN_X;
  slide.addShape(pres.shapes.RECTANGLE, {
    x: CALLOUT_X, y: 1.6, w: CALLOUT_W, h: 2.6,
    fill: { color: PALETTE.primary }, line: { color: PALETTE.primary, width: 0 },
  });
  slide.addText('TAKEAWAY', {
    x: CALLOUT_X + 0.2, y: 1.7, w: CALLOUT_W - 0.4, h: 0.4,
    fontFace: TYPE.body, fontSize: 11, bold: true,
    color: PALETTE.secondary, align: 'left', margin: 0,
  });
  slide.addText(annotation || 'Key inflection at this point.', {
    x: CALLOUT_X + 0.2, y: 2.1, w: CALLOUT_W - 0.4, h: 2.0,
    fontFace: TYPE.heading, fontSize: 16, bold: true,
    color: PALETTE.accent, align: 'left', valign: 'top', margin: 0,
  });

  addFooter(slide, { pageNum, total, source });
  slide.addNotes(`Annotated chart with explicit takeaway: ${annotation || ''}`);
}
```

**When to use:** When a single data point or trend requires explicit pointing-out (the audience won't see it without help).
**When NOT to use:** Self-explanatory charts — the callout adds noise.

## Variant C: data-chart-C-small-multiples

**Variant ID:** data-chart-C-small-multiples
**Visual:** 2×2 grid of small charts on the same axes; comparing the same metric across 4 categories/segments. Edward Tufte register.

```javascript
function renderDataChartC(slide, { title, chartType, series, source, pageNum, total }) {
  slide.background = { color: PALETTE.accent };
  slide.addText(title, {
    x: MARGIN_X, y: TITLE_Y, w: W - 1.0, h: TITLE_H,
    fontFace: TYPE.heading, fontSize: 22, bold: true, color: PALETTE.ink, margin: 0,
  });

  // series is expected as an array of { name, data: [{ name, labels, values }] }
  // representing up to 4 small multiples.
  const GAP = 0.2;
  const CELL_W = (W - MARGIN_X * 2 - GAP) / 2;
  const CELL_H = (H - 2.0 - GAP) / 2;

  const multiples = (series || []).slice(0, 4);
  for (let i = 0; i < multiples.length; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const cx = MARGIN_X + col * (CELL_W + GAP);
    const cy = 1.3 + row * (CELL_H + GAP);

    // Cell label.
    slide.addText(multiples[i].name || `Cell ${i + 1}`, {
      x: cx, y: cy, w: CELL_W, h: 0.3,
      fontFace: TYPE.heading, fontSize: 11, bold: true,
      color: PALETTE.primary, align: 'left', margin: 0,
    });

    slide.addChart(pres.charts[chartType || 'BAR'], multiples[i].data, {
      x: cx, y: cy + 0.3, w: CELL_W, h: CELL_H - 0.3,
      barDir: 'col',
      chartColors: [PALETTE.primary],
      chartArea: { fill: { color: 'FFFFFF' }, roundedCorners: false },
      catAxisLabelColor: PALETTE.muted, valAxisLabelColor: PALETTE.muted,
      catAxisLabelFontFace: TYPE.body, valAxisLabelFontFace: TYPE.body,
      catAxisLabelFontSize: 8, valAxisLabelFontSize: 8,
      valGridLine: { color: 'E5E7EB', size: 0.5 }, catGridLine: { style: 'none' },
      showLegend: false,
    });
  }

  addFooter(slide, { pageNum, total, source });
  slide.addNotes(`Small multiples — ${multiples.length} panels.`);
}
```

**When to use:** Comparing the same metric across 3-4 categories/segments where overlaying on one chart would confuse.
**When NOT to use:** Single-series data — small multiples imply comparison; one panel reads as broken layout.

## DO / DON'T

| ✅ DO | ❌ DON'T |
|---|---|
| `pres.charts[chartType]` (ENUM key, e.g. `'BAR'`) | `slide.addChart('bar', …)` (raw lowercase string) |
| `chartColors: [PALETTE.primary, …]` | Default palette (PowerPoint blues — R18 anti-tell) |
| `showLegend: series.length > 1` | Always show legend (clutters single-series) |
| `legendPos: 'b'` for horizontal data, `'r'` for vertical (allowed: `'b' \| 'r' \| 'l' \| 't'`; pptxgenjs default `'r'`) | Omit `legendPos` for multi-series charts and accept whatever PowerPoint picks |

## When to use

A quantitative beat — trend, distribution, magnitude. A for default; B when audience needs an explicit takeaway; C for multi-segment comparison.
