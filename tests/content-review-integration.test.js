'use strict';
// content-review-integration.test.js — Phase 6 Plan 06-04 / CRV-01, CRV-09, CRV-11.
//
// End-to-end integration: extract → 4 code-side checks → merge with pre-recorded prompt-side
// findings → runContentReview → assert. Real code-side path; mocked prompt-side via committed
// JSON fixture; stubbed runAnnotate via require.cache injection (no soffice / pdftoppm / LLM).
//
// Test budget: <10s. No network. No subprocess. Subtests:
//   1. full pipeline standalone (annotate:false)
//   2. full pipeline --annotate branch (stubbed runAnnotate)
//   3. SKILL.md activation-anchor smoke (CRV-01 lightweight; full panel deferred to Phase 7 DIST-02)
//
// Reference: 06-04-PLAN.md must_haves.truths.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const REPO_ROOT = path.join(__dirname, '..');
const FIXTURE_DECK = path.join(REPO_ROOT, 'tests', 'fixtures', 'cross-domain-test-deck.pptx');
const PROMPT_FIXTURE = path.join(REPO_ROOT, 'tests', 'fixtures', 'content-review', 'integration-prompt-findings.json');
const _cmdMd = path.join(REPO_ROOT, 'commands', 'instadecks-content-review.md');
const SKILL_MD = fs.existsSync(_cmdMd) ? _cmdMd : path.join(REPO_ROOT, 'skills', 'content-review', 'SKILL.md');

const D06_ANCHORS = [
  'content review',
  'argument quality',
  'story flow',
  'is my deck persuasive',
  'Pyramid Principle',
  'narrative arc',
];

// Live requires.
const { extractContent } = require('../skills/content-review/scripts/lib/extract-content');
const { checkTitles } = require('../skills/content-review/scripts/lib/title-adapter');
const { checkRedundancy } = require('../skills/content-review/scripts/lib/redundancy');
const { checkJargon } = require('../skills/content-review/scripts/lib/jargon');
const { checkLength } = require('../skills/content-review/scripts/lib/length-check');
const { validate } = require('../skills/review/scripts/lib/schema-validator');
const {
  runContentReview,
  _test_setRunAnnotate,
} = require('../skills/content-review/scripts');

const ANNOTATE_INDEX = path.resolve(
  REPO_ROOT, 'skills', 'annotate', 'scripts', 'index.js'
);

function isAnnotateLoaded() {
  return Object.keys(require.cache).some((k) =>
    /skills\/annotate\/scripts\/index\.js$/.test(k)
    || /skills\/annotate\/scripts\/annotate\.js$/.test(k));
}

// Fold flat code-side findings + structured prompt-side doc into a single findings doc keyed
// by slideNum. Prompt-side findings retain their slide-block grouping; code-side findings
// merge into the same slide blocks.
function mergeFindings({ extract, codeFindings, promptDoc }) {
  // Build slide block map keyed by slideNum.
  const blockMap = new Map();
  // Seed from extract (titles).
  for (const slide of extract.slides) {
    blockMap.set(slide.slideNum, {
      slideNum: slide.slideNum,
      title: slide.title,
      findings: [],
    });
  }
  // Merge prompt-side findings (preserving the fixture's slide blocks).
  for (const slide of promptDoc.slides) {
    const block = blockMap.get(slide.slideNum) || {
      slideNum: slide.slideNum,
      title: slide.title,
      findings: [],
    };
    // Strip slideNum field from each finding (lives on the slide block).
    for (const f of slide.findings) {
      const { slideNum: _ignored, ...rest } = f;
      block.findings.push(rest);
    }
    blockMap.set(slide.slideNum, block);
  }
  // Merge code-side findings by their slideNum field.
  for (const f of codeFindings) {
    const { slideNum, ...rest } = f;
    if (!blockMap.has(slideNum)) {
      const slide = extract.slides.find((s) => s.slideNum === slideNum);
      blockMap.set(slideNum, {
        slideNum,
        title: slide ? slide.title : '',
        findings: [],
      });
    }
    blockMap.get(slideNum).findings.push(rest);
  }
  // Drop empty slide blocks (purely informational; keeps doc terse).
  const slides = [...blockMap.values()]
    .filter((b) => b.findings.length > 0)
    .sort((a, b) => a.slideNum - b.slideNum);
  return {
    schema_version: '1.1',
    deck: promptDoc.deck,
    generated_at: promptDoc.generated_at,
    slides,
  };
}

