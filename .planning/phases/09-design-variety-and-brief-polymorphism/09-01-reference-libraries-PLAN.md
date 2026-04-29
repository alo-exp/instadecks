---
plan: 09-01
phase: 09
slug: reference-libraries
status: ready
created: 2026-04-28
wave: 1
depends_on: []
autonomous: true
files_modified:
  - skills/create/references/palettes.md
  - skills/create/references/typography.md
  - skills/create/references/motifs.md
  - tests/cookbook-palette-library.test.js
  - tests/cookbook-typography-library.test.js
  - tests/cookbook-motif-library.test.js
requirements: [DV-02, DV-03, DV-04]

must_haves:
  truths:
    - "skills/create/references/palettes.md exists with ≥14 named palette blocks. Each palette block has: H2 name heading, ≥4 hex colors with role labels (bg, primary, secondary, accent, ink, muted — at least 4 of those 6 roles per palette), 1-line use-case, DO/DON'T table, AI-tells exemption note."
    - "skills/create/references/typography.md exists with ≥8 type-pairing blocks. Each pairing: H2 pair name, headings font, body font, weight strategy, use-case, pptxgenjs example assignment block (`fontFace: '...'`)."
    - "skills/create/references/motifs.md exists with ≥8 motif blocks. Each motif: H2 motif name, 1-line visual description, 1-line when-it-works note, working pptxgenjs 4.0.1 code snippet (NO unsupported APIs — gradient documented as solid-block workaround)."
    - "Palettes include the 9 names from D-02 (Editorial Mono, Magazine Bold, Tech Noir, Pastel Tech, Silicon Valley, Editorial Serif, Carbon Neon, Cobalt Edge, Terracotta Editorial) PLUS 4 earth-tone palettes inherited from prior phases PLUS 1 high-contrast monochrome (≥14 total)."
    - "Motifs include all 9 named in D-04: underline-accent, geometric-block, asymmetric-grid, number-as-design, diagonal-split, editorial-rule, minimalist-void, gradient-overlay, type-as-image."
    - "All 3 library files use markdown reference shape (no JSON registry); hex values are 6-char uppercase `#RRGGBB`."
    - "3 new tests assert ≥14 palettes / ≥8 typography pairings / ≥8 motifs by counting H2 headings; tests fail if any required name is absent."
  artifacts:
    - path: "skills/create/references/palettes.md"
      provides: "≥14 named modern palettes with role-labeled hex"
      contains: "Editorial Mono"
    - path: "skills/create/references/typography.md"
      provides: "≥8 type pairings with pptxgenjs assignments"
      contains: "fontFace"
    - path: "skills/create/references/motifs.md"
      provides: "≥8 motifs with working code snippets"
      contains: "type-as-image"
    - path: "tests/cookbook-palette-library.test.js"
      provides: "Asserts palettes.md has ≥14 H2 palette blocks"
      contains: "≥ 14"
    - path: "tests/cookbook-typography-library.test.js"
      provides: "Asserts typography.md has ≥8 H2 pair blocks"
      contains: "≥ 8"
    - path: "tests/cookbook-motif-library.test.js"
      provides: "Asserts motifs.md has ≥8 H2 motif blocks and the 9 named motifs"
      contains: "type-as-image"
  key_links:
    - from: "skills/create/references/palettes.md"
      to: "skills/create/scripts/lib/design-validator.js"
      via: "validator reads palettes.md at startup (wired in Plan 9-05)"
      pattern: "palettes\\.md"
    - from: "tests/cookbook-palette-library.test.js"
      to: "skills/create/references/palettes.md"
      via: "fs.readFileSync + regex H2 count"
      pattern: "fs\\.readFileSync"
---

