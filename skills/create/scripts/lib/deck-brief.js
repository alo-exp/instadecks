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

// Live E2E Iteration 2 Fix #12: lenient input — accept key_claims/data_points
// strings by auto-promoting to {claim: <string>, slide_idx: 0}. Mutates brief
// in place (idempotent on already-canonical shapes).
function coerceLenientShapes(brief) {
  /* c8 ignore next */ // Defensive: validateBrief checks isPlainObject before calling.
  if (!isPlainObject(brief)) return;
  if (Array.isArray(brief.key_claims)) {
    brief.key_claims = brief.key_claims.map((kc) => {
      if (typeof kc === 'string' && kc.length > 0) {
        return { slide_idx: 0, claim: kc };
      }
      return kc;
    });
  }
  if (Array.isArray(brief.data_points)) {
    brief.data_points = brief.data_points.map((dp) => {
      if (typeof dp === 'string' && dp.length > 0) {
        return { slide_idx: 0, claim: dp };
      }
      return dp;
    });
  }
}

function validateBrief(brief) {
  if (!isPlainObject(brief)) {
    throw new Error('brief: must be object (got ' + JSON.stringify(brief) + ')');
  }
  // Live E2E Iteration 2 Fix #12: lenient-input coercion before validation.
  coerceLenientShapes(brief);

  // Live E2E Iteration 2 Fix #7: batched validation — collect all issues, then
  // throw a single error listing every problem instead of throwing on first.
  const issues = [];

  for (const key of REQUIRED_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(brief, key)) {
      issues.push(`${key}: missing`);
    }
  }
  for (const key of NON_EMPTY_STRING_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(brief, key) &&
        (typeof brief[key] !== 'string' || brief[key].length === 0)) {
      issues.push(`${key}: must be non-empty string (got ${JSON.stringify(brief[key])})`);
    }
  }
  if (Object.prototype.hasOwnProperty.call(brief, 'narrative_arc')) {
    if (!Array.isArray(brief.narrative_arc) || brief.narrative_arc.length === 0) {
      issues.push('narrative_arc: must be non-empty array');
    } else {
      for (let i = 0; i < brief.narrative_arc.length; i++) {
        if (typeof brief.narrative_arc[i] !== 'string' || brief.narrative_arc[i].length === 0) {
          issues.push(`narrative_arc[${i}]: must be non-empty string`);
        }
      }
    }
  }
  if (Object.prototype.hasOwnProperty.call(brief, 'key_claims')) {
    if (!Array.isArray(brief.key_claims)) {
      issues.push('key_claims: must be array');
    } else {
      for (let i = 0; i < brief.key_claims.length; i++) {
        const kc = brief.key_claims[i];
        const where = `key_claims[${i}]`;
        if (!isPlainObject(kc)) {
          issues.push(`${where}: must be object`);
          continue;
        }
        if (!Number.isInteger(kc.slide_idx) || kc.slide_idx < 0) {
          issues.push(`${where}.slide_idx: must be integer (got ${JSON.stringify(kc.slide_idx)})`);
        }
        if (typeof kc.claim !== 'string' || kc.claim.length === 0) {
          issues.push(`${where}.claim: must be non-empty string`);
        }
        if (kc.evidence !== undefined && typeof kc.evidence !== 'string') {
          issues.push(`${where}.evidence: must be string when present`);
        }
        if (kc.source !== undefined && typeof kc.source !== 'string') {
          issues.push(`${where}.source: must be string when present`);
        }
      }
    }
  }
  if (Object.prototype.hasOwnProperty.call(brief, 'asset_hints') &&
      !isPlainObject(brief.asset_hints)) {
    issues.push('asset_hints: must be object');
  }
  if (Object.prototype.hasOwnProperty.call(brief, 'source_files')) {
    if (!Array.isArray(brief.source_files)) {
      issues.push('source_files: must be array');
    } else {
      for (let i = 0; i < brief.source_files.length; i++) {
        if (typeof brief.source_files[i] !== 'string') {
          issues.push(`source_files[${i}]: must be string`);
        }
      }
    }
  }

  if (issues.length > 0) {
    if (issues.length === 1) throw new Error(issues[0]);
    throw new Error(`brief invalid:\n  - ${issues.join('\n  - ')}`);
  }
  return true;
}

module.exports = {
  validateBrief,
  _internal: { REQUIRED_FIELDS, NON_EMPTY_STRING_FIELDS },
};
