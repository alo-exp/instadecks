'use strict';
// skill-outcome-harness.js — Plan 08-05 Task 1.
//
// Two exports:
//   - parseInstructions(skillMdPath): string[]
//       Extracts the SKILL.md's playbook instructions. Liberal heuristic since
//       SKILL.md heading conventions vary across the 5 skills:
//         create.SKILL.md      — `### Step N — …` headings + numbered sub-lists
//         review.SKILL.md      — `## When to invoke` bulleted list, numbered
//                                anti-hallucination rules, R18 numbered list
//         content-review.SKILL.md — `### Agent orchestration flow` numbered list
//         annotate.SKILL.md    — `## When to invoke` bulleted list
//         doctor.SKILL.md      — `## When to invoke` bulleted list, `## What it checks` table
//       Strategy: collect (a) `### Step N` heading lines, (b) top-level numbered
//       list items `^\d+\. …`, (c) bulleted items under "When to invoke" /
//       "When to use" / "What it checks" / "How to" headings. De-duplicate.
//       Guarantee: returns ≥1 instruction for every shipped SKILL.md.
//
//   - runInstruction(skillName, idx, llmStub, opts):
//       Dispatches to the matching orchestrator with the LLM stub injected via
//       the existing `_test_setLlm` DI hook (added by Plan 8-02; Plan 8-05
//       CONSUMES per BLOCKER B-3 — does not add hooks here). Returns the
//       orchestrator's output object.

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const REPO_ROOT = path.join(__dirname, '..');

function skillMdPath(skillName) {
  // Skills were moved from skills/<name>/SKILL.md to commands/instadecks-<name>.md
  const commandPath = path.join(REPO_ROOT, 'commands', `instadecks-${skillName}.md`);
  if (fs.existsSync(commandPath)) return commandPath;
  // Fallback to legacy path for any skill not yet migrated
  return path.join(REPO_ROOT, 'skills', skillName, 'SKILL.md');
}

function parseInstructions(mdPath) {
  const src = fs.readFileSync(mdPath, 'utf8');
  const lines = src.split(/\r?\n/);
  const out = [];
  // Track when we're in a "playbook-relevant" section (heading filter for bullets).
  const bulletSectionRe = /^(##+)\s+(When to invoke|When to use|What it checks|How to|How to use|How to run|Inputs|Outputs|Adapter behaviour|Output format)\b/i;
  let inBulletSection = false;
  let inFence = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Toggle fenced code blocks (skip content inside).
    if (/^```/.test(line)) { inFence = !inFence; continue; }
    if (inFence) continue;

    // Heading lines.
    const headingMatch = line.match(/^(#{2,4})\s+(.+?)\s*$/);
    if (headingMatch) {
      const heading = headingMatch[2];
      // (a) `### Step N — …` headings count as instructions.
      if (/^Step\s+\d+\b/i.test(heading)) {
        out.push(heading.replace(/\s+—.*/, '').trim() + ': ' + heading);
      }
      inBulletSection = bulletSectionRe.test(line);
      continue;
    }

    // (b) top-level numbered list items.
    const num = line.match(/^(\d+)\.\s+(\S.+?)\s*$/);
    if (num) {
      // Strip surrounding markdown emphasis/links.
      const text = num[2].replace(/^\*\*([^*]+)\*\*\s*[—-]?\s*/, '$1 — ').slice(0, 200);
      out.push(text);
      continue;
    }

    // (c) bulleted items, but only inside a recognised "playbook" section.
    if (inBulletSection) {
      const b = line.match(/^[-*]\s+(\S.+?)\s*$/);
      if (b) {
        out.push(b[1].slice(0, 200));
      }
    }
  }

  // De-duplicate while preserving order.
  const seen = new Set();
  const dedup = [];
  for (const s of out) {
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    dedup.push(s);
  }
  return dedup;
}

// Map skillName → orchestrator entry-point factory + DI hook.
function loadOrchestrator(skillName) {
  switch (skillName) {
    case 'create': {
      const mod = require('../skills/create/scripts/index');
      return { mod, run: mod.runCreate, setLlm: mod._test_setLlm };
    }
    case 'review': {
      const mod = require('../skills/review/scripts/index');
      return { mod, run: mod.runReview, setLlm: mod._test_setLlm };
    }
    case 'content-review': {
      const mod = require('../skills/content-review/scripts/index');
      return { mod, run: mod.runContentReview, setLlm: mod._test_setLlm };
    }
    case 'annotate': {
      const mod = require('../skills/annotate/scripts/index');
      return { mod, run: mod.runAnnotate, setLlm: mod._test_setLlm };
    }
    case 'doctor': {
      // doctor's SKILL.md surface is the bash check.sh — no orchestrator. Tests
      // that need outcome assertions for /doctor invoke the script directly via
      // child_process; this dispatcher simply returns a marker so callers can
      // detect the no-orchestrator branch.
      return { mod: null, run: null, setLlm: null };
    }
    default:
      throw new Error(`runInstruction: unknown skill "${skillName}"`);
  }
}

async function runInstruction(skillName, instructionIndex, llmStub, opts = {}) {
  const orch = loadOrchestrator(skillName);
  if (!orch.run) {
    throw new Error(`runInstruction: skill "${skillName}" has no LLM-driven orchestrator path; invoke its surface directly`);
  }
  // Inject the LLM stub via the existing DI hook (Plan 8-02 owned).
  if (typeof orch.setLlm === 'function') orch.setLlm(llmStub || null);
  // Defensive: ensure orchestrator opts have a fresh tmp deckPath / outDir for
  // skills that need filesystem outputs unless caller supplied them.
  const callOpts = { ...opts };
  if (!callOpts.outDir) {
    callOpts.outDir = fs.mkdtempSync(path.join(os.tmpdir(), `skill-out-${skillName}-`));
  }
  if (!callOpts.deckPath && skillName !== 'create') {
    const tmpDeck = fs.mkdtempSync(path.join(os.tmpdir(), `skill-deck-${skillName}-`));
    callOpts.deckPath = path.join(tmpDeck, 'deck.pptx');
    fs.writeFileSync(callOpts.deckPath, '');
  }
  if (!callOpts.mode) callOpts.mode = 'structured-handoff';
  // Pass the canned LLM payload directly as `findings` if the orchestrator
  // expects a findings doc and the caller hasn't supplied one. The stub-loader
  // returns the same object regardless of prompt; resolve it once here so we
  // can pass it as findings to runReview / runContentReview / runAnnotate.
  if (!callOpts.findings && llmStub && skillName !== 'create') {
    try { callOpts.findings = await llmStub('', {}); } catch (_) { /* leave undefined */ }
  }
  return orch.run(callOpts);
}

module.exports = { parseInstructions, runInstruction, skillMdPath, loadOrchestrator };