<objective>
Wave 1 (independent): land the three reference libraries — palettes, typography, motifs — that downstream waves consume. Pure additive content; no behavior change yet. After this plan ships, palette/typography/motif diversity raw material exists in the agent surface (markdown).
Purpose: Without curated libraries, agents have nothing to draw from. Adding them as markdown is the lowest-friction surface (agents already read cookbook.md).
Output: 3 new reference markdown files + 3 new tests asserting their shape.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/09-design-variety-and-brief-polymorphism/09-CONTEXT.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Author palettes.md (≥14 palettes)</name>
  <read_first>skills/create/references/cookbook.md, skills/create/references/cookbook/title.md, skills/create/references/cookbook/section.md (to understand current palette token shape: PALETTE.bg / .primary / .secondary / .accent / .ink / .muted)</read_first>
  <files>skills/create/references/palettes.md</files>
  <action>Create the file with H1 "# Palette Library" and ≥14 H2 palette sections. Required H2 names (exact): "## Editorial Mono", "## Magazine Bold", "## Tech Noir", "## Pastel Tech", "## Silicon Valley", "## Editorial Serif", "## Carbon Neon", "## Cobalt Edge", "## Terracotta Editorial", "## Verdant Steel", "## Burnt Sienna", "## Mossbank", "## Driftwood", "## Monochrome High-Contrast". Each section MUST contain (a) a markdown table or fenced block listing ≥4 hex values with role labels from {bg, primary, secondary, accent, ink, muted} using 6-char uppercase `#RRGGBB`; (b) a "## When to use" or "**Use:**" 1-line use-case line; (c) a "## DO / DON'T" or "## DO/DON'T" table with at least one ✅ row and one ❌ row; (d) a "**AI-tells exemption:**" line stating that the palette is recognized by design-validator.js and saturated primaries / non-default-blue treatments must NOT be flagged when this palette is in use. Do NOT use lowercase hex. Do NOT add any JSON code blocks (markdown reference only).</action>
  <verify>
    <automated>node -e "const fs=require('fs');const t=fs.readFileSync('skills/create/references/palettes.md','utf8');const h2=(t.match(/^## /gm)||[]).length;if(h2<14)throw new Error('expected ≥14 H2, got '+h2);['Editorial Mono','Magazine Bold','Tech Noir','Pastel Tech','Silicon Valley','Editorial Serif','Carbon Neon','Cobalt Edge','Terracotta Editorial','Monochrome High-Contrast'].forEach(n=>{if(!t.includes('## '+n))throw new Error('missing palette: '+n)});if(!/AI-tells exemption/.test(t))throw new Error('missing AI-tells exemption note');if(/#[a-f0-9]{6}/.test(t))throw new Error('lowercase hex found — must be uppercase');console.log('OK')"</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c '^## ' skills/create/references/palettes.md` returns ≥ 14
    - All 9 D-02 names + Monochrome High-Contrast appear as H2 headings
    - File contains the literal string "AI-tells exemption" at least once per palette section (≥14 occurrences)
    - No lowercase hex (`grep -E '#[a-f0-9]{6}' skills/create/references/palettes.md` returns 0 lines)
  </acceptance_criteria>
  <done>palettes.md exists with ≥14 H2 palette blocks; verify command prints OK.</done>
</task>

<task type="auto">
  <name>Task 2: Author typography.md (≥8 pairings) + motifs.md (≥8 motifs)</name>
  <read_first>skills/create/references/cookbook/title.md, skills/create/references/cookbook/section.md (for current TYPE.heading / TYPE.body assignment shape)</read_first>
  <files>skills/create/references/typography.md, skills/create/references/motifs.md</files>
  <action>typography.md: H1 "# Typography Library" + ≥8 H2 pairing sections. Each section MUST contain: (a) a "**Headings:**" line with font name; (b) a "**Body:**" line with font name; (c) a "**Weights:**" line; (d) a "**Use:**" use-case line; (e) a fenced ```javascript code block containing at least one `fontFace: '...'` assignment showing pptxgenjs usage. At least 3 of the 8 pairings MUST use IBM Plex bundled fonts (Plex Sans / Plex Serif / Plex Mono); the rest may reference user-installed fonts (Inter, Söhne, Helvetica Neue, etc.) and MUST include the literal note "**Fallback:** IBM Plex" if the primary font is not bundled.

