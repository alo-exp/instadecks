---
phase: 04
slug: instadecks-create-scaffold
status: draft
created: 2026-04-28
inherits_from: [04-CONTEXT.md, 04-RESEARCH.md]
---

# Phase 04 — `/instadecks:create` Scaffold — PATTERNS.md

> Per-file analog map. For each new Phase 4 file, names the closest existing file in the repo
> and points to the exact lines/blocks to mirror. Planner uses this so task-level plans can say
> "mirror skills/review/scripts/cli.js's argv-parsing block lines 12–24" without re-deriving.

**Mapped:** 2026-04-28
**New/modified files:** 18 (5 lib + 1 index + 1 cli + 1 tool + 1 SKILL body + 6 tests + 3 references/cookbook contents)
**Strong analog matches:** 16 / 18 (cookbook + design-ideas reference docs are content-only, no code analog)

---

## File Classification

| New File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `skills/create/scripts/index.js` | orchestrator (`runCreate`) | request-response (sync→async pipeline) | `skills/review/scripts/index.js` (`runReview`) | **exact** (same export shape, run-dir convention, sibling-output pattern) |
| `skills/create/scripts/cli.js` | CLI entrypoint | request-response (argv→stdout JSON) | `skills/review/scripts/cli.js` | **exact** (same argv-parser, same exit-code ladder, same `mode:'standalone'` call) |
| `skills/create/scripts/lib/deck-brief.js` | schema validator | transform (validate object → throw or return true) | `skills/review/scripts/lib/schema-validator.js` | **exact** (hand-rolled validator, pinpoint error format) |
| `skills/create/scripts/lib/design-validator.js` | guard / linter | transform (input → `{ok, violations[]}`) | `skills/review/scripts/ai-tells.js` (deterministic-rules detector) | **role-match** (rules-engine emits violation list; same constants-at-top + per-rule-fn shape) |
| `skills/create/scripts/lib/enum-lint.js` | guard (regex over generated cjs) | transform (string → throw or pass) | `tools/lint-paths.sh` (CI regex gate) | **role-match** (different language; same job: regex-find banned literals, fail loudly) |
| `skills/create/scripts/lib/title-check.js` | guard (blocked-words + heuristic) | transform (title string → `{ok, reason?}`) | `skills/review/scripts/lib/schema-validator.js` (constants-at-top + single exported `validate`) | **partial** (validator-shape; smaller surface) |
| `skills/create/scripts/lib/render-rationale.js` | template renderer (pure) | transform (designChoices+brief → markdown) | `skills/review/scripts/render-fixed.js` | **exact** (pure no-fs/no-clock function returning byte-stable markdown; section-by-section composition) |
| `tools/lint-pptxgenjs-enums.js` | CI gate (regex over render-deck.cjs) | batch (scan tracked files → fail) | `tools/lint-paths.sh` + `tools/validate-manifest.js` | **role-match** (lint-paths.sh = regex shape; validate-manifest.js = Node CLI shape with `errors[]` accumulator) |
| `tests/POWERPOINT-COMPATIBILITY.md` | manual checklist (markdown) | doc | _no analog — Phase 7 release artifact_ | n/a |
| `tests/create-runtime.test.js` | integration test | test | `tests/review-runtime.test.js` | **exact** |
| `tests/create-cookbook-recipes.test.js` | snapshot/regression test | test | `tests/review-render-fixed.test.js` (snapshot pattern) | **exact** |
| `tests/create-enum-lint.test.js` | unit test (regex gate) | test | `tests/path-lint.test.js` (spawnSync against gate) | **exact** (temp-repo / temp-dir + spawnSync to exercise the gate) |
| `tests/create-title-check.test.js` | unit test (pure validator) | test | `tests/review-ai-tells.test.js` (positive/negative subtests) + schema-validator tests | **role-match** |
| `tests/create-design-validator.test.js` | unit test (rules engine) | test | `tests/review-ai-tells.test.js` | **exact** (positive/negative fixture pattern + per-rule subtest) |
| `tests/create-integration.test.js` | end-to-end | test | `tests/review-integration.test.js` | **exact** (lazy-require, run-dir mirror, CLI subprocess subtest) |
| `skills/create/SKILL.md` body | agent prompt | doc | `skills/review/SKILL.md` body | **exact** |
| `skills/create/references/cookbook.md` + `cookbook/*.md` | reference docs | doc | _no analog — content-only_ | n/a |
| `skills/create/references/design-ideas.md` + `.json` | reference docs | doc | _no analog — content-only_ | n/a |

