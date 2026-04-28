'use strict';
// loop-primitives.js — Phase 5 D-01/D-02/D-03/D-04 stateless primitives for the
// agent-owned auto-refine loop. Exports: appendLedger, readLedger, checkInterrupt,
// hashIssueSet, slideImagesSha, slidesChangedSinceLastCycle.
// Hand-rolled (no ajv). All paths via runDir argument — never reach outside the plugin tree.

const path = require('node:path');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const crypto = require('node:crypto');

const LEDGER_FILENAME = 'refine-ledger.jsonl';
const INTERRUPT_FILENAME = '.interrupt';
const SLIDE_RE = /^slide-(\d+)\.jpg$/;

function ledgerPath(runDir) {
  return path.join(runDir, LEDGER_FILENAME);
}

async function appendLedger(runDir, entry) {
  if (!entry || typeof entry !== 'object'
      || !Number.isInteger(entry.cycle) || entry.cycle < 1) {
    throw new Error(
      `appendLedger: cycle: must be positive integer (got ${entry ? JSON.stringify(entry.cycle) : 'null'})`,
    );
  }
  const line = JSON.stringify(entry) + '\n';
  await fsp.appendFile(ledgerPath(runDir), line);
}

async function readLedger(runDir) {
  let raw;
  try {
    raw = await fsp.readFile(ledgerPath(runDir), 'utf8');
  } catch (e) {
    if (e && e.code === 'ENOENT') return [];
    throw e;
  }
  const out = [];
  for (const ln of raw.split('\n')) {
    if (!ln) continue;
    try {
      out.push(JSON.parse(ln));
    } catch {
      // Pitfall 1: tolerate a truncated final line. Bad lines silently skipped.
    }
  }
  return out;
}

function checkInterrupt(runDir) {
  // checkInterrupt resolves only path.join(runDir, INTERRUPT_FILENAME);
  // never accepts caller-supplied filename (T-05-02).
  return fs.existsSync(path.join(runDir, INTERRUPT_FILENAME));
}

function hashIssueSet(findings) {
  if (!Array.isArray(findings)) {
    throw new Error('hashIssueSet: findings must be array');
  }
  const norm = findings
    .map((f) => `${f.slideNum}|${String(f.text).trim()}`)
    .sort()
    .join('\n');
  return 'sha1:' + crypto.createHash('sha1').update(norm).digest('hex');
}

async function slideImagesSha(cycleDir) {
  // cycleDir contains slide-NN.jpg files directly (used by tests against fixture
  // dirs) OR has a `slides/` subdirectory (used by the runtime layout).
  const slidesSub = path.join(cycleDir, 'slides');
  let dir = cycleDir;
  try {
    const st = await fsp.stat(slidesSub);
    if (st.isDirectory()) dir = slidesSub;
  } catch (e) {
    if (!e || e.code !== 'ENOENT') throw e;
  }
  let entries;
  try {
    entries = await fsp.readdir(dir);
  } catch (e) {
    if (e && e.code === 'ENOENT') return {};
    throw e;
  }
  const out = {};
  for (const f of entries) {
    if (!SLIDE_RE.test(f)) continue;
    const buf = await fsp.readFile(path.join(dir, f));
    out[f] = crypto.createHash('sha256').update(buf).digest('hex');
  }
  return out;
}

async function slidesChangedSinceLastCycle(runDir, cycle) {
  if (!Number.isInteger(cycle) || cycle <= 1) return null;
  const cur = await slideImagesSha(path.join(runDir, `cycle-${cycle}`));
  const prev = await slideImagesSha(path.join(runDir, `cycle-${cycle - 1}`));
  const changed = [];
  for (const [name, sha] of Object.entries(cur)) {
    if (prev[name] !== sha) {
      const m = name.match(SLIDE_RE);
      if (m) changed.push(parseInt(m[1], 10));
    }
  }
  return changed.sort((a, b) => a - b);
}

module.exports = {
  appendLedger, readLedger, checkInterrupt,
  hashIssueSet, slideImagesSha, slidesChangedSinceLastCycle,
  _internal: { LEDGER_FILENAME, INTERRUPT_FILENAME, SLIDE_RE, ledgerPath },
};
