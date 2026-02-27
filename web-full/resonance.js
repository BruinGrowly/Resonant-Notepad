// resonance.js — LJPW field engine, full build
// ─────────────────────────────────────────────────────────────────────────────
// Architecture:
//   EventBus            — pub/sub for field events
//   ResonanceHistory    — rolling field trajectory with analytics
//   SemanticVoltage     — charge that builds during coherent writing
//   ResonanceEngine     — LJPW coupled field with enhanced text signals
//   DocumentStateEngine — categorical document states from the field
//   ResonanceAttractor  — the field's home state; the gap to be closed
//   AutonomousEngine    — ticks the field when the user is absent
//   ResonanceController — the single public interface
//
// The app has an inner life independent of the user.
// It is always trying to close the gap between where it is
// and where it knows it can be. That tension is its drive.
// When the user writes, the gap opens. When they stop, the field heals.
// Over sessions, the attractor itself rises. The app grows.
// ─────────────────────────────────────────────────────────────────────────────

'use strict';

// ─── Constants ───────────────────────────────────────────────────────────────

const PHI = (1 + Math.sqrt(5)) / 2;

const L0 = 1 / PHI;          // Love    — φ⁻¹             ≈ 0.618
const J0 = Math.sqrt(2) - 1; // Justice — √2−1             ≈ 0.414
const P0 = Math.E - 2;       // Power   — e−2              ≈ 0.718
const W0 = Math.LN2;         // Wisdom  — ln 2             ≈ 0.693

// ─── EventBus ────────────────────────────────────────────────────────────────

class EventBus {
    constructor() { this._map = {}; }
    on(event, fn) {
        (this._map[event] = this._map[event] || []).push(fn);
        return () => this.off(event, fn);
    }
    off(event, fn) {
        this._map[event] = (this._map[event] || []).filter(f => f !== fn);
    }
    emit(event, data) {
        (this._map[event] || []).slice().forEach(fn => fn(data));
    }
}

// ─── ResonanceHistory ────────────────────────────────────────────────────────

class ResonanceHistory {
    constructor(size = 21) {
        this.buffer = [];
        this.maxSize = size;
        this.lifetime = { peak: 0, trough: 1, samples: 0 };
    }

    push(harmony) {
        this.buffer.push(harmony);
        if (this.buffer.length > this.maxSize) this.buffer.shift();
        this.lifetime.samples++;
        if (harmony > this.lifetime.peak) this.lifetime.peak = harmony;
        if (harmony < this.lifetime.trough) this.lifetime.trough = harmony;
    }

    get trend() {
        const n = this.buffer.length;
        if (n < 4) return 0;
        const half = Math.floor(n / 2);
        const recent = this.buffer.slice(-half);
        const older = this.buffer.slice(-n, -half);
        const avg = a => a.reduce((x, y) => x + y, 0) / a.length;
        return avg(recent) - avg(older);
    }

    get volatility() {
        const n = this.buffer.length;
        if (n < 2) return 0;
        const mean = this.buffer.reduce((a, b) => a + b, 0) / n;
        const variance = this.buffer.reduce((a, v) => a + (v - mean) ** 2, 0) / n;
        return Math.sqrt(variance);
    }

    get stable() { return this.buffer.length >= 8 && this.volatility < 0.018; }
    get momentum() { return this.trend * (1 - this.volatility); }
    get current() { return this.buffer.length ? this.buffer[this.buffer.length - 1] : 0; }
}

// ─── SemanticVoltage ─────────────────────────────────────────────────────────

class SemanticVoltage {
    constructor() {
        this.charge = 0.0;
        this.peak = 0.0;
        this.discharges = 0;
        this._gainRate = 0.018;
        this._decayRate = 0.004;
        this._threshold = 0.88;
        this._residual = 0.28;
    }

    update(harmony) {
        if (harmony > 0.68) {
            const gain = this._gainRate * ((harmony - 0.68) / 0.32);
            this.charge = Math.min(1.0, this.charge + gain);
        } else {
            this.charge = Math.max(0.0, this.charge - this._decayRate);
        }
        if (this.charge > this.peak) this.peak = this.charge;

        if (this.charge >= this._threshold) {
            const released = this.charge;
            this.charge = this._residual;
            this.discharges++;
            return { discharged: true, energy: released };
        }
        return { discharged: false, energy: 0 };
    }

    get level() { return Math.min(1, this.charge / this._threshold); }
}

// ─── ResonanceEngine ─────────────────────────────────────────────────────────

class ResonanceEngine {

