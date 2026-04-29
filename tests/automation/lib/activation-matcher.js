// activation-matcher.js — deterministic Jaccard-based skill activation scorer.
//
// Pure module: no fs, no network, no subprocess. Same inputs always produce same outputs.
// Used by tests/automation/activation-panel.test.js to simulate Claude Code's
// activation matching against SKILL.md description fields, replacing the manual
// 40-prompt human checklist (HARD-10).

'use strict';

const STOPWORDS = new Set([
  'the', 'this', 'that', 'for', 'with', 'from', 'and',
  'should', 'used', 'when', 'user', 'asks', 'skill',
]);

function tokenize(text) {
  if (typeof text !== 'string' || text.length === 0) return new Set();
  const lowered = text.toLowerCase();
  const raw = lowered.split(/[^a-z0-9]+/);
  const out = new Set();
  for (const tok of raw) {
    if (!tok) continue;
    if (tok.length <= 2) continue;
    if (STOPWORDS.has(tok)) continue;
    out.add(tok);
  }
  return out;
}

function jaccard(setA, setB) {
  if (setA.size === 0 && setB.size === 0) return 0;
  let intersection = 0;
  for (const t of setA) {
    if (setB.has(t)) intersection += 1;
  }
  const union = setA.size + setB.size - intersection;
  if (union === 0) return 0;
  return intersection / union;
}

function scoreSkillForPrompt(skillDescription, prompt) {
  const a = tokenize(skillDescription);
  const b = tokenize(prompt);
  return jaccard(a, b);
}

function predictSkill(prompt, skillDescriptions) {
  // Deterministic: iterate keys in lexicographic order; on tie, first wins.
  const names = Object.keys(skillDescriptions).sort();
  let best = { name: names[0], score: -1 };
  for (const name of names) {
    const score = scoreSkillForPrompt(skillDescriptions[name], prompt);
    if (score > best.score) {
      best = { name, score };
    }
  }
  return best;
}

function parseActivationPanel(mdText) {
  const result = {};
  if (typeof mdText !== 'string') return result;
  const lines = mdText.split('\n');
  let currentSkill = null;
  for (const line of lines) {
    const heading = line.match(/^##\s+\/instadecks:([\w-]+)\s*$/);
    if (heading) {
      currentSkill = heading[1];
      result[currentSkill] = [];
      continue;
    }
    if (line.match(/^---\s*$/) || line.match(/^##\s/)) {
      // already handled headings; bare --- ends the section visually but the
      // next H2 will reset currentSkill on its own. Bare --- without a new
      // heading just leaves currentSkill in place; that's harmless because
      // numbered prompts under a fresh skill heading are what we capture.
      continue;
    }
    if (currentSkill === null) continue;
    const item = line.match(/^\s*\d+\.\s+(.+?)\s*$/);
    if (item) {
      result[currentSkill].push(item[1]);
    }
  }
  return result;
}

module.exports = {
  tokenize,
  jaccard,
  scoreSkillForPrompt,
  predictSkill,
  parseActivationPanel,
};
