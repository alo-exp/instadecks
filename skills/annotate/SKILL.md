---
name: annotate
description: Annotate a presentation deck by overlaying or stamping design-review findings on top of slides. This skill should be used when the user wants to mark up, markup, stamp, comment on, overlay flagged findings on, show issues on, or visualize annotations on a deck — given a `.pptx` and a findings JSON sidecar in the locked schema, produces an overlaid `.annotated.pptx` + `.annotated.pdf` with major and minor severity notes.
allowed-tools:
  - Bash(node:*)
  - Bash(soffice:*)
  - Read
  - Write
user-invocable: true
version: 0.1.0
---

# /instadecks:annotate — Overlay Design-Review Findings on a Deck

Annotate a presentation deck with design-review findings — produces an annotated `<deck>.annotated.pptx` overlay and `<deck>.annotated.pdf` rendering when given a `.pptx` deck file and a findings JSON in the locked Instadecks v1.0 schema.

## When to invoke

Use this skill when:
- A user has a `.pptx` deck and a findings JSON sidecar (e.g. produced by `/instadecks:review` or hand-authored) and wants the findings visualized as overlay annotations.
- Another skill (`/instadecks:review` in Phase 3, `/instadecks:create` in Phase 4-5) pipelines findings into annotation rendering — those skills import `runAnnotate` directly per D-06.

## Inputs

- **Deck file** (`.pptx`, required) — path passed as `deckPath`.
- **Findings JSON** (required) — path or in-memory object honouring `skills/review/references/findings-schema.md` v1.0. Required fields per finding: `severity_reviewer ∈ {Critical,Major,Minor,Nitpick}`, `category ∈ {defect,improvement,style}`, `genuine` (boolean), `nx`/`ny` (numbers in [0,1]), `text`, `rationale`, `location`, `standard`, `fix`.
- **Optional `outDir`** — defaults to `.planning/instadecks/<runId>/`. Run-id format: `YYYYMMDD-HHMMSS-<6hex>`.

## Outputs

- `<deckBase>.annotated.pptx` and `<deckBase>.annotated.pdf` written sibling-of-input. Existing siblings are silently overwritten on re-run (D-04). If the input already ends in `.annotated.pptx`, the suffix is not duplicated (P-05).
- `.planning/instadecks/<runId>/` archive containing: `findings.json` copy, `work/v8s-NN.jpg` symlinks (or fresh-rendered JPGs) of slide images, `work/Annotations_Sample.pptx`, `Annotations_Sample.pdf`. Each prior run remains preserved here.

> **Important — overlay artifacts are delta-only, not full-deck.**
> `<deckBase>.annotated.pptx` and `<deckBase>.annotated.pdf` contain overlay slides ONLY for slides with at least one genuine finding — they are NOT a full copy of your deck with overlays burned in. Your original `<deck>.pptx` is unchanged.
>
> To view the overlays in context, use the annotated PPTX as a layered overlay on top of the original deck inside your presentation tool (PowerPoint, Keynote, Google Slides import-overlay), or render the annotated PDF side-by-side with the original PDF. A future release may merge overlays back into a full-deck copy; for v0.1.0 the delta-only artifact is canonical so the round-trip is non-destructive.

## Invocation modes

**Standalone CLI (ANNO-09):**
```bash
node ${CLAUDE_PLUGIN_ROOT}/skills/annotate/scripts/cli.js path/to/deck.pptx path/to/findings.json
```

**Pipelined (ANNO-10, D-06):** other skills `require()` the entry point directly:
```js
const { runAnnotate } = require(`${process.env.CLAUDE_PLUGIN_ROOT}/skills/annotate/scripts/index`);
const result = await runAnnotate({ deckPath, findings /* in-memory object */ });
// result includes:
//   pptxPath, pdfPath          — sibling-of-input annotated artifacts
//   runDir, runId               — archive location
//   pptxRun, pdfRun             — work-dir copies (audit trail)
//   annotatedSlideCount         — unique slide indexes referenced by findings
//   sourceSlideCount            — total slides in the source deck (delta-only contract surface)
```

## Adapter behaviour (locked)

The findings adapter (`scripts/adapter.js`) validates the entire document up front and **fails loud** with a structured error pinpointing the offending finding (e.g. `slides[2].findings[1].nx: must be number in [0,1] (got 1.5)`) — no silent skipping (D-07). After validation it filters `genuine === true` findings and collapses 4-tier reviewer severity to 3-tier annotator severity at the consumer boundary only:

| reviewer severity | annotator severity |
|-------------------|--------------------|
| Critical          | major              |
| Major             | major              |
| Minor             | minor              |
| Nitpick           | polish             |

`/instadecks:review` and `/instadecks:content-review` continue to emit the full 4-tier vocabulary (CLAUDE.md "severity-collapse boundary").

## Allowed tools

- `Bash(soffice:*)` — PPTX → PDF conversion.
- `Bash(node:*)` — CLI invocation.
- `Bash(npm:*)` — first-run dependency install via SessionStart hook.

## Environment

- `CLAUDE_PLUGIN_DATA` — populated by SessionStart hook; node_modules resolves under here.
- `CLAUDE_PLUGIN_ROOT` — script discovery anchor.
- `PPTXGENJS_PATH` — set automatically before requiring the bundled `annotate.js`.
- `CLAUDE_SESSION_ID` — used in the per-call `-env:UserInstallation=file:///tmp/lo-${SESSION_ID}-${PID}` flag passed to `soffice` (D-08) to avoid user-profile collisions.

## Deferred (out of scope for Phase 2)

- **Activation tuning ≥ 8/10** — Phase 7 (DIST-02 / DIST-03) tunes the description string against the prompt-activation panel and finalizes `allowed-tools` scoping for `default` and `dontAsk` permission modes.
- **Full soffice/pdftoppm hardening** — Phase 3 (RVW-09 / RVW-10 / RVW-11) adds file-existence + size checks after each soffice call, 60s timeout + 1 retry, and a cleanup trap on `/tmp/lo-${SESSION_ID}-${PID}` at process exit. Phase 2 ships only the per-call `-env:UserInstallation` flag.
- **Tier 2 visual-regression activation** — pixelmatch fallback in `tests/annotate-visual-regression.test.js` stays `test.skip` until `.github/workflows/ci.yml` RESERVED block installs `soffice` + `pdftoppm` (Phase 7).
