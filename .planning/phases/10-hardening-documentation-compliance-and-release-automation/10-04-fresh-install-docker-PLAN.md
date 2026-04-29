---
plan: 10-04
phase: 10
slug: fresh-install-docker
status: ready
created: 2026-04-29
wave: 2
depends_on: [10-01, 10-02, 10-03]
autonomous: true
files_modified:
  - tests/automation/fresh-install.test.js
  - tests/automation/Dockerfile.fresh-install
  - tests/automation/lib/canonical-brief.json
  - tests/automation/scripts/run-fresh-install.sh
  - package.json
requirements: [HARD-12]

must_haves:
  truths:
    - "tests/automation/Dockerfile.fresh-install builds a Linux container based on `node:22-bookworm-slim` that installs LibreOffice (`libreoffice-impress`), Poppler (`poppler-utils`), fontconfig, and IBM Plex Sans (copied from the repo's `assets/fonts/IBM_Plex_Sans/` into `/usr/share/fonts/truetype/IBMPlex/` followed by `fc-cache -fv`); container WORKDIR is `/instadecks` and on entry runs `npm ci --omit=dev` (matching the SessionStart-hook first-run behavior); CLAUDE_PLUGIN_ROOT and CLAUDE_PLUGIN_DATA env vars are set to `/instadecks` so plugin-relative paths resolve"
    - "tests/automation/scripts/run-fresh-install.sh is the in-container entrypoint: invokes the 4 user-invocable skills' CLI entry points in sequence — `node skills/create/scripts/cli.js --brief tests/automation/lib/canonical-brief.json --out /tmp/run-XXXX`, then `node skills/review/scripts/cli.js --deck /tmp/run-XXXX/deck.pptx`, then `node skills/content-review/scripts/cli.js --deck /tmp/run-XXXX/deck.pptx`, then `node skills/annotate/scripts/cli.js --deck /tmp/run-XXXX/deck.pptx --findings /tmp/run-XXXX/deck.review.json`; verifies each step produced its expected artifacts (deck.pptx ≥ 10 KB, deck.pdf ≥ 5 KB, deck.review.json valid JSON, deck.annotated.pptx ≥ 10 KB, deck.annotated.pdf ≥ 5 KB); writes a JSON manifest to `/tmp/fresh-install-result.json` with `{ok:true, artifacts:[...], byteSizes:{...}}`"
    - "tests/automation/lib/canonical-brief.json is the single canonical brief used: `{title:'AI in Healthcare 2026', audience:'Hospital execs', purpose:'Funding ask', key_messages:[5 strings], tone:'editorial-mono'}` — small but exercises all 8 slide types via the create cookbook"
    - "tests/automation/fresh-install.test.js spawns `docker build -f tests/automation/Dockerfile.fresh-install -t instadecks-fresh-install:test .` then `docker run --rm -v $PWD:/instadecks-src:ro instadecks-fresh-install:test bash tests/automation/scripts/run-fresh-install.sh`; reads the resulting `/tmp/fresh-install-result.json` from the container's stdout-emitted final line; asserts `ok===true` and that all 5 expected artifacts exist with byte sizes ≥ thresholds"
    - "Test is gated by `process.env.CI || process.env.RUN_DOCKER_TESTS === '1'` — locally, devs opt-in with `RUN_DOCKER_TESTS=1`; in CI, runs always when `docker` binary is present (Linux runner); on macOS hosts without docker binary, test is `t.skip()` with reason logged"
    - "Wall-clock budget: image build ≤ 5 minutes (cached layers reduce subsequent runs to <90s); skill chain ≤ 8 minutes (real soffice + LLM mocked via `INSTADECKS_LLM_STUB=1` env injected into the docker run command — the test verifies bytes, not LLM output quality)"
    - "Mac and Windows runner variants are explicitly OUT OF SCOPE per SPEC §Out of Scope; documented in plan SUMMARY as deferred to v1.x; native Mac install remains verified via 2 prior clean live-E2E iterations on the dev machine (recorded in .planning/STATE.md)"
    - "package.json gains script `\"gate:fresh-install\": \"node --test tests/automation/fresh-install.test.js\"`"
  artifacts:
    - path: "tests/automation/Dockerfile.fresh-install"
      provides: "Reproducible Linux container with all system deps + fonts"
      contains: "libreoffice-impress"
    - path: "tests/automation/scripts/run-fresh-install.sh"
      provides: "In-container 4-skill chain harness"
      contains: "fresh-install-result.json"
    - path: "tests/automation/lib/canonical-brief.json"
      provides: "Single canonical brief (exercises 8 slide types)"
      contains: "AI in Healthcare 2026"
    - path: "tests/automation/fresh-install.test.js"
      provides: "Docker-driven integration test"
      contains: "docker build"
    - path: "package.json"
      provides: "gate:fresh-install npm script"
      contains: "gate:fresh-install"
  key_links:
    - from: "tests/automation/fresh-install.test.js"
      to: "tests/automation/Dockerfile.fresh-install"
      via: "spawn docker build/run; mount repo as :ro volume"
      pattern: "docker build"
    - from: "tests/automation/scripts/run-fresh-install.sh"
      to: "tests/automation/lib/canonical-brief.json"
      via: "passes --brief flag to skills/create/scripts/cli.js"
      pattern: "canonical-brief.json"
