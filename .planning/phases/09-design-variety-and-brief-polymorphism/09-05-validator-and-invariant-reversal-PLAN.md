---
plan: 09-05
phase: 09
slug: validator-and-invariant-reversal
status: ready
created: 2026-04-28
wave: 3
depends_on: [09-01]
autonomous: true
files_modified:
  - skills/create/scripts/lib/design-validator.js
  - CLAUDE.md
  - .planning/PROJECT.md
  - .planning/REQUIREMENTS.md
  - tests/lib-design-validator-palette-aware.test.js
  - tests/lib-design-validator-diversity-violation.test.js
requirements: [DV-08, DV-09]

must_haves:
  truths:
    - "skills/create/scripts/lib/design-validator.js reads `skills/create/references/palettes.md` at module-init time and builds an internal hex registry. The registry maps each palette name → { bg, primary, secondary, accent, ink, muted } (only roles present in the palette block populate)."
    - "Validator EXEMPTS recognized hex values from `saturated-primary` and `non-default-blue` AI-tell flags. A render-deck.cjs whose hex literals all map to a single recognized palette is NOT flagged for those two checks."
    - "Validator EXEMPTS asymmetric layouts (off-center title positions, full-bleed treatments) — the `asymmetric-layout` AI-tell flag is REMOVED entirely (these are now legitimate per CONTEXT D-07)."
    - "Validator STILL catches: (a) `fontFace: 'Calibri'` literal default; (b) Office-blue `#0070C0` used as the ONLY accent (no other recognized-palette colors present); (c) 3+ slides with byte-identical layout (existing check preserved); (d) generic stock-photo placeholder filenames matching `/(stock|placeholder|sample|untitled|img\\d+)/i`."
    - "Validator gains a NEW check: `diversity-violation` — fired when ≥3 slides in the same render share the same `recipe-variant` ID (extracted from a slide-comment marker the agent writes per recipe — convention: `// VARIANT: {recipe}-[A-E]-{shorthand}` at top of each renderXxx call)."
    - "Validator's existing public API surface unchanged (same exported function names + same return shape as today); ONLY the internal rule set changes. Existing tests for non-affected rules continue to pass."
    - "CLAUDE.md `## Don't get cute` (or equivalent locked-invariants section) is updated: the line forbidding deviations from `v8 BluePrestige output` is REMOVED. A new line is added: `v8 BluePrestige is one valid design DNA among many. Decks must vary palette / typography / motif / layout per brief — never default to the v8 visual register.` annotate.js geometry/colors/transparency/fonts/SAMPLES contract restriction is PRESERVED (still SHA-locked under visual-regression sign-off — see Phase 8 commit `ed12484` which moved annotate.js to standard test discipline; this plan does NOT touch annotate.js)."
    - ".planning/PROJECT.md gains a new Key Decision entry dated 2026-04-28 with title `KD-09: v8 BluePrestige is one design DNA among many` recording the invariant reversal, citing CONTEXT D-09 / Phase 9 plan 09-05, and timestamping when the reversal lands."
    - ".planning/REQUIREMENTS.md gains rows DV-01 through DV-12 with phase-traceability tag `Phase 09` (matching the existing REQUIREMENTS.md row format)."
    - "2 new tests cover (a) palette-aware validator behavior on a synthetic render-deck.cjs using Carbon Neon hex values (must NOT flag); (b) diversity-violation check firing on 3+ same-variant slides."
    - "All existing 909+ tests pass. c8 100% coverage maintained."
  artifacts:
    - path: "skills/create/scripts/lib/design-validator.js"
      provides: "Palette-aware validator with diversity-violation check"
      contains: "diversity-violation"
    - path: "CLAUDE.md"
      provides: "Invariant reversal: v8 is one DNA among many"
      contains: "one valid design DNA among many"
    - path: ".planning/PROJECT.md"
      provides: "KD-09 invariant reversal Key Decision"
      contains: "KD-09"
    - path: ".planning/REQUIREMENTS.md"
      provides: "DV-01..DV-12 rows"
      contains: "DV-12"
    - path: "tests/lib-design-validator-palette-aware.test.js"
      provides: "Carbon Neon palette NOT flagged + Calibri/Office-blue STILL flagged"
      contains: "Carbon Neon"
    - path: "tests/lib-design-validator-diversity-violation.test.js"
      provides: "3+ same-variant slides → diversity-violation"
      contains: "diversity-violation"
  key_links:
    - from: "skills/create/scripts/lib/design-validator.js"
      to: "skills/create/references/palettes.md"
      via: "module-init reads palettes.md, parses H2 + hex codes per role into in-memory registry"
      pattern: "palettes\\.md"
    - from: ".planning/PROJECT.md"
      to: "CLAUDE.md"
      via: "KD-09 references the CLAUDE.md edit; CLAUDE.md change is the artifact, PROJECT.md is the log"
      pattern: "KD-09"
