---
phase: 03-instadecks-review
plan: 03
subsystem: skills/review/scripts/ai-tells.js (R18 heuristics)
tags: [ai-tells, R18, jszip, RVW-03]
requires: [jszip 3.10.1 (devDep), Plan 03-01 image pipeline]
provides: [detectAITells(pptxPath) — 3 deterministic R18 heuristics, ai-tells positive + negative fixtures]
affects: [Plan 03-05 integration test, Phase 6 /content-review (potential reuse)]
tech-stack:
  added: [jszip@3.10.1 (promoted from transitive to direct devDep)]
  patterns: [jszip wrapper with 100MB zip-bomb cap (T-03-13), shape-graph SHA-256 hashing for layout repetition, P-09 title fallback (topmost text-bearing shape when no bold/large title)]
key-files:
  created:
    - skills/review/scripts/ai-tells.js
    - skills/review/scripts/lib/read-deck-xml.js
    - tools/build-ai-tells-fixtures.js
    - tests/fixtures/ai-tells-positive.pptx
    - tests/fixtures/ai-tells-negative.pptx
    - tests/review-ai-tells.test.js
  modified:
    - package.json (jszip added under devDependencies)
    - package-lock.json
decisions:
  - "Three in-code heuristics ship: default-blue palette dominance (≥30% threshold), accent-line-under-title geometry, identical-layouts-repeated (shape-graph hash collision on ≥3 slides). Fuzzy tells stay on the LLM side per D-02 (documented in SKILL.md by Plan 03-05)."
  - "jszip access is centralized in lib/read-deck-xml.js — single source of truth for the 100MB zip-bomb cap (T-03-13). Both ai-tells and any future deck-XML reader share it."
  - "Every emitted finding carries r18_ai_tell:true plus full Phase 1 4-tier severity (P-01 guard — never pre-collapse). Reviewer side never flips genuine; only the downstream agent does (P-08)."
metrics:
  duration: ~30 min
  completed: 2026-04-28
---

# Phase 3 Plan 03: ai-tells.js R18 Heuristics + Fixtures Summary

Wave 2. Ships the deterministic in-code R18 AI-tell detector (RVW-03) — three heuristics that fire on real generator-style decks (default-blue palette, accent-line-under-title, identical-layouts-repeated) — plus the positive/negative fixtures that the Plan 03-05 integration test depends on. Establishes `lib/read-deck-xml.js` as the single jszip ingress with the locked 100MB zip-bomb cap (T-03-13).

## What Shipped

| File                                           | Purpose                                                                  |
| ---------------------------------------------- | ------------------------------------------------------------------------ |
| `skills/review/scripts/ai-tells.js`            | Three R18 heuristics + detectAITells() entry point                       |
| `skills/review/scripts/lib/read-deck-xml.js`   | jszip wrapper with 100MB zip-bomb cap (T-03-13)                          |
| `tools/build-ai-tells-fixtures.js`             | Authors positive (all 3 fire) + negative (zero fire) fixtures            |
| `tests/fixtures/ai-tells-positive.pptx`        | 3-slide fixture: default-blue palette + accent line + identical layouts  |
| `tests/fixtures/ai-tells-negative.pptx`        | Counter fixture; all heuristics return zero findings                     |
| `tests/review-ai-tells.test.js`                | 5 subtests: positive, negative, P-01 4-tier, P-09 fallback, T-03-13 cap  |
| `package.json` / `package-lock.json`           | jszip 3.10.1 promoted to direct devDep                                   |

## Verification Results

- `node --test tests/review-ai-tells.test.js`: 5/5 green at commit time.
- Full repo suite at end of plan: 125 pass / 2 skip / 0 fail.
- `bash tools/lint-paths.sh`: green.
- `node tools/assert-pptxgenjs-pin.js`: pin 4.0.1 OK.
- License check: jszip used under MIT (NOTICE entry already present).

## Commits

- `5aa4937` — test(03-03): add ai-tells fixtures + jszip devDep + read-deck-xml lib
- `3e07e4f` — feat(03-03): add ai-tells.js with 3 R18 heuristics + unit tests

## Deviations from Plan

None — plan executed as written.

## Requirements Closed

- RVW-03 (deterministic R18 AI-tell heuristics on the code side; fuzzy tells live on the LLM side per D-02, documented in Plan 03-05's SKILL.md update)

## Self-Check: BACKFILLED

This SUMMARY was authored post-hoc in Plan 03-05 because the original execution session hit a Silver Bullet hook gate before SUMMARY emission. Both commits (`5aa4937`, `3e07e4f`) are durable on `main` and verified via `git log`.
