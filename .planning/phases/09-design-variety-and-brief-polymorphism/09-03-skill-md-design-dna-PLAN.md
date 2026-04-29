---
plan: 09-03
phase: 09
slug: skill-md-design-dna
status: ready
created: 2026-04-28
wave: 2
depends_on: [09-01, 09-02]
autonomous: true
files_modified:
  - skills/create/SKILL.md
  - skills/create/references/cookbook.md
  - tests/cookbook-design-diversity.test.js
requirements: [DV-05]

must_haves:
  truths:
    - "skills/create/SKILL.md contains a NEW sub-step titled `## Choose design DNA` (or `### Choose design DNA`) inserted BEFORE the agent authors render-deck.cjs. The sub-step has the 3 mandatory directives from D-05: (a) hash-seed picker over palettes.md/typography.md/motifs.md keyed on `audience+tone`; (b) diversity audit of the last 3 prior runs in `.planning/instadecks/<run-id>/design-rationale.md`; (c) explicit prohibition: NEVER default to verdant-steel + Plex Serif + underline-accent."
    - "The picker instruction names ALL 3 reference files explicitly: `references/palettes.md`, `references/typography.md`, `references/motifs.md` — and instructs the agent to copy hex/font/motif values from those files (not invent new ones)."
    - "The diversity audit instruction tells the agent to read `.planning/instadecks/<run-id>/design-rationale.md` for the 3 most-recent runs (sorted by run-id, descending) and DO NOT pick the same palette/typography/motif combination as any of the 3."
    - "skills/create/references/cookbook.md gains a TOP-LEVEL `## Variant IDs` section listing the variant ID convention `{recipe}-[A-E]-{shorthand}`, plus links/refs to palettes.md, typography.md, motifs.md."
    - "tests/cookbook-design-diversity.test.js asserts that SKILL.md contains the 3 mandatory directive markers (hash-seed picker, diversity audit, defaults prohibition) AND that cookbook.md links to the 3 reference libraries."
    - "No behavior change in scripts/index.js or cli.js this plan — SKILL.md is the agent surface; deterministic plumbing remains untouched."
  artifacts:
    - path: "skills/create/SKILL.md"
      provides: "Design DNA picker sub-step + diversity audit + defaults prohibition"
      contains: "Choose design DNA"
    - path: "skills/create/references/cookbook.md"
      provides: "Top-level Variant IDs index + links to 3 reference libraries"
      contains: "palettes.md"
    - path: "tests/cookbook-design-diversity.test.js"
      provides: "Asserts SKILL.md has design-DNA directives + cookbook.md links libraries"
      contains: "diversity audit"
  key_links:
    - from: "skills/create/SKILL.md"
      to: "skills/create/references/palettes.md"
      via: "agent reads palettes.md as part of design-DNA picker step"
      pattern: "palettes\\.md"
    - from: "skills/create/SKILL.md"
      to: ".planning/instadecks/<run-id>/design-rationale.md"
      via: "diversity audit reads last 3 prior runs"
      pattern: "design-rationale"
---

<objective>
Wave 2: wire the libraries (Plan 9-01) and variants (Plan 9-02) into the agent surface. This is a SKILL.md + cookbook.md content edit — no script/runtime changes. After this plan, when an agent invokes /instadecks:create, they'll explicitly be told to roll a design DNA from the curated libraries and audit prior runs to avoid sameness.
Purpose: Without this, libraries exist but agents have no instruction to use them — they'd default to whatever they did before.
Output: 2 updated agent-surface files + 1 test asserting the required directives are present.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/09-design-variety-and-brief-polymorphism/09-CONTEXT.md
@skills/create/SKILL.md
@skills/create/references/cookbook.md
@.planning/phases/09-design-variety-and-brief-polymorphism/09-01-reference-libraries-PLAN.md
@.planning/phases/09-design-variety-and-brief-polymorphism/09-02-cookbook-variants-PLAN.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Insert "Choose design DNA" sub-step into SKILL.md</name>
  <read_first>skills/create/SKILL.md (full file — locate the step where the agent authors render-deck.cjs; the new sub-step must appear immediately BEFORE that authoring step)</read_first>
  <files>skills/create/SKILL.md</files>
  <action>Add a new H3-or-deeper sub-step heading EXACTLY: `### Choose design DNA` (or `#### Choose design DNA` if nested under an H3 numbered step — match local heading depth). Position: immediately before the step that instructs the agent to write `render-deck.cjs`. The sub-step body MUST contain ALL of the following literal phrases (case-sensitive substrings, the test will grep for them):

1. "**Before authoring render-deck.cjs**" (bolded directive lead-in)
2. "Roll a design DNA from `references/palettes.md`, `references/typography.md`, `references/motifs.md`"
3. "hash-seed" — describing seeded picker keyed on `audience+tone` (deterministic per brief)
4. "**Diversity audit**" (bolded sub-directive)
5. ".planning/instadecks/" — pointing at run-dir convention
6. "design-rationale.md" — the file to inspect for prior DNAs
7. "last 3 prior runs" — exact phrase
8. "DO NOT pick the same palette / typography / motif combination" (prohibition phrase)
9. "**NEVER** default to verdant-steel + Plex Serif + underline-accent" (defaults prohibition; bold NEVER)
10. A bulleted list referencing the variant-ID convention `{recipe}-[A-E]-{shorthand}` so the agent knows variants exist in the cookbook recipes.

