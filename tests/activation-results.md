# Activation Results — v0.1.0

Empty scoring matrix. The tester runs `tests/activation-panel.md` against a Claude Code session with the plugin installed and fills the table below. Aggregate must satisfy the ≥ 8/10 per-skill gate (D-01 / SC#1) before v0.1.0 ships.

**Run by:** TBD
**Run date:** TBD
**Plugin commit:** TBD

---

## /instadecks:create

| #  | Prompt (excerpt)                                                | Activated skill | Score (1/0) | Notes |
|----|-----------------------------------------------------------------|-----------------|-------------|-------|
| 1  | Build me a pitch deck from this brief…                          |                 |             |       |
| 2  | Generate a slide deck for a 10-minute talk…                     |                 |             |       |
| 3  | Make slides from this PDF whitepaper.                           |                 |             |       |
| 4  | Auto-refine this deck until clean…                              |                 |             |       |
| 5  | I have a transcript of an interview…                            |                 |             |       |
| 6  | Compose a 16:9 deck with action titles…                         |                 |             |       |
| 7  | Author a presentation from this URL…                            |                 |             |       |
| 8  | Create a deck from this markdown brief…                         |                 |             |       |
| 9  | I want slides that don't look AI-generated…                     |                 |             |       |
| 10 | Build a deck.                                                   |                 |             |       |

---

## /instadecks:review

| #  | Prompt (excerpt)                                                | Activated skill | Score (1/0) | Notes |
|----|-----------------------------------------------------------------|-----------------|-------------|-------|
| 1  | Review my deck for design defects.                              |                 |             |       |
| 2  | Critique these slides — does the typography hold up?            |                 |             |       |
| 3  | Find what's wrong with this deck.                               |                 |             |       |
| 4  | Does this deck look AI-generated? Run an R18 audit.             |                 |             |       |
| 5  | Run DECK-VDA on my pitch deck.                                  |                 |             |       |
| 6  | I want a 4-pass design critique of this PPTX.                   |                 |             |       |
| 7  | Audit my slides for AI-tells and visual drift.                  |                 |             |       |
| 8  | Score the design maturity of this deck.                         |                 |             |       |
| 9  | Tell me everything visually wrong with deck.pptx.               |                 |             |       |
| 10 | Look at my deck.                                                |                 |             |       |

---

## /instadecks:content-review

| #  | Prompt (excerpt)                                                | Activated skill | Score (1/0) | Notes |
|----|-----------------------------------------------------------------|-----------------|-------------|-------|
| 1  | Is my deck persuasive?                                          |                 |             |       |
| 2  | Run a Pyramid Principle check on my slides.                     |                 |             |       |
| 3  | Audit my deck's argument structure for MECE violations.         |                 |             |       |
| 4  | Would a stranger reading this deck without me get the message?  |                 |             |       |
| 5  | Check my claim/evidence balance — every claim sourced?          |                 |             |       |
| 6  | Does my narrative arc have setup, tension, and resolution?      |                 |             |       |
| 7  | Critique the story flow of my pitch.                            |                 |             |       |
| 8  | Run a content review focused on action-title quality.           |                 |             |       |
| 9  | Argument-structure audit — is this deck logically airtight?     |                 |             |       |
| 10 | Read my deck.                                                   |                 |             |       |

---

## /instadecks:annotate

| #  | Prompt (excerpt)                                                | Activated skill | Score (1/0) | Notes |
|----|-----------------------------------------------------------------|-----------------|-------------|-------|
| 1  | Overlay these findings on my deck…                              |                 |             |       |
| 2  | Mark up the slides with the JSON I have.                        |                 |             |       |
| 3  | Show me the issues on the slides as an overlay.                 |                 |             |       |
| 4  | Annotate the deck with the review findings.                     |                 |             |       |
| 5  | Produce an annotated PPTX from this findings sidecar.           |                 |             |       |
| 6  | Generate a markup PDF showing every flagged finding.            |                 |             |       |
| 7  | I have a findings.json — render it as overlays on the deck.     |                 |             |       |
| 8  | Stamp the slides with the major and minor design notes.         |                 |             |       |
| 9  | Visualize the review output on top of the deck.                 |                 |             |       |
| 10 | Comment my slides.                                              |                 |             |       |

---

## Aggregate

| Skill                       | Score | Pass (≥ 8/10)? |
|-----------------------------|-------|----------------|
| /instadecks:create          |       |                |
| /instadecks:review          |       |                |
| /instadecks:content-review  |       |                |
| /instadecks:annotate        |       |                |
| **Total**                   |       | (≥ 32/40)      |
