---
phase: 02-instadecks-annotate
plan: 04
subsystem: annotate-visual-regression
tags: [visual-regression, normalized-sha, skill-md, phase-gate]
requires: [02-01-SUMMARY, 02-02-SUMMARY, 02-03-SUMMARY, pptxgenjs-4.0.1, soffice, jszip]
provides:
  - tests/annotate-visual-regression.test.js (Tier 1 normalized-SHA + Tier 2 pixelmatch skip-guarded)
  - tools/normalize-pptx-sha.js (shared normalizer module)
  - tests/fixtures/v8-reference/Annotations_Sample.pptx.normalized.sha256 (pinned baseline)
  - skills/annotate/scripts/index.js _runAnnotateWithRawSamples test-only export
  - skills/annotate/SKILL.md full Phase 2 playbook body
affects: [phase-03-review-pipeline, phase-07-marketplace-release]
tech-stack:
  added: [jszip-as-test-utility]
  patterns: [structural-xml-normalization, deterministic-sha-via-canonical-concat, shared-normalizer-module]
key-files:
  created:
    - tests/annotate-visual-regression.test.js
    - tools/normalize-pptx-sha.js
    - tests/fixtures/v8-reference/Annotations_Sample.pptx.normalized.sha256
  modified:
    - skills/annotate/scripts/index.js
    - skills/annotate/SKILL.md
decisions:
  - "Tier 1 redefined as structural-XML normalized SHA (not byte-identical SHA) — pptxgenjs 4.0.1 writes wall-clock <dcterms:created>/<dcterms:modified> timestamps and absolute filesystem paths into descr=\"...\" attributes on every generation, making byte-equivalence architecturally infeasible. Normalizer strips both before hashing. User-approved Option A under Rule 4 escalation."
  - "Normalizer extracted to tools/normalize-pptx-sha.js (shared module) so the test and any future baseline-regeneration tool agree byte-for-byte on the locked rules."
  - "Original tests/fixtures/v8-reference/Annotations_Sample.pptx.sha256 (committed-binary self-check) preserved untouched. New baseline lives at Annotations_Sample.pptx.normalized.sha256 — distinct file, distinct purpose."
  - "_runAnnotateWithRawSamples is a test-only export prefixed with `_` to signal non-public. Bypasses adapter so v8 author-curated SAMPLES inject verbatim. Threat T-02-08 (validation bypass) accepted because no public CLI surfaces this entry point."
metrics:
  duration: ~50 min (incl. checkpoint adjudication)
  completed: 2026-04-28
  tasks_completed: 2
  subtests: 2 (Tier 1 PASS, Tier 2 skip)
requirements: [ANNO-01, ANNO-11]
---

# Phase 2 Plan 04: Visual-Regression + SKILL.md Final Body Summary

Closes Phase 2 by locking the v8 visual-regression contract as automated assertions (Tier 1 normalized-XML SHA + Tier 2 pixelmatch skip-guarded) and replacing the Phase 1 SKILL.md skeleton with the full agent-facing playbook for `/instadecks:annotate`.

## What shipped

**Task 1 — Visual regression test (commit `315ae15`)**
- `skills/annotate/scripts/index.js`: added `_runAnnotateWithRawSamples({deckPath, samples, outDir, runId})` test-only export that runs the same pipeline as `runAnnotate` but skips the adapter so v8 author-curated SAMPLES can be injected verbatim per RESEARCH §A1.
- `tools/normalize-pptx-sha.js`: shared structural-XML normalizer (jszip-based; strips `<dcterms:created>`/`<dcterms:modified>` and collapses absolute paths in `descr="..."` to basenames before SHA-256 over a sorted canonical concatenation).
- `tests/annotate-visual-regression.test.js`:
  - Tier 1 `regenerated annotated PPTX normalized SHA matches v8 baseline` — PASS on dev host (soffice 26.2.2.2 present). Skip-guards on `soffice` availability.
  - Tier 2 `per-slide pixelmatch < 0.5% diff` — `t.skip('Tier 2 deferred — see ci.yml RESERVED block (Phase 7 RVW-09..11 unblocks)')`.
