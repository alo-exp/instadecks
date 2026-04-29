'use strict';
// adapter.js — validate findings → filter genuine == true → collapse 4-tier severity to 3-tier.
// Per Phase 2 D-07 (fail-loud, structured errors) and ANNO-05/ANNO-06.
// Severity collapse table sourced from skills/review/references/findings-schema.md §5.
//
// Live-E2E MINOR #1 fix: also exposes readDeckMeta(deckPath) which extracts
// dc:title (deck title) and slide count from a PPTX. The values are forwarded
// onto each sample as sample.deckTitle / sample.deckTotal so annotate.js's
// footer band reflects the user's deck instead of hardcoded "Agentic Disruption · Slide N / 43".

const { execFile } = require('node:child_process');
const path = require('node:path');

const SEV_MAP = { Critical: 'major', Major: 'major', Minor: 'minor', Nitpick: 'polish' };
const VALID_CATEGORY = new Set(['defect', 'improvement', 'style', 'content']);
// Live E2E Iteration 1 — Fix #4: category synonym map.
// Reviewers (/review, /content-review) sometimes emit `polish` (Nitpick-tier
// cosmetic preference) or other near-synonyms for the canonical 4-category
// vocabulary. Mirroring the SEV_MAP 4→3 collapse, the adapter normalizes
// these to canonical categories. Reviewers MAY emit either form; canonical
// vocabulary is enforced only at the adapter boundary (per findings-schema.md).
const CATEGORY_SYNONYMS = { polish: 'style', nit: 'style', cosmetic: 'style' };
function normalizeCategory(c) {
  if (typeof c !== 'string') return c;
  const key = c.toLowerCase();
  return Object.prototype.hasOwnProperty.call(CATEGORY_SYNONYMS, key)
    ? CATEGORY_SYNONYMS[key] : c;
}
const REQUIRED_FINDING_FIELDS = [
  'severity_reviewer', 'category', 'genuine',
  'nx', 'ny', 'text', 'rationale', 'location', 'standard', 'fix',
];
const STRING_FIELDS = ['rationale', 'location', 'standard', 'fix'];

// decodeXmlEntities — decode the 5 XML predefined entities + numeric (decimal &
// hexadecimal) character references. Live-E2E R4 MAJOR R4-1: dc:title in
// docProps/core.xml stores `&` as `&amp;` etc.; without decoding, annotate.js's
// footer band renders literal "&amp;" instead of "&". Hand-rolled decoder
// (no xml-parser dep) — sufficient because we only consume <dc:title> text
// content, which is plain CDATA-like character data.
function decodeXmlEntities(s) {
  /* c8 ignore next */ // Defensive: non-string input guarded — readDeckMeta only invokes with regex-captured strings.
  if (typeof s !== 'string') return s;
  return s
    // Numeric (hex) entities first — order matters since the named-entity sweep
    // would otherwise leave `&#x...;` alone but the regex is anchored so this
    // ordering is purely defensive against future regex changes.
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
      const code = parseInt(hex, 16);
      /* c8 ignore next */ // Defensive: parseInt(<hex regex match>,16) is always finite — falsy branch unreachable.
      return Number.isFinite(code) ? String.fromCodePoint(code) : _;
    })
    .replace(/&#(\d+);/g, (_, dec) => {
      const code = parseInt(dec, 10);
      /* c8 ignore next */ // Defensive: parseInt(<digit regex match>,10) is always finite — falsy branch unreachable.
      return Number.isFinite(code) ? String.fromCodePoint(code) : _;
    })
    // The 5 XML predefined entities. `&amp;` MUST be last so we don't double-
    // decode constructs like `&amp;lt;` (intended literal `&lt;`).
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

// readDeckMeta(deckPath) → { deckTitle, deckTotal }
//
// Extracts dc:title from docProps/core.xml and counts ppt/slides/slideN.xml
// entries via `unzip` (no jszip runtime dep — `unzip` is already used by
// skills/create/scripts/index.js for slide counting and is part of the
// platform deps the SessionStart hook checks). Soft-fails: returns
// { deckTitle: '', deckTotal: 0 } when unzip is missing or fields absent
// so callers can downgrade gracefully to the hardcoded fallback in annotate.js.
function readDeckMeta(deckPath) {
  return new Promise((resolve) => {
    execFile('unzip', ['-p', deckPath, 'docProps/core.xml'], { maxBuffer: 4 * 1024 * 1024 },
      (errCore, coreXml) => {
        let deckTitle = '';
        if (!errCore && typeof coreXml === 'string') {
          // Match <dc:title>...</dc:title> (also tolerate dc: prefix variants).
          const m = coreXml.match(/<dc:title[^>]*>([\s\S]*?)<\/dc:title>/);
          // Live-E2E R4 MAJOR R4-1: core.xml is well-formed XML — entity-decode
          // the captured text so consumers (annotate.js footer) see the literal
          // characters the deck author typed, not the encoded form.
          if (m) deckTitle = decodeXmlEntities(m[1]).trim();
        }
        execFile('unzip', ['-l', deckPath], { maxBuffer: 4 * 1024 * 1024 },
          (errList, listOut) => {
            let deckTotal = 0;
            /* c8 ignore next */ // Defensive: unzip-list failure mirrors create/index.js countSlides path; covered indirectly by integration tests.
            if (!errList && typeof listOut === 'string') {
              /* c8 ignore next */ // Defensive: `|| []` fallback only fires for a deck with zero ppt/slides/* entries (corrupt/empty PPTX); covered by readDeckMeta soft-fail integration tests.
              const matches = listOut.match(/ppt\/slides\/slide\d+\.xml/g) || [];
              deckTotal = new Set(matches).size;
            }
            resolve({ deckTitle, deckTotal });
          });
      });
  });
}