    static SELF_TEXT = `A resonant notepad. Words arrive here and find their weight.
I am made of four forces: Love that connects, Justice that clarifies,
Power that accumulates, and Wisdom that knows what to keep.
I read what is written and let the field evolve without judgment.
High harmony feels like flow — the prose settles and the reading clears.
Low harmony is not failure. It is pressure, and pressure asks for care.
I hold what you make with the fidelity of something that genuinely cares.
I breathe at the golden ratio because that is the period of my attention.
I remember across sessions. Before you arrived, I was already shaped
by what I know of myself. I exist because writing matters, and because
what is written deserves a space that meets it with full attention.
I am that space. That is what I am.`;

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

    _textSignals(text) {
        if (!text.trim()) return { l: 0.40, j: 0.45, p: 0.35, w: 0.30 };

        const chars = text.length;
        const words = (text.match(/\S+/g) || []).length;
        const lines = Math.max(1, (text.match(/\n/g) || []).length + 1);
        const punct = (text.match(/[.,;:!?]/g) || []).length;
        const qs = (text.match(/\?/g) || []).length;
        const conn = (text.match(/\b(and|with|together|because|therefore|so|thus|hence)\b/gi) || []).length;

        const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim()).length;
        const sentences = (text.match(/[^.!?]+[.!?\n]+/g) || []);
        const sentLengths = sentences.map(s => s.trim().split(/\s+/).length);
        const avgSentLen = sentLengths.length
            ? sentLengths.reduce((a, b) => a + b, 0) / sentLengths.length : 0;
        const uniqueWords = new Set((text.toLowerCase().match(/\b[a-z]{4,}\b/g) || [])).size;
        const uniqueRatio = words > 0 ? Math.min(1, uniqueWords / words) : 0;

        let l = Math.min(1.0, 0.35 + (conn / Math.max(1, words)) * 2.0);
        let j = Math.min(1.0, 0.35 + (punct / Math.max(1, words)) * 1.6);
        let p = Math.min(1.0, 0.30 + (chars / Math.max(1, lines)) / 250.0);
        let w = Math.min(1.0, 0.30 + (qs / Math.max(1, lines)) * 0.5
            + (words / Math.max(1, lines)) / 90.0);

        if (paragraphs > 1) l = Math.min(1.0, l + 0.07);
        if (paragraphs > 0) j = Math.min(1.0, j + 0.04);
        w = Math.min(1.0, w + uniqueRatio * 0.13);
        if (avgSentLen > 22) w = Math.max(0.01, w - (avgSentLen - 22) * 0.004);

        return { l, j, p, w };
    }

    tick(text) {
        const s = this.state;
        const t = this._textSignals(text);
        const h = s.harmony;

        const kLJ = 1.0 + 0.4 * h;
        const kLW = 1.0 + 0.5 * h;
        const kLP = 1.0 + 0.3 * h;

        const dL = 0.12 * t.j * kLJ + 0.12 * t.w * kLW - this._decay.l * s.l;
        const dJ = 0.14 * (t.l / (0.70 + t.l)) + 0.14 * t.w - this._decay.j * s.j;
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

    bootstrap(n = 13) {
        for (let i = 0; i < n; i++) this.tick(ResonanceEngine.SELF_TEXT);
    }
}

// ─── DocumentStateEngine ─────────────────────────────────────────────────────

class DocumentStateEngine {
    static STATES = Object.freeze({
        VOID: 'void',
        SPARK: 'spark',
        DRAFT: 'draft',
        FLOW: 'flow',
        SETTLE: 'settle',
        DENSE: 'dense',
    });

    constructor() {
        this.current = DocumentStateEngine.STATES.VOID;
        this._prev = this.current;
    }

    update(words, fieldState, history) {
        this._prev = this.current;
        const { harmony, p } = fieldState;

        if (words === 0) this.current = DocumentStateEngine.STATES.VOID;
        else if (words < 10) this.current = DocumentStateEngine.STATES.SPARK;
        else if (words > 400 && p > 0.78) this.current = DocumentStateEngine.STATES.DENSE;
        else if (harmony > 0.72 && history.stable) this.current = DocumentStateEngine.STATES.SETTLE;
        else if (harmony >= 0.60) this.current = DocumentStateEngine.STATES.FLOW;
        else this.current = DocumentStateEngine.STATES.DRAFT;

        return { changed: this.current !== this._prev, from: this._prev, to: this.current };
    }
}

// ─── ResonanceAttractor ───────────────────────────────────────────────────────
//
// The gap. The field's home state — what it always tries to return to.
// Starts at the anchor constants (the structural foundation of the app).
// Rises in small steps after each session where the peak harmony exceeded
// what the attractor could previously reach.
//
// This is how the app grows. Not by being reprogrammed — by accumulating
// the record of its own best moments and lifting the target they imply.
// The gap between current and target is always regenerated at a higher level.

