# Deferred Items — Phase 9 Live E2E Iter4 Fix

## Pre-existing coverage gap: tools/license-audit.js:133-134

**Discovered during:** Iter4 fix execution (post npm-test verification).

**Status:** Pre-existing on main at `d70a9fb` (before Iter4 commits). Confirmed
by checking out `tools/license-audit.js` at `d70a9fb` and re-running `npm test`
— the same lines 133-134 were already uncovered, with the same global
coverage failure (`99.81% lines`).

**Impact:** Iter4 fixes IMPROVED net coverage from 99.81 → 99.96 lines /
99.37 → 99.94 branches by closing branches that were previously
`/* c8 ignore */`'d. The license-audit gap is the only remaining gap.

**The uncovered code:** The "license-audit: OK (...)" stdout write branch
of the CLI happy path — invoked when audit succeeds with no violations.
A test would need to spawn the CLI in a clean state where every probe
passes (NOTICE <-> licenses/ in sync, no GPL/AGPL transitive deps, etc.).

**Why deferred:** SCOPE BOUNDARY rule — this file is unrelated to the
Iter4 defects (font bundling, diversity-history flat layout, tone-tag
deadlock). Fixing it would expand the Iter4 PR scope. Should be fixed
in a separate test-only PR.

**Suggested follow-up:** Add `tests/license-audit-cli-ok-path.test.js`
that invokes the CLI with the actual repo state (which is GPL-clean and
NOTICE-synced) and asserts the OK stdout line.
