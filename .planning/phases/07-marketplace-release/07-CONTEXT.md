---
phase: 07
slug: marketplace-release
status: draft
created: 2026-04-28
inherits_from: [01-CONTEXT.md, 02-CONTEXT.md, 03-CONTEXT.md, 04-CONTEXT.md, 05-CONTEXT.md, 06-CONTEXT.md]
---

# Phase 07 — Marketplace Publication & Release Polish — CONTEXT.md

> Final phase. Decisions inherited from prior phases not restated.

---

## Goal Recap (from ROADMAP)

Public release of Instadecks v0.1.0: 4 user-invocable skills (create, review, content-review, annotate) pass 10-prompt activation panel ≥8/10, scoped `allowed-tools` validated in default + dontAsk modes, license compliance final pass, marketplace PR to `alo-labs/claude-plugins`, README finalized with `/instadecks:doctor`, fresh-machine install validation. Requirements DIST-01..DIST-08.

---

## Phase 7 Gray-Area Decisions

### D-01 — Activation Panel (10 prompts)

**Decision:** Hand-author 10 representative natural-language prompts per skill (40 total) in `tests/activation-panel.md`. Manual run: simulate /plugin activation against each prompt and score 1 (activates correct skill) / 0 (wrong or none). ≥8/10 per skill is the gate. Records pass/fail in `tests/activation-results.md` (CI gate; updates per release).

**Rationale:** Activation matching is opaque; only empirical measurement validates description quality. Manual-only is acceptable — the panel is small.

---

### D-02 — Permission Mode Validation

**Decision:** Add `tests/PERMISSION-MODE.md` checklist requiring manual verification in `default` and `dontAsk` permission modes (NOT `bypassPermissions`). Each skill is invoked once per mode; the tester confirms tool calls are pre-approved or prompt cleanly. Result recorded in `.planning/RELEASE.md`.

**Rationale:** `allowed-tools` scoping is a marketplace-readiness gate; can only be validated empirically; manual is acceptable for v0.1.0.

---

### D-03 — `/instadecks:doctor` Skill

**Decision:** New 5th skill (model-only / non-user-invocable, but allows `/instadecks:doctor` direct invocation): runs `which soffice pdftoppm node`, checks pptxgenjs install in `${CLAUDE_PLUGIN_DATA}/node_modules`, validates IBM Plex Sans presence, reports green/red status with install instructions per gap.

**Implementation:** `skills/doctor/SKILL.md` + `skills/doctor/scripts/check.sh`. Frontmatter `user-invocable: true` (it's the user-callable self-test).

**Rationale:** ROADMAP SC#5 explicitly names doctor. Adds confidence to fresh-machine installs.

---

### D-04 — License Compliance Final Pass

**Decision:** Run `license-checker` (devDep, transient) over `node_modules`; assert zero GPL/AGPL transitive deps; verify `licenses/` directory contains LICENSE for every bundled dep (pptxgenjs, jszip, IBM Plex Sans/SIL OFL); NOTICE complete with annotate.js attribution + DECK-VDA attribution + design-ideas inspired-by paragraph; LICENSE has bundled-software section.

---

### D-05 — Marketplace PR Format

**Decision:** PR to `alo-labs/claude-plugins` adding entry:

```json
{
  "name": "instadecks",
  "source": { "source": "github", "repo": "alo-exp/instadecks" },
  "category": "productivity",
  "version": "0.1.0",
  "description": "Generate, review, and annotate polished presentation decks. Four slash skills powered by pptxgenjs + DECK-VDA design review + auto-refine convergence loop."
}
```

Tag v0.1.0 in `alo-exp/instadecks` first; PR references the tag.

---

### D-06 — Fresh-Machine Install Validation

**Decision:** Manual checklist `tests/FRESH-INSTALL.md` covering:
1. `/plugin install alo-exp/instadecks`
2. `/instadecks:doctor` reports green
3. `/instadecks:create` produces valid deck from a canonical brief
4. `/instadecks:review` produces findings JSON
5. `/instadecks:annotate` produces overlay
6. Real PowerPoint open of all generated decks (Mac + Windows)

Recorded in `.planning/RELEASE.md` before tag push.

---

### D-07 — README Finalization

**Decision:** Sections required: Install / Quick Start / 4 Skills / `/instadecks:doctor` self-check / Architecture (1-paragraph) / License / Contributing / Acknowledgements. Embed `/instadecks:create`-output sample deck thumbnail. Badge row: build status, version, license.

---

### D-08 — Permission-Mode `allowed-tools` Audit

**Decision:** Sweep all 5 SKILL.md frontmatter `allowed-tools` lists and ensure each is minimal (no `Bash(*)`). Add `tools/audit-allowed-tools.js` CI check that lints each SKILL.md.

---

## Code Context

- `skills/doctor/` — NEW skill (D-03)
- `tests/`: `activation-panel.md`, `PERMISSION-MODE.md`, `FRESH-INSTALL.md`
- `tools/audit-allowed-tools.js` — CI gate (D-08)
- `README.md` finalized (D-07)
- `LICENSE`, `NOTICE`, `licenses/` — final pass (D-04)
- `.planning/RELEASE.md` — v0.1.0 sign-off log
- `package.json` version bump to `0.1.0`

---

## Out of Scope (deferred)

- Windows fresh-install automation (manual checklist only for v0.1.0)
- Activation telemetry / per-skill metrics (v1.x)
- Marketplace category re-classification

---

## Wave Decomposition (preview)

- Wave 1: 07-01 doctor skill + audit-allowed-tools tool + activation panel docs
- Wave 2: 07-02 license-compliance + README + NOTICE finalization
- Wave 3: 07-03 marketplace PR prep + tag + RELEASE.md sign-off

---

**Approved:** 2026-04-28 (autonomous mode per user directive)
