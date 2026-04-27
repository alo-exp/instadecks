// Extracted from v8 BluePrestige annotate.js for Phase 2 onward. Source-of-truth lives in skills/annotate/scripts/samples.js after Phase 2.
'use strict';

const SAMPLES = [
  {
    slideNum: 7,
    title: 'Slide 07  ·  Freelance Baseline',
    annotations: [
      { sev: 'minor',  nx: 0.46, ny: 0.16,  // title text centre
        text: 'Title is ~95 characters on a single line. Risks wrapping or truncation at smaller display sizes.' },
      { sev: 'minor',  nx: 0.33, ny: 0.84,  // X-axis number row (where an axis title would sit)
        text: 'No X-axis title label. The "$B" unit is implied by bar labels but absent from the axis itself.' },
      { sev: 'major',  nx: 0.58, ny: 0.27,  // "Upwork" heading in the right annotation panel
        text: 'Annotation panel lists Upwork first (top), but the bar chart shows Upwork last (bottom). Reversed ordering forces cognitive re-mapping.' },
      { sev: 'polish', nx: 0.11, ny: 0.32,  // "TopTal" Y-axis label (top bar)
        text: '"TopTal" in the bar chart Y-axis vs "Toptal" in the annotation panel — inconsistent capitalisation on the same slide.' },
    ],
  },
  {
    slideNum: 9,
    title: 'Slide 09  ·  Workflow Matrix',
    annotations: [
      { sev: 'minor',  nx: 0.40, ny: 0.24,  // italic subtitle (row below the main title)
        text: 'Italic subtitle is ~11 pt. Likely illegible at a standard 10–15 ft projection distance.' },
      { sev: 'minor',  nx: 0.37, ny: 0.82,  // boundary of dark workflow-class cells & AUTOMATION·2028 column (bottom rows)
        text: 'Dark (<25%) cells in AUTOMATION·2028 column blend with the adjacent navy row-label background — column boundary is visually ambiguous.' },
      { sev: 'polish', nx: 0.18, ny: 0.60,  // mid-table, workflow-class column (representative of all 11 rows)
        text: 'Table row height ~22 px for 11 rows. Increasing to ~26 px would improve scan legibility without layout changes.' },
      { sev: 'minor',  nx: 0.70, ny: 0.91,  // legend bar items on the right, just above the source line
        text: 'Source citation sits only ~6 pt below the legend bar. At projection distance it reads as part of the legend.' },
    ],
  },
  {
    slideNum: 10,
    title: 'Slide 10  ·  Inverted HITL Stack',
    annotations: [
      { sev: 'major',  nx: 0.18, ny: 0.35,  // thin dark "5% AI" bar at top of PRE-2025 column
        text: 'PRE-2025 "5% AI" bar is ~4 px thin — its label floats above the bar rather than sitting inside it, breaking the stacked-bar metaphor.' },
      { sev: 'minor',  nx: 0.05, ny: 0.56,  // left edge of bar area where a Y-axis would appear
        text: 'No Y-axis (0–100%) is shown. Precise split values require mental calculation from the in-bar labels.' },
      { sev: 'minor',  nx: 0.71, ny: 0.74,  // "18% HUMAN" bold label below the 2027–2030 bar
        text: '"18% HUMAN" (2027–2030) is orphaned text floating below the bar area rather than inside the thin human segment.' },
      { sev: 'polish', nx: 0.66, ny: 0.81,  // descriptive caption text under the 2027–2030 column
        text: 'Descriptive text below each era column is ~12 pt. Consider 13 pt for comfortable projection legibility.' },
    ],
  },
];

module.exports = { SAMPLES };
