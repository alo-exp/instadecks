'use strict';
// adapter.js — validate findings → filter genuine == true → collapse 4-tier severity to 3-tier.
// Per Phase 2 D-07 (fail-loud, structured errors) and ANNO-05/ANNO-06.
// Severity collapse table sourced from skills/review/references/findings-schema.md §5.

const SEV_MAP = { Critical: 'major', Major: 'major', Minor: 'minor', Nitpick: 'polish' };
const VALID_CATEGORY = new Set(['defect', 'improvement', 'style', 'content']);
const REQUIRED_FINDING_FIELDS = [
  'severity_reviewer', 'category', 'genuine',
  'nx', 'ny', 'text', 'rationale', 'location', 'standard', 'fix',
];
const STRING_FIELDS = ['rationale', 'location', 'standard', 'fix'];

function adaptFindings(doc) {
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
      if (typeof f.category !== 'string' || !VALID_CATEGORY.has(f.category)) {
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
      samples.push({ slideNum: slide.slideNum, title: slide.title, annotations });
    }
  }
  return samples;
}

module.exports = { adaptFindings, SEV_MAP };
