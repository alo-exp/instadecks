# Recipe — Data Table

**Slide type:** data-table
**16:9:** 10″ × 5.625″
**Footer:** page number + source line via `addFooter()`
**Notes:** speaker notes via `slide.addNotes()`

> 3 variants — all share `(slide, { title, headers, rows, source, pageNum, total, emphasizeCol?, heatmapCols? })`.

## Variant A: data-table-A-zebra

**Variant ID:** data-table-A-zebra
**Visual:** Standard zebra-rowed table with primary-color header band. v8 default register.

```javascript
function renderDataTableA(slide, { title, headers, rows, source, pageNum, total }) {
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

**When to use:** Default tabular detail; when no single column or row is the "answer."
**When NOT to use:** When one column is the punchline (use B) or when cell-level magnitude matters (use C).

## Variant B: data-table-B-banded-emphasis

**Variant ID:** data-table-B-banded-emphasis
**Visual:** One column highlighted with secondary-color fill across all rows + bold ink, drawing the eye. The "answer column."

```javascript
function renderDataTableB(slide, { title, headers, rows, source, pageNum, total, emphasizeCol }) {
  slide.background = { color: PALETTE.accent };
  slide.addText(title, {
    x: MARGIN_X, y: TITLE_Y, w: W - 1.0, h: TITLE_H,
    fontFace: TYPE.heading, fontSize: 24, bold: true, color: PALETTE.ink, margin: 0,
  });

  const ec = typeof emphasizeCol === 'number' ? emphasizeCol : (headers.length - 1);

  const headerRow = headers.map((h, ci) => ({
    text: h,
    options: {
      fill: { color: ci === ec ? PALETTE.secondary : PALETTE.primary },
      color: ci === ec ? PALETTE.ink : PALETTE.accent,
      bold: true, fontFace: TYPE.heading,
    },
  }));

  const bodyRows = rows.map((r, ri) => r.map((c, ci) => ({
    text: String(c),
    options: {
      fontFace: TYPE.body,
      fill: ci === ec
        ? { color: PALETTE.secondary }
        : { color: ri % 2 ? 'F5F7FA' : 'FFFFFF' },
      color: PALETTE.ink,
      bold: ci === ec,
    },
  })));

  slide.addTable([headerRow, ...bodyRows], {
    x: MARGIN_X, y: 1.3, w: W - 1.0,
    fontSize: 12, border: { pt: 0.5, color: 'E5E7EB' },
    colW: Array(headers.length).fill((W - 1.0) / headers.length),
  });
  addFooter(slide, { pageNum, total, source });
  slide.addNotes(`Table with column ${ec} emphasized — ${rows.length} rows.`);
}
```

**When to use:** When one column carries the comparison's verdict — pricing recommendation, winner column, "our offering."
**When NOT to use:** Symmetric tables where no column is the answer — use A.

## Variant C: data-table-C-heatmap-cells

**Variant ID:** data-table-C-heatmap-cells
**Visual:** Numeric cells get a light-to-dark fill based on their relative magnitude within the heatmapped columns. Magnitude-at-a-glance.

```javascript
function renderDataTableC(slide, { title, headers, rows, source, pageNum, total, heatmapCols }) {
  slide.background = { color: PALETTE.accent };
  slide.addText(title, {
    x: MARGIN_X, y: TITLE_Y, w: W - 1.0, h: TITLE_H,
    fontFace: TYPE.heading, fontSize: 24, bold: true, color: PALETTE.ink, margin: 0,
  });

  const cols = heatmapCols && heatmapCols.length
    ? heatmapCols
    : headers.map((_, i) => i).slice(1); // default: all but first column

  // Compute min/max per heatmapped column.
  const stats = {};
  for (const ci of cols) {
    let mn = Infinity, mx = -Infinity;
    for (const r of rows) {
      const n = Number(String(r[ci]).replace(/[^\d.\-]/g, ''));
      if (Number.isFinite(n)) { if (n < mn) mn = n; if (n > mx) mx = n; }
    }
    stats[ci] = { mn, mx };
  }

  const lerpHex = (t) => {
    // Interpolate alpha-blend of PALETTE.secondary over white-ish base.
    // We pick light → mid fills via opacity-style hex stepping.
    const stops = ['FFFFFF', 'F0EBE0', 'E0D6BF', 'C9B98E', 'B09A5E'];
    const idx = Math.min(stops.length - 1, Math.max(0, Math.round(t * (stops.length - 1))));
    return stops[idx];
  };

  const headerRow = headers.map(h => ({
    text: h,
    options: { fill: { color: PALETTE.primary }, color: PALETTE.accent,
               bold: true, fontFace: TYPE.heading },
  }));
  const bodyRows = rows.map(r => r.map((c, ci) => {
    const isHeat = cols.includes(ci);
    let fillHex = ci === 0 ? 'FFFFFF' : 'FFFFFF';
    if (isHeat) {
      const n = Number(String(c).replace(/[^\d.\-]/g, ''));
      const { mn, mx } = stats[ci];
      const t = Number.isFinite(n) && mx > mn ? (n - mn) / (mx - mn) : 0;
      fillHex = lerpHex(t);
    }
    return {
      text: String(c),
      options: { fontFace: TYPE.body, fill: { color: fillHex }, color: PALETTE.ink },
    };
  }));

  slide.addTable([headerRow, ...bodyRows], {
    x: MARGIN_X, y: 1.3, w: W - 1.0,
    fontSize: 12, border: { pt: 0.5, color: 'E5E7EB' },
    colW: Array(headers.length).fill((W - 1.0) / headers.length),
  });
  addFooter(slide, { pageNum, total, source });
  slide.addNotes(`Heatmap table — ${rows.length} rows, ${cols.length} heatmapped columns.`);
}
```

**When to use:** When relative magnitude across cells is the story — region performance, score grids, ranking matrices.
**When NOT to use:** Categorical tables where cells aren't numerically comparable — heatmap reads as random.

## DO / DON'T

| ✅ DO | ❌ DON'T |
|---|---|
| Zebra rows: `ri % 2 ? 'F5F7FA' : 'FFFFFF'` | Uniform white rows (loses scanability) |
| `String(c)` to coerce numbers | Pass raw numbers (some pptxgenjs paths balk) |
| Equal-width cols via `colW: Array(n).fill(...)` | Hard-coded col widths that overflow at >5 cols |

## When to use

Multi-row tabular detail — pricing, feature matrices, before/after metrics. A for default, B when one column is the verdict, C for magnitude-at-a-glance. Cap at ~6 rows; beyond that, summarize in a chart.
