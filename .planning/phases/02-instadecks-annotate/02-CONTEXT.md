# Phase 2: `/instadecks:annotate` - Context

**Gathered:** 2026-04-28
**Status:** Ready for planning

<domain>
## Phase Boundary

A standalone-invocable `/instadecks:annotate` skill that consumes findings JSON in the locked v1.0 schema and produces annotated PPTX + PDF overlays with byte-identical (or pixel-diff < 0.5%) parity to v8 BluePrestige reference output. Proves the contract works end-to-end before any producer (`/review`, `/create`) is built.

**In scope (ANNO-01..11):** verbatim `annotate.js` + one-line require-path patch + post-patch SHA pin + `samples.js` extraction + JSON-to-SAMPLES adapter (4→3 severity collapse + `genuine == true` filter) + slide-image symlink approach + standalone-invocable mode + pipelined-from-`/review` mode + visual-regression assertion against Phase 1 baseline.

**Out of scope:** producer skills (Phase 3+), auto-refine loop (Phase 5), full soffice race-condition hardening (Phase 3 / RVW-09..11; only the per-call `UserInstallation` one-liner is pre-applied here as a low-cost flake-prevention measure).
</domain>

<decisions>
## Implementation Decisions

### Run Directory & Output Paths

- **D-01 (run dir):** Each invocation uses `.planning/instadecks/<run-id>/` as its working/run directory. Matches Phase 5 (`CRT-11`) `<run-id>` interrupt-flag convention; single root for all skill runs across phases.
- **D-02 (run-id format):** `<run-id>` = `YYYYMMDD-HHMMSS-<6hex>` (e.g. `20260428-101530-a1b2c3`). Sortable, human-readable, collision-safe within a second. The 6-hex suffix is the first 6 chars of a random hash to disambiguate same-second invocations.
- **D-03 (project-relative output path):** Final annotated outputs land **sibling-of-input**: `<deck>.annotated.pptx` and `<deck>.annotated.pdf` next to the input deck file. Predictable for users; works for both standalone and pipelined invocations.
- **D-04 (overwrite policy):** Sibling outputs are overwritten silently on re-run. No `--force` flag, no run-id suffix on collision. Each prior run remains archived inside its own `.planning/instadecks/<run-id>/` so nothing is truly lost.
- **D-05 (run-dir contents):** The run directory holds: the temp slide-image working tree (with `slide-NN.jpg` symlinks per ANNO-07), the run-local copies of annotated PPTX/PDF (in addition to the sibling-of-input copies — the run dir is the canonical archive; sibling is the convenience pointer), any soffice/pdftoppm log output, and the resolved findings JSON used for this run (so reruns are reproducible).

### Claude's Discretion

The user did not select these gray areas — defaults are LOCKED as Claude's Discretion and are binding for downstream agents:

- **D-06 (pipelined handoff shape — ANNO-10):** Phase 2 exports `runAnnotate({ deckPath, findings, outDir, runId })` from `skills/annotate/scripts/index.js` (or equivalent) as the in-memory entry point. `/review` (Phase 3) imports and calls this directly with an in-memory findings array — no JSON file roundtrip, no IPC, no stdin protocol. Standalone mode (ANNO-09) uses the same function under a thin CLI wrapper that reads JSON from disk and forwards.
- **D-07 (adapter error handling — ANNO-05/06):** Fail-loud on malformed or schema-mismatched findings. The adapter validates `schema_version`, required fields (`slideNum`, `annotations[].sev`, `nx`, `ny`, `text`, `genuine`, `category`, `rationale`), and value ranges (`sev ∈ {Critical,Major,Minor,Nitpick}`, `nx`/`ny ∈ [0,1]`, `category ∈ {defect,improvement,style}`) up front before any work. On failure, throws a structured error identifying the offending finding (slide index, annotation index, field name, observed vs expected). No silent skipping. No partial output.
- **D-08 (soffice in Phase 2):** Pre-apply the per-call `-env:UserInstallation=file:///tmp/lo-${SESSION_ID}-${PID}` flag (RVW-09) now as a single-line addition — it's a low-cost flake-prevention measure even before the full hardening. Full hardening (file-existence/size checks after each invocation, 60s timeout + 1 retry, cleanup trap on exit per RVW-10/11) defers to Phase 3 where it gets the dedicated test coverage. Phase 2 documents the partial state in the skill's run notes so Phase 3 knows what to layer in.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Source-of-truth code (verbatim copy targets)

