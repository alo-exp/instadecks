# Phase 2: `/instadecks:annotate` — Research

**Researched:** 2026-04-28
**Domain:** Node + pptxgenjs annotation overlay; Claude Code plugin packaging; in-memory adapter contract
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01 (run dir):** Each invocation uses `.planning/instadecks/<run-id>/`.
- **D-02 (run-id format):** `YYYYMMDD-HHMMSS-<6hex>` (e.g. `20260428-101530-a1b2c3`).
- **D-03 (project-relative output path):** Sibling-of-input — `<deck>.annotated.pptx` and `<deck>.annotated.pdf` next to the input deck.
- **D-04 (overwrite policy):** Sibling outputs are silently overwritten. No `--force`, no run-id suffix on collision. Each prior run remains archived inside its own `.planning/instadecks/<run-id>/`.
- **D-05 (run-dir contents):** temp slide-image working tree (with `slide-NN.jpg` symlinks per ANNO-07), run-local copies of annotated PPTX/PDF, soffice/pdftoppm logs, and the resolved findings JSON.

### Claude's Discretion (LOCKED — binding for downstream agents)

- **D-06 (pipelined handoff):** Phase 2 exports `runAnnotate({ deckPath, findings, outDir, runId })` from `skills/annotate/scripts/index.js`. `/review` (Phase 3) imports and calls this directly with an in-memory findings array — no JSON file roundtrip. Standalone CLI = thin wrapper that reads JSON from disk and forwards.
- **D-07 (adapter error handling):** Fail-loud on malformed/schema-mismatched findings. Validate `schema_version`, required fields, value ranges up front. On failure, throw a structured error pinpointing the offending finding (slide index, annotation index, field name, observed vs expected). No silent skip, no partial output.
- **D-08 (soffice in Phase 2):** Pre-apply `-env:UserInstallation=file:///tmp/lo-${SESSION_ID}-${PID}` per-call as a one-line addition. Full hardening (file checks, retry, cleanup trap) defers to Phase 3.

### Deferred Ideas (OUT OF SCOPE)

- Full soffice/pdftoppm hardening (file-existence + size checks, 60s timeout + 1 retry, cleanup trap on exit) — Phase 3 (RVW-09/10/11).
- Activation-rate testing (≥ 8/10 prompt panel) — Phase 7 (DIST-02).
- `allowed-tools` scoping for `default` / `dontAsk` permission modes — Phase 7 (DIST-03).
- Stress-test fixtures (8 annotations / max overflow) — v1.x.
- Windows path-detection in image pipeline — v1.x.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ANNO-01 | Slash-skill invocable; ≥ 8/10 activation (Phase 7 finalizes tuning) | Q8: imperative-keyword-front-loaded description pattern locked here |
| ANNO-02 | annotate.js bundled VERBATIM; SHA-pinned in `tests/annotate-integrity.test.js` | Q1: post-patch SHA recipe; integrity test unsuspend |
| ANNO-03 | One-line require-path patch only; algorithm unchanged | Q1: exact line 6 diff |
| ANNO-04 | SAMPLES extracted to `samples.js` so geometry stays unmodified | Q2: module shape `{ SAMPLES }` matches Phase 1 fixture |
| ANNO-05 | 4→3 severity collapse at adapter only | Q3: collapse table from findings-schema.md §5 |
| ANNO-06 | Adapter filters `genuine == true` | Q3: filter-then-collapse-then-validate ordering |
| ANNO-07 | Slide-image symlink approach `slide-NN.jpg` → satisfies hardcoded image-name | Q4: pptxgenjs uses extension from filename; symlink target MUST be JPEG bytes |
| ANNO-08 | PPTX overlay AND PDF; written to run dir + project-relative path | Q5: pptxgenjs writeFile + soffice headless convert-to pdf |
| ANNO-09 | Standalone-invocable mode | Q6: thin CLI wrapper around runAnnotate |
| ANNO-10 | Pipelined invocation mode (in-memory) | Q6: runAnnotate({deckPath, findings, outDir, runId}) → returns paths object |
| ANNO-11 | Visual-regression: byte-identical PPTX vs v8 ref OR pixel-diff < 0.5% | Q7: Tier 1 SHA, Tier 2 pixelmatch (already devDep) |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- `annotate.js` is a SHA-pinned binary asset. ONLY the documented one-line require-path patch is permitted. Geometry, polygon math, charPts, color/transparency, miter-join, layout constants, MAX_SIDE: VERBATIM.
- pptxgenjs `4.0.1` exact pin; lockfile committed.
- All paths via `${CLAUDE_PLUGIN_ROOT}` / `${CLAUDE_PLUGIN_DATA}` — `tools/lint-paths.sh` enforces. Use `# lint-allow:hardcoded-path` only with justification.
- 4→3 severity collapse happens at the `/annotate` adapter only. Reviewers keep full 4-tier vocabulary.
- Test runner: `node --test`. Commit format: HEREDOC + `<type>(02-NN): <message>` + Co-Authored-By line.
- Silver Bullet enforcement is non-skippable (memory: feedback_silver_bullet_strict.md). Every plan ends with formal `/artifact-reviewer review-research`, `plan-checker`, `code-reviewer`, `gsd-verifier` gates with 2-consecutive-clean.

## Summary

Phase 2 is a low-novelty, high-precision packaging task: copy a verbatim 514-line file with a single one-line patch, extract its sample data into a sibling module, build a small adapter (severity collapse + genuine-filter + schema validation), wire two entry-points (in-memory + CLI), and prove visual parity against Phase 1 baselines. Every architectural unknown has been answered by CONTEXT.md (D-01..D-08) and the locked findings-schema. The research below resolves the remaining mechanical questions: the exact require-path patch, the JPEG-bytes symlink constraint (a real trap — pptxgenjs extension-sniffs by filename, and Phase 1 baselines are PNG), the soffice PDF invocation incantation, and the test inventory.

**Primary recommendation:** Implement in 4 plans (waved for serialization where geometry depends on prior commits): (1) verbatim copy + patch + integrity-test unsuspend; (2) samples.js + adapter + adapter unit tests; (3) runAnnotate entry-point + CLI wrapper + symlink/soffice integration + sibling-output resolution; (4) visual-regression integration test. Plan 1 must land before any other plan touches `annotate.js`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Verbatim PPTX rendering (geometry, polygons) | Skill script (`annotate.js`) | — | Locked binary asset; never the agent's concern |
| JSON schema validation + severity collapse + genuine filter | Skill script (`adapter.js`) | — | Pure-Node, deterministic, unit-testable |
| In-memory entry point (`runAnnotate`) | Skill script (`index.js`) | Standalone CLI wrapper (`bin/annotate.js`) | Library + thin shell — Phase 3 imports the same export |
| Slide image extraction (PPTX → PNG/JPG per slide) | System tools (`soffice`, `pdftoppm`) invoked from skill | — | Phase 2 only invokes; Phase 3 hardens |
| Annotated PDF generation | System tool (`soffice`) on the annotated PPTX | — | One headless convert-to call |
| Slide-image filename mapping | Symlink in temp working dir | — | Keeps `annotate.js`'s hardcoded `v8s-NN.jpg` unchanged |
| Visual-regression assertion | `tests/*.test.js` via `node --test` | `pixelmatch` + `pngjs` (devDeps) | Byte-identical Tier 1 → pixel-diff Tier 2 fallback |
| Activation prompt-panel testing | Out-of-scope (Phase 7 / DIST-02) | — | Phase 2 only lands the description string |

