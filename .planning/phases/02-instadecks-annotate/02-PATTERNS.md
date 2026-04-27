# Phase 2: `/instadecks:annotate` — Pattern Map

**Mapped:** 2026-04-28
**Files analyzed:** 13 new/modified
**In-repo analogs found:** 13 / 13 (Phase 1 deliverables provide canonical references for every Phase 2 file)

Phase 2 is no longer greenfield — Phase 1 has shipped a complete tooling/test stack (`tests/manifest-validator.test.js`, `tests/check-deps.test.js`, `tests/findings-schema.test.js`, `tests/visual-regression.test.js`, `tests/annotate-integrity.test.js`, `tools/validate-manifest.js`, `tools/lint-paths.sh`, `.github/workflows/ci.yml`, `tests/fixtures/v8-reference/samples.js`, the canonical sample-findings fixture, and SKILL.md skeletons). Every new Phase 2 file has a direct in-repo analog whose conventions (header banners, decision-id comments, `node:test` + `node:assert/strict`, `spawnSync`/temp-dir hermeticity, SHA-pin comparison, GitHub-Actions annotations) MUST be copied verbatim. The single source-of-truth code outside the repo is `/Users/shafqat/Documents/Projects/Sourcevo/v5-blue-prestige/annotate.js` (verbatim copy target — Phase 2's only sanctioned modifications are the require-path patch (ANNO-03) + the SAMPLES extraction substitution (ANNO-04), both already authorized by REQUIREMENTS.md).

---

## File Classification

| New / modified file | Role | Data flow | Closest in-repo analog | Match quality |
|--|--|--|--|--|
| `skills/annotate/scripts/annotate.js` | verbatim-asset (binary, SHA-pinned) | one-shot script (require-time + main()) | `tests/fixtures/v8-reference/samples.js` (sibling extracted asset, "Source-of-truth lives in skills/annotate/scripts/..." banner) | exact role, different shape — analog provides the banner-comment convention only; geometry rules force VERBATIM copy from `/Users/shafqat/.../v5-blue-prestige/annotate.js` |
| `skills/annotate/scripts/samples.js` | adapter-shim (mutable module-level binding with override hook) | in-memory data injection | `tests/fixtures/v8-reference/samples.js` | role-match; Phase 2 file is a derivative — same SAMPLES export, plus a `setSamples` override (RESEARCH Example 3) |
| `skills/annotate/scripts/adapter.js` | adapter (validate → filter → collapse) | request-response transform (in-memory object → SAMPLES array) | `tests/findings-schema.test.js` (validation-discipline analog: required-fields list, severity allow-set, range checks, error messages with slide/finding indices) | exact — same validation pattern, just throws instead of asserting |
| `skills/annotate/scripts/index.js` | entry-point (`runAnnotate({deckPath, findings, outDir, runId})`) | orchestrator: validate → prep workdir → require annotate.js → soffice PDF → mirror sibling | none-direct (Phase 1 has no orchestrator). Closest is `tests/check-deps.test.js`'s `runHook(dataDir)` wrapper (env-var setup + child-process invocation pattern). | role-mismatch but invocation discipline applies (env vars set before invoke, hermetic per-call temp dirs) |
| `skills/annotate/scripts/cli.js` | CLI wrapper (thin shell over `runAnnotate`) | argv → `fs.readFileSync` JSON → forward | `tools/validate-manifest.js` (`#!/usr/bin/env node` shebang + `process.argv[2]` consumption + non-zero exit on error) | exact — same shebang, same argv pattern, same `console.error` + `process.exit(1)` style |
| `skills/annotate/SKILL.md` | skill-doc (full body replacing Phase 1 skeleton) | static doc | existing `skills/annotate/SKILL.md` (Phase 1 frontmatter to preserve verbatim) | exact — keep frontmatter (`name`, `description`, `user-invocable: true`, `version: 0.1.0`); replace body below H1 |
| `tests/annotate-integrity.test.js` | unit test (UNSUSPEND from skip) | SHA file → SHA(file) compare | existing `tests/annotate-integrity.test.js` (skipped stub) + `tests/visual-regression.test.js` Tier 1 (the active SHA-compare pattern) | exact — body already written; remove `skip: '...'` option; replace PRE-PATCH SHA with post-patch |
| `tests/annotate-adapter.test.js` | unit test (NEW) | in-memory input → throw assertions / output assertions | `tests/findings-schema.test.js` (subtests via `t.test`, REQUIRED_FIELDS array, `assert.ok(allowed.includes(...))`, error messages naming slide index) | exact — copy the per-finding-loop validation pattern; convert to throw-asserting `assert.throws(...)` for error-path cases |
| `tests/annotate-runtime.test.js` | integration test (NEW) | spawn / require → assert files exist + paths returned | `tests/check-deps.test.js` (`spawnSync` + temp-dir + env-var injection + `npmAvailable` skip-guard pattern) | exact — same hermetic-tempdir convention; same `t.skip` for system-tool-missing branches (here: soffice, when CI hasn't installed it) |
| `tests/annotate-visual-regression.test.js` | integration test (NEW; may stay `test.skip` Tier 2) | render → SHA / pixelmatch | `tests/visual-regression.test.js` (existing Tier 1 + skipped Tier 2 stub) | exact — REPLACES this file; preserve Tier 1 SHA-compare body; activate Tier 2 once Phase 2 produces regenerated PPTX |
| `tests/fixtures/v8-reference/annotate.js.sha256` | fixture (SHA pin) | static text | existing `tests/fixtures/v8-reference/annotate.js.sha256` (currently PRE-PATCH) | exact — same `# <BANNER>\n<sha>  annotate.js\n` line shape; replace banner + hash atomically with the file copy |
| `tests/fixtures/v8-reference/v8s-NN.jpg` (10 files) | fixture (binary baselines) | static asset | existing `tests/fixtures/v8-reference/Annotations_Sample.pptx` (binary committed verbatim) | exact role — committed binary, no `.sha256` required (these are inputs, not pinned outputs) |

All new code modules go under `skills/annotate/scripts/` (per ARCHITECTURE.md "skill-private Node code"). All new tests go directly under `tests/` (CI auto-discovers via `find tests -maxdepth 2 -name '*.test.js'` — see ci.yml line 88).

---

## Pattern Assignments

### `skills/annotate/scripts/annotate.js` (verbatim asset)

**Source of truth:** `/Users/shafqat/Documents/Projects/Sourcevo/v5-blue-prestige/annotate.js` (514 lines).

**Sanctioned modifications (TWO, BOTH AUTHORIZED):**

1. **Require-path patch (ANNO-03), line 6:**
   ```js
   // BEFORE:
   const PptxGenJS = require(path.join(__dirname, '..', 'node_modules', 'pptxgenjs'));
   // AFTER:
   const PptxGenJS = require(process.env.PPTXGENJS_PATH || 'pptxgenjs');
   ```
   `index.js` sets `process.env.PPTXGENJS_PATH = path.join(process.env.CLAUDE_PLUGIN_DATA, 'node_modules', 'pptxgenjs')` before `require('./annotate')`. Bareword fallback resolves under project-root `node_modules` for tests run from project root.

2. **SAMPLES extraction (ANNO-04), lines 107–150 (the `const SAMPLES = [...]` block):**
   ```js
   // REPLACE the inline 44-line const SAMPLES = [...] block with:
   const { SAMPLES } = require('./samples');
   ```
   This permits the runtime override `require('./samples').setSamples(adaptedFromFindings)` to be honoured by `main()`'s `for (const sample of SAMPLES)` loop.

**Banner-comment convention (atop file, after the two patched lines):**
Reuse the convention from `tests/fixtures/v8-reference/samples.js:1`:
```js
'use strict';
// annotate.js — VERBATIM copy of /Users/shafqat/Documents/Projects/Sourcevo/v5-blue-prestige/annotate.js
// (lint-allow:hardcoded-path: source-of-truth reference; not a runtime path).
// AUTHORIZED MODIFICATIONS (ANNO-02/03/04):
//   1. line 6 — require(...) replaced with env-var-driven resolution (ANNO-03)
//   2. lines 107-150 — inline `const SAMPLES = [...]` replaced with `const { SAMPLES } = require('./samples')` (ANNO-04)
// Any other diff fails tests/annotate-integrity.test.js (post-patch SHA pin).
```

**Self-invocation at line 513 stays VERBATIM (P-02 Option B per RESEARCH.md):** `main().catch(err => { console.error(err); process.exit(1); });`. `index.js` arranges cwd, symlinks, and `setSamples(...)` BEFORE `require('./annotate')`, so the self-invoking `main()` runs against correct inputs and writes to `work.cwd`.

---

### `skills/annotate/scripts/samples.js` (override-shim)

**Analog:** `tests/fixtures/v8-reference/samples.js:1-50`

**Banner pattern (from analog):**
```js
'use strict';
// samples.js — runtime data binding for annotate.js. setSamples(arr) is called by index.js
// before require('./annotate') so main()'s `for (const sample of SAMPLES)` reads the
// adapted findings (per ANNO-04 + RESEARCH.md Pattern 1 "VERBATIM file with override-export shim").
```

**Module shape (RESEARCH Example 3):**
```js
let SAMPLES = [];
function setSamples(arr) { SAMPLES = arr; }
module.exports = { get SAMPLES() { return SAMPLES; }, setSamples };
```
The `get SAMPLES()` accessor is non-negotiable — annotate.js does `const { SAMPLES } = require('./samples')` which would otherwise capture the empty initial value.

---

### `skills/annotate/scripts/adapter.js` (validate → filter → collapse)

**Analog:** `tests/findings-schema.test.js` (lines 12-17 establish the canonical allow-sets and required-fields list; lines 41-93 establish per-field per-loop validation with index-bearing error messages).

**Imports pattern (header):**
```js
'use strict';
// adapter.js — validate findings → filter genuine == true → collapse 4-tier severity to 3-tier.
// Per Phase 2 D-07 (fail-loud, structured errors) and ANNO-05/ANNO-06.
// Severity collapse table sourced from skills/review/references/findings-schema.md §5.
```

**Validation pattern — copy the loop discipline from `tests/findings-schema.test.js:42-62`:**
```js
// findings-schema.test.js:14-17 (required-fields list — adapter MUST validate the same set):
const REQUIRED_FINDING_FIELDS = [
  'severity_reviewer', 'category', 'genuine',
  'nx', 'ny', 'text', 'rationale', 'location', 'standard', 'fix',
];
// findings-schema.test.js:43-49 (per-finding loop with slide-index-aware error message):
for (const slide of data.slides) {
  for (const f of slide.findings) {
    for (const key of REQUIRED_FINDING_FIELDS) {
      assert.ok(
        Object.prototype.hasOwnProperty.call(f, key),
        `slide ${slide.slideNum}: finding missing required field "${key}"`,
      );
    }
    // ...
```
**Adapter version:** swap `assert.ok(cond, msg)` → `if (!cond) throw new Error(msg)` and adopt the `slides[<sIdx>].findings[<fIdx>].<field>: <observed> not in <expected>` message format from RESEARCH Example 2 (lines 333-410). **Order is locked (RESEARCH Q3, P-09):** validate ALL fields first → throw on any error → filter `genuine === true` → collapse 4→3 → emit SAMPLES.

**Severity collapse table (RESEARCH Example 2):**
```js
const SEV_MAP = {
  Critical: 'major',
  Major:    'major',
  Minor:    'minor',
  Nitpick:  'polish',
};
const VALID_CATEGORY = new Set(['defect', 'improvement', 'style']);
```

**Range / type checks (verbatim from `findings-schema.test.js:50-92`, converted to throw):**
```js
if (typeof f.severity_reviewer !== 'string') throw new Error(`${where}.severity_reviewer: must be string`);
if (!(f.severity_reviewer in SEV_MAP))       throw new Error(`${where}.severity_reviewer: ${f.severity_reviewer} not in {Critical,Major,Minor,Nitpick}`);
if (!VALID_CATEGORY.has(f.category))         throw new Error(`${where}.category: ${f.category} not in {defect,improvement,style}`);
if (typeof f.genuine !== 'boolean')          throw new Error(`${where}.genuine: must be boolean`);
if (typeof f.nx !== 'number' || f.nx < 0 || f.nx > 1) throw new Error(`${where}.nx: must be number in [0,1] (got ${f.nx})`);
if (typeof f.ny !== 'number' || f.ny < 0 || f.ny > 1) throw new Error(`${where}.ny: must be number in [0,1] (got ${f.ny})`);
```

**Schema-version gate (NEW — adapter is the runtime enforcer):**
```js
if (!doc.schema_version || !/^1\./.test(doc.schema_version)) {
  throw new Error(`Unsupported findings schema version ${doc.schema_version}. /annotate supports 1.x.`);
}
```

**Export shape:** `module.exports = { adaptFindings, SEV_MAP };`

---

### `skills/annotate/scripts/index.js` (entry-point — `runAnnotate`)

**Analog (invocation/env-var discipline):** `tests/check-deps.test.js:19-28` — env-var injection + per-call hermetic data dir.

**Header banner:**
```js
'use strict';
// index.js — exports runAnnotate({deckPath, findings, outDir, runId}) per Phase 2 D-06.
// Standalone CLI (cli.js) and pipelined consumer (/review Phase 3) both call this.
// Run-dir = .planning/instadecks/<runId>/ per D-01/D-02/D-05; sibling-of-input outputs per D-03/D-04.
```

**Env-var setup pattern (mirror `check-deps.test.js:21-26`):**
```js
process.env.PPTXGENJS_PATH = path.join(
  process.env.CLAUDE_PLUGIN_DATA || path.join(__dirname, '..', '..', '..'),
  'node_modules',
  'pptxgenjs',
);
```
Set BEFORE `require('./annotate')` (P-03).

**Order of operations (RESEARCH Example 4, lines 445-480):**
```
1. validate inputs (deckPath, findings) → throw
2. runId   = runId   || generateRunId()
3. outDir  = outDir  || .planning/instadecks/<runId>
4. fs.mkdir(outDir, recursive: true)
5. samples = adaptFindings(findings)        // throws on schema violation
6. setSamples(samples)
7. work    = prepareSlideImages({deckPath, outDir})  // symlinks slide-NN.jpg → v8s-NN.jpg in work.cwd
8. set process.env.PPTXGENJS_PATH
9. require(path.join(work.cwd, 'annotate.js'))      // verbatim main() writes Annotations_Sample.pptx
10. await pptx-on-disk (file-watch / setTimeout poll)
11. pdfRun = await convertToPdf(pptxRun, work.cwd)
12. fs.copyFile(pptxRun, sibling.pptxPath)          // D-03 silent overwrite
13. fs.copyFile(pdfRun,  sibling.pdfPath)
14. return { pptxPath, pdfPath, runDir, runId, pptxRun, pdfRun }
```

**Sibling-output resolution (P-05 — strip trailing `.annotated`):**
```js
function resolveSiblingOutputs(deckPath) {
  const dir  = path.dirname(deckPath);
  const ext  = path.extname(deckPath);
  let base   = path.basename(deckPath, ext).replace(/\.annotated$/, '');
  return {
    pptxPath: path.join(dir, `${base}.annotated.pptx`),
    pdfPath:  path.join(dir, `${base}.annotated.pdf`),
  };
}
```

**soffice invocation (D-08 + RESEARCH Example 5):**
```js
const SESSION_ID = process.env.CLAUDE_SESSION_ID || `s${Date.now()}`;
execFile('soffice', [
  '--headless',
  `-env:UserInstallation=file:///tmp/lo-${SESSION_ID}-${process.pid}`,
  '--convert-to', 'pdf',
  '--outdir', outDir,
  pptxPath,
], { timeout: 60_000 }, callback);
```

**Run-id generator (D-02 format):**
```js
function generateRunId() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  const ts = `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-`
           + `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  return `${ts}-${require('node:crypto').randomBytes(3).toString('hex')}`;
}
```

