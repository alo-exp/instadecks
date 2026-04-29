---
plan: 09-04
phase: 09
slug: brief-normalizer-polymorphic
status: ready
created: 2026-04-28
wave: 2
depends_on: []
autonomous: true
files_modified:
  - skills/create/scripts/lib/brief-normalizer.js
  - skills/create/scripts/lib/extract-doc.js
  - skills/create/scripts/cli.js
  - skills/create/scripts/index.js
  - tests/lib-brief-normalizer.test.js
  - tests/lib-extract-doc.test.js
  - tests/cli-create-polymorphic-brief.test.js
requirements: [DV-06, DV-07]

must_haves:
  truths:
    - "skills/create/scripts/lib/brief-normalizer.js exists and exports: `normalizeBrief(input)`, `detectBriefShape(input)`, `_test_setExtractor(stub)`. detectBriefShape returns one of `'json' | 'markdown' | 'raw' | 'files'`."
    - "Detection rules (deterministic): if input is a parsed object with `title` AND (`audience` OR `key_messages`) → `'json'`; if input is a string starting with `# ` (markdown H1) → `'markdown'`; if input is `{ files: [...] }` or an array of `{path,type}` → `'files'`; if input is any other string → `'raw'`."
    - "normalizeBrief returns a canonical brief object with the same shape the existing runCreate consumes today: `{ title, audience, purpose, key_messages: string[], data_points?: object[], tone }`. Backward compat: passing the existing JSON shape returns it unchanged (with normalized field names)."
    - "For `markdown`, `raw`, and `files` shapes, normalizeBrief delegates structure extraction to an injectable extractor function (default: an LLM-driven extractor; injected via `_test_setExtractor` in tests). The default extractor uses the SAME `_test_setLlm` DI hook contract from Phase 8 — it goes through `getLlm()` so production calls real LLM and tests inject deterministic stubs."
    - "skills/create/scripts/lib/extract-doc.js exists and exports `extractDocText({path, type})` returning a Promise<string>. Supports types: `'pdf'` (uses `pdftoppm` text via system Poppler? — see action note), `'docx'` (use `unzipper` or `node:zlib` + `xml2js`-free regex extract of `word/document.xml` text nodes), `'transcript'` / `'txt'` / `'md'` (passthrough fs read). Throws `Error` with prefix `'extract-doc:'` on unsupported type."
    - "skills/create/scripts/cli.js gains 3 new flags: `--brief-text <string>` (raw shape), `--brief-md <path>` (read file as markdown), `--brief-files <comma-separated-paths>` (files shape — each path's type inferred by extension: .pdf→pdf, .docx→docx, .md→md, .txt|.transcript→transcript). Existing `--brief <path.json>` flag continues to work unchanged. Mutual-exclusion: passing more than one of {--brief, --brief-text, --brief-md, --brief-files} exits with code 2 + stderr message starting `cli: brief flags are mutually exclusive`."
    - "skills/create/scripts/index.js (runCreate) accepts the polymorphic input by passing it through normalizeBrief BEFORE the existing brief-consumption code. No other behavior change in index.js — downstream code sees the same canonical shape it always saw."
    - "All existing 909+ tests still pass (backward compat preserved)."
    - "3 new test files cover: (a) brief-normalizer detection + extractor DI; (b) extract-doc per-type; (c) cli polymorphic-brief flag wiring + mutual exclusion."
  artifacts:
    - path: "skills/create/scripts/lib/brief-normalizer.js"
      provides: "normalizeBrief, detectBriefShape, _test_setExtractor"
      contains: "_test_setExtractor"
    - path: "skills/create/scripts/lib/extract-doc.js"
      provides: "extractDocText({path,type})"
      contains: "extract-doc:"
    - path: "skills/create/scripts/cli.js"
      provides: "Polymorphic --brief-text / --brief-md / --brief-files flags + mutual exclusion"
      contains: "--brief-text"
    - path: "skills/create/scripts/index.js"
      provides: "runCreate routes input through normalizeBrief"
      contains: "normalizeBrief"
    - path: "tests/lib-brief-normalizer.test.js"
      provides: "detectBriefShape + normalizeBrief tests with extractor DI"
      contains: "_test_setExtractor"
    - path: "tests/lib-extract-doc.test.js"
      provides: "extract-doc per-type + error tests"
      contains: "extract-doc:"
    - path: "tests/cli-create-polymorphic-brief.test.js"
      provides: "CLI flag tests + mutual exclusion exit-code 2"
      contains: "mutually exclusive"
  key_links:
    - from: "skills/create/scripts/index.js"
      to: "skills/create/scripts/lib/brief-normalizer.js"
      via: "import + call normalizeBrief on input before existing brief-consumption code"
      pattern: "normalizeBrief"
    - from: "skills/create/scripts/lib/brief-normalizer.js"
      to: "skills/create/scripts/lib/llm.js (or Phase-8 _test_setLlm hook host)"
      via: "default extractor uses getLlm() — same DI contract as Phase 8"
      pattern: "getLlm|_test_setLlm"
    - from: "skills/create/scripts/cli.js"
      to: "skills/create/scripts/lib/extract-doc.js"
      via: "for --brief-files flag, cli builds {files:[{path,type}]} and runCreate routes through extractor"
      pattern: "extractDocText"
