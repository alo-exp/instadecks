// permission-walker.js — HARD-11 helpers.
//
// Pure module: reads files but spawns no subprocesses. Used by
// tests/automation/permission-mode.test.js to validate that every command
// our skill scripts actually invoke is declared in the SKILL.md frontmatter
// `allowed-tools` list, in both `default` and `dontAsk` permission-mode
// simulations.

'use strict';

const fs = require('node:fs');
const path = require('node:path');

// ---------- allowed-tools parsing ----------

function parseAllowedTools(skillMdPath) {
  const text = fs.readFileSync(skillMdPath, 'utf8');
  const fm = text.match(/^---\n([\s\S]*?)\n---/);
  if (!fm) return [];
  const block = fm[1];
  const lines = block.split('\n');
  const out = [];
  let inAllowed = false;
  for (const line of lines) {
    if (/^allowed-tools:\s*$/.test(line)) {
      inAllowed = true;
      continue;
    }
    if (inAllowed) {
      // Indented list item: "  - <value>"
      const m = line.match(/^\s+-\s+(.+?)\s*$/);
      if (m) {
        out.push(m[1]);
        continue;
      }
      // Inline form ended; new top-level YAML key terminates list.
      if (/^[a-zA-Z][\w-]*:/.test(line)) {
        inAllowed = false;
      }
    }
  }
  return out;
}

// ---------- subprocess extraction ----------

const JS_PATTERNS = [
  // child_process: spawn / spawnSync / exec / execSync / execFile / execFileSync
  /\b(?:spawn|spawnSync|exec|execSync|execFile|execFileSync)\s*\(\s*['"]([\w.\-/]+)['"]/g,
  // execa-style or wrapper functions like execFileP/spawnP
  /\b(?:execa|execFileP|spawnP)\s*\(\s*['"]([\w.\-/]+)['"]/g,
];

const SH_PATTERNS = [
  // command -v <bin>
  /\bcommand\s+-v\s+([\w-]+)/g,
  // which <bin>
  /\bwhich\s+([\w-]+)/g,
];

// Expand to also detect bare command invocations in sh files (e.g.
// `node --version`, `fc-list ...`). To avoid false positives on shell
// builtins/keywords, restrict to a small allowlist of known external bins.
const SH_BARE_CANDIDATES = new Set([
  'node', 'soffice', 'pdftoppm', 'pdftotext', 'fc-list', 'unzip',
  'xmllint', 'bash', 'npm', 'sh',
]);

function extractFromJs(src) {
  const found = new Set();
  for (const re of JS_PATTERNS) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(src)) !== null) {
      let cmd = m[1];
      // Normalize process.execPath etc. — only literals are captured by regex.
      // Strip path prefix: '/usr/bin/foo' → 'foo'
      const slash = cmd.lastIndexOf('/');
      if (slash >= 0) cmd = cmd.slice(slash + 1);
      if (cmd) found.add(cmd);
    }
  }
  return found;
}

function extractFromSh(src) {
  const found = new Set();
  for (const re of SH_PATTERNS) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(src)) !== null) {
      found.add(m[1]);
    }
  }
  // Bare-command detection over a known allowlist.
  // Pattern: at start of line (allowing $(, "$( prefixes), the command name.
  const bareRe = /(?:^|\s|\$\(|`)([\w-]+)\s/gm;
  let m;
  while ((m = bareRe.exec(src)) !== null) {
    const cmd = m[1];
    if (SH_BARE_CANDIDATES.has(cmd)) found.add(cmd);
  }
  return found;
}

function walkFiles(rootDir) {
  const out = [];
  if (!fs.existsSync(rootDir)) return out;
  const entries = fs.readdirSync(rootDir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(rootDir, e.name);
    if (e.isDirectory()) {
      out.push(...walkFiles(full));
    } else if (e.isFile()) {
      out.push(full);
    }
  }
  return out;
}

function extractSubprocessCalls(rootDir) {
  const all = new Set();
  const files = walkFiles(rootDir);
  for (const f of files) {
    const ext = path.extname(f).toLowerCase();
    let src;
    try {
      src = fs.readFileSync(f, 'utf8');
    } catch {
      continue;
    }
    if (ext === '.js' || ext === '.cjs' || ext === '.mjs') {
      for (const c of extractFromJs(src)) all.add(c);
    } else if (ext === '.sh' || ext === '.bash') {
      for (const c of extractFromSh(src)) all.add(c);
    }
  }
  return all;
}

// ---------- permission-mode simulation ----------

// Bash(<cmd>:*) → <cmd>
function allowedCmdSet(allowed) {
  const set = new Set();
  for (const entry of allowed) {
    const m = entry.match(/^Bash\(([\w-]+):\*\)$/);
    if (m) set.add(m[1]);
  }
  return set;
}

// Calls that are intentionally exempt from allowed-tools checks because they
// are Node-internal helpers, shell builtins invoked via `sh -c "<inline>"`,
// or bash-function calls that don't surface as a Claude Code permission
// prompt. Adding here is preferable to silencing the test.
const EXEMPT_CALLS = new Set([
  'sh',  // `sh -c "..."` — Claude Code treats inline shell as user-host scope
]);

function simulatePermissionMode(allowedTools, calls, mode) {
  const allowed = allowedCmdSet(allowedTools);
  const callsArr = [...calls].filter((c) => !EXEMPT_CALLS.has(c));
  const missing = callsArr.filter((c) => !allowed.has(c));
  const extra = [...allowed].filter((c) => !calls.has(c));
  // AC-11: "asserts coverage in default + dontAsk simulation modes". We
  // implement both as missing=0 → pass. `extra` is diagnostic only — extras
  // signal over-permissioning but are not a hard fail (an extra entry could
  // be a future-needed declaration).
  let passes;
  if (mode === 'dontAsk' || mode === 'default') {
    passes = missing.length === 0;
  } else {
    throw new Error(`Unknown permission mode: ${mode}`);
  }
  return { passes, missing, extra };
}

module.exports = {
  parseAllowedTools,
  extractSubprocessCalls,
  simulatePermissionMode,
  // exposed for testing
  _internal: { extractFromJs, extractFromSh, allowedCmdSet },
};
