# Architecture Research

**Domain:** Claude Code plugin (multi-skill orchestrator with bundled Node tooling)
**Researched:** 2026-04-27
**Confidence:** HIGH (grounded in three in-house plugin layouts: silver-bullet, topgun, superpowers; plus the locked annotate.js source)

---

## 1. Executive Architectural Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Plugin layout style | Multi-skill, single plugin (topgun pattern, not silver-bullet's mega-plugin) | Three closely-related skills share state and tooling; one install, one version |
| Skill ↔ script split | Heavy Node logic in `scripts/`, SKILL.md is the agent-facing playbook | Matches topgun's `bin/topgun-tools.cjs` and superpowers' `scripts/server.cjs` precedent |
| Inter-skill handoff | Filesystem JSON in `.planning/instadecks/<run-id>/` (per-run dirs) | Matches topgun's `~/.topgun/found-skills-{hash}.json` pattern; survives crashes; Claude can re-read |
| Auto-refine loop owner | `/instadecks:create` skill (the agent itself runs the loop, with Bash to invoke a node helper for verification) | Loop body needs Claude judgment ("is this finding genuine?") — not pure code |
| Convergence condition | Reviewer returns `genuine_issues_count == 0` AND `cycle != 1` (always do at least one cycle), with optional user-interrupt flag | Per PROJECT.md: no fixed cap; reviewer-driven |
| Annotate input contract | The `SAMPLES` array shape from `annotate.js` (see §5) | Locked by "reuse annotate.js verbatim" decision |
| Marketplace mechanics | alo-labs marketplace, NOT alo-exp (see §10) | Silver Bullet + topgun precedent; alo-labs is the public-facing org |
| Bundled binaries | None — depend on system `soffice`, `pdftoppm`, `node` and document via session-start hook | No upstream wheels; plugins must be lightweight |

---

## 2. Repository Layout

### Top-level proposal

```
instadecks/                                 # repo root = plugin root
├── .claude-plugin/
│   ├── plugin.json                         # canonical plugin manifest (name, version, hooks ref)
│   └── marketplace.json                    # marketplace listing (only if self-hosted; usually lives in alo-labs/)
├── hooks/
│   └── hooks.json                          # SessionStart dependency check
├── scripts/                                # plugin-shared shell + node utilities
│   ├── check-deps.sh                       # invoked by SessionStart hook
│   ├── render-deck.cjs                     # pptxgenjs wrapper (used by /create)
│   ├── pptx-to-images.sh                   # soffice + pdftoppm pipeline (used by /review)
│   └── lib/
│       ├── design-ideas.js                 # palette + typography + layout guidance (loaded by /create)
│       └── run-state.js                    # read/write .planning/instadecks/<run-id>/state.json
├── skills/
│   ├── create/
│   │   ├── SKILL.md                        # /instadecks:create playbook
│   │   ├── references/
│   │   │   ├── design-ideas.md             # human-readable copy of palettes, typography, layouts
│   │   │   ├── pptxgenjs-cookbook.md       # patterns for action titles, charts, tables, dividers
│   │   │   └── input-handlers.md           # how to ingest md/pptx/pdf/url/transcript
│   │   └── templates/
│   │       └── render-deck.cjs.template    # boilerplate for the agent-generated deck script
│   ├── review/
│   │   ├── SKILL.md                        # /instadecks:review (design-focused, supersedes deck-design-review)
│   │   ├── references/
│   │   │   ├── decka-vda-methodology.md    # 4-pass critique methodology (carried from deck-design-review)
│   │   │   └── findings-schema.md          # output JSON contract (the input to /annotate)
│   │   └── scripts/
│   │       └── slide-images.cjs            # converts deck → per-slide JPEGs the reviewer reads
│   ├── content-review/
│   │   ├── SKILL.md                        # /instadecks:content-review (separate skill)
│   │   └── references/
│   │       └── content-critique-rubric.md  # narrative coherence, claim-evidence, pacing checks
│   └── annotate/
│       ├── SKILL.md                        # /instadecks:annotate
│       ├── annotate.js                     # bundled VERBATIM from v5-blue-prestige/annotate.js
│       └── references/
│           ├── input-contract.md           # the SAMPLES schema (see §5)
│           └── visual-spec.md              # arrow geometry, severity palette (informational only)
├── tests/
│   ├── fixtures/
│   │   ├── tiny-deck-input.md              # smoke-test input for /create
│   │   ├── tiny-deck.pptx                  # smoke-test input for /review and /annotate
│   │   └── sample-findings.json            # canonical /review → /annotate fixture
│   ├── create.smoke.sh                     # `/instadecks:create` end-to-end smoke
│   ├── review.smoke.sh
│   ├── annotate.smoke.sh
│   └── pipeline.smoke.sh                   # full /create → /review → /annotate run
├── package.json                            # pptxgenjs (only dep), node engines, scripts
├── README.md                               # public-facing usage docs
├── LICENSE                                 # Apache-2.0
├── CONTRIBUTING.md
├── CHANGELOG.md
└── .gitignore
```

### What goes where (and why)

| Folder | Contents | Rationale |
|--------|----------|-----------|
| `.claude-plugin/` | `plugin.json` only | Minimal manifest. `hooks: "./hooks/hooks.json"` reference. Mirror of silver-bullet's pattern. |
| `hooks/` | One `hooks.json`, one shell hook script | Only needs SessionStart dep check. No PreToolUse/PostToolUse — this is a creator plugin, not an enforcer. |
| `scripts/` (plugin-level) | Shared multi-skill utilities | Anything used by 2+ skills lives here (e.g., the soffice→jpeg pipeline used by both /review and standalone /annotate when re-rendering). |
| `skills/<name>/` | One folder per skill | Topgun pattern. `SKILL.md` is the agent-facing playbook; `scripts/` holds skill-private node code; `references/` holds longer markdown the agent loads on demand. |
| `skills/<name>/references/` | Markdown that the SKILL.md references via Read tool | Anthropic best-practice: keep SKILL.md short, push details to references. Superpowers does this with `anthropic-best-practices.md`, `persuasion-principles.md`, etc. |
| `skills/annotate/annotate.js` | The locked verbatim file | Co-located with the skill that owns it, since no other skill calls it. |
| `tests/fixtures/` | Tiny inputs and golden outputs | Smoke tests must be runnable in CI without GPU/network. |
| `package.json` at repo root | One dep: pptxgenjs | annotate.js requires `pptxgenjs`; no other npm deps. |

