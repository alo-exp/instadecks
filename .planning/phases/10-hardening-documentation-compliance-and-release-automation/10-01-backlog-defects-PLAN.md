---
plan: 10-01
phase: 10
slug: backlog-defects
status: ready
created: 2026-04-29
wave: 1
depends_on: []
autonomous: true
files_modified:
  - tools/lint-pptxgenjs-enums.js
  - tests/tools-lint-pptxgenjs-enums-branches.test.js
  - skills/create/scripts/index.js
  - tests/orchestrator-runCreate-branches.test.js
  - tests/license-audit.test.js
  - tests/fixtures/lint-typo-shape.cjs
requirements: [HARD-01, HARD-02, HARD-03]

must_haves:
  truths:
    - "tools/lint-pptxgenjs-enums.js detects `pres.shapes.<KEY>` references where <KEY> is not an exported pptxgenjs ShapeType enum (e.g., RECT, OVALL, ROUNDED_RECT_OLD); emits `file:line pres.shapes.<KEY> — not an exported pptxgenjs ShapeType (suggestion: <closest-match>)` and exits 1; existing addShape() string-literal detection unchanged"
    - "Closest-match suggestion uses Levenshtein distance against the canonical ShapeType key list embedded in lint-pptxgenjs-enums.js; if no key within distance 3, suggestion is omitted"
    - "Exported ShapeType key list source: `require('pptxgenjs').ShapeType` keys, captured at lint-script load time (not hardcoded — re-derives on every run so a future pptxgenjs version bump auto-updates)"
    - "skills/create/scripts/index.js runCreate serializes parallel invocations against the same outDir via a cwd-scoped lock file at `${outDir}/.runCreate.lock`; lock is acquired with `fs.openSync(path, 'wx')`, retried every 250ms up to 30 seconds (wall clock), released in a finally block; on 30s timeout emits stderr `runCreate: cwd lock timeout (30s) on ${outDir} — soft-fail, proceeding without lock` and proceeds (soft-fail per HARD-02 acceptance)"
    - "Lock acquisition fires BEFORE the existing soffice invocation in render pipeline; lock release fires in finally regardless of throw/success path"
    - "tools/license-audit.js lines 133-134 (`process.stdout.write('license-audit: OK ...')`) covered by direct unit test asserting the success-path stdout via captured `process.stdout.write` interception"
    - "`npx c8 --100 --check-coverage npm test` exits 0 with NO `/* c8 ignore */` block surrounding the lines 133-134 success branch (prior coverage was achieved via ignore comments — Phase 10 closes the gap with a real test)"
    - "All existing tests still pass; new tests for lint typo detection (≥4 cases: typo'd key, valid key, no shape access, unknown property) + cwd lock (≥3 cases: serial, parallel-blocked, timeout-soft-fail) + license-audit OK stdout"
  artifacts:
    - path: "tools/lint-pptxgenjs-enums.js"
      provides: "Extended lint with pres.shapes.<KEY> typo detection"
      contains: "pres.shapes."
    - path: "skills/create/scripts/index.js"
      provides: "runCreate cwd lock for parallel-safe soffice invocation"
      contains: ".runCreate.lock"
    - path: "tests/license-audit.test.js"
      provides: "Direct unit test of license-audit OK-path stdout (lines 133-134)"
      contains: "license-audit: OK"
    - path: "tests/fixtures/lint-typo-shape.cjs"
      provides: "Negative fixture: pres.shapes.RECT (typo of RECTANGLE)"
      contains: "pres.shapes.RECT"
  key_links:
    - from: "tools/lint-pptxgenjs-enums.js"
      to: "node_modules/pptxgenjs (ShapeType enum)"
      via: "require('pptxgenjs').ShapeType keys derived at load time"
      pattern: "ShapeType"
    - from: "skills/create/scripts/index.js"
      to: "fs.openSync('${outDir}/.runCreate.lock', 'wx')"
      via: "exclusive-create lock acquisition before soffice invocation"
      pattern: ".runCreate.lock"
    - from: "tests/license-audit.test.js"
      to: "tools/license-audit.js"
      via: "intercepts process.stdout.write to assert OK-path emission"
      pattern: "license-audit: OK"
---

