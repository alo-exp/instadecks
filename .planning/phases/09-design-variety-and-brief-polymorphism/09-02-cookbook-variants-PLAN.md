---
plan: 09-02
phase: 09
slug: cookbook-variants
status: ready
created: 2026-04-28
wave: 1
depends_on: []
autonomous: true
files_modified:
  - skills/create/references/cookbook/title.md
  - skills/create/references/cookbook/section.md
  - skills/create/references/cookbook/2col.md
  - skills/create/references/cookbook/comparison.md
  - skills/create/references/cookbook/data-chart.md
  - skills/create/references/cookbook/data-table.md
  - skills/create/references/cookbook/quote.md
  - skills/create/references/cookbook/closing.md
  - skills/create/references/cookbook/stat-callout.md
  - tests/cookbook-variant-coverage.test.js
requirements: [DV-01]

must_haves:
  truths:
    - "Each of the 9 cookbook recipes (title, section, 2col, comparison, data-chart, data-table, quote, closing, stat-callout) contains ≥3 documented variants. Existing single template becomes Variant A; new B + C (and optionally D, E) added per D-01 ID convention `{recipe}-{letter}-{shorthand}`."
    - "Each variant block has the 5 required parts: H3 (or H2 sub-)heading naming the VARIANT_ID, a 1-line visual description, a fenced ```javascript code block with WORKING pptxgenjs 4.0.1 (uses `slide.addText`/`slide.addShape`/`slide.addImage`/`slide.addTable`/`slide.addChart` only — no unsupported APIs), a `**When to use:**` line, a `**When NOT to use:**` line."
    - "Total NEW variants across the 9 files: ≥27 (≥3 per recipe minus the existing one = ≥18 new variants minimum; spec calls for 30+ so plan to 30+ — at least 3 recipes get 4 variants and stat-callout gets 5)."
    - "Variant IDs follow the D-01 pattern exactly: lowercase `{recipe}-{letter}-{shorthand}` where letter is uppercase (A-E). Example: `title-A-centered-classic`, `title-B-asymmetric-block`, `title-C-oversized-numeral`, `title-D-type-as-image`."
    - "stat-callout has ≥5 variants (A through E), per D-01 example list."
    - "All NEW variant code blocks are enum-lint clean: no `align: 'middle'` (use `valign: 'middle'`), no `fontFace: 'Calibri'` literal default, all colors as `PALETTE.*` tokens or `'#RRGGBB'` uppercase strings."
    - "tests/cookbook-variant-coverage.test.js asserts each of the 9 recipes contains ≥3 VARIANT_ID strings matching `{recipe}-[A-E]-` pattern; stat-callout asserts ≥5; total NEW VARIANT_IDs across all files ≥27."
  artifacts:
    - path: "skills/create/references/cookbook/title.md"
      provides: "≥3 variants of title recipe with VARIANT_ID convention"
      contains: "title-B-"
    - path: "skills/create/references/cookbook/stat-callout.md"
      provides: "≥5 variants of stat-callout recipe"
      contains: "stat-callout-E-"
    - path: "tests/cookbook-variant-coverage.test.js"
      provides: "Asserts ≥3 variants per recipe + stat-callout ≥5 + total ≥27"
      contains: "VARIANT_ID"
  key_links:
    - from: "tests/cookbook-variant-coverage.test.js"
      to: "skills/create/references/cookbook/*.md"
      via: "fs.readFileSync per recipe + regex /^([a-z-]+)-[A-E]-/ for variant IDs"
      pattern: "[A-E]-"
---

