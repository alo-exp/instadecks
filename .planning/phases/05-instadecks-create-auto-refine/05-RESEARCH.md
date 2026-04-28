---
phase: 05
slug: instadecks-create-auto-refine
status: research-complete
researched: 2026-04-28
domain: agent-driven convergence loop wrapping deterministic Node primitives (runCreate / runReview / runAnnotate); JSONL ledger; SHA-based slide-image diff; soft-cap UX
confidence: HIGH
---

# Phase 5 — `/instadecks:create` Auto-Refine Loop — RESEARCH

> Consumed by the planner. CONTEXT.md D-01..D-08 are LOCKED — this research informs **how** to implement them, not **whether** to. All five researcher questions (Q-1..Q-5) are answered with verified evidence. plugin-dev:skill-development conformance items are baked into a checklist the planner must satisfy.

---

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01 — Loop Owner:** AGENT-OWNED loop in `skills/create/SKILL.md`. Code provides primitives only (`runCreate`, `runReview`, `runAnnotate`, `appendLedger`, `readLedger`, `checkInterrupt`, `detectOscillation`, `slidesChangedSinceLastCycle`). No control-flow code.
- **D-02 — Issue Ledger:** Append-only JSONL at `<run-dir>/refine-ledger.jsonl`. Schema: `{cycle, timestamp, findings_total, findings_genuine, findings_fixed, findings_intentionally_skipped, issue_set_hash, skipped_finding_ids[], fixed_finding_ids[], slides_changed[], review_mode, ended_via}`. `issue_set_hash` = SHA-1 of sorted `(slideIdx + finding_text)`.
- **D-03 — Diff-Only Review After Cycle 1:** Slide-image byte-SHA comparison. `runReview` extends with `slidesToReview` (NON-BREAKING). Cycle 1 always full. Confirmation cycle full.
- **D-04 — User Interrupt:** Top-of-cycle `<run-dir>/.interrupt` flag-file check. No mid-cycle abort. Append `ended_via: "interrupted"` and finalize.
- **D-05 — Soft Cap (cycle 5):** AskUserQuestion with 4 options (Continue / Accept / Specify / Stop). Standalone-mode default = "B accept" with stderr warning.
- **D-06 — Default Bundle:** Always emits all 8 artifacts (deck.pptx, deck.pdf, design-rationale.md, findings.json, deck.annotated.pptx, deck.annotated.pdf, refine-ledger.jsonl, render-deck.cjs).
- **D-07 — Confirmation Cycle:** Cycle 2 after cycle-1-clean is FULL re-render + re-image + full review.
- **D-08 — Triage:** Per-finding `genuine` boolean is set by the AGENT (not `/review`), written to `<run-dir>/cycle-N/findings.triaged.json`. Only `genuine && severity ∈ {Critical, Major}` flow into the fix list.

### Claude's Discretion

- Q-1..Q-5 answers (this research).
- Internal organization of `skills/create/scripts/lib/` (separate `loop-primitives.js` + `oscillation.js` per CONTEXT, OR single file — researcher recommends two-file split for testability).
- Wave decomposition.
- Exact `findings.triaged.json` schema delta (researcher: extend Phase 1 schema additively).
- Interaction surface for Specify-mode (free-text → next-cycle fix list).

### Deferred Ideas (OUT OF SCOPE)

- `/content-review` integration into the loop (v2 per PROJECT.md).
- DIST-02 activation rate tuning (Phase 7).
- Post-launch convergence diagnostics surfaced in rationale doc (v1.x).
- Multi-deck batch refine.
- Hard-coded cycle cap (PROJECT.md: "no fixed cap" — soft cap with user override is the only mechanism).

---

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CRT-07 | Auto-refine loop until reviewer reports zero genuine issues | Convergence rule baked into D-01 SKILL.md playbook + D-02 ledger schema |
| CRT-08 | `genuine_findings == 0 AND cycle ≥ 2` convergence; cycle-1-clean forces confirmation | D-07 mechanics; ledger `ended_via: "converged"` |
| CRT-09 | Oscillation detection (cycle N ⊆ cycle N-2) | `oscillation.js` consumes ledger `issue_set_hash` + finding-id sets |
| CRT-10 | Soft cap @ cycle 5 with user override | D-05 AskUserQuestion + standalone fallback |
| CRT-11 | User interrupt via `.interrupt` flag file | D-04 top-of-cycle check |
| CRT-12 | Per-cycle issue ledger persisted | D-02 JSONL schema |
| CRT-13 | Cycle 1 = full review; cycle 2+ = diff-only of changed slides | D-03 SHA-diff; cycle 2 (confirmation) is full per D-07 |
| CRT-14 | Default-pipeline produces full artifact bundle | D-06 8-artifact list; SKILL.md step 7 always invokes `runAnnotate` |

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Loop control flow (when to stop, retry, ask user) | Agent (SKILL.md playbook) | — | D-01 — judgment-heavy |
| Per-finding genuine triage | Agent (cycle step 4) | — | D-08 — judgment, multimodal |
| Render → PPTX (per cycle) | Node script (`runCreate`) | — | Deterministic; pre-existing |
| PPTX → JPGs | Bash (`pptx-to-images.sh`) | — | Pre-existing; race-hardened |
| Review (DECK-VDA) | Node + agent (`runReview` orchestrator + R18 heuristics) | — | Pre-existing |
| Slide-image diff (which slides changed) | Node primitive (`slidesChangedSinceLastCycle`) | — | Pure SHA file-IO; deterministic |
| Oscillation detection | Node primitive (`detectOscillation`) | — | Set-arithmetic on ledger |
| Ledger persistence | Node primitive (`appendLedger` / `readLedger`) | — | Append-only JSONL |
| Interrupt detection | Node primitive (`checkInterrupt`) | — | `fs.existsSync` |
| Soft-cap UX | Agent (AskUserQuestion) | Node fallback (CLI standalone) | D-05 |
| Annotated overlay | Node script (`runAnnotate`) | — | Pre-existing |

---

## Standard Stack

### Core (already in repo — no new deps)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| node `node:fs/promises` | built-in | JSONL append, file-existence checks, SHA computation via stream→`createHash` | Zero new deps; matches Phase 3/4 style [VERIFIED: skills/review/scripts/index.js, skills/create/scripts/index.js] |
| node `node:crypto` | built-in | SHA-1 for `issue_set_hash`, SHA-256 for slide-image diff | Already imported by both `runCreate` and `runReview` [VERIFIED: index.js source] |
| node `node:test` | built-in | Test runner | Repo standard — 58 tests Phase 4, ~85 tests Phase 3 [VERIFIED: 04-04-SUMMARY.md] |
| pptxgenjs | 4.0.1 (pinned) | (transitive — used by `runCreate`) | Locked invariant [CITED: CLAUDE.md] |

