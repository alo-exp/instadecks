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
  // Iter6-2: narrative_arc may arrive as an array of beat objects
  // ({slide, purpose, key_messages}) — coerce each to a string so it
  // satisfies validateBrief. Priority: purpose → key_messages.join(' — ')
  // → claim → String(beat).
  if (Array.isArray(out.narrative_arc)) {
    out.narrative_arc = out.narrative_arc.map((beat) => {
      if (typeof beat === 'string') return beat;
      if (beat && typeof beat === 'object') {
        if (typeof beat.purpose === 'string' && beat.purpose.length > 0) return beat.purpose;
        if (Array.isArray(beat.key_messages) && beat.key_messages.length > 0) {
          return beat.key_messages.join(' — ');
        }
        if (typeof beat.claim === 'string' && beat.claim.length > 0) return beat.claim;
      }
      return String(beat);
    });
  }
  // Iter5-1 / Iter6-1: data_points → key_claims when key_claims absent.
  // Strings get auto-assigned 1-indexed slide_idx (Iter6-1 fix — null fails
  // validateBrief integer check). Object entries preserve their slide_idx if
  // present, else fall back to 1-indexed position. Result: natural shape
  // canonicalizes into a fully validateBrief-compliant brief.
  if (
    (out.key_claims === undefined || out.key_claims === null) &&
    Array.isArray(out.data_points)
  ) {
    out.key_claims = out.data_points.map((dp, i) => {
      if (typeof dp === 'string') return { slide_idx: i + 1, claim: dp };
      if (dp && typeof dp === 'object') {
        const slide_idx = Number.isInteger(dp.slide_idx) ? dp.slide_idx : i + 1;
        return { ...dp, slide_idx };
      }
      return dp;
    });
    delete out.data_points;
  }
  // Iter5-1: default missing canonical fields so the natural shape passes
  // validateBrief without forcing callers to hand-fill empties.
  if (out.key_claims === undefined || out.key_claims === null) out.key_claims = [];
  if (out.asset_hints === undefined || out.asset_hints === null) out.asset_hints = {};
  if (out.source_files === undefined || out.source_files === null) out.source_files = [];
  // `purpose` is intentionally retained — flows to agent prompt + rationale.
  return out;
}

// ----- Default extractor -----

async function defaultExtractor(input, shape) {
  if (typeof _llmStub !== 'function') {
    // Live E2E Iteration 1 — Fix #1: clear actionable guidance for cold CLI users.
    // The polymorphic intake (markdown / raw / files) requires an LLM extractor,
    // which only exists when running through Claude Code agent mode (the agent
    // itself IS the LLM). Standalone CLI usage requires canonical JSON.
    const err = new Error(
      `brief-normalizer: no LLM configured for ${shape} brief input.\n\n` +
      'The polymorphic brief intake (--brief-md / --brief-text / --brief-files)\n' +
      'requires an LLM extractor, which is only available when running through\n' +
      'Claude Code agent mode (invoke /instadecks-create — the agent normalizes\n' +
      'the brief in-context).\n\n' +
      'For standalone CLI usage:\n' +
      '  1. Convert your brief to canonical JSON shape: ' +
      '{topic, audience, tone, narrative_arc[], key_claims[], asset_hints, source_files}\n' +
      '  2. Save as brief.json\n' +
      '  3. Run: cli.js --brief brief.json --out-dir .\n\n' +
      'See skills/create/SKILL.md "Brief intake" for the canonical shape.\n' +
      '(Test mode: set INSTADECKS_LLM_STUB or call _test_setLlm(fn) in tests.)'
    );
    throw err;
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
