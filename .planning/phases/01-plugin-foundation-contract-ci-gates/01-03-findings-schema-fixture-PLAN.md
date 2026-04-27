---
phase: 01-plugin-foundation-contract-ci-gates
plan: 03
type: execute
wave: 1
depends_on: []
files_modified:
  - skills/review/references/findings-schema.md
  - tests/fixtures/sample-findings.json
  - tests/findings-schema.test.js
autonomous: true
requirements: [FOUND-06, FOUND-07]
must_haves:
  truths:
    - "findings-schema.md defines schema 1.0 with required schema_version field"
    - "Schema preserves full 4-tier severity vocabulary (Critical/Major/Minor/Nitpick) at the producer side"
    - "Schema includes auto-refine fields: genuine, category, nx, ny, rationale"
    - "sample-findings.json honors schema 1.0 and exercises all four severity tiers + every category"
    - "Schema → annotate.js SAMPLES mapping table is documented (4→3 collapse noted as /annotate-adapter concern only)"
  artifacts:
    - path: "skills/review/references/findings-schema.md"
      provides: "Canonical JSON contract for /review, /content-review, /annotate, /create"
      contains: "schema_version"
    - path: "tests/fixtures/sample-findings.json"
      provides: "Canonical fixture used by all four skills' future tests"
      contains: '"schema_version": "1.0"'
    - path: "tests/findings-schema.test.js"
      provides: "Validation that fixture honors schema (top-level shape + required fields)"
  key_links:
    - from: "tests/fixtures/sample-findings.json"
      to: "skills/review/references/findings-schema.md"
      via: "schema_version: 1.0 reference"
      pattern: '"schema_version"'
    - from: "tests/findings-schema.test.js"
      to: "tests/fixtures/sample-findings.json"
      via: "fs.readFileSync + JSON.parse + shape assertions"
      pattern: "sample-findings.json"
---

<objective>
Mint the locked JSON contract: `skills/review/references/findings-schema.md` (schema 1.0), `tests/fixtures/sample-findings.json` (canonical fixture exercising the schema), and a `node --test` validator that asserts the fixture honors the schema.

