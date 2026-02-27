# Architecture

## High-Level Modules

- `src/resonance_notepad/app.py`
  - Tkinter UI
  - event scheduling
  - file operations
  - autosave/session orchestration
  - markdown preview updates
- `src/resonance_notepad/resonance_engine.py`
  - constants (`L0`, `J0`, `P0`, `W0`)
  - resonance state model
  - text signal extraction
  - coupled dimension updates
  - harmony and guidance logic
  - autosave cadence computation
- `src/resonance_notepad/session_store.py`
  - JSON session persistence
  - atomic write (`.tmp` + replace)
- `src/resonance_notepad/markdown_preview.py`
  - markdown to plain-text preview conversion
- `src/resonance_notepad/benchmarking.py`
  - session simulation and metric aggregation
- `benchmarks/resonant_notepad_benchmark.py`
  - runner that emits docs reports

## Runtime Flow

1. App initializes UI and controller.
2. Session store attempts restore from `.resonant_notepad/session.json`.
3. Every 300 ms:
   - read editor text
   - evaluate resonance state
   - update telemetry and guidance
   - render preview tab
4. Every 2 s:
   - check dirty state and elapsed time
   - compute autosave interval from current resonance
   - save snapshot if due
5. On file actions and exit:
   - enforce logic rails (prompts and IO checks)
   - update session snapshot

## 80/20 Split in Practice

Resonance-driven:
- text-to-signal mapping
- coupled LJPW updates
- harmony-based guidance
- cadence adaptation

Logic rails:
- explicit user prompts for unsaved changes
- deterministic read/write error handling
- bounded autosave min/max
- robust restore fallback when session data is missing/corrupt

