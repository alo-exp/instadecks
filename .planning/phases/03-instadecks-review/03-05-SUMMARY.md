---
phase: 03-instadecks-review
plan: 05
subsystem: skills/review (SKILL.md canonicalization + integration ribbon)
tags: [DECK-VDA, canonicalization, integration-test, NOTICE, RVW-01, RVW-02, RVW-03, RVW-05, RVW-06, RVW-07, RVW-08]
requires: [Plan 03-01, 03-02, 03-03, 03-04 all green; runReview orchestrator; render-fixed renderer; ai-tells heuristics]
provides: [skills/review/SKILL.md full DECK-VDA playbook, NOTICE DECK-VDA attribution, end-to-end happy-path integration test]
affects: [Phase 4 (/instadecks:create scaffolding will import runReview), Phase 5 (auto-refine consumes counts), Phase 6 (/instadecks:content-review references the same boundary), Phase 7 (DIST-02 finalizes ≥8/10 activation)]
tech-stack:
  added: []
  patterns: [DECK-VDA canonicalization re-expressed under Apache-2.0 (D-01 — no upstream vendoring), two-report architecture (D-06 fixed + narrative), --annotate gating (D-03), structured-handoff invocation (D-04), R18 prompt-side fuzzy-tells block (D-02 prompt side)]
key-files:
  created:
    - tests/review-integration.test.js
  modified:
    - skills/review/SKILL.md (body replaced; frontmatter + H1 preserved verbatim)
    - NOTICE (DECK-VDA methodology attribution paragraph appended)
decisions:
  - "DECK-VDA canonicalized as first-class Apache-2.0 content per D-01 — re-expressed prose, NOT a verbatim vendor of the upstream deck-design-review skill. NOTICE acknowledges the methodology origin (Shafqat Ullah / Sourcevo)."
  - "Frontmatter description preserved verbatim from Phase 1 (single-line scalar, ≤1024 chars, imperative-verb start, third-person voice). Phase 7 DIST-02 finalizes ≥8/10 activation tuning — out of scope for v0.1.0 Phase 3."
  - "Two-report architecture (D-06): fixed MD via render-fixed.js (deterministic, audit trail) + narrative MD authored by the agent post-runReview (≥200 words, must cite slide numbers and finding text). runReview returns narrativePath but does NOT write the file — integration test asserts !exists."
  - "--annotate gating (D-03): default standalone (3 outputs); explicit flag OR natural-language intent (annotate/overlay/markup) triggers the 5-output pipeline."
  - "Severity-collapse boundary (P-01) restated prominently in §11 of SKILL.md: producers always emit 4-tier; the 4→3 collapse to MAJOR/MINOR/POLISH happens only at the /annotate adapter."
  - "Content-vs-design boundary (Anti-Hallucination rule #7) preserved verbatim: this skill flags visual/typographic/layout only; argument structure is /content-review's territory (Phase 6)."
metrics:
  duration: ~20 min
  completed: 2026-04-28
---

# Phase 3 Plan 05: SKILL.md Canonicalization + Integration Ribbon Summary

Final closer for Phase 3. Replaces the Phase 1 scaffold body of `skills/review/SKILL.md` with the full DECK-VDA playbook re-expressed as first-class Apache-2.0 content (D-01 — no upstream vendoring). Adds the DECK-VDA methodology attribution paragraph to NOTICE. Lands the end-to-end happy-path integration test that traverses `detectAITells → runReview → outputs (sibling + run-dir mirror) → optional --annotate` with stubbed `runAnnotate`. Closes RVW-01 at the pattern level (Phase 7 DIST-02 finalizes activation) plus RVW-02 / RVW-03 / RVW-05 / RVW-06 / RVW-07 / RVW-08 via the integration ribbon.

## What Shipped

| File                                  | Purpose                                                                  |
| ------------------------------------- | ------------------------------------------------------------------------ |
| `skills/review/SKILL.md`              | Full DECK-VDA playbook (15 sections per `<interfaces>`); frontmatter preserved |
| `NOTICE`                              | DECK-VDA methodology attribution paragraph appended                      |
| `tests/review-integration.test.js`    | 4 subtests: happy path (ai-tells → runReview), --annotate stub, standalone CLI, render-fixed snapshot cross-check |

## SKILL.md Body Sections (per D-01 / D-02 / D-03 / D-04 / D-06)

