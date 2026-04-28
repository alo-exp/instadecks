'use strict';
// enum-lint.js — Phase 4 D-05 Layer 2 / CRT-15 generation-time guard.
// Throws on first occurrence of `addShape('foo', …)` / `addShape("foo", …)`
// (string-literal shape name). Qualified-method form `pres.addShape(pres.shapes.X, …)`
// is allowed. Pure function: no fs, no clock.

function lintCjs(src, { filename = 'render-deck.cjs' } = {}) {
  if (typeof src !== 'string') {
    throw new Error('lintCjs: src must be string');
  }
  const re = /addShape\s*\(\s*['"](\w+)['"]/;
  const m = src.match(re);
  if (m) {
    const before = src.slice(0, m.index);
    const line = before.split('\n').length;
    const lastNl = before.lastIndexOf('\n');
    const col = m.index - (lastNl === -1 ? -1 : lastNl);
    throw new Error(
      `[enum-lint] ${filename}:${line}:${col} — addShape() called with string literal "${m[1]}". ` +
      `Use pres.shapes.${m[1].toUpperCase()} instead (CRT-15 / D-05).`
    );
  }
  return true;
}

module.exports = { lintCjs };
