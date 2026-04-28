'use strict';
// deck-brief.js — validates DeckBrief shape per Phase 4 D-01.
// Hand-rolled (no ajv/joi/zod). Pinpoint-error format mirrors
// skills/review/scripts/lib/schema-validator.js: `path.to.field: detail (got X)`.
// Pure function: no fs, no clock, no spawn.

const REQUIRED_FIELDS = [
  'topic', 'audience', 'tone',
  'narrative_arc', 'key_claims', 'asset_hints', 'source_files',
];
const NON_EMPTY_STRING_FIELDS = ['topic', 'audience', 'tone'];

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function validateBrief(brief) {
  if (!isPlainObject(brief)) {
    throw new Error('brief: must be object (got ' + JSON.stringify(brief) + ')');
  }
  for (const key of REQUIRED_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(brief, key)) {
      // Special-case topic so the test's /topic: missing/ regex matches.
      throw new Error(`${key}: missing`);
    }
  }
  for (const key of NON_EMPTY_STRING_FIELDS) {
    if (typeof brief[key] !== 'string' || brief[key].length === 0) {
      throw new Error(`${key}: must be non-empty string (got ${JSON.stringify(brief[key])})`);
    }
  }
  if (!Array.isArray(brief.narrative_arc) || brief.narrative_arc.length === 0) {
    throw new Error('narrative_arc: must be non-empty array');
  }
  for (let i = 0; i < brief.narrative_arc.length; i++) {
    if (typeof brief.narrative_arc[i] !== 'string' || brief.narrative_arc[i].length === 0) {
      throw new Error(`narrative_arc[${i}]: must be non-empty string`);
    }
  }
  if (!Array.isArray(brief.key_claims)) {
    throw new Error('key_claims: must be array');
  }
  for (let i = 0; i < brief.key_claims.length; i++) {
    const kc = brief.key_claims[i];
    const where = `key_claims[${i}]`;
    if (!isPlainObject(kc)) {
      throw new Error(`${where}: must be object`);
    }
    if (!Number.isInteger(kc.slide_idx) || kc.slide_idx < 0) {
      throw new Error(`${where}.slide_idx: must be integer (got ${JSON.stringify(kc.slide_idx)})`);
    }
    if (typeof kc.claim !== 'string' || kc.claim.length === 0) {
      throw new Error(`${where}.claim: must be non-empty string`);
    }
    if (kc.evidence !== undefined && typeof kc.evidence !== 'string') {
      throw new Error(`${where}.evidence: must be string when present`);
    }
    if (kc.source !== undefined && typeof kc.source !== 'string') {
      throw new Error(`${where}.source: must be string when present`);
    }
  }
  if (!isPlainObject(brief.asset_hints)) {
    throw new Error('asset_hints: must be object');
  }
  if (!Array.isArray(brief.source_files)) {
    throw new Error('source_files: must be array');
  }
  for (let i = 0; i < brief.source_files.length; i++) {
    if (typeof brief.source_files[i] !== 'string') {
      throw new Error(`source_files[${i}]: must be string`);
    }
  }
  return true;
}

module.exports = {
  validateBrief,
  _internal: { REQUIRED_FIELDS, NON_EMPTY_STRING_FIELDS },
};
