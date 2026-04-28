---
phase: 04-instadecks-create-scaffold
plan: 03
status: complete
completed: 2026-04-28
requirements: [CRT-01, CRT-02, CRT-03, CRT-06, CRT-15]
artifacts:
  created:
    - skills/create/scripts/index.js
    - skills/create/scripts/cli.js
    - tools/lint-pptxgenjs-enums.js
    - tests/create-runtime.test.js
    - tests/create-cli.test.js
    - tests/create-enum-lint-cli.test.js
  modified:
    - package.json
    - skills/create/references/cookbook.md
    - skills/create/references/cookbook/section.md
    - skills/create/references/cookbook/quote.md
    - skills/create/references/cookbook/comparison.md
    - skills/create/references/cookbook/closing.md
    - skills/create/scripts/lib/enum-lint.js
commits:
  - c419698: feat(04-03) runCreate orchestrator + runtime tests
  - 9ffb710: feat(04-03) cli.js + lint-pptxgenjs-enums CI gate (CRT-15 Layer 1)
---

# Phase 4 Plan 03: /instadecks:create orchestrator + CLI + CI lint gate — SUMMARY

Wave-2 backbone shipped: `runCreate({brief, runId, outDir, mode, designChoices})` composes Plan 04-01 libs into a single-cycle pipeline (validate brief → enum-lint cjs → spawn node → xmllint → soffice PDF → assemble rationale → return); `cli.js` is the thin argv shell; `tools/lint-pptxgenjs-enums.js` is the CI-grade Layer-1 ENUM gate. 16 new subtests (9 runtime + 3 CLI + 4 lint-CLI), all green; 55 total Phase-4 subtests across 9 test files.

## Module Surface

### `skills/create/scripts/index.js`

```js
module.exports = { runCreate, generateRunId, resolveOutDir, _test_setSpawn };
```

`runCreate({brief, runId, outDir, mode, designChoices})` returns `{deckPath, pdfPath, rationalePath, runDir, runId, slidesCount, warnings}`. Mirrors Phase 3 `runReview` shape per D-08 — Phase 5 auto-refine can call per cycle without restructuring.

### `skills/create/scripts/cli.js`

Thin argv parser. Required `--brief <path>`; optional `--run-id`, `--out-dir`, `--mode`. Exit ladder: 0 happy path, 1 missing args, 2 unreadable brief, 3 runtime error.

### `tools/lint-pptxgenjs-enums.js`

CI-grade Layer-1 gate (D-05). Walks `skills/` + `tests/fixtures/` for `/addShape\s*\(\s*['"]\w+['"]/` string-literal shape names. Exits 1 with `file:line` on first violation; exit 0 on clean. Per-line `enum-lint-allow` marker exempts documentation lines that show DON'T anti-patterns. File-level allow-list: `tests/fixtures/bad-render-deck.cjs` (negative fixture) + `skills/annotate/scripts/annotate.js` (SHA-pinned binary asset per CLAUDE.md).

## Pipeline Order (locked, runCreate)

1. `validateBrief(brief)` — D-01 / CRT-01 — throws on bad input before any IO.
2. `runId = runId || generateRunId()`.
3. `outDir = resolveOutDir(outDir, runId)` → `mkdir({recursive:true})`.
4. Read agent-authored `render-deck.cjs` from `outDir`.
5. `lintCjs(cjsSrc)` — D-05 Layer 2 / CRT-15 — throws BEFORE spawn.
6. `spawnNode(cjsPath, {cwd:outDir, env:{...env, NODE_PATH:pluginDataNodeModules()}})` — P-07.
7. Assert `deck.pptx` exists + non-zero size.
8. `xmllintOoxml(deckPath)` — soft on missing tool (P-08), throw on schema break.
9. `soffice2pdf(deckPath, outDir)` — soft on missing tool, populate `pdfPath` or `null`.
10. `countSlides(deckPath)` via `unzip -l`.
11. If `designChoices`, write `renderRationale({brief, designChoices})` to `design-rationale.md`; else agent writes (skipped here).
12. Build result; if `mode==='standalone'`, `console.log(JSON.stringify(result, null, 2))`.
13. Return result.

## warnings[] Contract (for SKILL.md / Plan 04-04)

`warnings[]` is the soft-fail surface — runCreate degrades gracefully on missing optional tooling. SKILL.md (Plan 04-04) MUST instruct the agent to surface these to the user.

| Warning shape | Trigger | Effect |
|---|---|---|
| `xmllint missing — OOXML sanity check skipped (P-08)` | xmllint not in PATH or sh ENOENT | OOXML schema check skipped; PPTX kept |
| `soffice missing — PDF conversion skipped` | soffice not in PATH | `pdfPath = null` in result |
| `soffice failed: <reason>` | soffice ran but errored / produced non-PDF | `pdfPath = null`, error reason in warning |

## Missing-Tool Fallback Semantics

