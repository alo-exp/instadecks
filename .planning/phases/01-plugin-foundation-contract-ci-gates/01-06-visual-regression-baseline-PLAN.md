---
phase: 01-plugin-foundation-contract-ci-gates
plan: 06
type: execute
wave: 1
depends_on: []
files_modified:
  - tests/fixtures/v8-reference/Annotations_Sample.pptx
  - tests/fixtures/v8-reference/Annotations_Sample.pptx.sha256
  - tests/fixtures/v8-reference/annotate.js.sha256
  - tests/fixtures/v8-reference/samples.js
  - tests/fixtures/v8-reference/slide-01.png
  - tests/fixtures/v8-reference/slide-02.png
  - tests/fixtures/v8-reference/slide-03.png
  - tests/visual-regression.test.js
  - tests/annotate-integrity.test.js
autonomous: true
requirements: [FOUND-09]
must_haves:
  truths:
    - "v8-reference baseline binaries committed: PPTX, samples.js, per-slide PNGs at 150 dpi (rendered once from local macOS dev environment)"
    - "Annotations_Sample.pptx.sha256 contains the SHA-256 of the committed PPTX (Tier 1 self-check applies to PPTX only)"
    - "annotate.js.sha256 records the **PRE-PATCH SHA** of the source file at /Users/.../v5-blue-prestige/annotate.js as-is, with no in-memory transformation. Phase 2 owns the copy + require-path patch + post-patch SHA replacement."
    - "tests/visual-regression.test.js: Tier 1 SHA assertion ACTIVE on the PPTX baseline only; Tier 2 pixel-diff (per-slide PNG pixelmatch ≤ 0.5%) is test.skip (unsuspended in Phase 2)"
    - "tests/annotate-integrity.test.js: it.skip stub with banner referencing D-06 (unsuspended in Phase 2 once post-patch SHA is recorded)"
  artifacts:
    - path: "tests/fixtures/v8-reference/Annotations_Sample.pptx"
      provides: "Byte-exact v8 BluePrestige reference deck"
    - path: "tests/fixtures/v8-reference/Annotations_Sample.pptx.sha256"
      provides: "shasum -a 256 of the reference PPTX (Tier 1 baseline)"
    - path: "tests/fixtures/v8-reference/annotate.js.sha256"
      provides: "PRE-PATCH SHA recording — Phase 2 replaces with post-patch SHA after applying require-path patch and committing skills/annotate/scripts/annotate.js"
    - path: "tests/fixtures/v8-reference/samples.js"
      provides: "Verbatim v8 SAMPLES module (Phase 2 mirrors this)"
    - path: "tests/fixtures/v8-reference/slide-01.png"
      provides: "150 dpi reference render of slide 1 (pixelmatch baseline for Tier 2)"
    - path: "tests/visual-regression.test.js"
      provides: "Tier 1 SHA active (PPTX only) + Tier 2 pixelmatch test.skip harness"
    - path: "tests/annotate-integrity.test.js"
      provides: "it.skip stub for Phase 2 SHA check (D-06)"
  key_links:
    - from: "tests/visual-regression.test.js"
      to: "tests/fixtures/v8-reference/Annotations_Sample.pptx.sha256"
      via: "fs.readFileSync + crypto.createHash('sha256')"
      pattern: "Annotations_Sample"
    - from: "tests/annotate-integrity.test.js"
      to: "tests/fixtures/v8-reference/annotate.js.sha256"
      via: "test.skip body (Phase 2 unsuspends after replacing pre-patch SHA with post-patch SHA)"
      pattern: "annotate.js.sha256"
---

