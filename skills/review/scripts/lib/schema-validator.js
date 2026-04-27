'use strict';
// schema-validator.js — Validates findings documents against findings-schema.md v1.0.
// Hand-rolled per RESEARCH §"Don't Hand-Roll" (no ajv/joi/zod). Throws Error with pinpoint message
// on first violation; format mirrors Phase 2 adapter.js: `slides[i].findings[j].field: detail (got X)`.
// Phase 1/Phase 2 invariant: severity_reviewer keeps the full 4-tier vocabulary (P-01 guard).

const SEVERITIES = new Set(['Critical', 'Major', 'Minor', 'Nitpick']);
const CATEGORIES = new Set(['defect', 'improvement', 'style']);
const REQUIRED_FINDING_FIELDS = [
  'severity_reviewer', 'category', 'genuine',
  'nx', 'ny', 'text', 'rationale', 'location', 'standard', 'fix',
];
const NON_EMPTY_STRING_FIELDS = ['text', 'rationale', 'location', 'standard', 'fix'];

function validate(doc) {
  if (doc === null || typeof doc !== 'object' || Array.isArray(doc)) {
    throw new Error('schema_version: missing (document must be an object)');
  }
  if (typeof doc.schema_version !== 'string' || doc.schema_version.length === 0) {
    throw new Error('schema_version: missing');
  }
  if (!/^1\.\d+$/.test(doc.schema_version)) {
    throw new Error(`schema_version: unsupported "${doc.schema_version}" (validator supports 1.x)`);
  }
  if (typeof doc.deck !== 'string' || doc.deck.length === 0) {
    throw new Error('deck: must be non-empty string');
  }
  if (typeof doc.generated_at !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(doc.generated_at)) {
    throw new Error(`generated_at: must be ISO8601 string (got ${JSON.stringify(doc.generated_at)})`);
  }
  if (!Array.isArray(doc.slides)) {
    throw new Error('slides: must be array');
  }

  for (let sIdx = 0; sIdx < doc.slides.length; sIdx++) {
    const slide = doc.slides[sIdx];
    const sWhere = `slides[${sIdx}]`;
    if (slide === null || typeof slide !== 'object' || Array.isArray(slide)) {
      throw new Error(`${sWhere}: must be object`);
    }
    if (!Number.isInteger(slide.slideNum) || slide.slideNum < 1) {
      throw new Error(`${sWhere}.slideNum: must be positive integer (got ${JSON.stringify(slide.slideNum)})`);
    }
    if (typeof slide.title !== 'string') {
      throw new Error(`${sWhere}.title: must be string`);
    }
    if (!Array.isArray(slide.findings)) {
      throw new Error(`${sWhere}.findings: must be array`);
    }
    for (let fIdx = 0; fIdx < slide.findings.length; fIdx++) {
      const f = slide.findings[fIdx];
      const where = `slides[${sIdx}].findings[${fIdx}]`;
      if (f === null || typeof f !== 'object' || Array.isArray(f)) {
        throw new Error(`${where}: must be object`);
      }
      for (const key of REQUIRED_FINDING_FIELDS) {
        if (!Object.prototype.hasOwnProperty.call(f, key)) {
          throw new Error(`${where}: missing required field "${key}"`);
        }
      }
      if (typeof f.severity_reviewer !== 'string' || !SEVERITIES.has(f.severity_reviewer)) {
        throw new Error(`${where}.severity_reviewer: must be one of {Critical,Major,Minor,Nitpick} (got ${JSON.stringify(f.severity_reviewer)})`);
      }
      if (typeof f.category !== 'string' || !CATEGORIES.has(f.category)) {
        throw new Error(`${where}.category: must be one of {defect,improvement,style} (got ${JSON.stringify(f.category)})`);
      }
      if (typeof f.genuine !== 'boolean') {
        throw new Error(`${where}.genuine: must be boolean (got ${JSON.stringify(f.genuine)})`);
      }
      if (typeof f.nx !== 'number' || Number.isNaN(f.nx) || f.nx < 0 || f.nx > 1) {
        throw new Error(`${where}.nx: must be number in [0,1] (got ${f.nx})`);
      }
      if (typeof f.ny !== 'number' || Number.isNaN(f.ny) || f.ny < 0 || f.ny > 1) {
        throw new Error(`${where}.ny: must be number in [0,1] (got ${f.ny})`);
      }
      for (const key of NON_EMPTY_STRING_FIELDS) {
        if (typeof f[key] !== 'string' || f[key].length === 0) {
          throw new Error(`${where}.${key}: must be non-empty string`);
        }
      }
    }
  }
  return true;
}

module.exports = {
  validate,
  _internal: { SEVERITIES, CATEGORIES, REQUIRED_FINDING_FIELDS },
};