---

### `skills/annotate/scripts/cli.js` (thin CLI)

**Analog:** `tools/validate-manifest.js` — `#!/usr/bin/env node` + argv consumption + `console.error` + `process.exit(1)`.

**Header pattern:**
```js
#!/usr/bin/env node
'use strict';
// cli.js — standalone CLI wrapper around runAnnotate. Per Phase 2 D-06 + ANNO-09.
// Usage: node cli.js <deck.pptx> <findings.json> [outDir]
```

**Body shape (≤ 25 lines, NO business logic):**
```js
const fs = require('node:fs');
const path = require('node:path');
const { runAnnotate } = require('./index');

async function main() {
  const [, , deckArg, findingsArg, outDirArg] = process.argv;
  if (!deckArg || !findingsArg) {
    console.error('Usage: node cli.js <deck.pptx> <findings.json> [outDir]');
    process.exit(2);
  }
  const findings = JSON.parse(fs.readFileSync(path.resolve(findingsArg), 'utf8'));
  const result = await runAnnotate({
    deckPath: path.resolve(deckArg),
    findings,
    outDir: outDirArg ? path.resolve(outDirArg) : undefined,
  });
  console.log(JSON.stringify(result, null, 2));
}
main().catch(err => { console.error(err.stack || err.message); process.exit(1); });
```

