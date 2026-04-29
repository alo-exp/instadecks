'use strict';
// brief-normalizer.js — Plan 9-04 (DV-06 / DV-07).
//
// Detects which of 4 input shapes a caller passed (`'json' | 'markdown' |
// 'raw' | 'files'`) and normalizes all four into the canonical brief shape
// consumed by runCreate / validateBrief: `{ topic, audience, tone,
// narrative_arc, key_claims, asset_hints, source_files }`.
//
// Markdown / raw / files all flow through an injectable extractor. The
// default extractor calls a project-supplied LLM (set via _test_setLlm in
// tests, or via runCreate's INSTADECKS_LLM_STUB env-var bridge in CI).
// Production callers wire a real LLM here. Pure JS, no external deps.

const fs = require('node:fs');
const path = require('node:path');
const { extractDocText } = require('./extract-doc');

// ----- DI hooks -----

let _extractorOverride = null;
function _test_setExtractor(fn) { _extractorOverride = fn || null; }

let _llmStub = null;
function _test_setLlm(fn) { _llmStub = fn || null; }

// ----- Shape detection -----

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function looksLikeFilesArray(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return false;
  return arr.every(
    (item) =>
      isPlainObject(item) &&
      typeof item.path === 'string' &&
      typeof item.type === 'string',
  );
}

function detectBriefShape(input) {
  // files (most-specific object shape — checked before generic json)
  if (isPlainObject(input) && Array.isArray(input.files)) return 'files';
  if (looksLikeFilesArray(input)) return 'files';
  // json — any other plain object. validateBrief downstream is responsible for
  // catching structural problems (missing topic / audience / narrative_arc).
  // Treating partial objects as 'json' preserves the legacy contract: callers
  // who hand runCreate an object always saw validateBrief errors, never a
  // surprise extractor call.
  if (isPlainObject(input)) return 'json';
  // markdown
  if (typeof input === 'string' && /^#\s+/.test(input)) return 'markdown';
  // raw (string fallthrough, plus null / undefined / other primitives)
  return 'raw';
}

// ----- Canonicalization for json shape -----

function canonicalizeJson(input) {
  const out = { ...input };
  // Common variant aliases — tolerate but normalize.
  if (out.topic === undefined && typeof out.title === 'string') {
    out.topic = out.title;
    delete out.title;
  }
  if (
    (out.narrative_arc === undefined || out.narrative_arc === null) &&
    Array.isArray(out.key_messages)
  ) {
    out.narrative_arc = out.key_messages;
    delete out.key_messages;
  }
  return out;
}

// ----- Default extractor -----

async function defaultExtractor(input, shape) {
  if (typeof _llmStub !== 'function') {
    throw new Error(
      'brief-normalizer: no LLM configured — set _test_setLlm(fn) in tests ' +
        'or wire an LLM accessor before calling normalizeBrief on ' +
        `${shape} input`,
    );
  }
  let payload;
  if (shape === 'files') {
    const files = Array.isArray(input) ? input : input.files;
    const parts = [];
    for (const f of files) {
      const txt = await extractDocText(f);
      parts.push(`--- ${path.basename(f.path)} (${f.type}) ---\n${txt}`);
    }
    payload = parts.join('\n\n');
  } else {
    payload = String(input);
  }
  const prompt =
    'Extract a deck brief in canonical JSON shape with fields: topic, ' +
    'audience, tone, narrative_arc (array of strings), key_claims ' +
    '(array of {slide_idx,claim}), asset_hints (object), source_files ' +
    '(array of strings). Source content follows.\n\n' +
    payload;
  return _llmStub(prompt, { shape });
}

// ----- Public API -----

async function normalizeBrief(input) {
  const shape = detectBriefShape(input);
  let result;
  if (shape === 'json') {
    result = canonicalizeJson(input);
  } else {
    const extractor =
      typeof _extractorOverride === 'function'
        ? _extractorOverride
        : defaultExtractor;
    result = await extractor(input, shape);
  }
  if (!result || typeof result.topic !== 'string' || result.topic.length === 0) {
    throw new Error('brief-normalizer: missing required field "topic"');
  }
  return result;
}

module.exports = {
  normalizeBrief,
  detectBriefShape,
  _test_setExtractor,
  _test_setLlm,
};
