# Pre-Release Quality Gate — Instadecks

Before ANY release, the following four-stage quality gate MUST be completed in order.

**IMPORTANT**: This gate runs AFTER normal workflow finalization and BEFORE creating a GitHub release.

Adapted from the TopGun pre-release quality gate pattern (alo-labs/topgun@1.7.4).

---

## Enforcement

**State file**: `~/.claude/.instadecks/quality-gate.state`

**Required markers** (must all be present before release):
- `quality-gate-stage-1`
- `quality-gate-stage-2`
- `quality-gate-stage-3`
- `quality-gate-stage-4`

**Session reset**: Run `rm ~/.claude/.instadecks/quality-gate.state` at the start of each new release session to clear markers from a previous run. The gate must be completed in full during the session in which the release is being cut.

Each stage is complete only when:
1. The work is done and verified
2. The `/superpowers:verification-before-completion` skill has been invoked (or inline verification performed)
3. The marker is written: `echo "quality-gate-stage-N" >> ~/.claude/.instadecks/quality-gate.state`

**Violating the verification rule is equivalent to skipping the stage.**

---

## Stage 1 — Code Review Triad

**Goal**: Zero accepted issues across all source files changed in this release.

Three sequential passes: functionality, structure, and security. Complete each before moving to the next.

### Pass 1 — Functionality Review

Run `/engineering:code-review` on each file below. Record findings, fix all accepted issues, re-run until clean.

**`commands/instadecks-create.md`**
- Verify the auto-refine loop section describes the full cycle (interrupt → render → review → triage → hash → ledger → oscillation → convergence → soft-cap)
- Confirm the convergence rule (`findings_genuine == 0 AND cycle >= 2`) is stated and that cycle 1 with zero findings forces a confirmation cycle (D-07)
- Verify the post-loop bundle step mirrors artifacts to `/tmp/<project_slug>/` and surfaces `file://` URIs
- Confirm design DNA picker (hash-seed, diversity audit, tone-fit gate, defaults prohibition) is all present
- Verify ENUM constants rule and 6-char hex no-`#` rules are stated

**`commands/instadecks-review.md`**
- Verify the DECK-VDA 4-pass methodology (MACRO/TYPOGRAPHY/DATA/MICRO) is described with the full 4-tier severity grammar
- Confirm the severity-collapse boundary: producers emit full 4-tier, collapse happens only at `/instadecks-annotate` adapter
- Verify the two-report architecture (fixed template + narrative) is described with distinct responsibilities
- Confirm the scoped review mode (`slidesToReview`) is documented including cycle-1 full-review rule

**`commands/instadecks-annotate.md`**
- Verify the adapter validates findings upfront and fails loud (no silent skipping)
- Confirm the 4→3 severity collapse table is correct (Critical+Major → major; Minor → minor; Nitpick → polish)
- Verify outputs are delta-only (not full deck with overlays burned in)

**`commands/instadecks-content-review.md`**
- Verify the content-vs-design boundary is hard (no visual/typographic findings)
- Confirm the 4-tier severity grammar is producer-side only (no pre-collapse)

**`commands/instadecks-doctor.md`**
- Verify the 5 probes are listed (node version, soffice, pdftoppm, pptxgenjs@4.0.1, IBM Plex Sans)
- Confirm the output format (OK/MISSING/WARN rows with install hints per OS)
- Verify pptxgenjs is checked against `${CLAUDE_PLUGIN_DATA}/node_modules/pptxgenjs/package.json`

**`commands/instadecks-update.md`**
- Verify steps 1–7 follow the topgun-update pattern faithfully
- Confirm `--check` flag is supported
- Verify the local dev path detection and warning is present
- Confirm integrity checks (`.claude-plugin/plugin.json`, `commands/instadecks-create.md`, `hooks/hooks.json`) occur before registry write
- Verify the stale-registry-entry pruning logic is correct

**`skills/*/scripts/` — key scripts**
- `skills/create/scripts/index.js` — verify `runCreate` returns the documented result shape
- `skills/review/scripts/index.js` — verify `runReview` returns the documented result shape
- `skills/annotate/scripts/index.js` — verify `runAnnotate` short-circuits on no genuine findings
- `skills/annotate/scripts/adapter.js` — verify severity collapse is applied correctly

**`.claude-plugin/plugin.json`**
- Verify `version` matches the release being cut
- Verify `hooks` path resolves to a real file
- No stale field references

**`docs/CHANGELOG.md`**
- Verify the new release entry is present, dated correctly, uses the correct version
- Verify it accurately lists all Added, Changed, and Fixed items
- Confirm no placeholder text ("TODO", "TBD", template stubs) remains

**Final diff review**
- `git diff <prev-tag>...HEAD` — confirm no unintended changes, no debug code, no temp workarounds

### Pass 2 — Structure Review

