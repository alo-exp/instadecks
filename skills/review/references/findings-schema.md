# Findings Schema

**Schema version:** 1.1
**Required top-level field:** `schema_version`

This file is THE canonical JSON contract for design/content findings produced by `/instadecks:review` and `/instadecks:content-review`, and consumed by `/instadecks:annotate` and `/instadecks:create`. All four skills read this file directly via `Read` — **do not duplicate this schema in code**. The schema is the single source of truth for the entire plugin.

---

## 1. Top-level shape

```jsonc
{
  "schema_version": "1.1",            // REQUIRED; MUST be the first key
  "deck": "<filename or path>",       // REQUIRED; the deck the findings refer to
  "generated_at": "<ISO8601>",        // REQUIRED; when the findings were produced
  "slides": [                         // REQUIRED; one entry per reviewed slide
    {
      "slideNum": 7,
      "title": "Slide 07 · Freelance Baseline",
      "findings": [
        {
          "severity_reviewer": "Critical",
          "category": "defect",
          "genuine": true,
          "nx": 0.46,
          "ny": 0.16,
          "text": "Title overflows safe-zone by ~12%",
          "rationale": "Cognitive load: title length forces wrap on 16:9",
          "location": "title text centre",
          "standard": "Cognitive load (Norman 1988)",
          "fix": "Shorten to ≤ 80 chars"
        }
      ]
    }
  ]
}
```

`schema_version` MUST be the first key emitted; consumers may rely on it for fast version-routing without parsing the entire document.

## 2. Slide shape

| Field       | Type            | Required | Notes                                                |
| ----------- | --------------- | -------- | ---------------------------------------------------- |
| `slideNum`  | integer         | yes      | 1-based slide index; matches `annotate.js` SAMPLES.  |
| `title`     | string          | yes      | Human-readable slide title.                          |
| `findings`  | array<Finding>  | yes      | May be empty if the slide has no findings.          |

## 3. Finding shape

| Field                | Type    | Required | Purpose                                                                                      |
| -------------------- | ------- | -------- | -------------------------------------------------------------------------------------------- |
| `severity_reviewer`  | string  | yes      | One of `"Critical"`, `"Major"`, `"Minor"`, `"Nitpick"` (full 4-tier producer vocabulary).    |
| `category`           | string  | yes      | One of `"defect"`, `"improvement"`, `"style"`, `"content"`. (`"content"` added in v1.1.)     |
| `check_id`           | string  | conditional | Required iff `category === "content"`. One of `"action-title"`, `"redundancy"`, `"jargon"`, `"length"`, `"pyramid-mece"`, `"narrative-arc"`, `"claim-evidence"`, `"standalone-readability"`. (Added in v1.1.) |
| `genuine`            | boolean | yes      | Auto-refine filter — only `true` findings flow into `/annotate` SAMPLES.                     |
| `nx`                 | number  | yes      | Normalized x in `[0, 1]`; mapped directly to `annotate.js` `nx`.                             |
| `ny`                 | number  | yes      | Normalized y in `[0, 1]`; mapped directly to `annotate.js` `ny`.                             |
| `text`               | string  | yes      | Short finding description; mapped directly to `annotate.js` `text`.                          |
| `rationale`          | string  | yes      | Why this finding is (or is not) genuine — used by the auto-refine loop.                      |
| `location`           | string  | yes      | Human-readable position descriptor (e.g., `"title text centre"`).                            |
| `standard`           | string  | yes      | Design / content standard cited (e.g., `"Cognitive load (Norman 1988)"`).                    |
| `fix`                | string  | yes      | Concrete remediation instruction.                                                            |

All required finding fields from v1.0 remain required in v1.1. v1.1 adds the optional `check_id` field (required iff `category === "content"`) and extends the `category` enum with `"content"`. Future minor versions (`1.x`) MAY add optional fields; consumers MUST ignore unknown fields. `1.x` validators tolerate optional new fields; required-iff rules are expressed inline in §3.

