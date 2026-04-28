---
phase: 05
slug: instadecks-create-auto-refine
artifact: PATTERNS.md
created: 2026-04-28
inherits_from: [05-CONTEXT.md, 05-RESEARCH.md]
---

# Phase 05 — Auto-Refine Loop — Pattern Map

**Mapped:** 2026-04-28
**Files analyzed:** 8 (2 new lib, 4 new tests, 2 modified)
**Analogs found:** 8 / 8

> Project context note: per CLAUDE.md, "Don't get cute" — Phase 5 primitives are stateless utilities; the loop control flow lives in `skills/create/SKILL.md`, not in code (D-01). All analogs below are calibrated against existing repo conventions; no new framework patterns are introduced.

---

## File Classification

| New / Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `skills/create/scripts/lib/loop-primitives.js` (NEW) | utility-lib | file-I/O + transform | `skills/review/scripts/lib/schema-validator.js` | exact (utility-lib shape) |
| `skills/create/scripts/lib/oscillation.js` (NEW) | utility-lib | transform (pure) | `skills/create/scripts/lib/enum-lint.js` | exact (pure-function lib) |
| `skills/review/scripts/index.js` (MODIFIED) | service / orchestrator | request-response | (self — additive `slidesToReview` param) | self-modify |
| `skills/create/scripts/lib/render-rationale.js` (MODIFIED) | utility-lib | transform (pure) | (self — populate existing `reviewerNotes` slot) | self-modify |
| `skills/create/SKILL.md` (MODIFIED) | playbook | (doc) | `skills/review/SKILL.md` | role-match |
| `tests/refine-ledger-schema.test.js` (NEW) | test | schema-assert | `tests/findings-schema.test.js` | exact |
| `tests/oscillation.test.js` (NEW) | test | unit (pure-fn) | `tests/create-render-rationale.test.js` | exact (pure-function unit test) |
| `tests/loop-primitives.test.js` (NEW) | test | unit + tmpdir I/O | `tests/review-pipeline.test.js` | exact (lib unit test w/ tmpdir + override hook) |
| `tests/auto-refine-integration.test.js` (NEW) | test | integration (mocked) | `tests/review-integration.test.js` | exact (integration ribbon + stub via `_test_set*` hook) |

---

## Pattern Assignments

### `skills/create/scripts/lib/loop-primitives.js` (NEW — utility-lib, file-I/O + transform)

**Analog:** `skills/review/scripts/lib/schema-validator.js` (utility-lib shape, hand-rolled, no deps) and `skills/create/scripts/index.js` (for `fsp` + `path` + `crypto` import idiom and JSONL/run-dir conventions).

**File header pattern** (copy from `schema-validator.js:1-7`):
```javascript
'use strict';
// loop-primitives.js — Phase 5 D-01/D-02/D-04 stateless primitives for the agent-owned
// auto-refine loop. Exports: appendLedger, readLedger, checkInterrupt, detectOscillation
// (re-exported from ./oscillation), slidesChangedSinceLastCycle, hashIssueSet.
// Hand-rolled per project policy (no ajv/joi). All run-dir paths via runDir argument —
// never reach outside the plugin tree (CLAUDE.md path-lint rule).
```

**Imports pattern** (copy from `skills/create/scripts/index.js:7-15`):
```javascript
const path = require('node:path');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const crypto = require('node:crypto');
```

**Append-only JSONL pattern** (NEW — no analog in repo; use Node `fsp.appendFile`):
```javascript
async function appendLedger(runDir, entry) {
  // Schema enforced by tests/refine-ledger-schema.test.js — keep field names in lockstep
  // with 05-CONTEXT.md D-02. No mutation of caller's entry object.
  const line = JSON.stringify(entry) + '\n';
  await fsp.appendFile(path.join(runDir, 'refine-ledger.jsonl'), line);
}
```

