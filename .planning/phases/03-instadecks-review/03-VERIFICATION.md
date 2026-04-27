---
phase: 03-instadecks-review
verified: 2026-04-28T08:35:00Z
status: human_needed
score: 4/4 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Activation rate ≥ 8/10 for `/instadecks:review` across canonical prompt panel"
    expected: "Skill activates on at least 8 of 10 natural-language prompts asking for design review"
    why_human: "Requires Claude Code agent dispatcher panel testing; SKILL.md notes Phase 7 DIST-02 finalizes the activation panel — this is a deferred completion item"
  - test: "Default-pipeline behavior interpretation (ROADMAP SC #4 vs D-03)"
    expected: "Confirm intentional design decision: pipeline is gated by --annotate (D-03) rather than default-on as worded in ROADMAP SC #4"
    why_human: "Plans correctly follow D-03 (latest decision); ROADMAP wording is stale. Needs PM/architect confirmation that D-03 supersedes the ROADMAP SC #4 wording"
  - test: "End-to-end soffice run on a real PPTX"
    expected: "scripts/pptx-to-images.sh produces N JPGs at 150 DPI for a multi-slide deck without race conditions across concurrent invocations"
    why_human: "Test suite skip-guards on absent soffice; only behavioral spot-check via unit tests was run. Real-world concurrent invocation behavior under load needs hands-on confirmation"
deferred:
  - truth: "Activation rate ≥ 8/10"
    addressed_in: "Phase 7"
    evidence: "SKILL.md and Plan 03-05 explicitly note 'Phase 7 DIST-02 finalizes the ≥8/10 activation panel'"
---

# Phase 3: `/instadecks:review` Verification Report

**Phase Goal:** A `/instadecks:review` skill that bundles DECK-VDA 4-pass methodology, 4-tier severity grammar, finding grammar, exhaustive §1/§3/§4/§5 reporting, R18 AI-tell detection, emits findings JSON in the locked schema, and pipelines into `/annotate` (gated per D-03) — with the soffice race condition definitively fixed.
**Verified:** 2026-04-28T08:35:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (mapped to ROADMAP Success Criteria)

| # | Truth (ROADMAP SC) | Status | Evidence |
|---|--------------------|--------|----------|
| 1 | User invokes `/instadecks:review` against a deck and receives JSON sidecar in locked schema + Markdown report (DECK-VDA §1/§3/§4/§5) | ✓ VERIFIED | `runReview` writes `<deck>.review.json` (schema-validated) + `<deck>.review.md` (deterministic render-fixed). Snapshot test passes byte-for-byte. SKILL.md canonicalizes DECK-VDA §1–§5 + maturity rubric |
| 2 | R18 AI-tell detection (accent lines, default blue, identical layouts) with `genuine`, `category`, `nx`/`ny`, `rationale` per Phase 1 schema | ✓ VERIFIED | `ai-tells.js` exports 3 deterministic heuristics: detectDefaultBluePalette, detectAccentLineUnderTitle, detectIdenticalLayouts. All emit `r18_ai_tell:true`, `category:'style'`, `genuine:true`, with `nx/ny` and rationale. Positive/negative fixtures and per-heuristic isolation tests pass |
| 3 | `pptx-to-images.sh` race-condition-free: per-call `-env:UserInstallation`, post-soffice existence/size/magic checks, 60s timeout + 1 retry, EXIT/INT/TERM cleanup trap | ✓ VERIFIED | Script lines 41–44 (SESSION_ID + LO_PROFILE + trap), 51–63 (timeout 60 soffice with 1 retry), 66–79 (file/size/%PDF magic), 83–88 (pdftoppm timeout + retry), 99–111 (per-JPG magic+size). Tests pass with skip-guards on absent soffice |
| 4 | Three invocation modes: pipelined-with-`--annotate`, standalone, structured-handoff | ✓ VERIFIED (with deviation, see below) | `runReview` mode in {standalone, structured-handoff}; `annotate` flag gates lazy-required `runAnnotate`. CLI exposes `--annotate`. SKILL.md documents all three modes |

**Score:** 4/4 truths verified

