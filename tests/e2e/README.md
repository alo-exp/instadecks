# End-to-end tests (real soffice)

These tests run the full pipeline with REAL `soffice` + `pdftoppm`. They DO NOT
run in CI. They are local-only opt-in tests that complement the human
`tests/FRESH-INSTALL.md` gate (the v0.1.0 release human-verification path).

## Skip rules (CONTEXT D-08)

- `process.env.CI === 'true'` → silent skip (registered via `t.skip(reason)`).
- `command -v soffice` returns empty → silent skip with an install hint.

The `helpers/skip-without-soffice.js` module exports `skipWithoutSoffice(t)`;
every e2e test's first executable line is `if (skipWithoutSoffice(t)) return;`.

## Running locally

1. Install LibreOffice + Poppler. See `tests/FRESH-INSTALL.md` for the supported
   versions and platform notes.
2. Run:
   ```sh
   npm run test:e2e
   ```
   Which is `node --test 'tests/e2e/**/*.test.js'`.

## What's covered

| Test | Pipeline exercised |
|---|---|
| `create-real-soffice.test.js` | brief → runCreate → real pptxgenjs render → soffice PDF (LLM stays stubbed via `INSTADECKS_LLM_STUB`) |
| `review-real-soffice.test.js` | real PPTX → runReview → real soffice + pdftoppm image rendering → review.md |
| `annotate-real-soffice.test.js` | real PPTX + findings → runAnnotate → real pptxgenjs annotated PPTX → soffice PDF |

The LLM is the only component still stubbed in e2e; the goal is to catch
regressions in the deterministic render half (where `soffice` version drift
historically lands) before they hit a human reviewer in FRESH-INSTALL.md.

## Why real?

`soffice`'s PDF rendering and `pptxgenjs`'s PPTX output have non-deterministic
edges (timestamps, absolute-path `descr` attributes, font fallback) that smoke
tests stub. The e2e suite catches divergence on developer machines before merge.

## Why excluded from CI

CI runners do not reliably ship LibreOffice; installing it inside the workflow
inflates wall-clock past the 30s smoke budget. CONTEXT D-08 keeps e2e local.
The c8 100% coverage gate already covers everything that does not require
`soffice`; the e2e suite is regression-detection, not coverage.

## Relationship to FRESH-INSTALL.md

`tests/FRESH-INSTALL.md` is the **human gate** for v0.1.0: a human walks
through install + first-run + sample invocation. `tests/e2e/` is a
developer-machine convenience that catches regressions earlier — it does NOT
replace the human gate.

## Coverage exclusion

The c8 config (`.c8rc.json`) excludes `tests/e2e/**` from the coverage gate.
Smoke tests (`tests/smoke/**`) are part of the coverage run.
