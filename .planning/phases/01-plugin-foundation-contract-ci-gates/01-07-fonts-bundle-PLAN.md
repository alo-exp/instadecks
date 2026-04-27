---
phase: 01-plugin-foundation-contract-ci-gates
plan: 07
type: execute
wave: 3
depends_on: [02]
files_modified:
  - assets/fonts/IBM_Plex_Sans/IBMPlexSans-Regular.ttf
  - assets/fonts/IBM_Plex_Sans/IBMPlexSans-Bold.ttf
  - assets/fonts/IBM_Plex_Sans/IBMPlexSans-Italic.ttf
  - assets/fonts/IBM_Plex_Sans/IBMPlexSans-BoldItalic.ttf
  - assets/fonts/IBM_Plex_Sans/OFL.txt
  - assets/fonts/IBM_Plex_Sans/README.md
  - hooks/check-deps.sh
autonomous: true
requirements: [FOUND-10]
must_haves:
  truths:
    - "IBM Plex Sans font weights bundled under assets/fonts/IBM_Plex_Sans/ (verbatim upstream filenames)"
    - "OFL.txt bundled verbatim from upstream IBM/plex repo"
    - "hooks/check-deps.sh font section: on macOS copies to ~/Library/Fonts; on Linux to ~/.local/share/fonts; on Windows prints manual-install warning; runs fc-cache -f; non-blocking on failure"
    - "Detection: `fc-list | grep -qi 'IBM Plex Sans'` short-circuits if already installed"
  artifacts:
    - path: "assets/fonts/IBM_Plex_Sans/IBMPlexSans-Regular.ttf"
      provides: "Regular weight"
    - path: "assets/fonts/IBM_Plex_Sans/IBMPlexSans-Bold.ttf"
      provides: "Bold weight (charPts table needs this)"
    - path: "assets/fonts/IBM_Plex_Sans/OFL.txt"
      provides: "SIL OFL 1.1 license verbatim"
    - path: "assets/fonts/IBM_Plex_Sans/README.md"
      provides: "Manual-install instructions for Windows users"
    - path: "hooks/check-deps.sh"
      provides: "Replaced font stub with full detect+install logic per D-01"
  key_links:
    - from: "hooks/check-deps.sh"
      to: "assets/fonts/IBM_Plex_Sans/*.ttf"
      via: "cp + fc-cache -f"
      pattern: "IBM Plex Sans"
---

<objective>
Bundle IBM Plex Sans font weights (Regular, Bold, Italic, BoldItalic at minimum — match annotate.js charPts requirements), commit OFL.txt verbatim, write README.md with Windows manual-install instructions, and replace the font stub in `hooks/check-deps.sh` (Plan 02) with the full detect+install flow per D-01.

Purpose: FOUND-10 — fonts bundled with auto-install on macOS/Linux + manual-install warning on Windows; non-blocking per D-01.
Depends on Plan 02 (hooks/check-deps.sh exists with font stub to replace).
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/01-plugin-foundation-contract-ci-gates/01-CONTEXT.md
@.planning/phases/01-plugin-foundation-contract-ci-gates/01-RESEARCH.md
@.planning/phases/01-plugin-foundation-contract-ci-gates/01-PATTERNS.md
@.planning/phases/01-plugin-foundation-contract-ci-gates/01-02-SUMMARY.md
@hooks/check-deps.sh
</context>

<tasks>

