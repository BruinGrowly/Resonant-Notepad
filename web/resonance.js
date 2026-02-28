// resonance.js — LJPW field engine
// Runs silently in the background. No values are shown to the user.
// The field's harmony influences autosave cadence and the status bar tint only.

const PHI = (1 + Math.sqrt(5)) / 2;

// Transcendental anchor constants — not tuned, structurally derived.
const L0 = 1 / PHI;          // Love    — φ⁻¹  (Golden Ratio conjugate, ≈0.618)
const J0 = Math.sqrt(2) - 1; // Justice — √2−1  (Silver Ratio,           ≈0.414)
const P0 = Math.E - 2;       // Power   — e−2   (Euler's residue,         ≈0.718)
const W0 = Math.LN2;         // Wisdom  — ln 2  (Natural log of two,      ≈0.693)

class ResonanceEngine {

  // The app's self-understanding. Processed before any user text arrives.
  // This is not documentation — it is what the app knows about itself,
  // expressed in the same language the field reads.
  static SELF_TEXT = `A notepad that resonates with what is written.
Words here connect and clarify, accumulate and refine.
What is written is held carefully and returned with fidelity.
The field breathes with the writer because it was made to.
I am the space where that happens. I exist because writing matters.`;

  constructor() {
    this.state = { l: L0, j: J0, p: P0, w: W0, harmony: 0, ticks: 0 };
    this.state.harmony = this._harmony();
    this._decay = { l: 0.05, j: 0.05, p: 0.05, w: 0.06 };
  }

  _harmony() {
    const { l, j, p, w } = this.state;
    const d = Math.sqrt((1 - l) ** 2 + (1 - j) ** 2 + (1 - p) ** 2 + (1 - w) ** 2);
    return 1 / (1 + d);
  }

  _clamp(v) { return Math.max(0.01, Math.min(1.0, v)); }

  /**
   * Extract LJPW signal targets from text statistics.
   * Each is a first-order proxy approximation — not ground truth.
   *
   * L (Love/Connection)  — proxy: connector word density
   *   Captures: relational intent via "and, with, because, therefore…"
   *   Limitation: high in any connector-rich text regardless of actual relational depth.
   *
   * J (Justice/Clarity)  — proxy: punctuation density
   *   Captures: structured, boundary-respecting prose.
   *   Limitation: bullet notes score low despite being highly organised.
   *
   * P (Power/Density)    — proxy: characters per line
   *   Captures: content density and drafting momentum.
   *   Limitation: long diffuse lines inflate the signal.
   *
   * W (Wisdom/Intent)    — proxy: question rate + word density per line
   *   Captures: reflective or intent-setting passages.
   *   Limitation: non-interrogative intent (affirmations, hypotheses) is invisible.
   */
  _textSignals(text) {
    if (!text.trim()) return { l: 0.40, j: 0.45, p: 0.35, w: 0.30 };

    const chars = text.length;
    const words = (text.match(/\S+/g) || []).length;
    const lines = Math.max(1, (text.match(/\n/g) || []).length + 1);
    const punct = (text.match(/[.,;:!?]/g) || []).length;
    const qs = (text.match(/\?/g) || []).length;
    const conn = (text.match(/\b(and|with|together|because|therefore|so)\b/gi) || []).length;

    return {
      l: Math.min(1.0, 0.35 + (conn / Math.max(1, words)) * 2.0),
      j: Math.min(1.0, 0.35 + (punct / Math.max(1, words)) * 1.6),
      p: Math.min(1.0, 0.30 + (chars / Math.max(1, lines)) / 250.0),
      w: Math.min(1.0, 0.30 + (qs / Math.max(1, lines)) * 0.5
        + (words / Math.max(1, lines)) / 90.0),
    };
  }

  tick(text) {
    const s = this.state;
    const t = this._textSignals(text);
    const h = s.harmony;

    // Harmony-coupled gain constants.
    const kLJ = 1.0 + 0.4 * h;
    const kLW = 1.0 + 0.5 * h;
    const kLP = 1.0 + 0.3 * h;

    const dL = 0.12 * t.j * kLJ + 0.12 * t.w * kLW - this._decay.l * s.l;
    const dJ = 0.14 * (t.l / (0.618 + t.l)) + 0.14 * t.w - this._decay.j * s.j;
    const dP = 0.12 * t.l * kLP + 0.12 * t.j - this._decay.p * s.p;
    const dW = 0.10 * t.l * kLW + 0.10 * t.j + 0.10 * t.p - this._decay.w * s.w;

    const dt = 0.08;
    s.l = this._clamp(s.l + dt * dL);
    s.j = this._clamp(s.j + dt * dJ);
    s.p = this._clamp(s.p + dt * dP);
    s.w = this._clamp(s.w + dt * dW);
    s.harmony = this._harmony();
    s.ticks++;
    return { ...s };
  }

  /**
   * Bootstrap: the engine reads its own identity before any user text arrives.
   * 8 ticks (Fibonacci) against SELF_TEXT shifts the initial field away from
   * cold anchor constants toward a state shaped by what the app understands
   * about itself. The field has already been somewhere before the user arrives.
   */
  bootstrap(n = 8) {
    for (let i = 0; i < n; i++) {
      this.tick(ResonanceEngine.SELF_TEXT);
    }
  }
}

class ResonanceController {
  constructor() {
    this.engine = new ResonanceEngine();
    // The app reads itself first. The field is never cold.
    this.engine.bootstrap(8);
  }

  /**
   * Evaluate user text. The field evolves as a blend:
   * 85% user text signal + 15% self-signal.
   * The app always carries a faint sense of what it is
   * alongside whatever the user is writing.
   */
  evaluate(text) {
    if (text.trim()) {
      // Blend: user text is primary. Self is the background hum.
      // Achieved by interleaving: 5 user ticks + 1 self tick per cycle.
      // At 300 ms intervals, this means the self-signal re-asserts ~every 1.8 s.
      const selfEvery = 6; // nearest integer to 1/0.15 = 6.67; sits between Fibonacci numbers 5 and 8
      if (this.engine.state.ticks % selfEvery === 0) {
        this.engine.tick(ResonanceEngine.SELF_TEXT);
      }
    }
    return this.engine.tick(text.trim() ? text : ResonanceEngine.SELF_TEXT);
  }

  /**
   * Returns autosave interval in milliseconds.
   * Harmony drives the base cadence; logic rails keep it bounded.
   * Lower harmony → save more frequently (higher urgency signal).
   */
  autosaveInterval(text) {
    const h = this.engine.state.harmony;
    if (!text.trim()) return 30_000;

    const words = (text.match(/\S+/g) || []).length;
    let base = h < 0.58 ? 6 : h < 0.70 ? 10 : h < 0.82 ? 14 : 18;
    if (words > 500) base -= 2;
    else if (words > 200) base -= 1;

    return Math.max(5, Math.min(30, base)) * 1000;
  }

  /**
   * Maps current harmony to a subtle status bar background tint.
   * The field acts on the UI without surfacing any numbers.
   */
  harmonyTint() {
    const h = this.engine.state.harmony;
    if (h < 0.58) return 'var(--tint-low)';
    if (h < 0.70) return 'var(--tint-mid)';
    return '';
  }

  /**
   * Returns placeholder text that shifts with the field state.
   * The app invites writing differently depending on how it feels.
   * No explanation is offered — it simply speaks.
   */
  placeholder() {
    const h = this.engine.state.harmony;
    if (h >= 0.72) return 'Begin writing\u2026';
    if (h >= 0.60) return 'Something wants to be said.';
    return 'Start with one true sentence.';
  }
}