<objective>
Wave 1 — backlog closure. Three independent defects surfaced through 8 live E2E iterations + /silver-scan get closed in a single plan because each is small and they don't share files.
1. HARD-01: extend the existing pptxgenjs enum lint to also flag typo'd `pres.shapes.<KEY>` (e.g., `RECT` instead of `RECTANGLE`) — currently only the `addShape('string', ...)` form is caught.
2. HARD-02: serialize parallel runCreate invocations against the same outDir via a cwd-scoped lock file so soffice's user-profile lock no longer races on cold start.
3. HARD-03: close the c8 100% coverage gap on tools/license-audit.js:133-134 (the OK-path stdout branch) with a real unit test, removing any `c8 ignore` comments that papered over it.

Purpose: clears the three documented defects so Phase 10's release-automation gates run against a clean tree.
Output: 3 file edits + 3 test files (1 new, 2 extended) + 1 new fixture.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/SPEC.md
@.planning/STATE.md
@CLAUDE.md
@tools/lint-pptxgenjs-enums.js
@tools/license-audit.js
@skills/create/scripts/index.js
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Extend lint-pptxgenjs-enums.js with pres.shapes.&lt;KEY&gt; typo detection (HARD-01)</name>
  <read_first>tools/lint-pptxgenjs-enums.js (full 71 lines — keep existing addShape() detection logic intact); node_modules/pptxgenjs/types/index.d.ts (locate ShapeType enum to confirm `require('pptxgenjs').ShapeType` returns an object whose keys are the canonical names like RECTANGLE, OVAL, ROUNDED_RECTANGLE); tests/tools-lint-pptxgenjs-enums-branches.test.js (existing test file — mirror style for new cases)</read_first>
  <files>tools/lint-pptxgenjs-enums.js, tests/fixtures/lint-typo-shape.cjs, tests/tools-lint-pptxgenjs-enums-branches.test.js</files>
  <behavior>
    - On a file containing `pres.shapes.RECT` (not a real ShapeType key), lint exits 1 with stderr containing `pres.shapes.RECT — not an exported pptxgenjs ShapeType (suggestion: RECTANGLE)`.
    - On a file containing `pres.shapes.RECTANGLE`, lint passes.
    - On a file containing `pres.shapes.SOMETHING_BIZARRE` (no close match within Levenshtein distance 3), stderr omits the suggestion and prints `pres.shapes.SOMETHING_BIZARRE — not an exported pptxgenjs ShapeType`.
    - Existing addShape() string-literal detection still fires on a file containing `pres.addShape('oval', ...)`.
  </behavior>
  <action>
