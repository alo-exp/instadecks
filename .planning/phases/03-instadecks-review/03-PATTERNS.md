# Phase 3: `/instadecks:review` — Pattern Map

**Mapped:** 2026-04-28
**Files analyzed:** 11 new + 1 modified (NOTICE) + 1 stub-replacement (SKILL.md)
**Analogs found:** 12 / 12 (100%)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `skills/review/SKILL.md` | skill manifest + playbook | doc/prompt | `skills/annotate/SKILL.md` | exact |
| `skills/review/scripts/index.js` | orchestrator (`runReview`) | request-response (mode-gated) | `skills/annotate/scripts/index.js` | exact |
| `skills/review/scripts/cli.js` | CLI wrapper | request-response | `skills/annotate/scripts/cli.js` | exact |
| `skills/review/scripts/ai-tells.js` | pure validate/transform module | batch over PPTX XML | `skills/annotate/scripts/adapter.js` (validation pattern) + `tools/normalize-pptx-sha.js` (jszip + regex on slide XML) | role-match (hybrid) |
| `skills/review/scripts/render-fixed.js` | pure renderer | transform (findings → markdown) | `skills/annotate/scripts/adapter.js` (pure module shape) | role-match |
| `scripts/pptx-to-images.sh` | shared shell utility | file I/O (PPTX → PDF → JPGs) | `skills/annotate/scripts/index.js::convertToPdf` (lines 90–109) | partial (extract + harden) |
| `tests/review-runtime.test.js` | integration test | test | `tests/annotate-runtime.test.js` | exact |
| `tests/review-ai-tells.test.js` | unit test (pure) | test | `tests/annotate-adapter.test.js` | exact |
| `tests/review-render-fixed.test.js` | unit/snapshot test | test | `tests/annotate-adapter.test.js` | role-match |
| `tests/pptx-to-images.test.js` | integration test (shell) | test | `tests/annotate-runtime.test.js` (soffice skip-guard pattern) | role-match |
| `tests/review-schema-emission.test.js` | property test | test | `tests/annotate-adapter.test.js` (loop-over-fixture validator) | role-match |
| `NOTICE` (modify) | attribution doc | doc | existing `NOTICE` lines 9–14 (RELICENSING NOTE block) | exact |

---

## Pattern Assignments

### `skills/review/scripts/index.js` (orchestrator, request-response, mode-gated)

**Analog:** `skills/annotate/scripts/index.js` (verbatim shape inheritance — the RESEARCH.md Example 3 already mirrors this file 1:1)

**Imports + module preamble** (analog lines 1–14):
```js
'use strict';
// index.js — exports runAnnotate({deckPath, findings, outDir, runId}) per Phase 2 D-06.
// Standalone CLI (cli.js) and pipelined consumer (/review Phase 3) both call this.
// Run-dir = .planning/instadecks/<runId>/ per D-01/D-02/D-05; sibling-of-input outputs per D-03/D-04.

const path = require('node:path');
const fsp = require('node:fs/promises');
const fs = require('node:fs');
const { execFile } = require('node:child_process');
const crypto = require('node:crypto');
```

→ Phase 3 banner: `// index.js — exports runReview({deckPath, runId, outDir, mode, findings, annotate}) per Phase 3 D-04.`

**`generateRunId` — copy verbatim** (analog lines 16–22). Format `YYYYMMDD-HHMMSS-<6hex>` is locked across phases.

**`resolveSiblingOutputs` pattern** (analog lines 24–32):
```js
function resolveSiblingOutputs(deckPath) {
  const dir = path.dirname(deckPath);
  const ext = path.extname(deckPath);
  const base = path.basename(deckPath, ext).replace(/\.annotated$/, '');
  return {
    pptxPath: path.join(dir, `${base}.annotated.pptx`),
    pdfPath: path.join(dir, `${base}.annotated.pdf`),
  };
}
```

→ Phase 3 returns `{ jsonPath, mdPath, narrativePath }` with suffixes `.review.json`, `.review.md`, `.review.narrative.md`. Strip trailing `.review` analogously to P-05.

**Public function shape — input-validation gate** (analog lines 123–130):
```js
async function runAnnotate({ deckPath, findings, outDir, runId } = {}) {
  if (!deckPath) throw new Error('runAnnotate: deckPath required');
  if (!findings) throw new Error('runAnnotate: findings required (in-memory object)');

  runId = runId || generateRunId();
  outDir = outDir || path.join(process.cwd(), '.planning', 'instadecks', runId);
  await fsp.mkdir(outDir, { recursive: true });
```