---

## Pattern Assignments

### `skills/create/scripts/index.js` (orchestrator)

**Analog:** `skills/review/scripts/index.js` (134 lines)
**Mirror these blocks verbatim (rename `runReview`→`runCreate`, `findings`→`brief`):**

| Block to mirror | Lines in analog | New file's adaptation |
|---|---|---|
| File header banner (purpose, mode-gating, run-dir, P-01/P-07 invariant call-outs) | 1–9 | Replace P-01/P-07 references with: "Phase 5 will add auto-refine; this file ships single-cycle only." |
| `'use strict'` + node-builtin requires (`path`, `fs/promises`, `crypto`) | 11–14 | Identical. Add `child_process.spawnSync` for the `node render-deck.cjs` execution. |
| `generateRunId()` | 16–22 | **Verbatim.** Same `YYYYMMDD-HHMMSS-<6hex>` regex contract (Phase 2 D-01). |
| `resolveSiblingOutputs(deckPath)` | 24–33 | Adapt: returns `{ deckPath, pdfPath, rationalePath }` (deterministic filenames `deck.pptx`, `deck.pdf`, `design-rationale.md` per CONTEXT inherited locked decisions — output dir IS the run dir, not "sibling of input"). |
| `runReview({...} = {})` signature + arg validation throws | 58–70 | Mirror shape. Required args: `brief` (validated by `deck-brief.js`), `runId`, `outDir`, `mode`, `designChoices` (D-08). Throws on missing/invalid mode same way. |
| Schema validation call (`validate(findings)`) | 73 | Replace with `validateBrief(brief)` from `lib/deck-brief.js`. |
| Run-dir resolution (`outDir = outDir ? path.resolve : path.join(cwd,'.planning','instadecks',runId)`) | 76–80 | **Verbatim.** Same convention. |
| `mkdir({recursive:true})` | 80 | Identical. |
| Deterministic JSON write + run-dir mirror pattern | 85–88 | Adapt: write `brief.json`, `render-deck.cjs` (agent-authored — see SKILL.md body), invoke `node render-deck.cjs` via `spawnSync` with `cwd: outDir`, env `NODE_PATH=${CLAUDE_PLUGIN_DATA}/node_modules`, capture stdout/stderr. |
| Lazy-require pattern + test override hook (P-07 mirror) | 53–56, 102–106 | Use to lazy-require pptxgenjs (NOT at module-load — only inside the spawned cjs). Plus a `_test_setSpawn(fn)` test hook for the integration test to bypass spawning real node. |
| Build & return result object; mode-gated `console.log` | 108–127 | Same shape. Result keys: `{deckPath, pdfPath, rationalePath, runDir, runId, slidesCount, warnings: []}`. |
| `module.exports` block | 129–134 | Same: `runCreate, generateRunId, resolveSiblingOutputs, _test_setSpawn`. |

**Key code to copy (analog lines 16–22, generateRunId):**
```js
function generateRunId() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  const ts = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`
           + `-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  return `${ts}-${crypto.randomBytes(3).toString('hex')}`;
}
```

**Key code to copy (analog lines 76–80, run-dir resolution):**
```js
runId = runId || generateRunId();
outDir = outDir
  ? path.resolve(outDir)
  : path.join(process.cwd(), '.planning', 'instadecks', runId);
await fsp.mkdir(outDir, { recursive: true });
```

---

### `skills/create/scripts/cli.js` (CLI)

**Analog:** `skills/review/scripts/cli.js` (53 lines) — mirror near-verbatim.

**Mirror map:**

| Block | Lines | Adaptation |
|---|---|---|
| Shebang + `'use strict'` + header banner | 1–6 | Replace skill name; usage string lists `--brief <path>` instead of `--findings`. |
| Node-builtin requires + `runCreate` import | 8–10 | Identical pattern. |
| `parseArgs(argv)` | 12–24 | **Verbatim shape**, change keys: `{ briefPath, runId, outDir }`. Drop `--annotate` (Phase 5). Add `--design-choices <path>` (optional JSON file with `{palette, typography, motif}`). |
| `main()` async fn | 26–51 | **Verbatim shape.** Exit codes locked: missing positional arg → 1, missing `--brief` → 2, runtime error → 3 (ladder mirrored). Read brief JSON via `fs.readFileSync(path.resolve(args.briefPath),'utf8')`. |
| `main().catch(...)` trailer | 53 | Verbatim. |