- `tests/fixtures/v8-reference/Annotations_Sample.pptx.normalized.sha256`: new pinned baseline `17e050f56ac749a3da6a455995351ff35282a34525ab5364b9beb0beb7fbff5b` (regenerated and verified deterministic across two consecutive runs on the dev host before commit).

**Task 2 — SKILL.md full body (commit `f798729`)**
- `skills/annotate/SKILL.md`: frontmatter preserved verbatim from Phase 1 (`name: annotate`, single-line imperative description, `user-invocable: true`, `version: 0.1.0`). H1 unchanged. Body replaced from "scaffold — full playbook lands in Phase 2" to a complete playbook with sections: When to invoke, Inputs, Outputs, Invocation modes (standalone CLI + pipelined `require()` per D-06), Adapter behaviour with the 4→3 severity-collapse table, Allowed tools, Environment, Deferred (Phase 7 DIST-02/03 + Phase 3 RVW-09..11 + Tier 2 pixelmatch activation).
- Manifest validator + manifest-validator.test.js: pass (frontmatter rules satisfied — single-line description scalar, imperative-verb start, ≤ 1024 chars).

## Verification

- `node --test tests/annotate-visual-regression.test.js`: **2 tests, 1 pass (Tier 1), 1 skip (Tier 2)** — exit 0.
- `find tests -maxdepth 2 -name '*.test.js' -print0 | xargs -0 node --test`: **75 tests, 73 pass, 2 skip, 0 fail** — exit 0.
- `node tools/validate-manifest.js`: `Manifest OK`.
- `node tools/assert-pptxgenjs-pin.js`: `pptxgenjs pin OK: 4.0.1`.
- `node --test tests/manifest-validator.test.js`: 8/8 pass.
- Determinism check: `normalizedShaOfPptx` produced identical SHA across two back-to-back regenerations before pinning the baseline.

## Tier 1 dev-host result

- **Status:** PASS
- **Expected (pinned):** `17e050f56ac749a3da6a455995351ff35282a34525ab5364b9beb0beb7fbff5b`
- **Actual (regenerated):** `17e050f56ac749a3da6a455995351ff35282a34525ab5364b9beb0beb7fbff5b`
- **Host:** macOS Darwin 25.3.0, soffice 26.2.2.2 (Homebrew), pdftoppm present, node ≥ 18.

## Deviations from Plan

### Architectural changes (Rule 4 — user-approved Option A)

**1. Tier 1 redefined as structural-XML normalized SHA, not byte-identical SHA**

- **Found during:** Task 1 — initial test execution
- **Issue:** The plan's premise (`tests/fixtures/v8-reference/Annotations_Sample.pptx.sha256` as a Tier 1 byte-identical regression target after pipeline regeneration) is architecturally infeasible.
  - First run produced expected `0d59236f520f766500aae69a615105595cd391d052b7a04c98a695a393695fa3` vs actual `4056511fa24b5ed693b0a6c85a09904219ce7f483e2edcada477c4f7c60711bb`.
  - Per the plan's mandatory escalation runbook (acceptance-criteria §"Tier 1 SHA-mismatch runbook"), did NOT silently rewrite the baseline. Captured both SHAs and the unzipped diff, escalated as BLOCKER, awaited user adjudication.
- **Root cause (forensic — confirmed by unzip-and-diff):** Both PPTX archives have identical structure, identical `[Content_Types].xml`, identical `_rels/.rels`, identical `app.xml`. Only **two** files differ, and both diffs are non-deterministic / environment-bound:
  1. `docProps/core.xml` — `<dcterms:created>` and `<dcterms:modified>` are wall-clock at generation time. pptxgenjs 4.0.1 writes `new Date().toISOString()` on every `writeFile()`. Baseline: `2026-04-27T11:30:21Z`. Regenerated: `2026-04-27T20:41:10Z`. Cannot be made byte-identical without freezing time.
  2. `ppt/slides/slide{1,2,3}.xml` — `<p:cNvPr id="3" name="Image 0" descr="...">` carries the **absolute filesystem path** of the source JPG at generation time. annotate.js line ~417 calls `path.join(__dirname, 'v8s-NN.jpg')` (locked invariant — cannot patch) and pptxgenjs serializes that absolute path verbatim into the slide XML. Baseline: `/Users/shafqat/Documents/Projects/Sourcevo/v5-blue-prestige/v8s-07.jpg`. Regenerated: `/private/var/folders/.../vr1-run-XXXXXX/work/v8s-07.jpg`. Cannot be made byte-identical without modifying annotate.js (forbidden by CLAUDE.md) or post-processing the PPTX.
