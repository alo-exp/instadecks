---
plan: 08-03
phase: 08
slug: annotate-geometry
status: ready
created: 2026-04-28
wave: 2
depends_on: [08-01]
autonomous: true
files_modified:
  - tests/annotate-geometry.test.js
  - tests/annotate-polygon.test.js
  - tests/annotate-charpts.test.js
  - tests/annotate-miter.test.js
  - tests/annotate-overflow.test.js
  - tests/annotate-color.test.js
requirements: [TEST-02]

must_haves:
  truths:
    - "Polygon-math primitives (point projection, vector normalization, perpendicular, interior-angle bisector — whatever annotate.js exposes for arrow-shaft construction) are directly unit-tested with deterministic inputs and floating-point tolerance ≤1e-9."
    - "charPts table coverage: every entry in annotate.js's character-points lookup (used to size the severity-tag glyph row) is round-tripped — the test asserts the table's array length, total-width sum, and that no entry is undefined for the printable ASCII subset annotate.js consumes."
    - "Miter-join logic: at least three angle classes are exercised — acute (~30°), right (~90°), obtuse (~150°) — each producing a finite miter length and a join geometry that does NOT collapse to a degenerate point (length > epsilon)."
    - "MAX_SIDE overflow: when the requested annotation count exceeds MAX_SIDE per side, the overflow branch (tail callout / wrap behavior) is exercised; assert the function does NOT throw, returns a deterministic shape, and respects the documented MAX_SIDE constant value (read from source, do not hard-code)."
    - "Color/transparency coverage: every severity-tier color constant (MAJOR / MINOR / POLISH) round-trips through whatever color helper annotate.js exposes; transparency value matches the source-of-truth constant (read from annotate.js, do not invent)."
    - "Layout constants: page width, page height, margin, slide-image positioning constants are exercised via at least one test that asserts they're consumed by the geometry function with the expected effect (e.g. annotation Y-coordinate respects top margin)."
    - "Visual-regression baseline (tests/fixtures/v8-reference/) is consulted as a deterministic outcome anchor: the most-comprehensive geometry test runs annotate.js end-to-end on tests/fixtures/sample-findings.json and asserts the produced PPTX's normalized SHA matches the existing baseline (existing tests/annotate-visual-regression.test.js already does this; new tests here are NARROWER unit tests that don't duplicate it)."
    - "Every top-level function in `skills/annotate/scripts/annotate.js` (enumerated via `grep -E '^(function |const .* = |[a-z]+:)' skills/annotate/scripts/annotate.js`) has at least one covering test across the 6 test files (W-2 closure). The plan is NOT limited to the 6 named primitives — every named function must map to a covering assertion."
    - "All 6 tests run via `node --test` in <10s combined; no soffice spawn, no network, no fs writes outside os.tmpdir()."
    - "annotate.js is treated as standard source (CONTEXT D-01); the testing approach uses `require('skills/annotate/scripts/annotate.js')` if it exposes module.exports, OR uses the existing `_test_*` instrumentation pattern from tests/annotate-runtime.test.js if it does not (verify by reading annotate.js head-of-file before authoring)."
  artifacts:
    - path: "tests/annotate-polygon.test.js"
      provides: "Direct tests for polygon-math primitives in annotate.js"
      contains: "describe('polygon math'"
    - path: "tests/annotate-charpts.test.js"
      provides: "charPts table sanity + width-sum + printable-ASCII coverage"
      contains: "charPts"
    - path: "tests/annotate-miter.test.js"
      provides: "Miter-join geometry across acute/right/obtuse angle classes"
      contains: "miter"
    - path: "tests/annotate-overflow.test.js"
      provides: "MAX_SIDE overflow branch coverage"
      contains: "MAX_SIDE"
    - path: "tests/annotate-color.test.js"
      provides: "Severity color + transparency constants round-trip"
      contains: "MAJOR"
    - path: "tests/annotate-geometry.test.js"
      provides: "Layout-constants integration: full annotate.js on sample-findings.json + normalized-SHA assertion against v8 baseline"
      contains: "Annotations_Sample"
  key_links:
    - from: "tests/annotate-geometry.test.js"
      to: "tests/fixtures/v8-reference/Annotations_Sample.pptx.normalized.sha256"
      via: "End-to-end run consumes the existing baseline as ground truth"
      pattern: "normalized.sha256"
    - from: "tests/annotate-polygon.test.js"
      to: "skills/annotate/scripts/annotate.js"
      via: "Direct require + numeric assertions on polygon helpers"
      pattern: "require.*annotate\\.js"
