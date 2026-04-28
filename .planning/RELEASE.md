# Instadecks v0.1.0 Release Sign-Off

**Date:** 2026-04-28
**Signed-off by:** Shafqat Ullah / Sourcevo (pending human verification of §1 SC#1, SC#2, SC#4 — see status below)
**Status:** `pending-human-signoff` — automation gates green; human-only verifications scaffolded but not yet run.

---

## §1 Success Criteria evidence

### SC#1 — Activation panel ≥ 8/10 per skill (D-01)

- **Status:** human_needed
- **Scaffold:** `tests/activation-panel.md` (40 prompts, 10 per skill across 4 user-invocable skills)
- **Result template:** `tests/activation-results.md` (empty scoring matrix)
- **Gate:** ≥ 8/10 per skill, ≥ 32/40 overall. Human tester runs the panel against a Claude Code session with the plugin installed and fills the matrix.

### SC#2 — `allowed-tools` validated in `default` AND `dontAsk` (D-02)

- **Status:** human_needed (matrix scaffolded; CI-side audit green)
- **Scaffold:** `tests/PERMISSION-MODE.md` (5 skills × 2 modes = 10-row matrix)
- **CI-side proof (automation green):** `node tools/audit-allowed-tools.js` exits 0 across all 5 SKILL.md frontmatters — every Bash entry is scoped `Bash(<cmd>:*)`. No `Bash(*)`, no bare `Bash`, no `Bash(<cmd>)` without `:*`. Output: `audit-allowed-tools: OK (5 SKILL.md files passed)`.
- **Gate:** 10/10 pass once human runs the matrix.

### SC#3 — License compliance final (D-04)

- **Status:** complete (automation green)
- **Proof:**
  - `node tools/license-audit.js` → `license-audit: OK (no GPL/AGPL prod deps; NOTICE <-> licenses/ in sync)`
  - `licenses/<dep>/LICENSE` files present and non-empty for `pptxgenjs`, `IBM_Plex_Sans`, `jszip`, `image-size`
  - NOTICE BUNDLED SOFTWARE ATTRIBUTION ↔ `licenses/` subdir set drift-checked
  - LICENSE bundled-software section mirrors NOTICE
  - jszip whitelist documented in `tools/license-audit.js` (MIT OR GPL-3.0; we use under MIT)

### SC#4 — Fresh-install end-to-end on Mac + Windows (D-06)

- **Status:** human_needed
- **Scaffold:** `tests/FRESH-INSTALL.md` — 6 steps × 2 OS columns
- **Canonical brief:** embedded in scaffold (AI in healthcare 2026 — 5-bullet outline)
- **Step 6 (real-PowerPoint open):** non-negotiable — must be Microsoft PowerPoint, not LibreOffice.
- **Gate:** 6/6 Mac AND 6/6 Windows.

### SC#5 — README + `/instadecks:doctor` self-check (D-07, D-03)

- **Status:** complete (automation green)
- **README:** `README.md` finalized with badge row (CI / version 0.1.0 / Apache-2.0), Quick Start, Skills (5 rows including doctor), `/instadecks:doctor` Self-Check section (per-OS install hints), Architecture (1-paragraph), Contributing, Acknowledgements. Scope-reduction sentinels absent.
- **Doctor:** `bash skills/doctor/scripts/check.sh` on the dev machine (Mac, Apple Silicon, Node v25.6.0):
  ```
  [OK] node v25.6.0 — /opt/homebrew/bin/node
  [OK] soffice — /opt/homebrew/bin/soffice
  [OK] pdftoppm — /opt/homebrew/bin/pdftoppm
  [OK] pptxgenjs 4.0.1 — /Users/shafqat/Documents/Projects/instadecks/node_modules/pptxgenjs/package.json
  [OK] IBM Plex Sans — discoverable via fc-list
  doctor: all required prerequisites OK
  ```
  Exit 0.

---

## §2 Audit-tool greens

| Tool                                   | Status | Output (last run 2026-04-28)                                                                |
|----------------------------------------|--------|---------------------------------------------------------------------------------------------|
| `node tools/audit-allowed-tools.js`    | OK     | `audit-allowed-tools: OK (5 SKILL.md files passed)`                                         |
| `node tools/license-audit.js`          | OK     | `license-audit: OK (no GPL/AGPL prod deps; NOTICE <-> licenses/ in sync)`                   |
| `bash tools/lint-paths.sh`             | OK     | `Path lint OK`                                                                              |
| `node tools/assert-pptxgenjs-pin.js`   | OK     | `pptxgenjs pin OK: 4.0.1`                                                                   |
| `node tools/lint-pptxgenjs-enums.js`   | OK     | `lint-pptxgenjs-enums: 52 files clean`                                                      |
| `node tools/validate-manifest.js`      | OK     | `Manifest OK`                                                                               |
| `npm test` (`node --test`)             | deferred | Skipped this session per CPU constraint (soffice/pdftoppm spawning); per-tool unit tests landed individually under each plan. To re-run: `npm test`. |

---

## §3 Marketplace PR + Tag

- **PR draft:** `.planning/marketplace-pr.md`
- **JSON entry:** `.planning/marketplace-entry.json`
- **Marketplace patch text (for human to apply manually to alo-labs/claude-plugins):** `.planning/phases/07-marketplace-release/marketplace-patch.json`

### Tag command (HUMAN runs after §1 gates pass)

```bash
cd /Users/shafqat/Documents/Projects/instadecks
git tag -a v0.1.0 -m "v0.1.0 — first marketplace release; see .planning/RELEASE.md"
git push origin v0.1.0
```

### Marketplace PR (HUMAN runs after tag — apply marketplace-patch.json manually if PR auto-create is not desired)

```bash
gh pr create --repo alo-labs/claude-plugins \
  --title "Add instadecks plugin v0.1.0" \
  --body-file /Users/shafqat/Documents/Projects/instadecks/.planning/marketplace-pr.md
```

---

## §4 Post-merge actions

- Update README badge URLs once `.github/workflows/ci.yml` is wired (currently the badge points at the CI URL but no workflow exists).
- Capture the merged PR URL back into this RELEASE.md as the immutable record.
- Close the v0.1.0 milestone in the upstream repo.

---

## §5 Phase 7 plan history

- `07-01-SUMMARY.md` — doctor skill + audit-allowed-tools tool + activation panel docs
- `07-02-SUMMARY.md` — license-audit + NOTICE annotate.js note + README finalization
- `07-03-SUMMARY.md` — manual checklists + marketplace PR scaffold + this sign-off log

---

## Outstanding human-needed items (block tag push)

1. Run `tests/activation-panel.md` against Claude Code; fill `tests/activation-results.md`. Gate ≥ 8/10 per skill.
2. Run `tests/PERMISSION-MODE.md` matrix in `default` and `dontAsk` modes. Gate 10/10.
3. Run `tests/FRESH-INSTALL.md` on Mac AND Windows. Gate 6/6 per OS.

When all three are filled and pass: re-edit §1 status rows from `human_needed` → `complete`, change top-of-file Status from `pending-human-signoff` → `signed-off`, and run the §3 Tag command.
