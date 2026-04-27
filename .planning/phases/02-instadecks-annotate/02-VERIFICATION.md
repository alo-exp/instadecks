---
phase: 02-instadecks-annotate
verified: 2026-04-27T20:57:56Z
status: human_needed
score: 6/6 must-haves verified (1 SC partially deferred per documented Plan 02-04 Rule 4 deviation; 2 SCs require human activation/PowerPoint testing)
overrides_applied: 1
overrides:
  - must_have: "Running the skill against tests/fixtures/sample-findings.json produces output that passes the visual regression baseline from Phase 1 (byte-identical PPTX or pixel-diff < 0.5%)"
    reason: "Plan 02-04 Rule 4 deviation (Option A approved by user): pptxgenjs 4.0.1 writes wall-clock timestamps and absolute paths into PPTX, making byte-identical SHA infeasible. Tier 1 redefined as structural-XML normalized SHA. New baseline Annotations_Sample.pptx.normalized.sha256 pinned and passing. Tier 2 pixelmatch is staged behind Phase 7 ci.yml RESERVED block per ANNO-11 plan."
    accepted_by: "shafqat"
    accepted_at: "2026-04-28T00:00:00Z"
human_verification:
  - test: "Activation rate ≥ 8/10 across canonical prompt panel for /instadecks:annotate"
    expected: "Claude reliably invokes /instadecks:annotate when given an annotation-shaped prompt at ≥ 8/10 success"
    why_human: "Activation testing requires running Claude Code interactively against a 10-prompt panel; Phase 7 (DIST-02) finalizes activation tuning per ROADMAP — Phase 2 ships the SKILL.md body and defers the panel run."
  - test: "Pipelined-from-/review mode (in-memory deck-spec handoff) end-to-end"
    expected: "When Phase 3 /review imports runAnnotate and passes findings in-memory, no JSON file roundtrip occurs and outputs land sibling-of-input"
    why_human: "Cannot exercise until /review ships in Phase 3. Phase 2 implements the runAnnotate({deckPath, findings}) entry point that supports this mode and adapter unit tests prove the in-memory contract works; the pipelined consumer does not yet exist."
  - test: "Tier 2 pixelmatch < 0.5% per-slide diff"
    expected: "Per-slide rendered JPGs from regenerated annotated PPTX vs v8 reference baselines diff < 0.5%"
    why_human: "Tier 2 deferred to Phase 7 per documented plan deviation (RVW-09..11 hardens soffice race + ci.yml RESERVED block unblocks). Test currently test.skip with documented message."
---

# Phase 2: /instadecks:annotate Verification Report

**Phase Goal:** A standalone-invocable `/instadecks:annotate` skill that consumes findings JSON in the locked schema and produces annotated PPTX + PDF overlays with parity to v8 BluePrestige reference output — proving the contract works end-to-end before any producer is built.