---

<objective>
Wave 2 (parallel with 8-02 + 8-04): direct unit tests for the geometry primitives in `skills/annotate/scripts/annotate.js`. Per CONTEXT D-01, annotate.js is now under standard test discipline; this plan delivers polygon-math, charPts, miter-join, MAX_SIDE overflow, color/transparency, and layout-constants coverage. The existing `tests/annotate-visual-regression.test.js` provides the system-level outcome anchor — these new tests are NARROWER unit tests that drive c8 branch coverage on annotate.js to 100% without re-rendering PPTX bytes for every assertion.

Purpose: annotate.js was the largest uncovered surface in the codebase (verbatim-only policy made unit tests off-limits). With the policy reversal, hand-writing 6 narrow test files is the cheapest path to 100% on this file.

Output: 6 new test files; targeted c8 (`--include 'skills/annotate/scripts/annotate.js'`) reaches 100% on annotate.js; no production-source change to annotate.js beyond the existing require-path patch.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md
@CLAUDE.md
@.planning/phases/08-test-coverage-100/08-CONTEXT.md
@.planning/phases/08-test-coverage-100/08-01-c8-wiring-baseline-PLAN.md
@.c8rc.json
@skills/annotate/scripts/annotate.js
@skills/annotate/scripts/samples.js
@skills/annotate/scripts/adapter.js
@tests/annotate-visual-regression.test.js
@tests/annotate-runtime.test.js
@tests/annotate-integrity.test.js
@tests/annotate-adapter.test.js
@tests/fixtures/sample-findings.json
@tests/fixtures/v8-reference/

<interfaces>
**annotate.js export shape — VERIFY before authoring tests:**

annotate.js may or may not currently expose internal helpers via module.exports. Before authoring tests:
```bash
grep -n 'module\\.exports\\|^function\\|^const ' skills/annotate/scripts/annotate.js | head -80
```
Three possible patterns the test author will encounter:
1. **All-exposed**: annotate.js already exports helpers. → require + call directly.
2. **Top-level-runnable**: annotate.js runs side-effectfully when required (the v8 BluePrestige original did this). → use the existing `tests/annotate-runtime.test.js` `child_process.execFile('node', ['skills/annotate/scripts/annotate.js'], ...)` precedent for end-to-end; for primitive helpers, evaluate the source via `vm.runInNewContext` to extract pure functions without side effects.
3. **Mixed**: some helpers reachable via require, others only via runtime exec. → use both.

**Source-of-truth constants (read from annotate.js head):**
- `MAX_SIDE` — annotation-count-per-side cap (number).
- Severity colors — `MAJOR`, `MINOR`, `POLISH` hex strings.
- Transparency — single number 0..100 used for fill transparency.
- Layout — page width/height (EMU or inches per pptxgenjs), margins.

DO NOT invent values. Read each from annotate.js, alias as `EXPECTED_*` constants in the test file, then assert behavior consumes them.

**Polygon-math primitives (typical names — confirm by grep):**
- Point projection / closest-point-on-line.
- Vector normalize / length.
- Perpendicular vector (90° CCW rotation).
- Interior-angle bisector (used for miter-join direction).
- Polygon-from-line (line-thicken-to-polygon for arrow shafts).