1. **Command file naming**: Every `commands/instadecks-*.md` file has a `name:` frontmatter field matching the filename stem, a `description:` field, and an `allowed-tools:` list. No orphaned `.md` files without frontmatter.

2. **Skills scripts layout**: Every `skills/<name>/scripts/` directory contains an `index.js` entry point. Shared helpers live in `scripts/` at plugin root, not duplicated across skills.

3. **Docs directory structure**: Verify `docs/` contains: `CHANGELOG.md`, `ARCHITECTURE.md`, `pre-release-quality-gate.md`. Flag any missing docs.

4. **Naming consistency**: Verify consistent spelling across all commands files, README.md, and CHANGELOG.md. Check: skill names (`/instadecks-create`, `/instadecks-review`, `/instadecks-annotate`, `/instadecks-content-review`, `/instadecks-doctor`, `/instadecks-update`), pptxgenjs pin (`4.0.1`), convergence rule phrasing.

5. **No orphaned files**: Check for files with no inbound references and no clear documented purpose.

6. **Cross-skill references**: All inter-skill references use `/instadecks-<name>` (hyphen, not colon). No stale `/instadecks-<name>` colon-namespaced references remain.

### Pass 3 — Security Review (preliminary)

1. **No hardcoded paths**: Run path lint:
   ```bash
   bash tools/lint-paths.sh
   ```
   Must exit 0.

2. **No hardcoded credentials**: Search all changed files:
   ```bash
   grep -rn "api_key\s*=\s*['\"]" commands/ skills/
   grep -rn "Bearer [a-zA-Z0-9]" commands/ skills/
   ```

3. **CLAUDE_PLUGIN_ROOT/DATA usage**: All script invocations in commands files use `${CLAUDE_PLUGIN_ROOT}` or `${CLAUDE_PLUGIN_DATA}` — never `~/.claude/`, `/Users/`, or `/home/`.

4. **Enum lint**: No string-literal pptxgenjs shape names:
   ```bash
   node tools/lint-pptxgenjs-enums.js
   ```
   Must exit 0.

### Completion

After all three passes complete with no blocking issues:

1. Verify: `npm test` exits 0 (or confirm CI is green on HEAD)
2. Write the marker:
   ```bash
   mkdir -p ~/.claude/.instadecks && echo "quality-gate-stage-1" >> ~/.claude/.instadecks/quality-gate.state
   ```

**Exit criteria**: Zero accepted code review findings across all three passes, tests green, marker written.

---

## Stage 2 — Big-Picture Consistency Audit

**Goal**: All components are consistent and correct as a whole system. No dimension can have unresolved gaps.

Run 4 parallel audit dimensions. Collect all findings. Fix all issues. Re-run until **two consecutive clean passes** across all 4 dimensions.

### Dimension A — Skills Consistency

Audit the orchestration chain: `instadecks-create → runCreate → runReview → runAnnotate`:

- **Severity taxonomy**: The 4-tier taxonomy (Critical/Major/Minor/Nitpick) is used consistently in `/instadecks-review` and `/instadecks-content-review` output. The 3-tier collapse (major/minor/polish) appears ONLY in `/instadecks-annotate` adapter.
- **Convergence rule**: The rule `findings_genuine == 0 AND cycle >= 2` is stated identically in `commands/instadecks-create.md` and `CLAUDE.md`. No divergence.
- **Content-vs-design boundary**: `/instadecks-review` explicitly excludes argument structure; `/instadecks-content-review` explicitly excludes visual/typographic issues. Both state the boundary.
- **Auto-refine D-07 confirmation**: Cycle 1 with zero genuine findings MUST force a confirmation cycle — this is stated in `commands/instadecks-create.md` and CLAUDE.md locked invariants.
- **No stale colon-namespaced references**: Search all commands files for `/instadecks-` (colon) — none should remain.

### Dimension B — File Structure Completeness

- Every command in `commands/` has all required frontmatter fields: `name`, `description`, `allowed-tools`, `user-invocable`, `version`
- Every skill in `skills/` has a `scripts/index.js` (for user-invocable skills: create, review, annotate, content-review)
- `hooks/hooks.json` references scripts that exist
- `tools/audit-allowed-tools.js` exits 0 against all command files:
  ```bash
  node tools/audit-allowed-tools.js
  ```
- `node tools/validate-manifest.js` exits 0

### Dimension C — Version and Pin Consistency

- `package.json` has `pptxgenjs` pinned at exactly `4.0.1` (no caret, no tilde):
  ```bash
  node tools/assert-pptxgenjs-pin.js
  ```
- `.claude-plugin/plugin.json` version matches the release being cut
- `CHANGELOG.md` top entry version matches the release being cut
- `README.md` version badge matches (if present)

### Dimension D — Documentation Accuracy

- `README.md` lists all 6 commands (`create`, `review`, `content-review`, `annotate`, `doctor`, `update`) — no missing or stale command names
- `docs/CHANGELOG.md` top entry accurately describes changes in this release
- `docs/ARCHITECTURE.md` reflects current file layout (commands/ not skills/ for skill files)
- No docs reference `skills/*/SKILL.md` paths as user-facing — those are internal legacy paths only

