---
phase: 01-plugin-foundation-contract-ci-gates
plan: 02
type: execute
wave: 2
depends_on: [01]
files_modified:
  - hooks/hooks.json
  - hooks/check-deps.sh
  - tests/check-deps.test.js
autonomous: true
requirements: [FOUND-03, FOUND-04]
must_haves:
  truths:
    - "SessionStart hook performs non-blocking dep check (soffice/pdftoppm/node ≥ 18) and ALWAYS exits 0"
    - "First-run npm ci installs deps into ${CLAUDE_PLUGIN_DATA}/node_modules and writes sentinel"
    - "Re-runs are skipped when package-lock.json SHA matches sentinel"
    - "Hook output is a single line prefixed `Instadecks:`"
    - "npm ci does NOT pollute ${CLAUDE_PLUGIN_ROOT}/node_modules — installs are confined to ${CLAUDE_PLUGIN_DATA}/node_modules"
  artifacts:
    - path: "hooks/hooks.json"
      provides: "SessionStart hook registration"
      contains: '"SessionStart"'
    - path: "hooks/check-deps.sh"
      provides: "Dep check + npm ci sentinel guard + font detect (font install handled in Plan 07)"
    - path: "tests/check-deps.test.js"
      provides: "Integration test invoking hook via spawnSync; asserts data-dir install, no root-dir pollution"
  key_links:
    - from: "hooks/hooks.json"
      to: "hooks/check-deps.sh"
      via: "command field with ${CLAUDE_PLUGIN_ROOT}"
      pattern: 'check-deps.sh'
    - from: "hooks/check-deps.sh"
      to: "package-lock.json"
      via: "shasum -a 256 against ${CLAUDE_PLUGIN_DATA}/.npm-installed-sentinel"
      pattern: "npm-installed-sentinel"
---

<objective>
Implement the SessionStart hook per D-08: dep checks (soffice/pdftoppm/node ≥ 18), npm ci sentinel guard, font detection stub (font copy hook is wired in Plan 07 once fonts are bundled), `Instadecks:` prefixed summary line, ALWAYS exits 0. Add `node --test` integration test invoking the script via `child_process.spawnSync`.

Purpose: FOUND-03/04 — non-blocking first-run install + dep check.
Output: hooks.json, check-deps.sh (chmod +x), and integration test.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/01-plugin-foundation-contract-ci-gates/01-CONTEXT.md
@.planning/phases/01-plugin-foundation-contract-ci-gates/01-RESEARCH.md
@.planning/phases/01-plugin-foundation-contract-ci-gates/01-PATTERNS.md
@.planning/phases/01-plugin-foundation-contract-ci-gates/01-01-SUMMARY.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Write hooks.json + check-deps.sh</name>
  <files>hooks/hooks.json, hooks/check-deps.sh</files>
  <action>
    Per D-08, RESEARCH.md Pattern 2, and PATTERNS.md "hooks/check-deps.sh" row:

    Create `hooks/hooks.json` with single SessionStart entry, matcher `"startup|clear|compact"`, command `"\"${CLAUDE_PLUGIN_ROOT}/hooks/check-deps.sh\""`, `async: false`, `timeout: 30`. Two-space indent, valid JSON.

    Create `hooks/check-deps.sh` with shebang `#!/usr/bin/env bash`, then **`set -euo pipefail`** (PC-03: matches PATTERNS.md — the `-e` is paired with the always-exit-0 contract via the next line), then **`trap 'exit 0' ERR`** (this trap is what enforces the always-exit-0 contract per D-08 — any failure under `set -e` is caught and converted to exit 0), then `umask 0077`. Implement per RESEARCH.md Pattern 2 skeleton:

    1. Resolve `${CLAUDE_PLUGIN_ROOT}` and `${CLAUDE_PLUGIN_DATA}`; mkdir -p the data dir.
    2. Section banner `# ── Tool availability ────...`. Loop `for tool in soffice pdftoppm node`; check `command -v`; collect missing into WARN array.
    3. Section banner `# ── Node version ─...`. If node available, parse major; require ≥ 18; else WARN.
    4. Section banner `# ── npm ci sentinel ─...`. SENTINEL=`${CLAUDE_PLUGIN_DATA}/.npm-installed-sentinel`. LOCK_SHA via `shasum -a 256 "$PLUGIN_ROOT/package-lock.json" | awk '{print $1}'`. PREV_SHA via `cat "$SENTINEL" 2>/dev/null || echo ""`. If LOCK_SHA non-empty and differs from PREV_SHA: `cd "$PLUGIN_ROOT" && npm ci --omit=dev --prefix "$PLUGIN_DATA"` redirected to /dev/null; on success append "install complete" to INFO and write LOCK_SHA to SENTINEL; on failure append "npm ci failed" to WARN. Use defensive `||` chains plus the ERR trap, never let a failure abort the script.
    5. Section banner `# ── Font detect (install in Plan 07 once fonts bundled) ─...`. Stub: if `fc-list` exists and `fc-list | grep -qi "IBM Plex Sans"` returns nonzero, append `install IBM Plex Sans manually: see assets/fonts/IBM_Plex_Sans/` to WARN. Plan 07 replaces this stub with actual copy + fc-cache logic.
    6. Single summary line: if WARN empty → `echo "Instadecks: deps OK${INFO:+ (${INFO[*]})}"`; else `echo "Instadecks: ${WARN[*]}"`.
    7. `exit 0` ALWAYS (final line).

    Make executable: `chmod +x hooks/check-deps.sh`.

    Use `${CLAUDE_PLUGIN_ROOT}` / `${CLAUDE_PLUGIN_DATA}` — never hardcoded paths.
  </action>
  <verify>
    <automated>test -x hooks/check-deps.sh && node -e "JSON.parse(require('fs').readFileSync('hooks/hooks.json'))" && grep -q 'set -euo pipefail' hooks/check-deps.sh && grep -q "trap 'exit 0' ERR" hooks/check-deps.sh && grep -q 'exit 0' hooks/check-deps.sh && grep -q "Instadecks:" hooks/check-deps.sh</automated>
  </verify>
  <done>hooks.json valid; check-deps.sh executable; uses `set -euo pipefail` + `trap 'exit 0' ERR`; contains exit 0; prefixes output `Instadecks:`; uses sentinel pattern.</done>
