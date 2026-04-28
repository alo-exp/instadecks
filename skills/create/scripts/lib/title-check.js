'use strict';
// title-check.js — D-06 action-title heuristic.
// Pure function: blocked-words list + 3-word minimum + tiny verb-list lookup
// (no NLP dep). Returns {ok:true} or {ok:false, reason}. Honors
// {action_title_override:true} bypass for genuine cases (e.g. closing "Thank You").

const BLOCKED = new Set([
  'overview', 'introduction', 'outline', 'agenda',
  'summary', 'conclusion', 'q&a', 'thank you', 'background',
]);

const VERBS = new Set([
  // past tense
  'grew', 'fell', 'hit', 'beat', 'missed', 'launched', 'shipped',
  'doubled', 'tripled', 'accelerated', 'broke', 'built', 'closed',
  'expanded', 'generated', 'led', 'reached', 'reduced', 'required',
  'revealed', 'scaled', 'signaled', 'surpassed', 'transformed',
  'unlocked', 'validated', 'won', 'drove', 'captured', 'increased',
  'decreased',
  // present tense / 3rd-person-singular
  'grows', 'falls', 'hits', 'beats', 'misses', 'launches', 'ships',
  'doubles', 'triples', 'accelerates', 'breaks', 'builds', 'closes',
  'expands', 'generates', 'leads', 'reaches', 'reduces', 'requires',
  'reveals', 'scales', 'signals', 'surpasses', 'transforms',
  'unlocks', 'validates', 'wins', 'drives', 'captures', 'increases',
  'decreases',
  // modals + auxiliaries
  'will', 'can', 'must', 'should', 'may', 'is', 'are', 'was', 'were',
  // common bare/imperative
  'make', 'makes', 'made', 'show', 'shows', 'showed',
  'cut', 'cuts', 'add', 'adds', 'added',
]);

function normalize(s) {
  return String(s || '').trim().toLowerCase();
}

function validateTitle(title, opts = {}) {
  if (opts.action_title_override === true) return { ok: true };

  const t = String(title || '');
  const norm = normalize(t);
  if (BLOCKED.has(norm)) {
    return { ok: false, reason: `blocked phrase: "${t}" (use action title or pass {action_title_override:true})` };
  }
  const tokens = t.trim().split(/\s+/).filter(Boolean);
  if (tokens.length < 3) {
    return { ok: false, reason: 'too short (need ≥3 words for an action title)' };
  }
  const lowerTokens = tokens.map(w => w.toLowerCase().replace(/[^\p{L}\p{N}&%]/gu, ''));
  const hasVerb = lowerTokens.some(w => VERBS.has(w));
  if (!hasVerb) {
    return { ok: false, reason: 'no verb detected (action title required)' };
  }
  return { ok: true };
}

module.exports = {
  validateTitle,
  _internal: { BLOCKED, VERBS },
};
