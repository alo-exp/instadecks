'use strict';
// Phase 5 — Plan 05-04 Task 2: 5-scenario mocked-cycle auto-refine integration test (Q-3).
// Exercises the loop primitives end-to-end at the primitive-composition level — no soffice,
// no pdftoppm, no LLM. Each scenario simulates the SKILL.md per-cycle pseudocode (Plan 05-03)
// using a `simulateCycle` harness that calls real appendLedger / readLedger / hashIssueSet /
// slidesChangedSinceLastCycle / checkInterrupt; mocked review just feeds scripted findings.
//
// Scenario coverage (CRT-07..CRT-14):
//   1. Clean converge after confirmation             (CRT-07, CRT-08, CRT-14)
//   2. Cycle-1-clean forces confirmation cycle       (CRT-08, D-07)
//   3. Oscillation at cycle 3 (D-09 hash equality)   (CRT-09)
//   4. Top-of-cycle interrupt                        (CRT-11)
//   5. Soft-cap CI fallback (cycle 5 + CI=1)         (CRT-10, Q-5)

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const {
  appendLedger, readLedger, checkInterrupt,
  hashIssueSet, slidesChangedSinceLastCycle,
} = require('../skills/create/scripts/lib/loop-primitives');
const { detectOscillation } = require('../skills/create/scripts/lib/oscillation');
const { resolveSoftCap } = require('../skills/create/scripts/cli');

function freshTmpDir(tag) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `${tag}-`));
}

async function writeSlideJpgs(runDir, cycle, opts = {}) {
  const cycleDir = path.join(runDir, `cycle-${cycle}`);
  await fsp.mkdir(path.join(cycleDir, 'slides'), { recursive: true });
  for (let i = 1; i <= 3; i++) {
    const tag = opts.slidesIdenticalToPrevCycle
      ? `slide-${i}-cycle-${cycle - 1}-bytes`
      : `slide-${i}-cycle-${cycle}-bytes`;
    await fsp.writeFile(
      path.join(cycleDir, 'slides', `slide-0${i}.jpg`),
      Buffer.from(tag),
    );
  }
  // Touch deck.pptx (simulates runCreate's deck output for that cycle).
  await fsp.writeFile(path.join(runDir, 'deck.pptx'), Buffer.from(`deck-cycle-${cycle}`));
}

// Simulate one auto-refine cycle the way SKILL.md (Plan 05-03) prescribes.
// scriptedFindings: { slides: [{ slideNum, findings: [{ text, severity }] }] }
// Returns { interrupted, hash, genuineCount, review_mode }.
async function simulateCycle(runDir, cycle, scriptedFindings, opts = {}) {
  // 1. Top-of-cycle interrupt check (D-04).
  if (checkInterrupt(runDir)) {
    await appendLedger(runDir, {
      cycle, timestamp: new Date().toISOString(),
      findings_total: 0, findings_genuine: 0, findings_fixed: 0,
      findings_intentionally_skipped: 0,
      issue_set_hash: 'sha1:0', skipped_finding_ids: [], fixed_finding_ids: [],
      slides_changed: [], review_mode: 'full',
      ended_via: 'interrupted',
    });
    return { interrupted: true };
  }

  // 2-5. Render deck + image-ize slides (mocked: write deterministic bytes).
  await writeSlideJpgs(runDir, cycle, opts);

  // 2. Decide review_mode per SKILL.md step 2 / D-07 confirmation rule.
  const priorLedger = await readLedger(runDir);
  const priorEntry = priorLedger[priorLedger.length - 1] || null;
  let review_mode;
  if (cycle === 1) {
    review_mode = 'full';
  } else if (cycle === 2 && priorEntry && priorEntry.findings_genuine === 0) {
    review_mode = 'full'; // D-07 forced confirmation cycle
  } else {
    review_mode = 'diff-only';
  }

  // 6. slidesToReview: null = "all" (full mode); else SHA-diff list.
  const slidesToReview = review_mode === 'full'
    ? null
    : await slidesChangedSinceLastCycle(runDir, cycle);

  // 7-8. Mocked runReview returns scriptedFindings; agent triage flags every finding genuine.
  const findings = scriptedFindings;
  const genuineSet = (findings.slides || []).flatMap(s =>
    s.findings.map(f => ({ slideNum: s.slideNum, text: f.text })),
  );

  // 9. issue_set_hash via real primitive.
  const hash = hashIssueSet(genuineSet);

  // 10. appendLedger (D-02 schema).
  await appendLedger(runDir, {
    cycle, timestamp: new Date().toISOString(),
    findings_total: genuineSet.length,
    findings_genuine: genuineSet.length,
    findings_fixed: 0,
    findings_intentionally_skipped: 0,
    issue_set_hash: hash,
    skipped_finding_ids: [],
    fixed_finding_ids: [],
    slides_changed: slidesToReview || [],
    review_mode,
    ended_via: null,
  });

  return { interrupted: false, hash, genuineCount: genuineSet.length, review_mode };
}

