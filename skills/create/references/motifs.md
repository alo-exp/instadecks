# Motif Library

> Curated visual motifs for `/instadecks:create`. Each motif has a Visual / When-it-works line and a working `pptxgenjs` 4.0.1 snippet. Snippets use only supported APIs — `slide.addShape`, `slide.addText`, `slide.background`. The `gradient-overlay` motif documents the stepped-solid-block workaround for pptxgenjs 4.0.1's limited gradient support.

---

## underline-accent

**Visual:** A short, thick horizontal rule beneath the headline — acts as a typographic accent and grounds the title.
**When it works:** Section dividers, slide titles where the headline is the focal element. Default motif; use sparingly to avoid same-shape decks.

```javascript
slide.addText('Q3 grew 23%', {
  x: 0.5, y: 0.6, w: 9, h: 0.9,
  fontFace: 'IBM Plex Serif', fontSize: 36, bold: true, color: '#1F3A2E',
});
slide.addShape('rect', {
  x: 0.5, y: 1.55, w: 1.2, h: 0.06, fill: { color: '#C8A24A' }, line: { color: '#C8A24A' },
});
```

---

## geometric-block

**Visual:** A solid rectangular color block sits behind a region of the slide — a header band, a side stripe, or a corner anchor — letting type sit on color.
**When it works:** Section openers and stat callouts where you want to chunk content visually without a chart.

```javascript
slide.addShape('rect', {
  x: 0, y: 0, w: 10, h: 1.4, fill: { color: '#0B2A6B' }, line: { color: '#0B2A6B' },
});
slide.addText('Pipeline · Q3 outlook', {
  x: 0.5, y: 0.45, w: 9, h: 0.6,
  fontFace: 'IBM Plex Sans', fontSize: 20, bold: true, color: '#FFFFFF',
});
```

---

## asymmetric-grid

**Visual:** Off-center compositions with intentional negative space — content occupies one half (or third) of the slide; the other half is empty.
**When it works:** Editorial pull-quotes, hero stats, and any slide where breathing room is the design.

```javascript
slide.addText('We bet on patience.', {
  x: 0.6, y: 1.8, w: 4.5, h: 1.6,
  fontFace: 'IBM Plex Serif', fontSize: 40, italic: true, color: '#1F1B16',
});
// Right half deliberately empty
slide.addText('— founding letter, 2018', {
  x: 0.6, y: 4.2, w: 4.5, h: 0.4,
  fontFace: 'IBM Plex Sans', fontSize: 11, color: '#544A3D',
});
```

---

## number-as-design

**Visual:** An oversized numeral (section number, stat) becomes the visual anchor — type-as-image at numeric scale.
**When it works:** Section dividers ("01 · Context"), hero stats, chapter beats.

```javascript
slide.addText('01', {
  x: 0.5, y: 1.4, w: 4.0, h: 3.2,
  fontFace: 'IBM Plex Serif', fontSize: 200, bold: true, color: '#C8A24A',
});
slide.addText('Context', {
  x: 4.6, y: 2.6, w: 5.0, h: 0.9,
  fontFace: 'IBM Plex Sans', fontSize: 28, bold: true, color: '#1F3A2E',
});
```

---

## diagonal-split

**Visual:** A diagonal color block (rotated rectangle) splits the slide along a 15–25° axis — gives the slide kinetic energy.
**When it works:** Cover slides, transitions, hero claims. Avoid on dense content slides — the diagonal competes with body text.

```javascript
slide.addShape('rect', {
  x: -1.0, y: 3.5, w: 14, h: 4, rotate: 18,
  fill: { color: '#E5322D' }, line: { color: '#E5322D' },
});
slide.addText('Kinetic.', {
  x: 0.6, y: 1.0, w: 9, h: 1.4,
  fontFace: 'IBM Plex Sans', fontSize: 60, bold: true, color: '#1A1A1A',
});
```

---

## editorial-rule