### Anti-patterns explicitly avoided

- **No `agents/` folder.** Topgun has `agents/` for Task-tool sub-agent prompts; Instadecks does not need sub-agents — the auto-refine loop is the orchestrator itself, not delegated.
- **No `bin/` folder.** Topgun uses `bin/` for a CLI-shaped tool; Instadecks scripts are invoked via `${CLAUDE_PLUGIN_ROOT}/scripts/...` paths, not as a global binary.
- **No top-level `templates/`.** Templates are skill-specific; they live under `skills/<name>/templates/`.
- **No `.silver-bullet.json`-equivalent project-config file.** Per §8 (Configuration), per-project config is optional and uses a simple flat dotfile.

---

## 3. Skill ↔ Script Boundary

### The decision rule

```
                    ┌────────────────────────────────────────┐
                    │   Does the agent need to make decisions │
                    │   IN THE LOOP based on script output?    │
                    └────────────────┬───────────────────────┘
                                     │
                          ┌──────────┴──────────┐
                         YES                    NO
                          │                     │
                          ▼                     ▼
              ┌──────────────────┐   ┌────────────────────┐
              │ Logic stays in   │   │ Bundle as Node CLI │
              │ SKILL.md as Bash │   │ in scripts/, agent │
              │ + agent reasoning│   │ shells out to it   │
              └──────────────────┘   └────────────────────┘
```

### Concrete allocations

| Capability | Where it lives | Why |
|------------|---------------|-----|
| Reading user input (md/pdf/pptx/url) | SKILL.md uses Read/WebFetch tools directly | Already supported by Claude tools; no script needed |
| pptxgenjs slide construction | Generated **by the agent** at runtime, written via Write tool | The deck shape is content-driven — every input gives a different deck; can't be templated |
| `pptxgenjs` library load + `pres.writeFile()` execution | Bash invokes the agent-written `render-deck.cjs` | Agent writes the script, Bash runs `node` to produce the .pptx |
| PPTX → PDF → per-slide JPEGs | `scripts/pptx-to-images.sh` (shared) | Pure deterministic shell pipeline; same code path for all skills |
| Reading the rendered deck for review | SKILL.md uses Read tool on the JPEG paths | Reviewer's job is interpretation, which is the agent's job |
| Computing severity counts, dedupe, "genuine vs non-genuine" filter | SKILL.md, Claude reasoning | Judgment call; cannot be coded |
| Writing review findings to JSON | Bash heredoc or Write tool | Mechanical; no script overhead |
| Annotation rendering (geometry, polygon math, alignment) | `skills/annotate/annotate.js` (verbatim) | Locked, do-not-rewrite per Out-of-Scope |
| State management (which run-id, last cycle, etc.) | `scripts/lib/run-state.js` invoked from Bash | Topgun precedent — small node helper for atomic JSON read/write |

### Anti-pattern: embedding annotate.js logic in SKILL.md

Do **not** transcribe annotate.js's geometry math into the /annotate SKILL.md. The skill's job is to:
1. Locate the findings JSON,
2. Adapt it into the `SAMPLES` shape annotate.js expects (§5),
3. Run `node annotate.js`,
4. Run `pptx-to-images.sh` for the PDF.

The skill is thin glue; the script is the brain.

### Anti-pattern: a giant `render-deck.cjs` template

Do **not** bundle a fixed `render-deck.cjs` that the /create skill parametrises. The deck shape varies too much. Instead, ship a *cookbook* of patterns (`references/pptxgenjs-cookbook.md`) and let the agent compose the script from the cookbook for each run.

---

## 4. Inter-Skill Communication

### Choice: file-based handoff via per-run state directories

```
.planning/instadecks/<run-id>/
├── state.json                  # cycle counter, last skill run, status
├── input/                      # original user input (copy of file or extracted text)
│   └── source.md
├── deck/
│   ├── render-deck.cjs         # the agent-generated render script
│   ├── deck.pptx               # latest rendered output
│   ├── deck.pdf
│   └── slides/
│       ├── slide-01.jpg
│       └── slide-02.jpg
├── reviews/
│   ├── design-cycle-1.json     # /review output, cycle 1
│   ├── design-cycle-2.json
│   └── content-cycle-1.json    # /content-review output (separate)
└── annotated/
    ├── annotations.pptx
    └── annotations.pdf
```

### Why files, not stdout/JSON-over-pipes or SkillTool args

| Approach | Verdict | Reason |
|----------|---------|--------|
| **Filesystem JSON in run dirs** | ✅ Chosen | Survives crashes, debuggable, agent can Read between steps, matches topgun's `~/.topgun/comparison-{hash}.json` pattern |
| Stdout JSON over Bash pipes | ❌ Rejected | Loses state on agent restart; 25k token cap on tool output truncates large reviews |
| `SkillTool(args)` invocation | ⚠️ Partial use only | Yes for the *trigger*, but the data passed via args is just the run-id path, not the payload. Same pattern topgun uses for `Task(subagent_type=..., prompt="read state.json at path X")`. |
| Environment variables | ❌ Rejected | Doesn't survive across separate Bash invocations in Claude Code |
| In-memory (one big skill) | ❌ Rejected | Defeats the purpose of separate /review and /annotate as standalone skills |

### Run-id generation

