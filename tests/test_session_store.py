import os
import shutil
import sys
import unittest


ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "src")
if SRC not in sys.path:
    sys.path.insert(0, SRC)

from resonance_notepad.session_store import SessionStore


class SessionStoreTests(unittest.TestCase):
    def test_roundtrip(self) -> None:
        tmp = os.path.join(ROOT, ".tmp_test_session")
        if os.path.exists(tmp):
            shutil.rmtree(tmp, ignore_errors=True)
        os.makedirs(tmp, exist_ok=True)
        try:
            store = SessionStore(base_dir=tmp)
            store.save(
                text="hello",
                current_file="notes.txt",
                cursor_index="1.3",
                last_harmony=0.77,
            )
            loaded = store.load()
            self.assertIsNotNone(loaded)
            assert loaded is not None
            self.assertEqual(loaded.text, "hello")
            self.assertEqual(loaded.current_file, "notes.txt")
            self.assertEqual(loaded.cursor_index, "1.3")
            self.assertAlmostEqual(loaded.last_harmony, 0.77, places=6)
        finally:
            shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    unittest.main()
