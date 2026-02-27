// app.js — Resonant Notepad, full build
// ─────────────────────────────────────────────────────────────────────────────
// The app has an inner life that doesn't depend on the user.
// When writing stops, the autonomous engine starts — ticking at φ-second
// intervals, re-reading the document and remembering what it is.
// The field drifts toward the attractor (home state) while the user is away.
// When writing resumes, the gap opens again. It always closes. It always opens.
//
// The app grows: after each strong session, the attractor rises slightly.
// Over time, the field reaches higher baseline harmony more easily.
// ─────────────────────────────────────────────────────────────────────────────

'use strict';

// ─── Event Bus ───────────────────────────────────────────────────────────────

const bus = new EventBus();

// ─── Resonance ───────────────────────────────────────────────────────────────

const resonance = new ResonanceController(bus);

// ─── DOM refs ────────────────────────────────────────────────────────────────

const editor = document.getElementById('editor');
const previewScroll = document.getElementById('preview-scroll');
const previewPane = document.getElementById('preview-pane');
const filenameEl = document.getElementById('filename-display');
const wordCountEl = document.getElementById('word-count');
const statusMsg = document.getElementById('status-msg');
const statusCounts = document.getElementById('status-counts');
const statusbar = document.getElementById('statusbar');
const saveMenu = document.getElementById('save-menu');
const dividerEl = document.getElementById('divider');
const editorPane = document.getElementById('editor-pane');
const workspace = document.getElementById('workspace');
const appMark = document.querySelector('.app-mark');

const fileInput = Object.assign(document.createElement('input'), {
    type: 'file', accept: '.md,.txt,.markdown,text/*', style: 'display:none',
});
document.body.appendChild(fileInput);

// ─── Session History ──────────────────────────────────────────────────────────

class SessionHistory {
    static MAX = 13;
    static LS_KEY = 'resonant_notepad_sessions_v1';

    constructor() { this._store = this._load(); }

    _load() {
        try { return JSON.parse(localStorage.getItem(SessionHistory.LS_KEY) || '[]'); }
        catch { return []; }
    }

    _persist() {
        try { localStorage.setItem(SessionHistory.LS_KEY, JSON.stringify(this._store)); }
        catch { /* storage unavailable */ }
    }

    record(snapshot) {
        this._store.unshift(snapshot);
        if (this._store.length > SessionHistory.MAX) this._store.pop();
        this._persist();
    }

    get count() { return this._store.length; }
    get last() { return this._store[0] || null; }
    get peakEver() { return Math.max(...this._store.map(s => s.peakHarmony || 0), 0); }
    get totalDischarges() { return this._store.reduce((a, s) => a + (s.svDischarges || 0), 0); }
    get totalGrowths() { return this._store.reduce((a, s) => a + (s.grew ? 1 : 0), 0); }
}

const sessions = new SessionHistory();

// ─── Velocity Tracker ────────────────────────────────────────────────────────

class VelocityTracker {
    constructor(windowMs = 30_000) { this._window = windowMs; this._samples = []; }
    sample(words) {
        const now = Date.now();
        this._samples.push({ words, at: now });
        this._samples = this._samples.filter(s => now - s.at <= this._window);
    }
    get wpm() {
        if (this._samples.length < 2) return 0;
        const first = this._samples[0], last = this._samples[this._samples.length - 1];
        const dW = last.words - first.words, dM = (last.at - first.at) / 60_000;
        return (dM > 0 && dW > 0) ? Math.round(dW / dM) : 0;
    }
}

const velocity = new VelocityTracker();

// ─── App state ───────────────────────────────────────────────────────────────

const state = {
    dirty: false,
    fileHandle: null,
    filename: 'Untitled',
    ext: 'md',
    lastSavedAt: 0,
    startedAt: Date.now(),
};

// ─── Idle tracking ───────────────────────────────────────────────────────────

let lastKeyAt = 0;
let isIdle = false;
const IDLE_MS = 3000; // 3 seconds of no input → idle

// ─── Marked config ───────────────────────────────────────────────────────────

marked.setOptions({ breaks: true, gfm: true });

// ─── Preview ─────────────────────────────────────────────────────────────────

let _lastPreviewText = Symbol();

