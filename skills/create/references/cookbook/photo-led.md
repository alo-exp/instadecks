# Recipe — Photo-Led

**Slide type:** photo-led
**16:9:** 10″ × 5.625″
**Footer:** page number + source line via `addFooter()`
**Notes:** speaker notes via `slide.addNotes()`

> 3 variants — when the brief carries image references. All variants share `(slide, { title, caption, image, supportingText, pageNum, total, source })`.
> The `image` parameter shape: `{ path?: string, alt: string, label?: string }`. The `path` field is OPTIONAL.

## Image-handling discipline (read first)

Photo-led recipes routinely fail at render-time when agents emit `pres.addImage({ path: ... })` against an unresolvable path. Avoid it. Use this guard at the top of EVERY photo-led variant:

```javascript
function safeAddImage(slide, image, opts) {
  // image: { path?, alt, label? }
  // opts:  { x, y, w, h, ...rest }
  if (image && typeof image.path === 'string' && image.path.length > 0) {
    try {
      // Verify the path resolves before handing to pptxgenjs.
      const fs = require('node:fs');
      if (fs.existsSync(image.path)) {
        slide.addImage({ path: image.path, ...opts });
        return 'image';
      }
    } catch (_) { /* fall through to placeholder */ }
  }
  // Placeholder treatment: bordered rect + alt-text + reference label.
  slide.addShape(pres.shapes.RECTANGLE, {
    x: opts.x, y: opts.y, w: opts.w, h: opts.h,
    fill: { color: PALETTE.accent }, line: { color: PALETTE.muted, width: 1, dashType: 'dash' },
  });
  const alt = image && image.alt ? image.alt : '[image]';
  const label = image && image.label ? image.label : '';
  slide.addText(alt, {
    x: opts.x, y: opts.y + opts.h / 2 - 0.25, w: opts.w, h: 0.5,
    fontFace: TYPE.body, fontSize: 14, italic: true, color: PALETTE.muted,
    align: 'center', valign: 'middle', margin: 0,
  });
  if (label) {
    slide.addText(label, {
      x: opts.x, y: opts.y + opts.h - 0.35, w: opts.w, h: 0.3,
      fontFace: TYPE.body, fontSize: 9, color: PALETTE.muted,
      align: 'center', valign: 'middle', margin: 0,
    });
  }
  return 'placeholder';
}
```

## Variant A: photo-led-A-full-bleed-caption

**Variant ID:** photo-led-A-full-bleed-caption
**Visual:** Full-bleed image (or placeholder) covering the entire slide ground; caption sits in a contrast band along the bottom 1/4. Editorial cover register.

```javascript
function renderPhotoLedA(slide, { title, caption, image, source, pageNum, total }) {
  slide.background = { color: PALETTE.primary };
  // Full-bleed image / placeholder.
  safeAddImage(slide, image, { x: 0, y: 0, w: W, h: H * 0.75, sizing: { type: 'cover', w: W, h: H * 0.75 } });
  // Contrast caption band.
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: H * 0.75, w: W, h: H * 0.25,
    fill: { color: PALETTE.primary }, line: { color: PALETTE.primary, width: 0 },
  });
  slide.addText(title, {
    x: MARGIN_X, y: H * 0.75 + 0.15, w: W - 1.0, h: 0.5,
    fontFace: TYPE.heading, fontSize: 22, bold: true, color: PALETTE.accent,
    align: 'left', valign: 'top', margin: 0,
  });
  if (caption) slide.addText(caption, {
    x: MARGIN_X, y: H * 0.75 + 0.75, w: W - 1.0, h: 0.5,
    fontFace: TYPE.body, fontSize: 13, color: PALETTE.secondary,
    align: 'left', valign: 'top', margin: 0,
  });
  addFooter(slide, { pageNum, total, source });
  slide.addNotes(`Photo-led full-bleed cover.`);
}
```

**When to use:** Cover slides, section openers, hero stats anchored to a single image.
**When NOT to use:** Multi-image grids (use Variant C) or when the image is supporting context (use B).

## Variant B: photo-led-B-side-by-side

**Variant ID:** photo-led-B-side-by-side
**Visual:** Image on the left half (or placeholder), supporting text on the right half. Standard editorial spread — image weight balances copy weight.

