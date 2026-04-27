# Phase 1: Plugin Foundation, Contract & CI Gates — Pattern Map

**Mapped:** 2026-04-28
**Files analyzed:** 17 Phase 1 deliverables
**In-repo analogs found:** 0 / 17 (greenfield phase — Phase 1 itself locks the canonical patterns)
**External analogs found:** 17 / 17 (drawn from `~/.claude/plugins/cache/{alo-labs/silver-bullet,alo-labs/topgun,superpowers-marketplace/superpowers}`)

This is the foundational phase. There are no prior in-tree source files to model from (only `.planning/`, `CLAUDE.md`, `silver-bullet.md`, `.silver-bullet.json`, `README.md`). All analogs come from sibling marketplace plugins already cached on this machine. Patterns Phase 1 establishes here become the in-repo references every later phase must follow.

---

## File Classification

| Role | Files |
|------|-------|
| Plugin manifest | `.claude-plugin/plugin.json` |
| Hook config + script | `hooks/hooks.json`, `hooks/check-deps.sh` |
| Skill skeletons | `skills/{annotate,review,content-review,create}/SKILL.md` |
| Schema reference doc | `skills/review/references/findings-schema.md` |
| Test fixture (JSON) | `tests/fixtures/sample-findings.json` |
| Test fixture (binary baselines) | `tests/fixtures/v8-reference/{annotate.js.sha256, Annotations_Sample.pptx, Annotations_Sample.pptx.sha256, slide-*.jpg}` |
| Test (Node native runner) | `tests/annotate-integrity.test.js` (`it.skip` stub) |
| Tooling (Node validator) | `tools/validate-manifest.js` |
| Tooling (shell lint) | `tools/lint-paths.sh` |
| Bundled assets | `assets/fonts/IBM_Plex_Sans/**` |
| Legal | `LICENSE`, `NOTICE`, `licenses/<dep>/LICENSE` |
| Package metadata | `package.json` |
| CI workflow | `.github/workflows/ci.yml` |
| Public docs | `README.md` |

All files are **NEW**; none are modifications. Data flow is config / static-asset / one-shot-script — there are no runtime services in this phase.

---

## Pattern Assignments

