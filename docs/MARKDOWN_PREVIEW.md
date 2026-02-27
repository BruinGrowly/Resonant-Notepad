# Markdown Preview

## Purpose

Provide a useful, lightweight render view during writing without external dependencies.

The preview is designed for structural readability, not full markdown spec parity.

## Supported Elements

- Headings: `#`, `##`, `###`
- Bullets: `- item`, `* item`
- Numbered lists: `1. item`
- Blockquotes: `> quote`
- Fenced code blocks: triple backticks
- Inline cleanup:
  - `**bold**` -> plain text
  - `*italic*` -> plain text
  - `` `code` `` -> plain text
  - `[label](url)` -> `label (url)`

## Rendering Notes

- Heading text is normalized for emphasis.
- Code fences are preserved as block context markers.
- The renderer avoids heavy formatting logic to keep runtime predictable.

## Intended Use

- Drafting and outline validation
- Rapid structure checks while editing

Not intended for:
- pixel-perfect markdown rendering
- rich HTML-style layout