---

### `skills/annotate/SKILL.md` (full body)

**Frontmatter (PRESERVE VERBATIM from existing file):**
```yaml
---
name: annotate
description: Annotate a presentation deck with design-review findings. This skill should be used when the user has a deck file and a findings JSON in the locked schema and wants visual annotations overlaid as a PPTX + PDF.
user-invocable: true
version: 0.1.0
---
```
H1 stays: `# /instadecks:annotate — Overlay Design-Review Findings on a Deck`. Replace the `Status: scaffold ...` line with the full playbook (invocation examples, JSON schema reference link to `skills/review/references/findings-schema.md`, output paths per D-03, error semantics per D-07, run-dir archive per D-05).

**Description-quality rules (enforced by `tools/validate-manifest.js` — see `tests/manifest-validator.test.js:42-47, 93-128`):**
- Single-line scalar (NO `|` or `>` block forms — see `manifest-validator.test.js:165-206`)
- ≤ 1024 chars
- Starts with imperative verb (NOT "The ...")
- No indented continuation lines (`manifest-validator.test.js:146-163`)

---

### `tests/annotate-integrity.test.js` (UNSUSPEND)

**Body already correct — see existing file lines 11-44.** Phase 2 changes only:
1. Remove the `skip: '...'` option (line 14) — leaves `test('annotate.js post-patch SHA matches v8 baseline', async () => { ... })`
2. Replace the banner comment lines 1-2 with a "Phase 2 active" note pointing to the post-patch SHA recipe.