**Verified:** 2026-04-27T20:57:56Z
**Status:** human_needed (all programmatic verification PASS; activation panel + pipelined-mode + Tier 2 pixelmatch deferred per documented plans)
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User invokes `/instadecks:annotate` with findings JSON + deck path → annotated PPTX + PDF in run directory + sibling-of-input; activation ≥ 8/10 | ⚠ PARTIAL | `runAnnotate` + `cli.js` + sibling-output writing implemented and integration-tested (`tests/annotate-runtime.test.js` passing). SKILL.md full body shipped (4648 chars; description ≤ 1024 chars). Activation panel ≥ 8/10 deferred to Phase 7 per ANNO-01 note in REQUIREMENTS.md. |
| 2 | `annotate.js` bundled verbatim with VERBATIM banner, SHA-pinned, only modification is documented require-path patch (+ SAMPLES extraction per ANNO-04) | ✓ VERIFIED | `skills/annotate/scripts/annotate.js` SHA `186d881b...` matches `tests/fixtures/v8-reference/annotate.js.sha256` POST-PATCH baseline. `tests/annotate-integrity.test.js` passing. `require(process.env.PPTXGENJS_PATH \|\| 'pptxgenjs')` patch confirmed line 16; `const { SAMPLES } = require('./samples')` confirmed line 117. |
| 3 | JSON-to-SAMPLES adapter applies 4→3 severity collapse + `genuine === true` filter at adapter only; annotate.js sees only `'major'\|'minor'\|'polish'` | ✓ VERIFIED | `skills/annotate/scripts/adapter.js` defines `SEV_MAP={Critical:'major',Major:'major',Minor:'minor',Nitpick:'polish'}`, validates 10 required fields BEFORE filter (D-07), then `.filter(f.genuine===true).map({sev,nx,ny,text})`. `tests/annotate-adapter.test.js` passing. |
| 4 | Slide-image symlink approach (`slide-NN.jpg` → `v8s-NN.jpg`) lets annotate.js run without code changes | ✓ VERIFIED | `index.js` creates run-dir symlinks; integration test exercises real PPTX generation; 10 JPEG fixtures (`v8s-01..10.jpg`, all real `JPEG image data, JFIF standard 1.01`) staged in `tests/fixtures/v8-reference/`. |
| 5 | Running the skill against `tests/fixtures/sample-findings.json` produces output passing Phase 1 visual regression baseline (byte-identical PPTX or pixel-diff < 0.5%) | ✓ VERIFIED (override) | Tier 1: `tests/annotate-visual-regression.test.js` "Tier 1: regenerated annotated PPTX normalized SHA matches v8 baseline" PASSING (6.4s on dev host with soffice). Plan 02-04 Rule 4 deviation: structural-XML normalized SHA used (Option A user-approved) due to pptxgenjs wall-clock timestamps. Tier 2 pixelmatch staged behind Phase 7 RESERVED block. |
| 6 | Both standalone-invocable mode AND pipelined-from-/review mode work | ⚠ PARTIAL | Standalone CLI (`cli.js`) verified by integration test. In-memory entry point `runAnnotate({deckPath, findings, outDir, runId})` exported and invoked directly by visual-regression test (proves the in-memory contract). Pipelined consumer (/review) does not yet exist — full pipelined mode awaits Phase 3. |

**Score:** 4/6 fully verified, 2/6 partial (deferred to later phases per ROADMAP/REQUIREMENTS notes).

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `skills/annotate/scripts/annotate.js` | Verbatim + 2 authorized patches | ✓ VERIFIED | SHA matches POST-PATCH pin; banner present; require-path + SAMPLES patches confirmed |
| `skills/annotate/scripts/samples.js` | `setSamples` runtime override | ✓ VERIFIED | Exports `{ get SAMPLES, setSamples }` with mutable binding |
| `skills/annotate/scripts/adapter.js` | `adaptFindings` + `SEV_MAP` | ✓ VERIFIED | Validates → filters → collapses; exports both |
| `skills/annotate/scripts/index.js` | `runAnnotate` entry point | ✓ VERIFIED | Sets PPTXGENJS_PATH BEFORE require; calls `setSamples` BEFORE require('./annotate'); UserInstallation per call |
| `skills/annotate/scripts/cli.js` | Standalone CLI | ✓ VERIFIED | `process.argv` parser → `runAnnotate` |
| `skills/annotate/SKILL.md` | Full body, ≤ 1024 char description | ✓ VERIFIED | Frontmatter preserved; full playbook body (4648 bytes) |
| `tests/annotate-integrity.test.js` | SHA-pin integrity | ✓ PASSING | |
| `tests/annotate-adapter.test.js` | Adapter unit tests | ✓ PASSING | |
| `tests/annotate-runtime.test.js` | Integration tests | ✓ PASSING | |
| `tests/annotate-visual-regression.test.js` | Tier 1 + Tier 2 | ✓ PASSING (Tier 2 skip-guarded) | Tier 1 normalized SHA matches; Tier 2 deferred per plan |
| `tests/fixtures/v8-reference/v8s-{01..10}.jpg` | Real JPEG bytes | ✓ VERIFIED | All 10 confirmed `JPEG image data, JFIF standard 1.01` |
| `tests/fixtures/v8-reference/annotate.js.sha256` | POST-PATCH SHA | ✓ VERIFIED | Banner + SHA hash present |
| `tests/fixtures/v8-reference/Annotations_Sample.pptx.normalized.sha256` | New normalized baseline | ✓ VERIFIED | Generated and locked per Plan 02-04 deviation |

