---
phase: 05-instadecks-create-auto-refine
verified: 2026-04-28T23:55:00Z
status: human_needed
score: 5/5 must-haves verified (automated); 1 manual smoke-gate pending
overrides_applied: 0
re_verification: null
human_verification:
  - test: "Plan 05-04 Phase 5 close-gate smoke test — real end-to-end auto-refine run"
    expected: "All 8 bundle artifacts present and non-empty under /tmp/instadecks-smoke-05-04 (deck.pptx, deck.pdf, design-rationale.md, findings.json, deck.annotated.pptx, deck.annotated.pdf, refine-ledger.jsonl, render-deck.cjs); deck.pptx opens cleanly in Microsoft PowerPoint and Keynote; refine-ledger.jsonl shows ≤5 cycles ending with ended_via ∈ {converged, soft-cap-accepted}"
    why_human: "Requires soffice + pdftoppm + ANTHROPIC_API_KEY and a real Claude Code session driving the agent-owned loop (D-01); cannot be exercised in CI per Q-3 — automated coverage is the mocked-cycle integration test, but the SC#5 PowerPoint compatibility carry-over from Phase 4 needs visual confirmation in real PowerPoint."
deferred: []
---

# Phase 5: `/instadecks:create` Auto-Refine Loop — Verification Report

**Phase Goal:** Auto-refine loop in `/instadecks:create` calling `/review` internally each cycle, parsing findings, regenerating fixes for `genuine == true && category == defect`, converging to zero genuine findings (with cycle ≥ 2 confirmation, soft cap at 5 with user override, oscillation detection, issue ledger, user interrupt, diff-only review after cycle 1) — producing the full artifact bundle (deck + PDF + design rationale + JSON findings + annotated PPTX + annotated PDF) in a single invocation.

**Verified:** 2026-04-28T23:55:00Z
**Status:** human_needed (all automated must-haves PASS; one manual smoke-gate per Plan 05-04 plan section "Manual smoke test (Phase 5 close gate)" remains)

---

## Goal Achievement — Observable Truths (ROADMAP SC#1..SC#5)

| # | Truth (ROADMAP SC) | Status | Evidence |
|---|---|---|---|
| SC#1 | Loop converges cleanly: `genuine_findings == 0 AND cycle ≥ 2` exits with final deck; rationale updated with non-genuine; cycle 1 = 0 forces confirmation | ✓ VERIFIED | `tests/auto-refine-integration.test.js` Scenario 1 (clean converge after confirmation, [3-gen, 0, 0] → ended_via='converged') + Scenario 2 (cycle-1-clean forces confirmation, both cycles review_mode='full' per D-07). SKILL.md §Auto-Refine Loop step 14 + playbook step 11. SKILL.md `design-rationale.md` rewritten with reviewerNotes from ledger (line 223). |
| SC#2 | Oscillation detected (per D-09 strict hash equality, supersedes ⊆ prose) → loop stops, surfaces ledger, asks user | ✓ VERIFIED | `oscillation.js` line 7 implements D-09 verbatim (`hashN === hashN-2 AND findings_genuine_N > 0`). `tests/oscillation.test.js` 8 subtests including shrinking-but-hash-matches. `tests/auto-refine-integration.test.js` Scenario 3 asserts hash[0]===hash[2], detectOscillation=true, ended_via='oscillation'. |
| SC#3 | Soft cap at cycle 5 surfaces "continue / accept / specify what to fix" without hardcoded limit | ✓ VERIFIED | SKILL.md line 77 (`Soft-cap check: if cycle >= 5 AND not converged → AskUserQuestion`). `cli.js` `resolveSoftCap`/`parseSoftCapFlag`/`isInteractive` exports + `--soft-cap=<accept\|stop\|continue>` flag. `tests/create-cli-soft-cap.test.js` + Scenario 5 (CI=1 → accept fallback per Q-5/D-05). |
| SC#4 | User interrupt via `.planning/instadecks/<run-id>/.interrupt` causes next cycle iteration to exit cleanly at top-of-cycle; per-cycle ledger persisted; cycle 1 full / cycle 2+ diff-only | ✓ VERIFIED | `loop-primitives.js` `checkInterrupt` line 51 (sync `fs.existsSync`). SKILL.md §Auto-Refine Loop step 1 = top-of-cycle check (D-04). `tests/auto-refine-integration.test.js` Scenario 4 (.interrupt at cycle 2 → ended_via='interrupted', cycle-1 deck byte-intact). Ledger schema in `tests/refine-ledger-schema.test.js` (8 leaf assertions). `slidesChangedSinceLastCycle` returns null on cycle ≤ 1, sorted int[] otherwise (CRT-12). |
| SC#5 | Default-pipeline mode produces deck + PDF + design-rationale + JSON findings + annotated PPTX + annotated PDF as single bundle; bundled deck still passes Phase-4 PowerPoint compat gate | ✓ VERIFIED (auto) / ⚠ HUMAN (PowerPoint compat) | SKILL.md lines 175-187 specify the 8-artifact run-dir layout; line 225 invokes `runAnnotate` on final findings. `auto-refine-integration.test.js` Scenario 1 asserts all 8 bundle artifacts exist under runDir. PowerPoint compatibility carry-over from Phase 4 SC#4 — deck format unchanged by loop, but real PowerPoint smoke covered by human-verification entry. |