## Standard Stack

### Core (already pinned in Phase 1)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `pptxgenjs` | 4.0.1 (exact) | PPTX rendering engine | [VERIFIED: package.json:18] Locked Phase 1 invariant; calibration baseline for `annotate.js` |
| `node` runtime | ≥ 18 (CI uses 20; user's machine v25.6.0) | Test runner + script host | [VERIFIED: package.json engines, ci.yml line 19] |

### Supporting (already devDeps; Phase 2 wires usage)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `pixelmatch` | ^5.3.0 | Pixel-diff visual regression | [VERIFIED: package.json:23] Tier 2 assertion when bytes differ |
| `pngjs` | ^7.0.0 | PNG decoding for pixelmatch | [VERIFIED: package.json:24] Pair with pixelmatch |
| `node:test` | built-in | Test runner | Phase 1 convention |
| `node:crypto` | built-in | SHA-256 for integrity test | Already used in Phase 1 stub |

**No new dependencies.** Phase 2 ships zero new entries to `package.json`. Verified by reading `package.json:14-26`.

### System tools (Phase 1 SessionStart hook checks)

| Tool | Version | Purpose |
|------|---------|---------|
| `soffice` (LibreOffice) | ≥ 7.4 (user has 26.2.2.2) | PPTX → PDF conversion for annotated output (ANNO-08) |
| `pdftoppm` (Poppler) | ≥ 22 (user has 26.02.0) | Phase 3+ — NOT needed in Phase 2 (slide images come from Phase 1 fixtures, not from extracting the deck) |

[VERIFIED: `soffice --version` and `pdftoppm -v` ran successfully in research session]

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `pixelmatch`+`pngjs` | `looks-same`, `resemblejs` | Both heavier; `pixelmatch` already in lockfile |
| Symlink approach for slide images | Hardlink, copy | Symlink is cheapest (no I/O) and survives readdir; copy works on Windows but Phase 2 is macOS/Linux only per v1 |
| Spawning `node annotate.js` as subprocess | `require()` annotate.js directly | Subprocess preserves the verbatim file's `main()` self-invocation BUT prevents in-memory pipelining. **Recommendation:** require it but suppress its `main()` call. See Q1 below. |

**Version verification:** `npm view pptxgenjs version` → `4.0.1` is current as of research date. `tools/assert-pptxgenjs-pin.js` (Phase 1) gates this.

## Architecture Patterns

### System Architecture Diagram

```
┌────────────────────┐     in-memory findings array
│ /review (Phase 3)  │──────────────────────────────────┐
└────────────────────┘                                  │
                                                        ▼
┌────────────────────┐    fs.readFile + JSON.parse  ┌─────────────────────────────┐
│ CLI: bin/annotate  │──────────────────────────────▶│  runAnnotate(               │
│ (thin wrapper)     │                              │    deckPath, findings,      │
└────────────────────┘                              │    outDir, runId            │
        ▲                                           │  ): { pptxPath, pdfPath,    │
        │                                           │       runDir }              │
        │ user invokes                              └──────────┬──────────────────┘
        │ /instadecks:annotate                                 │
        │                                                      ▼
        │                                          ┌──────────────────────────┐
        │                                          │ adapter.adaptFindings(   │
        │                                          │   findings              │ → throws on schema mismatch
        │                                          │ ): SAMPLES_3tier        │ → filters genuine==true
        │                                          └──────────┬──────────────┘
        │                                                     │
        │                                                     ▼
        │                                          ┌──────────────────────────┐
        │                                          │ runAnnotate prepares     │
        │                                          │   .planning/instadecks/  │
        │                                          │     <run-id>/            │
        │                                          │   - findings.json        │
        │                                          │   - slides/slide-NN.jpg  │
        │                                          │     (symlinked)          │
        │                                          │   - copy of annotate.js  │
        │                                          │     in cwd-target dir    │
        │                                          └──────────┬──────────────┘
        │                                                     │
        │                                                     ▼
        │                                          ┌──────────────────────────┐
        │                                          │ require('./annotate')    │
        │                                          │ + override SAMPLES via   │
        │                                          │ samples.js export        │
        │                                          │ → writes Annotations_*   │
        │                                          │   .pptx                  │
        │                                          └──────────┬──────────────┘
        │                                                     │
        │                                                     ▼
        │                                          ┌──────────────────────────┐
        │                                          │ soffice --headless       │
        │                                          │   --convert-to pdf       │
        │                                          │   -env:UserInstallation= │
        │                                          │     file:///tmp/lo-…     │
        │                                          │ → annotated.pdf          │
        │                                          └──────────┬──────────────┘
        │                                                     │
        │                                                     ▼
        │                                          ┌──────────────────────────┐
        │                                          │ Copy outputs sibling-of- │
        │                                          │ input (D-03) and return  │
        │                                          │ paths to caller          │
        └──────────────────────────────────────────└──────────────────────────┘
```

### Recommended Project Structure

```
skills/annotate/
├── SKILL.md                      # imperative-voice description (ANNO-01)
└── scripts/
    ├── annotate.js               # VERBATIM v8 + 1-line patch (ANNO-02/03)
    ├── samples.js                # extracted SAMPLES + setSamples() override (ANNO-04)
    ├── adapter.js                # validate + filter genuine + collapse 4→3 (ANNO-05/06)
    ├── index.js                  # exports runAnnotate(...)            (ANNO-10)
    ├── bin/
    │   └── annotate.js           # thin CLI: argv → JSON read → runAnnotate (ANNO-09)
    └── lib/
        ├── run-id.js             # YYYYMMDD-HHMMSS-<6hex> generator (D-02)
        ├── slide-images.js       # symlink-or-copy slide-NN.jpg (ANNO-07)
        └── pdf-convert.js        # soffice --convert-to pdf with -env: flag (D-08)

tests/
├── annotate-integrity.test.js    # unsuspend; post-patch SHA pin (ANNO-02)
├── annotate-adapter.test.js      # unit: validation, severity collapse, genuine filter (ANNO-05/06; D-07)
├── annotate-runid.test.js        # unit: run-id format (D-02)
├── annotate-output-paths.test.js # unit: sibling-of-input resolution (D-03/D-04)
├── annotate-pipelined.test.js    # in-memory runAnnotate call shape (ANNO-10)
├── annotate-cli.test.js          # CLI wrapper read-from-disk equivalence (ANNO-09)
└── annotate-visual-regression.test.js  # Tier 1 SHA + Tier 2 pixelmatch (ANNO-11)
```

### Pattern 1: VERBATIM file with override-export shim

**What:** annotate.js stays verbatim. samples.js exports `{ SAMPLES, setSamples }`. Phase 2's adapter calls `setSamples(adaptFindings(jsonFindings))` BEFORE annotate.js's `main()` reads `SAMPLES`. The require-path patch + samples-extraction is the entire diff.

**When:** Whenever runtime-driven data must replace a hardcoded array but the hosting file is locked.

**Why:** Avoids `eval`, monkey-patching, or rewriting `main()`. The closure that reads `SAMPLES` reads the live module-level binding.

### Pattern 2: In-memory + CLI dual-entry

**What:** `index.js` exports `runAnnotate(opts)`. `bin/annotate.js` is `require('../index').runAnnotate(JSON.parse(fs.readFileSync(argv[2], 'utf8')), …)`. No business logic in the CLI.

**When:** Skill must be both standalone AND pipelinable from a sibling skill (D-06).

### Anti-Patterns to Avoid

- **Calling `node annotate.js` as a subprocess from index.js:** breaks the in-memory contract and makes the CLI 2-hop. Use `require()` instead, suppress main() with the patch, then call build-fn directly.
- **Mutating annotate.js to accept SAMPLES as a parameter:** violates verbatim invariant; CI integrity test catches.
- **Symlinking PNG bytes to `.jpg` filenames:** pptxgenjs determines image extension from filename and embeds with that extension — produces a corrupt PPTX. See Pitfall P-04.
- **Reading the schema definition from code:** schema is a markdown reference (`skills/review/references/findings-schema.md`); the adapter validates against constants extracted from it once, NOT by parsing the markdown.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PNG decoding for pixel diff | Custom decoder | `pngjs` (devDep) | Already pinned; pixelmatch input requirement |
| Pixel diff | Custom RGBA compare | `pixelmatch` (devDep) | Antialias-tolerant, threshold-tunable |
| PPTX → PDF | Anything except soffice | `soffice --headless --convert-to pdf` | Locked toolchain choice from Phase 1 |
| SHA-256 | External hashlib | `node:crypto` createHash | Already used in Phase 1 stub |
| Schema validation library | `ajv` / `joi` / `zod` | Hand-rolled fail-loud assertion table | D-07 wants pinpoint errors with field+slide+annotation index; small ad-hoc validator is clearer than configuring ajv to produce that error shape; no new dep |
| Run-id timestamp | `uuid` | Built-in `Date` + `crypto.randomBytes(3).toString('hex')` | D-02 format is custom; uuid's v4 doesn't match |

**Key insight:** Phase 2 adds **no** new runtime deps. Every "hard" library it might want is already in the lockfile or a Node built-in.

## Common Pitfalls

### P-01: PNG-as-JPG symlink corrupts the output PPTX
**What goes wrong:** Phase 1 staged `tests/fixtures/v8-reference/v8s-NN.png` (per `tests/fixtures/v8-reference/` listing — confirmed via `ls`). annotate.js loads `v8s-NN.jpg`. Naive symlink `slide-NN.jpg → v8s-NN.png` makes pptxgenjs pack PNG bytes with `extn: 'jpg'` (line 2672 of pptxgen.cjs.js: `props.path.split('.').pop()`). PowerPoint and LibreOffice both reject the resulting PPTX or render a broken icon. **The visual-regression baseline cannot be re-rendered against this fixture as-is.**
**Why it happens:** pptxgenjs sniffs by filename, not by magic bytes (verified — `dist/pptxgen.cjs.js:2672`).
**How to avoid:** Either (a) **re-render Phase 1 baselines as JPEG** before Phase 2 begins (a Phase 1 amendment), or (b) Phase 2 plan inserts a build step that converts PNG→JPEG once into the temp working dir before annotate.js runs. Recommend (b) — Phase 1 is closed and PNG was a Phase 1 choice. Use `soffice --headless` to re-rasterize to JPEG, OR ship a tiny helper using `sharp` (NEW DEP — avoid), OR use ImageMagick `convert` from system. **Cleanest:** since the v8 source-of-truth tree at `/Users/shafqat/Documents/Projects/Sourcevo/v5-blue-prestige/` may already have `v8s-NN.jpg` originals, Phase 2 should locate those and add `.jpg` baselines under `tests/fixtures/v8-reference/`. Confirm in Plan 1.
**Warning signs:** PPTX file size differs by < 100 bytes vs reference but PowerPoint shows broken-image icon; or `unzip -l` on the PPTX shows `media/image1.jpg` but `file media/image1.jpg` reports PNG.

### P-02: `require(annotate.js)` runs `main()` as a side effect
**What goes wrong:** annotate.js line 513: `main().catch(err => { console.error(err); process.exit(1); });` fires at module load. A top-level `require('./annotate')` in `runAnnotate` will write a PPTX **using the un-overridden SAMPLES** before the adapter has a chance to inject runtime data, then `process.exit(1)` if anything throws — killing the host agent.
**Why it happens:** Self-invoking script written for direct `node annotate.js` use.
**How to avoid:** Two options:
  - **Option A (preferred — preserves verbatim main()):** Wrap the bottom-of-file invocation in `if (require.main === module) main().catch(...)`. **This is a SECOND line change** beyond the require-path patch — needs Plan 1 to declare both lines as the documented patch in commits + SHA pin + integrity-test comment update. CLAUDE.md says "the ONLY permitted modification is the documented one-line require-path patch." → **Decision needed (Open Question O-1).**
  - **Option B (verbatim-strict):** Keep main() self-invocation; have `runAnnotate` set up cwd + symlinks + samples.js override **before** `require()`, so when main() runs it produces the correct annotated PPTX in the run dir. Then `runAnnotate` waits for the file to land and copies it sibling-of-input. Side effects (`console.log("✓ Written:")` and the pres.writeFile promise) are observed via the file appearing on disk. **Cleaner test isolation, fewer integrity questions.** **Recommend B.**
**Warning signs:** Tests print "✓ Written: …" twice; run-dir contains an extra `Annotations_Sample.pptx` from a stray import.

### P-03: `__dirname` in annotate.js resolves to the run-dir, not the skill dir
**What goes wrong:** annotate.js uses `path.join(__dirname, '..', 'node_modules', 'pptxgenjs')` (line 6) AND `path.join(__dirname, ...)` for the image path (line 450) AND for the output PPTX path (line 508). `__dirname` is the directory containing the running annotate.js file. Under Option B above, `runAnnotate` symlinks/copies annotate.js into the run-dir's working tree → `__dirname` becomes `.planning/instadecks/<run-id>/work/`. Image lookup expects `<run-id>/work/v8s-NN.jpg` which is correct because we symlink there. Output `Annotations_Sample.pptx` lands in `<run-id>/work/` which is also correct (then runAnnotate copies sibling-of-input).
**Why it happens:** `__dirname` is bound at runtime to the actual file location. **This is the trick that makes the symlink approach work without editing annotate.js.**
**How to avoid:** When implementing the require-path patch, the patch must change `path.join(__dirname, '..', 'node_modules', 'pptxgenjs')` → something that resolves to `${CLAUDE_PLUGIN_DATA}/node_modules/pptxgenjs`. **Recommended exact patch (single line):**
```js
// BEFORE (line 6):
const PptxGenJS = require(path.join(__dirname, '..', 'node_modules', 'pptxgenjs'));
// AFTER:
const PptxGenJS = require(process.env.PPTXGENJS_PATH || 'pptxgenjs');
```
The skill body sets `process.env.PPTXGENJS_PATH = path.join(process.env.CLAUDE_PLUGIN_DATA, 'node_modules', 'pptxgenjs')` before `require('./annotate')`. Falls back to plain bareword `'pptxgenjs'` resolution when running from the plugin tree (covers the integrity test running `node tests/...test.js` from project root with node_modules present). One line, one require, no algorithm change. SHA-pinned post-patch.
**Alternative one-liner:** set `module.paths.push(...)` in the skill body before require. Doesn't require editing annotate.js at all — but then there's *no* require-path patch, contradicting CONTEXT.md and CLAUDE.md which both reference "the documented one-line require-path patch" as a fixed expectation. Stick with the env-var indirection.
**Warning signs:** `Cannot find module 'pptxgenjs'` at runtime; `npm ci` populated node_modules in `${CLAUDE_PLUGIN_DATA}` but require resolved against project root.

### P-04: soffice user-profile collision under concurrent invocation
**What goes wrong:** Two concurrent `soffice --convert-to pdf` calls write to the same default user profile and one silently fails (returns 0 with no PDF, or hangs).
**How to avoid:** D-08 — pre-apply `-env:UserInstallation=file:///tmp/lo-${SESSION_ID}-${PID}` per call. Phase 2 implements only the flag; Phase 3 adds the cleanup trap + retry + size-check.
**Warning signs:** "Source file could not be loaded" without further detail; .pdf size is 0 bytes.

### P-05: Sibling output path collision when input is already `.annotated.pptx`
**What goes wrong:** User runs `/annotate deck.annotated.pptx findings.json` (re-run on a previously annotated deck). Output path becomes `deck.annotated.annotated.pptx`. Mostly harmless, but ugly and breaks predictability.
**How to avoid:** In `lib/output-paths.js`, strip a trailing `.annotated` from the basename before appending: `basename = basename.replace(/\.annotated$/, '')`. Document and unit-test.
**Warning signs:** Test fixture file naming creep across runs.

### P-06: macOS case-insensitive filesystem masks symlink case mismatch
**What goes wrong:** Symlink `slide-07.JPG` vs `v8s-07.jpg` works on macOS (case-insensitive HFS/APFS default) but fails on CI's case-sensitive Ubuntu filesystem.
**How to avoid:** Always use lowercase `.jpg` on both sides. Add an explicit assertion in `lib/slide-images.js` that the symlink target's basename matches `/^v8s-\d{2}\.jpg$/`.
**Warning signs:** CI green on Mac, red on Ubuntu (or vice versa); ENOENT only inside soffice render.

### P-07: pptxgenjs version drift between dev and CI
**What goes wrong:** Local `node_modules` has 4.0.1, CI fetches 4.0.x via caret. Phase 1 already prevents this via `tools/assert-pptxgenjs-pin.js` — but Phase 2 must not bypass it (e.g., by introducing a `pptxgenjs@^4` peer-dep or using `npx pptxgenjs` from a different version).
**How to avoid:** Don't add new dependencies. The Phase 1 gate (Gate 3 in ci.yml) is the safety net.

### P-08: Integrity test uses pre-patch SHA after Phase 2 lands the patch
**What goes wrong:** Phase 1 baked `c21aa66dc7e6563d425cd4739a31a68693e6d4a386e9605a7b91f1bde99d239e` (PRE-PATCH) into `tests/fixtures/v8-reference/annotate.js.sha256`. After Plan 1 applies the patch, the SHA changes; if the file isn't updated atomically with the patch, integrity test fails on every CI run.
**How to avoid:** Plan 1 single commit must (a) copy file verbatim; (b) apply the one-line patch (and possibly the require.main guard if Option A from P-02 is chosen); (c) compute new SHA via `shasum -a 256 skills/annotate/scripts/annotate.js`; (d) replace `tests/fixtures/v8-reference/annotate.js.sha256` with the new value; (e) update banner in that file from `# PRE-PATCH SHA` → `# POST-PATCH SHA (require-path patched)`; (f) remove `skip: …` from `tests/annotate-integrity.test.js`. All in one commit so CI never sees a half-state.

### P-09: `genuine == false` filter applied AFTER schema validation fails on `genuine: false` entries with otherwise-valid fields
**What goes wrong:** sample-findings.json includes a `genuine: false` finding (slide 8, footer page-number — line 56). If the adapter validates first then filters, that's fine. If the adapter validates AFTER filter, schema-mismatched non-genuine findings could slip through to a future processing step. Order matters.
**How to avoid:** `validate(findings) → throw on any error → filter genuine == true → collapse 4→3 → emit SAMPLES`. Document and unit-test the order.

### P-10: Activation prompt triggers on unintended verbs
**What goes wrong:** A description starting "Annotate any image" triggers on Markdown image edits, screenshots, etc.
**How to avoid:** Lead with the domain noun + the artifact: "Annotate a presentation deck with design-review findings — produces an annotated PPTX overlay and PDF when a deck file and findings JSON in the locked Instadecks schema are provided." Keep the description ≤ 1024 chars; embedded examples; third-person voice. Phase 7 will A/B against the 10-prompt panel; Phase 2 only needs the pattern right.

## Runtime State Inventory

Phase 2 is greenfield code packaging — no rename / refactor of stored data, no live-service config, no OS-registered state, no env-var renames, no installed-package renames. **All five categories: None.**

(Verified: search of CONTEXT.md, REQUIREMENTS.md ANNO-01..11, and Phase 1 deliverables shows zero data-migration concerns. The only "live" state is `node_modules` populated by SessionStart hook in `${CLAUDE_PLUGIN_DATA}` — already validated by Phase 1.)

## Code Examples

### Example 1: The exact require-path patch (recommended)

**Source:** `/Users/shafqat/Documents/Projects/Sourcevo/v5-blue-prestige/annotate.js:5-6` (read in research)

```js
// BEFORE:
const path = require('path');
const PptxGenJS = require(path.join(__dirname, '..', 'node_modules', 'pptxgenjs'));

// AFTER (single line changed; line 5 unchanged):
const path = require('path');
const PptxGenJS = require(process.env.PPTXGENJS_PATH || 'pptxgenjs');
```

The skill body (`index.js`) sets `process.env.PPTXGENJS_PATH = path.join(process.env.CLAUDE_PLUGIN_DATA, 'node_modules', 'pptxgenjs')` before `require('./annotate')`. Bareword fallback covers test runs from project root.

### Example 2: Adapter (validation + filter + collapse)

```js
// skills/annotate/scripts/adapter.js
'use strict';

const SEV_MAP = {
  Critical: 'major',
  Major:    'major',
  Minor:    'minor',
  Nitpick:  'polish',
};
const VALID_CATEGORY = new Set(['defect', 'improvement', 'style']);

function adaptFindings(doc) {
  if (!doc || typeof doc !== 'object') {
    throw new Error('findings: not an object');
  }
  if (!doc.schema_version || !/^1\./.test(doc.schema_version)) {
    throw new Error(
      `Unsupported findings schema version ${doc.schema_version}. /annotate supports 1.x.`
    );
  }
  if (!Array.isArray(doc.slides)) {
    throw new Error('findings.slides: must be array');
  }

  const samples = [];
  doc.slides.forEach((slide, sIdx) => {
    if (!Number.isInteger(slide.slideNum) || slide.slideNum < 1) {
      throw new Error(`slides[${sIdx}].slideNum: must be positive integer`);
    }
    if (typeof slide.title !== 'string') {
      throw new Error(`slides[${sIdx}].title: must be string`);
    }
    if (!Array.isArray(slide.findings)) {
      throw new Error(`slides[${sIdx}].findings: must be array`);
    }

    const annotations = [];
    slide.findings.forEach((f, fIdx) => {
      const where = `slides[${sIdx}].findings[${fIdx}]`;
      if (!(f.severity_reviewer in SEV_MAP)) {
        throw new Error(`${where}.severity_reviewer: ${f.severity_reviewer} not in {Critical,Major,Minor,Nitpick}`);
      }
      if (!VALID_CATEGORY.has(f.category)) {
        throw new Error(`${where}.category: ${f.category} not in {defect,improvement,style}`);
      }
      if (typeof f.genuine !== 'boolean') {
        throw new Error(`${where}.genuine: must be boolean`);
      }
      if (typeof f.nx !== 'number' || f.nx < 0 || f.nx > 1) {
        throw new Error(`${where}.nx: must be number in [0,1] (got ${f.nx})`);
      }
      if (typeof f.ny !== 'number' || f.ny < 0 || f.ny > 1) {
        throw new Error(`${where}.ny: must be number in [0,1] (got ${f.ny})`);
      }
      if (typeof f.text !== 'string' || !f.text.length) {
        throw new Error(`${where}.text: must be non-empty string`);
      }
      // Validate other required fields (rationale/location/standard/fix) similarly.

      // Filter step (post-validate):
      if (!f.genuine) return;

      // Collapse step:
      annotations.push({
        sev:  SEV_MAP[f.severity_reviewer],
        nx:   f.nx,
        ny:   f.ny,
        text: f.text,
      });
    });

    if (annotations.length > 0) {
      samples.push({ slideNum: slide.slideNum, title: slide.title, annotations });
    }
  });

  return samples;
}

module.exports = { adaptFindings, SEV_MAP };
```

### Example 3: samples.js with override hook

```js
// skills/annotate/scripts/samples.js
'use strict';
let SAMPLES = [];           // mutable module-level binding
function setSamples(arr) { SAMPLES = arr; }
module.exports = { get SAMPLES() { return SAMPLES; }, setSamples };
```

annotate.js's `main()` reads `SAMPLES` via `for (const sample of SAMPLES)` — but the original file has SAMPLES as a `const` at the top of the same file. **This means the SAMPLES extraction is a SECOND modification beyond the require-path patch.** ANNO-04 explicitly authorizes this ("extracted to a separate `samples.js` module"). Update the integrity-test SHA accordingly and document both modifications (require-path patch + SAMPLES extraction) in the file's banner comment as the *two* permitted edits authorized by ANNO-03 and ANNO-04 respectively.

The substitution: lines 107–150 of annotate.js (the `const SAMPLES = [...]` block) become:
```js
const { SAMPLES } = require('./samples');
```
Hand `setSamples(adapted)` from `index.js` before requiring annotate.js.

### Example 4: runAnnotate signature

```js
// skills/annotate/scripts/index.js
'use strict';
const path = require('path');
const fs = require('node:fs/promises');
const { adaptFindings } = require('./adapter');
const { setSamples } = require('./samples');
const { generateRunId } = require('./lib/run-id');
const { prepareSlideImages } = require('./lib/slide-images');
const { convertToPdf } = require('./lib/pdf-convert');
const { resolveSiblingOutputs } = require('./lib/output-paths');

async function runAnnotate({ deckPath, findings, outDir, runId } = {}) {
  if (!deckPath)  throw new Error('runAnnotate: deckPath required');
  if (!findings)  throw new Error('runAnnotate: findings required (in-memory object)');
  runId  = runId || generateRunId();
  outDir = outDir || path.join(process.cwd(), '.planning', 'instadecks', runId);
  await fs.mkdir(outDir, { recursive: true });

  // 1. Validate + filter + collapse.
  const samples = adaptFindings(findings);
  setSamples(samples);

  // 2. Prepare working tree (slide-NN.jpg symlinks, run-local annotate.js cwd).
  const work = await prepareSlideImages({ deckPath, outDir });

  // 3. Configure pptxgenjs resolution and require annotate.js (which self-runs main()).
  process.env.PPTXGENJS_PATH = path.join(process.env.CLAUDE_PLUGIN_DATA || path.join(__dirname, '..', '..'), 'node_modules', 'pptxgenjs');
  require(path.join(work.cwd, 'annotate.js'));   // verbatim main() writes to work.cwd
  // (await module-level promise resolution; see Pattern 1.)

  const pptxRun = path.join(work.cwd, 'Annotations_Sample.pptx');
  const pdfRun  = await convertToPdf(pptxRun, work.cwd, runId);

  // 4. Mirror to sibling-of-input (D-03/D-04 — silent overwrite).
  const sibling = resolveSiblingOutputs(deckPath);
  await fs.copyFile(pptxRun, sibling.pptxPath);
  await fs.copyFile(pdfRun,  sibling.pdfPath);

  return {
    pptxPath: sibling.pptxPath,
    pdfPath:  sibling.pdfPath,
    runDir:   outDir,
    runId,
    pptxRun,
    pdfRun,
  };
}

module.exports = { runAnnotate };
```

### Example 5: soffice PDF invocation (D-08)

```js
// skills/annotate/scripts/lib/pdf-convert.js
const { execFile } = require('node:child_process');
const path = require('path');
const SESSION_ID = process.env.CLAUDE_SESSION_ID || `s${Date.now()}`;

function convertToPdf(pptxPath, outDir) {
  return new Promise((resolve, reject) => {
    const userInstall = `file:///tmp/lo-${SESSION_ID}-${process.pid}`;
    execFile('soffice', [
      '--headless',
      `-env:UserInstallation=${userInstall}`,
      '--convert-to', 'pdf',
      '--outdir', outDir,
      pptxPath,
    ], { timeout: 60_000 }, (err) => {
      if (err) return reject(err);
      const pdfName = path.basename(pptxPath).replace(/\.pptx$/i, '.pdf');
      resolve(path.join(outDir, pdfName));
    });
  });
}
module.exports = { convertToPdf };
```

[CITED: D-08 in CONTEXT.md; LibreOffice `-env:UserInstallation` is the documented isolated-profile flag — see `.planning/research/PITFALLS.md` Pitfall 5 and SUMMARY.md §"Critical Pitfalls" #4]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual `node annotate.js` from project tree | Embedded in plugin via `${CLAUDE_PLUGIN_DATA}/node_modules` resolution | Phase 2 | Decouples from absolute paths |
| Hardcoded SAMPLES array in geometry file | Extracted samples.js with override hook | Phase 2 (ANNO-04) | Runtime data injection |
| File-roundtrip handoff between skills | In-memory `runAnnotate` import | D-06 / Phase 2 | Saves disk I/O; matches Phase 3+ pipelining |

**Deprecated/outdated:** No deprecations introduced. annotate.js geometry is the locked spec.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The Sourcevo `v5-blue-prestige/` directory contains `v8s-NN.jpg` originals (real JPEG bytes) that Phase 2 can stage as test fixtures, replacing/augmenting the Phase 1 PNG fixtures | Pitfall P-01 | If only PNGs exist there, Phase 2 must rasterize via soffice during the test, adding a soffice-dependency to a unit-level test |
| A2 | Setting `process.env.PPTXGENJS_PATH` before `require()` allows annotate.js's `require(process.env.PPTXGENJS_PATH || 'pptxgenjs')` to resolve correctly against `${CLAUDE_PLUGIN_DATA}/node_modules/pptxgenjs` | Example 1 | If env-var-driven require fails Node module resolution (it shouldn't — Node treats absolute paths as paths), an alternative is `require.resolve` + cache injection. Trivially testable in Plan 1 |
| A3 | annotate.js's `main()` self-invocation (line 513) is acceptable to keep as-is by setting up cwd/symlinks/SAMPLES BEFORE require — this is the verbatim-strict path | Pitfall P-02 Option B | If this races (require returns before main() promise settles), Plan 3 must await an explicit signal (file-watch on output PPTX or expose a default-export from annotate.js). Open Question O-1 |
| A4 | Activation-rate testing (≥ 8/10 prompt panel) is **deferred to Phase 7** per CONTEXT.md "Deferred Ideas" — Phase 2 only needs the description string to follow the imperative-voice keyword-front-loaded pattern | Q8 / ANNO-01 | None; CONTEXT.md is explicit |

## Open Questions (RESOLVED)

1. **O-1: verbatim-strict (P-02 Option B) vs. require.main guard (P-02 Option A)?** — **RESOLVED: Option B (verbatim-strict main()) locked.** Plan 02-01 applies only the two ANNO-authorized edits (require-path patch + ANNO-04 SAMPLES extraction). No third edit. Plan 02-03 sets up cwd / symlinks / setSamples BEFORE `require('./annotate')` so the self-invoking main() writes correct output.
   - What we know: CLAUDE.md mandates "the ONLY permitted modification is the documented one-line require-path patch." But ANNO-04 explicitly authorizes a SECOND modification (SAMPLES extraction). If ANNO-04 already opens the door to two authorized edits, a third (`if (require.main === module) main()...`) for clean require-loading is *arguably* the kind of structural shim ANNO authorizes implicitly.
   - What's unclear: whether a third edit is admissible.
   - Recommendation: **start with Option B (verbatim main(), no third edit)**; if Plan 3 hits the race-condition or output-isolation issue and Option A becomes necessary, escalate to user via AskUserQuestion. Document the second modification (SAMPLES extraction) explicitly in Plan 1 commit message and in the integrity-test comment.

2. **O-2: Phase 1 fixtures are PNG (`v8s-NN.png`); annotate.js loads `v8s-NN.jpg`. How to bridge?** — **RESOLVED: copy from v5-blue-prestige tree.** Direct verification confirms `/Users/shafqat/Documents/Projects/Sourcevo/v5-blue-prestige/v8s-{01..10}.jpg` exist (`# lint-allow:hardcoded-path`). Plan 02-01 copies these to `tests/fixtures/v8-reference/v8s-{01..10}.jpg` with `.sha256` sidecars. No soffice rasterization fallback path needed.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `node` ≥ 18 | All scripts/tests | ✓ | v25.6.0 | — |
| `pptxgenjs` 4.0.1 | annotate.js + index.js | ✓ | 4.0.1 (lockfile) | — |
| `pixelmatch` | visual-regression Tier 2 | ✓ | ^5.3.0 (devDep) | — |
| `pngjs` | visual-regression Tier 2 | ✓ | ^7.0.0 (devDep) | — |
| `soffice` | PDF generation (ANNO-08) | ✓ | 26.2.2.2 | None — required for Phase 2 |
| `pdftoppm` | (Phase 3 — not used here) | ✓ | 26.02.0 | N/A |
| `IBM Plex Sans` | annotate.js text rendering | ✓ | bundled (Phase 1 + fc-list local 18 weights) | check-deps hook installs |
| `tests/fixtures/v8-reference/v8s-NN.jpg` | Visual-regression test input + symlink target | ✗ | — | **Resolve in Plan 1** (O-2) — copy from v5-blue-prestige tree OR rasterize via soffice |

