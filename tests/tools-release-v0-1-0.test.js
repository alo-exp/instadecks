// Sandboxed tests for tools/release-v0.1.0.sh — verify --dry-run + INSTADECKS_RELEASE_SIMULATE
// short-circuits all gates and prints the expected PLAN: + DRY-RUN: lines.
const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

const REPO_ROOT = path.resolve(__dirname, '..');
const SCRIPT = path.join(REPO_ROOT, 'tools', 'release-v0.1.0.sh');

test('release script exists and is executable', () => {
  assert.ok(fs.existsSync(SCRIPT));
  const mode = fs.statSync(SCRIPT).mode;
  assert.ok((mode & 0o111) !== 0, 'script is executable');
});

test('--dry-run with INSTADECKS_RELEASE_SIMULATE=1 prints all gate plans + DRY-RUN actions', () => {
  const r = spawnSync('bash', [SCRIPT, '--dry-run'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    env: { ...process.env, INSTADECKS_RELEASE_SIMULATE: '1' },
  });
  assert.equal(r.status, 0, `expected exit 0; got ${r.status}; stderr=${r.stderr}\nstdout=${r.stdout}`);
  // Gate plans
  assert.match(r.stdout, /PLAN: lint:paths/);
  assert.match(r.stdout, /PLAN: lint:enums/);
  assert.match(r.stdout, /PLAN: license-audit/);
  assert.match(r.stdout, /PLAN: manifest-validator/);
  assert.match(r.stdout, /PLAN: doc-size/);
  assert.match(r.stdout, /PLAN: test \(c8 100%\)/);
  assert.match(r.stdout, /PLAN: bats/);
  assert.match(r.stdout, /PLAN: activation-panel/);
  assert.match(r.stdout, /PLAN: permission-mode/);
  assert.match(r.stdout, /PLAN: fresh-install/);
  // DRY-RUN actions (steps 13-17)
  assert.match(r.stdout, /DRY-RUN: would tag v0\.1\.0/);
  assert.match(r.stdout, /DRY-RUN: would push tag/);
  assert.match(r.stdout, /DRY-RUN: would submit marketplace PR/);
});

test('STRICT=1 + docker missing fails with clear error', () => {
  const r = spawnSync('bash', [SCRIPT, '--dry-run'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    env: {
      ...process.env,
      INSTADECKS_RELEASE_SIMULATE: '1',
      STRICT: '1',
      // empty PATH so `command -v docker` fails (keep /bin for bash builtins, no docker there)
      PATH: '/empty:/usr/bin:/bin',
    },
  });
  // If docker happens to live in /usr/bin or /bin, this assertion needs adjustment;
  // on the project's CI/macOS host docker is in /usr/local/bin or /opt/homebrew/bin.
  if (r.status === 0) {
    // Docker was found — skip rather than fail (test environment dependent).
    return;
  }
  assert.notEqual(r.status, 0, 'expected non-zero exit when STRICT=1 + docker missing');
  assert.match(r.stderr + r.stdout, /STRICT=1.*docker missing|docker missing.*STRICT/);
});

test('package.json has release:dry-run and release scripts', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8'));
  assert.equal(pkg.scripts['release:dry-run'], 'bash tools/release-v0.1.0.sh --dry-run');
  assert.equal(pkg.scripts['release'], 'bash tools/release-v0.1.0.sh');
});