**Score:** 5/5 truths verified at the automated level. SC#5's PowerPoint-open-cleanly half is carried over from Phase 4 SC#4 and exercised in the manual smoke gate.

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `skills/create/scripts/lib/loop-primitives.js` | 6 exports: appendLedger, readLedger, checkInterrupt, hashIssueSet, slideImagesSha, slidesChangedSinceLastCycle | ✓ VERIFIED | 113 lines; all 6 exports confirmed at lines 109-112; tested by 14 subtests in `tests/loop-primitives.test.js` |
| `skills/create/scripts/lib/oscillation.js` | `detectOscillation(ledger)` per D-09 strict hash equality | ✓ VERIFIED | 19 lines; D-09 implementation at line 7-19; 8 oscillation tests pass |
| `skills/create/SKILL.md` `## Auto-Refine Loop` section | Numbered cycle pseudocode, soft-cap prompt, 8-artifact bundle | ✓ VERIFIED | Lines 166-237: header at 166, primitive call order at 195, run-dir 8-artifact layout at 175-187, AskUserQuestion soft-cap at 77-section, post-loop runAnnotate at 225, See-also playbook ref at 239 |
| `skills/create/references/auto-refine-playbook.md` | Numbered pseudocode (steps 1-14), worked example, slidesToReview decision tree, D-09 oscillation rationale | ✓ VERIFIED | 145 lines; step 1=checkInterrupt (D-04), step 13=soft-cap check, worked example at line 90+ |
| `skills/review/scripts/index.js` `slidesToReview` param | NON-BREAKING additive filter; null\|'all'\|int[] | ✓ VERIFIED | filterSlides helper at line 61-74; param at line 97; insertion after validate() at line 109; pinpoint-error throws on float/negative/non-array string. 8 subtests in `tests/slides-to-review.test.js` pass |
| `skills/review/references/findings-triaged-schema.md` | 7 sections: purpose / location / schema delta / stable-ID rule / example / ledger cross-ref / out-of-scope | ✓ VERIFIED | 113 lines; documents `id`, `genuine`, `triage_rationale` additive fields per D-08/Q-4 |
| `tests/auto-refine-integration.test.js` | 5-scenario mocked-cycle test covering CRT-07..14 | ✓ VERIFIED | 380 lines; 5 named scenarios mapping to CRTs as planned; full repo run = 256 pass / 2 skip / 0 fail in 73.4s |
| `tests/refine-ledger-schema.test.js` | Ledger schema validation (cycle, issue_set_hash, ended_via enum) | ✓ VERIFIED | 88 lines; 8 leaf assertions pass |
| `tests/oscillation.test.js` | D-09 hash-equality + shrinking-but-matches false-positive guard | ✓ VERIFIED | 75 lines; 8 subtests pass |
| `tests/loop-primitives.test.js` | 14 subtests across all 6 primitive exports | ✓ VERIFIED | 184 lines; all green |
| `tests/slides-to-review.test.js` | NON-BREAKING regression + filter behavior + reject paths | ✓ VERIFIED | 138 lines; 8 subtests pass |
| `tests/create-cli-soft-cap.test.js` | CLI soft-cap flag parsing + non-interactive fallback | ✓ VERIFIED | 77 lines; covers isInteractive / parseSoftCapFlag / resolveSoftCap |
| `skills/create/scripts/cli.js` `--soft-cap=<accept\|stop\|continue>` + `isInteractive`/`resolveSoftCap`/`parseSoftCapFlag` | Q-5 standalone fallback per D-05 | ✓ VERIFIED | 4 module exports at line 104; CI=1/NON_INTERACTIVE=1/!isTTY → 'accept' with stderr warning |
| `skills/create/scripts/index.js` `_test_setRunReview` / `_test_setRunCreate` override hooks | Phase-3 precedent symmetry for future loop-driver test surfaces | ✓ VERIFIED | Lines 127-128 setters; lines 237-238 exports |
| `skills/create/scripts/lib/render-rationale.js` Reviewer-Notes population | D-06 reviewerNotes from ledger (Phase-4 placeholder retired) | ✓ VERIFIED | Commit 51e0186 retired Phase-4 placeholder; SKILL.md line 223 invokes |

