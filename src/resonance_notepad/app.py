import os
import time
import tkinter as tk
from tkinter import ttk
from tkinter import filedialog, messagebox
from typing import Optional

from resonance_notepad.markdown_preview import render_markdown_preview
from resonance_notepad.resonance_engine import ResonanceController
from resonance_notepad.session_store import SessionStore


class NotepadApp:
    def __init__(self, root: tk.Tk) -> None:
        self.root = root
        self.root.title("Resonant Notepad")
        self.root.geometry("1120x700")

        self.controller = ResonanceController()
        self.session_store = SessionStore()
        self.current_file: Optional[str] = None
        self.dirty = False
        self._tick_job: Optional[str] = None
        self._autosave_job: Optional[str] = None
        self._last_autosave_ts = time.monotonic()
        self._last_harmony = self.controller.engine.state.harmony
        self._prev_harmony = self._last_harmony
        self._last_autosave_note = "No autosave yet"
        self._last_preview_text: str = ""

        self._build_ui()
        self._build_menu()
        self._restore_session()
        self._schedule_tick()
        self._schedule_autosave()

    def _build_ui(self) -> None:
        self.root.rowconfigure(0, weight=1)
        self.root.columnconfigure(0, weight=3)
        self.root.columnconfigure(1, weight=2)

        self.text = tk.Text(self.root, wrap="word", undo=True, padx=12, pady=12)
        self.text.grid(row=0, column=0, sticky="nsew")
        self.text.bind("<<Modified>>", self._on_modified)

        right = tk.Frame(self.root, padx=10, pady=10)
        right.grid(row=0, column=1, sticky="nsew")
        right.columnconfigure(0, weight=1)
        right.rowconfigure(0, weight=1)

        self.notebook = ttk.Notebook(right)
        self.notebook.grid(row=0, column=0, sticky="nsew")

        telemetry_tab = tk.Frame(self.notebook, padx=10, pady=10)
        telemetry_tab.columnconfigure(0, weight=1)
        telemetry_tab.rowconfigure(3, weight=1)
        self.notebook.add(telemetry_tab, text="Resonance")

        self.telemetry_label = tk.Label(
            telemetry_tab,
            text="Resonance Telemetry",
            anchor="w",
            font=("Segoe UI", 10, "bold"),
        )
        self.telemetry_label.grid(row=0, column=0, sticky="ew")

        self.metrics = tk.StringVar(
            value="L Love:    --\nJ Justice: --\nP Power:   --\nW Wisdom:  --\nH Harmony: --"
        )
        self.metrics_label = tk.Label(
            telemetry_tab, textvariable=self.metrics, justify="left", anchor="w",
            font=("Courier", 9),
        )
        self.metrics_label.grid(row=1, column=0, sticky="ew", pady=(6, 12))

        self.guidance_title = tk.Label(telemetry_tab, text="Guidance", anchor="w", font=("Segoe UI", 10, "bold"))
        self.guidance_title.grid(row=2, column=0, sticky="ew")

        self.guidance = tk.StringVar(value="Start typing to initialize resonance feedback.")
        self.guidance_label = tk.Label(telemetry_tab, textvariable=self.guidance, justify="left", anchor="nw", wraplength=340)
        self.guidance_label.grid(row=3, column=0, sticky="nsew", pady=(6, 12))

        preview_tab = tk.Frame(self.notebook, padx=10, pady=10)
        preview_tab.columnconfigure(0, weight=1)
        preview_tab.rowconfigure(1, weight=1)
        self.notebook.add(preview_tab, text="Markdown Preview")

        preview_label = tk.Label(preview_tab, text="Rendered Preview (lightweight)", anchor="w", font=("Segoe UI", 10, "bold"))
        preview_label.grid(row=0, column=0, sticky="ew")
        self.preview = tk.Text(preview_tab, wrap="word", state="disabled", padx=8, pady=8)
        self.preview.grid(row=1, column=0, sticky="nsew", pady=(8, 0))

        self.status = tk.StringVar(value="Ready")
        self.status_bar = tk.Label(self.root, textvariable=self.status, anchor="w", bd=1, relief="sunken")
        self.status_bar.grid(row=1, column=0, columnspan=2, sticky="ew")

    def _build_menu(self) -> None:
        menubar = tk.Menu(self.root)

        file_menu = tk.Menu(menubar, tearoff=False)
        file_menu.add_command(label="New", command=self.new_file)
        file_menu.add_command(label="Open...", command=self.open_file)
        file_menu.add_command(label="Save", command=self.save_file)
        file_menu.add_command(label="Save As...", command=self.save_as_file)
        file_menu.add_separator()
        file_menu.add_command(label="Exit", command=self.exit_app)
        menubar.add_cascade(label="File", menu=file_menu)

        self.root.config(menu=menubar)
        self.root.protocol("WM_DELETE_WINDOW", self.exit_app)

    def _on_modified(self, _event: tk.Event) -> None:
        if self.text.edit_modified():
            self.dirty = True
            self.text.edit_modified(False)

    def _schedule_tick(self) -> None:
        if self._tick_job:
            self.root.after_cancel(self._tick_job)
        self._tick_job = self.root.after(300, self._refresh_resonance)

    def _schedule_autosave(self) -> None:
        if self._autosave_job:
            self.root.after_cancel(self._autosave_job)
        self._autosave_job = self.root.after(2000, self._autosave_if_due)

    def _render_preview(self, text: str) -> None:
        if text == self._last_preview_text:
            return
        self._last_preview_text = text
        preview_text = render_markdown_preview(text)
        self.preview.configure(state="normal")
        self.preview.delete("1.0", "end")
        self.preview.insert("1.0", preview_text)
        self.preview.configure(state="disabled")

    def _write_session_snapshot(self) -> None:
        text = self.text.get("1.0", "end-1c")
        cursor = self.text.index("insert")
        self.session_store.save(
            text=text,
            current_file=self.current_file,
            cursor_index=cursor,
            last_harmony=self._last_harmony,
        )
        self._last_autosave_ts = time.monotonic()
        self._last_autosave_note = "Autosaved session snapshot"

    def _autosave_if_due(self) -> None:
        text = self.text.get("1.0", "end-1c")
        cadence_sec = self.controller.autosave_interval_seconds(text)
        elapsed = time.monotonic() - self._last_autosave_ts
        if self.dirty and elapsed >= cadence_sec:
            try:
                self._write_session_snapshot()
            except OSError as exc:
                self._last_autosave_note = f"Autosave failed: {exc}"
        self._schedule_autosave()

    def _restore_session(self) -> None:
        session = self.session_store.load()
        if not session:
            return
        if session.text:
            self.text.delete("1.0", "end")
            self.text.insert("1.0", session.text)
        self.current_file = session.current_file
        self._last_harmony = session.last_harmony
        try:
            self.text.mark_set("insert", session.cursor_index)
        except tk.TclError:
            self.text.mark_set("insert", "end-1c")
        self.dirty = bool(session.text and not self.current_file)
        self._last_autosave_note = f"Restored session from {session.updated_at_utc}"

    @staticmethod
    def _harmony_arrow(delta: float) -> str:
        """Direction arrow for harmony trajectory."""
        if delta > 0.005:
            return "↑"
        if delta < -0.005:
            return "↓"
        return "→"

    @staticmethod
    def _harmony_color(harmony: float) -> str:
        """Status bar background colour driven by field state."""
        if harmony < 0.58:
            return "#ffdddd"  # low harmony — red pressure
        if harmony < 0.70:
            return "#fff8dd"  # mid harmony — amber caution
        return "#ddffdd"      # high harmony — green stability

    def _refresh_resonance(self) -> None:
        text = self.text.get("1.0", "end-1c")
        data = self.controller.evaluate(text)
        advice = self.controller.guidance(text)

        harmony = data["harmony"]
        delta = harmony - self._prev_harmony
        arrow = self._harmony_arrow(delta)
        sign = "+" if delta >= 0 else ""

        self._prev_harmony = self._last_harmony
        self._last_harmony = harmony
        self._render_preview(text)

        self.metrics.set(
            f"L Love:    {data['l']:.3f}\n"
            f"J Justice: {data['j']:.3f}\n"
            f"P Power:   {data['p']:.3f}\n"
            f"W Wisdom:  {data['w']:.3f}\n"
            f"H Harmony: {harmony:.3f}  {arrow} {sign}{delta:.3f}"
        )
        self.guidance.set(advice)

        # Field acts on the status bar — colour shifts with harmony level.
        self.status_bar.configure(bg=self._harmony_color(harmony))

        words = len(text.split())
        chars = len(text)
        file_name = os.path.basename(self.current_file) if self.current_file else "Untitled"
        dirty_mark = "*" if self.dirty else ""
        cadence = self.controller.autosave_interval_seconds(text)
        self.status.set(
            f"{file_name}{dirty_mark} | Words: {words} | Chars: {chars} | "
            f"Harmony: {harmony:.3f} {arrow} | Autosave: {cadence}s | {self._last_autosave_note}"
        )

        self._schedule_tick()

    def _confirm_discard_if_dirty(self) -> bool:
        if not self.dirty:
            return True
        choice = messagebox.askyesnocancel("Unsaved Changes", "Save changes before continuing?")
        if choice is None:
            return False
        if choice:
            return self.save_file()
        return True

    def new_file(self) -> None:
        if not self._confirm_discard_if_dirty():
            return
        self.text.delete("1.0", "end")
        self.current_file = None
        self.dirty = False
        self._write_session_snapshot()

    def open_file(self) -> None:
        if not self._confirm_discard_if_dirty():
            return
        path = filedialog.askopenfilename(
            title="Open Text File",
            filetypes=[("Text Files", "*.txt"), ("Markdown", "*.md"), ("All Files", "*.*")],
        )
        if not path:
            return
        try:
            with open(path, "r", encoding="utf-8") as handle:
                content = handle.read()
        except OSError as exc:
            messagebox.showerror("Open Failed", f"Could not open file:\n{exc}")
            return
        self.text.delete("1.0", "end")
        self.text.insert("1.0", content)
        self.current_file = path
        self.dirty = False
        self._write_session_snapshot()

    def save_file(self) -> bool:
        if not self.current_file:
            return self.save_as_file()
        return self._save_to_path(self.current_file)

    def save_as_file(self) -> bool:
        path = filedialog.asksaveasfilename(
            title="Save Text File",
            defaultextension=".txt",
            filetypes=[("Text Files", "*.txt"), ("Markdown", "*.md"), ("All Files", "*.*")],
        )
        if not path:
            return False
        return self._save_to_path(path)

    def _save_to_path(self, path: str) -> bool:
        text = self.text.get("1.0", "end-1c")
        try:
            with open(path, "w", encoding="utf-8") as handle:
                handle.write(text)
        except OSError as exc:
            messagebox.showerror("Save Failed", f"Could not save file:\n{exc}")
            return False
        self.current_file = path
        self.dirty = False
        self._write_session_snapshot()
        return True

    def exit_app(self) -> None:
        if not self._confirm_discard_if_dirty():
            return
        try:
            self._write_session_snapshot()
        except OSError:
            pass
        self.root.destroy()


def run() -> None:
    root = tk.Tk()
    NotepadApp(root)
    root.mainloop()