---

<objective>
Wave 2 (independent of cookbook plans): make `runCreate` accept brief input in 4 shapes — structured JSON, free-form markdown, raw text, attached files — and add CLI flags to expose all 4. The default JSON shape is unchanged (backward compat). Markdown / raw / files all flow through a normalizer that calls an LLM extractor (production) or a stubbed extractor (tests, via DI hook). This is the second half of the variety story: even if the design DNA picker rolls great visuals, identical input shape across briefs produces identical content shape — polymorphic intake breaks that.
Purpose: User's explicit second concern: "source content's structure also needs to be varied — source content were similarly structured, too." Without polymorphic intake, test methodology and real users will keep feeding the same JSON shape and outputs will keep rhyming.
Output: 2 new lib files + 2 modified entry points + 3 new tests.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/09-design-variety-and-brief-polymorphism/09-CONTEXT.md
@skills/create/scripts/index.js
@skills/create/scripts/cli.js
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Author lib/brief-normalizer.js (detection + DI hook + canonical shape)</name>
  <read_first>skills/create/scripts/index.js (read the section consuming the brief — find the canonical brief field names; the normalizer's output MUST match those exactly), skills/create/scripts/lib/llm.js (or wherever Phase 8's `getLlm()` / `_test_setLlm` lives — the new extractor reuses the same DI pattern)</read_first>
  <files>skills/create/scripts/lib/brief-normalizer.js, tests/lib-brief-normalizer.test.js</files>
  <behavior>
    - detectBriefShape({title:'X', audience:'Y', key_messages:[]}) === 'json'
    - detectBriefShape('# Title\nbody') === 'markdown'
    - detectBriefShape({files:[{path:'a.pdf',type:'pdf'}]}) === 'files'
    - detectBriefShape([{path:'a.pdf',type:'pdf'}]) === 'files'
    - detectBriefShape('plain prose with no markdown header') === 'raw'
    - normalizeBrief(jsonInput) returns the input with canonical field names (title, audience, purpose, key_messages, data_points?, tone)
    - normalizeBrief(markdownString) delegates to the injected extractor and returns its result
    - _test_setExtractor(stub) replaces the extractor; passing null restores default
    - Default extractor (when no stub) calls getLlm() with a documented prompt; in test it's swapped via _test_setExtractor
  </behavior>
  <action>Module-private mutable `currentExtractor`; `_test_setExtractor(fn)` mutates it (passing falsy restores default). `detectBriefShape(input)` returns one of the 4 string literals using the rules in must_haves. `normalizeBrief(input)` switches on shape: json → return canonicalized object (rename common variants like `key_points`→`key_messages`); markdown/raw/files → call `await currentExtractor(input, shape)` and return its result. Default extractor: imports `getLlm` from existing llm helper and calls it with a system prompt instructing extraction into the canonical shape; for `files` shape it imports `extractDocText` (from Plan 9-04 Task 2 — implemented next) and concatenates extracted texts before passing to LLM. Module exports the 3 required names. Validate canonical shape: throw `Error('brief-normalizer: missing required field "title"')` if normalized output lacks `title`.

