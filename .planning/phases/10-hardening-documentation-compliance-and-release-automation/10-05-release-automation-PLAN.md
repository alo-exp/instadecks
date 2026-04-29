---
plan: 10-05
phase: 10
slug: release-automation
status: ready
created: 2026-04-29
wave: 3
depends_on: [10-03, 10-04]
autonomous: true
files_modified:
  - tools/submit-marketplace-pr.sh
  - tools/release-v0.1.0.sh
  - .planning/marketplace-patch.json
  - tests/tools-submit-marketplace-pr.test.js
  - tests/tools-release-v0-1-0.test.js
  - package.json
requirements: [HARD-13, HARD-14]

must_haves:
  truths:
    - "tools/submit-marketplace-pr.sh is an executable bash script that, given a clean working tree on tag v0.1.0, uses `gh` CLI to: (1) fork `alo-labs/claude-plugins` to the authenticated user (idempotent — `gh repo fork --clone=false alo-labs/claude-plugins` skips if already forked); (2) clone or update the fork to a temp dir; (3) apply the marketplace catalog patch from `.planning/marketplace-patch.json` (which lists the file to patch + the JSON insertion); (4) commit on a new branch named `add-instadecks-v0.1.0`; (5) push to fork; (6) open PR via `gh pr create --repo alo-labs/claude-plugins --title 'Add instadecks plugin v0.1.0' --body-file .planning/marketplace-pr.md --head <fork-owner>:add-instadecks-v0.1.0`; (7) capture PR URL into `.planning/RELEASE.md` under a new `### Marketplace PR` line"
    - ".planning/marketplace-patch.json (if not already present at this exact path; existing copy at .planning/phases/07-marketplace-release/marketplace-patch.json is the canonical source — copy or symlink to .planning/marketplace-patch.json) describes: `{target_file: 'plugins.json', insert_after_path: '<jsonpath>', entry: <contents of .planning/marketplace-entry.json>}`. The script reads this and applies the JSON merge."
    - "tools/release-v0.1.0.sh runs the full chain in order, halting on first failure: (1) confirm clean working tree (`git status --porcelain` empty); (2) confirm on `main` and HEAD matches `origin/main`; (3) `npm run lint:paths`; (4) `node tools/lint-pptxgenjs-enums.js`; (5) `node tools/license-audit.js`; (6) `node tools/validate-manifest.js`; (7) `node tools/lint-doc-size.js && node tools/lint-doc-size.js --orphans`; (8) `npm test` (= c8 100%); (9) `npm run test:bats`; (10) `npm run gate:activation-panel`; (11) `npm run gate:permission-mode`; (12) `npm run gate:fresh-install` (skipped if docker absent + a warning printed; not skipped if `STRICT=1` env var set); on green: (13) flip `.planning/STATE.md` Status line to `released`; (14) prepend a CHANGELOG entry to `docs/CHANGELOG.md` AND root-level `CHANGELOG.md` if it exists; (15) `git tag -s v0.1.0 -m 'v0.1.0 — first marketplace release; see .planning/RELEASE.md'` (signed tag — see action note for unsigned fallback); (16) `git push origin v0.1.0`; (17) call `tools/submit-marketplace-pr.sh`; (18) print success summary"
    - "tools/release-v0.1.0.sh accepts `--dry-run` flag: runs gates 1-12 but skips 13-17; prints the actions it WOULD have taken; exits 0 on green"
    - "tools/release-v0.1.0.sh respects `STRICT=1` env: when set, gate 12 (gate:fresh-install) is non-skippable — docker missing fails the chain"
    - "package.json adds 2 scripts: `\"release:dry-run\": \"bash tools/release-v0.1.0.sh --dry-run\"` and `\"release\": \"bash tools/release-v0.1.0.sh\"`"
    - "tests/tools-submit-marketplace-pr.test.js validates the script's behavior in a sandboxed mode: a `--simulate` flag short-circuits the actual `gh` calls and instead prints what would be executed; test asserts the printed plan contains expected steps (fork, clone, apply patch, commit, push, gh pr create) in the correct order"
    - "tests/tools-release-v0-1-0.test.js validates the script with `--dry-run --simulate`: asserts the gate sequence runs (1..12) and that on green, the script prints the would-be actions for steps 13-17 without executing them; uses test-only env `INSTADECKS_RELEASE_SIMULATE=1` to short-circuit destructive operations"
  artifacts:
    - path: "tools/submit-marketplace-pr.sh"
      provides: "gh-CLI driven marketplace PR submission"
      contains: "gh pr create"
    - path: "tools/release-v0.1.0.sh"
      provides: "End-to-end release automation with dry-run mode"
      contains: "git tag"
    - path: "tests/tools-submit-marketplace-pr.test.js"
      provides: "Sandboxed test of marketplace-PR script"
      contains: "--simulate"
    - path: "tests/tools-release-v0-1-0.test.js"
      provides: "Sandboxed test of release script (dry-run path)"
      contains: "--dry-run"
    - path: "package.json"
      provides: "release:dry-run + release npm scripts"
      contains: "release:dry-run"
  key_links:
    - from: "tools/release-v0.1.0.sh"
      to: "tools/submit-marketplace-pr.sh"
      via: "step 17 invokes the marketplace-PR script after tag push"
      pattern: "submit-marketplace-pr.sh"
    - from: "tools/submit-marketplace-pr.sh"
      to: ".planning/marketplace-patch.json + .planning/marketplace-pr.md"
      via: "reads patch contents + PR body"
      pattern: "marketplace-pr.md"
