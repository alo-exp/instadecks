'use strict';
// extract-doc.js — Plan 9-04 Task 2.
//
// Best-effort text extraction from a small set of source-document types so
// the brief normalizer's "files" shape can feed the LLM extractor with
// concatenated prose. Pure JS + system tools (pdftotext, unzip); no new
// npm dependencies.
//
//   txt | md | transcript → fs.readFile UTF-8 passthrough
//   docx                  → unzip word/document.xml, regex-strip <w:t> nodes
//   pdf                   → shell out to pdftotext -layout {path} -
//
// All errors throw `Error` with message prefix `extract-doc:` so callers can
// fingerprint them.

const fs = require('node:fs/promises');
const path = require('node:path');
const { execFile } = require('node:child_process');

const PASSTHROUGH_TYPES = new Set(['txt', 'md', 'transcript']);

function execFileP(cmd, args, opts) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, opts || {}, (err, stdout, stderr) => {
      if (err) {
        const e = new Error(
          `extract-doc: ${cmd} failed: ${err.message}${stderr ? ' :: ' + stderr : ''}`,
        );
        e.cause = err;
        return reject(e);
      }
      resolve({ stdout, stderr });
    });
  });
}

async function extractDocText({ path: p, type } = {}) {
  if (typeof p !== 'string' || p.length === 0) {
    throw new Error('extract-doc: path required');
  }
  if (typeof type !== 'string' || type.length === 0) {
    throw new Error('extract-doc: type required');
  }
  const abs = path.isAbsolute(p) ? p : path.resolve(process.cwd(), p);

  if (PASSTHROUGH_TYPES.has(type)) {
    try {
      return await fs.readFile(abs, 'utf8');
    } catch (e) {
      throw new Error(`extract-doc: cannot read ${abs}: ${e.message}`);
    }
  }

  if (type === 'docx') {
    try {
      await fs.access(abs);
    } catch (e) {
      throw new Error(`extract-doc: cannot read ${abs}: ${e.message}`);
    }
    const { stdout } = await execFileP('unzip', ['-p', abs, 'word/document.xml']);
    // Strip <w:t> text nodes (preserve whitespace via xml:space="preserve" → ignore the attr; just capture inner text).
    const matches = stdout.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [];
    const text = matches
      .map((m) => m.replace(/<w:t[^>]*>/, '').replace(/<\/w:t>/, ''))
      .join(' ');
    return text;
  }

  if (type === 'pdf') {
    try {
      await fs.access(abs);
    } catch (e) {
      throw new Error(`extract-doc: cannot read ${abs}: ${e.message}`);
    }
    try {
      const { stdout } = await execFileP('pdftotext', ['-layout', abs, '-']);
      return stdout;
    } catch (e) {
      // Surface a clean unavailable-message when pdftotext missing.
      if (/ENOENT|not found/i.test(e.message)) {
        throw new Error('extract-doc: pdf extraction unavailable (pdftotext not installed)');
      }
      throw e;
    }
  }

  throw new Error(`extract-doc: unsupported type: ${type}`);
}

module.exports = { extractDocText };
