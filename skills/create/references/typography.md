# Typography Library

> Curated type pairings for `/instadecks:create`. Each pairing block has Headings / Body / Weights / Use-case lines plus a `pptxgenjs` assignment example. The bundled fonts are **IBM Plex Sans**, **IBM Plex Serif**, and **IBM Plex Mono** (shipped under SIL OFL in `assets/fonts/`). Pairings whose primary font is NOT bundled include a `**Fallback:** IBM Plex` note so renders degrade gracefully.

---

## Plex Serif Editorial

**Headings:** IBM Plex Serif
**Body:** IBM Plex Sans
**Weights:** Headings 700 (bold) / Body 400 (regular)
**Use:** Long-form / editorial / research briefs — heavy serif headings carry the design while sans body keeps reading load light.

```javascript
const TYPE = {
  heading: 'IBM Plex Serif',
  body: 'IBM Plex Sans',
};
slide.addText('Q3 expanded enterprise share by 23%', {
  fontFace: 'IBM Plex Serif', fontSize: 40, bold: true,
});
slide.addText(bodyText, { fontFace: 'IBM Plex Sans', fontSize: 14 });
```

---

## Plex Sans Bold

**Headings:** IBM Plex Sans Bold
**Body:** IBM Plex Sans
**Weights:** Headings 700 / Body 400 / Captions 300 (light)
**Use:** B2B / enterprise / SaaS briefs — single-family discipline; weight contrast (light/regular/bold) carries hierarchy.

```javascript
const TYPE = { heading: 'IBM Plex Sans', body: 'IBM Plex Sans' };
slide.addText('Pipeline doubled in two quarters', {
  fontFace: 'IBM Plex Sans', fontSize: 36, bold: true,
});
```

---

## Plex Mono Tech

**Headings:** IBM Plex Mono
**Body:** IBM Plex Sans
**Weights:** Headings 600 (semibold) / Body 400
**Use:** Dev-tools / infra / API briefs — monospace headings signal a technical voice; sans body keeps prose readable.

```javascript
const TYPE = { heading: 'IBM Plex Mono', body: 'IBM Plex Sans' };
slide.addText('latency: p99 < 80ms', {
  fontFace: 'IBM Plex Mono', fontSize: 32, bold: true,
});
```

---

## Inter Modern

**Headings:** Inter
**Body:** Inter
**Weights:** Headings 700 / Body 400 / Captions 300
**Use:** SaaS / consumer-tech briefs targeting the "Linear / Stripe / Vercel" register.
**Fallback:** IBM Plex Sans (auto-substitutes if Inter is not user-installed)

```javascript
const TYPE = { heading: 'Inter', body: 'Inter' };
slide.addText('Growth compounds when retention is honest', {
  fontFace: 'Inter', fontSize: 36, bold: true,
});
slide.addText(bodyText, { fontFace: 'Inter', fontSize: 14 });
```

---

## Display + Light

**Headings:** IBM Plex Serif (Display, 700)
**Body:** IBM Plex Sans Light (300)
**Weights:** Headings 700 / Body 300 (light) — high weight contrast
**Use:** Magazine-style / editorial briefs where the headline IS the design. Light body recedes; serif headline dominates.

```javascript
const TYPE = { heading: 'IBM Plex Serif', body: 'IBM Plex Sans Light' };
slide.addText('A new shape for retail logistics', {
  fontFace: 'IBM Plex Serif', fontSize: 54, bold: true,
});
slide.addText(bodyText, {
  fontFace: 'IBM Plex Sans Light', fontSize: 13, color: '#54545A',
});
```

---

## Italic-Led Editorial

**Headings:** IBM Plex Serif Italic
**Body:** IBM Plex Sans
**Weights:** Headings 400 italic / Body 400
**Use:** Op-ed / brand-voice / manifesto briefs — italic headings give a literary, voice-driven feel.

```javascript
const TYPE = { heading: 'IBM Plex Serif', body: 'IBM Plex Sans' };
slide.addText('We bet on patience', {
  fontFace: 'IBM Plex Serif', fontSize: 44, italic: true,
});
```

---

## Mixed-Weight System

**Headings:** IBM Plex Sans (variable weight 200/400/700 within one slide)
**Body:** IBM Plex Sans 400
**Weights:** Multi-weight headings 200 / 400 / 700 within the same headline string
**Use:** Type-led decks where weight contrast across a single phrase encodes hierarchy ("**Growth** that *matters*").

```javascript
const TYPE = { heading: 'IBM Plex Sans', body: 'IBM Plex Sans' };
slide.addText([
  { text: 'Growth ',  options: { fontFace: 'IBM Plex Sans', fontSize: 40, bold: true } },
  { text: 'that ',    options: { fontFace: 'IBM Plex Sans', fontSize: 40, bold: false } },
  { text: 'matters',  options: { fontFace: 'IBM Plex Sans', fontSize: 40, italic: true } },
], { x: 0.5, y: 2.5, w: 9, h: 1.2 });
```

---

## Type-as-Image

**Headings:** IBM Plex Serif (oversized — 88–120pt)
**Body:** IBM Plex Sans (small caption — 11pt)
**Weights:** Headings 700 / Body 400
**Use:** Hero / cover / chapter-break slides where a single oversized word carries the slide and small caption attributes.

```javascript
const TYPE = { heading: 'IBM Plex Serif', body: 'IBM Plex Sans' };
slide.addText('Scale.', {
  fontFace: 'IBM Plex Serif', fontSize: 110, bold: true,
  x: 0.5, y: 1.5, w: 9, h: 3.0,
});
slide.addText('Q3 board meeting · Oct 2026', {
  fontFace: 'IBM Plex Sans', fontSize: 11, x: 0.5, y: 5.0, w: 9, h: 0.3,
});
```

---

## Söhne Premium

**Headings:** Söhne
**Body:** Söhne
**Weights:** Headings 600 / Body 400
**Use:** Premium / brand-led decks where Söhne is the design system standard.
**Fallback:** IBM Plex Sans (auto-substitutes if Söhne is not user-installed)

```javascript
const TYPE = { heading: 'Söhne', body: 'Söhne' };
slide.addText('A premium voice', {
  fontFace: 'Söhne', fontSize: 36, bold: true,
});
slide.addText(bodyText, { fontFace: 'Söhne', fontSize: 13 });
```