→ `runReview` adds the `mode = 'standalone'` and `annotate = false` defaults. Validation uses `lib/schema-validator.js` (mirroring `adapter.adaptFindings` validation, see ai-tells.js notes below).

**Pipeline-import contract** (analog lines 13 — `const { adaptFindings } = require('./adapter');`). Phase 3 does the inverse:
```js
if (annotate) {
  const { runAnnotate } = require('../../annotate/scripts');
  annotated = await runAnnotate({ deckPath, findings, outDir, runId });
}
```
P-07 of RESEARCH.md mandates a smoke test pinning this exact relative path.

**Module exports pattern** (analog line 227):
```js
module.exports = { runAnnotate, generateRunId, resolveSiblingOutputs, _runAnnotateWithRawSamples };
```
→ Phase 3: `module.exports = { runReview, generateRunId, resolveSiblingOutputs };`

---

### `skills/review/scripts/cli.js` (CLI wrapper)

**Analog:** `skills/annotate/scripts/cli.js` (entire file is the template — 24 lines, copy structure verbatim)

**Full pattern to copy** (analog lines 1–24):
```js
#!/usr/bin/env node
'use strict';
// cli.js — standalone CLI wrapper around runAnnotate. Per Phase 2 D-06 + ANNO-09.
// Usage: node cli.js <deck.pptx> <findings.json> [outDir]

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

**Phase 3 deltas:**
- Add `--annotate` boolean flag parsing (D-03).
- Findings JSON is **optional** in Phase 3 (review can be invoked deck-only; agent emits findings in-process via SKILL.md). When omitted, `runReview` requires the agent to have populated findings before this CLI is reached — for purely-CLI deck-only invocation, surface a clear "findings required" error from `runReview` (matches analog line 125 pattern).
- Banner: `// cli.js — standalone CLI wrapper around runReview. Per Phase 3 D-03/D-04 + RVW-07.`
- Exit codes: 2 = usage error (verbatim from analog), 1 = runtime error.

---

### `skills/review/scripts/ai-tells.js` (pure validate/transform; PPTX XML → findings)

**Primary analog:** `skills/annotate/scripts/adapter.js` (pure-module shape, fail-loud validation, `module.exports` with `_internal` for testability — analog has `SEV_MAP`)

**Secondary analog:** `tools/normalize-pptx-sha.js` (jszip-loadAsync over PPTX, regex on slide XML — the precedent for skipping `xml2js`)

**Imports pattern** (from `tools/normalize-pptx-sha.js` lines 18–20):
```js
const fs = require('node:fs');
const crypto = require('node:crypto');
const JSZip = require('jszip');
```
→ Phase 3 ai-tells.js uses identical three imports + `node:fs/promises` for async-friendly read. RESEARCH.md Example 2 (lines 778–780) shows the canonical block.

**Constants-table pattern** (analog `adapter.js` lines 6–12):
```js
const SEV_MAP = { Critical: 'major', Major: 'major', Minor: 'minor', Nitpick: 'polish' };
const VALID_CATEGORY = new Set(['defect', 'improvement', 'style']);
const REQUIRED_FINDING_FIELDS = [
  'severity_reviewer', 'category', 'genuine',
  'nx', 'ny', 'text', 'rationale', 'location', 'standard', 'fix',
];
```
→ Phase 3 ai-tells: `DEFAULT_BLUES = new Set([...])`, `TITLE_BASELINE_TOLERANCE_EMU = 152400`, etc. Same uppercase-constant + `Set` idiom (RESEARCH.md Example 2 lines 782–790 already uses this).

**PPTX unzip pattern** (analog `tools/normalize-pptx-sha.js` lines 22–26):
```js
async function normalizedShaOfPptx(pptxPath) {
  const buf = fs.readFileSync(pptxPath);
  const zip = await JSZip.loadAsync(buf);
  const names = Object.keys(zip.files).sort();
```
→ Phase 3 `loadSlides` (Example 2 lines 792–809) follows: `JSZip.loadAsync(await fs.readFile(pptxPath))`, filter `^ppt/slides/slide\d+\.xml$`, sort by slide number, extract `await zip.file(f).async('string')`.

