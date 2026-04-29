'use strict';
// tests/create-cookbook-recipes.test.js — Plan 04-02 reference layer gate.
// Asserts:
//   1. Every cookbook recipe md has a JS code-fence that passes lib/enum-lint
//      and Function-instantiates a callable render<Type> against mock pres.
//   2. design-ideas.json round-trips through lib/design-validator: every
//      (palette × typography_pair) cross-product validates.
//   3. Cookbook hygiene: every recipe md has a DO/DON'T table + addNotes call.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { lintCjs } = require('../skills/create/scripts/lib/enum-lint');
const { validateDesignChoice } = require('../skills/create/scripts/lib/design-validator');

const RECIPES = ['title', 'section', '2col', 'comparison', 'data-chart', 'data-table', 'stat-callout', 'quote', 'closing'];

function recipeFnName(slug) {
  // title→Title, section→Section, 2col→2Col, comparison→Comparison,
  // data-chart→DataChart, data-table→DataTable, stat-callout→StatCallout,
  // quote→Quote, closing→Closing
  const map = {
    'title': 'Title',
    'section': 'Section',
    '2col': '2Col',
    'comparison': 'Comparison',
    'data-chart': 'DataChart',
    'data-table': 'DataTable',
    'stat-callout': 'StatCallout',
    'quote': 'Quote',
    'closing': 'Closing',
  };
  return map[slug];
}

function extractAllJsCodeFences(md) {
  const re = /```javascript\n([\s\S]*?)\n```/g;
  const out = [];
  let m;
  while ((m = re.exec(md)) !== null) out.push(m[1]);
  if (out.length === 0) throw new Error('no JS code-fence');
  return out;
}

const COOKBOOK_DIR = path.join(__dirname, '..', 'skills', 'create', 'references', 'cookbook');

for (const recipe of RECIPES) {
  test(`recipe ${recipe}: code-fence parses + uses ENUM constants`, () => {
    const md = fs.readFileSync(path.join(COOKBOOK_DIR, `${recipe}.md`), 'utf8');
    const codes = extractAllJsCodeFences(md);
    // Plan 9-02 introduced ≥3 variants per recipe (renderTitleA, renderTitleB, …);
    // verify EACH variant code-fence lints clean and instantiates as a callable.
    const baseFn = `render${recipeFnName(recipe)}`;
    const fnRe = new RegExp(`function\\s+(${baseFn}[A-E])\\s*\\(`);
    let variantsChecked = 0;
    for (const code of codes) {
      const fnMatch = code.match(fnRe);
      if (!fnMatch) continue; // skip non-variant code-fences (none expected, but be tolerant)
      const fnName = fnMatch[1];
      // Layer 2 enum-lint pass per variant:
      lintCjs(code, { filename: `${recipe}.md (${fnName})` });
      // Sandboxed callable check: wrap in factory + call with mock pres.
      const factory = new Function(
        'pres', 'PALETTE', 'TYPE', 'W', 'H', 'MARGIN_X', 'MARGIN_Y', 'TITLE_Y', 'TITLE_H', 'FOOTER_Y', 'addFooter',
        `${code}\n; return ${fnName};`
      );
      const mockPres = {
        shapes: new Proxy({}, { get: () => 'ENUM_STUB' }),
        charts: new Proxy({}, { get: () => 'CHART_STUB' }),
      };
      const PALETTE = { primary: '111111', secondary: '222222', accent: 'FFFFFF', ink: '000000', muted: '888888' };
      const TYPE = { heading: 'IBM Plex Sans', body: 'IBM Plex Sans', mono: 'IBM Plex Mono' };
      const fn = factory(mockPres, PALETTE, TYPE, 10, 5.625, 0.5, 0.4, 0.3, 0.7, 5.325, () => {});
      assert.equal(typeof fn, 'function', `${fnName} must be a function`);
      variantsChecked += 1;
    }
    assert.ok(variantsChecked >= 3, `${recipe}: expected ≥3 variant code-fences, got ${variantsChecked}`);
  });
}

