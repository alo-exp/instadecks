'use strict';
// extract-content.js — PPTX → {slides:[{slideNum,title,bullets,body,notes,sources,slide_type}]}
// Phase 6 Plan 06-01 Task 2 (D-01).
// Reuses skills/review/scripts/lib/read-deck-xml.js::loadSlides (jszip; T-06-01 hardened path filter).
// Pure: no Date.now, no Math.random, no network. Deterministic.

const path = require('node:path');
const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const JSZip = require('jszip');
const { loadSlides } = require('../../../review/scripts/lib/read-deck-xml');

// ---------- decoding helpers ----------
function decodeXmlEntities(s) {
  return String(s)
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(parseInt(n, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, '&');
}

// Extract text inside one <a:p>...</a:p> block by concatenating all <a:t>...</a:t> contents.
function paragraphText(pXml) {
  const out = [];
  const re = /<a:t(?:\s[^>]*)?>([\s\S]*?)<\/a:t>/g;
  let m;
  while ((m = re.exec(pXml)) !== null) {
    out.push(decodeXmlEntities(m[1]));
  }
  return out.join('');
}

// Split a shape's txBody into ordered paragraphs (one entry per <a:p>).
function shapeParagraphs(shapeXml) {
  const paras = [];
  const re = /<a:p(?:\s[^>]*)?>([\s\S]*?)<\/a:p>/g;
  let m;
  while ((m = re.exec(shapeXml)) !== null) {
    const txt = paragraphText(m[1]).trim();
    if (txt.length > 0) paras.push(txt);
  }
  return paras;
}

// Split a slide's xml into shape blocks (each <p:sp>...</p:sp>).
function slideShapes(slideXml) {
  const shapes = [];
  const re = /<p:sp(?:\s[^>]*)?>([\s\S]*?)<\/p:sp>/g;
  let m;
  while ((m = re.exec(slideXml)) !== null) {
    const inner = m[1];
    // detect placeholder type if present (e.g., title)
    const phMatch = inner.match(/<p:ph\b[^>]*\btype="([^"]+)"/);
    const phType = phMatch ? phMatch[1] : null;
    shapes.push({ inner, phType });
  }
  return shapes;
}

function inferSlideType(slideXml, title, slideIndex, totalSlides) {
  const t = String(title || '').trim().toLowerCase();
  if (/^(thank you|q&a|q & a|questions|questions\?)$/i.test(t)) return 'closing';
  // Section divider: layout name often contains 'section' — we don't have layout xml here
  // but pptxgenjs may emit cSld name="Section ..." for section slides. Check:
  if (/<p:cSld\s+name="[^"]*[Ss]ection[^"]*"/.test(slideXml)) return 'section';
  if (slideIndex === 0) return 'title';
  return 'content';
}

async function loadNotes(pptxPath, slideNum) {
  // Notes live in ppt/notesSlides/notesSlideN.xml — N corresponds to slideNum's notes, but the
  // mapping is not always 1:1. We read notesSlide<slideNum>.xml as a best effort.
  try {
    const buf = await fs.readFile(pptxPath);
    const zip = await JSZip.loadAsync(buf);
    const candidate = `ppt/notesSlides/notesSlide${slideNum}.xml`;
    const file = zip.file(candidate);
    if (!file) return '';
    const xml = await file.async('string');
    // notes have <a:t> just like slides; concatenate all
    const texts = [];
    const re = /<a:t(?:\s[^>]*)?>([\s\S]*?)<\/a:t>/g;
    let m;
    while ((m = re.exec(xml)) !== null) texts.push(decodeXmlEntities(m[1]));
    return texts.join(' ').trim();
  /* c8 ignore next 3 */ // Defensive: loadNotes catch fires only on corrupt zip / IO error after the existence check; covered by upstream JSZip tests.
  } catch (_e) {
    return '';
  }
}

async function extractContent(pptxPath) {
  if (!pptxPath || typeof pptxPath !== 'string') {
    throw new Error('extractContent: pptxPath required');
  }
  if (!fsSync.existsSync(pptxPath)) {
    throw new Error(`extractContent: file not found: ${pptxPath}`);
  }
  const rawSlides = await loadSlides(pptxPath);
  const slides = [];
  for (let i = 0; i < rawSlides.length; i++) {
    const { slideNum, xml } = rawSlides[i];
    const shapes = slideShapes(xml);
    // Collect paragraphs per shape
    const shapeParas = shapes.map((s) => ({
      phType: s.phType,
      paragraphs: shapeParagraphs(s.inner),
    })).filter((s) => s.paragraphs.length > 0);

    // Title strategy:
    // 1. If a shape has placeholder type "title" or "ctrTitle", use its first paragraph.
    // 2. Else, the first shape with text contributes title (first paragraph) + remaining paragraphs as bullets.
    let title = '';
    const bullets = [];
    let titleShapeIdx = shapeParas.findIndex(
      (s) => s.phType === 'title' || s.phType === 'ctrTitle'
    );
    if (titleShapeIdx >= 0) {
      const ts = shapeParas[titleShapeIdx];
      /* c8 ignore next */ // Defensive: paragraphs[0] is always truthy by construction (filter on line 110 keeps shapes with paragraphs.length > 0).
      title = ts.paragraphs[0] || '';
      // Remaining paragraphs in title shape (rare) ignored as title overflow
    } else if (shapeParas.length > 0) {
      titleShapeIdx = 0;
      /* c8 ignore next */ // Defensive: paragraphs[0] is always truthy in this branch (shapeParas filter keeps non-empty paragraphs only).
      title = shapeParas[0].paragraphs[0] || '';
      // The rest of paragraphs in shape 0 become bullets too
      for (let k = 1; k < shapeParas[0].paragraphs.length; k++) {
        bullets.push(shapeParas[0].paragraphs[k]);
      }
    }
    // Body bullets: every paragraph from non-title shapes
    for (let s = 0; s < shapeParas.length; s++) {
      if (s === titleShapeIdx) continue;
      for (const p of shapeParas[s].paragraphs) bullets.push(p);
    }

    const body = bullets.join(' ');
    const notes = await loadNotes(pptxPath, slideNum);
    const slide_type = inferSlideType(xml, title, i, rawSlides.length);
    slides.push({
      slideNum,
      title,
      bullets,
      body,
      notes,
      sources: [],
      slide_type,
    });
  }
  return { slides };
}

module.exports = { extractContent, _internal: { shapeParagraphs, paragraphText, slideShapes, inferSlideType } };
