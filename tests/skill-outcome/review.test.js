'use strict';
// Plan 08-05 Task 2 — outcome assertions for /instadecks:review SKILL.md instructions.
//
// Per CONTEXT D-05: each instruction in review/SKILL.md is a unit. Mock the LLM,
// drive runReview, assert deterministic OUTCOMES (schema shape, severity values,
// schema-version routing, R18 AI-tell flags, two-mode behaviour).

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { parseInstructions, skillMdPath, runInstruction } = require('../skill-outcome-harness');
const { stubLlmResponse } = require('../helpers/llm-mock');
const { runReview, _test_setLlm } = require('../../skills/review/scripts/index');

const SKILL_MD = skillMdPath('review');

function freshTmp(tag) { return fs.mkdtempSync(path.join(os.tmpdir(), `${tag}-`)); }

// W-5: FIRST assertion in the file MUST be on instructions.length > 0.
test('W-5: parseInstructions returns >=1 instruction for review/SKILL.md', () => {
  const instructions = parseInstructions(SKILL_MD);
  assert.ok(instructions.length > 0, 'review/SKILL.md must yield >=1 parseable instruction');
});

test('schema v1.0 emission: every required field present, severity in 4-tier set', async (t) => {
  const tmpDeck = freshTmp('rvw-sko-v10');
  const outDir = freshTmp('rvw-sko-v10-out');
  t.after(() => { fs.rmSync(tmpDeck, { recursive: true, force: true }); fs.rmSync(outDir, { recursive: true, force: true }); });
  const deckPath = path.join(tmpDeck, 'd.pptx'); fs.writeFileSync(deckPath, '');

  const findings = await stubLlmResponse('review-design-findings')();
  const r = await runReview({ deckPath, findings, outDir, mode: 'structured-handoff' });
  const round = JSON.parse(fs.readFileSync(r.jsonPath, 'utf8'));
  assert.equal(round.schema_version, '1.0');
  const SEV = new Set(['Critical', 'Major', 'Minor', 'Nitpick']);
  for (const slide of round.slides) {
    for (const f of slide.findings) {
      assert.ok(SEV.has(f.severity_reviewer), `severity_reviewer must be 4-tier (got ${f.severity_reviewer})`);
      for (const k of ['nx', 'ny', 'text', 'rationale', 'location', 'standard', 'fix']) {
        assert.ok(k in f, `required field ${k} missing`);
      }
    }
  }
  assert.equal(typeof r.findingCounts.critical, 'number');
  assert.equal(typeof r.findingCounts.major, 'number');
  assert.equal(typeof r.findingCounts.minor, 'number');
  assert.equal(typeof r.findingCounts.nitpick, 'number');
});

test('schema v1.1 emission: routing branch exercised; check_id required for content', async (t) => {
  const tmpDeck = freshTmp('rvw-sko-v11');
  const outDir = freshTmp('rvw-sko-v11-out');
  t.after(() => { fs.rmSync(tmpDeck, { recursive: true, force: true }); fs.rmSync(outDir, { recursive: true, force: true }); });
  const deckPath = path.join(tmpDeck, 'd.pptx'); fs.writeFileSync(deckPath, '');

  const findings = await stubLlmResponse('review-design-v11')();
  const r = await runReview({ deckPath, findings, outDir, mode: 'structured-handoff' });
  const round = JSON.parse(fs.readFileSync(r.jsonPath, 'utf8'));
  assert.equal(round.schema_version, '1.1');
  // v1.1 still allows non-content findings (the v11 fixture uses category=style).
  for (const slide of round.slides) {
    for (const f of slide.findings) {
      if (f.category === 'content') {
        assert.ok(typeof f.check_id === 'string' && f.check_id.length > 0,
          'v1.1 content findings must carry check_id');
      }
    }
  }
});

