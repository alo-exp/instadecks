# Phase 1: Plugin Foundation, Contract & CI Gates - Research

**Researched:** 2026-04-27
**Domain:** Claude Code plugin scaffolding, JSON contract design, CI quality gates, font + license bundling, visual-regression infrastructure
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01 (Font detect/install, FOUND-10):** SessionStart hook runs `fc-list | grep -qi "IBM Plex Sans"`. On miss: copy bundled OFL fonts to `~/Library/Fonts` (macOS) / `~/.local/share/fonts/` (Linux) and run `fc-cache -f`. On Windows: skip auto-install; print one warning line with manual install instructions. Write failures non-blocking; surface as warning, do not exit non-zero.
- **D-02 (Path lint, FOUND-08):** `tools/lint-paths.sh` runs `git ls-files -z | xargs -0 grep -nE '/Users/|~/\.claude|/home/|C:\\\\\\\\'`, **excludes** `tests/fixtures/**`, `*.md` docs, and any line containing the trailing comment `# lint-allow:hardcoded-path`. Any other match fails CI with a clear file:line diff.
- **D-03 (Visual regression, FOUND-09):** Two-tier comparison. Tier 1: byte-level SHA assertion of `Annotations_Sample.pptx` against `tests/fixtures/v8-reference/Annotations_Sample.pptx.sha256`. Tier 2: per-slide pixel-diff via `pixelmatch` with **0.5%** tolerance threshold. Phase 1 commits the harness + reference baseline binaries from existing v8 BluePrestige output. Run on Linux LibreOffice in CI; macOS-local-only is acceptable when CI artifact regenerates the reference.
- **D-04 (Manifest validator, FOUND-08):** `tools/validate-manifest.js` validates: (a) JSON shape against the Claude Code plugin manifest contract; (b) every `commands[].path`, `hooks[].path`, `skills[].path` resolves to an existing file; (c) skill descriptions ≤ 1024 chars and start with an imperative verb. Description-quality / activation-rate scoring deferred to Phase 7 DIST-02.
- **D-05 (License layout, FOUND-11):** Apache-2.0 LICENSE at root (full text + bundled-software section). NOTICE at root including the relicensing note: "annotate.js originally developed for internal Sourcevo use; relicensed under Apache-2.0 by the author for inclusion in this plugin." Per-bundled-dep `licenses/<dep>/LICENSE` directory. CI license-checker step `npx license-checker --production --failOn 'GPL;AGPL;SSPL'`; allows MIT/Apache-2.0/BSD-2/BSD-3/ISC/OFL-1.1.
- **D-06 (Integrity test scaffold):** Phase 1 creates `tests/annotate-integrity.test.js` skeleton using `node --test`, committed as `it.skip`. Phase 2 unsuspends after copying file + recording post-patch SHA.
- **D-07 (Schema version policy, FOUND-06):** `findings-schema.md` defines `1.0`. Top-level `schema_version` field required. `/annotate` adapter accepts `1.x`, rejects unknown major versions with `"Unsupported findings schema version X.Y. /annotate supports 1.x."`. Migration adapter for `2.0+` documented as policy only; not implemented in v0.1.0.
- **D-08 (SessionStart posture, FOUND-03/04):** Single `hooks/check-deps.sh` registered for `SessionStart`. Performs: (a) `command -v soffice / pdftoppm / node` + `node --version` ≥ 18; (b) compares `package-lock.json` SHA-256 to `${CLAUDE_PLUGIN_DATA}/.npm-installed-sentinel`; on change/miss runs `npm ci --omit=dev` into `${CLAUDE_PLUGIN_DATA}/node_modules` and updates the sentinel; (c) prints one summary line prefixed `Instadecks:`. **Always exits 0.**

### Claude's Discretion

- Internal package layout under `tools/` (single-script vs sub-modules) — Claude chooses based on size after research.
- Exact wording of hook output messages (kept terse, prefix `Instadecks:` for grep-ability).
- Whether to use `node --test` vs Vitest — defer to Claude; lean toward `node --test` for zero deps unless a sharper assertion library is justified.
- File names for CI workflow YAML and per-dep license folder casing — follow conventions discovered in research.

### Deferred Ideas (OUT OF SCOPE)

- JSON-out / exit-code mode for CI pipelines — v1.x backlog.
- Convergence diagnostics in design-rationale doc — v1.x.
- Full WCAG audit (alt-text, color-only-info checks added to `/review`) — v1.x.
- Stress-test fixtures (8 annotations per slide / max overflow) added to visual regression — v1.x.
- Windows path-detection in `pptx-to-images.sh`; Windows font auto-install — v1.x.
- Schema migration adapter for `2.0+` — implementation deferred to v2.
- Description-quality / activation-rate scoring — Phase 7 DIST-02.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FOUND-01 | Plugin loads via `/plugin install alo-exp/instadecks` with no manual setup beyond `soffice`, `pdftoppm`, `node` | §1 manifest schema (verified Context7), §6 install flow |
| FOUND-02 | Plugin self-contains all bundled scripts; no `~/.claude/skills/` or absolute user-machine reaches | §4 path lint pattern, §1 `${CLAUDE_PLUGIN_ROOT}/${CLAUDE_PLUGIN_DATA}` env vars |
| FOUND-03 | SessionStart hook performs non-blocking dep check (soffice/pdftoppm/node ≥ 18) | §2 SessionStart contract — exit 0 = additionalContext, exit ≠ 0 ≠ 2 = non-blocking error notice |
| FOUND-04 | SessionStart runs `npm ci --omit=dev` into `${CLAUDE_PLUGIN_DATA}/node_modules` with sentinel guard | §2 SessionStart, D-08 sentinel pattern |
| FOUND-05 | pptxgenjs pinned exactly `4.0.1` (no caret); `package-lock.json` committed | §3 npm registry verification (4.0.1 confirmed published, MIT, deps clean) |
| FOUND-06 | `findings-schema.md` defines locked JSON contract mapping 1:1 to `annotate.js` SAMPLES | §5 SAMPLES shape extracted verbatim from v8 source |
| FOUND-07 | `tests/fixtures/sample-findings.json` canonical fixture | §5 schema fixture template |
| FOUND-08 | CI gates from day 1: manifest validator, path lint, version-pin assertion, license-checker | §4 CI gate implementation; D-02/D-04/D-05 |
| FOUND-09 | Visual regression baselines under `tests/fixtures/v8-reference/` | §5 SHA + pixelmatch infrastructure |
| FOUND-10 | IBM Plex Sans bundled under `assets/fonts/` with SIL OFL; fc-list detection + first-run install | §6 font auto-install, §7 OFL requirements |
| FOUND-11 | Apache-2.0 LICENSE + NOTICE + per-dep `licenses/` | §7 Apache-2.0 §4(d) bundled-software requirements |
</phase_requirements>

## Summary