```bash
RUN_ID=$(date -u +%Y%m%dT%H%M%S)-$(node -e "console.log(require('crypto').randomBytes(3).toString('hex'))")
mkdir -p ".planning/instadecks/$RUN_ID"
```

The run-id is written to `.planning/instadecks/.current` so subsequent skill invocations in the same chat thread find the active run automatically. If the user explicitly invokes `/instadecks:annotate <path>` standalone, the skill creates its own run dir.

### `state.json` shape

```json
{
  "run_id": "20260427T143200-a3f2c1",
  "started_at": "2026-04-27T14:32:00Z",
  "current_skill": "review",
  "current_cycle": 2,
  "input_path": "input/source.md",
  "deck_paths": {
    "script": "deck/render-deck.cjs",
    "pptx": "deck/deck.pptx",
    "pdf": "deck/deck.pdf",
    "slides_dir": "deck/slides/"
  },
  "review_paths": {
    "design": ["reviews/design-cycle-1.json", "reviews/design-cycle-2.json"],
    "content": ["reviews/content-cycle-1.json"]
  },
  "annotated_paths": null,
  "convergence": {
    "design_genuine_issues": 0,
    "content_genuine_issues": 1,
    "converged": false,
    "user_interrupted": false
  }
}
```

This is read by `scripts/lib/run-state.js` (one node helper, mirroring topgun-tools.cjs).

---

## 5. The /review → /annotate Contract (CRITICAL — locked)

This is the most sensitive contract in the project. `annotate.js` is verbatim, so its input shape is the contract.

### What annotate.js consumes

From `annotate.js` lines 107–150 (`const SAMPLES = [...]`):

```javascript
const SAMPLES = [
  {
    slideNum: 7,                              // integer, 1-indexed slide number
    title: 'Slide 07  ·  Freelance Baseline', // free-text title shown above the mini slide
    annotations: [
      {
        sev: 'minor',                         // 'major' | 'minor' | 'polish' (must match SEV map)
        nx:  0.46,                            // x position 0..1 normalised to mini slide width
        ny:  0.16,                            // y position 0..1 normalised to mini slide height
        text: 'Title is ~95 characters...'    // body of the annotation
      },
      // ... more annotations on this slide
    ]
  },
  // ... more slides
];
```

### Required JSON shape that `/review` produces (and `/annotate` consumes)

`reviews/design-cycle-N.json`:

```json
{
  "schema_version": "1.0",
  "run_id": "20260427T143200-a3f2c1",
  "cycle": 1,
  "deck_path": "deck/deck.pptx",
  "methodology": "DECK-VDA",
  "summary": {
    "total_findings": 102,
    "genuine_findings": 14,
    "by_severity": { "critical": 2, "major": 12, "minor": 46, "polish": 42 }
  },
  "slides": [
    {
      "slideNum": 7,
      "title": "Slide 07  ·  Freelance Baseline",
      "annotations": [
        {
          "sev": "minor",
          "nx": 0.46,
          "ny": 0.16,
          "text": "Title is ~95 characters on a single line. Risks wrapping...",
          "genuine": true,
          "rationale": "Confirmed wrap risk at <14:9 viewports"
        }
      ]
    }
  ]
}
```

### Contract mapping

| `annotate.js` field | Source in review JSON | Notes |
|---------------------|-----------------------|-------|
| `slideNum`          | `slides[].slideNum`   | int |
| `title`             | `slides[].title`      | string |
| `sev`               | `slides[].annotations[].sev` | must be `'major'|'minor'|'polish'` (NOT 'critical' — see below) |
| `nx`                | `slides[].annotations[].nx`  | 0–1 |
| `ny`                | `slides[].annotations[].ny`  | 0–1 |
| `text`              | `slides[].annotations[].text`| string |

### Severity normalisation

`annotate.js` only knows `major | minor | polish`. The reviewer methodology produces `critical | major | minor | polish`. The `/annotate` skill MUST map:

```
critical  → major   (most severe in annotate.js's palette)
major     → major
minor     → minor
polish    → polish
```

This mapping happens in the /annotate skill's adapter step, not in the reviewer. The reviewer keeps its full taxonomy in JSON; the annotator collapses on read.

### Filter step (genuine only)

`/annotate` only feeds annotations where `genuine == true` into `SAMPLES`. Non-genuine findings stay in the JSON for audit but are not visualised. This matches the v7→v8 workflow where 8 findings were ruled non-genuine.

### Slide image path convention

`annotate.js` line 450: `const imgPath = path.join(__dirname, \`v8s-${String(sample.slideNum).padStart(2, '0')}.jpg\`);`

The verbatim file expects images at `<annotate.js dir>/v8s-NN.jpg`. The /annotate skill must:
1. Symlink (or copy) `deck/slides/slide-NN.jpg` → `<work-dir>/v8s-NN.jpg`, OR
2. Patch the image path (NO — would violate "verbatim").

**Decision:** symlink approach. The skill creates a temporary working dir under the run path, symlinks slides to the v8s-NN.jpg names annotate.js expects, copies annotate.js into that dir, runs `node annotate.js`. This preserves verbatim while abstracting the naming.

---

## 6. Auto-Refine Loop Control Flow

### Owner: the /create skill itself (the agent runs the loop)

Not an orchestrator script, not a separate skill. The agent is the loop controller because each iteration's "did this fix the issue?" decision is a judgment call.

### Loop pseudocode (in /create's SKILL.md)

