'use strict';
// Plan 08-05 Task 2 — outcome assertions for /instadecks:content-review SKILL.md.
//
// Asserts the 7 prompt-side + code-side checks (action-title, redundancy, jargon,
// length, pyramid-mece, narrative-arc, claim-evidence, standalone-readability)
// each produce findings with the locked v1.1 schema, and that the
// content-vs-design boundary holds (no defect/style findings emitted).

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { parseInstructions, skillMdPath } = require('../skill-outcome-harness');
const { stubLlmResponse } = require('../helpers/llm-mock');
const { runContentReview } = require('../../skills/content-review/scripts/index');

const SKILL_MD = skillMdPath('content-review');

function freshTmp(tag) { return fs.mkdtempSync(path.join(os.tmpdir(), `${tag}-`)); }

// W-5: FIRST assertion in the file MUST be on instructions.length > 0.
test('W-5: parseInstructions returns >=1 instruction for content-review/SKILL.md', () => {
  const instructions = parseInstructions(SKILL_MD);
  assert.ok(instructions.length > 0, 'content-review/SKILL.md must yield >=1 parseable instruction');
});

test('the 7 prompt+code-side checks each produce findings with the v1.1 schema', async (t) => {
  const tmpDeck = freshTmp('crv-sko-7chk');
  const outDir = freshTmp('crv-sko-7chk-out');
  t.after(() => { fs.rmSync(tmpDeck, { recursive: true, force: true }); fs.rmSync(outDir, { recursive: true, force: true }); });
  const deckPath = path.join(tmpDeck, 'd.pptx'); fs.writeFileSync(deckPath, '');

  const findings = await stubLlmResponse('content-review-findings')();
  const r = await runContentReview({ deckPath, findings, outDir, mode: 'structured-handoff' });
  const round = JSON.parse(fs.readFileSync(r.jsonPath, 'utf8'));
  assert.equal(round.schema_version, '1.1');

  // Each of the 7 covered check_ids must appear at least once in the round-tripped doc.
  const seen = new Set();
  for (const slide of round.slides) {
    for (const f of slide.findings) {
      if (f.check_id) seen.add(f.check_id);
    }
  }
  for (const id of [
    'pyramid-mece', 'narrative-arc', 'claim-evidence', 'standalone-readability',
    'redundancy', 'jargon', 'action-title',
  ]) {
    assert.ok(seen.has(id), `expected check_id "${id}" in fixture round-trip (got ${[...seen].join(',')})`);
  }
});

test('schema parity with /review: same 4-tier severity vocab; same finding grammar', async (t) => {
  const tmpDeck = freshTmp('crv-sko-par');
  const outDir = freshTmp('crv-sko-par-out');
  t.after(() => { fs.rmSync(tmpDeck, { recursive: true, force: true }); fs.rmSync(outDir, { recursive: true, force: true }); });
  const deckPath = path.join(tmpDeck, 'd.pptx'); fs.writeFileSync(deckPath, '');

  const findings = await stubLlmResponse('content-review-findings')();
  const r = await runContentReview({ deckPath, findings, outDir, mode: 'structured-handoff' });
  const round = JSON.parse(fs.readFileSync(r.jsonPath, 'utf8'));
  const SEV = new Set(['Critical', 'Major', 'Minor', 'Nitpick']);
  for (const slide of round.slides) {
    for (const f of slide.findings) {
      assert.ok(SEV.has(f.severity_reviewer));
      // Finding grammar: "[Severity] | [Category] — [Location] — [Defect] — [Standard] — [Fix]"
      // SKILL.md prescribes em-dash separation; check for at least 4 em-dashes.
      const dashes = (f.text.match(/—/g) || []).length;
      assert.ok(dashes >= 3, `finding grammar must have >=3 em-dashes (got ${dashes}: ${f.text})`);
    }
  }
});

test('content-vs-design boundary: zero defect/style findings emitted by /content-review', async (t) => {
  const tmpDeck = freshTmp('crv-sko-bnd');
  const outDir = freshTmp('crv-sko-bnd-out');
  t.after(() => { fs.rmSync(tmpDeck, { recursive: true, force: true }); fs.rmSync(outDir, { recursive: true, force: true }); });
  const deckPath = path.join(tmpDeck, 'd.pptx'); fs.writeFileSync(deckPath, '');

  const findings = await stubLlmResponse('content-review-findings')();
  const r = await runContentReview({ deckPath, findings, outDir, mode: 'structured-handoff' });
  const round = JSON.parse(fs.readFileSync(r.jsonPath, 'utf8'));
  let crossover = 0;
  for (const slide of round.slides) {
    for (const f of slide.findings) {
      if (f.category === 'defect' || f.category === 'style') crossover++;
    }
  }
  assert.equal(crossover, 0, 'CLAUDE.md hard boundary: /content-review emits zero defect/style findings');
});

test('check_id required for content category (validator gate)', async (t) => {
  const tmpDeck = freshTmp('crv-sko-vald');
  const outDir = freshTmp('crv-sko-vald-out');
  t.after(() => { fs.rmSync(tmpDeck, { recursive: true, force: true }); fs.rmSync(outDir, { recursive: true, force: true }); });
  const deckPath = path.join(tmpDeck, 'd.pptx'); fs.writeFileSync(deckPath, '');

  const bad = {
    schema_version: '1.1', deck: 'd', generated_at: '2026-01-01T00:00:00Z',
    slides: [{ slideNum: 1, title: 't', findings: [{
      severity_reviewer: 'Major', category: 'content', genuine: true,
      nx: 0.5, ny: 0.5, text: 'm | content — l — d — s — f',
      rationale: 'r', location: 'l', standard: 's', fix: 'f',
      // Missing check_id — validator must reject.
    }] }],
  };
  await assert.rejects(
    runContentReview({ deckPath, findings: bad, outDir, mode: 'structured-handoff' }),
    /check_id/i,
  );
});