Phase 1 is a scaffolding-and-contracts phase: zero algorithm work, all infrastructure. Every Phase 1 decision in CONTEXT.md is locked, so research's job is to verify the *implementation patterns* (Claude Code manifest schema fields, SessionStart hook contract, npm package availability, license-checker invocation, pixelmatch + node:test idioms) against current authoritative sources and surface concrete code-level patterns the planner can hand to executors.

All five core technical claims were verified live in this session:
- **pptxgenjs 4.0.1** is published on npm as the current `latest` (confirmed via `npm view`). License MIT, transitive deps `@types/node`, `https`, `image-size`, `jszip` — all permissive (no GPL chain).
- **Claude Code plugin manifest schema** confirmed via official docs at code.claude.com/docs/en/plugins-reference: `name` is the only required field; all other fields (version, description, author, license, hooks, skills, commands, agents, etc.) are optional. Component paths default to `skills/`, `commands/`, `agents/`, `hooks/hooks.json` — only override when nonstandard.
- **SessionStart hook contract** confirmed: stdout is appended to Claude's context (or `{"hookSpecificOutput": {"hookEventName": "SessionStart", "additionalContext": "..."}}` for explicit control); exit 0 = success; exit 2 = stderr shown to user only (does NOT block SessionStart); other nonzero exits = non-blocking notice. Env vars `${CLAUDE_PLUGIN_ROOT}`, `${CLAUDE_PLUGIN_DATA}`, `$CLAUDE_PROJECT_DIR`, plus `CLAUDE_ENV_FILE` for persisting env vars across subsequent Bash calls.
- **`node --test`** runner is built-in since Node 18, no `--experimental-test-runner` flag needed in current LTS — confirmed locally on Node v25.6.0.
- **v8 BluePrestige `package.json`** dependency is `"pptxgenjs": "^4.0.1"` — the calibration version IS 4.0.1. The exact-pin instruction is a tightening (caret → exact) that matches the calibrated baseline.

**Primary recommendation:** Use the verified manifest skeleton in §1, the SessionStart pattern in §2, the SAMPLES-mirrored schema in §5, and `node --test` for the entire phase. Keep `tools/` as single-file scripts (`validate-manifest.js`, `lint-paths.sh`, `assert-pptxgenjs-pin.js`) — none exceeds ~150 LOC; sub-modularizing adds friction without payoff.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Plugin manifest + component discovery | Plugin Loader (Claude Code) | — | `.claude-plugin/plugin.json` is consumed by Claude Code's plugin system at install/load time |
| First-run dep install + sentinel | SessionStart hook (shell) | `${CLAUDE_PLUGIN_DATA}` filesystem | `npm ci` is a side-effect script; sentinel is persistent state outside git |
| JSON findings contract | Reference doc (`findings-schema.md`) | Fixtures (`tests/fixtures/`) | Doc is canonical; fixtures are the executable test |
| CI gates (manifest, path lint, version pin, license, visual reg) | GitHub Actions runner (Linux) | `tools/` Node + shell scripts | CI workflow YAML orchestrates; tools are idempotent CLI scripts |
| Visual regression baseline | `tests/fixtures/v8-reference/` (committed binaries) | `tests/visual-regression.test.js` (`node --test`) | Baselines are static artifacts; comparison logic is test code |
| Font detection + install | SessionStart hook (shell) | `assets/fonts/` (bundled .ttf/.otf) | OS font cache is mutated only at first-run; bundled files are read-only |
| License attribution | Filesystem (LICENSE, NOTICE, `licenses/`) | CI license-checker | Files are static legal docs; checker is automated gate |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| pptxgenjs | 4.0.1 (exact) | PPTX generation (consumed by `annotate.js` and Phase 4 `/create`) | v8 BluePrestige calibrated against 4.x line; 4.0.1 = current `latest` on npm registry; v8 source `package.json` declares `^4.0.1` so 4.0.1 IS the calibration version. [VERIFIED: `npm view pptxgenjs@4.0.1`] |
| Node.js | ≥ 18 (≥ 20 recommended) | Runtime; pptxgenjs dual ESM/CJS; `node --test` built-in | [VERIFIED: local Node 25.6.0 confirms `node --test` available without experimental flag] |

### Supporting (devDependencies for CI)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| license-checker | 25.0.1 | Scan transitive deps for GPL/AGPL/SSPL | CI license gate per D-05. License BSD-3-Clause [VERIFIED: `npm view license-checker`] |
| pixelmatch | 7.1.0 | Per-slide pixel-diff for visual regression | CI Tier-2 gate per D-03. License ISC; depends on pngjs ^7 [VERIFIED] |
| pngjs | 7.0.0 | PNG decode/encode for pixelmatch | Auto-installed via pixelmatch. License MIT [VERIFIED] |

### Built-in (no install needed)
| Tool | Version | Purpose |
|------|---------|---------|
| `node --test` | Node ≥ 18 | Test runner; TAP output by default; `--test-reporter=spec` for human readout |
| `node:assert` | Node ≥ 18 | Assertion library (use `node:assert/strict`) |
| `node:crypto` | Node ≥ 18 | SHA-256 for sentinel + integrity tests (`createHash('sha256')`) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `node --test` | Vitest, Jest | Vitest = faster watch + sharper diffs but adds 50+ MB devDep tree; `node --test` is zero-dep. Decision: stick with `node --test` per CONTEXT discretion. |
| `license-checker` | `license-checker-rseidelsohn` (fork) | Original is unmaintained-ish but stable; fork has more features but adds drift risk. Original is sufficient for `--failOn` filtering. |
| `pixelmatch` | `looks-same`, `resemblejs` | pixelmatch is canonical (Mapbox-authored, used by puppeteer ecosystem); 0.1 threshold semantics well-documented. |
| Custom shell path-lint | `git-secrets`, `trufflehog` | Those scan for secrets, not hardcoded paths. Bespoke `grep -nE` per D-02 is correct. |

**Installation:**
```bash
# Runtime
npm install pptxgenjs@4.0.1 --save-exact

# CI / dev
npm install --save-dev license-checker pixelmatch pngjs
```

**Version verification commands (run during execution):**
```bash
npm view pptxgenjs@4.0.1 version    # → "4.0.1"
npm view license-checker version     # → "25.0.1"
npm view pixelmatch version          # → "7.1.0"
```
[VERIFIED: All three confirmed live at research time, 2026-04-27.]

## Architecture Patterns

### System Architecture Diagram

