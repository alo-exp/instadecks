# Handoff: Instadecks v0.1.0 — Phase 1 Kickoff

**Session intent**: Pick up where the project-setup session left off. Project, requirements, roadmap, Silver Bullet enforcement, CI, docs, and v0.1.0 milestone are all in place and committed to `github.com/alo-exp/instadecks`. Your job is to drive Phase 1 (Plugin Foundation, Contract & CI Gates) through Silver Bullet's `full-dev-cycle` composable workflow.

You're already in `/Users/shafqat/Documents/Projects/instadecks/`.

---

## Read these first (no edits yet)

In this exact order — they build on each other:

1. `silver-bullet.md` — enforcement rules (overrides all defaults; you must follow this)
2. `CLAUDE.md` — project-specific rules and **locked invariants you cannot violate**
3. `.planning/PROJECT.md` — what we're building, current milestone v0.1.0
4. `.planning/REQUIREMENTS.md` — 67 v1 requirements with REQ-IDs and phase traceability
5. `.planning/ROADMAP.md` — 7-phase build plan; you are starting Phase 1
6. `.planning/STATE.md` — current position
7. `.planning/research/SUMMARY.md` — synthesized research findings (alignment decisions for severity collapse, annotate.js verbatim, auto-refine convergence)
8. `docs/workflows/full-dev-cycle.md` — the Silver Bullet workflow you'll execute against Phase 1

The four detailed research files (`STACK.md`, `FEATURES.md`, `ARCHITECTURE.md`, `PITFALLS.md`) are deeper references — read them on-demand when you hit a specific question.

---

## What's already done — DO NOT redo

- ✅ Git repo created and pushed (`github.com/alo-exp/instadecks`, public, Apache-2.0 in mind)
- ✅ Project setup via `/gsd-new-project`: PROJECT.md, config.json, REQUIREMENTS.md (67 reqs), ROADMAP.md (7 phases), STATE.md
- ✅ Research synthesized: STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md, SUMMARY.md
- ✅ Silver Bullet initialized: silver-bullet.md, .silver-bullet.json, CLAUDE.md, docs/ tree, hooks registered in `~/.claude/settings.json`, `.github/workflows/ci.yml` skeleton, permissions defaultMode=auto in `.claude/settings.local.json`
- ✅ Milestone v0.1.0 formalized in PROJECT.md and STATE.md
- ✅ All committed and pushed (8 commits on `main`)

**You don't need to run `/silver:init`, `/gsd-new-project`, or `/gsd-new-milestone` again.**

---

## Your job: drive Phase 1

**Phase 1: Plugin Foundation, Contract & CI Gates**

> A loadable, lint-clean Instadecks plugin skeleton with the JSON contract locked, CI gates failing loud on day-1 violations, fonts bundled, and visual-regression baselines committed — so every subsequent phase has a stable foundation to build on.

**Requirements**: FOUND-01 through FOUND-11 (see REQUIREMENTS.md for full list).

**Success criteria** (must all be TRUE before phase completion):
1. Plugin loads in Claude Code from a clean `git clone` with `/plugin install alo-exp/instadecks` succeeding on a fresh machine
2. CI fails loud on contract or path violations (manifest validator, hardcoded-path lint, pptxgenjs version-pin assertion, license-checker)
3. Locked findings schema (`skills/review/references/findings-schema.md` + `tests/fixtures/sample-findings.json`) maps 1:1 to `annotate.js`'s SAMPLES array shape
4. IBM Plex Sans bundled under `assets/fonts/` with SIL OFL license; `fc-list` detection + first-run install/register flow
5. Visual regression infrastructure live: `tests/fixtures/v8-reference/` with samples.js, expected `Annotations_Sample.pptx` SHA, per-slide JPGs at 150 DPI
6. Apache-2.0 LICENSE (full text + bundled-software section), NOTICE file, per-dep `licenses/` directory

---

## Recommended first commands (in order)

```
/gsd-discuss-phase 1
```

Run discussion first to surface any ambiguity before planning. The phase has 11 requirements and 6 success criteria — there's room for tactical decisions (e.g., how to structure the visual-regression baseline, exact wording of the manifest validator, how the SessionStart hook should report missing deps) that benefit from a discussion pass.

After discuss, run:

```
/gsd-plan-phase 1
```

This decomposes the phase into atomic plans. With granularity=fine and parallelization=true, expect the planner to produce 5-10 plans, several of which can run in parallel.

Then drive execution per `docs/workflows/full-dev-cycle.md`. The workflow's required skills are tracked in `.silver-bullet.json` under `skills.required_planning` and `skills.required_deploy` — Silver Bullet hooks will block commits if you skip mandatory steps.