**Missing dependencies with no fallback:** None for execution.
**Missing dependencies needing Phase-2 sourcing:** v8s-NN.jpg fixtures (see O-2).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | `node --test` (Node 18+ built-in), zero-dep |
| Config file | none (Phase 1 convention) |
| Quick run command | `node --test tests/annotate-adapter.test.js` |
| Full suite command | `find tests -maxdepth 2 -name '*.test.js' -print0 \| xargs -0 node --test` (matches ci.yml Gate 6) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ANNO-02 | annotate.js post-patch SHA matches recorded value | unit | `node --test tests/annotate-integrity.test.js` | ✅ stub (Phase 1) — Phase 2 unsuspends |
| ANNO-03 | The diff between bundled annotate.js and source-of-truth is ONLY the documented require-path patch (and SAMPLES extraction, ANNO-04) | unit | `node --test tests/annotate-patch-shape.test.js` | ❌ Wave 0 — new |
| ANNO-04 | samples.js exports `SAMPLES` (and `setSamples`) and annotate.js imports it | unit | covered by integrity test + adapter test | ✅ via existing |
| ANNO-05 | Adapter applies Critical/Major→`major`, Minor→`minor`, Nitpick→`polish` | unit | `node --test tests/annotate-adapter.test.js` | ❌ Wave 0 — new |
| ANNO-06 | Adapter filters `genuine == false` findings | unit | `node --test tests/annotate-adapter.test.js` | ❌ Wave 0 — new |
| ANNO-07 | Symlink `slide-NN.jpg` → `v8s-NN.jpg` resolves before annotate.js runs | unit | `node --test tests/annotate-slide-images.test.js` | ❌ Wave 0 — new |
| ANNO-08 | Run produces .pptx + .pdf in run dir AND sibling-of-input | integration | `node --test tests/annotate-output-paths.test.js` | ❌ Wave 0 — new |
| ANNO-09 | CLI wrapper reads JSON from disk and forwards | integration | `node --test tests/annotate-cli.test.js` | ❌ Wave 0 — new |
| ANNO-10 | `runAnnotate({deckPath, findings, outDir, runId})` accepts in-memory findings array | integration | `node --test tests/annotate-pipelined.test.js` | ❌ Wave 0 — new |
| ANNO-11 | Annotated PPTX byte-identical (Tier 1) OR pixel-diff < 0.5% (Tier 2) vs Phase 1 baseline | integration | `node --test tests/annotate-visual-regression.test.js` | ❌ Wave 0 — new (Tier 2 may stay `test.skip` until CI runner has soffice — note from ci.yml lines 91-99) |
| D-07 | Adapter throws structured error on schema mismatch | unit | `node --test tests/annotate-adapter.test.js` (error-path cases) | ❌ Wave 0 — new |

