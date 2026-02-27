import json
import os
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from typing import Optional


@dataclass
class SessionData:
    text: str
    current_file: Optional[str]
    cursor_index: str
    last_harmony: float
    updated_at_utc: str


class SessionStore:
    """Persistent local session state for crash-safe restore."""

    # Two levels up from this file: src/resonance_notepad/ -> src/ -> repo root
    _DEFAULT_BASE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

    def __init__(self, base_dir: Optional[str] = None) -> None:
        root = base_dir or self._DEFAULT_BASE
        self._session_dir = os.path.join(root, ".resonant_notepad")
        self._session_path = os.path.join(self._session_dir, "session.json")

    @property
    def session_path(self) -> str:
        return self._session_path

    def load(self) -> Optional[SessionData]:
        if not os.path.exists(self._session_path):
            return None
        try:
            with open(self._session_path, "r", encoding="utf-8") as handle:
                payload = json.load(handle)
        except (OSError, json.JSONDecodeError):
            return None

        return SessionData(
            text=str(payload.get("text", "")),
            current_file=payload.get("current_file"),
            cursor_index=str(payload.get("cursor_index", "1.0")),
            last_harmony=float(payload.get("last_harmony", 0.0)),
            updated_at_utc=str(payload.get("updated_at_utc", "")),
        )

    def save(self, text: str, current_file: Optional[str], cursor_index: str, last_harmony: float) -> None:
        os.makedirs(self._session_dir, exist_ok=True)
        data = SessionData(
            text=text,
            current_file=current_file,
            cursor_index=cursor_index,
            last_harmony=last_harmony,
            updated_at_utc=datetime.now(tz=timezone.utc).isoformat(),
        )
        tmp_path = f"{self._session_path}.tmp"
        with open(tmp_path, "w", encoding="utf-8") as handle:
            json.dump(asdict(data), handle, indent=2)
        os.replace(tmp_path, self._session_path)

