import os
import sys
import unittest


ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "src")
if SRC not in sys.path:
    sys.path.insert(0, SRC)

from resonance_notepad.resonance_engine import L0, J0, P0, W0, ResonanceController, ResonanceEngine


class ResonanceEngineTests(unittest.TestCase):
    def test_initial_state_matches_anchor(self) -> None:
        engine = ResonanceEngine()
        self.assertAlmostEqual(engine.state.l, L0, places=9)
        self.assertAlmostEqual(engine.state.j, J0, places=9)
        self.assertAlmostEqual(engine.state.p, P0, places=9)
        self.assertAlmostEqual(engine.state.w, W0, places=9)
        self.assertGreater(engine.state.harmony, 0.0)

    def test_tick_advances_state(self) -> None:
        engine = ResonanceEngine()
        start_tick = engine.state.ticks
        state = engine.tick("A short sentence with a clear purpose.")
        self.assertEqual(state.ticks, start_tick + 1)
        self.assertGreaterEqual(state.harmony, 0.0)
        self.assertLessEqual(state.harmony, 1.0)

    def test_empty_text_returns_bootstrap_guidance(self) -> None:
        controller = ResonanceController()
        _ = controller.evaluate("")
        msg = controller.guidance("")
        self.assertIn("Start with a single sentence", msg)

    def test_autosave_interval_is_bounded(self) -> None:
        controller = ResonanceController()
        _ = controller.evaluate("small text")
        interval = controller.autosave_interval_seconds("small text")
        self.assertGreaterEqual(interval, 5)
        self.assertLessEqual(interval, 30)


if __name__ == "__main__":
    unittest.main()
