'use strict';
// V5: research-paper end-to-end /create -> /review -> /annotate
// Local-only; skipped under CI (CONTEXT D-08). Phase 9 plan 09-06.

const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const SKIP_REASON = 'live E2E - local only (CI=true unset)';
const SHAPE = 'research-paper';

test(`V5: ${SHAPE} end-to-end /create -> /review -> /annotate`,
  { skip: process.env.CI === 'true' ? SKIP_REASON : false, timeout: 240000 }, async () => {
    const runId = `e2e-v5-${Date.now()}`;
    const fixturePath = path.resolve(__dirname, 'fixtures', 'v5-paper.md');
    assert.ok(fs.existsSync(fixturePath), `missing fixture: ${fixturePath}`);

    const repoRoot = path.resolve(__dirname, '..', '..', '..');
    const createCli = path.join(repoRoot, 'skills', 'create', 'scripts', 'cli.js');
    const reviewCli = path.join(repoRoot, 'skills', 'review', 'scripts', 'cli.js');
    const annotateCli = path.join(repoRoot, 'skills', 'annotate', 'scripts', 'cli.js');

    const create = spawnSync('node', [createCli, '--brief-md', fixturePath, '--run-id', runId],
      { encoding: 'utf8', timeout: 180000 });
    assert.equal(create.status, 0, `create failed: status=${create.status}\nstderr:\n${create.stderr}`);

    const runDir = path.join(repoRoot, '.planning', 'instadecks', runId);
    const deckPath = path.join(runDir, 'deck.pptx');
    const rationalePath = path.join(runDir, 'design-rationale.md');
    assert.ok(fs.existsSync(deckPath), `deck.pptx missing at ${deckPath}`);
    assert.ok(fs.existsSync(rationalePath), `design-rationale.md missing at ${rationalePath}`);

    const review = spawnSync('node', [reviewCli, deckPath, '--run-id', runId],
      { encoding: 'utf8', timeout: 90000 });
    assert.equal(review.status, 0, `review failed: ${review.stderr}`);
    const findingsPath = path.join(runDir, 'findings.json');
    assert.ok(fs.existsSync(findingsPath), `findings.json missing at ${findingsPath}`);

    const ann = spawnSync('node', [annotateCli, deckPath, findingsPath, runDir],
      { encoding: 'utf8', timeout: 90000 });
    assert.equal(ann.status, 0, `annotate failed: ${ann.stderr}`);
    const annotatedExists = fs.existsSync(path.join(runDir, 'annotated.pptx'))
      || fs.readdirSync(runDir).some(f => /annotated/i.test(f));
    assert.ok(annotatedExists, `annotated.pptx missing in ${runDir}`);
  });