---

## Locked invariants (do not violate, do not "improve")

These are also in CLAUDE.md but bear repeating. CI will fail loud on violations:

1. **`annotate.js` is a SHA-pinned binary asset.** It will be bundled in Phase 2 from `/Users/shafqat/Documents/Projects/Sourcevo/v5-blue-prestige/annotate.js`. Even in Phase 1, set up the integrity test infrastructure (`tests/annotate-integrity.test.js`) so Phase 2 can plug in. The ONLY permitted modification is the documented one-line require-path patch (resolve pptxgenjs out of `${CLAUDE_PLUGIN_DATA}/node_modules` instead of `../node_modules`).

2. **pptxgenjs pinned at exactly `4.0.1`** (no caret) in `package.json`. Commit `package-lock.json`. CI must assert this.

3. **No reaches outside the plugin tree.** All paths via `${CLAUDE_PLUGIN_ROOT}` or `${CLAUDE_PLUGIN_DATA}`. Hardcoded `/Users/`, `~/.claude/`, `/home/`, `C:\\` etc. fail the lint gate. The Phase 1 lint gate must be live before any other phase starts.

4. **Severity collapse 4→3 belongs at the `/annotate` adapter only** (Phase 2 work). Phase 1's `findings-schema.md` should capture the FULL 4-tier vocabulary (Critical/Major/Minor/Nitpick) with the documented mapping to annotate.js's 3-tier (MAJOR/MINOR/POLISH) noted as a downstream concern.

5. **Auto-refine convergence rule** (Phase 5 work, but Phase 1's schema needs to support it): findings JSON must include `genuine` flag, `category` (defect/improvement/style), `nx`/`ny` positioning, and `rationale`. Phase 1 locks the schema; Phase 5 implements the loop.

6. **Content-vs-design boundary is hard.** The schema must permit both `/review` (design) and `/content-review` (content) findings to use the same JSON shape, but consuming agents (annotate adapter, future content-aware tools) must respect domain boundaries.

7. **Repo is at `alo-exp/instadecks`; marketplace listing belongs under `alo-labs/claude-plugins`.** Phase 7 wires the marketplace listing — don't worry about that now, just don't hardcode either org name in scripts.

---

## Open known-unknowns to resolve in Phase 1

These are flagged in research SUMMARY.md "Gaps to Address" — they're tractable in Phase 1:

- **Exact pptxgenjs version v8 was calibrated against.** Action: `git log -p /Users/shafqat/Documents/Projects/Sourcevo/v5-blue-prestige/package.json` if it exists, OR run a quick visual-regression test of 4.0.1 against existing v8 reference outputs. If clean diff, lock 4.0.1. If not, find the specific version.
- **`annotate.js` license posture for Apache-2.0 redistribution.** The user IS the author (you can confirm in PROJECT.md "Origin work" section). Phase 1's NOTICE file should document: "annotate.js originally developed for internal Sourcevo use; relicensed under Apache-2.0 by the author for inclusion in this plugin."
- **Schema migration policy for v2.** Document the policy (e.g., `/annotate` accepts schema_version 1.0; on 2.0+, runs an upgrade adapter), but don't implement migration code in v0.1.0.

---

## Tech stack reminders

- Node.js ≥ 18 (≥ 20 recommended)
- pptxgenjs `4.0.1` exact pin
- LibreOffice (`soffice`) and Poppler (`pdftoppm`) — system-installed; never bundled
- IBM Plex Sans — bundled under `assets/fonts/`, SIL OFL
- `node --test` for unit tests
- Apache-2.0 with bundled-software section

---

## When you're done with Phase 1

Phase 1 ends when all 6 success criteria are TRUE and CI passes on a clean clone. Then run `/gsd-transition` to mark Phase 1 complete and move to Phase 2 (`/instadecks:annotate`).

Don't combine phases. Don't skip the verifier (`workflow.verifier=true` in config.json). Silver Bullet's `gsd-verify-work` skill is required before the phase can transition.

---

## If you get stuck

- Re-read `silver-bullet.md` (it has anti-skip rules and the workflow gate descriptions)
- Re-read `.planning/research/SUMMARY.md` "Critical Alignment Decisions" (the 5 reconciled cross-cutting decisions)
- Check `.planning/research/PITFALLS.md` for the specific pitfall that matches your symptom
- The previous session's commit history (`git log --oneline`) is dense and atomic — diff any individual commit to see exactly what was set up

Good luck. Build something that ships.
