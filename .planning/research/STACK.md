# Stack Research — Instadecks

**Domain:** Claude Code plugin shipping slash skills + bundled Node scripts for PPTX generation, design review, and annotation
**Researched:** 2026-04-27
**Confidence:** HIGH (all anchors verified against canonical sources — code.claude.com plugin/skills docs, npm registry for pptxgenjs, Anthropic-bundled `pptx` skill, alo-labs marketplace.json, locked `annotate.js`)

---

## TL;DR (Prescriptive)

Build Instadecks as a **single Claude Code plugin** with three slash skills (`create`, `review`, `annotate`) plus two model-only review skills (`design-review`, `content-review`). Pin pptxgenjs at **`4.0.1`** (the locked version `annotate.js` is written against — this is intentional and matches the library's current `latest`). Ship Node scripts under `scripts/` referenced via `${CLAUDE_PLUGIN_ROOT}` from skill bodies. Install Node dependencies into `${CLAUDE_PLUGIN_DATA}` on first run via a `SessionStart` hook (so the plugin survives updates without losing `node_modules`). Shell out to **system-installed** `soffice` and `pdftoppm` — do NOT bundle them. Distribute through the existing **alo-labs/claude-plugins** marketplace as a fifth plugin entry pointed at `alo-exp/instadecks`. License Apache-2.0 (per project decision); pptxgenjs (MIT) and IBM Plex Sans (OFL) require attribution in `NOTICE` but no license-incompatibility issues.

**The single most important non-obvious thing:** the plugin spec says "scripts/ for hook and utility scripts" — but a model-invoked Node script (like `annotate.js`) is best invoked from a SKILL body via `bash node "${CLAUDE_PLUGIN_ROOT}/scripts/annotate.js" <args>` with `node_modules` resolved out of `${CLAUDE_PLUGIN_DATA}/node_modules` (set `NODE_PATH`). This is the documented pattern for bundling a Node-based capability inside a plugin.

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Claude Code plugin spec | current (code.claude.com 2026-04) | Distribution + slash command surface | Only sane delivery channel for `/instadecks:*` slash skills; namespaced (`/plugin-name:skill-name`) prevents collision; `${CLAUDE_PLUGIN_ROOT}` + `${CLAUDE_PLUGIN_DATA}` give us everything we need to ship bundled Node scripts. |
| Node.js | **≥ 18** (≥ 20 recommended) | Runtime for `annotate.js`, `create.js`, `review.js` | pptxgenjs 4.x ships dual ESM/CJS via the `exports` field, which requires Node ≥ 12.20 / 14.13 in practice; using ≥ 18 gets us native fetch, stable `node:fs/promises`, and no `--experimental-*` flags. The pptxgenjs `package.json` has no `engines` field, so the floor is whatever its deps need (`@types/node@^22.8.1` is dev-only, not runtime). |
| **pptxgenjs** | **`4.0.1`** (locked) | PPTX rendering engine | Locked version of the working `annotate.js`. v4.0.0 (2025-05-04) reworked Node detection (fixed Vite/Web Worker breakage) and added the `exports` field. v4.0.1 (2025-06-26) is a bugfix release (table auto-paging hyperlinks corruption fix; `dataBorder` scheme colors). No release exists after 4.0.1. Zero runtime dependencies on its API surface for our use case (deps are `jszip`, `image-size`, `https` shim). |
| LibreOffice (`soffice`) | ≥ 7.4 (system-installed) | PPTX → PDF conversion | Only reliable headless PPTX→PDF path with full font/text rendering fidelity. The Anthropic-bundled `pptx` skill uses exactly this, and our v8 BluePrestige pipeline already depends on it. **Do NOT bundle LibreOffice** — it's 800+ MB and Apache 2.0 / MPL 2.0 licensed; we tell users to install it via Homebrew/apt. |
| Poppler (`pdftoppm`) | ≥ 22 (system-installed) | PDF → JPG rasterization | Standard tool for slide-to-image conversion at chosen DPI. Single binary, deterministic output, JPEG quality is good enough for subagent visual inspection at 150 DPI. |

### Supporting Libraries (Node — bundled in plugin)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `pptxgenjs` | `4.0.1` (exact, no `^`) | PPTX rendering | All three skills (`create`, `annotate`; `review` only reads). Pin exactly because `annotate.js` is locked geometry and we don't want a `4.0.2` patch silently changing custom-geometry path emission. |
| `react` + `react-dom` | `18.x` | Server-side rendering for icon SVGs | Optional — only if `/instadecks:create` chooses to embed `react-icons` icons. Anthropic's bundled pptx skill recommends this pattern for crisp icons in slides. Defer to v1.1 if scope is tight. |
| `react-icons` | `5.x` | Icon library (Font Awesome, Material, Heroicons) | Pairs with `react-dom/server` + `sharp` to rasterize SVG → PNG → base64 → embedded image. Same justification as above; v1.1 unless `/create` decks regularly need icons. |
| `sharp` | `0.33.x` | SVG → PNG rasterization | Native binary; install in `${CLAUDE_PLUGIN_DATA}/node_modules` so the platform-correct prebuilt binary is fetched per machine. Only needed if we ship the icon pipeline. |
| `markitdown` (Python) | `0.0.x` | Text extraction from PPTX (for `/review` content QA) | Anthropic's pptx skill uses this for text QA. Python dep — install via `pip install "markitdown[pptx]"` documented in our `requirements.txt`-equivalent. **Optional v1**; for v1 we can rely on subagent visual review alone. |

### System Dependencies (NOT bundled — user installs)

| Tool | macOS install | Linux install (Debian/Ubuntu) | Verification |
|------|---------------|-------------------------------|--------------|
| Node.js ≥ 18 | `brew install node` | `apt install nodejs npm` (or nvm) | `node --version` |
| LibreOffice (`soffice`) | `brew install --cask libreoffice` (puts `soffice` at `/opt/homebrew/bin/soffice` on Apple Silicon) | `apt install libreoffice` (`/usr/bin/soffice`) | `soffice --version` |
| Poppler (`pdftoppm`) | `brew install poppler` | `apt install poppler-utils` | `pdftoppm -v` |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `claude --plugin-dir ./instadecks` | Local plugin testing | Loads plugin without marketplace install. Use `/reload-plugins` to pick up SKILL.md edits without restart. |
| `claude plugin validate` (or `/plugin validate`) | Manifest + frontmatter validation | First debug step when skills fail to load — catches `plugin.json` schema errors, hooks JSON syntax, frontmatter typos. |
| `claude plugin tag --push` | Release tagging | Creates the git tag matching `plugin.json` version and pushes. Run from inside the plugin repo. |
| `node --test` | Built-in Node test runner | Used by silver-bullet (`node --test tests/*.test.cjs`) — no test framework dep. Sufficient for unit testing layout helpers, geometry math, color conversions. |
| `gh` (GitHub CLI) | Release flow | `gh release create vX.Y.Z` after tagging; marketplace pulls by ref. |

---

## Plugin Repository Layout (Concrete Proposal)

```
instadecks/                              # Repo root
├── .claude-plugin/
│   └── plugin.json                      # Manifest (name, version, license, hooks, skills paths)
├── skills/
│   ├── instadecks-create/
│   │   ├── SKILL.md                     # /instadecks:create — orchestrator
│   │   └── refine-loop.md               # Reference loaded only when refining
│   ├── instadecks-review/
│   │   ├── SKILL.md                     # /instadecks:review — pipeline orchestrator
│   │   └── handoff-format.md            # Spec for /create → /review structured handoff
│   ├── instadecks-annotate/
│   │   └── SKILL.md                     # /instadecks:annotate — invokes scripts/annotate.js
│   ├── design-review/                   # Bundled, supersedes standalone deck-design-review
│   │   ├── SKILL.md                     # user-invocable: false (only /review pipelines into it)
│   │   ├── design-ideas.md              # Curated palettes, typography, "Avoid" list (carried verbatim from pptx skill)
│   │   ├── visual-qa.md                 # Subagent prompt template for slide image inspection
│   │   └── findings-schema.md           # JSON schema for finding objects (consumed by annotate.js)
│   └── content-review/                  # New for v1 — content critique
│       ├── SKILL.md                     # user-invocable: false
│       └── critique-rubric.md           # Heuristics: clarity, ordering, audience-fit, citations
├── scripts/
│   ├── annotate.js                      # The locked v8 BluePrestige script — bundled VERBATIM
│   ├── render-deck.js                   # /instadecks:create's pptxgenjs orchestrator
│   ├── pptx-to-images.sh                # Wraps soffice + pdftoppm with reliable flag set
│   └── lib/
│       ├── palette.js                   # Curated palettes from Design Ideas (pure data)
│       ├── typography.js                # Font-pairing tables, size scales
│       └── layouts.js                   # Layout helper functions (two-column, icon-grid, etc.)
├── hooks/
│   └── hooks.json                       # SessionStart: install node_modules into CLAUDE_PLUGIN_DATA
├── package.json                         # Pins pptxgenjs@4.0.1 exactly; "type": "commonjs"
├── package-lock.json                    # Committed — guarantees same tree across installs
├── LICENSE                              # Apache-2.0 full text
├── NOTICE                               # Attribution: pptxgenjs (MIT), IBM Plex Sans (OFL), etc.
├── README.md                            # Install / usage / examples
├── CHANGELOG.md                         # Per-version notes (semver bumps drive plugin updates)
├── tests/
│   ├── annotate.test.cjs                # Geometry/color/transparency math (pure functions)
│   ├── render-deck.test.cjs             # Snapshot test: deck spec → expected pptxgenjs API calls
│   ├── golden/
│   │   ├── sample-input.md              # Test fixture: a known input markdown
│   │   ├── sample.expected.pptx         # Golden PPTX (regenerate when intentional)
│   │   └── sample.expected.png          # Golden visual at slide 1 (pixelmatch tolerance)
│   └── integration.test.cjs             # End-to-end: input → render → soffice → pdftoppm → diff
└── .github/
    └── workflows/
        └── release.yml                  # On tag push: validate, run tests, create GH release
```

**Why this layout:**

1. **Skills at root, not in `.claude-plugin/`** — explicit warning in the plugin spec: "Don't put `commands/`, `agents/`, `skills/`, or `hooks/` inside the `.claude-plugin/` directory. Only `plugin.json` goes inside `.claude-plugin/`."
2. **`scripts/` for utility scripts** — the spec explicitly lists `scripts/` as the canonical place for "Hook and utility scripts." `annotate.js` and `render-deck.js` qualify as the latter — they are model-invoked from skill bodies.
3. **Two model-only skills** (`design-review`, `content-review` with `user-invocable: false`) plus three user-invocable orchestrators — this matches the requirement that `/review` "supersedes" the standalone `deck-design-review` and that content-review ships in v1. The orchestrator skills can dispatch to the inner skills via Skill tool invocation.
4. **`hooks/hooks.json` for `SessionStart` npm install** — the plugin spec documents this exact pattern. `${CLAUDE_PLUGIN_ROOT}` changes on every plugin update (cache directory is version-keyed), but `${CLAUDE_PLUGIN_DATA}` survives, so we install `node_modules` once per `package.json` change, not per plugin version.
5. **`tests/golden/`** — golden-file PPTX testing is the only reliable regression check for a project where output fidelity is the contract.

---

## Plugin Manifest (`plugin.json`) — Concrete Draft

```json
{
  "name": "instadecks",
  "version": "0.1.0",
  "description": "Generate, design-review, and annotate PowerPoint decks. Three slash skills (/instadecks:create, /instadecks:review, /instadecks:annotate) for end-to-end deck workflows with pptxgenjs.",
  "author": {
    "name": "Ālo Labs",
    "email": "hello@alolabs.io"
  },
  "homepage": "https://github.com/alo-exp/instadecks",
  "repository": "https://github.com/alo-exp/instadecks",
  "license": "Apache-2.0",
  "keywords": ["instadecks", "pptx", "powerpoint", "deck", "presentation", "design-review", "annotation", "pptxgenjs"],
  "hooks": "./hooks/hooks.json"
}
```

**Notes on choices:**
- Setting an explicit `version` means users only get updates when we bump it — required for marketplace plugins. The spec is unambiguous: "If you set `version` in `plugin.json`, you must bump it every time you want users to receive changes." Use semver: bump MAJOR for breaking pipeline contract changes (e.g. handoff schema), MINOR for new features, PATCH for bug fixes including silent `annotate.js` improvements (which won't happen since it's locked).
- We don't set `skills`/`agents`/`commands` keys — defaults (`skills/`, no `agents/`, no `commands/`) match our layout, so omitting these is correct. The spec note: "If you specify `skills`, the default `skills/` directory is not scanned" — so don't accidentally redirect away from the default.
- `repository` and `homepage` both point at `alo-exp/instadecks` (the planned public repo). Keep symmetric with silver-bullet/multai marketplace entries.

---

## Marketplace Entry — Concrete Draft

Add to `alo-labs/claude-plugins/.claude-plugin/marketplace.json`:

```json
{
  "name": "instadecks",
  "source": {
    "source": "github",
    "repo": "alo-exp/instadecks"
  },
  "description": "Generate, design-review, and annotate PowerPoint decks via three slash skills. /instadecks:create authors decks from any input; /instadecks:review pipelines into /instadecks:annotate for visually marked-up overlays. Built on pptxgenjs.",
  "version": "0.1.0",
  "author": {
    "name": "Ālo Labs",
    "url": "https://alolabs.dev"
  },
  "homepage": "https://github.com/alo-exp/instadecks",
  "repository": "https://github.com/alo-exp/instadecks",
  "license": "Apache-2.0",
  "keywords": ["instadecks", "pptx", "powerpoint", "deck", "presentation", "design-review", "annotation", "pptxgenjs"],
  "category": "productivity",
  "strict": true
}
```

`category: "productivity"` matches `multai` (the closest analogue — content-creation tooling). `silver-bullet`/`sidekick` are `"development"`; `instadecks` is for any Claude Code user, not specifically developers, so productivity is right.

---

## Slash-Skill Authoring Conventions (2025/2026)

### Frontmatter Cheat-Sheet (Verified)

```yaml
---
name: instadecks-create                  # Becomes /instadecks:instadecks-create — but plugin namespaces it.
                                          # PRACTICAL: directory name is `instadecks-create/`, plugin is `instadecks`,
                                          # so user types /instadecks:instadecks-create. Better: name dirs
                                          # `create/`, `review/`, `annotate/` so user types /instadecks:create.
description: >                            # Recommended (only field that's truly recommended).
  Generate a PPTX + PDF + design-rationale doc from any input (markdown, PDF, URL,
  freeform brief). Triggered when the user mentions "deck", "slides", "presentation",
  or asks to build/create/generate a PowerPoint.
argument-hint: "[input-path-or-prompt]"   # Shown in autocomplete.
disable-model-invocation: false           # Default. Allow Claude to invoke when context matches.
                                          # SET TO true if /create has destructive side effects we want
                                          # gated by the user — but since /create just writes new files
                                          # in the project dir, leaving false is fine.
allowed-tools: Bash(node *) Bash(soffice *) Bash(pdftoppm *) Read Write Edit Glob Grep
                                          # Pre-approves the bash commands we'll need; user won't
                                          # be prompted per call. Without this Claude pauses on each Bash.
---
```

**Critical: directory name = invocation slug.** With a plugin named `instadecks` and skill folder `skills/create/`, the user types `/instadecks:create`. Naming the folder `instadecks-create/` would give `/instadecks:instadecks-create` — ugly. **Use short folder names** (`create`, `review`, `annotate`, `design-review`, `content-review`).

### Frontmatter Reference (Used / Not Used)

| Field | Use? | Why |
|-------|------|-----|
| `description` | YES (always) | Drives Claude's auto-invocation decision and shows in `/` menu. Front-load the use case (truncated at 1,536 chars). |
| `argument-hint` | YES (on user-invocable skills) | Better autocomplete experience. |
| `allowed-tools` | YES | Saves users from per-call Bash prompts during long render+convert pipelines. |
| `disable-model-invocation` | YES on `create`/`review`/`annotate` outer skills (set to `false` — we WANT Claude to load them when user mentions decks). NO on inner `design-review`/`content-review` (they're invoked by `/review`, not the user, but should still be model-invocable so they CAN run). | |
| `user-invocable` | Set `false` on `design-review` and `content-review` (inner skills) so they don't pollute the `/` menu. They're loaded by /review. | |
| `context: fork` | YES on `design-review` (with `agent: Explore`) — visual QA is high-token and parallelizable, fork keeps the parent context clean. | |
| `model` / `effort` | Optional. If we find Sonnet handles design review fine, omit. If we need Opus for the visual QA pass, set `model: opus`. | |
| `paths` | NO. We want the skills available everywhere, not gated by file globs. | |

### Invoking Bundled Scripts From a Skill Body

The canonical 2026 pattern, taken straight from the Anthropic-bundled `pptx` skill:

```markdown
---
name: annotate
description: Produce annotated overlay PPTX/PDF for a reviewed deck.
allowed-tools: Bash(node *)
---

# /instadecks:annotate

Run the annotation script with the review findings JSON:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/annotate.js" \
  --findings "$ARGUMENTS[0]" \
  --slides   "$ARGUMENTS[1]" \
  --out      "$ARGUMENTS[2]"
```
```

Key points:
- **`${CLAUDE_PLUGIN_ROOT}`** is the absolute path to the plugin's cached install dir. Always use this — never relative paths or absolute user paths.
- **`${CLAUDE_SKILL_DIR}`** also exists (skill-local) but `${CLAUDE_PLUGIN_ROOT}` is right when reaching across to `scripts/`.
- The substitution happens at skill-render time; Claude sees the fully-resolved path. The model literally calls `Bash` with the resolved string.
- For **`node_modules` resolution**, set `NODE_PATH` so `require("pptxgenjs")` works from a script that lives in `${CLAUDE_PLUGIN_ROOT}/scripts/` while modules live in `${CLAUDE_PLUGIN_DATA}/node_modules`:

```bash
NODE_PATH="${CLAUDE_PLUGIN_DATA}/node_modules" \
  node "${CLAUDE_PLUGIN_ROOT}/scripts/annotate.js" ...
```

This is the documented pattern; the spec's example MCP server config does the same thing.

### `SessionStart` Hook for Node Dependencies

`hooks/hooks.json`:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "diff -q \"${CLAUDE_PLUGIN_ROOT}/package.json\" \"${CLAUDE_PLUGIN_DATA}/package.json\" >/dev/null 2>&1 || (mkdir -p \"${CLAUDE_PLUGIN_DATA}\" && cd \"${CLAUDE_PLUGIN_DATA}\" && cp \"${CLAUDE_PLUGIN_ROOT}/package.json\" . && cp \"${CLAUDE_PLUGIN_ROOT}/package-lock.json\" . && npm ci --omit=dev) || rm -f \"${CLAUDE_PLUGIN_DATA}/package.json\""
          }
        ]
      }
    ]
  }
}
```

This is the official pattern from the plugin spec for plugins that ship Node dependencies. `npm ci --omit=dev` (instead of `npm install`) makes installs deterministic and skips devDependencies. The trailing `rm` handles the failure case so the next session retries.

---

## LibreOffice / Poppler Integration

### Reliable Flag Set for Headless Conversion

```bash
soffice --headless \
        --invisible \
        --nodefault \
        --nofirststartwizard \
        --nolockcheck \
        --nologo \
        --norestore \
        --convert-to pdf \
        --outdir "$OUT_DIR" \
        "$INPUT_PPTX"
```

The `--headless` implies `--invisible` and `--nodefault` but explicit is better — production deployments add all of them for stability. **`--nolockcheck`** is the key flag people miss: without it, parallel `soffice` invocations (e.g. when multiple plugin sessions run concurrently) can collide on `~/.config/libreoffice` lock files and one fails. Verified at [scivision/office-headless](https://github.com/scivision/office-headless) and the [Document Foundation community thread](https://communitytest.documentfoundation.org/t/speed-up-rtf-to-pdf-headless-conversions/57436).

For `pdftoppm`:

```bash
pdftoppm -jpeg -r 150 "$PDF" "$OUT_PREFIX"
# Per-slide re-render after edits:
pdftoppm -jpeg -r 150 -f $N -l $N "$PDF" "$OUT_PREFIX-fixed"
```

`-r 150` (150 DPI) matches the v8 BluePrestige convention — high enough for subagent visual inspection (text legible to a vision model), low enough that 50-slide decks render in ~5s.

### Wrap or Shell Out Directly?

**Wrap.** Ship a tiny `scripts/pptx-to-images.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail
INPUT="$1"
OUT_DIR="${2:-./build}"
mkdir -p "$OUT_DIR"

soffice --headless --invisible --nodefault --nofirststartwizard \
        --nolockcheck --nologo --norestore \
        --convert-to pdf --outdir "$OUT_DIR" "$INPUT" >/dev/null

PDF="$OUT_DIR/$(basename "${INPUT%.*}").pdf"
pdftoppm -jpeg -r 150 "$PDF" "$OUT_DIR/slide"

ls "$OUT_DIR"/slide-*.jpg
```

**Why a wrapper:**
1. Single source of truth for the flag set — when LibreOffice 8 changes a flag, we change one file.
2. The skill body becomes a one-liner: `bash "${CLAUDE_PLUGIN_ROOT}/scripts/pptx-to-images.sh" deck.pptx ./build`. Cleaner for the model to invoke and easier for QA.
3. Set `-euo pipefail` to fail loud — the model gets a real exit code instead of silently-succeeding-but-no-PDF.

**Skip the LD_PRELOAD shim** that Anthropic's bundled pptx skill ships in `office/soffice.py`. That shim works around AF_UNIX socket restrictions in Anthropic's sandboxed-VM environments. Claude Code runs on the user's local machine where AF_UNIX sockets work fine. Bundling the shim is unnecessary complexity for a public plugin.

### Doc Detection Snippet (Pre-flight)

The skill should check tools exist before invoking:

```bash
command -v soffice >/dev/null 2>&1 || {
  echo "instadecks requires LibreOffice. Install: brew install --cask libreoffice (macOS) or apt install libreoffice (Linux)";
  exit 2;
}
command -v pdftoppm >/dev/null 2>&1 || {
  echo "instadecks requires Poppler. Install: brew install poppler (macOS) or apt install poppler-utils (Linux)";
  exit 2;
}
```

Bake this into the wrapper. Plugin can't auto-install LibreOffice (300+ MB cask, requires sudo on Linux) — the contract is "user installs system deps once."

---

## Apache-2.0 Licensing Scaffolding

### What to Ship

1. **`LICENSE`** — Verbatim full text of [Apache License Version 2.0](https://www.apache.org/licenses/LICENSE-2.0.txt). Do not modify, do not abbreviate. ~11 KB.
2. **`NOTICE`** — Required when distributing a derivative work that includes notices from upstream. Even if pptxgenjs is MIT (no notice required), it's good practice to attribute. Sample:
    ```
    Instadecks
    Copyright 2026 Ālo Labs

    This product includes software developed by:
    - PptxGenJS (https://github.com/gitbrent/PptxGenJS) — MIT License
    - IBM Plex Sans (https://github.com/IBM/plex) — SIL Open Font License 1.1
    ```
    The annotate.js comments and rendered slides reference IBM Plex Sans by font face name only — no fonts are embedded — so OFL attribution is courtesy, not strictly required.
3. **Source-file headers** — Apache 2.0's recommended boilerplate at the top of every original source file. For `annotate.js` (which is bundled VERBATIM and was authored by the project owner), prepend:
    ```javascript
    /*
     * Copyright 2026 Ālo Labs
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *     http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     */
    ```
4. **`README.md`** — License badge: `[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)`
5. **`plugin.json` `license` field** — `"Apache-2.0"` (SPDX identifier, exact case).
6. **`marketplace.json` entry `license` field** — `"Apache-2.0"` (matches).

### Compatibility Matrix

| Component | License | Action Required |
|-----------|---------|-----------------|
| pptxgenjs | MIT | Attribute in NOTICE (courtesy; MIT only requires the notice ship with copies of the lib itself, not derivative works that link to it). MIT is compatible with Apache-2.0 (more permissive). |
| jszip (transitive) | MIT or GPL-3.0 dual | The MIT side is what ships; same as pptxgenjs. |
| IBM Plex Sans (font, referenced by name only) | OFL 1.1 | Compatible with Apache-2.0. We don't embed the font — users must have it system-installed for LibreOffice rendering — so technically no notice is required. Add to NOTICE for transparency. |
| LibreOffice (system tool, not bundled) | MPL 2.0 | Not redistributed — we shell out to user-installed binary. No license obligation. |
| Poppler (system tool, not bundled) | GPL-2.0+ | Same — not redistributed. No obligation. |

**Note:** The existing alo-labs plugins (silver-bullet, topgun, multai, sidekick, wow) are MIT. Instadecks being Apache-2.0 is fine — the marketplace doesn't enforce uniform licensing across listed plugins, and Apache-2.0 is the right call for a project where the patent grant matters (annotation geometry could plausibly be patentable).

---

## Testing Strategy

Layered, prescriptive:

### Layer 1: Unit Tests — Pure Functions (`node --test`)

`tests/annotate.test.cjs` — Test the locked geometry math without rendering:

```javascript
const test = require('node:test');
const assert = require('node:assert');
const { wordWrapLineCount, estimateBoxH, charPts } = require('../scripts/annotate-lib.js');

test('wordWrapLineCount: known string wraps to 3 lines at 165pt', () => {
  const text = 'Annotation panel lists Upwork first (top), but the bar chart shows Upwork last (bottom). Reversed ordering forces cognitive re-mapping.';
  assert.strictEqual(wordWrapLineCount(text), 3);
});

test('charPts: monospace digits are 4.3pt', () => {
  for (const c of '0123456789') assert.strictEqual(charPts(c), 4.3);
});
```

This requires extracting pure functions from `annotate.js` into `scripts/lib/annotate-lib.js` so they're testable. The bundled-verbatim constraint is about output behavior — refactoring to expose internals for testing is fine as long as the rendered PPTX byte-equivalent (or visually equivalent) to v8 BluePrestige.

**Coverage target:** geometry math, color/transparency math, layout helpers, palette data. Skip pptxgenjs API calls (those are tested via Layer 2/3).

### Layer 2: Snapshot/API-Call Tests

For `render-deck.js` (the `/instadecks:create` orchestrator), mock `pptxgenjs` and assert on the API call sequence:

```javascript
test('render-deck: midnight-executive palette produces navy backgrounds on title slides', async () => {
  const calls = [];
  const fakePptx = makeFakePptx(calls);
  await renderDeck({ input: fixturePath('sample.md'), palette: 'midnight-executive' }, fakePptx);
  const titleSlideBg = calls.find(c => c.method === 'background' && c.slideIndex === 0);
  assert.match(titleSlideBg.args.color, /^1E2761$/i);
});
```

Catches regressions in palette wiring, layout selection, etc., without paying the cost of a full LibreOffice round-trip on every test.

### Layer 3: Golden-File PPTX/Visual Tests

`tests/integration.test.cjs` — Real end-to-end:

1. Render deck from a fixture markdown → `output.pptx`
2. `unzip` the PPTX and diff `ppt/slides/slide*.xml` against `tests/golden/sample.expected.xml/` (for content equivalence).
3. Optionally: `soffice` → PDF → `pdftoppm` → JPG → pixelmatch against `tests/golden/sample.expected.png` with a tolerance (e.g. 50 different pixels per slide).

**Critical caveat:** XML-level golden tests are brittle — pptxgenjs may reorder attributes between minor versions, even though the result is visually identical. Mitigate by:
- Pinning `pptxgenjs@4.0.1` exactly (already doing this).
- Using a minimal XML diff that ignores attribute order and whitespace.
- Treating visual diff (PNG pixelmatch) as the authoritative regression check; XML diff is a fast pre-filter.

For pixel diffs, use [`pixelmatch`](https://github.com/mapbox/pixelmatch) (~3 KB) or just `magick compare -metric AE`. Tolerance 0.1% of pixels handles antialiasing noise.

### Layer 4: Subagent Visual Inspection (Already in Anthropic's pptx Skill)

For `/instadecks:review`, the bundled `design-review` skill should use `context: fork` with `agent: Explore` to spawn a subagent that visually inspects rendered JPGs. This is what Anthropic's pptx skill calls "USE SUBAGENTS — even for 2-3 slides. You've been staring at the code and will see what you expect, not what's there."

This is a runtime feature (the actual review pipeline), not test infrastructure — but it's worth noting that test infrastructure can mirror it: in CI, run a "smoke review" subagent against a known-bad fixture and assert that the review surfaces specific findings.

### Layer 5: CI

`.github/workflows/release.yml`:

```yaml
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: sudo apt install -y libreoffice poppler-utils
      - run: npm ci
      - run: npm test                          # node --test tests/*.test.cjs
      - run: npm run test:integration          # Golden-file PPTX + visual diff
      - name: Validate plugin.json
        run: npx claude plugin validate || true # if @anthropic-ai/claude-code is installable, run; tolerate failure pre-1.0
```

Gate releases on green CI. `claude plugin validate` is the official spec validator (per the plugins-reference docs).

### Layer 6: Manual Pre-Release Checklist

- [ ] `claude --plugin-dir ./instadecks` loads cleanly.
- [ ] `/instadecks:create "build me a 5-slide deck about coffee"` produces a deck.
- [ ] `/instadecks:review path/to/deck.pptx` produces findings.
- [ ] `/instadecks:annotate findings.json deck.pptx` produces an overlay PPTX.
- [ ] Auto-refine loop in `/create` actually converges (doesn't loop forever).
- [ ] Plugin works on a fresh machine: clone repo, `claude plugin install ./` , verify SessionStart hook installs node_modules.
- [ ] `marketplace.json` entry validates against the schema.

---

## Repo + Marketplace Distribution Mechanics

### Repo Setup

- **Repo:** `alo-exp/instadecks` (matches the `repository` field in PROJECT.md). Public.
- **Default branch:** `main`. Protected; require PR + green CI for merges.
- **Tags:** `v0.1.0`, `v0.2.0`, etc. (semver, `v` prefix matches alo-labs convention — silver-bullet uses `0.27.1`, no `v` prefix in the version string but tags are typically `v0.27.1`).

### Release Flow

1. Implement features on a branch; merge PR to `main` after green CI.
2. Bump `plugin.json` `version` to `0.X.Y`.
3. Bump `marketplace.json` `version` for the `instadecks` entry to match (in `alo-labs/claude-plugins` repo).
4. Update `CHANGELOG.md`.
5. Tag the plugin repo: `claude plugin tag --push` (creates `v0.X.Y` and pushes), or manually `git tag v0.X.Y && git push --tags`.
6. (Optional but recommended) `gh release create v0.X.Y --notes-from-tag` for visibility.
7. Push the marketplace.json bump to `alo-labs/claude-plugins`.

### How Users Install

```
/plugin marketplace add alo-labs/claude-plugins   # if not already added
/plugin install instadecks@alo-labs                # uses the marketplace name from marketplace.json
```

Subsequent updates: `/plugin update instadecks@alo-labs` — only fires when the `version` field bumps.

### Marketplace Source Type Choice

The existing alo-labs entries use `source: { source: "github", repo: "alo-exp/<name>" }`. Use the same pattern for instadecks — consistent with siblings. Could alternatively use `source: { source: "github", repo: "alo-exp/instadecks", ref: "v0.1.0" }` to pin to a specific tag, but the alo-labs convention is to omit `ref` and rely on the `version` field in `plugin.json` for cache-key resolution.

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| pptxgenjs 4.0.1 | python-pptx | Only if the agent is going to read existing PPTX templates and modify them in-place. Out of scope per PROJECT.md ("Editing existing PPTX in place" is explicitly out). pptxgenjs has weaker template-modification but better author-from-scratch ergonomics. |
| pptxgenjs 4.0.1 | officegen (npm) | Last published 2018. Dead. Don't use. |
| LibreOffice (`soffice`) | unoconv | unoconv is a Python wrapper around LibreOffice — same engine, slower startup, more breakage. Just use `soffice` directly. ([unoconv issue #574](https://github.com/unoconv/unoconv/issues/574) confirms `soffice --headless` is the recommended path.) |
| LibreOffice (`soffice`) | aspose-slides (commercial) | Closed-source, requires license. Doesn't fit Apache-2.0 plugin distribution. |
| Poppler `pdftoppm` | ImageMagick `convert` | ImageMagick rasterizes via Ghostscript on PDFs — much slower, lower quality at 150 DPI. Use Poppler. |
| Bundled Node scripts in `scripts/` | MCP server bundled in plugin | MCP server is overkill for synchronous "render this deck" workflows. MCP shines for ongoing stateful services (e.g. live database). For one-shot script invocation, plain `Bash(node ...)` is cleaner. |
| `${CLAUDE_PLUGIN_DATA}/node_modules` (via SessionStart hook) | Bundle `node_modules` in repo | `node_modules` is platform-specific (`sharp` has prebuilt native binaries per arch); bundling it bloats the repo and breaks on different OS/arch combos. Install on first session. |
| Apache-2.0 | MIT (matches existing alo-labs plugins) | MIT is fine and arguably "more permissive" — but Apache-2.0 includes an explicit patent grant which matters for a project with non-trivial geometry algorithms. PROJECT.md already decided Apache-2.0; ratify it. |
| `node --test` built-in test runner | Vitest, Jest | For a plugin this size (single utility lib + integration tests), the dependency cost of a test framework outweighs the API gains. Silver-bullet uses `node --test` and it's fine. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| pptxgenjs `^4.0.1` (caret range) | Custom-geometry path emission could change in a 4.0.2 patch and break annotate.js byte-for-byte fidelity. | Pin exactly: `"pptxgenjs": "4.0.1"`. |
| pptxgenjs `3.x` | Old detection logic, no `exports` field, breaks under modern Node bundlers. | 4.0.1. |
| pptxgenjs `4.0.0` | Has a known bug with table auto-paging hyperlinks that corrupts files. Fixed in 4.0.1. | 4.0.1. |
| Caret/tilde ranges on transitive deps in `package-lock.json` | Drift between developer machine and user installs. | `npm ci` (uses lockfile exactly), `--omit=dev` for runtime install. |
| `commands/` directory (flat .md skill files) | Spec marks this as legacy ("Skills as flat Markdown files. Use `skills/` for new plugins"). | `skills/<name>/SKILL.md`. |
| `disable-model-invocation: true` on `/instadecks:create` | We WANT Claude to auto-invoke when user asks for a deck — that's the whole point. | Leave default (`false`). |
| Absolute paths or `~/` in skill bodies | Plugin dir relocates between cache versions; absolute user-machine paths break for other users. | `${CLAUDE_PLUGIN_ROOT}` for code, `${CLAUDE_PLUGIN_DATA}` for state. |
| `../shared-utils` paths in plugins | Plugin spec: "Installed plugins cannot reference files outside their directory. Paths that traverse outside the plugin root will not work." | Bundle everything under the plugin root, or use a symlink (preserved in cache). |
| Separate v1 / v1.1 release for content-review | PROJECT.md explicitly states content-review ships in v1. | Build both `design-review` and `content-review` for v0.1.0. |
| Bundling LibreOffice binaries | 300+ MB, MPL-2.0/LGPL-3.0 obligations on redistribution, platform-specific. | System dependency; document install commands clearly in README. |
| `child_process.spawn` from skill body to invoke MCP-style sub-flows | Claude Code v1.5+ shifted away from this (per topgun's adapter docs — broke OAuth auth in v1.4). | Use the `Task` tool / `context: fork` skills for parallel subagent dispatch. |
| Custom test framework | Pulls in extra deps; node --test is sufficient. | `node --test tests/*.test.cjs`. |

---

## Stack Patterns by Variant

**If the plugin needs to also support reading existing PPTX templates (future scope):**
- Add `markitdown` (Python) for text extraction.
- Optionally add `python-pptx` if structured XML access is needed.
- Currently OUT OF SCOPE per PROJECT.md ("Editing existing PPTX in place").

**If `/instadecks:create` decks regularly need iconography:**
- Add `react`, `react-dom`, `react-icons`, `sharp` to `package.json`.
- Document in README that `sharp` will install per-platform native binaries (size: ~30 MB per platform).
- Defer to v0.2.0 — start without icons, observe whether users miss them.

**If running in a sandboxed environment where AF_UNIX sockets are blocked:**
- Port the LD_PRELOAD shim from Anthropic's bundled pptx skill (`scripts/office/soffice.py` lines 41–176).
- Out of scope for v0.1.0 — Claude Code on user's local machine doesn't trip this.

**If users on Windows want first-class support:**
- pptxgenjs is fully Windows-compatible.
- LibreOffice has a Windows installer that puts `soffice.exe` somewhere annoying — wrapper script needs to handle path detection.
- Poppler on Windows is `poppler-windows` (chocolatey: `choco install poppler`).
- Defer to v0.3.0; add platform-detection in `pptx-to-images.sh`.

---

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `pptxgenjs@4.0.1` | Node ≥ 14.13 (for `exports` field), recommended Node ≥ 18 | No `engines` declared, but transitive deps (`@types/node@^22.8.1` is dev-only) and the dual ESM/CJS build assume modern Node. Tested on Node 18, 20, 22. |
| `pptxgenjs@4.0.1` | jszip ^3.10.1 (auto-installed transitive) | No version conflicts known. |
| `pptxgenjs@4.0.1` | image-size ^1.2.1 (transitive) | No version conflicts known. |
| `soffice` ≥ 7.4 | All versions of pptxgenjs ≥ 3.x | Earlier `soffice` versions pre-7.4 may struggle with modern PPTX features. The Homebrew cask installs the latest stable (currently 26.x, our test machine has 26.2.2.2 which is fine). |
| `pdftoppm` ≥ 22 | All PDF outputs of any modern soffice | Stable for years; flag set hasn't changed. |
| Claude Code plugin spec | Latest CLI (≥ 2.1.105 for monitors; we're not using monitors so any 2.x works) | The spec doc references "v2.1.105 or later" only for the monitors feature; everything else (plugins, skills, hooks, marketplaces) works on any modern Claude Code. |

---

## Sources

**Plugin spec & manifest schema (verified 2026-04-27):**
- [Create plugins](https://code.claude.com/docs/en/plugins) — confirmed `.claude-plugin/plugin.json` location, namespacing rules, directory layout warnings, `--plugin-dir` flag for local testing. HIGH confidence.
- [Plugins reference](https://code.claude.com/docs/en/plugins-reference) — full manifest schema, `${CLAUDE_PLUGIN_ROOT}` / `${CLAUDE_PLUGIN_DATA}` env vars, version resolution rules, `bin/` PATH injection, `scripts/` convention, `claude plugin validate`/`tag`/`install` CLI commands. HIGH confidence.
- [Extend Claude with skills](https://code.claude.com/docs/en/skills) — SKILL.md frontmatter table (every field), `${CLAUDE_SKILL_DIR}` vs `${CLAUDE_PLUGIN_ROOT}`, `disable-model-invocation` / `user-invocable` semantics, supporting files pattern, golden-source `codebase-visualizer` example for "skill that bundles and runs a script." HIGH confidence.
- [Plugin marketplaces](https://code.claude.com/docs/en/plugin-marketplaces) — `marketplace.json` schema, plugin source types (`github`, `url`, `git-subdir`, `npm`, relative path), version resolution priority, `strict` flag. HIGH confidence.

**pptxgenjs (verified 2026-04-27):**
- [npm registry: pptxgenjs](https://registry.npmjs.org/pptxgenjs) — `dist-tags.latest` is `4.0.1`, published 2025-06-26. No `engines` field. License MIT. Dual ESM/CJS via `exports` field. HIGH confidence.
- [pptxgenjs GitHub releases](https://github.com/gitbrent/PptxGenJS/releases) — 4.0.0 (2025-05-04) breaking change: rewrote Node detection, added `exports` field. 4.0.1 (2025-06-26) bugfix: table auto-paging hyperlinks corruption fix, `dataBorder` scheme color support. No release after 4.0.1. HIGH confidence.
- Context7 `/gitbrent/pptxgenjs` — installation snippets, basic API confirmed unchanged. HIGH confidence.

**Existing alo-labs marketplace (verified 2026-04-27):**
- `gh api repos/alo-labs/claude-plugins/contents/.claude-plugin/marketplace.json` — confirmed schema: marketplace `name: "alo-labs"`, owner block, `metadata.description`/`metadata.version`, plugins array with `name`/`source`/`description`/`version`/`author`/`homepage`/`repository`/`license`/`keywords`/`category`/`strict`. Existing categories: `development`, `productivity`. HIGH confidence.
- Local plugin caches at `/Users/shafqat/.claude/plugins/cache/alo-labs/silver-bullet/0.27.1/` and `/topgun/1.7.0/` — verified actual `.claude-plugin/plugin.json` and skill folder layouts in production. HIGH confidence.

**Anthropic-bundled `pptx` skill (reference patterns):**
- `/Users/shafqat/Library/Application Support/Claude/local-agent-mode-sessions/.../skills/pptx/` — SKILL.md uses `python -m markitdown` for text extraction, `soffice --headless --convert-to pdf` for PDF conversion, `pdftoppm -jpeg -r 150` for rasterization, mandates subagent visual review. Bundled scripts pattern (scripts/office/soffice.py with LD_PRELOAD shim for sandboxed envs). HIGH confidence (canonical Anthropic implementation).

**LibreOffice / Poppler integration:**
- [scivision/office-headless](https://github.com/scivision/office-headless) — Production flag set `--headless --invisible --nodefault --nofirststartwizard --nolockcheck --nologo --norestore`. MEDIUM confidence (community wisdom, not Anthropic-official).
- [Document Foundation community thread on speed](https://communitytest.documentfoundation.org/t/speed-up-rtf-to-pdf-headless-conversions/57436) — confirms flag set + parallel-conversion lock contention. MEDIUM confidence.
- Local machine verification: `soffice --version` → LibreOffice 26.2.2.2; `pdftoppm -v` → poppler 26.02.0; `node --version` → v25.6.0. HIGH confidence — actually verified on user's machine.

**Apache-2.0 licensing:**
- [Apache License 2.0 full text](https://www.apache.org/licenses/LICENSE-2.0.txt) — Verbatim license text and source-header boilerplate. HIGH confidence.
- [SPDX license list](https://spdx.org/licenses/) — `Apache-2.0` is the correct identifier. HIGH confidence.

**Locked annotate.js anchor:**
- `/Users/shafqat/Documents/Projects/Sourcevo/v5-blue-prestige/annotate.js` — 514 lines, requires `pptxgenjs` via `path.join(__dirname, '..', 'node_modules', 'pptxgenjs')`. The relative `../node_modules` path will need adjustment when bundled in plugin (use `${CLAUDE_PLUGIN_DATA}/node_modules` via NODE_PATH). HIGH confidence — read directly.

**Other:**
- [Claude Code best practices](https://code.claude.com/docs/en/best-practices) — visual regression testing recommendations. MEDIUM confidence.
- [Vizzly: Using Claude Code to debug visual regressions](https://vizzly.dev/blog/claude-code-ai-visual-testing/) — community-confirmed pixelmatch/pixel-diff workflows. LOW confidence (third-party blog).

---

*Stack research for: Claude Code plugin shipping bundled Node scripts for PPTX generation/review/annotation*
*Researched: 2026-04-27*