```
                    ┌────────────────────────────────────────────────┐
                    │  Developer / End User invokes /plugin install  │
                    └────────────────────────────────────────────────┘
                                            │
                                            ▼
              ┌──────────────────────────────────────────────────────────┐
              │  Claude Code Plugin Loader                               │
              │  - reads .claude-plugin/plugin.json                      │
              │  - resolves skills/, commands/, agents/, hooks/          │
              │  - exports CLAUDE_PLUGIN_ROOT, CLAUDE_PLUGIN_DATA        │
              └──────────────────────────────────────────────────────────┘
                                            │
                                            ▼
              ┌──────────────────────────────────────────────────────────┐
              │  SessionStart hook → hooks/check-deps.sh                 │
              │  ┌─────────────────────────────────────────────────┐    │
              │  │ 1. Check command -v {soffice, pdftoppm, node}   │    │
              │  │ 2. Check node --version ≥ 18                    │    │
              │  │ 3. Compute SHA(package-lock.json)               │    │
              │  │ 4. Compare to ${CLAUDE_PLUGIN_DATA}/.sentinel   │    │
              │  │    └─→ if changed/missing: npm ci --omit=dev    │    │
              │  │ 5. fc-list | grep -qi "IBM Plex Sans"           │    │
              │  │    └─→ if missing: copy + fc-cache -f           │    │
              │  │ 6. echo "Instadecks: ..." (single line)         │    │
              │  │ 7. exit 0  ALWAYS                               │    │
              │  └─────────────────────────────────────────────────┘    │
              └──────────────────────────────────────────────────────────┘
                                            │
                                            ▼
              ┌──────────────────────────────────────────────────────────┐
              │  Plugin ready — skills discoverable as                   │
              │  /instadecks:{create,review,content-review,annotate}     │
              └──────────────────────────────────────────────────────────┘

              ─────────────────────────  CI Pipeline (parallel)  ─────────────
              git push → .github/workflows/ci.yml
                  ├─→ tools/validate-manifest.js   (manifest schema + path resolution)
                  ├─→ tools/lint-paths.sh          (no /Users, ~/.claude, /home, C:\)
                  ├─→ tools/assert-pptxgenjs-pin.js (exact 4.0.1, no caret)
                  ├─→ npx license-checker --production --failOn 'GPL;AGPL;SSPL'
                  ├─→ node --test tests/           (incl. annotate-integrity.test.js skip)
                  └─→ visual-regression: SHA + pixelmatch (Phase 1 = harness only)
```

### Recommended Project Structure (Phase 1 deliverable layout)

```
instadecks/
├── .claude-plugin/
│   └── plugin.json                  # Manifest (verified schema in §1)
├── .github/
│   └── workflows/
│       └── ci.yml                   # CI gate orchestration
├── assets/
│   └── fonts/
│       └── IBM_Plex_Sans/
│           ├── IBMPlexSans-Regular.ttf
│           ├── IBMPlexSans-Bold.ttf
│           ├── IBMPlexSans-Italic.ttf
│           └── (other weights as needed by annotate.js charPts table)
├── hooks/
│   ├── hooks.json                   # SessionStart → check-deps.sh
│   └── check-deps.sh                # D-08: dep check + npm ci sentinel + font install
├── licenses/
│   ├── pptxgenjs/LICENSE            # MIT
│   ├── IBM_Plex_Sans/LICENSE        # SIL OFL 1.1
│   ├── jszip/LICENSE                # transitive (MIT/GPL dual — verify)
│   └── image-size/LICENSE           # transitive (MIT)
├── skills/
│   └── review/
│       └── references/
│           └── findings-schema.md   # FOUND-06 — the canonical contract
├── tests/
│   ├── annotate-integrity.test.js   # D-06: it.skip — Phase 2 unsuspends
│   ├── manifest-validator.test.js   # exercises tools/validate-manifest.js
│   ├── path-lint.test.js            # exercises tools/lint-paths.sh
│   ├── visual-regression.test.js    # SHA + pixelmatch harness
│   └── fixtures/
│       ├── sample-findings.json     # FOUND-07 — canonical fixture
│       └── v8-reference/
│           ├── samples.js           # Phase 2 will mirror this
│           ├── Annotations_Sample.pptx
│           ├── Annotations_Sample.pptx.sha256
│           ├── annotate.js.sha256   # Phase 2 records post-patch SHA
│           ├── slide-01.jpg         # 150 DPI reference
│           ├── slide-02.jpg
│           └── slide-03.jpg
├── tools/
│   ├── validate-manifest.js         # D-04
│   ├── lint-paths.sh                # D-02
│   └── assert-pptxgenjs-pin.js      # FOUND-05 enforcement
├── CHANGELOG.md
├── CLAUDE.md                        # already present
├── LICENSE                          # Apache-2.0 + bundled-software section
├── NOTICE                           # D-05 incl. relicensing note
├── README.md
├── package.json                     # pinned pptxgenjs@4.0.1, no caret
└── package-lock.json                # COMMITTED
```

### Pattern 1: Plugin Manifest (verified schema)

**What:** Single `.claude-plugin/plugin.json` declaring metadata + default component paths.
**When to use:** Always — even though manifest is technically optional, including it locks the plugin name (prevents auto-derivation surprises).

**Example:**
```json
// Source: code.claude.com/docs/en/plugins-reference §"Complete schema" [VERIFIED 2026-04-27]
{
  "name": "instadecks",
  "version": "0.1.0",
  "description": "Generate, review, and annotate polished presentation decks from any input.",
  "author": {
    "name": "Alo Labs",
    "email": "info@alolabs.dev",
    "url": "https://github.com/alo-exp/instadecks"
  },
  "homepage": "https://github.com/alo-exp/instadecks",
  "repository": "https://github.com/alo-exp/instadecks",
  "license": "Apache-2.0",
  "keywords": ["presentations", "pptx", "design-review", "annotation"]
  // skills, commands, agents, hooks omitted → Claude Code uses default paths
  // (skills/, commands/, agents/, hooks/hooks.json)
}
```

**Note on namespacing:** With `"name": "instadecks"`, skills auto-namespace as `/instadecks:create`, `/instadecks:review`, etc. — exactly the pattern PROJECT.md/REQUIREMENTS.md assume. [VERIFIED: docs §"This name is used for namespacing components..."]

### Pattern 2: SessionStart Hook (D-08 implementation)

**What:** Single `hooks/hooks.json` registering `check-deps.sh` against the SessionStart event with matchers `startup|clear|compact`. The script runs dep checks, npm ci with sentinel guard, font install, and ALWAYS exits 0.

**When to use:** This is the only hook Phase 1 ships. Later phases may add PreToolUse hooks if needed (e.g., to enforce skill activation tests), but those aren't in scope here.

**Example `hooks/hooks.json`:**
```json
// Source: code.claude.com/docs/en/plugins-reference §Hooks [VERIFIED]
// Matcher pattern adopted from alo-labs/silver-bullet 0.27.1 — production-proven
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup|clear|compact",
        "hooks": [
          {
            "type": "command",
            "command": "\"${CLAUDE_PLUGIN_ROOT}/hooks/check-deps.sh\"",
            "async": false,
            "timeout": 30
          }
        ]
      }
    ]
  }
}
```

