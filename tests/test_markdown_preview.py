import os
import sys
import unittest


ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "src")
if SRC not in sys.path:
    sys.path.insert(0, SRC)

from resonance_notepad.markdown_preview import render_markdown_preview


class MarkdownPreviewTests(unittest.TestCase):
    def test_empty_preview_message(self) -> None:
        out = render_markdown_preview("   ")
        self.assertIn("Preview is empty", out)

    def test_headings_and_lists(self) -> None:
        md = "# Title\n## Section\n- item one\n1. item two"
        out = render_markdown_preview(md)
        self.assertIn("H1  TITLE", out)
        self.assertIn("H2  SECTION", out)
        self.assertIn("• item one", out)
        self.assertIn("1. item two", out)


if __name__ == "__main__":
    unittest.main()

