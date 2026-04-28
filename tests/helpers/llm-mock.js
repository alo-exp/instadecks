'use strict';
// llm-mock.js — Plan 08-05 Task 1 deterministic LLM stub loader.
//
// Per CONTEXT D-05 + plan W-5 + B-3: this helper loads canned JSON from
// tests/fixtures/llm-stubs/<scenarioName>.json and returns an async function
// matching the orchestrator's LLM-call signature `(prompt, opts) => Promise<obj>`.
// Fully deterministic, no network, no fs roundtrip beyond the read.

const fs = require('node:fs');
const path = require('node:path');

const STUBS_DIR = path.join(__dirname, '..', 'fixtures', 'llm-stubs');

function stubLlmResponse(scenarioName) {
  const file = path.join(STUBS_DIR, `${scenarioName}.json`);
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  return async (_prompt, _opts) => data;
}

module.exports = { stubLlmResponse, STUBS_DIR };
