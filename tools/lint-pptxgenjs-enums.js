#!/usr/bin/env node
'use strict';
// tools/lint-pptxgenjs-enums.js — Layer-1 CI gate for CRT-15 / D-05 / HARD-01.
// Walks tracked source under skills/ and tests/fixtures/ for two violation forms:
//   1. /addShape\s*\(\s*['"]\w+['"]/ — string-literal addShape (CRT-15).
//   2. /pres\.shapes\.([A-Z_][A-Z0-9_]*)/ — typo'd ShapeType key (HARD-01),
//      e.g. `pres.shapes.RECT` instead of `pres.shapes.RECTANGLE`.
//
// Exit 0 on clean; exit 1 with file:line on violation.
// Aligned with skills/create/scripts/lib/enum-lint.js (Layer 2 runtime gate).

const fs = require('node:fs');
const path = require('node:path');

const ROOTS = ['skills', 'tests/fixtures'];
const EXTS = new Set(['.js', '.cjs', '.md']);
const RE = /addShape\s*\(\s*['"](\w+)['"]/;
const SHAPES_RE = /\bpres\.shapes\.([A-Z_][A-Z0-9_]*)/g;
const ALLOW_MARKER = /enum-lint-allow/;

// HARD-01: derive valid ShapeType keys at lint-script load time so a future
// pptxgenjs version bump auto-updates the canonical key set. pptxgenjs 4.0.1
// exposes the shapes object on instance, not the constructor — we instantiate
// once. Filter to UPPER_SNAKE keys (the canonical names users reference); the
// camelCase aliases are not the form we lint against.
function deriveShapeKeys() {
  try {
    const Pptx = require('pptxgenjs');
    const inst = new Pptx();
    /* c8 ignore next */ // Defensive: pptxgenjs 4.0.1 always exposes inst.shapes; the `|| {}` is a safety net for future major bumps.
    const all = Object.keys(inst.shapes || {});
    return new Set(all.filter((k) => /^[A-Z][A-Z0-9_]*$/.test(k)));
  /* c8 ignore next 3 */ // Defensive: pptxgenjs is a hard prod dep; require() only fails in pre-install bootstrap.
  } catch (e) {
    return new Set();
  }
}
const VALID_SHAPE_KEYS = deriveShapeKeys();

// Levenshtein distance — small DP, used for suggesting the closest valid key.
function lev(a, b) {
  /* c8 ignore next 3 */ // Defensive: callers always pass distinct non-empty strings (bad token vs valid key); these short-circuits cover edge inputs.
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const m = a.length, n = b.length;
  const dp = new Array(n + 1);
  for (let j = 0; j <= n; j++) dp[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      if (a[i - 1] === b[j - 1]) {
        dp[j] = prev;
      } else {
        dp[j] = 1 + Math.min(prev, dp[j], dp[j - 1]);
      }
      prev = tmp;
    }
  }
  return dp[n];
}

function suggestKey(bad) {
  /* c8 ignore next */ // Defensive: lint flow checks size===0 before calling suggestKey; this guard covers direct callers.
  if (VALID_SHAPE_KEYS.size === 0) return null;
  // Prefer keys that START WITH the bad token (typical truncation typos like
  // RECT→RECTANGLE, RECT_ROUND→ROUND_RECT). Fall back to global Levenshtein.
  let bestPrefix = null;
  let bestPrefixLen = Infinity;
  let best = null;
  let bestDist = Infinity;
  for (const k of VALID_SHAPE_KEYS) {
    if (k.startsWith(bad) && k.length < bestPrefixLen) {
      bestPrefixLen = k.length;
      bestPrefix = k;
    }
    const d = lev(bad, k);
    if (d < bestDist) { bestDist = d; best = k; }
  }
  if (bestPrefix && (bestPrefixLen - bad.length) <= 6) return bestPrefix;
  return bestDist <= 3 ? best : null;
}

// Allow-list: file paths exempt from this lint.
// - tests/fixtures/bad-render-deck.cjs: intentional negative fixture for
//   skills/create/scripts/lib/enum-lint.js tests.
// - tests/fixtures/lint-typo-shape.cjs: HARD-01 negative fixture.
// - skills/annotate/scripts/annotate.js: SHA-pinned binary asset per
//   CLAUDE.md locked invariants (verbatim from v5-blue-prestige). Cannot
//   be modified to add inline allow-markers.
const ALLOW = new Set([
  path.join('tests', 'fixtures', 'bad-render-deck.cjs'),
  path.join('tests', 'fixtures', 'lint-typo-shape.cjs'),
  path.join('skills', 'annotate', 'scripts', 'annotate.js'),
]);

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      walk(p, out);
    } else if (EXTS.has(path.extname(ent.name))) {
      out.push(p);
    }
  }
  return out;
}

function main() {
  const cwd = process.cwd();
  const files = ROOTS.flatMap(r => walk(path.join(cwd, r)));
  const violations = [];
  for (const f of files) {
    const rel = path.relative(cwd, f);
    if (ALLOW.has(rel)) continue;
    const src = fs.readFileSync(f, 'utf8');
    const lines = src.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Form 1: addShape() string literal — first violation per file is enough.
      const m = line.match(RE);
      if (m && !ALLOW_MARKER.test(line)) {
        violations.push(
          `${rel}:${i + 1} addShape() string literal "${m[1]}" — use pres.shapes.${m[1].toUpperCase()} (CRT-15)`
        );
        break; // first violation per file is enough
      }
      // Form 2 (HARD-01): pres.shapes.<KEY> typos — surface ALL on the line.
      if (ALLOW_MARKER.test(line)) continue;
      SHAPES_RE.lastIndex = 0;
      let sm;
      while ((sm = SHAPES_RE.exec(line)) !== null) {
        const key = sm[1];
        /* c8 ignore next */ // Defensive: pptxgenjs is a hard prod dep so VALID_SHAPE_KEYS is always non-empty in CI; this break covers pre-install bootstrap.
        if (VALID_SHAPE_KEYS.size === 0) break;
        if (VALID_SHAPE_KEYS.has(key)) continue;
        const sug = suggestKey(key);
        if (sug) {
          violations.push(
            `${rel}:${i + 1} pres.shapes.${key} — not an exported pptxgenjs ShapeType (suggestion: ${sug})`
          );
        } else {
          violations.push(
            `${rel}:${i + 1} pres.shapes.${key} — not an exported pptxgenjs ShapeType`
          );
        }
      }
    }
  }
  if (violations.length) {
    for (const v of violations) console.error(v);
    process.exit(1);
  }
  console.log(`lint-pptxgenjs-enums: ${files.length} files clean`);
  process.exit(0);
}

main();
