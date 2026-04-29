'use strict';
// tests/cookbook-large-fontsize-shrink.test.js — Iter2 Fix #4.
// Any code block in cookbook/*.md that uses fontSize >= 120 in slide.addText
// MUST include both fit: 'shrink' and autoFit: true within the same options
// object — otherwise hero numerals wrap and bleed off-slide.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const COOKBOOK = path.join(__dirname, '..', 'skills', 'create', 'references', 'cookbook');

function listMd() {
  return fs.readdirSync(COOKBOOK).filter(f => f.endsWith('.md'));
}

function* extractCodeBlocks(md) {
  const re = /```javascript\n([\s\S]*?)```/g;
  let m;
  while ((m = re.exec(md)) !== null) yield m[1];
}

function* extractAddTextOptionObjects(code) {
  // Find each `slide.addText(<arg1>, { ... })` second-arg object literal.
  // Best-effort brace-matched scan: locate "addText(", then advance to the
  // last top-level `, {` and walk braces.
  const re = /slide\.addText\s*\(/g;
  let m;
  while ((m = re.exec(code)) !== null) {
    let i = m.index + m[0].length;
    let depth = 1;
    let optsStart = -1;
    while (i < code.length && depth > 0) {
      const c = code[i];
      if (c === '(') depth++;
      else if (c === ')') { depth--; if (depth === 0) break; }
      else if (c === '{' && depth === 1 && optsStart === -1) optsStart = i;
      i++;
    }
    if (optsStart >= 0) {
      // Walk from optsStart to find matching close brace (depth on { only).
      let bd = 0;
      let j = optsStart;
      for (; j < code.length; j++) {
        const c = code[j];
        if (c === '{') bd++;
        else if (c === '}') { bd--; if (bd === 0) { j++; break; } }
      }
      yield code.slice(optsStart, j);
    }
  }
}

test('cookbook: every fontSize ≥ 120 addText options-block includes fit: shrink + autoFit: true', () => {
  const offenders = [];
  for (const file of listMd()) {
    const md = fs.readFileSync(path.join(COOKBOOK, file), 'utf8');
    for (const block of extractCodeBlocks(md)) {
      for (const opts of extractAddTextOptionObjects(block)) {
        const fsMatch = opts.match(/fontSize\s*:\s*(\d+)/);
        if (!fsMatch) continue;
        const size = Number(fsMatch[1]);
        if (size < 120) continue;
        const hasShrink = /fit\s*:\s*['"]shrink['"]/.test(opts);
        const hasAutoFit = /autoFit\s*:\s*true/.test(opts);
        if (!hasShrink || !hasAutoFit) {
          offenders.push(`${file}: fontSize ${size} missing ${
            !hasShrink ? "fit:'shrink' " : ''}${!hasAutoFit ? 'autoFit:true' : ''}`);
        }
      }
    }
  }
  assert.equal(offenders.length, 0,
    `cookbook fontSize ≥ 120 violations:\n  - ${offenders.join('\n  - ')}`);
});