Tests: 12+ test cases covering each detection rule; 4+ tests covering normalizeBrief with stub extractor for markdown/raw/files; 1 test for `_test_setExtractor(null)` restoring default; 1 test asserting normalizeBrief throws on extractor returning shape without title.</action>
  <verify>
    <automated>node --test tests/lib-brief-normalizer.test.js</automated>
  </verify>
  <acceptance_criteria>
    - `grep -E '^export|module.exports' skills/create/scripts/lib/brief-normalizer.js` shows normalizeBrief, detectBriefShape, _test_setExtractor exported
    - All 4 shape detection rules covered by tests
    - Test file uses `_test_setExtractor` to inject a deterministic stub (no network, no real LLM call)
    - All tests pass
  </acceptance_criteria>
  <done>Normalizer module + tests green; runCreate not yet wired (Task 4 wires it).</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Author lib/extract-doc.js (pdf/docx/txt/md/transcript text extraction)</name>
  <read_first>skills/create/scripts/lib/ — list existing files to find any current pdf/docx helpers; package.json (which deps are already available — pdf-parse? mammoth? unzipper? Use only deps already in package.json or stdlib; if NEW dep is needed, document it but prefer stdlib)</read_first>
  <files>skills/create/scripts/lib/extract-doc.js, tests/lib-extract-doc.test.js</files>
  <behavior>
    - extractDocText({path:'fixture.txt', type:'txt'}) returns the file's UTF-8 contents
    - extractDocText({path:'fixture.md', type:'md'}) returns the file's UTF-8 contents
    - extractDocText({path:'fixture.transcript', type:'transcript'}) returns the file's UTF-8 contents
    - extractDocText({path:'fixture.docx', type:'docx'}) returns concatenated text content from word/document.xml
    - extractDocText({path:'fixture.pdf', type:'pdf'}) returns extracted text (use system `pdftoppm`-style fallback OR if pdf-parse already in package.json use it; if neither available, shell out to `pdftotext` if present, otherwise throw `extract-doc: pdf extraction unavailable`)
    - extractDocText({path:'x', type:'unsupported'}) rejects with Error message starting `extract-doc:`
    - Missing file rejects with Error containing the path
  </behavior>
  <action>Function `async extractDocText({path, type})`. Switch on type. txt/md/transcript: `fs.promises.readFile(path,'utf8')`. docx: read file as buffer, use `unzipper` if available; else fallback — use `node:zlib`/`AdmZip` polyfill OR shell out to `unzip -p {path} word/document.xml` and strip XML tags via regex `/<w:t[^>]*>([^<]*)<\/w:t>/g`. pdf: prefer `pdf-parse` if installed; else exec `pdftotext -layout {path} -` and capture stdout. unsupported: throw `Error('extract-doc: unsupported type: '+type)`. Path resolution: if relative, resolve against `process.cwd()`. Export `extractDocText` only.

Tests: place fixtures in `tests/fixtures/extract-doc/` (sample.txt, sample.md, sample.docx, sample.transcript; pdf optional — skip pdf test with `t.skip()` if neither pdf-parse nor pdftotext available, but assert the error path with a synthetic missing pdf binary). Cover: 5 happy paths + 2 error paths (unsupported type, missing file).</action>
  <verify>
    <automated>node --test tests/lib-extract-doc.test.js</automated>
  </verify>
  <acceptance_criteria>
    - `grep -E 'export|module.exports' skills/create/scripts/lib/extract-doc.js` shows extractDocText exported
    - Tests cover txt, md, transcript, docx happy paths + 2 error paths
    - Pdf test either passes or is skipped via `t.skip()` with a clear reason
    - All non-skipped tests pass
  </acceptance_criteria>
  <done>extract-doc.js + tests green.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: CLI flags --brief-text / --brief-md / --brief-files + mutual exclusion</name>
  <read_first>skills/create/scripts/cli.js (full 119 lines — locate existing --brief flag parsing to mirror style)</read_first>
  <files>skills/create/scripts/cli.js, tests/cli-create-polymorphic-brief.test.js</files>
  <behavior>
    - `cli --brief-text "raw prose"` reaches runCreate with input shape detected as `'raw'`
    - `cli --brief-md path/to/file.md` reaches runCreate with markdown string read from file
    - `cli --brief-files a.pdf,b.docx` reaches runCreate with `{files:[{path:'a.pdf',type:'pdf'},{path:'b.docx',type:'docx'}]}` (type inferred from extension)
    - `cli --brief x.json --brief-text "y"` exits with code 2; stderr starts with `cli: brief flags are mutually exclusive`
    - `cli --brief x.json` (legacy single flag) still works unchanged
    - Type inference: .pdf→pdf, .docx→docx, .md→md, .txt→transcript, .transcript→transcript; unknown extension→throws `cli: cannot infer type for path: {path}` with exit 2
  </behavior>
  <action>Add the 3 new flags to existing argv parsing. Track which brief-flags were seen; if count>1, write `cli: brief flags are mutually exclusive\n` to stderr and `process.exit(2)`. For --brief-md: `fs.readFileSync(path, 'utf8')` then pass string to runCreate. For --brief-files: split on `,`, trim each, build `{path, type: inferTypeFromExt(path)}` array, pass `{files: [...]}` to runCreate. Type inference function lives in cli.js (private). Do NOT modify existing --brief behavior.

