# Benchmarking

## Command

```powershell
python benchmarks\resonant_notepad_benchmark.py
```

## Outputs

- `docs/RESONANT_NOTEPAD_BENCHMARK_RESULTS.json`
- `docs/RESONANT_NOTEPAD_BENCHMARK_REPORT.md`

## What Is Measured

Per session:
- step count
- average harmony
- minimum harmony
- maximum harmony
- harmony volatility
- low-harmony rate
- final L/J/P/W state

Aggregate summary:
- average harmony
- average volatility
- average low-harmony rate
- resonance viability score

## Resonance Viability Score

Current scoring blend:

- `0.6 * average_harmony`
- `0.2 * (1 - average_volatility)`
- `0.2 * (1 - average_low_harmony_rate)`

The score is clipped to `[0, 1]` and used as a comparative signal across runs.

## How to Use Results

- Track trend direction across code changes.
- Look for rising harmony with stable or reduced volatility.
- Treat benchmark numbers as model diagnostics, not absolute truth.