The body's SHA-loading + crypto-compare pattern is canonical — DO NOT touch lines 16-43.

---

### `tests/annotate-adapter.test.js` (NEW)

**Analog:** `tests/findings-schema.test.js` — copy the structure verbatim, swap data path for in-memory inputs.

**Header (mirror `findings-schema.test.js:1-9`):**
```js
// tests/annotate-adapter.test.js — Unit tests for skills/annotate/scripts/adapter.js.
// Covers ANNO-05 (severity collapse), ANNO-06 (genuine filter), Phase 2 D-07 (fail-loud structured errors).

const test = require('node:test');
const assert = require('node:assert/strict');
const { adaptFindings, SEV_MAP } = require('../skills/annotate/scripts/adapter');
```

**Test-file structure (mirror `findings-schema.test.js:19-124` `await t.test(...)` subtests):**
- subtest: rejects missing `schema_version`
- subtest: rejects schema_version 2.0
- subtest: rejects each missing required field (loop the 10-item REQUIRED_FINDING_FIELDS list, build a valid fixture, omit one field, assert.throws with field name in message)
- subtest: rejects each invalid value (severity not in allowed set, category not in set, nx/ny out of [0,1], genuine non-boolean)
- subtest: collapses Critical→major, Major→major, Minor→minor, Nitpick→polish (assert against SEV_MAP)
- subtest: filters `genuine: false` findings out of result
- subtest: passes through happy-path canonical fixture (loads `tests/fixtures/sample-findings.json`)
- subtest: order of operations — validation runs BEFORE filter (a `genuine: false` finding with invalid `nx` still throws)

