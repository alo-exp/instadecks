# Phase 2: `/instadecks:annotate` - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-28
**Phase:** 02-instadecks-annotate
**Areas discussed:** Run dir & output paths

---

## Gray Area Selection

| Option | Description | Selected |
|--------|-------------|----------|
| Run dir & output paths | `<run-id>` location, project-relative output convention, naming | ✓ |
| Pipelined handoff shape | In-memory deck-spec interface for /review→/annotate (ANNO-10) | |
| Adapter error handling | Behavior on malformed/schema-mismatch findings | |
| soffice in Phase 2 | Basic vs pre-hardened soffice invocation | |

**User's choice:** Run dir & output paths only. Other three locked as Claude's Discretion via the closing question.

---

## Run dir & output paths

### Q1: Where should each invocation's working/run directory live?

| Option | Description | Selected |
|--------|-------------|----------|
| `.planning/instadecks/<run-id>/` (Recommended) | Matches CRT-11's `<run-id>` interrupt-flag convention (Phase 5). Single root for all skill runs across phases. | ✓ |
| `runs/<timestamp>/` | Top-level `runs/`. Cleaner for users browsing the repo, but doesn't match Phase 5 interrupt-flag location. | |
| `$TMPDIR/instadecks-<run-id>/` | Ephemeral. Only final outputs land project-relative. Logs/intermediates lost on reboot. | |

**User's choice:** `.planning/instadecks/<run-id>/` (Recommended)

### Q2: Where do the FINAL annotated PPTX + PDF land (project-relative output path in ANNO-08)?

| Option | Description | Selected |
|--------|-------------|----------|
| Sibling of input deck (Recommended) | `<deck>.annotated.pptx` and `<deck>.annotated.pdf` next to the input. Predictable. Overwrites prior on re-run. | ✓ |
| Inside run directory only | Outputs only in `<run-dir>/`. User must dig in. | |
| Explicit `--out` flag required | Most explicit; worse standalone UX. | |

**User's choice:** Sibling of input deck (Recommended)

### Q3: What format for `<run-id>`?

| Option | Description | Selected |
|--------|-------------|----------|
| `YYYYMMDD-HHMMSS-<6hex>` (Recommended) | e.g. `20260428-101530-a1b2c3`. Sortable, human-readable, collision-safe within a second. | ✓ |
| ISO timestamp only | e.g. `2026-04-28T10:15:30`. Sortable but colons/T awkward in shell paths. | |
| ULID / random hash | Opaque; harder to identify visually. | |

**User's choice:** `YYYYMMDD-HHMMSS-<6hex>` (Recommended)

### Q4: Sibling-output overwrite policy?

| Option | Description | Selected |
|--------|-------------|----------|
| Overwrite silently (Recommended) | Re-runs replace prior outputs; archive lives in `.planning/instadecks/<run-id>/`. | ✓ |
| Suffix with run-id on collision | `<deck>.annotated.<run-id>.pptx`. No data loss; clutters input dir. | |
| Refuse and require `--force` | Safest but adds friction. | |

**User's choice:** Overwrite silently (Recommended)

---

## Claude's Discretion (locked via closing question)

The user accepted three batched defaults rather than open separate discussions:

| Area | Locked default |
|------|----------------|
| Pipelined handoff (ANNO-10) | Exported JS function `runAnnotate({deckPath, findings, outDir, runId})` from `skills/annotate/scripts/index.js`; `/review` imports and calls directly. Standalone CLI is a thin wrapper that reads JSON from disk. No file roundtrip, no IPC. |
| Adapter error handling (ANNO-05/06) | Fail-loud. Validate `schema_version`, required fields, value ranges up front; throw structured error pinpointing slide index + annotation index + field name + observed-vs-expected. No silent skipping. |
| soffice in Phase 2 (vs Phase 3) | Pre-apply per-call `-env:UserInstallation=file:///tmp/lo-${SESSION_ID}-${PID}` flag now (one-line, low-cost flake-prevention). Full hardening (file-checks, retry, cleanup trap) defers to Phase 3 (RVW-09..11). |

## Deferred Ideas

- Full soffice/pdftoppm hardening — Phase 3 (RVW-09..11).
- Activation-rate testing — Phase 7 (DIST-02).
- `allowed-tools` mode-scoping tests — Phase 7 (DIST-03).
- Stress-test fixtures, Windows path detection — v1.x.
