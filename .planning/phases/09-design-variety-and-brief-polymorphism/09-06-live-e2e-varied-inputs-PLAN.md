---
plan: 09-06
phase: 09
slug: live-e2e-varied-inputs
status: ready
created: 2026-04-28
wave: 3
depends_on: [09-01, 09-02, 09-03, 09-04, 09-05]
autonomous: true
files_modified:
  - tests/e2e/varied-inputs/v1-structured-json.test.js
  - tests/e2e/varied-inputs/v2-markdown-narrative.test.js
  - tests/e2e/varied-inputs/v3-raw-transcript.test.js
  - tests/e2e/varied-inputs/v4-one-line-ask.test.js
  - tests/e2e/varied-inputs/v5-research-paper.test.js
  - tests/e2e/varied-inputs/v6-photo-captions.test.js
  - tests/e2e/visual-diversity.test.js
  - tests/e2e/varied-inputs/fixtures/v1-brief.json
  - tests/e2e/varied-inputs/fixtures/v2-brief.md
  - tests/e2e/varied-inputs/fixtures/v3-transcript.txt
  - tests/e2e/varied-inputs/fixtures/v4-ask.txt
  - tests/e2e/varied-inputs/fixtures/v5-paper.md
  - tests/e2e/varied-inputs/fixtures/v6-captions.md
  - skills/create/SKILL.md
requirements: [DV-10, DV-11, DV-12]

must_haves:
  truths:
    - "6 new E2E test files exist under `tests/e2e/varied-inputs/`, one per input shape: V1 structured-json, V2 markdown-narrative, V3 raw-transcript, V4 one-line-ask, V5 research-paper, V6 photo-captions."
    - "Each E2E test invokes the FULL pipeline: /instadecks:create → /instadecks:review → /instadecks:annotate via the existing CLI entry points (mirrors Phase 8 live E2E pattern from `tests/e2e/`)."
    - "Tests run only when `CI=true` is unset (local-only — same convention as Phase 8 live E2E per CONTEXT D-08); under CI they are skipped via `t.skip()` to keep CI green and deterministic."
    - "tests/e2e/visual-diversity.test.js runs after the 6 varied-input tests and asserts: pairwise perceptual-hash diff across the 6 output PPTX files (rendered to PNG via existing pdftoppm pipeline) ≥80% layout/palette variation. FAIL if any 2 of the 6 decks share the same palette+typography+motif triple (extracted from each run's design-rationale.md)."
    - "Visual-diversity check uses a deterministic rule: read each run's `.planning/instadecks/<run-id>/design-rationale.md`, extract palette name + typography pair name + motif name, build a Set; if Set.size < 6 (i.e., any duplicate triple) → fail."
    - "Perceptual-hash check uses `sharp` if available else falls back to a simple downsampled grayscale histogram diff threshold; threshold: average pairwise distance ≥0.20 across the 6×6/2 = 15 pairs."
    - "skills/create/SKILL.md gains a 1-paragraph `## Output contract for varied input shapes` section documenting that runs from json/markdown/raw/files inputs ALL produce the same artifact shape: deck.pptx, deck.pdf, design-rationale.md, findings.json, annotated.pptx."
    - "2 consecutive clean live E2E runs required for DV-11 sign-off. Plan execution itself only proves the harness — the 2 clean runs are an OPS verification step (documented in the plan's SUMMARY but executed by the developer when plan completes)."
    - "DV-12: 100% c8 coverage maintained; all 909+ existing tests still pass."
    - "6 fixture files match their input shape (V1=json, V2=markdown w/ H1, V3=raw transcript Speaker A/B, V4=single-sentence string in .txt, V5=academic abstract markdown, V6=5 captioned images markdown)."
  artifacts:
    - path: "tests/e2e/varied-inputs/v1-structured-json.test.js"
      provides: "V1 backward-compat E2E"
      contains: "structured-json"
    - path: "tests/e2e/varied-inputs/v2-markdown-narrative.test.js"
      provides: "V2 markdown-narrative E2E"
      contains: "--brief-md"
    - path: "tests/e2e/varied-inputs/v3-raw-transcript.test.js"
      provides: "V3 raw-transcript E2E"
      contains: "--brief-text"
    - path: "tests/e2e/varied-inputs/v4-one-line-ask.test.js"
      provides: "V4 one-line ask E2E"
      contains: "--brief-text"
    - path: "tests/e2e/varied-inputs/v5-research-paper.test.js"
      provides: "V5 research-paper E2E"
      contains: "--brief-md"
    - path: "tests/e2e/varied-inputs/v6-photo-captions.test.js"
      provides: "V6 photo-captions E2E"
      contains: "--brief-md"
    - path: "tests/e2e/visual-diversity.test.js"
      provides: "Pairwise perceptual + design-DNA diversity gate"
      contains: "design-rationale"
    - path: "skills/create/SKILL.md"
      provides: "Output contract section for varied input shapes"
      contains: "Output contract for varied input shapes"
  key_links:
    - from: "tests/e2e/visual-diversity.test.js"
      to: ".planning/instadecks/<run-id>/design-rationale.md"
      via: "reads each of 6 run dirs after E2E pipeline + extracts palette/typography/motif names + asserts 6 distinct triples"
      pattern: "design-rationale"
    - from: "tests/e2e/varied-inputs/*.test.js"
      to: "skills/create/scripts/cli.js"
      via: "spawnSync('node', ['skills/create/scripts/cli.js', ...flags])"
      pattern: "spawnSync"