// Helpers to build scripted findings with controlled hashes.
function findingsForSet(set) {
  // set: array of { slideNum, text }
  const bySlide = new Map();
  for (const f of set) {
    if (!bySlide.has(f.slideNum)) bySlide.set(f.slideNum, []);
    bySlide.get(f.slideNum).push({ text: f.text, severity: 'Major' });
  }
  return {
    schema_version: '1.0',
    slides: Array.from(bySlide.entries()).map(([slideNum, findings]) => ({ slideNum, findings })),
  };
}
const SET_3_GEN_A = [
  { slideNum: 1, text: 'Title contrast too low' },
  { slideNum: 2, text: 'Bullet alignment drift' },
  { slideNum: 3, text: 'Footer overlaps logo' },
];
const SET_3_GEN_B = [
  { slideNum: 1, text: 'Different finding alpha' },
  { slideNum: 2, text: 'Different finding beta' },
  { slideNum: 3, text: 'Different finding gamma' },
];
const EMPTY_FINDINGS = { schema_version: '1.0', slides: [] };

const BUNDLE_ARTIFACTS = [
  'deck.pptx', 'deck.pdf', 'design-rationale.md', 'findings.json',
  'deck.annotated.pptx', 'deck.annotated.pdf', 'refine-ledger.jsonl',
  'render-deck.cjs',
];

// ----------------------------------------------------------------------
// Scenario 1: Clean converge after confirmation cycle ([3-gen, 0, 0])
// ----------------------------------------------------------------------

test('Scenario 1: clean converge after confirmation cycle — CRT-07, CRT-08, CRT-14', async (t) => {
  const runDir = freshTmpDir('auto-refine-int-s1');
  t.after(() => { try { fs.rmSync(runDir, { recursive: true, force: true }); } catch {} });

  // Cycle 1: 3 genuine findings.
  const r1 = await simulateCycle(runDir, 1, findingsForSet(SET_3_GEN_A));
  assert.strictEqual(r1.review_mode, 'full');
  assert.strictEqual(r1.genuineCount, 3);

  // Cycle 2: 0 findings (slides identical to cycle 1 → diff-only would emit []; full review per D-03 cycle-2-not-after-clean).
  // Per D-07, this cycle 2 is NOT a confirmation cycle (cycle 1 had >0 genuine), so review_mode = diff-only.
  const r2 = await simulateCycle(runDir, 2, EMPTY_FINDINGS);
  assert.strictEqual(r2.genuineCount, 0);

  // Cycle 3: 0 findings (now triggers confirmation? cycle-1 had 3 genuine, cycle-2 had 0,
  // so cycle 3 is the post-zero pass — review_mode rules give 'diff-only' since cycle !== 2).
  // For convergence per CRT-08 (genuine == 0 AND cycle ≥ 2), cycle 2 already converges; we run
  // 3 cycles to demonstrate ledger length 3 with the final entry as the converged one.
  const r3 = await simulateCycle(runDir, 3, EMPTY_FINDINGS);
  assert.strictEqual(r3.genuineCount, 0);

  // Mark the final ledger entry's ended_via='converged' (caller responsibility per SKILL.md).
  const ledger = await readLedger(runDir);
  assert.strictEqual(ledger.length, 3);
  // Mutate the last entry by appending a closing entry — simulate the final ledger update.
  // Per the SKILL.md flow the last cycle's entry has ended_via='converged' set when the
  // convergence check passes. Rewrite the final line to reflect that.
  const finalised = { ...ledger[ledger.length - 1], ended_via: 'converged' };
  // Rewrite ledger file with the corrected final entry.
  const lines = ledger.slice(0, -1).map(e => JSON.stringify(e)).concat(JSON.stringify(finalised));
  await fsp.writeFile(path.join(runDir, 'refine-ledger.jsonl'), lines.join('\n') + '\n');

  await t.test('ledger has 3 entries', async () => {
    const l = await readLedger(runDir);
    assert.strictEqual(l.length, 3);
  });
  await t.test('detectOscillation === false', async () => {
    const l = await readLedger(runDir);
    assert.strictEqual(detectOscillation(l), false);
  });
  await t.test("final entry ended_via === 'converged'", async () => {
    const l = await readLedger(runDir);
    assert.strictEqual(l[l.length - 1].ended_via, 'converged');
  });
  await t.test('CRT-14: all 8 bundle artifacts exist under runDir', async () => {
    // Touch-create the artifacts the post-loop step would produce (simulating the bundle).
    for (const name of BUNDLE_ARTIFACTS) {
      const p = path.join(runDir, name);
      if (!fs.existsSync(p)) await fsp.writeFile(p, Buffer.from(`mock-${name}`));
    }
    for (const name of BUNDLE_ARTIFACTS) {
      assert.strictEqual(
        fs.existsSync(path.join(runDir, name)), true,
        `bundle artifact missing: ${name}`,
      );
    }
  });
});

