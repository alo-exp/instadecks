# Feature Research — Instadecks

**Domain:** Claude Code plugin for deck generation, design review, content review, and annotation overlay
**Researched:** 2026-04-27
**Confidence:** HIGH — anchored in existing v8 BluePrestige artifacts, the canonical Anthropic `pptx` skill (verified via WebFetch of `anthropics/skills` repo), and 2026 ecosystem scans of Gamma/Beautiful.ai/Pitch/Decktopus/Canva/Copilot/Gemini, plus McKinsey/BCG presentation doctrine and PowerPoint accessibility (WCAG) sources.

---

## Scope Anchors (Read First)

Three things constrain this entire feature analysis — they are non-negotiable from PROJECT.md and must be respected before any feature is added:

1. **CLI surface only** — slash skills inside Claude Code, no GUI, no live-render preview, no web app. Every "feature" below is implemented as agent-driven file generation, not interactive UI.
2. **pptxgenjs only** — no python-pptx, no Aspose, no headless Chromium-to-pptx pipelines. Anything pptxgenjs cannot natively render (waterfall charts, sankey, animations, transitions, embedded video) is automatically disqualified from v1.
3. **No template library, no mutation of existing decks** — `/instadecks:create` authors fresh decks from palette + design-ideas guidance; `/instadecks:review` and `/instadecks:annotate` produce sidecar artifacts (review report, annotated overlay deck), they do not edit the input deck.

Severity-level note: existing `annotate.js` uses **3 levels** (MAJOR / MINOR / POLISH), while the bundled review skill defines **4 levels** (CRITICAL 🔴 / MAJOR 🟠 / MINOR 🟡 / NITPICK ⚪). The review→annotate handoff therefore needs an explicit collapse rule (Critical → Major bar, Nitpick → Polish bar, or extend annotate.js to 4 levels). The prompt mentioning "4 severity-color-coded annotations" appears to conflate the two — flagged in PITFALLS.md.

---

## Feature Landscape

### `/instadecks:create` — Table Stakes

Features any deck-generation tool must have. Missing these = "this isn't a real deck tool."