### Sampling Rate
- **Per task commit:** `node --test tests/annotate-<topic>.test.js` (the file the task touches)
- **Per wave merge:** `find tests -maxdepth 2 -name '*.test.js' -print0 \| xargs -0 node --test`
- **Phase gate:** Full suite green + manifest validator + path lint + version-pin assertion + license-checker, all enforced by ci.yml.

### Wave 0 Gaps
- [ ] `tests/annotate-adapter.test.js` — covers ANNO-05, ANNO-06, D-07
- [ ] `tests/annotate-patch-shape.test.js` — covers ANNO-03 (asserts exact diff between bundled file and `/Users/shafqat/Documents/Projects/Sourcevo/v5-blue-prestige/annotate.js` ; `# lint-allow:hardcoded-path`)
- [ ] `tests/annotate-slide-images.test.js` — covers ANNO-07
- [ ] `tests/annotate-output-paths.test.js` — covers ANNO-08, D-03/D-04
- [ ] `tests/annotate-cli.test.js` — covers ANNO-09
- [ ] `tests/annotate-pipelined.test.js` — covers ANNO-10
- [ ] `tests/annotate-visual-regression.test.js` — covers ANNO-11 (Tier 1 mandatory; Tier 2 `test.skip` until CI installs soffice — matches ci.yml RESERVED block at lines 91-99)
- [ ] No new framework install required.