```javascript
function renderPhotoLedB(slide, { title, supportingText, image, source, pageNum, total }) {
  slide.background = { color: PALETTE.accent };
  slide.addText(title, {
    x: MARGIN_X, y: TITLE_Y, w: W - 1.0, h: TITLE_H,
    fontFace: TYPE.heading, fontSize: 24, bold: true, color: PALETTE.ink, margin: 0,
  });
  const HALF_W = (W - MARGIN_X * 2 - 0.4) / 2;
  // Left: image / placeholder.
  safeAddImage(slide, image, {
    x: MARGIN_X, y: 1.5, w: HALF_W, h: H - 2.4,
    sizing: { type: 'cover', w: HALF_W, h: H - 2.4 },
  });
  // Right: supporting text bullets / paragraph.
  const RIGHT_X = MARGIN_X + HALF_W + 0.4;
  if (Array.isArray(supportingText)) {
    slide.addText(supportingText.map((s, i) => ({
      text: s, options: { bullet: true, breakLine: i < supportingText.length - 1 },
    })), {
      x: RIGHT_X, y: 1.5, w: HALF_W, h: H - 2.4,
      fontFace: TYPE.body, fontSize: 14, color: PALETTE.ink, paraSpaceAfter: 6, margin: 0, valign: 'top',
    });
  } else if (supportingText) {
    slide.addText(supportingText, {
      x: RIGHT_X, y: 1.5, w: HALF_W, h: H - 2.4,
      fontFace: TYPE.body, fontSize: 14, color: PALETTE.ink, margin: 0, valign: 'top',
    });
  }
  addFooter(slide, { pageNum, total, source });
  slide.addNotes(`Photo-led side-by-side.`);
}
```

**When to use:** Image is supporting evidence for the argument on the right; equal billing.
**When NOT to use:** Cover-style slides (use A) or when 4 thumbnails better convey the variety (use C).

## Variant C: photo-led-C-thumbnail-grid

**Variant ID:** photo-led-C-thumbnail-grid
**Visual:** 2×2 grid of image thumbnails (or placeholders) under a title row. Catalog / case-study register — each thumbnail carries its own label.

```javascript
function renderPhotoLedC(slide, { title, image, supportingText, source, pageNum, total }) {
  // `image` here is an ARRAY of up to 4 image-objects: [{path?, alt, label}, ...]
  slide.background = { color: PALETTE.accent };
  slide.addText(title, {
    x: MARGIN_X, y: TITLE_Y, w: W - 1.0, h: TITLE_H,
    fontFace: TYPE.heading, fontSize: 22, bold: true, color: PALETTE.ink, margin: 0,
  });
  const GRID_TOP = 1.4;
  const GRID_W = W - MARGIN_X * 2;
  const GRID_H = H - GRID_TOP - 0.8;
  const CELL_W = (GRID_W - 0.3) / 2;
  const CELL_H = (GRID_H - 0.3) / 2;
  const slots = [
    { x: MARGIN_X, y: GRID_TOP },
    { x: MARGIN_X + CELL_W + 0.3, y: GRID_TOP },
    { x: MARGIN_X, y: GRID_TOP + CELL_H + 0.3 },
    { x: MARGIN_X + CELL_W + 0.3, y: GRID_TOP + CELL_H + 0.3 },
  ];
  const images = Array.isArray(image) ? image : [];
  for (let i = 0; i < 4; i++) {
    const img = images[i] || { alt: '[empty slot]' };
    const slot = slots[i];
    safeAddImage(slide, img, {
      x: slot.x, y: slot.y, w: CELL_W, h: CELL_H,
      sizing: { type: 'cover', w: CELL_W, h: CELL_H },
    });
  }
  addFooter(slide, { pageNum, total, source });
  slide.addNotes(`Photo-led 2x2 thumbnail grid.`);
}
```

**When to use:** Case-study catalog, before/after pairs (2 cells), product lineup, archive sampler.
**When NOT to use:** Single-hero-image briefs (use A or B).

## DO / DON'T

| ✅ DO | ❌ DON'T |
|---|---|
| Use `safeAddImage` guard for every image — never raw `addImage({path})` | `pres.addImage({ path: '/some/path.jpg' })` without existence check |
| Provide an `alt` string on every image-object so placeholder text reads sensibly | Leave `alt` undefined — placeholder renders bare `[image]` |
| Pass `sizing: { type: 'cover', w, h }` so portrait/landscape images crop cleanly | Leave sizing implicit — pptxgenjs scales with letterbox bands |

## When to use

The brief carries image references (e.g., `asset_hints.images = [{path, alt, label}, ...]`) OR the narrative beat is genuinely visual (cover, hero stat anchored to imagery, case-study catalog). Variants A/B/C cover the three main visual registers; pick by image count and editorial weight.