---

<objective>
Wave 3: flip the validator's posture and record the invariant reversal. Validator stops false-positiving on bold modern decks (saturated colors, asymmetric layouts, full-bleed) when those colors come from a curated palette. New diversity-violation check fires when the agent over-uses one variant. CLAUDE.md "match v8" prohibition is removed; PROJECT.md logs the reversal as KD-09; REQUIREMENTS.md gains the 12 DV rows.
Purpose: Without this, the libraries + variants land but the validator rejects anything that looks meaningfully different from v8 — defeating the whole point.
Output: 1 modified validator + 3 modified docs (CLAUDE.md, PROJECT.md, REQUIREMENTS.md) + 2 new tests.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/09-design-variety-and-brief-polymorphism/09-CONTEXT.md
@CLAUDE.md
@.planning/PROJECT.md
@.planning/REQUIREMENTS.md
@skills/create/scripts/lib/design-validator.js
</context>

<tasks>

<task type="auto">
  <name>Task 1 (FIRST ACTION per CONTEXT D-09): Record KD-09 in PROJECT.md + reverse CLAUDE.md invariant + add DV rows to REQUIREMENTS.md</name>
  <read_first>.planning/PROJECT.md (locate existing Key Decision log section), CLAUDE.md (locate "Don't get cute" + "Locked invariants" sections), .planning/REQUIREMENTS.md (read row format used by existing requirements — copy that shape verbatim)</read_first>
  <files>.planning/PROJECT.md, CLAUDE.md, .planning/REQUIREMENTS.md</files>
  <action>
PROJECT.md — Append (or insert into existing Key Decisions log) a section:
```
### KD-09: v8 BluePrestige is one design DNA among many — invariant reversed (2026-04-28)

**Decision:** The Phase 1-7 invariant "v8 BluePrestige output is the spec — match it" is RELAXED. Replacement: "v8 BluePrestige is one valid design DNA among many. Decks must vary palette / typography / motif / layout per brief — never default to the v8 visual register."

**Trigger:** Phase 9 CONTEXT D-09 + 5 live E2E rounds where structurally-different domain briefs produced visually-similar decks.

**Scope:** Applies to the deck-generation system (cookbook recipes + design-validator.js). Does NOT apply to annotate.js — its geometry/colors/transparency/fonts/SAMPLES contract continues to require visual-regression sign-off (Phase 8 ed12484 moved annotate.js to standard test discipline; this Key Decision does not alter that).

**Recorded by:** Plan 09-05 (Phase 09 — Design Variety & Modern Aesthetics + Brief-Shape Polymorphism).
```

CLAUDE.md — In the `## Locked invariants (do not violate)` (or equivalent) section, find and DELETE the bullet point reading "v8 BluePrestige output is the spec — match it" (or the line in the "Don't get cute" section saying "Improvements to annotate.js geometry... are out of scope and will be reverted" — KEEP that part, but DELETE the broader v8-match prohibition for the deck system). Then INSERT new bullet:
```
- **v8 BluePrestige is one valid design DNA among many.** Decks must vary palette / typography / motif / layout per brief — never default to the v8 visual register. The annotate.js overlay system is the SOLE remaining locked-visual-baseline asset (see Phase 8 ed12484 + KD-09 in PROJECT.md).
```

REQUIREMENTS.md — Locate the row format and append 12 new rows, one per DV-NN, using the EXACT requirement text from `.planning/phases/09-design-variety-and-brief-polymorphism/09-CONTEXT.md` § Requirements table. Each row carries phase tag `Phase 09`. Match the existing column shape verbatim (do not invent new columns).
  </action>
  <verify>
    <automated>node -e "const fs=require('fs');const p=fs.readFileSync('.planning/PROJECT.md','utf8');if(!p.includes('KD-09'))throw new Error('PROJECT.md missing KD-09');if(!p.includes('one valid design DNA among many'))throw new Error('PROJECT.md missing replacement framing');const c=fs.readFileSync('CLAUDE.md','utf8');if(!c.includes('one valid design DNA among many'))throw new Error('CLAUDE.md missing replacement framing');if(c.includes('v8 BluePrestige output is the spec'))throw new Error('CLAUDE.md still has old v8 prohibition');const r=fs.readFileSync('.planning/REQUIREMENTS.md','utf8');for(let i=1;i<=12;i++){const id='DV-'+String(i).padStart(2,'0');if(!r.includes(id))throw new Error('REQUIREMENTS.md missing '+id)}console.log('OK')"</automated>
  </verify>
  <acceptance_criteria>
    - PROJECT.md contains "KD-09" + "one valid design DNA among many"
    - CLAUDE.md contains "one valid design DNA among many" AND no longer contains "v8 BluePrestige output is the spec"
    - REQUIREMENTS.md contains all 12 IDs DV-01 through DV-12
    - REQUIREMENTS.md row format matches existing rows (no new columns)
  </acceptance_criteria>
  <done>Documentation invariant reversal recorded; downstream tasks can rely on it.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Update design-validator.js — palette-awareness + diversity-violation + remove asymmetric-layout flag</name>
  <read_first>skills/create/scripts/lib/design-validator.js (full 76 lines), skills/create/references/palettes.md (just-shipped — confirm the H2 + hex format the parser will read)</read_first>
  <files>skills/create/scripts/lib/design-validator.js, tests/lib-design-validator-palette-aware.test.js, tests/lib-design-validator-diversity-violation.test.js</files>
  <behavior>
    - validator(carbonNeonRenderSrc) returns no findings for 'saturated-primary' or 'non-default-blue' (the hex values are recognized)
    - validator(officeBlueOnlyRenderSrc) STILL returns a finding (Office-blue without other recognized palette colors)
    - validator(calibriRenderSrc) STILL returns a finding for default-Calibri
    - validator(asymmetricRenderSrc) returns no 'asymmetric-layout' finding (rule removed)
    - validator(srcWith3SectionVariantBSlides) returns a 'diversity-violation' finding citing the offending variant ID and slide indices
    - validator(srcWith2SectionVariantBSlides) does NOT fire diversity-violation (threshold is ≥3)
  </behavior>
  <action>