---

<objective>
Wave 5 — automate the last two human-only release gates: marketplace PR submission (HARD-13) and tag push (HARD-14). The two are deliberately split into separate scripts because the marketplace PR script is reusable for future versions while the release script is v0.1.0-specific (handles the first-tag flow including STATE.md `released` flip).

Both scripts are idempotent where possible (fork: skip if exists; clone: pull if exists; tag: fail loudly if v0.1.0 exists rather than silently re-tag).

Output: 2 bash scripts + 2 sandboxed tests + 1 marketplace-patch.json (copied from existing phase-07 location) + 2 npm scripts.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/SPEC.md
@.planning/RELEASE.md
@.planning/marketplace-pr.md
@.planning/marketplace-entry.json
@.planning/phases/07-marketplace-release/marketplace-patch.json
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Author tools/submit-marketplace-pr.sh + sandboxed test</name>
  <read_first>.planning/marketplace-pr.md (PR body content); .planning/marketplace-entry.json (entry schema); .planning/phases/07-marketplace-release/marketplace-patch.json (existing patch shape — copy to .planning/marketplace-patch.json if not already there); existing bash scripts under tools/ for style — tools/lint-paths.sh and skills/doctor/scripts/check.sh</read_first>
  <files>.planning/marketplace-patch.json, tools/submit-marketplace-pr.sh, tests/tools-submit-marketplace-pr.test.js</files>
  <behavior>
    - `bash tools/submit-marketplace-pr.sh --simulate` prints a plan including the literal lines `PLAN: gh repo fork --clone=false alo-labs/claude-plugins`, `PLAN: gh pr create --repo alo-labs/claude-plugins ...`, exits 0, makes NO network calls.
    - `bash tools/submit-marketplace-pr.sh` (no flag) executes the real chain; if the working tree is dirty or `gh` is not authenticated, exits 1 with a clear error.
    - On success, appends `### Marketplace PR\n<URL>\n` to `.planning/RELEASE.md`.
  </behavior>
  <action>
