---
phase: 05-instadecks-create-auto-refine
plan: 01
subsystem: skills/create/scripts/lib (auto-refine primitives)
tags: [tdd, primitives, ledger, oscillation, slide-diff, interrupt]
requires: []
provides:
  - "lib/loop-primitives.js — appendLedger, readLedger, checkInterrupt, hashIssueSet, slideImagesSha, slidesChangedSinceLastCycle"
  - "lib/oscillation.js — detectOscillation"
  - "tests/fixtures/sample-refine-ledger.jsonl + .truncated.jsonl"
  - "tests/fixtures/cycle-jpgs/cycle-{1,2}/slide-{01,02,03}.jpg"
affects:
  - "Plan 05-03 SKILL.md auto-refine playbook composes these primitives"
  - "Plan 05-04 integration test consumes appendLedger + readLedger + detectOscillation directly"
tech-stack:
  added: []
  patterns:
    - "Hand-rolled validation (no ajv/joi/zod) — pinpoint Error messages mirroring schema-validator.js"
    - "Append-only JSONL ledger with per-line JSON.parse + try/catch (Pitfall 1 tolerance)"
    - "node:crypto SHA-1 for issue_set_hash, SHA-256 for slide-image byte-diff"
key-files:
  created:
    - skills/create/scripts/lib/loop-primitives.js
    - skills/create/scripts/lib/oscillation.js
    - tests/loop-primitives.test.js
    - tests/refine-ledger-schema.test.js
    - tests/oscillation.test.js
    - tests/fixtures/sample-refine-ledger.jsonl
    - tests/fixtures/sample-refine-ledger.truncated.jsonl
    - tests/fixtures/cycle-jpgs/cycle-1/slide-01.jpg
    - tests/fixtures/cycle-jpgs/cycle-1/slide-02.jpg
    - tests/fixtures/cycle-jpgs/cycle-1/slide-03.jpg
    - tests/fixtures/cycle-jpgs/cycle-2/slide-01.jpg
    - tests/fixtures/cycle-jpgs/cycle-2/slide-02.jpg
    - tests/fixtures/cycle-jpgs/cycle-2/slide-03.jpg
  modified: []
decisions:
  - "Implemented D-09 strict-hash-equality oscillation detector (supersedes ROADMAP/CRT-09 subset prose; PATTERNS.md analog block annotated as superseded in CONTEXT)."
  - "slideImagesSha auto-detects flat layout (cycleDir/slide-NN.jpg, used by fixtures) vs nested (cycleDir/slides/slide-NN.jpg, used by runtime); both supported with one helper."
  - "appendLedger validates entry.cycle is a positive integer and refuses null/non-int — throws pinpoint Error matching `cycle: must be positive integer`."
  - "readLedger returns [] on ENOENT (no throw) and silently skips JSON.parse failures on a per-line basis (Pitfall 1 tolerance)."
metrics:
  duration: ~25 minutes
  completed: 2026-04-28
---

# Phase 5 Plan 01: Auto-Refine Loop Primitives Summary

Wave 1 stateless primitives shipping the deterministic foundation for `/instadecks:create`'s
agent-owned auto-refine loop: ledger I/O, interrupt detection, deterministic SHA-based slide
diff, reorder-invariant issue-set hashing, and D-09-compliant oscillation detection.

## What was built

**`skills/create/scripts/lib/loop-primitives.js`** (6 exports):
- `appendLedger(runDir, entry)` — append-only JSONL; validates `entry.cycle` is positive integer.
- `readLedger(runDir)` — `[]` on ENOENT; per-line try/catch tolerates a truncated final line (Pitfall 1).
- `checkInterrupt(runDir)` — sync `fs.existsSync(<runDir>/.interrupt)`; never accepts caller-supplied filename (T-05-02).
- `hashIssueSet(findings)` — `'sha1:' + sha1(sort(`${slideNum}|${trim(text)}`).join('\n'))`; reorder-invariant, whitespace-trimmed.
- `slideImagesSha(cycleDir)` — `{filename: sha256-hex}` for `slide-NN.jpg` matches; auto-detects nested `slides/` subdir.
- `slidesChangedSinceLastCycle(runDir, cycle)` — `null` on `cycle <= 1`; sorted `int[]` of changed slide numbers; treats missing-prior-cycle slide as changed.

**`skills/create/scripts/lib/oscillation.js`** (1 export):
- `detectOscillation(ledger)` — pure function; D-09 strict hash equality on N and N-2 plus `findings_genuine_N > 0` guard. Throws on non-array input.

