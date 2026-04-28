# Permission-Mode Verification — v0.1.0

Validate that every user-invocable Instadecks skill operates correctly under Claude Code's `default` and `dontAsk` permission modes (NOT `bypassPermissions` — that's out of scope per Phase 7 D-02). Each skill's frontmatter `allowed-tools` list must be sufficient for `dontAsk` to run silently AND not over-permissive enough to be flagged in `default`.

**Status:** human_needed — to be filled by the tester for v0.1.0 sign-off.

## Setup

1. Open Claude Code.
2. In the Settings panel, set `Permission mode` to the row under test (`default` first, then `dontAsk`).
3. Paste the canonical invocation, observe tool-call prompts, fill the row.

## Pass criterion

- **`default` mode:** the user is prompted ONLY for tool calls listed in the skill's frontmatter `allowed-tools` (e.g., `Bash(node:*)`, `Bash(soffice:*)`). A prompt for `Bash(*)` or any tool name NOT in the frontmatter = FAIL.
- **`dontAsk` mode:** zero prompts appear AND every tool call succeeds.

## Matrix

| Skill                       | Mode     | Invocation (canonical)                                            | Tool calls pre-approved? | Prompts cleanly? | Pass? | Notes |
|-----------------------------|----------|-------------------------------------------------------------------|--------------------------|------------------|-------|-------|
| /instadecks:create          | default  | "Build me a deck from this brief: AI in healthcare 2026."         |                          |                  |       |       |
| /instadecks:create          | dontAsk  | (same)                                                            |                          |                  |       |       |
| /instadecks:review          | default  | "Review my deck for design defects: tests/fixtures/sample.pptx"   |                          |                  |       |       |
| /instadecks:review          | dontAsk  | (same)                                                            |                          |                  |       |       |
| /instadecks:content-review  | default  | "Is my deck persuasive? tests/fixtures/sample.pptx"               |                          |                  |       |       |
| /instadecks:content-review  | dontAsk  | (same)                                                            |                          |                  |       |       |
| /instadecks:annotate        | default  | "Overlay these findings: tests/fixtures/sample.pptx findings.json"|                          |                  |       |       |
| /instadecks:annotate        | dontAsk  | (same)                                                            |                          |                  |       |       |
| /instadecks:doctor          | default  | "Check Instadecks setup."                                          |                          |                  |       |       |
| /instadecks:doctor          | dontAsk  | (same)                                                            |                          |                  |       |       |

## Aggregate

| Total skills × modes | Score | Pass (10/10)? |
|----------------------|-------|---------------|
| 5 × 2 = 10           |       |               |