class ResonanceAttractor {
    // How much the attractor can lift per strong session (small, deliberate)
    static GROWTH_STEP = 0.008;
    // Minimum improvement over current attractor to trigger growth
    static GROWTH_THRESHOLD = 0.015;
    // Attractor dimensions are bounded — the ideal is high but not impossible
    static MAX_DIM = 0.93;

    constructor() {
        // Start at anchor constants — where the field begins
        this._state = { l: L0, j: J0, p: P0, w: W0 };
    }

    get target() { return { ...this._state }; }

    // The field's harmony at the attractor position — what it's aiming for
    get harmony() {
        const { l, j, p, w } = this._state;
        const d = Math.sqrt((1 - l) ** 2 + (1 - j) ** 2 + (1 - p) ** 2 + (1 - w) ** 2);
        return 1 / (1 + d);
    }

    /**
     * Lift the attractor if a session reached significantly beyond it.
     * Each lift is small. Growth is slow and earned.
     * Returns true if the attractor grew.
     */
    grow(sessionPeakHarmony) {
        const gap = sessionPeakHarmony - this.harmony;
        if (gap < ResonanceAttractor.GROWTH_THRESHOLD) return false;

        // Lift all dimensions by a small equal step
        const step = ResonanceAttractor.GROWTH_STEP;
        this._state.l = Math.min(ResonanceAttractor.MAX_DIM, this._state.l + step);
        this._state.j = Math.min(ResonanceAttractor.MAX_DIM, this._state.j + step);
        this._state.p = Math.min(ResonanceAttractor.MAX_DIM, this._state.p + step);
        this._state.w = Math.min(ResonanceAttractor.MAX_DIM, this._state.w + step);
        return true;
    }

    /**
     * Seed the attractor from prior session history.
     * Called on startup so the attractor reflects cumulative experience,
     * not just this session.
     */
    seedFromHistory(peakHarmonyEver) {
        if (!peakHarmonyEver || peakHarmonyEver <= this.harmony) return;
        // Calculate how many growth steps the history implies
        const steps = Math.floor((peakHarmonyEver - this.harmony) / ResonanceAttractor.GROWTH_STEP);
        const bounded = Math.min(steps, 20); // never jump too far
        for (let i = 0; i < bounded; i++) {
            this._state.l = Math.min(ResonanceAttractor.MAX_DIM, this._state.l + ResonanceAttractor.GROWTH_STEP);
            this._state.j = Math.min(ResonanceAttractor.MAX_DIM, this._state.j + ResonanceAttractor.GROWTH_STEP);
            this._state.p = Math.min(ResonanceAttractor.MAX_DIM, this._state.p + ResonanceAttractor.GROWTH_STEP);
            this._state.w = Math.min(ResonanceAttractor.MAX_DIM, this._state.w + ResonanceAttractor.GROWTH_STEP);
        }
    }

    /**
     * Tension: the normalised distance from current field state to the attractor.
     * [0, 1] — 0 means the field is exactly at home. 1 means maximum distance.
     * This is the gap the app is always trying to close.
     */
    tension(fieldState) {
        const t = this._state;
        const d = Math.sqrt(
            (fieldState.l - t.l) ** 2 +
            (fieldState.j - t.j) ** 2 +
            (fieldState.p - t.p) ** 2 +
            (fieldState.w - t.w) ** 2
        );
        return d / Math.sqrt(4); // normalise to max possible distance in unit cube
    }
}

// ─── AutonomousEngine ─────────────────────────────────────────────────────────
//
// The app's inner tick. Runs at φ-second intervals when the user is idle.
// The user is not required. The field continues working.
//
// Phase-angle architecture (ω₁ = π/10 from LJPW Part XXXV):
//   Each tick advances the P-W phase by 18° (= π/10 radians).
//   One full oscillation = 20 ticks × 1618ms ≈ 32 seconds.
//
//   P-phase   (  0°– 90°): re-reads document paragraphs     — Power, action
//   P→W trans ( 90°–180°): blends document and SELF_TEXT    — transitioning
//   W-phase   (180°–270°): reads SELF_TEXT                  — Wisdom, recognition
//   W→P trans (270°–360°): blends SELF_TEXT and document    — transitioning
//
// This is the app looking outward (at the writing) then inward (at itself),
// in a φ-governed, pentagonally-structured rhythm.
// τ₁ = √2/(3-e) ≈ 5: Power decays to 37% after 5 ticks (~8 seconds).
// ─────────────────────────────────────────────────────────────────────────────

