# Smoke tests

Fast, deterministic smoke tests for every `cli.js`. Always run in CI as part of
`npm test`; the suite is asserted to complete in under 30 seconds end-to-end
(Phase 8 CONTEXT D-06; W-6 budget guard in `_runner-time.test.js`).

## What's exercised

- argv parsing in every `skills/*/scripts/cli.js`
- the cli → orchestrator dispatch wiring
- the exit-ladder error paths (no-args → Usage banner; missing required flag →
  documented non-zero exit code)
- subprocess boundary (`spawnSync('node', [cli, ...])`) — these tests never
  `require()` a cli module directly

## What's stubbed

- **LLM**: `INSTADECKS_LLM_STUB=<path-to-fixture>` env var. The orchestrator's
  module-level init (Plan 08-02 BLOCKER B-3 single source of truth) reads this
  at first import and wires `_test_setLlm(stubLlmResponse(<basename>))`.
- **Image rendering** (replaces `soffice` + `pdftoppm`): `INSTADECKS_RENDER_STUB=1`
  env var swaps the orchestrator's `_renderImagesStub` for an inert function
  returning `'stubbed-render'` (CONTEXT D-05 carve-out).

The env-var bridge in each `skills/*/scripts/index.js` silently no-ops with a
`MODULE_NOT_FOUND` try/catch when `tests/helpers/llm-mock.js` is absent, so the
smoke suite stays runnable even when Plan 08-05's harness has not yet landed.

## What's NOT stubbed

- argv parsing
- cli.js → orchestrator dispatch
- JSON / Markdown sidecar emit
- File I/O within `$TMPDIR`

## Why no `--help` test

None of the four `cli.js` files implements `--help` or `--version`. Plan 08-02
Task 2 verified this contract; Plan 08-06 honors it by smoke-testing the
documented exit-ladder paths instead (no-args → Usage banner; bad flag →
"unrecognized argument"; missing required flag → exit 1/2/3 per cli).

## Running

```sh
npm run test:smoke
```

Runs `node --test 'tests/smoke/**/*.test.js'`. Smoke tests are also part of the
`npm test` c8 coverage run (no special exclusion).

## Wall-clock budget

`_runner-time.test.js` records a `process.hrtime.bigint()` sentinel at module
load and asserts cumulative elapsed under 30000ms. node:test loads test files
in glob order before executing, so the sentinel captures effectively the full
suite duration. If the cap fails, split smoke into priority + extended
subgroups before relaxing the cap (CONTEXT D-06).

## TODO when Plan 08-05 lands

Each `*-min.test.js` has a `TODO(plan-08-05)` block to extend it with a
happy-path subprocess invocation once `tests/helpers/llm-mock.js` and
`tests/fixtures/llm-stubs/*.json` are authored. Until then, the min tests
exercise argv-parse + exit-ladder via a deterministic error path.
