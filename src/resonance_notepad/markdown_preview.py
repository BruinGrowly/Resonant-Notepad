import re
from typing import List


def _normalize_inline_markdown(line: str) -> str:
    line = re.sub(r"\*\*(.+?)\*\*", r"\1", line)
    line = re.sub(r"\*(.+?)\*", r"\1", line)
    line = re.sub(r"`(.+?)`", r"\1", line)
    line = re.sub(r"\[(.+?)\]\((.+?)\)", r"\1 (\2)", line)
    return line


def render_markdown_preview(markdown_text: str) -> str:
    """Render markdown into a readable plain-text preview."""
    if not markdown_text.strip():
        return "Preview is empty. Start writing markdown to see a formatted outline."

    lines = markdown_text.splitlines()
    out: List[str] = []
    in_code_fence = False

    for raw in lines:
        line = raw.rstrip("\n")
        if line.strip().startswith("```"):
            in_code_fence = not in_code_fence
            out.append("[code]")
            continue
        if in_code_fence:
            out.append(f"    {line}")
            continue

        stripped = line.strip()
        if stripped.startswith("### "):
            out.append(f"H3  {stripped[4:].upper()}")
        elif stripped.startswith("## "):
            out.append(f"H2  {stripped[3:].upper()}")
        elif stripped.startswith("# "):
            out.append(f"H1  {stripped[2:].upper()}")
        elif re.match(r"^[-*]\s+", stripped):
            out.append(f"• {_normalize_inline_markdown(stripped[2:])}")
        elif re.match(r"^\d+\.\s+", stripped):
            out.append(_normalize_inline_markdown(stripped))
        elif stripped.startswith(">"):
            out.append(f"| {_normalize_inline_markdown(stripped[1:].strip())}")
        else:
            out.append(_normalize_inline_markdown(line))

    preview = "\n".join(out).strip()
    return preview or "Preview is empty. Start writing markdown to see a formatted outline."