**Error-message format assertion:** `assert.match(err.message, /slides\[\d+\]\.findings\[\d+\]\.<field>/)`.

---

### `tests/annotate-runtime.test.js` (NEW)

**Analog:** `tests/check-deps.test.js` — `spawnSync`, hermetic temp dirs, `t.skip` guards for missing system tools.

**Header banner (mirror `check-deps.test.js:1-3`):**
```js
// tests/annotate-runtime.test.js — Integration tests for skills/annotate/scripts/index.js (runAnnotate).
// Covers ANNO-08 (PPTX + PDF written), ANNO-09 (CLI wrapper), ANNO-10 (in-memory pipelined invocation), D-03/D-04 (sibling outputs).
```

**System-tool skip guard (verbatim from `check-deps.test.js:30`):**
```js
const sofficeAvailable = spawnSync('command', ['-v', 'soffice'], { shell: true }).status === 0;
// in subtest: if (!sofficeAvailable) { t2.skip('soffice not available'); return; }
```

**Hermetic temp-dir pattern (verbatim from `check-deps.test.js:15-17, 86-93`):**
```js
function freshOutDir() { return fs.mkdtempSync(path.join(os.tmpdir(), 'anno-out-')); }
```

**Subtests:**
- pipelined-mode (in-memory findings): `runAnnotate({deckPath, findings: JSON.parse(...), outDir, runId})` returns `{pptxPath, pdfPath, runDir, runId}`; both files exist; sizes > 0
- CLI-mode equivalence: `spawnSync(process.execPath, [CLI, deck, findingsPath, outDir])` → exit 0; same outputs as pipelined
- run-id format: matches `/^\d{8}-\d{6}-[0-9a-f]{6}$/`
- sibling output: `runAnnotate({deckPath: '/tmp/foo/deck.pptx', ...})` lands `/tmp/foo/deck.annotated.pptx` and `.pdf`
- silent-overwrite (D-04): re-running over existing `*.annotated.pptx` succeeds; mtime updates; no `--force` required
- P-05: input `deck.annotated.pptx` → output `deck.annotated.pptx` (NOT `deck.annotated.annotated.pptx`)
- run-dir archive (D-05): findings.json copy + slide symlinks + run-local pptx/pdf all under `.planning/instadecks/<runId>/`

