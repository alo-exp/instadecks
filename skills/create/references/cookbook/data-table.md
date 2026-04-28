# Recipe — Data Table

**Slide type:** data-table
**16:9:** 10″ × 5.625″
**Footer:** page number + source line via `addFooter()`
**Notes:** speaker notes via `slide.addNotes()`

## Code

```javascript
function renderDataTable(slide, { title, headers, rows, source, pageNum, total }) {
  slide.background = { color: PALETTE.accent };
  slide.addText(title, {
    x: MARGIN_X, y: TITLE_Y, w: W - 1.0, h: TITLE_H,
    fontFace: TYPE.heading, fontSize: 24, bold: true, color: PALETTE.ink, margin: 0,
  });
  const tableData = [
    headers.map(h => ({
      text: h,
      options: { fill: { color: PALETTE.primary }, color: PALETTE.accent,
                 bold: true, fontFace: TYPE.heading },
    })),
    ...rows.map((r, ri) => r.map(c => ({
      text: String(c),
      options: { fontFace: TYPE.body,
                 fill: { color: ri % 2 ? 'F5F7FA' : 'FFFFFF' }, color: PALETTE.ink },
    }))),
  ];
  slide.addTable(tableData, {
    x: MARGIN_X, y: 1.3, w: W - 1.0,
    fontSize: 12, border: { pt: 0.5, color: 'E5E7EB' },
    colW: Array(headers.length).fill((W - 1.0) / headers.length),
  });
  addFooter(slide, { pageNum, total, source });
  slide.addNotes(`Table — ${rows.length} rows.`);
}
```

## DO / DON'T

| ✅ DO | ❌ DON'T |
|---|---|
| Zebra rows: `ri % 2 ? 'F5F7FA' : 'FFFFFF'` | Uniform white rows (loses scanability) |
| `String(c)` to coerce numbers | Pass raw numbers (some pptxgenjs paths balk) |
| Equal-width cols via `colW: Array(n).fill(...)` | Hard-coded col widths that overflow at >5 cols |

## When to use

Multi-row tabular detail — pricing, feature matrices, before/after metrics. Cap at ~6 rows; beyond that, summarize in a chart.