Do NOT alter any other section of SKILL.md. Do NOT modify any numbered step ordering — the new sub-step is INSERTED, not replacing.</action>
  <verify>
    <automated>node -e "const fs=require('fs');const t=fs.readFileSync('skills/create/SKILL.md','utf8');const required=['Choose design DNA','Before authoring render-deck.cjs','references/palettes.md','references/typography.md','references/motifs.md','hash-seed','Diversity audit','.planning/instadecks/','design-rationale.md','last 3 prior runs','DO NOT pick the same palette','NEVER','verdant-steel','Plex Serif','underline-accent','{recipe}-[A-E]-'];const missing=required.filter(r=>!t.includes(r));if(missing.length)throw new Error('missing in SKILL.md: '+missing.join(' | '));console.log('OK')"</automated>
  </verify>
  <acceptance_criteria>
    - SKILL.md contains the heading "Choose design DNA"
    - All 16 required literal substrings present
    - File git-diff shows ONLY additions (no deletions of existing content) — confirm with `git diff --stat skills/create/SKILL.md` shows insertions but baseline lines unchanged
  </acceptance_criteria>
  <done>SKILL.md carries the design-DNA picker sub-step with all required directives.</done>
</task>

<task type="auto">
  <name>Task 2: Restructure cookbook.md top-level with Variant IDs index + library links</name>
  <read_first>skills/create/references/cookbook.md (full file)</read_first>
  <files>skills/create/references/cookbook.md</files>
  <action>Append (or insert near the top — pick whichever placement keeps existing structure intact) a new H2 section EXACTLY titled `## Variant IDs` containing:
1. A 1-line explanation: "Each recipe in this cookbook ships ≥3 variants. Variant IDs follow `{recipe}-[A-E]-{shorthand}`."
2. A table or bulleted list mapping each of the 9 recipes (title, section, 2col, comparison, data-chart, data-table, quote, closing, stat-callout) to its expected variant count (≥3 each, stat-callout ≥5).
3. A "## Reference Libraries" H2 section (separate, immediately after Variant IDs) with markdown links to:
   - `[Palette Library](palettes.md)`
   - `[Typography Library](typography.md)`
   - `[Motif Library](motifs.md)`
   And a 1-line note per library describing its role (palettes = colors, typography = type pairings, motifs = visual treatments).</action>
  <verify>
    <automated>node -e "const fs=require('fs');const t=fs.readFileSync('skills/create/references/cookbook.md','utf8');const required=['## Variant IDs','{recipe}-[A-E]-','## Reference Libraries','[Palette Library](palettes.md)','[Typography Library](typography.md)','[Motif Library](motifs.md)'];const missing=required.filter(r=>!t.includes(r));if(missing.length)throw new Error('missing in cookbook.md: '+missing.join(' | '));console.log('OK')"</automated>
  </verify>
  <acceptance_criteria>
    - cookbook.md has H2 "## Variant IDs" section
    - cookbook.md has H2 "## Reference Libraries" section
    - 3 markdown links to palettes.md, typography.md, motifs.md present in their exact `[Title](path)` form
    - The variant-ID convention `{recipe}-[A-E]-` literal string is present
  </acceptance_criteria>
  <done>cookbook.md surfaces variant IDs + library links at the top level.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Design diversity directive test</name>
  <read_first>tests/cookbook-variant-coverage.test.js (Plan 9-02 sibling) for runner pattern</read_first>
  <files>tests/cookbook-design-diversity.test.js</files>
  <behavior>
    - Read SKILL.md, assert it contains the 16 required literal phrases from Task 1 (use the same array)
    - Read cookbook.md, assert it contains the 6 required strings from Task 2
    - Assert SKILL.md does NOT contain the inverse phrase "default to verdant-steel" without the "NEVER" prefix (paranoid check that defaults aren't reintroduced)
  </behavior>
  <action>node:test + node:assert/strict. Single test file. Two `test()` blocks: one for SKILL.md directives, one for cookbook.md links. Use `assert.ok(text.includes(phrase), 'missing: '+phrase)` for each.</action>
  <verify>
    <automated>node --test tests/cookbook-design-diversity.test.js</automated>
  </verify>
  <acceptance_criteria>
    - Test file exists and passes
    - Asserts ≥16 directive substrings in SKILL.md
    - Asserts ≥6 directive substrings in cookbook.md
  </acceptance_criteria>
  <done>Directive test green; full `npm test` still passes.</done>
</task>

</tasks>

<verification>
- SKILL.md carries "Choose design DNA" sub-step with all required directives
- cookbook.md surfaces variant IDs + library links
- Diversity directive test green
- No deterministic-pipeline scripts altered (no regressions in c8 coverage)
</verification>

<success_criteria>
- DV-05 satisfied: SKILL.md instructs agent to roll design DNA + diversity audit
- 16 required SKILL.md phrases present
- 6 required cookbook.md phrases present
- Test green
</success_criteria>

<output>
After completion, create `.planning/phases/09-design-variety-and-brief-polymorphism/09-03-SUMMARY.md`.
</output>
