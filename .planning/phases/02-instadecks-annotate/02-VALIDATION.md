---
phase: 02
slug: instadecks-annotate
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-28
---

# Phase 02 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Derived from RESEARCH.md §"Validation Architecture".

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `node --test` (Node 18+ built-in, zero-dep) |
| **Config file** | none (Phase 1 convention) |
| **Quick run command** | `node --test tests/<changed-file>.test.js` |
| **Full suite command** | `find tests -maxdepth 2 -name '*.test.js' -print0 \| xargs -0 node --test` (matches `ci.yml` Gate 6) |
| **Estimated runtime** | < 30 s full suite (no soffice) / < 90 s with visual-regression Tier 1 |

---

## Sampling Rate

- **After every task commit:** Run quick command targeting the test file(s) the task touches.
- **After every plan wave:** Run full suite command.
- **Before `/gsd-verify-work`:** Full suite must be green; visual-regression Tier 1 (SHA) green; Tier 2 may stay `test.skip` if soffice absent.
- **Max feedback latency:** < 30 s for changed-file quick run.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 02-01 | 1 | ANNO-04 (samples extraction) + JPG fixtures | unit | `node --test tests/annotate-integrity.test.js` | will be unsuspended in Plan 02-01 (currently `it.skip`) | ⬜ pending |
| 02-01-02 | 02-01 | 1 | ANNO-02, ANNO-03, ANNO-04 (verbatim + 2 patches + integrity) | unit | `node --test tests/annotate-integrity.test.js` | ✅ stub from Phase 1 | ⬜ pending |
| 02-02-01 | 02-02 | 1 | ANNO-05, ANNO-06 | unit | `node --test tests/annotate-adapter.test.js` | ❌ W0 (created in 02-02) | ⬜ pending |
| 02-02-02 | 02-02 | 1 | ANNO-05, ANNO-06 | unit | `node --test tests/annotate-adapter.test.js` | ❌ W0 (created in 02-02) | ⬜ pending |
| 02-03-01 | 02-03 | 2 | ANNO-07, ANNO-08, ANNO-10 | integration | `node --test tests/annotate-runtime.test.js` | ❌ W0 (created in 02-03) | ⬜ pending |
| 02-03-02 | 02-03 | 2 | ANNO-01, ANNO-09 | integration | `node --test tests/annotate-runtime.test.js` | ❌ W0 (created in 02-03) | ⬜ pending |
| 02-04-01 | 02-04 | 3 | ANNO-11 | regression | `node --test tests/annotate-visual-regression.test.js` (Tier 1 SHA always; Tier 2 pixelmatch skip-guarded on soffice presence) | ❌ W0 (created in 02-04) | ⬜ pending |
| 02-04-02 | 02-04 | 3 | ANNO-01 | structural | `node tools/validate-manifest.js` (verifies SKILL.md description structure) | ✅ Phase 1 validator | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements (test files staged before/during plans)

- [x] `tests/annotate-integrity.test.js` — Phase 1 stub (`it.skip`), Plan 02-01 unsuspends.
- [x] `tests/fixtures/sample-findings.json` — Phase 1 fixture, consumed by adapter + visual-regression tests.
- [x] `tests/fixtures/v8-reference/Annotations_Sample.pptx` + `.sha256` — Phase 1 baseline (Tier 1 SHA target).
- [x] `tests/fixtures/v8-reference/v8s-{01..10}.png` — Phase 1 PNG baselines (Tier 2 pixelmatch reference).
- [ ] `tests/fixtures/v8-reference/v8s-{01..10}.jpg` — sourced from v5-blue-prestige tree in Plan 02-01 Task 1 (O-2 RESOLVED).
- [ ] `tests/annotate-adapter.test.js` — created in Plan 02-02 (Wave 1).
- [ ] `tests/annotate-runtime.test.js` — created in Plan 02-03 (Wave 2).
- [ ] `tests/annotate-visual-regression.test.js` — created in Plan 02-04 (Wave 3).
- [x] `node --test` framework available (Node 25.6.0 local, Node 18+ in CI).
- [x] `pptxgenjs@4.0.1`, `pixelmatch@^5.3.0`, `pngjs@^7.0.0` — pinned in Phase 1 lockfile.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visual-regression Tier 2 (pixelmatch ≤ 0.5%) — when soffice absent in CI | ANNO-11 | soffice availability is environment-dependent; Phase 1 ci.yml RESERVED block defers full visual regression to a future opt-in CI runner. | If running locally with `soffice` + `pdftoppm` installed, set env `INSTADECKS_VISUAL_TIER2=1` and re-run `tests/annotate-visual-regression.test.js`; the skip-guard checks `which soffice` plus the env var. |
| Activation-rate prompt panel (≥ 8/10) | ANNO-01 | Subjective LLM-elicitation test deferred to Phase 7 (DIST-02) where activation tuning is final. | Phase 7 owns; not a Phase 2 gate. |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies (mapped above).
- [x] Sampling continuity: no 3 consecutive tasks without automated verify (each wave's tasks all have node --test verifications).
- [x] Wave 0 covers all MISSING references — JPG fixtures sourced in Plan 02-01 Task 1; new test files created within their plan tasks (W0 inline).
- [x] No watch-mode flags — `node --test` is one-shot.
- [x] Feedback latency < 30 s for quick run; < 90 s full suite incl. Tier 1 SHA.
- [x] `nyquist_compliant: true` set in frontmatter.

**Approval:** approved 2026-04-28 (post Pass 3 plan-checker BLOCKER fix).