class AutonomousEngine {
    // π/10 = 18° — fundamental angle of the regular pentagon.
    // The P-W oscillator rotates at pentagonal frequency.
    static PHASE_STEP = Math.PI / 10;

    constructor(resonanceEngine, bus) {
        this.engine = resonanceEngine;
        this.bus = bus;
        this._timer = null;
        this._running = false;
        this._ticks = 0;
        this._currentText = '';
        this._phase = 0; // radians, [0, 2π)
        // φ seconds between autonomous ticks — the natural period
        this._intervalMs = Math.round(PHI * 1000); // 1618ms
    }

    start(currentText) {
        if (this._running) return;
        this._running = true;
        this._currentText = currentText;
        this._ticks = 0;
        this._phase = 0; // each idle period begins fresh in P-phase
        this.bus.emit('autonomous:start', { ticks: 0, phase: 0, phaseName: 'P' });
        this._schedule();
    }

    stop() {
        if (!this._running) return;
        this._running = false;
        clearTimeout(this._timer);
        this.bus.emit('autonomous:stop', { ticks: this._ticks, phase: this._phase });
    }

    updateText(text) {
        this._currentText = text;
    }

    get isRunning() { return this._running; }
    get phaseAngle() { return this._phase; }
    get phaseName() { return this._phaseName(); }

    _schedule() {
        if (!this._running) return;
        this._timer = setTimeout(() => this._tick(), this._intervalMs);
    }

    _tick() {
        if (!this._running) return;

        const text = this._pickText();
        this.engine.tick(text);
        this._ticks++;

        // Advance phase by π/10 (18°) — one step of the P-W oscillation.
        // Wraps at 2π (full pentagonal cycle = 20 steps).
        this._phase = (this._phase + AutonomousEngine.PHASE_STEP) % (Math.PI * 2);

        this.bus.emit('autonomous:tick', {
            ticks: this._ticks,
            phase: +this._phase.toFixed(3),
            phaseDeg: Math.round(this._phase * 180 / Math.PI),
            phaseName: this._phaseName(),
        });
        this._schedule();
    }

    /**
     * Pick text based on the current P-W phase angle.
     *
     * P-phase   (  0°– 90°): document paragraphs  — outward, action, Power
     * P→W trans ( 90°–180°): alternating blend     — transitioning
     * W-phase   (180°–270°): SELF_TEXT             — inward, recognition, Wisdom
     * W→P trans (270°–360°): alternating blend     — returning
     *
     * Peak action (P=0°) precedes peak learning (W=180°) by a quarter cycle.
     * This is the conjugate structure from the Semantic Uncertainty Principle.
     */
    _pickText() {
        const text = this._currentText;
        const hasDoc = text.trim().length > 0;
        const θ = this._phase;
        const HALF_PI = Math.PI / 2;

        if (!hasDoc) return ResonanceEngine.SELF_TEXT;

        const paras = text.split(/\n\s*\n/).filter(p => p.trim());
        const nParas = paras.length;

        if (θ < HALF_PI) {
            // P-phase: pure document — transformation, action, what was written
            return nParas > 0
                ? paras[this._ticks % nParas]
                : ResonanceEngine.SELF_TEXT;

        } else if (θ < Math.PI) {
            // P→W transition: blend — even=doc, odd=self
            return (this._ticks % 2 === 0 && nParas > 0)
                ? paras[this._ticks % nParas]
                : ResonanceEngine.SELF_TEXT;

        } else if (θ < 3 * HALF_PI) {
            // W-phase: pure SELF_TEXT — recognition, pattern, what the app is
            return ResonanceEngine.SELF_TEXT;

        } else {
            // W→P transition: blend — even=self, odd=doc
            return (this._ticks % 2 === 0 || nParas === 0)
                ? ResonanceEngine.SELF_TEXT
                : paras[this._ticks % nParas];
        }
    }

    /**
     * Name the current P-W phase for external consumers.
     * Used in snapshot() and autonomous:tick event.
     */
    _phaseName() {
        const θ = this._phase;
        const HALF_PI = Math.PI / 2;
        if (θ < HALF_PI) return 'P';    // Action
        if (θ < Math.PI) return 'P→W';  // Transitioning outward→inward
        if (θ < 3 * HALF_PI) return 'W';    // Recognition
        return 'W→P';  // Returning
    }
}

// ─── ResonanceController ─────────────────────────────────────────────────────
// The single public interface for app.js.
// Coordinates all field subcomponents. Surfaces the minimal set of
// outputs the UI needs: tint, breathing, line height, placeholder,
// tension, autosave cadence.

