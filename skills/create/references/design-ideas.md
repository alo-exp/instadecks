# Design Ideas — Instadecks

> This guidance is original to Instadecks. The structural pattern (curated palettes
> + typography pairings + anti-patterns) is inspired by public design-systems
> literature. No content here is copied or derived from any proprietary source.

## How to use

When composing `render-deck.cjs`, pick:

1. One **palette** matching `DeckBrief.tone` (executive → cooler/darker; analytical → balanced ink+muted; playful → warmer/saturated).
2. One **typography pairing** — IBM Plex Sans is bundled (SIL OFL) and serves as the body anchor for most pairs.
3. Avoid the 10 **anti-patterns** below — `lib/design-validator.js` enforces a subset (default-blue, off-list typography, malformed hex).

## 10 Palettes

Each palette: primary / secondary / accent / ink (body text) / muted (chart axes, footers).

**Indigo Dawn** — primary `1E2761`, secondary `CADCFC`, accent `FFFFFF`, ink `0B1020`, muted `6B7280`. Best for executive narratives wanting depth without corporate-blue cliché. The deep indigo reads as considered, not template-default.

**Slate Forest** — primary `2F3E2E`, secondary `B7C9A8`, accent `F4F1E8`, ink `1A1F18`, muted `5E6B58`. Calm, considered; suits analytical decks with environmental or sustainability themes.

**Crimson Atelier** — primary `8B1E3F`, secondary `F2CBC4`, accent `FBF5EC`, ink `2A0E15`, muted `8A6F77`. Confident, editorial; good for brand-positioning decks where you want a wine-toned warmth without going full red.

**Plex Mono Noir** — primary `0B0B0F`, secondary `D4D4D8`, accent `FAFAFA`, ink `09090B`, muted `52525B`. High-contrast monochrome; ideal for engineering technical decks where the deck itself should feel like a terminal artifact.

**Verdant Steel** — primary `1F4D40`, secondary `B5D8C9`, accent `F5F8F6`, ink `0F1F1A`, muted `5A6F69`. Trustworthy, grounded; works for healthcare or scientific topics where the audience expects calm authority.

**Saffron Brief** — primary `B8651A`, secondary `F4D9B5`, accent `FFFAF0`, ink `2C1810`, muted `8B7355`. Warm and direct; pairs with playful or storytelling tones — good for product-marketing decks targeting SMB audiences.

**Glacier Ridge** — primary `1E5A7A`, secondary `B8DCE8`, accent `F4FAFC`, ink `0F1E2A`, muted `5C7689`. Cool and analytical without defaulting to corporate blue. The teal undertone signals "we're not pulling from the PowerPoint default theme."

**Copper Field** — primary `9C4221`, secondary `EBC8B8`, accent `FFF8F1`, ink `2D1410`, muted `8B6A5C`. Earthy, distinctive; good for product launches where the deck should feel hand-tuned, not corporate.

**Cobalt Plex** — primary `2546B0`, secondary `BFD0F0`, accent `F5F8FF`, ink `0B1837`, muted `5A6B8C`. Saturated cobalt — explicitly NOT default-PowerPoint-blue; signals deliberate selection. Use when the brief calls for blue but you want to avoid R18.

**Cerulean Plex** — primary `0E7490`, secondary `B5E2EB`, accent `F0FAFB`, ink `082F38`, muted `4A6C73`. Crisp, modern; fits SaaS or data-product decks where the audience expects a recognizably-tech aesthetic without being generic.

## 8 Typography Pairings

IBM Plex Sans (bundled, SIL OFL) is the body anchor.

1. **Inter + IBM Plex Sans** — executive, high-density information. Inter's tight metrics carry headings; Plex Sans gives bullet rhythm.
2. **IBM Plex Serif + IBM Plex Sans** — analytical, long-form claims. The serif heading lends weight without formality.
3. **Cambria + IBM Plex Sans** — corporate-traditional (Cambria ships with most MS installs; substitution-safe across Win/Mac).
4. **Calibri + IBM Plex Sans** — corporate-modern (Calibri ships with MS installs); fallback-safe but legible.
5. **IBM Plex Sans + IBM Plex Sans** — single-family fallback when target platform may not have alternates.
6. **IBM Plex Mono + IBM Plex Sans** — engineering, technical, code-heavy decks. Headings in mono read as deliberate.
7. **Georgia + IBM Plex Sans** — editorial, narrative, storytelling. Georgia's wide aperture pairs warmly with Plex Sans body.
8. **Helvetica Neue + IBM Plex Sans** — minimalist, design-forward (Mac-native; falls back to Arial on Win).

## 10 Anti-Patterns

1. **Layout repetition.** Re-using the same recipe across more than 3 consecutive slides creates the AI-authored signature `/instadecks-review` flags as R18. Vary recipe across narrative-arc beats.

2. **Body-text centering.** Center-aligning body bullets reduces scanability. Left-align body content; reserve center alignment for hero stats and titles on title/closing slides.

3. **Insufficient size contrast.** When heading and body sizes differ by less than ~1.6×, the visual hierarchy collapses. Headings ≥ 24pt; body 12–14pt; stat-callout headlines 60–72pt.

4. **Default PowerPoint blue without justification.** `0070C0`, `1F4E79`, `2E75B6` and their close cousins are the unmistakable default-template fingerprint. `lib/design-validator.js` flags these unless `DeckBrief.tone` or `topic` references "corporate" / "blue" / "finance" explicitly.

5. **Mixed paragraph spacing.** Switching between `paraSpaceAfter` and `lineSpacing` mid-deck produces gappy, inconsistent rhythm. Pick one; cookbook recipes default to `paraSpaceAfter: 6` for bullets.

6. **Partial styling.** Bolding only the first half of a list, or italicizing one slide's quotes but not another's, signals carelessness. Apply emphasis rules consistently across the deck.

7. **Text-only slides past slide 3.** A wall-of-bullets slide deep in the deck is reader fatigue. Break up with stat-callouts, quotes, or charts.

8. **Padding violations.** Shapes flush against slide edges (x < 0.4 or x+w > 9.6) read as cropped. Cookbook recipes use `MARGIN_X = 0.5`.

9. **Low-contrast palettes.** WCAG AA requires ≥ 4.5:1 for body text. Avoid muted-on-accent or accent-on-secondary combinations for body content.

10. **Accent lines under titles (R18 AI-tell).** A horizontal divider directly below the slide title is the LLM-authored signature `/instadecks-review` flags. If a divider is needed, place it at section-rail position (e.g., under the section number, see `cookbook/section.md`) — never under a title.