motifs.md: H1 "# Motif Library" + EXACTLY the 9 H2 motif sections named in D-04 (underline-accent, geometric-block, asymmetric-grid, number-as-design, diagonal-split, editorial-rule, minimalist-void, gradient-overlay, type-as-image). Each motif MUST contain: (a) a "**Visual:**" 1-line description; (b) a "**When it works:**" 1-line note; (c) a fenced ```javascript code block with a working pptxgenjs 4.0.1 snippet (use `slide.addShape`, `slide.addText`, `slide.background` — no unsupported gradient API). For "## gradient-overlay", the code snippet MUST use stacked `slide.addShape({ type:'rect', ... })` with stepped fill colors as the documented workaround AND include an explanatory comment `// pptxgenjs 4.0.1 has limited gradient support — use stepped solid blocks`.</action>
  <verify>
    <automated>node -e "const fs=require('fs');const ty=fs.readFileSync('skills/create/references/typography.md','utf8');const ty2=(ty.match(/^## /gm)||[]).length;if(ty2<8)throw new Error('typography H2 <8: '+ty2);if((ty.match(/fontFace:/g)||[]).length<8)throw new Error('typography needs ≥8 fontFace assignments');const mo=fs.readFileSync('skills/create/references/motifs.md','utf8');const required=['underline-accent','geometric-block','asymmetric-grid','number-as-design','diagonal-split','editorial-rule','minimalist-void','gradient-overlay','type-as-image'];required.forEach(n=>{if(!mo.includes('## '+n))throw new Error('missing motif: '+n)});if(!/limited gradient support/.test(mo))throw new Error('gradient-overlay missing pptxgenjs workaround comment');console.log('OK')"</automated>
  </verify>
  <acceptance_criteria>
    - typography.md has ≥8 H2 sections, ≥8 `fontFace:` assignments
    - At least 3 typography sections reference "IBM Plex"
    - motifs.md has all 9 D-04 motif names as H2 headings
    - motifs.md "## gradient-overlay" section contains the literal comment "limited gradient support"
  </acceptance_criteria>
  <done>Both files exist; verify command prints OK.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Library shape tests</name>
  <read_first>tests/cookbook-render-fidelity.test.js (or any existing tests/cookbook-*.test.js for the assertion style + node:test runner pattern)</read_first>
  <files>tests/cookbook-palette-library.test.js, tests/cookbook-typography-library.test.js, tests/cookbook-motif-library.test.js</files>
  <behavior>
    - palette test: parses palettes.md, asserts ≥14 H2 sections, asserts the 10 named palettes from D-02 + Monochrome High-Contrast are present, asserts every H2 section has ≥4 hex `#RRGGBB` codes, asserts file contains "AI-tells exemption" ≥14 times
    - typography test: parses typography.md, asserts ≥8 H2 sections, asserts ≥8 `fontFace:` occurrences, asserts ≥3 sections mention "IBM Plex"
    - motif test: parses motifs.md, asserts the 9 D-04 motif H2 names are present, asserts gradient-overlay section contains "limited gradient support"
  </behavior>
  <action>Use Node's built-in `node:test` runner + `node:assert/strict`. Each file: `import { test } from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs';`. Read library file via `fs.readFileSync(path.resolve(...), 'utf8')`. Use the same path-resolution + plugin-root style as existing `tests/cookbook-*.test.js`. No external deps. Tests must run via existing `npm test` runner with no config change.</action>
  <verify>
    <automated>npx --yes c8 --reporter=text-summary node --test tests/cookbook-palette-library.test.js tests/cookbook-typography-library.test.js tests/cookbook-motif-library.test.js</automated>
  </verify>
  <acceptance_criteria>
    - 3 test files exist
    - All 3 pass via `node --test`
    - Each file imports `node:test` and `node:assert/strict`
    - Each file references its corresponding library .md file path
  </acceptance_criteria>
  <done>3 tests green; suite-level `npm test` still passes (no regressions).</done>
</task>

</tasks>

<verification>
- All 3 reference files exist at the documented paths
- Library shape tests green
- Existing 909+ test suite unaffected (no behavior changes in this wave)
</verification>

<success_criteria>
- palettes.md ≥14 H2 palette blocks; all 10 required names present
- typography.md ≥8 H2 pairing blocks
- motifs.md exactly 9 D-04 motif blocks with working pptxgenjs snippets
- 3 new tests green
</success_criteria>

<output>
After completion, create `.planning/phases/09-design-variety-and-brief-polymorphism/09-01-SUMMARY.md`.
</output>