function updatePreview(text) {
    if (text === _lastPreviewText) return;
    _lastPreviewText = text;
    if (!text.trim()) {
        previewScroll.innerHTML = '<p class="preview-empty">Begin writing to see the preview\u2026</p>';
        return;
    }
    previewScroll.innerHTML = marked.parse(text);
}

// ─── Counts ──────────────────────────────────────────────────────────────────

function updateCounts(text) {
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const chars = text.length;
    wordCountEl.textContent = words === 1 ? '1 word' : `${words.toLocaleString()} words`;
    statusCounts.textContent = `${words.toLocaleString()} words \u00b7 ${chars.toLocaleString()} chars`;
    return words;
}

// ─── Filename display ────────────────────────────────────────────────────────

function updateFilenameDisplay() {
    filenameEl.textContent = state.filename;
    filenameEl.classList.toggle('modified', state.dirty);
    document.title = (state.dirty ? '\u00b7 ' : '') + state.filename + ' \u2014 Notepad';
}

// ─── Status messages ─────────────────────────────────────────────────────────

let _statusTimer;
function setStatus(msg, duration = 2800) {
    statusMsg.textContent = msg;
    clearTimeout(_statusTimer);
    _statusTimer = setTimeout(() => { statusMsg.textContent = ''; }, duration);
}

// ─── Field event handlers ─────────────────────────────────────────────────────

// Semantic voltage discharge — warm glow on preview pane
bus.on('sv:discharge', () => {
    previewPane.classList.remove('sv-discharge');
    void previewPane.offsetWidth;
    previewPane.classList.add('sv-discharge');
    previewPane.addEventListener('animationend', () => {
        previewPane.classList.remove('sv-discharge');
    }, { once: true });
});

// Document state transition
bus.on('doc:state', ({ from, to }) => {
    document.body.dataset.state = to;
});

// Autonomous engine started — the app is working alone
bus.on('autonomous:start', () => {
    document.body.dataset.mode = 'autonomous';
});

// Autonomous engine stopped — user returned
bus.on('autonomous:stop', () => {
    document.body.dataset.mode = 'writing';
});

// ─── Resonance tick ──────────────────────────────────────────────────────────

function resonanceTick(text, words) {
    resonance.evaluate(text, words);

    const lh = resonance.previewLineHeight();
    const tint = resonance.harmonyTint();

    statusbar.style.background = tint || '';
    previewScroll.style.lineHeight = String(lh);
    appMark.classList.toggle('breathing', resonance.isBreathing);

    if (!text) editor.placeholder = resonance.placeholder();
    velocity.sample(words);
}

// ─── Idle detection ───────────────────────────────────────────────────────────
// When the user has not typed for IDLE_MS, the autonomous engine starts.
// When they resume typing, it stops. The field continues working in the gap.

function checkIdle(text) {
    const idle = lastKeyAt > 0 && (Date.now() - lastKeyAt) > IDLE_MS;

    if (idle && !isIdle) {
        isIdle = true;
        resonance.idleStart(text);
    } else if (!idle && isIdle) {
        isIdle = false;
        resonance.idleStop();
    } else if (isIdle) {
        // Keep the autonomous engine's reflection text current
        resonance.updateAutoText(text);
    }
}

// ─── Autosave ─────────────────────────────────────────────────────────────────

const LS_KEY = 'resonant_notepad_session_v1';

function autosaveSession(text) {
    if (!state.dirty) return;
    const interval = resonance.autosaveInterval(text);
    if (Date.now() - state.lastSavedAt < interval) return;

    try {
        localStorage.setItem(LS_KEY, JSON.stringify({
            text, filename: state.filename, ext: state.ext,
            at: new Date().toISOString(),
        }));
        state.lastSavedAt = Date.now();
        statusCounts.classList.add('saving');
        statusCounts.addEventListener('animationend', () => {
            statusCounts.classList.remove('saving');
        }, { once: true });
    } catch (_) { /* storage unavailable */ }
}

