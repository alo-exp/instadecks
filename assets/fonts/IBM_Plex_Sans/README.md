# IBM Plex Sans (bundled)

These font files are bundled with the Instadecks Claude Code plugin so the
`/instadecks:annotate` skill (which depends on `pptxgenjs` + IBM Plex Sans
glyph metrics) renders identically to the v8 BluePrestige reference deck on
every machine.

## Source

Upstream: [IBM/plex](https://github.com/IBM/plex) — official IBM repository.
Specifically the `@ibm/plex-sans@1.1.0` release
(`ibm-plex-sans.zip` → `fonts/complete/ttf/`). The `.ttf` files here are
**verbatim, unmodified, unsubsetted** copies from that release. Filenames are
preserved exactly as upstream.

## Bundled weights

| File                          | Weight       | Why bundled |
| ----------------------------- | ------------ | ----------- |
| `IBMPlexSans-Regular.ttf`     | Regular      | Default body text in annotation labels |
| `IBMPlexSans-Bold.ttf`        | Bold         | Required by `annotate.js` `charPts` table for severity badges |
| `IBMPlexSans-Italic.ttf`      | Italic       | Italic emphasis in finding rationale |
| `IBMPlexSans-BoldItalic.ttf`  | Bold Italic  | Bold-italic emphasis combos |

## License

SIL Open Font License, Version 1.1. The full license text is included
verbatim in [`OFL.txt`](./OFL.txt) in this directory and is also surfaced at
the project root under `licenses/IBM_Plex_Sans/LICENSE` (see Plan 08 / D-05).
The fonts retain the **Reserved Font Name "Plex"** — do not rename or modify
the font files when redistributing.

## Auto-install (macOS / Linux)

The plugin's SessionStart hook (`hooks/check-deps.sh`) runs on plugin load:

1. Detects existing install via `fc-list | grep -qi "IBM Plex Sans"`.
2. If missing, copies all `.ttf` files from this directory to:
   - **macOS:** `~/Library/Fonts/`
   - **Linux:** `~/.local/share/fonts/`
3. Runs `fc-cache -f` to refresh the font cache.

All steps are non-blocking — if anything fails (no `fc-cache`, write
permission denied, etc.), the hook surfaces a single `Instadecks:` warning
line and continues. The plugin still loads.

## Manual install (Windows or auto-install failure)

Auto-install is **not** attempted on Windows in v0.1.0. Install manually:

1. Open File Explorer to `${CLAUDE_PLUGIN_ROOT}/assets/fonts/IBM_Plex_Sans/`
   (or this folder in the cloned repo).
2. Select all four `.ttf` files.
3. Right-click → **Install for all users** (admin) or **Install** (current
   user only).
4. Restart Claude Code so the plugin re-checks fonts.

If you see `Instadecks: install IBM Plex Sans manually …` on macOS or Linux,
copy the four `.ttf` files to your user font directory by hand and run
`fc-cache -f`.