1. Copy `.planning/phases/07-marketplace-release/marketplace-patch.json` to `.planning/marketplace-patch.json` (or read its contents and re-author at the new path with the same shape). Verify JSON parses.
2. Author `tools/submit-marketplace-pr.sh`:
   ```bash
   #!/usr/bin/env bash
   set -euo pipefail
   SIMULATE=0
   for arg in "$@"; do [[ "$arg" == "--simulate" ]] && SIMULATE=1; done
   plan() { echo "PLAN: $*"; }
   run() { if [[ $SIMULATE == 1 ]]; then plan "$*"; else "$@"; fi; }
   # Pre-flight
   command -v gh >/dev/null || { echo "submit-marketplace-pr: gh not installed" >&2; exit 1; }
   [[ $SIMULATE == 1 ]] || gh auth status >/dev/null || { echo "submit-marketplace-pr: gh not authenticated" >&2; exit 1; }
   # Step 1: fork
   run gh repo fork --clone=false alo-labs/claude-plugins
   # Step 2: clone fork
   FORK_OWNER=$([[ $SIMULATE == 1 ]] && echo "<fork-owner>" || gh api user --jq .login)
   TMPDIR=$(mktemp -d -t marketplace-fork-XXXXXX)
   run git clone "https://github.com/${FORK_OWNER}/claude-plugins.git" "$TMPDIR"
   # Step 3: apply patch
   if [[ $SIMULATE == 1 ]]; then plan "node -e <apply marketplace-patch.json to plugins.json>"; else node -e "$(cat <<'EOF'
   const fs=require('fs'),path=require('path');
   const patch=JSON.parse(fs.readFileSync('.planning/marketplace-patch.json','utf8'));
   const target=path.join(process.env.TMPDIR_OVERRIDE,patch.target_file);
   const cur=JSON.parse(fs.readFileSync(target,'utf8'));
   // simple append-to-array semantics; refine per actual marketplace schema
   if (Array.isArray(cur.plugins)) cur.plugins.push(patch.entry); else throw new Error('unexpected schema');
   fs.writeFileSync(target, JSON.stringify(cur,null,2)+'\n');
   EOF
   )"; fi
   # Step 4-6: branch, commit, push
   BRANCH="add-instadecks-v0.1.0"
   run git -C "$TMPDIR" checkout -b "$BRANCH"
   run git -C "$TMPDIR" add -A
   run git -C "$TMPDIR" commit -m "Add instadecks plugin v0.1.0"
   run git -C "$TMPDIR" push -u origin "$BRANCH"
   # Step 7: PR
   run gh pr create --repo alo-labs/claude-plugins \
     --title "Add instadecks plugin v0.1.0" \
     --body-file "$PWD/.planning/marketplace-pr.md" \
     --head "${FORK_OWNER}:${BRANCH}"
   # Step 8: capture URL
   if [[ $SIMULATE == 0 ]]; then
     PR_URL=$(gh pr view --repo alo-labs/claude-plugins --json url --jq .url 2>/dev/null || echo "<URL not available — check gh manually>")
     printf "\n### Marketplace PR\n%s\n" "$PR_URL" >> .planning/RELEASE.md
   fi
   echo "submit-marketplace-pr: OK"
   ```