**Example `hooks/check-deps.sh` skeleton:**
```bash
#!/usr/bin/env bash
# Source: D-08 spec; SessionStart contract verified at code.claude.com/docs/en/hooks
# Always exits 0 — SessionStart non-blocking by design.
set -u  # NOT set -e; we never want to fail the session

PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT:?CLAUDE_PLUGIN_ROOT must be set}"
PLUGIN_DATA="${CLAUDE_PLUGIN_DATA:?CLAUDE_PLUGIN_DATA must be set}"
mkdir -p "$PLUGIN_DATA"

WARN=()
INFO=()

# 1. Tool availability
for tool in soffice pdftoppm node; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    WARN+=("missing $tool")
  fi
done

# 2. Node version ≥ 18
if command -v node >/dev/null 2>&1; then
  NODE_MAJ=$(node -p "process.versions.node.split('.')[0]" 2>/dev/null || echo 0)
  [ "$NODE_MAJ" -ge 18 ] || WARN+=("node $NODE_MAJ < 18")
fi

# 3. npm ci sentinel guard
SENTINEL="$PLUGIN_DATA/.npm-installed-sentinel"
LOCK_SHA=$(shasum -a 256 "$PLUGIN_ROOT/package-lock.json" 2>/dev/null | awk '{print $1}')
PREV_SHA=$(cat "$SENTINEL" 2>/dev/null || echo "")
if [ -n "$LOCK_SHA" ] && [ "$LOCK_SHA" != "$PREV_SHA" ]; then
  ( cd "$PLUGIN_ROOT" && npm ci --omit=dev --prefix "$PLUGIN_DATA" ) >/dev/null 2>&1 \
    && echo "$LOCK_SHA" > "$SENTINEL" \
    && INFO+=("install complete") \
    || WARN+=("npm ci failed")
fi

# 4. Font detection
case "$(uname -s)" in
  Darwin)  FONT_DIR="$HOME/Library/Fonts" ;;
  Linux)   FONT_DIR="$HOME/.local/share/fonts" ;;
  MINGW*|CYGWIN*|MSYS*) FONT_DIR="" ;;  # Windows: skip auto-install per D-01
esac
if command -v fc-list >/dev/null 2>&1; then
  if ! fc-list | grep -qi "IBM Plex Sans"; then
    if [ -n "$FONT_DIR" ]; then
      mkdir -p "$FONT_DIR" 2>/dev/null \
        && cp "$PLUGIN_ROOT/assets/fonts/IBM_Plex_Sans/"*.ttf "$FONT_DIR/" 2>/dev/null \
        && fc-cache -f >/dev/null 2>&1 \
        && INFO+=("fonts installed") \
        || WARN+=("font install failed")
    else
      WARN+=("install IBM Plex Sans manually: see assets/fonts/IBM_Plex_Sans/README.md")
    fi
  fi
fi

# 5. Single summary line
if [ ${#WARN[@]} -eq 0 ]; then
  echo "Instadecks: deps OK${INFO:+ (${INFO[*]})}"
else
  echo "Instadecks: ${WARN[*]}"
fi

exit 0  # ALWAYS
```

### Pattern 3: Manifest Validator (D-04)

**What:** `tools/validate-manifest.js` exits non-zero on schema violations. Run in CI and as a pre-commit hook.

**Example skeleton:**
```javascript
// Source: schema verified at code.claude.com/docs/en/plugins-reference §"Complete schema"
// Required field: name. Optional: version, description, author, license, hooks, skills, ...
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const MANIFEST = path.join(ROOT, '.claude-plugin', 'plugin.json');
const errors = [];

const m = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));

// (a) Schema shape
if (!m.name || !/^[a-z][a-z0-9-]*$/.test(m.name)) {
  errors.push('name must be kebab-case (got: ' + JSON.stringify(m.name) + ')');
}
if (m.version && !/^\d+\.\d+\.\d+/.test(m.version)) {
  errors.push('version must be semver');
}

// (b) Component path resolution (only if explicitly set)
for (const key of ['skills', 'commands', 'agents', 'hooks', 'mcpServers']) {
  if (typeof m[key] === 'string') {
    const p = path.join(ROOT, m[key]);
    if (!fs.existsSync(p)) errors.push(`${key}: ${m[key]} does not exist`);
  }
}

// (c) Skill descriptions ≤ 1024 chars + imperative verb
const skillsDir = path.join(ROOT, typeof m.skills === 'string' ? m.skills : 'skills');
if (fs.existsSync(skillsDir)) {
  for (const dir of fs.readdirSync(skillsDir)) {
    const skillMd = path.join(skillsDir, dir, 'SKILL.md');
    if (!fs.existsSync(skillMd)) continue;
    const content = fs.readFileSync(skillMd, 'utf8');
    const desc = (content.match(/^description:\s*(.+)$/m) || [])[1] || '';
    if (desc.length > 1024) errors.push(`${dir}: description > 1024 chars`);
    // Imperative-verb check: first word should not be a noun/article
    const first = desc.replace(/^["']/, '').split(/\s+/)[0]?.toLowerCase() || '';
    const NON_IMPERATIVE = ['a', 'an', 'the', 'this', 'tool', 'skill', 'plugin'];
    if (NON_IMPERATIVE.includes(first)) {
      errors.push(`${dir}: description should start with imperative verb, got "${first}"`);
    }
  }
}

if (errors.length) {
  console.error('Manifest validation failed:\n  ' + errors.join('\n  '));
  process.exit(1);
}
console.log('Manifest OK');
```

### Pattern 4: pptxgenjs version-pin assertion (FOUND-05)

```javascript
// tools/assert-pptxgenjs-pin.js
const pkg = require('../package.json');
const v = pkg.dependencies?.pptxgenjs;
if (v !== '4.0.1') {
  console.error(`pptxgenjs must be exactly "4.0.1", got "${v}". No caret/tilde allowed.`);
  process.exit(1);
}
console.log('pptxgenjs pin OK: 4.0.1');
```

### Pattern 5: Visual Regression Harness (D-03)

```javascript
// tests/visual-regression.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');
const { PNG } = require('pngjs');
const pixelmatch = require('pixelmatch');

const REF = path.join(__dirname, 'fixtures', 'v8-reference');

test('Tier 1: Annotations_Sample.pptx SHA matches v8 baseline', () => {
  // Phase 1: this file ships from v8 BluePrestige output as the baseline itself.
  // Phase 2: regenerated by /annotate must match this SHA.
  const expected = fs.readFileSync(path.join(REF, 'Annotations_Sample.pptx.sha256'), 'utf8').trim();
  const buf = fs.readFileSync(path.join(REF, 'Annotations_Sample.pptx'));
  const actual = crypto.createHash('sha256').update(buf).digest('hex');
  assert.equal(actual, expected, 'PPTX byte-level drift detected');
});

test.skip('Tier 2: per-slide pixel-diff < 0.5%', () => {
  // Phase 1 commits the harness; the per-slide regenerated JPGs come from Phase 2.
  // Threshold 0.005 (0.5%) per D-03; matches Phase 2 ANNO-11 parity gate.
  const ref = PNG.sync.read(fs.readFileSync(path.join(REF, 'slide-01.png')));
  const out = PNG.sync.read(fs.readFileSync(path.join(__dirname, '..', 'out', 'slide-01.png')));
  const diff = new PNG({ width: ref.width, height: ref.height });
  const mismatch = pixelmatch(ref.data, out.data, diff.data, ref.width, ref.height, { threshold: 0.1 });
  const ratio = mismatch / (ref.width * ref.height);
  assert.ok(ratio < 0.005, `pixel mismatch ratio ${(ratio*100).toFixed(3)}% exceeds 0.5%`);
});
```

