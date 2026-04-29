# Content-Review — The Eight Checks (Reference)

Narrative reference for the eight checks `/instadecks-content-review` runs. Four are mechanical (code) and four are judgment (prompt). All eight emit findings honoring `findings-schema.md` v1.1 (`category: "content"` + `check_id`).

> **Boundary:** This skill flags content / argument / narrative issues only. Visual / typographic / layout issues are `/instadecks-review`'s domain. If you catch yourself writing about color, font, alignment, or layout, DELETE the line — that is `/review`'s domain.

---

## Code-side checks (mechanical, deterministic)

### Check 1 — Action-title quality (`check_id: "action-title"`)

Reuses `skills/create/scripts/lib/title-check.js` `validateTitle()`. Flags slides whose title is a topic label rather than a claim. Severity scales with whether the title is empty, near-empty, or merely topic-shaped. Standard cited: `"Action title (Duarte, Resonate 2010; Knaflic 2015)"`.

### Check 2 — Redundancy (`check_id: "redundancy"`)

`skills/content-review/scripts/lib/redundancy.js` computes bag-of-words cosine similarity over slide title + first-bullet pairs. Identical token sets (cos = 1.0) → Major; near-identical (cos ≥ 0.85) → Minor; below threshold → no finding. Whitelists section-divider boilerplate (`Agenda`, `Q&A`, `Thank You`, etc.).

### Check 3 — Jargon (`check_id: "jargon"`)

`skills/content-review/scripts/lib/jargon.js` regex-matches UPPERCASE 2-5-character tokens in the slide body. ≥6 acronyms → Major; 4-5 acronyms → Minor; ≤3 → no finding. Standard: `"audience-fit (Knaflic 2015)"`.

### Check 4 — Length (`check_id: "length"`)

`skills/content-review/scripts/lib/length-check.js` flags individual bullets over 25 words (Minor) or over 35 words (Major). Per-bullet, not aggregated per slide. Standard: `"Cognitive load (Norman 1988)"`.

---

## Prompt-side checks (LLM judgment)

### Check 5 — Pyramid Principle / MECE (`check_id: "pyramid-mece"`)

Read all slide titles in order; assert the deck follows Minto's pyramid (top: governing thesis; level 2: 2-5 mutually-exclusive collectively-exhaustive supports; level 3: evidence per support). Findings emitted per-deck (slideNum: null) for missing thesis, ME violations, CE gaps, level-3 evidence absences. Standard: `"Pyramid Principle (Minto 1987)"` or `"MECE (Minto 1987)"`.

### Check 6 — Narrative-arc (`check_id: "narrative-arc"`)

Read the deck end-to-end; assert the setup → tension → resolution shape (Duarte). Findings for missing setup (Major), missing tension (Critical / Major), missing resolution (Critical), inverted arc (Major). Per-deck, slideNum: null. Standard: `"Narrative arc (Duarte, Resonate 2010)"`.

### Check 7 — Claim/evidence balance (`check_id: "claim-evidence"`)

Per non-section slide, locate the primary claim (action title's assertion); look for on-slide evidence (number, citation, example, quote, chart, screenshot). Findings for unsupported claims (Major), unattributed evidence (Minor), unsourced numbers (Minor), hyperbole without quantification (Minor). Standard: `"Claim-evidence balance (Heath, Made to Stick 2007)"`.

### Check 8 — Standalone-readability (`check_id: "standalone-readability"`)

Per slide, mentally remove the presenter; ask if the on-slide claim and evidence are self-contained. Findings for presenter-dependent slides (Major), critical-content speaker notes (Minor), unintroduced internal codenames (Minor), distant backreferences (Nitpick). Standard: `"Standalone readability (Reynolds, Presentation Zen 2008; audience-fit per Knaflic 2015)"`.

> **Reminder:** standalone-readability is content-readability (do the WORDS make sense alone), NOT visual readability (contrast, font size, alignment). The visual layer belongs to `/review`.

---

## Severity (4-tier; producer-side only)

| Tier | Glyph | Used in this skill for |
|------|-------|------------------------|
| Critical | 🔴 | No thesis in first 3 slides; missing resolution; zero tension. |
| Major | 🟠 | MECE violation; missing setup; claim without on-slide evidence; standalone-readability failure; ≥6-acronym slide. |
| Minor | 🟡 | Unsourced number; hyperbolic claim; over-25-word bullet; near-redundant slide pair. |
| Nitpick | ⚪ | Distant non-load-bearing backreference. |

The 4→3 collapse to MAJOR / MINOR / POLISH happens ONLY at the `/instadecks-annotate` adapter. Pre-collapsing in this skill is a contract violation (P-01).