---

### `tests/annotate-visual-regression.test.js` (NEW — replaces `tests/visual-regression.test.js` body extension)

**Analog:** `tests/visual-regression.test.js` — keep Tier 1 SHA-compare body verbatim (lines 14-37). For Tier 2, unsuspend with `pixelmatch` per RESEARCH Q7.

**Tier 1 pattern (verbatim from existing `visual-regression.test.js:14-37`):**
```js
function readExpectedSha(shaFilePath) {
  const raw = fs.readFileSync(shaFilePath, 'utf8');
  const line = raw.split('\n').map(l => l.trim()).find(l => l && !l.startsWith('#'));
  if (!line) throw new Error(`No SHA line found in ${shaFilePath}`);
  return line.split(/\s+/)[0].toLowerCase();
}
function sha256OfFile(p) {
  return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
}
```
Phase 2 adds: regenerate `Annotations_Sample.pptx` via `runAnnotate` with sample-findings.json against staged v8s-*.jpg, then SHA-compare to baseline. **Note (RESEARCH §A1, P-01):** SAMPLES from `tests/fixtures/v8-reference/samples.js` are author-curated, not derived from `sample-findings.json`. The visual-regression test must inject those exact SAMPLES (e.g. by calling `setSamples(require('./fixtures/v8-reference/samples').SAMPLES)` directly) — not via the adapter. The adapter happy-path is exercised separately in `annotate-adapter.test.js`.

**Tier 2 pattern (RESEARCH Q7) — may stay `test.skip` until ci.yml lines 107-119 install soffice/poppler:**
```js
const { PNG } = require('pngjs');
const pixelmatch = require('pixelmatch');
// for each slide: render via soffice + pdftoppm @ 150 dpi → compare to slide-NN.png
// threshold: 0.1; assert diffPixels / totalPixels < 0.005
```