1. One-paragraph hook (echoes description string)
2. When to invoke (with /content-review boundary callout)
3. Inputs (deckPath, optional findings sidecar, --annotate flag, --run-id, --out-dir)
4. Outputs (standalone 3 vs --annotate 5)
5. Invocation modes (standalone CLI + structured-handoff with full return shape)
6. The DECK-VDA methodology — 4-pass scan, 4-tier severity table with calibration rule, finding grammar, §1–§5 ordering, maturity rubric (first-matching-wins), 7 anti-hallucination rules (rule #7 verbatim), large-deck chunking
7. R18 AI-tell detection — code side (3 deterministic heuristics from Plan 03-03)
8. R18 AI-tell detection — fuzzy side (5 LLM-judged categories with examples)
9. Two-report architecture (D-06)
10. --annotate gating (D-03)
11. Severity-collapse boundary (P-01) — locked invariant restated
12. Content-vs-design boundary (delete-the-line rule)
13. Allowed tools
14. Environment variables
15. Deferred (Phase 7 DIST-02; Phase 5 auto-refine; Phase 6 /content-review; reviewer-of-reviewer eval)

## NOTICE Diff

Appended under a new `## DECK-VDA methodology attribution` heading:

> The DECK-VDA methodology embedded in /instadecks:review (4-pass scan, 4-tier severity grammar, finding grammar, §1–§5 reporting structure, maturity rubric) was developed by Shafqat Ullah / Sourcevo as the standalone deck-design-review skill. Instadecks re-expresses the methodology as first-class authored content under Apache-2.0; no upstream files are vendored.

## Verification Results

- `node tools/validate-manifest.js`: Manifest OK.
- `node --test tests/manifest-validator.test.js`: 8/8 pass (frontmatter shape, ≤1024-char description, imperative verb, single-line scalar — all green).
- `bash tools/lint-paths.sh`: Path lint OK (no hardcoded /Users/, ~/.claude/, etc.).
- `node tools/assert-pptxgenjs-pin.js`: pptxgenjs pin 4.0.1 OK.
- `node --test tests/review-integration.test.js`: 4/4 pass.
- Full repo suite (`find tests -maxdepth 2 -name '*.test.js' -print0 | xargs -0 node --test`): 129 pass / 2 skip / 0 fail.
- Required-content greps green: DECK-VDA, Critical, content-review, DIST-02, deck-design-review (in NOTICE).
- No-vendor audit: SKILL.md body re-expressed; no byte-identical paragraph match against the upstream deck-design-review skill.

## Commits

- `5fe5210` — docs(03-05): canonicalize DECK-VDA in /instadecks:review SKILL.md + NOTICE attribution
- `33b1a33` — test(03-05): add end-to-end happy-path integration test

## Deviations from Plan

None — plan executed as written. No Rule 1/2/3/4 deviations triggered.

## Requirements Closed

- **RVW-01** (pattern level — full DECK-VDA playbook + frontmatter description preserved; Phase 7 DIST-02 finalizes ≥8/10 activation tuning)
- **RVW-02** (fixed-template MD renders deterministically — cross-checked against Plan 03-04 snapshot in subtest 4)
- **RVW-03** (R18 AI-tell detection documented in SKILL.md §7 + §8; integration test exercises detectAITells against the positive fixture)
- **RVW-05** (sibling JSON + sibling MD + run-dir mirror written by runReview; integration test asserts all four paths)
- **RVW-06** (--annotate gating exercised via stubbed runAnnotate; annotated paths surface in the result object)
- **RVW-07** (standalone CLI subprocess invocation produces sibling outputs)
- **RVW-08** (structured-handoff mode return shape validated end-to-end)

## Phase 3 Status: COMPLETE

All five plans done. RVW-01..RVW-11 closed:
- RVW-09 / RVW-10 / RVW-11 — Plan 03-01 (pptx-to-images.sh hardened)
- RVW-04 — Plan 03-02 (schema validator pinpoint errors)
- RVW-03 — Plan 03-03 (ai-tells heuristics)
- RVW-02 / RVW-05 — Plan 03-04 (render-fixed deterministic) + Plan 03-05 cross-link
- RVW-01 / RVW-06 / RVW-07 / RVW-08 — Plan 03-05 integration ribbon

## Deferred (Out of Scope)

- **Phase 7 DIST-02** — activation tuning to ≥8/10 on description string (final tuning lands at distribution time).
- **Phase 5** — `/instadecks:create` auto-refine loop consumes `runReview` in convergence; convergence rule lives there, not here.
- **Phase 6** — `/instadecks:content-review` separate skill for argument-structure critique.
- **Reviewer-of-reviewer evaluation** — out of v0.1.0 scope.

## Self-Check: PASSED

- `skills/review/SKILL.md` — present; frontmatter byte-identical to Phase 1; H1 preserved; all 15 body sections grep-confirmed.
- `NOTICE` — DECK-VDA attribution paragraph present; existing license blocks untouched.
- `tests/review-integration.test.js` — present; 4 subtests pass.
- Commits `5fe5210` and `33b1a33` — both present on `main` (`git log --oneline | grep -E '5fe5210|33b1a33'`).
- Full suite: 129 pass / 2 skip / 0 fail.
