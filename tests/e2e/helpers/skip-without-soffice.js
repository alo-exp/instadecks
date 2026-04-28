'use strict';
// E2E skip guard (Plan 08-06 Task 2; CONTEXT D-08).
// Returns true (and registers a node:test skip) when the e2e test should NOT run:
//   - process.env.CI === 'true'  → unconditional skip in CI
//   - `command -v soffice` empty → silent skip with install hint

const { spawnSync } = require('node:child_process');

function skipWithoutSoffice(t) {
  if (process.env.CI === 'true') {
    t.skip('CI=true: e2e tests do not run in CI (CONTEXT D-08)');
    return true;
  }
  const r = spawnSync('command', ['-v', 'soffice'], { shell: true, encoding: 'utf8' });
  if (r.status !== 0 || !String(r.stdout || '').trim()) {
    t.skip('soffice not on PATH; install LibreOffice to run e2e tests');
    return true;
  }
  return false;
}

module.exports = { skipWithoutSoffice };
