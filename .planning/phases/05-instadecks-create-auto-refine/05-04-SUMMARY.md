---
phase: 05-instadecks-create-auto-refine
plan: 04
subsystem: skills/create — auto-refine verification ribbon + standalone CLI soft-cap
tags: [phase-5, auto-refine, integration-test, mocked-cycle, soft-cap, ci-fallback, oscillation, interrupt, convergence]
requires: [05-01, 05-02, 05-03]
provides: [verification-ribbon, soft-cap-cli-flag, test-override-hooks]
affects: [skills/create/scripts/cli.js, skills/create/scripts/index.js]
tech-stack:
  added: []  # zero new deps
  patterns: [_test_setRunReview / _test_setRunCreate override hooks, mocked-cycle integration test, isInteractive CI/TTY detection, --soft-cap=<accept|stop|continue> CLI flag]
key-files:
  created:
    - tests/auto-refine-integration.test.js
    - tests/create-cli-soft-cap.test.js
  modified:
    - skills/create/scripts/cli.js
    - skills/create/scripts/index.js
decisions:
  - "Mocked-cycle integration test (Q-3): no soffice / pdftoppm / LLM in CI; primitives composed via simulateCycle harness mirroring SKILL.md per-cycle pseudocode"
  - "Soft-cap fallback (D-05 / Q-5): CI=1 OR NON_INTERACTIVE=1 OR !isTTY → 'accept' with stderr warning; --soft-cap flag overrides"
  - "Test override hooks (Phase 3 precedent): _test_setRunReview / _test_setRunCreate exported from skills/create/scripts/index.js for symmetry; runCreate behavior unchanged"
metrics:
  duration: ~14 min
  completed: 2026-04-28
---

# Phase 5 Plan 04: Mocked-Cycle Integration Test + Standalone CLI Soft-Cap Summary

5-scenario mocked-cycle integration test (`tests/auto-refine-integration.test.js`, 22 subtests, ~420ms total) covers CRT-07..CRT-14 at the primitive-composition level; standalone CLI gains `--soft-cap=<accept|stop|continue>` flag with non-interactive (CI / NON_INTERACTIVE / !TTY) detection and the documented stderr fallback for cycle-5-unconverged runs.

## Scenario coverage (CRT-07..CRT-14)

| Scenario | Findings sequence | Cycles | Asserts | CRTs |
|---|---|---|---|---|
| 1. Clean converge after confirmation | [3-genuine, 0, 0] | 3 | ledger.length === 3; final `ended_via='converged'`; detectOscillation === false; **8 bundle artifacts exist** under runDir | CRT-07, CRT-08, CRT-14 |
| 2. Cycle-1-clean forces confirmation | [0, 0] | 2 | cycle 1 review_mode === 'full' AND cycle 2 review_mode === 'full' (D-07 forced); final `ended_via='converged'` | CRT-08, D-07 |
| 3. Oscillation at cycle 3 (D-09) | hash-A / hash-B / hash-A (each 3-genuine) | 3 | hash[0] === hash[2]; hash[1] differs; findings_genuine > 0; detectOscillation === true; final `ended_via='oscillation'` | CRT-09, D-09 |
| 4. Top-of-cycle interrupt (D-04) | [3-gen, .interrupt flag created, abort] | 1+1 | checkInterrupt === true; cycle 2 returns `interrupted: true`; final `ended_via='interrupted'`; cycle-1 deck.pptx byte-intact (no half-write) | CRT-11, D-04 |
| 5. Soft-cap CI fallback (Q-5) | [N-gen × 5] with CI=1 | 5 | resolveSoftCap(null) === 'accept'; stderr matches /non-interactive mode/ AND /cycle 5/; final `ended_via='soft-cap-accepted'` | CRT-10, Q-5 |

CRT-12 (per-cycle ledger) and CRT-13 (cycle 1 full / cycle 2+ diff-only) are exercised across all five scenarios via the real `appendLedger` / `readLedger` / `slidesChangedSinceLastCycle` calls inside `simulateCycle`.

## Test execution timings

| Scenario | Wall time |
|---|---|
| 1 — clean converge | ~50 ms |
| 2 — confirmation cycle | ~17 ms |
| 3 — oscillation | ~44 ms |
| 4 — interrupt | ~31 ms |
| 5 — soft-cap CI | ~58 ms |
| **Total** | **~420 ms** (well under <2s/scenario budget) |