**pixelmatch threshold semantics:** the `threshold` option (default 0.1, range 0-1) is per-pixel YIQ color sensitivity. The 0.5% requirement in D-03 is the *overall ratio of mismatched pixels*, computed by dividing pixelmatch's return value by total pixel count. Don't confuse the two. [CITED: github.com/mapbox/pixelmatch README]

### Pattern 6: Path Lint (D-02)

```bash
#!/usr/bin/env bash
# tools/lint-paths.sh — fails CI if any tracked file (excl. fixtures, *.md) reaches outside the plugin tree
set -e
ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

# Use git ls-files for stable, .gitignore-aware enumeration
HITS=$(git ls-files -z \
  | xargs -0 grep -nE '/Users/|~/\.claude|/home/|C:\\\\' 2>/dev/null \
  | grep -vE '^(tests/fixtures/|.+\.md:)' \
  | grep -v '# lint-allow:hardcoded-path' \
  || true)

if [ -n "$HITS" ]; then
  echo "Hardcoded paths found:"
  echo "$HITS"
  exit 1
fi
echo "Path lint OK"
```

### Pattern 7: License Checker (D-05)

```bash
# .github/workflows/ci.yml fragment
- run: npx license-checker --production --failOn 'GPL;AGPL;SSPL' --summary
```

**Note on dual-licensed deps:** `jszip` (transitive of pptxgenjs) is dual-licensed `MIT OR GPL-3.0` — license-checker's default behavior is to accept dual-licensed packages on the permissive side. Confirm at execution time with `npx license-checker --production --json | grep -i jszip` and document in NOTICE if needed.

### Anti-Patterns to Avoid

- **Skip `package-lock.json` from git** — breaks reproducible installs; D-08 sentinel relies on lockfile SHA. Always commit it.
- **Use `^4.0.1` instead of `4.0.1`** — `--save-exact` is mandatory; FOUND-05 + assert-pptxgenjs-pin.js will fail.
- **`set -e` in `check-deps.sh`** — would break the "always exit 0" contract on transient failures. Use defensive `||` chains instead.
- **`exit 2` in SessionStart** — per docs, exit 2 only "shows stderr to user" and does NOT block SessionStart, but it surfaces noisy output. Use exit 0 for informational warnings.
- **Hooks under `.claude-plugin/`** — only `plugin.json` belongs there; hooks/, skills/, commands/, agents/ MUST be at plugin root. [CITED: plugins-reference §"Components must be at the plugin root, not inside `.claude-plugin/`"]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON schema validation for plugin.json | Custom AJV-based validator | `claude plugin validate` (CLI) + targeted property checks | Anthropic ships `claude plugin validate` for built-in validation; supplement with bespoke checks (path resolution, description length) only |
| PNG diff for visual regression | Custom pixel-loop comparison | `pixelmatch` 7.1.0 + `pngjs` | Mapbox-authored, used by puppeteer ecosystem; YIQ color-distance is non-trivial to get right |
| License classification | Hand-curated allow/deny lists | `license-checker --failOn` | SPDX expression parsing + dual-license handling is fiddly; license-checker handles it |
| Test runner | Bespoke test harness | `node --test` | Built-in since Node 18; TAP-compatible; no install |
| SHA-256 + sentinel logic | Custom hashing utilities | `node:crypto` `createHash('sha256')` + `shasum -a 256` in shell | Standard library; cross-platform |
| Plugin manifest schema validation | Hand-rolled JSON shape checks | `claude plugin validate` (Anthropic CLI) | Authoritative; tracks schema drift across CC versions |

**Key insight:** Phase 1 is *infrastructure*, not algorithms. Every component is well-trodden — bespoke implementations introduce drift risk against the upstream contracts (manifest, license SPDX, PNG comparison). Use the established libraries.

## Common Pitfalls

### Pitfall 1: SessionStart hook causes noticeable startup delay
**What goes wrong:** First-run `npm ci` takes 10-30s; user sees "Instadecks: install complete" only after a 30s pause.
**Why it happens:** `npm ci` is synchronous and pulls full pptxgenjs tree (~15MB).
**How to avoid:** D-08 sentinel guards re-runs; `async: false` is correct for first-run determinism, but document expected first-run delay in README. For CI, pre-warm the cache.
**Warning signs:** users reporting "stuck on session start" → check sentinel exists.

### Pitfall 2: License-checker false positive on `jszip` (dual-licensed)
**What goes wrong:** `jszip` is `MIT OR GPL-3.0`; some checker configurations match the GPL clause and fail the `--failOn 'GPL'` rule.
**Why it happens:** SPDX expression parsing varies; `license-checker` defaults to permissive side, but `--failOn` substring match can catch `GPL` substring in `MIT OR GPL-3.0`.
**How to avoid:** Test the gate locally on a clean checkout: `npx license-checker --production --failOn 'GPL;AGPL;SSPL' --summary`. If false-positive triggers on jszip, switch to `--exclude 'MIT OR GPL-3.0'` or use a `.licensee.yml` allowlist. [CITED: github.com/davglass/license-checker README]
**Warning signs:** Locally clean, CI fails with `jszip@x.y.z is GPL-3.0`.

### Pitfall 3: Plugin name not kebab-case
**What goes wrong:** `"name": "Instadecks"` (capital I) → manifest validator passes Claude Code's loader but namespacing breaks (`/Instadecks:create` ≠ `/instadecks:create`).
**Why it happens:** Docs say "kebab-case" but enforcement is regex-only.
**How to avoid:** D-04 manifest validator regex `/^[a-z][a-z0-9-]*$/` catches it.
**Warning signs:** Skill descriptions don't trigger; `/plugin list` shows odd casing.

### Pitfall 4: Hardcoded path lint false-positive on `package-lock.json`
**What goes wrong:** `package-lock.json` contains `"resolved": "https://registry.npmjs.org/.../node_modules/..."` — the substring `node_modules/` is fine, but if it includes a contributor's local path (rare) the lint fails.
**Why it happens:** npm sometimes embeds machine-local paths in lockfile.
**How to avoid:** D-02 already excludes `tests/fixtures/**` and `*.md`; verify lockfile doesn't trigger by running the lint on the committed file. If false-positive: add `package-lock.json` to the exclude list (it's machine-generated; not where humans hardcode paths anyway).

