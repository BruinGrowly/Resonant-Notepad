import os
import sys
import unittest


ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "src")
if SRC not in sys.path:
    sys.path.insert(0, SRC)

from resonance_notepad.benchmarking import default_session_cases, run_benchmark, to_markdown_report


class BenchmarkingTests(unittest.TestCase):
    def test_run_benchmark_outputs_summary(self) -> None:
        results = run_benchmark(default_session_cases())
        self.assertIn("summary", results)
        self.assertIn("sessions", results)
        summary = results["summary"]
        self.assertGreaterEqual(summary["average_harmony"], 0.0)
        self.assertLessEqual(summary["average_harmony"], 1.0)

    def test_report_generation(self) -> None:
        results = run_benchmark(default_session_cases())
        report = to_markdown_report(results)
        self.assertIn("Resonant Notepad Benchmark Report", report)
        self.assertIn("Session Metrics", report)


if __name__ == "__main__":
    unittest.main()