---

## Requirements Coverage (CRT-07..CRT-14)

| Req | Description | Status | Evidence |
|---|---|---|---|
| CRT-07 | Loop runs until convergence; invokes /review internally; regenerates fixes for `genuine && defect` | ✓ SATISFIED | SKILL.md §Auto-Refine Loop + Scenario 1 |
| CRT-08 | Convergence: `genuine == 0 AND cycle ≥ 2`; cycle-1=0 → confirmation cycle | ✓ SATISFIED | Scenario 2 + D-07 forced-full-review at cycle 2; SKILL.md step 14 |
| CRT-09 | Soft cap at cycle 5: continue / accept / specify | ✓ SATISFIED | SKILL.md soft-cap step + cli.js soft-cap helpers + Scenario 5 |
| CRT-10 | Oscillation detection (D-09 supersedes ⊆ prose) | ✓ SATISFIED | oscillation.js + Scenario 3 + 8 oscillation tests |
| CRT-11 | `.interrupt` flag at top-of-cycle; clean exit | ✓ SATISFIED | checkInterrupt + Scenario 4 (deck byte-intact post-interrupt) |
| CRT-12 | Cycle 1 = full review; cycle 2+ = diff-only | ✓ SATISFIED | runReview slidesToReview param (NON-BREAKING) + slidesChangedSinceLastCycle returns null on cycle ≤ 1 |
| CRT-13 | Per-cycle JSONL ledger; previous ledger consulted to avoid re-fixing skipped | ✓ SATISFIED | refine-ledger schema test + skipped_finding_ids/fixed_finding_ids fields; SKILL.md "Skipped IDs are accumulated in the ledger and excluded from future fix lists" line 195 |
| CRT-14 | Pipelines /annotate by default → 8-artifact bundle | ✓ SATISFIED | SKILL.md lines 175-187 + 225 + Scenario 1 8-artifact assertion |

All 8 CRTs mapped to concrete code + test evidence. No orphaned requirements.

---

## Key Link Verification

| From | To | Via | Status |
|---|---|---|---|
| SKILL.md `## Auto-Refine Loop` | `loop-primitives.js` (6 primitives) | Step-by-step pseudocode invoking each primitive by name | WIRED |
| SKILL.md cycle pseudocode | `runReview({slidesToReview})` | D-03 diff-only review param | WIRED (verified slidesToReview param in skills/review/scripts/index.js line 97) |
| SKILL.md post-loop step | `runAnnotate({deckPath, findings})` | D-06 8-artifact bundle | WIRED (line 225) |
| `auto-refine-integration.test.js` | Real `loop-primitives.js` exports + simulateCycle harness | Composed via SKILL.md call order | WIRED |
| Soft-cap CLI flag | `resolveSoftCap` non-interactive fallback | --soft-cap=<accept\|stop\|continue> + Q-5 | WIRED |