---

<objective>
Wave 4 — automate the third human-only release gate: fresh-install (HARD-12). Replace `tests/FRESH-INSTALL.md` (manual 6-step Mac+Windows checklist) with a Docker-driven integration test that spins up an isolated Linux container with no Instadecks state, installs system prerequisites, runs `npm ci --omit=dev` (matching the SessionStart hook first-run behavior), and exercises all 4 user-invocable skills against a single canonical brief — verifying the byte sizes of the 5 produced artifacts.

The test runs in CI on Linux runners where `docker` is available, opts-in locally via `RUN_DOCKER_TESTS=1`, and silently skips on macOS hosts without docker. Mac and Windows native runners are explicitly OUT OF SCOPE per SPEC and deferred to v1.x.

Output: 1 test file + 1 Dockerfile + 1 in-container harness + 1 canonical brief + 1 npm script.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/SPEC.md
@tests/FRESH-INSTALL.md
@hooks/check-deps.sh
@skills/create/scripts/cli.js
@skills/review/scripts/cli.js
@skills/content-review/scripts/cli.js
@skills/annotate/scripts/cli.js
</context>

<tasks>

<task type="auto">
  <name>Task 1: Author Dockerfile + canonical-brief.json + in-container harness script</name>
  <read_first>hooks/check-deps.sh (matches the prerequisite list — soffice, pdftoppm, IBM Plex Sans, node 18+); package.json (production deps to confirm `npm ci --omit=dev` is sufficient); skills/create/scripts/cli.js (CLI flags — verify --brief and --out are correct flag names from Phase 9-04 polymorphic intake); skills/review/scripts/cli.js, skills/content-review/scripts/cli.js, skills/annotate/scripts/cli.js (CLI flag names); assets/fonts/IBM_Plex_Sans/ (font files to copy into image)</read_first>
  <files>tests/automation/Dockerfile.fresh-install, tests/automation/lib/canonical-brief.json, tests/automation/scripts/run-fresh-install.sh</files>
  <action>
1. **Dockerfile.fresh-install** (≤30 lines):
   ```
   FROM node:22-bookworm-slim
   ENV DEBIAN_FRONTEND=noninteractive
   RUN apt-get update && apt-get install -y --no-install-recommends \
         libreoffice-impress poppler-utils fontconfig ca-certificates \
         && rm -rf /var/lib/apt/lists/*
   WORKDIR /instadecks
   COPY assets/fonts/IBM_Plex_Sans/ /usr/share/fonts/truetype/IBMPlex/
   RUN fc-cache -fv
   COPY package.json package-lock.json ./
   RUN npm ci --omit=dev
   COPY . .
   ENV CLAUDE_PLUGIN_ROOT=/instadecks
   ENV CLAUDE_PLUGIN_DATA=/instadecks
   ENV INSTADECKS_LLM_STUB=1
   CMD ["bash", "tests/automation/scripts/run-fresh-install.sh"]
   ```
2. **canonical-brief.json**: a structured JSON brief with all 8 slide types referenced — title, 5 key_messages (each becomes a section/2col/comparison/data-chart/data-table/stat-callout/quote/closing slide via the cookbook); tone `editorial-mono`; audience/purpose set per the must_haves.
3. **run-fresh-install.sh** (in-container, bash):
   - Set `OUT=$(mktemp -d -t instadecks-XXXXXX)`.
   - Step 1: `node skills/create/scripts/cli.js --brief tests/automation/lib/canonical-brief.json --out "$OUT"` → expect `$OUT/deck.pptx` and `$OUT/deck.pdf`.
   - Step 2: `node skills/review/scripts/cli.js --deck "$OUT/deck.pptx"` → expect `$OUT/deck.review.json`.
   - Step 3: `node skills/content-review/scripts/cli.js --deck "$OUT/deck.pptx"` → expect `$OUT/deck.content-review.json`.
   - Step 4: `node skills/annotate/scripts/cli.js --deck "$OUT/deck.pptx" --findings "$OUT/deck.review.json"` → expect `$OUT/deck.annotated.pptx` + `$OUT/deck.annotated.pdf`.
   - Verify byte sizes (PPTX ≥ 10 KB, PDF ≥ 5 KB, JSON parses).
   - Write final manifest to `/tmp/fresh-install-result.json` AND emit a final stdout line `RESULT=<base64-of-json>` for the host test to capture.
   - Trap to ensure cleanup of `$OUT` (or skip cleanup if `KEEP_OUT=1` for diagnostics).
   - On any failure: emit `RESULT={"ok":false,"error":"..."}\n` and exit 1.
4. **Make harness executable:** `chmod +x tests/automation/scripts/run-fresh-install.sh` so the verify step's `test -x` check passes and Docker `CMD ["bash", ...]` invocation works on hosts that preserve mode bits.

