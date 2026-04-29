# CI/CD

## CI Pipeline (`.github/workflows/ci.yml`)

Triggered on push and pull request. Steps execute in order; first non-zero exit fails the run.

| Gate | Step | Purpose |
|------|------|---------|
| — | Checkout + Setup Node 20 + `npm ci` | Standard prelude |
| 1 | `tools/validate-manifest.js` | `.claude-plugin/plugin.json` schema |
| 2 | `tools/lint-paths.sh` | Forbid hardcoded `/Users/`, `~/.claude/`, `/home/`, `C:\` |
| 3 | `tools/assert-pptxgenjs-pin.js` | `pptxgenjs` exact `4.0.1` |
| 3b | `npm run lint:cookbook` | Cookbook recipe link validity |
| 4 | `npx license-checker --production --failOn 'GPL;AGPL;SSPL'` | Forbidden licenses |
| 5 | `test -x hooks/check-deps.sh` | Hook executability |
| 5b | `apt install bats` | bats prereq |
| 5c | `npm run test:bats` | Bash script suite |
| 7 | `node tools/lint-doc-size.js && node tools/lint-doc-size.js --orphans` | Doc size caps + INDEX.md orphan check |
| 6 | `npm test` (= `CI=true c8 --100 --check-coverage node --test`) | 100% coverage gate |
| 6b | Upload `coverage/lcov.info` artifact | Audit trail |
| 7-opt | `claude plugin validate` (soft-fail when CLI absent) | Future-ready validate hook |

## Local commands

| Command | Purpose |
|---------|---------|
| `npm test` | Full suite + 100% c8 gate (matches CI Gate 6) |
| `npm run coverage` | HTML coverage report (non-failing) |
| `npm run test:smoke` | <30s smoke suite |
| `npm run test:bats` | Bash script suite (requires bats) |
| `npm run test:e2e` | E2E suite (local-only; skipped when `CI=true`) |
| `npm run lint:paths` | Hardcoded-path lint |
| `npm run lint:enums` | pptxgenjs ShapeType enum lint |
| `npm run lint:cookbook` | Cookbook recipe-link validator |
| `npm run audit:licenses` | Production-tree license audit |
| `node tools/lint-doc-size.js` | Doc size caps |
| `node tools/lint-doc-size.js --orphans` | INDEX.md orphan check |
| `npm run gate:activation-panel` | Plan 10-03 — skill activation panel (forward-ref) |
| `npm run gate:permission-mode` | Plan 10-04 — permission-mode audit (forward-ref) |
| `npm run gate:fresh-install` | Plan 10-05 — fresh-machine install gate (forward-ref) |
| `npm run release:dry-run` | Plan 10-06 — release dry-run (forward-ref) |
| `npm run release` | Plan 10-06 — tagged release (forward-ref) |

## Release Pipeline

`claude plugin tag --push` releases the plugin via the alo-labs marketplace:

1. Bump `plugin.json` and `marketplace.json` version (semver)
2. Update `docs/CHANGELOG.md` and root `CHANGELOG.md`
3. Tag commit `vX.Y.Z`
4. Push tag — marketplace listing in `alo-labs/claude-plugins/.claude-plugin/marketplace.json` references this tag

Fresh-machine install validation (`tests/FRESH-INSTALL.md`) runs as the final human gate before each release tag.
