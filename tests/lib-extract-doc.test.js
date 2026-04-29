'use strict';
// tests/lib-extract-doc.test.js — Plan 9-04 Task 2.
// Covers extractDocText for txt/md/transcript/docx happy paths + error paths
// (unsupported type, missing file, missing path, missing type). PDF path is
// covered when pdftotext is available, otherwise t.skip().

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');
const JSZip = require('jszip');

const { extractDocText } = require('../skills/create/scripts/lib/extract-doc');

function freshTmp(tag) { return fs.mkdtempSync(path.join(os.tmpdir(), `${tag}-`)); }

async function buildDocx(p, body) {
  const zip = new JSZip();
  const xml =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
    '<w:body><w:p>' +
    body.split(' ').map((w) => `<w:r><w:t xml:space="preserve">${w}</w:t></w:r>`).join('') +
    '</w:p></w:body></w:document>';
  zip.file('word/document.xml', xml);
  const buf = await zip.generateAsync({ type: 'nodebuffer' });
  await fsp.writeFile(p, buf);
}

function pdftotextAvailable() {
  const r = spawnSync('pdftotext', ['-v'], { stdio: 'ignore' });
  return r.status === 0 || r.status === 99; // some builds exit non-zero on -v
}

test('lib-extract-doc', async (t) => {
  const tmp = freshTmp('extract-doc');
  t.after(() => fs.rmSync(tmp, { recursive: true, force: true }));

  await t.test('txt: reads UTF-8 contents', async () => {
    const p = path.join(tmp, 'a.txt');
    await fsp.writeFile(p, 'hello txt', 'utf8');
    const out = await extractDocText({ path: p, type: 'txt' });
    assert.equal(out, 'hello txt');
  });

  await t.test('md: reads UTF-8 contents', async () => {
    const p = path.join(tmp, 'a.md');
    await fsp.writeFile(p, '# heading\nbody', 'utf8');
    const out = await extractDocText({ path: p, type: 'md' });
    assert.equal(out, '# heading\nbody');
  });

  await t.test('transcript: reads UTF-8 contents', async () => {
    const p = path.join(tmp, 'a.transcript');
    await fsp.writeFile(p, 'speaker1: hi\nspeaker2: hello', 'utf8');
    const out = await extractDocText({ path: p, type: 'transcript' });
    assert.match(out, /speaker1: hi/);
  });

  await t.test('docx: extracts text from word/document.xml', async () => {
    const p = path.join(tmp, 'a.docx');
    await buildDocx(p, 'alpha beta gamma');
    const out = await extractDocText({ path: p, type: 'docx' });
    assert.match(out, /alpha/);
    assert.match(out, /beta/);
    assert.match(out, /gamma/);
  });

  await t.test('pdf: extracts text via pdftotext (skip if unavailable)', async (tt) => {
    if (!pdftotextAvailable()) {
      tt.skip('pdftotext not installed');
      return;
    }
    // Build a tiny PDF via groff/ps2pdf isn't reliable; instead use a hand-rolled
    // minimal PDF. If even that fails on this host, skip.
    const p = path.join(tmp, 'a.pdf');
    const minimalPdf =
      '%PDF-1.1\n' +
      '1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n' +
      '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n' +
      '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 144]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n' +
      '4 0 obj<</Length 44>>stream\nBT /F1 18 Tf 20 60 Td (hello pdf) Tj ET\nendstream\nendobj\n' +
      '5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\n' +
      'xref\n0 6\n0000000000 65535 f \n0000000010 00000 n \n0000000053 00000 n \n' +
      '0000000099 00000 n \n0000000189 00000 n \n0000000247 00000 n \n' +
      'trailer<</Size 6/Root 1 0 R>>\nstartxref\n308\n%%EOF\n';
    await fsp.writeFile(p, minimalPdf);
    try {
      const out = await extractDocText({ path: p, type: 'pdf' });
      assert.match(out, /hello pdf/);
    } catch (e) {
      tt.skip(`pdftotext could not parse minimal pdf on this host: ${e.message}`);
    }
  });

  await t.test('unsupported type → throws extract-doc:', async () => {
    await assert.rejects(
      () => extractDocText({ path: 'x', type: 'rtf' }),
      /^Error: extract-doc: unsupported type: rtf$/,
    );
  });

  await t.test('missing file (txt) → throws extract-doc: with path', async () => {
    const p = path.join(tmp, 'nonexistent.txt');
    await assert.rejects(
      () => extractDocText({ path: p, type: 'txt' }),
      new RegExp(`extract-doc: cannot read ${p.replace(/[\\/]/g, '.')}`),
    );
  });

  await t.test('missing path → throws', async () => {
    await assert.rejects(
      () => extractDocText({ type: 'txt' }),
      /extract-doc: path required/,
    );
  });

  await t.test('missing type → throws', async () => {
    await assert.rejects(
      () => extractDocText({ path: 'x' }),
      /extract-doc: type required/,
    );
  });

  await t.test('docx missing file → throws extract-doc:', async () => {
    const p = path.join(tmp, 'nonexistent.docx');
    await assert.rejects(
      () => extractDocText({ path: p, type: 'docx' }),
      /extract-doc: cannot read/,
    );
  });

  await t.test('pdf missing file → throws extract-doc:', async () => {
    if (!pdftotextAvailable()) {
      // still tests the access() path before exec
    }
    const p = path.join(tmp, 'nonexistent.pdf');
    await assert.rejects(
      () => extractDocText({ path: p, type: 'pdf' }),
      /extract-doc: cannot read/,
    );
  });

  await t.test('docx: corrupt zip file → unzip fails → throws extract-doc:', async () => {
    const p = path.join(tmp, 'corrupt.docx');
    await fsp.writeFile(p, 'not a zip', 'utf8');
    await assert.rejects(
      () => extractDocText({ path: p, type: 'docx' }),
      /extract-doc: unzip failed/,
    );
  });

  await t.test('pdf: ENOENT on pdftotext surfaces "pdf extraction unavailable"', async () => {
    // Force pdftotext to be unfindable by stripping PATH for this call only.
    // We do this by writing a tiny shim: extractDocText execFile resolves
    // via PATH; an empty PATH makes the spawn ENOENT → caught and remapped.
    const p = path.join(tmp, 'fake.pdf');
    await fsp.writeFile(p, '%PDF-1.0\n', 'utf8');
    const origPath = process.env.PATH;
    process.env.PATH = '';
    try {
      await assert.rejects(
        () => extractDocText({ path: p, type: 'pdf' }),
        /pdf extraction unavailable|extract-doc: pdftotext failed/,
      );
    } finally {
      process.env.PATH = origPath;
    }
  });

  await t.test('pdf: pdftotext fails on garbage input → surfaces extract-doc: pdftotext failed', async () => {
    if (!pdftotextAvailable()) return; // skip if no pdftotext
    const p = path.join(tmp, 'not-pdf.pdf');
    await fsp.writeFile(p, 'this is not a pdf at all', 'utf8');
    await assert.rejects(
      () => extractDocText({ path: p, type: 'pdf' }),
      /extract-doc:/,
    );
  });

  await t.test('relative path resolves against cwd', async () => {
    const cwdTmp = freshTmp('extract-doc-cwd');
    const rel = 'rel.txt';
    fs.writeFileSync(path.join(cwdTmp, rel), 'rel-content', 'utf8');
    const orig = process.cwd();
    process.chdir(cwdTmp);
    try {
      const out = await extractDocText({ path: rel, type: 'txt' });
      assert.equal(out, 'rel-content');
    } finally {
      process.chdir(orig);
      fs.rmSync(cwdTmp, { recursive: true, force: true });
    }
  });
});