---

### `tests/fixtures/v8-reference/annotate.js.sha256` (REPLACE in-place)

**Analog:** existing file (lines 1-2 — banner + sha line).

**File shape (mirror existing format):**
```
# POST-PATCH SHA — recorded after applying require-path patch (line 6) and SAMPLES-extraction substitution (lines 107-150). See ANNO-02/03/04.
<new-sha>  annotate.js
```
The new SHA is computed AFTER applying both patches: `shasum -a 256 skills/annotate/scripts/annotate.js`. This file MUST be replaced in the SAME commit as the patched `annotate.js` and the unsuspended integrity test (P-08 — atomic state transition).

---

### `tests/fixtures/v8-reference/v8s-NN.jpg` (10 NEW binary fixtures)

**Analog:** existing `tests/fixtures/v8-reference/Annotations_Sample.pptx` — committed binary, no `.sha256` (these are inputs, not pinned outputs; pinning their bytes would just lock to upstream Sourcevo's bytes without buying determinism).

**Source paths (lint-allow:hardcoded-path required in source-listing scripts):**
```
/Users/shafqat/Documents/Projects/Sourcevo/v5-blue-prestige/v8s-01.jpg ... v8s-10.jpg
```
[VERIFIED: 26 v8s-*.jpg files exist there as of 2026-04-28; Phase 2 stages slides 01–10 minimum to cover the SAMPLES set (slides 7, 9, 10) plus margin.]

**Lint-paths exclusion:** the `tests/fixtures/` tree is already excluded from `tools/lint-paths.sh` (per Phase 1 D-02). No new lint-allow comments required for the binary files themselves.

**O-2 RESOLVED:** JPEGs exist upstream — Phase 2 copies them directly. No soffice rasterization fallback needed.

---

## Shared Patterns (cross-cutting)

### S1. Test-file header (applies to every new `tests/*.test.js`)

**Source:** `tests/findings-schema.test.js:1-2` and `tests/check-deps.test.js:1-3`.
```js
// tests/<topic>.test.js — <one-line purpose>.
// Per Phase 2 <decision-id> (e.g., D-07) + <REQ-id> (e.g., ANNO-05/06).

const test = require('node:test');
const assert = require('node:assert/strict');
```
Always include the decision-id + REQ-id in the second comment line.

### S2. Hermetic temp-dir pattern

**Source:** `tests/check-deps.test.js:15-17` and `tests/manifest-validator.test.js:17-19`.
```js
function freshTmpDir(tag) { return fs.mkdtempSync(path.join(os.tmpdir(), `${tag}-`)); }
// Use try { ... } finally { fs.rmSync(root, { recursive: true, force: true }); }
```
Every integration test that writes files MUST use a fresh temp dir with finally-cleanup.

### S3. System-tool availability skip-guard

**Source:** `tests/check-deps.test.js:30, 49-51`.
```js
const toolAvailable = spawnSync('command', ['-v', 'TOOL'], { shell: true }).status === 0;
// in subtest:
if (!toolAvailable) { t2.skip('TOOL not available'); return; }
```
Apply to: `soffice` (PDF gen), `pdftoppm` (Phase 3+ but harmless to pre-skip), `npm`.

### S4. SHA-pin file format

**Source:** `tests/fixtures/v8-reference/annotate.js.sha256` and `tests/fixtures/v8-reference/Annotations_Sample.pptx.sha256` + reader at `tests/visual-regression.test.js:14-22`.
```
# <Banner explaining provenance / phase / patch state>
<lowercase-hex-sha>  <basename>
```
Reader filters `!line.startsWith('#') && line.trim()` and takes `line.split(/\s+/)[0].toLowerCase()`.

### S5. Path discipline (locked Phase 1 invariant)

All filesystem references use `${CLAUDE_PLUGIN_ROOT}` / `${CLAUDE_PLUGIN_DATA}` (read-only / writable). Phase 2's only new external-path mention is the v5-blue-prestige source-of-truth referenced in (a) the annotate.js banner comment and (b) the pattern-shape test that asserts the diff against the upstream file. Both lines need trailing `# lint-allow:hardcoded-path` (canonical token from Phase 1 / `tools/lint-paths.sh`).

### S6. Commit format (per CONTEXT.md "Established Patterns")

HEREDOC + `<type>(02-NN): <message>` subject prefix + `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>`. Atomic per-task commits. `02-NN-SUMMARY.md` per plan.

### S7. CI auto-discovery of new tests

**Source:** `.github/workflows/ci.yml:81-91` (Gate 6).
```bash
find tests -maxdepth 2 -name '*.test.js' -print0 | xargs -0 node --test
```
**No ci.yml edits are needed for any of the new Phase 2 test files** — they are picked up automatically.

### S8. CI annotation prefixes

**Source:** `.github/workflows/ci.yml` lines 40, 47, 54, 67, 74, 89.
```bash
echo "::error::<message>"; exit 1
echo "::warning::<message>"
```
Phase 2 doesn't add new CI gates, but any future Phase 2 add-on (e.g., a Tier 2 visual-regression gate after Phase 7 enables soffice in CI) must use this prefix.

### S9. Atomic state transitions (P-08)

When a fixture and its consumer test cross a state boundary together (e.g., `annotate.js.sha256` switching from PRE-PATCH to POST-PATCH), the patched file + the new SHA + the unsuspended test MUST land in a single commit. CI must never observe a half-state.

### S10. `'use strict'` directive

**Source:** every Node file in the repo (`tests/findings-schema.test.js:6` would have it but doesn't; `tests/visual-regression.test.js:2` does). All new Phase 2 `.js` files start with `'use strict';` after the banner comment block — matches `visual-regression.test.js`, `annotate-integrity.test.js`, `samples.js`, `manifest-validator.test.js`.

---

## No Analog Found

| File | Reason |
|--|--|
| (none) | Every Phase 2 file has a usable in-repo analog. |

---

## Conventions Inherited from Phase 1 (locked, do not deviate)

1. **Test runner:** `node --test` (zero-dep). Tests use `node:test`, `node:assert/strict`, `node:fs`, `node:crypto`, `node:child_process`. No `jest`/`vitest`/`chai`.
2. **Path escape token:** `# lint-allow:hardcoded-path` is the only sanctioned bypass for `tools/lint-paths.sh`.
3. **Skill frontmatter:** single-line `description` scalar; `user-invocable: true`; `version` matches `plugin.json`. Validator (`tools/validate-manifest.js`) enforces.
4. **Shell hooks:** `#!/usr/bin/env bash` + `set -euo pipefail` + `umask 0077`. SessionStart hooks add `trap 'exit 0' ERR`. (Phase 2 ships no new shell scripts.)
5. **Log line prefix:** `Instadecks:` (only relevant if Phase 2 grows a hook — it doesn't).
6. **Schema-versioned JSON:** `schema_version` is the first key. Adapter validates `^1\.` per RESEARCH Q3.
7. **Severity vocabulary:** producer (findings JSON) keeps full 4-tier (`Critical/Major/Minor/Nitpick`); the 4→3 collapse to `major/minor/polish` happens at `skills/annotate/scripts/adapter.js` only — never in `/review`, `/content-review`, `/create`, schema doc, or fixtures.
8. **No new dependencies.** Phase 2 ships zero `package.json` changes (pinned `pptxgenjs@4.0.1` plus already-staged devDeps `pixelmatch@^5.3.0` and `pngjs@^7.0.0`).
9. **Plan numbering:** plan files = `02-01`, `02-02`, etc.; commit prefix = `<type>(02-NN): ...`.

---

## Metadata

**Analog search scope:** in-repo only — `/Users/shafqat/Documents/Projects/instadecks/{tests,tools,skills,.github}` plus the source-of-truth `/Users/shafqat/Documents/Projects/Sourcevo/v5-blue-prestige/annotate.js`.
**Files scanned:** 9 in-repo (8 Phase 1 deliverables + 1 source-of-truth).
**Pattern extraction date:** 2026-04-28.
**Open questions resolved during mapping:** O-2 (v8s-NN.jpg fixtures exist upstream — confirmed via `ls`).

## PATTERN MAPPING COMPLETE