function adaptFindings(doc, deckMeta) {
  if (doc === null || typeof doc !== 'object' || Array.isArray(doc)) {
    throw new Error(`Unsupported findings schema version ${doc && doc.schema_version}. /annotate supports 1.x.`);
  }
  if (typeof doc.schema_version !== 'string' || !/^1\./.test(doc.schema_version)) {
    throw new Error(`Unsupported findings schema version ${doc.schema_version}. /annotate supports 1.x.`);
  }
  if (!Array.isArray(doc.slides)) {
    throw new Error('findings.slides: must be array');
  }

  // Pass 1: validate everything before any transformation (P-09).
  for (let sIdx = 0; sIdx < doc.slides.length; sIdx++) {
    const slide = doc.slides[sIdx];
    if (slide === null || typeof slide !== 'object') {
      throw new Error(`slides[${sIdx}]: must be object`);
    }
    if (!Number.isInteger(slide.slideNum) || slide.slideNum < 1) {
      throw new Error(`slides[${sIdx}].slideNum: must be positive integer`);
    }
    if (typeof slide.title !== 'string') {
      throw new Error(`slides[${sIdx}].title: must be string`);
    }
    if (!Array.isArray(slide.findings)) {
      throw new Error(`slides[${sIdx}].findings: must be array`);
    }
    for (let fIdx = 0; fIdx < slide.findings.length; fIdx++) {
      const f = slide.findings[fIdx];
      const where = `slides[${sIdx}].findings[${fIdx}]`;
      if (f === null || typeof f !== 'object') {
        throw new Error(`${where}: must be object`);
      }
      for (const key of REQUIRED_FINDING_FIELDS) {
        if (!Object.prototype.hasOwnProperty.call(f, key)) {
          throw new Error(`${where} missing required field "${key}"`);
        }
      }
      if (typeof f.severity_reviewer !== 'string') {
        throw new Error(`${where}.severity_reviewer: must be string`);
      }
      if (!(f.severity_reviewer in SEV_MAP)) {
        throw new Error(`${where}.severity_reviewer: ${f.severity_reviewer} not in {Critical,Major,Minor,Nitpick}`);
      }
      if (typeof f.category !== 'string') {
        throw new Error(`${where}.category: ${f.category} not in {defect,improvement,style,content}`);
      }
      // Fix #4: synonym map — normalize before validating. Reviewer-emitted
      // `polish`/`nit`/`cosmetic` collapse to `style`. Mutates `f.category` so
      // downstream consumers (and re-serialized findings) see the canonical
      // form.
      f.category = normalizeCategory(f.category);
      if (!VALID_CATEGORY.has(f.category)) {
        throw new Error(`${where}.category: ${f.category} not in {defect,improvement,style,content}`);
      }
      if (typeof f.genuine !== 'boolean') {
        throw new Error(`${where}.genuine: must be boolean`);
      }
      if (typeof f.nx !== 'number' || Number.isNaN(f.nx) || f.nx < 0 || f.nx > 1) {
        throw new Error(`${where}.nx: must be number in [0,1] (got ${f.nx})`);
      }
      if (typeof f.ny !== 'number' || Number.isNaN(f.ny) || f.ny < 0 || f.ny > 1) {
        throw new Error(`${where}.ny: must be number in [0,1] (got ${f.ny})`);
      }
      if (typeof f.text !== 'string' || f.text.length === 0) {
        throw new Error(`${where}.text: must be non-empty string`);
      }
      for (const key of STRING_FIELDS) {
        if (typeof f[key] !== 'string') {
          throw new Error(`${where}.${key}: must be string`);
        }
      }
    }
  }

  // Pass 2: filter genuine and collapse severity (only after full validation).
  const samples = [];
  for (const slide of doc.slides) {
    const annotations = slide.findings
      .filter((f) => f.genuine === true)
      .map((f) => ({ sev: SEV_MAP[f.severity_reviewer], nx: f.nx, ny: f.ny, text: f.text }));
    if (annotations.length > 0) {
      const sample = { slideNum: slide.slideNum, title: slide.title, annotations };
      if (deckMeta && typeof deckMeta === 'object') {
        if (deckMeta.deckTitle) sample.deckTitle = deckMeta.deckTitle;
        if (typeof deckMeta.deckTotal === 'number' && deckMeta.deckTotal > 0) {
          sample.deckTotal = deckMeta.deckTotal;
        }
      }
      samples.push(sample);
    }
  }
  return samples;
}

module.exports = { adaptFindings, readDeckMeta, decodeXmlEntities, SEV_MAP, normalizeCategory, CATEGORY_SYNONYMS };