## Security Domain

`security_enforcement` flag not set in `.planning/config.json` (file present? — check). Phase 2 has minimal threat surface (no auth, no network, no user-input parsing beyond JSON validation). For completeness:

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | N/A |
| V3 Session Management | no | N/A |
| V4 Access Control | no | N/A |
| V5 Input Validation | yes | Adapter validates all 11 finding fields with explicit error messages (D-07) |
| V6 Cryptography | no | SHA-256 use is integrity, not secrecy |

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Path traversal via deckPath / outDir | Tampering | `path.resolve` + assert prefix matches `process.cwd()` or explicit `outDir` |
| Symlink target outside expected dir | Tampering | Resolve target with `fs.realpath` and assert it's inside the temp run-dir |
| Findings JSON with billion-laughs / huge size | DoS | `fs.stat` size check (cap at 10 MB) before `JSON.parse` |
| Shell injection via filename in soffice exec | Tampering | Use `execFile` (no shell), pass args as array |

## Recommendations

Concrete answers per question:

1. **Require-path patch:** Change line 6 only:
   `const PptxGenJS = require(process.env.PPTXGENJS_PATH || 'pptxgenjs');`
   The skill body sets `process.env.PPTXGENJS_PATH = path.join(process.env.CLAUDE_PLUGIN_DATA, 'node_modules', 'pptxgenjs')` before require. Bareword fallback covers test-from-project-root. SAMPLES extraction is a separate authorized edit (ANNO-04).