| # | Feature | Why Expected | Complexity | Notes |
|---|---------|--------------|------------|-------|
| C1 | Multi-format input ingestion (markdown, plain text, freeform brief) | Every modern AI deck tool (Gamma, Beautiful.ai, Decktopus, Canva, Pitch) accepts at least these | S | Already free — Claude reads any text the agent reads |
| C2 | PDF input ingestion | Source decks, briefs, research papers commonly arrive as PDF | S | Use existing pdftoppm + Read tool for text + image; agent does the synthesis |
| C3 | Existing-PPTX input ingestion (read-only — extract content, do NOT mutate) | Users want to "redo this deck better" | M | Use LibreOffice headless to convert pptx→pdf→text or rely on the Skill's existing pptx parsing; PROJECT.md explicitly forbids mutation |
| C4 | URL ingestion (web pages, articles) | Standard since Gamma/Beautiful.ai 2024 | S | Use WebFetch tool; let the agent decide what's relevant |
| C5 | Image input ingestion | Charts/diagrams as source material; vision-capable models read these | S | Native to Claude Code's Read tool |
| C6 | Transcript / interview-notes input | Common starting point for thought-leadership decks | S | Just text; same path as C1 |
| C7 | PPTX output | The whole point of the plugin | M | pptxgenjs core capability |
| C8 | PDF output (sidecar) | Sharing, review pipeline, annotation overlay alignment | S | LibreOffice `soffice --convert-to pdf` already in v8 toolchain |
| C9 | 16:9 widescreen default (13.33×7.5 in) | 4:3 is dead in 2026; mismatched dimensions are a 🔴 finding in the bundled review skill | S | Hardcode in pptxgenjs `defineLayout` |
| C10 | Title slide | First slide of every deck; Gamma/Beautiful/Pitch all generate one | S | Standard pptxgenjs |
| C11 | Section divider slides | McKinsey doctrine; bundled review skill checks for them | S | Standard layout pattern |
| C12 | Content slides with action-title + body | The McKinsey "action title" doctrine — declarative sentence at top, NOT a topic label. Bundled review flags `🟠 Major | Missing action title on content slide` | M | Need prompt-level guidance ensuring titles are claims not labels |
| C13 | Two-column layout (text + visual) | Most-used content layout in consulting decks; called out in pptx skill design ideas | S | pptxgenjs positioning |
| C14 | Comparison layout (2-up or 3-up) | Before/after, pros/cons, options matrix; Anthropic skill calls this out | S | Side-by-side columns |
| C15 | Data slide with chart | At least bar/line/pie/area; the four chart types pptxgenjs renders cleanly | M | pptxgenjs supports area, bar, bar3d, bubble, doughnut, line, pie, radar, scatter |
| C16 | Data slide with table | Standard for financials, comparisons, schedules | M | pptxgenjs `addTable` |
| C17 | Stat-callout slide (large number + label) | Pptx skill design ideas explicitly recommends 60–72pt numbers | S | Just text positioning |
| C18 | Quote slide | Testimonials, customer voice, framing | S | Single text block, distinctive styling |
| C19 | Closing / CTA slide | Bundled review skill checks for it; sandwich structure (dark→light→dark) is a pptx skill recommendation | S | Mirror title-slide treatment |
| C20 | Speaker notes per slide | Standard across Gamma, Copilot, Gemini, Canva — users now expect AI-generated notes | S | pptxgenjs `slide.addNotes(text)`; just have the agent write them |
| C21 | Page numbers on content slides (suppressed on title/dividers) | Bundled review flags missing/inconsistent page numbers as 🟠 Major | S | pptxgenjs slide-master pattern |
| C22 | Source line on data slides | McKinsey doctrine; bundled review flags missing source as 🟠 Major | S | 8–9pt grey/italic, bottom-left |
| C23 | Curated palette selection (use ONE of the 10 palettes from pptx skill, not "make one up") | Pptx skill says: "If swapping your colors into a completely different presentation would still 'work,' you haven't made specific enough choices" | S | The 10 palettes (Midnight Executive, Forest & Moss, Coral Energy, Warm Terracotta, Ocean Gradient, Charcoal Minimal, Teal Trust, Berry & Cream, Sage Calm, Cherry Bold) ship with the plugin as a JSON token file |
| C24 | Curated typography pairing (Header + Body) | Pptx skill ships 8 pairings (Georgia/Calibri, Arial Black/Arial, Cambria/Calibri, etc.) | S | Same JSON token approach |
| C25 | Visual motif commitment (one repeated element — rounded frames, icons-in-circles, single-side borders) | Pptx skill: "Pick ONE distinctive element and repeat it" | M | Encoded as a build-time choice baked into every slide |
| C26 | One-message-per-slide enforcement | Bundled review skill, pptx skill, and 2026 design trends all converge on this | M | Prompt-level discipline; reviewer flags violations |
| C27 | Content-informed color choice (no default blue) | Pptx skill explicit anti-tell: "Don't default to blue" | S | Agent picks palette based on topic, not by default |
| C28 | Auto-refine loop (`/create` invokes `/review` internally → fix → re-review until clean) | PROJECT.md core requirement; convergent self-refinement is established practice (Self-Refine paper, DesignLab framework) | L | Most complex feature in v1; needs convergence detection (e.g., reviewer reports zero genuine 🔴/🟠) and interrupt-friendly loop |
| C29 | Design rationale doc output (sidecar markdown) | PROJECT.md requires it; differentiates from black-box generators (Gamma/Beautiful.ai don't expose rationale) | S | Just write a third file — palette choice, motif choice, narrative arc, slide-by-slide intent |
| C30 | Self-contained scripts (no `~/.claude/skills/` reaches) | Marketplace plugin requirement | S | Bundle annotate.js, palette JSON, review skill content inside the plugin folder |

### `/instadecks:review` — Table Stakes (Design)

What reviewers must check. The existing `deck-design-review` skill already implements most of these; bundling it preserves all of them.

| # | Feature | Why Expected | Complexity | Notes |
|---|---------|--------------|------------|-------|
| R1 | PDF→images conversion at 120 DPI | Already in `deck-design-review` workflow; required because Claude reads images, not PPTX directly | S | `pdftoppm -jpeg -r 120` |
| R2 | Inferred design system baseline (§2 of report) | Already in skill; required so findings can reference deviations from the deck's own baseline | S | Read first ~5 slides, declare aspect ratio, type ramp, palette, action-title zone, footer |
| R3 | 4-pass scan per slide (Macro → Typography → Data → Micro) | Already in skill; this is the methodology that makes the review thorough | S | Already documented |
| R4 | 4-tier severity (Critical 🔴 / Major 🟠 / Minor 🟡 / Nitpick ⚪) | Already in skill; matches industry convention (also used by Linear, Sentry, JIRA) | S | Existing |
| R5 | Finding grammar: `[Severity] | [Category] — [Location] — [Defect] — [Standard violated] — [Fix]` | Already in skill; downstream consumer (annotate.js) needs structured output | S | Existing |
| R6 | Per-slide §3 output (every slide, no skipping — including title/TOC/dividers/appendix) | Already in skill; "exhaustive means exhaustive" | S | Existing |
| R7 | §1 deck-level systemic findings (issues on ≥3 slides) | Already in skill; partner-readiness depends on it | S | Existing |
| R8 | §4 scoreboard with maturity rating (Draft / Internal-ready / Client-ready / Partner-ready) | Already in skill; gives the auto-refine loop a stop signal | S | Existing |
| R9 | §5 top-10 highest-leverage fixes | Already in skill; orders the fix queue for the regenerator | S | Existing |
| R10 | Anti-pattern flag table (3D charts, default theme, lorem ipsum, etc.) | Already in skill; instant-reject patterns | S | Existing |
| R11 | Contrast checking (WCAG AA: 4.5:1 body / 3:1 large) | Already in skill; PowerPoint's own checker misses contrast issues per 2026 sources | M | Vision-based estimate is acceptable for v1; algorithmic tooling is differentiator |
| R12 | Type-ramp consistency check across deck | Already in skill; this is what makes a deck feel "cohesive" | S | Existing |
| R13 | Action-title compliance check (declarative, not label, ≤2 lines, consistent terminal-period rule) | Already in skill; McKinsey core doctrine | S | Existing |
| R14 | Page-number/footer system consistency | Already in skill | S | Existing |
| R15 | Pixel-perfect alignment flagging (>1px misalignment, >2px spacing inconsistency) | Already in skill | S | Existing |
| R16 | Two input modes: deck-file path OR structured deck-spec handoff | PROJECT.md explicit requirement (latter for `/create` pipeline) | M | Standalone mode = current; pipelined mode = direct ingestion of pre-render spec, skip PDF render step |
| R17 | Dark/light slide consistency check (no off-white drift, no content slide on wrong background) | Already in skill (Categories 51–53) | S | Existing |
| R18 | "AI tells" detection — accent lines under titles, generic stock blue, identical layouts repeated | NEW — not yet in `deck-design-review`; pptx skill explicitly calls out accent lines as "hallmark of AI-generated slides" | M | Add to anti-pattern table; needs to actually fire on the visual signal |
| R19 | Pipeline-by-default into `/instadecks:annotate` | PROJECT.md explicit requirement | S | Just an orchestrator step |
| R20 | Standalone-invocable mode (without `/annotate`) | PROJECT.md explicit requirement | S | Default to "do annotate next, unless told otherwise" |

### `/instadecks:content-review` — Table Stakes (Content)

A separate skill from design-review per PROJECT.md. The space is less standardized than design-review, but the consulting-slide and pitch-deck literatures converge on these checks.

| # | Feature | Why Expected | Complexity | Notes |
|---|---------|--------------|------------|-------|
| CR1 | One-idea-per-slide enforcement | Universal 2026 design principle; the 6×6 rule (max 6 bullets, max 6 words each) is the legacy version | S | Slide-by-slide check |
| CR2 | Pyramid Principle / MECE structural check (lead with conclusion; arguments mutually exclusive, collectively exhaustive) | McKinsey/BCG/Bain doctrine; the dominant content-review framework | M | Whole-deck check, not per-slide |
| CR3 | Action-title quality — does the title state the take-away, not the topic? | Different from R13 (which checks formatting); CR3 checks meaning | M | Per-slide; needs Claude to actually read for claim-content |
| CR4 | Narrative arc check (Setup → Problem → Solution → Proof → Ask, or chosen variant) | 2026 sources converge on narrative-first deck design | M | Whole-deck flow analysis |
| CR5 | Audience-fit check (jargon density, technical depth, assumed knowledge) | Universal critique-axis; varies by stated audience | M | Needs the user to state the audience; default = "general business" |
| CR6 | Claim/evidence balance (every claim backed by data/source/example?) | Consulting standard; flagged as missing-source by design-review but content-review is the layer that asks "is the claim itself supported?" | M | Per-slide |
| CR7 | Redundancy / overlap detection (same point on multiple slides) | MECE doctrine; common content-review finding | M | Cross-slide analysis |
| CR8 | Length-per-slide / word-count flags (slides that are walls of text, slides that are too thin) | Bundled pptx skill recommends max ~50 words per content slide | S | Word count + flag |
| CR9 | Standalone-readability test (does the slide stand alone? consultant test: "managing partner flips through, reads only titles") | Consulting doctrine — slides are documents, not props | M | Per-slide; can the title alone convey the take-away? |
| CR10 | Reuse the 4-tier severity (Critical/Major/Minor/Nitpick) | Consistency with `/review`; downstream `/annotate` already understands it | S | Same severity grammar |
| CR11 | Same finding-grammar as `/review` (so output can pipe into `/annotate` if desired) | Consistency; future-proofs content-findings overlay | S | Same format string |
| CR12 | Content-vs-design mode boundary — content-review must NOT comment on design (and vice versa) | Bundled design-review explicitly forbids content-comments and that boundary preserves both reviewers' precision | S | Hard prompt boundary |

### `/instadecks:annotate` — Table Stakes (Annotation Overlay)

The existing v8 `annotate.js` defines the contract. Listed here for completeness and to clarify what is "locked verbatim" per PROJECT.md.

| # | Feature | Why Expected | Complexity | Notes |
|---|---------|--------------|------------|-------|
| A1 | Severity color coding (3 levels in current annotate.js: MAJOR=`D97706` orange / MINOR=`2563EB` blue / POLISH=`8896A7` grey) | Already in annotate.js, locked verbatim per PROJECT.md | S | Existing — but see A12 below |
| A2 | Color-coded vertical side bar adjacent to each annotation text box | Already in annotate.js; `BAR_W=0.055"` (≥8px at 150 DPI) | S | Existing |
| A3 | Side-rail layout: annotations in left + right columns flanking a center mini-slide | Already in annotate.js; 2.5"-wide cols, mini-slide ≈7.93"×4.46" | S | Existing |
| A4 | Merged-polygon arrow geometry (50%-transparent connector with miter-join elbow) | Already in annotate.js; `ARROW_TRANS=50` | S | Existing — locked |
| A5 | Severity label inside each annotation box (e.g., "MAJOR" tag) | Already in annotate.js; `SEV_H=0.17"` | S | Existing |
| A6 | Body text in IBM Plex Sans 7.5pt navy `1E2A4A` | Already in annotate.js; per-line layout calibrated to LibreOffice rendering | S | Existing — locked |
| A7 | Cap of 3 annotations per side, overflow to above/below mini-slide | Already in annotate.js; `MAX_SIDE=3` | S | Existing |
| A8 | PPTX overlay output | Core deliverable | S | Existing |
| A9 | PDF overlay output (sidecar) | Sharing/review | S | Use same soffice convert |
| A10 | Input contract: consume `deck-design-review` JSON-or-structured-text output | PROJECT.md: "consumes the existing `deck-design-review` output format" | M | Today the review outputs markdown — needs a deterministic parser, OR the skill can emit a parallel JSON sidecar. Worth specifying in spec phase |
| A11 | Footer line (slide number, total, deck title) | Already in annotate.js | S | Existing |
| A12 | Severity-level mapping rule: design-review's 4 levels (Critical/Major/Minor/Nitpick) → annotate.js's 3 (MAJOR/MINOR/POLISH) | Required gap-bridge between bundled review and bundled annotate | S | Decision needed in spec phase: probably Critical+Major→MAJOR-orange (or split), Minor→MINOR-blue, Nitpick→POLISH-grey. Or: extend annotate.js (forbidden — verbatim). Recommended: collapse-on-input with explicit rule documented in `/annotate` skill prompt |
| A13 | Standalone invocation (call /annotate with a review report path, even outside the /review pipeline) | Symmetry with /review's standalone mode | S | Just a CLI argument |

---

### Differentiators (Competitive Advantage)

Features that go beyond table stakes and would set Instadecks apart in the alo-labs marketplace. **These are NOT all in v1 scope** — listed for awareness; the v1 pick from this list is filtered by PROJECT.md's "Active" requirements.

| # | Feature | Value Proposition | Complexity | v1? | Notes |
|---|---------|-------------------|------------|-----|-------|
| D1 | Auto-refine loop until reviewer-clean (no fixed cycle cap) | Most AI deck tools generate once, hand back. Self-refine to convergence is differentiated. | L | **YES** | PROJECT.md explicit; this is the core competitive moat |
| D2 | Design rationale doc as a first-class output | Black-box generators (Gamma/Beautiful.ai) don't explain their choices. Rationale = trust. | S | **YES** | PROJECT.md explicit |
| D3 | Bundled content-review alongside design-review | Most tools do one or the other (Pitch/Beautiful focus on design; Manus/Decktopus focus on content) | M | **YES** | PROJECT.md explicit |
| D4 | Annotation overlay as a separate artifact (vs. inline review notes) | Visual annotation overlay is rare — Figma has it, design-review tools don't usually. The merged-polygon arrow + severity rail is distinctive. | M | **YES** | PROJECT.md explicit; annotate.js verbatim |
| D5 | Curated palette/typography library shipped with prompt guidance, not template files | Differs from "template marketplace" approach (Beautiful, Decktopus, SlideTeam) — palette guidance lets every deck be fresh while staying tasteful | S | **YES** | PROJECT.md explicit (palette, not templates) |
| D6 | "AI-tell" detection (accent lines under titles, default blue, etc.) | Most generators have these; few critics catch them | M | **YES** (R18) | Adds differentiation to the review skill |
| D7 | Visual regression / version diff (slide-by-slide comparison across deck versions) | SlideDiff and Aspose are standalone tools — bundling diff into a generation+review plugin is rare | L | NO (v2) | Belongs after v1 ships |
| D8 | Brand auto-detection from URL (extract logo, palette, fonts) | Beautiful.ai, Gamma, Pitch all do this in 2026 | L | NO (v2) | PROJECT.md says "no Sourcevo branding, no single-user customization" — but generic per-deck brand inference is different from baked-in branding. Defer to v2; not in current Active |
| D9 | WCAG accessibility audit (alt-text, color-only-info, contrast) | PowerPoint's own checker misses ~60–70% of issues per 2026 sources; Aelira, SlideSpeak ship dedicated accessibility audits | M | Maybe v1 | Could fit inside `/review` as a category. Confidence MEDIUM — not in PROJECT.md Active explicitly, but "accessibility" was raised in the question. Recommend: include contrast checking (already R11), defer alt-text and color-only-info to v1.x |
| D10 | Multi-language localization | Canva/Gamma/Pitch all do this | L | NO (v2) | Out of scope for v1 |
| D11 | Voice/tone analysis (formality, sentiment, brand voice match) | Differentiator vs. Beautiful/Gamma which ignore tone | M | NO (v2) | Belongs in content-review v2 |
| D12 | Programmatic / pipelined CI mode (JSON output, exit-code on Critical findings) | DECK-VDA prompt notes this as "for automation pipelines" | S | NO (v1.x) | Easy add post-launch; Claude Code surface is interactive-first |
| D13 | Theme-factory style theming with multiple Anthropic-curated themes | Anthropic ships a separate `theme-factory` skill | S | Maybe v1.x | Could compose with `/instadecks:create` — but adds dependency surface |
| D14 | Slide-master / re-usable layout patterns within a single deck | pptxgenjs supports it; would reduce token spend on long decks | M | NO (v1) | Doesn't fit "fresh each time" principle in PROJECT.md |
| D15 | Image generation (DALL-E / Imagen / Nano Banana for in-deck visuals) | Gamma, Beautiful, Pitch all do this in 2026 | M | NO (v1) | Out of scope; user can supply images. Defer until clear demand from public users |
| D16 | Embedded video / GIF / live polls | Gamma core feature | M | NO | pptxgenjs limitation; not pursued |
| D17 | Real-time collaboration / multiplayer editing | Gamma, Pitch, Beautiful all do this | XL | NO | GUI/web feature, ruled out by CLI-only constraint |
| D18 | Convergence diagnostics (visualization of refine-loop iterations) | Distinctive — would let user see "loop ran 4 cycles, here are what it fixed each time" | S | Maybe v1 | Cheap if loop already logs iterations; just expose them |
| D19 | "Speaker rehearsal" mode — generate a rehearsal script with timing per slide | Standard since 2026 (Gemini, Copilot, Manus) | S | NO (v1.x) | Speaker notes (C20) already covered; full rehearsal script is a step beyond |
| D20 | Slide deck → handout / leave-behind document conversion | Bundled in many corporate plugins | M | NO (v2) | Out of scope; just keep PDF-export |

### Anti-Features (Explicit Exclusions)

Features that seem useful but are deliberately out of scope. These extend (and respect) PROJECT.md's Out of Scope list.

| # | Anti-Feature | Why Excluded | What to Do Instead |
|---|--------------|--------------|---------------------|
| AF1 | **Bundled visual templates / template library** | (PROJECT.md) Palette + design-ideas guidance is the contract; generated decks are fresh each time | Ship 10 curated palettes + 8 typography pairings as JSON tokens, plus the pptx-skill design-ideas prose |
| AF2 | **python-pptx or any non-pptxgenjs renderer** | (PROJECT.md) Toolchain consistency with v8 + annotate.js | pptxgenjs only, even if it forecloses some chart types (waterfall, sankey) |
| AF3 | **Mutating user-supplied decks (in-place edits)** | (PROJECT.md) `/create` only authors; templates can inform style but plugin doesn't write to existing files | Always emit a new file with versioned name; `/review` and `/annotate` produce sidecar artifacts |
| AF4 | **Sourcevo / single-user branding hard-coded** | (PROJECT.md) Public marketplace plugin | All branding settings come from per-deck input or palette tokens; no internal defaults |
| AF5 | **Rewriting annotate.js geometry / colors / alignment math** | (PROJECT.md) Locked verbatim — pixel-fidelity to v8 BluePrestige | Use as-is; if 4-tier→3-tier mapping is needed, do it on input parsing, not by editing annotate.js |
| AF6 | **Standalone `deck-design-review` skill (separate from plugin)** | (PROJECT.md) Superseded — bundled inside `/review` | One canonical home for review logic |
| AF7 | **Fixed cap on auto-refine cycles** | (PROJECT.md) Run until reviewer reports no genuine issues; user can interrupt | Convergence detector + interrupt-friendly loop, no artificial cap |
| AF8 | **Web UI / GUI / browser preview / live edit canvas** | (PROJECT.md) Slash-skill CLI surface only | All output is files; user opens them in their preferred app |
| AF9 | **In-deck image generation (DALL-E / Imagen / Nano Banana / Stable Diffusion)** | New exclusion. Adds API dependency, license complexity, regenerated-artifact debt | User supplies their own images; agent uses placeholder shapes/icons if no image given |
| AF10 | **Embedded video, GIFs, animations, slide transitions** | New exclusion. pptxgenjs has limited/no support; v8 work doesn't use them | Pure-static decks; if motion is needed, user uses a different tool |
| AF11 | **Real-time collaboration / commenting / change-tracking on the deck** | New exclusion. Inherent to GUI/web tools (Gamma/Pitch/Beautiful); incompatible with CLI plugin | Use GitHub for review collaboration; the plugin produces files, not live docs |
| AF12 | **Stock-photo / icon library bundling** | New exclusion. Licensing minefield (Getty/Shutterstock/Unsplash all have different rules); also a 50–500 MB artifact bloat | User supplies images; the agent never includes images it didn't receive |
| AF13 | **Brand-guidelines auto-extraction from URL** | New exclusion (for v1). Differentiator-but-out-of-scope; PROJECT.md explicit on no single-user customization | Defer to v2; v1 takes palette as input or picks from the 10 curated palettes |
| AF14 | **Multi-language deck output / translation** | New exclusion (for v1). Out of scope; massively expands surface area (font support, RTL layout, character-width metrics in annotate.js) | English-only v1; defer i18n to v2 |
| AF15 | **Outlining tool / brainstorming pre-stage** | New exclusion. Some tools (Gamma, Decktopus) have a separate "outline first" mode; here the agent writes the outline implicitly during /create | Trust the agent's planning; don't expose a separate "make outline" skill |
| AF16 | **Cap on slide count** | New exclusion. Some tools cap at 10 or 30 slides | Respect what the input warrants; reviewer skill already handles long decks via chunked-subagent pattern |
| AF17 | **Hard cap on review iterations even when user asks for one** | (Implicit from PROJECT.md) | If user explicitly says `--max-iterations N`, honor it; default is unlimited until convergent |
| AF18 | **Built-in PPTX→Google Slides conversion** | New exclusion. Out of scope; user can use Google's importer | PPTX + PDF output is enough |
| AF19 | **Editing or extending the v8 annotate.js algorithm** | (PROJECT.md) Verbatim reuse | Any annotation-format adjustment goes upstream of annotate.js (in the parser/severity-mapper), never inside annotate.js |
| AF20 | **Automatic upload / publish to a presentation host** | New exclusion. Out of CLI-plugin scope; per-host complexity | Files only; user uploads themselves |

---

## Feature Dependencies

```
Inputs (C1–C6: ingestion variety) ─┐
                                   │
                                   ▼
                     C7  PPTX output ◄────────── pptxgenjs constraint (AF2)
                     C8  PDF output  ◄────────── soffice
                     C20 Speaker notes
                     C29 Design rationale doc
                                   │
                     C10–C19 slide-type templates (title, section, content,
                                                   comparison, data, stat,
                                                   quote, closing)
                                   │
                                   ▼
                     C23 Palette  ◄──── 10 curated tokens (AF1: not templates)
                     C24 Typography pairing
                     C25 Visual motif commitment
                                   │
                                   ▼
                     C28 Auto-refine loop ──invokes──► /review (R1–R20)
                                                            │
                                                            ▼
                                                     §1–§5 report
                                                            │
                                          ┌─────────────────┴────────────────┐
                                          ▼                                  ▼
                                  /annotate (A1–A13)                 (return findings to /create)
                                  ▲                                          │
                                  │   A12 severity-mapping rule              │
                                  │   (4-level review → 3-level annotate.js) │
                                  │                                          │
                                  └─────── annotate.js verbatim (AF5/AF19) ──┘
                                                                             │
                                                                             ▼
                                                                  C28 regenerate fixes
                                                                  (loop until reviewer clean)


/instadecks:content-review (CR1–CR12) ─── parallel to /review, separate skill,
                                          shares severity grammar (CR10–CR11)
                                          but lives in its own dimension
                                          (boundary in CR12)


Plugin packaging (C30: self-contained scripts) ─── all of the above
                                                   bundled inside the plugin folder,
                                                   no ~/.claude/skills/ reaches
```

### Critical Dependency Notes

- **C28 (auto-refine loop) requires R1–R20 to be deterministic enough that "no genuine issues" is detectable.** If review output is free-form prose, the loop has no convergence signal. → Spec phase must require either a structured §4 scoreboard parse or a JSON sidecar from /review.
- **A10 (annotate input contract) requires R5/R6 finding-grammar to be machine-readable.** Today the review skill outputs markdown. → Either (a) /annotate's parser handles markdown (fragile), or (b) /review optionally emits JSON alongside markdown (clean). Recommend (b) — defer the decision to spec phase.
- **A12 (severity mapping) blocks A10.** Without an explicit Critical/Major/Minor/Nitpick → MAJOR/MINOR/POLISH rule, /annotate cannot consume /review output deterministically. Resolve in spec phase before any code.
- **C25 (visual motif) depends on C23 (palette) — motif uses palette colors.** Motif also depends on C24 (typography) — some motifs (italic-accent-text) only work with chosen body font.
- **CR12 (content-vs-design boundary) prevents review skill drift.** Without it, content-review will drift into design comments and vice versa — the v8 work explicitly fought this drift.
- **C29 (design rationale doc) depends on C23/C24/C25** — without those decisions the rationale has nothing to explain.
- **C30 (self-contained scripts) constrains R/A skills** — neither review nor annotate can reach into user-machine paths; everything bundled inside the plugin folder.

---

## MVP Definition

### Launch With (v1) — From PROJECT.md Active List + Research-Driven Additions

These are everything required for "/create produces a polished, design-reviewed, annotated PPTX+PDF that matches what we ship by hand today" — the Core Value statement.

**`/instadecks:create` — v1**
- [ ] C1, C2, C3, C4, C5, C6 — full input variety (markdown/text/PDF/PPTX-read-only/URL/image/transcript)
- [ ] C7, C8 — PPTX + PDF output
- [ ] C9 — 16:9 hardcoded
- [ ] C10–C19 — all eight slide types (title / section / content-2col / comparison / data-chart / data-table / stat-callout / quote / closing)
- [ ] C20 — speaker notes
- [ ] C21, C22 — page numbers and source lines
- [ ] C23, C24, C25 — palette + typography + motif from curated tokens
- [ ] C26, C27 — one-message-per-slide enforcement, no-default-blue
- [ ] C28 — auto-refine loop until reviewer clean (no cap)
- [ ] C29 — design rationale doc as third output
- [ ] C30 — self-contained bundled scripts

**`/instadecks:review` — v1**
- [ ] R1–R17 — all preserved from existing `deck-design-review` skill
- [ ] R18 — AI-tell detection (new addition)
- [ ] R19, R20 — pipeline-default-into-annotate, standalone mode
- [ ] Structured output (markdown + JSON sidecar) — needed for annotate input contract A10

**`/instadecks:content-review` — v1**
- [ ] CR1–CR12 — all twelve content-review checks, with hard boundary against design comments

**`/instadecks:annotate` — v1**
- [ ] A1–A13 — all preserved from `annotate.js` verbatim
- [ ] A12 severity mapping decision documented and implemented in the parser (NOT in annotate.js itself)
- [ ] A10 input contract finalized (recommend: markdown OR JSON sidecar)

**Plugin shell — v1**
- [ ] plugin.json + marketplace metadata
- [ ] Apache-2.0 LICENSE
- [ ] README + usage docs
- [ ] Listing in alo-labs marketplace

### Add After Validation (v1.x — post-launch, demand-driven)

- [ ] D6 (already in v1 as R18) — formal AI-tell rubric expansion as more patterns emerge
- [ ] D9 (partial: contrast in v1 via R11) — add alt-text and color-only-info checks to /review
- [ ] D12 — JSON-out / exit-code mode for CI pipelines (low-effort post-v1)
- [ ] D13 — theme-factory composition (if Anthropic's skill remains stable)
- [ ] D18 — convergence diagnostics surfaced in design rationale doc
- [ ] D19 — speaker rehearsal mode

### Future Consideration (v2+)

- [ ] D7 — visual regression / version diff (deck-vs-deck)
- [ ] D8 — brand auto-detection from URL
- [ ] D10 — multi-language localization
- [ ] D11 — voice/tone analysis in content-review
- [ ] D15 — image generation
- [ ] D20 — handout / leave-behind doc conversion

---

## Feature Prioritization Matrix (v1 only)

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| C1–C6 multi-format input | HIGH | LOW | P1 |
| C7–C9 PPTX+PDF+16:9 | HIGH | LOW | P1 |
| C10–C19 slide types | HIGH | MEDIUM | P1 |
| C20 speaker notes | MEDIUM | LOW | P1 |
| C21–C22 page nums + source lines | MEDIUM | LOW | P1 |
| C23–C25 palette+typography+motif | HIGH | LOW | P1 |
| C26–C27 one-message + no-default-blue | HIGH | MEDIUM (prompt discipline) | P1 |
| **C28 auto-refine loop** | **HIGHEST** | **HIGH** | **P1 (core moat)** |
| C29 design rationale doc | MEDIUM | LOW | P1 |
| C30 self-contained scripts | HIGH (marketplace) | LOW | P1 |
| R1–R17 design review (existing) | HIGH | LOW (already built) | P1 |
| R18 AI-tell detection | MEDIUM | MEDIUM | P1 |
| R19–R20 pipeline + standalone | MEDIUM | LOW | P1 |
| Review structured-output sidecar | HIGH (unblocks A10) | MEDIUM | P1 |
| CR1–CR12 content-review | HIGH | MEDIUM | P1 |
| **A12 severity mapping rule** | **HIGH (unblocks pipeline)** | **LOW (just a spec decision)** | **P1** |
| A10 finalize input contract | HIGH | MEDIUM | P1 |
| A1–A11, A13 annotate verbatim | HIGH | LOW (already built) | P1 |
| Plugin manifests + Apache-2.0 + README | HIGH (marketplace gate) | LOW | P1 |

**Priority key:**
- **P1** — must ship in v1
- **P2** — v1.x (post-launch, demand-driven)
- **P3** — v2+ (defer)

Everything in v1 is P1 by definition (PROJECT.md Active list). The matrix exposes that the highest-value, highest-risk item is **C28 (auto-refine loop)** — it's the differentiator and the integration nexus, requiring R/CR/A all to compose cleanly. Spec phase should resolve A10 + A12 first, because those unblock C28's correctness.

---

## Competitor Feature Comparison

| Feature | Gamma | Beautiful.ai | Pitch | Decktopus | Canva | Manus | Anthropic pptx skill | **Instadecks** |
|---------|-------|--------------|-------|-----------|-------|-------|----------------------|----------------|
| Multi-format input | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **✓** (any-input via agent) |
| PPTX export | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **✓** |
| Speaker notes auto-gen | ✓ | partial | ✓ | ✓ | ✓ | ✓ | partial | **✓** |
| Curated palettes | templates | templates | templates | templates | templates | templates | 10 palettes | **10 palettes** (same source) |
| Action-title doctrine | ✗ | partial | ✗ | ✗ | ✗ | ✗ | ✓ | **✓** |
| Design review (visual QA) | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | partial | **✓ exhaustive** |
| Content review (claim/MECE/narrative) | ✗ | ✗ | ✗ | ✗ | ✗ | partial | ✗ | **✓** |
| Annotation overlay artifact | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | **✓ unique** |
| Auto-refine to convergence (no fixed cap) | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | partial (one-shot) | **✓ unique** |
| Design rationale doc | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | **✓ unique** |
| AI-tell detection (accent lines, default blue) | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | partial (prevention only) | **✓** |
| In-deck image generation | ✓ | ✓ | ✓ | partial | ✓ | ✓ | ✗ | **✗ (anti-feature AF9)** |
| Real-time collab | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | **✗ (anti-feature AF11)** |
| Template library | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | **✗ (anti-feature AF1)** |
| Brand auto-detection from URL | ✓ | ✓ | ✓ | partial | partial | ✗ | ✗ | **✗ in v1 (D8 → v2)** |
| WCAG audit | partial | partial | ✗ | ✗ | partial | ✗ | partial | **partial (R11; D9 → v1.x)** |
| Localization | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | **✗ in v1 (AF14)** |

**The bet:** Instadecks differentiates on the four "✓ unique" rows — exhaustive design review, content review, annotation overlay, auto-refine-to-convergence, and rationale doc. Every commercial competitor has chosen interactivity/templates/images over rigor; Instadecks goes the other way.

---

## Key Takeaways for Roadmap

1. **The auto-refine loop (C28) is the lynchpin.** It composes /create + /review + /annotate. Spec must resolve A10 (review→annotate input contract) and A12 (4-level→3-level severity map) before implementation.

2. **Three skills, four-skill UX.** PROJECT.md says four skills (`/create`, `/review`, `/content-review`, `/annotate`); the technical pipeline is `/create → /review (+/content-review) → /annotate`. Each skill must be standalone-invocable per requirements.

3. **The bundled `pptx` skill design-ideas guidance is non-negotiable.** All 10 palettes, 8 typography pairings, 10 anti-patterns (especially "NEVER use accent lines under titles") must be carried verbatim into `/create`'s prompt. R18 must detect violations of this guidance.

4. **`annotate.js` is locked verbatim. The 4-tier→3-tier severity collapse is the only place the team gets to make a decision.** Recommend: Critical → MAJOR-orange (or split with a new color, but NOT by editing annotate.js — by extending the renderer wrapper in the skill prompt). This is the single highest-leverage spec decision.

5. **Anti-feature discipline is a competitive moat, not a constraint.** Saying "no template library, no real-time, no image gen, no GUI" is what lets Instadecks be exhaustively rigorous in the four areas it does cover. Don't add; preserve focus.

6. **Marketplace shape is light.** Plugin manifests + Apache-2.0 + README + alo-labs listing — small surface, well-defined. No surprises here.

---

## Sources

### Authoritative (HIGH confidence)
- **Anthropic pptx skill (Design Ideas section)** — [github.com/anthropics/skills/blob/main/skills/pptx/SKILL.md](https://github.com/anthropics/skills/blob/main/skills/pptx/SKILL.md) — extracted via WebFetch; canonical 10 palettes, 8 typography pairings, 10 anti-patterns including the explicit "NEVER use accent lines under titles" rule
- **Existing `deck-design-review` skill** — `/Users/shafqat/Documents/Projects/Sourcevo/deck-design-review/SKILL.md` and `/deck-design-review.md` — read in full; basis for /review feature set R1–R17
- **Existing `annotate.js`** — `/Users/shafqat/Documents/Projects/Sourcevo/v5-blue-prestige/annotate.js` — read; confirms 3 severity levels (MAJOR/MINOR/POLISH), 4-color palette, side-rail layout, merged-polygon arrows, 50% transparency, IBM Plex Sans 7.5pt body, navy `1E2A4A`
- **PROJECT.md** — `/Users/shafqat/Documents/Projects/instadecks/.planning/PROJECT.md` — all anti-features and Active scope traced back to it
- **pptxgenjs supported chart types** — area, bar, bar3d, bubble, bubble3d, doughnut, line, pie, radar, scatter — [gitbrent.github.io/PptxGenJS/docs/api-charts](https://gitbrent.github.io/PptxGenJS/docs/api-charts/)

### Ecosystem (MEDIUM confidence — multiple consistent sources)
- [Beautiful.ai vs Gamma comparison (2026)](https://www.beautiful.ai/comparison/beautiful-ai-vs-gamma)
- [10+ Best AI Presentation Makers of 2026 (Alai)](https://getalai.com/blog/best-ai-presentation-makers)
- [Best AI Presentation Tools 2026 (ShareUHack hands-on test)](https://www.shareuhack.com/en/posts/ai-presentation-tools-comparison)
- [Best AI Presentation Makers 2026 (Deckary)](https://deckary.com/blog/best-ai-presentation-maker)
- [Tome exited the market](https://www.beautiful.ai/comparison/gamma-alternatives) — Tome sunset its presentation product March 2025
- [McKinsey/BCG presentation doctrine — Pyramid, MECE, action titles](https://deckary.com/blog/pillar-consulting-presentations-guide)
- [Slideworks (100+ real McKinsey decks)](https://slideworks.io/resources/47-real-mckinsey-presentations)
- [Presentation design trends 2026 — clarity-first, audience-adaptive](https://pitchworx.com/the-ultimate-guide-to-presentation-design-core-principles-for-2026/)
- [Narrative arc in pitch decks](https://qubit.capital/blog/create-storytelling-deck-with-narrative-arc)
- [PowerPoint accessibility WCAG 2026 (Deckary)](https://deckary.com/blog/powerpoint-accessibility) — built-in checker catches only 30–40% of issues; misses contrast in PowerPoint specifically
- [Documenta11y PowerPoint ADA guide](https://documenta11y.com/blog/how-to-make-powerpoint-ada-compliant-a-complete-guide/)
- [SlideDiff — slide-by-slide diff tool](https://slidediff.com/) — informs D7
- [Aspose Slides Comparison](https://products.aspose.app/slides/comparison)
- [Self-Refine paper (NeurIPS 2023)](https://neurips.cc/virtual/2023/poster/71632) — theoretical basis for C28
- [DesignLab framework](https://www.emergentmind.com/topics/iterative-self-refinement) — design-reviewer + design-contributor split, parallels /review + /create relationship
- [Visual Prompting with Iterative Refinement for Design Critique Generation (OpenReview)](https://openreview.net/forum?id=mXZ98iNFw2) — directly relevant to /annotate's bounding-box-style critique generation

### Library / framework (HIGH confidence)
- [PptxGenJS docs](https://gitbrent.github.io/PptxGenJS/) and [API: Charts](https://gitbrent.github.io/PptxGenJS/docs/api-charts/) and [GitHub README](https://github.com/gitbrent/PptxGenJS)
- [skills/pptx/pptxgenjs.md (Anthropic)](https://github.com/anthropics/skills/blob/main/skills/pptx/pptxgenjs.md)
- [pptxgenjs supports text/tables/shapes/images/charts; not waterfall/sankey/animations](https://slideforge.dev/blog/presentation-apis-2026)

---

*Feature research for: Claude Code plugin for deck generation, design review, content review, and annotation overlay*
*Researched: 2026-04-27*