**SHA hashing pattern** (copy from `skills/review/scripts/index.js:21` `crypto.randomBytes` style — same `node:crypto` import, but use `createHash('sha1')`):
```javascript
function hashIssueSet(genuineFindings) {
  const sorted = [...genuineFindings]
    .map(f => `${f.slideNum}|${f.text}`)
    .sort();
  return 'sha1:' + crypto.createHash('sha1').update(sorted.join('\n')).digest('hex');
}
```

**`checkInterrupt` pattern** (sync `fs.existsSync` like `skills/create/scripts/index.js:85`):
```javascript
function checkInterrupt(runDir) {
  return fs.existsSync(path.join(runDir, '.interrupt'));
}
```

**Slide-image SHA diff** (D-03, Q-2): use `crypto.createHash('sha1').update(buffer)` per slide JPG; compare against prior cycle's recorded hashes (stored in ledger entry or alongside as `<run-dir>/cycle-N/slide-hashes.json`). Researcher Q-2 flagged JPG byte-SHA may be unstable across `pdftoppm` runs — implementation must verify empirically; if unstable, fall back to PNG conversion (still deterministic).

**Error handling pattern** (copy from `schema-validator.js:18` — pinpoint `Error` throws, not `console.error`):
```javascript
if (!Number.isInteger(entry.cycle) || entry.cycle < 1) {
  throw new Error(`appendLedger: cycle must be positive integer (got ${JSON.stringify(entry.cycle)})`);
}
```

**Module exports pattern** (copy from `schema-validator.js:86-89`):
```javascript
module.exports = {
  appendLedger, readLedger, checkInterrupt,
  slidesChangedSinceLastCycle, hashIssueSet,
  _internal: { /* helpers exposed for tests */ },
};
```

---

### `skills/create/scripts/lib/oscillation.js` (NEW — utility-lib, pure transform)

**Analog:** `skills/create/scripts/lib/enum-lint.js` (single-export pure function, no fs, no clock — exactly the shape oscillation detection needs).


> **SUPERSEDED by 05-CONTEXT.md D-09.** The subset-semantics code sketch below (lines following) is retained for historical reference only. The production `oscillation.js` body MUST implement D-09 (strict `issue_set_hash_N === issue_set_hash_{N-2}` AND `findings_genuine_N > 0`), per Plan 05-01 <interfaces>. The subset approach false-flags steady-shrinking (converging) runs — see RESEARCH Pitfall 2.

**Header + signature pattern** (copy from `enum-lint.js:1-7`):
```javascript
'use strict';
// oscillation.js — Phase 5 D-02 oscillation detector. Pure function: no fs, no clock.
// detectOscillation(ledger) returns true iff cycle N's issue set is a subset of cycle N-2's.
// Ledger is the in-memory array returned by readLedger() — never reads disk itself.

function detectOscillation(ledger) {
  if (!Array.isArray(ledger)) {
    throw new Error('detectOscillation: ledger must be array');
  }
  if (ledger.length < 3) return false; // need cycle N and cycle N-2
  const N = ledger[ledger.length - 1];
  const Nminus2 = ledger[ledger.length - 3];
  const setN = new Set([...(N.fixed_finding_ids || []), ...(N.skipped_finding_ids || [])]);
  const setNminus2 = new Set([...(Nminus2.fixed_finding_ids || []), ...(Nminus2.skipped_finding_ids || [])]);
  for (const id of setN) {
    if (!setNminus2.has(id)) return false;
  }
  return true;
}

module.exports = { detectOscillation };
```

**Why this shape:** matches `enum-lint.js` line-for-line (single named export, throws `Error` on bad input, no I/O). Planner should not invent a class; the pure-function pattern is the project convention for `lib/*.js` files.

---

### `skills/review/scripts/index.js` (MODIFIED — add `slidesToReview` param)

**Current signature** (lines 58-65 in this file):
```javascript
async function runReview({
  deckPath,
  runId,
  outDir,
  mode = 'standalone',
  findings,
  annotate = false,
} = {}) {
```