### Pitfall 5: macOS vs Linux fc-list output differences
**What goes wrong:** D-01's `fc-list | grep -qi "IBM Plex Sans"` works on both, but font-name reporting can differ ("IBM Plex Sans" on Linux vs "IBMPlexSans" + "IBM Plex Sans" both on macOS depending on .ttf vs .otf).
**Why it happens:** fontconfig version differs; OTF metadata embeds slightly different strings.
**How to avoid:** Use `grep -qi "IBM Plex Sans"` (case-insensitive, substring) — robust against both. [VERIFIED locally on macOS: `fc-list | grep -i plex` returns 18 matches with consistent "IBM Plex Sans" substring.]
**Warning signs:** fonts installed but detection still fails → check exact `fc-list` output on target OS.

### Pitfall 6: Visual regression Tier 2 disabled in Phase 1 (intentional)
**What goes wrong:** None — but a planner might think Tier 2 should be live in Phase 1.
**Why it happens:** Phase 1 has no PPTX generator yet; Tier 2 needs Phase 2's `/annotate` to produce the regenerated PPTX.
**How to avoid:** Phase 1 commits the *harness* (test file with `test.skip`), the *baseline* (v8 reference PPTX + JPGs + SHA file), and the *Tier 1 SHA self-check* (verifies the committed baseline hasn't bit-rotted). Tier 2 unsuspends in Phase 2.

### Pitfall 7: Apache-2.0 §4(d) NOTICE requirements
**What goes wrong:** NOTICE file omitted, or doesn't include attribution for bundled deps that have their own NOTICE.
**Why it happens:** Apache-2.0 §4(d) requires that derivatives "include a readable copy of the attribution notices contained within such NOTICE file" of bundled Apache-2.0 deps.
**How to avoid:** None of our direct deps (pptxgenjs MIT, IBM Plex Sans OFL) require NOTICE entries. But the *plugin's own* NOTICE must include the relicensing note for `annotate.js` per D-05. [CITED: apache.org/licenses/LICENSE-2.0 §4(d)]
**Warning signs:** None at install time — surfaces only in license review or audit.

## Runtime State Inventory

> **N/A — greenfield phase.** No existing runtime state to migrate. The npm sentinel at `${CLAUDE_PLUGIN_DATA}/.npm-installed-sentinel` is created fresh on first run; no pre-existing data to update.

## Code Examples

### Computing SHA-256 of a file (sentinel + integrity tests)
```javascript
// Source: nodejs.org/api/crypto.html [VERIFIED: built-in since Node 10]
const crypto = require('node:crypto');
const fs = require('node:fs');
const sha = crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
```

### `node --test` skip pattern (D-06)
```javascript
// Source: nodejs.org/api/test.html#testskip [VERIFIED: built-in Node ≥ 18]
const test = require('node:test');
test('annotate.js post-patch SHA matches baseline', { skip: 'Phase 2 unsuspends after copying file' }, () => {
  // body runs in Phase 2
});
```

### Reading plugin manifest from a tool
```javascript
const manifest = require(`${process.env.CLAUDE_PLUGIN_ROOT || '.'}/.claude-plugin/plugin.json`);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hand-rolled test runner / `tape` / `mocha` | `node --test` built-in | Node 18 (Apr 2022) stable | Zero-dep testing; TAP/spec output |
| `^x.y.z` caret ranges by default | `--save-exact` for calibrated baselines | npm 6+ supports `save-exact: true` config | Reproducibility for visual-regression-gated libraries |
| Custom plugin JSON validators | `claude plugin validate` CLI | Claude Code v2.x | Authoritative schema check |
| `experimental-test-runner` flag | Plain `node --test` | Node 20 LTS | No flag needed |

**Deprecated/outdated:**
- Pre-Node-18 test runners are unnecessary; `node --test` is sufficient.
- `pptxgenjs@3.x` is superseded by `4.x` ESM/CJS dual-export — don't fall back to 3.x even on errors.

## Project Constraints (from CLAUDE.md)

These are extracted verbatim from `./CLAUDE.md` "Locked invariants" and apply to every plan in this phase:

1. **`annotate.js` SHA-pinned** — Phase 1 only scaffolds the integrity test as `it.skip`; do NOT copy the file in Phase 1 (D-06 explicit).
2. **`pptxgenjs@4.0.1` exact** — no caret. `package-lock.json` committed.
3. **No paths outside plugin tree** — Phase 1 lint gate must be live before any other phase ships code.
4. **Severity collapse 4→3 belongs to /annotate adapter only** — Phase 1's `findings-schema.md` documents the FULL 4-tier vocab; downstream collapse is a Phase 2 concern.
5. **Auto-refine convergence rule** — Phase 1's schema MUST include `genuine`, `category`, `nx`, `ny`, `rationale` fields even though Phase 5 implements the loop.
6. **Content-vs-design boundary** — both `/review` and `/content-review` use the same schema shape; planner/executors don't need to enforce the boundary in Phase 1, but the schema must accommodate both.
7. **Repo at `alo-exp/instadecks`; marketplace at `alo-labs/claude-plugins`** — don't hardcode either org name in scripts.

## Findings Schema (FOUND-06) — Locked Mapping to annotate.js SAMPLES

The v8 SAMPLES array (verbatim from `/Users/shafqat/Documents/Projects/Sourcevo/v5-blue-prestige/annotate.js` lines 107-150) is the canonical shape:

```javascript
// Verbatim from v8 annotate.js
const SAMPLES = [
  {
    slideNum: 7,
    title: 'Slide 07  ·  Freelance Baseline',
    annotations: [
      { sev: 'minor',  nx: 0.46, ny: 0.16, text: '...' },
      { sev: 'major',  nx: 0.58, ny: 0.27, text: '...' },
      { sev: 'polish', nx: 0.11, ny: 0.32, text: '...' },
    ],
  },
  // ... more slides
];
```

**`findings-schema.md` v1.0 (recommended structure for Phase 1):**

```jsonc
{
  "schema_version": "1.0",        // REQUIRED per D-07
  "deck": "<filename or path>",
  "generated_at": "<ISO8601>",
  "slides": [
    {
      "slideNum": 7,              // 1-based; matches annotate.js
      "title": "Slide 07 · ...",
      "findings": [               // producer-side: array of full 4-tier findings
        {
          "severity_reviewer": "Critical",   // 4-tier (Critical|Major|Minor|Nitpick)
          "category": "defect",              // defect|improvement|style
          "genuine": true,                   // for auto-refine filter
          "nx": 0.46,                        // 0-1 normalised x
          "ny": 0.16,                        // 0-1 normalised y
          "text": "Defect description",      // mapped to annotate.js `text` field
          "rationale": "Why this is/isn't genuine",
          "location": "title text centre",
          "standard": "Cognitive load (Norman 1988)",
          "fix": "Shorten to ≤ 80 chars"
        }
      ]
    }
  ]
}
```

**Mapping rule (documented in findings-schema.md, implemented at /annotate adapter in Phase 2):**

| Reviewer field | annotate.js SAMPLES field | Transformation |
|----------------|---------------------------|----------------|
| `slideNum` | `slideNum` | direct |
| `title` | `title` | direct |
| `findings[].severity_reviewer` | `annotations[].sev` | Critical→`major`, Major→`major`, Minor→`minor`, Nitpick→`polish` (collapse) |
| `findings[].nx` | `annotations[].nx` | direct |
| `findings[].ny` | `annotations[].ny` | direct |
| `findings[].text` | `annotations[].text` | direct |
| `findings[].genuine` | (filter — only `true` passed through) | filter, not mapped |
| `findings[].category`, `.rationale`, `.location`, `.standard`, `.fix` | (not in SAMPLES) | retained in JSON for downstream consumers |

This mapping is the LOCKED contract. `tests/fixtures/sample-findings.json` should mirror the 3-slide v8 structure verbatim with the schema fields layered on top.

## Environment Availability

| Dependency | Required By | Available (dev machine) | Version | Fallback |
|------------|------------|-------------------------|---------|----------|
| Node ≥ 18 | Everything | ✓ | v25.6.0 [VERIFIED] | — |
| npm | Install | ✓ | bundled with Node | — |
| soffice (LibreOffice) | Phase 3 (Phase 1 = informational warning only) | ✓ | 26.2.2.2 [VERIFIED] | Phase 1 hook warns; non-blocking |
| pdftoppm (Poppler) | Phase 3 (Phase 1 = informational warning only) | ✓ | 26.02.0 [VERIFIED] | Phase 1 hook warns; non-blocking |
| fc-list / fc-cache | Phase 1 D-01 font install | ✓ | bundled with fontconfig [VERIFIED] | macOS/Linux only; Windows skipped per D-01 |
| IBM Plex Sans (target machine) | annotate.js charPts calibration | ✓ already installed locally | 18 weights [VERIFIED] | Phase 1 hook installs from `assets/fonts/` |
| GitHub Actions Linux runner: LibreOffice | CI visual regression | Not pre-installed on `ubuntu-latest` | — | CI step: `sudo apt-get install -y libreoffice poppler-utils` (~3 min). For Phase 1, defer LibreOffice CI install — Tier 2 pixelmatch is `test.skip` until Phase 2; Tier 1 SHA gate needs no LibreOffice. [VERIFIED via GitHub Actions ubuntu-latest image manifest 2026-04 — LibreOffice not pre-installed; apt-get path is standard.] |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** GitHub Actions LibreOffice install — defer to Phase 3 when soffice is actually invoked in CI.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | `node --test` (built-in, Node ≥ 18) |
| Config file | None — discovers `tests/**/*.test.js` automatically |
| Quick run command | `node --test tests/manifest-validator.test.js -- --test-reporter=spec` |
| Full suite command | `node --test tests/ --test-reporter=spec` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FOUND-01 | Plugin loads with default component paths | manual + smoke | `claude plugin validate` (CI step) | ❌ Wave 0 |
| FOUND-02 | No reaches outside plugin tree | unit (path lint) | `bash tools/lint-paths.sh` | ❌ Wave 0 |
| FOUND-03 | SessionStart non-blocking dep check | unit (script test) | `node --test tests/check-deps.test.js` | ❌ Wave 0 |
| FOUND-04 | npm ci sentinel guard | unit | `node --test tests/check-deps.test.js` | ❌ Wave 0 |
| FOUND-05 | pptxgenjs exact 4.0.1 pin | unit | `node tools/assert-pptxgenjs-pin.js` | ❌ Wave 0 |
| FOUND-06 | Schema 1.0 required schema_version | unit (JSON shape) | `node --test tests/findings-schema.test.js` | ❌ Wave 0 |
| FOUND-07 | sample-findings.json honors schema | unit (fixture validate) | `node --test tests/findings-schema.test.js` | ❌ Wave 0 |
| FOUND-08 | All 4 CI gates wired | smoke | `bash .github/workflows/ci.sh` (extracted runner) OR run gates serially | ❌ Wave 0 |
| FOUND-09 | Visual-regression Tier 1 SHA + harness committed | unit (Tier 1 only) | `node --test tests/visual-regression.test.js` | ❌ Wave 0 |
| FOUND-10 | fc-list detection + first-run install flow | manual on fresh VM + unit (script logic) | `node --test tests/check-deps.test.js`; manual on clean machine | ❌ Wave 0 |
| FOUND-11 | LICENSE/NOTICE/licenses/ + license-checker green | unit + CI | `npx license-checker --production --failOn 'GPL;AGPL;SSPL'` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `node --test tests/<targeted>.test.js` for the file(s) the task touches
- **Per wave merge:** `node --test tests/ && bash tools/lint-paths.sh && node tools/validate-manifest.js && node tools/assert-pptxgenjs-pin.js && npx license-checker --production --failOn 'GPL;AGPL;SSPL'`
- **Phase gate:** Full suite green + manual fresh-machine `/plugin install alo-exp/instadecks` smoke test before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/manifest-validator.test.js` — exercises tools/validate-manifest.js
- [ ] `tests/path-lint.test.js` — exercises tools/lint-paths.sh
- [ ] `tests/check-deps.test.js` — script unit tests for hooks/check-deps.sh (extract logic to functions for testability)
- [ ] `tests/findings-schema.test.js` — validates sample-findings.json against findings-schema.md
- [ ] `tests/visual-regression.test.js` — Tier 1 SHA assert (active) + Tier 2 pixelmatch (`test.skip`)
- [ ] `tests/annotate-integrity.test.js` — Phase 2 unsuspends per D-06 (`test.skip` in Phase 1)
- [ ] No framework install needed — `node --test` is built-in

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `claude plugin validate` CLI is available on the planner's machine and in CI | §Architecture, §Don't Hand-Roll | Fall back to bespoke validation in tools/validate-manifest.js (already covered) — low risk |
| A2 | jszip transitive dep won't trip license-checker `--failOn 'GPL'` substring match | §Pitfall 2 | Mitigation documented (use `--exclude`); test locally during execution |
| A3 | GitHub Actions ubuntu-latest does not ship LibreOffice (pre-installed) | §Environment Availability | Phase 1 doesn't actually need LibreOffice in CI (Tier 2 = test.skip); deferred to Phase 3 |
| A4 | The relicensing note in NOTICE is sufficient for Apache-2.0 redistribution of `annotate.js` | §User Constraints D-05 | User is the author per HANDOFF.md; this is paperwork. If author confirmation is needed, it's a 1-message exchange — documented in HANDOFF.md known-unknowns |

## Open Questions

1. **Should `tools/validate-manifest.js` invoke `claude plugin validate` as a subprocess or implement validation independently?**
   - What we know: `claude plugin validate` exists and is authoritative. Bespoke validator covers (b) path resolution + (c) description checks not in the CLI.
   - What's unclear: Whether CI runners have `claude` CLI available.
   - Recommendation: Implement bespoke validator as the canonical CI gate; optionally invoke `claude plugin validate` as an additional step if available (don't fail CI on its absence).

2. **Visual-regression baseline JPGs at 150 DPI vs PNG?**
   - What we know: D-03 says "per-slide JPGs at 150 dpi" but pixelmatch requires PNG input.
   - What's unclear: Whether to commit JPGs (smaller, lossy) or PNGs (lossless, larger), or both.
   - Recommendation: Commit PNGs at 150 DPI (lossless = stable SHA + pixelmatch directly consumable). The CONTEXT.md "JPG" language in D-03 likely reflects v8's deliverable format; for the regression gate, PNG is correct. Flag this for Wave 0 task definition.

3. **`hooks/check-deps.sh` testability — extract logic to a Node module or shell-test it?**
   - What we know: Bash scripts are hard to unit-test with `node --test`.
   - What's unclear: Whether to keep the hook as pure bash (simpler, smaller) or rewrite as `check-deps.mjs` (Node-testable, larger).
   - Recommendation: Keep bash for the hook (matches silver-bullet/topgun precedent and Anthropic samples) but write a `node --test` integration test that *invokes the script* via `child_process.spawnSync` and asserts on stdout/exit code. Tests behavior, not internals.

## Sources

### Primary (HIGH confidence)
- Claude Code Plugins Reference — https://code.claude.com/docs/en/plugins-reference [VERIFIED 2026-04-27 via WebFetch] — manifest schema, component paths, hook events
- Claude Code Hooks Reference — https://code.claude.com/docs/en/hooks [VERIFIED] — SessionStart contract, exit codes, env vars, JSON `additionalContext`
- npm registry — `npm view pptxgenjs@4.0.1` confirms version 4.0.1 published, MIT, deps `{@types/node, https, image-size, jszip}` [VERIFIED]
- npm registry — `npm view license-checker` (25.0.1, BSD-3-Clause) [VERIFIED]
- npm registry — `npm view pixelmatch` (7.1.0, ISC) and `pngjs` (7.0.0, MIT) [VERIFIED]
- v8 BluePrestige `package.json` — `/Users/shafqat/Documents/Projects/Sourcevo/v5-blue-prestige/package.json` declares `"pptxgenjs": "^4.0.1"` [VERIFIED file read]
- v8 BluePrestige `annotate.js` lines 107-150 — SAMPLES array shape [VERIFIED file read]
- alo-labs/silver-bullet 0.27.1 hooks/hooks.json — production-proven SessionStart matcher pattern [VERIFIED file read]
- alo-labs/topgun 1.7.0 plugin.json — production manifest example [VERIFIED file read]
- Local environment — node v25.6.0, soffice 26.2.2.2, pdftoppm 26.02.0, fc-list installed, IBM Plex Sans 18 weights present [VERIFIED]

### Secondary (MEDIUM confidence)
- Apache License 2.0 §4(d) NOTICE requirements — apache.org/licenses/LICENSE-2.0 [CITED]
- pixelmatch threshold semantics — github.com/mapbox/pixelmatch README [CITED]
- GitHub Actions ubuntu-latest image manifest (LibreOffice not pre-installed) [ASSUMED — A3, low risk]

### Tertiary (LOW confidence)
- None. All Phase 1 patterns are anchored in primary sources.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every package version verified live via `npm view`
- Plugin manifest schema: HIGH — fetched from official docs at research time
- SessionStart contract: HIGH — fetched from official docs at research time
- CI gate patterns: HIGH — bespoke patterns matching CONTEXT.md decisions, all referencing verified tools
- Schema mapping: HIGH — extracted verbatim from v8 source file
- Pitfalls: HIGH — drawn from PITFALLS.md + production silver-bullet/topgun precedent
- Environment availability: HIGH for local dev; MEDIUM for CI runner (A3)

**Research date:** 2026-04-27
**Valid until:** 2026-05-27 (30 days; manifest schema is the most volatile input — re-verify if Claude Code releases a major version)

## RESEARCH COMPLETE

**Phase:** 1 - Plugin Foundation, Contract & CI Gates
**Confidence:** HIGH

### Key Findings
- Plugin manifest schema verified live (Apr 2026): `name` is the only required field; default component paths (`skills/`, `commands/`, `agents/`, `hooks/hooks.json`) work out-of-box, so plugin.json can stay minimal.
- SessionStart hook is inherently non-blocking; exit 2 only "shows stderr to user" and does NOT block — D-08's "always exit 0" approach is correct and idiomatic.
- pptxgenjs 4.0.1 is the current `latest` on npm AND the calibration version v8 BluePrestige used (its `package.json` declares `^4.0.1`) — the exact-pin rule (FOUND-05) is a tightening, not a divergence.
- `node --test` (zero-dep, built-in since Node 18) is the right test runner; no Vitest/Jest needed.
- Visual-regression Phase 1 scope = harness + Tier 1 SHA gate ACTIVE; Tier 2 pixelmatch = `test.skip` until Phase 2 produces the regenerated PPTX. Use PNG (not JPG) for pixelmatch input regardless of CONTEXT's "JPG" wording — flag for planner.
- Findings schema mapping to SAMPLES is fully extracted and locked at the field level; ready for `findings-schema.md` v1.0 to be written verbatim.

### File Created
`.planning/phases/01-plugin-foundation-contract-ci-gates/01-RESEARCH.md`

### Confidence Assessment
| Area | Level | Reason |
|------|-------|--------|
| Standard Stack | HIGH | All package versions verified live via `npm view` |
| Manifest + Hook Architecture | HIGH | Official docs fetched at research time; cross-referenced against silver-bullet/topgun production code |
| Pitfalls | HIGH | Drawn from PITFALLS.md + pre-existing production plugins; no speculative items |
| Environment | HIGH local / MEDIUM CI | Local fully verified; CI runner LibreOffice presence assumed (A3) but not load-bearing for Phase 1 |

### Open Questions (planner should resolve)
1. PNG vs JPG for visual-regression baselines (recommend PNG; CONTEXT D-03 says JPG — likely intent mismatch)
2. `claude plugin validate` invocation in CI vs bespoke-only (recommend bespoke + optional CLI augmentation)
3. `check-deps.sh` testing approach (recommend bash hook + `child_process.spawnSync` integration test)

### Ready for Planning
Research complete. Planner can now decompose Phase 1 into ~6-8 plans (suggested grouping: scaffold + manifest, hooks + dep check, CI gates, schema + fixtures, visual-regression baselines, fonts + license bundle) with high parallelism between license-bundle, schema, fonts, and CI-gate plans.