---

## Anti-Patterns Found

None. Path lint + enum lint both green per Plan 05-04 SUMMARY (256 pass / 2 skip / 0 fail; tools/lint-paths.sh green; npm run lint:enums clean across 42 files). Phase-4 placeholder text in render-rationale was retired in commit 51e0186 (Plan 05-03).

---

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Full test suite | `npm test` | 258 tests, 256 pass / 2 skip (pre-existing Phase-2 Tier-2) / 0 fail in 73.4s | ✓ PASS |
| loop-primitives exports | `node -e "console.log(Object.keys(require('./skills/create/scripts/lib/loop-primitives.js')))"` | All 6 exports present (verified via grep) | ✓ PASS |
| oscillation export | grep `module.exports = { detectOscillation }` | Present at line 19 | ✓ PASS |
| CLI soft-cap exports | grep `module.exports = { isInteractive, parseSoftCapFlag, resolveSoftCap, parseArgs }` | Present at cli.js line 104 | ✓ PASS |

---

## Human Verification Required

### 1. Phase 5 close-gate smoke test (Plan 05-04 manual section)

**Test:**
```bash
node skills/create/scripts/cli.js \
  --brief tests/fixtures/sample-brief.json \
  --run-id smoke-05-04 \
  --out-dir /tmp/instadecks-smoke-05-04 \
  --mode standalone
```

After agent drives auto-refine to convergence (or soft-cap accept):

```bash
ls /tmp/instadecks-smoke-05-04/
```

**Expected:** All 8 artifacts present and non-empty: `deck.pptx, deck.pdf, design-rationale.md, findings.json, deck.annotated.pptx, deck.annotated.pdf, refine-ledger.jsonl, render-deck.cjs`. `deck.pptx` opens cleanly in real Microsoft PowerPoint (Mac and/or Windows) and Keynote. `refine-ledger.jsonl` shows ≤5 cycles with `ended_via ∈ {converged, soft-cap-accepted}`.

**Why human:** Requires soffice + pdftoppm + ANTHROPIC_API_KEY and a real Claude Code session driving the agent-owned loop (per D-01 the loop is agent-prose, not script). Plan 05-04 plan section "Manual smoke test (Phase 5 close gate, not in CI)" explicitly designates this as a manual gate. Automated coverage is the mocked-cycle integration test (Q-3); real PowerPoint compatibility (SC#5 carry-over from Phase 4 SC#4) cannot be machine-verified.

---

## Gaps Summary

No automated gaps. Phase 5 ships:
- 6-export `loop-primitives.js` + 1-export `oscillation.js` with D-09 strict hash equality (supersedes ROADMAP SC#2 / CRT-10 imprecise ⊆ prose; reconciled in CONTEXT D-09).
- `runReview` extended with `slidesToReview` filter (NON-BREAKING; 56/56 Phase-3 regression tests still green).
- SKILL.md `## Auto-Refine Loop` + 145-line `auto-refine-playbook.md` with full numbered pseudocode, worked example, and decision trees.
- 5-scenario mocked-cycle integration test covering CRT-07..14 in ~420 ms total.
- CLI `--soft-cap` flag + non-interactive (CI/!TTY) fallback per Q-5 / D-05.
- 256 pass / 2 skip / 0 fail across whole repo; lint-paths green; enum-lint clean.

Single remaining item: Plan 05-04's explicitly-designated manual close-gate smoke test, which validates SC#5's PowerPoint-compat carry-over from Phase 4 in a real Claude Code + soffice + ANTHROPIC_API_KEY environment.

---

_Verified: 2026-04-28T23:55:00Z_
_Verifier: Claude (gsd-verifier)_