- `/Users/shafqat/Documents/Projects/Sourcevo/v5-blue-prestige/annotate.js` — the file Phase 2 copies VERBATIM. Single permitted modification: the documented one-line require-path patch so pptxgenjs resolves out of `${CLAUDE_PLUGIN_DATA}/node_modules`. Geometry, polygon math, charPts table, color/transparency, miter-join logic, layout constants, `MAX_SIDE` overflow logic must NOT be edited. <!-- lint-allow:hardcoded-path -->
- `/Users/shafqat/Documents/Projects/Sourcevo/v5-blue-prestige/Annotations_Sample.pptx` — the v8 reference PPTX whose SHA + per-slide PNG renders are the visual-regression baseline (already extracted into `tests/fixtures/v8-reference/` in Phase 1). <!-- lint-allow:hardcoded-path -->

### Phase 1 deliverables (Phase 2 builds on these)

- `tests/fixtures/v8-reference/samples.js` — extracted SAMPLES data; Phase 2 ships its own `skills/annotate/scripts/samples.js` derived from this so geometry code stays unmodified.
- `tests/fixtures/v8-reference/annotate.js.sha256` — currently PRE-PATCH; Phase 2 REPLACES with post-patch SHA after applying the require-path patch.
- `tests/fixtures/v8-reference/Annotations_Sample.pptx` + `.sha256` — visual-regression Tier 1 baseline (byte-identical assertion target).
- `tests/fixtures/v8-reference/v8s-NN.png` — per-slide PNGs at 150 dpi for Tier 2 pixelmatch (≤ 0.5% diff fallback).
- `tests/annotate-integrity.test.js` — currently `it.skip`; Phase 2 unsuspends it after copying file + recording post-patch SHA.
- `tests/fixtures/sample-findings.json` — canonical 4-tier-severity fixture (Phase 2 validates ANNO-11 against this).
- `skills/review/references/findings-schema.md` — locked v1.0 JSON contract (full 4-tier producer side; consumer-side collapse documented here).

### Locked invariants & conventions

- `CLAUDE.md` — locked invariants (annotate.js verbatim rule, pptxgenjs 4.0.1 pin, no-paths-outside-plugin-tree, severity-collapse boundary, content-vs-design boundary).
- `silver-bullet.md` — enforcement rules (§3a EXRV-01..04 review-loop counts, §3a-i WFIN-04..07 post-command review gates, §3 NON-NEGOTIABLE no-minimization rule).
- `.planning/PROJECT.md` — milestone v0.1.0 context.
- `.planning/REQUIREMENTS.md` §"`/instadecks:annotate` skill (ANNO)" — ANNO-01..11 acceptance.
- `.planning/ROADMAP.md` §"### Phase 2: `/instadecks:annotate`" — phase goal + 6 success criteria.
- `.planning/research/SUMMARY.md` — alignment decisions (severity collapse, annotate.js verbatim, schema mapping).
- `.planning/phases/01-plugin-foundation-contract-ci-gates/01-VERIFICATION.md` — Phase 1 deliverables + locked conventions Phase 2 inherits.
- `.planning/phases/01-plugin-foundation-contract-ci-gates/.continue-here.md` — Phase 1 anti-pattern table (blocking: never skip SB enforcement) and locked Phase 2 critical work plan.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets (from Phase 1)