**No new npm dependencies.** All loop primitives are pure Node + filesystem.

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| node `node:path` | built-in | `path.join` for run-dir layout | All primitives |
| node `node:child_process` (existing usage) | built-in | (Already used by `runCreate` / `pptx-to-images.sh`) — Phase 5 does NOT add new spawns | Reused, not added |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Byte-SHA slide-image diff | Perceptual hash (`pHash` / `dHash`) | Pure-JS pHash adds a dep; **empirical test (below) shows byte-SHA is RELIABLE on this stack — fallback unnecessary** |
| JSONL ledger | SQLite | JSONL: append-safe across crashes, zero deps, human-readable. SQLite: needs `better-sqlite3` (native compile — fragile across plugin installs). **JSONL wins** [CITED: PITFALLS.md run-state pattern, topgun precedent] |
| Single-file `loop-primitives.js` | Two files (`loop-primitives.js` + `oscillation.js`) | Two-file split aids unit testing; CONTEXT.md D-02 already names both. Recommend follow CONTEXT |
| In-process `runReview` mock for tests | Spawn real soffice in CI | Phase 3 already exposes `_test_setRunAnnotate` override pattern — Phase 5 mirrors with `_test_setRunReview` etc. (see Q-3 below) [VERIFIED: skills/review/scripts/index.js:55-56] |

**Installation:** None required. `npm view pptxgenjs version` already pinned at 4.0.1.

---

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ /instadecks:create   AGENT (SKILL.md Auto-Refine Loop)      │
│                                                             │
│ ┌─ Step 0 (cycle 0) ────────────────────────────────────┐   │
│ │ Author render-deck.cjs from cookbook + design-ideas   │   │
│ └───────────────────────────────────────────────────────┘   │
│                            │                                │
│                            ▼                                │
│ ╔═════════ CYCLE LOOP (agent-driven) ══════════════════╗    │
│ ║ 1. checkInterrupt(runDir) → if true: finalize, exit  ║    │
│ ║ 2. runCreate({...})  →  deck.pptx + render-deck.cjs  ║    │
│ ║ 3. pptx-to-images.sh →  cycle-N/slides/slide-NN.jpg  ║    │
│ ║ 4. slidesChangedSinceLastCycle → int[] (D-03 diff)   ║    │
│ ║ 5. runReview({slidesToReview}) → findings.json       ║    │
│ ║ 6. AGENT triage: read each finding + slide image     ║    │
│ ║    → write cycle-N/findings.triaged.json (D-08)      ║    │
│ ║ 7. fix list = genuine && severity ∈ {Crit, Major}    ║    │
│ ║ 8. detectOscillation(ledger) → break if true         ║    │
│ ║ 9. appendLedger({cycle, hashes, ids, ended_via})     ║    │
│ ║ 10. convergence check:                               ║    │
│ ║     - genuine == 0 AND cycle >= 2 → break(converged) ║    │
│ ║     - cycle == 1 AND genuine == 0 → force cycle 2    ║    │
│ ║       (D-07: full review)                            ║    │
│ ║ 11. cycle == 5 AND not converged → AskUserQuestion   ║    │
│ ║ 12. AGENT edits render-deck.cjs to fix genuine items ║    │
│ ║ 13. cycle++                                          ║    │
│ ╚══════════════════════════════════════════════════════╝    │
│                            │                                │
│                            ▼                                │
│ Step 8 (post-loop): runAnnotate → deck.annotated.{pptx,pdf} │
│ Step 9: refine design-rationale.md (Reviewer Notes section) │
│ Step 10: surface 8-artifact bundle to user                  │
└─────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure

```
skills/create/
├── SKILL.md                          # APPENDED §"Auto-Refine Loop" (D-01)
└── scripts/
    ├── index.js                      # runCreate (UNCHANGED — Phase 4 ships loop-ready)
    └── lib/
        ├── deck-brief.js             # Phase 4
        ├── enum-lint.js              # Phase 4
        ├── title-check.js            # Phase 4
        ├── design-validator.js       # Phase 4
        ├── render-rationale.js       # Phase 4 (modified: populate Reviewer-Notes from ledger)
        ├── loop-primitives.js        # NEW — appendLedger, readLedger, checkInterrupt,
        │                             #         slidesChangedSinceLastCycle, slideImagesSha
        └── oscillation.js            # NEW — detectOscillation(ledger) → boolean

skills/review/scripts/
├── index.js                          # runReview EXTENDED with slidesToReview param (Q-1)
└── ...                               # (no other changes)

tests/
├── refine-ledger-schema.test.js      # NEW — schema shape + JSONL append safety
├── oscillation.test.js               # NEW — subset detection N ⊆ N-2; identical / shrinking / drift
├── loop-primitives.test.js           # NEW — interrupt, ledger I/O, slide diff
├── slides-to-review.test.js          # NEW — runReview filter (Q-1 NON-BREAKING)
└── auto-refine-integration.test.js   # NEW — mocked runReview sequence (Q-3)
```

### Pattern 1: Agent-Driven Loop with Code Primitives (D-01 / Phase 3 D-02 precedent)

**What:** SKILL.md owns the cycle pseudocode. `scripts/lib/loop-primitives.js` exports stateless helpers.
**When to use:** Anywhere a control-flow decision requires multimodal judgment (image + text + brief).
**Example pattern (from Phase 3 review pipeline; mirror exactly):**

```js
// Source: skills/review/scripts/index.js:55-56 (precedent)
let _runAnnotateOverride = null;
function _test_setRunAnnotate(fn) { _runAnnotateOverride = fn; }
// ...
const runAnnotate = _runAnnotateOverride || require('../../annotate/scripts').runAnnotate;
```

Phase 5 mirrors with `_test_setRunReview`, `_test_setRunCreate` overrides on a new `skills/create/scripts/lib/loop-primitives.js` — but cleanly: the agent calls `runReview` / `runCreate` directly from SKILL.md prose (per D-01); only the **integration test** swaps them (Q-3).

### Pattern 2: JSONL Append-Only Ledger

