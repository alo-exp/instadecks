# tests/bats — Bash-script coverage via bats-core

Bats coverage for the three bash scripts in Phase 8 CONTEXT D-04:

- `scripts/pptx-to-images.sh` → `pptx-to-images.bats` (13 tests)
- `hooks/check-deps.sh` → `check-deps.bats` (8 tests)
- `skills/doctor/scripts/check.sh` → `doctor-check.bats` (9 tests)

Bats coverage is asserted by **test-case enumeration** — every conditional /
failure-message branch in each script gets a dedicated `@test`. It is
**NOT folded into the c8 100% gate** (c8 only covers Node sources).

## Install

**macOS (preferred):**

```bash
brew install bats-core
```

**Linux (CI):**

```bash
sudo apt-get update && sudo apt-get install -y bats
```

**Vendored fallback (no system install):**

```bash
git submodule add https://github.com/bats-core/bats-core.git tests/bats/.bats-core
./tests/bats/.bats-core/bin/bats tests/bats/
```

The suite is developed against **bats-core 1.13.x**. Earlier versions may not
support `$BATS_TEST_TMPDIR` auto-cleanup.

## Run

```bash
# Whole suite
npm run test:bats

# Skip cleanly if bats absent (local dev convenience)
npm run test:bats:if-installed

# Single file
bats tests/bats/pptx-to-images.bats

# Single test by line number
bats --filter "happy path" tests/bats/pptx-to-images.bats
```

## Hermetic-test mechanism

`helpers/setup.bash` exports:

- `setup_stubdir` — creates `$BATS_TEST_TMPDIR/bin`, prepends to PATH, opens `$STUB_LOG`.
- `stub_bin NAME EXITCODE [BODY]` — writes a fake executable that logs argv to `$STUB_LOG` and exits with the given code; optional BODY runs before exit.
- `unstub_bin NAME` — removes a stub mid-test.
- `fixture_pptx DEST` — copies `tests/fixtures/tiny-deck.pptx` (or a placeholder) to DEST.

PATH mutation is process-local; `$BATS_TEST_TMPDIR` is auto-removed by bats per
test (T-08-10 mitigation).

## Per-file `@test` inventory

### pptx-to-images.bats (13)

1. happy path: pptx in, JPGs out, exit 0
2. missing args fail with usage and exit 1
3. input not a file: exit 1 with clear message
4. missing soffice fails fast with retry exhaustion (exit 2)
5. soffice exits 0 but produces no PDF: exit 3
6. soffice produces zero-byte PDF: size check fires (exit 3)
7. soffice output lacks %PDF magic: exit 3
8. missing pdftoppm fails fast (exit 4)
9. pdftoppm exits 0 but writes no JPGs: exit 5
10. pdftoppm output lacks JPEG magic: exit 5
11. macOS no-timeout-binary shim: runs without timeout/gtimeout in PATH (Plan 03-01 Rule 3)
12. concurrent invocations use unique UserInstallation profile paths
13. cleanup trap fires: /tmp/lo-* profile dir is removed after run

### check-deps.bats (8)

1. all deps present: clean exit 0 with deps OK message
2. soffice missing: surfaces 'missing soffice' but still exits 0 (FOUND-03 non-blocking)
3. pdftoppm missing: surfaces message + exits 0
4. node version too low: 'node 16 < 18' message + exits 0
5. first-run install: npm ci --omit=dev is invoked when sentinel SHA mismatches
6. skip-on-already-installed: matching sentinel SHA prevents npm invocation
7. FOUND-03: hook exits 0 even when every dep is missing
8. npm ci failure path: 'npm ci failed' surfaced + exit 0

### doctor-check.bats (9)

1. all green: every required tool present + IBM Plex Sans found → exit 0
2. soffice missing: [MISSING] row + install hint + exit 1
3. pdftoppm missing: [MISSING] row + install hint + exit 1
4. node missing: [MISSING] row + install hint + exit 1
5. node too old (v16): [MISSING] node ≥ 18 row + exit 1
6. pptxgenjs version drift: [MISSING] with found-version note + exit 1
7. pptxgenjs not installed: [MISSING] with npm ci hint + exit 1
8. IBM Plex Sans missing via fc-list: [WARN] (does NOT flip exit) → exit 0
9. fc-list absent: soft warning, no exit-flip

## CI wiring (Plan 8-07)

Plan 8-07 will add to `.github/workflows/ci.yml` before `npm test`:

```yaml
- name: Install bats
  run: sudo apt-get update && sudo apt-get install -y bats
- name: Bats coverage
  run: npm run test:bats
```

## Exit-code policy summary

| Script | All-green | Missing required tool |
|--------|-----------|-----------------------|
| `scripts/pptx-to-images.sh` | 0 | 1–5 (per-stage) |
| `hooks/check-deps.sh` | 0 | **0** (FOUND-03 non-blocking; surfaces message only) |
| `skills/doctor/scripts/check.sh` | 0 | 1 (user-invoked diagnostic) |
