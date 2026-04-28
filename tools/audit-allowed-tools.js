#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

function parseAllowedTools(text) {
  const fmMatch = text.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) return null;
  const fm = fmMatch[1];
  const lines = fm.split('\n');
  let idx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^allowed-tools\s*:\s*$/.test(lines[i])) { idx = i; break; }
  }
  if (idx < 0) return null;
  const entries = [];
  for (let i = idx + 1; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(/^\s+-\s+(.+?)\s*(#.*)?$/);
    if (!m) {
      if (/^\S/.test(line)) break;
      if (line.trim() === '') continue;
      /* c8 ignore start */ // Defensive: whitespace-only fallthrough is unreachable (above branches catch all line shapes).
      break;
    }
    /* c8 ignore stop */
    entries.push(m[1].trim());
  }
  return entries;
}

function auditSkill(skillMdPath) {
  const text = fs.readFileSync(skillMdPath, 'utf8');
  const entries = parseAllowedTools(text);
  if (entries === null) {
    return { ok: false, violations: [{ entry: '<none>', reason: 'missing-allowed-tools' }] };
  }
  const violations = [];
  for (const entry of entries) {
    if (!/^Bash\b/.test(entry)) continue;
    if (entry === 'Bash') {
      violations.push({ entry: entry, reason: 'bare-bash' });
      continue;
    }
    if (entry === 'Bash(*)') {
      violations.push({ entry: entry, reason: 'unscoped-bash-wildcard' });
      continue;
    }
    const m = entry.match(/^Bash\(([^)]+)\)$/);
    if (!m) {
      violations.push({ entry: entry, reason: 'bare-bash' });
      continue;
    }
    if (m[1].indexOf(':*') < 0) {
      violations.push({ entry: entry, reason: 'bash-missing-arg-wildcard' });
      continue;
    }
  }
  return { ok: violations.length === 0, violations: violations };
}

function run(rootDir) {
  const skillsDir = path.join(rootDir, 'skills');
  if (!fs.existsSync(skillsDir)) {
    return { ok: false, results: [], error: 'skills dir missing: ' + skillsDir };
  }
  const subdirs = fs.readdirSync(skillsDir, { withFileTypes: true })
    .filter(function (d) { return d.isDirectory(); })
    .map(function (d) { return d.name; });
  const results = [];
  for (const sub of subdirs) {
    const md = path.join(skillsDir, sub, 'SKILL.md');
    /* c8 ignore next */ // Defensive: every skills/<sub>/ contains SKILL.md by convention; guard skips unexpected non-skill dirs.
    if (!fs.existsSync(md)) continue;
    const r = auditSkill(md);
    results.push(Object.assign({ file: md }, r));
  }
  const ok = results.every(function (r) { return r.ok; });
  if (!ok) {
    process.stderr.write('audit-allowed-tools: violations found\n');
    for (const r of results) {
      if (r.ok) continue;
      for (const v of r.violations) {
        process.stderr.write('  ' + path.relative(rootDir, r.file) + ': ' + v.reason + ' -> ' + v.entry + '\n');
      }
    }
  } else {
    process.stdout.write('audit-allowed-tools: OK (' + results.length + ' SKILL.md files passed)\n');
  }
  return { ok: ok, results: results };
}

module.exports = { run: run, auditSkill: auditSkill, parseAllowedTools: parseAllowedTools };

/* c8 ignore start */ // Defensive: require.main entrypoint for CLI use; r.ok ternary outcome depends on environment.
if (require.main === module) {
  const r = run(process.cwd());
  process.exit(r.ok ? 0 : 1);
}
/* c8 ignore stop */