**What:** Each cycle appends one line via `fs.appendFile(path, JSON.stringify(entry) + '\n')`.
**Why:** Crash-safe (POSIX `O_APPEND` is atomic for writes ≤ PIPE_BUF on Linux/macOS — JSONL lines are well under this); human-readable; easy to grep/jq during debug.
**Read pattern:** `readLedger(runDir)` = `fs.readFile + split('\n').filter(Boolean).map(JSON.parse)`. Bad lines log a warning and are skipped (defensive — single-line corruption shouldn't poison the run).

### Pattern 3: SHA-Based Slide Diff for `slidesToReview`

```js
// loop-primitives.js (sketch)
async function slideImagesSha(cycleDir) {
  const files = await fsp.readdir(path.join(cycleDir, 'slides'));
  const out = {};
  for (const f of files.filter(n => /^slide-\d+\.jpg$/.test(n))) {
    const buf = await fsp.readFile(path.join(cycleDir, 'slides', f));
    out[f] = crypto.createHash('sha256').update(buf).digest('hex');
  }
  return out;
}

async function slidesChangedSinceLastCycle(runDir, cycle) {
  if (cycle <= 1) return null; // null = "all" sentinel, runReview treats as full
  const cur = await slideImagesSha(path.join(runDir, `cycle-${cycle}`));
  const prev = await slideImagesSha(path.join(runDir, `cycle-${cycle - 1}`));
  const changed = [];
  for (const [name, sha] of Object.entries(cur)) {
    if (prev[name] !== sha) {
      const m = name.match(/slide-(\d+)\.jpg/);
      changed.push(parseInt(m[1], 10));
    }
  }
  return changed.sort((a, b) => a - b);
}
```

### Anti-Patterns to Avoid

- **Mid-cycle abort:** Honoring `.interrupt` mid-render leaves a half-written `deck.pptx`. D-04 forbids this.
- **Mutating findings.json with `genuine` flags:** `/review`'s output is immutable; agent writes a SEPARATE `findings.triaged.json` (D-08).
- **Re-fixing intentionally-skipped findings:** Ledger's `skipped_finding_ids` MUST be threaded into agent context on each cycle so the same finding isn't relitigated. (Researcher recommends: SKILL.md step 6 explicitly says "exclude any finding-id present in any prior cycle's `skipped_finding_ids`".)
- **Trying to make `runCreate` idempotent across cycles:** It's already deterministic given an unchanged `render-deck.cjs`. The AGENT must edit `render-deck.cjs` between cycles to drive change.
- **Hardcoded cycle cap:** PROJECT.md forbids it. Cycle 5 is a soft cap (asks user); never a hard `if (cycle > N) throw`.
- **Coupling oscillation detection to ledger format:** `detectOscillation(ledger)` takes the parsed array — schema can evolve.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| File hashing | Custom XOR / fnv | `crypto.createHash('sha256')` | Built-in, fast, collision-safe |
| JSONL parser | Custom regex | `split('\n').filter(Boolean).map(JSON.parse)` | 3-line idiom; Phase 4 precedent |
| Set subset check | Loop with flag | `setN.every(id => setN_minus_2.has(id))` | One-liner; readable |
| Cycle directory layout | Custom serializer | `<run-dir>/cycle-${N}/{slides/,findings.json,findings.triaged.json}` | Mirrors Phase 3 pattern; debuggable |
| Test mocks | Custom DI framework | `_test_set*` override pattern (Phase 3 D-04 precedent) | Already used in `skills/review/scripts/index.js` |
| Spawn-blocking integration tests | Inline soffice in CI | Mock `runReview` returning scripted findings sequence (Q-3) | 30s → <1s per test |

**Key insight:** Phase 4 + Phase 3 already solve the heavy primitives. Phase 5 is **glue + ledger + diff + UX**, not new infrastructure.

---

## Common Pitfalls

### Pitfall 1: JSONL Ledger Read Sees Half-Written Final Line

**What goes wrong:** Process killed mid-`appendFile` could leave a truncated last line.
**Why it happens:** `fs.appendFile` is atomic on the OS level for small writes BUT the disk flush isn't guaranteed.
**How to avoid:** `readLedger` MUST tolerate a malformed last line — wrap each `JSON.parse` in try/catch and skip with a stderr warning. Test fixture: a ledger ending with `{"cycle": 3, "tim` (truncated). [CITED: Phase 3 P-08 soft-fail precedent]
**Warning signs:** "Unexpected end of JSON input" without graceful skip.

### Pitfall 2: Oscillation False-Positive on Steady Improvement

**What goes wrong:** Cycle N's set is a strict shrink of N-2's (loop is converging) but `⊆` is true → loop incorrectly halts.
**Why it happens:** `cycle N ⊆ cycle N-2` is satisfied trivially when N's set is a proper subset.
**How to avoid:** Oscillation rule per CONTEXT D-02 is `(skipped ∪ fixed)_N ⊆ (skipped ∪ fixed)_{N-2}` — but this still has the issue. **Researcher recommendation: oscillation = `genuine_finding_set_N == genuine_finding_set_{N-2} AND |genuine_N| > 0`** (strict equality on the *unfixed* set, not subset). Cycles fixing a different subset each round trigger oscillation; cycles converging do NOT.
**Test:** `tests/oscillation.test.js` covers (a) identical-set → true, (b) strict-subset (shrinking) → false, (c) drift → false, (d) empty-on-both → false.

### Pitfall 3: Cycle Numbering Off-by-One

**What goes wrong:** Cycle 1 = first render, but ledger entry says cycle 0.
**How to avoid:** Convention: **cycle 1** is the first agent-driven render+review pass; **cycle 0** does not exist. CONTEXT D-07 already says "if cycle == 2 AND prior had 0 genuine" — this confirms 1-indexed.

### Pitfall 4: Slide Renumbering Between Cycles Defeats SHA Diff

**What goes wrong:** Agent removes slide 3 in cycle 2 → cycle 2's `slide-04.jpg` is what was `slide-05.jpg` in cycle 1. SHA diff falsely flags every slide changed.
**How to avoid:** This is acceptable behavior — when slide structure shifts, full re-review is correct. SHA diff is a **performance optimization**, not a correctness requirement. If a structural shift triggers a full review, the cycle is still correct, just slightly more expensive. Document this in SKILL.md and `loop-primitives.js`.

### Pitfall 5: Soft-Cap AskUserQuestion Blocks CI

**What goes wrong:** A CI run hits cycle 5, AskUserQuestion never resolves, run hangs.
**How to avoid:** D-05 already specifies the standalone-mode fallback ("default to B accept"). Detect via `process.stdout.isTTY === false || process.env.CI === '1' || mode === 'standalone'` — log warning, exit cleanly. (Q-5 confirmation below.)

### Pitfall 6: `runReview` `slidesToReview` Filter Misinterpreted by Reviewer

**What goes wrong:** Reviewer (`runReview`) accepts `slidesToReview = [3, 7]` but the AGENT producing findings is unaware → still emits findings for slides 1, 2, 4, 5, 6, 8. The filter must operate at output, but ALSO the reviewer should not WASTE tokens reviewing skipped slides.
**How to avoid:** Two-layer enforcement — (1) the agent's review prompt is given `slidesToReview` to scope its work, and (2) `runReview` post-validates and trims any out-of-scope finding. See Q-1 below for the LOC delta.

### Pitfall 7: Annotation Step Fails on Zero Findings

**What goes wrong:** Clean convergence (zero findings of any severity) → `runAnnotate` called with empty findings → `annotate.js` throws or produces empty PPTX.
**How to avoid:** D-06 already addresses ("Empty findings → no annotated artifacts (skip cleanly)"). Researcher recommendation: **emit an empty annotated PPTX with a single 'No findings — clean convergence' marker slide** OR (simpler, recommended) skip both annotated artifacts and surface to user: "Clean convergence — no annotation overlay generated." Match Phase 2 `runAnnotate` behavior; check by writing one explicit test.

---

## Code Examples

### Example: appendLedger / readLedger

```js
// Source: pattern adapted from Phase 4 lib/render-rationale.js style
'use strict';
const fsp = require('node:fs/promises');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const LEDGER = 'refine-ledger.jsonl';

function ledgerPath(runDir) {
  return path.join(runDir, LEDGER);
}

async function appendLedger(runDir, entry) {
  if (!entry || typeof entry.cycle !== 'number') {
    throw new Error('appendLedger: entry.cycle (number) required');
  }
  const line = JSON.stringify(entry) + '\n';
  await fsp.appendFile(ledgerPath(runDir), line);
}

async function readLedger(runDir) {
  let raw;
  try { raw = await fsp.readFile(ledgerPath(runDir), 'utf8'); }
  catch (e) { if (e.code === 'ENOENT') return []; throw e; }
  const out = [];
  for (const ln of raw.split('\n')) {
    if (!ln) continue;
    try { out.push(JSON.parse(ln)); }
    catch { /* tolerate truncated final line per Pitfall 1 */ }
  }
  return out;
}

function checkInterrupt(runDir) {
  return fs.existsSync(path.join(runDir, '.interrupt'));
}

function issueSetHash(findings) {
  // findings: [{slideNum, text}, ...]   (already triaged + filtered to genuine)
  const norm = findings
    .map(f => `${f.slideNum}|${f.text.trim()}`)
    .sort()
    .join('\n');
  return 'sha1:' + crypto.createHash('sha1').update(norm).digest('hex');
}

module.exports = { appendLedger, readLedger, checkInterrupt, issueSetHash, ledgerPath };
```

### Example: detectOscillation (oscillation.js)

```js
'use strict';
// Per Pitfall 2: strict equality of unfixed-genuine sets across N and N-2.
function detectOscillation(ledger) {
  if (!Array.isArray(ledger) || ledger.length < 3) return false;
  const N = ledger[ledger.length - 1];
  const Nm2 = ledger[ledger.length - 3];
  if (!N || !Nm2) return false;
  if ((N.findings_genuine || 0) === 0) return false; // no oscillation if converged
  // Ledger does NOT store the genuine-finding text set explicitly; use issue_set_hash.
  // If hashes match across N and N-2 → identical genuine set → oscillation.
  return Boolean(N.issue_set_hash && N.issue_set_hash === Nm2.issue_set_hash);
}
module.exports = { detectOscillation };
```

### Example: runReview `slidesToReview` extension (Q-1 — additive, NON-BREAKING)

```js
// Source: skills/review/scripts/index.js, MODIFICATION
// Existing signature (lines 58-65):
//   async function runReview({ deckPath, runId, outDir, mode, findings, annotate } = {}) {
// New signature:
//   async function runReview({ deckPath, runId, outDir, mode, findings, annotate,
//                              slidesToReview = null } = {}) {

// Insert AFTER line 73 (after validate(findings); before resolving outputs):
if (slidesToReview != null) {
  if (!Array.isArray(slidesToReview) || slidesToReview.some(n => !Number.isInteger(n) || n < 1)) {
    throw new Error('runReview: slidesToReview must be array of positive integers or null');
  }
  const keep = new Set(slidesToReview);
  // Trim findings.slides to the in-scope slides; preserve schema otherwise.
  const filteredSlides = (findings.slides || []).filter(s => keep.has(s.slideNum));
  findings = { ...findings, slides: filteredSlides };
}
```

**LOC delta:** ~10 lines added, zero lines removed. Total signature delta: 1 named param with `null` default. Schema delta: zero. Findings JSON shape unchanged (Phase 1 `findings-schema.md` not modified). All existing callers (Phase 3 CLI, Phase 4 not-yet-calling, Phase 5 cycle 1) pass nothing → behavior identical.

---

## Q-1 — `runReview` `slidesToReview` Param: LOC + Non-Breaking Proof

**Confidence:** HIGH

**Answer:** Confirmed additive. ~10 LOC, single named param, `null` default = "review all slides" sentinel. Zero schema changes.

**Non-breaking proof:**

| Caller | Pre-Phase-5 invocation | Post-Phase-5 invocation | Behavior |
|--------|------------------------|--------------------------|----------|
| `skills/review/scripts/cli.js` | `runReview({deckPath, findings, mode:'standalone'})` | unchanged | identical (slidesToReview = null) |
| `tests/review-pipeline.test.js` (and ~85 other Phase 3 tests) | various, never pass `slidesToReview` | unchanged | identical |
| Phase 5 cycle 1 (NEW) | `runReview({..., slidesToReview: null})` | new | full review — same as legacy |
| Phase 5 cycle 2+ (NEW) | `runReview({..., slidesToReview: [3,7,9]})` | new | filtered review — desired |
| Phase 5 confirmation cycle (D-07) | `runReview({..., slidesToReview: null})` | new | full review (forced) |

**Schema:** `findings-schema.md` (Phase 1 contract) is **untouched**. The filter operates on the in-memory `findings.slides[]` array post-validation; output schema is identical (just fewer slide entries).

**Test plan delta:** New `tests/slides-to-review.test.js` — 4 subtests:
1. `slidesToReview = null` → all slides retained.
2. `slidesToReview = [1,3]` → only slides 1 and 3 retained; severity counts recomputed.
3. `slidesToReview = []` → no slides retained, `genuineCount = 0`.
4. Invalid input (non-array, negative int, float) → throws pinpoint error.

**Reviewer-prompt delta (D-08 finding triage agent):** When `slidesToReview` is a list, the agent that PRODUCES the findings (the LLM behind `runReview` in agent-driven mode) is told "review only slides [3,7,9]" via the prompt template — saving review tokens. This is a SKILL.md edit in `skills/review/SKILL.md`, not a code edit. Researcher recommends planner include a SKILL.md prose update as part of Plan-1 of Phase 5.

---

## Q-2 — JPG SHA Stability for D-03: EMPIRICAL ANSWER

**Confidence:** HIGH (verified by experiment in this session)

**Hypothesis:** JPG byte-SHA may vary across `pdftoppm` runs even on identical input due to compression metadata or timestamps.

**Empirical test (ran 2026-04-28 on macOS, soffice 7.x, poppler 22+):**

```
Input: tests/fixtures/v8-reference/Annotations_Sample.pptx (503,145 bytes)

Test A: Same PDF → 2× pdftoppm → JPG comparison
  s-1.jpg: BYTE-IDENTICAL
  s-2.jpg: BYTE-IDENTICAL
  s-3.jpg: BYTE-IDENTICAL  (and remaining slides identical)

Test B: Same PPTX → 2× soffice → 2× pdftoppm → JPG comparison
  s-1.jpg: BYTE-IDENTICAL
  s-2.jpg: BYTE-IDENTICAL
  s-3.jpg: BYTE-IDENTICAL
```

**Conclusion:** Both `pdftoppm` AND the `soffice → pdftoppm` chain are byte-deterministic on this stack. **No fallback to perceptual hashing or PNG conversion required.** Byte-SHA is a sound implementation of `slidesChangedSinceLastCycle`.

**Caveats / risks (LOW):**

- Tested on macOS only. CI is also macOS-equivalent (per repo Phase 3 work). If a Linux CI runner shows drift, the fallback (pHash via `sharp` or PNG) would need to be added — but Phase 5 ships as documented, no preemptive fallback.
- If a future LibreOffice or Poppler version introduces nondeterminism (e.g., embedded timestamps), the test will catch it: `tests/loop-primitives.test.js` should include a determinism guard ("render same fixture twice → assert SHAs equal"). Researcher recommends this test in plan.

**Recommendation to planner:** Use byte-SHA as specified in CONTEXT D-03. Add ONE smoke test that asserts determinism on a fixture. No fallback infrastructure required.

---

## Q-3 — Auto-Refine Integration Test Strategy

**Confidence:** HIGH

**Answer:** Mock `runReview` (and optionally `runCreate`) to return a deterministic scripted findings sequence per cycle. Assert ledger correctness, oscillation detection, convergence, interrupt, soft-cap routing — without invoking soffice/pdftoppm/pptxgenjs in the integration test.

**Why mock:**

- A real cycle = `runCreate` (~1.5s for soffice PDF) + `pptx-to-images.sh` (~3-5s) + `runReview` (multi-second LLM call). Five cycles ≈ 30-60s per test. Multiple scenarios (converged / oscillation / interrupted / soft-capped) × 30s = > 2 min. Untenable.
- Phase 3 already exposes the precedent: `_test_setRunAnnotate` (skills/review/scripts/index.js:55-56) lets the test inject a stub. Phase 5 mirrors this pattern.
- Phase 4 already exposes `_test_setSpawn` (skills/create/scripts/index.js:117) for the same reason.

**Test architecture:**

```js
// tests/auto-refine-integration.test.js (sketch)
const { _test_setRunReview } = require('skills/create/scripts/lib/loop-primitives');
const { _test_setSpawn } = require('skills/create/scripts');

// Scenario 1: Clean convergence (cycle 1 = 3 findings, cycle 2 = 0, cycle 3 = 0).
const scriptedFindings = [
  { cycle: 1, findings: { slides: [...], schema_version: '1.0' } /* 3 genuine */ },
  { cycle: 2, findings: { slides: [], schema_version: '1.0' } /* 0 genuine */ },
  { cycle: 3, findings: { slides: [], schema_version: '1.0' } /* 0 genuine — confirmation */ },
];

let cycleIdx = 0;
_test_setRunReview(async () => {
  const r = scriptedFindings[cycleIdx++];
  return { findingCounts: ..., genuineCount: ..., jsonPath: '/tmp/...', /* etc */ };
});

_test_setSpawn(async (cjsPath, opts) => {
  // Touch deck.pptx so runCreate's downstream checks pass
  await fsp.writeFile(path.join(opts.cwd, 'deck.pptx'), 'PK\x03\x04mock-pptx');
});

// Run the loop primitives + agent-stub harness; assert ledger has 3 entries
// with ended_via 'converged' on the last; no ascUserQuestion fired; no .interrupt observed.
```

**Scenarios to cover (5 scripted runs):**

| Scenario | Findings sequence | Expected ledger.ended_via | Cycles |
|----------|-------------------|---------------------------|--------|
| Clean converge after confirmation | [N, 0, 0] | `converged` | 3 |
| Cycle-1-clean forces confirmation | [0, 0] | `converged` (D-07) | 2 |
| Oscillation | [3-set-A, 3-set-B, 3-set-A] (hash repeats N == N-2) | `oscillation` | 3 |
| Interrupt | [N, then `.interrupt` flag created] | `interrupted` | 1 |
| Soft cap (CI mode) | [N, N, N, N, N] (5 cycles, no convergence) | `soft-cap-accepted` (CI default) | 5 |

**What's NOT in the integration test (and where it lives):**

- Real soffice / pdftoppm / pptxgenjs execution → already covered by Phase 3 + Phase 4 unit and integration suites.
- Real LLM-driven triage → out of scope for any automated test (it's the agent's runtime work).
- AskUserQuestion live UX → covered by SKILL.md prose review, not a code test (per Phase 5 D-05 standalone-fallback rule).

**Confirmation to CONTEXT Q-3:** YES — this scopes properly to the must-haves. Every CRT-07..CRT-14 success criterion is covered by primitive unit tests + the 5-scenario integration test + Phase 4's existing runCreate suite. End-to-end with real soffice is a manual smoke test (one happy-path run) before phase close.

---

## Q-4 — `findings.triaged.json` Location

**Confidence:** HIGH

**Answer:** Confirmed: TWO files per cycle.

```
<run-dir>/
  refine-ledger.jsonl
  cycle-1/
    slides/                       # JPGs from pptx-to-images.sh
    findings.json                 # raw runReview output (4-tier severity, no `genuine`)
    findings.triaged.json         # agent-augmented (per-finding `genuine` boolean added)
    render-deck.cjs.snapshot      # optional: copy of cjs at end of this cycle
  cycle-2/
    ...
  deck.pptx                       # final
  deck.pdf
  deck.annotated.pptx
  deck.annotated.pdf
  design-rationale.md
  render-deck.cjs                 # latest = final cycle's
```

**Schema delta for triaged file:** Same as `findings-schema.md` v1.0 PLUS each finding gains:

```json
{
  "id": "F-03",
  "genuine": true | false,
  "triage_rationale": "string — 1-2 sentence agent explanation"
}
```

`id` is needed for ledger `skipped_finding_ids[]` / `fixed_finding_ids[]` cross-reference (D-02). Researcher recommends: **stable ID = `${slideNum}-${md5(text)[0:8]}`** so the same finding produced in cycle 1 and reproduced in cycle 3 has the same ID — letting `skipped_finding_ids` thread across cycles correctly (Anti-Pattern: "re-fixing intentionally-skipped").

**Phase 1 schema impact:** Extension is fully additive — `id`, `genuine`, `triage_rationale` are optional in the base schema and required only in the `findings.triaged.json` variant. Researcher recommends planner add a `findings-triaged-schema.md` reference (sibling of `findings-schema.md`) documenting the additions.

---

## Q-5 — Soft-Cap AskUserQuestion in Standalone-Mode

**Confidence:** HIGH

**Answer:** D-05's proposed fallback ("default to B accept" with stderr warning) is acceptable for CI/standalone runs. **Detection rule** (more robust than D-05's prose):