**Key code to copy (analog lines 12–24, argv parser):**
```js
function parseArgs(argv) {
  const args = { deckPath: null, findings: null, runId: null, outDir: null, annotate: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--findings') { args.findings = argv[++i]; }
    else if (a === '--run-id') { args.runId = argv[++i]; }
    else if (a === '--out-dir') { args.outDir = argv[++i]; }
    else if (a === '--annotate') { args.annotate = true; }
    else if (!a.startsWith('--') && !args.deckPath) { args.deckPath = a; }
    else { throw new Error(`cli.js: unrecognized argument "${a}"`); }
  }
  return args;
}
```

**Key code to copy (analog lines 38–50, exit ladder + run call):**
```js
if (!args.findings) {
  console.error('cli.js: --findings <path> required ...');
  process.exit(2);
}
const findings = JSON.parse(fs.readFileSync(path.resolve(args.findings), 'utf8'));
await runReview({ deckPath: ..., runId: ..., outDir: ..., mode: 'standalone', findings, annotate: ... });
```

---

### `skills/create/scripts/lib/deck-brief.js` (schema validator)

**Analog:** `skills/review/scripts/lib/schema-validator.js` (89 lines) — **exact** structural match.

**Mirror map:**

| Block | Lines | Adaptation |
|---|---|---|
| Header banner naming the schema source-of-truth | 1–5 | Source-of-truth: `skills/create/references/deck-brief-schema.md` (or inlined JSDoc typedef per CONTEXT D-01). Same "hand-rolled per RESEARCH §Don't-Hand-Roll" language. |
| Constants-at-top: required-fields arrays + Sets | 7–13 | New constants: `REQUIRED_BRIEF_FIELDS = ['topic','audience','tone','narrative_arc','key_claims','asset_hints','source_files']`; `NON_EMPTY_STRING_FIELDS = ['topic','audience','tone']`; `TONE_VALUES` if we lock vocabulary (else free string). |
| `validate(doc)` opening: object/null guard, schema_version check, required string fields | 15–33 | Mirror identically; replace `deck`/`generated_at`/`slides` with `topic`/`audience`/`narrative_arc`. |
| Per-finding loop with pinpoint where-string `slides[i].findings[j].field` | 35–82 | Adapt: per-`narrative_arc` beat loop + per-`key_claims` loop. Where-string pattern: `narrative_arc[${i}]: ...` and `key_claims[${i}].claim: ...`. |
| Number-range / non-empty-string field validation idiom | 70–80 | Verbatim idiom. Use for `key_claims[i].slide_idx` (integer ≥ 1), `key_claims[i].claim` (non-empty string). |
| `module.exports = { validate, _internal: {...} }` | 86–89 | Verbatim. Export `validateBrief` (renamed for callsite clarity). |

**Key idiom to copy (analog lines 56–60, required-field check):**
```js
for (const key of REQUIRED_FINDING_FIELDS) {
  if (!Object.prototype.hasOwnProperty.call(f, key)) {
    throw new Error(`${where}: missing required field "${key}"`);
  }
}
```

---

### `skills/create/scripts/lib/design-validator.js` (rules engine)

**Analog:** `skills/review/scripts/ai-tells.js` (179 lines) — **role-match** (rules engine emitting violation list with constants-at-top + per-rule fn).

**Mirror map:**

