---
phase: 02-instadecks-annotate
plan: 03
subsystem: annotate-runtime
tags: [orchestrator, cli, soffice, pdf-conversion, run-dir, sibling-output]
requires: [02-01-SUMMARY, 02-02-SUMMARY, pptxgenjs-4.0.1, soffice]
provides:
  - skills/annotate/scripts/index.js (runAnnotate + generateRunId + resolveSiblingOutputs)
  - skills/annotate/scripts/cli.js (mode 755 standalone wrapper)
  - tests/annotate-runtime.test.js (12 subtests)
affects: [phase-03-review-pipeline]
tech-stack:
  added: [node:child_process.execFile, node:crypto]
  patterns: [hermetic-run-dir, copy-annotate-symlink-samples, monkey-patched-stdout]
key-files:
  created:
    - skills/annotate/scripts/index.js
    - skills/annotate/scripts/cli.js
    - tests/annotate-runtime.test.js
  modified: []
decisions:
  - annotate.js is COPIED (not symlinked) into work/ so __dirname resolves to the run-dir; samples.js is SYMLINKED so realpath returns the cached skill module (preserves the live setSamples binding)
  - Slide-image symlink basename is v8s-NN.jpg (matches verbatim annotate.js line 417), not slide-NN.jpg as the plan text proposed — the verbatim asset takes precedence per CLAUDE.md
  - annotate.js's "✓ Written: …" console.log is rerouted to stderr inside runAnnotate so CLI stdout stays pure JSON for pipelined consumers
metrics:
  duration: ~25 min
  completed: 2026-04-28
  tasks_completed: 2
  subtests: 12
requirements: [ANNO-01, ANNO-07, ANNO-08, ANNO-09, ANNO-10]
---

# Phase 2 Plan 03: runAnnotate Orchestrator + CLI + Integration Tests Summary

**One-liner:** Wire the verbatim annotate.js into a public `runAnnotate({deckPath, findings, outDir?, runId?})` entry point and a thin CLI wrapper, with hermetic run-dir staging, soffice PDF conversion, and sibling-of-input output mirroring — all covered by 12 integration subtests against the v8 reference deck.

## Confirmed runAnnotate signature

```js
async function runAnnotate({ deckPath, findings, outDir, runId } = {}) → {
  pptxPath: string,    // sibling-of-input, .annotated.pptx
  pdfPath:  string,    // sibling-of-input, .annotated.pdf
  runDir:   string,    // .planning/instadecks/<runId>/ (or caller-supplied)
  runId:    string,    // YYYYMMDD-HHMMSS-<6hex>
  pptxRun:  string,    // <runDir>/work/Annotations_Sample.pptx
  pdfRun:   string,    // <runDir>/Annotations_Sample.pdf
}
```

## Observed run-id sample

`20260428-063317-685164` — matches `/^\d{8}-\d{6}-[0-9a-f]{6}$/`.

## Sibling-of-input examples

| deckPath | pptxPath | pdfPath |
|----------|----------|---------|
| `/tmp/x/foo.pptx` | `/tmp/x/foo.annotated.pptx` | `/tmp/x/foo.annotated.pdf` |
| `/tmp/x/foo.annotated.pptx` | `/tmp/x/foo.annotated.pptx` (P-05: no double-suffix) | `/tmp/x/foo.annotated.pdf` |

## Run-dir layout snapshot (after pipelined call)

```
<runDir>/
├── findings.json                 # copy of resolved input
├── Annotations_Sample.pdf        # produced by soffice
└── work/
    ├── annotate.js               # COPY of skills/annotate/scripts/annotate.js
    ├── samples.js                # SYMLINK → ../../../skills/annotate/scripts/samples.js
    ├── v8s-07.jpg, v8s-08.jpg, v8s-09.jpg  # SYMLINKs into tests/fixtures/v8-reference/
    └── Annotations_Sample.pptx   # written by annotate.js's verbatim main()
```

## Host environment & test results

- soffice: `/opt/homebrew/bin/soffice` — present.
- All 12 subtests of `tests/annotate-runtime.test.js`: **pass 12, fail 0, skip 0** (~25.5 s total).
  - 4 pure subtests (input validation, run-id format, P-05 path resolution).
  - 7 integration subtests exercising the full pipeline: pipelined-mode, CLI-mode, sibling naming, silent-overwrite re-run, P-05 double-suffix avoidance, run-dir archive layout.
  - 1 CLI subtest (missing-args → exit 2 with "Usage:" on stderr).
- Full repo test suite (`find tests -maxdepth 2 -name '*.test.js' | xargs node --test`): **73 tests, pass 72, skip 1, fail 0** (the skip is the Phase 2 Tier 2 visual-regression placeholder, expected).
- `node tools/validate-manifest.js`: `Manifest OK`.
- `node tools/assert-pptxgenjs-pin.js`: `pptxgenjs pin OK: 4.0.1`.
- `bash tools/lint-paths.sh`: pre-existing failure on `skills/annotate/scripts/annotate.js:2` (verbatim banner with `lint-allow:hardcoded-path` token). Confirmed not introduced by this plan via `git stash` round-trip — fix is out of scope here. Logged as deferred.