- **xmllint** — soft fail. Detection regex matches "not found", "command not found", and ENOENT (when sh itself can't be resolved). Critical because dev hosts without `libxml2` would otherwise block development.
- **soffice** — soft fail. Detection: ENOENT, "not found". PDF generation is optional; PPTX is the canonical output.
- **unzip** — present on all supported platforms (macOS, Linux); not soft-failed. If absent, `slidesCount === 0`.
- **node + render-deck.cjs** — hard fail. cjs missing or spawn errors throw.
- **enum-lint** — hard fail. Always blocks before spawn (Layer 2 of D-05).

## Test Counts

| Test file | Subtests |
|-----------|----------|
| tests/create-runtime.test.js | 9 |
| tests/create-cli.test.js | 3 |
| tests/create-enum-lint-cli.test.js | 4 |
| **New in Plan 04-03** | **16** |
| Plan 04-01 + 04-02 carryover | 39 |
| **Total Phase 4 so far** | **55** |

All green (`node --test` 6.3s total).

## D-05 Three-Layer Gate Status

| Layer | Mechanism | Status after Plan 04-03 |
|---|---|---|
| 1 — CI static lint | `tools/lint-pptxgenjs-enums.js` + `npm run lint:enums` | ✅ ARMED |
| 2 — Generation-time guard | `lib/enum-lint.lintCjs` invoked by `runCreate` BEFORE spawn | ✅ ARMED |
| 3 — Real-PowerPoint open | Manual checklist (Phase 7) | Deferred to Phase 7 |

## Deviations from Plan

**[Rule 3 — Blocking issue] Per-line `enum-lint-allow` marker added to lint tool**

- **Found during:** Task 2 verify (`production tree → exit 0`).
- **Issue:** The plan's "walk skills/ + tests/fixtures/" mandate scanned cookbook DON'T tables (which legitimately contain `addShape('rect', …)` as anti-pattern documentation per Plan 04-02 SUMMARY note) AND `skills/annotate/scripts/annotate.js` (which has `addShape('rect', …)` at line 348 — but it's the SHA-pinned binary asset locked by CLAUDE.md and CANNOT be modified).
- **Fix:** Two-track allow mechanism:
  1. **Per-line marker** — extended the linter to skip lines containing `enum-lint-allow`. Added inline markers (`<!-- enum-lint-allow: anti-pattern doc -->` for markdown, `// enum-lint-allow: regex-doc` for JS) to the 6 documentation lines that legitimately reference banned forms (cookbook.md ×2, cookbook/section.md, cookbook/quote.md, cookbook/comparison.md, cookbook/closing.md, lib/enum-lint.js banner).
  2. **File-level allow-list** — added `skills/annotate/scripts/annotate.js` to `ALLOW` set with rationale comment ("SHA-pinned binary asset per CLAUDE.md locked invariants — cannot be modified to add inline allow-markers").
- **CLAUDE.md compliance:** annotate.js NOT modified. The locked-invariant ban on editing annotate.js is honored — only the lint tool itself was extended to recognize this exemption. The exemption is documented inline in `tools/lint-pptxgenjs-enums.js` so future maintainers see the rationale.
- **Files modified:** tools/lint-pptxgenjs-enums.js + 6 documentation files (markers only; no semantic change).
- **Commit:** 9ffb710.

No other deviations.

## Auth Gates

None.

## Integration-Test Handoff to Plan 04-04

Plan 04-04 will:
- Author `skills/create/SKILL.md` body wiring the agent-facing flow (input ingestion → DeckBrief → cookbook composition → render-deck.cjs authorship → call `runCreate(mode:'standalone')`).
- Author `tests/create-integration.test.js` end-to-end: validateBrief → runCreate(structured) → assert `deck.pptx` magic bytes (PK\\x03\\x04), assert all 6 D-07 section headers present in `design-rationale.md`, assert `notesSlide` entries present (P-10) per slide, run `xmllint --noout` outside the harness as a final gate.
- Wire `npm run lint:enums` into `npm test` chain alongside `lint:paths` and `validate:manifest`.
- Author `tests/POWERPOINT-COMPATIBILITY.md` (Phase 7 manual gate / D-05 Layer 3).
- NOTICE attribution for design-ideas inspiration ("inspired by public design literature") per Plan 04-02 deferral.

## Verification

- `node --test tests/create-runtime.test.js tests/create-cli.test.js tests/create-enum-lint-cli.test.js` → 16/16 pass. ✅
- `node tools/lint-pptxgenjs-enums.js` → 38 files clean, exit 0. ✅
- `npm run lint:enums --silent` → exit 0. ✅
- `bash tools/lint-paths.sh` → green. ✅
- `node -e "JSON.parse(require('fs').readFileSync('package.json'))"` → parses. ✅
- Full Phase 4 suite (9 test files) → 55/55 pass. ✅
- 2 atomic commits (`c419698`, `9ffb710`). ✅

## Self-Check: PASSED

- skills/create/scripts/index.js — FOUND.
- skills/create/scripts/cli.js — FOUND.
- tools/lint-pptxgenjs-enums.js — FOUND.
- tests/create-runtime.test.js — FOUND.
- tests/create-cli.test.js — FOUND.
- tests/create-enum-lint-cli.test.js — FOUND.
- Commit c419698 — FOUND in `git log --oneline`.
- Commit 9ffb710 — FOUND in `git log --oneline`.
- 4 module exports of index.js (`runCreate`, `generateRunId`, `resolveOutDir`, `_test_setSpawn`) — all functions.
- D-05 Layers 1+2 both armed.