| Block | Lines | Adaptation |
|---|---|---|
| Header banner enumerating heuristics + rationale | 1–17 | Re-purpose: list 3 guardrails — (1) default-blue palette guard (CONTEXT D-04 #1); (2) typography pair must exist in pinned `design-ideas.json` 8-pair list (D-04 #2); (3) IBM Plex Sans default-body warning (D-04 #3). |
| `DEFAULT_BLUES` Set constant + numeric thresholds at top | 22–30 | **Verbatim** for `DEFAULT_BLUES` Set (literally same hex list — same R18 anti-tell). Add: `BLUE_OVERRIDE_KEYWORDS = ['corporate blue', ...]`. Load `TYPOGRAPHY_PAIRS` array from `references/design-ideas.json` at module top. |
| Per-rule function returning a finding-shaped object (or null) | `detectDefaultBluePalette` 32–59 | Mirror shape exactly. Returns `{ violation_code, severity, message, fix }` instead of `severity_reviewer/category/genuine` (different consumer — design-rationale doc, not findings doc). |
| Rules-aggregator main fn | `detectAITells` 160–167 | Mirror as `validateDesignChoice({palette, typography, brief}) => {ok, violations[]}`. Each rule pushed in order; `ok = violations.length === 0`. |
| `module.exports` with `_internal: {detectFn1, detectFn2, ...}` for testability | 169–179 | **Verbatim pattern** — exposes individual rules to unit tests. |

**Key code to copy (analog lines 22–24, palette constants — used verbatim):**
```js
const DEFAULT_BLUES = new Set([
  '0070C0', '1F4E79', '2E75B6', '4472C4', '5B9BD5', '8FAADC',
]);
```

**Key code to copy (analog lines 169–179, exports for testability):**
```js
module.exports = {
  detectAITells,
  DEFAULT_BLUES,
  _internal: {
    detectDefaultBluePalette,
    detectAccentLineUnderTitle,
    /* ... */
  },
};
```

---

### `skills/create/scripts/lib/enum-lint.js` (regex gate, runtime)

**Analog:** `tools/lint-paths.sh` (50 lines) — same job (regex-find banned literals, fail loudly), different language.

**Mirror map (semantic, not line-by-line — it's bash → js):**

| Concept | Analog ref | Adaptation |
|---|---|---|
| Single regex defining banned pattern | lint-paths.sh line 40: `'/Users/\|~/\.claude\|/home/\|C:\\\\\\\\'` | New JS regex: `/addShape\s*\(\s*['"`][A-Za-z_]+['"`]/g` (catches string-literal shape names; ENUM form `pres.shapes.X` doesn't match). |
| Allow-marker for legitimate occurrences | line 42: `lint-allow:hardcoded-path` comment | New marker: `// enum-lint-allow` on offending line. |
| Loud-fail format | line 46: `echo "::error::..."` then exit 1 | Throw `Error('enum-lint: render-deck.cjs uses string-literal shape name on line N: <excerpt> (use pres.shapes.X)')`. |
| Pure-fn surface | bash script is a CLI | Export `enumLint(cjsSource, {filename}) => {ok, violations:[{line, excerpt}]}`; `runCreate` calls it pre-spawn and throws on violation. |

**Key shape (analog lint-paths.sh lines 39–43, mirror the "find / filter exemptions / report" pipeline):**
```bash
HITS=$(... | xargs -0 grep -HInE 'PATTERN' 2>/dev/null \
  | grep -vE 'EXEMPT_PATHS' \
  | grep -v 'ALLOW_MARKER' \
  || true)
if [ -n "$HITS" ]; then echo "::error::..." ; exit 1; fi
```
JS equivalent: `source.split('\n').forEach((line,i)=>{ if (PATTERN.test(line) && !ALLOW_MARKER.test(line)) violations.push({line:i+1, excerpt:line}) })`.

---

### `skills/create/scripts/lib/title-check.js` (action-title heuristic)

**Analog:** `skills/review/scripts/lib/schema-validator.js` (89 lines) — same surface (`{ok, reason?}` validator).

**Mirror map:**

| Block | Lines | Adaptation |
|---|---|---|
| Constants-at-top: blocked-words Set | analog: `SEVERITIES`, `CATEGORIES` (lines 7–8) | New: `BLOCKED_TITLES = new Set(['overview','introduction','outline','agenda','summary','conclusion','q&a','thank you','background'])` per CONTEXT D-06. |
| Single exported validator returning structured result | analog `validate(doc)` line 15 | `validateTitle(title, {allowOverride=false} = {}) => {ok: boolean, reason?: string}`. |
| Pinpoint reason string format | analog line 62: `must be one of {...} (got X)` | Same format: `"title is in blocked-words list (got "Overview"); use action-title or pass {action_title_override: true}"`. |
| `module.exports` line 86–89 | | Verbatim. |

---

### `skills/create/scripts/lib/render-rationale.js` (pure template renderer)

**Analog:** `skills/review/scripts/render-fixed.js` (235 lines) — **exact** structural match.

**Mirror map:**

| Block | Lines | Adaptation |
|---|---|---|
| Header banner: "pure deterministic", "no fs / no async / no clock" | 1–10 | Verbatim claim. Same byte-stability guarantee for snapshot tests. |
| Section-render functions, one per fixed section | `renderSection1`–`renderSection5` 79–197 | Replace with: `renderPalette`, `renderTypography`, `renderMotif`, `renderNarrativeArc`, `renderKeyTradeoffs`, `renderReviewerNotes` per CONTEXT D-07 fixed template. |
| Top-level `render(doc)` joining sections with `'\n\n'` and trailing `'\n'` | 199–221 | **Verbatim shape** — same join idiom: `[header, sec1, sec2, ...].join('\n\n') + '\n'`. |
| `_internal` exports for per-section unit-testability | 223–235 | Verbatim pattern. |

**Key code to copy (analog lines 199–221, top-level render shape):**
```js
function render(findingsDoc) {
  if (!findingsDoc || typeof findingsDoc !== 'object') {
    throw new Error('render: findingsDoc must be an object');
  }
  // ... compute helpers ...
  const header = [
    `# Design Review — ${findingsDoc.deck}`,
    '',
    `> Generated ${findingsDoc.generated_at} ...`,
  ].join('\n');
  return [header, renderSection1(...), renderSection2(...), ...].join('\n\n') + '\n';
}
```

For `render-rationale.js`, mirror exactly with `# Design Rationale — ${brief.topic}` header and CONTEXT D-07 sections.

