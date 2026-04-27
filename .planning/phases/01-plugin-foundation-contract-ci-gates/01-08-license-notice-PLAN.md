---
phase: 01-plugin-foundation-contract-ci-gates
plan: 08
type: execute
wave: 3
depends_on: [01, 07]
files_modified:
  - LICENSE
  - NOTICE
  - licenses/pptxgenjs/LICENSE
  - licenses/IBM_Plex_Sans/LICENSE
  - licenses/jszip/LICENSE
  - licenses/image-size/LICENSE
autonomous: true
requirements: [FOUND-11]
must_haves:
  truths:
    - "LICENSE at root contains full Apache-2.0 text + bundled-software section listing pptxgenjs, IBM Plex Sans, jszip, image-size"
    - "NOTICE at root contains the relicensing note for annotate.js verbatim from D-05"
    - "Per-bundled-dep licenses/<dep>/LICENSE present (lowercase-with-underscores naming)"
    - "license-checker --production --failOn 'GPL;AGPL;SSPL' returns non-zero exit code on no offending deps (i.e., passes); requires `npm ci` to have populated root node_modules first"
  artifacts:
    - path: "LICENSE"
      provides: "Apache-2.0 + bundled-software section"
      contains: "Apache License"
    - path: "NOTICE"
      provides: "Relicensing note + per-dep credits"
      contains: "annotate.js originally developed for internal Sourcevo use"
    - path: "licenses/pptxgenjs/LICENSE"
      provides: "MIT license verbatim from pptxgenjs upstream"
    - path: "licenses/IBM_Plex_Sans/LICENSE"
      provides: "SIL OFL 1.1 verbatim"
  key_links:
    - from: "LICENSE"
      to: "licenses/<dep>/LICENSE"
      via: "Bundled-software section enumerates each subdir"
      pattern: "Bundled software"
---

<objective>
Land Apache-2.0 LICENSE (full text + bundled-software section), NOTICE (with relicensing note), and per-bundled-dep `licenses/<dep>/LICENSE` directories. Verify license-checker passes on the production dep tree.

Purpose: FOUND-11 + D-05 — Apache-2.0 §4(d) compliance for the public marketplace plugin. Depends on Plan 01 (deps installed via root `npm ci`) and Plan 07 (OFL.txt available to copy).
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/01-plugin-foundation-contract-ci-gates/01-CONTEXT.md
@.planning/phases/01-plugin-foundation-contract-ci-gates/01-RESEARCH.md
@.planning/phases/01-plugin-foundation-contract-ci-gates/01-PATTERNS.md
@.planning/phases/01-plugin-foundation-contract-ci-gates/01-01-SUMMARY.md
@.planning/phases/01-plugin-foundation-contract-ci-gates/01-07-SUMMARY.md
@CLAUDE.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Write LICENSE + NOTICE</name>
  <files>LICENSE, NOTICE</files>
  <action>
    Per D-05, FOUND-11, RESEARCH.md Pitfall 7, PATTERNS.md rows:

    `LICENSE`:
    1. Full Apache-2.0 text verbatim from https://www.apache.org/licenses/LICENSE-2.0.txt (download with curl/WebFetch).
    2. Append a "Bundled software" section after the standard text:
       ```
       --------------------------------------------------------------------
       BUNDLED SOFTWARE

       This product includes software developed by third parties under their
       respective licenses. License texts for each are provided in the
       licenses/ directory at the project root.

       - pptxgenjs (MIT) — https://github.com/gitbrent/PptxGenJS
       - IBM Plex Sans (SIL OFL 1.1) — https://github.com/IBM/plex
       - jszip (MIT or GPL-3.0; used under MIT) — transitive of pptxgenjs
       - image-size (MIT) — transitive of pptxgenjs
       ```

    `NOTICE` — plain text, includes:
    1. One-line copyright header: `Instadecks` + author + year.
    2. Verbatim relicensing note from D-05: `annotate.js originally developed for internal Sourcevo use; relicensed under Apache-2.0 by the author for inclusion in this plugin.`
    3. Per-bundled-dep credit list mirroring LICENSE's bundled-software section.

    Both files: UTF-8, LF line endings, trailing newline.
  </action>
  <verify>
    <automated>test -f LICENSE && grep -q "Apache License" LICENSE && grep -q "BUNDLED SOFTWARE" LICENSE && test -f NOTICE && grep -q "annotate.js originally developed for internal Sourcevo use" NOTICE</automated>
  </verify>
  <done>LICENSE has Apache-2.0 + bundled section; NOTICE has relicensing note verbatim.</done>