## Soffice invocation

`soffice --headless -env:UserInstallation=file:///tmp/lo-${SESSION_ID}-${PID} --convert-to pdf --outdir <outDir> <pptxRun>` — 60 s timeout (D-08), via `execFile` (no shell — T-02-05 mitigation).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] Slide-image symlink basename corrected from `slide-NN.jpg` → `v8s-NN.jpg`**
- **Found during:** Task 1 smoke test — pptxgenjs threw `ENOENT … v8s-07.jpg` at slide-image embed time.
- **Issue:** The plan's locked snippet (Order of Operations step 8) said symlink `work/slide-NN.jpg → tests/fixtures/v8-reference/v8s-NN.jpg`. But verbatim `annotate.js` line 417 reads `path.join(__dirname, 'v8s-' + padded + '.jpg')`. annotate.js is a locked invariant per CLAUDE.md; it is the verbatim asset that determines runtime behaviour. The plan text's `slide-NN.jpg` naming would never have been opened.
- **Fix:** Symlink basename uses `v8s-${padded}.jpg` — matches what annotate.js loads. P-06 case/format assertion still applies to the target. Test 5 (`integration: pipelined mode`) asserts `work/v8s-07.jpg` exists.
- **Files modified:** `skills/annotate/scripts/index.js` (the in-line comment names this deviation explicitly).
- **Commit:** `e811878`.

**2. [Rule 1 — Bug] annotate.js COPIED into work/, not symlinked**
- **Found during:** Task 1 design review (before first run).
- **Issue:** Plan said "symlink work/annotate.js → skills/annotate/scripts/annotate.js" but Node's default module resolution calls realpath on script paths, so `__dirname` for a symlinked script resolves to the link **target's** directory (the skill scripts dir), not the link **location** (work/). That breaks the run-dir archive contract: annotate.js's `path.join(__dirname, 'Annotations_Sample.pptx')` (line 475) would write into the skill tree, and `path.join(__dirname, 'v8s-NN.jpg')` (line 417) would look in the skill tree.
- **Fix:** `annotate.js` is `fsp.copyFile`'d into work/ (a fresh copy per run) so `__dirname` resolves to work/ at runtime. `samples.js` remains a symlink — Node's realpath here is *desirable* because it returns the cached skill module instance, preserving the live `setSamples` binding the orchestrator just wrote. Both behaviours documented in inline comments above `prepareWork`.
- **Commit:** `e811878`.

**3. [Rule 2 — Critical] CLI stdout pollution by annotate.js console.log**
- **Found during:** Task 2 first integration-test run — `integration: CLI mode equivalence` failed with `SyntaxError: Unexpected token '✓', "✓ Written:"…`.
- **Issue:** Verbatim annotate.js prints `✓ Written: <path>` to stdout (line 476). cli.js prints `JSON.stringify(result)` to stdout. Concatenated stdout is no longer parseable JSON, breaking the ANNO-09 contract that downstream consumers (Phase 3 `/review` pipelined invocation) parse cli stdout.
- **Fix:** Inside `runAnnotate`, monkey-patch `console.log` to forward to `console.error` for the duration of the verbatim require + main()-completion poll, then restore. annotate.js itself stays untouched (locked invariant).
- **Commit:** `00a2ea3`.

No other deviations. Order-of-operations 1–15 honoured; PPTXGENJS_PATH set before require; soffice invocation flag verbatim per D-08; sibling-output policy verbatim per D-03/D-04/P-05.

## Deferred Issues

| Issue | Owner | Why deferred |
|-------|-------|--------------|
| `bash tools/lint-paths.sh` flags annotate.js banner line 2 (`/Users/shafqat/...` with `lint-allow:hardcoded-path` comment) | Pre-existing — out of scope for Wave 2 | Confirmed via `git stash` round-trip that the failure precedes this plan; the `lint-allow` token suggests the lint script's allowlist parsing has a bug. File a follow-up issue to fix `tools/lint-paths.sh` to honour the `lint-allow:hardcoded-path` marker. |

## Commits

- `e811878` feat(02-03): implement runAnnotate orchestrator (D-06 entry point)
- `00a2ea3` feat(02-03): add runAnnotate CLI + integration tests for both invocation modes

## Self-Check: PASSED

- `[ -f skills/annotate/scripts/index.js ]` → FOUND
- `[ -f skills/annotate/scripts/cli.js ]` → FOUND (mode 755)
- `[ -f tests/annotate-runtime.test.js ]` → FOUND
- `git log --oneline | grep e811878` → FOUND
- `git log --oneline | grep 00a2ea3` → FOUND
- `node --test tests/annotate-runtime.test.js` → 12/12 pass
