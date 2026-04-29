---
phase: 09
plan: 09-04
subsystem: skills/create
tags: [brief-polymorphism, normalizer, cli, extractor-di, dv-06, dv-07]
requirements: [DV-06, DV-07]
dependency-graph:
  requires: [skills/create/scripts/index.js, skills/create/scripts/cli.js, tests/helpers/llm-mock.js]
  provides:
    - skills/create/scripts/lib/brief-normalizer.js
    - skills/create/scripts/lib/extract-doc.js
  affects:
    - skills/create/scripts/index.js
    - skills/create/scripts/cli.js
tech-stack:
  added: []
  patterns: [extractor-DI-hook, shape-detection, mutual-exclusion-flag-group]
key-files:
  created:
    - skills/create/scripts/lib/brief-normalizer.js
    - skills/create/scripts/lib/extract-doc.js
    - tests/lib-brief-normalizer.test.js
    - tests/lib-extract-doc.test.js
    - tests/cli-create-polymorphic-brief.test.js
  modified:
    - skills/create/scripts/index.js
    - skills/create/scripts/cli.js
decisions:
  - "Detection rule: any plain object that is not a files-shape is treated as 'json' so legacy validateBrief continues to catch structural problems."
  - "Default extractor uses an LLM DI hook (_test_setLlm) mirroring Phase 8's contract — no new central llm.js carrier was introduced."
  - "extract-doc uses system Poppler (pdftotext) and unzip — no new npm dependencies."
metrics:
  duration: 50m
  completed: 2026-04-29
commits:
  - 74bd2d7 feat(09-04): add brief-normalizer with shape detection + extractor DI
  - 44080dd feat(09-04): add extract-doc.js for pdf/docx/txt/md/transcript
  - c387538 feat(09-04): add polymorphic brief CLI flags + mutual exclusion
  - f976ae4 feat(09-04): wire normalizeBrief into runCreate + finalize coverage
---

# Phase 9 Plan 9-04: Brief Normalizer + Polymorphic Intake Summary

Polymorphic brief intake: runCreate now accepts JSON, markdown, raw text,
or attached files (pdf/docx/txt/md/transcript) — markdown / raw / files
flow through an LLM-extractor DI hook into the canonical brief shape, while
JSON inputs pass through byte-identical to preserve the legacy contract.

## What landed

**`skills/create/scripts/lib/brief-normalizer.js` (NEW)** — exports
`normalizeBrief`, `detectBriefShape`, `_test_setExtractor`, `_test_setLlm`.
Detection: `{files:[...]}` or `[{path,type}]` → `'files'`; any other plain
object → `'json'`; string starting with `# ` → `'markdown'`; everything else
→ `'raw'`. JSON passthrough also tolerates legacy aliases (`title`→`topic`,
`key_messages`→`narrative_arc`). Non-json shapes call the injected extractor;
default extractor concatenates extract-doc output for files shape and feeds
the prompt to the LLM stub.

**`skills/create/scripts/lib/extract-doc.js` (NEW)** — `extractDocText({path,type})`
supports txt/md/transcript (UTF-8 passthrough), docx (`unzip -p` +
`<w:t>` regex strip), pdf (`pdftotext -layout`). All errors prefixed
`extract-doc:` for clean fingerprinting; pdf falls back to a clear
"pdf extraction unavailable" message when pdftotext is missing.

**`skills/create/scripts/cli.js` (MODIFIED)** — three new flags:
`--brief-text <raw>`, `--brief-md <path>`, `--brief-files <a,b,c>`.
Legacy `--brief <path.json>` unchanged. Mutual exclusion exits with code 2
+ stderr `cli: brief flags are mutually exclusive`. Type inference:
`.pdf`→pdf, `.docx`→docx, `.md`→md, `.txt|.transcript`→transcript;
unknown extension exits 2.

**`skills/create/scripts/index.js` (MODIFIED)** — `runCreate` calls
`brief = await normalizeBrief(brief)` before `validateBrief(brief)`. JSON
shape is byte-identical for the existing 909+ tests.

## Tests

| File                                          | Cases | Status |
| --------------------------------------------- | ----- | ------ |
| `tests/lib-brief-normalizer.test.js`          | 22    | green  |
| `tests/lib-extract-doc.test.js`               | 15    | green  |
| `tests/cli-create-polymorphic-brief.test.js`  | 22    | green  |

All 4 detection paths exercised. Extractor DI verified with stub injection.
Mutual-exclusion exit-code 2 verified via subprocess. Coverage: 100% c8 on
both new lib files.

## Verification

- `npm test`: 989 tests, 954 pass, 11 fail
- All 11 failures are PRE-EXISTING Phase 9-02 cookbook-recipe issues
  (`renderTitle is not defined`, etc.) documented in
  `.planning/phases/09-design-variety-and-brief-polymorphism/deferred-items.md`
  and confirmed by stash-and-rerun against base commit.
- Plan 9-04 introduces zero new failures.
- 100% c8 line/branch/statement coverage on every Plan 9-04 module
  (`brief-normalizer.js`, `extract-doc.js`, `cli.js`, `index.js`).

## Acceptance

- DV-06 satisfied: brief-normalizer accepts the 4 shapes and produces the
  canonical brief consumed by `validateBrief` / `runCreate`.
- DV-07 satisfied: runCreate is polymorphic; CLI exposes all 4 shapes with
  mutual-exclusion enforcement.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] Detection rule for partial JSON objects**
- **Found during:** Task 4 wiring
- **Issue:** Plan's literal must_have ("topic AND audience-or-narrative_arc-or-key_claims → json") classified `{topic:'x'}` as `'raw'`, sending the existing `create-runtime.test.js` invalid-brief test to the extractor (no LLM configured) instead of `validateBrief` (which it expected).
- **Fix:** Detection rule: any plain object that is not a files-shape → `'json'`. validateBrief downstream owns structural validation. This preserves byte-identical behavior for every legacy caller (objects always saw validateBrief errors, never an extractor surprise).
- **Files modified:** `skills/create/scripts/lib/brief-normalizer.js`
- **Commit:** f976ae4

### Auth gates

None.

## Deferred Issues

See `.planning/phases/09-design-variety-and-brief-polymorphism/deferred-items.md`
for the 11 pre-existing Phase 9-02 cookbook-recipe failures (out of scope).

## Self-Check: PASSED

Verified files exist:
- `skills/create/scripts/lib/brief-normalizer.js` — FOUND
- `skills/create/scripts/lib/extract-doc.js` — FOUND
- `tests/lib-brief-normalizer.test.js` — FOUND
- `tests/lib-extract-doc.test.js` — FOUND
- `tests/cli-create-polymorphic-brief.test.js` — FOUND

Verified commits exist:
- 74bd2d7 — FOUND
- 44080dd — FOUND
- c387538 — FOUND
- f976ae4 — FOUND