## 4. Severity vocabulary (producer side)

| Tier        | When to use                                                                  |
| ----------- | ---------------------------------------------------------------------------- |
| `Critical`  | Blocks the deck's purpose: factual error, broken claim, unreadable element.  |
| `Major`     | Materially harms comprehension or trust; should be fixed before delivery.    |
| `Minor`     | Notable issue worth fixing if time permits.                                  |
| `Nitpick`   | Polish-level observation; subjective or low-impact.                          |

**The 4→3 collapse to MAJOR / MINOR / POLISH is the `/annotate` adapter's concern (Phase 2). Producers always emit the full 4-tier vocabulary.** Reviewers (`/review`, `/content-review`) MUST NOT pre-collapse; downstream tooling depends on the full taxonomy for filtering, ranking, and report generation.

## 5. Mapping to `annotate.js` SAMPLES

The `/annotate` adapter (Phase 2) transforms this schema into the `SAMPLES` array consumed verbatim by `annotate.js`. The mapping is the locked contract:

| Reviewer field                           | `annotate.js` SAMPLES field      | Transformation                                                                |
| ---------------------------------------- | -------------------------------- | ----------------------------------------------------------------------------- |
| `slideNum`                               | `slideNum`                       | direct                                                                        |
| `title`                                  | `title`                          | direct                                                                        |
| `findings[].severity_reviewer`           | `annotations[].sev`              | Critical → `major`, Major → `major`, Minor → `minor`, Nitpick → `polish`     |
| `findings[].nx`                          | `annotations[].nx`               | direct                                                                        |
| `findings[].ny`                          | `annotations[].ny`               | direct                                                                        |
| `findings[].text`                        | `annotations[].text`             | direct                                                                        |
| `findings[].genuine`                     | (filter — only `true` passes)    | filter, not mapped                                                            |
| `findings[].category`                    | (not in SAMPLES)                 | retained in JSON; not passed to `annotate.js`                                 |
| `findings[].rationale`                   | (not in SAMPLES)                 | retained in JSON; not passed to `annotate.js`                                 |
| `findings[].location`                    | (not in SAMPLES)                 | retained in JSON; not passed to `annotate.js`                                 |
| `findings[].standard`                    | (not in SAMPLES)                 | retained in JSON; not passed to `annotate.js`                                 |
| `findings[].fix`                         | (not in SAMPLES)                 | retained in JSON; not passed to `annotate.js`                                 |

The 4→3 severity collapse and the `genuine: false` filter happen exclusively at the `/annotate` adapter boundary — never at the producer side.

## 6. Schema version policy (D-07)

- The `/annotate` adapter accepts any `schema_version` in the `1.x` range (currently `"1.1"`).
- Unknown major versions (e.g., `"2.0"`, `"3.5"`) are rejected with the explicit error string:

  ```
  Unsupported findings schema version X.Y. /annotate supports 1.x.
  ```

- A migration adapter for `2.0+` is documented in §7 below but **not implemented in v0.1.0**.

## 7. Migration Policy

When a future schema version `2.0` (or higher major) is introduced:

1. The new schema MUST be documented in a sibling reference file (e.g., `findings-schema-v2.md`); v1.0 stays frozen.
2. A standalone upgrade adapter (e.g., `tools/migrate-findings-v1-to-v2.js`) MUST convert v1.x documents to v2.0 losslessly where possible, and emit explicit warnings where v2.0 introduces required fields not present in v1.0.
3. Consumer skills (`/annotate`, `/create`, etc.) MAY accept multiple schema versions during a deprecation window, but each consumer MUST declare its supported version range explicitly.
4. Removing v1.0 support requires a major plugin version bump and a migration window of at least one minor release where both versions are accepted.

This policy is recorded for future reference only — no migration code is shipped in v0.1.0.
