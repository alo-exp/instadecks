---
plan: 10-03
phase: 10
slug: activation-and-permission-automation
status: ready
created: 2026-04-29
wave: 1
depends_on: []
autonomous: true
files_modified:
  - tests/automation/activation-panel.test.js
  - tests/automation/permission-mode.test.js
  - tests/automation/lib/activation-matcher.js
  - tests/automation/lib/permission-walker.js
  - skills/doctor/SKILL.md  # may be touched by Task 4 if the walker surfaces an allowed-tools coverage gap (revision — checker W-3); pre-walked: doctor currently lists Bash(node|soffice|pdftoppm|fc-list|which|bash) which covers check.sh's introspection commands, but declared explicitly so a reactive edit is in-scope
  - package.json
requirements: [HARD-10, HARD-11]

must_haves:
  truths:
    - "tests/automation/activation-panel.test.js exists and runs `node --test`-style tests under 30 seconds; loads each user-invocable SKILL.md (`/instadecks:create`, `/instadecks:review`, `/instadecks:content-review`, `/instadecks:annotate` — 4 skills) and the 40 prompts from `tests/activation-panel.md` (10 per skill); for each prompt, runs a deterministic keyword-overlap scorer (Jaccard similarity over normalized terms in description vs prompt) against ALL 4 skill descriptions, predicts the highest-scoring skill, and asserts ≥8/10 prompts route to the correct skill"
    - "tests/automation/lib/activation-matcher.js exports `scoreSkillForPrompt(skillDescription, prompt)` returning a [0,1] score, `predictSkill(prompt, skillDescriptions)` returning `{name, score}` of the top scorer, and `parseActivationPanel(mdText)` returning `{[skillName]: string[]}` of the 10 prompts per skill from the activation-panel markdown"
    - "Scorer is reproducible (deterministic — no randomness, no LLM calls); same inputs always produce same outputs; passes the existing 40-prompt panel ≥8/10 per skill against the current SKILL.md descriptions (acceptance verified by running the test)"
    - "tests/automation/permission-mode.test.js exists; for each of the 5 SKILL.md files, parses its `allowed-tools` list (YAML frontmatter, items like `Bash(node:*)`); walks `skills/<name>/scripts/**/*.{js,cjs,sh}` and the bash files (`skills/doctor/scripts/check.sh`, `scripts/pptx-to-images.sh` if invoked from the skill's playbook) and extracts every actual subprocess invocation (regex: `\\bspawn(Sync)?\\([^)]*['\"](\\w+)['\"]`, `\\bexec(Sync)?\\([^)]*['\"](\\w+)`, `\\bexeca?\\([^)]*['\"](\\w+)`, plus `<sub>shell-out</sub>` patterns in bash); asserts every detected subprocess command is covered by some `Bash(<cmd>:*)` entry in allowed-tools"
    - "tests/automation/lib/permission-walker.js exports `parseAllowedTools(skillMdPath)` returning the parsed list of allowed-tools strings, `extractSubprocessCalls(scriptDir)` returning `Set<string>` of detected commands (e.g., {'node','soffice','pdftoppm','unzip'}), and `simulatePermissionMode(allowedTools, calls, mode)` returning `{passes:boolean, missing:string[], extra:string[]}` for `mode in {'default','dontAsk'}`"
    - "Permission test covers BOTH simulation modes per AC-11: `default` mode passes when every call is in allowed-tools (extras are OK — user gets prompted); `dontAsk` mode REQUIRES every call to be in allowed-tools (any extra = fail); both modes asserted per skill"
    - "package.json gains 2 new scripts: `\"gate:activation-panel\": \"node --test tests/automation/activation-panel.test.js\"` and `\"gate:permission-mode\": \"node --test tests/automation/permission-mode.test.js\"`"
    - "Both tests run in CI in <30s (no soffice, no LLM, no network); they replace `tests/activation-panel.md` and `tests/PERMISSION-MODE.md` as the release-blocking automated gate (the .md scaffolds remain for human reference but no longer block tag push)"
  artifacts:
    - path: "tests/automation/activation-panel.test.js"
      provides: "Automated 40-prompt activation harness"
      contains: "predictSkill"
    - path: "tests/automation/permission-mode.test.js"
      provides: "Automated allowed-tools coverage test"
      contains: "simulatePermissionMode"
    - path: "tests/automation/lib/activation-matcher.js"
      provides: "Deterministic Jaccard skill-activation scorer"
      contains: "scoreSkillForPrompt"
    - path: "tests/automation/lib/permission-walker.js"
      provides: "SKILL.md frontmatter + script-call walker"
      contains: "extractSubprocessCalls"
    - path: "package.json"
      provides: "gate:activation-panel + gate:permission-mode npm scripts"
      contains: "gate:activation-panel"
  key_links:
    - from: "tests/automation/activation-panel.test.js"
      to: "tests/activation-panel.md + skills/*/SKILL.md"
      via: "parseActivationPanel reads the .md; SKILL.md descriptions read via fs"
      pattern: "activation-panel.md"
    - from: "tests/automation/permission-mode.test.js"
      to: "skills/*/scripts + skills/*/SKILL.md"
      via: "extractSubprocessCalls walks scripts; parseAllowedTools reads frontmatter"
      pattern: "extractSubprocessCalls"