</task>

<task type="auto">
  <name>Task 2: Write check-deps.test.js integration test</name>
  <files>tests/check-deps.test.js</files>
  <action>
    Per RESEARCH.md Open Question #3 (recommend bash hook + spawnSync test) and PATTERNS.md test conventions:

    Create `tests/check-deps.test.js` using `node:test`, `node:assert/strict`, `node:child_process` (spawnSync), `node:fs`, `node:os`, `node:path`. First-line banner: `// Integration test for hooks/check-deps.sh — invokes the script via spawnSync and asserts behavior.`

    Tests (use `t.test` subtests within a top-level `test('check-deps.sh')`):
    1. `'always exits 0 (non-blocking contract per D-08)'`: spawnSync `bash hooks/check-deps.sh` with env `CLAUDE_PLUGIN_ROOT=process.cwd()` and `CLAUDE_PLUGIN_DATA=fs.mkdtempSync(path.join(os.tmpdir(),'cd-'))`. Assert `result.status === 0`.
    2. `'output begins with "Instadecks:" prefix'`: same invocation; assert `result.stdout.toString().startsWith('Instadecks:')`.
    3. `'creates sentinel after first run'`: same env; after invocation, assert sentinel file exists at `${CLAUDE_PLUGIN_DATA}/.npm-installed-sentinel` (only if `npm ci` succeeded — guard with `if result.stdout.includes('install complete')`).
    4. `'sentinel guard prevents re-install on second run'`: invoke twice with same DATA dir; assert second run's stdout does NOT contain "install complete".
    5. **(PC-04) `'npm ci installs into CLAUDE_PLUGIN_DATA, not CLAUDE_PLUGIN_ROOT'`**: invoke once with fresh DATA dir; if stdout includes "install complete", assert `fs.existsSync(path.join(dataDir, 'node_modules'))` is `true` AND `fs.existsSync(path.join(rootDir, 'node_modules'))` is `false` (or — if root already has node_modules from devDeps — assert that the data-dir node_modules exists independently and contains pptxgenjs: `fs.existsSync(path.join(dataDir, 'node_modules', 'pptxgenjs'))`). The strict assertion is that the install lands inside `${CLAUDE_PLUGIN_DATA}` — root-pollution is the failure mode being prevented.

    Tests must be hermetic: each uses a fresh tmpdir for CLAUDE_PLUGIN_DATA, no global state mutation. Skip npm-ci-dependent assertions gracefully if `npm` unavailable (use `t.skip()` with reason).
  </action>
  <verify>
    <automated>node --test tests/check-deps.test.js</automated>
  </verify>
  <done>node --test passes against tests/check-deps.test.js with all 5 subtests green or skipped-with-reason. Subtest 5 confirms install lands in data dir, not root dir.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| SessionStart event → check-deps.sh | Claude Code invokes the script with controlled env (CLAUDE_PLUGIN_ROOT / DATA) — no user input crosses |
| check-deps.sh → npm registry | `npm ci` fetches deps from registry on first run |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-02-01 | Tampering | npm ci supply chain | mitigate | `npm ci` refuses lockfile drift; license-checker (Plan 08) blocks GPL drift |
| T-02-02 | Elevation of Privilege | check-deps.sh executes user-controlled commands | accept | No user input flows into commands; only fixed `command -v`, `npm ci`, `shasum`, `fc-list` calls |
| T-02-03 | Denial of Service | npm ci hangs SessionStart | mitigate | hooks.json `timeout: 30` caps execution; `trap 'exit 0' ERR` ensures non-blocking |
| T-02-04 | Information Disclosure | sentinel writes inside CLAUDE_PLUGIN_DATA | mitigate | `umask 0077` restricts permissions to owner only |
</threat_model>

<verification>
- `bash hooks/check-deps.sh` exits 0 in a clean tmpdir env
- Output begins with `Instadecks:`
- Second invocation skips npm ci (sentinel guard works)
- npm ci install confined to `${CLAUDE_PLUGIN_DATA}/node_modules`
</verification>

<success_criteria>
- FOUND-03: dep check is non-blocking (always exit 0) and surfaces a single clear line
- FOUND-04: npm ci runs on first SessionStart; sentinel skips re-runs; install lands in data dir, not root
- Integration test passes with `node --test tests/check-deps.test.js`
</success_criteria>

<output>
After completion, create `.planning/phases/01-plugin-foundation-contract-ci-gates/01-02-SUMMARY.md`
</output>
