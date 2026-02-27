# Autosave and Session Restore

## Goals

- Prevent loss of work during crashes or accidental closes.
- Keep autosave behavior resonance-aware rather than static.
- Preserve deterministic safety limits.

## Snapshot Storage

Path:
- `.resonant_notepad/session.json`

Payload fields:
- `text`
- `current_file`
- `cursor_index`
- `last_harmony`
- `updated_at_utc`

## Cadence Model

Autosave cadence is computed from current harmony and draft size:

- lower harmony -> save more frequently
- higher harmony -> save less frequently
- long drafts -> slight frequency increase

Logic bounds:
- minimum interval: 5 seconds
- maximum interval: 30 seconds

## Restore Behavior

On app startup:
- load snapshot if present
- restore text, file path, and cursor position
- gracefully fallback to safe defaults if restore data is invalid

## Why This Is 80/20

- Resonance chooses timing pressure dynamically.
- Logic enforces hard safety limits and robust file semantics.

