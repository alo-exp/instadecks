# Findings (Triaged) Schema

**Schema variant:** triaged (additive superset of `findings-schema.md` v1.0)
**Status:** consumed exclusively by the `/instadecks-create` auto-refine loop.

This file documents the agent-augmented variant of the findings document. The base schema in `findings-schema.md` is **UNCHANGED** — this is a strict additive superset for use inside the Phase 5 auto-refine loop.

---

## 1. Purpose (D-08)

`/instadecks-review` (the producer) emits findings with severity but does NOT set `genuine` based on the user's design rationale or brief — that is judgment-laden context the reviewer does not own. In the auto-refine loop, the agent reads each finding alongside the rendered slide image and the brief, then decides genuine vs non-genuine and writes the augmented document back to disk. Only `genuine && severity_reviewer ∈ {Critical, Major}` findings drive fixes; non-genuine entries are recorded in the ledger's `skipped_finding_ids[]` so the same finding is never relitigated on a later cycle.

---

## 2. File location

```
<run-dir>/cycle-${N}/findings.json            # raw runReview output (base schema)
<run-dir>/cycle-${N}/findings.triaged.json    # agent-augmented (this schema)
```

Two files per cycle. The raw `findings.json` is the immutable reviewer output; the triaged file is the agent's overlay. Cycle-N's triaged file contributes its `genuine: false` entries to the ledger's `skipped_finding_ids[]` for cycle N+1's context.

---

## 3. Schema delta

Each finding object in `slides[].findings[]` gains three fields, **all REQUIRED in the triaged variant** (OPTIONAL in the base — base validator currently ignores unknown keys, so adding them does not break the contract):

| Field              | Type    | Required (triaged) | Purpose                                                            |
| ------------------ | ------- | ------------------ | ------------------------------------------------------------------ |
| `id`               | string  | yes                | Stable cross-cycle identifier; matches `/^\d+-[0-9a-f]{8}$/`.      |
| `genuine`          | boolean | yes                | Agent verdict: `true` → flow into fix list; `false` → skip.        |
| `triage_rationale` | string  | yes                | 1–2 sentence agent explanation of the verdict; non-empty.          |

All other fields (`severity_reviewer`, `category`, `nx`, `ny`, `text`, `rationale`, `location`, `standard`, `fix`) are unchanged from the base schema. The base `genuine` field already exists in `findings-schema.md` v1.0; in the triaged variant it carries the agent's verdict (in the base/raw variant it is the reviewer's heuristic flag and may be overridden by the agent).

---

## 4. Stable ID derivation

```
id = `${slideNum}-${sha1(text).slice(0, 8)}`
```

Where `sha1` is `node:crypto`'s SHA-1 hex digest of the finding's `text` field, truncated to 8 hex chars. Properties:

- **Stable across cycles.** A finding produced in cycle 1 with text `"Headline claim unsupported by cited source"` on slide 7 has id `7-e3e9b7f2`. If the same defect is re-flagged in cycle 3, it gets the same id — letting `skipped_finding_ids[]` thread cleanly across the loop.
- **Slide-scoped.** Two slides each producing the same finding text get distinct ids (different `slideNum` prefix).
- **Collision risk:** 8 hex = 32 bits. For a single deck (≤ 50 slides × ≤ 30 findings each = ~1500 entries), birthday-collision probability is negligible.

The agent computes the id when triaging; the producer side (`runReview`) does not emit `id`.

---

## 5. Example finding

```json
{
  "id": "7-e3e9b7f2",
  "severity_reviewer": "Critical",
  "category": "defect",
  "genuine": true,
  "triage_rationale": "Genuine — cited source 404s and the 42% claim is not present in any primary source linked from the deck; blocking factual integrity defect.",
  "nx": 0.46,
  "ny": 0.16,
  "text": "Headline claim unsupported by cited source",
  "rationale": "Linked source does not contain the 42% figure asserted in the headline; risks credibility loss with stakeholder review.",
  "location": "title text centre",
  "standard": "Factual integrity (Tufte 2001)",
  "fix": "Replace with verifiable figure from primary source or remove claim"
}
```

A canonical, fully-populated triaged document fixture lives at `tests/fixtures/sample-findings-triaged.json` — used by the Plan 05-04 integration test as a known-good triaged shape.

---

## 6. Cross-reference: ledger fields (Plan 05-01)

The ledger entry written at the end of each cycle (D-02) consumes ids from the triaged document:

```json
{
  "cycle": 2,
  "skipped_finding_ids": ["7-0dff2c87", "8-e6908a69"],
  "fixed_finding_ids":   ["7-e3e9b7f2", "9-b3a55b94", "9-27c621bc"],
  "issue_set_hash":      "sha1:..."
}
```

- `skipped_finding_ids[]` ← all finding ids in `findings.triaged.json` with `genuine: false`.
- `fixed_finding_ids[]` ← all finding ids the agent committed to fix this cycle (i.e., genuine && severity ∈ {Critical, Major}).
- `issue_set_hash` ← SHA-1 of the sorted `(slideNum + finding_text)` of the unfixed-genuine set; used by `detectOscillation` per D-09.

The ledger never re-records the full finding text — `id` is the cross-reference handle.

---

## 7. Out of scope

- **Base schema is UNCHANGED.** Standalone `/instadecks-review` consumers read `findings-schema.md` exclusively; they never see this triaged variant.
- **No JSON-Schema file ships in v0.1.0.** Validation is hand-rolled in the auto-refine loop primitives, mirroring the project's "Don't Hand-Roll" exception for findings (research SUMMARY).
- **No migration path** between the base and triaged variants is needed: the triaged document is produced by adding three fields to a copy of the raw findings, never by mutating the raw file in place. The two-files-per-cycle layout (D-08 / Q-4) makes this explicit.

---

## See also

- `findings-schema.md` — base v1.0 contract (UNCHANGED).
- `../SKILL.md` §"Scoped Review Mode" — companion prose for cycle 2+ diff-only review.
- `.planning/phases/05-instadecks-create-auto-refine/05-CONTEXT.md` — D-08 (triage) and Q-4 (file location).