**Modification** (D-03 / Q-1 — non-breaking, additive only):
```javascript
async function runReview({
  deckPath,
  runId,
  outDir,
  mode = 'standalone',
  findings,
  annotate = false,
  slidesToReview = null, // null | 'all' | int[]; null/'all' = all slides
} = {}) {
```

**Filter insertion point:** between line 73 (`validate(findings)`) and line 76 (run-dir resolve). Add a deep-clone-then-prune pass that drops `findings.slides[i].findings[]` entries whose `slideNum` is not in `slidesToReview`. The schema validator runs BEFORE the filter so input integrity is preserved. The pruned doc is what gets written to JSON/MD.

**Filter pattern** (NEW, but mirrors `countFindings` traversal at lines 35-50):
```javascript
function filterSlides(findings, slidesToReview) {
  if (slidesToReview == null || slidesToReview === 'all') return findings;
  if (!Array.isArray(slidesToReview)) {
    throw new Error(`runReview: slidesToReview must be null|'all'|int[] (got ${JSON.stringify(slidesToReview)})`);
  }
  const keep = new Set(slidesToReview);
  return {
    ...findings,
    slides: (findings.slides || []).filter(s => keep.has(s.slideNum)),
  };
}
```

**P-01 guard preserved:** filter never collapses severities — that invariant lives at the annotate adapter boundary (CLAUDE.md). Filter only drops slide entries.

**Result shape unchanged:** `findingCounts` and `genuineCount` reflect the FILTERED set (planner: this is the desired behavior; loop wants counts for reviewed slides only).

**LOC estimate (Q-1 answer):** ~12 LOC: 1 param, 1 filter call, 1 filter helper. No JSON schema change.

---

### `skills/create/scripts/lib/render-rationale.js` (MODIFIED — populate Reviewer Notes from ledger)

**Current Reviewer-Notes renderer** (lines 57-62):
```javascript
function renderReviewerNotes(reviewerNotes) {
  const body = (reviewerNotes && String(reviewerNotes).trim().length > 0)
    ? String(reviewerNotes)
    : REVIEWER_NOTES_PLACEHOLDER;
  return ['## Reviewer Notes', body].join('\n');
}
```

**Phase 4 placeholder** (line 10-11):
```javascript
const REVIEWER_NOTES_PLACEHOLDER =
  '_(empty in Phase 4 — auto-refine loop ships in Phase 5.)_';
```

**Phase 5 modification:** Phase 5 does NOT change this function's signature or logic. The renderer already accepts a `reviewerNotes` string; the auto-refine loop becomes the producer. Replace the placeholder string OR add an alternate "no findings recorded" placeholder for clean convergence runs.

**Producer side (lives in SKILL.md, not in this file):** the agent reads `refine-ledger.jsonl`, formats per-cycle skipped findings + final-cycle non-genuines into a Markdown block, and passes the string as `reviewerNotes` to `render({ brief, designChoices, reviewerNotes })`. This keeps `render-rationale.js` byte-stable per `tests/create-render-rationale.test.js:39-43`.

**Recommended placeholder swap** (one-line change, keeps the byte-stable test passing if updated):
```javascript
const REVIEWER_NOTES_PLACEHOLDER =
  '_(no reviewer findings recorded — auto-refine converged on cycle 1.)_';
```
Note: `tests/create-render-rationale.test.js:46` matches `/empty in Phase 4/` — that assertion needs to be updated to the new placeholder text or relaxed to `/no reviewer findings/`.

---

### `skills/create/SKILL.md` (MODIFIED — append `## Auto-Refine Loop` section)

**Analog for section style:** `skills/review/SKILL.md` (sibling skill, same audience, same playbook voice).

**Patterns to inherit from `skills/create/SKILL.md` itself** (already reads as a numbered playbook — the loop section just appends more numbered steps):
- Section header convention: `### Step N — <imperative>` (see lines 41, etc.).
- Locked-invariants block at top (lines 30-37) — Phase 5 adds NO new invariants; convergence rule is already in CLAUDE.md.
- Tables for input/decision matrices (line 43 — `Input | Tool | Notes`).

