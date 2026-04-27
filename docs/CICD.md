# CI/CD

## CI Pipeline (`.github/workflows/ci.yml`)

Triggered on push and pull-request. Steps:

1. Checkout
2. Setup Node 20
3. Install LibreOffice (`soffice`) and Poppler (`pdftoppm`) and `fontconfig`
4. `npm ci` (installs pinned `pptxgenjs@4.0.1` plus dev deps)
5. `npm test --if-present` (`node --test` runner across `tests/**`)
6. Hardcoded-path lint (`grep -rE '/Users/|~/.claude|/home/|C:\\\\'`)

Phase-specific gates added later:
- **Phase 1**: manifest validator, pptxgenjs version-pin assertion, license-checker, IBM Plex Sans bundle integrity, visual regression baselines committed
- **Phase 2**: annotate.js integrity SHA, visual regression test running
- **Phase 4**: PowerPoint compatibility manual gate (every test deck opens cleanly in real Microsoft PowerPoint Mac + Windows before tagging release)

## Release Pipeline

`claude plugin tag --push` releases the plugin via the alo-labs marketplace:

1. Bump `plugin.json` and `marketplace.json` version (semver)
2. Update `CHANGELOG.md`
3. Tag commit `vX.Y.Z`
4. Push tag — marketplace listing in `alo-labs/claude-plugins/.claude-plugin/marketplace.json` references this tag

Fresh-machine install validation runs as the final gate before each release tag.