For each primitive present in annotate.js, write 2-4 deterministic numeric assertions with `assert.ok(Math.abs(actual - expected) < 1e-9)`.

**charPts table:**
Find the literal — typically a long array or object literal of `{char, width}` pairs near the top of annotate.js. Tests:
- Length matches expected ASCII printable subset annotate.js consumes (read source, don't invent).
- Total-width sum is deterministic (compute once, freeze in test).
- No entry is `undefined` / `NaN`.
- Lookup returns expected width for a few canonical chars (e.g. ' ', 'A', '1').

**Miter-join — three angle classes:**
Construct synthetic 3-point input arrays:
- Acute: `(0,0), (1,0), (1.5, 0.866)` → 60° interior turn.
- Right: `(0,0), (1,0), (1,1)` → 90° turn.
- Obtuse: `(0,0), (1,0), (2,0.5)` → ~150° turn.
For each, call the miter helper (or render the arrow head + read back the polygon points), assert miter length is finite, > epsilon, and matches the analytical formula `1 / sin(theta/2)` within 1e-6 tolerance.

**MAX_SIDE overflow:**
- Build a SAMPLES-shaped input with `MAX_SIDE + 1` annotations on a single side.
- Run the shape-construction path (or end-to-end render for the smallest deck the runtime supports).
- Assert: no throw; returned shape count is deterministic; the overflow branch (tail callout / wrap) is exercised.

**Color/transparency:**
- Read MAJOR/MINOR/POLISH constants from source.
- Construct a single-finding input per severity, render, then read back the inserted shape's `fill` color and transparency from the pptxgenjs spec object (annotate.js may store the object pre-write — find the right point to introspect via vm.runInNewContext or a spy on pptxgenjs's `addShape`).
- Assert constants match.

**Layout constants — integration test (tests/annotate-geometry.test.js):**
- Run annotate.js end-to-end on `tests/fixtures/sample-findings.json` (mirrors tests/annotate-visual-regression.test.js).
- Assert the produced PPTX's normalized SHA matches `tests/fixtures/v8-reference/Annotations_Sample.pptx.normalized.sha256`.
- This is INTENTIONALLY a duplicate of the existing visual-regression assertion — kept here so that c8 attributes the integration coverage to a Plan-08-03-owned file (some c8 reporting backends only attribute when the test file is in the run set).

**No source change to annotate.js.** If a primitive cannot be tested without exporting it, use `vm.runInNewContext(fs.readFileSync('skills/annotate/scripts/annotate.js', 'utf8'), ctx)` and extract the function from `ctx`. This is the test-only escape hatch — it does NOT modify annotate.js.

