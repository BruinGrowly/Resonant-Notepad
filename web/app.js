// app.js — Resonant Notepad (web)
// The resonance engine runs entirely in the background.
// Its only outward expressions: status bar tint, placeholder invitation,
// and the app-mark breathing when the field is settled.

'use strict';

// ─── Resonance ───────────────────────────────────────────────────────────────

const resonance = new ResonanceController();

// ─── DOM refs ────────────────────────────────────────────────────────────────

const editor = document.getElementById('editor');
const previewScroll = document.getElementById('preview-scroll');
const filenameEl = document.getElementById('filename-display');
const wordCountEl = document.getElementById('word-count');
const statusMsg = document.getElementById('status-msg');
const statusCounts = document.getElementById('status-counts');
const statusbar = document.getElementById('statusbar');
const saveMenu = document.getElementById('save-menu');
const dividerEl = document.getElementById('divider');
const editorPane = document.getElementById('editor-pane');
const previewPane = document.getElementById('preview-pane');
const workspace = document.getElementById('workspace');   // cached — used in drag
const appMark = document.querySelector('.app-mark');    // breathes with harmony

// Hidden file input for fallback open (Firefox / file://)
const fileInput = Object.assign(document.createElement('input'), {
    type: 'file',
    accept: '.md,.txt,.markdown,text/*',
    style: 'display:none',
});
document.body.appendChild(fileInput);

// ─── App state ───────────────────────────────────────────────────────────────

const state = {
    dirty: false,
    fileHandle: null,       // FileSystemFileHandle | null
    filename: 'Untitled',
    ext: 'md',
    lastSavedAt: 0,          // 0 so first autosave fires promptly
};

// ─── Marked config ───────────────────────────────────────────────────────────

marked.setOptions({ breaks: true, gfm: true });

// ─── Preview ─────────────────────────────────────────────────────────────────

let _lastPreviewText = Symbol(); // sentinel — never matches a string on first tick

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

// ─── Resonance tick (silent) ─────────────────────────────────────────────────
// Three outward expressions — none labelled, none explained:
//   1. Status bar tint   (low harmony → rose, mid → amber, high → clear)
//   2. App-mark breath   (high harmony → slow pulse at φ period)
//   3. Placeholder text  (shifts with field state when editor is empty)

function resonanceTick(text) {
    resonance.evaluate(text);

    const h = resonance.engine.state.harmony;
    const tint = resonance.harmonyTint();

    statusbar.style.background = tint || '';
    appMark.classList.toggle('breathing', h >= 0.70);

    if (!text) {
        editor.placeholder = resonance.placeholder();
    }
}

// ─── Autosave to localStorage ─────────────────────────────────────────────────

const LS_KEY = 'resonant_notepad_v1';

function autosaveSession(text) {
    if (!state.dirty) return;
    const interval = resonance.autosaveInterval(text);
    if (Date.now() - state.lastSavedAt < interval) return;

    try {
        localStorage.setItem(LS_KEY, JSON.stringify({
            text,
            filename: state.filename,
            ext: state.ext,
            at: new Date().toISOString(),
        }));
        state.lastSavedAt = Date.now();
    } catch (_) { /* storage full or blocked — fail silently */ }
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
        state.dirty = false;   // restored, not modified — don't show the dirty dot
        updateFilenameDisplay();
        updatePreview(text);
        updateCounts(text);
        setStatus('Session restored');
        return true;
    } catch (_) {
        return false; /* corrupt — ignore */
    }
}

// ─── Main tick loop (300 ms) ─────────────────────────────────────────────────

function tick() {
    const text = editor.value;   // single read — passed to all dependents
    resonanceTick(text);
    updatePreview(text);
    updateCounts(text);
    autosaveSession(text);
    setTimeout(tick, 300);
}

// ─── Editor events ───────────────────────────────────────────────────────────

editor.addEventListener('input', () => {
    state.dirty = true;
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
            const file = await handle.getFile();
            await loadFileContents(file, handle);
        } catch (err) {
            if (err.name !== 'AbortError') setStatus('Could not open file');
        }
    } else {
        fileInput.click();
    }
}

// Fallback: <input type="file">
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
    if (state.fileHandle) {
        await writeToHandle(state.fileHandle);
    } else {
        await saveAs(state.ext);
    }
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
    const a = Object.assign(document.createElement('a'), { href: url, download: filename });
    a.click();
    URL.revokeObjectURL(url);
    state.dirty = false;
    updateFilenameDisplay();
    setStatus('Downloaded');
}

// Save button wiring
document.getElementById('btn-save').addEventListener('click', saveFile);

// Save ▾ chevron
document.getElementById('btn-save-chevron').addEventListener('click', e => {
    e.stopPropagation();
    saveMenu.classList.toggle('hidden');
});

// Close dropdown on outside click
document.addEventListener('click', () => saveMenu.classList.add('hidden'));

document.getElementById('save-md').addEventListener('click', () => saveAs('md'));
document.getElementById('save-txt').addEventListener('click', () => saveAs('txt'));

// ─── Confirm discard ─────────────────────────────────────────────────────────

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
    const rect = workspace.getBoundingClientRect();  // cached ref — no query per frame
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
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    }
});

// Touch support for divider
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

const hadSession = restoreSession();

// On a fresh start (no prior session), the app announces itself once.
// Brief, unexplained, then gone.
if (!hadSession) {
    setStatus('A notepad that breathes.', 4000);
}

updateFilenameDisplay();
tick();
editor.focus();
