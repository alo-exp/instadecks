'use strict';

// HARD-10 — automated 40-prompt activation harness.
// Replaces the manual checklist in tests/activation-panel.md.
// Deterministic: no real LLM, no network, no subprocess. Pure Jaccard scoring.
//
// Asserts ≥8/10 prompts route to the correct skill for all 4 user-invocable skills.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const { predictSkill, parseActivationPanel } = require('./lib/activation-matcher.js');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const SKILLS = ['create', 'review', 'content-review', 'annotate'];
const THRESHOLD = 8;

function extractDescription(skillName) {
  const p = path.join(REPO_ROOT, 'skills', skillName, 'SKILL.md');
  const text = fs.readFileSync(p, 'utf8');
  // Frontmatter is bounded by the first two `---` lines.
  const fm = text.match(/^---\n([\s\S]*?)\n---/);
  if (!fm) throw new Error(`No frontmatter in ${p}`);
  const block = fm[1];
  // Match `description:` followed by everything up to the next top-level YAML key
  // (line beginning with `[a-z][a-z0-9_-]*:`). Block scalars (`|` / `>`) are
  // handled implicitly because their indented content has no top-level key.
  const m = block.match(/^description:\s*(.*?)(?=\n[a-z][a-z0-9_-]*:\s|\n*$)/ms);
  if (!m) throw new Error(`No description: field in frontmatter of ${p}`);
  return m[1].trim().replace(/^["']|["']$/g, '');
}

const descriptions = {};
for (const s of SKILLS) descriptions[s] = extractDescription(s);

const panel = parseActivationPanel(
  fs.readFileSync(path.join(REPO_ROOT, 'tests', 'activation-panel.md'), 'utf8'),
);

for (const skill of SKILLS) {
  test(`activation panel — /instadecks:${skill} routes ≥${THRESHOLD}/10 prompts correctly`, () => {
    const prompts = panel[skill];
    assert.ok(Array.isArray(prompts) && prompts.length === 10,
      `expected 10 prompts for ${skill}, got ${prompts && prompts.length}`);
    const misrouted = [];
    let correct = 0;
    for (const prompt of prompts) {
      const predicted = predictSkill(prompt, descriptions);
      if (predicted.name === skill) {
        correct += 1;
      } else {
        misrouted.push({ prompt, predicted: predicted.name, score: predicted.score });
      }
    }
    assert.ok(
      correct >= THRESHOLD,
      `${skill}: only ${correct}/10 routed correctly (threshold ${THRESHOLD}). Misrouted:\n` +
      misrouted.map((m) => `  - "${m.prompt}" → ${m.predicted} (score ${m.score.toFixed(3)})`).join('\n'),
    );
  });
}