3. `chmod +x tools/submit-marketplace-pr.sh`.
4. Test: `tests/tools-submit-marketplace-pr.test.js`:
   - `test('--simulate prints plan and exits 0')`: spawn the script with `--simulate`, assert exit 0, stdout contains `PLAN: gh repo fork`, `PLAN: gh pr create`, no PR URL appended to RELEASE.md.
   - `test('--simulate makes no network calls')`: assert `gh` is referenced only in plan output, not invoked (verify by setting `PATH=/empty:$PATH` and confirming the simulate path still exits 0).
  </action>
  <verify>
    <automated>chmod +x tools/submit-marketplace-pr.sh && bash tools/submit-marketplace-pr.sh --simulate && node --test tests/tools-submit-marketplace-pr.test.js</automated>
  </verify>
  <acceptance_criteria>
    - `bash tools/submit-marketplace-pr.sh --simulate` exits 0
    - `grep "PLAN: gh pr create" <(bash tools/submit-marketplace-pr.sh --simulate)` returns 1
    - `.planning/marketplace-patch.json` exists at the expected path and is valid JSON
    - 2 test cases pass; no network calls in simulate path (verifiable by running with `PATH=/empty:$PATH`)
  </acceptance_criteria>
  <done>Marketplace-PR submission script + sandboxed test green.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Author tools/release-v0.1.0.sh + sandboxed dry-run test + 2 npm scripts</name>
  <read_first>tools/submit-marketplace-pr.sh (Task 1 output); package.json scripts block; .github/workflows/ci.yml (mirror gate ordering); .planning/STATE.md (Status line to flip); docs/CHANGELOG.md (entry style)</read_first>
  <files>tools/release-v0.1.0.sh, tests/tools-release-v0-1-0.test.js, package.json</files>
  <behavior>
    - `bash tools/release-v0.1.0.sh --dry-run` runs gates 1-12 (lint paths, lint enums, license-audit, manifest validator, doc-size + orphans, c8 100% test, bats, activation-panel, permission-mode, fresh-install — fresh-install non-strict-skippable when docker absent), prints "DRY-RUN: would tag v0.1.0", "DRY-RUN: would push tag", "DRY-RUN: would call submit-marketplace-pr.sh", and exits 0 if all gates pass.
    - `bash tools/release-v0.1.0.sh` (no flag) runs the full chain; on green, signs and pushes the tag, updates STATE.md + CHANGELOG, calls submit-marketplace-pr.sh.
    - `STRICT=1 bash tools/release-v0.1.0.sh --dry-run` fails if docker is absent (gate:fresh-install non-skippable).
    - `INSTADECKS_RELEASE_SIMULATE=1 bash tools/release-v0.1.0.sh --dry-run` further short-circuits all gate invocations to `echo PLAN: <gate>` for fast unit testing — used only by `tests/tools-release-v0-1-0.test.js`.
  </behavior>
  <action>
1. Author `tools/release-v0.1.0.sh`:
   ```bash
   #!/usr/bin/env bash
   set -euo pipefail
   DRY_RUN=0; STRICT=${STRICT:-0}; SIM=${INSTADECKS_RELEASE_SIMULATE:-0}
   for arg in "$@"; do [[ "$arg" == "--dry-run" ]] && DRY_RUN=1; done
   gate() {
     local label="$1"; shift
     if [[ $SIM == 1 ]]; then echo "PLAN: $label -> $*"; return 0; fi
     echo ">>> $label"
     "$@"
   }
   action() {
     local label="$1"; shift
     if [[ $DRY_RUN == 1 || $SIM == 1 ]]; then echo "DRY-RUN: would $label -> $*"; return 0; fi
     echo "+++ $label"
     "$@"
   }
   # Pre-flight
   if [[ $SIM == 0 ]]; then
     [[ -z "$(git status --porcelain)" ]] || { echo "release: dirty working tree" >&2; exit 1; }
     [[ "$(git rev-parse --abbrev-ref HEAD)" == "main" ]] || { echo "release: not on main" >&2; exit 1; }
     git fetch origin main >/dev/null
     [[ "$(git rev-parse HEAD)" == "$(git rev-parse origin/main)" ]] || { echo "release: HEAD diverges from origin/main" >&2; exit 1; }
   fi
   # Gates 1-11
   gate "lint:paths" bash tools/lint-paths.sh
   gate "lint:enums" node tools/lint-pptxgenjs-enums.js
   gate "license-audit" node tools/license-audit.js
   gate "manifest-validator" node tools/validate-manifest.js
   gate "doc-size" bash -c "node tools/lint-doc-size.js && node tools/lint-doc-size.js --orphans"
   gate "test (c8 100%)" npm test
   gate "bats" npm run test:bats
   gate "activation-panel" npm run gate:activation-panel
   gate "permission-mode" npm run gate:permission-mode
   # Gate 12 — fresh-install (skip if docker absent unless STRICT)
   if command -v docker >/dev/null; then
     gate "fresh-install" env RUN_DOCKER_TESTS=1 npm run gate:fresh-install
   elif [[ $STRICT == 1 ]]; then
     echo "release: STRICT=1 + docker missing — fail" >&2; exit 1
   else
     echo "release: docker absent — gate:fresh-install SKIPPED (set STRICT=1 to require)"
   fi
   # Actions 13-17
   action "flip STATE.md to released" sed -i.bak 's/^Status:.*/Status: released/' .planning/STATE.md
   action "prepend CHANGELOG entry" bash -c "echo '## v0.1.0 — '$(date +%Y-%m-%d)$'\n- First marketplace release; see .planning/RELEASE.md\n' | cat - docs/CHANGELOG.md > /tmp/CHANGELOG.new && mv /tmp/CHANGELOG.new docs/CHANGELOG.md"
   action "commit STATE + CHANGELOG" git commit -am "release: v0.1.0"
   if git config --get user.signingkey >/dev/null 2>&1; then
     action "tag v0.1.0 (signed)" git tag -s v0.1.0 -m "v0.1.0 — first marketplace release; see .planning/RELEASE.md"
   else
     echo "release: gpg signing key not configured — falling back to unsigned annotated tag"
     action "tag v0.1.0 (unsigned)" git tag -a v0.1.0 -m "v0.1.0 — first marketplace release; see .planning/RELEASE.md"
   fi
   action "push commit" git push origin main
   action "push tag" git push origin v0.1.0
   action "submit marketplace PR" bash tools/submit-marketplace-pr.sh
   echo "release: OK"
   ```
   Signing fallback (revision — checker W-1): the script body MUST contain the explicit `if git config --get user.signingkey >/dev/null; then git tag -s ...; else git tag -a ...; fi` block shown above. No prose-only fallback — the conditional is in the script. Document in plan SUMMARY whether the maintainer's environment used signed or unsigned path.
