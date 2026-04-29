# Security

## Threat Model

Instadecks is a Claude Code marketplace plugin that runs entirely on the user's local machine. The trust boundary is the user's filesystem and the user's own Claude Code session — there is no Instadecks server, no telemetry, and no network calls during deck rendering. Subprocess scope is limited to `soffice` (LibreOffice headless), `pdftoppm` (Poppler), and Node executions of `pptxgenjs`. All file I/O is rooted at `${CLAUDE_PLUGIN_ROOT}` (read-only plugin code) and `${CLAUDE_PLUGIN_DATA}` (per-user data); the plugin does not reach into `~/.claude/`, `/Users/`, or any path outside its sandbox.

## Bundled-software CVE policy

Production dependencies are pinned (`pptxgenjs@4.0.1` exact, lockfile committed) and audited by `tools/license-audit.js` plus `npx license-checker --production --failOn 'GPL;AGPL;SSPL'` in CI Gate 4. Bundled binary assets (IBM Plex Sans under SIL OFL) are tracked in `NOTICE` and `licenses/`. CVE response: subscribe to upstream advisories for `pptxgenjs`, `jszip`, `image-size`; bump and re-baseline visual regression on any high/critical CVE. Dependabot may be enabled at the repo level for automated PRs.

## Reporting

Email: shafqat@sourcevo.com

Please report security issues privately rather than filing public GitHub issues. Include reproduction steps, affected version, and impact. We aim to acknowledge within 72 hours and triage within one week.

## Known limitations

- **No input sanitization beyond what pptxgenjs does.** User-provided text flows into PPTX XML via pptxgenjs's own escaping. Maliciously crafted input is the user's responsibility to vet — Instadecks does not pre-filter.
- **The LLM-driven extractor trusts file contents.** `/instadecks:create` reads input files (markdown, PDF text, transcripts) and passes them to the LLM verbatim. Prompt-injection embedded in input files is a known limitation; the user should review generated decks before sharing.
- **No sandbox for soffice or subprocess execution.** `soffice` and `pdftoppm` run with the user's full process privileges. Open-source CVEs in LibreOffice or Poppler apply directly; keep host packages patched.
