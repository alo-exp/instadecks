# Pitfalls Research

**Domain:** Claude Code plugin distributing pptxgenjs deck generation + LibreOffice headless review pipeline + bundled annotate.js verbatim
**Researched:** 2026-04-27
**Confidence:** HIGH (most critical pitfalls verified with primary sources — GitHub issues, official docs, and direct experience from v8 BluePrestige)

---

## Critical Pitfalls

### Pitfall 1: Touching `annotate.js` During Plugin Scaffolding

**What goes wrong:**
A well-meaning refactor "modernizes" the verbatim `annotate.js` — converts `require()` to `import`, replaces `path.join(__dirname, '..', 'node_modules', 'pptxgenjs')` with a cleaner import, splits the 513-line file into modules, or "improves" the per-character `charPts` table. Output silently regresses: arrows develop dark patches at elbows, bars misalign by 1.5–4 px, miter joins fail on near-horizontal arrows.

**Why it happens:**
The file looks "messy" by modern standards — it has manual relative `node_modules` resolution, single-file structure, hand-tuned magic constants (`COLUMN_PT = 165`, `BAR_TOP_OFFSET = 0.027`), and idiosyncratic layout math. Every one of those "smells" is actually a calibrated solution to a rendering problem that was discovered the hard way through v8 iteration. Reformatters and refactor agents don't know that.

**How to avoid:**
1. Treat `annotate.js` as a binary asset — copy it verbatim into `scripts/annotate.js` with zero modifications.
2. Adapt only the **import path** of `pptxgenjs` — change line 6 from `require(path.join(__dirname, '..', 'node_modules', 'pptxgenjs'))` to a single dependency-resolution call that survives plugin install. Use `${CLAUDE_PLUGIN_ROOT}` or a `require('pptxgenjs')` after declaring it in the plugin's bundled `package.json`.
3. Add a SHA256 hash of the verbatim file to `tests/annotate-integrity.test.js`. Refuse to publish if the hash drifts from the v8 baseline (with explicit version-bump escape hatch).
4. Add a banner comment at the top: `// VERBATIM v8 BLUE PRESTIGE — DO NOT EDIT. See PITFALLS.md.`
5. The `SAMPLES` data array (lines 107–150) is example data — extract that to a separate `samples.js` so the geometry/algorithm code stays untouched. The annotate skill writes runtime data into a fresh JSON file and the entrypoint reads it.