<task type="auto">
  <name>Task 1: Bundle IBM Plex Sans + OFL.txt + README.md</name>
  <files>assets/fonts/IBM_Plex_Sans/IBMPlexSans-Regular.ttf, assets/fonts/IBM_Plex_Sans/IBMPlexSans-Bold.ttf, assets/fonts/IBM_Plex_Sans/IBMPlexSans-Italic.ttf, assets/fonts/IBM_Plex_Sans/IBMPlexSans-BoldItalic.ttf, assets/fonts/IBM_Plex_Sans/OFL.txt, assets/fonts/IBM_Plex_Sans/README.md</files>
  <action>
    Per D-01, FOUND-10, PATTERNS.md "assets/fonts/IBM_Plex_Sans/**" row:

    Source: upstream IBM/plex repo (https://github.com/IBM/plex). The user's local machine already has IBM Plex Sans 18 weights installed per RESEARCH.md Environment Availability. Source candidates (in order):
    1. Local font cache: `fc-list : file family | grep -i "IBM Plex Sans"` to locate installed TTF files; copy from there.
    2. Upstream release: download latest IBM/plex release zip if local copy not findable.

    Bundle at minimum: `IBMPlexSans-Regular.ttf`, `IBMPlexSans-Bold.ttf`, `IBMPlexSans-Italic.ttf`, `IBMPlexSans-BoldItalic.ttf`. Preserve upstream filenames verbatim. Do NOT modify or subset fonts.

    Bundle `OFL.txt` from upstream IBM/plex `LICENSE.txt` (or `OFL.txt` if present) verbatim. (Plan 08 also copies this to `licenses/IBM_Plex_Sans/LICENSE` per D-05.)

    Write `assets/fonts/IBM_Plex_Sans/README.md` covering: where the fonts came from (IBM/plex upstream), license (SIL OFL 1.1 — see OFL.txt), Windows manual-install instructions (right-click each .ttf → Install for all users), and a note that on macOS/Linux the SessionStart hook auto-installs to user font dir.
  </action>
  <verify>
    <automated>test -f assets/fonts/IBM_Plex_Sans/IBMPlexSans-Regular.ttf && test -f assets/fonts/IBM_Plex_Sans/IBMPlexSans-Bold.ttf && test -f assets/fonts/IBM_Plex_Sans/IBMPlexSans-Italic.ttf && test -f assets/fonts/IBM_Plex_Sans/IBMPlexSans-BoldItalic.ttf && test -f assets/fonts/IBM_Plex_Sans/OFL.txt && test -f assets/fonts/IBM_Plex_Sans/README.md && grep -qi "Open Font License" assets/fonts/IBM_Plex_Sans/OFL.txt</automated>
  </verify>
  <done>4 TTF files + OFL.txt + README.md committed; OFL.txt contains the SIL Open Font License text.</done>
</task>

<task type="auto">
  <name>Task 2: Replace font stub in hooks/check-deps.sh with full D-01 logic</name>
  <files>hooks/check-deps.sh</files>
  <action>
    Per D-01 and RESEARCH.md Pattern 2 step 4 (font detection):

    Edit `hooks/check-deps.sh` to replace the font-detection stub from Plan 02 with full logic:

    ```bash
    # ── Font detection + install (D-01) ─────────────────────────────────
    case "$(uname -s)" in
      Darwin)  FONT_DIR="$HOME/Library/Fonts" ;;
      Linux)   FONT_DIR="$HOME/.local/share/fonts" ;;
      MINGW*|CYGWIN*|MSYS*) FONT_DIR="" ;;
      *) FONT_DIR="" ;;
    esac
    if command -v fc-list >/dev/null 2>&1; then
      if ! fc-list | grep -qi "IBM Plex Sans"; then
        if [ -n "$FONT_DIR" ]; then
          mkdir -p "$FONT_DIR" 2>/dev/null \
            && cp "$PLUGIN_ROOT/assets/fonts/IBM_Plex_Sans/"*.ttf "$FONT_DIR/" 2>/dev/null \
            && fc-cache -f >/dev/null 2>&1 \
            && INFO+=("fonts installed") \
            || WARN+=("font install failed; see assets/fonts/IBM_Plex_Sans/README.md")
        else
          WARN+=("install IBM Plex Sans manually: see \${CLAUDE_PLUGIN_ROOT}/assets/fonts/IBM_Plex_Sans/README.md")
        fi
      fi
    fi
    ```

    Preserve `trap 'exit 0' ERR` discipline — every failure here MUST be non-blocking. Do not introduce `set -e`.

    Re-run integration test from Plan 02 (`tests/check-deps.test.js`) — should still pass on a system that already has IBM Plex Sans (early-exit path) and on systems without it (install path). Add a fifth subtest to that file (or in this task as a new test) that mocks an empty `fc-list` and confirms the install branch fires; if mocking is impractical, document the limitation in the SUMMARY and rely on the macOS/Linux paths being exercised manually before phase verification.
  </action>
  <verify>
    <automated>node --test tests/check-deps.test.js && grep -q 'IBM Plex Sans' hooks/check-deps.sh && grep -q 'fc-cache' hooks/check-deps.sh</automated>
  </verify>
  <done>check-deps.sh contains the full D-01 font flow; existing tests still green; hook still always exits 0.</done>
</task>

</tasks>

<threat_model>
| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-07-01 | Tampering | Font files modified mid-session | mitigate | Bundled fonts are read-only `${CLAUDE_PLUGIN_ROOT}/assets/fonts/` — install copies to user dir but source is git-tracked |
| T-07-02 | Elevation of Privilege | Font install writes to user dir | accept | Writes only to `~/Library/Fonts` or `~/.local/share/fonts` (user-owned); failures are non-blocking and surfaced as warnings |
| T-07-03 | Denial of Service | fc-cache hangs SessionStart | mitigate | hooks.json `timeout: 30` cap; redirects to /dev/null; `||` defensive chain ensures fall-through |
</threat_model>

<verification>
- 4 TTF + OFL.txt + README.md committed under `assets/fonts/IBM_Plex_Sans/`
- check-deps.sh font branch exists and references `IBM Plex Sans` + `fc-cache`
- Plan 02 tests still green (hook still exits 0 always)
</verification>

<success_criteria>
- FOUND-10: fonts bundled with SIL OFL; SessionStart auto-detects + installs on macOS/Linux; manual-install path on Windows
- D-01: failure paths non-blocking
</success_criteria>

<output>
After completion, create `.planning/phases/01-plugin-foundation-contract-ci-gates/01-07-SUMMARY.md`
</output>
