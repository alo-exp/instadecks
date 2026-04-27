// tests/path-lint.test.js — Exercises tools/lint-paths.sh (Phase 1 D-02 / FOUND-02).
//
// (PC-06) Each spawnSync invocation MUST set cwd: tmpRepo (the temp git repo
// root) AND pass an ABSOLUTE path to lint-paths.sh as the script argument,
// because the script runs `git rev-parse --show-toplevel` and must discover
// the temp repo's toplevel — not the real instadecks repo.
//
// (PC-12 option a) Each `git commit` invocation uses `git -c user.email=... -c
// user.name=... commit ...` rather than mutating global git config. Tests stay
// hermetic; CI needs no prelude step setting git identity.
//
// (PC-07 scope note) The Windows-path subtest covers the ESCAPED-BACKSLASH
// form `C:\\Users\\foo\\bar` (typical in JS string literals / JSON), which is
// what the regex `C:\\\\` (four-character escape sequence `C:\\\\`) is
// intended to match. Single-backslash literals (e.g. raw bash here-strings or
// unescaped Windows shell paths) are out of scope and intentionally not
// caught — the lint targets source-code authoring patterns.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const LINT_SCRIPT = path.resolve(process.cwd(), 'tools/lint-paths.sh');

function makeTempRepo() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'path-lint-'));
  const r = spawnSync('git', ['init', '-q'], { cwd: tmp });
  if (r.status !== 0) throw new Error('git init failed: ' + r.stderr);
  return tmp;
}

function commitAll(repo, msg) {
  let r = spawnSync('git', ['add', '-A'], { cwd: repo });
  if (r.status !== 0) throw new Error('git add failed: ' + r.stderr);
  // (PC-12) Hermetic identity via -c flags; no global config mutation.
  r = spawnSync(
    'git',
    ['-c', 'user.email=test@test.local', '-c', 'user.name=test', 'commit', '-q', '-m', msg],
    { cwd: repo }
  );
  if (r.status !== 0) throw new Error('git commit failed: ' + r.stderr.toString());
}

function runLint(repo) {
  // (PC-06) cwd: tmpRepo + absolute script path.
  return spawnSync('bash', [LINT_SCRIPT], { cwd: repo, encoding: 'utf8' });
}

function writeFile(repo, rel, contents) {
  const full = path.join(repo, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, contents);
}

test('clean repo passes', () => {
  const repo = makeTempRepo();
  writeFile(repo, 'src/innocent.js', 'const x = 1;\n');
  commitAll(repo, 'init');
  const r = runLint(repo);
  assert.equal(r.status, 0, 'expected exit 0; stdout=' + r.stdout + ' stderr=' + r.stderr);
});

test('/Users/ in source file fails', () => {
  const repo = makeTempRepo();
  writeFile(repo, 'src/x.js', "const p = '/Users/foo/bar';\n");
  commitAll(repo, 'init');
  const r = runLint(repo);
  assert.equal(r.status, 1);
  assert.match(r.stdout + r.stderr, /src\/x\.js/);
});

test('~/.claude in source fails', () => {
  const repo = makeTempRepo();
  writeFile(repo, 'src/y.js', "const p = '~/.claude/skills';\n");
  commitAll(repo, 'init');
  const r = runLint(repo);
  assert.equal(r.status, 1);
  assert.match(r.stdout + r.stderr, /src\/y\.js/);
});

test('/home/ fails', () => {
  const repo = makeTempRepo();
  writeFile(repo, 'src/z.js', "const p = '/home/runner/work';\n");
  commitAll(repo, 'init');
  const r = runLint(repo);
  assert.equal(r.status, 1);
  assert.match(r.stdout + r.stderr, /src\/z\.js/);
});

test('tests/fixtures/foo.json with /Users/ is exempt', () => {
  const repo = makeTempRepo();
  writeFile(repo, 'tests/fixtures/foo.json', '{"p": "/Users/foo/bar"}\n');
  commitAll(repo, 'init');
  const r = runLint(repo);
  assert.equal(r.status, 0, 'expected exit 0; output=' + r.stdout + r.stderr);
});

test('*.md with /Users/ is exempt', () => {
  const repo = makeTempRepo();
  writeFile(repo, 'docs/notes.md', 'See /Users/foo/bar for details.\n');
  commitAll(repo, 'init');
  const r = runLint(repo);
  assert.equal(r.status, 0);
});

test('line with `# lint-allow:hardcoded-path` is exempt', () => {
  const repo = makeTempRepo();
  writeFile(
    repo,
    'src/allowed.sh',
    "PATH_TO_USER='/Users/foo/bar' # lint-allow:hardcoded-path\n"
  );
  commitAll(repo, 'init');
  const r = runLint(repo);
  assert.equal(r.status, 0, 'output=' + r.stdout + r.stderr);
});

test('C:\\\\Users on a single line is caught (escaped-backslash form)', () => {
  // (PC-07) Source-code escaped-backslash form: the JS string literal
  // 'C:\\\\Users\\\\foo\\\\bar' renders four backslash chars on disk
  // (C:\\Users\\foo\\bar), which the regex `C:\\\\` (matching `C:\\`) catches.
  const repo = makeTempRepo();
  writeFile(repo, 'src/y.js', "const p = 'C:\\\\Users\\\\foo\\\\bar';\n");
  commitAll(repo, 'init');
  const r = runLint(repo);
  assert.equal(r.status, 1, 'expected exit 1; output=' + r.stdout + r.stderr);
  assert.match(r.stdout + r.stderr, /src\/y\.js/);
});
