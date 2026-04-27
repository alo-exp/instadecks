'use strict';
// tools/normalize-pptx-sha.js — Shared normalizer used by both
// tests/annotate-visual-regression.test.js (Tier 1 assertion) and the one-off
// baseline-regeneration script (tools/regenerate-normalized-baseline.js).
//
// Locked normalization rules (bumping these invalidates
// tests/fixtures/v8-reference/Annotations_Sample.pptx.normalized.sha256):
//   1. Entry order: sort by entry name.
//   2. `docProps/core.xml`: replace <dcterms:created>...</dcterms:created> and
//      <dcterms:modified>...</dcterms:modified> with empty content (tags retained).
//   3. Any descr="..." attribute whose value contains a path separator is rewritten
//      to the basename only (strips the per-run absolute path that pptxgenjs
//      serializes from annotate.js's path.join(__dirname, ...) image-loading pattern).
//   4. Concatenation format: tag + name + length(uint32 BE) + bytes + sep, hashed via SHA-256.
//
// See Plan 02-04 SUMMARY §"Architectural changes (Rule 4)" for rationale.

const fs = require('node:fs');
const crypto = require('node:crypto');
const JSZip = require('jszip');

async function normalizedShaOfPptx(pptxPath) {
  const buf = fs.readFileSync(pptxPath);
  const zip = await JSZip.loadAsync(buf);
  const names = Object.keys(zip.files).sort();

  const hash = crypto.createHash('sha256');
  for (const name of names) {
    const file = zip.files[name];
    if (file.dir) {
      hash.update(`DIR\0${name}\0`);
      continue;
    }
    let bytes = await file.async('nodebuffer');

    if (name === 'docProps/core.xml') {
      const xml = bytes.toString('utf8')
        .replace(/<dcterms:created[^>]*>[^<]*<\/dcterms:created>/g, '<dcterms:created></dcterms:created>')
        .replace(/<dcterms:modified[^>]*>[^<]*<\/dcterms:modified>/g, '<dcterms:modified></dcterms:modified>');
      bytes = Buffer.from(xml, 'utf8');
    } else if (/^ppt\/slides\/slide\d+\.xml$/.test(name)) {
      const xml = bytes.toString('utf8').replace(/descr="([^"]*)"/g, (_m, value) => {
        const idx = Math.max(value.lastIndexOf('/'), value.lastIndexOf('\\'));
        const basename = idx >= 0 ? value.slice(idx + 1) : value;
        return `descr="${basename}"`;
      });
      bytes = Buffer.from(xml, 'utf8');
    }

    const lenBuf = Buffer.alloc(4);
    lenBuf.writeUInt32BE(bytes.length, 0);
    hash.update(`FILE\0${name}\0`);
    hash.update(lenBuf);
    hash.update(bytes);
    hash.update('\0');
  }
  return hash.digest('hex');
}

module.exports = { normalizedShaOfPptx };