<objective>
Commit visual-regression baselines and harness: copy v8 BluePrestige reference deck (Annotations_Sample.pptx), samples.js, and per-slide reference renders at 150 dpi as PNG (per RESEARCH.md Open Question #2 — locked PNG, not JPG, since pixelmatch requires PNG and SHA stability favors lossless). Record SHA-256 baselines (PPTX + **PRE-PATCH** annotate.js source). Write Tier 1 (active, PPTX-only) + Tier 2 (test.skip, per-slide pixelmatch) regression harness and the annotate.js integrity stub (it.skip per D-06).

Purpose: FOUND-09 + D-06 — every later phase has a stable visual-regression baseline; Phase 2 owns the copy + require-path patch + post-patch SHA replacement and unsuspends Tier 2 + integrity test.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/01-plugin-foundation-contract-ci-gates/01-CONTEXT.md
@.planning/phases/01-plugin-foundation-contract-ci-gates/01-RESEARCH.md
@.planning/phases/01-plugin-foundation-contract-ci-gates/01-PATTERNS.md
@CLAUDE.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Commit v8 reference baselines + record PRE-PATCH SHA</name>
  <files>tests/fixtures/v8-reference/Annotations_Sample.pptx, tests/fixtures/v8-reference/Annotations_Sample.pptx.sha256, tests/fixtures/v8-reference/annotate.js.sha256, tests/fixtures/v8-reference/samples.js, tests/fixtures/v8-reference/slide-01.png, tests/fixtures/v8-reference/slide-02.png, tests/fixtures/v8-reference/slide-03.png</files>
  <action>
    Per D-03, D-06, FOUND-09, PATTERNS.md "tests/fixtures/v8-reference/*" row, and RESEARCH.md Open Question #2 (PNG locked):

    Source location: `/Users/shafqat/Documents/Projects/Sourcevo/v5-blue-prestige/`. This path is OUTSIDE the plugin tree but only appears here at PLAN-execution time as a copy source — no committed file references this absolute path (lint-paths.sh confirms). The `# lint-allow:hardcoded-path` token is NOT needed because the source path appears only in shell commands during this plan, not in committed source.

    1. **Copy PPTX baseline:** `cp /Users/shafqat/Documents/Projects/Sourcevo/v5-blue-prestige/Annotations_Sample.pptx tests/fixtures/v8-reference/Annotations_Sample.pptx`. If file doesn't exist there, search for the most recent v8 output deck in that tree (`find /Users/shafqat/Documents/Projects/Sourcevo/v5-blue-prestige -name "*.pptx" -type f`) — pick the canonical 3-slide annotated reference and document the choice in the summary.
    2. **Compute and commit PPTX SHA:** `shasum -a 256 tests/fixtures/v8-reference/Annotations_Sample.pptx > tests/fixtures/v8-reference/Annotations_Sample.pptx.sha256`. Format: single line, lowercase hex, two spaces, filename (default `shasum` output).
    3. **Copy samples.js:** `cp /Users/shafqat/Documents/Projects/Sourcevo/v5-blue-prestige/samples.js tests/fixtures/v8-reference/samples.js` (or extract SAMPLES from annotate.js lines 107–150 if no separate samples.js exists; extracting matches ANNO-04 pattern, but Phase 1 only needs a verbatim reference — keep whichever shape is canonical in v8 source).
    4. **Per-slide PNG references at 150 dpi (PC-09):** Generate via the existing v8 image pipeline if pre-rendered PNGs don't exist. Use `soffice --headless --convert-to pdf Annotations_Sample.pptx` then `pdftoppm -png -r 150 Annotations_Sample.pdf slide` → produces `slide-01.png`, `slide-02.png`, `slide-03.png`. Move into `tests/fixtures/v8-reference/`. **These PNGs are committed once from the user's local macOS dev environment** (LibreOffice + Poppler installed locally — CI does NOT install them in Phase 1 per Plan 09 RESEARCH.md A3). NOTE: If v8 source already has 150-dpi reference renders (likely as JPGs per CONTEXT.md), regenerate as PNG — pixelmatch requires PNG and SHA stability favors lossless per RESEARCH.md Open Question #2. **Tier 1 SHA gate applies to the committed PPTX only. Per-slide PNGs are baselines for Tier 2 pixelmatch (≤ 0.5% threshold), NOT for Tier 1 SHA assertion** — PNGs are byte-fragile across LibreOffice versions, so Tier 2 uses pixel-diff tolerance instead.
    5. **(PC-08) Record PRE-PATCH annotate.js SHA:** `shasum -a 256 /Users/shafqat/Documents/Projects/Sourcevo/v5-blue-prestige/annotate.js | awk '{print $1}'` — compute SHA-256 of the source file **as-is, with NO in-memory transformation**. Write to `tests/fixtures/v8-reference/annotate.js.sha256` in `shasum -a 256` format with a banner comment line at the top of the file:
       ```
       # PRE-PATCH SHA — Phase 2 replaces with post-patch SHA after applying require-path patch and committing skills/annotate/scripts/annotate.js.
       <hex-sha>  annotate.js
       ```
       Phase 2 owns: (a) copying annotate.js into `skills/annotate/scripts/annotate.js`, (b) applying the documented one-line require-path patch (per CLAUDE.md Locked Invariants §1 — pptxgenjs require resolves out of `${CLAUDE_PLUGIN_DATA}/node_modules`), (c) recomputing the SHA on the patched file and overwriting this `.sha256` file with the post-patch hex (preserving banner-comment update), (d) unsuspending `tests/annotate-integrity.test.js`. Do NOT pre-compute or stage the post-patch SHA in Phase 1.

    Verify all 7 fixture files are committed under `tests/fixtures/v8-reference/`. None of these files contain hardcoded paths — they're binary or extracted source — so they're exempt from lint-paths.sh anyway via the `tests/fixtures/` exclusion (D-02).
  </action>
  <verify>
    <automated>test -f tests/fixtures/v8-reference/Annotations_Sample.pptx && test -f tests/fixtures/v8-reference/Annotations_Sample.pptx.sha256 && test -f tests/fixtures/v8-reference/annotate.js.sha256 && grep -q "PRE-PATCH SHA" tests/fixtures/v8-reference/annotate.js.sha256 && test -f tests/fixtures/v8-reference/samples.js && test -f tests/fixtures/v8-reference/slide-01.png && test -f tests/fixtures/v8-reference/slide-02.png && test -f tests/fixtures/v8-reference/slide-03.png && [ "$(shasum -a 256 tests/fixtures/v8-reference/Annotations_Sample.pptx | awk '{print $1}')" = "$(grep -v '^#' tests/fixtures/v8-reference/Annotations_Sample.pptx.sha256 | awk '{print $1}')" ]</automated>
  </verify>
  <done>All 7 fixture files committed; PPTX SHA file matches actual file SHA; annotate.js .sha256 contains PRE-PATCH banner + pre-patch hex with no transformation applied; PNGs noted as Tier 2 baselines (not Tier 1 SHA scope).</done>
</task>

<task type="auto">
  <name>Task 2: Write visual-regression.test.js + annotate-integrity.test.js</name>
  <files>tests/visual-regression.test.js, tests/annotate-integrity.test.js</files>
  <action>
    Per RESEARCH.md Pattern 5 + D-03 + D-06 + PATTERNS.md "tests/annotate-integrity.test.js" row:

    `tests/visual-regression.test.js`:
    - First-line banner: `// Tier 1 (active): SHA self-check of v8-reference PPTX baseline. Tier 2 (test.skip): per-slide pixelmatch on PNG baselines — unsuspended in Phase 2 once /annotate produces regenerated PPTX. PNG baselines are NOT in Tier 1 scope (they're byte-fragile across LibreOffice versions; Tier 2 tolerates ≤ 0.5% pixel diff).`
    - Imports: `node:test`, `node:assert/strict`, `node:fs`, `node:crypto`, `node:path`. Do NOT require `pngjs` or `pixelmatch` at top level (they're devDeps declared in Plan 01; Phase 1 doesn't import them at module scope — guard with try/require inside the skipped test, or use dynamic require only inside the skipped body so node --test works without devDep installs).
    - **Tier 1 (active):** `test('Tier 1: Annotations_Sample.pptx SHA matches v8 baseline', () => { ... })`. Read expected SHA from `.sha256` file (parse first non-comment line, take first whitespace-delimited token). Compute actual SHA via `crypto.createHash('sha256').update(fs.readFileSync(...)).digest('hex')`. `assert.equal(actual, expected, 'PPTX byte-level drift detected — committed baseline diverged from .sha256 file')`. **(PC-10) Inline comment above the assertion:** `// Self-check: confirms .sha256 file format and matches committed PPTX binary. Drift detection activates from Phase 2 onward (when /annotate regenerates the PPTX from samples.js + skills/annotate/scripts/annotate.js).`
    - **Tier 2 (skipped):** `test('Tier 2: per-slide pixel-diff < 0.5%', { skip: 'Phase 2 unsuspends — needs /annotate regenerated PPTX + LibreOffice in CI; baselines are slide-NN.png at 150 dpi' }, () => { ... })`. Body matches RESEARCH.md Pattern 5 — pixelmatch with threshold 0.1, ratio assertion < 0.005, against committed slide-NN.png baselines.

    `tests/annotate-integrity.test.js`:
    - First-line banner per PATTERNS.md row exactly: `// Phase 1 scaffold: it.skip until Phase 2 commits skills/annotate/scripts/annotate.js (per CONTEXT.md D-06). Phase 1 records the PRE-patch SHA; Phase 2 replaces it with post-patch SHA after applying the documented require-path patch.`
    - Imports: `node:test`, `node:assert/strict`, `node:fs/promises`, `node:crypto`, `node:path`.
    - `test.skip('annotate.js post-patch SHA matches v8 baseline', { skip: 'Phase 2 unsuspends after copying file + applying require-path patch + replacing PRE-PATCH SHA with post-patch SHA' }, async () => { const raw = await fs.readFile('tests/fixtures/v8-reference/annotate.js.sha256', 'utf8'); const expected = raw.split('\n').filter(l => !l.startsWith('#') && l.trim()).map(l => l.split(/\s+/)[0])[0]; const buf = await fs.readFile('skills/annotate/scripts/annotate.js'); const actual = crypto.createHash('sha256').update(buf).digest('hex'); assert.equal(actual, expected, 'annotate.js drift — file modified beyond the documented one-line require-path patch'); });`

    Run `node --test tests/visual-regression.test.js tests/annotate-integrity.test.js` — Tier 1 must pass; Tier 2 + integrity test print as skipped.
  </action>
  <verify>
    <automated>node --test tests/visual-regression.test.js tests/annotate-integrity.test.js</automated>
  </verify>
  <done>Tier 1 SHA test passes (PPTX only); Tier 2 + integrity test report as skipped with documented reason strings; PC-10 self-check comment present.</done>
</task>

</tasks>

<threat_model>
| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-06-01 | Tampering | Reference PPTX baseline silently mutated | mitigate | Tier 1 SHA self-check fails CI on any byte drift |
| T-06-02 | Tampering | annotate.js modified beyond require-path patch in Phase 2 | mitigate | annotate-integrity.test.js (unsuspended Phase 2 after pre→post-patch SHA replacement) catches any deviation from recorded post-patch SHA |
</threat_model>

<verification>
- `node --test tests/visual-regression.test.js` — Tier 1 passes, Tier 2 skipped
- `node --test tests/annotate-integrity.test.js` — skipped with documented reason
- Reference PPTX + 3 PNG renders at 150 dpi committed (PNGs from local macOS dev env)
- PPTX SHA file committed and matches; annotate.js.sha256 carries PRE-PATCH banner + pre-patch hex
</verification>

<success_criteria>
- FOUND-09: visual-regression infrastructure live (Tier 1 active on PPTX, Tier 2 + integrity scaffolded for Phase 2)
- D-06 honored: annotate-integrity.test.js stub with banner + skip reason
- PNG locked over JPG per RESEARCH.md Open Question #2; PNG scope = Tier 2 baselines, NOT Tier 1 SHA
- Phase 2 ownership documented: copy + require-path patch + pre→post-patch SHA replacement + integrity-test unsuspend
</success_criteria>

<output>
After completion, create `.planning/phases/01-plugin-foundation-contract-ci-gates/01-06-SUMMARY.md`. Document which v8 source PPTX was selected as the canonical reference, and that annotate.js.sha256 holds the PRE-PATCH SHA awaiting Phase 2 replacement.
</output>