```js
function isInteractive() {
  if (process.env.CI === '1' || process.env.CI === 'true') return false;
  if (process.env.NON_INTERACTIVE === '1') return false;
  if (mode === 'standalone' && !process.stdout.isTTY) return false;
  return true;
}
```

**Behavior matrix:**

| Context | At cycle 5 unconverged | Output |
|---------|------------------------|--------|
| Agent-mode (default) | AskUserQuestion (4 options) | route per response |
| `mode: 'standalone'`, TTY | AskUserQuestion via stdin prompt OR `--soft-cap=accept` flag | route per response |
| `mode: 'standalone'`, non-TTY | Default to ACCEPT | `ledger.ended_via = "soft-cap-accepted"`; stderr warning: `"Instadecks: cycle 5 reached without convergence; non-interactive mode → accepting current deck. Use --soft-cap=stop or interactive run for choice."` |
| `CI=1` | Default to ACCEPT | as above |

**CLI flag addition (Phase 5 standalone CLI gets):** `--soft-cap=<accept|stop|continue>` to override the default in non-interactive runs.

**Test:** `tests/auto-refine-integration.test.js` Scenario 5 sets `process.env.CI = '1'` and asserts ledger ends with `soft-cap-accepted` after cycle 5.

---

## Wave Decomposition (Researcher Recommendation)