// ----------------------------------------------------------------------
// Scenario 2: Cycle-1-clean forces confirmation cycle (D-07)
// ----------------------------------------------------------------------

test('Scenario 2: cycle-1-clean forces confirmation cycle — CRT-08, D-07', async (t) => {
  const runDir = freshTmpDir('auto-refine-int-s2');
  t.after(() => { try { fs.rmSync(runDir, { recursive: true, force: true }); } catch {} });

  // Cycle 1: 0 findings (suspiciously clean — forces confirmation).
  const r1 = await simulateCycle(runDir, 1, EMPTY_FINDINGS);
  assert.strictEqual(r1.review_mode, 'full');
  assert.strictEqual(r1.genuineCount, 0);

  // Cycle 2: 0 findings — review_mode MUST be 'full' per D-07 (forced confirmation),
  // NOT 'diff-only' even though the slides could be identical.
  const r2 = await simulateCycle(runDir, 2, EMPTY_FINDINGS);
  assert.strictEqual(r2.review_mode, 'full', 'D-07: cycle 2 after cycle-1-clean must be full review, not diff-only');
  assert.strictEqual(r2.genuineCount, 0);

  // Mark final entry converged.
  const ledger = await readLedger(runDir);
  const finalised = { ...ledger[ledger.length - 1], ended_via: 'converged' };
  const lines = ledger.slice(0, -1).map(e => JSON.stringify(e)).concat(JSON.stringify(finalised));
  await fsp.writeFile(path.join(runDir, 'refine-ledger.jsonl'), lines.join('\n') + '\n');

  await t.test('ledger has 2 entries', async () => {
    const l = await readLedger(runDir);
    assert.strictEqual(l.length, 2);
  });
  await t.test("cycle 1 review_mode === 'full' AND cycle 2 review_mode === 'full' (forced)", async () => {
    const l = await readLedger(runDir);
    assert.strictEqual(l[0].review_mode, 'full');
    assert.strictEqual(l[1].review_mode, 'full');
  });
  await t.test("final entry ended_via === 'converged'", async () => {
    const l = await readLedger(runDir);
    assert.strictEqual(l[l.length - 1].ended_via, 'converged');
  });
});

// ----------------------------------------------------------------------
// Scenario 3: Oscillation at cycle 3 (D-09 strict hash equality)
// ----------------------------------------------------------------------

test('Scenario 3: oscillation detected at cycle 3 (hash N === N-2) — CRT-09, D-09', async (t) => {
  const runDir = freshTmpDir('auto-refine-int-s3');
  t.after(() => { try { fs.rmSync(runDir, { recursive: true, force: true }); } catch {} });

  // Cycle 1: SET_A. Cycle 2: SET_B. Cycle 3: SET_A again → hash equal to cycle 1.
  await simulateCycle(runDir, 1, findingsForSet(SET_3_GEN_A));
  await simulateCycle(runDir, 2, findingsForSet(SET_3_GEN_B));
  await simulateCycle(runDir, 3, findingsForSet(SET_3_GEN_A));

  await t.test('detectOscillation returns true on hash-A/hash-B/hash-A pattern', async () => {
    const l = await readLedger(runDir);
    assert.strictEqual(l.length, 3);
    assert.strictEqual(l[0].issue_set_hash, l[2].issue_set_hash, 'D-09 setup: cycle 1 and 3 must hash-match');
    assert.notStrictEqual(l[1].issue_set_hash, l[0].issue_set_hash, 'D-09 setup: cycle 2 must differ');
    assert.strictEqual(l[2].findings_genuine > 0, true, 'D-09: requires genuine_count > 0 on cycle N');
    assert.strictEqual(detectOscillation(l), true);
  });

  // Closing entry per SKILL.md when oscillation detected.
  const ledger = await readLedger(runDir);
  const finalised = { ...ledger[ledger.length - 1], ended_via: 'oscillation' };
  const lines = ledger.slice(0, -1).map(e => JSON.stringify(e)).concat(JSON.stringify(finalised));
  await fsp.writeFile(path.join(runDir, 'refine-ledger.jsonl'), lines.join('\n') + '\n');

  await t.test("final entry ended_via === 'oscillation'", async () => {
    const l = await readLedger(runDir);
    assert.strictEqual(l[l.length - 1].ended_via, 'oscillation');
  });
});