### Key Link Verification

| From | To | Via | Status |
|------|-----|-----|--------|
| `annotate.js` | `samples.js` | `require('./samples')` | ✓ WIRED (line 117) |
| `index.js` | `adapter.js` | `adaptFindings(findings)` | ✓ WIRED (line 13/131) |
| `index.js` | `samples.js` | `setSamples` BEFORE `require('./annotate')` | ✓ WIRED (line 14, 134, 147→153 cache-bust pattern) |
| `index.js` | `annotate.js` | `require(annotateEntry)` with PPTXGENJS_PATH preset | ✓ WIRED (line 39-41 sets env, line 153 requires) |
| `cli.js` | `index.js` | `require('./index').runAnnotate` | ✓ WIRED (line 8) |
| `annotate-integrity.test.js` | `annotate.js` + SHA file | `crypto.createHash('sha256')` compare | ✓ WIRED (test passing) |
| `annotate-visual-regression.test.js` | `runAnnotate` + v8 samples + normalized SHA | `setSamples(v8Samples)` + run + SHA compare | ✓ WIRED (test passing) |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| ANNO-01 | 02-03, 02-04 | `/instadecks:annotate` invocable with imperative description (≥8/10) | ⚠ PARTIAL | SKILL.md body shipped; activation panel deferred to Phase 7 per REQUIREMENTS note |
| ANNO-02 | 02-01 | Verbatim bundle + VERBATIM banner + SHA pin | ✓ SATISFIED | SHA-pin test passing |
| ANNO-03 | 02-01 | Single require-path patch only | ✓ SATISFIED | Confirmed line 16 + integrity test |
| ANNO-04 | 02-01 | SAMPLES extracted to samples.js | ✓ SATISFIED | Confirmed line 117 + samples.js shim |
| ANNO-05 | 02-02 | Adapter 4→3 severity collapse | ✓ SATISFIED | adapter.js + adapter test |
| ANNO-06 | 02-02 | Adapter filters genuine==true | ✓ SATISFIED | `.filter(f.genuine===true)` confirmed |
| ANNO-07 | 02-03 | Slide-image symlink approach | ✓ SATISFIED | index.js implementation + integration test |
| ANNO-08 | 02-03 | PPTX + PDF outputs to run dir + sibling | ✓ SATISFIED | runtime test asserts both |
| ANNO-09 | 02-03 | Standalone-invocable mode | ✓ SATISFIED | cli.js + spawnSync test |
| ANNO-10 | 02-03 | Pipelined invocation mode (in-memory) | ⚠ PARTIAL | runAnnotate exposes the in-memory entry; full pipelined consumer awaits Phase 3 /review |
| ANNO-11 | 02-04 | Visual regression byte-identical or pixel-diff < 0.5% | ✓ SATISFIED (override) | Tier 1 normalized SHA passing per Rule 4 deviation; Tier 2 deferred to Phase 7 per plan |

No orphaned requirements — all 11 ANNO requirements declared in plans and verified.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `skills/annotate/scripts/annotate.js` | 2 | Banner contains hardcoded `/Users/shafqat/...` source-of-truth path with `lint-allow:hardcoded-path` marker | ℹ Info | User-noted pre-existing: `tools/lint-paths.sh` flags it despite the marker — logged for future enhancement. NOT a runtime path; comment-only reference for provenance. Manifest `validate-manifest` test reports clean run; no functional impact. |

