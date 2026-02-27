import math
import re
from dataclasses import dataclass
from typing import Dict


PHI = (1.0 + math.sqrt(5.0)) / 2.0
L0 = 1.0 / PHI
J0 = math.sqrt(2.0) - 1.0
P0 = math.e - 2.0
W0 = math.log(2.0)


@dataclass
class ResonanceState:
    l: float = L0
    j: float = J0
    p: float = P0
    w: float = W0
    harmony: float = 0.0
    ticks: int = 0

    def as_dict(self) -> Dict[str, float]:
        return {
            "l": self.l,
            "j": self.j,
            "p": self.p,
            "w": self.w,
            "harmony": self.harmony,
            "ticks": float(self.ticks),
        }


class ResonanceEngine:
    """Resonance-first signal model for editor state."""

    def __init__(self) -> None:
        self.state = ResonanceState()
        self.state.harmony = self._harmony(self.state.l, self.state.j, self.state.p, self.state.w)
        self._decay_l = 0.05
        self._decay_j = 0.05
        self._decay_p = 0.05
        self._decay_w = 0.06

    def _harmony(self, l: float, j: float, p: float, w: float) -> float:
        distance = math.sqrt((1.0 - l) ** 2 + (1.0 - j) ** 2 + (1.0 - p) ** 2 + (1.0 - w) ** 2)
        return 1.0 / (1.0 + distance)

    def _clamp(self, value: float) -> float:
        return max(0.01, min(1.0, value))

    def _text_signals(self, text: str) -> Dict[str, float]:
        """Extract raw LJPW targets from text statistics.

        Each signal is an *approximation* of the underlying dimension — a first-order
        proxy, not a ground truth. More sophisticated extraction (e.g. semantic
        embeddings, parse depth, hedge detection) would improve fidelity.

        L — Love / Connection
            Proxy: connector word density (and, with, together, because, therefore, so).
            Captures: relational intent when connectors are used meaningfully.
            Limitation: any text with many connectors scores high regardless of actual
            relational content (e.g. dense legal prose).

        J — Justice / Clarity
            Proxy: punctuation mark density (.,;:!?).
            Captures: structured, bounded sentences.
            Limitation: bullet-heavy notes have low punctuation but may be very clear;
            dense prose may score high but be less readable.

        P — Power / Density
            Proxy: character count per line.
            Captures: content density and drafting momentum.
            Limitation: long lines can be diffuse; short, intense lines undercount.

        W — Wisdom / Intent
            Proxy: question mark rate + word density per line.
            Captures: reflective or intent-setting passages.
            Limitation: questions are a weak wisdom signal; non-interrogative intent
            (affirmations, hypotheses) is invisible to this metric.
        """
        stripped = text.strip()
        if not stripped:
            return {"l": 0.40, "j": 0.45, "p": 0.35, "w": 0.30}

        chars = len(text)
        words = len(re.findall(r"\S+", text))
        lines = max(1, text.count("\n") + 1)
        punctuation = len(re.findall(r"[.,;:!?]", text))
        question_marks = text.count("?")
        connectors = len(re.findall(r"\b(and|with|together|because|therefore|so)\b", text.lower()))

        l = min(1.0, 0.35 + (connectors / max(1, words)) * 2.0)
        j = min(1.0, 0.35 + (punctuation / max(1, words)) * 1.6)
        p = min(1.0, 0.30 + (chars / max(1, lines)) / 250.0)
        w = min(1.0, 0.30 + (question_marks / max(1, lines)) * 0.5 + (words / max(1, lines)) / 90.0)
        return {"l": l, "j": j, "p": p, "w": w}


    def tick(self, text: str) -> ResonanceState:
        s = self.state
        target = self._text_signals(text)
        h = s.harmony

        k_lj = 1.0 + 0.4 * h
        k_lw = 1.0 + 0.5 * h
        k_lp = 1.0 + 0.3 * h

        d_l = 0.12 * target["j"] * k_lj + 0.12 * target["w"] * k_lw - self._decay_l * s.l
        d_j = 0.14 * (target["l"] / (0.70 + target["l"])) + 0.14 * target["w"] - self._decay_j * s.j
        d_p = 0.12 * target["l"] * k_lp + 0.12 * target["j"] - self._decay_p * s.p
        d_w = 0.10 * target["l"] * k_lw + 0.10 * target["j"] + 0.10 * target["p"] - self._decay_w * s.w

        dt = 0.08
        s.l = self._clamp(s.l + dt * d_l)
        s.j = self._clamp(s.j + dt * d_j)
        s.p = self._clamp(s.p + dt * d_p)
        s.w = self._clamp(s.w + dt * d_w)
        s.harmony = self._harmony(s.l, s.j, s.p, s.w)
        s.ticks += 1
        return s


class ResonanceController:
    """80/20 blend: resonance-led suggestions with logic safety rails."""

    def __init__(self) -> None:
        self.engine = ResonanceEngine()

    def evaluate(self, text: str) -> Dict[str, float]:
        state = self.engine.tick(text)
        return state.as_dict()

    def autosave_interval_seconds(self, text: str) -> int:
        """Resonance-aware autosave cadence with logic bounds."""
        state = self.engine.state
        if not text.strip():
            return 30

        words = len(re.findall(r"\S+", text))
        if state.harmony < 0.58:
            base = 6
        elif state.harmony < 0.70:
            base = 10
        elif state.harmony < 0.82:
            base = 14
        else:
            base = 18

        # Longer drafts save a bit more frequently.
        if words > 500:
            base -= 2
        elif words > 200:
            base -= 1

        # Logic rails: keep cadence in safe, bounded range.
        return max(5, min(30, base))

    def guidance(self, text: str) -> str:
        state = self.engine.state
        if not text.strip():
            return "Start with a single sentence. Let flow come first, then refine."
        if state.harmony < 0.58:
            return "Low harmony detected. Try one clarifying sentence and one concrete detail."
        if state.j < 0.45:
            return "Justice rail is light. Add punctuation and clearer sentence boundaries."
        if state.w < 0.50:
            return "Wisdom signal is low. Add one question or explicit intent to deepen context."
        if state.p > 0.90 and state.w < 0.60:
            return "Power is outpacing wisdom. Slow down and verify the core claim."
        return "Resonance is stable. Keep writing; refine only after the paragraph lands."
