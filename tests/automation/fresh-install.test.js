'use strict';

// HARD-12 — automated fresh-install Docker harness.
// Replaces the manual Mac+Windows checklist in tests/FRESH-INSTALL.md.
//
// Build a clean Linux container with all system prerequisites (libreoffice-impress,
// poppler-utils, IBM Plex Sans, Node 22), run the 4 user-invocable skill CLIs
// against tests/automation/lib/canonical-brief.json, and assert byte-size
// thresholds on the 5 produced artifacts.
//
// Gating (CONTEXT D-08 — fresh-install is local-only, never in CI):
//   - In CI (CI=true) without explicit RUN_DOCKER_TESTS=1: test skipped.
//   - On hosts without docker binary: test skipped silently.
//   - On hosts without RUN_DOCKER_TESTS=1: test skipped.
//   - Otherwise (RUN_DOCKER_TESTS=1 + docker present): full docker build + run.
//
// Mac and Windows runner variants are explicitly OUT OF SCOPE per SPEC §Out of
// Scope and deferred to v1.x; native Mac install remains verified via prior
// clean live-E2E iterations recorded in .planning/STATE.md.

const test = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const IMAGE_TAG = 'instadecks-fresh-install:test';
const DOCKERFILE = 'tests/automation/Dockerfile.fresh-install';

function hasDocker() {
  const r = spawnSync('which', ['docker'], { encoding: 'utf8' });
  return r.status === 0 && (r.stdout || '').trim().length > 0;
}

// CONTEXT D-08: fresh-install is local-only. Skip in CI unless RUN_DOCKER_TESTS=1
// is explicitly set. This prevents flaky/slow docker builds on shared runners.
const optedIn = process.env.RUN_DOCKER_TESTS === '1';
const dockerPresent = hasDocker();
const enabled = optedIn && dockerPresent;

function skipReason() {
  if (process.env.CI === 'true' && !optedIn) {
    return 'fresh-install docker harness skipped: CI run without RUN_DOCKER_TESTS=1 (CONTEXT D-08 — local-only)';
  }
  if (!optedIn) return 'fresh-install docker harness skipped: set RUN_DOCKER_TESTS=1 to opt in';
  if (!dockerPresent) return 'fresh-install docker harness skipped: docker binary not found on PATH';
  return '';
}

if (!enabled) {
  test('fresh-install docker harness', { skip: skipReason() }, () => {});
} else {
  // 5-minute build budget; cached rebuild typically completes in <90s.
  test('docker build for fresh-install harness succeeds', { timeout: 5 * 60 * 1000 }, (t) => {
    t.diagnostic(`building image ${IMAGE_TAG} from ${DOCKERFILE}`);
    const r = spawnSync(
      'docker',
      ['build', '-f', DOCKERFILE, '-t', IMAGE_TAG, '.'],
      { cwd: REPO_ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    );
    if (r.status !== 0) {
      t.diagnostic(`docker build stderr (tail):\n${(r.stderr || '').slice(-2000)}`);
    }
    assert.strictEqual(r.status, 0, `docker build exited with status ${r.status}`);
  });

  // 10-minute run budget — real soffice + 4-skill chain.
  test('docker run completes the 4-skill chain and produces all 5 artifacts', { timeout: 10 * 60 * 1000 }, (t) => {
    const startedAt = Date.now();
    const r = spawnSync(
      'docker',
      ['run', '--rm', IMAGE_TAG],
      { cwd: REPO_ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    );
    const elapsedMs = Date.now() - startedAt;
    t.diagnostic(`docker run wall-clock: ${elapsedMs} ms`);

    if (r.status !== 0) {
      t.diagnostic(`docker run stderr (tail):\n${(r.stderr || '').slice(-2000)}`);
    }
    assert.strictEqual(r.status, 0, `docker run exited with status ${r.status}`);

    // Locate the final RESULT=<base64> line in stdout.
    const lines = (r.stdout || '').trim().split('\n');
    const resultLine = [...lines].reverse().find((l) => l.startsWith('RESULT='));
    assert.ok(resultLine, 'no RESULT=<base64> line found in container stdout');

    const b64 = resultLine.slice('RESULT='.length).trim();
    let manifest;
    try {
      manifest = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
    } catch (e) {
      assert.fail(`failed to decode RESULT manifest: ${e.message}`);
    }

    assert.strictEqual(manifest.ok, true, `harness reported failure: ${manifest.error || '<no error message>'}`);
    assert.ok(Array.isArray(manifest.artifacts), 'manifest.artifacts must be an array');
    assert.strictEqual(manifest.artifacts.length, 5, `expected 5 artifacts, got ${manifest.artifacts.length}`);

    const sizes = manifest.byteSizes || {};
    assert.ok(sizes.deckPptx      >= 10240, `deck.pptx too small (${sizes.deckPptx} bytes)`);
    assert.ok(sizes.deckPdf       >= 5120,  `deck.pdf too small (${sizes.deckPdf} bytes)`);
    assert.ok(sizes.annotatedPptx >= 10240, `deck.annotated.pptx too small (${sizes.annotatedPptx} bytes)`);
    assert.ok(sizes.annotatedPdf  >= 5120,  `deck.annotated.pdf too small (${sizes.annotatedPdf} bytes)`);

    // Soft cached-image budget: ≤ 90s wall-clock when image is cached. We diagnostic
    // (rather than assert) because a cold build will exceed this on first run.
    if (elapsedMs > 90 * 1000) {
      t.diagnostic(`note: docker run exceeded the 90s cached-image budget (took ${elapsedMs} ms)`);
    }
  });
}