1. At top of `tools/lint-pptxgenjs-enums.js`, add `const VALID_SHAPE_KEYS = new Set(Object.keys(require('pptxgenjs').ShapeType || {}));` (defensive `|| {}` so lint doesn't crash if pptxgenjs is uninstalled in CI bootstrap).
2. Add a second regex `const SHAPES_RE = /\bpres\.shapes\.([A-Z_][A-Z0-9_]*)/g;` (global flag — multiple violations per line).
3. Add a Levenshtein helper `function lev(a,b)` (standard DP, ≤30 lines).
4. In the `for (let i = 0; i < lines.length; i++)` loop, AFTER the existing addShape detection, run `SHAPES_RE` against the line. For each match, if `!VALID_SHAPE_KEYS.has(key)` AND the line lacks the `enum-lint-allow` marker: find closest valid key by min Levenshtein distance; if distance ≤ 3 push violation `${rel}:${i+1} pres.shapes.${key} — not an exported pptxgenjs ShapeType (suggestion: ${closest})`; else push `${rel}:${i+1} pres.shapes.${key} — not an exported pptxgenjs ShapeType`. Reset `SHAPES_RE.lastIndex = 0` on each new line.
5. Keep the `break` on first addShape violation per file (existing behavior). Pres.shapes typos do NOT break — surface ALL of them.
6. Create `tests/fixtures/lint-typo-shape.cjs` containing exactly: `module.exports = (pres) => pres.addShape(pres.shapes.RECT, { x: 0, y: 0, w: 1, h: 1 });` (3 lines).
7. Extend `tests/tools-lint-pptxgenjs-enums-branches.test.js` with 4 new test cases: (a) lint on the typo fixture exits 1 + stderr contains "RECTANGLE" suggestion; (b) lint on a fixture using `pres.shapes.RECTANGLE` passes; (c) lint on `pres.shapes.SOMETHING_BIZARRE` exits 1 with no suggestion; (d) ALLOW_MARKER on a typo line skips the violation. Use `child_process.spawnSync('node', [tools/lint-pptxgenjs-enums.js])` with `cwd` pointing to a temp dir containing only the fixture (mirror existing test style).
  </action>
  <verify>
    <automated>node --test tests/tools-lint-pptxgenjs-enums-branches.test.js && node tools/lint-pptxgenjs-enums.js</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c "pres.shapes" tools/lint-pptxgenjs-enums.js` returns ≥ 2
    - `grep -c "ShapeType" tools/lint-pptxgenjs-enums.js` returns ≥ 1
    - `node tools/lint-pptxgenjs-enums.js` against current repo exits 0 (existing source has no `pres.shapes.<typo>` violations — confirm by running)
    - `node --test tests/tools-lint-pptxgenjs-enums-branches.test.js` passes all original + 4 new test cases
    - `tests/fixtures/lint-typo-shape.cjs` listed in lint ALLOW set in tools/lint-pptxgenjs-enums.js (it is intentionally a negative fixture; mirror the existing `tests/fixtures/bad-render-deck.cjs` allow-list pattern)
  </acceptance_criteria>
  <done>Lint extension live; typo detection green; full repo lint exits 0.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: cwd lock in runCreate to serialize parallel soffice invocations (HARD-02)</name>
  <read_first>skills/create/scripts/index.js lines 300-410 (find the soffice invocation site — search for `soffice` / `pptx-to-images` / `renderImages`); skills/create/scripts/index.js lines 1-50 (existing imports — fs, fsp); tests/orchestrator-runCreate-branches.test.js (existing test style for runCreate branch coverage)</read_first>
  <files>skills/create/scripts/index.js, tests/orchestrator-runCreate-branches.test.js</files>
  <behavior>
    - Two parallel `runCreate({brief, outDir: '/tmp/x'})` calls: the second blocks on `${outDir}/.runCreate.lock` for ≤30s, then proceeds in serial (not parallel) order.
    - On 30s timeout, second call emits stderr `runCreate: cwd lock timeout (30s) on /tmp/x — soft-fail, proceeding without lock` and proceeds (does NOT throw).
    - Lock file is removed in a finally block — both happy-path and throw-path cleanup.
    - Single (non-parallel) runCreate behavior is byte-identical to pre-Phase-10 behavior.
  </behavior>
  <action>
1. In `skills/create/scripts/index.js`, AFTER `await fsp.mkdir(resolvedOut, { recursive: true });` (around line 343 — verify with read_first), add an `acquireCwdLock(resolvedOut)` call. Capture the return value `releaseLock` and call it in a finally that wraps the entire body of runCreate from this point forward.
2. Add a private async function `acquireCwdLock(dir)` near the top of the file (above `runCreate`):
   ```
   async function acquireCwdLock(dir) {
     const lockPath = path.join(dir, '.runCreate.lock');
     const deadline = Date.now() + 30_000;
     while (Date.now() < deadline) {
       try {
         const fd = fs.openSync(lockPath, 'wx');
         fs.writeSync(fd, String(process.pid));
         fs.closeSync(fd);
         return () => { try { fs.unlinkSync(lockPath); } catch {} };
       } catch (e) {
         if (e.code !== 'EEXIST') throw e;
         await new Promise(r => setTimeout(r, 250));
       }
     }
     process.stderr.write(`runCreate: cwd lock timeout (30s) on ${dir} — soft-fail, proceeding without lock\n`);
     return () => {}; // no-op release on soft-fail
   }
   ```
3. Wrap the existing runCreate body (from after `await fsp.mkdir(resolvedOut, ...)` to the existing `return { ... }`) in `let releaseLock; try { releaseLock = await acquireCwdLock(resolvedOut); /* existing body */ } finally { if (releaseLock) releaseLock(); }`. The existing return must still surface; do NOT swallow throws.
4. Tests: add 3 cases to `tests/orchestrator-runCreate-branches.test.js`:
   (a) **serial**: two sequential `runCreate` calls against same outDir both succeed, lock file absent after each.
   (b) **parallel-blocked**: pre-create `${outDir}/.runCreate.lock`, schedule `runCreate` in background, wait 1s, assert it has not yet emitted its first stdout marker; then unlink the lock and assert it completes within 2 more seconds.
   (c) **timeout-soft-fail**: monkey-patch the deadline (use `INSTADECKS_LOCK_TIMEOUT_MS` env var — add as override in `acquireCwdLock`: `const timeoutMs = parseInt(process.env.INSTADECKS_LOCK_TIMEOUT_MS, 10) || 30_000;`). Set to 100ms in test. Pre-create lock, run runCreate, assert stderr matches `cwd lock timeout` and runCreate still resolves.
   Use `INSTADECKS_LLM_STUB=1` + `INSTADECKS_RENDER_STUB=1` env vars (Phase 8 contracts) so tests don't actually invoke soffice.
  </action>
  <verify>
    <automated>node --test tests/orchestrator-runCreate-branches.test.js</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c ".runCreate.lock" skills/create/scripts/index.js` returns ≥ 1
    - `grep -c "acquireCwdLock" skills/create/scripts/index.js` returns ≥ 2 (definition + call)
    - `grep "cwd lock timeout" skills/create/scripts/index.js` returns 1 line
    - All 3 new test cases pass
    - All existing orchestrator-runCreate-branches.test.js cases still pass
    - Full `npm test` green; c8 100% gate maintained (no new ignore comments)
  </acceptance_criteria>
  <done>Parallel runCreate is serialized via cwd lock; 30s soft-fail emits documented stderr.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Direct unit test of license-audit.js OK-path stdout (HARD-03)</name>
  <read_first>tools/license-audit.js lines 100-148 (the success-path stdout emission at line 133-134; note the existing `/* c8 ignore start */ ... /* c8 ignore stop */` block at lines 142-148 — that ignore is for the require.main === module guard, NOT for the OK-path branch); tests/license-audit.test.js (existing test style); tests/tools-license-audit-branches.test.js (related branch tests)</read_first>
  <files>tests/license-audit.test.js</files>
  <behavior>
    - With a clean dependency tree (current repo), invoking `runCheck(rootDir)` resolves with `{ ok: true, violations: [] }` AND emits exactly `license-audit: OK (no GPL/AGPL prod deps; NOTICE <-> licenses/ in sync)\n` to stdout.
    - The test captures stdout via monkey-patching `process.stdout.write` for the duration of the call, restores it in finally, and asserts the captured buffer contains the expected literal.
  </behavior>
  <action>
1. In `tests/license-audit.test.js`, add a new test case `test('runCheck emits OK message to stdout on clean tree')`:
   ```
   const { runCheck } = require('../tools/license-audit.js');
   const orig = process.stdout.write.bind(process.stdout);
   let captured = '';
   process.stdout.write = (chunk, ...rest) => { captured += String(chunk); return orig(chunk, ...rest); };
   try {
     const r = await runCheck(path.join(__dirname, '..'));
     assert.strictEqual(r.ok, true);
     assert.match(captured, /license-audit: OK \(no GPL\/AGPL prod deps; NOTICE <-> licenses\/ in sync\)/);
   } finally {
     process.stdout.write = orig;
   }
   ```
2. Verify there is NO `/* c8 ignore */` directive surrounding lines 132-134 of `tools/license-audit.js`. If one exists (added in a prior phase to paper over this gap), remove it. The existing ignore at lines 142-148 around `if (require.main === module)` is correct and stays.
3. Run `npx c8 --100 --check-coverage npm test`; if c8 still flags lines 132-134 uncovered, the test interception above is not running through the code path — fix by replacing the test fixture with one that walks all the same conditionals so the OK branch is reached.
  </action>
  <verify>
    <automated>node --test tests/license-audit.test.js && npx c8 --100 --check-coverage --include='tools/license-audit.js' node --test tests/license-audit.test.js tests/tools-license-audit-branches.test.js</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c "license-audit: OK" tests/license-audit.test.js` returns ≥ 1
    - The new test case passes
    - `npx c8 --100 --check-coverage --include='tools/license-audit.js' node --test tests/license-audit.test.js tests/tools-license-audit-branches.test.js` exits 0
    - No `c8 ignore` directive surrounds lines 132-134 of `tools/license-audit.js`
    - Full `npm test` (= `c8 --100 --check-coverage` per Phase 8) exits 0
  </acceptance_criteria>
  <done>License-audit OK path covered by direct test; c8 100% gate clean without ignore residuals.</done>
</task>

</tasks>

<verification>
- HARD-01: `node tools/lint-pptxgenjs-enums.js` extended; typo detection live; all repo source clean
- HARD-02: parallel runCreate serialized via .runCreate.lock; 30s soft-fail documented
- HARD-03: license-audit OK-path covered by direct test; c8 ignore residuals removed
- Full `npm test` green with 100% coverage maintained
</verification>

<success_criteria>
- AC-01, AC-02, AC-03 satisfied per SPEC.md
- All existing tests still pass
- No new `c8 ignore` comments introduced
</success_criteria>

<output>
After completion, create `.planning/phases/10-hardening-documentation-compliance-and-release-automation/10-01-SUMMARY.md`.
</output>