Purpose: FOUND-06/07 — every later phase's skills consume this contract. Locked at the producer side with full 4-tier vocab; 4→3 collapse is documented as a downstream `/annotate` concern only.
Output: 3 files. Schema is the single source of truth for the entire plugin.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/01-plugin-foundation-contract-ci-gates/01-CONTEXT.md
@.planning/phases/01-plugin-foundation-contract-ci-gates/01-RESEARCH.md
@.planning/phases/01-plugin-foundation-contract-ci-gates/01-PATTERNS.md
@CLAUDE.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Write findings-schema.md (schema 1.0)</name>
  <files>skills/review/references/findings-schema.md</files>
  <action>
    Per D-07, FOUND-06, RESEARCH.md "Findings Schema (FOUND-06)" §, PATTERNS.md row, and CLAUDE.md severity-collapse invariant:

    Top of file:
    - Banner block: `**Schema version:** 1.0` and `**Required top-level field:** schema_version`.
    - One-paragraph purpose: this file is THE canonical contract; consumed by /review, /content-review, /annotate, /create directly via Read — do not duplicate in code.

    Sections:
    1. **Top-level shape** — fenced ` ```jsonc ` example matching RESEARCH.md "findings-schema.md v1.0 (recommended structure)" verbatim. `schema_version` MUST be the first key. Other top-level keys: `deck`, `generated_at`, `slides[]`.
    2. **Slide shape** — `slideNum` (1-based int), `title` (string), `findings[]` (array).
    3. **Finding shape** — fields: `severity_reviewer` (one of "Critical"|"Major"|"Minor"|"Nitpick"), `category` ("defect"|"improvement"|"style"), `genuine` (bool — auto-refine filter), `nx` / `ny` (0–1 normalized floats), `text` (mapped to annotate.js `text`), `rationale` (string), `location`, `standard`, `fix`. Document each field's purpose and whether it's required vs optional.
    4. **Severity vocabulary table** — full 4-tier (Critical / Major / Minor / Nitpick) at the producer. Bold note: "The 4→3 collapse to MAJOR / MINOR / POLISH is the `/annotate` adapter's concern (Phase 2). Producers always emit the full 4-tier vocabulary."
    5. **Mapping to annotate.js SAMPLES** — table per RESEARCH.md (severity_reviewer → sev, nx/ny direct, text direct, genuine → filter, etc.). Mark category/rationale/location/standard/fix as "retained in JSON; not passed to annotate.js".
    6. **Schema version policy (D-07)** — `/annotate` adapter accepts `schema_version: "1.0"` (and any `1.x`); rejects unknown major versions with explicit error string `"Unsupported findings schema version X.Y. /annotate supports 1.x."`. Migration adapter for `2.0+` is out of scope for v0.1.0.
    7. **Migration Policy** — short stub describing how 2.0+ would be handled (upgrade adapter pattern); not implemented in v0.1.0.

    Two-space indent in fenced JSON; UTF-8; trailing newline.
  </action>
  <verify>
    <automated>test -f skills/review/references/findings-schema.md && grep -q "Schema version:.*1.0" skills/review/references/findings-schema.md && grep -q "schema_version" skills/review/references/findings-schema.md && grep -qE "Critical.*Major.*Minor.*Nitpick" skills/review/references/findings-schema.md && grep -q "Migration Policy" skills/review/references/findings-schema.md</automated>
  </verify>
  <done>Schema doc exists, declares 1.0, documents all required fields, severity table is 4-tier, mapping table present, migration policy stub present.</done>
</task>

<task type="auto">
  <name>Task 2: Write sample-findings.json fixture + node --test validator</name>
  <files>tests/fixtures/sample-findings.json, tests/findings-schema.test.js</files>
  <action>
    Per FOUND-07 and PATTERNS.md row for `tests/fixtures/sample-findings.json`:

    Create `tests/fixtures/sample-findings.json` with two-space indent, trailing newline:
    - `schema_version: "1.0"` as FIRST key.
    - `deck: "tests/fixtures/v8-reference/Annotations_Sample.pptx"`, `generated_at` ISO8601 string.
    - `slides[]` array with 3 entries mirroring v8 BluePrestige's 3-slide structure (slideNums 7, 8, 9 — match the v8 SAMPLES from RESEARCH.md "Findings Schema" §).
    - Each slide has `findings[]` with at least 4 findings collectively across the file exercising all four severity tiers (Critical, Major, Minor, Nitpick) and all three categories (defect, improvement, style). At least one finding has `genuine: false` to exercise the filter. Every finding has all required fields: severity_reviewer, category, genuine, nx, ny, text, rationale, location, standard, fix.

    Create `tests/findings-schema.test.js`. First-line banner: `// Validates tests/fixtures/sample-findings.json against findings-schema.md v1.0.`

    Use `node:test`, `node:assert/strict`, `node:fs`. Top-level `test('sample-findings.json honors schema 1.0', t => { ... })` with subtests:
    1. `'top-level: schema_version is "1.0"'` — assert `data.schema_version === "1.0"`.
    2. `'top-level: deck and slides[] present'` — assert types.
    3. `'each slide has slideNum (int), title (string), findings[] (array)'`.
    4. `'each finding has all required fields'` — iterate, assert presence + types of severity_reviewer, category, genuine, nx, ny, text, rationale, location, standard, fix.
    5. `'severity_reviewer is one of the 4 allowed tiers'` — set membership check.
    6. `'category is one of defect|improvement|style'`.
    7. `'nx and ny are floats in [0, 1]'`.
    8. `'fixture exercises all 4 severity tiers'` — collect all severities seen, assert superset {Critical, Major, Minor, Nitpick}.
    9. `'fixture exercises all 3 categories'` — same idea.
    10. `'fixture includes at least one genuine: false finding'` — exercises auto-refine filter.

    Pure Node built-ins; no external deps.
  </action>
  <verify>
    <automated>node --test tests/findings-schema.test.js</automated>
  </verify>
  <done>Fixture validates against schema; node --test passes all 10 subtests.</done>
</task>

</tasks>

<verification>
- findings-schema.md committed; references the canonical mapping to annotate.js SAMPLES
- sample-findings.json validates with `node --test tests/findings-schema.test.js`
</verification>

<success_criteria>
- FOUND-06: schema 1.0 locked with all required fields
- FOUND-07: canonical fixture honors schema and exercises all severity tiers + categories
- 4→3 collapse documented as /annotate-adapter concern, NOT producer concern
</success_criteria>

<output>
After completion, create `.planning/phases/01-plugin-foundation-contract-ci-gates/01-03-SUMMARY.md`
</output>