**Required content per CONTEXT.md D-01..D-08:** explicit cycle pseudocode the agent executes (1. checkInterrupt → 2. render via runCreate → 3. image via pptx-to-images.sh → 4. review via runReview with slidesToReview → 5. agent triages genuine flag → 6. fix list → 7. appendLedger → 8. detectOscillation → 9. soft-cap AskUserQuestion at cycle 5).

---

### `tests/refine-ledger-schema.test.js` (NEW — schema test)

**Analog:** `tests/findings-schema.test.js` (lines 1-124) — exact match: validates a JSON document's shape via `node:test` + `node:assert/strict`, asserts required fields, type-checks each field, exercises edge cases.

**Imports pattern** (copy from `findings-schema.test.js:4-8`):
```javascript
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
```

**Required-fields enumeration pattern** (copy from `findings-schema.test.js:14-17`):
```javascript
const REQUIRED_LEDGER_FIELDS = [
  'cycle', 'timestamp', 'findings_total', 'findings_genuine',
  'findings_fixed', 'findings_intentionally_skipped',
  'issue_set_hash', 'skipped_finding_ids', 'fixed_finding_ids',
  'slides_changed', 'review_mode', 'ended_via',
];
```

**Per-field type assertion pattern** (copy from `findings-schema.test.js:41-62` — one `t.test(...)` per field group):
```javascript
test('refine-ledger entries honor schema', async (t) => {
  await t.test('cycle is positive integer', () => { /* ... */ });
  await t.test('issue_set_hash matches /^sha1:[0-9a-f]{40}$/', () => { /* ... */ });
  await t.test('review_mode ∈ {full, diff-only}', () => { /* ... */ });
  await t.test('ended_via is null OR ∈ {converged, oscillation, soft-cap, soft-cap-accepted, soft-cap-stopped, interrupted}', () => { /* ... */ });
});
```

**Fixture strategy:** create `tests/fixtures/sample-refine-ledger.jsonl` with 3-5 entries exercising all `ended_via` values + at least one oscillation pair + one interrupt — same pattern as `tests/fixtures/sample-findings.json`.

---

### `tests/oscillation.test.js` (NEW — unit test, pure function)

**Analog:** `tests/create-render-rationale.test.js` (lines 1-53) — tests a pure function with multiple `test(...)` blocks, one per behavior.

**Imports + invocation pattern** (copy from `create-render-rationale.test.js:4-9`):
```javascript
const test = require('node:test');
const assert = require('node:assert/strict');
const { detectOscillation } = require('../skills/create/scripts/lib/oscillation');
```

**Test cases to cover** (one `test(...)` per scenario, mirroring the file at lines 27-52):
- `detectOscillation: returns false for ledgers shorter than 3 cycles`
- `detectOscillation: returns true when cycle N issue set ⊆ cycle N-2 set`
- `detectOscillation: returns false when cycle N has a NEW finding id absent from N-2`
- `detectOscillation: ignores cycle N-1 entirely`
- `detectOscillation: throws on non-array input`

---

### `tests/loop-primitives.test.js` (NEW — unit + tmpdir I/O)

**Analog:** `tests/review-pipeline.test.js` (lines 1-95) — tmpdir-based file-I/O testing with cleanup hooks via `t.after`.

**Tmpdir helper pattern** (copy from `review-pipeline.test.js:19`):
```javascript
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
function freshTmpDir(tag) { return fs.mkdtempSync(path.join(os.tmpdir(), `${tag}-`)); }
```

**Cleanup pattern** (copy from `review-pipeline.test.js:36-40`):
```javascript
t.after(() => {
  fs.rmSync(runDir, { recursive: true, force: true });
});
```

