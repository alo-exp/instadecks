# Activation Panel — 40 Prompts × 4 Skills

This panel validates the activation quality of the four user-invocable Instadecks skills empirically. The tester pastes each prompt into Claude Code (with the plugin installed) as a fresh message and observes which skill (if any) the model routes to.

**Scoring:** 1 point if the correct skill activates; 0 if a different skill activates or none does. **Gate:** ≥ 8/10 per skill (≥ 32/40 overall) is a release-blocking pass criterion (Phase 7 D-01 / SC#1). Below 8/10 indicates the description string in that skill's SKILL.md needs revision.

The first 8 prompts per skill use canonical, keyword-front-loaded phrasings drawn from each skill's description. The last 2 are deliberately ambiguous to stress-test description clarity at the boundary (e.g., "look at my deck" — could route to /review or /content-review).

Record results in `tests/activation-results.md`.

---

## /instadecks:create

1. Build me a pitch deck from this brief about our Q3 product launch.
2. Generate a slide deck for a 10-minute talk on AI in healthcare.
3. Make slides from this PDF whitepaper.
4. Auto-refine this deck until clean — iterate until convergence.
5. I have a transcript of an interview — turn it into a presentation.
6. Compose a 16:9 deck with action titles and speaker notes from these notes.
7. Author a presentation from this URL: https://example.com/post.
8. Create a deck from this markdown brief; pick a non-default-blue palette.
9. I want slides that don't look AI-generated, made from this outline.
10. Build a deck.

---

## /instadecks:review

1. Review my deck for design defects.
2. Critique these slides — does the typography hold up?
3. Find what's wrong with this deck.
4. Does this deck look AI-generated? Run an R18 audit.
5. Run DECK-VDA on my pitch deck.
6. I want a 4-pass design critique of this PPTX.
7. Audit my slides for AI-tells and visual drift.
8. Score the design maturity of this deck.
9. Tell me everything visually wrong with deck.pptx.
10. Look at my deck.

---

## /instadecks:content-review

1. Is my deck persuasive?
2. Run a Pyramid Principle check on my slides.
3. Audit my deck's argument structure for MECE violations.
4. Would a stranger reading this deck without me get the message?
5. Check my claim/evidence balance — every claim sourced?
6. Does my narrative arc have setup, tension, and resolution?
7. Critique the story flow of my pitch.
8. Run a content review focused on action-title quality.
9. Argument-structure audit — is this deck logically airtight?
10. Read my deck.

---

## /instadecks:annotate

1. Overlay these findings on my deck: deck.pptx findings.json.
2. Mark up the slides with the JSON I have.
3. Show me the issues on the slides as an overlay.
4. Annotate the deck with the review findings.
5. Produce an annotated PPTX from this findings sidecar.
6. Generate a markup PDF showing every flagged finding.
7. I have a findings.json — render it as overlays on the deck.
8. Stamp the slides with the major and minor design notes.
9. Visualize the review output on top of the deck.
10. Comment my slides.