At module init: `const palettesText = fs.readFileSync(path.join(__dirname, '../../references/palettes.md'),'utf8');` then parse — split on `^## ` (multiline) for palette H2 boundaries; within each palette block, regex-match lines like `bg: #RRGGBB` or `| bg | #RRGGBB |` to populate per-role hex sets. Build module-level `const RECOGNIZED_HEX = new Set([...all hex values from all palettes])` and `const RECOGNIZED_PALETTES = Map<name, {bg,primary,...}>`.

Modify rules:
- `saturated-primary` / `non-default-blue`: before flagging, check if the offending hex ∈ RECOGNIZED_HEX. If yes → SKIP flag. If no → flag as before.
- `asymmetric-layout` rule: REMOVE entirely (delete the rule function + its registration).
- ADD `diversity-violation` rule: scan render source for `// VARIANT: {recipe}-[A-E]-{shorthand}` comment markers (one per slide). Count occurrences per variant ID. If any variant ID appears ≥3 times in a single render, emit finding `{ id: 'diversity-violation', severity: 'major', message: \`Variant ${id} used ${count} times — vary the layout (max 2 per deck)\`, slides: [indices] }`.
- Office-blue check: if `#0070C0` is the ONLY recognized accent in the render (i.e., no other RECOGNIZED_HEX values present beyond bg/ink defaults), flag as before.
- Calibri check: preserved.
- Stock-photo placeholder check: preserved with regex `/(stock|placeholder|sample|untitled|img\d+)/i`.

Tests: 2 new files, total ≥6 cases, using inline JS source strings (no need for real .cjs files):
- palette-aware test: assert Carbon Neon hex (read from palettes.md to make test data-driven) does NOT flag; assert Calibri DOES flag; assert Office-blue-only DOES flag; assert asymmetric layout does NOT flag.
- diversity-violation test: build a synthetic render source with 3 `// VARIANT: section-B-numbered-anchor` markers → assert finding fires with severity `major` + the variant ID + the 3 slide indices. Build another with only 2 markers → assert no finding.
  </action>
  <verify>
    <automated>node --test tests/lib-design-validator-palette-aware.test.js tests/lib-design-validator-diversity-violation.test.js && npm test 2>&1 | tail -5</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c 'diversity-violation' skills/create/scripts/lib/design-validator.js` returns ≥1
    - `grep 'asymmetric-layout' skills/create/scripts/lib/design-validator.js` returns 0 (rule removed)
    - `grep 'palettes.md' skills/create/scripts/lib/design-validator.js` returns ≥1 (file is read at init)
    - 2 new test files pass
    - Existing validator tests + full `npm test` still green
    - c8 100% coverage gate maintained
  </acceptance_criteria>
  <done>Validator is palette-aware + diversity-violation check live; tests green; full suite green.</done>
</task>

</tasks>

<verification>
- KD-09 entry in PROJECT.md
- CLAUDE.md invariant reversal applied (old line gone, new line present)
- REQUIREMENTS.md DV-01..DV-12 rows present
- design-validator.js palette-aware + diversity-violation + asymmetric-layout rule removed
- All tests green; c8 100% coverage maintained
</verification>

<success_criteria>
- DV-08 satisfied: validator recognizes palette library, no false positives on bold modern
- DV-09 satisfied: CLAUDE.md invariant reversed + PROJECT.md KD-09 + REQUIREMENTS.md DV-NN rows
</success_criteria>

<output>
After completion, create `.planning/phases/09-design-variety-and-brief-polymorphism/09-05-SUMMARY.md`.
</output>