---

<objective>
Wave 3 — automate the two human-only release gates that are deterministic enough to be programmable: activation-panel scoring (HARD-10) and allowed-tools / permission-mode coverage (HARD-11). Both replace manual checklist runs in `tests/activation-panel.md` and `tests/PERMISSION-MODE.md` with `node --test` harnesses gated in CI.

The activation-panel test does NOT call a real LLM — it uses a deterministic Jaccard keyword-overlap scorer that simulates Claude Code's activation matching well enough to assert ≥8/10 per skill given the current SKILL.md descriptions. The permission-mode test does NOT spawn real subprocesses — it walks the script source for spawn/exec patterns and validates allowed-tools coverage.

Output: 2 test files + 2 lib helpers + 2 npm scripts.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/SPEC.md
@tests/activation-panel.md
@tests/PERMISSION-MODE.md
@skills/create/SKILL.md
@skills/review/SKILL.md
@skills/content-review/SKILL.md
@skills/annotate/SKILL.md
@skills/doctor/SKILL.md
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Author lib/activation-matcher.js (Jaccard scorer + activation-panel parser)</name>
  <read_first>tests/activation-panel.md (full file — note the `## /instadecks:&lt;name&gt;` H2 sections followed by numbered list 1-10; mirror the parse); skills/*/SKILL.md (note the `description:` frontmatter line — single multi-line string OR YAML block scalar; activation matcher consumes only this string)</read_first>
  <files>tests/automation/lib/activation-matcher.js, tests/automation/lib/activation-matcher.test.js</files>
  <behavior>
    - `scoreSkillForPrompt('Generate slide deck from markdown', 'Build me a deck from this brief')` returns a number in [0,1]; same inputs same output (deterministic).
    - `predictSkill('Build me a pitch deck', {create:'...generate slide deck...', review:'...critique deck...'})` returns `{name:'create', score: <number>}` (create scores higher).
    - `parseActivationPanel(fs.readFileSync('tests/activation-panel.md','utf8'))` returns `{create:[10 strings], review:[10], 'content-review':[10], annotate:[10]}` — exactly 10 entries per skill.
    - Tokenization: lowercase, split on `[^a-z0-9]+`, drop tokens ≤2 chars and a small stopword set ({'the','this','that','for','with','from','and','should','used','when','user','asks','this','skill'}); Jaccard = |A∩B| / |A∪B| over remaining tokens.
  </behavior>
  <action>
1. Implement `scoreSkillForPrompt(desc, prompt)` per the tokenization rules above. Return raw Jaccard.
2. Implement `predictSkill(prompt, skillDescs)` that scores each entry and returns the argmax `{name, score}`. On ties, return the first by lexical name order (deterministic).
3. Implement `parseActivationPanel(text)`: split on `## /instadecks:` headings; under each, regex-match lines `^\s*\d+\.\s+(.+)$` until next `---` or `##`; collect 10 strings per skill; return object keyed by short skill name (strip `/instadecks:` prefix).
4. Tests: 6 cases — (a) scoreSkillForPrompt determinism (same inputs twice); (b) predictSkill returns argmax; (c) predictSkill tie-breaks lexically; (d) parseActivationPanel on the real file returns exactly 4 keys × 10 prompts; (e) tokenization drops stopwords; (f) tokenization drops ≤2-char tokens.
  </action>
  <verify>
    <automated>node --test tests/automation/lib/activation-matcher.test.js</automated>
  </verify>
  <acceptance_criteria>
    - All 6 test cases pass
    - `grep -E "scoreSkillForPrompt|predictSkill|parseActivationPanel" tests/automation/lib/activation-matcher.js` shows 3 exports
    - Module is pure (no fs/network/subprocess outside parseActivationPanel which only reads strings passed in)
  </acceptance_criteria>
  <done>Deterministic activation matcher library + tests green.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Author tests/automation/activation-panel.test.js (40-prompt harness, ≥8/10 per skill)</name>
  <read_first>tests/automation/lib/activation-matcher.js (Task 1 output); tests/activation-panel.md; the 4 user-invocable SKILL.md files (description fields)</read_first>
  <files>tests/automation/activation-panel.test.js</files>
  <behavior>
    - Test loads the 4 SKILL.md files and the activation-panel.md, runs each of the 40 prompts through `predictSkill`, and asserts: per skill, the count of prompts where `predictSkill(prompt) === <expectedSkill>` is ≥ 8.
    - Total wall-clock ≤ 30 seconds.
    - Test failure on any skill scoring &lt; 8/10 prints the failed prompts + which skill they routed to.
  </behavior>
  <action>
1. Read 4 SKILL.md files via `fs.readFileSync`; extract the `description:` field (handle both single-line `description: "..."` and YAML block scalar). Use a small extractor: parse first frontmatter block, regex `description:\s*(.+?)(?=\n[a-z-]+:|\n---)/s`.
2. Read `tests/activation-panel.md`; call `parseActivationPanel`; map `create→create`, `review→review`, `content-review→content-review`, `annotate→annotate` (note: doctor is intentionally absent from the 40-prompt panel — it's not user-facing per the existing panel).
3. For each skill, iterate its 10 prompts: `predicted = predictSkill(prompt, allDescs)`; increment correct count if predicted name matches expected.
4. After looping, `assert.ok(correctCount >= 8, ...)` per skill — emit detailed failure with the wrong prompts.
5. Single `test()` per skill (4 tests total). Wrap in a top-level `describe` if helpful.
  </action>
  <verify>
    <automated>node --test tests/automation/activation-panel.test.js</automated>
  </verify>
  <acceptance_criteria>
    - All 4 skill tests pass (≥8/10 per skill against current descriptions)
    - Wall-clock under 30 seconds (test runner reports < 30s total)
    - On a deliberately bad description (sanity check during dev — revert before commit), the test fails with a readable message listing the misrouted prompts
  </acceptance_criteria>
  <done>Activation panel automated; current descriptions pass.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Author lib/permission-walker.js (allowed-tools parser + subprocess extractor + simulator)</name>
  <read_first>skills/create/SKILL.md (full 119-line file — note both the simple `allowed-tools: - Bash(node:*)` and the extended list with Read/Write/WebFetch); skills/create/scripts/index.js (subprocess invocation patterns — search for spawn/exec); skills/doctor/scripts/check.sh (bash subprocess pattern — `command -v node`, `soffice --version`, etc.); scripts/pptx-to-images.sh</read_first>
  <files>tests/automation/lib/permission-walker.js, tests/automation/lib/permission-walker.test.js</files>
  <behavior>
    - `parseAllowedTools('skills/create/SKILL.md')` returns `['Bash(node:*)', 'Bash(soffice:*)', 'Bash(unzip:*)', 'Bash(xmllint:*)', 'Read', 'Write', 'WebFetch']`.
    - `extractSubprocessCalls('skills/create/scripts')` returns `Set` containing at minimum `{'node','soffice'}` (based on real script content).
    - `simulatePermissionMode(['Bash(node:*)'], new Set(['node','soffice']), 'default')` returns `{passes:true, missing:[], extra:['soffice']}` (extras OK in default).
    - `simulatePermissionMode(['Bash(node:*)'], new Set(['node','soffice']), 'dontAsk')` returns `{passes:false, missing:['soffice'], extra:[]}` (extras fail in dontAsk).
    - `simulatePermissionMode(['Bash(node:*)','Bash(soffice:*)'], new Set(['node','soffice']), 'dontAsk')` returns `{passes:true, ...}`.
  </behavior>
  <action>
1. `parseAllowedTools(p)`: read file, find first `---\n...\n---` frontmatter block, find `allowed-tools:` line, parse subsequent indented `- <item>` lines until the next top-level YAML key. Return array of trimmed strings.
2. `extractSubprocessCalls(rootDir)`: walk recursively; for each `.js`/`.cjs`/`.sh` file, run regexes:
   - JS: `/\b(?:spawn|spawnSync|exec|execSync|execFile|execFileSync)\s*\(\s*['"]([\w-]+)['"]/g`
   - JS (execa): `/\bexeca\s*\(\s*['"]([\w-]+)['"]/g`
   - SH: `/^\s*(?:command\s+-v\s+|which\s+)([\w-]+)/gm` and bare-command detection at start of bash function bodies (be generous — false positives are tolerable; missing real calls is not).
   Collect all captured names into a Set. Whitelist a small set of in-language commands to ignore (e.g., 'node' itself if it's just `node --version` introspection — but include 'node' if it's `spawn('node', ...)` for executing a script). Default: include everything; tests can refine.
3. `simulatePermissionMode(allowed, calls, mode)`: derive allowedCmds from allowed by regex `/^Bash\(([\w-]+):\*\)$/`; missing = `[...calls].filter(c => !allowedCmds.has(c))`; extra = `[...allowedCmds].filter(c => !calls.has(c))`; passes = (mode==='dontAsk' ? missing.length===0 : missing.length===0 ); (in default mode, missing means user gets prompted at runtime — that is technically "extra over allowed-tools" and DOES fail per AC-11 wording "user prompted ONLY for tool calls listed". So in default, missing=fail too. Both modes effectively require missing=0; the difference is that in dontAsk, EXTRAS in allowed-tools also matter for over-permissioning warnings — track them but do not fail.)
   Re-read SPEC AC-11 carefully: "asserts coverage in default + dontAsk simulation modes". Implement both as missing=0 → pass; emit `extra` for diagnostic only.
4. Tests: 6 cases per behavior block. Use real SKILL.md + skills/create/scripts as fixtures; supplement with synthetic mini-fixtures under `tests/automation/fixtures/`.
  </action>
  <verify>
    <automated>node --test tests/automation/lib/permission-walker.test.js</automated>
  </verify>
  <acceptance_criteria>
    - 3 exports: `parseAllowedTools`, `extractSubprocessCalls`, `simulatePermissionMode`
    - All 6 test cases pass
    - parseAllowedTools on `skills/annotate/SKILL.md` returns at least `['Bash(node:*)']`
  </acceptance_criteria>
  <done>Permission walker library + tests green.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 4: Author tests/automation/permission-mode.test.js + wire 2 npm scripts</name>
  <read_first>tests/automation/lib/permission-walker.js (Task 3); package.json (existing scripts block — find where to add new ones)</read_first>
  <files>tests/automation/permission-mode.test.js, package.json</files>
  <behavior>
    - For each of 5 SKILL.md files, the test asserts BOTH `simulatePermissionMode(allowed, calls, 'default').passes === true` AND `simulatePermissionMode(allowed, calls, 'dontAsk').passes === true` against the actual scripts in that skill's directory.
    - Test failure surfaces the missing commands per skill per mode.
  </behavior>
  <action>
1. Test file: import `parseAllowedTools`, `extractSubprocessCalls`, `simulatePermissionMode`. Iterate skills `['create','review','content-review','annotate','doctor']`. For each: parse `skills/<name>/SKILL.md` allowed-tools; walk `skills/<name>/scripts/`; assert both modes pass.
2. Edge case: doctor's check.sh shells out to `soffice --version`, `pdftoppm -v`, etc. — but only as introspection (`command -v <bin>` style). Pre-walk (revision — checker W-3): doctor's current `allowed-tools` lists `Bash(node:*)`, `Bash(soffice:*)`, `Bash(pdftoppm:*)`, `Bash(fc-list:*)`, `Bash(which:*)`, `Bash(bash:*)`, which covers every command surfaced by check.sh's introspection. The walker should pass without edits to doctor. `skills/doctor/SKILL.md` is included in `files_modified` ONLY as a contingency: if the walker (which is more aggressive than the current grep pre-walk) surfaces an additional command, add the missing `Bash(<cmd>:*)` entry in this same task and mark the edit in the plan SUMMARY. If no edit is needed, leave the file untouched and note in SUMMARY that the contingency was unused.
3. `package.json` scripts block (use `Edit` tool, not full rewrite):
   ```
   "gate:activation-panel": "node --test tests/automation/activation-panel.test.js",
   "gate:permission-mode": "node --test tests/automation/permission-mode.test.js",
   ```
4. Verify: `npm run gate:activation-panel` and `npm run gate:permission-mode` both exit 0.
  </action>
  <verify>
    <automated>npm run gate:activation-panel && npm run gate:permission-mode</automated>
  </verify>
  <acceptance_criteria>
    - Both `npm run gate:activation-panel` and `npm run gate:permission-mode` exit 0
    - `grep -c "gate:activation-panel\|gate:permission-mode" package.json` returns ≥ 2
    - Test failures (during dev) print missing-commands diagnostic per skill per mode
    - All 5 skills pass both default + dontAsk simulation
  </acceptance_criteria>
  <done>Permission-mode automation green; both new npm scripts work.</done>
</task>

</tasks>

<verification>
- HARD-10: activation-panel automated; ≥8/10 per skill; <30s
- HARD-11: permission-mode automated; default + dontAsk both pass for all 5 skills
- 2 new npm scripts (`gate:activation-panel`, `gate:permission-mode`) live
- Tests deterministic (no LLM, no real subprocess spawn, no network)
</verification>

<success_criteria>
- AC-10, AC-11 satisfied per SPEC.md
- Both gates run in CI under 30s combined
- Manual checklists in tests/activation-panel.md / tests/PERMISSION-MODE.md no longer block tag push
</success_criteria>

<output>
After completion, create `.planning/phases/10-hardening-documentation-compliance-and-release-automation/10-03-SUMMARY.md`.
</output>