<objective>
Wave 1 (independent): extend the 9 cookbook recipes with ≥3 variants each so the agent has a real menu of slide compositions to choose from. This is the highest-leverage diversity lever — same palette + different recipe variant transforms the slide's feel. No SKILL.md or runCreate changes; cookbook surface only.
Purpose: Currently every section slide looks identical because there's exactly one section recipe. Three variants per recipe moves the floor from "1 way" to "≥3 ways" and creates the menu the design-DNA picker (Plan 9-03) will consume.
Output: 9 updated recipe files + 1 test asserting variant coverage.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/09-design-variety-and-brief-polymorphism/09-CONTEXT.md
@skills/create/references/cookbook.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Extend 5 recipes (title, section, 2col, comparison, quote) — ≥3 variants each</name>
  <read_first>skills/create/references/cookbook/title.md, skills/create/references/cookbook/section.md, skills/create/references/cookbook/2col.md, skills/create/references/cookbook/comparison.md, skills/create/references/cookbook/quote.md (read existing single recipe to determine PALETTE / TYPE / MARGIN_X / W / H token shape — match it verbatim in new variants)</read_first>
  <files>skills/create/references/cookbook/title.md, skills/create/references/cookbook/section.md, skills/create/references/cookbook/2col.md, skills/create/references/cookbook/comparison.md, skills/create/references/cookbook/quote.md</files>
  <action>For each of the 5 files: keep the existing recipe content but RELABEL its main "## Code" section to a new H2 "## Variant A: {recipe}-A-{shorthand}" block. Add ≥2 NEW variant H2 sections (B and C). For title.md, also add Variant D. Each new variant H2 MUST contain in order: (1) variant ID line `**Variant ID:** {recipe}-{letter}-{shorthand}`; (2) `**Visual:** {1-line description}`; (3) a fenced ```javascript block with the renderer function (use the same parameter shape as the existing Variant A — e.g., title takes `(slide, { title, subtitle, attribution, pageNum, total })`); (4) `**When to use:** {1-line}`; (5) `**When NOT to use:** {1-line}`. Required new variant IDs (exact strings):
- title.md: `title-B-asymmetric-block`, `title-C-oversized-numeral`, `title-D-type-as-image`
- section.md: `section-B-numbered-anchor`, `section-C-full-bleed-color`
- 2col.md: `2col-B-asymmetric-7030`, `2col-C-stacked-with-rule`
- comparison.md: `comparison-B-versus-split`, `comparison-C-three-column`
- quote.md: `quote-B-pull-quote-mega`, `quote-C-attribution-card`

Code blocks MUST use `PALETTE.*` tokens (not literal hex), `TYPE.heading` / `TYPE.body` (not literal font names), `MARGIN_X` / `W` / `H` constants, and `slide.addNotes(...)` at the end. Do NOT use `fontFace: 'Calibri'`. Do NOT use `align: 'middle'` (vertical alignment is `valign`).</action>
  <verify>
    <automated>node -e "const fs=require('fs');const map={'title':['B-asymmetric-block','C-oversized-numeral','D-type-as-image'],'section':['B-numbered-anchor','C-full-bleed-color'],'2col':['B-asymmetric-7030','C-stacked-with-rule'],'comparison':['B-versus-split','C-three-column'],'quote':['B-pull-quote-mega','C-attribution-card']};let bad=[];for(const r of Object.keys(map)){const t=fs.readFileSync('skills/create/references/cookbook/'+r+'.md','utf8');for(const v of map[r]){const id=r+'-'+v;if(!t.includes(id))bad.push('missing '+id)}if(/fontFace:\s*'Calibri'/.test(t))bad.push(r+': Calibri literal');if(/align:\s*'middle'/.test(t))bad.push(r+': align middle (use valign)');}if(bad.length)throw new Error(bad.join('\n'));console.log('OK')"</automated>
  </verify>
  <acceptance_criteria>
    - All 11 new variant IDs present as exact substrings in their target files
    - Zero `fontFace: 'Calibri'` and zero `align: 'middle'` occurrences in the 5 modified files
    - Each modified file has ≥3 H2 "## Variant" sections
  </acceptance_criteria>
  <done>5 recipes carry ≥3 variants each with required IDs; verify command prints OK.</done>
</task>

<task type="auto">
  <name>Task 2: Extend 4 remaining recipes (data-chart, data-table, closing, stat-callout)</name>
  <read_first>skills/create/references/cookbook/data-chart.md, skills/create/references/cookbook/data-table.md, skills/create/references/cookbook/closing.md, skills/create/references/cookbook/stat-callout.md</read_first>
  <files>skills/create/references/cookbook/data-chart.md, skills/create/references/cookbook/data-table.md, skills/create/references/cookbook/closing.md, skills/create/references/cookbook/stat-callout.md</files>
  <action>Same variant block shape as Task 1. Required new variant IDs (exact):
- data-chart.md: `data-chart-B-annotated-line`, `data-chart-C-small-multiples`
- data-table.md: `data-table-B-banded-emphasis`, `data-table-C-heatmap-cells`
- closing.md: `closing-B-question-prompt`, `closing-C-contact-card`
- stat-callout.md: 4 NEW variants (existing recipe is Variant A): `stat-callout-B-asymmetric-grid`, `stat-callout-C-vertical-stack`, `stat-callout-D-full-bleed-numeral`, `stat-callout-E-side-by-side` (so stat-callout has 5 total per D-01)

Same constraints: PALETTE.* tokens, TYPE.* tokens, no Calibri literal, no `align: 'middle'`, `slide.addNotes` at end.</action>
  <verify>
    <automated>node -e "const fs=require('fs');const map={'data-chart':['B-annotated-line','C-small-multiples'],'data-table':['B-banded-emphasis','C-heatmap-cells'],'closing':['B-question-prompt','C-contact-card'],'stat-callout':['B-asymmetric-grid','C-vertical-stack','D-full-bleed-numeral','E-side-by-side']};let bad=[];for(const r of Object.keys(map)){const t=fs.readFileSync('skills/create/references/cookbook/'+r+'.md','utf8');for(const v of map[r]){const id=r+'-'+v;if(!t.includes(id))bad.push('missing '+id)}if(/fontFace:\s*'Calibri'/.test(t))bad.push(r+': Calibri literal');}if(bad.length)throw new Error(bad.join('\n'));const sc=fs.readFileSync('skills/create/references/cookbook/stat-callout.md','utf8');const ids=(sc.match(/stat-callout-[A-E]-/g)||[]);const uniq=new Set(ids);if(uniq.size<5)throw new Error('stat-callout needs ≥5 distinct variant IDs, got '+uniq.size);console.log('OK')"</automated>
  </verify>
  <acceptance_criteria>
    - All 10 new variant IDs (2+2+2+4) present in their target files
    - stat-callout.md has ≥5 distinct variant IDs (A through E)
    - Zero `fontFace: 'Calibri'` literals in the 4 modified files
  </acceptance_criteria>
  <done>4 recipes extended; stat-callout has 5 variants; verify command prints OK.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Variant coverage test</name>
  <read_first>tests/cookbook-render-fidelity.test.js or any existing tests/cookbook-*.test.js for runner / fs pattern</read_first>
  <files>tests/cookbook-variant-coverage.test.js</files>
  <behavior>
    - For each of 9 recipes, parse the file and count distinct VARIANT_IDs matching `^{recipe}-[A-E]-[a-z0-9-]+` (case-sensitive uppercase letter)
    - Assert each recipe has ≥3 distinct variant IDs
    - Assert stat-callout has ≥5 distinct variant IDs
    - Assert total distinct VARIANT_IDs (across all 9 files) ≥30 (existing-as-A counts; 9 A's + ≥21 new B/C/D/E IDs = ≥30)
    - Assert NO file contains the literal `fontFace: 'Calibri'`
    - Assert NO file contains `align: 'middle'`
  </behavior>
  <action>Use `node:test` + `node:assert/strict` + `node:fs`. Recipes list: ['title','section','2col','comparison','data-chart','data-table','quote','closing','stat-callout']. Build per-recipe regex `new RegExp('\\\\b'+r+'-[A-E]-[a-z0-9-]+','g')`. Use Set to dedupe matches. Tests must run via `node --test` with no extra config.</action>
  <verify>
    <automated>node --test tests/cookbook-variant-coverage.test.js</automated>
  </verify>
  <acceptance_criteria>
    - Test file exists and passes
    - Test asserts the 4 conditions above
    - Test imports from `node:test` and `node:assert/strict` only
  </acceptance_criteria>
  <done>Variant coverage test green; full `npm test` still passes.</done>
</task>

</tasks>

<verification>
- All 9 recipe files contain ≥3 distinct `{recipe}-[A-E]-` IDs
- stat-callout has ≥5
- New variant code blocks use PALETTE.*/TYPE.* tokens, no Calibri literal, no `align: 'middle'`
- Variant coverage test green; existing test suite unaffected
</verification>

<success_criteria>
- 9 recipes × ≥3 variants = ≥27 unique variant IDs (target: 30+)
- All required D-01 variant IDs present verbatim
- Test file asserts coverage and passes
</success_criteria>

<output>
After completion, create `.planning/phases/09-design-variety-and-brief-polymorphism/09-02-SUMMARY.md`.
</output>