async function runCodeSideChecks(deckPath) {
  const extract = await extractContent(deckPath);
  const findings = [
    ...checkTitles(extract),
    ...checkRedundancy(extract),
  ];
  for (const slide of extract.slides) {
    findings.push(...checkJargon(slide));
    findings.push(...checkLength(slide));
  }
  return { extract, findings };
}

test('content-review-integration', async (t) => {
  // Pre-flight: fixture deck must exist (Plan 06-03 fallback to Phase 4 cookbook would slot
  // here, but Plan 06-03 ships in the same wave so we hard-require the cross-domain deck).
  await t.test('fixture deck present (cross-domain from Plan 06-03)', () => {
    assert.ok(fs.existsSync(FIXTURE_DECK), `missing fixture deck: ${FIXTURE_DECK}`);
  });

  await t.test('full pipeline standalone (annotate:false) — real code-side + mocked prompt-side', async (t) => {
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'crv-int-out-'));
    const tmpDeckDir = fs.mkdtempSync(path.join(os.tmpdir(), 'crv-int-deck-'));
    const deckPath = path.join(tmpDeckDir, 'cross-domain-test-deck.pptx');
    fs.copyFileSync(FIXTURE_DECK, deckPath);
    t.after(() => {
      fs.rmSync(outDir, { recursive: true, force: true });
      fs.rmSync(tmpDeckDir, { recursive: true, force: true });
    });

    // 1+2. Real code-side path (no mocking).
    const { extract, findings: codeFindings } = await runCodeSideChecks(deckPath);
    assert.ok(codeFindings.length > 0,
      'code-side should produce ≥1 finding on the cross-domain deck (slide 2/4 title + slide 4 jargon/length)');

    // 3. Load prompt-side from committed fixture (deterministic).
    const promptDoc = JSON.parse(fs.readFileSync(PROMPT_FIXTURE, 'utf8'));

    // 4. Merge.
    const findingsDoc = mergeFindings({ extract, codeFindings, promptDoc });
    findingsDoc.deck = path.basename(deckPath);

    // 5. Validator passes.
    assert.equal(validate(findingsDoc), true, 'merged doc must pass schema-validator v1.1');

    // 6. runContentReview live.
    const r = await runContentReview({
      deckPath,
      runId: 'test-int-06-04',
      outDir,
      findings: findingsDoc,
      mode: 'structured-handoff',
      annotate: false,
    });

    // 7. Output assertions.
    assert.ok(r.jsonPath && r.mdPath && r.narrativePath, 'three output paths returned');
    const jsonRound = JSON.parse(fs.readFileSync(r.jsonPath, 'utf8'));
    assert.deepEqual(jsonRound, findingsDoc, 'JSON round-trips deep-equal with merged doc');
    assert.ok(fs.existsSync(r.mdPath), 'MD file written');
    assert.ok(r.findingCounts, 'findingCounts present');
    const totalCount = r.findingCounts.critical + r.findingCounts.major
                     + r.findingCounts.minor + r.findingCounts.nitpick;
    assert.ok(totalCount > 0, `non-zero finding signal flowed through (got ${totalCount})`);
    assert.ok(r.genuineCount > 0, `non-zero genuine signal (got ${r.genuineCount})`);
    assert.equal(r.annotated, null, 'annotated:null when annotate=false');

    // 8. Lazy-require invariant (CRV-11).
    assert.equal(isAnnotateLoaded(), false,
      'CRV-11: annotate must NOT be loaded when annotate=false');

    // 9. Determinism — re-run with same inputs → byte-identical MD.
    const md1 = fs.readFileSync(r.mdPath, 'utf8');
    const r2 = await runContentReview({
      deckPath,
      runId: 'test-int-06-04-rerun',
      outDir,
      findings: findingsDoc,
      mode: 'structured-handoff',
      annotate: false,
    });
    const md2 = fs.readFileSync(r2.mdPath, 'utf8');
    assert.equal(md2, md1, 'deterministic renderer: same inputs → byte-identical MD');

    // 10. Every content finding has category=content + valid check_id (boundary sanity).
    const VALID_CHECK_IDS = new Set([
      'action-title', 'redundancy', 'jargon', 'length',
      'pyramid-mece', 'narrative-arc', 'claim-evidence', 'standalone-readability',
    ]);
    for (const slide of findingsDoc.slides) {
      for (const f of slide.findings) {
        if (f.category === 'content') {
          assert.ok(VALID_CHECK_IDS.has(f.check_id),
            `content finding on slide ${slide.slideNum} has invalid check_id: ${JSON.stringify(f.check_id)}`);
        }
      }
    }
  });

  await t.test('full pipeline --annotate branch (stubbed runAnnotate via _test_setRunAnnotate)', async (t) => {
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'crv-int-ann-out-'));
    const tmpDeckDir = fs.mkdtempSync(path.join(os.tmpdir(), 'crv-int-ann-deck-'));
    const deckPath = path.join(tmpDeckDir, 'cross-domain-test-deck.pptx');
    fs.copyFileSync(FIXTURE_DECK, deckPath);

    let calledArgs = null;
    const stubResult = {
      pptxPath: '/tmp/stub.annotated.pptx',
      pdfPath: '/tmp/stub.annotated.pdf',
    };
    _test_setRunAnnotate(async (args) => {
      calledArgs = args;
      return stubResult;
    });

    t.after(() => {
      _test_setRunAnnotate(null);
      fs.rmSync(outDir, { recursive: true, force: true });
      fs.rmSync(tmpDeckDir, { recursive: true, force: true });
      // Restore require.cache: drop any annotate keys the override path may have triggered.
      for (const k of Object.keys(require.cache)) {
        if (/skills\/annotate\/scripts\//.test(k)) delete require.cache[k];
      }
    });

    const { extract, findings: codeFindings } = await runCodeSideChecks(deckPath);
    const promptDoc = JSON.parse(fs.readFileSync(PROMPT_FIXTURE, 'utf8'));
    const findingsDoc = mergeFindings({ extract, codeFindings, promptDoc });
    findingsDoc.deck = path.basename(deckPath);

    const r = await runContentReview({
      deckPath,
      runId: 'test-int-06-04-annotate',
      outDir,
      findings: findingsDoc,
      mode: 'structured-handoff',
      annotate: true,
    });

    assert.ok(calledArgs, 'stub runAnnotate was invoked');
    assert.equal(calledArgs.deckPath, deckPath, 'stub received deckPath');
    assert.equal(calledArgs.findings, findingsDoc, 'stub received findings');
    assert.equal(calledArgs.outDir, outDir, 'stub received outDir');
    assert.equal(calledArgs.runId, 'test-int-06-04-annotate', 'stub received runId');
    assert.equal(r.annotated, stubResult, 'annotated return field === stub resolved value');
    assert.equal(r.annotatedPptx, stubResult.pptxPath);
    assert.equal(r.annotatedPdf, stubResult.pdfPath);
  });

  await t.test('SKILL.md activation-anchor smoke (CRV-01 lightweight)', async () => {
    const raw = await fsp.readFile(SKILL_MD, 'utf8');
    // Parse minimal frontmatter (between leading `---` lines).
    const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    assert.ok(m, 'SKILL.md has YAML frontmatter');
    const fm = m[1];

    // user-invocable: true
    assert.match(fm, /^user-invocable:\s*true\s*$/m,
      'CRV-01: user-invocable must be true');

    // description ≤1024 chars (single-line or folded — match value following "description:")
    const descMatch = fm.match(/^description:\s*([\s\S]*?)(?=\n[a-zA-Z_-]+:|\n$)/m);
    assert.ok(descMatch, 'description field present');
    const description = descMatch[1].trim();
    assert.ok(description.length <= 1024,
      `description must be ≤1024 chars (got ${description.length})`);

    // All six D-06 anchors present (case-insensitive on description text — phrases verbatim).
    for (const anchor of D06_ANCHORS) {
      assert.ok(description.toLowerCase().includes(anchor.toLowerCase()),
        `CRV-01: D-06 activation anchor missing from description: "${anchor}"`);
    }
  });
});

// Suppress unused-var lint for ANNOTATE_INDEX (kept for documentation of the invariant).
void ANNOTATE_INDEX;