```
cycle = 0
genuine_issues = ∞

WHILE genuine_issues > 0 AND NOT user_interrupt:
    cycle += 1

    # 1. Render (or re-render) the deck
    write deck/render-deck.cjs    # agent generates pptxgenjs code
    bash: node deck/render-deck.cjs   # produces deck.pptx
    bash: scripts/pptx-to-images.sh   # produces deck.pdf + slides/*.jpg

    # 2. Invoke review skill via Skill tool
    Skill('/instadecks:review', { run_id, cycle, deck_path: 'deck/deck.pptx' })

    # 3. Read the review output
    review = read .planning/instadecks/<run-id>/reviews/design-cycle-<cycle>.json
    genuine_issues = review.summary.genuine_findings

    # 4. Convergence check
    IF genuine_issues == 0:
        IF cycle == 1:
            # Suspicious — first-pass clean is rare
            log "First-pass clean. Verifying..."
            # Run one more review cycle to confirm
            continue with forced extra cycle
        ELSE:
            converged = true
            break

    # 5. Update plan: which issues to fix this cycle
    apply review findings → updated render-deck.cjs

# 6. Pipeline by default (unless --no-annotate flag)
IF converged AND NOT skip_annotate:
    Skill('/instadecks:annotate', { run_id, review: latest_review_path })
```

### Convergence/exit condition (NOT a fixed cap)

| Exit | Condition |
|------|-----------|
| Clean (success) | `genuine_findings == 0` AND `cycle >= 2` (avoid first-pass-clean false positive) |
| User interrupt | User sends a message during the loop; agent acknowledges and stops |
| Stuck (warning) | `cycle >= 5` AND `genuine_findings` unchanged for 2 cycles → agent surfaces "I'm not making progress" and asks the user how to proceed (NOT auto-stop, just surface) |

The "no fixed cycle cap" requirement is honored: the loop runs until clean. The cycle-5 stuck-detector is advisory, not a hard stop.

### Why a confirmation cycle on first-pass-clean

The reviewer is the same model as the creator. If cycle 1 returns 0 genuine issues, the agent might just be agreeing with itself. Forcing a cycle 2 review (which re-renders and re-images) catches this. This costs ~30s and saves the embarrassment of shipping unreviewed decks.

### User interrupt mechanic

The /create skill polls a flag file at the start of each cycle:

```bash
test -f ".planning/instadecks/<run-id>/.interrupt" && echo "INTERRUPTED"
```

If the user wants to halt, they ask Claude to stop, and Claude touches the flag. Next cycle iteration checks it. (This is convention — Claude Code doesn't have a SIGINT mechanism that survives across tool calls.)

---

## 7. Build Order / Dependency Graph

### Critical-path dependencies

```
                        ┌───────────────────────────┐
                        │ /annotate input contract  │
                        │   (the SAMPLES schema)    │
                        └─────────────┬─────────────┘
                                      │ defines
                                      ▼
                          ┌────────────────────────┐
                          │  /review output schema │
                          └─────────────┬──────────┘
                                        │ frozen-by
                          ┌─────────────┴──────────┐
                          │                        │
                          ▼                        ▼
                  ┌──────────────┐          ┌───────────────┐
                  │   /review    │          │   /annotate   │
                  │ implementable│          │  buildable    │
                  └───────┬──────┘          └───────┬───────┘
                          │                         │
                          └───────────┬─────────────┘
                                      │
                                      ▼
                            ┌───────────────────┐
                            │     /create       │
                            │ (needs /review for│
                            │   refine loop)    │
                            └─────────┬─────────┘
                                      │
                                      ▼
                          ┌───────────────────────┐
                          │  /content-review      │
                          │  (independent of      │
                          │   /create's loop      │
                          │   in v1; can ship     │
                          │   parallel to /create)│
                          └───────────────────────┘
```

### Recommended phase order

| Phase | Build | Why this order |
|-------|-------|---------------|
| **0** | Plugin scaffold (`.claude-plugin/plugin.json`, repo skeleton, package.json, LICENSE, README stub, hooks/hooks.json with dep check) | Nothing else can be tested without a loadable plugin |
| **1** | **Lock the contract** — write `skills/review/references/findings-schema.md` defining the JSON shape that maps to annotate.js's SAMPLES. Generate `tests/fixtures/sample-findings.json`. | Both /review and /annotate depend on this. Without the contract first, you'll rewrite both. |
| **2** | **/annotate** (purest, smallest, most locked skill: bundles annotate.js verbatim, adds the JSON-to-SAMPLES adapter, runs node + soffice). Validate against `sample-findings.json` fixture → byte-identical PPTX. | Smallest diff from existing v8 code. Validates the contract. Lets you ship something. |
| **3** | **/review** (bundles deck-design-review methodology, produces JSON in the locked schema). Test that its output passes through /annotate cleanly. | Builds on the contract. Can be tested standalone (deck file → JSON → annotated output). |
| **4** | **/create** (the orchestrator with the auto-refine loop). Depends on /review being callable via Skill tool. | The most complex skill; benefits from /review and /annotate already being known-good. |
| **5** | **/content-review** (parallel to /create or after — independent skill, no orchestration into /create's loop in v1). | Listed in PROJECT.md as v1 but standalone. Can ship in parallel; not a blocker. |
| **6** | Marketplace listing (PR to alo-labs/marketplace.json), version tagging, public README finalisation | Distribution gate. Comes last so we ship a working artifact. |

### Why /annotate before /create

Counterintuitive but right: /annotate is the most constrained (one verbatim script), so it has the lowest risk and validates the contract earliest. If you build /create first and it generates findings in a shape /annotate can't consume, you've wasted a phase. Building the consumer (/annotate) before the producer (/create's auto-refine loop) is contract-first design.

---

## 8. Plugin Boot / Hooks

### Need analysis

| Hook event | Need it? | Reason |
|------------|----------|--------|
| `SessionStart` | **YES** | Check for `soffice`, `pdftoppm`, `node` once per session — fail fast, friendly message if missing |
| `PreToolUse` | NO | Instadecks doesn't enforce — it creates. No need to gate other tools. |
| `PostToolUse` | NO | Nothing to record after each tool use |
| `Stop` / `SubagentStop` | NO | No ongoing process to clean up; per-run dirs are persistent on purpose |
| `UserPromptSubmit` | NO | We don't intercept user messages |

### `hooks/hooks.json` (the only hook)

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup",
        "hooks": [
          {
            "type": "command",
            "command": "\"${CLAUDE_PLUGIN_ROOT}/hooks/check-deps.sh\"",
            "async": false,
            "timeout": 10
          }
        ]
      }
    ]
  }
}
```

### `hooks/check-deps.sh` behavior

```bash
#!/usr/bin/env bash
# Checks for soffice, pdftoppm, node. Emits friendly summary if any missing.
# Does NOT block session start — just informs the user so /create doesn't fail mid-flight.

