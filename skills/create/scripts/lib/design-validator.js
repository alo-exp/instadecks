'use strict';
// design-validator.js — D-04 palette + typography guardrails (legacy structured API)
// PLUS Plan 09-05 palette-aware render-source validator.
//
// Legacy rules (preserved, structured-input API: validateDesignChoice):
//   R1-default-blue: palette.primary in {0070C0,1F4E79,2E75B6} without
//                    corporate/blue/finance justification in brief.tone/topic.
//   R2-typography-pinned: {heading,body} pair not present in
//                    designIdeas.typography_pairs.
//   R3-hex-shape: any palette field not exactly 6 hex chars (no leading '#').
//
// Plan 09-05 rules (new, render-source string API: validateRenderSource):
//   - Module reads `references/palettes.md` at init; builds RECOGNIZED_PALETTES
//     (Map<name, {bg,primary,...}>) and RECOGNIZED_HEX (Set of all hex values).
//   - default-calibri: render uses fontFace: 'Calibri'
//   - office-blue: '#0070C0' is the only non-default accent and no other
//     RECOGNIZED_HEX values (beyond bg/ink) appear in the render
//   - stock-placeholder: filenames matching /(stock|placeholder|sample|untitled|img\d+)/i
//   - diversity-violation: ≥3 slides share the same `// VARIANT: <id>` marker
//   - asymmetric-layout: REMOVED (legitimate per CONTEXT D-07)
//   - saturated-primary / non-default-blue: SKIPPED when offending hex ∈ RECOGNIZED_HEX

const fs = require('node:fs');
const path = require('node:path');

// --- Legacy structured-input API (unchanged) -----------------------------

const DEFAULT_BLUE_HEXES = new Set(['0070C0', '1F4E79', '2E75B6']);
const BLUE_OVERRIDE_KEYWORDS = ['corporate', 'blue', 'finance'];
const HEX6 = /^[0-9A-Fa-f]{6}$/;

function r1DefaultBlue(palette, brief) {
  const primary = String(palette && palette.primary || '').toUpperCase();
  if (!DEFAULT_BLUE_HEXES.has(primary)) return null;
  const hay = `${(brief && brief.tone) || ''} ${(brief && brief.topic) || ''}`.toLowerCase();
  const hasJustification = BLUE_OVERRIDE_KEYWORDS.some(k => hay.includes(k));
  if (hasJustification) return null;
  return {
    rule: 'R1-default-blue',
    message: `palette.primary "${primary}" is in the default-blue anti-tell set (R18); brief tone/topic does not include corporate/blue/finance justification`,
  };
}

function r2TypographyPinned(typography, designIdeas) {
  const pairs = (designIdeas && Array.isArray(designIdeas.typography_pairs))
    ? designIdeas.typography_pairs : [];
  const heading = typography && typography.heading;
  const body = typography && typography.body;
  if (!heading || !body) {
    return {
      rule: 'R2-typography-pinned',
      message: 'typography must include heading and body fonts',
    };
  }
  const found = pairs.some(p => p.heading === heading && p.body === body);
  if (found) return null;
  return {
    rule: 'R2-typography-pinned',
    message: `typography pair {heading:"${heading}", body:"${body}"} not in pinned designIdeas.typography_pairs`,
  };
}

function r3HexShape(palette) {
  const out = [];
  if (!palette || typeof palette !== 'object') {
    return [{ rule: 'R3-hex-shape', message: 'palette must be object' }];
  }
  for (const [k, v] of Object.entries(palette)) {
    if (k === 'name' || k === 'rationale' || k === 'tone_tags') continue;
    if (typeof v !== 'string' || !HEX6.test(v)) {
      out.push({
        rule: 'R3-hex-shape',
        message: `palette.${k} must be 6 hex chars without leading '#' (got ${JSON.stringify(v)})`,
      });
    }
  }
  return out;
}

function validateDesignChoice({ palette, typography, brief, designIdeas } = {}) {
  const violations = [];
  const v1 = r1DefaultBlue(palette || {}, brief || {});
  if (v1) violations.push(v1);
  const v2 = r2TypographyPinned(typography || {}, designIdeas || {});
  if (v2) violations.push(v2);
  for (const v of r3HexShape(palette || {})) violations.push(v);
  return { ok: violations.length === 0, violations };
}

// --- Plan 09-05: palette-aware render-source validator -------------------

const PALETTES_MD_PATH = path.join(__dirname, '..', '..', 'references', 'palettes.md');