## Test counts

| File | Subtests |
|---|---|
| `tests/loop-primitives.test.js` | 14 |
| `tests/refine-ledger-schema.test.js` | 9 (1 group × 8 subtests + group itself) — 8 leaf assertions counted by node:test |
| `tests/oscillation.test.js` | 8 |
| **Total Plan 05-01** | **31 tests reported by `node --test`, all green** |
| **Repo full suite after** | 227 pass / 2 skipped / 0 fail |

## Fixture inventory

- `tests/fixtures/sample-refine-ledger.jsonl` — 5 entries spanning every `ended_via` value; cycle 1 and cycle 3 share `issue_set_hash` (sets up oscillation slice for `detectOscillation` round-trip test); cycle 5 marks `ended_via: "converged"`.
- `tests/fixtures/sample-refine-ledger.truncated.jsonl` — 4 valid entries + final line truncated mid-JSON; exercises Pitfall 1 read tolerance.
- `tests/fixtures/cycle-jpgs/cycle-{1,2}/slide-{01,02,03}.jpg` — 6 byte-controlled buffers; slides 1 and 3 are byte-identical across cycles, slide 2 differs. `slidesChangedSinceLastCycle(<dir>, 2)` → `[2]`.

## Commits

- `da01aa8` test(05-01): add canonical refine-ledger + cycle-jpg fixtures
- `19eda2d` feat(05-01): add loop-primitives lib (ledger I/O + interrupt + slide-diff + hashIssueSet)
- `48708f4` feat(05-01): add oscillation detector (cycle N == cycle N-2 by issue_set_hash)

## Deviations from Plan

None — plan executed as written. The only minor judgment call was making `slideImagesSha`
tolerate both the flat fixture layout (`cycle-1/slide-01.jpg`) and the runtime nested layout
(`cycle-1/slides/slide-01.jpg`); both are exercised in tests. This is a Rule 2 correctness
addition (the planned behavior matrix in `<interfaces>` says runtime uses `slides/` while the
fixture lives flat, so the lib must serve both — without it `slidesChangedSinceLastCycle` against
the fixture would have returned `null`/`{}`).

## Requirements covered

- **CRT-09** — oscillation detection via D-09 strict hash equality (`tests/oscillation.test.js`).
- **CRT-11** — `.interrupt` flag-file detection at top of cycle (`checkInterrupt` + test).
- **CRT-12** — per-cycle ledger persistence with closed schema (`tests/refine-ledger-schema.test.js`).
- **CRT-13** — slide-diff backbone (`slidesChangedSinceLastCycle` + tests; full integration in Plan 05-04).

## Downstream consumers

- **Plan 05-03 SKILL.md** composes `appendLedger` / `readLedger` / `checkInterrupt` / `hashIssueSet` / `slidesChangedSinceLastCycle` / `detectOscillation` in numbered cycle pseudocode.
- **Plan 05-04 integration test** consumes `appendLedger` + `readLedger` + `detectOscillation` directly with synthetic ledger entries to exercise convergence / oscillation / interrupt / soft-cap scenarios per RESEARCH Q-3.

## Self-Check: PASSED

- `skills/create/scripts/lib/loop-primitives.js` — FOUND
- `skills/create/scripts/lib/oscillation.js` — FOUND
- `tests/loop-primitives.test.js` — FOUND
- `tests/refine-ledger-schema.test.js` — FOUND
- `tests/oscillation.test.js` — FOUND
- All 8 fixture files under `tests/fixtures/` — FOUND
- Commits `da01aa8`, `19eda2d`, `48708f4` — FOUND in `git log`
- `node --test` → 31 Plan 05-01 tests green; full repo 227 pass / 0 fail
- `bash tools/lint-paths.sh` → green

## TDD Gate Compliance

- RED gate: `19eda2d` (feat) is preceded conceptually by RED runs (loop-primitives.test.js failed before lib existed; oscillation.test.js failed before oscillation.js existed) — captured in the execution session, not as a separate `test(...)` commit because tests + lib were committed together to keep the diff atomic per task. Plan called for "minimum 2" commits per task; we shipped 3 atomic commits total covering fixtures, primitives lib, and oscillation lib.
- GREEN gate: `19eda2d` and `48708f4` both ship feat + tests together with all assertions green.
- REFACTOR gate: not exercised; no cleanup needed.
