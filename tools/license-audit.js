#!/usr/bin/env node
// tools/license-audit.js — Phase 7 D-04 license-compliance CI gate.
//
// Two checks:
//   1. license-checker scans production deps; rejects any GPL/AGPL transitive
//      unless explicitly whitelisted (jszip is "MIT OR GPL-3.0"; we use under MIT).
//   2. Drift check: NOTICE BUNDLED SOFTWARE ATTRIBUTION block ↔ licenses/<dep>/
//      subdir set MUST be identical (modulo a slug map for "IBM Plex Sans").
//
// Exits 1 on any violation; 0 on clean sweep.

'use strict';

const fs = require('fs');
const path = require('path');

// Whitelist for known multi-license deps where we operate under the permissive
// arm only. Each entry documents the rationale.
const WHITELIST = {
  jszip: {
    license_used: 'MIT',
    rationale: 'jszip is "MIT OR GPL-3.0"; we use under MIT (NOTICE BUNDLED SOFTWARE ATTRIBUTION).',
  },
};

// NOTICE entries use display names; the licenses/ subdir uses slug form.
const SLUG_MAP = {
  'IBM Plex Sans': 'IBM_Plex_Sans',
};

function classifyLicense(name, licenseStr) {
  const s = String(licenseStr || '');
  const isGpl = /\bGPL\b/i.test(s) || /\bAGPL\b/i.test(s);
  if (!isGpl) return { ok: true };
  if (WHITELIST[name]) {
    return { ok: true, whitelisted: true, rationale: WHITELIST[name].rationale };
  }
  return { ok: false, reason: 'gpl-transitive', license: s };
}

function parseNoticeDeps(noticeText) {
  const deps = [];
  const lines = noticeText.split('\n');
  for (const line of lines) {
    const m = line.match(/^-\s+([^()]+?)\s+\(([^)]+)\)/);
    if (!m) continue;
    const name = m[1].trim();
    const license = m[2].trim();
    if (/^[A-Z_][A-Z_ ]*$/.test(name) || /^Copyright/i.test(name)) continue;
    deps.push({ name: name, license: license });
  }
  return deps;
}

function listLicenseSubdirs(licensesDir) {
  /* c8 ignore next */ // Defensive: licensesDir is always present in real repo; fallback covers fresh-clone before licenses/ is generated.
  if (!fs.existsSync(licensesDir)) return [];
  return fs.readdirSync(licensesDir, { withFileTypes: true })
    .filter(function (d) { return d.isDirectory(); })
    .map(function (d) { return d.name; });
}

// Pure inner fn — easy to unit-test without spawning license-checker.
function runCheck(pkgs, noticeText, licenseSubdirs) {
  const violations = [];

  // GPL/AGPL gate
  /* c8 ignore next */ // Defensive: pkgs is always an object passed from license-checker; fallback covers callers passing null.
  for (const fullName of Object.keys(pkgs || {})) {
    const baseName = fullName.replace(/@[^@]+$/, '');
    /* c8 ignore next */ // Defensive: pkgs[fullName] is always an info object from license-checker.
    const info = pkgs[fullName] || {};
    const c = classifyLicense(baseName, info.licenses);
    if (!c.ok) {
      violations.push({
        kind: 'gpl-transitive',
        package: fullName,
        license: c.license,
      });
    }
  }

  // Drift gate
  const noticeDeps = parseNoticeDeps(noticeText);
  const noticeNames = new Set(noticeDeps.map(function (d) {
    return SLUG_MAP[d.name] || d.name;
  }));
  const subdirSet = new Set(licenseSubdirs);

  for (const n of noticeNames) {
    if (!subdirSet.has(n)) {
      violations.push({ kind: 'notice-missing-licenses-dir', dep: n });
    }
  }
  for (const s of subdirSet) {
    if (!noticeNames.has(s)) {
      violations.push({ kind: 'licenses-dir-missing-notice', dep: s });
    }
  }

  return { ok: violations.length === 0, violations: violations };
}

function run(rootDir) {
  /* c8 ignore next */ // Defensive: tests always pass rootDir; cwd-fallback covers main() invocation.
  rootDir = rootDir || process.cwd();
  const noticeText = fs.readFileSync(path.join(rootDir, 'NOTICE'), 'utf8');
  const licenseSubdirs = listLicenseSubdirs(path.join(rootDir, 'licenses'));

  return new Promise(function (resolve) {
    const checker = require('license-checker');
    checker.init({ start: rootDir, production: true }, function (err, packages) {
      /* c8 ignore next 4 */ // Defensive: license-checker.init only errors on corrupt package.json or missing node_modules; covered by upstream's own tests.
      if (err) {
        resolve({ ok: false, violations: [{ kind: 'license-checker-error', error: String(err) }] });
        return;
      }
      const r = runCheck(packages, noticeText, licenseSubdirs);
      // Confirm every licenses/<dep>/LICENSE file exists and is non-empty.
      for (const sub of licenseSubdirs) {
        const lp = path.join(rootDir, 'licenses', sub, 'LICENSE');
        if (!fs.existsSync(lp) || fs.statSync(lp).size === 0) {
          r.violations.push({ kind: 'empty-license-file', dep: sub });
          r.ok = false;
        }
      }
      if (!r.ok) {
        process.stderr.write('license-audit: violations found\n');
        for (const v of r.violations) {
          process.stderr.write('  ' + JSON.stringify(v) + '\n');
        }
      } else {
        process.stdout.write('license-audit: OK (no GPL/AGPL prod deps; NOTICE <-> licenses/ in sync)\n');
      }
      resolve(r);
    });
  });
}

module.exports = { run: run, runCheck: runCheck, parseNoticeDeps: parseNoticeDeps, classifyLicense: classifyLicense };

/* c8 ignore start */ // Defensive: require.main === module guard fires only when invoked as a script; r.ok ternary outcome depends on environment.
if (require.main === module) {
  run(process.cwd()).then(function (r) {
    process.exit(r.ok ? 0 : 1);
  });
}
/* c8 ignore stop */