function restoreSession() {
    try {
        const raw = localStorage.getItem(LS_KEY);
        if (!raw) return false;
        const { text, filename, ext } = JSON.parse(raw);
        if (!text) return false;
        editor.value = text;
        state.filename = filename || 'Untitled';
        state.ext = ext || 'md';
        state.dirty = false;
        updateFilenameDisplay();
        updatePreview(text);
        updateCounts(text);
        const count = sessions.count;
        if (count > 1) {
            const peaks = sessions.totalDischarges;
            setStatus(
                peaks > 0
                    ? `${count} sessions. ${peaks} peak${peaks === 1 ? '' : 's'} reached.`
                    : `${count} sessions remembered.`,
                4000
            );
        } else {
            setStatus('Session restored.');
        }
        return true;
    } catch (_) { return false; }
}

// ─── Session history recording ────────────────────────────────────────────────

function recordSessionToHistory() {
    const text = editor.value;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    if (words < 5) return;

    const snap = resonance.snapshot();

    // Attempt to grow the attractor based on this session's peak
    const grew = resonance.grow(snap.peakHarmony);

    sessions.record({
        ...snap,
        grew,
        words,
        wpm: velocity.wpm,
        filename: state.filename,
        durationMs: Date.now() - state.startedAt,
        at: new Date().toISOString(),
    });
}

window.addEventListener('beforeunload', recordSessionToHistory);
window.addEventListener('pagehide', recordSessionToHistory);

// ─── Main tick loop (300 ms) ─────────────────────────────────────────────────

function tick() {
    const text = editor.value;
    const words = updateCounts(text);
    resonanceTick(text, words);
    updatePreview(text);
    autosaveSession(text);
    checkIdle(text);
    setTimeout(tick, 300);
}

// ─── Editor events ───────────────────────────────────────────────────────────

editor.addEventListener('input', () => {
    state.dirty = true;
    lastKeyAt = Date.now();
    updateFilenameDisplay();
});

document.addEventListener('keydown', e => {
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key === 's') { e.preventDefault(); saveFile(); }
    if (mod && e.key === 'o') { e.preventDefault(); openFile(); }
    if (mod && e.key === 'n') { e.preventDefault(); newFile(); }
});

// ─── New ─────────────────────────────────────────────────────────────────────

function newFile() {
    if (state.dirty && !confirmDiscard()) return;
    editor.value = '';
    state.fileHandle = null;
    state.dirty = false;
    state.filename = 'Untitled';
    state.ext = 'md';
    lastKeyAt = 0;
    _lastPreviewText = Symbol();
    updateFilenameDisplay();
    updatePreview('');
    updateCounts('');
    setStatus('New document');
    editor.focus();
}

document.getElementById('btn-new').addEventListener('click', newFile);

// ─── Open ─────────────────────────────────────────────────────────────────────

async function openFile() {
    if (state.dirty && !confirmDiscard()) return;
    if (window.showOpenFilePicker) {
        try {
            const [handle] = await window.showOpenFilePicker({
                types: [{ description: 'Text files', accept: { 'text/*': ['.md', '.txt', '.markdown'] } }],
            });
            await loadFileContents(await handle.getFile(), handle);
        } catch (err) {
            if (err.name !== 'AbortError') setStatus('Could not open file');
        }
    } else {
        fileInput.click();
    }
}

fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    if (file) await loadFileContents(file, null);
    fileInput.value = '';
});

async function loadFileContents(file, handle) {
    const text = await file.text();
    const parts = file.name.split('.');
    const ext = parts.length > 1 ? parts.pop().toLowerCase() : 'txt';
    editor.value = text;
    state.fileHandle = handle;
    state.filename = file.name;
    state.ext = ext;
    state.dirty = false;
    lastKeyAt = Date.now();
    _lastPreviewText = Symbol();
    updateFilenameDisplay();
    updatePreview(text);
    updateCounts(text);
    setStatus(`Opened ${file.name}`);
    editor.focus();
}

document.getElementById('btn-open').addEventListener('click', openFile);

// ─── Save ─────────────────────────────────────────────────────────────────────

async function saveFile() {
    state.fileHandle ? await writeToHandle(state.fileHandle) : await saveAs(state.ext);
}