2. **SAMPLES extraction:** `skills/annotate/scripts/samples.js` exports `{ get SAMPLES, setSamples }` (getter pattern so the binding stays live across module load). annotate.js's lines 107–150 (the `const SAMPLES = [...]` block) become `const { SAMPLES } = require('./samples');`. Phase 1's `tests/fixtures/v8-reference/samples.js` provides the canonical static export shape used by integrity / regression tests.

3. **Adapter design:** See Example 2 above. **Order: validate → filter `genuine == true` → collapse 4→3 → emit SAMPLES.** Validation throws `Error` with message `slides[<sIdx>].findings[<fIdx>].<field>: <observed> not in <expected>`. Slide-NN ↔ findings.slideNum mapping is identity — annotate.js's verbatim `imgPath = path.join(__dirname, \`v8s-${String(sample.slideNum).padStart(2,'0')}.jpg\`)` consumes `slideNum` directly.

4. **Slide-image symlinks:** `slide-NN.jpg` symlinked to JPEG bytes (NOT PNG — see P-01). Phase 1's PNG fixtures must be supplemented with JPEG fixtures sourced either from the v5-blue-prestige tree or rasterized via soffice in a Plan-1 setup task. annotate.js's image-loader is pptxgenjs's `addImage({ path })`, which sniffs extension by filename and embeds bytes verbatim — meaning content type **must** match the extension.

