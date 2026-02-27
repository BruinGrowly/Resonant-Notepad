# User Guide

## Launch

```powershell
python app.py
```

## Editor Basics

- `File > New`: start a blank document
- `File > Open...`: open `.txt`, `.md`, or any text file
- `File > Save`: save current file
- `File > Save As...`: save under a new path
- `File > Exit`: close app (prompts if unsaved)

## Resonance Panel

The `Resonance` tab shows:
- `L` (Love), `J` (Justice), `P` (Power), `W` (Wisdom)
- `H` (Harmony)
- Guidance message generated from current state

Interpretation:
- Higher harmony usually means stronger structural alignment.
- Guidance points to practical writing adjustments (clarity, punctuation, intent).

## Markdown Preview

Use the `Markdown Preview` tab to view a lightweight rendered outline while you type.

Supported formatting cues:
- `#`, `##`, `###` headings
- bullet and numbered lists
- blockquotes
- fenced code blocks
- basic inline markdown normalization

## Autosave and Restore

- The app writes session snapshots automatically.
- Cadence changes by resonance state (faster when harmony is lower).
- On restart, the previous session is restored from snapshot.

Snapshots are stored at:
- `.resonant_notepad/session.json`