**Warning signs:**
- A PR touches `annotate.js` and the diff is bigger than the import-path swap.
- A reviewer suggests "let's clean up the magic numbers."
- Lint/format runs over `scripts/annotate.js` (it shouldn't — exclude from prettier/eslint).
- Visual diff between v8 reference output and current build shows >1px deviation.

**Phase to address:**
Phase 1 (Foundation/Bundling). Lock the file before any other work.

**Do-not-regress rules from v8:**
- `ARROW_TRANS = 50` — 50% transparency
- 75% effective opacity at horizontal-to-diagonal arrow junction (achieved via merged single-polygon, NOT two overlapping 50% shapes)
- Miter joins (with bevel fallback when `|uy| <= 0.1`) — line 242
- `BAR_TOP_OFFSET = 0.027` — calibrated to LibreOffice's cap-height padding at 150 dpi
- `LINE_H_BAR = 0.110` (rendered) vs `LINE_H = 0.130` (text-box reservation)
- `COLUMN_PT = 165` — 2.5% headroom over raw box-width math to match LibreOffice's tighter actual rendering
- Per-character `charPts()` table — proportional widths, not fixed CPL
- `BAR_GAP = 0.08` with `margin: 0` on every `addText()` — overrides renderer default
- `DOT_R = 0.034` and arm-shortened-by-DOT_R — endpoint dot doesn't overlap arrow polygon
- 0% alpha line on filled shapes (`line: { color, transparency: 100 }`) — used as "no border"
- Box layout: `MAX_SIDE = 3` per side, overflow to above/below by `nx` distance from center, sort by `ny` to prevent arrow crossings

---

### Pitfall 2: Auto-Refine Loop Runs Forever (Token Burn + Oscillation)

**What goes wrong:**
`/instadecks:create` invokes `/instadecks:review` internally and "regenerates fixes until reviewer reports no genuine issues." Reviewer hallucinates issues that weren't there, generator "fixes" them creating new issues, reviewer flags those, generator un-fixes the original — infinite loop. User sees Claude burning $40 of tokens, never converging. Or worse: generator silently regresses on issue #1 to satisfy critique on issue #4, creating an oscillation between two states.

**Why it happens:**
1. Reviewer is a separate agent context, has no memory of "this was already discussed and resolved as not-an-issue."
2. Quality is subjective — "the title could be punchier" never converges; one phrasing trades against another.
3. Generator doesn't track *what changed* between cycles, so it can't detect "I just re-introduced the bug from cycle 2."
4. `PROJECT.md` explicitly says "no fixed cap on auto-refine cycles" — well-intentioned but unbounded loops are how token bills explode.
5. Recent research shows Reflexion-style loops can consume 50× the tokens of a single linear pass, with diminishing returns after ~3 cycles.

**How to avoid:**
1. **Soft cap with explicit override.** Default `MAX_REFINE_CYCLES = 5`. After the cap, the agent must summarize remaining concerns and ask the user "continue refining, accept current, or specify what to fix?" rather than silently looping. PROJECT.md's "no fixed cap" rule is satisfied because the user (not a hard-coded limit) chooses to continue.
2. **Issue ledger across cycles.** Each cycle writes a structured JSON: `{cycle: N, issues_found: [...], issues_fixed: [...], issues_intentionally_skipped: [...]}`. The generator reads the previous ledger before applying fixes. If issue X was "intentionally_skipped" in cycle N-1 (e.g., user-stated style), the generator marks it accepted, not "fixes" it.
3. **Convergence detection.** If cycle N's issue set ⊆ cycle N-2's issue set (i.e., we're seeing the same issues we saw two cycles ago), declare oscillation and stop.
4. **"No genuine issues remain" must be a positive output** from the reviewer. Reviewer must explicitly emit `{verdict: "clean"}` to continue. Absence of issues ≠ clean (could be reviewer timed out or context ran out).
5. **Pre-flight token budget.** Estimate tokens per cycle before starting (slide count × ~4k tokens/slide review + ~6k regen). Show user "estimated 5 cycles will use ~$X" before kicking off.
6. **Each cycle reviews *only the diff*, not the whole deck.** After cycle 1, the reviewer is told "cycle 2: review only what changed in slides [3, 7, 12]." Reduces cost ~3–5× and keeps focus on actual fixes.

**Warning signs:**
- Cycle count > 3 with no monotone reduction in issue count.
- Same slide flagged for the same issue category in cycles N and N-2.
- Token usage in the loop > 5× the initial generation cost.
- Reviewer's "issues" become subjectively similar to "this could be slightly different" rather than concrete defects.
- Generator changes the same 3 lines back and forth across cycles.

**Phase to address:**
Phase 4 (Auto-refine pipeline). This is the highest-risk pitfall in the entire project — get it right before public launch.

---

### Pitfall 3: Plugin Manifest / Skill Frontmatter Validation Errors

**What goes wrong:**
Plugin gets published to `alo-labs/marketplace`, users hit `/plugin install instadecks` and get cryptic errors: "Unrecognized keys 'category' and 'source'", "schema validation error on source field", or skills don't activate at all because the YAML frontmatter parses but Claude Code rejects the manifest silently.

**Why it happens:**
Claude Code's marketplace schema validator has had recurring bugs and undocumented strict requirements (issues #46786, #30366, #34756, #1331). Common failure modes:
- `category` and `source` fields written into per-plugin `plugin.json` (only valid in `marketplace.json` entries).
- `source` declared as object `{url, sha}` but validator wants plain string in some Claude Code versions.
- `agents` field declared as directory path instead of explicit array of `.md` file paths.
- Missing `version` field — Claude Code 2.x requires it; 1.x didn't, so docs are stale.
- Mixed URL formats — full URL on one entry, GitHub-shorthand on another.
- Missing `author` field on third-party plugins.
- Skill `name` field uses uppercase or spaces (must be lowercase letters/numbers/hyphens, max 64 chars).
- Skill `description` field has XML tags or exceeds 1024 chars.

**How to avoid:**
1. **Validate locally before pushing.** Add a `tools/validate-manifest.js` script that:
   - Parses every `*.json` under `.claude-plugin/` against the published Claude Code schema.
   - Walks every `SKILL.md` and validates frontmatter: `name` is `^[a-z0-9-]+$` and ≤ 64 chars; `description` has no `<` or `>`, ≤ 1024 chars, third-person voice; both fields non-empty.
   - Validates `agents:` field as explicit `.md` file paths, not directories.
   - Confirms `version:` is set and follows semver.
2. **Use the canonical examples.** Copy the structure from `anthropics/claude-code/plugins/plugin-dev/` rather than starting from scratch. Reserved names and undocumented rules are baked in.
3. **CI gate.** Run `validate-manifest.js` in CI on every PR; refuse to merge on failure. Run `claude plugin validate .` (if available) as a second check.
4. **Author field on every plugin entry** in marketplace.json — even if it's just `{ "name": "alo-labs", "url": "..." }`. Schema rejects entries without it.
5. **Test the install flow on a fresh machine.** Use a devcontainer / fresh user account to install the plugin from the marketplace branch and confirm activation. Don't rely on dev-mode `--plugin-dir` — that bypasses marketplace validation entirely.

**Warning signs:**
- `/plugin install` succeeds but `/instadecks:create` returns "Unknown slash command."
- Skills appear in `/plugin list` but `description` field shows `null` or truncated.
- `~/.claude/plugins/installed_plugins.json` has entries but `~/.claude/plugins/cache/instadecks/.claude-plugin/marketplace.json` is missing or stale.
- Errors mentioning "schema validation" or "Unrecognized keys" in Claude Code logs.

**Phase to address:**
Phase 5 (Marketplace publish prep). Add `validate-manifest.js` early in Phase 1 so it catches errors throughout development, not just at the end.

---

### Pitfall 4: Hard-Coded User-Machine Paths (Breaks Every Install)

**What goes wrong:**
Plugin works perfectly on the developer's machine, fails on every user install. `annotate.js` references `/Users/shafqat/Documents/...`, the review skill calls `/Users/shafqat/.claude/skills/deck-design-review/`, or scripts assume `node_modules/pptxgenjs` exists at a sibling path. Issue #15717 and #20676 in claude-code: "Plugin paths hardcoded with absolute paths fail across environments" — same trap, but here it's self-inflicted.

**Why it happens:**
1. `annotate.js` line 6 already has the pattern `path.join(__dirname, '..', 'node_modules', 'pptxgenjs')` — that's a hard relative dependency on a sibling directory layout that won't exist in a plugin install.
2. Skills authored on the dev machine reach into `~/.claude/skills/` for shared resources — works locally, breaks for any user who doesn't have the same skill installed.
3. Slash command implementations call out to scripts via absolute paths.
4. Image fixtures (the `v8s-XX.jpg` files referenced in `annotate.js` line 450) must be co-located with the script — broken if scaffolding moves them.

**How to avoid:**
1. **Use `${CLAUDE_PLUGIN_ROOT}`** for every path the plugin references. This is the documented Claude Code variable that resolves to the plugin's installed directory.
2. **Bundle pptxgenjs as a real dependency.** Plugin ships its own `package.json` with `"dependencies": { "pptxgenjs": "^4.0.0" }`. Plugin install / first invocation runs `npm install` into `${CLAUDE_PLUGIN_DATA}/node_modules` (per Claude Code docs, `CLAUDE_PLUGIN_DATA` is the persistent dir for installed deps). Adapt `annotate.js` line 6 to resolve via that path.
3. **Self-contained — no `~/.claude/` references.** All review skill content, design ideas guide, and supporting scripts live inside the plugin tree. `PROJECT.md` already mandates this — enforce it with a lint check that greps for `~/.claude` and `/Users/` in plugin source.
4. **No reference to v5-blue-prestige.** `annotate.js` lives at `scripts/annotate.js` inside the plugin; the v5 source is gone. The only link back to v5 is the SHA pin (Pitfall 1) verifying the file matches.
5. **Image fixtures travel with the script.** When `/instadecks:annotate` writes a runtime samples file, it writes alongside the user's images in the user's working directory — `__dirname` in annotate.js then points at the user's working dir, not the plugin install. Or invoke annotate.js with `cwd` set to the user's project.
6. **Pre-publish lint.** Add to `validate-manifest.js`: regex-scan all plugin files for `/Users/`, `/home/`, `~/`, absolute Unix paths, and absolute Windows paths (`C:\`). Fail on match outside of comment-only contexts.

**Warning signs:**
- `grep -r '/Users/' plugin-tree/` returns hits.
- `grep -r '~/.claude' plugin-tree/` returns hits.
- A user reports `ENOENT: no such file or directory`.
- Plugin works in dev mode (`--plugin-dir`) but fails after publish.
- Tests pass locally but fail in CI's clean-machine job.

**Phase to address:**
Phase 1 (Foundation). Lint check should exist before any code is written. CI gate from day 1.

---

### Pitfall 5: LibreOffice Concurrent Conversion Race Conditions

**What goes wrong:**
The review pipeline converts PPTX → PDF → JPG using `soffice --headless --convert-to pdf` then `pdftoppm`. If two `soffice` processes run simultaneously (e.g., parallel `/instadecks:review` calls, or the auto-refine loop kicks off cycle N+1's review while cycle N's image conversion is still finishing), they collide on the user profile lock file. One process silently produces no output (no error code), the other succeeds, downstream code reads stale or missing files, review claims "slide 7 is missing" when it actually exists.

**Why it happens:**
1. LibreOffice is **not thread-safe**. A single user profile can only host one `soffice` instance.
2. `subprocess` calls don't report errors when LibreOffice fails on lock-file collision — exit code is 0, output is empty.
3. `pdftoppm` (poppler) **also fails silently** — issue #682 in poppler: "pdftoppm does not return error code when conversion is unsuccessful."
4. The auto-refine loop is the most likely concurrent caller, because cycle N+1 may begin before cycle N's filesystem operations finish.
5. Default `soffice --headless` invocation doesn't specify `-env:UserInstallation`, so all processes share `~/.config/libreoffice/`.

**How to avoid:**
1. **Per-invocation user profile.** Always invoke `soffice` with `-env:UserInstallation=file:///tmp/lo-${SESSION_ID}-${PID}` so concurrent invocations have isolated profiles. Document in code comment why.
2. **File-existence + size check after every conversion.** Don't trust exit codes. After `soffice` exits, stat the expected PDF and assert size > 1KB. After `pdftoppm` exits, assert each expected `.jpg` exists and is > 1KB. Fail loud, not silent.
3. **Sequential conversion lock within a single session.** Use a flock-style lockfile in the user's working dir: `${cwd}/.instadecks-soffice.lock`. Even with isolated user profiles, a single deck conversion is small enough that sequential processing is fine and avoids surprise.
4. **Generous timeout with retry.** 60s timeout on `soffice` per slide, 30s on `pdftoppm` per page. On timeout, kill the process tree (not just the child — `soffice` forks `soffice.bin`), wait 2s, retry once with a fresh user profile. Hard-fail after retry with the actual stderr content.
5. **Cleanup on exit.** Trap signals to clean up `/tmp/lo-*` profile dirs — they leak ~50MB per invocation otherwise.
6. **Don't run review's PDF conversion in parallel with create's PDF conversion** in the auto-refine pipeline. Sequence them with explicit awaits.

**Warning signs:**
- Reviewer reports "slide N is missing" or "slide N is blank" intermittently — about 1 in 5 reviews on the same deck.
- `/tmp/lo-*` directories accumulate.
- "Personal settings are locked" stderr (rare but happens when profile lock file is left behind).
- Output PDF is 0 bytes or truncated.
- Image files (`v8s-XX.jpg`) have mismatched aspect ratio (suggests pdftoppm partial output).

**Phase to address:**
Phase 3 (Review pipeline). Bake into the conversion utility from the start; do not retrofit.

---

### Pitfall 6: pptxgenjs OOXML Spec Violations Caught by PowerPoint, Hidden by LibreOffice

**What goes wrong:**
Decks render fine in LibreOffice (the dev tool used for review-image generation), but Microsoft PowerPoint shows "PowerPoint found a problem with content" / "needs to be repaired" / "unreadable content" dialogs every open. Users report the plugin produces "broken" decks even though LibreOffice rendered them fine.

**Why it happens:**
Per pptxgenjs issue #1449 (March 2026) and related issues:
1. **`addShape('oval', ...)` writes the literal string `"oval"` into OOXML** instead of the spec-correct `"ellipse"`. PowerPoint's strict parser rejects it; LibreOffice silently accepts it. PptxGenJS's enum (`pres.shapes.OVAL`) maps correctly — but passing the string `'oval'` directly does NOT.
2. **Notes master generation issue**: pptxgenjs writes 6 placeholder shapes in `notesMaster1.xml` that PowerPoint considers malformed. PowerPoint strips them all on repair.
3. **Theme reference mismatch**: notesMaster's relationship file references `theme1.xml` instead of expected `theme2.xml`.
4. **Custom slide layouts** in v3.3.0 generated broken pptx (issue #826).
5. **Rotation** has long-standing bugs (issue #370) — angles render differently between PowerPoint and LibreOffice.

LibreOffice is forgiving; PowerPoint is strict. Building/reviewing only against LibreOffice means you ship pptx that breaks for the actual end user.

**How to avoid:**
1. **Always use the enum, never the string** for shape types. `pres.shapes.RECTANGLE` not `'rectangle'`, `pres.shapes.OVAL` (which maps to `ellipse`) not `'oval'`. Lint rule: ban string literals as the first arg to `addShape()`.
2. **Skip notes generation** unless explicitly requested. Don't add slide notes by default; if added, manually inspect the produced `notesMaster1.xml`.
3. **Test in PowerPoint, not just LibreOffice.** Before tagging a release, open the test decks in actual Microsoft PowerPoint (macOS or Windows). Document this as a release-checklist item.
4. **Version-pin pptxgenjs.** Don't use `^X.Y.Z` ranges — these bugs were in specific versions. Pin exact (`"pptxgenjs": "4.0.1"`), update deliberately, re-run the PowerPoint open test on every bump.
5. **Avoid rotation** for any element where exact positioning matters. If rotation is needed, place the rotated element on its own slide region and tolerate drift.
6. **Don't define custom slide layouts**; use `LAYOUT_WIDE` (which `annotate.js` already uses) and override per-slide instead. Custom layouts have a worse bug history.

**Warning signs:**
- LibreOffice opens deck cleanly, PowerPoint asks "Recovered Presentation?"
- `<p:sp>` elements with `prst="oval"` (or other non-spec values) when you `unzip -p deck.pptx ppt/slides/slide1.xml | grep prst`.
- Slides appear different in LibreOffice vs PowerPoint (slight position/rotation drift).
- Users report "deck broken on open."

**Phase to address:**
Phase 2 (Create skill). Establish PowerPoint test as a release gate before shipping any v0.1.

---

### Pitfall 7: IBM Plex Sans Substitution / Missing Font

**What goes wrong:**
`annotate.js` hardcodes `fontFace: 'IBM Plex Sans'` (lines 358, 365, 389, 394, 494). User installs the plugin on a machine without IBM Plex installed. LibreOffice silently falls back to Liberation Sans / DejaVu Sans / "default" — character advance widths are different, so the carefully-calibrated `charPts()` table over- or under-estimates text width. Bars don't align, lines wrap unexpectedly, the v8 pixel-perfect output is destroyed. Also: PowerPoint on Mac (issue #259) corrupts IBM Plex Sans headings into unreadable glyphs even when the font IS installed.

**Why it happens:**
1. IBM Plex Sans is not preinstalled on macOS, Windows, or most Linux distros.
2. pptxgenjs only writes the font *name* into the pptx; rendering depends on the local font system at conversion/display time.
3. `charPts()` calibration is locked to IBM Plex Sans 7.5pt metrics — any other font has different proportional widths.
4. Font fallback is renderer-specific — LibreOffice's substitution rules differ from PowerPoint's, both produce visibly different output from the calibration target.
5. LibreOffice's font substitution on missing IBM Plex can pick anything from Liberation Sans (close-ish) to a generic sans (far off).

**How to avoid:**
1. **Bundle IBM Plex Sans as a font asset.** Ship the `.ttf` files in `assets/fonts/` (free under SIL OFL, license-compatible with Apache-2.0). Plugin's first-run hook installs the font into the user's font directory if not present, OR registers it temporarily for the LibreOffice conversion.
2. **For LibreOffice conversion**, point soffice at the bundled fonts via `-env:FontPath=...` or copy them to `~/.fonts/` before invocation, removing them in cleanup.
3. **Detect missing font.** Before running conversion, run `fc-list | grep -i "ibm plex sans"`. If absent, prompt the user "IBM Plex Sans not installed — install bundled fonts now? (annotation alignment depends on this exact font)."
4. **Pin a fallback that's closest in metrics.** If user refuses font install, declare `fallback: ['Liberation Sans', 'Arial']` in the slide stack — produces less catastrophic output than letting LibreOffice pick its default.
5. **Document the font dependency** prominently in README. "Required: IBM Plex Sans — bundled with plugin; install when prompted."
6. **For PowerPoint on Mac**, ensure the bundled font is system-installed (not just registered for soffice) — otherwise users opening the deck see corrupted glyphs (per IBM/plex issue #259).

**Warning signs:**
- Annotation bars don't align with text (off by more than ±1 px at 150 dpi).
- Lines wrap differently than the v8 reference (e.g., 4 lines instead of 3).
- `fc-list | grep "IBM Plex"` returns empty on the user's machine.
- A user reports "the annotations look slightly off" without being able to articulate exactly why.

**Phase to address:**
Phase 1 (Foundation/Bundling). Font handling must be in place before annotate.js can run. Phase 5 (release) needs the font-detection prompt UX polished.

---

### Pitfall 8: Skill Description That Doesn't Trigger Activation

**What goes wrong:**
User runs Claude Code in a project, asks "build me a deck about X." Claude doesn't activate `/instadecks:create` — instead writes raw markdown, or activates the wrong skill. Recent research shows skill auto-activation is roughly a coin-flip (~50%) without careful description engineering — and the activation rate climbs to 100% only with imperative, keyword-heavy descriptions.

**Why it happens:**
1. Skill descriptions are loaded into Claude's context, but if they're vague Claude can't match them to the user's intent.
2. Many users have 50+ skills installed; descriptions get truncated to fit a budget (~1% of context window, fallback 8K chars). Each skill's description is capped at 1536 chars regardless.
3. Passive descriptions like "A skill that helps build presentations" are matched far less reliably than imperative "ALWAYS invoke when user asks for slides, deck, presentation, pptx, PowerPoint."
4. Verb-noun naming (`processing-pdfs`) is documented but not always followed.
5. Reserved words and YAML syntax errors silently break frontmatter parsing.

**How to avoid:**
1. **Front-load keywords in description.** Open with the imperative trigger phrase: "Use when user asks for a deck, presentation, PPTX, PowerPoint, pitch, slides, deck-build, slide deck, design-review, content-review, deck-annotate, deck-critique." Concrete keywords > abstract description.
2. **Use imperative voice + negative constraints.** "ALWAYS invoke when user mentions building, creating, or generating presentations. Do NOT use the generic markdown-output approach for slide content." Research showed this pattern hit 100% activation vs. 77% for passive style.
3. **Third-person, no first-person.** "This skill builds polished PPTX decks..." not "I'll help you build decks..." Inconsistent voice causes discovery problems.
4. **Examples in description.** Include 1–2 concrete example user phrases: "Triggers on prompts like 'make me a slide deck about X' or 'build a pitch deck from this transcript'." Examples improve match rate.
5. **Verb-noun skill name.** `instadecks:create` (verb-noun) > `instadecks:deck-creator` (noun-er). Already correct in the project's slash command names.
6. **Description ≤ 1024 chars** but use most of it. Don't be terse. Don't use `<` or `>` (XML-like content breaks frontmatter parsing in some Claude Code versions).
7. **Test activation.** Compose 10 user-style prompts (varying phrasings) and run them in Claude Code with the plugin installed. Expect ≥ 8/10 to trigger the right skill. If lower, sharpen the description.
8. **Don't rely on skill name alone.** Some skill names imply the use case (`/instadecks:annotate`) but Claude's matcher uses *description*; a thin description means the skill loses to a more pushy one.

**Warning signs:**
- User asks "make a deck" and Claude writes raw markdown.
- Activation tests show < 80% match rate.
- `/instadecks:create` triggers on irrelevant prompts (over-triggering).
- Description has the YAML loaded but `description: null` in `/plugin list` output.

**Phase to address:**
Phase 5 (Release polish). Activation tests should be a CI gate. Iterate description text until match rate is high.

---

### Pitfall 9: Bundling pptxgenjs Without Locking Version → Annotate.js API Drift

**What goes wrong:**
Plugin declares `"pptxgenjs": "^4.0.0"` in package.json. User installs plugin on day 1, gets pptxgenjs 4.0.0 — works. Two months later, pptxgenjs 4.5.0 ships with a "minor improvement" that subtly changes `addShape(CUSTOM_GEOMETRY)` semantics — points are now interpreted as percentages instead of inches, or `flipV` behavior changes for `LINE` shapes. annotate.js verbatim still works for new installs but produces visually different output. v8 pixel-perfect target lost.

**Why it happens:**
1. SemVer in JS land is aspirational, not enforced. Library authors ship "minor" bugfixes that change rendering behavior all the time.
2. annotate.js was calibrated against a specific pptxgenjs version (whatever was installed at the time of v8 BluePrestige). The exact version isn't recorded.
3. Caret ranges (`^4.0.0`) allow any 4.x — pptxgenjs has ~10 minor bumps a year, each potentially behavior-affecting.
4. Plugin updates and dependency updates can decouple — user runs old plugin code with new pptxgenjs.

**How to avoid:**
1. **Pin exactly.** `"pptxgenjs": "4.0.1"` (no caret), and document why in package.json comment / `DEPENDENCIES.md`: "Pinned because annotate.js geometry is calibrated against this version. Must re-run visual-regression suite before bumping."
2. **Lockfile committed.** Ship a `package-lock.json` (npm) or `pnpm-lock.yaml` so transitive deps are pinned too. Plugin ships its own lockfile inside the plugin tree.
3. **Identify the v8 baseline pptxgenjs version.** Ask the user (or `git log` of v5-blue-prestige's package.json) what version was in use during v8 calibration. Lock to that exact version.
4. **Visual regression on dependency bump.** Any change to pptxgenjs version (or Node, or LibreOffice) requires regenerating the v8 reference samples and pixel-diffing against the locked baseline. Bump only when diff is clean or differences are explicitly approved.
5. **Document the calibration target.** In `annotate.js` header, add: `// Calibrated against: pptxgenjs 4.0.1, LibreOffice 24.x, Node 20.x, IBM Plex Sans 6.0.0. Other versions: visual regression required.`

**Warning signs:**
- Output diffs from v8 reference even though annotate.js wasn't touched.
- New install produces different visuals than old install.
- pptxgenjs CHANGELOG mentions "shape rendering" or "OOXML" between pinned and current version.

**Phase to address:**
Phase 1 (Foundation). Lock and document on day 1. Phase 5 (release) verifies the lock survives marketplace install.

---

### Pitfall 10: Visual Regression Has No Baseline → /create Refactor Silently Breaks /annotate

**What goes wrong:**
v1 ships. Six months later, contributor refactors `/instadecks:create` to "improve generation quality." The refactor doesn't touch annotate.js at all — but it changes the slide JSON format that flows from `/create` → `/review` → `/annotate`. annotate.js consumes a slightly-different input, produces visually wrong annotations (boxes overlapping the mini-slide, severity color flipped, etc.). No test catches it because there's no visual baseline.

**Why it happens:**
1. annotate.js consumes the deck-review output format. If that format drifts, annotate's output is silently wrong even though the file itself is unchanged.
2. PPTX rendering is a complex cross-tool pipeline (Node → pptxgenjs → file → LibreOffice → PDF → poppler → JPG). Pure unit tests don't catch rendering regressions.
3. Functional tests (does the file exist? does it have N slides?) don't catch pixel drift.
4. Without a baseline, "looks right" is a manual judgement that varies by reviewer.

**How to avoid:**
1. **Baseline reference samples committed to repo.** `tests/fixtures/v8-reference/` contains:
   - The exact `samples.js` data the v8 deck used.
   - The expected `Annotations_Sample.pptx` byte-hash.
   - The expected per-slide JPGs at 150dpi (ground truth).
   - The expected per-slide PDF page MD5.
2. **Regression test runs the full pipeline.** `npm test` invokes `/instadecks:annotate` against the fixture data, runs LibreOffice + pdftoppm, and pixel-diffs the produced JPGs against the baseline. Use `pixelmatch` (the library Playwright uses under the hood) with a tight tolerance (≤ 0.5% diff per slide).
3. **Pixel-diff with tolerance.** A few-pixel-tolerance is OK for cross-machine subpixel rounding (different CPUs round float differently); a >1% diff is a real regression.
4. **Multiple test fixtures.** v8 sample (3 slides). + a pure-edge-case fixture (1 annotation per side, max overflow to above/below, miter vs bevel). + a stress fixture (8 annotations, max overflow). Different fixtures catch different regressions.
5. **CI runs visual regression on every PR.** Failing diffs block merge. Approved baseline updates require a separate "update reference samples" PR with explicit reviewer sign-off.
6. **Format contract test.** Static schema test on the deck-review JSON format consumed by annotate.js. If the schema drifts, this test fails before the visual diff would.

**Warning signs:**
- annotate.js unchanged, but a contributor says "annotations look slightly off in this PR."
- Reviewer screenshots show alignment drift but no test failed.
- The deck-review skill output starts including new fields that annotate.js doesn't read (yet).

**Phase to address:**
Phase 1 (Foundation, set up infra) and Phase 4 (Pipeline, lock end-to-end). The fixtures must exist before `/create` is touched in any way that flows into `/annotate`.

---

### Pitfall 11: Apache-2.0 LICENSE / NOTICE File Mistakes

**What goes wrong:**
Plugin ships under Apache-2.0 (per PROJECT.md). MIT-licensed dependencies (pptxgenjs is MIT) are bundled. Common mistakes:
- NOTICE file lists every MIT dep — wrong, MIT doesn't require NOTICE entries.
- LICENSE file is just the Apache-2.0 text — wrong, doesn't acknowledge bundled MIT deps.
- IBM Plex Sans bundled (SIL OFL 1.1) but not attributed — license violation.
- Author copyright not added to LICENSE/NOTICE — required by Apache-2.0 to apply the license to the work.

**Why it happens:**
1. The Apache-2.0 LICENSE/NOTICE distinction is misunderstood. Per Apache Software Foundation guidance: NOTICE is reserved for legally required notifications; MIT-license notices stay in their original locations.
2. SIL OFL 1.1 (IBM Plex's license) requires the license text bundled and the copyright preserved — easy to forget when bundling fonts.
3. Boilerplate templates often have generic "[copyright]" placeholders never filled in.

**How to avoid:**
1. **LICENSE file**: full Apache-2.0 text, with the copyright line filled in: `Copyright 2026 alo-labs / [author]`. At the bottom, add a "Bundled Software" section listing every bundled dep with a pointer:

   ```
   This product bundles the following software under their respective licenses:

   - pptxgenjs (MIT) — Copyright (c) Brent Ely
     See licenses/pptxgenjs.MIT
   - IBM Plex Sans (SIL OFL 1.1) — Copyright (c) IBM Corp
     See licenses/IBMPlexSans.OFL
   ```

2. **`licenses/` directory** with the full text of each bundled dep's license — `licenses/pptxgenjs.MIT`, `licenses/IBMPlexSans.OFL`. This is the standard Apache-2.0 practice.

3. **NOTICE file** kept minimal — just the Apache-2.0 boilerplate. Do NOT add MIT dep notices here; they belong in LICENSE per ASF guidance. Only add NOTICE entries if a bundled dep has its own NOTICE file (Apache-licensed deps).

4. **Source headers** on `.js` files (annotate.js, etc.): standard Apache-2.0 boilerplate header. The verbatim `annotate.js` predates the plugin — preserve its existing header (if any) and add the Apache header above the existing content.

5. **For annotate.js specifically**: The file was authored as part of v5-blue-prestige (presumably under whatever license that project uses). Confirm with the author/owner that re-licensing under Apache-2.0 for the plugin distribution is acceptable. If the original project was unlicensed/private, the author is the same — they grant permission. Document this in `LICENSE` or `NOTICE`: "annotate.js originally developed for internal Sourcevo use; relicensed under Apache-2.0 by the author for inclusion in this plugin."

6. **Run a license-compliance check.** `license-checker` (npm) or `license-finder` to enumerate all transitive deps and confirm each is Apache-2.0-compatible. GPL transitive deps would force the whole plugin to GPL — catch them now.

**Warning signs:**
- LICENSE file is generic boilerplate with placeholder `[year]` or `[author]`.
- NOTICE file lists MIT deps (it shouldn't).
- A bundled font has no license file.
- `license-checker` shows GPL or LGPL transitive deps.

**Phase to address:**
Phase 5 (Release prep). Don't skip. License non-compliance is a publish blocker.

---

### Pitfall 12: Tool Permissions / Allowed_Tools Silently Failing

**What goes wrong:**
Skill or plugin declares `allowed-tools` to scope down what the agent can do. In `bypassPermissions` mode the allow-list is silently ignored (issue #12232). In `dontAsk` mode, tools NOT in the list are denied without prompting — the agent calls Bash to invoke `soffice`, gets denied, and just gives up without telling the user why.

**Why it happens:**
1. Per Claude Code permissions docs: rules evaluate `deny → ask → allow`, first match wins, deny rules always take precedence.
2. `dontAsk` mode skips the user-callback step — denial happens silently from the agent's perspective.
3. `bypassPermissions` ignores `allowedTools` entirely (open issue, may be fixed by your install date — verify).
4. Issue #14956: `allowed-tools` in skills doesn't grant Bash permission for some bash command patterns.
5. The `Bash(soffice:*)` syntax for scoped bash permissions isn't always honored.

**How to avoid:**
1. **Don't over-restrict.** For a plugin that needs Bash to invoke `soffice`, `pdftoppm`, `node scripts/annotate.js` — declare those in allowed-tools, but accept the user may need to approve other Bash commands ad-hoc.
2. **Test in user's actual permission mode.** Don't just test in `bypassPermissions` (devs commonly use it). Test in `default` and `dontAsk` modes too — that's what real users have.
3. **Explicit allowed-tools per skill**, listing the Bash command prefixes you actually use:
   ```yaml
   allowed-tools:
     - Read
     - Write
     - Bash(soffice:*)
     - Bash(pdftoppm:*)
     - Bash(node:*)
     - Bash(npm:*)
   ```
4. **Document the permissions UX.** README explains: "On first run, Claude Code will prompt for permission to run soffice / pdftoppm / node — these are required for deck generation."
5. **Fail loudly on permission-denied.** Wrap Bash calls so a "permission denied" stderr is bubbled up as a clear error message ("Permission denied: install fonts. Run `claude permissions allow` for soffice/pdftoppm/node.") — not a silent give-up.

**Warning signs:**
- Skill works in dev mode (with bypass), fails for real users.
- User reports "/instadecks:create just stops" with no error.
- Bash permission prompts appear mid-flow, breaking the auto-refine loop.
- Issue #12232 / #14956 cases match the symptom.

**Phase to address:**
Phase 5 (Release). Test against multiple permission modes before publish.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Skip pinning pptxgenjs version (use `^4.0.0`) | Auto-receives bugfixes | annotate.js calibration breaks silently on minor bumps | Never (Pitfall 9) |
| Use `~/.claude/skills/deck-design-review` instead of bundling | Fast prototype, no copy needed | Plugin breaks for users without that skill installed | Never (Pitfall 4) |
| No cycle cap in auto-refine | "Quality" — runs until clean | Token blowup, oscillation, user fatigue | Never — soft cap with user override only (Pitfall 2) |
| Skip PowerPoint testing, only LibreOffice | Faster CI | Real users hit "needs to be repaired" dialogs | Never for v1; OK for early dev (Pitfall 6) |
| Skip visual regression, manual review | No flaky tests | /create refactor silently breaks /annotate | OK pre-v1 only (Pitfall 10) |
| Don't bundle IBM Plex Sans | Smaller plugin size | Annotation alignment broken for users without the font | Never (Pitfall 7) |
| No allowedTools scoping | Less prompt friction in dev | Real users hit permission prompts mid-flow | Acceptable in v1 if README warns; tighten later (Pitfall 12) |
| Skip license-checker on transitive deps | Faster setup | GPL transitive dep contaminates Apache-2.0 distribution | Never (Pitfall 11) |
| Refactor annotate.js to "modernize" it | Cleaner code | v8 pixel-perfect output destroyed | Never (Pitfall 1) |
| One-off refine prompt, no issue ledger | Simpler code | Reviewer loop oscillates | Acceptable for prototype; required for v1 (Pitfall 2) |

---

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| pptxgenjs `addShape` | Pass string `'oval'` | Use enum `pres.shapes.OVAL` (which writes `ellipse`) |
| pptxgenjs `addShape` (CUSTOM_GEOMETRY) | Use absolute coords without `minX`/`minY` translation | Translate points to shape-local coords (annotate.js line 286–297) |
| pptxgenjs `addText` | Trust default margin | Always set `margin: 0` to override LibreOffice's default padding (annotate.js explicitly does this) |
| pptxgenjs version | Use `^4.0.0` (caret) | Pin exactly: `4.0.1` (Pitfall 9) |
| LibreOffice `soffice` | No user profile, default invocation | Use `-env:UserInstallation=file:///tmp/lo-${PID}` per call (Pitfall 5) |
| LibreOffice `soffice` | Trust exit code | Stat output file and check size > 1KB (Pitfall 5) |
| poppler `pdftoppm` | Trust exit code | Stat each output JPG, check size (Pitfall 5) |
| `pdftoppm` | Default DPI (72) | Specify `-r 150` (matches v8 calibration) |
| `pdftoppm` | Default JPG quality | Specify `-jpegopt quality=85` (or whatever v8 used) |
| Claude Code skill frontmatter | Use uppercase or spaces in `name` | Lowercase letters/numbers/hyphens only, ≤ 64 chars |
| Claude Code skill frontmatter | Vague or first-person `description` | Imperative third-person, keyword-front-loaded, ≤ 1024 chars (Pitfall 8) |
| Claude Code marketplace.json | Mixed URL formats | Consistent — full URLs everywhere |
| Claude Code marketplace.json | Missing `author` field | Always include for every plugin entry |
| Claude Code marketplace.json | Object-form `source` | Plain string (per current schema; verify per CC version) |
| Claude Code plugin paths | Reference `~/.claude/` or `/Users/` | Use `${CLAUDE_PLUGIN_ROOT}` (Pitfall 4) |
| IBM Plex Sans on Mac PowerPoint | Assume it's installed | Bundle font, install on first run, prompt user (Pitfall 7) |
| Auto-refine reviewer | Stateless review each cycle | Issue ledger with ⊆ check for oscillation detection (Pitfall 2) |
| LibreOffice headless | Run in parallel with shared profile | Per-process `-env:UserInstallation` (Pitfall 5) |

---

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Auto-refine loop with no cap | Token cost > 50× single pass; multi-minute response times | Soft cap at 5 cycles + user override (Pitfall 2) | After ~3 cycles or large decks (>15 slides) |
| Sequential `soffice` per slide | Conversion time scales linearly with slide count | Single soffice invocation converts entire deck → PDF, then one `pdftoppm` for all pages | >10 slides; >30s wait |
| High-DPI image conversion (300+) | Memory blowup, multi-GB working set | Stay at 150 dpi (matches v8) for review images; only bump for final user output | Decks > 20 slides at 300dpi |
| Concurrent soffice without isolated profiles | Random conversion failures, lock-file errors | Per-call user profile (Pitfall 5) | Any concurrent call (auto-refine cycle N+1 starting before N done) |
| Reviewing the entire deck every refine cycle | Tokens per cycle = full deck × N cycles | Diff-only review after cycle 1 (Pitfall 2 prevention #6) | >5 slides × >2 cycles |
| Loading every skill description into context | Description budget exhausted, descriptions truncated | Trim each skill description to high-density 800–1024 chars, front-load keywords (Pitfall 8) | User has > 30 skills installed |
| Embedded image as Base64 string in pptxgenjs | Slide JSON balloons, slow generation | Use `path:` for local images (annotate.js does this); only Base64 if remote | Decks with > 10 images |
| Bundle annotate.js without tree-shake | Plugin install size grows | Ship only the verbatim file + minimal package.json; do not bundle/transpile | Plugin install > 50MB |

---

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Execute user-provided code via auto-refine generator | Arbitrary code execution if user provides crafted "deck spec" | Sanitize/validate the structured deck-spec input format; never `eval()` user content; pptxgenjs is the only thing rendering content |
| Open user-provided PPTX paths without validation | Path traversal — user passes `../../etc/passwd.pptx` to /annotate | Resolve to absolute path, confirm under user's project directory or explicit allowlist |
| Run `soffice` on attacker-crafted PPTX from URL | LibreOffice CVE history of malicious doc parsing (RCE) | Only operate on local files supplied by the user; if a URL is given, fetch into a sandboxed tmpdir, validate file type, scan with `file(1)` |
| Upload deck content to remote review service | PII / confidential leakage | All conversion/review happens locally — pptxgenjs and LibreOffice are local; do not call out |
| Plugin requests `Bash(*:*)` | Blanket Bash access — can do anything | Scope `Bash(soffice:*)`, `Bash(pdftoppm:*)`, `Bash(node:*)` (Pitfall 12) |
| Bundled `annotate.js` runs `eval()` on samples | Code injection if a malicious sample file is loaded | Verify annotate.js doesn't `eval`/`Function()` user input — it uses static `require()` only; keep it that way |
| Plugin install runs install hooks unprompted | Supply chain attack via marketplace | Don't ship `postinstall` scripts in the bundled package.json; document any first-run setup explicitly |
| Read user's `~/.claude/` for skill content | Privilege overreach | Only read plugin-internal paths via `${CLAUDE_PLUGIN_ROOT}` (also Pitfall 4) |

---

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Auto-refine takes 5 minutes with no progress feedback | User aborts, thinks plugin is broken | Stream cycle progress: "Cycle 2/5: applying 3 fixes..." (each cycle written as a streamed log line) |
| Reviewer's "issues" sound subjective | User loses trust in the auto-refine | Reviewer must categorize: `defect | improvement | style`. Generator only auto-fixes `defect`; surfaces `improvement`/`style` for user choice |
| Generator overwrites user-customized PPTX | Data loss | Always write to a NEW filename (timestamped or versioned); never overwrite the user's source |
| User runs /create then /annotate manually, mismatch | annotate's input format expects /review's output, not raw /create | Document the chained pipeline; provide `/instadecks:create --pipeline=full` that does create→review→annotate end-to-end |
| Long-running soffice with no log | User sees Claude "hung" for 60s | Echo "Converting deck to PDF (this takes 20–60s for 10 slides)..." before kicking off |
| First-run failures with no clear remediation | User uninstalls the plugin | Run a `/instadecks:doctor` check on first invocation: verifies soffice, pdftoppm, IBM Plex Sans, node version. Friendly "missing X — install with: ..." messages |
| Skill triggers on unrelated prompts | User frustrated at unsolicited deck-creation | Description not too pushy — calibrate keywords to deck-related vocabulary, not generic "build" / "create" |
| User can't tell which output file to use | Confused: which is the final deck — pptx or pdf? | README: "PPTX is editable; PDF is for sharing/projection. Both are produced; ignore the intermediate JPGs." |
| Annotation deck visually differs from create deck | User thinks one is "wrong" | Document explicitly: annotate produces an OVERLAY deck (shows critique on top of slide images), distinct from the source deck. Filename suffix `-annotated.pptx` |
| User on Windows | Plugin fails — soffice path different, font install path different | Document Windows support level explicitly; provide soffice path detection logic; or document "macOS/Linux primary, Windows untested" |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **annotate.js bundled:** Verify SHA matches v8 baseline. Verify import path is the only diff from v8 source. Verify `${CLAUDE_PLUGIN_ROOT}` resolves correctly.
- [ ] **Plugin manifest valid:** Run `tools/validate-manifest.js` on every push. Run install-from-marketplace test on a fresh devcontainer.
- [ ] **Skills activate:** Run a 10-prompt activation test, expect ≥ 8/10 trigger correctly.
- [ ] **PowerPoint compatibility:** Manually open every test deck in real Microsoft PowerPoint (Mac AND Windows if possible). Check for "needs repair" dialog.
- [ ] **LibreOffice headless conversion:** Verify per-call user profile isolation works (run two `/instadecks:create` simultaneously, confirm both succeed).
- [ ] **Visual regression baselines:** All three test fixtures (v8 sample, edge case, stress) produce JPGs that pixel-diff < 0.5% against committed reference.
- [ ] **Font detection:** Plugin's first-run check finds or installs IBM Plex Sans. Verify alignment is correct after install.
- [ ] **Auto-refine cycle cap:** Default cap of 5 enforced. Override flow works. Issue ledger persists across cycles. Convergence detection actually fires on a contrived oscillation.
- [ ] **License files:** LICENSE has Apache-2.0 + bundled-software section. NOTICE is minimal. `licenses/` dir has every bundled dep's full license text. `license-checker` reports zero GPL transitive deps.
- [ ] **No hardcoded paths:** `grep -r '/Users/\|~/.claude\|/home/\|C:\\\\' plugin-tree/` returns zero results outside comments.
- [ ] **Fresh install works:** Clean macOS account, install plugin via marketplace, run `/instadecks:create` — produces output without error.
- [ ] **Permissions tested:** Plugin tested in `default` AND `dontAsk` permission modes, not just `bypassPermissions`.
- [ ] **Tokens within budget:** A 10-slide deck with 3 refine cycles uses < 200K tokens (one Sonnet/Opus call's worth of context).
- [ ] **README onboarding:** A user who has never seen the plugin can run `/plugin install instadecks` then `/instadecks:create` and produce a deck without consulting other docs.
- [ ] **content-review skill ships in v1:** PROJECT.md lists this; both review skills must be present.
- [ ] **No reach-into v5-blue-prestige:** Plugin tree is fully self-contained. No `/Users/shafqat/Documents/Projects/Sourcevo` references anywhere.

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| annotate.js was modified (Pitfall 1) | LOW if caught before publish; HIGH after | `git checkout -- scripts/annotate.js`. If diff is needed (e.g., import path swap), revert to verbatim baseline and reapply the *minimal* import-path change only. Re-run visual regression. |
| Auto-refine oscillation in production (Pitfall 2) | MEDIUM | Hard-stop at next cycle. Log issue ledger. Surface to user with "I detected oscillation between cycles 3 and 5 — please pick the version you prefer or specify what to fix manually." |
| Manifest validation fails on publish (Pitfall 3) | LOW | Run validator locally, fix flagged fields, re-publish. If schema changes between Claude Code versions, version-gate the marketplace.json (newer schema for newer CC). |
| Hardcoded path slipped through (Pitfall 4) | LOW–MEDIUM | Find via grep, replace with `${CLAUDE_PLUGIN_ROOT}` or relative path. Patch release. |
| LibreOffice race in production (Pitfall 5) | MEDIUM | Add `-env:UserInstallation` if missing. Add file-stat checks. Hotfix release; instruct affected users to re-run with the new version. |
| Deck broken in PowerPoint (Pitfall 6) | MEDIUM–HIGH | Identify the OOXML violation (`unzip -p deck.pptx ppt/slides/slide1.xml`). Patch pptxgenjs usage to avoid the violating call. Hotfix release. Document in CHANGELOG. |
| Missing font breaking alignment (Pitfall 7) | MEDIUM | Bundle the font; add detection/install on first run. For affected users: `/instadecks:doctor` runs, prompts to install the font, regenerates the deck. |
| Skill not activating (Pitfall 8) | LOW | Sharpen description: more keywords, imperative voice, examples. Re-test 10-prompt activation. Patch release. |
| pptxgenjs minor bump broke output (Pitfall 9) | MEDIUM | Lock to last known good version, regenerate baselines, ship hotfix. Don't bump pptxgenjs again until visual regression passes. |
| Visual regression detected post-merge (Pitfall 10) | LOW–MEDIUM | Block release until regression resolved. Bisect to find the offending commit. If regression is intentional/approved, update baselines and document. |
| License non-compliance discovered (Pitfall 11) | HIGH | Take down published version. Add proper attribution. Re-publish. May require contacting bundled-dep authors if relicensing was unclear. |
| Permissions blocking real users (Pitfall 12) | LOW | Document in README. Pre-flight check at first run: prompt user to add the necessary permissions. Provide one-line setup. |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| 1: annotate.js modification | Phase 1 (Foundation) | SHA check in CI; lint exclusion; visual regression test |
| 2: Auto-refine runaway | Phase 4 (Pipeline) | Cycle cap test; oscillation detection unit test; token-budget integration test |
| 3: Manifest validation errors | Phase 1 + 5 (Foundation, Release) | `validate-manifest.js` in CI; fresh-install test on publish |
| 4: Hard-coded paths | Phase 1 (Foundation) | Lint check (`grep` for forbidden patterns) in CI |
| 5: soffice race conditions | Phase 3 (Review pipeline) | Concurrent invocation test (run 2+ in parallel, verify both succeed) |
| 6: pptxgenjs OOXML violations | Phase 2 (Create skill) | Manual PowerPoint open test as release gate; lint banning `addShape('oval'…)` etc. |
| 7: IBM Plex Sans missing | Phase 1 (Foundation) | Font-detection on first run; bundled fonts present |
| 8: Skill description weak | Phase 5 (Release) | 10-prompt activation test ≥ 80% match |
| 9: pptxgenjs version drift | Phase 1 (Foundation) | Exact version pinned; lockfile committed; CHANGELOG check on bump |
| 10: Visual regression untracked | Phase 1 + 4 (Foundation, Pipeline) | Baseline fixtures committed; pixel-diff test in CI; multiple fixtures (v8, edge, stress) |
| 11: License non-compliance | Phase 5 (Release) | LICENSE has Apache + bundled-software section; license-checker reports zero GPL deps; `licenses/` dir populated |
| 12: Tool permissions silent fail | Phase 5 (Release) | Test in `default` and `dontAsk` modes, not just bypass |

---

## Sources

- [Multiple errors in PowerPoint that were not in LibreOffice — Issue #1449](https://github.com/gitbrent/pptxgenjs/issues/1449)
- [Custom polygon generation — Issue #597](https://github.com/gitbrent/PptxGenJS/issues/597)
- [PPT broken in windows office — Issue #511](https://github.com/gitbrent/PptxGenJS/issues/511)
- [Rotate working incorrectly — Issue #370](https://github.com/gitbrent/PptxGenJS/issues/370)
- [Sizing options for images don't appear to be working — Issue #313](https://github.com/gitbrent/PptxGenJS/issues/313)
- [pptxgenjs CHANGELOG](https://github.com/gitbrent/PptxGenJS/blob/master/CHANGELOG.md)
- [pptxgenjs Shapes API](https://gitbrent.github.io/PptxGenJS/docs/api-shapes/)
- [pptxgenjs Masters and Placeholders](https://gitbrent.github.io/PptxGenJS/docs/masters.html)
- [Claude Code Plugins reference](https://code.claude.com/docs/en/plugins-reference)
- [Claude Code Skills authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)
- [Plugin paths hardcoded with absolute paths fail across environments — Issue #15717](https://github.com/anthropics/claude-code/issues/15717)
- [Plugin paths hardcoded to /root — Issue #20676](https://github.com/anthropics/claude-code/issues/20676)
- [Plugin marketplace paths hardcoded breaking devcontainer — Issue #10379](https://github.com/anthropics/claude-code/issues/10379)
- [Plugin manifest validation: Unrecognized keys 'category' and 'source' — Issue #30366](https://github.com/anthropics/claude-code/issues/30366)
- [Plugin marketplace validation errors — Issue #46786](https://github.com/anthropics/claude-code/issues/46786)
- [marketplace.json schema validation errors — Issue #1331](https://github.com/anthropics/claude-plugins-official/issues/1331)
- [marketplace.json schema validation errors — Issue #1244](https://github.com/anthropics/claude-plugins-official/issues/1244)
- [Skill allowed-tools doesn't grant Bash permission — Issue #14956](https://github.com/anthropics/claude-code/issues/14956)
- [allowedTools with bypassPermissions — Issue #12232](https://github.com/anthropics/claude-code/issues/12232)
- [Claude Code Permissions configuration](https://code.claude.com/docs/en/permissions)
- [How to Activate Claude Skills Automatically](https://dev.to/oluwawunmiadesewa/claude-code-skills-not-triggering-2-fixes-for-100-activation-3b57)
- [Claude Code Skills Don't Auto-Activate (workaround)](https://scottspence.com/posts/claude-code-skills-dont-auto-activate)
- [Stop Adding New Claude Skills — Fix the Broken Ones First](https://buildtolaunch.substack.com/p/claude-skills-not-working-fix)
- [How to Make Claude Code Skills Actually Activate (650 Trials)](https://medium.com/@ivan.seleznov1/why-claude-code-skills-dont-activate-and-how-to-fix-it-86f679409af1)
- [Claude Code Skill Hook: Guarantee 100% Loading](https://claudefa.st/blog/tools/hooks/skill-activation-hook)
- [Serving Concurrent Requests for LibreOffice Service](https://jdhao.github.io/2021/06/11/libreoffice_concurrent_requests/)
- [Multiple instances of soffice.bin at the same time — Ask LibreOffice](https://ask.libreoffice.org/t/multiple-instances-of-soffice-bin-at-the-same-time/95860)
- [Multiple user profiles for parallel processing — Ask LibreOffice](https://ask.libreoffice.org/t/multiple-user-profiles-for-parallel-processing-with-custom-configuration-changes-in-user-profiles/110834)
- [Headless Libre Office to PDF Conversion Issues — Ask LibreOffice](https://ask.libreoffice.org/t/headless-libre-office-to-pdf-conversion-issues/9945)
- [Error converting simple pptx file to pdf — Gotenberg Issue #465](https://github.com/gotenberg/gotenberg/issues/465)
- [pdftoppm does not return error code on failure — Poppler Issue #682](https://gitlab.freedesktop.org/poppler/poppler/-/issues/682)
- [Apache Software Foundation: Assembling LICENSE and NOTICE files](https://infra.apache.org/licensing-howto.html)
- [Apache Wombat — worked LICENSE/NOTICE example](https://github.com/justinmclean/ApacheWombat)
- [ASF 3rd Party License Policy](https://www.apache.org/legal/resolved.html)
- [IBM Plex Sans headings in Powerpoint 2016 collapse — Issue #259](https://github.com/IBM/plex/issues/259)
- [Fonts in existing files corrupted post upgrade to 16.28 Powerpoint on Mac — Issue #269](https://github.com/IBM/plex/issues/269)
- [Evaluator reflect-refine loop patterns — AWS Prescriptive Guidance](https://docs.aws.amazon.com/prescriptive-guidance/latest/agentic-ai-patterns/evaluator-reflect-refine-loop-patterns.html)
- [Self-Refine: Iterative Refinement with Self-Feedback](https://selfrefine.info/)
- [LLM Verification Loops: Best Practices and Patterns](https://timjwilliams.medium.com/llm-verification-loops-best-practices-and-patterns-07541c854fd8)
- [Effective context engineering for AI agents — Anthropic](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- [Visual Regression Testing with Playwright Snapshots](https://nareshit.com/blogs/visual-regression-testing-with-playwright-snapshots)
- [Direct experience: v8 BluePrestige iterations on `annotate.js` (`/Users/shafqat/Documents/Projects/Sourcevo/v5-blue-prestige/annotate.js`) — captured do-not-regress rules in Pitfall 1]

---
*Pitfalls research for: Claude Code plugin distributing pptxgenjs deck pipeline + verbatim annotate.js + LibreOffice headless review*
*Researched: 2026-04-27*