5. **soffice/pdftoppm invocation:**
   - PDF generation: `soffice --headless -env:UserInstallation=file:///tmp/lo-${SESSION_ID}-${PID} --convert-to pdf --outdir <outdir> <annotated.pptx>` (60s timeout via `execFile`'s `timeout` option).
   - pdftoppm: NOT needed in Phase 2. Phase 1 already shipped per-slide PNGs as visual-regression baselines. Phase 2 only needs annotated PPTX → annotated PDF. (Phase 3 will own deck → per-slide JPGs for `/review`.)

6. **runAnnotate signature & return:**
   ```ts
   runAnnotate({
     deckPath: string,            // path to original .pptx
     findings: object,            // in-memory findings doc (schema 1.x)
     outDir?: string,             // default: .planning/instadecks/<runId>
     runId?:  string,             // default: generateRunId()
   }): Promise<{
     pptxPath: string,    // sibling-of-input (D-03) — consumer convenience
     pdfPath:  string,    // sibling-of-input (D-03)
     runDir:   string,    // canonical archive (D-05)
     runId:    string,
     pptxRun:  string,    // run-dir copy of pptx
     pdfRun:   string,    // run-dir copy of pdf
   }>
   ```
   Returns paths only (no in-memory buffers). Phase 3 (`/review`'s pipelined mode RVW-06) imports this and calls it with `findings` already in memory — that's the no-roundtrip win. Reading the file from disk in the consumer is free if needed.

7. **Visual-regression assertion:** Tier 1 = SHA-256 of generated `Annotations_Sample.pptx` vs `tests/fixtures/v8-reference/Annotations_Sample.pptx.sha256` (already staged: `0d59236f520f766500aae69a615105595cd391d052b7a04c98a695a393695fa3`). Tier 2 = render annotated PPTX → PDF → per-slide PNG via soffice + pdftoppm at 150 dpi → `pixelmatch` against baseline PNG with `{ threshold: 0.1 }` and assert `diffPixels / totalPixels < 0.005`. Tier 2 stays `test.skip` until CI runner has soffice (per ci.yml RESERVED block lines 91-99). No new dependencies — `pixelmatch` and `pngjs` are already devDeps.

8. **Skill-description pattern:** Imperative verb at start, domain noun + artifact early, embedded examples, third-person voice, ≤ 1024 chars. Example: *"Annotate a presentation deck with design-review findings — produces an annotated PPTX overlay and PDF when given a deck file path and a findings JSON in the locked Instadecks v1.0 schema. Use this skill when a `/review` (or external) JSON sidecar exists alongside a `.pptx` and the user wants visual annotations rendered as a sibling `.annotated.pptx` + `.annotated.pdf`. Examples: `/instadecks:annotate deck.pptx findings.json`."* Phase 7 (DIST-02) tunes for ≥ 8/10; Phase 2 lands the pattern.

9. **Test inventory:** 8 test files (see Validation Architecture table). Existing stub: `tests/annotate-integrity.test.js` (unsuspend). New: 7 files. All `node --test`. CI auto-discovers (ci.yml Gate 6 glob).

10. **Plan decomposition (4 plans, 2 waves):**
    - **Plan 02-01 (Wave 1, serial — must land first):** Copy annotate.js verbatim → apply require-path patch → extract SAMPLES → resolve O-2 (locate or generate `v8s-NN.jpg` fixtures) → record post-patch SHA → unsuspend integrity test → add patch-shape test. Acceptance: integrity test green; patch-shape test green.
    - **Plan 02-02 (Wave 2, parallel-safe):** Build adapter.js + adapter unit tests (+ run-id generator + run-id test). Pure-Node, no soffice. Acceptance: adapter test green covering all 4 severity tiers, both genuine values, all error paths.
    - **Plan 02-03 (Wave 2, parallel-safe with 02-02):** Build index.js (`runAnnotate`) + bin/annotate.js CLI + slide-images.js + pdf-convert.js + output-paths.js + their tests. Depends on Plan 1 (needs the patched annotate.js to require). Acceptance: pipelined + CLI tests green; sibling output created; soffice produces non-zero PDF.
    - **Plan 02-04 (Wave 3):** Visual-regression integration test (Tier 1 mandatory; Tier 2 `test.skip`-until-soffice). Depends on Plans 1-3. Acceptance: Tier 1 SHA assertion green against Phase 1 baseline; SKILL.md final body lands with imperative description; phase-gate full suite green.

    **Highest-risk plan:** 02-01 — every other plan blocks on a clean integrity test + correct fixtures. Worktree isolation is **safe** because the file is binary-asset and CI lints (path lint, version-pin assert, integrity test) catch deviations on PR. Recommend Plan 1 NOT use a worktree (it touches `tests/fixtures/v8-reference/annotate.js.sha256` which is shared) — keep on main with atomic commit.

11. **See "Common Pitfalls" P-01 through P-10 above.** Each names failure mode + mitigation. Highest-impact ones: P-01 (PNG-as-JPG corruption), P-02 (require side-effects), P-03 (`__dirname` resolution), P-08 (split-state SHA mismatch).

## Sources

### Primary (HIGH confidence)
- `/Users/shafqat/Documents/Projects/Sourcevo/v5-blue-prestige/annotate.js` — full file read; SHA `c21aa66d…` verified
- `/Users/shafqat/Documents/Projects/instadecks/.planning/phases/02-instadecks-annotate/02-CONTEXT.md` — D-01..D-08 verbatim
- `/Users/shafqat/Documents/Projects/instadecks/.planning/REQUIREMENTS.md` ANNO-01..11
- `/Users/shafqat/Documents/Projects/instadecks/skills/review/references/findings-schema.md` — locked v1.0 contract
- `/Users/shafqat/Documents/Projects/instadecks/tests/fixtures/sample-findings.json` — canonical fixture
- `/Users/shafqat/Documents/Projects/instadecks/tests/fixtures/v8-reference/{samples.js,Annotations_Sample.pptx,annotate.js.sha256}` — Phase 1 baselines
- `/Users/shafqat/Documents/Projects/instadecks/tests/annotate-integrity.test.js` — Phase 1 stub
- `/Users/shafqat/Documents/Projects/instadecks/node_modules/pptxgenjs/dist/pptxgen.cjs.js` — image extension handling at line 2672 (`split('.').pop()`)
- `/Users/shafqat/Documents/Projects/instadecks/package.json` — devDeps already include pixelmatch + pngjs
- `/Users/shafqat/Documents/Projects/instadecks/.github/workflows/ci.yml` — Gate 6 glob auto-discovers new tests; RESERVED block lines 91-99 for soffice install
- `/Users/shafqat/Documents/Projects/instadecks/.planning/research/SUMMARY.md` — Critical Alignment Decisions §1, §2

### Secondary (MEDIUM confidence)
- LibreOffice headless `-env:UserInstallation` flag — established Phase 1 pitfall mitigation; cited in SUMMARY.md
- pixelmatch threshold `0.1` + 0.5% diff cap — established v8 BluePrestige convention from SUMMARY.md "Decision 2"

### Tertiary (LOW confidence)
- Activation-rate ≥ 8/10 pattern — well-documented in Anthropic plugin docs but Phase 7 tunes; Phase 2 only carries the pattern

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every dep is already pinned in lockfile, no new additions
- Architecture: HIGH — D-06/D-07/D-08 close every prior gap; module shape verified by reading annotate.js end-to-end
- Pitfalls: HIGH for P-01 through P-08 (all verified against source files); MEDIUM for P-09/P-10 (best-practice carry-forward)
- Open questions: 2 — both have recommended defaults that resolve in Plan 1

**Research date:** 2026-04-28
**Valid until:** 2026-05-28 (30 days; pptxgenjs 4.0.1 is locked, no upstream drift expected)