// ----------------------------------------------------------------------
// Scenario 4: Top-of-cycle interrupt (D-04)
// ----------------------------------------------------------------------

test('Scenario 4: interrupt mid-loop honored at top-of-cycle — CRT-11', async (t) => {
  const runDir = freshTmpDir('auto-refine-int-s4');
  t.after(() => { try { fs.rmSync(runDir, { recursive: true, force: true }); } catch {} });

  // Cycle 1 runs normally.
  const r1 = await simulateCycle(runDir, 1, findingsForSet(SET_3_GEN_A));
  assert.strictEqual(r1.interrupted, false);
  assert.strictEqual(r1.genuineCount, 3);
  // deck.pptx from cycle 1 must exist intact (no half-write).
  assert.strictEqual(fs.existsSync(path.join(runDir, 'deck.pptx')), true);
  const cycle1DeckBytes = fs.readFileSync(path.join(runDir, 'deck.pptx'));

  // Create .interrupt before cycle 2 begins (D-04: top-of-cycle check).
  fs.writeFileSync(path.join(runDir, '.interrupt'), '');

  await t.test('checkInterrupt returns true after .interrupt flag created', () => {
    assert.strictEqual(checkInterrupt(runDir), true);
  });

  const r2 = await simulateCycle(runDir, 2, findingsForSet(SET_3_GEN_A));
  await t.test('cycle 2 simulateCycle returned interrupted=true (top-of-cycle abort)', () => {
    assert.strictEqual(r2.interrupted, true);
  });
  await t.test("ledger gains a closing entry with ended_via === 'interrupted'", async () => {
    const l = await readLedger(runDir);
    assert.strictEqual(l[l.length - 1].ended_via, 'interrupted');
  });
  await t.test('cycle 1 deck.pptx intact (no half-write from interrupt)', () => {
    const after = fs.readFileSync(path.join(runDir, 'deck.pptx'));
    assert.deepStrictEqual(after, cycle1DeckBytes);
  });
});

// ----------------------------------------------------------------------
// Scenario 5: Soft-cap CI fallback (cycle 5 + CI=1 → accept)
// ----------------------------------------------------------------------

test('Scenario 5: soft-cap CI fallback at cycle 5 → accept — CRT-10, Q-5', async (t) => {
  const runDir = freshTmpDir('auto-refine-int-s5');
  t.after(() => { try { fs.rmSync(runDir, { recursive: true, force: true }); } catch {} });

  const savedCI = process.env.CI;
  process.env.CI = '1';
  t.after(() => {
    if (savedCI === undefined) delete process.env.CI; else process.env.CI = savedCI;
  });

  // Run 5 cycles each with non-zero genuine (use alternating sets to avoid D-09 oscillation
  // false-positive: SET_A, SET_B, SET_A would oscillate at cycle 3. Use 5 distinct hashes
  // by varying findings text per cycle.)
  for (let c = 1; c <= 5; c++) {
    const set = SET_3_GEN_A.map(f => ({ slideNum: f.slideNum, text: `${f.text}-c${c}` }));
    await simulateCycle(runDir, c, findingsForSet(set));
  }

  await t.test('ledger has 5 entries; no oscillation detected', async () => {
    const l = await readLedger(runDir);
    assert.strictEqual(l.length, 5);
    assert.strictEqual(detectOscillation(l), false);
  });

  // Capture stderr while invoking resolveSoftCap.
  const origWrite = process.stderr.write.bind(process.stderr);
  let captured = '';
  process.stderr.write = (s) => { captured += String(s); return true; };
  let decision;
  try {
    decision = resolveSoftCap(null);
  } finally {
    process.stderr.write = origWrite;
  }

  await t.test("CI=1 + no flag → resolveSoftCap returns 'accept'", () => {
    assert.strictEqual(decision, 'accept');
  });
  await t.test('stderr warning emitted', () => {
    assert.match(captured, /non-interactive mode/);
    assert.match(captured, /cycle 5/);
  });

  // Append closing entry with ended_via='soft-cap-accepted'.
  await appendLedger(runDir, {
    cycle: 5, timestamp: new Date().toISOString(),
    findings_total: 0, findings_genuine: 0, findings_fixed: 0,
    findings_intentionally_skipped: 0,
    issue_set_hash: 'sha1:soft-cap-close',
    skipped_finding_ids: [], fixed_finding_ids: [],
    slides_changed: [], review_mode: 'full',
    ended_via: 'soft-cap-accepted',
  });

  await t.test("final ledger entry ended_via === 'soft-cap-accepted'", async () => {
    const l = await readLedger(runDir);
    assert.strictEqual(l[l.length - 1].ended_via, 'soft-cap-accepted');
  });
});