test('R18 AI-tell flags: r18_ai_tell preserved through round-trip with category style', async (t) => {
  const tmpDeck = freshTmp('rvw-sko-r18');
  const outDir = freshTmp('rvw-sko-r18-out');
  t.after(() => { fs.rmSync(tmpDeck, { recursive: true, force: true }); fs.rmSync(outDir, { recursive: true, force: true }); });
  const deckPath = path.join(tmpDeck, 'd.pptx'); fs.writeFileSync(deckPath, '');

  const findings = await stubLlmResponse('review-design-findings')();
  const r = await runReview({ deckPath, findings, outDir, mode: 'structured-handoff' });
  const round = JSON.parse(fs.readFileSync(r.jsonPath, 'utf8'));
  let r18Count = 0;
  for (const slide of round.slides) {
    for (const f of slide.findings) {
      if (f.r18_ai_tell === true) {
        r18Count++;
        assert.equal(f.category, 'style', 'R18 AI-tell findings must carry category=style per SKILL.md');
        assert.ok(typeof f.nx === 'number' && typeof f.ny === 'number',
          'AI-tell findings carry nx/ny coords for annotate adapter');
      }
    }
  }
  assert.ok(r18Count >= 1, 'fixture must seed at least one r18_ai_tell finding');
});

test('structured-handoff mode: deck-spec in, JSON out, no narrative MD written by orchestrator', async (t) => {
  const tmpDeck = freshTmp('rvw-sko-sh');
  const outDir = freshTmp('rvw-sko-sh-out');
  t.after(() => { fs.rmSync(tmpDeck, { recursive: true, force: true }); fs.rmSync(outDir, { recursive: true, force: true }); });
  const deckPath = path.join(tmpDeck, 'd.pptx'); fs.writeFileSync(deckPath, '');

  const findings = await stubLlmResponse('review-design-findings')();
  const r = await runReview({ deckPath, findings, outDir, mode: 'structured-handoff' });
  // SKILL.md two-report architecture: orchestrator returns narrativePath but doesn't write it.
  assert.ok(typeof r.narrativePath === 'string');
  assert.equal(fs.existsSync(r.narrativePath), false, 'narrative MD is agent-authored post-call, not by runReview');
  // jsonPath + mdPath must be written.
  assert.equal(fs.existsSync(r.jsonPath), true);
  assert.equal(fs.existsSync(r.mdPath), true);
});

test('file-roundtrip: jsonPath round-trips identical schema + slidesToReview filter respected', async (t) => {
  const tmpDeck = freshTmp('rvw-sko-rt');
  const outDir = freshTmp('rvw-sko-rt-out');
  t.after(() => { fs.rmSync(tmpDeck, { recursive: true, force: true }); fs.rmSync(outDir, { recursive: true, force: true }); });
  const deckPath = path.join(tmpDeck, 'd.pptx'); fs.writeFileSync(deckPath, '');

  // Construct multi-slide fixture so the filter is observable.
  const fx = await stubLlmResponse('review-design-findings')();
  fx.slides.push({ slideNum: 99, title: 'out-of-scope', findings: [] });
  const r = await runReview({ deckPath, findings: fx, outDir, mode: 'structured-handoff', slidesToReview: [1] });
  const round = JSON.parse(fs.readFileSync(r.jsonPath, 'utf8'));
  // slidesToReview=[1] filters slide 99 out per Phase 5 D-03.
  assert.deepStrictEqual(round.slides.map(s => s.slideNum), [1]);
});

test('harness runInstruction: dispatches to runReview via DI llmStub', async (t) => {
  const tmpDeck = freshTmp('rvw-sko-disp');
  t.after(() => { fs.rmSync(tmpDeck, { recursive: true, force: true }); });
  const deckPath = path.join(tmpDeck, 'd.pptx'); fs.writeFileSync(deckPath, '');
  const result = await runInstruction('review', 0, stubLlmResponse('review-design-findings'),
    { deckPath, mode: 'structured-handoff' });
  assert.ok(result.jsonPath && fs.existsSync(result.jsonPath));
  // Cleanup the harness-allocated outDir.
  t.after(() => { try { fs.rmSync(result.runDir, { recursive: true, force: true }); } catch {} });
  // Reset LLM hook so other tests aren't polluted.
  _test_setLlm(null);
});