> Planner is free to refine. This is a 4-plan / 3-wave decomposition optimized for Phase 5's primitives-first architecture and TDD precedent of Phase 3/4.

### Wave 0 (no plan) — Test infrastructure

Pre-existing `node --test` setup is sufficient. No new framework. Phase 5's tests just import primitives.

### Wave 1 — Primitives + `runReview` extension (parallel)

| Plan | Scope | Requirements | Notes |
|------|-------|--------------|-------|
| **05-01-PLAN — Loop primitives + ledger schema** | `lib/loop-primitives.js` (appendLedger, readLedger, checkInterrupt, slideImagesSha, slidesChangedSinceLastCycle, issueSetHash); `lib/oscillation.js` (detectOscillation); fixtures (`tests/fixtures/sample-ledger.jsonl`, `tests/fixtures/cycle-N-jpgs/`); tests `loop-primitives.test.js`, `oscillation.test.js`, `refine-ledger-schema.test.js` | CRT-09, CRT-11, CRT-12, CRT-13 (diff backbone) | Pure functions; no fs side effects beyond append/read; mirrors Phase 4 Plan 01 style |
| **05-02-PLAN — `runReview` `slidesToReview` extension + reviewer-prompt update** | `skills/review/scripts/index.js` (10-LOC additive); `skills/review/SKILL.md` prose update for "scoped review mode"; tests `slides-to-review.test.js` | CRT-13 (diff-only review) | NON-BREAKING — proven by Q-1; runs alongside Plan 05-01 |

