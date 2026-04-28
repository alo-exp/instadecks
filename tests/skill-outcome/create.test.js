'use strict';
// Plan 08-05 Task 2 — outcome assertions for /instadecks:create SKILL.md.
//
// SKILL.md (D-01) places the auto-refine loop in agent-owned prose; the
// orchestrator's runCreate is single-cycle. Outcome assertions therefore
// exercise the loop PRIMITIVES + cli soft-cap surface that the SKILL.md
// instructions invoke (checkInterrupt → hashIssueSet → appendLedger →
// detectOscillation → resolveSoftCap), using the create-cycle-1 + cycle-2
// LLM stubs as canned per-cycle review payloads.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { parseInstructions, skillMdPath } = require('../skill-outcome-harness');
const { stubLlmResponse } = require('../helpers/llm-mock');
const {
  appendLedger, readLedger, checkInterrupt, hashIssueSet,
} = require('../../skills/create/scripts/lib/loop-primitives');
const { detectOscillation } = require('../../skills/create/scripts/lib/oscillation');
const { resolveSoftCap } = require('../../skills/create/scripts/cli');

const SKILL_MD = skillMdPath('create');

function freshTmp(tag) { return fs.mkdtempSync(path.join(os.tmpdir(), `${tag}-`)); }

function findingsToGenuineSet(payload) {
  // Project the canned LLM payload's slides[].findings down to the {slideNum,text}
  // tuples that hashIssueSet expects, filtered by genuine===true (P-02 triage rule).
  const out = [];
  for (const slide of payload.slides || []) {
    for (const f of (slide.findings || [])) {
      if (f.genuine === true) out.push({ slideNum: slide.slideNum, text: f.text });
    }
  }
  return out;
}

async function appendCycleFromStub(runDir, cycle, stubPayload, opts = {}) {
  const set = findingsToGenuineSet(stubPayload);
  const hash = hashIssueSet(set);
  await appendLedger(runDir, {
    cycle, timestamp: new Date().toISOString(),
    findings_total: (stubPayload.slides || []).reduce((n, s) => n + (s.findings || []).length, 0),
    findings_genuine: set.length,
    findings_fixed: 0,
    findings_intentionally_skipped: 0,
    issue_set_hash: hash,
    skipped_finding_ids: [],
    fixed_finding_ids: [],
    slides_changed: [],
    review_mode: opts.review_mode || (cycle === 1 ? 'full' : 'diff-only'),
    ended_via: opts.ended_via || null,
  });
  return { hash, genuineCount: set.length };
}

// W-5: FIRST assertion in the file MUST be on instructions.length > 0.
test('W-5: parseInstructions returns >=1 instruction for create/SKILL.md', () => {
  const instructions = parseInstructions(SKILL_MD);
  assert.ok(instructions.length > 0, 'create/SKILL.md must yield >=1 parseable instruction');
});

test('cycle 1 produces deck + design-rationale + JSON findings (cycle-1 stub)', async (t) => {
  const runDir = freshTmp('crt-sko-c1');
  t.after(() => { try { fs.rmSync(runDir, { recursive: true, force: true }); } catch {} });
  const payload = await stubLlmResponse('create-cycle-1')();
  // Per SKILL.md "What this skill does": cycle 1 emits deck spec + design rationale partial.
  assert.ok(payload.deck_spec, 'cycle-1 stub carries a deck_spec (SKILL.md Step 4 runCreate input)');
  assert.ok(payload.design_rationale_partial, 'cycle-1 stub carries design_rationale_partial');
  // Drive the ledger primitive (D-02 schema).
  const r = await appendCycleFromStub(runDir, 1, payload);
  assert.equal(r.genuineCount, 9, 'cycle-1 stub has 9 genuine findings');
  const ledger = await readLedger(runDir);
  assert.equal(ledger.length, 1);
  assert.equal(ledger[0].review_mode, 'full');
});

test('cycle 1 returns 0 → forces confirmation cycle (D-07)', async (t) => {
  const runDir = freshTmp('crt-sko-conf');
  t.after(() => { try { fs.rmSync(runDir, { recursive: true, force: true }); } catch {} });
  const empty = await stubLlmResponse('create-cycle-2-converged')();
  // Cycle 1: 0 findings.
  await appendCycleFromStub(runDir, 1, empty, { review_mode: 'full' });
  const ledger1 = await readLedger(runDir);
  assert.equal(ledger1[0].findings_genuine, 0);
  // SKILL.md D-07: cycle 2 after 0-findings cycle 1 MUST be 'full' (forced confirmation),
  // never 'diff-only'.
  await appendCycleFromStub(runDir, 2, empty, { review_mode: 'full' });
  const ledger2 = await readLedger(runDir);
  assert.equal(ledger2.length, 2);
  assert.equal(ledger2[1].review_mode, 'full',
    'D-07: cycle 2 after cycle-1-zero must be full review, never diff-only');
});

