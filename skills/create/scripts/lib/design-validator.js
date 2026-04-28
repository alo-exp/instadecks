'use strict';
// design-validator.js — D-04 palette + typography guardrails.
// Pure function (no fs). Rules:
//   R1-default-blue: palette.primary in {0070C0,1F4E79,2E75B6} without
//                    corporate/blue/finance justification in brief.tone/topic.
//   R2-typography-pinned: {heading,body} pair not present in
//                    designIdeas.typography_pairs.
//   R3-hex-shape: any palette field not exactly 6 hex chars (no leading '#').

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
    if (k === 'name' || k === 'rationale') continue;
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

module.exports = {
  validateDesignChoice,
  _internal: { DEFAULT_BLUE_HEXES, BLUE_OVERRIDE_KEYWORDS, r1DefaultBlue, r2TypographyPinned, r3HexShape },
};