---

<objective>
Wave 3 (final): prove Phase 9 by running 6 live E2E rounds with structurally-different input shapes and asserting cross-deck visual diversity. The visual-diversity gate is the hard quantitative check — if any 2 of 6 decks share the same palette+typography+motif triple, the phase has not actually delivered variety.
Purpose: Without this verification, the prior 5 plans land but we have no evidence that the agent actually USES the libraries / variants / picker — agents could ignore SKILL.md directives. Live E2E is the ground truth.
Output: 6 E2E test files + 1 visual-diversity gate + 6 fixtures + SKILL.md output-contract section.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/09-design-variety-and-brief-polymorphism/09-CONTEXT.md
@.planning/phases/08-test-coverage-100/08-06-smoke-and-e2e-runner-PLAN.md
@.planning/phases/08-test-coverage-100/08-07-ci-gate-and-signoff-PLAN.md
@skills/create/SKILL.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Author the 6 input fixtures + 6 E2E test files</name>
  <read_first>tests/e2e/ — list any existing E2E tests from Phase 8 to mirror runner pattern (process.env.CI gating, run-dir cleanup, artifact-existence assertions)</read_first>
  <files>tests/e2e/varied-inputs/fixtures/v1-brief.json, tests/e2e/varied-inputs/fixtures/v2-brief.md, tests/e2e/varied-inputs/fixtures/v3-transcript.txt, tests/e2e/varied-inputs/fixtures/v4-ask.txt, tests/e2e/varied-inputs/fixtures/v5-paper.md, tests/e2e/varied-inputs/fixtures/v6-captions.md, tests/e2e/varied-inputs/v1-structured-json.test.js, tests/e2e/varied-inputs/v2-markdown-narrative.test.js, tests/e2e/varied-inputs/v3-raw-transcript.test.js, tests/e2e/varied-inputs/v4-one-line-ask.test.js, tests/e2e/varied-inputs/v5-research-paper.test.js, tests/e2e/varied-inputs/v6-photo-captions.test.js</files>
  <action>