### Wave 2 — Agent playbook + rationale plumbing

| Plan | Scope | Requirements | Notes |
|------|-------|--------------|-------|
| **05-03-PLAN — SKILL.md Auto-Refine Loop section + Reviewer-Notes population** | `skills/create/SKILL.md` (+~600 words: §Auto-Refine Loop with 13-step pseudocode covering D-01..D-08); `lib/render-rationale.js` modified — `reviewerNotes` arg now populated from final-cycle ledger summary (skipped findings list); `findings-triaged-schema.md` (new reference doc) | CRT-07, CRT-08, CRT-10, CRT-14 | Depends on Wave 1 (primitives must exist + be importable) |

### Wave 3 — Integration test + bundle assembly + standalone CLI

| Plan | Scope | Requirements | Notes |
|------|-------|--------------|-------|
| **05-04-PLAN — Integration test + standalone CLI soft-cap flag + bundle finalization** | `tests/auto-refine-integration.test.js` (5 scripted scenarios per Q-3); `skills/create/scripts/cli.js` modification (`--soft-cap` flag, non-interactive detection); end-of-loop `runAnnotate` invocation wired with appropriate findings (D-06 logic); manual smoke test doc; Phase 5 SUMMARY data | CRT-07..CRT-14 (end-to-end coverage) | Depends on Waves 1+2 |

**Total:** 4 plans across 3 waves. Wave 1 plans run in parallel; Waves 2 and 3 sequential.

**Why not 3 plans:** Combining 05-01 and 05-02 forces serial execution and entangles the `runReview` schema work with the create-side primitives — violates separation of concerns. The 4-plan split mirrors Phase 3's 5-plan / Phase 4's 4-plan precedent and keeps each plan ≤ ~3 hours.

**Why not 5 plans:** No primitive in this list justifies its own plan (every lib file is < 200 LOC). Splitting further would inflate ceremony.

---

## plugin-dev:skill-development Conformance Items (for SKILL.md auto-refine section)

> The user mandated reading `plugin-dev:skill-development`. The full SKILL.md is at `~/.claude/plugins/cache/claude-plugins-official/plugin-dev/3ffb4b4ca81f/skills/skill-development/SKILL.md`. Below are the items the planner MUST bake into Plan 05-03 (SKILL.md update). [VERIFIED: read in this session]

### Frontmatter requirements (existing `skills/create/SKILL.md` already mostly compliant — Phase 5 must NOT regress)

- [x] `name` present (`create`).
- [x] `description` present, third-person, ≤1024 chars (635 chars per 04-04-SUMMARY).
- [x] `version: 0.1.0`.
- [x] `allowed-tools` scoped (Bash(node:*), Bash(soffice:*), Bash(unzip:*), Bash(xmllint:*), Read, Write, WebFetch).
- [ ] **Phase 5 ADD:** `description` should mention "auto-refine loop" trigger phrase. The existing description ends with "Single-cycle in v0.1.0; Phase 5 ships auto-refine." → Plan 05-03 MUST update this line to remove the deferral language and add trigger phrases like "auto-refine deck", "iterate until clean", "convergence loop" (per skill-development "specific trigger phrases" rule).
- [ ] **Phase 5 ADD:** `description` length must remain ≤1024 chars after edit.

### Body requirements

- [ ] **Imperative/infinitive form** (verb-first instructions, NOT second person). The existing SKILL.md already uses imperative voice ("Generate a polished presentation deck...", "Read `references/design-ideas.md`..."). Plan 05-03's new §Auto-Refine Loop MUST follow:
  - ✅ "Check `${runDir}/.interrupt` — if present, finalize ledger, exit."
  - ❌ "You should check the .interrupt file before each cycle."
- [ ] **Lean target:** existing SKILL.md is 138 lines (~1,800 words estimated). plugin-dev recommends 1,500-2,000 words ideal, < 5,000 max. Phase 5 adds ~600 words (§Auto-Refine Loop). Total est. 2,400 words → still within `<5k`. **If body exceeds 3,000 words, planner MUST move detail to `references/auto-refine-playbook.md`** (progressive disclosure).
- [ ] **Reference resources explicitly:** any new reference file (e.g., `findings-triaged-schema.md`) MUST be cited in SKILL.md "See also" section.
- [ ] **No duplication:** detailed schema content goes to `references/findings-triaged-schema.md`, NOT inline in SKILL.md.
- [ ] **Working examples:** SKILL.md auto-refine section MUST include at least one concrete example of: (a) calling `appendLedger`, (b) the cycle-N pseudocode block, (c) the AskUserQuestion soft-cap prompt verbatim.