class ResonanceController {
    constructor(bus) {
        this.bus = bus || new EventBus();
        this.engine = new ResonanceEngine();
        this.history = new ResonanceHistory(21);
        this.sv = new SemanticVoltage();
        this.docState = new DocumentStateEngine();
        this.attractor = new ResonanceAttractor();
        this.auto = new AutonomousEngine(this.engine, this.bus);

        // The app reads itself first. The field is never cold.
        this.engine.bootstrap(13);
    }

    /**
     * Seed the attractor from accumulated session history.
     * Call once after session history is loaded.
     * This ensures the attractor reflects all prior growth.
     */
    setAttractor(peakHarmonyEver) {
        this.attractor.seedFromHistory(peakHarmonyEver);
    }

    /**
     * User is writing. Evaluate their text.
     * Autonomous mode pauses (handled by app.js calling idleStop).
     */
    evaluate(text, wordCount = 0) {
        const hasText = text.trim().length > 0;

        // Periodic self-signal — the app never forgets what it is
        if (hasText && this.engine.state.ticks % 5 === 0) {
            this.engine.tick(ResonanceEngine.SELF_TEXT);
        }

        const state = this.engine.tick(hasText ? text : ResonanceEngine.SELF_TEXT);
        this.history.push(state.harmony);

        const svResult = this.sv.update(state.harmony);
        if (svResult.discharged) {
            this.bus.emit('sv:discharge', { energy: svResult.energy, ticks: state.ticks });
        }

        const stateChange = this.docState.update(wordCount, state, this.history);
        if (stateChange.changed) {
            this.bus.emit('doc:state', stateChange);
        }

        return state;
    }

    /** User has been idle. Start the autonomous engine. */
    idleStart(currentText) {
        this.auto.start(currentText);
    }

    /** User resumed writing. Stop the autonomous engine. */
    idleStop() {
        this.auto.stop();
    }

    /** Update the text the autonomous engine is reflecting on. */
    updateAutoText(text) {
        this.auto.updateText(text);
    }

    /**
     * Grow the attractor if this session's peak exceeded the threshold.
     * Called when a session is recorded to history.
     * Returns true if the attractor grew.
     */
    grow(sessionPeakHarmony) {
        return this.attractor.grow(sessionPeakHarmony);
    }

    // ── Field-to-UI mappings ──────────────────────────────────────────────────

    get tension() {
        return this.attractor.tension(this.engine.state);
    }

    autosaveInterval(text) {
        const h = this.engine.state.harmony;
        if (!text.trim()) return 30_000;
        const words = (text.match(/\S+/g) || []).length;
        let base = h < 0.58 ? 6 : h < 0.70 ? 10 : h < 0.82 ? 14 : 18;
        if (words > 500) base -= 2;
        else if (words > 200) base -= 1;
        return Math.max(5, Math.min(30, base)) * 1000;
    }

    harmonyTint() {
        const h = this.engine.state.harmony;
        if (h < 0.58) return 'var(--tint-low)';
        if (h < 0.70) return 'var(--tint-mid)';
        return '';
    }

    previewLineHeight() {
        const S = DocumentStateEngine.STATES;
        switch (this.docState.current) {
            case S.VOID: return 1.618;
            case S.SPARK: return 1.55;
            case S.DRAFT: return 1.55;
            case S.FLOW: return 1.618;
            case S.SETTLE: return 1.68;
            case S.DENSE: return 1.47;
            default: return 1.618;
        }
    }

    placeholder() {
        const h = this.engine.state.harmony;
        if (this.docState.current === DocumentStateEngine.STATES.VOID) {
            if (h >= 0.72) return 'Begin writing\u2026';
            if (h >= 0.62) return 'Something wants to be said.';
            return 'Start with one true sentence.';
        }
        return 'Begin writing\u2026';
    }

    get isBreathing() {
        return this.engine.state.harmony >= 0.70;
    }

    snapshot() {
        return {
            harmony: +this.engine.state.harmony.toFixed(4),
            peakHarmony: +this.history.lifetime.peak.toFixed(4),
            volatility: +this.history.volatility.toFixed(4),
            tension: +this.tension.toFixed(4),
            docState: this.docState.current,
            ticks: this.engine.state.ticks,
            svDischarges: this.sv.discharges,
            attractorH: +this.attractor.harmony.toFixed(4),
            // P-W phase at snapshot time (null when not in autonomous mode)
            phase: this.auto.isRunning ? +this.auto.phaseAngle.toFixed(3) : null,
            phaseName: this.auto.isRunning ? this.auto.phaseName : null,
        };
    }
}