- `package.json` with `pptxgenjs@4.0.1` (exact pin) + `package-lock.json` committed → `node_modules` available via SessionStart `npm ci`. Phase 2 imports pptxgenjs through the require-path patch.
- `tools/assert-pptxgenjs-pin.js` → CI gate guarantees the version remains pinned; Phase 2 doesn't have to re-assert.
- `tools/lint-paths.sh` → enforces `${CLAUDE_PLUGIN_ROOT}` / `${CLAUDE_PLUGIN_DATA}` discipline; Phase 2 must use these env vars (`# lint-allow:hardcoded-path` available for justified exceptions).
- `tools/validate-manifest.js` → manifest schema gate; if Phase 2 adds `allowed-tools` to `skills/annotate/SKILL.md` it'll be validated.
- `assets/fonts/IBM_Plex_Sans/` + `hooks/check-deps.sh` → font auto-install handled; annotate.js's font references resolve at runtime.
- `tests/fixtures/v8-reference/*` → visual-regression baselines pre-staged.
- `skills/annotate/SKILL.md` → skill skeleton (Phase 1 owns; Phase 2 replaces full body).
- CI workflow `.github/workflows/ci.yml` → auto-discovers new `tests/**.test.js` via the find/xargs glob (no edit needed for new test files).

### Established Patterns

- Test runner: `node --test` (zero-dep, Node 18+).
- Commit format: HEREDOC + `<type>(02-NN): <message>` subject prefix + `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>`.
- Atomic per-task commits; one `02-NN-SUMMARY.md` per plan.
- Hardcoded-path exemptions: file-level (e.g. `.planning/HANDOFF.json`, `.silver-bullet.json`) or line-level (`# lint-allow:hardcoded-path` comment) — pattern set in Phase 1 CI fix.
- License floor: MIT/Apache-2.0/BSD-2/BSD-3/ISC/OFL-1.1; license-checker fails on `GPL;AGPL;SSPL`.

### Integration Points

- `skills/annotate/SKILL.md` — agent-facing playbook (thin per CLAUDE.md "skills are thin" rule).
- `skills/annotate/scripts/annotate.js` — verbatim binary asset.
- `skills/annotate/scripts/samples.js` — SAMPLES extraction so geometry stays unmodified.
- `skills/annotate/scripts/adapter.js` (or similar) — JSON-to-SAMPLES adapter (severity collapse + genuine filter + validation).
- `skills/annotate/scripts/index.js` (or similar) — exports `runAnnotate({deckPath, findings, outDir, runId})` entry point per D-06.
- `tests/annotate-integrity.test.js` (Phase 1 stub) → unsuspend in Phase 2 with post-patch SHA.
- New tests under `tests/`: adapter unit tests, sibling-output-path resolution test, visual-regression integration test (Tier 1 byte-identical, Tier 2 pixelmatch fallback), pipelined-mode in-memory-handoff test.

</code_context>

<specifics>
## Specific Ideas

- The user explicitly approved batch defaults for unselected gray areas — researcher and planner do NOT need to re-ask about pipelined-handoff shape, adapter error mode, or soffice flagging. Those are LOCKED in D-06/D-07/D-08.
- v8 BluePrestige output is the spec — match it. No "improvements" to annotate.js geometry/colors/transparency/fonts/layout constants.

</specifics>

<deferred>
## Deferred Ideas

- Full soffice/pdftoppm hardening (file-existence + size checks, 60s timeout + 1 retry, cleanup trap on exit) — Phase 3 (RVW-09/10/11).
- Activation-rate testing (≥ 8/10 prompt panel) for `/instadecks:annotate` description — Phase 7 (DIST-02) finalizes activation tuning across all four skills together.
- `allowed-tools` scoping for `default` / `dontAsk` permission modes — Phase 7 (DIST-03).
- Stress-test fixtures (8 annotations per slide / max overflow) — v1.x deferred per REQUIREMENTS.md "v2 Requirements (Deferred)".
- Windows path-detection in image pipeline — v1.x deferred.

</deferred>

---

*Phase: 02-instadecks-annotate*
*Context gathered: 2026-04-28*
