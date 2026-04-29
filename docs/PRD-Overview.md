# Product Requirements Overview

This document captures the product vision and high-level requirements.
It is kept in sync with `.planning/REQUIREMENTS.md` — the authoritative requirements
source managed by GSD. Update during the FINALIZATION step of each phase.

## Product Vision

Instadecks is a Claude Code marketplace plugin that productizes a refined deck-building workflow into four namespaced slash skills (`/instadecks-create`, `/instadecks-review`, `/instadecks-content-review`, `/instadecks-annotate`). Any Claude Code user can hand the plugin arbitrary input material and receive a polished, design-reviewed, annotated PPTX + PDF without knowing about pptxgenjs, custom-geometry annotation arrows, or our internal review skill.

## Core Value

A user can hand Claude Code arbitrary input material and end up with a polished, design-reviewed, annotated PPTX + PDF — and the output quality matches what we ship by hand today using the v8 BluePrestige toolchain.

## Requirement Areas

See `.planning/REQUIREMENTS.md` for the full list with REQ-IDs. High-level groupings:

- **Plugin Foundation (FOUND)** — manifest, license, contracts, CI gates, fonts, visual-regression baselines
- **`/instadecks-annotate` (ANNO)** — verbatim annotate.js, severity collapse, adapter, standalone + pipelined modes
- **`/instadecks-review` (RVW)** — DECK-VDA design review, R18 AI-tell detection, soffice race fix
- **`/instadecks-create` (CRT)** — multi-format input, render-deck cookbook, 8 slide types, auto-refine loop
- **`/instadecks-content-review` (CRV)** — Pyramid Principle / MECE / narrative-arc / claim-evidence
- **Marketplace Distribution (DIST)** — skill activation, license compliance, alo-labs PR, v0.1.0

## Out of Scope

See `.planning/REQUIREMENTS.md` "Out of Scope" section for the authoritative list with rationale. Highlights:

- Bundled visual templates / template library
- python-pptx or any non-pptxgenjs rendering engine
- Mutating user-supplied PPTX files in place
- Rewriting the v8 annotation algorithm (annotate.js is verbatim)
- Web UI / GUI
- Real-time collaboration
- Embedded video / animations / slide transitions
- Sourcevo-specific branding
