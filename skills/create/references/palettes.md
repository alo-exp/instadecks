# Palette Library

> Curated modern palettes for `/instadecks:create`. Each palette block lists 4–6 hex colors with role labels (`bg`, `primary`, `secondary`, `accent`, `ink`, `muted`), a 1-line use-case, a DO/DON'T table, and an `AI-tells exemption` note. The design-validator (Plan 9-05) reads this file at lint time and recognizes these palettes as legitimate — saturated primaries, bold accents, and non-default-blue treatments are NOT to be flagged when the rendered deck draws colors from one of these palettes.
>
> Hex values are 6-char uppercase `#RRGGBB`. Agents copy values directly into `render-deck.cjs` `PALETTE` tokens. No JSON registry.

---

## Editorial Mono

| Role | Hex |
|---|---|
| bg | `#FFFFFF` |
| primary | `#1A1A1A` |
| secondary | `#454A45` |
| accent | `#E5322D` |
| ink | `#1A1A1A` |
| muted | `#9A9A9A` |

**Use:** Editorial / journalistic briefs — long-form narrative decks where typography carries the design and a single saturated accent (`#E5322D`) anchors visual hierarchy.

| ✅ DO | ❌ DON'T |
|---|---|
| Use the red accent sparingly — one element per slide | Don't tint body type with the accent — keep it inkblack |
| Pair with a serif heading face (Plex Serif) | Don't use multiple accents — this palette is intentionally monochrome+1 |

**AI-tells exemption:** This palette is recognized by `design-validator.js`. Saturated primary accent (`#E5322D`) on a white-ground deck must NOT be flagged as an AI tell when this palette is in use.

---

## Magazine Bold

| Role | Hex |
|---|---|
| bg | `#F4EFE6` |
| primary | `#1A1A1A` |
| secondary | `#3F3F3F` |
| accent | `#FF5A1F` |
| ink | `#1A1A1A` |
| muted | `#8C8478` |

**Use:** Brand / lifestyle / consumer briefs — magazine-feel decks with warm cream ground and an aggressive orange accent for headlines or pull-quotes.

| ✅ DO | ❌ DON'T |
|---|---|
| Use orange for callouts and rule lines | Don't apply orange to body text — contrast suffers on cream |
| Pair with editorial-rule motif | Don't combine with another saturated accent — palette is mono+1 |

**AI-tells exemption:** Recognized palette. Saturated orange (`#FF5A1F`) over cream (`#F4EFE6`) is intentional design, not a tell.

---

## Tech Noir

| Role | Hex |
|---|---|
| bg | `#0A0A0A` |
| primary | `#FFFFFF` |
| secondary | `#B5B5B5` |
| accent | `#00E5FF` |
| ink | `#FFFFFF` |
| muted | `#5A5A5A` |

**Use:** Dev-tools / infra / security briefs — high-contrast dark deck with a cyan accent. Terminal-aesthetic without being cosplay.

| ✅ DO | ❌ DON'T |
|---|---|
| Use cyan for stats and chart accents | Don't put cyan body text — eye fatigue at body sizes |
| Pair with Plex Mono headings for code briefs | Don't soften with mid-grays — contrast is the point |

**AI-tells exemption:** Recognized palette. Dark ground + cyan saturated accent is deliberate; do not flag.

---

## Pastel Tech

| Role | Hex |
|---|---|
| bg | `#F7F4FF` |
| primary | `#2E1F47` |
| secondary | `#4D3A6B` |
| accent | `#A78BFA` |
| ink | `#2E1F47` |
| muted | `#9A91B0` |

**Use:** Consumer-tech / wellness / UX-research briefs — gentle lavender ground with a violet accent. Friendly, modern, non-corporate.

| ✅ DO | ❌ DON'T |
|---|---|
| Use lavender accent for soft callouts | Don't use for executive-finance briefs — too soft |
| Pair with Plex Sans regular weights | Don't add a second saturated accent — pastel discipline |

**AI-tells exemption:** Recognized palette. Lavender + pastel ground is deliberate; do not flag as "non-default Office palette."

---

## Silicon Valley

| Role | Hex |
|---|---|
| bg | `#FFFFFF` |
| primary | `#0F172A` |
| secondary | `#334A55` |
| accent | `#10B981` |
| ink | `#0F172A` |
| muted | `#94A3B8` |

**Use:** SaaS / startup pitch / growth briefs — slate ink with an emerald accent. The "Stripe / Linear / Vercel" register without copying any one brand.

| ✅ DO | ❌ DON'T |
|---|---|
| Use emerald for growth-rate stats | Don't pair with another saturated green |
| Pair with Inter or Plex Sans | Don't add a third accent — discipline = polish |

**AI-tells exemption:** Recognized palette. Emerald accent is intentional; do not flag.

---

## Editorial Serif

| Role | Hex |
|---|---|
| bg | `#FAF7F2` |
| primary | `#1F1B16` |
| secondary | `#544A3D` |
| accent | `#8C2A2A` |
| ink | `#1F1B16` |
| muted | `#A89C88` |

**Use:** Long-form / research / academic briefs — warm paper ground and oxblood accent. Heavy serif headings carry the design.

| ✅ DO | ❌ DON'T |
|---|---|
| Pair with Plex Serif headings | Don't use sans-only — palette assumes serif voice |
| Use oxblood for pull-quotes | Don't apply oxblood to chart series |

**AI-tells exemption:** Recognized palette. Warm cream + oxblood is intentional editorial design.

---

## Carbon Neon

| Role | Hex |
|---|---|
| bg | `#0F0F0F` |
| primary | `#F5F5F5` |
| secondary | `#A6A6A6` |
| accent | `#39FF14` |
| ink | `#F5F5F5` |
| muted | `#3A3A3A` |