Tests: spawn cli via `node:child_process.spawnSync` with the existing test entry pattern (look at `tests/cli-*.test.js` for established style). Use `INSTADECKS_LLM_STUB` env var (Phase 8 contract) to short-circuit the actual LLM call so the cli test only verifies routing, not LLM output. Cover: 3 happy-flag paths, 1 mutual-exclusion path, 1 unknown-extension path, 1 backward-compat path with existing --brief.</action>
  <verify>
    <automated>node --test tests/cli-create-polymorphic-brief.test.js</automated>
  </verify>
  <acceptance_criteria>
    - `grep -E "'--brief-text'|'--brief-md'|'--brief-files'" skills/create/scripts/cli.js` returns 3 hits
    - `grep "mutually exclusive" skills/create/scripts/cli.js` returns ≥1
    - All 6 test cases pass
    - Existing CLI tests (`tests/cli-*.test.js` from prior phases) still pass
  </acceptance_criteria>
  <done>CLI flags wired with tests; mutual exclusion exit-code 2 enforced.</done>
</task>

<task type="auto">
  <name>Task 4: Wire normalizeBrief into runCreate (index.js)</name>
  <read_first>skills/create/scripts/index.js (full file — find where the brief is first consumed, e.g., destructured `const { title, audience, key_messages } = brief`)</read_first>
  <files>skills/create/scripts/index.js</files>
  <action>Add `import { normalizeBrief } from './lib/brief-normalizer.js';` at top. Inside runCreate, BEFORE any code that destructures or reads brief fields, replace the local `brief` variable with `const brief = await normalizeBrief(rawInput)` (where `rawInput` is whatever runCreate currently receives — rename the existing parameter if needed but keep the function signature unchanged from the caller's perspective). Constraint: existing JSON-shape callers (current 909+ tests) must see byte-identical canonical brief — the normalizer is a passthrough for the json shape. Do NOT alter ANY downstream code that reads the brief; only the input-normalization step changes.</action>
  <verify>
    <automated>npm test -- --test-name-pattern='create' 2>&1 | tail -30; grep -n 'normalizeBrief' skills/create/scripts/index.js</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c 'normalizeBrief' skills/create/scripts/index.js` returns ≥2 (one import, one call)
    - Existing create.test.js / skill-outcome/create.test.js still pass with no fixture changes
    - Full `npm test` green
  </acceptance_criteria>
  <done>runCreate routes input through normalizer; full suite stays green.</done>
</task>

</tasks>

<verification>
- 4 brief shapes detect correctly
- 3 new CLI flags work + mutual exclusion enforced
- runCreate is byte-compatible for legacy json input
- 3 new test files green; all 909+ existing tests still pass
- 100% c8 coverage gate maintained
</verification>

<success_criteria>
- DV-06 satisfied: brief-normalizer accepts 4 shapes
- DV-07 satisfied: runCreate polymorphic + CLI flags landed
- All new code under c8 100% coverage gate
</success_criteria>

<output>
After completion, create `.planning/phases/09-design-variety-and-brief-polymorphism/09-04-SUMMARY.md`.
</output>