**Note (revision — checker B-2):** This plan now declares `depends_on: [10-01, 10-02, 10-03]` to serialize the `package.json` script-block edit shared with 10-03 (gate:activation-panel, gate:permission-mode) and 10-05 (release:dry-run, release). Wave 2 places this plan strictly after 10-03 in Wave 1; the package.json edit in Task 2 (`gate:fresh-install`) appends to whatever 10-03 wrote.
  </action>
  <verify>
    <automated>test -f tests/automation/Dockerfile.fresh-install && test -f tests/automation/lib/canonical-brief.json && test -x tests/automation/scripts/run-fresh-install.sh && bash -n tests/automation/scripts/run-fresh-install.sh</automated>
  </verify>
  <acceptance_criteria>
    - `bash -n tests/automation/scripts/run-fresh-install.sh` exits 0 (syntax)
    - Dockerfile contains `libreoffice-impress`, `poppler-utils`, `IBMPlex`, `npm ci --omit=dev`
    - canonical-brief.json is valid JSON: `node -e "JSON.parse(require('fs').readFileSync('tests/automation/lib/canonical-brief.json','utf8'))"` exits 0
    - run-fresh-install.sh references all 4 user-invocable CLIs by their actual paths under `skills/<name>/scripts/cli.js`
  </acceptance_criteria>
  <done>Dockerfile + harness + canonical brief authored.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Author tests/automation/fresh-install.test.js (host-side docker-build + run + assertions)</name>
  <read_first>tests/automation/Dockerfile.fresh-install (Task 1 output); tests/automation/scripts/run-fresh-install.sh (Task 1 output); existing test that spawns child processes for style — tests/orchestrator-runCreate-branches.test.js</read_first>
  <files>tests/automation/fresh-install.test.js</files>
  <behavior>
    - On a host with `docker` available + (CI=true OR RUN_DOCKER_TESTS=1): test runs `docker build` and `docker run`, parses the final `RESULT=<base64>` line from container stdout, asserts `ok===true` and all 5 expected artifacts have byte sizes meeting thresholds.
    - On a host without `docker` binary OR with neither CI nor RUN_DOCKER_TESTS set: `t.skip(reason)` with a clear message.
    - Wall clock with cached image: ≤ 90 seconds (assert via `t.diagnostic`).
  </behavior>
  <action>
1. At top of test file, gate: `const enabled = (process.env.CI === 'true' || process.env.RUN_DOCKER_TESTS === '1') && hasDocker();` where `hasDocker()` runs `child_process.spawnSync('which', ['docker']).status === 0`.
2. If !enabled: `test('fresh-install docker harness', { skip: true }, () => {})` with a `t.diagnostic` reason.
3. If enabled: 
   - `test('docker build succeeds')`: `spawnSync('docker', ['build','-f','tests/automation/Dockerfile.fresh-install','-t','instadecks-fresh-install:test','.'])`; assert exit 0 within 5min timeout.
   - `test('docker run completes the 4-skill chain and produces artifacts')`: `spawnSync('docker', ['run','--rm','instadecks-fresh-install:test'])`; capture stdout; find the line starting `RESULT=`; base64-decode the rest; parse JSON; assert `ok===true` and `byteSizes.deckPptx >= 10240`, `byteSizes.deckPdf >= 5120`, `byteSizes.annotatedPptx >= 10240`, `byteSizes.annotatedPdf >= 5120`, `artifacts.length === 5`.
4. Add `package.json` script: `"gate:fresh-install": "node --test tests/automation/fresh-install.test.js"`.
  </action>
  <verify>
    <automated>node --test tests/automation/fresh-install.test.js</automated>
  </verify>
  <acceptance_criteria>
    - On a host without docker AND without CI/RUN_DOCKER_TESTS: test reports skipped (exit 0)
    - On the dev machine with `docker` available + `RUN_DOCKER_TESTS=1`: full chain runs and passes; produces real artifacts in container; byte-size assertions pass
    - `grep "gate:fresh-install" package.json` returns ≥ 1 line
    - Wall-clock with cached image ≤ 90s (verified via `t.diagnostic` observation)
  </acceptance_criteria>
  <done>Fresh-install Docker harness automated; gates correctly; on-host devs can opt-in via RUN_DOCKER_TESTS=1.</done>
</task>

</tasks>

<verification>
- HARD-12: fresh-install gate automated via Docker on Linux
- All 4 user-invocable skills produce real PPTX/PDF/findings/annotated artifacts in isolated container
- Mac+Windows variants documented as deferred (SPEC §Out of Scope)
- `npm run gate:fresh-install` is the new automated gate; replaces tests/FRESH-INSTALL.md as release-blocking
</verification>

<success_criteria>
- AC-12 satisfied per SPEC.md
- Test correctly skips on hosts without docker
- Cached image rebuild < 90s
</success_criteria>

<output>
After completion, create `.planning/phases/10-hardening-documentation-compliance-and-release-automation/10-04-SUMMARY.md`.
</output>