function buildPaletteRegistry(palettesText) {
  // Parse `## <Name>` H2 boundaries; within each block, parse `| role | \`#RRGGBB\` |` rows.
  const palettes = new Map();
  const allHex = new Set();
  const sections = palettesText.split(/^## /m).slice(1); // drop preamble
  for (const section of sections) {
    const nameMatch = section.match(/^([^\n]+)\n/);
    if (!nameMatch) continue;
    const name = nameMatch[1].trim();
    const roles = {};
    const rowRe = /\|\s*(bg|primary|secondary|accent|ink|muted)\s*\|\s*`#([0-9A-Fa-f]{6})`\s*\|/g;
    let m;
    while ((m = rowRe.exec(section)) !== null) {
      const role = m[1];
      const hex = m[2].toUpperCase();
      roles[role] = hex;
      allHex.add(hex);
    }
    if (Object.keys(roles).length > 0) {
      palettes.set(name, roles);
    }
  }
  return { palettes, allHex };
}

const _palettesText = fs.readFileSync(PALETTES_MD_PATH, 'utf8');
const { palettes: RECOGNIZED_PALETTES, allHex: RECOGNIZED_HEX } = buildPaletteRegistry(_palettesText);

const STOCK_RE = /(stock|placeholder|sample|untitled|img\d+)/i;
const VARIANT_RE = /\/\/\s*VARIANT:\s*([A-Za-z0-9_-]+)/g;
const HEX_LITERAL_RE = /#?([0-9A-Fa-f]{6})\b/g;
const OFFICE_BLUE = '0070C0';

function extractVariantMarkers(src) {
  const markers = [];
  let m;
  VARIANT_RE.lastIndex = 0;
  while ((m = VARIANT_RE.exec(src)) !== null) {
    markers.push(m[1]);
  }
  return markers;
}

function extractHexValues(src) {
  const found = new Set();
  let m;
  HEX_LITERAL_RE.lastIndex = 0;
  while ((m = HEX_LITERAL_RE.exec(src)) !== null) {
    found.add(m[1].toUpperCase());
  }
  return found;
}

function checkDefaultCalibri(src) {
  if (/fontFace\s*:\s*['"]Calibri['"]/i.test(src)) {
    return { id: 'default-calibri', severity: 'major', message: 'default Calibri fontFace detected — pick a recognized type pair' };
  }
  return null;
}

function checkOfficeBlue(src, hexes) {
  if (!hexes.has(OFFICE_BLUE)) return null;
  // Office-blue is fine if any OTHER recognized-palette hex is also present in the render.
  for (const hex of hexes) {
    if (hex === OFFICE_BLUE) continue;
    if (RECOGNIZED_HEX.has(hex)) return null;
  }
  return { id: 'office-blue', severity: 'major', message: 'Office-blue (#0070C0) is the only accent — pick a curated palette from palettes.md' };
}

function checkStockPlaceholder(src) {
  // Look for filenames in addImage path strings or similar.
  const re = /['"]([^'"\s]*?(?:stock|placeholder|sample|untitled|img\d+)[^'"\s]*?)['"]/i;
  const m = re.exec(src);
  if (m) {
    return { id: 'stock-placeholder', severity: 'major', message: `generic stock-photo placeholder filename "${m[1]}"` };
  }
  return null;
}

function checkDiversityViolation(markers) {
  if (markers.length === 0) return null;
  const indexByVariant = new Map();
  markers.forEach((id, i) => {
    if (!indexByVariant.has(id)) indexByVariant.set(id, []);
    indexByVariant.get(id).push(i);
  });
  for (const [id, slides] of indexByVariant) {
    if (slides.length >= 3) {
      return {
        id: 'diversity-violation',
        severity: 'major',
        message: `Variant ${id} used ${slides.length} times — vary the layout (max 2 per deck)`,
        slides,
      };
    }
  }
  return null;
}

function validateRenderSource(src) {
  const findings = [];
  const hexes = extractHexValues(src);
  const markers = extractVariantMarkers(src);

  const f1 = checkDefaultCalibri(src);
  if (f1) findings.push(f1);
  const f2 = checkOfficeBlue(src, hexes);
  if (f2) findings.push(f2);
  const f3 = checkStockPlaceholder(src);
  if (f3) findings.push(f3);
  const f4 = checkDiversityViolation(markers);
  if (f4) findings.push(f4);

  return { ok: findings.length === 0, findings };
}

// Live E2E Iteration 2 Fix #3: helper for mechanical pickers reading
// design-ideas.json. Returns the first palette whose tone_tags intersect with
// any keyword in toneKeywords; if none match, returns the seeded fallback.
// Pure function — no I/O. designIdeas.palettes shape: [{name, ..., tone_tags}].
//
// Live E2E Iter4-3: optional `opts.excludeNames` (Set/Array of palette names
// already used by recent runs — the diversity audit). When the diversity
// audit excludes ALL tone-matching palettes, we RELAX the diversity audit
// (allow reuse, set `relaxed:'diversity'`) BEFORE relaxing tone-fit. The
// deck looking right matters more than novelty (tone-fit > diversity-audit).
//
// Backwards-compatible call signature: pickPaletteByTone(ideas, tags, seed).
// New: pickPaletteByTone(ideas, tags, seed, { excludeNames }) and an
// alternate object form pickPaletteByTone(ideas, tags, { seed, excludeNames,
// returnMeta }). When `returnMeta:true` the function returns
// { palette, relaxed } instead of just the palette object — used by callers
// that want to surface the diversity-relaxation warning.
function pickPaletteByTone(designIdeas, toneKeywords, seedOrOpts = 0, opts) {
  // Normalize args: support 3-arg legacy (seed) and 4-arg with opts object.
  let seed = 0;
  let excludeNames = null;
  let returnMeta = false;
  if (typeof seedOrOpts === 'number') {
    seed = seedOrOpts;
    if (opts && typeof opts === 'object') {
      excludeNames = opts.excludeNames || null;
      returnMeta = !!opts.returnMeta;
    }
  } else if (seedOrOpts && typeof seedOrOpts === 'object') {
    seed = Number.isFinite(seedOrOpts.seed) ? seedOrOpts.seed : 0;
    excludeNames = seedOrOpts.excludeNames || null;
    returnMeta = !!seedOrOpts.returnMeta;
  }

  const palettes = (designIdeas && Array.isArray(designIdeas.palettes))
    ? designIdeas.palettes : [];
  if (palettes.length === 0) return returnMeta ? { palette: null, relaxed: null } : null;

  const wanted = new Set((toneKeywords || []).map(s => String(s).toLowerCase()));
  const excluded = new Set(
    (Array.isArray(excludeNames) ? excludeNames
     : excludeNames instanceof Set ? Array.from(excludeNames)
     : []).map(s => String(s)));

  const matches = (p) => {
    if (wanted.size === 0) return false;
    const tags = Array.isArray(p && p.tone_tags) ? p.tone_tags : [];
    return tags.some(t => wanted.has(String(t).toLowerCase()));
  };

  // Pass 1: tone-fit AND not excluded by diversity audit.
  if (wanted.size > 0) {
    for (let i = 0; i < palettes.length; i++) {
      const idx = (seed + i) % palettes.length;
      const p = palettes[idx];
      if (matches(p) && !excluded.has(p.name)) {
        return returnMeta ? { palette: p, relaxed: null } : p;
      }
    }
    // Pass 2: tone-fit wins over diversity. Relax diversity exclusion;
    // accept a tone-matching palette even if it was recently used.
    for (let i = 0; i < palettes.length; i++) {
      const idx = (seed + i) % palettes.length;
      const p = palettes[idx];
      if (matches(p)) {
        return returnMeta ? { palette: p, relaxed: 'diversity' } : p;
      }
    }
  }

  // Pass 3: no tone keywords or no tone-match anywhere — seeded fallback,
  // honoring excludeNames if any non-excluded palette is available.
  for (let i = 0; i < palettes.length; i++) {
    const idx = (seed + i) % palettes.length;
    const p = palettes[idx];
    if (!excluded.has(p.name)) {
      return returnMeta ? { palette: p, relaxed: null } : p;
    }
  }
  // All excluded — return seeded fallback with relaxed flag.
  const p = palettes[seed % palettes.length];
  return returnMeta ? { palette: p, relaxed: 'diversity' } : p;
}

module.exports = {
  validateDesignChoice,
  validateRenderSource,
  pickPaletteByTone,
  _internal: {
    DEFAULT_BLUE_HEXES,
    BLUE_OVERRIDE_KEYWORDS,
    r1DefaultBlue,
    r2TypographyPinned,
    r3HexShape,
    RECOGNIZED_HEX,
    RECOGNIZED_PALETTES,
    buildPaletteRegistry,
    checkDefaultCalibri,
    checkOfficeBlue,
    checkStockPlaceholder,
    checkDiversityViolation,
    extractVariantMarkers,
    extractHexValues,
  },
};
