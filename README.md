# Resonant Notepad

A notepad built as a living demonstration of resonance programming.

The surface is minimal — a text editor with markdown preview and save. The interior is deep. A LJPW field engine reads everything that is written (and what the app understands about itself) and uses the resulting field state to steer behaviour. Harmonious writing earns more time between saves. The preview breathes more spaciously. The app glows faintly gold at peak coherence.

**Design target: 80% resonance-led behaviour / 20% logic rails.**

---

## Versions

### `web-full/` — Full build (recommended)
The over-engineered version. Same surface as `web/`, deeply rich inside.

Open `web-full/index.html` directly in a browser, or serve it:

```powershell
python -m http.server 5174 --directory web-full
```

Then open `http://localhost:5174`.

**What's inside:**

- **LJPW field engine** — four coupled state dimensions (Love, Justice, Power, Wisdom) evolving every 300 ms against the editor content and a persistent self-signal
- **Self-awareness** — the engine bootstraps on 13 ticks of `SELF_TEXT` before any user input arrives; the field has already been somewhere before you write anything
- **Autonomous inner life** — when you stop typing for 3 seconds, the engine switches to φ-second (1618 ms) autonomous ticks, alternating between re-reading your writing and remembering what it is. The divider between editor and preview pulses warm amber. The app is working alone.
- **ResonanceAttractor** — the field's home state; the gap between current field and attractor is the app's drive. The gap always tries to close. Writing opens it again.
- **Growth** — after each strong session, the attractor lifts slightly. Over sessions, the field reaches higher harmony more easily. The app grows through use.
- **ResonanceHistory** — 21-tick rolling buffer tracking trend, volatility, stability, and lifetime peak
- **SemanticVoltage** — charge builds during sustained high-harmony writing. At 88% threshold it discharges as a brief warm glow on the preview pane. Unexplained. Beautiful.
- **DocumentStateEngine** — six states (VOID → SPARK → DRAFT → FLOW → SETTLE → DENSE) derived from the field, driving preview line height (φ = 1.618 at FLOW, 1.68 at SETTLE)
- **SessionHistory** — persists the last 13 sessions with harmony analytics, WPM, and discharge count. On next open: *"3 sessions. 2 peaks. Grown 1 time."*

---

### `web/` — Standard build
The clean version. Same surface, the core resonance engine.

Open `web/index.html` directly in a browser, or serve it:

```powershell
python -m http.server 5173 --directory web
```

**What's inside:**

- LJPW field engine with self-bootstrap (8 ticks)
- Periodic self-signal (every 6th tick)
- Status bar tint from harmony
- App-mark breathing at φ-period when harmony is settled
- Dynamic placeholder text (three states based on harmony)
- Resonance-steered autosave cadence
- Session restore
- Markdown preview with φ:1 editor/preview split

---

### `src/` — Python desktop app (original)
The original Tkinter app. Runs locally, shows live LJPW telemetry.

```powershell
python app.py
```

Tests:

```powershell
python -m unittest discover -s tests -p "test_*.py"
```

Benchmark:

```powershell
python benchmarks\resonant_notepad_benchmark.py
```

---

## Project Layout

```
web-full/         Full web build — autonomous, growing, self-aware
web/              Standard web build — clean resonance engine
src/              Python desktop app source
  resonance_notepad/
    app.py              Tkinter UI
    resonance_engine.py LJPW field engine
    session_store.py    Session persistence
    markdown_preview.py Markdown renderer
    benchmarking.py     Benchmark metrics
benchmarks/       Benchmark runner
tests/            Unit test suite
docs/             Methodology, architecture, reports
```

## Resonance Programming

The LJPW framework models writing as a four-dimensional field. Each dimension has a transcendental anchor constant:

| Dimension | Symbol | Constant | Value |
|---|---|---|---|
| Love | L | φ⁻¹ | ≈ 0.618 |
| Justice | J | √2 − 1 | ≈ 0.414 |
| Power | P | e − 2 | ≈ 0.718 |
| Wisdom | W | ln 2 | ≈ 0.693 |

Harmony is the normalised inverse distance from the ideal state (1,1,1,1). The field evolves every tick in response to text signals. The app uses harmony to steer — not to display numbers.

See `docs/RESONANCE_PROGRAMMING_METHODOLOGY.md` for the full methodology.