### "Locked invariants" section

The existing SKILL.md has a "Locked invariants (do not violate)" section (line 30-37). Plan 05-03 MUST append:

- "Convergence rule is `genuine_findings == 0 AND cycle ≥ 2`; cycle 1 with 0 forces one confirmation cycle (D-07)."
- "Oscillation = `issue_set_hash_N == issue_set_hash_{N-2} AND genuine_count_N > 0`; agent halts and surfaces ledger."
- "Soft cap at cycle 5 surfaces 4-option AskUserQuestion; never a hardcoded hard cap."
- "User interrupt is checked at TOP-OF-CYCLE only (D-04); no mid-cycle abort."

### Sniff-grep gates that already armed for SKILL.md (from Phase 4)

- [x] Hardcoded path lint (`tools/lint-paths.sh`) — Plan 05-03 must NOT introduce `/Users/`, `~/.claude/`, `/home/`, `C:\\` strings.
- [x] enum-lint anti-pattern markers — only used for documentation lines (existing precedent).

### Conformance Checklist (planner consumes verbatim into Plan 05-03)

- [ ] SKILL.md description updated, ≤1024 chars, mentions auto-refine triggers
- [ ] §"Auto-Refine Loop" added in imperative voice
- [ ] Locked invariants extended with 4 Phase-5 rules
- [ ] Working example: cycle-N pseudocode block
- [ ] Working example: AskUserQuestion verbatim text
- [ ] References: `references/findings-triaged-schema.md` cited in "See also"
- [ ] Total body ≤ 3,000 words; if exceeded, move detail to `references/auto-refine-playbook.md`
- [ ] No duplicated detail between SKILL.md and references/
- [ ] `tools/lint-paths.sh` green
- [ ] `npm run lint:enums` green (use `<!-- enum-lint-allow: anti-pattern doc -->` if quoting banned forms)

---

## Runtime State Inventory

> Phase 5 is greenfield code (new files + additive edits to two existing files). Not a rename or migration. **Section omitted** per researcher template ("Omit entirely for greenfield phases").

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node ≥ 18 | All primitives | ✓ (assumed — Phase 1+ requires it) | — | — |
| pptxgenjs 4.0.1 | Indirect (via `runCreate`) | ✓ pinned | 4.0.1 | — |
| soffice | Indirect (via `runCreate` + `pptx-to-images.sh`) | ✓ (per Phase 3 hardening) | system | soft-fail per P-08 |
| pdftoppm | Indirect (via `pptx-to-images.sh`) | ✓ | system | hard-fail per Phase 3 |
| **NEW for Phase 5** | (none) | — | — | — |

**No new dependencies introduced by Phase 5.** Pure additive Node code.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | `node --test` (built-in, Node ≥ 18) |
| Config file | none — auto-discover `tests/*.test.js` |
| Quick run command | `node --test tests/loop-primitives.test.js tests/oscillation.test.js tests/refine-ledger-schema.test.js tests/slides-to-review.test.js` |
| Full Phase 5 suite | `node --test tests/loop-primitives.test.js tests/oscillation.test.js tests/refine-ledger-schema.test.js tests/slides-to-review.test.js tests/auto-refine-integration.test.js` |
| Whole-repo gate | `node --test tests/*.test.js` (Phase 4 = 58 tests + Phase 3 ~85; Phase 5 adds ~25–30) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CRT-07 | Loop until reviewer reports zero genuine | integration (mocked) | `node --test tests/auto-refine-integration.test.js -- --test-name-pattern="clean converge"` | ❌ Wave 3 |
| CRT-08 | `genuine == 0 AND cycle ≥ 2` convergence | integration | `node --test tests/auto-refine-integration.test.js -- --test-name-pattern="confirmation cycle"` | ❌ Wave 3 |
| CRT-09 | Oscillation N⊆N-2 (researcher-refined: hash equality) | unit | `node --test tests/oscillation.test.js` | ❌ Wave 1 |
| CRT-10 | Soft cap @ cycle 5 with user override | integration | `node --test tests/auto-refine-integration.test.js -- --test-name-pattern="soft cap"` | ❌ Wave 3 |
| CRT-11 | User interrupt via `.interrupt` flag | unit + integration | `node --test tests/loop-primitives.test.js`, `node --test tests/auto-refine-integration.test.js -- --test-name-pattern="interrupt"` | ❌ Wave 1+3 |
| CRT-12 | Per-cycle ledger persisted | unit | `node --test tests/refine-ledger-schema.test.js` | ❌ Wave 1 |
| CRT-13 | Cycle 1 full / cycle 2+ diff-only | unit + integration | `node --test tests/slides-to-review.test.js`, `node --test tests/auto-refine-integration.test.js` | ❌ Wave 1+3 |
| CRT-14 | Full bundle (8 artifacts) | integration + manual smoke | `node --test tests/auto-refine-integration.test.js -- --test-name-pattern="bundle"` + manual run | ❌ Wave 3 |

### Sampling Rate

- **Per task commit:** quick subset for the lib being edited (`node --test tests/<lib>.test.js`).
- **Per wave merge:** full Phase 5 suite + `npm run lint:enums` + `bash tools/lint-paths.sh`.
- **Phase gate:** full repo test discovery green; manual end-to-end smoke (real soffice + real LLM, one cycle through Q3 enterprise expansion fixture); `tests/POWERPOINT-COMPATIBILITY.md` checklist remains a Phase 7 gate (not Phase 5).

### Wave 0 Gaps

- [ ] `tests/refine-ledger-schema.test.js` — covers CRT-12 (Wave 1)
- [ ] `tests/oscillation.test.js` — covers CRT-09 (Wave 1)
- [ ] `tests/loop-primitives.test.js` — covers CRT-11, CRT-13 unit slice (Wave 1)
- [ ] `tests/slides-to-review.test.js` — covers Q-1 NON-BREAKING + CRT-13 (Wave 1)
- [ ] `tests/auto-refine-integration.test.js` — covers CRT-07, CRT-08, CRT-10, CRT-11, CRT-13, CRT-14 (Wave 3, 5 scenarios per Q-3)
- [ ] `tests/fixtures/sample-ledger.jsonl` — fixture for ledger read tests
- [ ] `tests/fixtures/cycle-jpgs/` — fixture pairs (identical / one-changed) for slide-diff test
- [ ] No framework install required (built-in `node --test`).

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | N/A — local CLI tool |
| V3 Session Management | no | N/A |
| V4 Access Control | no | filesystem-only; runs in user context |
| V5 Input Validation | yes | `validateBrief` (Phase 4), `findings-schema.md` validator (Phase 1), new `slidesToReview` validator (Q-1) |
| V6 Cryptography | partial | SHA-1 / SHA-256 used for hashing only (NOT auth); built-in `node:crypto`; never hand-rolled |
| V12 Files & Resources | yes | run-dir paths via `${CLAUDE_PLUGIN_ROOT}` / `${CLAUDE_PLUGIN_DATA}`; lint-paths gate |