Fixtures (each must match its shape literally — these drive `detectBriefShape` to return the expected enum):
- v1-brief.json: `{"title":"Q3 enterprise growth review","audience":"executive","purpose":"quarterly review","key_messages":["Net revenue up 23% YoY","Enterprise tier drove 67% of growth","Pipeline coverage at 3.2×"],"data_points":[{"label":"Q3 NRR","value":"118%"},{"label":"Enterprise ARR","value":"$48M"}],"tone":"executive-confident"}`
- v2-brief.md: `# Why Pacific Northwest grocers are switching to plant-based dairy\n\nThis market has shifted in 18 months...` (≥200 words of prose narrative; H1 title; no field labels — pure narrative; audience is implicit "grocery-buying executives", tone is "trade-press analytical")
- v3-transcript.txt: `Speaker A: So the question is whether we ship the migration in Q4 or punt to Q1.\nSpeaker B: ...` (≥40 turns of meeting transcript style; topic = engineering migration go/no-go decision)
- v4-ask.txt: a SINGLE sentence: `Make a deck for the Tuesday board meeting about the Q2 numbers.`
- v5-paper.md: academic abstract H1 + abstract paragraph + 2 markdown tables of data + Methods/Results subsections (~300 words; topic = a synthetic but plausible empirical paper, e.g., "Effect of asynchronous standups on team throughput")
- v6-captions.md: H1 `# Field report: Lagos street-food vendors` + 5 numbered sections each with `![alt text](placeholder-N.jpg)` and a 2-sentence caption.

Test files: each test file follows this pattern:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const SKIP_REASON = 'live E2E — local only (CI=true unset)';

test('V<N>: <shape> end-to-end /create → /review → /annotate', { skip: process.env.CI === 'true' ? SKIP_REASON : false }, async (t) => {
  const runId = `e2e-v<N>-${Date.now()}`;
  const fixturePath = path.resolve('tests/e2e/varied-inputs/fixtures/v<N>-...');
  // 1. /instadecks:create with the appropriate flag (--brief / --brief-md / --brief-text / --brief-files)
  const create = spawnSync('node', ['skills/create/scripts/cli.js', '<flag>', '<value>', '--run-id', runId], { encoding:'utf8' });
  assert.equal(create.status, 0, `create failed: ${create.stderr}`);
  // 2. assert artifacts: deck.pptx, design-rationale.md
  const runDir = path.join('.planning/instadecks', runId);
  assert.ok(fs.existsSync(path.join(runDir,'deck.pptx')), 'deck.pptx missing');
  assert.ok(fs.existsSync(path.join(runDir,'design-rationale.md')), 'design-rationale.md missing');
  // 3. /instadecks:review
  const review = spawnSync('node', ['skills/review/scripts/cli.js', '--run-id', runId], { encoding:'utf8' });
  assert.equal(review.status, 0);
  assert.ok(fs.existsSync(path.join(runDir,'findings.json')));
  // 4. /instadecks:annotate
  const ann = spawnSync('node', ['skills/annotate/scripts/cli.js', '--run-id', runId], { encoding:'utf8' });
  assert.equal(ann.status, 0);
  assert.ok(fs.existsSync(path.join(runDir,'annotated.pptx')));
});
```
Use the correct flag per shape: V1 `--brief fixtures/v1-brief.json`, V2 `--brief-md fixtures/v2-brief.md`, V3 `--brief-text "$(cat ...)"` (read fixture into a JS string and pass as flag value), V4 same as V3, V5 `--brief-md fixtures/v5-paper.md`, V6 `--brief-md fixtures/v6-captions.md`.

Each test file MUST contain the literal shape name string (`structured-json`, `markdown-narrative`, `raw-transcript`, `one-line-ask`, `research-paper`, `photo-captions`) somewhere in its source for the visual-diversity test to discover them.
  </action>
  <verify>
    <automated>node -e "const fs=require('fs');const tests=['v1-structured-json','v2-markdown-narrative','v3-raw-transcript','v4-one-line-ask','v5-research-paper','v6-photo-captions'];for(const t of tests){const p='tests/e2e/varied-inputs/'+t+'.test.js';if(!fs.existsSync(p))throw new Error('missing '+p);const c=fs.readFileSync(p,'utf8');if(!c.includes('process.env.CI'))throw new Error(t+': missing CI gate');if(!c.includes('--run-id'))throw new Error(t+': missing --run-id flag')}const fixtures=['v1-brief.json','v2-brief.md','v3-transcript.txt','v4-ask.txt','v5-paper.md','v6-captions.md'];for(const f of fixtures){if(!fs.existsSync('tests/e2e/varied-inputs/fixtures/'+f))throw new Error('missing fixture '+f)}console.log('OK')"</automated>
  </verify>
  <acceptance_criteria>
    - 6 test files exist
    - 6 fixture files exist
    - Each test file gates on `process.env.CI === 'true'`
    - Each test file uses `--run-id` and asserts `deck.pptx`, `design-rationale.md`, `findings.json`, `annotated.pptx` artifacts exist
  </acceptance_criteria>
  <done>6 E2E tests + 6 fixtures land; tests skip cleanly under CI; structure verified.</done>
</task>

<task type="auto">
  <name>Task 2: Visual-diversity gate test + SKILL.md output-contract section</name>
  <read_first>tests/e2e/varied-inputs/*.test.js (just-shipped — confirm runId convention so the diversity test can discover the 6 run dirs), skills/create/SKILL.md</read_first>
  <files>tests/e2e/visual-diversity.test.js, skills/create/SKILL.md</files>
  <action>
visual-diversity.test.js: runs after the 6 varied-input tests (file-naming order ensures node --test runs it last alphabetically — `visual-diversity.test.js` > `varied-inputs/v6-...`). Skips under CI same as the 6 E2E tests. Logic:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const SKIP_REASON = 'live E2E — local only (CI=true unset)';

test('visual-diversity gate across V1..V6 runs', { skip: process.env.CI === 'true' ? SKIP_REASON : false }, async () => {
  // 1. Discover the 6 most-recent run-dirs whose ID starts with 'e2e-v1' .. 'e2e-v6'
  const runs = fs.readdirSync('.planning/instadecks').filter(d => /^e2e-v[1-6]-\d+$/.test(d));
  // group by version, pick most-recent per version
  const byVer = {};
  for (const r of runs) {
    const v = r.match(/^e2e-(v[1-6])-/)[1];
    if (!byVer[v] || r > byVer[v]) byVer[v] = r;
  }
  const versions = ['v1','v2','v3','v4','v5','v6'];
  for (const v of versions) {
    assert.ok(byVer[v], `no e2e run found for ${v} — run all 6 V<N> tests first`);
  }

  // 2. Extract palette/typography/motif triple per run
  const triples = versions.map(v => {
    const r = byVer[v];
    const md = fs.readFileSync(path.join('.planning/instadecks', r, 'design-rationale.md'),'utf8');
    const palette = (md.match(/Palette:\s*([^\n]+)/) || [,'unknown'])[1].trim();
    const typography = (md.match(/Typography:\s*([^\n]+)/) || [,'unknown'])[1].trim();
    const motif = (md.match(/Motif:\s*([^\n]+)/) || [,'unknown'])[1].trim();
    return `${palette}|${typography}|${motif}`;
  });

  // 3. Assert all 6 triples distinct
  const uniq = new Set(triples);
  assert.equal(uniq.size, 6, `expected 6 distinct palette+typography+motif triples, got ${uniq.size}: ${JSON.stringify(triples)}`);
});
```