**Test cases:**
- `appendLedger: writes JSONL, multiple appends accumulate (one line per entry)`
- `readLedger: returns empty array when file absent`
- `readLedger: parses each line, returns array in order`
- `checkInterrupt: returns false when .interrupt absent, true when present`
- `hashIssueSet: deterministic — same findings → same hash; reordered → same hash (sort guarantees)`
- `slidesChangedSinceLastCycle: returns int[] of slides whose JPG SHA differs from prior cycle`

---

### `tests/auto-refine-integration.test.js` (NEW — integration ribbon, mocked)

**Analog:** `tests/review-integration.test.js` (lines 1-199) — integration ribbon style, uses `_test_setRunAnnotate` override hook to stub heavy subprocesses.

**Per Q-3 in CONTEXT.md:** mock `runReview` to return a deterministic findings sequence per cycle (e.g., cycle 1 returns 3 findings, cycle 2 returns 1, cycle 3 returns 0 → assert convergence at cycle 3 with confirmation cycle behavior). Do NOT spawn soffice or run real `pptx-to-images.sh` in CI — the loop primitives + ledger correctness are what's under test, not end-to-end render.

**Stub-injection pattern** (copy from `review-integration.test.js:143-152`):
```javascript
const { runReview, _test_setRunAnnotate } = require('../skills/review/scripts/index');
// Phase 5 needs an analogous _test_setRunReview hook on the create side, OR the loop
// primitives accept an injected reviewer fn. The latter is cleaner — keep loop-primitives.js
// pure and pass deps in. Recommend: agent-owned loop in SKILL.md so the test can call
// primitives directly with synthetic ledger entries.
```

**Recommended test structure** — since the loop is agent-owned (D-01), the integration test exercises the **primitives composed in sequence** (simulating what the agent does), not a single `runAutoRefine()` entrypoint:

```javascript
test('auto-refine: convergence path (3 cycles, cycle 3 has 0 genuine + cycle 2 confirmation)', async (t) => {
  const runDir = freshTmpDir('refine-int');
  t.after(() => fs.rmSync(runDir, { recursive: true, force: true }));

  // Cycle 1: 3 genuine findings
  await appendLedger(runDir, { cycle: 1, findings_genuine: 3, /* ... */ ended_via: null });
  // Cycle 2: 0 findings (forces confirmation)
  await appendLedger(runDir, { cycle: 2, findings_genuine: 0, /* ... */ ended_via: null });
  // Cycle 3: confirmation cycle, also 0
  await appendLedger(runDir, { cycle: 3, findings_genuine: 0, /* ... */ ended_via: 'converged' });

  const ledger = await readLedger(runDir);
  assert.strictEqual(ledger.length, 3);
  assert.strictEqual(ledger[2].ended_via, 'converged');
  assert.strictEqual(detectOscillation(ledger), false);
});

test('auto-refine: oscillation path', async (t) => { /* … */ });
test('auto-refine: interrupt mid-loop', async (t) => { /* … */ });
test('auto-refine: soft-cap-stopped at cycle 5', async (t) => { /* … */ });
```

**Skip-on-missing-tool pattern** (copy from `tests/create-integration.test.js:16-23`) — not needed here since we mock heavy steps, but pattern is available if later expanded:
```javascript
const SOFFICE = (() => { try { execSync('command -v soffice', { stdio: 'ignore' }); return true; } catch { return false; } })();
```

---

## Shared Patterns

### File header convention
**Source:** `skills/create/scripts/lib/enum-lint.js:1-6`, `skills/review/scripts/lib/schema-validator.js:1-5`
**Apply to:** Both NEW lib files.
```javascript
'use strict';
// <filename> — <one-line purpose>. <Phase decision references>.
// <Constraints: pure / hand-rolled / no fs / etc.>
```

### Hand-rolled validation
**Source:** `skills/review/scripts/lib/schema-validator.js` (entire file)
**Apply to:** `loop-primitives.js` ledger-entry validation, `tests/refine-ledger-schema.test.js`.
Project rule (research SUMMARY): no ajv/joi/zod. Throw pinpoint `Error` with shape `field: detail (got X)`.