### Known Threat Patterns for Auto-Refine Loop

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Path traversal via `runId` | Tampering | `runId` regex-validated `/^[\w-]+$/` (Phase 3 precedent); `path.resolve` guarded against `..` |
| `.interrupt` outside run-dir | Tampering | `checkInterrupt(runDir)` only checks `path.join(runDir, '.interrupt')`, never accepts user-supplied path |
| Ledger JSON injection (malicious finding text breaking JSONL) | Tampering | `JSON.stringify` on append; `JSON.parse` per-line on read; truncated-line tolerance (Pitfall 1) |
| Untrusted `findings.json` from compromised reviewer | Tampering | `validate(findings)` enforces schema; D-08 triage adds `genuine` field, agent reads slide image to confirm |
| Resource exhaustion (unbounded cycles burning tokens) | DoS | Soft cap @ 5 (D-05); user interrupt (D-04); ledger inspectable mid-run |
| Race on ledger across crashes | Data integrity | Append-only JSONL = atomic per line on POSIX |
| `slidesToReview` containing malicious indices | Tampering | New validator: array of positive integers only (Q-1 LOC) |

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hard-cap N cycles | Soft cap with user override | Decided Phase 0 (PROJECT.md) | "no fixed cap" satisfied |
| Reviewer mutates findings with `genuine` | Agent writes separate `findings.triaged.json` | D-08 (this phase) | Phase 1 schema unchanged |
| Diff via PNG/perceptual hash | Direct JPG byte-SHA | Q-2 empirical (this research) | -1 dep, simpler code |
| Mid-cycle interrupt | Top-of-cycle only | D-04 (this phase) | Always-coherent artifacts |
| In-process integration testing with real soffice | Mocked `runReview` per Phase 3 D-04 precedent | Q-3 (this research) | 30s → < 1s per scenario |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `process.stdout.isTTY` reliably distinguishes interactive from CI on macOS + Linux Claude Code | Q-5 | False-negative blocks CI; mitigation = `CI=1` env var override |
| A2 | Plugin-dev SKILL.md cached at `~/.claude/plugins/cache/claude-plugins-official/plugin-dev/3ffb4b4ca81f/...` is the user's intended canonical (multiple cache versions exist) | plugin-dev section | Conformance items minor differences; checked both `unknown/` and `3ffb4b4ca81f/` versions — content is identical |
| A3 | Linux CI byte-determinism for pdftoppm matches macOS empirical result | Q-2 | Adds need for pHash fallback; mitigation = determinism smoke test in suite catches regression early |
| A4 | Ledger `issue_set_hash` = SHA-1 of sorted (slideNum + finding_text) is sufficient for oscillation detection (no need to canonicalize whitespace, etc.) | Pattern 2 / Q-3 | False-negative (missed oscillation) wastes a cycle but ledger is still inspectable; acceptable |

**Items needing user/planner confirmation:** None blocking. A2 is verified; A1, A3, A4 are LOW-risk assumptions with documented mitigations.

---

## Open Questions

None blocking. All five CONTEXT Q-1..Q-5 have empirical or verified-pattern answers above.

**Optional follow-ups for Phase 5 SUMMARY** (not blocking the planner):
1. Should `findings.triaged.json` schema get its own JSON-schema file in `tests/fixtures/`? Researcher recommendation: YES, mirroring Phase 1 fixture pattern, but it can wait until Plan 05-03.
2. Should the manual smoke test document a canonical fixture brief for Phase 5? Researcher recommendation: REUSE `tests/fixtures/sample-brief.json` (Q3 enterprise expansion) — already exercised by Phase 4 integration test.

---

## Sources

### Primary (HIGH confidence — read in this session)

- `/Users/shafqat/Documents/Projects/instadecks/.planning/phases/05-instadecks-create-auto-refine/05-CONTEXT.md` — D-01..D-08 + Q-1..Q-5
- `/Users/shafqat/Documents/Projects/instadecks/.planning/ROADMAP.md` — CRT-07..CRT-14 + SC#1-5
- `/Users/shafqat/Documents/Projects/instadecks/CLAUDE.md` — convergence/oscillation invariants
- `/Users/shafqat/Documents/Projects/instadecks/.planning/PROJECT.md` — "no fixed cap" constraint
- `/Users/shafqat/Documents/Projects/instadecks/skills/create/SKILL.md` — Phase 4 baseline (138 lines)
- `/Users/shafqat/Documents/Projects/instadecks/skills/create/scripts/index.js` — `runCreate` shape (D-08 loop-ready)
- `/Users/shafqat/Documents/Projects/instadecks/skills/review/scripts/index.js` — `runReview` (Q-1 extension target; `_test_setRunAnnotate` precedent)
- `/Users/shafqat/Documents/Projects/instadecks/skills/annotate/scripts/index.js` — `runAnnotate` (D-06 final-bundle step)
- `/Users/shafqat/Documents/Projects/instadecks/scripts/pptx-to-images.sh` — race-hardened (RVW-09/10/11)
- `/Users/shafqat/.claude/plugins/cache/claude-plugins-official/plugin-dev/3ffb4b4ca81f/skills/skill-development/SKILL.md` — plugin-dev conformance source
- `/Users/shafqat/Documents/Projects/instadecks/.planning/phases/04-instadecks-create-scaffold/04-04-SUMMARY.md` — Phase 4 close, 58/58 tests
- `/Users/shafqat/Documents/Projects/instadecks/.planning/research/SUMMARY.md` — convergence rule LOCKED, soft-cap rationale
- `/Users/shafqat/Documents/Projects/instadecks/skills/create/scripts/lib/render-rationale.js` — modification target for Reviewer-Notes population

### Secondary (verified empirically in this session)

- Q-2 JPG SHA stability test: TWO `pdftoppm` runs on same PDF + TWO `soffice` runs on same PPTX → ALL slides byte-identical (Annotations_Sample.pptx, 503KB). Verified 2026-04-28.

### Tertiary (LOW confidence, not relied upon)

- None.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new deps, primitives use Node built-ins; mirrors Phase 3/4 style verbatim
- Architecture (D-01 agent-owned loop with code primitives): HIGH — direct precedent in Phase 3 D-02 hybrid pattern
- Q-1 (slidesToReview LOC + non-breaking): HIGH — code inspection of `runReview` confirms additive
- Q-2 (JPG SHA stability): HIGH — empirically verified in this session
- Q-3 (mocked integration test strategy): HIGH — direct mirror of `_test_setRunAnnotate` precedent at skills/review/scripts/index.js:55-56
- Q-4 (findings.triaged.json location): HIGH — clean two-file split
- Q-5 (soft-cap CI fallback): HIGH — TTY/CI detection is standard
- plugin-dev conformance: HIGH — read SKILL.md authoritative source in this session

**Research date:** 2026-04-28
**Valid until:** 2026-05-28 (30 days; stack stable, no new deps, anchored in pre-existing primitives)