- **`annotate.js` integrity ruled out:** SHA `186d881bbc200d695266ca5588a49c1a1a1dfc4ce70cc19563c1cfaf1050d545` matches `tests/fixtures/v8-reference/annotate.js.sha256` exactly (post-patch). annotate.js was NOT the source of drift.
- **Decision (user-approved Option A):** Redefine Tier 1 as a **structural-XML normalized SHA**:
  - Strip `<dcterms:created>` and `<dcterms:modified>` content (tags retained, body cleared).
  - Collapse `descr="..."` attribute values in `ppt/slides/slide*.xml` to basename only.
  - Sort entries by name and SHA-256 over a canonical concatenation (`tag\0name\0len(uint32 BE) + bytes\0`).
- **Implementation:** `tools/normalize-pptx-sha.js` (shared module) + new pinned baseline at `tests/fixtures/v8-reference/Annotations_Sample.pptx.normalized.sha256`. Original `Annotations_Sample.pptx.sha256` (Phase 1 committed-binary self-check) preserved untouched.
- **Files modified:** `skills/annotate/scripts/index.js`, `tests/annotate-visual-regression.test.js` (new), `tools/normalize-pptx-sha.js` (new), `tests/fixtures/v8-reference/Annotations_Sample.pptx.normalized.sha256` (new).
- **Commit:** `315ae15`.

## Deferred Items

| Category | Item | Status | Reason |
|---|---|---|---|
| Phase 7 (DIST-02/03) | SKILL.md description activation tuning ≥ 8/10 | Deferred | Phase 7 panel-tested tuning post-pipeline-completion |
| Phase 7 (RVW-09..11) | Tier 2 pixelmatch unblock + ci.yml RESERVED block soffice/pdftoppm install | Deferred | Plan-pinned activation gate |
| Phase 3 (RVW-09..11) | Full soffice hardening (file-existence/size checks, retry, /tmp/lo-* cleanup trap) | Deferred | Plan-scoped to next phase |
| v1.x | Stress-test fixtures (8 annotations / max overflow per slide) | Deferred | Pre-existing post-launch item (PROJECT.md) |
| v1.x | Windows path-detection in pptx-to-images.sh | Deferred | Pre-existing post-launch item (PROJECT.md) |
| Out-of-scope (pre-existing) | `tools/lint-paths.sh` flagging banner comment in `skills/annotate/scripts/annotate.js` despite `// lint-allow:hardcoded-path` marker | Deferred (pre-existing — confirmed via `git stash` test before my changes) | Honors CLAUDE.md "annotate.js is SHA-pinned binary asset" — fix belongs to a `tools/lint-paths.sh` enhancement task, not a Phase 2 plan |

## Threat Flags

None — no new security-relevant surface introduced. T-02-07 (description information disclosure) and T-02-08 (`_runAnnotateWithRawSamples` validation bypass) covered by plan threat model with `accept` disposition; SKILL.md description references public concepts only and `_runAnnotateWithRawSamples` is gated by `_` prefix + no public CLI surface.

## Self-Check: PASSED

Created files (all FOUND):
- `tests/annotate-visual-regression.test.js`: FOUND
- `tools/normalize-pptx-sha.js`: FOUND
- `tests/fixtures/v8-reference/Annotations_Sample.pptx.normalized.sha256`: FOUND
- `.planning/phases/02-instadecks-annotate/02-04-SUMMARY.md`: FOUND (this file)

Modified files (all confirmed):
- `skills/annotate/scripts/index.js` exports `_runAnnotateWithRawSamples`: FOUND
- `skills/annotate/SKILL.md` body replaced + frontmatter preserved verbatim: FOUND

Commits (all FOUND in `git log`):
- `315ae15` test(02-04): add visual-regression Tier 1 + Tier 2: FOUND
- `f798729` docs(02-04): replace SKILL.md body with full Phase 2 playbook: FOUND

Phase 2 phase gate: full test suite 73 pass / 2 skip / 0 fail; manifest validator OK; pptxgenjs pin OK.