| New file | Closest analog | Pattern conventions |
|----------|----------------|---------------------|
| `.claude-plugin/plugin.json` | `~/.claude/plugins/cache/alo-labs/topgun/1.7.0/.claude-plugin/plugin.json` (minimal flat manifest) and `~/.claude/plugins/cache/alo-labs/silver-bullet/0.27.1/.claude-plugin/plugin.json` (richer reference). | Top-level keys in this order: `name`, `version`, `description`, `author` (object: `name`, `url`), `repository`, `license` (`"Apache-2.0"`), `skills` (`"./skills/"`), `hooks` (`"./hooks/hooks.json"`). Two-space indent. `name = "instadecks"` (no scope). `version` MUST equal latest git tag minus leading `v` — Phase 1 starts at `0.1.0`. Description ≤ 1024 chars, starts with imperative verb (validator enforces). |
| `hooks/hooks.json` | `~/.claude/plugins/cache/alo-labs/silver-bullet/0.25.1/hooks/hooks.json` (SessionStart pattern with matcher / type / command / async / timeout). | Single `SessionStart` matcher `"startup\|clear\|compact"`, one hook entry: `{ "type": "command", "command": "\"${CLAUDE_PLUGIN_ROOT}/hooks/check-deps.sh\"", "async": false, "timeout": 15 }`. **No `PreToolUse`, `PostToolUse`, `Stop`, or `UserPromptSubmit` blocks** — Instadecks is a creator plugin, not an enforcer (per ARCHITECTURE.md §2 anti-patterns). |
| `hooks/check-deps.sh` | `~/.claude/plugins/cache/alo-labs/silver-bullet/0.27.1/hooks/session-start` (shebang + `set -euo pipefail` + `trap 'exit 0' ERR` + `umask 0077` + state-dir bootstrap). | First line `#!/usr/bin/env bash`. Lines 2–4: `set -euo pipefail`, `trap 'exit 0' ERR` (mandatory — D-08 says "always exits 0"), `umask 0077`. Section banner comments `# ── Section ─────────────────────────────────────────────────`. All log lines prefixed `Instadecks:` for grep-ability (per CONTEXT.md Claude's-Discretion §). Sentinel file path: `${CLAUDE_PLUGIN_DATA}/.npm-installed-sentinel`. Must `chmod +x` (CI verifies executability — matches silver-bullet ci.yml line 47–50). |
| `skills/{annotate,review,content-review,create}/SKILL.md` | `~/.claude/plugins/cache/alo-labs/silver-bullet/0.27.1/skills/security/SKILL.md` (header structure). | YAML frontmatter with **exactly** these keys: `name`, `description`, `user-invocable: true` (Instadecks skills are slash-invocable; differs from Silver Bullet's `false`), `version: 0.1.0`. Description starts with imperative verb, ≤ 1024 chars, mentions trigger phrases ("This skill should be used when..."). H1 directly under frontmatter: `# /instadecks:<name> — <One-Line Title>`. Phase 1 ships **skeletons only**: frontmatter + H1 + a single "Status: scaffold — full playbook lands in Phase N" line. Full body content is owned by later phases (annotate=Phase 2, review=Phase 3, create=Phase 4, content-review=Phase 6). |
| `skills/review/references/findings-schema.md` | None — Phase 1 originates this contract. Closest external shape: JSON Schema docs + Silver Bullet's `references/` markdown style (prose + fenced JSON blocks). | Top of file: schema version banner block: `**Schema version:** 1.0` + `**Required top-level field:** schema_version`. One canonical fenced ` ```json ` example. Severity vocabulary table with all four tiers (Critical / Major / Minor / Nitpick) — collapse-to-3 rule documented as a downstream `/annotate` concern, NOT a producer concern. Final section "Migration Policy" stub for `2.0+`. This file is consumed by all four skills via direct Read — do not duplicate the schema in code. |
| `tests/fixtures/sample-findings.json` | None in repo. Pattern source: the schema doc itself — fixture must validate against `findings-schema.md` schema 1.0. | Two-space indent. Top-level `schema_version: "1.0"`. Includes at least one finding per severity tier and at least one entry per category exercised by `/annotate`. Includes the auto-refine fields (`genuine`, `category`, `nx`, `ny`, `rationale`) even though Phase 5 is the consumer (per CONTEXT.md "Specific Ideas"). No trailing newline at EOF? — keep one trailing newline; matches `jq` round-trip default. |
| `tests/fixtures/v8-reference/*` | None. v8 BluePrestige source files (external repo at `/Users/shafqat/Documents/Projects/Sourcevo/v5-blue-prestige/`) are committed verbatim. | `*.sha256` files: single line, lowercase hex digest, two spaces, filename — `shasum -a 256` output format. JPGs at 150 dpi (matches `pptx-to-images.sh` baseline). All files committed via `git add` directly; **excluded from `tools/lint-paths.sh`** per D-02. Directory listed in lint-paths.sh exclude list as `tests/fixtures/`. |
| `tests/annotate-integrity.test.js` | `~/.claude/plugins/cache/alo-labs/silver-bullet/0.27.1/tests/` (Node native test runner pattern; `node --test` — see `package.json` scripts of silver-bullet). | First-line banner comment: `// Phase 1 scaffold: it.skip until Phase 2 commits skills/annotate/scripts/annotate.js (per CONTEXT.md D-06).` Use `node:test` + `node:assert/strict` + `node:crypto` + `node:fs/promises`. Body: `test.skip('annotate.js SHA matches v8 baseline', async () => { ... })`. Phase 2 flips `test.skip` → `test`. **Test runner choice is locked to `node --test`** (CONTEXT.md Claude's Discretion permits choosing; Phase 1 picks `node --test` for zero-dep parity with the pinned-pptxgenjs-only stance). Every later phase MUST use the same runner. |
| `tools/validate-manifest.js` | None in this repo. Closest external pattern: `~/.claude/plugins/cache/alo-labs/silver-bullet/0.27.1/.github/workflows/ci.yml` lines 11–16 (the inline `jq empty` JSON-shape check). | `#!/usr/bin/env node` shebang. Pure Node, zero deps (uses `node:fs`, `node:path`). Exits non-zero with file:line-style error on first failure. Validates: (a) `plugin.json` schema shape; (b) `commands[].path`, `hooks[].path`, `skills[].path` resolve to real files; (c) skill descriptions ≤ 1024 chars and start with an imperative verb. Description-quality scoring **deferred to Phase 7 DIST-02** (per D-04). Run via `node tools/validate-manifest.js` — CI invokes the same command. |
| `tools/lint-paths.sh` | None in this repo. Closest external: silver-bullet `ci.yml` step style (one-liner shell with clear failure messages). | `#!/usr/bin/env bash` + `set -euo pipefail`. Single grep pipeline: `git ls-files -z \| xargs -0 grep -nE '/Users/\|~/\.claude\|/home/\|C:\\\\\\\\'`. Exclude rules: `tests/fixtures/**`, `*.md`, lines containing trailing comment `# lint-allow:hardcoded-path` (canonical syntax — locked in Phase 1, all later phases use this exact token). Failure output prints `file:line: hardcoded path: <match>`. Exit 0 on no matches, 1 on any match. |
| `assets/fonts/IBM_Plex_Sans/**` | None. Direct verbatim drop from upstream IBM/plex repo (TTF/OTF + `OFL.txt`). | Preserve upstream filenames verbatim. Bundle the `OFL.txt` from upstream into the same dir AND copy to `licenses/IBM_Plex_Sans/LICENSE` (D-05). Do not modify or subset fonts. `hooks/check-deps.sh` is the consumer (D-01). |
| `LICENSE` | `~/.claude/plugins/cache/alo-labs/silver-bullet/0.27.1/LICENSE` (file location + naming convention only). | Apache-2.0 full text verbatim from `https://www.apache.org/licenses/LICENSE-2.0.txt`, followed by an explicit "Bundled software" section listing each bundled dep (pptxgenjs MIT, IBM Plex Sans OFL-1.1, anything transitive that requires attribution). Per D-05. |
| `NOTICE` | None — required by Apache-2.0 §4(d). | Plain text. Includes the relicensing note verbatim (D-05): *"annotate.js originally developed for internal Sourcevo use; relicensed under Apache-2.0 by the author for inclusion in this plugin."* Plus a per-bundled-dep credit list mirroring `LICENSE`'s bundled-software section. |
| `licenses/<dep>/LICENSE` | None. | One subdir per bundled dep, lowercase-with-underscores naming (`licenses/pptxgenjs/`, `licenses/IBM_Plex_Sans/`). Each contains the upstream LICENSE file verbatim. CI license-checker (`npx license-checker --production --failOn 'GPL;AGPL;SSPL'`) is the gate. |
| `package.json` | `~/.claude/plugins/cache/alo-labs/silver-bullet/0.27.1/package.json` (top-level shape) — but Instadecks is far simpler. | `name: "instadecks"`, `version: "0.1.0"` (must match `plugin.json`), `license: "Apache-2.0"`, `engines.node: ">=18"`. `dependencies`: **exactly** `"pptxgenjs": "4.0.1"` (no caret, no tilde — invariant locked in CLAUDE.md). `scripts`: at minimum `test: "node --test"`, `lint:paths: "tools/lint-paths.sh"`, `validate:manifest: "node tools/validate-manifest.js"`. Commit `package-lock.json`. |
| `.github/workflows/ci.yml` | `~/.claude/plugins/cache/alo-labs/silver-bullet/0.27.1/.github/workflows/ci.yml` (job structure, `jq empty` JSON-validation step, executability check). | `name: CI`, `on: [push, pull_request]`, single `validate` job on `ubuntu-latest`. Steps in this order: (1) `actions/checkout@v4`; (2) Node setup (Node 18+); (3) `npm ci`; (4) `node tools/validate-manifest.js`; (5) `bash tools/lint-paths.sh`; (6) version-pin assertion (`grep -q '"pptxgenjs": "4.0.1"' package.json`); (7) `npx license-checker --production --failOn 'GPL;AGPL;SSPL'`; (8) hook executability check (`test -x hooks/check-deps.sh`); (9) `node --test`; (10) visual-regression harness (Tier-1 SHA assertion in CI; Tier-2 pixel-diff allowed macOS-local-only). Use `::error::` / `::warning::` GitHub-Actions annotation prefixes (see silver-bullet ci.yml line 39, 30). |
| `README.md` | Existing 13-byte stub at repo root. | Public-facing. H1 = "Instadecks". Sections: Overview / Install (marketplace command) / Skills (table of four `/instadecks:*` slash commands) / Requirements (Node 18+, soffice, pdftoppm) / License (Apache-2.0). Phase 1 lands a usable skeleton; Phase 7 DIST polishes it for marketplace publication. |

---

## Shared Patterns

### Path discipline (applies to every shell script + JS file)
**Source of rule:** `CLAUDE.md` "Locked invariants" §3.
All filesystem references must use `${CLAUDE_PLUGIN_ROOT}` (read-only plugin tree) or `${CLAUDE_PLUGIN_DATA}` (writable per-install state). Hardcoded `/Users/`, `~/.claude/`, `/home/`, `C:\\` are CI-fail. The single legal escape hatch is the trailing comment `# lint-allow:hardcoded-path` on the offending line — Phase 1 owns minting this token.

### Shell script header (applies to `hooks/check-deps.sh`, `tools/lint-paths.sh`, any future `*.sh`)
**Source:** silver-bullet `hooks/session-start` lines 1–4.
```bash
#!/usr/bin/env bash
set -euo pipefail
trap 'exit 0' ERR     # only for SessionStart hooks (non-blocking); CI scripts omit this and let errors bubble
umask 0077
```

### Node script header (applies to `tools/validate-manifest.js`, `tests/*.test.js`, future `scripts/*.cjs`)
```js
#!/usr/bin/env node
// <one-line file purpose>
// <reference to the CONTEXT.md decision that locked this contract, e.g., "Per Phase 1 D-04">
```
Use Node built-ins only at this phase — pinned `pptxgenjs` is the single allowed runtime dep.

### Skill frontmatter (applies to all four `SKILL.md` skeletons)
```yaml
---
name: <skill-name>
description: <imperative-verb sentence describing when to invoke, ≤ 1024 chars>
user-invocable: true
version: 0.1.0
---
```

### JSON file conventions
- Two-space indent, trailing newline, UTF-8.
- Validated by both `jq empty` (CI step) AND `node tools/validate-manifest.js` (for `plugin.json` only).
- Schema-versioned JSON (e.g., `sample-findings.json`) requires `schema_version` as first key.

### Test conventions
- Runner: `node --test` (zero deps). Locked Phase 1; all later phases use the same.
- Use `node:test`, `node:assert/strict`, `node:crypto`, `node:fs/promises` — never `chai`/`vitest`/`jest`.
- Phase-bridge `test.skip` blocks always carry a banner comment naming the unblocking phase + CONTEXT.md decision id (e.g., `// it.skip until Phase 2 (D-06)`).

### Section banner comments
**Source:** silver-bullet `hooks/session-start` line 26.
Format: `# ── <Section Name> ─────────────────────────────────────────────────` (two box-drawing horizontal lines bracketing). Use sparingly to mark major phases inside a single shell script. Not required in JS/TS.

### Log line prefix
All hook + tool stdout uses `Instadecks:` prefix (e.g., `Instadecks: deps OK`, `Instadecks: install complete`). Locked for grep-ability across user terminals.

### CI annotations
Use GitHub Actions annotation prefixes for failures: `echo "::error::<msg>"; exit 1` / `echo "::warning::<msg>"`. Pattern from silver-bullet ci.yml lines 30, 39.

---

## No Analog Found

Files where neither in-repo nor cached external plugin provides a meaningful match — Phase 1 is the originator, and Phase 1's choice becomes the reference:

| File | Reason |
|------|--------|
| `skills/review/references/findings-schema.md` | First JSON contract in the project. Phase 1 mints schema 1.0; downstream phases (2, 3, 5, 6) consume it directly. |
| `tests/fixtures/sample-findings.json` | First fixture. Phase 1 establishes the format; later phases extend with edge-case fixtures only. |
| `tests/fixtures/v8-reference/*` | Verbatim binary baselines from external Sourcevo repo. No "pattern" — these are SHA-pinned ground truth. |
| `tools/validate-manifest.js` | Custom validator with no shared analog; closest cousin is `jq empty` shell one-liners in silver-bullet's `ci.yml`. |
| `tools/lint-paths.sh` | Custom path-escape lint; no analog. Phase 1 mints the `# lint-allow:hardcoded-path` allowlist token. |
| `NOTICE` | Apache-2.0-required legal artifact unique to this project's relicensing posture. |

---

## Conventions to Establish (locked by Phase 1, inherited by Phases 2–7)

1. **Plugin manifest shape**: top-level keys in fixed order (`name`, `version`, `description`, `author`, `repository`, `license`, `skills`, `hooks`). Two-space indent. `version` matches latest git tag minus `v`.
2. **Hook posture**: SessionStart-only; non-blocking; `trap 'exit 0' ERR`; `Instadecks:` log prefix.
3. **Path escape token**: `# lint-allow:hardcoded-path` is the single, canonical opt-out comment for `tools/lint-paths.sh`.
4. **Test runner**: `node --test` with `node:assert/strict`. Zero test deps. Phase-bridge `test.skip` carries banner comment + CONTEXT.md decision id.
5. **Schema-versioned JSON**: `schema_version` field is the first key in any JSON file that has a producer/consumer contract; `findings-schema.md` 1.0 is the reference. The 4-tier severity vocabulary lives at the producer; 4→3 collapse is `/annotate` adapter concern only.
6. **License layout**: `LICENSE` (Apache-2.0 + bundled-software section) + `NOTICE` (with relicensing note) + `licenses/<dep>/LICENSE` per bundled dep. License-checker fails on `GPL;AGPL;SSPL`.
7. **Skill frontmatter**: `name` + `description` (imperative, ≤1024) + `user-invocable: true` + `version`. H1 immediately follows: `# /instadecks:<name> — <Title>`.
8. **Shell script header**: `#!/usr/bin/env bash` + `set -euo pipefail` + (hooks only) `trap 'exit 0' ERR` + `umask 0077`.
9. **Section banner comment**: `# ── <Name> ─────────────────────────────────────────────────` style (silver-bullet pattern), shell only.
10. **CI failure annotations**: `::error::` / `::warning::` GitHub Actions prefixes, never bare `echo` for failures.
11. **Dependency stance**: pptxgenjs `4.0.1` exact pin (no caret) is the **only** runtime dep. CI dev-tools (`license-checker`) invoked via `npx`, never installed globally. Tools and tests use Node built-ins only.
12. **`${CLAUDE_PLUGIN_ROOT}` vs `${CLAUDE_PLUGIN_DATA}`**: read-only plugin tree references use the former; any writable state (sentinels, `node_modules`, run dirs) uses the latter. Hardcoded `~/.claude` is forbidden.
13. **Skill skeleton vs full content**: Phase 1 SKILL.md files are frontmatter + H1 + scaffold-status line only. Full playbook content is the responsibility of the phase that owns that skill (annotate=2, review=3, create=4, content-review=6).

---

## Metadata

**Analog search scope:** `/Users/shafqat/Documents/Projects/instadecks/` (in-repo: `.planning/`, `CLAUDE.md`, `silver-bullet.md`, `.silver-bullet.json`, `README.md` only) + `~/.claude/plugins/cache/{alo-labs/silver-bullet/0.27.1, alo-labs/silver-bullet/0.25.1, alo-labs/topgun/1.7.0, superpowers-marketplace/superpowers/5.0.5}/` (external).
**Files scanned:** ~15 in-repo, ~12 external analogs.
**Pattern extraction date:** 2026-04-28.

## PATTERNS COMPLETE
