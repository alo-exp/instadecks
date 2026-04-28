# Recipe — Data Chart

**Slide type:** data-chart
**16:9:** 10″ × 5.625″
**Footer:** page number + source line via `addFooter()`
**Notes:** speaker notes via `slide.addNotes()`

## Code

```javascript
function renderDataChart(slide, { title, chartType, series, source, pageNum, total }) {
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

## DO / DON'T

| ✅ DO | ❌ DON'T |
|---|---|
| `pres.charts[chartType]` (ENUM key, e.g. `'BAR'`) | `slide.addChart('bar', …)` (raw lowercase string) |
| `chartColors: [PALETTE.primary, …]` | Default palette (PowerPoint blues — R18 anti-tell) |
| `showLegend: series.length > 1` | Always show legend (clutters single-series) |
| `legendPos: 'b'` for horizontal data, `'r'` for vertical (allowed: `'b' \| 'r' \| 'l' \| 't'`; pptxgenjs default `'r'`) | Omit `legendPos` for multi-series charts and accept whatever PowerPoint picks |

## When to use

A quantitative beat — trend, distribution, magnitude. Action-title carries the takeaway; the chart is the supporting evidence.