### `node:test` + `node:assert/strict` test layout
**Source:** `tests/findings-schema.test.js`, `tests/create-render-rationale.test.js`
**Apply to:** All 4 NEW test files.
```javascript
const test = require('node:test');
const assert = require('node:assert/strict');
test('feature group', async (t) => {
  await t.test('specific behavior', () => { /* ... */ });
});
```

### Tmpdir + cleanup pattern
**Source:** `tests/review-pipeline.test.js:19, 36-40`
**Apply to:** `loop-primitives.test.js`, `auto-refine-integration.test.js`.

### Path safety (CLAUDE.md locked invariant)
**Source:** `skills/create/scripts/index.js:30-35` (`pluginDataNodeModules` — no hardcoded `/Users/`).
**Apply to:** All Phase 5 code. `loop-primitives.js` accepts `runDir` as argument; never resolves to absolute paths outside the plugin tree. `tools/lint-paths.sh` will fail CI on any hardcoded path.

### `_test_set*` override hook for heavy subprocess stubs
**Source:** `skills/review/scripts/index.js:55-56` (`_test_setRunAnnotate`), `skills/create/scripts/index.js:116-117` (`_test_setSpawn`).
**Apply to:** If Phase 5 ends up needing a script-side runner (e.g., a thin `runRefineCycle` helper for testability), add `_test_setRunReview` / `_test_setRunCreate` override on the create side. Per D-01 the loop is agent-owned, so this may not be needed — but the pattern is available.

### Schema-version policy
**Source:** `skills/review/scripts/lib/schema-validator.js:18-24`
**Apply to:** `refine-ledger.jsonl` entries — recommend adding `schema_version: '1.0'` to each ledger line (small extra field, future-proofs the format). Match the `1.x` regex tolerance pattern.

---

## No Analog Found

| File / Concern | Reason | Planner Guidance |
|---|---|---|
| Slide-image SHA diff (`slidesChangedSinceLastCycle`) | No prior slide-image-comparison code in repo | Q-2 in CONTEXT.md flags JPG byte-SHA may be unreliable. Implementation: use `crypto.createHash('sha1')` on JPG bytes; if a smoke test in `loop-primitives.test.js` shows non-determinism, fall back to PNG (lossless). No external dep needed. |
| AskUserQuestion soft-cap UX (D-05) | Agent-only primitive; no script-side analog | Lives entirely in `skills/create/SKILL.md` Auto-Refine Loop step 6. Standalone-mode fallback (Q-5) — default to "B accept" with a `console.warn`-style printed warning, parallel to `warnings.push(...)` pattern in `skills/create/scripts/index.js:177, 189, 191`. |
| `findings.triaged.json` per cycle (D-08, Q-4) | New artifact shape | Pure JSON write via `fsp.writeFile` mirroring `runReview` line 86 pattern. Location: `<run-dir>/cycle-N/findings.triaged.json`; raw reviewer output goes to `<run-dir>/cycle-N/findings.json`. Two-files-per-cycle confirmed acceptable in CONTEXT.md Q-4. |

---

## Metadata

**Analog search scope:** `skills/create/scripts/lib/`, `skills/review/scripts/lib/`, `skills/review/scripts/`, `tests/`, `skills/create/SKILL.md`
**Files scanned:** 10 (sized via `wc -l`); 6 fully read; 4 sampled for header/imports.
**Project skills checked:** None present (`.claude/skills/` and `.agents/skills/` absent in repo).
**CLAUDE.md compliance:** All patterns respect locked invariants — pptxgenjs 4.0.1 pin (untouched), `annotate.js` SHA-pinned (untouched), no reaches outside plugin tree, content-vs-design boundary preserved (Phase 5 consumes `/review` only), severity 4-tier preserved at producer (no collapse in `slidesToReview` filter).
**Pattern extraction date:** 2026-04-28
