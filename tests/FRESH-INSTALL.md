# Fresh-Machine Install Validation — v0.1.0

End-to-end install validation per Phase 7 D-06 / SC#4. The tester runs the 6 numbered steps below on a fresh machine (or `rm -rf ~/.claude/data/plugins/instadecks` + restart) on Mac AND Windows. Linux is deferred per CONTEXT.md "Out of Scope" for v0.1.0.

**Status:** human_needed — to be filled by the tester for v0.1.0 sign-off.

## Canonical brief (Step 3 input)

> AI in healthcare is moving from research labs to bedside care. Three forces drive the shift: regulatory clarity (FDA AI/ML 2025 guidance), purpose-built foundation models (e.g., MedPalm-3), and EHR-integrated workflows. Skeptics cite hallucination risk and integration cost. Our recommendation: pilot AI-augmented radiology in three hospital systems by Q2 2027.

## Steps

| # | Step | Mac (pass / fail / notes) | Windows (pass / fail / notes) |
|---|------|---------------------------|-------------------------------|
| 1 | `/plugin marketplace add alo-exp/instadecks && /plugin install instadecks` |  |  |
| 2 | `/instadecks:doctor` reports all-green (or follows the per-OS hint to install missing prereqs, then reports green on re-run) |  |  |
| 3 | `/instadecks:create` produces a valid `.pptx` from the canonical brief above |  |  |
| 4 | `/instadecks:review` produces `<deck>.review.json` against the deck from step 3 |  |  |
| 5 | `/instadecks:annotate` produces `<deck>.annotated.pptx` + `.annotated.pdf` from deck + findings JSON |  |  |
| 6 | Open every generated `.pptx` in REAL Microsoft PowerPoint (not LibreOffice). No "PowerPoint repaired this file" dialog, no missing fonts, no broken layouts |  |  |

## Aggregate

| OS      | Score | Pass (6/6)? |
|---------|-------|-------------|
| Mac     |       |             |
| Windows |       |             |

## Artifacts produced (paste paths here after run)

- Step 3 deck: `…`
- Step 4 review JSON: `…`
- Step 5 annotated PPTX + PDF: `…`
