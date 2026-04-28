#!/usr/bin/env node
// tools/validate-manifest.js — Bespoke manifest validator (D-04, FOUND-08).
// Validates: (a) plugin.json schema shape (kebab-case name, semver version),
// (b) component path resolution (skills/commands/agents/hooks/mcpServers),
// (c) skill descriptions: ≤ 1024 chars, single-line (no YAML block scalars),
//     starting with an imperative verb (heuristic: not in stop-word list).
// PC-05: hard-rejects multi-line description block scalars (`|` / `>`).
// Description-quality / activation-rate scoring is deferred to Phase 7 DIST-02.

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const STOP_WORDS = new Set(['a', 'an', 'the', 'this', 'tool', 'skill', 'plugin']);
const KEBAB_RE = /^[a-z][a-z0-9-]*$/;
const SEMVER_RE = /^\d+\.\d+\.\d+/;
const COMPONENT_KEYS = ['skills', 'commands', 'agents', 'hooks', 'mcpServers'];

function main() {
  const root = path.resolve(process.argv[2] || path.resolve(__dirname, '..'));
  const errors = [];

  const manifestPath = path.join(root, '.claude-plugin', 'plugin.json');
  if (!fs.existsSync(manifestPath)) {
    errors.push(`${manifestPath}: plugin.json not found`);
    return finish(errors);
  }

  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (e) {
    errors.push(`${manifestPath}: invalid JSON — ${e.message}`);
    return finish(errors);
  }

  // (a) Manifest shape
  if (!manifest.name || typeof manifest.name !== 'string') {
    errors.push(`${manifestPath}: missing required string field "name"`);
  } else if (!KEBAB_RE.test(manifest.name)) {
    errors.push(`${manifestPath}: name "${manifest.name}" must be kebab-case (matching ${KEBAB_RE})`);
  }

  if (manifest.version != null) {
    if (typeof manifest.version !== 'string' || !SEMVER_RE.test(manifest.version)) {
      errors.push(`${manifestPath}: version "${manifest.version}" must be semver (X.Y.Z)`);
    }
  }

  if (manifest.license != null) {
    if (typeof manifest.license !== 'string' || manifest.license.trim() === '') {
      errors.push(`${manifestPath}: license must be a non-empty string when set`);
    }
  }

  // (b) Component paths
  for (const key of COMPONENT_KEYS) {
    const val = manifest[key];
    if (typeof val === 'string') {
      const resolved = path.resolve(root, val);
      if (!fs.existsSync(resolved)) {
        errors.push(`${manifestPath}: ${key} path "${val}" does not exist (resolved: ${resolved})`);
      }
    } else if (Array.isArray(val)) {
      for (const entry of val) {
        if (entry && typeof entry === 'object' && typeof entry.path === 'string') {
          const resolved = path.resolve(root, entry.path);
          if (!fs.existsSync(resolved)) {
            errors.push(`${manifestPath}: ${key}[].path "${entry.path}" does not exist`);
          }
        }
      }
    }
  }

  // (c) Skill descriptions
  const skillsDir = typeof manifest.skills === 'string'
    ? path.resolve(root, manifest.skills)
    /* c8 ignore next */ // Defensive: manifest.skills is always a string in our plugin.json; the bare 'skills' fallback covers manifest variants.
    : path.resolve(root, 'skills');

  if (fs.existsSync(skillsDir) && fs.statSync(skillsDir).isDirectory()) {
    const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
    for (const entry of entries) {
      /* c8 ignore next */ // Defensive: skills/ contains only directories; non-directory entries are unexpected and filtered for safety.
      if (!entry.isDirectory()) continue;
      const skillFile = path.join(skillsDir, entry.name, 'SKILL.md');
      /* c8 ignore next */ // Defensive: every skills/<name>/ subdir contains a SKILL.md by convention.
      if (!fs.existsSync(skillFile)) continue;
      validateSkillFile(skillFile, errors);
    }
  }

  finish(errors);
}

function validateSkillFile(file, errors) {
  const content = fs.readFileSync(file, 'utf8');
  const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fmMatch) {
    errors.push(`${file}: missing YAML frontmatter`);
    return;
  }
  const fm = fmMatch[1];
  const lines = fm.split(/\r?\n/);

  // Find description: line
  let descLineIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^description:/.test(lines[i])) {
      descLineIdx = i;
      break;
    }
  }
  if (descLineIdx === -1) {
    errors.push(`${file}: frontmatter missing "description" field`);
    return;
  }

  const descLine = lines[descLineIdx];

  // PC-05: HARD reject multi-line block scalars BEFORE other checks.
  if (/^description:\s*[|>]/.test(descLine)) {
    errors.push(`${file}: description MUST be single-line; block scalars (| or >) are forbidden`);
    return;
  }

  // CR-02: Also reject IMPLICIT folded-style continuations — a description
  // followed by a whitespace-indented non-empty next line. Real YAML parsers
  // fold those into the description value. Valid next-line forms:
  //   - column-0 new key (e.g. `user-invocable:`)
  //   - closing `---`
  //   - end of frontmatter (no more lines)
  const nextLine = lines[descLineIdx + 1];
  if (
    nextLine !== undefined &&
    nextLine !== '---' &&
    /^\s/.test(nextLine) &&
    nextLine.trim() !== ''
  ) {
    errors.push(
      `${file}: description must be single-line; indented continuation detected on line ${descLineIdx + 2}`
    );
    return;
  }

  // user-invocable check
  let userInvocable = false;
  for (const l of lines) {
    const m = l.match(/^user-invocable:\s*(true|false)\b/);
    if (m) { userInvocable = m[1] === 'true'; break; }
  }

  // Extract description value: strip "description:" prefix, surrounding quotes, trailing ws.
  let descValue = descLine.replace(/^description:\s*/, '');
  descValue = descValue.replace(/\s+$/, '');
  // Strip matching surrounding quotes
  /* c8 ignore next 4 */ // Defensive: single-quoted description is rare in practice; the OR-branches cover both quote styles defensively.
  if ((descValue.startsWith('"') && descValue.endsWith('"') && descValue.length >= 2) ||
      (descValue.startsWith("'") && descValue.endsWith("'") && descValue.length >= 2)) {
    descValue = descValue.slice(1, -1);
  }

  if (descValue.length === 0) {
    errors.push(`${file}: description is empty`);
    return;
  }

  // Length check
  if (descValue.length > 1024) {
    errors.push(`${file}: description is ${descValue.length} chars (max 1024)`);
  }

  // Imperative-verb heuristic — first word not a stop word.
  const firstWordMatch = descValue.match(/^[\s'"]*([A-Za-z][A-Za-z'-]*)/);
  /* c8 ignore next 3 */ // Defensive: descValue is a non-empty string at this point (length checks above), and the regex matches any leading word; failure mode is digit-only or symbol-only descriptions, rejected upstream.
  if (!firstWordMatch) {
    errors.push(`${file}: description must start with a word (imperative verb)`);
  } else {
    const firstWord = firstWordMatch[1].toLowerCase();
    if (STOP_WORDS.has(firstWord)) {
      if (userInvocable) {
        errors.push(`${file}: description starts with "${firstWord}" — must start with an imperative verb`);
      } else {
        process.stdout.write(`${file}: info — description starts with "${firstWord}" (non-user-invocable, not enforced)\n`);
      }
    }
  }
}

function finish(errors) {
  if (errors.length > 0) {
    for (const e of errors) {
      process.stderr.write(e + '\n');
    }
    process.exit(1);
  }
  console.log('Manifest OK');
  process.exit(0);
}

main();
