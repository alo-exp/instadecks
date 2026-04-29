# Phase 9 — Deferred Items

## Pre-existing failures observed during Plan 9-04

The following failures were present in `main` BEFORE Plan 9-04 changes, are
unrelated to the brief-polymorphism work, and are out of scope per Rule 1
(only auto-fix issues directly caused by the current task).

### Cookbook recipe code-fence callable check (9 tests)

`tests/create-cookbook-recipes.test.js` — every recipe `.md` JS code-fence
fails the post-Function-instantiation callable check with
`ReferenceError: render<Recipe> is not defined`.

Affected recipes:
- title, section, 2col, comparison, data-chart, data-table, stat-callout, quote, closing

Root cause: Phase 9-02 cookbook variant work changed the recipe md structure
(multiple variant code-fences vs the single-variant the test harness was written
against). `extractJsCodeFence` returns the first fence, which now contains
shared helpers / variant headers rather than the `render<Recipe>` definition.

Recommended fix-owner: Phase 9-02 follow-up, or Plan 9-05 if it touches the
cookbook reader.

### Production-tree enum-lint CLI (1 + 1 derived)

- `tests/create-enum-lint-cli.test.js` → "production tree → exit 0" fails
  because the cookbook md files (above) emit lint diagnostics on the new
  variant fences.
- The full subtest aggregator `create-enum-lint-cli` therefore also
  reports as failing.

Same root cause as the recipe failures.

## Plan 9-04 verification

- All 3 new test files (`tests/lib-brief-normalizer.test.js`,
  `tests/lib-extract-doc.test.js`, `tests/cli-create-polymorphic-brief.test.js`)
  pass — 70 cases, 0 failures.
- `npm test` global counts: 989 tests, 954 pass, 11 fail (all pre-existing).
- c8 100% coverage maintained on every file under instrumentation including the
  two new modules `brief-normalizer.js` and `extract-doc.js`.
- Existing `create-runtime.test.js` "invalid brief" assertion continues to
  pass (Plan 9-04 detection logic routes any plain-object input through
  validateBrief, preserving the legacy contract).