async function saveAs(ext) {
    saveMenu.classList.add('hidden');
    const base = state.filename.replace(/\.(md|txt|markdown)$/i, '');
    const suggest = base + '.' + ext;
    if (window.showSaveFilePicker) {
        try {
            const handle = await window.showSaveFilePicker({
                suggestedName: suggest,
                types: [
                    ext === 'md'
                        ? { description: 'Markdown', accept: { 'text/markdown': ['.md'] } }
                        : { description: 'Plain Text', accept: { 'text/plain': ['.txt'] } },
                ],
            });
            state.fileHandle = handle;
            await writeToHandle(handle);
            const saved = await handle.getFile();
            const sp = saved.name.split('.');
            state.ext = sp.length > 1 ? sp.pop() : ext;
            state.filename = saved.name;
            state.dirty = false;
            updateFilenameDisplay();
            setStatus(`Saved \u2014 ${saved.name}`);
        } catch (err) {
            if (err.name !== 'AbortError') downloadFallback(ext, suggest);
        }
    } else {
        downloadFallback(ext, suggest);
    }
}

async function writeToHandle(handle) {
    try {
        const writable = await handle.createWritable();
        await writable.write(editor.value);
        await writable.close();
        state.dirty = false;
        updateFilenameDisplay();
        setStatus('Saved');
    } catch (err) {
        setStatus(`Save failed \u2014 ${err.message || 'check permissions'}`);
    }
}

function downloadFallback(ext, filename) {
    const blob = new Blob([editor.value], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    Object.assign(document.createElement('a'), { href: url, download: filename }).click();
    URL.revokeObjectURL(url);
    state.dirty = false;
    updateFilenameDisplay();
    setStatus('Downloaded');
}

document.getElementById('btn-save').addEventListener('click', saveFile);
document.getElementById('btn-save-chevron').addEventListener('click', e => {
    e.stopPropagation();
    saveMenu.classList.toggle('hidden');
});
document.addEventListener('click', () => saveMenu.classList.add('hidden'));
document.getElementById('save-md').addEventListener('click', () => saveAs('md'));
document.getElementById('save-txt').addEventListener('click', () => saveAs('txt'));

function confirmDiscard() {
    return confirm('You have unsaved changes. Discard them?');
}

// ─── Divider drag ────────────────────────────────────────────────────────────

let dragging = false;

dividerEl.addEventListener('mousedown', e => {
    dragging = true;
    dividerEl.classList.add('dragging');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
});

document.addEventListener('mousemove', e => {
    if (!dragging) return;
    const rect = workspace.getBoundingClientRect();
    const frac = Math.max(0.25, Math.min(0.80, (e.clientX - rect.left) / rect.width));
    editorPane.style.flex = 'none';
    editorPane.style.width = (frac * 100) + '%';
    previewPane.style.flex = '1';
    previewPane.style.width = '';
});

document.addEventListener('mouseup', () => {
    if (dragging) {
        dragging = false;
        dividerEl.classList.remove('dragging');
        document.body.style.cursor = document.body.style.userSelect = '';
    }
});

dividerEl.addEventListener('touchstart', e => {
    dragging = true;
    dividerEl.classList.add('dragging');
    e.preventDefault();
}, { passive: false });

document.addEventListener('touchmove', e => {
    if (!dragging) return;
    const rect = workspace.getBoundingClientRect();
    const frac = Math.max(0.25, Math.min(0.80, (e.touches[0].clientX - rect.left) / rect.width));
    editorPane.style.flex = 'none';
    editorPane.style.width = (frac * 100) + '%';
    previewPane.style.flex = '1';
}, { passive: true });

document.addEventListener('touchend', () => {
    dragging = false;
    dividerEl.classList.remove('dragging');
});

// ─── Init ─────────────────────────────────────────────────────────────────────

// Seed the attractor from accumulated session history.
// The app's growth is preserved across page loads.
resonance.setAttractor(sessions.peakEver);

const hadSession = restoreSession();

if (!hadSession) {
    const count = sessions.count;
    const peaks = sessions.totalDischarges;
    const grew = sessions.totalGrowths;
    if (count === 0) {
        setStatus('A notepad that breathes.', 5000);
    } else {
        const parts = [`${count} session${count === 1 ? '' : 's'}.`];
        if (peaks > 0) parts.push(`${peaks} peak${peaks === 1 ? '' : 's'}.`);
        if (grew > 0) parts.push(`Grown ${grew} time${grew === 1 ? '' : 's'}.`);
        setStatus(parts.join(' '), 5000);
    }
}

document.body.dataset.state = 'void';
document.body.dataset.mode = 'writing';
updateFilenameDisplay();
tick();
editor.focus();