### Completion

After two consecutive clean passes across all 4 dimensions:

1. Confirm `npm run release:dry-run` exits 0
2. Write the marker:
   ```bash
   echo "quality-gate-stage-2" >> ~/.claude/.instadecks/quality-gate.state
   ```

**Exit criteria**: Two consecutive clean passes, no consistency gaps remain, marker written.

---

## Stage 3 — Public-Facing Content Refresh

**Goal**: Everything users see is accurate, complete, and reflects the current release.

### Step 1 — GitHub Repository Metadata

- **Description**: Verify the GitHub repo description accurately reflects current capabilities
- **Topics/tags**: Recommended: `claude-code`, `presentations`, `pptx`, `design-review`, `pptxgenjs`, `alo-labs`, `instadecks`
- **README preview**: No broken images, no dead badge URLs, no dead links

### Step 2 — README.md

Read `README.md` in full and verify/update:

- **Version**: Version badge matches the release being cut
- **Command list**: All 6 commands listed with correct names (`/instadecks-create`, etc.)
- **Quick Start**: Copy-pasteable install command is correct
- **Doctor section**: `/instadecks-doctor` self-check section is present and accurate
- **License**: Apache-2.0, current year

### Step 3 — docs/CHANGELOG.md

Verify the new release entry:

- **Version header**: Matches the tag being created (e.g., `## [0.2.0] — 2026-04-30`)
- **Date**: Correct release date
- **Changes**: All new features, fixes, and refactors listed accurately
- **No placeholder text**: No "TODO", "TBD", or unfilled sections
- **Previous entries intact**: No prior entries accidentally modified

### Step 4 — CI

Confirm CI is green on HEAD:

```bash
gh run list --limit 1 --json status,conclusion
```

CI must be green before proceeding.

### Completion

1. Write the marker:
   ```bash
   echo "quality-gate-stage-3" >> ~/.claude/.instadecks/quality-gate.state
   ```

**Exit criteria**: All public-facing content accurate and current, CI green on HEAD, marker written.

---

## Stage 4 — Security Audit

**Goal**: No security issues in the skill instruction set. A manipulated command file could cause Claude to exfiltrate data or behave unpredictably.

### Target 1 — `commands/instadecks-create.md`

This file controls Claude's behavior during every deck-generation session.

1. **No path traversal surface**: Verify `runDir` is always constructed from `${CLAUDE_PLUGIN_DATA}` or a validated working dir — never from any user-supplied path without sanitization.
2. **No credential exposure**: Verify no section instructs Claude to log, display, or include in prompts any API key or user credential.
3. **Interrupt flag safety**: Verify the `.interrupt` flag check reads from `${runDir}/.interrupt` — never from a user-supplied path.
4. **soffice invocation safety**: Verify all `soffice` calls use the per-session `-env:UserInstallation` flag to avoid profile collisions.

### Target 2 — `commands/instadecks-update.md`

This file performs write operations on the plugin registry and filesystem.

1. **Cache path prefix guard**: Verify `NEW_CACHE` is checked against `$HOME/.claude/plugins/cache/` before any `rm -rf` or registry write.
2. **Registry write atomicity**: Verify `jq` writes to a `$TMPFILE` first, then `mv` — never writes directly to `installed_plugins.json`.
3. **No raw user input in paths**: Verify no variable derived from user input (e.g., a manually supplied version string) is interpolated into paths without sanitization.
4. **Stale entry pruning safety**: Verify the `node` pruning script only removes entries whose `installPath` does NOT exist — it must not remove entries with valid existing paths.

### Target 3 — `hooks/hooks.json` + `hooks/check-deps.sh`

1. **Non-blocking**: Verify the SessionStart hook exits 0 regardless of dep status (failures are warnings, not errors that block sessions).
2. **No write outside plugin scope**: Verify `check-deps.sh` writes only to `${CLAUDE_PLUGIN_DATA}` — no writes to `~/.claude/` or system paths.

### Completion

After all three targets are clean with no blocking issues:

1. Fix every blocking finding before proceeding.
2. Write the marker:
   ```bash
   echo "quality-gate-stage-4" >> ~/.claude/.instadecks/quality-gate.state
   ```

**Exit criteria**: Zero blocking security findings, all three targets pass clean, marker written.

---

## Release

After all 4 markers are written:

```bash
# Verify all 4 markers are present
grep -c "quality-gate-stage-" ~/.claude/.instadecks/quality-gate.state
# Must output 4

# Create the GitHub release
gh release create v<version> \
  --repo alo-exp/instadecks \
  --title "Instadecks v<version>" \
  --notes-file docs/CHANGELOG.md \
  --latest
```

**Skipping is not permitted.** No stage may be abbreviated or marked complete without performing the checks.
