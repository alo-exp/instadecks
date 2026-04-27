# Instadecks — Claude Code Instructions

> **Always adhere strictly to this file and silver-bullet.md — they override all defaults.**

---

## Project Overview

- **Stack**: Node.js + pptxgenjs 4.0.1 (pinned exact). System-installed LibreOffice (`soffice`) and Poppler (`pdftoppm`). IBM Plex Sans bundled. Apache-2.0 license.
- **Git repo**: https://github.com/alo-exp/instadecks
- **What it is**: A Claude Code marketplace plugin shipping four namespaced slash skills — `/instadecks:create`, `/instadecks:review`, `/instadecks:content-review`, `/instadecks:annotate` — that productize the v8 BluePrestige deck-building workflow (refined design + content review + annotation overlay + auto-refine generation) into a public marketplace plugin under alo-labs.

---

## Project-Specific Rules

### Locked invariants (do not violate)

- **`annotate.js` is treated as a SHA-pinned binary asset.** The geometry, polygon math, charPts table, color/transparency, miter-join logic, layout constants, and `MAX_SIDE` overflow logic are VERBATIM from `/Users/shafqat/Documents/Projects/Sourcevo/v5-blue-prestige/annotate.js`. The ONLY permitted modification is the documented one-line require-path patch so pptxgenjs resolves out of `${CLAUDE_PLUGIN_DATA}/node_modules`. Any other edit fails CI.
- **pptxgenjs is pinned at exactly `4.0.1`** (no caret) in `package.json` and `package-lock.json` is committed. Bumping requires explicit visual-regression sign-off.
- **No reaches outside the plugin tree.** All paths via `${CLAUDE_PLUGIN_ROOT}` or `${CLAUDE_PLUGIN_DATA}`. Hardcoded `/Users/`, `~/.claude/`, `/home/`, `C:\\` etc. fail the lint gate.
- **Severity collapse 4→3 happens at the `/annotate` adapter only.** Reviewers (`/review`, `/content-review`) keep the full 4-tier (Critical / Major / Minor / Nitpick) taxonomy in their JSON output. The collapse to MAJOR / MINOR / POLISH applies only when building the SAMPLES array passed to `annotate.js`.
- **Auto-refine convergence rule (Phase 5):** `genuine_findings == 0 AND cycle ≥ 2`; cycle 1 with 0 findings forces one confirmation cycle; oscillation if cycle N's issue set ⊆ cycle N-2's; soft cap at cycle 5 surfaces user choice; user-interrupt via `.planning/instadecks/<run-id>/.interrupt` flag file.
- **Content-vs-design boundary is hard.** `/review` does not flag argument structure; `/content-review` does not flag visual / typographic / layout issues. Crossover is a defect.

### File layout (per ARCHITECTURE.md)

- `.claude-plugin/plugin.json` — manifest
- `hooks/hooks.json`, `hooks/check-deps.sh` — SessionStart non-blocking dep check + `npm ci --omit=dev` first-run install
- `skills/<name>/SKILL.md` — agent-facing playbooks (thin)
- `skills/<name>/scripts/` — skill-private Node code; only multi-skill helpers go to plugin-level `scripts/`
- `skills/annotate/scripts/annotate.js` — verbatim binary asset
- `skills/annotate/scripts/samples.js` — extracted SAMPLES data so geometry code stays unmodified
- `skills/review/references/findings-schema.md` — locked JSON contract
- `tests/fixtures/sample-findings.json`, `tests/fixtures/v8-reference/` — canonical fixture + visual regression baselines
- `tools/validate-manifest.js` — CI manifest schema validator
- `assets/fonts/IBM_Plex_Sans/` — bundled fonts under SIL OFL
- `LICENSE` (Apache-2.0 + bundled-software section), `NOTICE`, `licenses/<dep>/LICENSE` per bundled dep

### Don't get cute

- This project is a productization of existing, calibrated work. The v8 BluePrestige output is the spec — match it. "Improvements" to `annotate.js` geometry, colors, transparency, fonts, layout constants, or the SAMPLES contract are out of scope and will be reverted.
- Auto-refine "improvements" (clever convergence heuristics, alternate cap mechanisms, additional severity tiers) are also out of scope. The convergence rule above is locked.

### Reference docs

- `.planning/PROJECT.md` — project context, requirements active set, key decisions
- `.planning/REQUIREMENTS.md` — v1 requirements with phase traceability
- `.planning/ROADMAP.md` — 7-phase build plan
- `.planning/STATE.md` — current phase + progress
- `.planning/research/SUMMARY.md` — synthesized research findings (read this first when starting a new phase)
- `.planning/research/{STACK,FEATURES,ARCHITECTURE,PITFALLS}.md` — full research details

<!-- Silver Bullet enforcement lives in silver-bullet.md (do not duplicate here). -->