2. `chmod +x tools/release-v0.1.0.sh`.
3. Test: `tests/tools-release-v0-1-0.test.js`:
   - `test('--dry-run with INSTADECKS_RELEASE_SIMULATE=1 prints all gate plans + DRY-RUN actions and exits 0')`: spawn with both flags + env; assert exit 0; assert stdout contains `PLAN: lint:paths`, `PLAN: test (c8 100%)`, `PLAN: activation-panel`, `PLAN: permission-mode`, `PLAN: fresh-install` (or the docker-skip line), `DRY-RUN: would tag v0.1.0`, `DRY-RUN: would submit marketplace PR`.
   - `test('STRICT=1 + docker missing fails')`: spawn with `STRICT=1`, mock docker-absent by `PATH=/empty:$PATH`, assert exit 1, stderr contains `STRICT=1 + docker missing`.
4. `package.json`:
   ```
   "release:dry-run": "bash tools/release-v0.1.0.sh --dry-run",
   "release": "bash tools/release-v0.1.0.sh",
   ```
  </action>
  <verify>
    <automated>chmod +x tools/release-v0.1.0.sh && INSTADECKS_RELEASE_SIMULATE=1 bash tools/release-v0.1.0.sh --dry-run && node --test tests/tools-release-v0-1-0.test.js</automated>
  </verify>
  <acceptance_criteria>
    - `INSTADECKS_RELEASE_SIMULATE=1 bash tools/release-v0.1.0.sh --dry-run` exits 0 and prints all 11+ `PLAN:` lines
    - `bash tools/release-v0.1.0.sh --dry-run` (no SIM env) on a clean tree runs the real gates and exits 0
    - 2 test cases pass
    - `grep -c "release:dry-run\|\"release\":" package.json` returns ≥ 2
    - Script tolerates missing gpg signing config (falls back to unsigned tag with warning)
  </acceptance_criteria>
  <done>Release-v0.1.0 script + dry-run flag + 2 npm scripts + sandboxed test green.</done>
</task>

</tasks>

<verification>
- HARD-13: marketplace PR submission scripted via gh CLI; sandboxed test green
- HARD-14: release-v0.1.0 script chains all gates + tag + STATE/CHANGELOG flip + marketplace PR; dry-run path tested
- 2 new npm scripts (`release:dry-run`, `release`) live
- Sandbox tests don't make network calls or push tags
</verification>

<success_criteria>
- AC-13, AC-14 satisfied per SPEC.md
- `npm run release:dry-run` runs the full automated chain without pushing
- All sandbox tests pass; no destructive operations executed during testing
</success_criteria>

<output>
After completion, create `.planning/phases/10-hardening-documentation-compliance-and-release-automation/10-05-SUMMARY.md`.
</output>