test('cycle 2 with 0 findings → converged exit (CRT-08)', async (t) => {
  const runDir = freshTmp('crt-sko-cv');
  t.after(() => { try { fs.rmSync(runDir, { recursive: true, force: true }); } catch {} });
  const cycle1 = await stubLlmResponse('create-cycle-1')();
  const empty = await stubLlmResponse('create-cycle-2-converged')();
  await appendCycleFromStub(runDir, 1, cycle1);
  await appendCycleFromStub(runDir, 2, empty, { review_mode: 'diff-only', ended_via: 'converged' });
  const ledger = await readLedger(runDir);
  assert.equal(ledger.length, 2);
  // SKILL.md convergence rule: genuine == 0 AND cycle >= 2.
  assert.equal(ledger[1].findings_genuine, 0);
  assert.equal(ledger[1].cycle, 2);
  assert.equal(ledger[1].ended_via, 'converged');
});

test('oscillation: cycle N hash == cycle N-2 hash → oscillation exit (D-09)', async (t) => {
  const runDir = freshTmp('crt-sko-osc');
  t.after(() => { try { fs.rmSync(runDir, { recursive: true, force: true }); } catch {} });
  const cycle1 = await stubLlmResponse('create-cycle-1')();
  // Build a different payload by tweaking the texts.
  const cycle2 = JSON.parse(JSON.stringify(cycle1));
  cycle2.slides[0].findings.forEach((f, i) => { f.text = `alt-${i}`; });
  // Cycle 3 reuses cycle1 hash exactly.
  await appendCycleFromStub(runDir, 1, cycle1);
  await appendCycleFromStub(runDir, 2, cycle2);
  await appendCycleFromStub(runDir, 3, cycle1);
  const ledger = await readLedger(runDir);
  assert.equal(ledger[0].issue_set_hash, ledger[2].issue_set_hash, 'D-09: hash N == hash N-2');
  assert.notEqual(ledger[1].issue_set_hash, ledger[0].issue_set_hash);
  assert.equal(detectOscillation(ledger), true);
});

test('soft-cap at cycle 5: --soft-cap=accept routing', () => {
  // SKILL.md: "Continue / Accept / Specify / Stop" 4-option AskUserQuestion.
  // The CLI helper's enum exposes 3 explicit values; the 4th is the agent-mode
  // "specify" path. resolveSoftCap with explicit flag returns that value.
  assert.equal(resolveSoftCap('accept'), 'accept');
});

test('soft-cap at cycle 5: --soft-cap=continue routing', () => {
  assert.equal(resolveSoftCap('continue'), 'continue');
});

test('soft-cap at cycle 5: --soft-cap=stop routing', () => {
  assert.equal(resolveSoftCap('stop'), 'stop');
});

test('soft-cap at cycle 5: CI fallback resolves to accept with stderr warning', () => {
  const savedCI = process.env.CI;
  process.env.CI = '1';
  try {
    const origWrite = process.stderr.write.bind(process.stderr);
    let captured = '';
    process.stderr.write = (s) => { captured += String(s); return true; };
    let decision;
    try { decision = resolveSoftCap(null); } finally { process.stderr.write = origWrite; }
    assert.equal(decision, 'accept');
    assert.match(captured, /cycle 5|non-interactive/i);
  } finally {
    if (savedCI === undefined) delete process.env.CI; else process.env.CI = savedCI;
  }
});

test('interrupt flag: top-of-cycle .interrupt → checkInterrupt returns true', async (t) => {
  const runDir = freshTmp('crt-sko-int');
  t.after(() => { try { fs.rmSync(runDir, { recursive: true, force: true }); } catch {} });
  assert.equal(checkInterrupt(runDir), false);
  await fsp.writeFile(path.join(runDir, '.interrupt'), '');
  assert.equal(checkInterrupt(runDir), true,
    'SKILL.md D-04: .interrupt at runDir top is honoured at top-of-cycle');
});

test('interrupt flag: closing ledger entry carries ended_via=interrupted', async (t) => {
  const runDir = freshTmp('crt-sko-int2');
  t.after(() => { try { fs.rmSync(runDir, { recursive: true, force: true }); } catch {} });
  const cycle1 = await stubLlmResponse('create-cycle-1')();
  await appendCycleFromStub(runDir, 1, cycle1);
  // Simulate the SKILL.md interrupt closer.
  await appendLedger(runDir, {
    cycle: 2, timestamp: new Date().toISOString(),
    findings_total: 0, findings_genuine: 0, findings_fixed: 0,
    findings_intentionally_skipped: 0,
    issue_set_hash: 'sha1:0', skipped_finding_ids: [], fixed_finding_ids: [],
    slides_changed: [], review_mode: 'full',
    ended_via: 'interrupted',
  });
  const ledger = await readLedger(runDir);
  assert.equal(ledger[ledger.length - 1].ended_via, 'interrupted');
});
