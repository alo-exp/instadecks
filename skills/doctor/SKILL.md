---
name: doctor
description: Self-check Instadecks system prerequisites and report green/red status with per-gap install hints. This skill should be used when the user asks to "check Instadecks setup", "diagnose Instadecks", "is Instadecks ready", "Instadecks doctor", or "what's missing for Instadecks". Probes soffice (LibreOffice), pdftoppm (Poppler), node version, pinned pptxgenjs install under the plugin data dir, and IBM Plex Sans font presence. Emits a structured table of OK / MISSING rows with copy-pasteable install commands per OS (brew on Mac, apt on Linux, choco on Windows). Run after first install or whenever a deck-generation invocation fails with a missing-binary error.
allowed-tools:
  - Bash(node:*)
  - Bash(soffice:*)
  - Bash(pdftoppm:*)
  - Bash(fc-list:*)
  - Bash(which:*)
  - Bash(bash:*)
  - Read
user-invocable: true
version: 0.1.0
---

# /instadecks:doctor — System Prerequisite Self-Check

Self-check Instadecks system prerequisites and report green/red status with per-gap install hints. Useful after a fresh install, after a host OS upgrade, or whenever another skill (`/instadecks:create`, `/instadecks:review`, `/instadecks:annotate`) fails with a missing-binary error.

## When to invoke

Use this skill when the user asks:
- "Is Instadecks set up correctly?"
- "Check Instadecks setup / diagnose Instadecks / Instadecks doctor"
- "What's missing for Instadecks?"
- After `/plugin install instadecks` to confirm the host has the system binaries the npm tree cannot install (LibreOffice, Poppler).

## What it checks

| Probe | Expected | Why |
|---|---|---|
| `which node` + `node --version` | Node ≥ 18 | npm package + `runCreate` / `runReview` / `runAnnotate` execution. |
| `which soffice` | LibreOffice on PATH | PPTX → PDF conversion (D-08, RVW-09). |
| `which pdftoppm` | Poppler on PATH | PDF → PNG rasterization for the review pipeline. |
| `${CLAUDE_PLUGIN_DATA}/node_modules/pptxgenjs/package.json` | `"version": "4.0.1"` | Pinned exact per CLAUDE.md invariant. |
| `fc-list` for IBM Plex Sans | Font discoverable | Author-original deck typography (Phase 1 SC#4). Soft on missing fc-list (warn, not fail). |

## Output format

The script emits one row per probe to stdout:

- `[OK] node v20.10.0 — /opt/homebrew/bin/node`
- `[OK] soffice — /Applications/LibreOffice.app/Contents/MacOS/soffice`
- `[MISSING] pdftoppm — install: brew install poppler (Mac) | apt install poppler-utils (Linux) | choco install poppler (Windows)`

Exits 0 if every required probe is OK; 1 if any probe is MISSING. WARN rows (e.g. fc-list absent) do not flip the exit code.

## How to run

```bash
bash ${CLAUDE_PLUGIN_ROOT}/skills/doctor/scripts/check.sh
```

The skill body invokes the script directly via `Bash(bash:*)`. The user gets a copy-pasteable list of install commands for any MISSING row.

## Allowed tools

- `Bash(node:*)`, `Bash(soffice:*)`, `Bash(pdftoppm:*)`, `Bash(fc-list:*)`, `Bash(which:*)`, `Bash(bash:*)` — health probes.
- `Read` — surface `${CLAUDE_PLUGIN_DATA}/node_modules/pptxgenjs/package.json` to confirm the pinned version.

## Environment

- `CLAUDE_PLUGIN_DATA` — populated by SessionStart hook; pptxgenjs install lives under here.
- `CLAUDE_PLUGIN_ROOT` — script discovery anchor; falls back to repo root for local development.