test('design-ideas.json round-trips through validateDesignChoice', () => {
  const di = JSON.parse(fs.readFileSync(
    path.join(__dirname, '..', 'skills', 'create', 'references', 'design-ideas.json'), 'utf8'
  ));
  const sampleBrief = JSON.parse(fs.readFileSync(
    path.join(__dirname, 'fixtures', 'sample-brief.json'), 'utf8'
  ));
  assert.equal(di.palettes.length, 10, 'expect 10 palettes');
  assert.equal(di.typography_pairs.length, 8, 'expect 8 typography pairs');
  for (const palette of di.palettes) {
    for (const typography of di.typography_pairs) {
      const r = validateDesignChoice({ palette, typography, brief: sampleBrief, designIdeas: di });
      assert.equal(
        r.ok, true,
        `palette=${palette.name} pair=${typography.heading}+${typography.body}: ${JSON.stringify(r.violations)}`
      );
    }
  }
});

test("every recipe md has DO/DON'T table + addNotes call", () => {
  for (const recipe of RECIPES) {
    const md = fs.readFileSync(path.join(COOKBOOK_DIR, `${recipe}.md`), 'utf8');
    assert.match(md, /## DO \/ DON'T/, `${recipe}.md missing DO/DON'T heading`);
    assert.match(md, /addNotes/, `${recipe}.md missing addNotes call`);
  }
});

test('palette names in design-ideas.md match design-ideas.json', () => {
  const md = fs.readFileSync(
    path.join(__dirname, '..', 'skills', 'create', 'references', 'design-ideas.md'), 'utf8'
  );
  const di = JSON.parse(fs.readFileSync(
    path.join(__dirname, '..', 'skills', 'create', 'references', 'design-ideas.json'), 'utf8'
  ));
  for (const p of di.palettes) {
    assert.match(md, new RegExp(`\\*\\*${p.name}\\*\\*`), `design-ideas.md missing palette name "${p.name}"`);
  }
});

// FIX MINOR #4: cookbook.md "Setup boilerplate" snippet declares all symbols it
// references — including `brief`. Previously the snippet did `pres.title = brief.topic`
// without a `brief` declaration, so a copy-paste into render-deck.cjs would throw
// `ReferenceError: brief is not defined` before any slide could be rendered.
test('cookbook.md setup boilerplate declares all referenced top-level symbols', () => {
  const cookbookPath = path.join(__dirname, '..', 'skills', 'create', 'references', 'cookbook.md');
  const md = fs.readFileSync(cookbookPath, 'utf8');
  // Extract the FIRST javascript code-fence (the setup boilerplate).
  const m = md.match(/```javascript\n([\s\S]*?)\n```/);
  assert.ok(m, 'cookbook.md missing setup boilerplate code-fence');
  const code = m[1];
  // The boilerplate must declare `brief` before referencing it.
  assert.match(code, /(?:const|let|var)\s+brief\s*=/,
    'cookbook.md setup boilerplate references `brief` without declaring it (BLOCKER for copy-paste use)');
  // Smoke-parse: the snippet must be syntactically valid JS (Function ctor will throw on parse error).
  // We supply the brief.json read as a stub so __dirname/fs are mockable.
  const stubFs = {
    readFileSync: () => JSON.stringify({ topic: 'Test', title: 'Test', audience: 'x', narrative: 'y' }),
  };
  // eslint-disable-next-line no-new-func
  const factory = new Function('require', '__dirname', `${code}\n; return { brief, pres };`);
  const fakeRequire = (mod) => {
    if (mod === 'pptxgenjs') return function () { return { layout: '', author: '', title: '' }; };
    if (mod === 'node:fs') return stubFs;
    if (mod === 'node:path') return { join: (...args) => args.join('/') };
    throw new Error(`unexpected require: ${mod}`);
  };
  const result = factory(fakeRequire, '/fake/dir');
  assert.ok(result.brief, 'boilerplate must produce a `brief` binding');
  assert.equal(typeof result.brief, 'object', '`brief` must be an object');
});
