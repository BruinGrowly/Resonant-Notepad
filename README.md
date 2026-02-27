# Resonant Notepad

Resonant Notepad is a usable Python notepad app built as a showcase for resonance programming.

Design target:
- 80% resonance-led behavior (continuous field steering)
- 20% logic rails (hard constraints, file safety, deterministic checks)

## What It Does

- Plain text editing with New/Open/Save/Save As
- Live resonance telemetry (`L`, `J`, `P`, `W`, `Harmony`)
- Real-time resonance guidance while writing
- Resonance-aware autosave cadence
- Session restore across app restarts
- Markdown preview tab (lightweight renderer)
- Benchmark runner with JSON + Markdown reports

## Quick Start

```powershell
python app.py
```

## Tests

```powershell
python -m unittest discover -s tests -p "test_*.py"
```

## Benchmark

```powershell
python benchmarks\resonant_notepad_benchmark.py
```

Benchmark outputs:
- `docs/RESONANT_NOTEPAD_BENCHMARK_RESULTS.json`
- `docs/RESONANT_NOTEPAD_BENCHMARK_REPORT.md`

## Project Layout

- `app.py`: entrypoint
- `src/resonance_notepad/app.py`: Tkinter UI and app orchestration
- `src/resonance_notepad/resonance_engine.py`: resonance model + controller logic
- `src/resonance_notepad/session_store.py`: autosave session persistence
- `src/resonance_notepad/markdown_preview.py`: markdown-to-preview renderer
- `src/resonance_notepad/benchmarking.py`: benchmark metrics pipeline
- `benchmarks/resonant_notepad_benchmark.py`: benchmark runner
- `tests/`: unit test suite
- `docs/`: guides, architecture, and benchmark reports

## Documentation

Start here:
- `docs/README.md`