missing=()
command -v soffice  >/dev/null 2>&1 || missing+=("LibreOffice (soffice)")
command -v pdftoppm >/dev/null 2>&1 || missing+=("Poppler (pdftoppm)")
command -v node     >/dev/null 2>&1 || missing+=("Node.js")

if [ ${#missing[@]} -gt 0 ]; then
  printf 'instadecks: missing dependencies — %s\n' "$(IFS=,; echo "${missing[*]}")"
  printf 'See: https://github.com/alo-labs/instadecks#prerequisites\n'
fi
exit 0   # NEVER block — informational only
```

### Why not enforce/block

A blocking hook on a creator plugin is hostile. The session continues; the user can install missing deps when they need them. The /create skill's first phase re-checks deps and refuses to start with a clearer message.

---

## 9. Configuration Surface

### What's user-configurable

| Setting | Default | Override location | Rationale |
|---------|---------|------------------|-----------|
| `palette_override` | `null` (uses Design Ideas defaults) | Project-level `.instadecks.json` | Lets a user pin to a brand palette without re-prompting every run |
| `severity_threshold` | `polish` (annotate everything) | Project-level | Lets users say "only annotate major+ findings" |
| `max_refine_cycles_warning` | `5` | Project-level | The "stuck" detector threshold from §6 |
| `auto_pipeline_to_annotate` | `true` | Project-level OR `--no-annotate` flag | Per PROJECT.md: pipeline by default, standalone supported |
| `pptx_layout` | `LAYOUT_WIDE` (16:9) | Project-level | Some users want 4:3; uncommon but supported |
| `output_dir` | `.planning/instadecks/` | Project-level | Some teams hate `.planning/`; let them point elsewhere |

### Config file locations (in priority order)

```
1. Command-line flag           e.g., /instadecks:create --no-annotate
2. Project-level config        ./.instadecks.json
3. User-level config           ~/.config/instadecks/config.json   (rare; mostly for palette pinning)
4. Plugin defaults             scripts/lib/defaults.js (compiled in)
```

### Why a single flat dotfile, not nested

Silver Bullet uses `.silver-bullet.json` with deep nesting because it has 60+ skills. Instadecks has 4 skills and ~6 settings. A flat dotfile is enough; nested config is overkill and discoverability-hostile.

### Example `.instadecks.json`

```json
{
  "palette_override": {
    "primary": "#0A1A3C",
    "accent":  "#2563EB"
  },
  "severity_threshold": "minor",
  "auto_pipeline_to_annotate": false,
  "output_dir": ".instadecks/"
}
```

### NOT configurable (deliberately)

- Annotation arrow geometry (locked in annotate.js)
- Refine-loop convergence condition (must remain "0 genuine findings", not user-tunable)
- Schema version of `findings.json` (versioned via `schema_version` field, not user setting)
- Plugin location (always `${CLAUDE_PLUGIN_ROOT}`)

---

## 10. Marketplace Mechanics

### The alo-labs marketplace pattern

Reference: `/Users/shafqat/.claude/plugins/cache/alo-labs/silver-bullet/0.27.1/.claude-plugin/marketplace.json` and `/Users/shafqat/.claude/plugins/cache/alo-labs/topgun/1.7.0/.claude-plugin/marketplace.json`.

The plugin source repo lives at `github.com/alo-labs/instadecks` (per PROJECT.md, though it says alo-exp — see note below). The marketplace listing lives in a *separate* `alo-labs/marketplace` repo (or in each plugin's own `.claude-plugin/marketplace.json` and is aggregated). Looking at silver-bullet: each plugin ships its own `marketplace.json` with `source: { source: "github", repo: "alo-exp/silver-bullet" }` — this means each plugin self-publishes and is added to the marketplace by reference.

### Files Instadecks needs for marketplace inclusion

```
.claude-plugin/plugin.json          # canonical manifest
.claude-plugin/marketplace.json     # marketplace entry (Instadecks-specific)
LICENSE                             # Apache-2.0 per PROJECT.md
README.md                           # public docs (install + usage)
CHANGELOG.md                        # version history (required for marketplace updates)
```

### `plugin.json` shape (Instadecks)

```json
{
  "name": "instadecks",
  "description": "Generate, design-review, content-review, and annotate PowerPoint decks via slash skills. Built on pptxgenjs.",
  "version": "0.1.0",
  "author": {
    "name": "Alo Labs",
    "email": "info@alolabs.dev"
  },
  "homepage": "https://github.com/alo-labs/instadecks",
  "repository": "https://github.com/alo-labs/instadecks.git",
  "license": "Apache-2.0",
  "keywords": ["pptx", "presentations", "design-review", "annotation", "pptxgenjs"],
  "hooks": "./hooks/hooks.json"
}
```

### `marketplace.json` shape (Instadecks-side)

```json
{
  "name": "alo-labs",
  "owner": {
    "name": "Ālo Labs",
    "email": "hello@alolabs.io"
  },
  "metadata": {
    "description": "Instadecks — slash-skill deck creation, design review, and annotation",
    "version": "1.0.0"
  },
  "plugins": [
    {
      "name": "instadecks",
      "source": {
        "source": "github",
        "repo": "alo-labs/instadecks"
      },
      "description": "Generate, design-review, content-review, and annotate PowerPoint decks via slash skills.",
      "version": "0.1.0",
      "author": {
        "name": "Alo Labs",
        "email": "info@alolabs.dev"
      },
      "homepage": "https://github.com/alo-labs/instadecks",
      "repository": "https://github.com/alo-labs/instadecks",
      "license": "Apache-2.0",
      "keywords": ["pptx", "presentations", "design-review", "annotation", "pptxgenjs"],
      "category": "creative",
      "strict": true
    }
  ]
}
```

### Repo / org disambiguation note

PROJECT.md says repo is `https://github.com/alo-exp/instadecks`. The marketplace conventions used by Silver Bullet and Topgun consistently use `alo-labs` as the *marketplace* owner name and `alo-exp` as the *source repo* org (e.g., topgun's marketplace.json: `"source": "github:alo-labs/topgun"` while plugin.json has `"repository": "https://github.com/alo-labs/topgun"` — these are aliased but the cache path uses `alo-labs/`). Confirm the canonical org with the marketplace maintainer in Phase 6 (marketplace publication); do not rename until verified. This is a **flag for the roadmap**: explicit org-name verification is a Phase 6 sub-task.

### Version tagging

Topgun precedent: semver, with marketplace listing version always matching plugin.json `version`. Tag with `v0.1.0`-style git tags. Marketplace updates trigger when the listed version > installed version in the user's plugin cache.

### Install flow (user-facing)

```bash
# In Claude Code:
/plugin marketplace add alo-labs/marketplace      # one-time, if not already added
/plugin install instadecks@alo-labs               # installs latest
```

After install, the four skills appear:
- `/instadecks:create`
- `/instadecks:review`
- `/instadecks:content-review`
- `/instadecks:annotate`

---

## 11. Data Flow Diagrams

### Full pipeline: /create (auto-refine) → /review → /annotate

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       /instadecks:create  (orchestrator)                     │
│                                                                              │
│  user input                                                                  │
│  (md/pdf/pptx/url/transcript)                                                │
│        │                                                                     │
│        ▼                                                                     │
│  ┌─────────────┐    write    ┌─────────────────────────────────┐             │
│  │ Read input  │──────────▶  │ .planning/instadecks/<run-id>/  │             │
│  └─────────────┘             │   input/source.md               │             │
│                              │   state.json (cycle=0)          │             │
│                              └────────────┬────────────────────┘             │
│                                           │                                  │
│            ┌──────────────────────────────┘                                  │
│            ▼                                                                 │
│  ┌─────────────────────────┐    write     ┌──────────────────┐               │
│  │ Generate render-deck.cjs│ ───────────▶ │ deck/render-deck │               │
│  │ (agent composes from    │              │   .cjs           │               │
│  │  pptxgenjs cookbook +   │              └──────────────────┘               │
│  │  Design Ideas guide)    │                                                 │
│  └────────────┬────────────┘                                                 │
│               │                                                              │
│               │ bash: node deck/render-deck.cjs                              │
│               │ bash: scripts/pptx-to-images.sh                              │
│               ▼                                                              │
│  ┌──────────────────────────────────────────┐                                │
│  │ deck/deck.pptx + deck.pdf + slides/*.jpg │                                │
│  └────────────┬─────────────────────────────┘                                │
│               │                                                              │
│               │   Skill('/instadecks:review', {run_id, cycle})               │
│               ▼                                                              │
│  ┌──────────────────────────────────────────────────────────┐                │
│  │              /instadecks:review  (sub-call)               │                │
│  │                                                           │                │
│  │  Read deck/slides/*.jpg + deck/deck.pdf                   │                │
│  │  Apply DECK-VDA 4-pass methodology                        │                │
│  │  Filter genuine vs non-genuine findings                   │                │
│  │  Position annotations: assign nx, ny per finding          │                │
│  │  Write reviews/design-cycle-N.json                        │                │
│  │  Return summary: { genuine_findings: N }                  │                │
│  └──────────────────────────────┬───────────────────────────┘                │
│                                 │                                            │
│                                 ▼                                            │
│  ┌──────────────────────────────────────────┐                                │
│  │   convergence check                       │                                │
│  │   genuine_findings == 0 AND cycle >= 2 ?  │                                │
│  └──────┬─────────────────────────┬─────────┘                                │
│         │ NO                       │ YES                                     │
│         │                          │                                         │
│         │ apply fixes →            ▼                                         │
│         │ regenerate render-deck   ┌──────────────────────────────┐          │
│         │ ◀────────────────────────│   converged                  │          │
│         │                          └──────┬───────────────────────┘          │
│         ▼                                 │                                  │
│   (back to render)                        │                                  │
│                                           │ if auto_pipeline_to_annotate     │
│                                           ▼                                  │
│  ┌────────────────────────────────────────────────────────────┐              │
│  │           /instadecks:annotate  (auto-pipelined)            │              │
│  │                                                             │              │
│  │  Read latest reviews/design-cycle-N.json                    │              │
│  │  Filter genuine == true                                     │              │
│  │  Map severity (critical→major, etc.)                        │              │
│  │  Adapt to SAMPLES shape                                     │              │
│  │  Symlink slides/slide-NN.jpg → workdir/v8s-NN.jpg           │              │
│  │  bash: node skills/annotate/annotate.js                     │              │
│  │  bash: scripts/pptx-to-images.sh on Annotations_Sample.pptx │              │
│  │  Move outputs → annotated/annotations.{pptx,pdf}            │              │
│  └────────────────────────────────────────────────────────────┘              │
│                                           │                                  │
│                                           ▼                                  │
│                            user receives:                                    │
│                            ▶ deck/deck.pptx                                  │
│                            ▶ deck/deck.pdf                                   │
│                            ▶ annotated/annotations.pptx                      │
│                            ▶ annotated/annotations.pdf                       │
│                            ▶ design-rationale (in chat)                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Standalone invocations

#### Standalone /review (user has a deck, wants critique only)

```
   user: /instadecks:review path/to/some-deck.pptx
            │
            ▼
   ┌──────────────────────────────────────┐
   │ Skill creates a fresh run-id         │
   │ Copies deck → deck/deck.pptx         │
   │ bash: scripts/pptx-to-images.sh      │
   └──────────────────┬───────────────────┘
                      │
                      ▼
   ┌──────────────────────────────────────┐
   │ DECK-VDA 4-pass review               │
   │ Write reviews/design-cycle-1.json    │
   └──────────────────┬───────────────────┘
                      │
                      ▼
   ┌──────────────────────────────────────┐
   │ if auto_pipeline_to_annotate: chain  │
   │ else: present findings in chat       │
   └──────────────────────────────────────┘
```

#### Standalone /annotate (user has a deck + a findings JSON they wrote)

```
   user: /instadecks:annotate findings.json --deck deck.pptx
            │
            ▼
   ┌──────────────────────────────────────┐
   │ Skill creates a fresh run-id         │
   │ Copies deck → deck/deck.pptx         │
   │ Copies findings → reviews/external.json │
   │ bash: scripts/pptx-to-images.sh      │
   └──────────────────┬───────────────────┘
                      │
                      ▼
   ┌──────────────────────────────────────┐
   │ Validate findings.json against       │
   │ schema (skills/review/references/    │
   │  findings-schema.md)                 │
   │ — REJECTS with helpful error if      │
   │   shape doesn't match                │
   └──────────────────┬───────────────────┘
                      │
                      ▼
   ┌──────────────────────────────────────┐
   │ Run annotate.js verbatim             │
   │ Output: annotated/annotations.pptx   │
   └──────────────────────────────────────┘
```

#### Standalone /content-review (user has a deck + outline, wants narrative critique)

```
   user: /instadecks:content-review deck.pptx [--outline path]
            │
            ▼
   Same shape as /review, but applies content-critique-rubric.md
   instead of DECK-VDA. Produces reviews/content-cycle-N.json with
   the same JSON shape but different `methodology` field. Does NOT
   feed into /annotate by default (annotate.js is design-focused).
```

---

## 12. Component Responsibilities (summary table)

| Component | Owns | Hands off to |
|-----------|------|--------------|
| `/instadecks:create` (skill) | Input ingestion, render-deck.cjs generation, auto-refine loop control, default pipelining | `/instadecks:review` (in-loop), `/instadecks:annotate` (post-converge) |
| `scripts/render-deck.cjs` (agent-generated, per-run) | One-shot PPTX rendering using pptxgenjs | Filesystem (`deck/deck.pptx`) |
| `scripts/pptx-to-images.sh` (shared) | PPTX → PDF → per-slide JPEG conversion using soffice + pdftoppm | Filesystem (`deck/deck.pdf`, `deck/slides/*.jpg`) |
| `/instadecks:review` (skill) | DECK-VDA methodology, finding triage (genuine vs non-genuine), nx/ny positioning, JSON output | Filesystem (`reviews/design-cycle-N.json`); caller's convergence check |
| `/instadecks:content-review` (skill) | Narrative coherence, claim-evidence, pacing critique | Filesystem (`reviews/content-cycle-N.json`); standalone (NOT in /create's loop in v1) |
| `/instadecks:annotate` (skill) | Read findings JSON, severity normalisation, SAMPLES adaptation, slide symlinking | `annotate.js` (verbatim), filesystem (`annotated/annotations.{pptx,pdf}`) |
| `skills/annotate/annotate.js` (verbatim) | Polygon-arrow geometry, IBM Plex Sans layout, severity palette, MAX_SIDE overflow | Filesystem (`Annotations_Sample.pptx`) |
| `scripts/lib/run-state.js` | Atomic state.json read/write, run-id generation | All skills (via Bash) |
| `hooks/check-deps.sh` | Session-start dep check (soffice, pdftoppm, node) | Stderr (informational only) |

---

## 13. Anti-Patterns

### Anti-Pattern 1: Putting auto-refine in a separate orchestrator skill

**What people do:** Build a `/instadecks:pipeline` skill that calls /create once, then /review N times.
**Why it's wrong:** Adds a fifth skill, splits the loop owner from the deck author, and makes "regenerate fixes" harder because the orchestrator can't see the deck-generation logic.
**Do this instead:** /create owns the loop. The agent-as-loop is the right abstraction because each iteration involves judgment.

### Anti-Pattern 2: Passing findings via Skill tool args

**What people do:** Use SkillTool's args to pass the entire findings JSON.
**Why it's wrong:** Args have practical size limits, JSON inside JSON inside Bash is escape-hell, and Claude can't re-read a previously-passed payload after the skill returns.
**Do this instead:** Pass only `run_id` and a relative path; both skills resolve via the run dir.

### Anti-Pattern 3: Rewriting annotate.js to read JSON natively

**What people do:** Modify annotate.js to take a `--findings findings.json` flag.
**Why it's wrong:** Violates "annotate.js verbatim" decision in PROJECT.md. Risks regressing the polygon math.
**Do this instead:** /annotate skill is the adapter — it transcodes JSON into the SAMPLES literal that annotate.js expects, by writing a tiny driver script that requires annotate.js as a module OR by mutating the `__dirname/v8s-NN.jpg` filenames via symlinks. Verbatim means *the file is unchanged on disk*; it can be invoked from a wrapper.

### Anti-Pattern 4: Storing run state in environment variables

**What people do:** `export INSTADECKS_RUN_ID=...` and try to thread it through.
**Why it's wrong:** Each Bash tool invocation in Claude Code is a fresh shell. Env doesn't survive.
**Do this instead:** `.planning/instadecks/.current` file pointing to active run-id. Read at start of each Bash, written at run start.

### Anti-Pattern 5: Coupling /create to a specific palette

**What people do:** Hardcode the v8 BluePrestige palette as the only palette.
**Why it's wrong:** Marketplace plugin — public users have their own palettes. Per PROJECT.md "no Sourcevo branding."
**Do this instead:** `references/design-ideas.md` ships *several* curated palettes; the agent picks one based on input cues (input mentions blue/finance → BluePrestige; mentions warm/health → a warm palette) or asks the user.

### Anti-Pattern 6: Reusing the same run-id across user sessions

**What people do:** A "current run" pointer that survives indefinitely.
**Why it's wrong:** Stale state, confusing behavior on the next /create.
**Do this instead:** `.planning/instadecks/.current` is removed on /create completion (success or interrupt). Standalone skills create their own run-id if no `.current` exists.

---

## 14. Integration Points

### External tools (via shell)

| Tool | Used by | Failure mode |
|------|---------|--------------|
| `node` | `/create` (runs render-deck.cjs), `/annotate` (runs annotate.js), `scripts/lib/run-state.js` | Hard fail if missing; SessionStart hook warns |
| `soffice` (LibreOffice) | `scripts/pptx-to-images.sh` | Hard fail if missing; SessionStart hook warns |
| `pdftoppm` (Poppler) | `scripts/pptx-to-images.sh` | Hard fail if missing; SessionStart hook warns |
| `pptxgenjs` (npm) | `render-deck.cjs`, `annotate.js` | Auto-installed in run dir on first use (`npm install pptxgenjs --no-save`) OR documented as user pre-req |

### Internal boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `/create` ↔ `/review` | SkillTool invocation + filesystem JSON | Skill call passes run_id; payload is in `.planning/instadecks/<run-id>/reviews/` |
| `/review` ↔ `/annotate` | Filesystem JSON (locked schema, see §5) | The JSON shape IS the contract. Schema versioned. |
| `/create` ↔ `/content-review` | None in v1 (content-review is standalone) | v2 may add an optional content-review pass to the auto-refine loop |
| Plugin ↔ user filesystem | Writes only under `.planning/instadecks/<run-id>/` (or user-configured `output_dir`) | Never writes outside the configured output dir |
| Plugin ↔ Claude Code | SKILL.md frontmatter + hook config | No custom tooling |

### npm dependency strategy

`pptxgenjs` is the only runtime npm dep. Two options:

| Option | Pros | Cons |
|--------|------|------|
| **Bundle in plugin** (commit `node_modules/pptxgenjs`) | Zero user setup; works offline | ~5 MB inflates plugin size; conflicts with system installs |
| **Install on first use** (run `npm install pptxgenjs --no-save` in run dir on /create init) | Plugin stays small | Requires npm + network on first run |
| **Document as user pre-req** (`npm install -g pptxgenjs`) | Simplest plugin code | Worst UX |

**Recommendation:** install-on-first-use. The auto-refine loop is already network-tolerant (LibreOffice is local), and `npm install pptxgenjs` is a one-time ~3-second cost cached per project. Document the fallback (manual install) in README.

---

## 15. Scaling Considerations

| Scale | Architectural adjustments |
|-------|---------------------------|
| 1 user, 1 deck/week | Current design is fine. Run dirs accumulate in `.planning/instadecks/`; no cleanup needed. |
| 1 user, 50 decks/week | Add a `scripts/clean-old-runs.sh` (delete run dirs > 30 days) referenced from README. |
| 1 user, 100 slides/deck | Test that pptx-to-images.sh handles 100+ pages (it does — pdftoppm is per-page). Annotation overflow with > MAX_SIDE * 2 + above + below per slide may hit annotate.js's hardcoded `MAX_SIDE = 3` limit. **Document this**: per-slide annotation cap ≈ 12 (3 left + 3 right + 3 above + 3 below). |
| Marketplace usage (1000s of installs) | Plugin is stateless across users; each install is independent. No backend infra. The only "scaling" issue is keeping `findings-schema.md` stable across versions; use `schema_version` in JSON to enable migration if shape changes. |

### Bottlenecks (in order of likely)

1. **soffice headless conversion latency.** ~5–15 s per deck for 40-slide PPTX → PDF. Unavoidable without rewriting annotate.js's image-based mini-slide approach. Document in README; consider parallelising slide-image generation in v2.
2. **Auto-refine loop wallclock.** 3 cycles × (render 10s + soffice 15s + review 60s) ≈ 4.5 minutes. Acceptable for marketplace use. The "stuck at cycle 5" detector caps the worst case at ~10 minutes.
3. **Token budget for review.** 40-slide deck × 4 passes × ~500 tokens/slide critique = ~80k tokens just to produce a review. Within Claude's window but pricey. Consider per-slide review chunking in v2.

---

## 16. Sources

- `/Users/shafqat/.claude/plugins/cache/alo-labs/silver-bullet/0.27.1/` — multi-skill, hook-heavy plugin pattern (HIGH confidence)
- `/Users/shafqat/.claude/plugins/cache/alo-labs/topgun/1.7.0/` — multi-skill orchestrator with bundled Node tooling (`bin/topgun-tools.cjs`); state-via-files pattern; agent dispatch (HIGH confidence)
- `/Users/shafqat/.claude/plugins/cache/superpowers-marketplace/superpowers/5.0.5/` — multi-skill plugin with skill-private `scripts/` and `references/` folders (HIGH confidence)
- `/Users/shafqat/Documents/Projects/Sourcevo/v5-blue-prestige/annotate.js` — locked input contract via SAMPLES shape (HIGH confidence; verbatim source)
- `/Users/shafqat/Documents/Projects/Sourcevo/v5-blue-prestige/DESIGN-REVIEW-v7.md` — reference output of the existing deck-design-review skill (informs review JSON schema) (HIGH confidence)
- `/Users/shafqat/Documents/Projects/instadecks/.planning/PROJECT.md` — frozen scope, decisions, constraints (HIGH confidence)
- Anthropic Claude Code plugin conventions: `.claude-plugin/plugin.json`, `hooks.json` event vocabulary (HIGH confidence — observed in three independent in-house plugins)

---

*Architecture research for: Claude Code multi-skill plugin (deck creation + design review + content review + annotation).*
*Researched: 2026-04-27.*