**Visual:** A thick rule paired with a thin rule — magazine-style kicker / dateline above a headline.
**When it works:** Section openers, magazine-feel decks, anywhere the headline benefits from a typographic kicker.

```javascript
// Thick rule
slide.addShape('rect', {
  x: 0.5, y: 0.7, w: 0.6, h: 0.08, fill: { color: '#8C2A2A' }, line: { color: '#8C2A2A' },
});
// Thin rule
slide.addShape('rect', {
  x: 0.5, y: 0.86, w: 9.0, h: 0.015, fill: { color: '#544A3D' }, line: { color: '#544A3D' },
});
slide.addText('Field Notes — Logistics', {
  x: 0.5, y: 1.0, w: 9, h: 0.4,
  fontFace: 'IBM Plex Sans', fontSize: 11, bold: true, color: '#544A3D',
});
slide.addText('A new shape for retail.', {
  x: 0.5, y: 1.5, w: 9, h: 1.2,
  fontFace: 'IBM Plex Serif', fontSize: 44, bold: true, color: '#1F1B16',
});
```

---

## minimalist-void

**Visual:** No decoration at all — pure type on ground. Hierarchy comes from weight, size, and position only.
**When it works:** Manifesto / brand-statement / type-led briefs. Pairs with the Monochrome High-Contrast palette.

```javascript
// No shapes. No rules. Type-only.
slide.background = { color: '#FFFFFF' };
slide.addText('Patience compounds.', {
  x: 0.6, y: 2.4, w: 9, h: 1.6,
  fontFace: 'IBM Plex Serif', fontSize: 48, bold: true, color: '#0A0A0A',
});
```

---

## gradient-overlay

**Visual:** A vertical or horizontal gradient transition between two palette colors — used as a slide background or a panel overlay.
**When it works:** Cover slides, section transitions, hero panels. Use sparingly — gradients are a strong visual signal.

```javascript
// pptxgenjs 4.0.1 has limited gradient support — use stepped solid blocks
// 8 stepped bands fake a vertical gradient from primary to bg.
const STEPS = 8;
const top = '#0B2A6B';      // primary
const bottom = '#FFFFFF';   // bg
function lerp(aHex, bHex, t) {
  const a = [parseInt(aHex.slice(1,3),16), parseInt(aHex.slice(3,5),16), parseInt(aHex.slice(5,7),16)];
  const b = [parseInt(bHex.slice(1,3),16), parseInt(bHex.slice(3,5),16), parseInt(bHex.slice(5,7),16)];
  const c = a.map((v,i) => Math.round(v + (b[i]-v)*t));
  return '#' + c.map(v => v.toString(16).padStart(2,'0').toUpperCase()).join('');
}
for (let i = 0; i < STEPS; i++) {
  const color = lerp(top, bottom, i / (STEPS - 1));
  slide.addShape('rect', {
    x: 0, y: i * (5.625 / STEPS), w: 10, h: 5.625 / STEPS,
    fill: { color }, line: { color },
  });
}
slide.addText('Horizon', {
  x: 0.5, y: 2.0, w: 9, h: 1.4,
  fontFace: 'IBM Plex Serif', fontSize: 60, bold: true, color: '#FFFFFF',
});
```

---

## type-as-image

**Visual:** A single oversized word or phrase fills most of the slide at hero scale (88–160pt). Type IS the image.
**When it works:** Cover slides, chapter breaks, manifesto beats. Pairs with Plex Serif Display + Monochrome High-Contrast.

```javascript
slide.background = { color: '#FFFFFF' };
slide.addText('Scale.', {
  x: 0.4, y: 0.6, w: 9.2, h: 4.4,
  fontFace: 'IBM Plex Serif', fontSize: 160, bold: true, color: '#0A0A0A',
  align: 'left', valign: 'middle',
});
slide.addText('Q3 board · Oct 2026', {
  x: 0.5, y: 5.2, w: 9, h: 0.3,
  fontFace: 'IBM Plex Sans', fontSize: 10, color: '#454A45',
});
```