</task>

<task type="auto">
  <name>Task 2: Populate licenses/<dep>/LICENSE + verify license-checker</name>
  <files>licenses/pptxgenjs/LICENSE, licenses/IBM_Plex_Sans/LICENSE, licenses/jszip/LICENSE, licenses/image-size/LICENSE</files>
  <action>
    Per D-05 and PATTERNS.md "licenses/<dep>/LICENSE" row (lowercase-with-underscores naming):

    **(PC-11) Prerequisite: populate root node_modules first.** Plan 02's SessionStart hook installs into `${CLAUDE_PLUGIN_DATA}/node_modules` and does NOT pollute the repo's root `node_modules/`. license-checker reads from root `node_modules/`, so this task MUST run a full `npm ci` (no `--omit=dev`) at the repo root before invoking license-checker. Document in the task: "license-checker requires root-level node_modules populated by `npm ci`. Plan 02's hook install targets ${CLAUDE_PLUGIN_DATA} and does NOT pollute root node_modules — root install must be performed explicitly here."

    Steps:
    1. **Run `npm ci`** at repo root (full install including devDependencies — license-checker is itself a devDep declared in Plan 01). On clean clones, devDeps include license-checker, pixelmatch, pngjs.
    2. **pptxgenjs**: copy `node_modules/pptxgenjs/LICENSE` (or `LICENSE.md` if that's the upstream filename) to `licenses/pptxgenjs/LICENSE` verbatim.
    3. **IBM_Plex_Sans**: copy `assets/fonts/IBM_Plex_Sans/OFL.txt` to `licenses/IBM_Plex_Sans/LICENSE` verbatim. (Note: directory name uses underscore-with-capital style matching the asset dir; per PATTERNS.md "lowercase-with-underscores naming" — confirming `IBM_Plex_Sans` matches the asset dir is the canonical form.)
    4. **jszip**: copy `node_modules/jszip/LICENSE.markdown` (or upstream filename) verbatim. Document in NOTICE that we use it under MIT (the dual-licensed MIT or GPL-3.0).
    5. **image-size**: copy `node_modules/image-size/LICENSE` verbatim.

    Then run license-checker locally (devDep installed by step 1) to verify the dep tree is clean:

    ```bash
    npx license-checker --production --failOn 'GPL;AGPL;SSPL' --summary
    ```

    Expected: exit 0. If `jszip` triggers a false-positive on `GPL` substring (per RESEARCH.md Pitfall 2), document the false-positive in SUMMARY and add `--exclude` flag for jszip's specific SPDX expression to the eventual CI invocation in Plan 09. **Do NOT** add a blanket `--exclude` for `GPL` — only for the specific dual-licensed package.
  </action>
  <verify>
    <automated>npm ci && test -f licenses/pptxgenjs/LICENSE && test -f licenses/IBM_Plex_Sans/LICENSE && test -f licenses/jszip/LICENSE && test -f licenses/image-size/LICENSE && npx license-checker --production --failOn 'GPL;AGPL;SSPL' --summary</automated>
  </verify>
  <done>Root npm ci runs; 4 per-dep LICENSE files present; license-checker exits 0 (or documented exclusion if jszip false-positive triggers).</done>
</task>

</tasks>

<threat_model>
| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-08-01 | Repudiation | Future bundled dep introduced without attribution | mitigate | CI license-checker (Plan 09) catches new GPL/AGPL/SSPL deps; bundled-software section is updated as part of dep additions in future phases |
| T-08-02 | Information Disclosure | Author email in NOTICE | accept | Public Apache-2.0 plugin on public GitHub; intentional |
</threat_model>

<verification>
- `npm ci` populates root node_modules
- LICENSE has Apache-2.0 + bundled-software section
- NOTICE has D-05 relicensing note verbatim
- 4 per-dep LICENSE files present
- license-checker passes
</verification>

<success_criteria>
- FOUND-11: Apache-2.0 LICENSE + NOTICE + per-dep licenses/ + license-checker green
- D-05 honored verbatim
- Root node_modules populated explicitly (Plan 02's hook install does NOT cover this — it targets ${CLAUDE_PLUGIN_DATA})
</success_criteria>

<output>
After completion, create `.planning/phases/01-plugin-foundation-contract-ci-gates/01-08-SUMMARY.md`. If license-checker false-positive on jszip required `--exclude`, document the exact flag for Plan 09's CI workflow.
</output>