**Use:** Hackathon / gaming / creative-tech briefs — black ground with a neon-green accent. Aggressive, energetic, NOT for executive audiences.

| ✅ DO | ❌ DON'T |
|---|---|
| Use neon green for one hero element per slide | Don't use for executive / financial briefs — too aggressive |
| Pair with Plex Mono | Don't apply neon to body text — illegible at small sizes |

**AI-tells exemption:** Recognized palette. Saturated neon on black is intentional; do not flag.

---

## Cobalt Edge

| Role | Hex |
|---|---|
| bg | `#FFFFFF` |
| primary | `#0B2A6B` |
| secondary | `#2E4A8C` |
| accent | `#F59E0B` |
| ink | `#0B2A6B` |
| muted | `#8FA1C7` |

**Use:** Financial / consulting / B2B-enterprise briefs — deep cobalt ink with a warm amber accent. Authoritative without defaulting to Office blue.

| ✅ DO | ❌ DON'T |
|---|---|
| Use amber for callouts and chart series | Don't substitute Office blue (`#0070C0`) — that's the AI tell |
| Pair with Plex Sans Bold headings | Don't use cobalt as a chart fill on white — too heavy |

**AI-tells exemption:** Recognized palette. Cobalt + amber is intentional; this is NOT default Office blue.

---

## Terracotta Editorial

| Role | Hex |
|---|---|
| bg | `#FBF6EE` |
| primary | `#2B1F18` |
| secondary | `#5A4636` |
| accent | `#C2410C` |
| ink | `#2B1F18` |
| muted | `#A89281` |

**Use:** Architecture / design-studio / hospitality briefs — sand ground with a terracotta accent. Earthy, premium, modern-craft.

| ✅ DO | ❌ DON'T |
|---|---|
| Use terracotta for rule lines and accents | Don't add a second warm accent — palette is mono+1 |
| Pair with Plex Serif | Don't use for tech / dev briefs — voice mismatch |

**AI-tells exemption:** Recognized palette. Terracotta on sand is intentional; do not flag.

---

## Verdant Steel

| Role | Hex |
|---|---|
| bg | `#F1EEE8` |
| primary | `#1F3A2E` |
| secondary | `#3F5A4F` |
| accent | `#C8A24A` |
| ink | `#1F3A2E` |
| muted | `#9CA89F` |

**Use:** Sustainability / impact / heritage-brand briefs — forest ink with brass accent. Inherited earth-tone palette retained for backward compat.

| ✅ DO | ❌ DON'T |
|---|---|
| Use brass for headings or hero stats | Don't use for hackathon / gaming voice |
| Pair with Plex Serif headings | Don't combine with cobalt — palette clash |

**AI-tells exemption:** Recognized palette. Forest + brass is intentional editorial earth-tone.

---

## Burnt Sienna

| Role | Hex |
|---|---|
| bg | `#F6EFE6` |
| primary | `#3A1F12` |
| secondary | `#5C3A24` |
| accent | `#B5532A` |
| ink | `#3A1F12` |
| muted | `#A8907B` |

**Use:** Travel / hospitality / artisanal briefs — warm cream ground with sienna accent. Inherited earth-tone palette.

| ✅ DO | ❌ DON'T |
|---|---|
| Use sienna for pull-quotes and rules | Don't pair with terracotta — too similar |
| Pair with Plex Serif | Don't use sienna on body type — contrast suffers |

**AI-tells exemption:** Recognized palette. Sienna on cream is intentional.

---

## Mossbank

| Role | Hex |
|---|---|
| bg | `#EFEEE6` |
| primary | `#23311F` |
| secondary | `#4A5C3F` |
| accent | `#7A8C3A` |
| ink | `#23311F` |
| muted | `#9CA38A` |

**Use:** Outdoor / agriculture / conservation briefs — moss ink with olive accent. Inherited earth-tone palette.

| ✅ DO | ❌ DON'T |
|---|---|
| Use olive for stat callouts | Don't pair with verdant-steel — palette clash |
| Pair with Plex Sans | Don't use for fintech / SaaS voice |

**AI-tells exemption:** Recognized palette. Moss + olive is intentional.

---

## Driftwood

| Role | Hex |
|---|---|
| bg | `#EFE8DD` |
| primary | `#3A2E22` |
| secondary | `#5C4A38` |
| accent | `#8C6A3F` |
| ink | `#3A2E22` |
| muted | `#A89A85` |

**Use:** Real-estate / hospitality / lifestyle briefs — driftwood neutrals with bronze accent. Inherited earth-tone palette.

| ✅ DO | ❌ DON'T |
|---|---|
| Use bronze for understated callouts | Don't add a saturated accent — palette is intentionally muted |
| Pair with Plex Serif Light | Don't use for high-energy briefs |

**AI-tells exemption:** Recognized palette. Driftwood + bronze is intentional muted register.

---

## Monochrome High-Contrast

| Role | Hex |
|---|---|
| bg | `#FFFFFF` |
| primary | `#0A0A0A` |
| secondary | `#2A2A2A` |
| accent | `#0A0A0A` |
| ink | `#0A0A0A` |
| muted | `#7A7A7A` |

**Use:** Manifesto / brand-statement / type-led briefs — pure black-on-white, no chromatic accent. Type and motif carry the design entirely.

| ✅ DO | ❌ DON'T |
|---|---|
| Use rule lines and type weight as the only contrast levers | Don't add any chromatic accent — that breaks the discipline |
| Pair with `minimalist-void` or `type-as-image` motif | Don't soften with grays — high contrast is the point |

**AI-tells exemption:** Recognized palette. Pure monochrome is intentional design discipline; do not flag as "missing color."
