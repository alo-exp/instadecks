'use strict';
// Phase 6 Plan 06-01 Task 2 — extract-content.js round-trip.

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

const { extractContent } = require('../skills/content-review/scripts/lib/extract-content');

function repoRoot() { return path.join(__dirname, '..'); }

function ensurePptxgenjsPath() {
  if (!process.env.PPTXGENJS_PATH) {
    const baseDir = process.env.CLAUDE_PLUGIN_DATA || repoRoot();
    process.env.PPTXGENJS_PATH = path.join(baseDir, 'node_modules', 'pptxgenjs');
  }
}

async function buildFixturePptx(outPath) {
  ensurePptxgenjsPath();
  const PptxGenJS = require(process.env.PPTXGENJS_PATH);
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';

  // Slide 1: title slide
  const s1 = pptx.addSlide();
  s1.addText('Instadecks Demo Deck', { x: 1, y: 2, w: 11, h: 1, fontSize: 32, bold: true });

  // Slide 2: content slide with title + 3 bullets
  const s2 = pptx.addSlide();
  s2.addText('Revenue grew 40% in Q3 from enterprise renewals', { x: 0.5, y: 0.3, w: 12, h: 0.8, fontSize: 24, bold: true });
  s2.addText([
    { text: 'Enterprise ARR up 52% YoY driven by Fortune 500 expansion', options: { bullet: true } },
    { text: 'Net retention 128%; gross retention 96%', options: { bullet: true } },
    { text: 'Café experience pilots launched in EMEA region', options: { bullet: true } },
  ], { x: 0.5, y: 1.5, w: 12, h: 4, fontSize: 18 });

  // Slide 3: content slide with single bullet (long, for length test downstream)
  const s3 = pptx.addSlide();
  s3.addText('Q3 Revenue', { x: 0.5, y: 0.3, w: 12, h: 0.8, fontSize: 24, bold: true });
  s3.addText([
    { text: 'Our SaaS B2B SMB GTM motion via PLG drives ARR ACV expansion through ICP MQLs converting to SQLs at industry-leading rates per the latest BCG report', options: { bullet: true } },
  ], { x: 0.5, y: 1.5, w: 12, h: 4, fontSize: 16 });

  // Slide 4: section divider (name embeds 'Section')
  const s4 = pptx.addSlide({ sectionTitle: 'Section: Outlook' });
  s4.addText('Section: Outlook', { x: 0.5, y: 3, w: 12, h: 1, fontSize: 32, bold: true });

  // Slide 5: redundancy candidate (similar to slide 2)
  const s5 = pptx.addSlide();
  s5.addText('Revenue grew 40% in Q3 from enterprise renewals', { x: 0.5, y: 0.3, w: 12, h: 0.8, fontSize: 24, bold: true });
  s5.addText([
    { text: 'Enterprise ARR up 52% YoY driven by Fortune 500 expansion', options: { bullet: true } },
  ], { x: 0.5, y: 1.5, w: 12, h: 4, fontSize: 18 });

  // Slide 6: closing
  const s6 = pptx.addSlide();
  s6.addText('Thank You', { x: 0.5, y: 3, w: 12, h: 1, fontSize: 40, bold: true, align: 'center' });

  await pptx.writeFile({ fileName: outPath });
}

test('extractContent round-trips a 6-slide pptxgenjs fixture', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'instadecks-extract-'));
  const fixturePath = path.join(tmp, 'fixture.pptx');
  await buildFixturePptx(fixturePath);

  const out = await extractContent(fixturePath);
  assert.equal(out.slides.length, 6);

  // Slide 1 — title slide
  assert.equal(out.slides[0].slideNum, 1);
  assert.equal(out.slides[0].title, 'Instadecks Demo Deck');
  assert.equal(out.slides[0].slide_type, 'title');

  // Slide 2 — title + 3 bullets preserved (Pitfall 4 — does NOT flatten)
  assert.equal(out.slides[1].title, 'Revenue grew 40% in Q3 from enterprise renewals');
  assert.equal(out.slides[1].bullets.length, 3);
  assert.equal(out.slides[1].slide_type, 'content');
  assert.equal(out.slides[1].body, out.slides[1].bullets.join(' '));
  // Accented chars survive
  assert.ok(out.slides[1].bullets.some(b => b.includes('Café')));

  // Slide 3 — single long bullet
  assert.equal(out.slides[2].title, 'Q3 Revenue');
  assert.equal(out.slides[2].bullets.length, 1);

  // Slide 4 — section divider (cSld name embeds 'Section')
  // (pptxgenjs may or may not write cSld name="Section ..."; tolerate either)
  assert.ok(out.slides[3].title.length > 0);

  // Slide 5 — redundancy candidate (content)
  assert.equal(out.slides[4].title, 'Revenue grew 40% in Q3 from enterprise renewals');

  // Slide 6 — closing
  assert.equal(out.slides[5].title, 'Thank You');
  assert.equal(out.slides[5].slide_type, 'closing');

  // Determinism: extracted twice → identical
  const out2 = await extractContent(fixturePath);
  assert.deepEqual(out2, out);

  // Persist canonical fixture extract for downstream tests if missing
  const canonical = path.join(__dirname, 'fixtures', 'content-review', 'sample-extract.json');
  if (!fs.existsSync(canonical)) {
    fs.mkdirSync(path.dirname(canonical), { recursive: true });
    fs.writeFileSync(canonical, JSON.stringify(out, null, 2) + '\n');
  }

  // cleanup
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('extractContent throws on missing file', async () => {
  await assert.rejects(() => extractContent('/no/such/file.pptx'), /not found/);
});