**Regex-on-slide-XML precedent** (analog `tools/normalize-pptx-sha.js` lines 41–47):
```js
} else if (/^ppt\/slides\/slide\d+\.xml$/.test(name)) {
  const xml = bytes.toString('utf8').replace(/descr="([^"]*)"/g, (_m, value) => {
```
→ Phase 3 ai-tells uses analogous regex over slide XML strings (no DOM). Anti-Pattern in RESEARCH.md: do NOT add `xml2js`/`fast-xml-parser`.

**`module.exports` with `_internal` testability hatch** (mirrors `adapter.js` line 93 `module.exports = { adaptFindings, SEV_MAP };` — exposing internals for unit tests). Phase 3 (Example 2 lines 944–947):
```js
module.exports = { detectAITells, _internal: {
  detectDefaultBluePalette, detectAccentLineUnderTitle, detectIdenticalLayoutsRepeated,
  extractShapes, loadSlides,
}};
```

**Validation-fails-loud pattern** (analog `adapter.js` lines 14–24, P-09 validate-before-transform):
```js
if (doc === null || typeof doc !== 'object' || Array.isArray(doc)) {
  throw new Error(`Unsupported findings schema version ${doc && doc.schema_version}. /annotate supports 1.x.`);
}
```
→ Phase 3 `lib/schema-validator.js` (used by `runReview`) follows this exact pattern. Error messages must be specific (e.g. `slides[2].findings[1].severity_reviewer: MAJOR not in {Critical,Major,Minor,Nitpick}`).

---

### `skills/review/scripts/render-fixed.js` (pure renderer)

**Analog:** `skills/annotate/scripts/adapter.js` (pure module — no fs, no async, no LLM; deterministic transform)

**Pattern: pure synchronous transform with structured input → string output.** Banner from RESEARCH.md:
```js
'use strict';
// render-fixed.js — pure deterministic renderer per Phase 3 D-06 / RVW-02.
// (findingsDoc) → markdown_string. No LLM, no fs, no async.
const { render } = ... // single export
```

**Property-test discipline:** RESEARCH.md §"Two-Report Architecture" — given the same `findingsDoc`, output is byte-identical. Snapshot fixture `tests/fixtures/sample-findings.fixed.md` mirrors how `adapter.js` is tested deterministically against `tests/fixtures/sample-findings.json`.

---

### `scripts/pptx-to-images.sh` (plugin-level shared shell utility)