The design-rationale.md format MUST therefore expose `Palette: <name>`, `Typography: <name>`, `Motif: <name>` lines — this is enforced by the SKILL.md design-DNA picker step (Plan 9-03) which already instructs the agent to record the rolled DNA in design-rationale.md. If those lines are missing, the test fails — that IS the diversity gate (no DNA recording = test failure).

SKILL.md edit: append (or insert near the existing artifact-listing section) a new H2 EXACTLY:
```
## Output contract for varied input shapes

Regardless of input shape (structured JSON, markdown narrative, raw text, attached files), every /instadecks:create run produces the same artifacts under `.planning/instadecks/<run-id>/`:

- `deck.pptx` — the rendered presentation
- `deck.pdf` — PDF render via soffice
- `design-rationale.md` — MUST include lines `Palette: <name>`, `Typography: <name>`, `Motif: <name>` so downstream tooling (review, annotate, diversity gate) can read the rolled design DNA
- `findings.json` — populated by /instadecks:review (empty until review runs)
- `annotated.pptx` — populated by /instadecks:annotate
```
  </action>
  <verify>
    <automated>node -e "const fs=require('fs');const t=fs.readFileSync('tests/e2e/visual-diversity.test.js','utf8');if(!t.includes('design-rationale'))throw new Error('diversity test missing design-rationale read');if(!t.includes('process.env.CI'))throw new Error('diversity test missing CI gate');if(!/Palette:|Typography:|Motif:/.test(t))throw new Error('diversity test missing DNA triple regex');const s=fs.readFileSync('skills/create/SKILL.md','utf8');if(!s.includes('Output contract for varied input shapes'))throw new Error('SKILL.md missing output contract section');for(const line of ['Palette: <name>','Typography: <name>','Motif: <name>']){if(!s.includes(line))throw new Error('SKILL.md output contract missing: '+line)}console.log('OK')"</automated>
  </verify>
  <acceptance_criteria>
    - tests/e2e/visual-diversity.test.js exists with CI gate + DNA triple extraction logic
    - Test asserts `uniq.size === 6` (all 6 distinct)
    - SKILL.md has H2 `## Output contract for varied input shapes`
    - SKILL.md output contract specifies `Palette: <name>`, `Typography: <name>`, `Motif: <name>` lines
  </acceptance_criteria>
  <done>Diversity gate + output contract land; structure verified.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 3: 2 consecutive clean live E2E runs sign-off</name>
  <what-built>6 E2E tests + visual-diversity gate from Tasks 1-2. CI runs are gated to skip; LOCAL runs (CI unset) execute the full pipeline against the live LLM.</what-built>
  <how-to-verify>
    Run the full live E2E suite TWICE consecutively (no code changes between runs):

    ```bash
    # Run 1
    rm -rf .planning/instadecks/e2e-v*
    npx node --test tests/e2e/varied-inputs/*.test.js tests/e2e/visual-diversity.test.js

    # Run 2 (no changes between runs)
    rm -rf .planning/instadecks/e2e-v*
    npx node --test tests/e2e/varied-inputs/*.test.js tests/e2e/visual-diversity.test.js
    ```

    Expected: BOTH runs green (all 7 tests pass — 6 varied-inputs + 1 diversity gate). Visually inspect the 6 deck.pptx outputs to confirm:
    1. Each deck looks visually distinct (different palette / typography / motif)
    2. No deck defaults to verdant-steel + Plex Serif + underline-accent
    3. Each deck's design-rationale.md has the 3 DNA lines populated

    Also run the full unit suite + c8 gate:
    ```bash
    npm test
    npx c8 --reporter=text-summary node --test
    ```
    Expected: 909+ tests green, 100% lines/branches/funcs/stmts.

    Report any of the following as defects:
    - Two decks share palette+typography+motif (diversity gate fails)
    - design-rationale.md missing one of the 3 DNA lines
    - Any deck looks visually like Phase 1-7 v8 BluePrestige output
    - c8 coverage drops below 100%
  </how-to-verify>
  <resume-signal>Type "approved — 2 consecutive clean rounds" to close DV-11. If defects found, describe them — Plan 9-06 reopens for revision OR a follow-up gap-closure plan is filed.</resume-signal>
</task>

</tasks>

<verification>
- 6 E2E tests + 6 fixtures + visual-diversity gate land
- SKILL.md output-contract section present
- Local 2-clean-rounds verification confirms DV-10 + DV-11
- 909+ unit tests still green; c8 100% maintained (DV-12)
</verification>

<success_criteria>
- DV-10 satisfied: 6 live E2E rounds with structurally-varied inputs + ≥80% pairwise visual diversity
- DV-11 satisfied: 2 consecutive clean live E2E rounds (no new defects)
- DV-12 satisfied: 100% c8 coverage maintained; 909+ existing tests pass
</success_criteria>

<output>
After completion, create `.planning/phases/09-design-variety-and-brief-polymorphism/09-06-SUMMARY.md` documenting:
- The 2 clean-round timestamps + commit hashes
- The 6 distinct DNA triples observed
- Any visual-diversity edge cases worth recording for v1.x
</output>