---

### `tools/lint-pptxgenjs-enums.js` (CI gate, Node CLI)

**Analog (primary — Node CLI shape):** `tools/validate-manifest.js` (198 lines)
**Analog (secondary — regex/exemption logic):** `tools/lint-paths.sh` (50 lines)

**Mirror map:**

| Block | Source line | Adaptation |
|---|---|---|
| Shebang `#!/usr/bin/env node` + header banner naming what it gates | validate-manifest.js 1–9 | "tools/lint-pptxgenjs-enums.js — String-literal shape lint (CRT-15 / Phase 4 D-05 layer 1)." |
| `'use strict'` + builtin requires + constants block | validate-manifest.js 10–18 | Same pattern. New constants: `BANNED_RE = /addShape\s*\(\s*['"`][A-Za-z_]+['"`]/g`, `ALLOW_MARKER = /enum-lint-allow/`. |
| `main()` with `errors[]` accumulator pattern | validate-manifest.js 20+ | **Verbatim accumulator pattern.** Iterate over `git ls-files`-discovered `**/render-deck.cjs` and any tracked file under `skills/create/references/cookbook/`; for each, scan for banned regex; push to `errors[]`. |
| `finish(errors)` exit-1-on-any pattern | validate-manifest.js end | Same. |
| Exemption list | lint-paths.sh line 41 | Skip `tests/fixtures/`, `node_modules/`, files containing `enum-lint-allow` on the offending line. |

**Wire-up:** Add to `npm test` chain alongside `lint-paths.sh` and `validate-manifest.js`.

**Reuse:** Internally, this CLI calls `enumLint()` from `skills/create/scripts/lib/enum-lint.js` so the static (CI) and runtime gates share one regex.

---

### `tests/POWERPOINT-COMPATIBILITY.md` (manual checklist)

No code analog. Write a short Markdown checklist mirroring the structural shape of `tests/fixtures/sample-findings.json` documentation in spirit (deterministic per-slide rows). Sections:
- Test deck list (the 8 slide types).
- PowerPoint Mac column / PowerPoint Windows column / Keynote column / LibreOffice column.
- Open / no-warning / fonts-render / charts-render / shapes-render boolean rows.

This file is **created** in Phase 4, **executed** by a human in Phase 7. Per CONTEXT D-05 layer 3.

---

### `tests/create-runtime.test.js` (integration, runReview + cli)

**Analog:** `tests/review-runtime.test.js` (201 lines) — **exact**.

**Mirror map (mostly verbatim, rename API):**

| Subtest in analog | Lines | Mirror |
|---|---|---|
| Header banner naming what's covered (RVW-04/05/07/08) | 1–4 | "Covers CRT-01..CRT-06 happy path; runCreate validation; CLI exit ladder." |
| Builtin requires + import target script | 5–12 | Same shape. Import `runCreate, generateRunId, resolveSiblingOutputs` from `skills/create/scripts/index`. |
| `freshTmpDir(tag)` helper | 18 | Verbatim. |
| `loadCanonical()` — load fixture from `tests/fixtures/sample-brief.json` | 20–22 | New fixture: `tests/fixtures/sample-brief.json` (a valid `DeckBrief`). |
| Pure subtest: missing required arg throws | 25–38 | Mirror — assert `runCreate({})` rejects `/brief required/`, `runCreate({brief:...})` rejects … etc. |
| Pure subtest: `generateRunId` regex | 40–42 | Verbatim — same regex `/^\d{8}-\d{6}-[0-9a-f]{6}$/`. |
| Pure subtest: `resolveSiblingOutputs` | 44–50 | Adapt — outputs are run-dir-relative deterministic filenames: `{deckPath:'<dir>/deck.pptx', pdfPath:'<dir>/deck.pdf', rationalePath:'<dir>/design-rationale.md'}`. |
| Validation rejects bad input | 52–68 | Mirror — mutate brief to violate schema; assert reject. |
| Writes outputs + run-dir mirror | 70–95 | Mirror; assert deck.pptx + deck.pdf + design-rationale.md exist with size > 0. **NOTE:** real spawn of `node render-deck.cjs` may need a stubbed cjs in the temp dir, OR test uses `_test_setSpawn` hook. |
| Mode gating: standalone prints stdout, structured-handoff doesn't | 97–144 | Verbatim pattern (same `process.stdout.write` capture trick). |
| CLI happy path (`spawnSync` against `cli.js`) | 169–188 | Mirror; check exit 0 + JSON parse. |
| CLI exit ladder (1, 2) | 190–200 | Mirror — assert `status === 1` for missing positional, `status === 2` for missing `--brief`. |

**Key idiom to copy (analog lines 107–117, stdout-capture):**
```js
const origWrite = process.stdout.write.bind(process.stdout);
let captured = '';
process.stdout.write = (chunk, ...rest) => {
  captured += typeof chunk === 'string' ? chunk : chunk.toString();
  return origWrite(chunk, ...rest);
};
try { await runReview({...}); } finally { process.stdout.write = origWrite; }
```

---

### `tests/create-cookbook-recipes.test.js`

**Analog:** `tests/review-render-fixed.test.js` (137 lines) — snapshot/property-test pattern.

**Mirror map:**

| Subtest in analog | Lines | Mirror |
|---|---|---|
| Snapshot vs locked baseline | 47–56 | For each cookbook recipe in `references/cookbook/*.md`, parse the JS code block, syntax-check via `new Function(snippet)` (or `vm.compileFunction`), assert no string-literal `addShape('X', ...)` patterns. |
| Determinism: 5 calls byte-identical | 58–65 | Adapt — render of a smoke-test brief 5× via `runCreate({mode:'structured-handoff'})` produces identical `design-rationale.md`. |
| §5 cap-at-N regression | 103–115 | Adapt — assert each recipe file is < N KB and contains both DO and DON'T sections per CONTEXT D-03. |

---

### `tests/create-enum-lint.test.js`

**Analog:** `tests/path-lint.test.js` (171 lines) — **exact** (temp-repo + spawnSync pattern).

**Mirror map:**

| Subtest in analog | Lines | Mirror |
|---|---|---|
| `makeTempRepo()` + `commitAll(repo, msg)` helpers (hermetic git via `-c user.email=...`) | 30–47 | **Verbatim helpers** — copy entire file's helper block. |
| `runLint(repo)` via `spawnSync('bash', [LINT_SCRIPT], {cwd: repo})` | 49–52 | Adapt: `spawnSync('node', [ENUM_LINT_SCRIPT], {cwd: repo})`. |
| "clean repo passes" | 60–66 | Mirror — repo with a `render-deck.cjs` using `pres.shapes.OVAL` exits 0. |
| "banned pattern in source fails" | 68–74 | Mirror — `addShape('rect', ...)` exits 1; output contains filename. |
| "fixture exemption" | 95–101 | Mirror — `tests/fixtures/render-deck.cjs` with banned literal is exempt. |
| "`enum-lint-allow` marker exempts line" | 122–144 | Mirror — line containing `// enum-lint-allow` passes. |
| Runtime variant (lib/enum-lint.js direct call) | _new_ | Add a direct-import subtest: `enumLint('addShape("rect", ...)') -> {ok: false, violations: [...]}`; `enumLint('addShape(pres.shapes.RECTANGLE, ...)') -> {ok: true}`. |

**Key idiom to copy (analog lines 30–35, makeTempRepo):**
```js
function makeTempRepo() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'enum-lint-'));
  const r = spawnSync('git', ['init', '-q'], { cwd: tmp });
  if (r.status !== 0) throw new Error('git init failed: ' + r.stderr);
  return tmp;
}
```

---

### `tests/create-title-check.test.js`

**Analog:** `tests/review-ai-tells.test.js` (90 lines) — positive/negative subtest pattern.

**Mirror map:**

- "blocked words rejected" subtest: each of the 9 blocked words → `validateTitle(w).ok === false`.
- "action title accepted": `validateTitle('Q3 revenue grew 23% on enterprise expansion').ok === true`.
- "override flag bypasses" subtest: `validateTitle('Thank You', {allowOverride: true}).ok === true`.
- "< 3 words rejected": `validateTitle('Big news').ok === false`.

---

### `tests/create-design-validator.test.js`

**Analog:** `tests/review-ai-tells.test.js` (90 lines) — **exact** (positive/negative fixture per rule + P-01-style `_internal` per-rule subtests).

**Mirror map:**

| Subtest in analog | Mirror |
|---|---|
| "positive fixture: all 3 heuristics fire" | Positive design choice (`palette = office-blues, typography = arial/calibri`) → 2+ violations (default-blue + non-curated typography). |
| "negative fixture: zero heuristics fire" | Negative (`palette = bespoke per-brief, typography = pinned pair`) → 0 violations. |
| "every emitted finding has r18_ai_tell + 4-tier" | Adapt → "every violation has `violation_code` from pinned set + `severity in {hard,soft,warn}`". |
| `_internal.detect*` direct call subtests | Mirror — each rule fn callable in isolation via `_internal`. |

---

### `tests/create-integration.test.js`

**Analog:** `tests/review-integration.test.js` (199 lines) — **exact** (lazy-require, run-dir mirror, CLI subprocess subtest).

**Mirror map:**

| Subtest | Lines | Mirror |
|---|---|---|
| Header banner (closes integration ribbon for CRT-01..06) | 1–13 | "Closes integration ribbon for CRT-01/02/03/04/05/06/15." |
| `makeTmpDeck()` / `makeTmpOut()` / `rmrf()` helpers | 30–44 | **Verbatim** (rename `makeTmpDeck` to `makeTmpRunDir`). |
| End-to-end happy path: validateBrief → runCreate(structured) → assert outputs exist + counts shape | 90–141 | Mirror. Use the canonical sample brief from `tests/fixtures/sample-brief.json`; assert deck.pptx is a valid PK-zip (magic bytes `PK\x03\x04`); assert deck.pdf is a valid PDF (`%PDF`); assert design-rationale.md contains all 6 D-07 section headers. |
| `_test_setSpawn` stub subtest (no real LibreOffice spawn in unit test) | 143–170 | Mirror P-07 lazy-require → use new `_test_setSpawn` hook to substitute the cjs-execution step with a stub that writes fake outputs. |
| Standalone CLI subprocess (RVW-07 → CRT analog) | 172–188 | Verbatim shape with `cli.js` and `--brief` flag. |
| Render-rationale determinism cross-check | 190–199 | Mirror — assert `render-rationale.js` output matches a locked snapshot. |

**Key idiom to copy (analog lines 22, 152, lazy-require test override):**
```js
const { runReview, _test_setRunAnnotate } = require('../skills/review/scripts/index');
// in test:
_test_setRunAnnotate(async ({deckPath}) => ({ pptxPath: ..., pdfPath: ... }));
t.after(() => _test_setRunAnnotate(null));
```

---

### `skills/create/SKILL.md` body

**Analog:** `skills/review/SKILL.md` (read in research phase — already a Phase 1 stub for `create`; full body in this phase).

**Mirror sections (per Phase 3 SKILL.md structure):**
- Activation criteria (when to invoke `/instadecks:create`).
- Input modes enumeration (CONTEXT D-01: md/txt/pptx/pdf/url/image/transcript/freeform/multi-file) with per-mode "use Read / WebFetch / pdftotext via Bash" instructions.
- Pipeline narration: ingest → DeckBrief → palette+typography selection (call `validateDesignChoice`) → compose render-deck.cjs from cookbook → call `runCreate({mode:'standalone'})` → author design-rationale.md.
- Locked invariants for the agent: ENUM constants only; action titles only; per-run cjs (no fixed template).

---

### `skills/create/references/cookbook.md` + `cookbook/*.md`

No code analog. CONTENT-only. Per CONTEXT D-03: master `cookbook.md` + 9 sub-files (`title.md`, `section.md`, `2col.md`, `comparison.md`, `data-chart.md`, `data-table.md`, `stat-callout.md`, `quote.md`, `closing.md`). Each: setup boilerplate, DO example using `pres.shapes.X` ENUM, DON'T anti-pattern, action-title placeholder.

---

### `skills/create/references/design-ideas.md` + `design-ideas.json`

No code analog. Re-bundled from Anthropic's bundled `pptx` skill (per CONTEXT Q-1, NOTICE attribution required). 10 palettes, 8 typography pairings, 10 anti-patterns. The `.json` is the machine-readable form consumed by `lib/design-validator.js` at module-load.

---

## Shared Patterns (cross-cutting)

### Lazy-require for optional pipelines (P-07 idiom)

**Source:** `skills/review/scripts/index.js` lines 53–56, 102–106
**Apply to:** `skills/create/scripts/index.js` (the `node render-deck.cjs` spawn — wrap in `_test_setSpawn` test override; never resolve pptxgenjs at module-load — only at spawn time inside the cjs file).

```js
let _runAnnotateOverride = null;
function _test_setRunAnnotate(fn) { _runAnnotateOverride = fn; }
// ...later, at the gated branch:
const runAnnotate = _runAnnotateOverride
  || require('../../annotate/scripts').runAnnotate;
```

### Hand-rolled validator pattern (no ajv/joi/zod)

**Source:** `skills/review/scripts/lib/schema-validator.js` whole file
**Apply to:** `lib/deck-brief.js`, `lib/title-check.js`. Constants-at-top, single exported `validate*()` fn, pinpoint error message `path.to.field: detail (got X)`, hand-rolled — no schema lib dep.

### Constants-at-top + per-rule fn + `_internal` exports (rules engine)

**Source:** `skills/review/scripts/ai-tells.js` lines 22–30, 169–179
**Apply to:** `lib/design-validator.js`, `lib/enum-lint.js`. Per-rule function in isolation, aggregator main fn, `_internal` for unit-test reach-through.

### Run-dir + sibling-output convention (Phase 2 D-01 inheritance)

**Source:** `skills/review/scripts/index.js` lines 24–33, 76–80
**Apply to:** `skills/create/scripts/index.js`. **Same** `generateRunId`, **same** `path.join(cwd, '.planning', 'instadecks', runId)` default, **same** `mkdir({recursive:true})`. CONTEXT difference: `runCreate` writes to the run dir directly (deterministic filenames `deck.pptx` / `deck.pdf` / `design-rationale.md`); does NOT mirror to a sibling-of-input location (no input pptx).

### Pure-renderer determinism contract

**Source:** `skills/review/scripts/render-fixed.js` (whole file)
**Apply to:** `lib/render-rationale.js`. No fs, no async, no clock. Snapshot-testable. `render(input)` is byte-stable across calls and across a 1.1s gap.

### CI gate accumulator (`errors[]` + `finish(errors)`)

**Source:** `tools/validate-manifest.js` lines 20+
**Apply to:** `tools/lint-pptxgenjs-enums.js`. Accumulate violations, exit 1 if any.

### Hermetic temp-repo test pattern

**Source:** `tests/path-lint.test.js` lines 30–47 (helpers)
**Apply to:** `tests/create-enum-lint.test.js`. `git init -q` + `git -c user.email=... -c user.name=... commit` so CI needs no git-identity prelude.

### Stdout-capture for mode-gating tests

**Source:** `tests/review-runtime.test.js` lines 107–117
**Apply to:** `tests/create-runtime.test.js`. Same `process.stdout.write = patch; ... try { ... } finally { restore }`.

---

## No Analog Found

| File | Reason | Planner action |
|---|---|---|
| `tests/POWERPOINT-COMPATIBILITY.md` | Phase 7 manual-checklist artifact; nothing parallel ships in Phase 1–3 | Use RESEARCH `Q-3` answer to size the OOXML/checklist columns; structurally a fresh markdown table. |
| `skills/create/references/cookbook.md` + `cookbook/*.md` | Content-only reference docs; no Phase 1–3 analog. | Use RESEARCH §pptxgenjs cookbook synthesis directly — these files ARE the spec, not derivatives. |
| `skills/create/references/design-ideas.md` + `.json` | Re-bundled from Anthropic `pptx` skill; canonical source identified in research Q-1. | Verbatim re-bundle + NOTICE attribution. |

---

## Metadata

**Analog search scope:** `skills/review/`, `skills/annotate/`, `tools/`, `tests/`
**Files read (single pass each):**
- `skills/review/scripts/index.js` (134 lines)
- `skills/review/scripts/cli.js` (53 lines)
- `skills/review/scripts/lib/schema-validator.js` (89 lines)
- `skills/review/scripts/lib/read-deck-xml.js` (44 lines)
- `skills/review/scripts/ai-tells.js` (179 lines)
- `skills/review/scripts/render-fixed.js` (235 lines)
- `tools/lint-paths.sh` (50 lines)
- `tools/validate-manifest.js` (60 lines / 198 total — head only)
- `tests/review-runtime.test.js` (201 lines)
- `tests/review-render-fixed.test.js` (137 lines)
- `tests/review-ai-tells.test.js` (90 lines)
- `tests/review-integration.test.js` (199 lines)
- `tests/path-lint.test.js` (171 lines)

**Pattern extraction date:** 2026-04-28