**Deviation note (Truth #4):** ROADMAP SC #4 says "Default pipeline-into-`/annotate` mode produces deck + JSON + Markdown + annotated PPTX + annotated PDF in a single invocation." Plans correctly follow D-03 which gates the pipeline behind `--annotate` (default = standalone, 3 outputs). This is a documented design decision evolution; the implementation faithfully follows D-03. Routed to human verification for confirmation.

### Required Artifacts (22 total)

| Artifact | Status | Notes |
|----------|--------|-------|
| `scripts/pptx-to-images.sh` | ✓ VERIFIED | 113 lines, hardening verbatim per RVW-09/10/11; executable bit set |
| `tools/build-tiny-deck-fixture.js` | ✓ VERIFIED | Generates committed `tiny-deck.pptx` |
| `tests/fixtures/tiny-deck.pptx` | ✓ VERIFIED | 44KB |
| `tests/pptx-to-images.test.js` | ✓ VERIFIED | Skip-guards on missing soffice; 4 cases |
| `skills/review/scripts/index.js` | ✓ VERIFIED | `runReview` exports + `_test_setRunAnnotate`; lazy require for runAnnotate |
| `skills/review/scripts/cli.js` | ✓ VERIFIED | Thin shell over runReview standalone |
| `skills/review/scripts/lib/schema-validator.js` | ✓ VERIFIED | Hand-rolled, rejects 3-tier collapse + non-1.x schema |
| `skills/review/scripts/lib/read-deck-xml.js` | ✓ VERIFIED | JSZip + 100MB cap |
| `skills/review/scripts/ai-tells.js` | ✓ VERIFIED | 3 heuristics; correct finding shape |
| `skills/review/scripts/render-fixed.js` | ✓ VERIFIED | 235 lines pure function; snapshot test green |
| `tools/build-ai-tells-fixtures.js` | ✓ VERIFIED | |
| `tests/fixtures/ai-tells-positive.pptx` / `-negative.pptx` | ✓ VERIFIED | |
| `tests/fixtures/sample-findings.fixed.md` | ✓ VERIFIED | 67 lines snapshot baseline |
| `tests/review-{runtime,pipeline,schema-emission,ai-tells,render-fixed,integration}.test.js` | ✓ VERIFIED | All passing |
| `skills/review/SKILL.md` | ✓ VERIFIED | 207 lines; DECK-VDA canonicalized, fuzzy R18 block, severity-collapse boundary, content-vs-design boundary, --annotate gating, structured-handoff documented |
| `NOTICE` | ✓ VERIFIED | DECK-VDA attribution paragraph present (lines 38–44); jszip listed; no upstream files vendored claim |
| `package.json` jszip devDep | ✓ VERIFIED | `"jszip": "3.10.1"` present |

### Key Link Verification

| From | To | Via | Status |
|------|-----|-----|--------|
| `tests/pptx-to-images.test.js` | `scripts/pptx-to-images.sh` | spawnSync bash | ✓ WIRED |
| `runReview` (index.js) | `runAnnotate` (annotate/scripts) | lazy require inside `if(annotate)` branch (line 104) | ✓ WIRED |
| `runReview` | `render-fixed.render` | `require('./render-fixed')` at line 91 | ✓ WIRED |
| `runReview` | `schema-validator.validate` | top-level require + invocation at line 73 | ✓ WIRED |
| `ai-tells.js` | `lib/read-deck-xml.loadSlides` | top-level require + invocation | ✓ WIRED |
| `cli.js` | `runReview` | require('./index') + invocation | ✓ WIRED |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full Phase 3 test suite passes | `node --test tests/{pptx-to-images,review-*}.test.js` | 55 tests pass, 0 fail, 0 skip | ✓ PASS |
| `runReview` validates findings (RVW-04) | runtime test | pass | ✓ PASS |
| Schema rejects 3-tier collapse (P-01 guard) | review-schema-emission | pass | ✓ PASS |
| `runReview` produces sibling JSON+MD + run-dir mirror (RVW-05) | runtime test | pass | ✓ PASS |
| Standalone prints stdout; structured-handoff returns object (RVW-07/08) | runtime test | pass | ✓ PASS |
| `runAnnotate` lazy-required only when `annotate:true` (P-07) | review-pipeline | pass | ✓ PASS |
| 3 R18 heuristics fire on positive fixture, 0 on negative | review-ai-tells | pass | ✓ PASS |
| Fixed-template snapshot byte-deterministic | review-render-fixed | pass | ✓ PASS |

### Requirements Coverage

| Req | Plan | Description | Status | Evidence |
|-----|------|-------------|--------|----------|
| RVW-01 | 03-05 | Skill activates on natural-language design-review prompts | ? NEEDS HUMAN | SKILL.md frontmatter pattern landed; ≥8/10 measurement deferred to Phase 7 DIST-02 |
| RVW-02 | 03-04, 03-05 | DECK-VDA §1/§3/§4/§5 fixed-template emission | ✓ SATISFIED | render-fixed.js + snapshot |
| RVW-03 | 03-03, 03-05 | R18 AI-tell detection (3 deterministic + fuzzy LLM) | ✓ SATISFIED | ai-tells.js + SKILL.md fuzzy block |
| RVW-04 | 03-02 | Schema validation pinpoint errors | ✓ SATISFIED | schema-validator.js + tests |
| RVW-05 | 03-02, 03-04, 03-05 | Sibling JSON + MD + run-dir mirror | ✓ SATISFIED | runReview + tests |
| RVW-06 | 03-02, 03-05 | --annotate pipeline | ✓ SATISFIED | runReview if(annotate) branch |
| RVW-07 | 03-02, 03-05 | Standalone CLI mode | ✓ SATISFIED | cli.js + tests |
| RVW-08 | 03-02, 03-05 | Structured-handoff mode | ✓ SATISFIED | runReview return shape |
| RVW-09 | 03-01 | Per-call -env:UserInstallation, no race | ✓ SATISFIED | pptx-to-images.sh L41-53 |
| RVW-10 | 03-01 | Post-call existence/size/magic checks | ✓ SATISFIED | L66-79, L99-111 |
| RVW-11 | 03-01 | Cleanup trap on EXIT/INT/TERM | ✓ SATISFIED | L44 |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `skills/review/scripts/index.js` | 90 | Comment says "stub here" | ℹ Info | Misleading-but-accurate stale comment; `render-fixed.js` is real (235 LOC, snapshot-tested). No code is stubbed. Recommend updating comment in a future cosmetic pass |
| `skills/review/scripts/render-fixed.js` | 4 | Comment says "Replaces the Plan 03-02 stub" | ℹ Info | Historical reference, no functional issue |

No blockers, no warnings. No TODO/FIXME/placeholder/empty-impl matches in production code.

### Lint / Path-Hardcoding

Pre-existing fix (commit 7029796): `lint-paths.sh` honors `// lint-allow:hardcoded-path` markers. No hardcoded `/Users/`, `~/.claude/`, `/home/`, `C:\` found in Phase 3 production code. All paths via `${CLAUDE_PLUGIN_ROOT}` / `process.cwd()` / fixture paths.

### Notable Deviations Evaluated

- **D-01 (DECK-VDA canonicalized, not vendored):** ✓ NOTICE attribution paragraph present (lines 38–44); SKILL.md re-expresses methodology in original prose ("canonicalized here as first-class authored content"). Not a byte-for-byte copy of upstream deck-design-review skill.
- **D-03 (--annotate gating vs ROADMAP SC #4 default-pipeline):** ⚠ Documented design decision; plans correctly follow D-03. Surfaced for human confirmation in `human_verification` (item 2).
- **D-06 (two reports — fixed-template + LLM narrative):** ✓ render-fixed.js emits fixed template; SKILL.md instructs agent to author `<deck>.review.narrative.md` post-runReview. `narrativePath` returned in result object.
- **D-07 (`pptx-to-images.sh` plugin-level shared):** ✓ Located at `scripts/pptx-to-images.sh` (plugin-level), not under `skills/review/`.

### Human Verification Required

1. **Activation rate ≥ 8/10** — formal panel deferred to Phase 7 DIST-02 (per SKILL.md and Plan 03-05). Confirm acceptance of deferral.
2. **D-03 vs ROADMAP SC #4 reconciliation** — confirm `--annotate` gating supersedes ROADMAP wording.
3. **Real-world soffice run** — run `pptx-to-images.sh` on a real multi-slide PPTX with concurrent invocations to confirm no race condition under load (unit tests skip-guard when soffice absent in CI).

### Gaps Summary

No structural gaps. All 22 expected artifacts exist, all 4 ROADMAP success criteria are programmatically verified, all 11 requirements (RVW-01..RVW-11) are satisfied at the code level, all 6 key wiring links are intact, and the entire 55-test Phase 3 suite passes. Status is `human_needed` (not `passed`) only because three items genuinely need human judgment: activation-panel measurement (deferred to Phase 7 by design), reconciling the ROADMAP SC #4 wording with the D-03 design decision, and a hands-on multi-slide soffice run under concurrency.

---

_Verified: 2026-04-28T08:35:00Z_
_Verifier: Claude (gsd-verifier)_