No blockers. No stub returns, no empty implementations, no placeholder TODOs in shipped code.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full test suite | `npm test` | 73 pass / 0 fail / 2 skipped (Tier 2 documented) | ✓ PASS |
| annotate.js SHA matches pin | `shasum -a 256 skills/annotate/scripts/annotate.js` | `186d881b...` matches baseline | ✓ PASS |
| JPEG fixtures are real JPEG | `file v8s-01.jpg v8s-10.jpg` | Both `JPEG image data, JFIF standard 1.01` | ✓ PASS |
| Tier 1 normalized SHA assertion | visual-regression test | Regenerated PPTX normalized SHA matches v8 baseline (6.4s on soffice host) | ✓ PASS |
| Adapter exports | `grep "module.exports" adapter.js` | Exports `adaptFindings` and `SEV_MAP` | ✓ PASS |

### Human Verification Required

#### 1. Activation panel ≥ 8/10 for `/instadecks:annotate`

**Test:** Run the canonical 10-prompt activation panel against the bundled SKILL.md description in Claude Code.
**Expected:** Claude invokes `/instadecks:annotate` for ≥ 8 of 10 annotation-shaped prompts.
**Why human:** Requires interactive Claude Code session against a fixed prompt panel. Phase 7 (DIST-02) finalizes activation tuning per ROADMAP — Phase 2 explicitly defers per ANNO-01 note in REQUIREMENTS.md (`Phase 7 DIST-02 finalizes activation tuning`).

#### 2. Pipelined mode end-to-end (with /review producer)

**Test:** Once Phase 3 /review ships, invoke /review on a deck and confirm in-memory pipeline to runAnnotate produces full deck + JSON + Markdown + annotated PPTX + annotated PDF without intermediate JSON file write.
**Expected:** Single invocation produces full artifact bundle; no JSON file roundtrip.
**Why human:** Producer (/review) does not yet exist. Phase 2 ships the runAnnotate consumer with the in-memory contract; full pipelined mode is a Phase 3 success criterion.

#### 3. Tier 2 pixelmatch < 0.5%

**Test:** Run `tests/annotate-visual-regression.test.js` Tier 2 subtest after Phase 7 unblocks the ci.yml RESERVED block + RVW-09..11 hardens soffice race.
**Expected:** Per-slide pixel-diff between regenerated annotated JPGs and v8 reference baselines is < 0.5%.
**Why human:** Test is currently `test.skip` with documented Phase 7 deferral message. Cannot run until soffice race hardening (RVW-09..11) and ci.yml RESERVED-block flag activate.

### Gaps Summary

No actionable gaps. All ROADMAP success criteria are either fully verified or explicitly deferred to later phases per documented plan deviations:

- **Plan 02-04 Rule 4 deviation (override applied):** Tier 1 SHA redefined as structural-XML normalized SHA. User approved Option A; new baseline pinned and passing. annotate.js stayed untouched (SHA-pinned invariant honored). pptxgenjs 4.0.1 writes wall-clock timestamps making byte-identical SHA infeasible.
- **Activation panel (ANNO-01):** Deferred to Phase 7 per REQUIREMENTS.md explicit note.
- **Tier 2 pixelmatch (ANNO-11):** Staged behind Phase 7 ci.yml RESERVED block per plan; test.skip with documented message.
- **Pipelined consumer (ANNO-10):** runAnnotate in-memory entry exported and tested directly; full /review pipeline awaits Phase 3.
- **Pre-existing issue (out of phase scope):** `tools/lint-paths.sh` flags annotate.js banner despite `lint-allow:hardcoded-path` marker — already user-noted and logged for future enhancement.

The phase delivered everything required by ROADMAP Phase 2 success criteria for the goal "proving the contract works end-to-end before any producer is built." Test suite: 73/73 passing (2 documented Tier 2 skips). The verbatim binary asset invariant is honored, the JSON contract works through the consumer, and visual regression is locked.

---

_Verified: 2026-04-27T20:57:56Z_
_Verifier: Claude (gsd-verifier)_
