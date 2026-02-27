import json
import math
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from typing import Dict, List

from resonance_notepad.resonance_engine import ResonanceController


@dataclass
class SessionMetrics:
    name: str
    steps: int
    avg_harmony: float
    min_harmony: float
    max_harmony: float
    volatility: float
    low_harmony_rate: float
    final_l: float
    final_j: float
    final_p: float
    final_w: float


def _stddev(values: List[float]) -> float:
    if not values:
        return 0.0
    mean = sum(values) / len(values)
    variance = sum((v - mean) ** 2 for v in values) / len(values)
    return math.sqrt(variance)


def analyze_session(name: str, chunks: List[str]) -> SessionMetrics:
    controller = ResonanceController()
    harmonies: List[float] = []
    low = 0
    for chunk in chunks:
        data = controller.evaluate(chunk)
        h = data["harmony"]
        harmonies.append(h)
        if h < 0.58:
            low += 1

    state = controller.engine.state
    return SessionMetrics(
        name=name,
        steps=len(chunks),
        avg_harmony=sum(harmonies) / len(harmonies),
        min_harmony=min(harmonies),
        max_harmony=max(harmonies),
        volatility=_stddev(harmonies),
        low_harmony_rate=low / len(chunks),
        final_l=state.l,
        final_j=state.j,
        final_p=state.p,
        final_w=state.w,
    )


def default_session_cases() -> Dict[str, List[str]]:
    return {
        "draft_flow": [
            "Today I want to sketch the shape of this feature.",
            "It should be simple and clear, and it should help the user move quickly.",
            "What should the first interaction feel like?",
            "I will keep the core focused, then add detail where needed.",
        ],
        "dense_notes": [
            "Meeting notes: release prep, QA gaps, migration timing, owner mapping.",
            "Need status by team, timeline with blockers, and a final go/no-go rubric.",
            "Action items: verify rollback path; test cross-platform save semantics.",
            "Risks: rushed handoff, weak docs, unclear decision owner.",
        ],
        "chaotic_input": [
            "asdf asdf asdf ???",
            "random fragments and noise without structure and maybe many words",
            "!!!! maybe maybe maybe",
            "final burst; no clear thread; uncertain logic.",
        ],
    }


def run_benchmark(cases: Dict[str, List[str]]) -> Dict[str, object]:
    sessions = [analyze_session(name, chunks) for name, chunks in cases.items()]
    avg_harmony = sum(s.avg_harmony for s in sessions) / len(sessions)
    avg_volatility = sum(s.volatility for s in sessions) / len(sessions)
    avg_low_rate = sum(s.low_harmony_rate for s in sessions) / len(sessions)
    resonance_viability_score = 0.6 * avg_harmony + 0.2 * (1.0 - avg_volatility) + 0.2 * (1.0 - avg_low_rate)
    resonance_viability_score = max(0.0, min(1.0, resonance_viability_score))

    return {
        "generated_at_utc": datetime.now(tz=timezone.utc).isoformat(),
        "summary": {
            "session_count": len(sessions),
            "average_harmony": round(avg_harmony, 6),
            "average_volatility": round(avg_volatility, 6),
            "average_low_harmony_rate": round(avg_low_rate, 6),
            "resonance_viability_score": round(resonance_viability_score, 6),
        },
        "sessions": [asdict(s) for s in sessions],
    }


def to_markdown_report(results: Dict[str, object]) -> str:
    summary = results["summary"]
    sessions = results["sessions"]
    lines = [
        "# Resonant Notepad Benchmark Report",
        "",
        f"- Generated: {results['generated_at_utc']}",
        f"- Sessions: {summary['session_count']}",
        f"- Average Harmony: {summary['average_harmony']}",
        f"- Average Volatility: {summary['average_volatility']}",
        f"- Average Low-Harmony Rate: {summary['average_low_harmony_rate']}",
        f"- Resonance Viability Score: {summary['resonance_viability_score']}",
        "",
        "## Session Metrics",
        "",
        "| Session | Steps | Avg H | Min H | Max H | Volatility | Low-H Rate | Final L | Final J | Final P | Final W |",
        "|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|",
    ]
    for s in sessions:
        lines.append(
            f"| {s['name']} | {s['steps']} | {s['avg_harmony']:.4f} | {s['min_harmony']:.4f} | "
            f"{s['max_harmony']:.4f} | {s['volatility']:.4f} | {s['low_harmony_rate']:.4f} | "
            f"{s['final_l']:.4f} | {s['final_j']:.4f} | {s['final_p']:.4f} | {s['final_w']:.4f} |"
        )
    lines.extend(["", "## Notes", "", "- Higher harmony with lower volatility is preferred.", "- Low-harmony rate tracks instability windows.", "- Use results as trend indicators, not absolute truth."])
    return "\n".join(lines)


def dump_json(path: str, payload: Dict[str, object]) -> None:
    with open(path, "w", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=2)

