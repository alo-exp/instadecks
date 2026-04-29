# Testing Strategy and Plan

## Strategy

Three test layers reinforce the contract:

1. **Unit tests (`node --test`)** — JSON-to-SAMPLES adapter logic, severity collapse, schema validation, run-state atomicity, oscillation detection, issue ledger merge.
2. **Integration tests** — end-to-end skill invocations against canonical fixtures: `tests/fixtures/sample-findings.json` → `/instadecks:annotate` → annotated PPTX/PDF; sample input → `/instadecks:create` (Phase 4 single-cycle, Phase 5 with loop).
3. **Visual regression** — `tests/fixtures/v8-reference/` baselines (samples.js, expected `Annotations_Sample.pptx` SHA, per-slide JPGs at 150 DPI). Pixel-diff threshold: < 0.5%. CI fails on drift.

## Coverage Goals

- Adapter logic (severity collapse, genuine-flag filtering, symlink creation): 100% line coverage
- annotate.js: integrity SHA test only — file is verbatim, no edits, no unit tests of geometry math (the v8 calibration IS the test)
- Skill invocation: at least one happy-path + one edge-case integration test per user-invocable skill
- Visual regression: every PPTX-producing skill (annotate, create) has a baseline

## Test Plan

| Layer | Phase | Test |
|-------|-------|------|
| Unit | 1 | Schema validator catches malformed JSON; manifest validator catches schema drift; hardcoded-path lint |
| Unit | 1 | annotate-integrity.test.js: SHA of annotate.js matches pinned value |
| Unit | 2 | Adapter: 4-tier→3-tier severity collapse; genuine filter; symlink creation |
| Unit | 2 | samples.js export shape matches annotate.js's import shape |
| Integration | 2 | `/instadecks:annotate` fixture run produces output; standalone + pipelined modes |
| Visual | 2 | annotated PPTX byte-identical (or pixel-diff < 0.5%) vs v8 reference |
| Unit | 3 | DECK-VDA finding grammar parser; R18 AI-tell pattern matching |
| Integration | 3 | `/instadecks:review` against test deck produces JSON in locked schema |
| Integration | 3 | `pptx-to-images.sh` race resistance (concurrent invocations don't collide) |
| Integration | 4 | `/instadecks:create` produces 8 slide types; opens cleanly in real PowerPoint |
| Unit | 5 | Convergence rule (genuine_findings == 0 AND cycle ≥ 2); oscillation detection (cycle N ⊆ cycle N-2); issue ledger merge |
| Integration | 5 | Full auto-refine loop on canonical input converges within reasonable cycles |
| Unit | 6 | Content-review finding grammar parity with /review |
| Integration | 6 | Cross-domain test: content-review ignores design issues; review ignores content issues |
| Integration | 7 | Fresh-machine install test (`/plugin install` → `/instadecks:doctor` → `/instadecks:create`) |
| Manual | 7 | Skill activation panel: 10 prompts × 4 skills, ≥ 8/10 each |

## CI Gates

- pptxgenjs version pin assertion (exactly `4.0.1`)
- Hardcoded path lint (`grep -rE '/Users/|~/.claude|/home/|C:\\\\'`)
- Manifest schema validator (`tools/validate-manifest.js`)
- License-checker (zero GPL transitive deps)
- annotate.js integrity SHA
- Visual regression baselines (Phase 2 onwards)
- Doc size caps + INDEX.md orphan check (`tools/lint-doc-size.js [--orphans]`, Phase 10 Gate 7)
- c8 100% coverage gate (`npm test`, Phase 8 Gate 6)

## Local commands

```bash
npm test                 # c8 --100 --check-coverage gate (matches CI Gate 6)
npm run test:smoke       # <30s smoke suite
npm run test:bats        # bash-script suite (bats)
npm run test:e2e         # E2E (local-only; auto-skipped when CI=true)
```

## Phase-10 release-automation gates

Forward-references for Plans 10-03 .. 10-06 (script names land with each plan):

```bash
npm run gate:activation-panel    # Plan 10-03 — skill activation panel >= 8/10 each
npm run gate:permission-mode     # Plan 10-04 — permission-mode audit
npm run gate:fresh-install       # Plan 10-05 — fresh-machine install gate
npm run release:dry-run          # Plan 10-06 — release dry-run
npm run release                  # Plan 10-06 — tagged release
```
