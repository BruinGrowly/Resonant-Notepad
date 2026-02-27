import os
import sys


ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "src")
if SRC not in sys.path:
    sys.path.insert(0, SRC)

from resonance_notepad.benchmarking import (  # noqa: E402
    default_session_cases,
    dump_json,
    run_benchmark,
    to_markdown_report,
)


def main() -> None:
    cases = default_session_cases()
    results = run_benchmark(cases)

    docs_dir = os.path.join(ROOT, "docs")
    os.makedirs(docs_dir, exist_ok=True)
    json_path = os.path.join(docs_dir, "RESONANT_NOTEPAD_BENCHMARK_RESULTS.json")
    md_path = os.path.join(docs_dir, "RESONANT_NOTEPAD_BENCHMARK_REPORT.md")

    dump_json(json_path, results)
    report = to_markdown_report(results)
    with open(md_path, "w", encoding="utf-8") as handle:
        handle.write(report)

    print(f"Wrote: {json_path}")
    print(f"Wrote: {md_path}")


if __name__ == "__main__":
    main()

