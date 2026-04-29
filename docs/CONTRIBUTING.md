# Contributing

Welcome — Instadecks is Apache-2.0 and accepts issues + PRs at https://github.com/alo-exp/instadecks.

## Development setup

```bash
git clone https://github.com/alo-exp/instadecks.git
cd instadecks
npm ci
```

System prerequisites (must be on `PATH`):

- **Node ≥ 18** — `brew install node` / `apt install nodejs` / `choco install nodejs`
- **LibreOffice (`soffice`)** — `brew install --cask libreoffice` / `apt install libreoffice` / `choco install libreoffice-fresh`
- **Poppler (`pdftoppm`)** — `brew install poppler` / `apt install poppler-utils` / `choco install poppler`
- **IBM Plex Sans** — bundled under `assets/fonts/`, unpacked automatically by the SessionStart hook on first run

The `hooks/check-deps.sh` SessionStart hook performs a non-blocking probe of the above and surfaces install hints if any are missing.

## Test discipline

```bash
npm test                 # c8 --100 --check-coverage gate (matches CI Gate 6)
npm run test:smoke       # <30s smoke suite
npm run test:bats        # bash-script suite (bats); CI runs after apt install bats
npm run test:e2e         # E2E (local-only; auto-skipped when CI=true)
npm run lint:paths       # forbid hardcoded /Users/, ~/.claude/, /home/, C:\
npm run lint:enums       # forbid pptxgenjs string-literal addShape() — use enums
npm run lint:cookbook    # validate cookbook recipe links
npm run audit:licenses   # production-tree license audit
```

`npm test` is the single command CI runs at Gate 6. All four c8 metrics (lines, branches, functions, statements) must be at 100% — there are no per-file exclusions and no thresholds below 100%. New code must arrive with the tests that drive it to 100%.

`tests/FRESH-INSTALL.md` is the human v0.1.0 release gate (run on a clean machine before tagging).

## Locked invariants

The following are enforced by lint, tests, and CI gates. They are documented in [CLAUDE.md](../CLAUDE.md) and must not be relaxed without explicit written sign-off:

- **`pptxgenjs` is pinned at exactly `4.0.1`** (no caret). Bumping requires visual-regression sign-off.
- **`skills/annotate/scripts/annotate.js` is verbatim from v8 BluePrestige** with one documented `require()` patch. Geometry math is owned by direct unit tests under `tests/`.
- **Severity collapse 4→3 happens only at the `/annotate` adapter.** Reviewers (`/review`, `/content-review`) keep the full 4-tier taxonomy in their JSON output.
- **No reaches outside the plugin tree.** All paths via `${CLAUDE_PLUGIN_ROOT}` or `${CLAUDE_PLUGIN_DATA}`. Hardcoded `/Users/`, `~/.claude/`, `/home/`, `C:\` fail Gate 2.
- **Auto-refine convergence rule:** `genuine_findings == 0 AND cycle ≥ 2`; oscillation detected when cycle N's issue set ⊆ cycle N-2's; soft cap at cycle 5.
- **Content-vs-design boundary is hard.** `/review` does not flag argument structure; `/content-review` does not flag visual issues.

See [CLAUDE.md](../CLAUDE.md) for the full list and rationale.

## Commit + PR conventions

- **Conventional Commits**: `feat(scope): ...`, `fix(scope): ...`, `docs(scope): ...`, `test(scope): ...`, `refactor(scope): ...`, `chore(scope): ...`. Scope is typically the phase-plan tag (e.g., `10-02`) or the affected skill name.
- **One concern per commit.** Per-task atomic commits make rollback safe and review tractable.
- **Run `npm test && npm run lint:paths && npm run lint:enums && npm run audit:licenses` before pushing.** CI runs the same gates plus bats; surfacing failures locally is faster than via the PR loop.
- **PR description**: state the requirement IDs touched, the locked invariants you considered, and any visual-regression baseline updates.

## Adding new cookbook variants / palettes / motifs

The cookbook lives under `skills/create/references/`. To add a new slide-type variant or palette:

1. Add the recipe under the appropriate cookbook directory; cross-link any referenced helpers.
2. Update the relevant `validate-cookbook` lint expectations if you've changed the directory shape.
3. Add tests under `tests/cookbook-variant-coverage.test.js` (or the matching variant-coverage suite) to assert the new variant is reachable from the design-DNA picker and renders without enum violations.
4. Re-run `npm test` to confirm 100% coverage holds and the new variant is exercised.

For typography and motif additions, follow the same pattern: add to the registry, update the picker's diversity ledger schema if needed, add a coverage test, run the full suite.
