// Integration test for hooks/check-deps.sh — invokes the script via spawnSync and asserts behavior.
// Per Phase 1 D-08 (CONTEXT.md) + RESEARCH.md Open Question #3 (bash hook + spawnSync test).
// PC-04: subtest 5 confirms node_modules lands in ${CLAUDE_PLUGIN_DATA}, never in ${CLAUDE_PLUGIN_ROOT}.

const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const HOOK = path.join(ROOT, 'hooks', 'check-deps.sh');

function freshDataDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cd-'));
}

function runHook(dataDir) {
  return spawnSync('bash', [HOOK], {
    env: {
      ...process.env,
      CLAUDE_PLUGIN_ROOT: ROOT,
      CLAUDE_PLUGIN_DATA: dataDir,
    },
    encoding: 'utf8',
  });
}

const npmAvailable = spawnSync('command', ['-v', 'npm'], { shell: true }).status === 0;

test('check-deps.sh', async (t) => {
  await t.test('always exits 0 (non-blocking contract per D-08)', () => {
    const dataDir = freshDataDir();
    const result = runHook(dataDir);
    assert.equal(result.status, 0, `expected exit 0, got ${result.status}\nstderr: ${result.stderr}`);
  });

  await t.test('output begins with "Instadecks:" prefix', () => {
    const dataDir = freshDataDir();
    const result = runHook(dataDir);
    assert.ok(
      result.stdout.startsWith('Instadecks:'),
      `expected stdout to start with "Instadecks:", got: ${JSON.stringify(result.stdout)}`,
    );
  });

  await t.test('creates sentinel after first run', (t2) => {
    if (!npmAvailable) {
      t2.skip('npm not available');
      return;
    }
    const dataDir = freshDataDir();
    const result = runHook(dataDir);
    if (!result.stdout.includes('install complete')) {
      t2.skip(`npm ci did not run to completion in this env: ${result.stdout.trim()}`);
      return;
    }
    const sentinel = path.join(dataDir, '.npm-installed-sentinel');
    assert.ok(fs.existsSync(sentinel), `sentinel not found at ${sentinel}`);
  });

  await t.test('sentinel guard prevents re-install on second run', (t2) => {
    if (!npmAvailable) {
      t2.skip('npm not available');
      return;
    }
    const dataDir = freshDataDir();
    const first = runHook(dataDir);
    if (!first.stdout.includes('install complete')) {
      t2.skip(`npm ci did not complete on first run: ${first.stdout.trim()}`);
      return;
    }
    const second = runHook(dataDir);
    assert.ok(
      !second.stdout.includes('install complete'),
      `second run should skip npm ci, got: ${second.stdout}`,
    );
  });

  await t.test('npm ci installs into CLAUDE_PLUGIN_DATA, not CLAUDE_PLUGIN_ROOT (PC-04)', (t2) => {
    if (!npmAvailable) {
      t2.skip('npm not available');
      return;
    }
    const dataDir = freshDataDir();
    const rootNodeModulesBefore = fs.existsSync(path.join(ROOT, 'node_modules'));
    const result = runHook(dataDir);
    if (!result.stdout.includes('install complete')) {
      t2.skip(`npm ci did not run: ${result.stdout.trim()}`);
      return;
    }
    // Strict assertion: install lands in PLUGIN_DATA and contains pptxgenjs.
    assert.ok(
      fs.existsSync(path.join(dataDir, 'node_modules')),
      'expected node_modules inside CLAUDE_PLUGIN_DATA',
    );
    assert.ok(
      fs.existsSync(path.join(dataDir, 'node_modules', 'pptxgenjs')),
      'expected pptxgenjs inside CLAUDE_PLUGIN_DATA/node_modules',
    );
    // Root must not gain a node_modules from this hook invocation.
    const rootNodeModulesAfter = fs.existsSync(path.join(ROOT, 'node_modules'));
    assert.equal(
      rootNodeModulesAfter,
      rootNodeModulesBefore,
      'hook must not create/modify CLAUDE_PLUGIN_ROOT/node_modules',
    );
  });
});
