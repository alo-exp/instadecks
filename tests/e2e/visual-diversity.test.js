'use strict';
// visual-diversity gate: pairwise design-DNA distinctness across V1..V6 e2e runs.
// Reads each run's design-rationale.md, extracts (palette, typography, motif) triple,
// asserts all 6 distinct. Local-only; skipped under CI (CONTEXT D-08).
// Phase 9 plan 09-06 Task 2.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SKIP_REASON = 'live E2E - local only (CI=true unset)';

// Extract a section's body under a `## <name>` heading (markdown), or null if missing.
function extractSection(md, name) {
  const re = new RegExp(`##\\s+${name}\\s*\\n([\\s\\S]*?)(?=\\n##\\s|$)`, 'i');
  const m = md.match(re);
  return m ? m[1] : null;
}

// Read the chosen palette name. Real render-rationale format:
//   ## Palette
//   - Chosen: <name> (hex, hex, hex)
// Shorthand (per SKILL.md output contract): "Palette: <name>"
function extractPalette(md) {
  const shorthand = md.match(/^Palette:\s*(.+)$/m);
  if (shorthand) return shorthand[1].trim();
  const sec = extractSection(md, 'Palette');
  if (sec) {
    const c = sec.match(/Chosen:\s*([^\n(]+)/i);
    if (c) return c[1].trim();
  }
  return 'unknown';
}

function extractTypography(md) {
  const shorthand = md.match(/^Typography:\s*(.+)$/m);
  if (shorthand) return shorthand[1].trim();
  const sec = extractSection(md, 'Typography');
  if (sec) {
    const h = sec.match(/Headings?:\s*([^\n]+)/i);
    const b = sec.match(/Body:\s*([^\n]+)/i);
    if (h || b) return `${(h && h[1].trim()) || '?'} / ${(b && b[1].trim()) || '?'}`;
  }
  return 'unknown';
}

function extractMotif(md) {
  const shorthand = md.match(/^Motif:\s*(.+)$/m);
  if (shorthand) return shorthand[1].trim();
  const sec = extractSection(md, 'Motif');
  if (sec) {
    const first = sec.split('\n').map(s => s.trim()).find(Boolean);
    if (first) return first.replace(/^[-*]\s*/, '');
  }
  return 'unknown';
}

test('visual-diversity gate across V1..V6 runs',
  { skip: process.env.CI === 'true' ? SKIP_REASON : false }, () => {
    const repoRoot = path.resolve(__dirname, '..', '..');
    const runsDir = path.join(repoRoot, '.planning', 'instadecks');
    if (!fs.existsSync(runsDir)) {
      assert.fail(`no e2e runs found at ${runsDir} — run V1..V6 tests first`);
    }
    const runs = fs.readdirSync(runsDir).filter(d => /^e2e-v[1-6]-\d+$/.test(d));
    const byVer = {};
    for (const r of runs) {
      const v = r.match(/^e2e-(v[1-6])-/)[1];
      if (!byVer[v] || r > byVer[v]) byVer[v] = r;
    }
    const versions = ['v1', 'v2', 'v3', 'v4', 'v5', 'v6'];
    for (const v of versions) {
      assert.ok(byVer[v], `no e2e run found for ${v} - run all 6 V<N> tests first`);
    }

    // Extract palette / typography / motif triple per run from design-rationale.md
    const triples = versions.map(v => {
      const r = byVer[v];
      const ratPath = path.join(runsDir, r, 'design-rationale.md');
      assert.ok(fs.existsSync(ratPath), `design-rationale.md missing for ${r}`);
      const md = fs.readFileSync(ratPath, 'utf8');
      const palette = extractPalette(md);
      const typography = extractTypography(md);
      const motif = extractMotif(md);
      return `${palette}|${typography}|${motif}`;
    });

    const uniq = new Set(triples);
    assert.equal(uniq.size, 6,
      `expected 6 distinct palette+typography+motif triples, got ${uniq.size}: ${JSON.stringify(triples, null, 2)}`);
  });

module.exports = { extractPalette, extractTypography, extractMotif };