**Analog (Node-side precedent only):** `skills/annotate/scripts/index.js::convertToPdf` (lines 90–109):
```js
function convertToPdf(pptxPath, outDir) {
  return new Promise((resolve, reject) => {
    const SESSION_ID = process.env.CLAUDE_SESSION_ID || `s${Date.now()}`;
    execFile('soffice', [
      '--headless',
      `-env:UserInstallation=file:///tmp/lo-${SESSION_ID}-${process.pid}`,
      '--convert-to', 'pdf',
      '--outdir', outDir,
      pptxPath,
    ], { timeout: 60_000 }, (err, stdout, stderr) => {
```

This Node convertToPdf function is the **soffice flag template** that pptx-to-images.sh re-implements in bash. RESEARCH.md Example 1 (lines 666–764) is the full shell-script pattern; key bash idioms:

**Bash header pattern** (Example 1 lines 666–680):
```bash
#!/usr/bin/env bash
set -euo pipefail
umask 0077
```

**Cleanup trap pattern** (Example 1 lines 691–694; see P-06):
```bash
SESSION_ID="${CLAUDE_SESSION_ID:-s$(date +%s)}"
LO_PROFILE="/tmp/lo-${SESSION_ID}-$$"
mkdir -p "$LO_PROFILE"
trap 'rm -rf "$LO_PROFILE"' EXIT INT TERM   # RVW-11
```

**Portable size-check pattern** (Example 1 line 720; Q-3 resolution):
```bash
SIZE=$(wc -c < "$PDF_PATH")           # POSIX, identical on macOS BSD + Linux GNU
```
Do NOT use `stat -c%s` or `stat -f%z` (P-03).

**Magic-byte check** (Example 1 lines 725–728):
```bash
MAGIC=$(head -c 4 "$PDF_PATH")
if [[ "$MAGIC" != "%PDF" ]]; then ...
```

**Retry-then-fail-loud loop** (Example 1 lines 698–713):
```bash
attempt=0
while (( attempt < 2 )); do
  attempt=$(( attempt + 1 ))
  if timeout 60 soffice ... ; then break; fi
  if (( attempt == 2 )); then echo "failed twice" >&2; exit 2; fi
done
```

---

### `tests/review-runtime.test.js` (integration test)

**Analog:** `tests/annotate-runtime.test.js` (exact role + flow match — copy structure)

**Imports pattern** (analog lines 5–13):
```js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { runAnnotate, generateRunId, resolveSiblingOutputs } = require('../skills/annotate/scripts/index');
```

**Skip-guard pattern for soffice integration tests** (analog lines 15–20):
```js
const REPO_ROOT = path.join(__dirname, '..');
const SAMPLE_FINDINGS = path.join(REPO_ROOT, 'tests', 'fixtures', 'sample-findings.json');
const REF_DECK = path.join(REPO_ROOT, 'tests', 'fixtures', 'v8-reference', 'Annotations_Sample.pptx');
const CLI = path.join(REPO_ROOT, 'skills', 'annotate', 'scripts', 'cli.js');

const sofficeAvailable = spawnSync('command', ['-v', 'soffice'], { shell: true }).status === 0;

function freshTmpDir(tag) { return fs.mkdtempSync(path.join(os.tmpdir(), `${tag}-`)); }
```

**Subtest with skip-guard pattern** (analog lines 44–47):
```js
await t.test('integration: pipelined mode (in-memory findings)', async (t) => {
  if (!sofficeAvailable) { t.skip('soffice not available'); return; }
  const tmpDeck = freshTmpDir('anno-deck');
  const outDir = freshTmpDir('anno-out');
```

**try/finally cleanup pattern** (analog lines 47–63 — every integration subtest uses this exact `try { ... } finally { fs.rmSync(...) }` shape).

**Pure-input-validation subtest pattern** (analog lines 25–31):
```js
await t.test('pure: input validation — missing deckPath', async () => {
  await assert.rejects(runAnnotate({ findings: {} }), /deckPath required/);
});
```

**CLI-equivalence subtest pattern** (analog lines 66–83) — Phase 3 review-pipeline.test.js (separate file) reuses this for `--annotate` smoke.

---

### `tests/review-ai-tells.test.js` (unit test, pure module)

**Analog:** `tests/annotate-adapter.test.js` (lines 1–60 read; pure-module test pattern)

**Header + valid-doc factory pattern** (analog lines 1–38):
```js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { adaptFindings, SEV_MAP } = require('../skills/annotate/scripts/adapter');

function validFinding(overrides = {}) { ... }
function validDoc(overrides = {}) { ... }

test('adapter validates and transforms findings', async (t) => {
  await t.test('rejects missing schema_version', () => {
    assert.throws(() => adaptFindings({ slides: [] }), /schema version/);
  });
```

→ Phase 3 ai-tells unit test uses fixture-driven positive/negative pattern: load `tests/fixtures/ai-tells-positive.pptx`, assert all 3 heuristics fire; load `tests/fixtures/ai-tells-negative.pptx`, assert 0 fire. Use `_internal` exports to unit-test each heuristic in isolation.

**Loop-over-required-fields pattern** (analog lines 59–60+):
```js
await t.test('rejects each missing required field', () => {
  for (const key of REQUIRED_FINDING_FIELDS) { ... }
});
```

---

### `tests/review-render-fixed.test.js` (snapshot test)

**Analog:** `tests/annotate-adapter.test.js` (pure-deterministic-transform-against-fixture). Phase 3 specific: load `tests/fixtures/sample-findings.json`, call `render(findings)`, compare byte-for-byte to `tests/fixtures/sample-findings.fixed.md` via `assert.equal(actual, fs.readFileSync(snapshotPath, 'utf8'))`.

---

### `tests/pptx-to-images.test.js` (shell-script integration test)

**Analog:** `tests/annotate-runtime.test.js` (soffice skip-guard pattern lines 20, 45) + analog `spawnSync` pattern lines 73–75:
```js
const res = spawnSync(process.execPath, [CLI, deckCopy, SAMPLE_FINDINGS, outDir],
  { encoding: 'utf8', timeout: 120_000 });
assert.equal(res.status, 0, `cli failed: ${res.stderr}`);
```

→ Phase 3 substitutes `process.execPath`/`CLI` with `bash`/`scripts/pptx-to-images.sh`. Negative cases mock soffice via PATH override or use a stub fixture asserting the shell exits 3 (missing PDF), 3 (size <1024), 3 (bad magic-bytes) respectively.

---

### `tests/review-schema-emission.test.js` (property test)

**Analog:** `tests/annotate-adapter.test.js` enum-validation loops (P-01 motivation). Property: every emitted finding's `severity_reviewer ∈ {Critical, Major, Minor, Nitpick}`. Iterate `findings.slides[*].findings[*]`, assert membership. Mirrors RESEARCH.md §"Common Pitfalls P-01".

---

### `NOTICE` (modify — append DECK-VDA acknowledgment)

**Analog:** existing `NOTICE` lines 9–14 (RELICENSING NOTE block):
```
--------------------------------------------------------------------
RELICENSING NOTE

annotate.js originally developed for internal Sourcevo use; relicensed under
Apache-2.0 by the author for inclusion in this plugin.
```

→ Phase 3 appends a parallel block (RESEARCH.md §"NOTICE update"):
```
--------------------------------------------------------------------
METHODOLOGY ATTRIBUTION

The DECK-VDA methodology embedded in /instadecks:review (4-pass scan, 4-tier
severity, finding grammar, §1–§5 reporting structure) was developed by
Shafqat Ullah / Sourcevo as the standalone deck-design-review skill.
Instadecks re-expresses the methodology as first-class authored content
under Apache-2.0; no upstream files are vendored.
```

---

### `skills/review/SKILL.md` (replace Phase 1 stub)

**Analog:** `skills/annotate/SKILL.md` (entire file — exact role + frontmatter shape)

**Frontmatter pattern** (analog lines 1–6):
```yaml
---
name: annotate
description: Annotate a presentation deck with design-review findings. This skill should be used when the user has a deck file and a findings JSON in the locked schema and wants visual annotations overlaid as a PPTX + PDF.
user-invocable: true
version: 0.1.0
---
```
→ Phase 3 description per RESEARCH.md §11 (single-line, ≤1024 chars, imperative-verb-start, embedded examples).

**Section ordering pattern** (analog lines 8–73, in order):
1. `# /instadecks:<name> — One-liner` heading
2. `## When to invoke`
3. `## Inputs`
4. `## Outputs`
5. `## Invocation modes` (standalone CLI + pipelined `require()`)
6. `## Adapter behaviour (locked)` → Phase 3 substitutes `## Severity vocabulary (locked — 4-tier)` to forbid pre-collapse (P-01)
7. `## Allowed tools`
8. `## Environment`
9. `## Deferred (out of scope for Phase X)`

→ Phase 3 inserts new sections between (5) and (6): `## DECK-VDA 4-pass methodology` (canonicalized per D-01), `## R18 AI-Tell Detection — Fuzzy` (D-02 prompt-side tells), `## Two reports — fixed + narrative` (D-06 instructions).

**Pipelined-import documentation pattern** (analog lines 36–40):
```md
**Pipelined (ANNO-10, D-06):** other skills `require()` the entry point directly:
\`\`\`js
const { runAnnotate } = require(`${process.env.CLAUDE_PLUGIN_ROOT}/skills/annotate/scripts/index`);
const result = await runAnnotate({ deckPath, findings /* in-memory object */ });
\`\`\`
```
→ Phase 3 mirrors for `runReview` and additionally documents `--annotate` flag + NL-intent gating (D-03).

---

## Shared Patterns

### Banner / module-doc convention
**Source:** every Phase 2 script (`adapter.js:1–4`, `index.js:1–6`, `cli.js:1–4`, `tools/normalize-pptx-sha.js:1–17`)
**Apply to:** all `skills/review/scripts/*.js`, `tests/review-*.test.js`, `scripts/pptx-to-images.sh`
**Pattern:** `'use strict';` + 2–6 line header comment naming the file's purpose, the locked decision IDs it implements, and any cross-references (e.g. `// Per Phase 3 D-04 / RVW-05/06/07/08.`). Bash files use `#!/usr/bin/env bash` + `set -euo pipefail` + `umask 0077` (RESEARCH.md Example 1 lines 666–680).

### Fail-loud structured-error validation
**Source:** `skills/annotate/scripts/adapter.js` lines 14–78
**Apply to:** `skills/review/scripts/lib/schema-validator.js`, ai-tells.js input checks, render-fixed.js precondition checks
**Pattern:** validate-everything-before-transform (P-09); throw `Error` with location-pinpoint message (`slides[N].findings[M].field: <reason>`); no silent skipping.

### Test runner + skip-guard
**Source:** `tests/annotate-runtime.test.js` lines 5–22
**Apply to:** all 5 new `tests/review-*.test.js` files + `tests/pptx-to-images.test.js`
**Pattern:**
```js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
// ...
const sofficeAvailable = spawnSync('command', ['-v', 'soffice'], { shell: true }).status === 0;
function freshTmpDir(tag) { return fs.mkdtempSync(path.join(os.tmpdir(), `${tag}-`)); }
// then per-test: if (!sofficeAvailable) { t.skip('soffice not available'); return; }
// then: try { ... } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
```

### CLI exit-code convention
**Source:** `skills/annotate/scripts/cli.js` lines 13–14, 24
**Apply to:** `skills/review/scripts/cli.js`, `scripts/pptx-to-images.sh`
**Pattern:** exit 2 = usage error (with `Usage:` printed to stderr); exit 1 = runtime error (stack/message to stderr); exit 0 = success (JSON to stdout for Node CLIs; printf to stdout for shell). Bash exits 1–5 are documented at the top of `pptx-to-images.sh` per RESEARCH.md Example 1 lines 671–678.

### Run-id + run-dir convention
**Source:** `skills/annotate/scripts/index.js` lines 16–22 (`generateRunId`) + line 128 (`outDir = ... '.planning', 'instadecks', runId`)
**Apply to:** `skills/review/scripts/index.js` (verbatim copy)
**Pattern:** `YYYYMMDD-HHMMSS-<6hex>` via `crypto.randomBytes(3).toString('hex')`; default outDir under `.planning/instadecks/<runId>/`.

### Sibling-of-input output convention
**Source:** `skills/annotate/scripts/index.js` lines 24–32 (`resolveSiblingOutputs`)
**Apply to:** `skills/review/scripts/index.js`
**Pattern:** `path.dirname` + `path.basename(p, ext)`, strip trailing `.review` (analogous to `.replace(/\.annotated$/, '')` — P-05 prevents double-suffixing on re-runs).

### Pipeline-import path stability
**Source:** RESEARCH.md P-07 + analog `skills/annotate/scripts/index.js` line 13 (`require('./adapter')`)
**Apply to:** `skills/review/scripts/index.js` line that reads `require('../../annotate/scripts')`
**Test contract:** `tests/review-pipeline.test.js` imports both `runReview` and `runAnnotate` from canonical paths and asserts the wired call. CI fails loud on path drift.

### Per-call soffice `-env:UserInstallation` flag
**Source:** `skills/annotate/scripts/index.js` lines 92–96
**Apply to:** `scripts/pptx-to-images.sh` (RESEARCH.md Example 1 lines 700–706)
**Pattern:** `-env:UserInstallation=file:///tmp/lo-${SESSION_ID}-${PID}` — Phase 2 D-08 inherited; Phase 3 adds the cleanup trap (RVW-11) and 60s timeout + 1 retry (RVW-10) on top.

---

## No Analog Found

None — every Phase 3 file maps cleanly onto a Phase 1/2 analog (often exact). The `pptx-to-images.sh` shell script has no Phase 2 shell-script analog, but its body is fully specified in RESEARCH.md Example 1 and inherits soffice flag patterns from `skills/annotate/scripts/index.js::convertToPdf`. The DECK-VDA SKILL.md re-expression has no in-repo analog (upstream `~/.claude/skills/deck-design-review/` is the methodological source, NOT vendored per D-01) — planner should treat RESEARCH.md §"DECK-VDA Methodology Re-Expression" (lines 302–381) as the canonical source.

## Metadata

**Analog search scope:** `skills/annotate/scripts/`, `tests/`, `tools/`, `NOTICE`
**Files scanned:** 7 (annotate index/cli/adapter/SKILL, normalize-pptx-sha, annotate-runtime/adapter tests, NOTICE)
**Pattern extraction date:** 2026-04-28