**Visual-regression baseline location (already committed in Phase 1):**
- `tests/fixtures/v8-reference/Annotations_Sample.pptx.normalized.sha256` — pinned baseline.
- `tests/fixtures/v8-reference/samples.js` — reference SAMPLES.
- `tests/fixtures/v8-reference/v8s-NN.jpg` — per-slide reference images.
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Polygon-math + charPts + miter-join unit tests (3 files)</name>
  <files>tests/annotate-polygon.test.js, tests/annotate-charpts.test.js, tests/annotate-miter.test.js</files>
  <read_first>
    - /Users/shafqat/Documents/Projects/instadecks/skills/annotate/scripts/annotate.js (read fully — single file; identify polygon helpers, charPts literal, miter math)
    - /Users/shafqat/Documents/Projects/instadecks/tests/annotate-runtime.test.js (the precedent for testing annotate.js — copy the require/vm idiom)
    - /Users/shafqat/Documents/Projects/instadecks/tests/annotate-visual-regression.test.js (system-level test idiom; the new geometry integration test in Task 2 mirrors this)
    - /Users/shafqat/Documents/Projects/instadecks/.planning/phases/08-test-coverage-100/08-CONTEXT.md (D-01 reversal — no SHA-pin policy; D-09 — no full-suite runs)
  </read_first>
  <behavior>
    **annotate-polygon.test.js**:
    - Each polygon-math helper found via grep gets a `describe(<name>)` block with 2-4 numeric assertions.
    - At minimum: vector-normalize on (3,4) → (0.6, 0.8); perpendicular of (1,0) → (0,1); polygon-from-line at thickness T → 4 corner points at expected offsets.
    - Tolerance: `Math.abs(a-b) < 1e-9`.
    - If a helper is not module-exported, extract via `vm.runInNewContext` per <interfaces>.

    **annotate-charpts.test.js**:
    - Read charPts from source via vm.runInNewContext.
    - Test 1: length matches literal length.
    - Test 2: every entry has finite numeric width.
    - Test 3: total-width sum (compute once, hard-code expected number based on actual table).
    - Test 4: lookups for ' ', 'A', '1', '?' return positive numbers.

    **annotate-miter.test.js**:
    - Three angle classes per <interfaces>.
    - For each: call miter helper (or evaluate via vm); compare to `1 / sin(theta/2)` analytical formula within 1e-6.
    - Edge: 180° straight line → miter length = 1 (no spike); 0° collapsed → either throws or clamps (assert documented behavior).
  </behavior>
  <action>
    **Step A — read annotate.js head + grep helpers:**
    ```bash
    grep -nE 'function |^const ' skills/annotate/scripts/annotate.js | head -80
    ```
    Map helper names to test cases per <behavior>.

    **Step B — TDD-RED-GREEN per file:**
    - tests/annotate-polygon.test.js: author, run `node --test tests/annotate-polygon.test.js`, fix.
    - tests/annotate-charpts.test.js: same.
    - tests/annotate-miter.test.js: same.

    **Step C — atomic commit:**
    ```bash
    git add tests/annotate-polygon.test.js tests/annotate-charpts.test.js tests/annotate-miter.test.js
    git commit -m "$(cat <<'EOF'
test(08-03): direct unit tests for annotate.js polygon math + charPts + miter

CONTEXT D-01: annotate.js is now under standard test discipline. New tests:
- polygon: vector-normalize, perpendicular, polygon-from-line within 1e-9.
- charpts: length, width-sum, printable-ASCII lookup determinism.
- miter: acute/right/obtuse angle classes against 1/sin(theta/2) analytical.

Helpers reached via vm.runInNewContext when not module-exported (test-only;
no source change to annotate.js).

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
    ```
  </action>
  <verify>
    <automated>node --test tests/annotate-polygon.test.js tests/annotate-charpts.test.js tests/annotate-miter.test.js</automated>
  </verify>
  <acceptance_criteria>
    - 3 test files exist; each contains `describe(` + ≥3 `test(` blocks.
    - All assertions pass green.
    - Numeric tolerances explicit (1e-9 polygon, 1e-6 miter).
    - No source change to skills/annotate/scripts/annotate.js (verified by `git diff main -- skills/annotate/scripts/annotate.js` showing no diff).
    - Atomic commit landed.
  </acceptance_criteria>
  <done>Polygon math, charPts table, miter geometry directly tested.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: MAX_SIDE overflow + color/transparency + layout-constants integration tests (3 files)</name>
  <files>tests/annotate-overflow.test.js, tests/annotate-color.test.js, tests/annotate-geometry.test.js</files>
  <read_first>
    - /Users/shafqat/Documents/Projects/instadecks/skills/annotate/scripts/annotate.js (locate MAX_SIDE, severity color constants, transparency constant — read EXACT VALUES)
    - /Users/shafqat/Documents/Projects/instadecks/skills/annotate/scripts/adapter.js (4→3 severity collapse — already covered by tests/annotate-adapter.test.js; new color test asserts the downstream constants the adapter feeds)
    - /Users/shafqat/Documents/Projects/instadecks/tests/annotate-visual-regression.test.js (the existing system-level test against the v8 baseline — Task 2's tests/annotate-geometry.test.js is a smaller-scoped sibling that asserts the SAME normalized SHA; reuse the SHA-comparison helper if exported)
    - /Users/shafqat/Documents/Projects/instadecks/tests/fixtures/sample-findings.json (the canonical input — do not modify)
    - /Users/shafqat/Documents/Projects/instadecks/tests/fixtures/v8-reference/Annotations_Sample.pptx.normalized.sha256 (the pinned expected SHA)
  </read_first>
  <behavior>
    **annotate-overflow.test.js**:
    - Read MAX_SIDE from source (vm or grep). Alias as `EXPECTED_MAX_SIDE`.
    - Build a SAMPLES-shaped input: 1 slide, `EXPECTED_MAX_SIDE + 1` annotations all on the right edge (force overflow).
    - Run annotate.js's render path (via existing runtime invocation pattern from tests/annotate-runtime.test.js — child_process or vm).
    - Assert: no throw; output PPTX is non-empty; the overflow shape (tail callout / wrap) is present in the rendered file's XML (grep for the documented overflow marker — read source to find what marks an overflow case).
    - Edge: at exactly `EXPECTED_MAX_SIDE` annotations → no overflow branch fires (sanity check).

    **annotate-color.test.js**:
    - Read severity color hex constants from annotate.js source.
    - For each severity (MAJOR / MINOR / POLISH): construct a 1-finding input, render, introspect the inserted shape (use a spy on pptxgenjs's addShape via require-cache, OR parse the produced PPTX XML, OR vm-eval the helper that constructs the shape spec).
    - Assert: shape fill matches the expected hex for that severity; transparency matches the expected constant.

    **annotate-geometry.test.js** (integration anchor):
    - Run annotate.js end-to-end on tests/fixtures/sample-findings.json (mirrors tests/annotate-visual-regression.test.js).
    - Compute normalized SHA of the produced PPTX (reuse `tools/normalize-pptx-sha.js` or the helper from tests/annotate-visual-regression.test.js).
    - Assert SHA matches `tests/fixtures/v8-reference/Annotations_Sample.pptx.normalized.sha256`.
    - This is intentionally a duplicate of the existing visual-regression assertion. Justification documented in the file header: "Plan 8-03 anchor — duplicates tests/annotate-visual-regression.test.js to ensure c8 attributes the integration coverage to an annotate-geometry-named test file."
  </behavior>
  <action>
    **Step A — extract source-of-truth constants:**
    ```bash
    grep -nE 'MAX_SIDE|MAJOR|MINOR|POLISH|transparency' skills/annotate/scripts/annotate.js | head -40
    ```
    Note the literal values; embed as `EXPECTED_*` in each test.

    **Step B — TDD-RED-GREEN per file:** author, run targeted `node --test tests/annotate-<name>.test.js`, fix.

    **Step C — verify normalized-SHA path is reusable:**
    ```bash
    grep -n 'normalize\\|sha256' tests/annotate-visual-regression.test.js | head -20
    ```
    If a helper is exported, require it; otherwise duplicate the small ~15-LOC normalization fn into the new file (acceptable — cheaper than refactor).

    **Step D — atomic commit:**
    ```bash
    git add tests/annotate-overflow.test.js tests/annotate-color.test.js tests/annotate-geometry.test.js
    git commit -m "$(cat <<'EOF'
test(08-03): annotate.js MAX_SIDE overflow + color/transparency + layout integration

- annotate-overflow: drives MAX_SIDE+1 annotations to force the overflow branch
  (tail callout / wrap); asserts deterministic shape count.
- annotate-color: per-severity (MAJOR/MINOR/POLISH) round-trip of fill hex +
  transparency constants — values read from source, not invented.
- annotate-geometry: end-to-end on sample-findings.json; normalized-SHA matches
  the Phase 1 v8 baseline. Intentional duplicate of annotate-visual-regression
  for c8-attribution under Plan 8-03 ownership.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
    ```

    **Step E — targeted c8 probe (single run, D-09 honored):**
    ```bash
    npx c8 --reporter=text --include 'skills/annotate/scripts/annotate.js' \
      node --test tests/annotate-polygon.test.js tests/annotate-charpts.test.js tests/annotate-miter.test.js tests/annotate-overflow.test.js tests/annotate-color.test.js tests/annotate-geometry.test.js tests/annotate-runtime.test.js tests/annotate-visual-regression.test.js tests/annotate-integrity.test.js
    ```
    Target: 100% on `skills/annotate/scripts/annotate.js`. Report residual % in SUMMARY.
  </action>
  <verify>
    <automated>node --test tests/annotate-overflow.test.js tests/annotate-color.test.js tests/annotate-geometry.test.js</automated>
  </verify>
  <acceptance_criteria>
    - 3 test files exist; each runs green.
    - tests/annotate-overflow.test.js references the source-read MAX_SIDE constant (no magic number).
    - tests/annotate-color.test.js asserts per-severity color + transparency match source constants.
    - tests/annotate-geometry.test.js asserts normalized SHA equals the pinned baseline.
    - Targeted c8 probe shows 100% on annotate.js.
    - Function enumeration check (W-2): `grep -E '^(function |const .* = |[a-z]+:)' skills/annotate/scripts/annotate.js | wc -l` returns N; SUMMARY lists each named function with the covering test file. Every named function MUST map to ≥1 covering test (no orphans).
    - No diff on `skills/annotate/scripts/annotate.js` (`git diff main -- skills/annotate/scripts/annotate.js` empty).
    - Atomic commit landed.
  </acceptance_criteria>
  <done>annotate.js geometry coverage closed; 100% targeted c8.</done>
</task>

</tasks>

<threat_model>
| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-08-07 | Tampering | vm.runInNewContext escape allows test code to mutate annotate.js helpers | accept | The vm context is isolated per-test; mutation happens only inside the test process. No persistent state on disk. |
| T-08-08 | Repudiation | New geometry tests pass while annotate.js silently regresses | mitigate | tests/annotate-geometry.test.js cross-validates against the v8 normalized-SHA baseline; any geometry regression fails this test loud. |
| T-08-09 | Information Disclosure | Polygon-math test inputs leak design IP | accept | Test inputs are synthetic numeric tuples; no proprietary content. |
</threat_model>

<verification>
- 6 test files exist under tests/ matching `tests/annotate-{polygon,charpts,miter,overflow,color,geometry}.test.js`.
- `node --test` over all 6 exits 0.
- Targeted c8 (`--include 'skills/annotate/scripts/annotate.js'`) reports 100% on annotate.js.
- `git diff main -- skills/annotate/scripts/annotate.js` is EMPTY (no source change).
- 2 atomic commits landed (one per task).
</verification>

<success_criteria>
- annotate.js geometry primitives directly unit-tested (polygon / charPts / miter / overflow / color / layout).
- Severity / transparency / MAX_SIDE values come from source-of-truth reads, not invented numbers.
- Visual-regression baseline serves as the integration anchor (Tier 1 normalized SHA).
- TEST-02 (annotate.js coverage) closed.
- annotate.js targeted c8 100% (zero residual per CONTEXT D-02 zero-tolerance gate).
- Every top-level named function in annotate.js (per W-2 grep enumeration) has a covering test.
</success_criteria>

<output>
`.planning/phases/08-test-coverage-100/08-03-SUMMARY.md` — list of new test files, the actual MAX_SIDE / color / transparency constants read from source, the testing approach used (require vs vm.runInNewContext) per primitive, targeted c8 % on annotate.js, residual <2% branches with one-line explanation.
</output>