Whole-repo regression: **256 pass / 2 skip / 0 fail** (`node --test tests/*.test.js`, ~97s). The 2 skipped tests are pre-existing Phase 2 Tier-2 pixel-diff suspensions (LibreOffice CI unavailability), unrelated to this plan.

## CLI helpers exported (cli.js)

| Helper | Behavior |
|---|---|
| `isInteractive()` | `false` if `CI=1` / `CI=true` / `NON_INTERACTIVE=1` / `!process.stdout.isTTY`; else `true` |
| `parseSoftCapFlag(argv)` | Returns `'accept'` \| `'stop'` \| `'continue'` if `--soft-cap=<v>` present; throws pinpoint error on invalid value; null if absent |
| `resolveSoftCap(softCapFlag)` | Flag wins; non-interactive → `'accept'` with `non-interactive mode → accepting current deck. Use --soft-cap=stop or interactive run for choice.` stderr warning; interactive standalone → `'accept'` with shorter warning |

CLI argv parser also recognizes `--soft-cap=<v>` and stores it in `args.softCap` (no behavior change to single-cycle CLI in v0.1.0; field reserved for future loop-driver integration).

## Override-hook export surface (index.js)

```js
let _runReviewOverride = null;
let _runCreateOverride = null;
function _test_setRunReview(fn) { _runReviewOverride = fn; }
function _test_setRunCreate(fn) { _runCreateOverride = fn; }
module.exports = { runCreate, ..., _test_setSpawn, _test_setRunReview, _test_setRunCreate };
```

`runCreate`'s behavior is unchanged. The hooks mirror Phase 3's `_test_setRunAnnotate` precedent (`skills/review/scripts/index.js:55-56`) so future loop-driver test surfaces have a uniform place to inject mocks. Per D-01 the auto-refine loop lives in SKILL.md, not in `runCreate`, so these hooks are export-surface only for v0.1.0.

## Deviations from plan

None — plan executed exactly as written.

## Manual smoke test (Phase 5 close gate, not in CI)

CRT-14 has an automated "8 bundle artifacts exist" guard inside Scenario 1, but the plan also calls for a one-time real end-to-end run before phase close:

```bash
# Pre-req: soffice + pdftoppm + node 18+ + ANTHROPIC_API_KEY (for the agent-driven loop)
node skills/create/scripts/cli.js \
  --brief tests/fixtures/sample-brief.json \
  --run-id smoke-05-04 \
  --out-dir /tmp/instadecks-smoke-05-04 \
  --mode standalone

# After agent drives the auto-refine loop to convergence (or soft-cap accept):
ls /tmp/instadecks-smoke-05-04/
# Expected: deck.pptx, deck.pdf, design-rationale.md, findings.json,
#           deck.annotated.pptx, deck.annotated.pdf, refine-ledger.jsonl, render-deck.cjs
```

Pass criteria: all 8 artifacts present and non-empty; deck.pptx opens cleanly in PowerPoint and Keynote; refine-ledger.jsonl shows ≤5 cycles with `ended_via ∈ {converged, soft-cap-accepted}`. This is the Phase 5 close gate — not part of any automated test.

## Commits

- `2e4599a` — feat(05-04): add CLI --soft-cap flag + non-interactive detection (D-05; Q-5; CRT-10)
- `7fa962a` — test(05-04): add 5-scenario mocked-cycle auto-refine integration test (Q-3)

## Self-Check: PASSED

- `tests/auto-refine-integration.test.js` — FOUND
- `tests/create-cli-soft-cap.test.js` — FOUND
- `skills/create/scripts/cli.js` — modified (verified exports of isInteractive / parseSoftCapFlag / resolveSoftCap)
- `skills/create/scripts/index.js` — modified (verified exports of _test_setRunReview / _test_setRunCreate)
- Commit `2e4599a` — FOUND
- Commit `7fa962a` — FOUND
- Whole-repo `node --test tests/*.test.js` — 256 pass / 2 skip / 0 fail
- `bash tools/lint-paths.sh` — Path lint OK
- `npm run lint:enums` — 42 files clean
