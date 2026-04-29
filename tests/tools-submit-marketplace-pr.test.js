// Sandboxed tests for tools/submit-marketplace-pr.sh — verify --simulate path
// prints the expected PLAN: lines, exits 0, and makes no network calls.
const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

const REPO_ROOT = path.resolve(__dirname, '..');
const SCRIPT = path.join(REPO_ROOT, 'tools', 'submit-marketplace-pr.sh');
const PATCH = path.join(REPO_ROOT, '.planning', 'marketplace-patch.json');

test('marketplace-patch.json exists and parses as JSON', () => {
  assert.ok(fs.existsSync(PATCH), 'patch file exists at .planning/marketplace-patch.json');
  const obj = JSON.parse(fs.readFileSync(PATCH, 'utf8'));
  assert.ok(obj.entry, 'patch has entry');
  assert.equal(obj.entry.name, 'instadecks');
});

test('--simulate prints plan lines and exits 0', () => {
  const r = spawnSync('bash', [SCRIPT, '--simulate'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });
  assert.equal(r.status, 0, `expected exit 0; got ${r.status}; stderr=${r.stderr}`);
  assert.match(r.stdout, /PLAN: gh repo fork --clone=false alo-labs\/claude-plugins/);
  assert.match(r.stdout, /PLAN: gh pr create --repo alo-labs\/claude-plugins/);
  assert.match(r.stdout, /PLAN: git .* checkout -b add-instadecks-v0\.1\.0/);
});

test('--simulate makes no network calls (PATH=/empty still exits 0)', () => {
  const r = spawnSync('bash', [SCRIPT, '--simulate'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    env: { ...process.env, PATH: '/empty:/usr/bin:/bin' },
  });
  // /usr/bin:/bin retained so bash + coreutils still resolve; gh should NOT be invoked.
  assert.equal(r.status, 0, `expected exit 0; got ${r.status}; stderr=${r.stderr}`);
  assert.match(r.stdout, /PLAN: gh repo fork/);
  // RELEASE.md must NOT have been mutated by simulate path
  const releaseMd = fs.readFileSync(path.join(REPO_ROOT, '.planning', 'RELEASE.md'), 'utf8');
  // Ensure no duplicate "### Marketplace PR" was appended during simulate.
  // (Pre-existing one is allowed; simulate just must not append a second.)
  const matches = releaseMd.match(/### Marketplace PR/g) || [];
  assert.ok(matches.length <= 1, 'simulate must not append Marketplace PR section');
});
